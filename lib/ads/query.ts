// ============================================================================
// Unified campaign feed (server-only)
//
// The Campaigns page reads one feed covering CRM campaigns plus campaigns
// imported from Meta Ads and Google Ads. Search, filtering, sorting and
// pagination all happen here, so the browser never receives a whole workspace.
//
// Nothing in this module talks to a provider: it reads only what a previous sync
// stored, which is what keeps a page load at one database read instead of an
// external API call.
// ============================================================================
import { getAdminDatabase } from '@/lib/firebase/admin';
import { listCachedCampaigns } from './store';
import type { Campaign as CrmCampaign } from '@/lib/db/campaigns/api';
import type { CampaignSource, NormalizedAdCampaign, UnifiedCampaignRow } from './types';

/** Short enough that a manual sync feels immediate, long enough to absorb bursts. */
const FEED_CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 500;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type SourceFilter = 'all' | CampaignSource;
export type SortKey = 'name' | 'status' | 'budget' | 'spend' | 'last_synced';

export interface CampaignQuery {
  search?: string;
  source?: SourceFilter;
  status?: string;
  page?: number;
  pageSize?: number;
  sort?: SortKey;
  direction?: 'asc' | 'desc';
}

export interface CampaignFeed {
  rows: UnifiedCampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Counts per source for the filter chips, before the source filter applies. */
  counts: Record<'all' | CampaignSource, number>;
  /** Distinct statuses present in the workspace, for the status filter. */
  statuses: string[];
  /** Totals across the whole filtered set, not just the visible page. */
  totals: { spend: number; activeBudget: number };
  /** Most recent successful import across every connection. */
  lastSyncedAt: string | null;
  /** True when the rows came from the in-process cache rather than a fresh read. */
  cached: boolean;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------
function assertSafeWorkspaceId(workspaceId: string): void {
  if (!workspaceId || !/^[A-Za-z0-9_-]{1,128}$/.test(workspaceId)) {
    throw new Error('Invalid workspaceId');
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function fromCrmCampaign(id: string, row: CrmCampaign): UnifiedCampaignRow {
  return {
    id,
    source: 'crm',
    read_only: false,
    name: row.name || 'Untitled campaign',
    status: row.status || 'Unknown',
    currency: row.currency,
    budget: numberOrUndefined(row.budget),
    spend: numberOrUndefined(row.spent),
    impressions: numberOrUndefined(row.impressions),
    clicks: numberOrUndefined(row.clicks),
    start_date: row.startDate ?? null,
    end_date: row.endDate ?? null,
    last_synced_at: row.lastSynced ?? null,
  };
}

function fromImportedCampaign(row: NormalizedAdCampaign): UnifiedCampaignRow {
  return {
    id: row.key,
    source: row.platform,
    // Imported rows can never be edited from the CRM — the integration is
    // read-only, so the UI must not offer modification actions for them.
    read_only: true,
    name: row.name,
    external_id: row.external_id,
    account_id: row.account_id,
    account_name: row.account_name,
    status: row.status,
    currency: row.currency,
    budget: row.budget,
    budget_period: row.budget_period,
    spend: row.spend,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    start_date: row.start_date ?? null,
    end_date: row.end_date ?? null,
    last_synced_at: row.last_synced_at,
  };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
/**
 * Reads the workspace's own campaigns through the Admin SDK.
 *
 * Rows whose `source` is a platform name are skipped: they are leftovers from
 * the old placeholder connect buttons, and the real imported rows now come from
 * `ad_campaigns`. They are ignored rather than deleted.
 */
async function readCrmCampaigns(workspaceId: string): Promise<UnifiedCampaignRow[]> {
  const snapshot = await getAdminDatabase()
    .ref(`workspaces/${workspaceId}/campaigns`)
    .once('value');
  const rows = (snapshot.val() as Record<string, CrmCampaign> | null) || {};

  return Object.entries(rows)
    .filter(([, row]) => row && (!row.source || row.source === 'internal' || row.source === 'crm'))
    .map(([id, row]) => fromCrmCampaign(row.id || id, row));
}

interface CacheEntry {
  rows: UnifiedCampaignRow[];
  lastSyncedAt: string | null;
  expiresAt: number;
}

const feedCache = new Map<string, CacheEntry>();

/** Called after any sync or connection change so the next read is fresh. */
export function invalidateCampaignFeed(workspaceId?: string): void {
  if (workspaceId) feedCache.delete(workspaceId);
  else feedCache.clear();
}

async function loadWorkspaceRows(workspaceId: string): Promise<CacheEntry> {
  const cached = feedCache.get(workspaceId);
  if (cached && cached.expiresAt > Date.now()) return cached;

  // A failure on either side must not blank the table, so each source is
  // tolerated independently: an integration outage still shows CRM campaigns.
  const [crm, imported] = await Promise.all([
    readCrmCampaigns(workspaceId).catch(() => [] as UnifiedCampaignRow[]),
    listCachedCampaigns(workspaceId).catch(() => [] as NormalizedAdCampaign[]),
  ]);

  const lastSyncedAt = imported.reduce<string | null>(
    (latest, row) =>
      row.last_synced_at && (!latest || row.last_synced_at > latest) ? row.last_synced_at : latest,
    null,
  );

  const entry: CacheEntry = {
    rows: [...crm, ...imported.map(fromImportedCampaign)],
    lastSyncedAt,
    expiresAt: Date.now() + FEED_CACHE_TTL_MS,
  };

  if (feedCache.size >= MAX_CACHE_ENTRIES) feedCache.clear();
  feedCache.set(workspaceId, entry);
  return entry;
}

// ---------------------------------------------------------------------------
// Filtering, sorting, pagination
// ---------------------------------------------------------------------------
function matchesSearch(row: UnifiedCampaignRow, needle: string): boolean {
  if (!needle) return true;
  return (
    row.name.toLowerCase().includes(needle) ||
    (row.external_id || '').toLowerCase().includes(needle) ||
    (row.account_name || '').toLowerCase().includes(needle) ||
    (row.account_id || '').toLowerCase().includes(needle) ||
    row.id.toLowerCase() === needle
  );
}

function compare(a: UnifiedCampaignRow, b: UnifiedCampaignRow, sort: SortKey): number {
  switch (sort) {
    case 'spend':
      return (a.spend ?? -1) - (b.spend ?? -1);
    case 'budget':
      return (a.budget ?? -1) - (b.budget ?? -1);
    case 'status':
      return a.status.localeCompare(b.status);
    case 'last_synced':
      return (a.last_synced_at || '').localeCompare(b.last_synced_at || '');
    case 'name':
    default:
      return a.name.localeCompare(b.name);
  }
}

/**
 * Builds one page of the unified feed.
 *
 * The caller is responsible for having already authorized `workspaceId`; this
 * function reads nothing outside that workspace's subtree.
 */
export async function getCampaignFeed(
  workspaceId: string,
  query: CampaignQuery = {},
): Promise<CampaignFeed> {
  assertSafeWorkspaceId(workspaceId);

  const wasCached = (feedCache.get(workspaceId)?.expiresAt ?? 0) > Date.now();
  const { rows, lastSyncedAt } = await loadWorkspaceRows(workspaceId);

  const needle = (query.search || '').trim().toLowerCase().slice(0, 200);
  const status = (query.status || 'all').trim();
  const source = query.source && query.source !== 'all' ? query.source : null;

  // Search and status apply first so the per-source counts still describe what
  // the user is looking at when they switch platform tabs.
  const searched = rows.filter(
    (row) =>
      matchesSearch(row, needle) &&
      (status === 'all' || row.status.toLowerCase() === status.toLowerCase()),
  );

  const counts = { all: searched.length, crm: 0, meta: 0, google: 0 };
  for (const row of searched) counts[row.source] += 1;

  const filtered = source ? searched.filter((row) => row.source === source) : searched;

  const sort = query.sort ?? 'name';
  const direction = query.direction === 'desc' ? -1 : 1;
  filtered.sort((a, b) => compare(a, b, sort) * direction || a.name.localeCompare(b.name));

  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, query.pageSize || DEFAULT_PAGE_SIZE));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.floor(query.page || 1)));
  const start = (page - 1) * pageSize;

  const statuses = Array.from(new Set(rows.map((row) => row.status).filter(Boolean))).sort();

  // Header totals describe the whole filtered set so they do not change as the
  // user pages through the table.
  const totals = filtered.reduce(
    (acc, row) => ({
      spend: acc.spend + (row.spend ?? 0),
      activeBudget:
        acc.activeBudget + (row.status.toLowerCase() === 'active' ? row.budget ?? 0 : 0),
    }),
    { spend: 0, activeBudget: 0 },
  );

  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    pageCount,
    counts,
    statuses,
    totals,
    lastSyncedAt,
    cached: wasCached,
  };
}
