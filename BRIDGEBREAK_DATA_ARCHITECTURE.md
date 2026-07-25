# BridgeBreak CRM — Data Architecture Transformation

## Vision
Transform 20 independent modules into a **connected, relationship-driven CRM** where every action cascades through the system automatically.

---

## Current State (Problems)

```
❌ Independent pages with no connections
❌ Manual data entry everywhere (company, contact, email repeated)
❌ One-to-one relationships (one company = one contact)
❌ No activity logging
❌ Manual status changes
❌ Names used as identifiers (inconsistent)
❌ Settings exist but aren't consumed
❌ Each page updates independently
```

---

## Target State (Solution)

```
✅ Every entity connected via IDs
✅ Company-first: select company → auto-fill everything
✅ One-to-many relationships (company → many contacts)
✅ Auto-activity logging on every save
✅ Status automation (quote accepted → create invoice)
✅ ID-based references throughout
✅ Settings consumed everywhere
✅ Event-driven updates cascade through system
✅ Context panels show related data
✅ Smart dropdowns with search
✅ Relationship protection rules
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKSPACE                                │
│  workspace_id (PK)                                               │
│  name, settings, branding, currency, timezone                    │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                          COMPANY                                  │
│  company_id (PK)                                                 │
│  workspace_id (FK) → workspace                                   │
│  name, legal_name, website, phone, email                         │
│  address, city, state, country, pincode                          │
│  gst_number, pan_number, vat_number, registration_number         │
│  currency, timezone                                              │
│  bank_name, account_number, ifsc, swift, upi                     │
│  logo_url, footer_text                                           │
└──────────────┬──────────────────────────────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌───────────────┐  ┌───────────────┐
│    CONTACT    │  │     DEAL      │
│  contact_id   │  │  deal_id      │
│  company_id   │  │  company_id   │
│  workspace_id │  │  workspace_id │
│  name         │  │  title        │
│  email        │  │  value        │
│  phone        │  │  stage        │
│  role         │  │  status       │
│  department   │  │  owner_id     │
│  is_primary   │  │  close_date   │
└───────────────┘  └───────────────┘
        │             │
        └──────┬──────┘
               ▼
        ┌───────────────┐
        │   ACTIVITY    │
        │  activity_id  │
        │  workspace_id │
        │  entity_type  │
        │  entity_id    │
        │  company_id   │
        │  contact_id   │
        │  deal_id      │
        │  type         │
        │  title        │
        │  description  │
        │  metadata     │
        │  user_id      │
        │  created_at   │
        └───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌───────────────┐  ┌───────────────┐
│    QUOTE      │  │   INVOICE     │
│  quote_id     │  │  invoice_id   │
│  company_id   │  │  company_id   │
│  contact_id   │  │  contact_id   │
│  deal_id      │  │  deal_id      │
│  workspace_id │  │  workspace_id │
│  quote_number │  │  invoice_number│
│  items[]      │  │  items[]      │
│  subtotal     │  │  subtotal     │
│  tax          │  │  tax          │
│  total        │  │  total        │
│  status       │  │  status       │
│  valid_until  │  │  due_date     │
└───────────────┘  └───────────────┘
        │                  │
        └────────┬─────────┘
                 ▼
        ┌───────────────┐
        │   PAYMENT     │
        │  payment_id   │
        │  company_id   │
        │  contact_id   │
        │  invoice_id   │
        │  quote_id     │
        │  deal_id      │
        │  workspace_id │
        │  amount       │
        │  method       │
        │  status       │
        │  date         │
        └───────────────┘
```

---

## Entity Definitions

### 1. Workspace (Settings)

```typescript
interface Workspace {
  workspace_id: string;
  name: string;
  created_at: string;
  setup_completed: boolean;
  
  // Settings (from current system_settings/workspace)
  general: GeneralSettings;
  branding: BrandingSettings;
  appearance: AppearanceSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  team: TeamSettings;
  api: ApiSettings;
}

interface GeneralSettings {
  company_name: string;
  legal_name: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  gst_number: string;
  pan_number: string;
  vat_number: string;
  registration_number: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  swift: string;
  upi: string;
  quote_prefix: string;
  invoice_prefix: string;
  date_format: string;
  footer_text: string;
  default_notes: string;
  terms_and_conditions: string;
}

interface BrandingSettings {
  logo_url: string;
  logo_base64: string;
  footer_logo_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme: 'light' | 'dark' | 'system';
}
```

