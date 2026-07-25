// ===== AUTOMATION HUB TYPES =====

// === Connected Apps ===
export type IntegrationPlatform = 
  | 'google_ads'
  | 'meta_ads'
  | 'linkedin_ads'
  | 'tiktok'
  | 'twitter'
  | 'youtube'
  | 'google_drive'
  | 'dropbox'
  | 'slack'
  | 'discord'
  | 'whatsapp'
  | 'telegram'
  | 'stripe'
  | 'razorpay'
  | 'zoom'
  | 'notion'
  | 'github'
  | 'openai'
  | 'anthropic'
  | 'aws'
  | 'cloudflare'
  | 'gmail'
  | 'google_calendar'
  | 'outlook'
  | 'zapier'
  | 'make';

export interface ConnectedApp {
  app_id: string;
  workspace_id: string;
  platform: IntegrationPlatform;
  name: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  scopes: string[];
  metadata: Record<string, any>;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

// === Automation Rules ===
export type TriggerType = 
  | 'lead_created'
  | 'lead_qualified'
  | 'lead_status_changed'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'payment_received'
  | 'contact_created'
  | 'contact_updated'
  | 'activity_created'
  | 'form_submitted'
  | 'email_opened'
  | 'email_clicked'
  | 'page_visited'
  | 'schedule'
  | 'webhook_received';

export type ActionType = 
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'create_task'
  | 'assign_to_user'
  | 'update_deal_stage'
  | 'update_lead_status'
  | 'create_deal'
  | 'create_quote'
  | 'create_invoice'
  | 'add_to_campaign'
  | 'remove_from_campaign'
  | 'add_tag'
  | 'remove_tag'
  | 'notify_slack'
  | 'notify_discord'
  | 'notify_webhook'
  | 'call_api'
  | 'wait'
  | 'condition'
  | 'ai_generate'
  | 'ai_classify'
  | 'update_contact'
  | 'create_activity'
  | 'send_notification'
  | 'webhook_outgoing';

export type ConditionOperator = 
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_list'
  | 'not_in_list';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
  logic?: 'AND' | 'OR';
}

export interface AutomationAction {
  action_id: string;
  type: ActionType;
  config: Record<string, any>;
  delay_minutes?: number;
  conditions?: AutomationCondition[];
}

