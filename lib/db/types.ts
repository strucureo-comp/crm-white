export type UserRole = 'client' | 'admin' | 'dev';

// ===== WORKSPACE & ROLE SYSTEM =====

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  setup_completed: boolean;
  setup_step: number; // 0-5, tracks wizard progress
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface PlatformAdmin {
  id: string;
  user_id: string;
  assigned_by?: string;
  created_at: string;
}

export type ProjectStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'in_progress'
  | 'testing'
  | 'completed'
  | 'cancelled';

export type FileType = 'document' | 'voice_note' | 'image' | 'other';

export type SupportStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type PriorityLevel = 'low' | 'medium' | 'high';

export type MeetingStatus = 'pending' | 'accepted' | 'declined' | 'completed';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export type MemberStatus = 'active' | 'inactive';

export type NotificationType = 'project' | 'payment' | 'support' | 'meeting' | 'system';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
  attachment_url?: string;
  tax_rate_id?: string;
  currency?: string;
  exchange_rate?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  github_link?: string;
  document_url?: string;
  estimated_cost?: number;
  actual_cost?: number;
  deadline?: string;
  progress_percentage?: number;
  test_asset_url?: string;
  deployment_url?: string; // Kept for backward compatibility or primary link

  // LIVE PREVIEW CONFIG
  live_preview_type?: 'url' | 'image';
  live_preview_url?: string;

  // DYNAMIC TECHNICAL CONFIG
  technical_config?: Array<{
    id: string;
    label: string;
    value: string;
    isLink?: boolean;
    isSecret?: boolean;
    category: 'infra' | 'admin' | 'deploy';
  }>;

  // TICKETS & NOTES
  tickets?: Array<{
    id: string;
    title: string;
    description?: string;
    attachment_url?: string;
    completed: boolean;
    created_at?: string;
  }>;
  notes?: string[];

  is_featured?: boolean; // Mark project as featured for portfolio/showcase

  // Manual Client Details (for non-registered clients)
  manual_client_name?: string;
  manual_client_email?: string;
  manual_client_company?: string;
  manual_client_phone?: string;

  // RECURRING COSTS & MAINTENANCE
  maintenance_cost?: number;        // What we charge the client
  maintenance_frequency?: 'monthly' | 'yearly';
  
  internal_resource_cost?: number;  // What we actually pay (Admin only)
  resource_frequency?: 'monthly' | 'yearly';
  
  next_billing_date?: string;

  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_type: FileType;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  update_text: string;
  created_by: string;
  created_at: string;
}

export interface SupportRequest {
  id: string;
  project_id?: string;
  client_id: string;
  subject: string;
  description: string;
  status: SupportStatus;
  priority: PriorityLevel;
  attachment_url?: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  support_request_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

export interface MeetingRequest {
  id: string;
  project_id?: string;
  client_id: string;
  requested_date: string;
  duration_minutes: number;
  purpose: string;
  status: MeetingStatus;
  meeting_link?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  status: InvoiceStatus;
  description?: string;
  notes?: string;
  payment_qr_url?: string;
  bank_details?: Record<string, any>;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  transaction_id?: string;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  monthly_salary: number;
  joined_date: string;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
}

export interface SalaryPayment {
  id: string;
  team_member_id: string;
  amount: number;
  payment_date: string;
  month: string;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  created_at: string;
}

export type AgentStatus = 'Active' | 'On Break' | 'Offline';

export interface FieldAgent {
  id: string;
  name: string;
  status: AgentStatus;
  location: string;
  battery: number;
  lastCheckin: string;
  route: string;
  created_at: string;
  updated_at: string;
}

export interface FieldAlert {
  id: string;
  agent: string;
  type: string;
  message: string;
  time: string;
  created_at: string;
}

export type ContentStatus = 'Draft' | 'In Review' | 'Scheduled' | 'Published';

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  author: string;
  status: ContentStatus;
  updated_at: string;
  created_at: string;
}

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  size: string;
  dimensions: string;
  url: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  date: string;
  time?: string;
  description?: string;
  attendees?: string;
  color?: string;
  project_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type IntegrationStatus = 'Connected' | 'Available' | 'Active';

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: IntegrationStatus;
  category: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationRule {
  id: string;
  trigger: string;
  action: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
}

