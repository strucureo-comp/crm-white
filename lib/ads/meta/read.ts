// ============================================================================
// Meta Ads — read-only campaign reader (server-only)
//
// Uses only GET requests: `/{account}/campaigns` for definitions and a single
// account-level `/{account}/insights` call for metrics. Nothing here mutates
// anything on Meta.
// ============================================================================
import { MetaClient } from '@/lib/connectors/meta/client';
import { logAdError } from '../errors';
import type { AdAccountRef, NormalizedAdCampaign, NormalizedStatus } from '../types';
import { campaignKey } from '../types';

const PAGE_LIMIT = 100;
const MAX_PAGES = 25; // 2,500 campaigns per account per sync

/** Currencies Meta reports in whole units rather than hundredths. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW',
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

function minorUnitsToCurrency(raw: string | undefined, currency?: string): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) return undefined;
  const divisor = currency && ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
  return value / divisor;
}

function toNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Maps Meta's `effective_status` (which reflects parent pauses and review state)
 * onto the CRM's status vocabulary.
 */
export function mapMetaStatus(effectiveStatus?: string, status?: string): NormalizedStatus {
  const value = (effectiveStatus || status || '').toUpperCase();
  switch (value) {
    case 'ACTIVE':
      return 'Active';
    case 'PAUSED':
    case 'CAMPAIGN_PAUSED':
    case 'ADSET_PAUSED':
      return 'Paused';
    case 'DELETED':
    case 'ARCHIVED':
      return 'Removed';
    case 'PENDING_REVIEW':
    case 'PENDING_BILLING_INFO':
    case 'IN_PROCESS':
    case 'PREAPPROVED':
      return 'Draft';
    case 'DISAPPROVED':
    case 'WITH_ISSUES':
      return 'Paused';
    case '':
      return 'Unknown';
    default:
      return 'Unknown';
  }
}

/** Action types treated as the campaign's headline result, most specific first. */
const CONVERSION_PRIORITY = [
  'omni_purchase',
  'purchase',
  'offsite_conversion.fb_pixel_purchase',
  'onsite_conversion.purchase',
  'lead',
  'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead',
  'complete_registration',
];

function pickConversions(actions?: { action_type: string; value: string }[]): number | undefined {
  if (!actions || actions.length === 0) return undefined;

  for (const type of CONVERSION_PRIORITY) {
    const match = actions.find((a) => a.action_type === type);
    if (match) {
      const value = Number(match.value);
      if (Number.isFinite(value)) return value;
    }
  }

  // No recognised objective-level action: fall back to any pixel conversion.
  const pixel = actions.filter((a) => a.action_type.startsWith('offsite_conversion.'));
  if (pixel.length === 0) return undefined;
  return pixel.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

// ---------------------------------------------------------------------------
// API row shapes
// ---------------------------------------------------------------------------
interface MetaCampaignRow {
  id: string;
  name?: string;
  status?: string;
  effective_status?: string;
  objective?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
}

interface MetaPagedResponse<T> {
  data?: T[];
  paging?: { cursors?: { after?: string }; next?: string };
}

interface MetaCampaignInsightRow {
  campaign_id?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------
async function fetchAllPages<T>(
  client: MetaClient,
  path: string,
  params: Record<string, string>,
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await client.get<MetaPagedResponse<T>>(path, {
      ...params,
      limit: String(PAGE_LIMIT),
      ...(after ? { after } : {}),
    });
    rows.push(...(response.data || []));

    after = response.paging?.cursors?.after;
    if (!response.paging?.next || !after) break;
  }

  return rows;
}

/**
 * Reads every campaign in the account plus lifetime metrics, and returns them
 * normalized and ready to upsert.
 *
 * Metrics are optional: if the insights call fails (a common rate-limit target)
 * the campaign list is still returned and the failure is reported as a warning,
 * so the Campaigns page degrades to names/statuses instead of showing nothing.
 */
export async function readMetaCampaigns(options: {
  accessToken: string;
  account: AdAccountRef;
  workspaceId: string;
  connectionId: string;
}): Promise<{ campaigns: NormalizedAdCampaign[]; warnings: string[] }> {
  const { accessToken, account, workspaceId, connectionId } = options;
  const apiVersion = process.env.META_ADS_API_VERSION || 'v25.0';
  const client = new MetaClient(accessToken, account.id, apiVersion);
  const warnings: string[] = [];

  const campaigns = await fetchAllPages<MetaCampaignRow>(client, `/${account.id}/campaigns`, {
    fields:
      'id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
    // Include paused/archived campaigns so the CRM mirrors the full account.
    effective_status:
      '["ACTIVE","PAUSED","CAMPAIGN_PAUSED","ADSET_PAUSED","PENDING_REVIEW","DISAPPROVED","PREAPPROVED","PENDING_BILLING_INFO","IN_PROCESS","WITH_ISSUES","ARCHIVED"]',
  });

  // One account-level insights call covers every campaign — far cheaper than a
  // per-campaign request and much friendlier to Meta's rate limits.
  let insightsByCampaign = new Map<string, MetaCampaignInsightRow>();
  try {
    const insights = await fetchAllPages<MetaCampaignInsightRow>(
      client,
      `/${account.id}/insights`,
      {
        level: 'campaign',
        fields: 'campaign_id,impressions,clicks,spend,actions',
        date_preset: 'maximum',
      },
    );
    insightsByCampaign = new Map(
      insights
        .filter((row): row is MetaCampaignInsightRow & { campaign_id: string } =>
          Boolean(row.campaign_id),
        )
        .map((row) => [row.campaign_id, row]),
    );
  } catch (error) {
    logAdError('meta:insights', error);
    warnings.push('Meta performance metrics were unavailable for this sync.');
  }

  const now = new Date().toISOString();

  const normalized = campaigns.map((row) => {
    const insight = insightsByCampaign.get(row.id);
    const dailyBudget = minorUnitsToCurrency(row.daily_budget, account.currency);
    const lifetimeBudget = minorUnitsToCurrency(row.lifetime_budget, account.currency);

    return {
      key: campaignKey('meta', account.id, row.id),
      workspace_id: workspaceId,
      platform: 'meta',
      connection_id: connectionId,
      account_id: account.id,
      account_name: account.name,
      external_id: row.id,
      name: row.name || `Campaign ${row.id}`,
      status: mapMetaStatus(row.effective_status, row.status),
      platform_status: row.effective_status || row.status,
      objective: row.objective,
      currency: account.currency,
      budget: dailyBudget ?? lifetimeBudget,
      budget_period: dailyBudget !== undefined ? 'daily' : lifetimeBudget !== undefined ? 'lifetime' : undefined,
      spend: toNumber(insight?.spend),
      impressions: toNumber(insight?.impressions),
      clicks: toNumber(insight?.clicks),
      conversions: pickConversions(insight?.actions),
      start_date: row.start_time ?? null,
      end_date: row.stop_time ?? null,
      last_synced_at: now,
      created_at: row.created_time || now,
      updated_at: row.updated_time || now,
    } satisfies NormalizedAdCampaign;
  });

  return { campaigns: normalized, warnings };
}
