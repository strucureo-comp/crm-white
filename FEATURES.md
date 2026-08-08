# BridgeBreak CRM — Full Project Features

> A multi-tenant, real-time CRM platform built with Next.js 13, Firebase Realtime Database, and shadcn/ui.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication & Security](#3-authentication--security)
4. [Multi-Tenant Architecture](#4-multi-tenant-architecture)
5. [Navigation & Layout](#5-navigation--layout)
6. [CRM Module](#6-crm-module)
7. [Revenue Hub](#7-revenue-hub)
8. [Conversion Pipeline](#8-conversion-pipeline)
9. [Marketing Module](#9-marketing-module)
10. [Workspace Module](#10-workspace-module)
11. [Analytics & Reporting](#11-analytics--reporting)
12. [Integration Hub](#12-integration-hub)
13. [WhatsApp Cloud API Connector](#13-whatsapp-cloud-api-connector)
14. [Meta Ads Connector](#14-meta-ads-connector)
15. [Google Ads Connector](#15-google-ads-connector)
16. [AI Assistant](#16-ai-assistant)
17. [Event System & Automation](#17-event-system--automation)
18. [PDF Generation Engine](#18-pdf-generation-engine)
19. [Email Service](#19-email-service)
20. [Settings System](#20-settings-system)
21. [Setup Wizard](#21-setup-wizard)
22. [Data Models](#22-data-models)
23. [API Routes](#23-api-routes)
24. [Custom Hooks](#24-custom-hooks)
25. [Finance Configuration](#25-finance-configuration)
26. [Deployment](#26-deployment)

---

## 1. Project Overview

**Package**: `tagverse-crm` v1.0.0  
**Framework**: Next.js 13.5.1 (App Router)  
**Language**: TypeScript 5.2.2  
**Styling**: Tailwind CSS 3.3.3 + shadcn/ui  
**Database**: Firebase Realtime Database  
**Auth**: Firebase Authentication  
**File Storage**: Supabase Storage  

A full-featured CRM designed for agencies and service businesses. Covers lead management, deal tracking, quotation/invoice generation, payment processing, project management, marketing automation, and third-party integrations — all in a single workspace-scoped application.

---

## 2. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 13 (App Router) | Framework, routing, SSR |
| React 18.2 | UI library |
| TypeScript 5.2 | Type safety |
| Tailwind CSS 3.3 | Utility-first styling |
| shadcn/ui + Radix UI | Component library (50+ components) |
| Recharts | Data visualization charts |
| @hello-pangea/dnd | Drag-and-drop (pipeline, kanban) |
| Lucide React | Icon library |
| Sonner | Toast notifications |
| Vaul | Drawer component |
| Embla Carousel | Carousel component |
| React Day Picker | Date picker |
| Next Themes | Theme switching (light/dark/system) |
| date-fns | Date formatting/manipulation |

### Backend
| Technology | Purpose |
|---|---|
| Firebase Auth | User authentication |
| Firebase Realtime Database | Primary data store |
| Firebase Admin SDK | Server-side operations |
| Supabase JS | File storage |
| Zod + React Hook Form | Form validation |
| jsPDF + html2canvas | PDF generation |
| Google OAuth | Google Ads integration |

### Deployment
| Technology | Purpose |
|---|---|
| Netlify | Hosting (via @netlify/plugin-nextjs) |
| Firebase | Database + Auth backend |
| Supabase | File storage buckets |

---

## 3. Authentication & Security

### Auth Flow
- **Firebase Authentication** with email/password
- `createUserWithEmailAndPassword` for registration
- `signInWithEmailAndPassword` for login
- `sendPasswordResetEmail` for password recovery
- `onIdTokenChanged` listener for real-time auth state

### Session Management
- POST `/api/auth/session` — verifies Firebase ID token via RSA-SHA256, sets base64-encoded session cookie
- DELETE `/api/auth/session` — clears session cookie
- Session cookie contains `{ uid, companyId, exp }`

### Token Verification (`lib/auth/verify-token.ts`)
- RSA-SHA256 signature verification of Firebase ID tokens
- Fetches Google public keys from `googleapis.com/robot/v1/metadata/x509/`
- Caches keys for 5 minutes
- Validates `exp`, `iat`, `aud`, `iss` claims

### Middleware (`middleware.ts`)
- **Public routes**: `/login`, `/register`, `/forgot-password`, `/setup`, `/api/enquiries`, `/api/auth/session`
- **Protected routes**: redirect to `/login?redirect={pathname}` if no session
- **API routes**: return 401 if no valid session; injects `x-company-id` header from session cookie
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`

### Platform Admin
- Managed via `platform_admins` Firebase collection
- No hardcoded admin emails
- `isPlatformAdmin()` checks collection only

### Role System
- **User roles**: `client`, `admin`, `dev`
- **Workspace member roles**: `owner`, `admin`, `manager`, `employee`, `viewer`

---

## 4. Multi-Tenant Architecture

### Workspace Scoping
Every entity is scoped to a workspace via `company_id`. All data paths follow:

```
workspaces/{companyId}/{entity}
```

Examples:
- `workspaces/abc123/contacts`
- `workspaces/abc123/deals`
- `workspaces/abc123/invoices`

### Workspace Resolution
- `wsRef(companyId, entity)` — returns workspace-scoped database reference
- `wsItemRef(companyId, entity, id)` — returns workspace-scoped item reference
- Single-entity operations scan all workspaces to find the entity
- List operations query workspace-scoped paths directly (no client-side filtering)

### Workspace Management
- `createWorkspace(name, ownerId)` — creates workspace + adds owner as member
- `getUserWorkspace(userId)` — finds workspace via membership lookup
- `createWorkspaceMember(workspaceId, userId, role)` — adds member with role
- `findCompanyGlobalByName(name)` — cross-workspace company search

---

## 5. Navigation & Layout

### Sidebar Groups
| Group | Pages |
|---|---|
| **Top** | Dashboard, Overview, Activity Feed |
| **CRM** | Leads, Contacts, Pipelines, Deals, Funnel |
| **Revenue Hub** | Quotations, Invoices, Contracts, Payments |
| **Marketing** | Campaigns, Content Hub, Social Media, Email Marketing, Marketing Calendar, Assets |
| **Workspace** | Projects, Tasks, Calendar, Team |
| **Analytics** | Analytics Dashboard, Reports |
| **Integration Hub** | Connector Hub, WhatsApp, WhatsApp Chats, Meta Ads, Google Ads, Website Enquiries |
| **Footer** | AI Assistant, Settings |

### Layout Components
- `AuthGuard` — authentication gate
- `SidebarProvider` — sidebar collapse/expand state
- `AppSidebar` — navigation sidebar with grouped items
- `AppHeader` — top header bar with search and user menu
- `ErrorBoundary` — error boundary wrapper
- `GlobalSearch` — cross-entity search

### Theme System
- Light / Dark / System modes via `next-themes`
- Neutral/grayscale design tokens
- CSS custom properties for colors, spacing, typography

---

## 6. CRM Module

### Leads (`/leads`)
- **Lead scoring** with probability and intent (hot/warm/cold)
- **Status tracking**: new → contacted → qualified → unqualified → converted_contact → converted_deal → lost
- **Source tracking**: website, referral, cold outreach, social, etc.
- **Follow-up scheduling** with date and notes
- **Potential value** estimation
- **Tags** for categorization
- **Conversion tracking**: links to contact and deal after conversion
- **Search and filter** by status, source, score

### Contacts (`/contacts`)
- Full contact profiles: name, email, phone, designation, company
- **Primary contact** flag per company
- **Notes** field
- **Relationship protection**: checks for linked deals, quotes, invoices before deletion
- **Search** by name, email, phone

### Pipelines (`/pipeline`)
- Multiple pipelines with custom stages
- **Drag-and-drop** deal reordering between stages
- Stage types: `open`, `won`, `lost`
- **Probability** per stage (auto-updates deal probability)
- **Folded stages** for collapsed view
- **Default pipeline** flag

### Deals (`/deals`)
- Full deal lifecycle: open → won/lost
- Links to: contact, lead, pipeline, stage, owner
- **Value tracking** with currency
- **Priority** and **probability** fields
- **Days in pipeline** computation
- **Quote/invoice counts** and totals
- **Stage movement** with automatic probability update
- **Won/Lost** actions with timestamp

### Funnel (`/funnel`)
- Visual funnel chart showing lead → deal conversion
- Stage-by-stage drop-off analysis

### Activity Feed (`/activity`)
- 50+ activity types tracked
- Entity-scoped filtering (company, deal, contact, quote, invoice, lead)
- Real-time updates via Firebase subscriptions

---

## 7. Revenue Hub

### Quotations (`/quotes`)
- **Auto-generated quote numbers** (configurable prefix/format)
- **Line items** with quantity, unit price, discount, tax
- **Auto-calculated totals**: subtotal, discount, tax, total
- **Status workflow**: draft → sent → viewed → accepted → rejected → expired → converted
- **Validity period** with expiry tracking
- **PDF generation** with 3 template styles (modern, corporate, minimal)
- **Auto-fill** from company/workspace defaults
- **Convert to invoice** with one click
- **Expiring quotes** alert

### Invoices (`/invoices`)
- **Auto-generated invoice numbers** (configurable prefix/format)
- **Line items** with item_id, description, quantity, unit_price, tax_rate, total
- **Status workflow**: draft → pending → sent → viewed → overdue → paid → partially_paid → cancelled
- **Payment tracking**: amount_paid, amount_due
- **Timeline**: issue_date, due_date, paid_date
- **Auto-fill** from company/workspace defaults
- **PDF generation** with branding
- **Overdue detection** with automatic status update

### Contracts (`/contracts`)
- **Template types**: employment, NDA, service, subscription, vendor
- **Dynamic variables** for template rendering
- **Status tracking**: draft → sent → active → expiring → terminated
- **Date range** with start/end dates
- **Value** field

### Payments (`/payments`)
- **Payment methods**: cash, bank_transfer, upi, credit_card, debit_card, cheque, other
- **Status tracking**: pending → completed → failed → refunded
- **Reference** field for transaction IDs
- **Links to**: invoice, quote, deal, contact
- **Payment statistics**: total collected, by method, by status

---

## 8. Conversion Pipeline

Full automated flow:

```
Lead → Qualified → Contact → Deal → Quote → Invoice → Payment
```

### Functions

| Step | Function | Description |
|---|---|---|
| 1 | `qualifyLead()` | Mark lead as qualified, log activity, emit event |
| 2 | `convertLeadToContact()` | Create contact from lead data, auto-fill fields |
| 3 | `createDealFromContact()` | Create deal with company defaults (currency, etc.) |
| 4 | `createQuoteFromDeal()` | Create quote, auto-calculate totals, generate number |
| 5 | `convertQuoteToInvoice()` | Convert quote to invoice, copy items/totals, generate number |
| 6 | `recordInvoicePayment()` | Record payment, auto-update invoice status |

### One-Click Conversion
- `convertLeadToInvoice()` — performs all 4 steps atomically

### Status Automation
- **Quote accepted** → auto-creates invoice, updates deal probability to 80%
- **Invoice paid** → auto-marks deal as `won` with 100% probability

### Auto-Fill System
- Company settings pre-fill new quotes and invoices
- Workspace defaults merged with company overrides
- Configurable tax rates, bank details, footer text

---

## 9. Marketing Module

### Campaigns (`/campaigns`)
- **Channel support**: email, social, paid, SMS
- **Status workflow**: draft → active → running → paused → completed → archived
- **Budget tracking** with spent amount
- **Performance metrics**: impressions, clicks, conversions, CTR, CPC, CPM, ROAS, spend, revenue

### Content Hub (`/content-hub`)
- Content items with types, status (Draft → In Review → Scheduled → Published)
- **Tags** and **SEO** fields
- Content calendar view

### Social Media (`/social`)
- **Platform support**: Facebook, Instagram, LinkedIn, Twitter, YouTube
- **Post scheduling** with status (draft → scheduled → publishing → published → failed)
- **Engagement tracking** per post
- **Metrics**: likes, comments, shares, reach

### Email Marketing (`/email`)
- **Campaigns**: name, subject, status (draft → scheduling → scheduled → sent → active → completed → paused)
- **Templates**: reusable HTML templates with variables
- **Scheduled campaigns** with future send times
- **Audiences**: subscriber lists with segment support
- **Stats**: sent, delivered, opened, clicked, bounced, complaints, unsubscribes

### Marketing Calendar (`/marketing-calendar`)
- Calendar view of all marketing activities
- Event types with color coding
- Recurring events support

---

## 10. Workspace Module

### Projects (`/projects`)
- **Status workflow**: pending → under_review → accepted → in_progress → testing → completed → cancelled
- **Progress tracking** with percentage
- **GitHub integration** with link
- **Live preview** (URL or image)
- **Technical config**: dynamic key-value pairs (infra, admin, deploy)
- **Cost tracking**: estimated vs actual
- **Recurring maintenance**: cost, frequency, next billing date
- **Project files**: documents, voice notes, images
- **Project updates**: text updates with author
- **Featured project** flag

### Tasks (`/tasks`)
- **Kanban columns**: To Do, In Progress, Review, Done
- **Priority levels**: critical, high, medium, low
- **Assignee** and **due date**
- **Drag-and-drop** between columns

### Calendar (`/calendar`)
- **Event types**: meeting, deadline, reminder, other
- **Attendees** list
- **Recurrence** support
- **Color coding** per event type
- **Location** field
- **Project linking**

### Team (`/team`)
- **Member management** with roles
- **Salary tracking** with payment history
- **Status**: active/inactive
- **Monthly salary** configuration
- **Payment records**: amount, date, month

---

## 11. Analytics & Reporting

### Analytics Dashboard (`/analytics`)
- **KPI cards** with delta comparisons (week-over-week)
- **Configurable widgets**: revenue, deals, leads, contacts, tasks, pipeline, funnel
- **Widget persistence** via Firebase
- **Real-time data** from workspace-scoped queries

### Reports (`/reports`)
- **Revenue reports**: monthly/quarterly/annual
- **Deal reports**: win rate, pipeline velocity, stage conversion
- **Lead reports**: source effectiveness, conversion rates
- **Contact reports**: growth, engagement
- **Campaign reports**: ROI, channel performance
- **Export** capability

### Dashboard Metrics Hook
- `useDashboardMetrics()` computes:
  - Total leads, new this week, hot leads, avg score
  - Total deals, open/won/lost, values
  - Total quotes, pending/accepted, values
  - Total invoices, pending/overdue/paid, values
  - Total payments, outstanding
  - Recent activities

---

## 12. Integration Hub

### Connector Dashboard (`/integrations`)
- Status cards for each integration
- Connection state (connected/disconnected/error)
- Quick actions: configure, disconnect

### Supported Integrations
| Platform | Status | Features |
|---|---|---|
| WhatsApp Cloud API | Production-ready | Send/receive messages, templates, webhooks |
| Meta Ads | Production-ready | Create/pause campaigns, get stats |
| Google Ads | Production-ready | Create campaigns, ad groups, ads, get stats |
| Website Enquiries | Built | Public API for form submissions |
| Slack | Planned | Notifications |
| Zapier | Planned | Automation triggers |
| HubSpot | Planned | CRM sync |
| Salesforce | Planned | CRM sync |
| QuickBooks | Planned | Accounting sync |
| Stripe | Planned | Payment processing |

---

## 13. WhatsApp Cloud API Connector

### Files
- `lib/connectors/whatsapp/client.ts` — HTTP client with exponential backoff
- `lib/connectors/whatsapp/messages.ts` — message sending functions
- `lib/connectors/whatsapp/webhook.ts` — webhook verification and parsing
- `lib/connectors/whatsapp/adapter.ts` — high-level adapter class

### Features
- **Send text messages**: `sendTextMessage(phoneNumberId, to, text, accessToken)`
- **Send template messages**: `sendTemplateMessage(phoneNumberId, to, templateName, languageCode, components, accessToken)`
- **Mark as read**: `markMessageRead(phoneNumberId, messageId, accessToken)`
- **Webhook verification**: HMAC SHA256 signature validation, `hub.challenge` response
- **Webhook parsing**: extracts incoming messages, status updates, media
- **Retry logic**: 3 retries with exponential backoff, handles 429/5xx

### Configuration
```typescript
interface WhatsAppConfig {
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  verifyToken: string;
  apiVersion: string;
  appId: string;
  appSecret: string;
}
```

### API Routes
| Route | Purpose |
|---|---|
| `/api/connectors/whatsapp/connect` | Connection setup |
| `/api/connectors/whatsapp/send` | Send message |
| `/api/connectors/whatsapp/templates` | List templates |
| `/api/connectors/whatsapp/webhook` | Incoming webhook handler |

### Data Storage
- Messages stored at `workspaces/{wsId}/whatsapp_messages/`
- Company lookup queries `workspaces/{wsId}/companies`

---

## 14. Meta Ads Connector

### Files
- `lib/connectors/meta/client.ts` — Graph API client with retry
- `lib/connectors/meta/campaigns.ts` — campaign management

### Features
- **Create campaign**: `createCampaign(config, input)` — creates campaign, ad set, creative, and ad
- **Pause campaign**: `pauseCampaign(config, campaignId)`
- **Get stats**: `getStats(config, campaignId, dateRange)` — returns impressions, clicks, spend, conversions
- **Full build**: `buildFullCampaign(config, input)` — atomic campaign creation

### Configuration
```typescript
interface MetaConfig {
  accessToken: string;
  adAccountId: string;
  apiVersion: string;
}
```

### Campaign Input
```typescript
interface MetaCampaignBuildInput {
  name: string;
  objective: string;
  budget: number;
  targeting: object;
  creative: { headline: string; description: string; imageUrl: string; url: string; };
}
```

### API Routes
| Route | Purpose |
|---|---|
| `/api/connectors/meta/connect` | Connection setup |
| `/api/connectors/meta/campaigns` | Campaign management |

---

## 15. Google Ads Connector

### Files
- `lib/connectors/google/client.ts` — OAuth token refresh with caching
- `lib/connectors/google/campaigns.ts` — campaign management

### Features
- **Create budget**: `createBudget(config, amount, name)`
- **Create campaign**: `createCampaign(config, budgetResourceName, input)`
- **Create ad group**: `createAdGroup(config, campaignResourceName, name)`
- **Create ad**: `createAd(config, adGroupResourceName, input)`
- **Full build**: `buildFullCampaign(config, input)` — atomic campaign creation
- **Get stats**: `getCampaignStats(config, campaignId, dateRange)`

### Configuration
```typescript
interface GoogleAdsConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  developerToken: string;
  loginCustomerId: string;
  customerId: string;
}
```

### API Routes
| Route | Purpose |
|---|---|
| `/api/connectors/google/connect` | Connection setup |
| `/api/connectors/google/campaigns` | Campaign management |

---

## 16. AI Assistant

### Features
- Chat interface with conversation history
- Pre-built suggestions (revenue trends, lead follow-up, pipeline value, deal summary)
- Quick actions: Draft Email, Summarize Deal, Generate Report, Create Task
- Conversation persistence via Firebase (`ai_conversations`)
- Multiple assistant personas (Tara for CRM, Rio for analytics)

### Status
- UI fully built with conversation management
- Backend endpoint at `/api/ai/chat` — currently returns "not configured" message
- Ready for LLM provider integration (OpenAI, Anthropic, etc.)

---

## 17. Event System & Automation

### Event Emitter (`lib/db/events/index.ts`)
- `onEvent(eventType, handler)` — subscribe to events
- `emitEvent(eventType, data)` — emit to all subscribers

### Event Types (32 events)

| Category | Events |
|---|---|
| **Company** | created, updated, deleted |
| **Contact** | created, updated, deleted |
| **Lead** | created, updated, qualified, converted |
| **Deal** | created, updated, deleted, stage_changed, won, lost |
| **Quote** | created, updated, deleted, sent, accepted, rejected |
| **Invoice** | created, updated, deleted, sent, paid, overdue |
| **Payment** | created, updated, deleted, received, failed |
| **System** | activity:created, dashboard:refresh |

### Event Bridge (`lib/db/events/bridge.ts`)
Subscribes to Firebase real-time changes and triggers conversion pipeline:
1. **Lead qualified** → auto-converts to contact (if no contact_id)
2. **Deal won** → emits `deal:won` event
3. **Quote accepted** → auto-creates invoice, updates deal probability
4. **Invoice paid** → auto-marks deal as won

### Automation Rules
- **Triggers**: record_created, updated, deleted, field_changed, schedule, webhook, manual
- **Actions**: send_email, create_record, update_record, delete_record, add_tag, remove_tag, send_notification, run_webhook, update_field, assign_to, create_task
- **Conditions**: equals, not_equals, contains, greater_than, less_than, is_empty, in, starts_with, etc.
- **Execution logs** with status, duration, steps

### Workflows
- Visual workflow builder with nodes and edges
- Node types: trigger, action, condition, delay, branch, loop, end
- Enable/disable workflows

---

## 18. PDF Generation Engine

### Template Styles
| Style | Header | Table | Use Case |
|---|---|---|---|
| **Modern** | Filled background | Clean rows | Contemporary businesses |
| **Corporate** | Line accent | Striped rows | Professional services |
| **Minimal** | Minimal border | Clean rows | Clean, simple look |

### Features
- Company logo and branding
- From/To address blocks
- Line items with quantity, unit price, discount, tax, total
- Subtotal, discount, tax, total summary
- Notes and terms sections
- Bank details for payment
- Signature blocks
- Status badges
- Due date and validity

### Files
- `lib/pdf-engine/generator.ts` — PDF generation logic
- `lib/pdf-engine/templates.ts` — template configurations
- `lib/pdf-engine/helpers.ts` — utility functions
- `lib/pdf-engine/types.ts` — type definitions

### Dependencies
- `jspdf` — PDF creation
- `jspdf-autotable` — table rendering
- `html2canvas` — HTML to canvas conversion

---

## 19. Email Service

### Functions

| Function | Purpose |
|---|---|
| `sendEmail()` | Base email sender with attachments |
| `sendWelcomeEmail()` | Welcome new users |
| `sendProjectUpdateEmail()` | Project status updates |
| `sendSupportTicketEmail()` | Support ticket notifications |
| `sendInvoiceEmail()` | Invoice delivery with payment link |
| `sendMeetingStatusEmail()` | Meeting accept/decline notifications |
| `sendNotificationEmail()` | General notifications |
| `sendInvitationEmail()` | Team member invitations |

### Features
- Company logo in header
- Branded footer with contact info
- Template variables
- Attachment support
- All emails use workspace settings for branding

---

## 20. Settings System

### 7 Settings Sections

#### 1. General Settings
- Company name, workspace name, workspace URL
- Legal name, tagline
- Timezone, default currency, currency symbol
- Country, state
- Number format, first day of week
- Financial year configuration

#### 2. Branding Settings
- Logo URL, footer logo URL
- Address, phone, email, website
- Brand colors (primary, secondary, accent)
- Footer text, watermark
- Tax settings: GST, PAN, VAT, TIN, CGST, SGST, IGST
- Bank details: name, account number, IFSC, SWIFT, UPI
- Document prefixes and formats
- Template style (modern/corporate/minimal)
- Logo position, email signature
- Social links, support contact

#### 3. Appearance Settings
- Theme (system/light/dark)
- Sidebar collapsed/style
- Font size, language
- Compact mode

#### 4. Notification Settings
- Email notifications, push notifications
- Slack integration
- Weekly digest
- Alert types: mention, invoice, payment, project, support

#### 5. Security Settings
- Session timeout
- Two-factor authentication
- Password strength
- Login notifications
- IP whitelist

#### 6. Team Settings
- Default role
- Allow invitations
- Member management

#### 7. API Settings
- API keys management

### Settings Provider
- `WorkspaceProvider` wraps the app
- Provides all settings values to components
- Auto-saves to `system_settings/workspace` path
- Section updaters: `updateGeneral`, `updateBranding`, `updateAppearance`, etc.

### Constants
- 20 timezones, 30 currencies, 30 countries
- 20 languages, 6 date formats, 4 number formats
- 5 tax systems, 20 banks
- Document prefixes, invoice due days, template styles

---

## 21. Setup Wizard

### 5-Step Onboarding

| Step | Fields |
|---|---|
| 1. Company Info | Company name, industry, website |
| 2. Location | Address, city, state, country, phone, timezone |
| 3. Admin Profile | Full name, role |
| 4. Documents | Currency, currency symbol, GST number, PAN number |
| 5. Finish | Completion confirmation |

### Updates
- Creates workspace record
- Creates company record
- Updates workspace settings (general + branding)
- Sets `setup_completed: true`

---

## 22. Data Models

### Core Entities (22 types)

| Entity | Key Fields |
|---|---|
| **User** | id, email, full_name, role, company_id |
| **Workspace** | id, name, slug, owner_id, setup_completed |
| **WorkspaceMember** | workspace_id, user_id, role |
| **Company** | company_id, workspace_id, name, tax IDs, bank details |
| **Contact** | contact_id, company_id, name, email, phone |
| **Lead** | lead_id, workspace_id, company_id, status, score, intent |
| **Deal** | deal_id, workspace_id, company_id, value, status, probability |
| **Quote** | quote_id, workspace_id, items, financials, status |
| **Invoice** | invoice_id, workspace_id, items, financials, status, dates |
| **Payment** | payment_id, amount, method, status |
| **Pipeline** | pipeline_id, stages (with probability) |
| **Project** | id, status, progress, cost, technical_config |
| **Task** | title, priority, status, assignee, due_date |
| **Campaign** | name, channel, budget, metrics |
| **EmailCampaign** | name, subject, stats |
| **SocialPost** | platform, content, status, engagement |
| **Contract** | number, template_type, status |
| **TeamMember** | name, role, salary, status |
| **SupportRequest** | subject, status, priority |
| **MeetingRequest** | date, duration, purpose, status |
| **CalendarEvent** | title, type, date, recurrence |
| **Notification** | title, message, type, read |

### Extended Modules (37 types)
Custom Fields, Tags, Comments, Mentions, Attachments, Watchers, Activity Feed, Approval Workflow, Import/Export, Duplicate Detection, Merge History, Trash/Restore, Archive, Version History, Recurring Invoices, Subscriptions, Product Catalog, Purchase Orders, E-Signature, Call Logs, Email Inbox Sync, WhatsApp Conversations, Calendar Sync, Notification Channels, Audit Logs, API Rate Limits, Feature Flags, Billing Usage, Search Index, Saved Filters, Dashboard Widgets, SLA, Knowledge Base, Customer Portal, Mobile Push Tokens, AI Memory

---

## 23. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/session` | POST | Set session cookie |
| `/api/auth/session` | DELETE | Clear session cookie |
| `/api/enquiries` | POST | Public website enquiry submission |
| `/api/upload` | POST | File upload to Supabase (max 50MB) |
| `/api/health` | GET | Health check (Firebase connectivity) |
| `/api/ai/chat` | POST | AI chat (stub) |
| `/api/cron/billing` | GET | Auto-generate recurring invoices |
| `/api/connectors/whatsapp/connect` | POST | WhatsApp connection setup |
| `/api/connectors/whatsapp/send` | POST | Send WhatsApp message |
| `/api/connectors/whatsapp/templates` | GET | List WhatsApp templates |
| `/api/connectors/whatsapp/webhook` | GET/POST | WhatsApp webhook handler |
| `/api/connectors/meta/connect` | POST | Meta Ads connection setup |
| `/api/connectors/meta/campaigns` | POST | Meta Ads campaign management |
| `/api/connectors/google/connect` | POST | Google Ads connection setup |
| `/api/connectors/google/campaigns` | POST | Google Ads campaign management |

---

## 24. Custom Hooks

| Hook | Purpose |
|---|---|
| `useDashboardMetrics` | Computes all KPI metrics from workspace data |
| `useEventBridge` | Initializes event bridge for current workspace |
| `useMediaQuery` | Responsive breakpoint detection |
| `useSmartNotifications` | Smart notification system |
| `useToast` | Toast notification helper |
| `useWorkspaceData` | Provides workspace settings and auto-fill defaults |

---

## 25. Finance Configuration

### Tax Regimes
| Regime | Rates |
|---|---|
| **GST (India)** | CGST + SGST (intra-state) or IGST (inter-state) |
| **VAT (EU)** | Value Added Tax |
| **Sales Tax (US)** | State-level sales tax |
| **None** | No tax tracking |

### Accounting Standards
- IFRS
- India AS
- US GAAP

### Currency Support
USD, EUR, INR, GBP, AUD, CAD, JPY, CNY — with multi-currency and exchange rate support

### Fiscal Year Configurations
- April–March (India)
- January–December (default)
- July–June (Australia)
- Custom start month/day

---

## 26. Deployment

### Platform
- **Netlify** via `@netlify/plugin-nextjs` v5.15.1

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Firebase database URL |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

### Build Scripts
| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `next lint` |
| `typecheck` | `tsc --noEmit` |

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│                    Next.js 13 App                    │
├─────────────────────────────────────────────────────┤
│  Auth (Firebase) → Middleware → Dashboard Layout     │
├─────────────────────────────────────────────────────┤
│  Sidebar │ Header │ Content Area │ Dialogs           │
├─────────────────────────────────────────────────────┤
│  Event Bridge ← Firebase Realtime ← Workspace Scope │
├─────────────────────────────────────────────────────┤
│  Conversion Pipeline: Lead→Contact→Deal→Quote→Invoice│
├─────────────────────────────────────────────────────┤
│  Connectors: WhatsApp │ Meta Ads │ Google Ads        │
├─────────────────────────────────────────────────────┤
│  PDF Engine │ Email Service │ Settings Provider       │
├─────────────────────────────────────────────────────┤
│  Firebase RTDB (workspaces/{companyId}/{entity})     │
│  Supabase Storage (projects/finance/media)           │
└─────────────────────────────────────────────────────┘
```
