// ============================================================================
// Sync orchestration (server-only)
//
// One place decides how a connection is turned into normalized campaign rows, so
// the manual "Sync" button and the background cron behave identically. Every
// failure mode — expired token, revoked access, missing permission, rate limit,
// provider outage — is classified and recorded on the connection instead of
// being thrown at the Campaigns page.
// ============================================================================
import { decryptSecret } from './crypto';
import { classifyAdError, logAdError } from './errors';
import { readMetaCampaigns } from './meta/read';
import { readGoogleCampaigns } from './google/read';
import {
  acquireSyncLock,
  getConnection,
  listConnections,
  MANUAL_SYNC_COOLDOWN_MS,
  releaseSyncLock,
  replaceCampaignsForConnection,
  updateSyncState,
} from './store';
import type { AdConnection, NormalizedAdCampaign, SyncStatus } from './types';
import { PLATFORM_LABELS } from './types';

export interface SyncOutcome {
  connectionId: string;
  platform: AdConnection['platform'];
  status: SyncStatus;
  campaignCount: number;
  warnings: string[];
  error?: string;
  /** True when the sync was skipped rather than attempted. */
  skipped?: boolean;
}

/**
 * Reads one connection's campaigns and replaces its cached rows.
 *
 * Never throws: an unhealthy platform must not break the page. The outcome
 * describes what happened and the connection record carries the user-facing
 * message.
 */
export async function syncConnection(
  workspaceId: string,
  connection: AdConnection,
): Promise<SyncOutcome> {
  const base = {
    connectionId: connection.id,
    platform: connection.platform,
    warnings: [] as string[],
  };

  const account = connection.selected_account;
  if (!account?.id) {
    return {
      ...base,
      status: 'idle',
      campaignCount: 0,
      skipped: true,
      error: `Choose a ${PLATFORM_LABELS[connection.platform]} account to start syncing.`,
    };
  }

  // Serialises the manual button against the cron job.
  const gotLock = await acquireSyncLock(workspaceId, connection.id);
  if (!gotLock) {
    return { ...base, status: 'syncing', campaignCount: 0, skipped: true };
  }

  await updateSyncState(workspaceId, connection.id, { syncStatus: 'syncing' });

  try {
    let campaigns: NormalizedAdCampaign[];
    let warnings: string[];

    if (connection.platform === 'meta') {
      if (!connection.access_token_enc) {
        throw Object.assign(new Error('missing credential'), { adAuthFailure: true });
      }
      if (
        connection.access_token_expires_at &&
        connection.access_token_expires_at < Date.now()
      ) {
        throw Object.assign(new Error('expired credential'), { adAuthFailure: true });
      }
      const result = await readMetaCampaigns({
        accessToken: decryptSecret(connection.access_token_enc),
        account,
        workspaceId,
        connectionId: connection.id,
      });
      campaigns = result.campaigns;
      warnings = result.warnings;
    } else {
      if (!connection.refresh_token_enc) {
        throw Object.assign(new Error('missing credential'), { adAuthFailure: true });
      }
      const result = await readGoogleCampaigns({
        refreshToken: decryptSecret(connection.refresh_token_enc),
        account,
        workspaceId,
        connectionId: connection.id,
      });
      campaigns = result.campaigns;
      warnings = result.warnings;
    }

    const count = await replaceCampaignsForConnection(workspaceId, connection.id, campaigns);
    const status: SyncStatus = warnings.length > 0 ? 'partial' : 'ok';

    await updateSyncState(workspaceId, connection.id, {
      syncStatus: status,
      status: 'connected',
      lastSyncedAt: new Date().toISOString(),
      campaignCount: count,
      lastError: warnings[0] ?? null,
    });

    return { ...base, status, campaignCount: count, warnings };
  } catch (error) {
    const authFailure = (error as { adAuthFailure?: boolean })?.adAuthFailure === true;
    const classified = authFailure
      ? {
          kind: 'auth' as const,
          message: `${PLATFORM_LABELS[connection.platform]} access has expired or was revoked. Reconnect to resume syncing.`,
          needsReauth: true,
          retryable: false,
        }
      : logAdError(`sync:${connection.platform}`, error);

    await updateSyncState(workspaceId, connection.id, {
      syncStatus: 'failed',
      status: classified.needsReauth ? 'needs_reauth' : 'error',
      lastError: classified.message,
    });

    return {
      ...base,
      status: 'failed',
      campaignCount: connection.campaign_count ?? 0,
      error: classified.message,
    };
  } finally {
    await releaseSyncLock(workspaceId, connection.id).catch(() => undefined);
  }
}

export class SyncRateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`Please wait ${retryAfterSeconds}s before refreshing again.`);
    this.name = 'SyncRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Manual refresh entry point. Enforces a per-connection cooldown recorded in the
 * database, so the limit holds across server instances rather than per process.
 */
export async function manualSync(
  workspaceId: string,
  connectionId?: string,
): Promise<SyncOutcome[]> {
  const connections = connectionId
    ? [await getConnection(workspaceId, connectionId)].filter(
        (c): c is AdConnection => c !== null,
      )
    : await listConnections(workspaceId);

  const syncable = connections.filter((c) => c.selected_account?.id);
  if (syncable.length === 0) return [];

  const now = Date.now();
  const throttled = syncable.filter(
    (c) => c.last_manual_sync_at && now - c.last_manual_sync_at < MANUAL_SYNC_COOLDOWN_MS,
  );
  if (throttled.length === syncable.length) {
    const soonest = Math.min(
      ...throttled.map((c) => MANUAL_SYNC_COOLDOWN_MS - (now - (c.last_manual_sync_at || 0))),
    );
    throw new SyncRateLimitError(Math.max(1, Math.ceil(soonest / 1000)));
  }

  const eligible = syncable.filter((c) => !throttled.includes(c));
  const outcomes: SyncOutcome[] = [];

  // Sequential on purpose: two platforms at once doubles the burst against both
  // providers' rate limits for no perceptible latency benefit.
  for (const connection of eligible) {
    await updateSyncState(workspaceId, connection.id, { lastManualSyncAt: now });
    outcomes.push(await syncConnection(workspaceId, connection));
  }

  return outcomes;
}

/** Syncs every connected account in a workspace. Used by the background job. */
export async function syncWorkspace(workspaceId: string): Promise<SyncOutcome[]> {
  const connections = await listConnections(workspaceId);
  const outcomes: SyncOutcome[] = [];

  for (const connection of connections) {
    // Skip accounts that need the user to re-authorize; retrying only burns quota.
    if (connection.status === 'needs_reauth' || !connection.selected_account?.id) continue;
    outcomes.push(await syncConnection(workspaceId, connection));
  }

  return outcomes;
}

export { classifyAdError };