export interface AiConversation {
  id: string;
  title: string;
  assistant: string;
  messages: AiMessage[];
  created_by: string;
  created_at: string;
  updated_at: string;
}



export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuotationItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quotation {
  id: string;
  project_id?: string;
  project_title?: string; // Snapshot or manual
  client_id: string; // Can be empty if manual
  quotation_number: string;
  amount: number;
  valid_until: string;
  status: QuotationStatus;
  currency: string;
  description?: string;
  items: QuotationItem[];
  notes?: string;

  // Manual Client Details (Non-registered)
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  client_is_company?: boolean;

  created_at: string;
  updated_at: string;
}

export interface SystemSettings {
  id: string;
  key: string;
  value: Record<string, any>;
  updated_at: string;
}

export interface PlanningNote {
  id: string;
  title: string;
  content: string;
  category: 'idea' | 'strategy' | 'todo' | 'other';
  created_by: string;
  updated_at: string;
  created_at: string;
}

// ===== TAGS TO ADD FROM TAGVERSE CRM =====

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type CampaignChannel = 'email' | 'social' | 'paid' | 'sms';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  budget?: number;
  spent?: number;
  target_audience?: string;
  start_date?: string;
  end_date?: string;
  kpi_metrics?: Record<string, number>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  content: string;
  media_url?: string;
  scheduled_at: string;
  published_at?: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed' | 'draft';
  engagement?: { likes?: number; comments?: number; shares?: number };
  campaign_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type DeliveryStage = 'pending' | 'out_for_delivery' | 'delivered' | 'returned' | 'issue';

export interface Delivery {
  id: string;
  client_name: string;
  client_phone?: string;
  client_address?: string;
  items: DeliveryItem[];
  stage: DeliveryStage;
  scheduled_date?: string;
  delivered_date?: string;
  proof_url?: string;
  notes?: string;
  assigned_agent?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  created_at: string;
  updated_at: string;
}

export type ActivityAction =
  | 'lead_created' | 'lead_updated' | 'lead_deleted'
  | 'deal_stage_changed'
  | 'invoice_created' | 'invoice_paid'
  | 'quote_created' | 'quote_accepted'
  | 'project_created' | 'project_updated'
  | 'task_created' | 'task_completed'
  | 'contract_signed'
  | 'campaign_created'
  | 'payment_received'
  | 'user_login' | 'user_created';

export interface ActivityLog {
  id: string;
  action: ActivityAction;
  description: string;
  entity_type: string;
  entity_id?: string;
  user_id: string;
  user_name: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type EmailCampaignStatus = 'draft' | 'scheduling' | 'active' | 'completed' | 'paused';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  variables?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id: string;
  recipient_list: string[];
  scheduled_at?: string;
  sequence_step: number;
  status: EmailCampaignStatus;
  stats?: { sent: number; opened: number; clicked: number; bounced: number };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  id: string;
  campaign_id: string;
  recipient_email: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced?: boolean;
}

export type EnquiryStatus = 'new' | 'read' | 'replied' | 'converted';

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
  status: EnquiryStatus;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  project?: string;
  priority: TaskPriority;
  due_date?: string;
  assignee?: string;
  status: TaskStatus;
  description?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  status: LeadStatus;
  source?: string;
  potential_value?: number;
  probability?: number;
  notes?: string;
  last_contacted?: string;
  next_follow_up?: string;
  follow_up_notes?: string;
  lead_score?: number;
  intent?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// NORMALIZED DATA MODEL - Relationship-driven CRM
// ============================================================================

// ===== COMPANY (New Entity) =====
export interface Company {
  company_id: string;
  workspace_id: string;
  
  // Basic Info
  name: string;
  legal_name: string;
  website: string;
  phone: string;
  email: string;
  
  // Address
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  
  // Tax IDs
  gst_number: string;
  pan_number: string;
  vat_number: string;
  registration_number: string;
  
  // Financial
  currency: string;
  timezone: string;
  
  // Bank Details
  bank_name: string;
  account_number: string;
  ifsc: string;
  swift: string;
  upi: string;
  
  // Branding (overrides workspace defaults)
  logo_url: string;
  footer_text: string;
  