### 2. Company

```typescript
interface Company {
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
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Stats (computed)
  contact_count: number;
  deal_count: number;
  quote_count: number;
  invoice_count: number;
  total_revenue: number;
}
```

### 3. Contact

```typescript
interface Contact {
  contact_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  
  // Basic Info
  name: string;
  email: string;
  phone: string;
  
  // Role
  role: string; // Manager, Director, Employee, etc.
  department: string; // Finance, HR, IT, etc.
  designation: string; // Job title
  
  // Flags
  is_primary: boolean;
  is_decision_maker: boolean;
  
  // Social
  linkedin: string;
  whatsapp: string;
  
  // Notes
  notes: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Stats (computed)
  deal_count: number;
  quote_count: number;
  invoice_count: number;
  last_activity: string;
}
```

### 4. Lead

```typescript
interface Lead {
  lead_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact (created when lead is qualified)
  
  // Basic Info (from company if exists)
  name: string;
  email: string;
  phone: string;
  company: string;
  
  // Lead Info
  source: string; // website, referral, cold_call, etc.
  status: LeadStatus;
  intent: 'hot' | 'warm' | 'cold';
  
  // Scoring
  lead_score: number; // 0-100
  probability: number; // 0-100
  
  // Value
  potential_value: number;
  
  // Tags
  tags: string[];
  
  // Follow-up
  last_contacted: string;
  next_follow_up: string;
  follow_up_notes: string;
  
  // Conversion
  converted_to_contact: string; // contact_id if converted
  converted_to_deal: string; // deal_id if converted
  converted_at: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'unqualified'
  | 'converted_contact'
  | 'converted_deal'
  | 'lost';
```

### 5. Deal

```typescript
interface Deal {
  deal_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  lead_id: string; // FK → Lead (if converted)
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
  probability: number; // 0-100
  
  // Source
  source: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
  
  // Stats (computed)
  quote_count: number;
  invoice_count: number;
  total_quoted: number;
  total_invoiced: number;
  total_paid: number;
  days_in_pipeline: number;
}

type DealStatus = 
  | 'open'
  | 'won'
  | 'lost'
  | 'abandoned';
```

### 6. Quote

```typescript
interface Quote {
  quote_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  deal_id: string; // FK → Deal
  
  // Number
  quote_number: string; // Auto-generated: QT-0001
  
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
  status: QuoteStatus;
  
  // Validity
  valid_until: string;
  
  // Notes
  notes: string;
  terms_and_conditions: string;
  
  // Conversion
  converted_to_invoice: string; // invoice_id if converted
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface QuoteItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate: number;
}

type QuoteStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';
```

### 7. Invoice

```typescript
interface Invoice {
  invoice_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  deal_id: string; // FK → Deal
  quote_id: string; // FK → Quote (if converted)
  
  // Number
  invoice_number: string; // Auto-generated: INV-0001
  
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
  status: InvoiceStatus;
  
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

interface InvoiceItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  tax_rate: number;
}

type InvoiceStatus = 
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'overdue'
  | 'paid'
  | 'partially_paid'
  | 'cancelled';
```

### 8. Payment

```typescript
interface Payment {
  payment_id: string;
  workspace_id: string;
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact
  invoice_id: string; // FK → Invoice
  quote_id: string; // FK → Quote (optional)
  deal_id: string; // FK → Deal
  
  // Amount
  amount: number;
  currency: string;
  
  // Method
  method: PaymentMethod;
  reference: string; // Transaction ID, check number, etc.
  
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

type PaymentMethod = 
  | 'cash'
  | 'bank_transfer'
  | 'upi'
  | 'credit_card'
  | 'debit_card'
  | 'cheque'
  | 'other';

type PaymentStatus = 
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';
```

### 9. Activity

