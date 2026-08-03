// ============================================================================
// Meta Ads (Graph API) — Campaign Adapter (high-level operations)
// ============================================================================
import { MetaClient, MetaClientError } from './client';
import type {
  MetaCampaignBuildInput,
  MetaCampaignBuildResult,
  MetaInsightRow,
  MetaInsightsResponse,
} from './types';
import type { CampaignStats, CampaignPayload, PlatformAdapter } from '../shared/types';

// ---------------------------------------------------------------------------
// Response shape from creating a single object (campaign / adset / etc.)
// ---------------------------------------------------------------------------
interface MetaCreateResponse {
  id: string;
}

export class MetaCampaignAdapter implements PlatformAdapter {
  protected client: MetaClient;
  private adAccountId: string;

  constructor(accessToken: string, adAccountId: string, apiVersion: string) {
    this.adAccountId = adAccountId;
    this.client = new MetaClient(accessToken, adAccountId, apiVersion);
  }

  // -------------------------------------------------------------------------
  // Create a single campaign entity (always PAUSED).
  // POST to /${adAccountId}/campaigns
  // -------------------------------------------------------------------------
  async createCampaign(payload: CampaignPayload): Promise<string> {
    const body: Record<string, unknown> = {
      name: payload.name,
      objective: payload.objective,
      status: 'PAUSED',
      special_ad_categories: [],
      smart_promotion_type: 'NONE',
    };

    const response = await this.client.post<MetaCreateResponse>(
      `/${this.adAccountId}/campaigns`,
      body,
    );
    if (!response.id) throw new MetaClientError('Failed to create campaign', 500);
    return response.id;
  }

  // -------------------------------------------------------------------------
  // Step 2 — Create an Ad Set linked to the campaign
  // POST to /${adAccountId}/adsets
  // -------------------------------------------------------------------------
  private async createAdSet(
    input: MetaCampaignBuildInput,
    campaignId: string,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      name: `${input.name} - Ad Set`,
      campaign_id: campaignId,
      daily_budget: input.dailyBudgetCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'REACH',
      status: 'PAUSED',
      targeting: {
        geo_locations: input.targeting.geo_locations,
        ...(input.targeting.age_min !== undefined && { age_min: input.targeting.age_min }),
        ...(input.targeting.age_max !== undefined && { age_max: input.targeting.age_max }),
      },
    };

    const response = await this.client.post<MetaCreateResponse>(
      `/${this.adAccountId}/adsets`,
      body,
    );
    if (!response.id) throw new MetaClientError('Failed to create ad set', 500);
    return response.id;
  }

  // -------------------------------------------------------------------------
  // Step 3 — Create an Ad Creative
  // POST to /${adAccountId}/adcreatives
  // -------------------------------------------------------------------------
  private async createAdCreative(input: MetaCampaignBuildInput): Promise<string> {
    const linkData: Record<string, unknown> = {
      message: input.creative.body,
      link: input.creative.linkUrl,
      name: input.creative.headline,
    };
    if (input.creative.imageUrl) {
      linkData.picture = input.creative.imageUrl;
    }

    const body: Record<string, unknown> = {
      name: `${input.name} - Creative`,
      object_story_spec: {
        page_id: input.creative.pageId,
        link_data: linkData,
      },
    };

    const response = await this.client.post<MetaCreateResponse>(
      `/${this.adAccountId}/adcreatives`,
      body,
    );
    if (!response.id) throw new MetaClientError('Failed to create ad creative', 500);
    return response.id;
  }

  // -------------------------------------------------------------------------
  // Step 4 — Create the Ad linking Ad Set + Creative (always PAUSED)
  // POST to /${adAccountId}/ads
  // -------------------------------------------------------------------------
  private async createAd(
    adSetId: string,
    adCreativeId: string,
    input: MetaCampaignBuildInput,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      name: `${input.name} - Ad`,
      adset_id: adSetId,
      creative: { creative_id: adCreativeId },
      status: 'PAUSED',
    };

    const response = await this.client.post<MetaCreateResponse>(
      `/${this.adAccountId}/ads`,
      body,
    );
    if (!response.id) throw new MetaClientError('Failed to create ad', 500);
    return response.id;
  }

  // -------------------------------------------------------------------------
  // Build the full campaign hierarchy: Campaign → AdSet → AdCreative → Ad
  // All created as PAUSED.
  // -------------------------------------------------------------------------
  async buildFullCampaign(input: MetaCampaignBuildInput): Promise<MetaCampaignBuildResult> {
    const campaignId = await this.createCampaign({
      name: input.name,
      objective: input.objective,
      budget: input.dailyBudgetCents,
    });
    const adSetId = await this.createAdSet(input, campaignId);
    const adCreativeId = await this.createAdCreative(input);
    const adId = await this.createAd(adSetId, adCreativeId, input);
    return { campaignId, adSetId, adCreativeId, adId };
  }

  // -------------------------------------------------------------------------
  // Pause a campaign by updating its status to PAUSED
  // POST to /${id} with status=PAUSED
  // -------------------------------------------------------------------------
  async pauseCampaign(id: string): Promise<void> {
    await this.client.post<{ success: boolean }>(`/${id}`, { status: 'PAUSED' });
  }

  // -------------------------------------------------------------------------
  // Retrieve campaign insights (stats) for a date range
  // GET /${id}/insights
  // -------------------------------------------------------------------------
  async getStats(id: string, from: string, to: string): Promise<CampaignStats[]> {
    const timeRange = JSON.stringify({ since: from, until: to });
    const response = await this.client.get<MetaInsightsResponse>(`/${id}/insights`, {
      fields: 'impressions,clicks,spend,actions,date_start,date_stop',
      time_range: timeRange,
      level: 'campaign',
    });

    return (response.data || []).map((row: MetaInsightRow) => {
      const conversions = row.actions?.find(
        (a) => a.action_type === 'offsite_conversion' || a.action_type === 'link_click',
      );
      return {
        date: row.date_start || '',
        impressions: parseInt(row.impressions || '0', 10),
        clicks: parseInt(row.clicks || '0', 10),
        spend: parseFloat(row.spend || '0'),
        conversions: conversions ? parseInt(conversions.value, 10) : 0,
      };
    });
  }

  // -------------------------------------------------------------------------
  // Delete the full hierarchy in reverse order: Ad → AdCreative → AdSet → Campaign
  // -------------------------------------------------------------------------
  async deleteFullHierarchy(result: MetaCampaignBuildResult): Promise<void> {
    if (result.adId) {
      await this.client.delete<{ success: boolean }>(`/${result.adId}`).catch(() => {});
    }
    if (result.adCreativeId) {
      await this.client.delete<{ success: boolean }>(`/${result.adCreativeId}`).catch(() => {});
    }
    if (result.adSetId) {
      await this.client.delete<{ success: boolean }>(`/${result.adSetId}`).catch(() => {});
    }
    if (result.campaignId) {
      await this.client.delete<{ success: boolean }>(`/${result.campaignId}`).catch(() => {});
    }
  }
}