  // Stats (computed on read)
  contact_count?: number;
  deal_count?: number;
  quote_count?: number;
  invoice_count?: number;
  total_revenue?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ===== CONTACT (New Entity) =====
export interface Contact {
  contact_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  
  // Basic Info
  name: string;
  email: string;
  phone: string;
  
  // Role
  role: string;
  department: string;
  designation: string;
  
  // Flags
  is_primary: boolean;
  is_decision_maker: boolean;
  
  // Social
  linkedin: string;
  whatsapp: string;
  
  // Notes
  notes: string;
  
  // Stats (computed on read)
  deal_count?: number;
  quote_count?: number;
  invoice_count?: number;
  last_activity?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ===== LEAD (Enhanced) =====
export interface NormalizedLead {
  lead_id: string;
  workspace_id: string;
  company_id: string; // FK → Company (optional)
  contact_id: string; // FK → Contact (created when qualified)
  
  // Basic Info
  name: string;
  email: string;
  phone: string;
  
  // Lead Info
  source: string;
  status: NormalizedLeadStatus;
  intent: 'hot' | 'warm' | 'cold';
  
  // Scoring
  lead_score: number;
  probability: number;
  
  // Value
  potential_value: number;
  
  // Tags
  tags: string[];
  
  // Follow-up
  last_contacted: string;
  next_follow_up: string;
  follow_up_notes: string;
  
  // Conversion
  converted_to_contact: string;
  converted_to_deal: string;
  converted_at: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type NormalizedLeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted_contact'
  | 'converted_deal'
  | 'lost';

// ===== DEAL (Enhanced) =====
export interface NormalizedDeal {
  deal_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  lead_id: string; // FK → Lead
  pipeline_id: string; // FK → Pipeline
  stage_id: string; // FK → PipelineStage
  owner_id: string; // FK → User
  
  // Basic Info
  title: string;
  description: string;
  
  // Value
  value: number;
  currency: string;
  
  // Timeline
  expected_close_date: string;
  actual_close_date: string;
  
  // Status
  status: DealStatus;
  
  // Probability
  probability: number;
  
  // Source
  source: string;
  
  // Stats (computed on read)
  quote_count?: number;
  invoice_count?: number;
  total_quoted?: number;
  total_invoiced?: number;
  total_paid?: number;
  days_in_pipeline?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type DealStatus = 'open' | 'won' | 'lost' | 'abandoned';

// ===== QUOTE (Enhanced) =====
export interface NormalizedQuote {
  quote_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  deal_id: string; // FK → Deal
  
  // Number
  quote_number: string;
  
  // Items
  items: QuoteItem[];
  
  // Financials
  subtotal: number;
  discount: number;
  discount_type: 'percentage' | 'fixed';
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  
  // Status
  status: NormalizedQuoteStatus;
  
  // Validity
  valid_until: string;
  
  // Notes
  notes: string;
  terms_and_conditions: string;
  
  // Conversion
  converted_to_invoice: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface QuoteItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate: number;
}

export type NormalizedQuoteStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

// ===== INVOICE (Enhanced) =====
export interface NormalizedInvoice {
  invoice_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  deal_id: string; // FK → Deal
  quote_id: string; // FK → Quote
  
  // Number
  invoice_number: string;
  
  // Items
  items: InvoiceItem[];
  
  // Financials
  subtotal: number;
  discount: number;
  discount_type: 'percentage' | 'fixed';
  tax: number;
  tax_rate: number;
  total: number;
  currency: string;
  
  // Status
  status: NormalizedInvoiceStatus;
  
  // Timeline
  issue_date: string;
  due_date: string;
  paid_date: string;
  
  // Payment
  amount_paid: number;
  amount_due: number;
  
  // Notes
  notes: string;
  terms_and_conditions: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface InvoiceItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate: number;
}

export type NormalizedInvoiceStatus = 
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'overdue'
  | 'paid'
  | 'partially_paid'
  | 'cancelled';

// ===== PAYMENT (Enhanced) =====
export interface NormalizedPayment {
  payment_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  invoice_id: string; // FK → Invoice
  quote_id: string; // FK → Quote
  deal_id: string; // FK → Deal
  
  // Amount
  amount: number;
  currency: string;
  
