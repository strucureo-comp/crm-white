// ============================================================================
// Google Ads API — Campaign Adapter (high-level operations)
// ============================================================================
import { GoogleAdsClient, GoogleAdsError } from './client';
import type {
  GoogleCampaignBuildInput,
  GoogleCampaignBuildResult,
  MutateResponse,
  CampaignRow,
} from './types';
import type { CampaignStats, CampaignPayload } from '../shared/types';

// ---------------------------------------------------------------------------
// Helper: convert micros string to currency number
// ---------------------------------------------------------------------------
function microsToCurrency(micros: string): number {
  return parseInt(micros, 10) / 1_000_000;
}

export class GoogleCampaignAdapter {
  constructor(private client: GoogleAdsClient) {}

  // -------------------------------------------------------------------------
  // Step 1 — Create a campaign budget (always PAUSED via later campaign status)
  // -------------------------------------------------------------------------
  private async createBudget(dailyBudgetMicros: number): Promise<string> {
    const response = await this.client.mutate<MutateResponse>('campaignBudgets', [
      {
        create: {
          amount_micros: dailyBudgetMicros,
          delivery_method: 'STANDARD',
          explicitly_shared: false,
        },
      },
    ]);
    const resourceName = response.results?.[0]?.resourceName;
    if (!resourceName) throw new GoogleAdsError('Failed to create campaign budget', 500);
    return resourceName;
  }

  // -------------------------------------------------------------------------
  // Step 2 — Create the campaign entity (always PAUSED)
  // -------------------------------------------------------------------------
  private async createCampaignEntity(
    input: GoogleCampaignBuildInput,
    budgetResourceName: string,
  ): Promise<string> {
    const response = await this.client.mutate<MutateResponse>('campaigns', [
      {
        create: {
          name: input.name,
          campaign_budget: budgetResourceName,
          advertising_channel_type: 'SEARCH',
          status: 'PAUSED',
          url_suffix: input.targetUrl,
          manual_cpc: { enhanced_cpc_enabled: true },
        },
      },
    ]);
    const resourceName = response.results?.[0]?.resourceName;
    if (!resourceName) throw new GoogleAdsError('Failed to create campaign', 500);
    return resourceName;
  }

  // -------------------------------------------------------------------------
  // Step 3 — Create an ad group under the campaign (always PAUSED)
  // -------------------------------------------------------------------------
  private async createAdGroup(campaignResourceName: string): Promise<string> {
    const response = await this.client.mutate<MutateResponse>('adGroups', [
      {
        create: {
          name: `Ad Group - ${Date.now()}`,
          campaign: campaignResourceName,
          type: 'SEARCH_STANDARD',
          status: 'PAUSED',
        },
      },
    ]);
    const resourceName = response.results?.[0]?.resourceName;
    if (!resourceName) throw new GoogleAdsError('Failed to create ad group', 500);
    return resourceName;
  }

  // -------------------------------------------------------------------------
  // Step 4 — Create a responsive search ad under the ad group (always PAUSED)
  // -------------------------------------------------------------------------
  private async createAd(
    adGroupResourceName: string,
    input: GoogleCampaignBuildInput,
  ): Promise<string> {
    const response = await this.client.mutate<MutateResponse>('adGroupAds', [
      {
        create: {
          ad_group: adGroupResourceName,
          status: 'PAUSED',
          responsive_search_ad: {
            headlines: [{ text: input.name, pinned_field: 'HEADLINE_1' }],
            descriptions: [{ text: `Visit ${input.targetUrl}` }],
            final_url: input.targetUrl,
            path1: 'visit',
          },
        },
      },
    ]);
    const resourceName = response.results?.[0]?.resourceName;
    if (!resourceName) throw new GoogleAdsError('Failed to create ad', 500);
    return resourceName;
  }

  // -------------------------------------------------------------------------
  // Create a full campaign hierarchy: Budget → Campaign → AdGroup → Ad
  // Always PAUSED so nothing goes live without explicit action.
  // -------------------------------------------------------------------------
  async createCampaign(input: GoogleCampaignBuildInput): Promise<GoogleCampaignBuildResult> {
    const budgetResourceName = await this.createBudget(input.dailyBudgetMicros);
    const campaignResourceName = await this.createCampaignEntity(input, budgetResourceName);
    const adGroupResourceName = await this.createAdGroup(campaignResourceName);
    const adResourceName = await this.createAd(adGroupResourceName, input);
    return { budgetResourceName, campaignResourceName, adGroupResourceName, adResourceName };
  }

  // -------------------------------------------------------------------------
  // Pause a campaign by mutating its status to PAUSED
  // -------------------------------------------------------------------------
  async pauseCampaign(resourceName: string): Promise<void> {
    await this.client.mutate<MutateResponse>('campaigns', [
      { update: { resource_name: resourceName, status: 'PAUSED' }, update_mask: 'status' },
    ]);
  }

  // -------------------------------------------------------------------------
  // Retrieve campaign stats via GAQL query
  // -------------------------------------------------------------------------
  async getStats(resourceName: string, from: string, to: string): Promise<CampaignStats[]> {
    const gaql =
      `SELECT campaign.resource_name, campaign.name, campaign.status, campaign.id, ` +
      `metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions, ` +
      `segments.date ` +
      `FROM campaign ` +
      `WHERE campaign.resource_name = '${resourceName}' ` +
      `AND segments.date BETWEEN '${from}' AND '${to}'`;

    const response = await this.client.search<CampaignRow>(gaql);
    return (response.results || []).map((row) => ({
      date: row.segments?.date || '',
      impressions: parseInt(row.metrics?.impressions || '0', 10),
      clicks: parseInt(row.metrics?.clicks || '0', 10),
      spend: microsToCurrency(row.metrics?.costMicros || '0'),
      conversions: parseInt(row.metrics?.conversions || '0', 10),
    }));
  }

  // -------------------------------------------------------------------------
  // Delete the full hierarchy in reverse order: Ad → AdGroup → Campaign → Budget
  // -------------------------------------------------------------------------
  async deleteFullHierarchy(result: GoogleCampaignBuildResult): Promise<void> {
    // Delete Ad
    if (result.adResourceName) {
      await this.client.mutate<MutateResponse>('adGroupAds', [
        { remove: result.adResourceName },
      ]).catch(() => {});
    }
    // Delete AdGroup
    if (result.adGroupResourceName) {
      await this.client.mutate<MutateResponse>('adGroups', [
        { remove: result.adGroupResourceName },
      ]).catch(() => {});
    }
    // Delete Campaign
    if (result.campaignResourceName) {
      await this.client.mutate<MutateResponse>('campaigns', [
        { remove: result.campaignResourceName },
      ]).catch(() => {});
    }
    // Delete Budget
    if (result.budgetResourceName) {
      await this.client.mutate<MutateResponse>('campaignBudgets', [
        { remove: result.budgetResourceName },
      ]).catch(() => {});
    }
  }

  // -------------------------------------------------------------------------
  // Compatibility wrapper for CampaignPayload-based callers.
  // Maps the generic payload to Google-specific input.
  // -------------------------------------------------------------------------
  async createCampaignFromPayload(payload: CampaignPayload): Promise<GoogleCampaignBuildResult> {
    return this.createCampaign({
      name: payload.name,
      dailyBudgetMicros: payload.budget * 1_000_000,
      targetUrl: payload.creative?.linkUrl || '',
    });
  }
}