export interface AutomationRule {
  rule_id: string;
  workspace_id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  trigger_config: Record<string, any>;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

// === Workflows (Visual Builder) ===
export type WorkflowNodeType = 
  | 'trigger'
  | 'action'
  | 'condition'
  | 'delay'
  | 'branch'
  | 'end';

export interface WorkflowNode {
  node_id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  config: Record<string, any>;
  connections: string[];
}

export interface Workflow {
  workflow_id: string;
  workspace_id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  enabled: boolean;
  version: number;
  execution_count: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

// === Execution Logs ===
export type ExecutionStatus = 'started' | 'running' | 'completed' | 'failed' | 'retrying' | 'cancelled';
export type TriggerSource = 'manual' | 'automation' | 'webhook' | 'schedule' | 'api';

export interface ExecutionLog {
  log_id: string;
  workspace_id: string;
  rule_id?: string;
  workflow_id?: string;
  trigger_source: TriggerSource;
  trigger_data: Record<string, any>;
  status: ExecutionStatus;
  steps: ExecutionStep[];
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface ExecutionStep {
  step_id: string;
  action_type: ActionType;
  status: ExecutionStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

// === Secrets ===
export interface Secret {
  secret_id: string;
  workspace_id: string;
  name: string;
  value: string; // encrypted
  description?: string;
  category: 'api_key' | 'oauth' | 'token' | 'password' | 'webhook_secret';
  platform?: IntegrationPlatform;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

// === Variables ===
export type VariableCategory = 'system' | 'custom' | 'computed';

export interface Variable {
  variable_id: string;
  workspace_id: string;
  name: string;
  value: string;
  category: VariableCategory;
  description?: string;
  example?: string;
  created_at: string;
  updated_at: string;
}

// === Templates ===
export type TemplateType = 'email' | 'sms' | 'whatsapp' | 'notification' | 'workflow';

export interface AutomationTemplate {
  template_id: string;
  workspace_id: string;
  name: string;
  type: TemplateType;
  subject?: string;
  content: string;
  variables: string[];
  category: string;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// === Webhooks ===
export type WebhookDirection = 'incoming' | 'outgoing';
export type WebhookStatus = 'active' | 'inactive' | 'error';

export interface Webhook {
  webhook_id: string;
  workspace_id: string;
  name: string;
  direction: WebhookDirection;
  url: string;
  secret?: string;
  events: string[];
  headers: Record<string, string>;
  status: WebhookStatus;
  last_triggered_at?: string;
  success_count: number;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  log_id: string;
  webhook_id: string;
  direction: WebhookDirection;
  method?: string;
  url: string;
  request_headers?: Record<string, string>;
  request_body?: any;
  response_status?: number;
  response_headers?: Record<string, string>;
  response_body?: any;
  duration_ms?: number;
  success: boolean;
  error?: string;
  created_at: string;
}

// === API Keys ===
export type ApiKeyScope = 'read' | 'write' | 'admin' | 'webhook' | 'integration';

export interface ApiKey {
  key_id: string;
  workspace_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  rate_limit: number;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
  revoked_at?: string;
}

// === Campaigns ===
export type CampaignChannel = 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'email' | 'sms' | 'whatsapp' | 'social' | 'content';
export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';

export interface Campaign {
  campaign_id: string;
  workspace_id: string;
  name: string;
  description: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget?: number;
  spent?: number;
  currency: string;
  start_date?: string;
  end_date?: string;
  target_audience: string[];
  content: Record<string, any>;
  metrics: CampaignMetrics;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  roas: number;
  spend: number;
  revenue: number;
}

// === Social Media ===
export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'threads' | 'pinterest' | 'youtube';
export type PostStatus = 'draft' | 'review' | 'approved' | 'scheduled' | 'published' | 'failed';

export interface SocialPost {
  post_id: string;
  workspace_id: string;
  platform: SocialPlatform;
  content: string;
  media_urls: string[];
  hashtags: string[];
  status: PostStatus;
  scheduled_at?: string;
  published_at?: string;
  metrics: SocialMetrics;
  created_at: string;
  updated_at: string;
}

export interface SocialMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  engagement_rate: number;
}

// === Email Marketing ===
export type EmailStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

export interface EmailCampaign {
  campaign_id: string;
  workspace_id: string;
  name: string;
  subject: string;
  preview_text?: string;
  template_id?: string;
  content: string;
  recipients: EmailRecipient[];
  status: EmailStatus;
  scheduled_at?: string;
  sent_at?: string;
  metrics: EmailMetrics;
  created_at: string;
  updated_at: string;
}

export interface EmailRecipient {
  contact_id: string;
  email: string;
  name?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
}

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
  unsubscribe_rate: number;
}

export interface EmailSegment {
  segment_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  conditions: AutomationCondition[];
  contact_count: number;
  created_at: string;
  updated_at: string;
}

// === Content Hub ===
export type ContentType = 'blog' | 'landing_page' | 'case_study' | 'newsletter' | 'knowledge_base' | 'seo_article';
export type ContentStatus = 'draft' | 'review' | 'published' | 'archived';

export interface ContentItem {
  content_id: string;
  workspace_id: string;
  type: ContentType;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image?: string;
  tags: string[];
  category?: string;
  author_id: string;
  status: ContentStatus;
  seo: SEOData;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SEOData {
  meta_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  canonical_url?: string;
  og_image?: string;
  no_index?: boolean;
}

// === Media Library ===
export type MediaType = 'image' | 'video' | 'document' | 'audio' | 'other';

export interface MediaFolder {
  folder_id: string;
  workspace_id: string;
  name: string;
  parent_id?: string;
  path: string;
  created_at: string;
}

export interface MediaFile {
  file_id: string;
  workspace_id: string;
  folder_id?: string;
  name: string;
  type: MediaType;
  mime_type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  tags: string[];
  metadata: Record<string, any>;
  version: number;
  versions: MediaVersion[];
  created_at: string;
  updated_at: string;
}

export interface MediaVersion {
  version: number;
  url: string;
  size: number;
  created_at: string;
  created_by: string;
}

// === Marketing Calendar ===
export type CalendarEventType = 'campaign' | 'meeting' | 'email' | 'social' | 'deadline' | 'content' | 'task' | 'call' | 'follow_up';

export interface CalendarEvent {
  event_id: string;
  workspace_id: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  all_day: boolean;
  color?: string;
  entity_type?: string;
  entity_id?: string;
  attendees: string[];
  reminder?: number;
  recurrence?: string;
  created_at: string;
  updated_at: string;
}

// === MCP Servers ===
export type McpServerStatus = 'connected' | 'disconnected' | 'error' | 'connecting';

export interface McpServer {
  server_id: string;
  workspace_id: string;
  name: string;
  description: string;
  url: string;
  api_key?: string;
  status: McpServerStatus;
  capabilities: string[];
  last_connected_at?: string;
  created_at: string;
  updated_at: string;
}

export interface McpTool {
  tool_id: string;
  server_id: string;
  name: string;
  description: string;
  input_schema: Record<string, any>;
  enabled: boolean;
  call_count: number;
  last_called_at?: string;
}

// === Documentation ===
export type DocCategory = 'getting_started' | 'crm_guide' | 'api' | 'webhooks' | 'automation' | 'mcp' | 'integrations' | 'sdk' | 'examples' | 'release_notes' | 'faq' | 'support';

export interface DocPage {
  page_id: string;
  category: DocCategory;
  title: string;
  slug: string;
  content: string;
  order: number;
  parent_id?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationDoc {
  integration_id: string;
  platform: IntegrationPlatform;
  overview: string;
  setup_steps: string[];
  permissions: string[];
  scopes: string[];
  configuration: Record<string, any>;
  examples: string[];
  troubleshooting: string[];
  created_at: string;
  updated_at: string;
}