```typescript
interface Activity {
  activity_id: string;
  workspace_id: string;
  
  // Relationships
  company_id: string; // FK → Company
  contact_id: string; // FK → Contact (optional)
  deal_id: string; // FK → Deal (optional)
  quote_id: string; // FK → Quote (optional)
  invoice_id: string; // FK → Invoice (optional)
  lead_id: string; // FK → Lead (optional)
  
  // Type
  type: ActivityType;
  
  // Content
  title: string;
  description: string;
  
  // Metadata
  metadata: Record<string, any>; // Extra data per activity type
  
  // User
  user_id: string;
  
  // Timestamps
  created_at: string;
}

type ActivityType = 
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
```

### 10. Pipeline

```typescript
interface Pipeline {
  pipeline_id: string;
  workspace_id: string;
  name: string;
  description: string;
  stages: PipelineStage[];
  is_default: boolean;
  created_at: string;
}

interface PipelineStage {
  stage_id: string;
  pipeline_id: string;
  name: string;
  description: string;
  order: number;
  color: string;
  probability: number; // Default probability for deals in this stage
  deal_count: number; // Computed
  total_value: number; // Computed
}
```

---

## Phase 1: Database Layer (lib/db/)

### New File Structure

```
lib/db/
├── index.ts                 # Re-exports all functions
├── types.ts                 # All entity types
├── firebase-config.ts       # Firebase config
├── firebase-collections.ts  # Collection references
├── firebase-operations.ts   # Generic CRUD operations
│
├── companies/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Company CRUD
│
├── contacts/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Contact CRUD
│
├── leads/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Lead CRUD + conversion
│
├── deals/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Deal CRUD + pipeline operations
│
├── quotes/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Quote CRUD + conversion
│
├── invoices/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Invoice CRUD + conversion
│
├── payments/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Payment CRUD
│
├── activities/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Activity logging
│
├── pipelines/
│   ├── index.ts
│   ├── types.ts
│   └── api.ts              # Pipeline CRUD
│
├── queries/
│   ├── index.ts             # Complex queries
│   ├── company-queries.ts
│   ├── deal-queries.ts
│   └── analytics-queries.ts
│
└── events/
    ├── index.ts             # Event system
    ├── types.ts
    └── handlers.ts
```

### Firebase Database Structure

```
/bridgbreak/
├── workspaces/
│   └── {workspace_id}/
│       ├── settings/        # Workspace settings
│       ├── companies/
│       │   └── {company_id}
│       ├── contacts/
│       │   └── {contact_id}
│       ├── leads/
│       │   └── {lead_id}
│       ├── deals/
│       │   └── {deal_id}
│       ├── quotes/
│       │   └── {quote_id}
│       ├── invoices/
│       │   └── {invoice_id}
│       ├── payments/
│       │   └── {payment_id}
│       ├── activities/
│       │   └── {activity_id}
│       └── pipelines/
│           └── {pipeline_id}
│               └── stages/
│                   └── {stage_id}
```

---

## Phase 2: Conversion Logic

### Lead → Contact

```typescript
async function convertLeadToContact(leadId: string): Promise<Contact> {
  const lead = await getLead(leadId);
  
  // Create contact from lead data
  const contact = await createContact({
    workspace_id: lead.workspace_id,
    company_id: lead.company_id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    notes: lead.notes,
  });
  
  // Update lead status
  await updateLead(leadId, {
    status: 'converted_contact',
    converted_to_contact: contact.contact_id,
    converted_at: new Date().toISOString(),
  });
  
  // Log activity
  await logActivity({
    workspace_id: lead.workspace_id,
    type: 'lead_converted_contact',
    title: `Lead converted to contact`,
    description: `${lead.name} was converted to a contact`,
    company_id: lead.company_id,
    contact_id: contact.contact_id,
    lead_id: leadId,
    user_id: getCurrentUserId(),
  });
  
  return contact;
}
```

### Lead → Deal

