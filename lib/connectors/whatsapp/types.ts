// ============================================================================
// WhatsApp Cloud API Types
// ============================================================================
// Re-export CrmMessage from shared types
export type { CrmMessage } from '../shared/types';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
export interface WhatsAppConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
  appId: string;
  appSecret: string;
}

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------
export type MessageType =
  | 'text'
  | 'template'
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  | 'location'
  | 'contacts'
  | 'reaction'
  | 'interactive'
  | 'button'
  | 'order'
  | 'system'
  | 'unknown';

export interface TextMessage {
  type: 'text';
  text: { body: string; preview_url?: boolean };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters: Array<Record<string, unknown>>;
}

export interface TemplateMessage {
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: TemplateComponent[];
  };
}

export type SendMessageRequest = {
  messaging_product: 'whatsapp';
  recipient_type?: 'individual';
  to: string;
} & (TextMessage | TemplateMessage | Record<string, unknown>);

export interface SendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Webhook Types
// ---------------------------------------------------------------------------
export interface WebhookError {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
  error_data?: { details?: string };
}

export interface WebhookContact {
  profile: { name?: string };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: MessageType;
  text?: { body: string; preview_url?: boolean };
  image?: { caption?: string; id: string; mime_type: string; sha256: string };
  video?: { caption?: string; id: string; mime_type: string; sha256: string; filename?: string };
  document?: { caption?: string; id: string; mime_type: string; sha256: string; filename?: string };
  audio?: { id: string; mime_type: string; sha256: string; transcript?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: Array<Record<string, unknown>>;
  reaction?: { message_id: string; emoji: string };
  interactive?: {
    type: string;
    button_reply?: { id: string; title: string };
    list_reply?: { id: string; title: string; description?: string };
    nfm_reply?: { body: string; response_json?: string };
  };
  button?: { text: string; payload: string };
  order?: Record<string, unknown>;
  system?: { body: string; type: string; new_wa_id?: string };
  context?: { message_id: string; forwarded?: boolean };
  referral?: { body: string; headline: string; media_id: string; source_type: string; source_url: string };
  errors?: WebhookError[];
  [key: string]: unknown;
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: { id: string; origin?: { type: string } };
  pricing?: { category: string; pricing_model: string; billable: boolean };
  errors?: WebhookError[];
}

export interface WebhookValue {
  messaging_product?: string;
  metadata?: { display_phone_number: string; phone_number_id: string };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookChange {
  field: string;
  value: WebhookValue;
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

// ---------------------------------------------------------------------------
// Phone Number / WABA / Template Types
// ---------------------------------------------------------------------------
export interface PhoneNumberInfo {
  verified_name: string;
  display_phone_number: string;
  id: string;
  quality_rating?: string;
  status?: string;
  messaging_limit_tier?: string;
  platform_type?: string;
  throughputs?: Array<{ level: string; throughput: number }>;
}

export interface WabaInfo {
  id: string;
  name?: string;
  message_template_namespace?: string;
  timezone?: string;
  on_behalf_of_business?: string;
  primary_phone_number?: string;
}

export interface MessageTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  id: string;
  components?: Array<Record<string, unknown>>;
}

export interface TemplateListResponse {
  data: MessageTemplate[];
  paging?: { cursors: { before: string; after: string }; next?: string; previous?: string };
}
