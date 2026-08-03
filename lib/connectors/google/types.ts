// ============================================================================
// Google Ads Connector — Types
// ============================================================================

export interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  loginCustomerId: string;
  customerId: string;
}

export interface GoogleCampaignBuildInput {
  name: string;
  dailyBudgetMicros: number;
  targetUrl: string;
}

export interface GoogleCampaignBuildResult {
  budgetResourceName: string;
  campaignResourceName: string;
  adGroupResourceName: string;
  adResourceName: string;
}

export interface MutateResponse {
  results: { resourceName: string }[];
}

export interface SearchResponse<T> {
  results: T[];
}

export interface CampaignRow {
  campaign: { resourceName: string; name: string; status: string; id: string };
  metrics: { impressions: string; clicks: string; costMicros: string; conversions: string };
  segments: { date: string };
}