```typescript
async function convertLeadToDeal(
  leadId: string, 
  dealData: Partial<Deal>
): Promise<Deal> {
  const lead = await getLead(leadId);
  
  // Create deal from lead data
  const deal = await createDeal({
    workspace_id: lead.workspace_id,
    company_id: lead.company_id,
    contact_id: lead.converted_to_contact,
    lead_id: leadId,
    title: dealData.title || `Deal from ${lead.name}`,
    value: dealData.value || lead.potential_value,
    source: lead.source,
    ...dealData,
  });
  
  // Update lead status
  await updateLead(leadId, {
    status: 'converted_deal',
    converted_to_deal: deal.deal_id,
    converted_at: new Date().toISOString(),
  });
  
  // Log activity
  await logActivity({
    workspace_id: lead.workspace_id,
    type: 'lead_converted_deal',
    title: `Lead converted to deal`,
    description: `${lead.name} was converted to a deal worth ${deal.value}`,
    company_id: lead.company_id,
    contact_id: deal.contact_id,
    deal_id: deal.deal_id,
    lead_id: leadId,
    user_id: getCurrentUserId(),
  });
  
  return deal;
}
```

### Deal → Quote

```typescript
async function createQuoteFromDeal(
  dealId: string,
  items: QuoteItem[]
): Promise<Quote> {
  const deal = await getDeal(dealId);
  const company = await getCompany(deal.company_id);
  
  const quote = await createQuote({
    workspace_id: deal.workspace_id,
    company_id: deal.company_id,
    contact_id: deal.contact_id,
    deal_id: dealId,
    items,
    currency: company.currency || deal.currency,
    // Auto-fill from company
    notes: company.default_notes,
    terms_and_conditions: company.terms_and_conditions,
  });
  
  // Log activity
  await logActivity({
    workspace_id: deal.workspace_id,
    type: 'quote_created',
    title: `Quote created for deal`,
    description: `Quote ${quote.quote_number} created for ${deal.title}`,
    company_id: deal.company_id,
    contact_id: deal.contact_id,
    deal_id: dealId,
    quote_id: quote.quote_id,
    user_id: getCurrentUserId(),
  });
  
  return quote;
}
```

### Quote → Invoice

```typescript
async function convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
  const quote = await getQuote(quoteId);
  
  const invoice = await createInvoice({
    workspace_id: quote.workspace_id,
    company_id: quote.company_id,
    contact_id: quote.contact_id,
    deal_id: quote.deal_id,
    quote_id: quoteId,
    items: quote.items.map(item => ({
      ...item,
      tax_rate: item.tax_rate || 0,
    })),
    currency: quote.currency,
    notes: quote.notes,
    terms_and_conditions: quote.terms_and_conditions,
  });
  
  // Update quote status
  await updateQuote(quoteId, {
    status: 'converted',
    converted_to_invoice: invoice.invoice_id,
  });
  
  // Log activity
  await logActivity({
    workspace_id: quote.workspace_id,
    type: 'quote_accepted',
    title: `Quote converted to invoice`,
    description: `Quote ${quote.quote_number} converted to invoice ${invoice.invoice_number}`,
    company_id: quote.company_id,
    contact_id: quote.contact_id,
    deal_id: quote.deal_id,
    quote_id: quoteId,
    invoice_id: invoice.invoice_id,
    user_id: getCurrentUserId(),
  });
  
  return invoice;
}
```

### Invoice → Payment

```typescript
async function recordPayment(
  invoiceId: string,
  paymentData: Partial<Payment>
): Promise<Payment> {
  const invoice = await getInvoice(invoiceId);
  
  const payment = await createPayment({
    workspace_id: invoice.workspace_id,
    company_id: invoice.company_id,
    contact_id: invoice.contact_id,
    invoice_id: invoiceId,
    deal_id: invoice.deal_id,
    quote_id: invoice.quote_id,
    amount: paymentData.amount,
    currency: invoice.currency,
    method: paymentData.method,
    reference: paymentData.reference,
    date: paymentData.date || new Date().toISOString(),
  });
  
  // Update invoice
  const newAmountPaid = invoice.amount_paid + payment.amount;
  const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partially_paid';
  
  await updateInvoice(invoiceId, {
    amount_paid: newAmountPaid,
    amount_due: invoice.total - newAmountPaid,
    status: newStatus,
    paid_date: newStatus === 'paid' ? new Date().toISOString() : undefined,
  });
  
  // Log activity
  await logActivity({
    workspace_id: invoice.workspace_id,
    type: 'payment_received',
    title: `Payment received`,
    description: `Payment of ${payment.amount} received for invoice ${invoice.invoice_number}`,
    company_id: invoice.company_id,
    contact_id: invoice.contact_id,
    invoice_id: invoiceId,
    deal_id: invoice.deal_id,
    quote_id: invoice.quote_id,
    user_id: getCurrentUserId(),
  });
  
  // If invoice fully paid, update deal
  if (newStatus === 'paid' && invoice.deal_id) {
    await updateDeal(invoice.deal_id, {
      status: 'won',
      actual_close_date: new Date().toISOString(),
    });
  }
  
  return payment;
}
```

