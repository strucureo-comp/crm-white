export type UserRole = 'client' | 'admin' | 'dev';

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

export type ContractStatus = 'Active' | 'Draft' | 'Under Review' | 'Expired';

export interface Contract {
  id: string;
  title: string;
  type: string;
  status: ContractStatus;
  parties: string;
  expiry: string;
  progress: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export type ReportStatus = 'Active' | 'Paused';

export interface Report {
  id: string;
  name: string;
  type: string;
  nextRun: string;
  format: string;
  recipientCount: number;
  status: ReportStatus;
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
  created_at: string;
  updated_at: string;
}
