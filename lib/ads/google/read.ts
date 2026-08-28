// ============================================================================
// Google Ads — read-only campaign reader (server-only)
//
// Issues GAQL `search` requests only. No `:mutate` call appears in this module,
// so it cannot create, edit, pause, resume, or delete anything in Google Ads.
// ============================================================================
import { GoogleAdsClient } from '@/lib/connectors/google/client';
import { logAdError } from '../errors';
import { getGoogleAppConfig } from './oauth';
import type { AdAccountRef, NormalizedAdCampaign, NormalizedStatus } from '../types';
import { campaignKey } from '../types';

const MAX_PAGES = 25;
/**
 * Google Ads uses 2037-12-30 as the sentinel for "runs indefinitely"; showing
 * that as a real end date would be misleading.
 */
const NO_END_DATE_SENTINEL = '2037-';

function microsToCurrency(micros: string | number | undefined): number | undefined {
  if (micros === undefined || micros === null || micros === '') return undefined;
  const value = Number(micros);
  return Number.isFinite(value) ? value / 1_000_000 : undefined;
}

function toNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeDate(value?: string): string | null {
  if (!value) return null;
  if (value.startsWith(NO_END_DATE_SENTINEL)) return null;
  return value;
}

export function mapGoogleStatus(status?: string): NormalizedStatus {
  switch ((status || '').toUpperCase()) {
    case 'ENABLED':
      return 'Active';
    case 'PAUSED':
      return 'Paused';
    case 'REMOVED':
      return 'Removed';
    case '':
      return 'Unknown';
    default:
      return 'Unknown';
  }
}

/** Builds a client scoped to one customer account, authorized by refresh token. */
export function createAccountClient(
  refreshToken: string,
  account: AdAccountRef,
): GoogleAdsClient {
  const app = getGoogleAppConfig();
  return new GoogleAdsClient({
    clientId: app.clientId,
    clientSecret: app.clientSecret,
    developerToken: app.developerToken,
    refreshToken,
    // Falls back to the account itself when it is not under a manager.
    loginCustomerId: account.loginCustomerId || account.id,
    customerId: account.id,
  });
}

// ---------------------------------------------------------------------------
// Row shapes returned by googleAds:search
// ---------------------------------------------------------------------------
interface SearchPage<T> {
  results?: T[];
  nextPageToken?: string;
}

interface CampaignDefinitionRow {
  campaign?: {
    id?: string;
    name?: string;
    status?: string;
    advertisingChannelType?: string;
    startDate?: string;
    endDate?: string;
  };
  campaignBudget?: {
    amountMicros?: string;
    totalAmountMicros?: string;
    period?: string;
  };
}

interface CampaignMetricsRow {
  campaign?: { id?: string };
  metrics?: {
    impressions?: string;
    clicks?: string;
    costMicros?: string;
    conversions?: number | string;
  };
}

async function searchAllPages<T>(client: GoogleAdsClient, query: string): Promise<T[]> {
  const rows: T[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, unknown> = { query };
    if (pageToken) body.pageToken = pageToken;

    const response = await client.request<SearchPage<T>>(
      'POST',
      `${client.customersPath}/googleAds:search`,
      body,
    );

    rows.push(...(response?.results || []));
    pageToken = response?.nextPageToken;
    if (!pageToken) break;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Reader
// ---------------------------------------------------------------------------
/**
 * Reads campaign definitions and their metrics in two queries.
 *
 * They are separate on purpose: selecting metrics forces a date range, which
 * would silently drop campaigns that had no traffic in that window. Definitions
 * are fetched without metrics so every campaign appears, then metrics for the
 * last 30 days are joined on top.
 */
export async function readGoogleCampaigns(options: {
  refreshToken: string;
  account: AdAccountRef;
  workspaceId: string;
  connectionId: string;
}): Promise<{ campaigns: NormalizedAdCampaign[]; warnings: string[] }> {
  const { refreshToken, account, workspaceId, connectionId } = options;
  const client = createAccountClient(refreshToken, account);
  const warnings: string[] = [];

  const definitions = await searchAllPages<CampaignDefinitionRow>(
    client,
    'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, ' +
      'campaign.start_date, campaign.end_date, campaign_budget.amount_micros, ' +
      'campaign_budget.total_amount_micros, campaign_budget.period ' +
      "FROM campaign WHERE campaign.status != 'REMOVED'",
  );

  let metricsByCampaign = new Map<string, CampaignMetricsRow['metrics']>();
  try {
    const metrics = await searchAllPages<CampaignMetricsRow>(
      client,
      'SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros, ' +
        'metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS',
    );
    metricsByCampaign = new Map(
      metrics
        .filter((row) => row.campaign?.id)
        .map((row) => [String(row.campaign!.id), row.metrics]),
    );
  } catch (error) {
    logAdError('google:metrics', error);
    warnings.push('Google Ads performance metrics were unavailable for this sync.');
  }

  const now = new Date().toISOString();

  const campaigns = definitions
    .filter((row) => row.campaign?.id)
    .map((row) => {
      const campaign = row.campaign!;
      const externalId = String(campaign.id);
      const metrics = metricsByCampaign.get(externalId);
      const isDaily = (row.campaignBudget?.period || 'DAILY').toUpperCase() === 'DAILY';
      const dailyBudget = microsToCurrency(row.campaignBudget?.amountMicros);
      const totalBudget = microsToCurrency(row.campaignBudget?.totalAmountMicros);
      const budget = isDaily ? dailyBudget ?? totalBudget : totalBudget ?? dailyBudget;
      const budgetPeriod =
        budget === undefined ? undefined : budget === dailyBudget && isDaily ? 'daily' : 'lifetime';

      return {
        key: campaignKey('google', account.id, externalId),
        workspace_id: workspaceId,
        platform: 'google',
        connection_id: connectionId,
        account_id: account.id,
        account_name: account.name,
        external_id: externalId,
        name: campaign.name || `Campaign ${externalId}`,
        status: mapGoogleStatus(campaign.status),
        platform_status: campaign.status,
        objective: campaign.advertisingChannelType,
        currency: account.currency,
        budget,
        budget_period: budgetPeriod,
        spend: microsToCurrency(metrics?.costMicros),
        impressions: toNumber(metrics?.impressions),
        clicks: toNumber(metrics?.clicks),
        conversions: toNumber(metrics?.conversions),
        start_date: normalizeDate(campaign.startDate),
        end_date: normalizeDate(campaign.endDate),
        last_synced_at: now,
        created_at: now,
        updated_at: now,
      } satisfies NormalizedAdCampaign;
    });

  return { campaigns, warnings };
}