---

## Phase 3: Activity System

### Auto-Logging

Every CRUD operation automatically logs an activity:

```typescript
// Example: Creating a deal
async function createDeal(data: CreateDealInput): Promise<Deal> {
  const deal = await firebaseCreate('deals', {
    ...data,
    created_at: new Date().toISOString(),
  });
  
  // Auto-log activity
  await logActivity({
    workspace_id: data.workspace_id,
    type: 'deal_created',
    title: `Deal created: ${data.title}`,
    description: `New deal "${data.title}" worth ${data.value} created`,
    company_id: data.company_id,
    contact_id: data.contact_id,
    deal_id: deal.deal_id,
    user_id: getCurrentUserId(),
  });
  
  // Emit event for other modules
  emitEvent('deal:created', deal);
  
  return deal;
}
```

### Activity Timeline View

```typescript
// Get all activities for a company
async function getCompanyTimeline(companyId: string): Promise<Activity[]> {
  const activities = await firebaseQuery('activities', [
    { field: 'company_id', operator: '==', value: companyId },
  ]);
  
  return activities.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Get all activities for a deal
async function getDealTimeline(dealId: string): Promise<Activity[]> {
  const activities = await firebaseQuery('activities', [
    { field: 'deal_id', operator: '==', value: dealId },
  ]);
  
  return activities.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
```

---

## Phase 4: Event System

### Event Types

```typescript
type EventType = 
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
  | 'deal:stage_changed'
  | 'deal:won'
  | 'deal:lost'
  | 'quote:created'
  | 'quote:sent'
  | 'quote:accepted'
  | 'quote:rejected'
  | 'invoice:created'
  | 'invoice:sent'
  | 'invoice:paid'
  | 'invoice:overdue'
  | 'payment:received'
  | 'payment:failed';
```

### Event Emitter

```typescript
type EventHandler = (data: any) => void;

const eventHandlers: Map<EventType, EventHandler[]> = new Map();

export function onEvent(event: EventType, handler: EventHandler): () => void {
  if (!eventHandlers.has(event)) {
    eventHandlers.set(event, []);
  }
  eventHandlers.get(event)!.push(handler);
  
  // Return unsubscribe function
  return () => {
    const handlers = eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  };
}

export function emitEvent(event: EventType, data: any): void {
  const handlers = eventHandlers.get(event);
  if (handlers) {
    handlers.forEach(handler => handler(data));
  }
}
```

### Event Handlers

```typescript
// When quote is accepted, create invoice
onEvent('quote:accepted', async (quote) => {
  const invoice = await convertQuoteToInvoice(quote.quote_id);
  emitEvent('invoice:created', invoice);
});

// When invoice is paid, update deal
onEvent('invoice:paid', async (invoice) => {
  if (invoice.deal_id) {
    await updateDeal(invoice.deal_id, { status: 'won' });
    emitEvent('deal:won', await getDeal(invoice.deal_id));
  }
});

// When deal is won, update stats
onEvent('deal:won', async (deal) => {
  await updateCompanyStats(deal.company_id);
});

// When activity is created, update dashboard
onEvent('activity:created', async (activity) => {
  emitEvent('dashboard:refresh', { workspace_id: activity.workspace_id });
});
```

---

## Phase 5: Universal Selector Component

### CompanySelector

