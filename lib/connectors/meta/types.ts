// ============================================================================
// Meta Ads Connector — Types
// ============================================================================

export interface MetaConfig {
  accessToken: string;
  adAccountId: string; // e.g. act_123456789012345
  apiVersion: string; // e.g. v25.0
}

export interface MetaCampaignBuildInput {
  name: string;
  objective: string;
  dailyBudgetCents: number;
  targeting: { geo_locations: { countries: string[] }; age_min?: number; age_max?: number };
  creative: { pageId: string; headline: string; body: string; linkUrl: string; imageUrl?: string };
}

export interface MetaCampaignBuildResult {
  campaignId: string;
  adSetId: string;
  adCreativeId: string;
  adId: string;
}

export interface MetaInsightRow {
  date_start: string;
  date_stop: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  actions?: { action_type: string; value: string }[];
}

export interface MetaInsightsResponse {
  data: MetaInsightRow[];
}