  // Method
  method: PaymentMethod;
  reference: string;
  
  // Status
  status: PaymentStatus;
  
  // Date
  date: string;
  
  // Notes
  notes: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'upi'
  | 'credit_card'
  | 'debit_card'
  | 'cheque'
  | 'other';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// ===== ACTIVITY (New Entity) =====
export interface NormalizedActivity {
  activity_id: string;
  workspace_id: string;
  
  // Relationships
  company_id: string;
  contact_id: string;
  deal_id: string;
  quote_id: string;
  invoice_id: string;
  lead_id: string;
  
  // Type
  type: ActivityType;
  
  // Content
  title: string;
  description: string;
  
  // Metadata
  metadata: Record<string, any>;
  
  // User
  user_id: string;
  
  // Timestamps
  created_at: string;
}

export type ActivityType = 
  | 'lead_created'
  | 'lead_qualified'
  | 'lead_converted_contact'
  | 'lead_converted_deal'
  | 'contact_created'
  | 'contact_updated'
  | 'deal_created'
  | 'deal_stage_changed'
  | 'deal_won'
  | 'deal_lost'
  | 'quote_created'
  | 'quote_sent'
  | 'quote_viewed'
  | 'quote_accepted'
  | 'quote_rejected'
  | 'quote_expired'
  | 'invoice_created'
  | 'invoice_sent'
  | 'invoice_viewed'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'payment_received'
  | 'payment_failed'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'meeting_cancelled'
  | 'email_sent'
  | 'email_received'
  | 'note_added'
  | 'task_created'
  | 'task_completed'
  | 'call_logged'
  | 'whatsapp_sent'
  | 'whatsapp_received'
  | 'document_uploaded'
  | 'document_downloaded'
  | 'status_changed'
  | 'comment_added'
  | 'mention_added';

// ===== PIPELINE (Enhanced) =====
export interface NormalizedPipeline {
  pipeline_id: string;
  workspace_id: string;
  name: string;
  description: string;
  stages: NormalizedPipelineStage[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface NormalizedPipelineStage {
  stage_id: string;
  pipeline_id: string;
  name: string;
  description: string;
  order: number;
  color: string;
  probability: number;
  deal_count?: number;
  total_value?: number;
}

// ===== Relationship Check Types =====
export interface RelationshipCheck {
  entity_type: string;
  entity_id: string;
  related_count: number;
  related_type: string;
}

export interface DeleteCheckResult {
  canDelete: boolean;
  reason?: string;
  relationships: RelationshipCheck[];
}

// ===== Related Entities (for Context Panel) =====
export interface RelatedEntities {
  contacts: Contact[];
  deals: NormalizedDeal[];
  quotes: NormalizedQuote[];
  invoices: NormalizedInvoice[];
  payments: NormalizedPayment[];
  activities: NormalizedActivity[];
  tasks: TaskItem[];
  meetings: MeetingRequest[];
}

// ===== Auto-Fill Defaults =====
export interface AutoFillDefaults {
  currency: string;
  timezone: string;
  gst_number: string;
  pan_number: string;
  vat_number: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  swift: string;
  upi: string;
  logo_url: string;
  footer_text: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

// ===== Event Types =====
export type EventType = 
  | 'company:created'
  | 'company:updated'
  | 'company:deleted'
  | 'contact:created'
  | 'contact:updated'
  | 'contact:deleted'
  | 'lead:created'
  | 'lead:updated'
  | 'lead:qualified'
  | 'lead:converted'
  | 'deal:created'
  | 'deal:updated'
  | 'deal:deleted'
  | 'deal:stage_changed'
  | 'deal:won'
  | 'deal:lost'
  | 'quote:created'
  | 'quote:updated'
  | 'quote:deleted'
  | 'quote:sent'
  | 'quote:accepted'
  | 'quote:rejected'
  | 'invoice:created'
  | 'invoice:updated'
  | 'invoice:deleted'
  | 'invoice:sent'
  | 'invoice:paid'
  | 'invoice:overdue'
  | 'payment:created'
  | 'payment:updated'
  | 'payment:deleted'
  | 'payment:received'
  | 'payment:failed'
  | 'activity:created'
  | 'dashboard:refresh';