```tsx
// components/ui/company-selector.tsx
interface CompanySelectorProps {
  value?: string;
  onChange: (companyId: string, company: Company) => void;
  workspaceId: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CompanySelector({
  value,
  onChange,
  workspaceId,
  placeholder = 'Select company...',
  disabled,
}: CompanySelectorProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    const unsubscribe = onSnapshot(
      ref(db, `workspaces/${workspaceId}/companies`),
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setCompanies(Object.entries(data).map(([id, company]) => ({
            ...company as Company,
            company_id: id,
          })));
        }
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [workspaceId]);
  
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(search.toLowerCase())
  );
  
  const selectedCompany = companies.find(c => c.company_id === value);
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {selectedCompany ? selectedCompany.name : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <Input
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ScrollArea>
          {filteredCompanies.map(company => (
            <Button
              key={company.company_id}
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onChange(company.company_id, company)}
            >
              {company.name}
            </Button>
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
```

### ContactSelector

```tsx
// components/ui/contact-selector.tsx
interface ContactSelectorProps {
  companyId?: string; // Filter by company
  value?: string;
  onChange: (contactId: string, contact: Contact) => void;
  workspaceId: string;
  placeholder?: string;
}

export function ContactSelector({
  companyId,
  value,
  onChange,
  workspaceId,
  placeholder = 'Select contact...',
}: ContactSelectorProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  useEffect(() => {
    let q = query(
      ref(db, `workspaces/${workspaceId}/contacts`),
      orderByChild('company_id'),
      equalTo(companyId || '')
    );
    
    if (!companyId) {
      q = ref(db, `workspaces/${workspaceId}/contacts`);
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setContacts(Object.entries(data).map(([id, contact]) => ({
          ...contact as Contact,
          contact_id: id,
        })));
      }
    });
    
    return () => unsubscribe();
  }, [workspaceId, companyId]);
  
  // ... similar UI to CompanySelector
}
```

### DealSelector

```tsx
// components/ui/deal-selector.tsx
interface DealSelectorProps {
  companyId?: string;
  value?: string;
  onChange: (dealId: string, deal: Deal) => void;
  workspaceId: string;
  placeholder?: string;
}
```

---

## Phase 6: Context Panel

### Entity Context Sidebar

```tsx
// components/context/entity-context-sidebar.tsx
interface EntityContextSidebarProps {
  entityType: 'lead' | 'contact' | 'deal' | 'quote' | 'invoice';
  entityId: string;
  companyId?: string;
}

export function EntityContextSidebar({
  entityType,
  entityId,
  companyId,
}: EntityContextSidebarProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [relatedEntities, setRelatedEntities] = useState<RelatedEntities>({
    quotes: [],
    invoices: [],
    payments: [],
    tasks: [],
  });
  
  useEffect(() => {
    // Load activities for this entity
    const unsubscribe = onSnapshot(
      query(
        ref(db, 'activities'),
        orderByChild('entity_id'),
        equalTo(entityId)
      ),
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setActivities(Object.values(data) as Activity[]);
        }
      }
    );
    
    // Load related entities
    loadRelatedEntities(entityType, entityId, companyId);
    
    return () => unsubscribe();
  }, [entityType, entityId, companyId]);
  
  return (
    <div className="w-80 border-l">
      <Tabs>
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline">
          <ActivityTimeline activities={activities} />
        </TabsContent>
        
        <TabsContent value="communications">
          <CommunicationList entityId={entityId} />
        </TabsContent>
        
        <TabsContent value="notes">
          <NotesList entityId={entityId} />
        </TabsContent>
        
        <TabsContent value="tasks">
          <TasksList entityId={entityId} />
        </TabsContent>
      </Tabs>
      
      {/* Related Entities */}
      <div className="border-t p-4">
        <h3 className="font-semibold mb-2">Related</h3>
        <RelatedEntitiesList
          quotes={relatedEntities.quotes}
          invoices={relatedEntities.invoices}
          payments={relatedEntities.payments}
        />
      </div>
    </div>
  );
}
```

---

## Phase 7: Relationship Protection

### Delete Protection

