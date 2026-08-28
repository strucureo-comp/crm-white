// ============================================================================
// Read-only ad platform integration — shared types
//
// Everything in `lib/ads` is strictly read-only with respect to the external
// platforms: it lists accounts and reads campaigns/insights. No module here
// creates, edits, pauses, resumes, or deletes anything on Meta or Google.
// ============================================================================

export type AdPlatform = 'meta' | 'google';

/** Source of a campaign row as shown in the Campaigns table. */
export type CampaignSource = 'crm' | AdPlatform;

export const AD_PLATFORMS: AdPlatform[] = ['meta', 'google'];

export function isAdPlatform(value: unknown): value is AdPlatform {
  return value === 'meta' || value === 'google';
}

export const PLATFORM_LABELS: Record<AdPlatform, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
};

// ---------------------------------------------------------------------------
// Connection state machine
// ---------------------------------------------------------------------------
export type ConnectionStatus =
  | 'pending_account_selection' // authorized, but no ad account chosen yet
  | 'connected'
  | 'needs_reauth' // token expired or access revoked by the user
  | 'error'; // last sync failed for a non-auth reason

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'partial' | 'failed';

/** An ad account (Meta) or customer account (Google) available to a connection. */
export interface AdAccountRef {
  /** Platform account id: `act_<id>` for Meta, the digits-only id for Google. */
  id: string;
  name: string;
  currency?: string;
  /** Google only: the manager account to send as `login-customer-id`. */
  loginCustomerId?: string;
  /** True when the platform reports the account as disabled/closed. */
  inactive?: boolean;
}

/**
 * A company's authorization for one ad platform.
 *
 * Persisted at `ad_connections/{workspaceId}/{connectionId}` — a server-only
 * path reachable exclusively through the Firebase Admin SDK. Token fields hold
 * AES-256-GCM envelopes, never plaintext, and are stripped by
 * `toPublicConnection` before anything is sent to the frontend.
 */
export interface AdConnection {
  id: string;
  workspace_id: string;
  platform: AdPlatform;
  status: ConnectionStatus;

  /** Encrypted credentials — never leaves the backend. */
  access_token_enc?: string;
  refresh_token_enc?: string;
  /** Epoch ms; absent for Meta long-lived tokens without a stated expiry. */
  access_token_expires_at?: number;
  scopes?: string[];

  /** Accounts the authorizing user can read, cached at connect time. */
  available_accounts?: AdAccountRef[];
  /** The account currently being synced into the CRM. */
  selected_account?: AdAccountRef | null;

  connected_by_uid: string;
  connected_by_email?: string;
  connected_at: string;
  updated_at: string;

  sync_status: SyncStatus;
  last_synced_at?: string | null;
  last_sync_started_at?: number | null;
  last_manual_sync_at?: number | null;
  /** User-safe message; never contains tokens or raw provider payloads. */
  last_error?: string | null;
  last_error_at?: string | null;
  campaign_count?: number;
}

/** The connection shape that is safe to serialise to the browser. */
export interface PublicAdConnection {
  id: string;
  platform: AdPlatform;
  status: ConnectionStatus;
  selected_account: AdAccountRef | null;
  available_accounts: AdAccountRef[];
  connected_by_email?: string;
  connected_at: string;
  sync_status: SyncStatus;
  last_synced_at: string | null;
  last_error: string | null;
  campaign_count: number;
  /** True when a manual refresh is currently rate limited. */
  refresh_available_in_seconds: number;
}

// ---------------------------------------------------------------------------
// Normalized campaign
// ---------------------------------------------------------------------------
/** Canonical status vocabulary the UI filters on. */
export type NormalizedStatus = 'Active' | 'Paused' | 'Draft' | 'Completed' | 'Removed' | 'Unknown';

/**
 * A campaign as stored in the CRM, normalized across platforms.
 *
 * Uniqueness is `workspace_id + platform + account_id + external_id`, encoded
 * into the record key by `campaignKey()` so every sync is an idempotent upsert.
 * Fields a platform does not report are left `undefined` rather than zeroed, so
 * the UI can distinguish "nothing spent" from "not reported".
 */
export interface NormalizedAdCampaign {
  /** `campaignKey()` output — the primary key within a workspace. */
  key: string;
  workspace_id: string;
  platform: AdPlatform;
  connection_id: string;
  account_id: string;
  account_name?: string;
  /** The platform's own campaign id. */
  external_id: string;

  name: string;
  status: NormalizedStatus;
  /** Raw platform status, kept for support/debugging. */
  platform_status?: string;
  objective?: string;

  currency?: string;
  budget?: number;
  budget_period?: 'daily' | 'lifetime';
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;

  start_date?: string | null;
  end_date?: string | null;

  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

/** A unified row for the Campaigns table: CRM campaigns plus imported ones. */
export interface UnifiedCampaignRow {
  id: string;
  source: CampaignSource;
  /** Imported rows are read-only; CRM rows are editable. */
  read_only: boolean;
  name: string;
  external_id?: string;
  account_id?: string;
  account_name?: string;
  status: string;
  currency?: string;
  budget?: number;
  budget_period?: 'daily' | 'lifetime';
  spend?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  start_date?: string | null;
  end_date?: string | null;
  last_synced_at?: string | null;
}

// ---------------------------------------------------------------------------
// Key encoding
// ---------------------------------------------------------------------------
/**
 * Firebase RTDB keys cannot contain `. $ # [ ] /` or control characters, and
 * Google resource ids arrive with slashes. Encoding the tuple into one key makes
 * the uniqueness constraint structural: a second sync of the same campaign
 * overwrites the first instead of duplicating it.
 */
export function campaignKey(platform: AdPlatform, accountId: string, externalId: string): string {
  const sanitize = (part: string) =>
    String(part)
      .replace(/[.$#[\]/\s]+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .slice(0, 96) || 'unknown';
  return `${platform}__${sanitize(accountId)}__${sanitize(externalId)}`;
}

/** Strips every secret field so a connection can be returned to the browser. */
export function toPublicConnection(
  connection: AdConnection,
  manualSyncCooldownMs: number,
): PublicAdConnection {
  const since = connection.last_manual_sync_at
    ? Date.now() - connection.last_manual_sync_at
    : Number.MAX_SAFE_INTEGER;
  const remainingMs = Math.max(0, manualSyncCooldownMs - since);

  return {
    id: connection.id,
    platform: connection.platform,
    status: connection.status,
    selected_account: connection.selected_account ?? null,
    available_accounts: connection.available_accounts ?? [],
    connected_by_email: connection.connected_by_email,
    connected_at: connection.connected_at,
    sync_status: connection.sync_status ?? 'idle',
    last_synced_at: connection.last_synced_at ?? null,
    last_error: connection.last_error ?? null,
    campaign_count: connection.campaign_count ?? 0,
    refresh_available_in_seconds: Math.ceil(remainingMs / 1000),
  };
}
