// ============================================================================
// Ad connection + campaign persistence (server-only, Firebase Admin SDK)
//
// Both collections live at root paths that are NOT under `workspaces/`, so the
// client SDK — which the rest of the CRM uses to read `workspaces/{id}/...` —
// cannot reach them at all. Encrypted tokens and imported campaign data are only
// ever read here, behind `requireWorkspaceAccess`.
//
// Tenant isolation is structural: `workspaceId` is the first path segment of
// every read and write, so a query cannot span companies even by mistake.
// ============================================================================
import { getAdminDatabase } from '@/lib/firebase/admin';
import { encryptSecret } from './crypto';
import {
  campaignKey,
  type AdAccountRef,
  type AdConnection,
  type AdPlatform,
  type ConnectionStatus,
  type NormalizedAdCampaign,
  type SyncStatus,
} from './types';

const CONNECTIONS_ROOT = 'ad_connections';
const CAMPAIGNS_ROOT = 'ad_campaigns';

/** Minimum gap between manual refreshes of a single connection. */
export const MANUAL_SYNC_COOLDOWN_MS = 2 * 60 * 1000;
/** A sync older than this is considered abandoned and may be re-run. */
export const SYNC_LOCK_TTL_MS = 5 * 60 * 1000;

function connectionsRef(workspaceId: string) {
  return getAdminDatabase().ref(`${CONNECTIONS_ROOT}/${workspaceId}`);
}

function connectionRef(workspaceId: string, connectionId: string) {
  return getAdminDatabase().ref(`${CONNECTIONS_ROOT}/${workspaceId}/${connectionId}`);
}

function campaignsRef(workspaceId: string) {
  return getAdminDatabase().ref(`${CAMPAIGNS_ROOT}/${workspaceId}`);
}

/** Rejects ids that would let a caller escape its workspace subtree. */
function assertSafeId(value: string, label: string): void {
  if (!value || !/^[A-Za-z0-9_-]{1,128}$/.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------
export async function listConnections(workspaceId: string): Promise<AdConnection[]> {
  assertSafeId(workspaceId, 'workspaceId');
  const snapshot = await connectionsRef(workspaceId).once('value');
  const rows = (snapshot.val() as Record<string, AdConnection> | null) || {};
  return Object.entries(rows).map(([id, row]) => ({ ...row, id, workspace_id: workspaceId }));
}

export async function getConnection(
  workspaceId: string,
  connectionId: string,
): Promise<AdConnection | null> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');
  const snapshot = await connectionRef(workspaceId, connectionId).once('value');
  if (!snapshot.exists()) return null;
  return { ...(snapshot.val() as AdConnection), id: connectionId, workspace_id: workspaceId };
}

export async function findConnectionByPlatform(
  workspaceId: string,
  platform: AdPlatform,
): Promise<AdConnection | null> {
  const all = await listConnections(workspaceId);
  return all.find((c) => c.platform === platform) ?? null;
}

export interface UpsertConnectionInput {
  platform: AdPlatform;
  status: ConnectionStatus;
  accessToken?: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  scopes?: string[];
  availableAccounts?: AdAccountRef[];
  selectedAccount?: AdAccountRef | null;
  uid: string;
  email?: string;
}

/**
 * Creates or replaces the workspace's connection for a platform. One connection
 * per platform per workspace keeps the "Connect / Disconnect" model simple and
 * makes re-authorizing a no-op for existing cached campaigns.
 *
 * Tokens are encrypted here; plaintext is never written.
 */
export async function upsertConnection(
  workspaceId: string,
  input: UpsertConnectionInput,
): Promise<AdConnection> {
  assertSafeId(workspaceId, 'workspaceId');
  const existing = await findConnectionByPlatform(workspaceId, input.platform);
  const now = new Date().toISOString();
  const id = existing?.id ?? connectionsRef(workspaceId).push().key!;

  const record: AdConnection = {
    id,
    workspace_id: workspaceId,
    platform: input.platform,
    status: input.status,
    scopes: input.scopes ?? existing?.scopes ?? [],
    available_accounts: input.availableAccounts ?? existing?.available_accounts ?? [],
    selected_account:
      input.selectedAccount !== undefined
        ? input.selectedAccount
        : existing?.selected_account ?? null,
    connected_by_uid: input.uid,
    connected_by_email: input.email ?? existing?.connected_by_email,
    connected_at: existing?.connected_at ?? now,
    updated_at: now,
    sync_status: existing?.sync_status ?? 'idle',
    last_synced_at: existing?.last_synced_at ?? null,
    last_manual_sync_at: existing?.last_manual_sync_at ?? null,
    last_error: null,
    last_error_at: null,
    campaign_count: existing?.campaign_count ?? 0,
  };

  if (input.accessToken) {
    record.access_token_enc = encryptSecret(input.accessToken);
  } else if (existing?.access_token_enc) {
    record.access_token_enc = existing.access_token_enc;
  }

  if (input.refreshToken) {
    record.refresh_token_enc = encryptSecret(input.refreshToken);
  } else if (existing?.refresh_token_enc) {
    record.refresh_token_enc = existing.refresh_token_enc;
  }

  if (input.accessTokenExpiresAt) {
    record.access_token_expires_at = input.accessTokenExpiresAt;
  }

  await connectionRef(workspaceId, id).set(stripUndefined(record));
  return record;
}

/** Persists the chosen ad account and flips the connection to `connected`. */
export async function setSelectedAccount(
  workspaceId: string,
  connectionId: string,
  account: AdAccountRef,
): Promise<void> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');
  await connectionRef(workspaceId, connectionId).update({
    selected_account: stripUndefined(account),
    status: 'connected' satisfies ConnectionStatus,
    last_error: null,
    last_error_at: null,
    updated_at: new Date().toISOString(),
  });
}