```typescript
// lib/db/relationship-protection.ts

interface RelationshipCheck {
  entity_type: string;
  entity_id: string;
  related_count: number;
  related_type: string;
}

async function checkCompanyRelationships(
  companyId: string
): Promise<RelationshipCheck[]> {
  const checks: RelationshipCheck[] = [];
  
  // Check contacts
  const contacts = await firebaseQuery('contacts', [
    { field: 'company_id', operator: '==', value: companyId },
  ]);
  checks.push({
    entity_type: 'company',
    entity_id: companyId,
    related_count: contacts.length,
    related_type: 'contacts',
  });
  
  // Check deals
  const deals = await firebaseQuery('deals', [
    { field: 'company_id', operator: '==', value: companyId },
  ]);
  checks.push({
    entity_type: 'company',
    entity_id: companyId,
    related_count: deals.length,
    related_type: 'deals',
  });
  
  // Check quotes
  const quotes = await firebaseQuery('quotes', [
    { field: 'company_id', operator: '==', value: companyId },
  ]);
  checks.push({
    entity_type: 'company',
    entity_id: companyId,
    related_count: quotes.length,
    related_type: 'quotes',
  });
  
  // Check invoices
  const invoices = await firebaseQuery('invoices', [
    { field: 'company_id', operator: '==', value: companyId },
  ]);
  checks.push({
    entity_type: 'company',
    entity_id: companyId,
    related_count: invoices.length,
    related_type: 'invoices',
  });
  
  return checks;
}

async function canDeleteCompany(companyId: string): Promise<{
  canDelete: boolean;
  reason?: string;
  relationships: RelationshipCheck[];
}> {
  const relationships = await checkCompanyRelationships(companyId);
  
  const hasRelated = relationships.some(r => r.related_count > 0);
  
  if (hasRelated) {
    const summary = relationships
      .filter(r => r.related_count > 0)
      .map(r => `${r.related_count} ${r.related_type}`)
      .join(', ');
    
    return {
      canDelete: false,
      reason: `Cannot delete company. Still has ${summary} linked.`,
      relationships,
    };
  }
  
  return {
    canDelete: true,
    relationships,
  };
}
```

### Delete Confirmation Dialog

```tsx
// components/dialogs/delete-confirmation-dialog.tsx
interface DeleteConfirmationDialogProps {
  entityType: string;
  entityId: string;
  entityName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  entityType,
  entityId,
  entityName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  const [relationships, setRelationships] = useState<RelationshipCheck[]>([]);
  const [canDelete, setCanDelete] = useState(true);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkRelationships();
  }, [entityType, entityId]);
  
  async function checkRelationships() {
    setLoading(true);
    
    let result;
    switch (entityType) {
      case 'company':
        result = await canDeleteCompany(entityId);
        break;
      case 'contact':
        result = await canDeleteContact(entityId);
        break;
      case 'deal':
        result = await canDeleteDeal(entityId);
        break;
      // ... other cases
    }
    
    setCanDelete(result.canDelete);
    setRelationships(result.relationships);
    setLoading(false);
  }
  
  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {canDelete ? 'Confirm Delete' : 'Cannot Delete'}
          </DialogTitle>
          <DialogDescription>
            {canDelete 
              ? `Are you sure you want to delete ${entityName}?`
              : `Cannot delete ${entityName}. It has linked entities:`
            }
          </DialogDescription>
        </DialogHeader>
        
        {!canDelete && (
          <div className="space-y-2">
            {relationships
              .filter(r => r.related_count > 0)
              .map(r => (
                <div key={r.related_type} className="flex items-center gap-2">
                  <Badge>{r.related_count}</Badge>
                  <span>{r.related_type}</span>
                </div>
              ))}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {canDelete && (
            <Button variant="destructive" onClick={onConfirm}>
              Delete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Phase 8: Settings Integration

### Auto-Fill from Company

```typescript
// lib/settings/auto-fill.ts

export function getCompanyDefaults(company: Company) {
  return {
    // Financial
    currency: company.currency || 'INR',
    timezone: company.timezone || 'Asia/Kolkata',
    
    // Tax
    gst_number: company.gst_number,
    pan_number: company.pan_number,
    vat_number: company.vat_number,
    
    // Bank
    bank_name: company.bank_name,
    account_number: company.account_number,
    ifsc: company.ifsc,
    swift: company.swift,
    upi: company.upi,
    
    // Branding
    logo_url: company.logo_url,
    footer_text: company.footer_text,
    
    // Address
    address: company.address,
    city: company.city,
    state: company.state,
    country: company.country,
    pincode: company.pincode,
  };
}

