// ============================================================================
// Shared Connector Types — used by all CRM automation hub connectors
// ============================================================================

export interface CampaignPayload {
  name: string;
  budget: number;
  objective: string;
  targeting?: Record<string, unknown>;
  creative?: { headline: string; body: string; imageUrl?: string; linkUrl: string };
}

export interface CampaignStats {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

export interface CrmMessage {
  platform: 'whatsapp';
  messageId: string;
  from: string;
  to: string;
  body: string;
  type: string;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read' | 'failed';
  rawPayload?: unknown;
}

// ============================================================================
// Platform Adapter — common interface for ad-platform connectors
// ============================================================================
export interface PlatformAdapter {
  createCampaign(payload: CampaignPayload): Promise<string>;
  pauseCampaign(id: string): Promise<void>;
  getStats(id: string, from: string, to: string): Promise<CampaignStats[]>;
}