export interface SyncStateUpdate {
  syncStatus?: SyncStatus;
  status?: ConnectionStatus;
  lastSyncedAt?: string | null;
  lastSyncStartedAt?: number | null;
  lastManualSyncAt?: number | null;
  lastError?: string | null;
  campaignCount?: number;
  availableAccounts?: AdAccountRef[];
}

export async function updateSyncState(
  workspaceId: string,
  connectionId: string,
  update: SyncStateUpdate,
): Promise<void> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (update.syncStatus !== undefined) patch.sync_status = update.syncStatus;
  if (update.status !== undefined) patch.status = update.status;
  if (update.lastSyncedAt !== undefined) patch.last_synced_at = update.lastSyncedAt;
  if (update.lastSyncStartedAt !== undefined) patch.last_sync_started_at = update.lastSyncStartedAt;
  if (update.lastManualSyncAt !== undefined) patch.last_manual_sync_at = update.lastManualSyncAt;
  if (update.campaignCount !== undefined) patch.campaign_count = update.campaignCount;
  if (update.availableAccounts !== undefined) {
    patch.available_accounts = update.availableAccounts.map(stripUndefined);
  }
  if (update.lastError !== undefined) {
    patch.last_error = update.lastError;
    patch.last_error_at = update.lastError ? new Date().toISOString() : null;
  }

  await connectionRef(workspaceId, connectionId).update(patch);
}

/**
 * Claims the sync lock for a connection using a transaction so two concurrent
 * requests (manual refresh + cron) cannot sync the same account at once.
 * Returns false when another sync is already in flight.
 */
export async function acquireSyncLock(
  workspaceId: string,
  connectionId: string,
): Promise<boolean> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');

  const lockRef = connectionRef(workspaceId, connectionId).child('last_sync_started_at');
  const result = await lockRef.transaction((current: number | null) => {
    if (current && Date.now() - current < SYNC_LOCK_TTL_MS) {
      return undefined; // abort — a sync is already running
    }
    return Date.now();
  });

  return result.committed;
}

export async function releaseSyncLock(
  workspaceId: string,
  connectionId: string,
): Promise<void> {
  await connectionRef(workspaceId, connectionId).child('last_sync_started_at').set(null);
}

/** Removes the connection and every campaign it imported. */
export async function deleteConnection(
  workspaceId: string,
  connectionId: string,
): Promise<void> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');
  await deleteCampaignsForConnection(workspaceId, connectionId);
  await connectionRef(workspaceId, connectionId).remove();
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------
export async function listCachedCampaigns(
  workspaceId: string,
): Promise<NormalizedAdCampaign[]> {
  assertSafeId(workspaceId, 'workspaceId');
  const snapshot = await campaignsRef(workspaceId).once('value');
  const rows = (snapshot.val() as Record<string, NormalizedAdCampaign> | null) || {};
  return Object.entries(rows).map(([key, row]) => ({ ...row, key }));
}

/**
 * Upserts a sync result for one connection.
 *
 * Written as a single multi-path update so the table never shows a half-synced
 * account. Campaigns that vanished from the platform since the last sync are
 * pruned, which keeps the cache from accumulating stale rows.
 */
export async function replaceCampaignsForConnection(
  workspaceId: string,
  connectionId: string,
  campaigns: NormalizedAdCampaign[],
): Promise<number> {
  assertSafeId(workspaceId, 'workspaceId');
  assertSafeId(connectionId, 'connectionId');

  const existing = await listCachedCampaigns(workspaceId);
  const existingByKey = new Map(existing.map((row) => [row.key, row]));
  const incomingKeys = new Set(campaigns.map((c) => c.key));
  const updates: Record<string, unknown> = {};

  for (const campaign of campaigns) {
    const previous = existingByKey.get(campaign.key);
    updates[campaign.key] = stripUndefined({
      ...campaign,
      created_at: previous?.created_at ?? campaign.created_at,
    });
  }

  for (const row of existing) {
    if (row.connection_id === connectionId && !incomingKeys.has(row.key)) {
      updates[row.key] = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await campaignsRef(workspaceId).update(updates);
  }

  return campaigns.length;
}

export async function deleteCampaignsForConnection(
  workspaceId: string,
  connectionId: string,
): Promise<void> {
  const existing = await listCachedCampaigns(workspaceId);
  const updates: Record<string, null> = {};
  for (const row of existing) {
    if (row.connection_id === connectionId) updates[row.key] = null;
  }
  if (Object.keys(updates).length > 0) {
    await campaignsRef(workspaceId).update(updates);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Firebase rejects `undefined`; drop those keys instead of writing nulls. */
function stripUndefined<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out as T;
}

export { campaignKey };