export function getWorkspaceDefaults(workspace: Workspace) {
  return {
    ...getCompanyDefaults({
      // Map workspace settings to company format
      currency: workspace.general.currency,
      timezone: workspace.general.timezone,
      gst_number: workspace.general.gst_number,
      // ... etc
    }),
    // Branding
    primary_color: workspace.branding.primary_color,
    secondary_color: workspace.branding.secondary_color,
    accent_color: workspace.branding.accent_color,
    theme: workspace.branding.theme,
  };
}
```

### Invoice Auto-Fill

```typescript
// When creating an invoice, auto-fill from company
async function createInvoiceWithDefaults(
  companyId: string,
  dealId: string,
  items: InvoiceItem[]
): Promise<Invoice> {
  const company = await getCompany(companyId);
  const deal = await getDeal(dealId);
  const workspace = await getWorkspace(deal.workspace_id);
  
  const defaults = getCompanyDefaults(company);
  
  return createInvoice({
    workspace_id: deal.workspace_id,
    company_id: companyId,
    contact_id: deal.contact_id,
    deal_id: dealId,
    items,
    
    // Auto-fill from company
    currency: defaults.currency,
    notes: workspace.general.default_notes,
    terms_and_conditions: workspace.general.terms_and_conditions,
    
    // Auto-calculate
    subtotal: calculateSubtotal(items),
    tax: calculateTax(items, company.gst_number),
    total: calculateTotal(items, company.gst_number),
    amount_due: calculateTotal(items, company.gst_number),
    amount_paid: 0,
    
    // Auto-generate number
    invoice_number: await generateInvoiceNumber(workspace),
  });
}
```

---

## Implementation Order

### Sprint 1: Data Layer (Week 1)
1. [ ] Create new database types (types.ts)
2. [ ] Create Company CRUD operations
3. [ ] Create Contact CRUD operations
4. [ ] Create Lead CRUD with conversion
5. [ ] Create Deal CRUD with pipeline operations
6. [ ] Create Quote CRUD with conversion
7. [ ] Create Invoice CRUD with conversion
8. [ ] Create Payment CRUD
9. [ ] Create Activity logging system
10. [ ] Migrate existing data to new structure

### Sprint 2: Relationships (Week 2)
1. [ ] Implement Company selector component
2. [ ] Implement Contact selector component
3. [ ] Implement Deal selector component
4. [ ] Implement Quote selector component
5. [ ] Implement Invoice selector component
6. [ ] Update all forms to use selectors
7. [ ] Implement relationship protection
8. [ ] Implement delete confirmation dialogs

### Sprint 3: Activities & Events (Week 3)
1. [ ] Implement activity logging for all modules
2. [ ] Implement event system
3. [ ] Implement event handlers for status automation
4. [ ] Implement activity timeline component
5. [ ] Implement context sidebar
6. [ ] Update all pages to show context

### Sprint 4: Auto-Fill & Settings (Week 4)
1. [ ] Implement company auto-fill system
2. [ ] Update all forms to use auto-fill
3. [ ] Implement settings integration
4. [ ] Implement smart dropdowns
5. [ ] Implement universal selectors
6. [ ] Update dashboard to use live data

### Sprint 5: Dashboard & AI (Week 5)
1. [ ] Update dashboard to show live data
2. [ ] Implement AI context awareness
3. [ ] Implement smart notifications
4. [ ] Implement cross-navigation
5. [ ] Test and fix all relationships
6. [ ] Final QA and deployment

---

## Success Metrics

- ✅ Zero duplicate data entry (company info entered once)
- ✅ One-to-many relationships (company → contacts, deals, etc.)
- ✅ Auto-activity logging (every action creates activity)
- ✅ Status automation (quote accepted → invoice created)
- ✅ Context panels (related data visible without leaving page)
- ✅ Relationship protection (cannot delete with linked entities)
- ✅ Live dashboard (real-time data from all modules)
- ✅ Settings consumed everywhere (logo, currency, bank, etc.)
- ✅ ID-based references (no names as foreign keys)
- ✅ Event-driven updates (changes cascade through system)
