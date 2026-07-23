# BridgeBreak CRM — Complete Module & Component Architecture

## Table of Contents

1. [Tech Stack & Infrastructure](#1-tech-stack--infrastructure)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Global Layout & Navigation](#3-global-layout--navigation)
4. [Dashboard Modules](#4-dashboard-modules)
   - 4.1 [Dashboard (Main)](#41-dashboard-main)
   - 4.2 [Leads](#42-leads)
   - 4.3 [Contacts](#43-contacts)
   - 4.4 [Deals](#44-deals)
   - 4.5 [Pipeline](#45-pipeline)
   - 4.6 [Funnel](#46-funnel)
   - 4.7 [Projects](#47-projects)
   - 4.8 [Tasks](#48-tasks)
   - 4.9 [Calendar](#49-calendar)
   - 4.10 [Invoices](#410-invoices)
   - 4.11 [Quotes / Proposals](#411-quotes--proposals)
   - 4.12 [Payments](#412-payments)
   - 4.13 [Campaigns](#413-campaigns)
   - 4.14 [Social](#414-social)
   - 4.15 [Email](#415-email)
   - 4.16 [Content Hub](#416-content-hub)
   - 4.17 [Media Library](#417-media-library)
   - 4.18 [Deliveries](#418-deliveries)
   - 4.19 [Team](#419-team)
   - 4.20 [Analytics](#420-analytics)
   - 4.21 [Overview](#421-overview)
   - 4.22 [Activity](#422-activity)
   - 4.23 [Marketing Calendar](#423-marketing-calendar)
   - 4.24 [Field Monitoring](#424-field-monitoring)
   - 4.25 [Assets](#425-assets)
   - 4.26 [Integrations](#426-integrations)
   - 4.27 [AI Assistant](#427-ai-assistant)
   - 4.28 [Settings](#428-settings)
5. [Dialog Forms — Complete Field Reference](#5-dialog-forms--complete-field-reference)
6. [Data Types](#6-data-types)
7. [Firebase Database Operations](#7-firebase-database-operations)
8. [PDF Generation](#8-pdf-generation)
9. [Settings System](#9-settings-system)

---

## 1. Tech Stack & Infrastructure

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI Library | React 18 |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Supabase Auth (email/password) |
| Database | Firebase Firestore |
| PDF Engine | Custom generator (`lib/pdf-engine/generator.ts`) |
| State | React hooks (useState, useEffect) |
| Toasts | Sonner |
| Charts | Recharts (recharts) |
| Icons | Lucide React |
| Date Utils | date-fns |
| Routing | App Router with `(dashboard)` route group |

---

## 2. Authentication & Authorization

### Auth Flow
- Auth provider: **Supabase Auth** (email/password)
- AuthGuard component wraps all dashboard routes
- Unauthenticated users redirected to `/login`
- Workspace context loaded after auth via `useWorkspace()` hook

### Roles
| System Role | Description |
|---|---|
| `client` | External client user |
| `admin` | Full system admin |
| `dev` | Developer role |

### Workspace Roles
| Role | Description |
|---|---|
| `owner` | Workspace owner |
| `admin` | Workspace administrator |
| `manager` | Manager |
| `employee` | Employee |
| `viewer` | Read-only access |

---

## 3. Global Layout & Navigation

### Route Structure
All dashboard pages live under `app/(dashboard)/` which provides:
- `AuthGuard` — authentication gate
- `SidebarProvider` — sidebar state management
- `AppSidebar` — left navigation sidebar
- `AppHeader` — top header bar with breadcrumbs and global search
- `ErrorBoundary` — catches React errors

### Sidebar Navigation
Modules are grouped into sidebar sections:

**CRM Core:** Dashboard, Leads, Contacts, Deals, Pipeline, Funnel
**Project Management:** Projects, Tasks, Calendar, Deliveries
**Finance:** Invoices, Quotes/Proposals, Payments
**Marketing:** Campaigns, Social, Email, Content Hub, Marketing Calendar
**Resources:** Media Library, Assets, Team, Field Monitoring
**Intelligence:** Analytics, Overview, Activity
**Tools:** Integrations, AI Assistant, Settings

### Global Search
- Accessible from `AppHeader`
- Type: `cmd+k` shortcut or search icon
- Searches across all entities

### Theme System
- Light/Dark mode toggle
- Workspace-level theme settings (primary, secondary, accent colors)
- Uses `useWorkspace()` for theme tokens

---

## 4. Dashboard Modules

### 4.1 Dashboard (Main)
**Route:** `/dashboard`
**Purpose:** Main overview page with KPIs, activity feed, and quick actions

**KPIs displayed:**
- Total Leads
- Active Projects
- Open Tasks
- Revenue (this month)

**Data displayed:**
- Recent activity feed (last 10 activities)
- Upcoming tasks
- Recent projects
- Recent campaigns

**Actions:**
- Create lead (opens LeadDialog)
- Create task (opens TaskDialog)
- View all activity
- View all projects

---

### 4.2 Leads
**Route:** `/leads`
**Purpose:** Lead management with table view, search, filtering

**KPIs displayed:**
- Total Leads
- Qualified Leads
- New This Week
- Conversion Rate

**Filters:**
- Search (by name, email, company)
- Status filter (new, contacted, qualified, unqualified)
- Source filter (website, referral, cold call, etc.)

**Display:** Table view with columns:
- Name (+ email)
- Company
- Phone
- Status (badge)
- Source
- Potential Value
- Last Contacted
- Actions dropdown

**Actions:**
- Create lead (opens LeadDialog)
- Edit lead (opens LeadDialog with data)
- Delete lead (with confirm dialog)
- View lead details
- Export to CSV

**CRUD Operations:**
- Create: `createLead()`
- Read: `getLeads()`
- Update: `updateLead()`
- Delete: `deleteLead()`

---

### 4.3 Contacts
**Route:** `/contacts`
**Purpose:** Contact management (reuses Lead entities)

**Display:** Card view (default) or table view

**Filters:**
- Search (by name, email, company)
- Status filter

**Actions:**
- Create contact (opens LeadDialog)
- Edit contact (opens LeadDialog)
- Delete contact
- View contact details

**Note:** Contacts are stored as Lead entities with `status: 'contact'`

---

### 4.4 Deals
**Route:** `/deals`
**Purpose:** Deal management with table and kanban views

**Display:**
- Table view: columns for deal name, value, stage, status, close date
- Kanban view: drag-drop cards between pipeline stages

**Filters:**
- Search by deal name
- Stage filter
- Status filter

**Actions:**
- Create deal (inline form or dialog)
- Edit deal
- Delete deal
- Move deal to different stage (kanban drag)
- Convert deal to project
- Convert deal to invoice

---

### 4.5 Pipeline
**Route:** `/pipeline`
**Purpose:** Advanced pipeline management with configurable stages and AI lead scoring

**Features:**
- Configurable pipeline stages (add, edit, delete stages)
- Drag-drop kanban board
- AI-powered lead scoring
- Stage-based filtering
- Date range filtering

**Display:**
- Kanban board with columns per stage
- Cards show: deal name, value, owner, score, close date
- Stage totals and conversion rates

**Actions:**
- Create pipeline
- Create deal in pipeline
- Edit deal
- Move deal between stages
- Delete deal
- Configure stages
- Run AI scoring

---

### 4.6 Funnel
**Route:** `/funnel`
**Purpose:** Sales funnel visualization with stage conversion rates

**Features:**
- Funnel chart visualization
- Pipeline and date range filters
- Stage-by-stage conversion rates
- Drop-off analysis

**Display:**
- Funnel chart (recharts)
- Table with stage metrics:
  - Stage name
  - Deal count
  - Total value
  - Conversion rate (%)
  - Drop-off rate

**Filters:**
- Pipeline selector
- Date range

---

### 4.7 Projects
**Route:** `/projects`
**Purpose:** Project management with kanban board

**Display:** Kanban board with 7 status columns:
- `planning`
- `in_progress`
- `review`
- `testing`
- `on_hold`
- `completed`
- `cancelled`

**KPIs displayed:**
- Total Projects
- Active Projects
- Completed
- Total Value

**Actions:**
- Create project (opens ProjectDialog)
- Edit project (opens ProjectDialog)
- Delete project (with confirm)
- Move project between stages (drag-drop)
- View project details

---

### 4.8 Tasks
**Route:** `/tasks`
**Purpose:** Task management with status columns

**Display:** Kanban board with 3 columns:
- `todo` — To Do
- `in_progress` — In Progress
- `done` — Done

**Filters:**
- Search by title
- Priority filter (low, medium, high, urgent)
- Assignee filter
- Project filter

**Actions:**
- Create task (opens TaskDialog)
- Edit task (opens TaskDialog)
- Delete task
- Move task between status columns
- Assign task

---

### 4.9 Calendar
**Route:** `/calendar`
**Purpose:** Full calendar view with event management

**Display:**
- Monthly calendar grid
- Events shown as colored dots/pills by type
- Event types: Blog, Meeting, Task, Deadline, Event, Newsletter

**Features:**
- Month navigation (prev/next)
- Today button
- Event creation by clicking date
- Event list for selected date

**Actions:**
- Create event (opens CalendarEventDialog)
- Edit event
- Delete event
- Navigate months

---

### 4.10 Invoices
**Route:** `/invoices`
**Purpose:** Invoice management with PDF generation

**Sub-routes:**
- `/invoices/new` — Create new invoice
- `/invoices/[id]` — View/edit invoice detail

**Display:** Table/list view with columns:
- Invoice number
- Client name
- Amount
- Status (badge: pending/paid/overdue/cancelled)
- Due date
- Actions dropdown

**Filters:**
- Search by invoice number or client
- Status filter

**Actions:**
- Create invoice (navigates to `/invoices/new`)
- Edit invoice
- Delete invoice
- Download PDF
- Preview PDF
- Send invoice
- Mark as paid
- Duplicate invoice

---

### 4.11 Quotes / Proposals
**Route:** `/quotes` (also accessible via `/proposals`)
**Purpose:** Quotation/proposal management with PDF generation

**Sub-routes:**
- `/quotes/new` — Create new quote
- `/quotes/[id]` — View/edit quote detail

**Display:** Card grid view with:
- Quote number
- Client name/company
- Amount
- Status badge (draft/sent/accepted/rejected/expired)
- Item count
- Actions dropdown

**Filters:**
- Search by quote number, client name, company

**Actions:**
- Create quote (opens QuoteDialog)
- Edit quote (opens QuoteDialog)
- Delete quote (with confirm)
- Send quote (updates status to 'sent')
- Preview PDF
- Download PDF
- Duplicate quote
- Convert to invoice

---

### 4.12 Payments
**Route:** `/payments`
**Purpose:** Payment tracking and management

**Display:** Table with:
- Payment ID
- Client name
- Amount
- Date
- Status
- Invoice reference

**Summary cards:**
- Total Payments
- Received
- Pending
- Overdue

**Actions:**
- Create payment (inline dialog)
- Edit payment
- Delete payment
- Filter by date range
- Export

---

### 4.13 Campaigns
**Route:** `/campaigns`
**Purpose:** Marketing campaign management

**Display:** Table/list view with:
- Campaign name
- Channel (email, social, ads, content, influencer, event, referral)
- Status (draft, active, paused, completed)
- Budget
- Start/end dates
- Target audience

**Filters:**
- Search by name
- Channel filter
- Status filter

**Actions:**
- Create campaign (opens CampaignDialog)
- Edit campaign (opens CampaignDialog)
- Delete campaign
- Duplicate campaign
- View campaign details

---

### 4.14 Social
**Route:** `/social`
**Purpose:** Social media post management

**Display:** Card grid view with:
- Post content preview
- Platform (Facebook, Twitter, Instagram, LinkedIn)
- Status (draft, scheduled, published, archived)
- Scheduled date
- Author

**Filters:**
- Search by content
- Platform filter
- Status filter

**Actions:**
- Create post (opens SocialPostDialog)
- Edit post
- Delete post
- Schedule post
- Publish now

---

### 4.15 Email
**Route:** `/email`
**Purpose:** Email marketing with templates, campaigns, and activity logs

**Display:** Tabbed interface:
- **Templates tab:** Email template cards
- **Campaigns tab:** Email campaign cards
- **Activity tab:** Email log table

**Filters:**
- Search across all tabs
- Status filter

**Actions:**
- Create template (opens EmailTemplateDialog)
- Edit template
- Delete template
- Create campaign (opens EmailCampaignDialog)
- Edit campaign
- Send campaign
- View email logs

---

### 4.16 Content Hub
**Route:** `/content-hub`
**Purpose:** Content management for blog posts, social content, newsletters, videos

**Display:** Grid card view with:
- Content title
- Type (Blog, Social, Newsletter, Video)
- Status (Draft, In Review, Published, Archived)
- Author avatar
- Created date

**Filters:**
- Search by title
- Type filter
- Status filter

**Actions:**
- Create content (opens ContentItemDialog)
- Edit content
- Delete content
- Change status

---

### 4.17 Media Library
**Route:** `/media-library`
**Purpose:** Media file management

**Display:** Grid view (default) or list view

**Features:**
- File preview (images)
- File type icons
- File size display
- Upload dialog
- Search
- Type filter (images, videos, documents)

**Actions:**
- Upload media (opens MediaItemDialog)
- Preview media
- Download media
- Delete media
- Search/filter

---

### 4.18 Deliveries
**Route:** `/deliveries`
**Purpose:** Delivery tracking and management

**Display:** Table/list view with:
- Delivery ID
- Client name
- Status (pending, in_transit, delivered, failed)
- Stage progression
- Expected delivery date
- Actual delivery date

**Actions:**
- Create delivery (inline dialog)
- Edit delivery
- Delete delivery
- Update stage/status
- Filter by status

---

### 4.19 Team
**Route:** `/team`
**Purpose:** Team member management

**Display:** Card grid view with:
- Member name
- Avatar
- Role badge
- Email
- Status

**Actions:**
- Invite member (opens TeamDialog with email + role)
- Edit member role (opens TeamDialog)
- Remove member
- View member details

---

### 4.20 Analytics
**Route:** `/analytics`
**Purpose:** Analytics dashboard with KPIs and charts

**Display:**
- KPI cards (revenue, leads, conversion rate, etc.)
- Bar chart (recharts) showing trends
- Date range selector

**Filters:**
- Date range (start/end date)
- Metric selector

**Actions:**
- Change date range
- Export report
- Refresh data

---

### 4.21 Overview
**Route:** `/overview`
**Purpose:** High-level overview dashboard

**Display:**
- KPI cards
- Recent leads list
- Recent projects list
- Recent campaigns list
- Recent content list
- Activity feed

**Actions:**
- View all leads
- View all projects
- View all campaigns
- Navigate to detail pages

---

### 4.22 Activity
**Route:** `/activity`
**Purpose:** Activity logging and tracking

**Display:** Accordion-style activity feed with tabs:
- All activity
- Meetings
- Tasks
- Deadlines

**Features:**
- Calendar widget (mini calendar)
- Task list sidebar
- Activity timeline with icons per type

**Filters:**
- Tab filter (all/meetings/tasks/deadlines)
- Date filter

**Actions:**
- Log activity
- View activity details
- Filter by date

---

### 4.23 Marketing Calendar
**Route:** `/marketing-calendar`
**Purpose:** Marketing-specific calendar view

**Display:**
- Monthly calendar grid
- Events shown with color-coded dots by type
- Event list sidebar for selected date

**Event types:**
- Blog
- Meeting
- Task
- Deadline
- Event
- Newsletter

**Actions:**
- Create event (opens CalendarEventDialog)
- Edit event
- Delete event
- Navigate months

---

### 4.24 Field Monitoring
**Route:** `/field-monitoring`
**Purpose:** Field agent monitoring and tracking

**Display:**
- Agent cards with:
  - Agent name
  - Status (Active, Inactive, On Leave, Busy)
  - Current location
  - Battery level
  - Assigned route
- Alerts list

**Filters:**
- Search by agent name
- Status filter

**Actions:**
- Create agent (opens FieldAgentDialog)
- Edit agent
- Delete agent
- View agent details
- Monitor alerts

---

### 4.25 Assets
**Route:** `/assets`
**Purpose:** File/asset management with folder structure

**Display:**
- Folder sidebar (tree structure)
- File grid view
- File preview dialog

**Features:**
- Folder navigation
- File upload
- File preview (images, documents)
- Search

**Actions:**
- Create folder
- Upload file (opens MediaItemDialog)
- Preview file
- Download file
- Delete file
- Move file

---

### 4.26 Integrations
**Route:** `/integrations`
**Purpose:** Third-party integration management and automation rules

**Display:**
- Integration cards with:
  - Integration name
  - Description
  - Category (Communication, Marketing, Analytics, CRM, Project Management)
  - Status (Available, Connected, Error, Pending)
  - Enable/disable toggle
- Automation rules list

**Actions:**
- Enable/disable integration
- Configure integration (opens IntegrationDialog)
- Create automation rule (opens AutomationRuleDialog)
- Edit automation rule
- Delete automation rule

---

### 4.27 AI Assistant
**Route:** `/ai-assistant`
**Purpose:** AI-powered chat interface for CRM assistance

**Display:**
- Conversation sidebar (list of conversations)
- Message thread (chat view)
- Suggestion chips
- Quick action buttons

**Features:**
- Multiple conversations
- AI assistants: Tara (general) and Hunter (sales)
- Message history
- Typing indicator

**Actions:**
- Create conversation (opens AIConversationDialog)
- Edit conversation title
- Delete conversation
- Send message
- Switch between assistants
- Use suggestion chips

---

### 4.28 Settings
**Route:** `/settings`
**Purpose:** Workspace configuration (single source of truth)

**Tabs:**
1. **General** — Company info (name, legal name, website, phone, email, address)
2. **Branding** — Logo upload, color scheme
3. **Appearance** — Theme, primary/secondary/accent colors
4. **Notifications** — Email, push, in-app notification preferences
5. **Team** — Team member management, roles
6. **API Keys** — API key management
7. **Security** — Password, 2FA, session settings
8. **Data/Export** — Data export, import, backup

**Settings fields (from CRM_ARCHITECTURE.md):**
- Company Name, Legal Name, Logo, Footer Logo
- Website, Phone, Email, Address
- Currency, Currency Symbol, Timezone
- GST, PAN, VAT, Registration Number
- Bank Name, Account Number, IFSC, SWIFT, UPI
- Quote Prefix, Invoice Prefix, Contract Prefix, Report Prefix
- Date Format, Footer Text, Default Notes, Terms & Conditions
- Theme, Primary Color, Secondary Color, Accent Color

**Actions:**
- Save general settings
- Save branding settings
- Save appearance settings
- Save notification preferences
- Manage team members
- Generate/revoke API keys
- Change password
- Export data
- Import data

---

## 5. Dialog Forms — Complete Field Reference

### Lead Dialog (`components/dialogs/lead-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| email | email | |
| company | text | |
| phone | tel | |
| status | select | new, contacted, qualified, unqualified |
| source | select | website, referral, cold_call, advertisement, social_media, other |
| potential_value | number | Currency amount |
| probability | number | 0-100 (%) |
| notes | textarea | |
| lead_score | number | 0-100 |
| intent | select | hot, warm, cold |
| tags | text | Comma-separated |
| last_contacted | date | |
| next_follow_up | date | |
| follow_up_notes | textarea | |

---

### Task Dialog (`components/dialogs/task-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| title | text | Required |
| description | textarea | |
| project | select | Links to Project |
| priority | select | low, medium, high, urgent |
| status | select | todo, in_progress, done |
| due_date | date | |
| assignee | select | Team member |

---

### Project Dialog (`components/dialogs/project-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| title | text | Required |
| description | textarea | |
| status | select | planning, in_progress, review, testing, on_hold, completed, cancelled |
| estimated_cost | number | Currency amount |
| deadline | date | |
| progress_percentage | number | 0-100 |
| github_link | url | Optional |
| manual_client_name | text | For non-DB clients |
| manual_client_email | email | For non-DB clients |
| manual_client_company | text | For non-DB clients |

---

### Campaign Dialog (`components/dialogs/campaign-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| description | textarea | |
| channel | select | email, social, ads, content, influencer, event, referral |
| status | select | draft, active, paused, completed |
| budget | number | Currency amount |
| target_audience | text | |
| start_date | date | |
| end_date | date | |
| created_by | text | Auto-set |

---

### Team Dialog (`components/dialogs/team-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| email | email | Required (invite mode) |
| role | select | owner, admin, manager, employee, viewer |

---

### Social Post Dialog (`components/dialogs/social-post-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| platform | select | Facebook, Twitter, Instagram, LinkedIn |
| content | textarea | Post content |
| media_url | url | Optional media link |
| scheduled_at | datetime | Schedule time |
| status | select | draft, scheduled, published, archived |
| created_by | text | Auto-set |

---

### Email Template Dialog (`components/dialogs/email-template-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| subject | text | Email subject |
| html_body | textarea (rich) | HTML content |
| variables | text | Template variables |
| created_by | text | Auto-set |

---

### Email Campaign Dialog (`components/dialogs/email-campaign-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| subject | text | Email subject |
| template_id | select | Links to EmailTemplate |
| recipient_list | text | Comma-separated emails or segment |
| scheduled_at | datetime | |
| status | select | draft, scheduled, sent |
| created_by | text | Auto-set |

---

### Invoice Dialog (`components/dialogs/invoice-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| project_id | select | Links to Project |
| client_id | select | Links to Lead/Contact |
| invoice_number | text | Auto-generated |
| amount | number | Currency amount |
| due_date | date | |
| status | select | pending, paid, overdue, cancelled |
| description | textarea | |
| notes | textarea | |

---

### Quote Dialog (`components/dialogs/quote-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| client_name | text | |
| client_email | email | |
| client_company | text | |
| project_title | text | |
| quotation_number | text | Auto-generated |
| amount | number | Currency amount |
| currency | text | Default from workspace |
| valid_until | date | |
| status | select | draft, sent, accepted, rejected, expired |
| description | textarea | |
| notes | textarea | |
| items[] | array | Line items |
| items[].description | text | |
| items[].quantity | number | |
| items[].unit_price | number | |
| items[].total | number | Calculated |

---

### Calendar Event Dialog (`components/dialogs/calendar-event-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| title | text | Required |
| type | select | Blog, Meeting, Task, Deadline, Event, Newsletter |
| date | date | |

---

### Content Item Dialog (`components/dialogs/content-item-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| title | text | Required |
| type | select | Blog, Social, Newsletter, Video |
| author | text | |
| status | select | Draft, In Review, Published, Archived |

---

### Field Agent Dialog (`components/dialogs/field-agent-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| status | select | Active, Inactive, On Leave, Busy |
| location | text | Current location |
| battery | number | 0-100 (%) |
| route | text | Assigned route |

---

### Integration Dialog (`components/dialogs/integration-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| name | text | Required |
| description | textarea | |
| status | select | Available, Connected, Error, Pending |
| category | select | Communication, Marketing, Analytics, CRM, Project Management |
| enabled | boolean | Toggle |

---

### Media Item Dialog (`components/dialogs/media-item-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| file | file | File upload |
| preview | image | Auto-generated preview |

---

### Automation Rule Dialog (`components/dialogs/automation-rule-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| trigger | text | Event that triggers rule |
| action | text | Action to perform |
| status | select | Active, Inactive |

---

### AI Conversation Dialog (`components/dialogs/ai-conversation-dialog.tsx`)
| Field | Type | Options/Notes |
|---|---|---|
| title | text | Conversation title |
| assistant | select | tara, hunter |

---

## 6. Data Types

### Core Entities (from `lib/db/types.ts`)

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'admin' | 'dev';
  workspace_id?: string;
  workspace_role?: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified';
  source?: string;
  potential_value?: number;
  probability?: number;
  notes?: string;
  lead_score?: number;
  intent?: 'hot' | 'warm' | 'cold';
  tags?: string[];
  last_contacted?: string;
  next_follow_up?: string;
  follow_up_notes?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'review' | 'testing' | 'on_hold' | 'completed' | 'cancelled';
  estimated_cost?: number;
  deadline?: string;
  progress_percentage?: number;
  github_link?: string;
  manual_client_name?: string;
  manual_client_email?: string;
  manual_client_company?: string;
  created_at: string;
  updated_at: string;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  project?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  assignee?: string;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: string;
  project_id?: string;
  client_id?: string;
  invoice_number: string;
  amount: number;
  due_date?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Quotation {
  id: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  project_title?: string;
  quotation_number: string;
  amount: number;
  currency?: string;
  valid_until?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  description?: string;
  notes?: string;
  items?: QuotationItem[];
  created_at: string;
  updated_at: string;
}

interface QuotationItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Payment {
  id: string;
  client_id?: string;
  invoice_id?: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  channel: 'email' | 'social' | 'ads' | 'content' | 'influencer' | 'event' | 'referral';
  status: 'draft' | 'active' | 'paused' | 'completed';
  budget?: number;
  target_audience?: string;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface SocialPost {
  id: string;
  platform: 'Facebook' | 'Twitter' | 'Instagram' | 'LinkedIn';
  content: string;
  media_url?: string;
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject?: string;
  html_body?: string;
  variables?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface EmailCampaign {
  id: string;
  name: string;
  subject?: string;
  template_id?: string;
  recipient_list?: string;
  scheduled_at?: string;
  status: 'draft' | 'scheduled' | 'sent';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'Blog' | 'Meeting' | 'Task' | 'Deadline' | 'Event' | 'Newsletter';
  date: string;
  created_at: string;
  updated_at: string;
}

interface ContentItem {
  id: string;
  title: string;
  type: 'Blog' | 'Social' | 'Newsletter' | 'Video';
  author?: string;
  status: 'Draft' | 'In Review' | 'Published' | 'Archived';
  created_at: string;
  updated_at: string;
}

interface FieldAgent {
  id: string;
  name: string;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Busy';
  location?: string;
  battery?: number;
  route?: string;
  created_at: string;
  updated_at: string;
}

interface Integration {
  id: string;
  name: string;
  description?: string;
  status: 'Available' | 'Connected' | 'Error' | 'Pending';
  category: 'Communication' | 'Marketing' | 'Analytics' | 'CRM' | 'Project Management';
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface AutomationRule {
  id: string;
  trigger: string;
  action: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

interface AIConversation {
  id: string;
  title: string;
  assistant: 'tara' | 'hunter';
  created_at: string;
  updated_at: string;
}

interface MediaItem {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  created_at: string;
  updated_at: string;
}

interface Delivery {
  id: string;
  client_name?: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'failed';
  stage?: string;
  expected_date?: string;
  actual_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  description?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  name: string;
  type: string;
  folder?: string;
  url: string;
  size: number;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category?: string;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

interface TaxRate {
  id: string;
  name: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
}

interface Member {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  created_at: string;
}

interface Workspace {
  id: string;
  name: string;
  settings?: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}

interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  created_at: string;
}

interface Invitation {
  id: string;
  email: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  participants?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PlatformAdmin {
  id: string;
  user_id: string;
  created_at: string;
}
```

---

## 7. Firebase Database Operations

### Import
```typescript
import { 
  getLeads, createLead, updateLead, deleteLead,
  getProjects, createProject, updateProject, deleteProject,
  getTasks, createTask, updateTask, deleteTask,
  getInvoices, createInvoice, updateInvoice, deleteInvoice,
  getQuotations, createQuotation, updateQuotation, deleteQuotation,
  getPayments, createPayment, updatePayment, deletePayment,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
  getSocialPosts, createSocialPost, updateSocialPost, deleteSocialPost,
  getEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  getEmailCampaigns, createEmailCampaign, updateEmailCampaign, deleteEmailCampaign,
  getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  getContentItems, createContentItem, updateContentItem, deleteContentItem,
  getFieldAgents, createFieldAgent, updateFieldAgent, deleteFieldAgent,
  getIntegrations, createIntegration, updateIntegration, deleteIntegration,
  getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule,
  getAIConversations, createAIConversation, updateAIConversation, deleteAIConversation,
  getMediaItems, createMediaItem, updateMediaItem, deleteMediaItem,
  getDeliveries, createDelivery, updateDelivery, deleteDelivery,
  getActivityLogs, createActivityLog,
  getNotifications, createNotification, updateNotification,
  getSupportTickets, createSupportTicket, updateSupportTicket, deleteSupportTicket,
  getAssets, createAsset, updateAsset, deleteAsset,
  getTransactions, createTransaction, updateTransaction, deleteTransaction,
  getTaxRates, createTaxRate, updateTaxRate, deleteTaxRate,
  getPipelines, createPipeline, updatePipeline, deletePipeline,
  getTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember,
  getWorkspaceSettings, saveWorkspaceSettings
} from '@/lib/firebase/database';
```

### Pattern
Each collection follows the same pattern:
```typescript
// Get all
const items = await getItems();

// Get by ID
const item = await getItem(id);

// Create
await createItem({ ...data });

// Update
await updateItem(id, { ...data });

// Delete
await deleteItem(id);
```

---

## 8. PDF Generation

### Import
```typescript
import { 
  generateInvoicePdf, 
  generateQuotationPdf, 
  downloadPdf, 
  openPdfPreview 
} from '@/lib/pdf-engine/generator';
```

### Usage
```typescript
// Generate and preview
const pdf = await generateInvoicePdf(invoice, workspace);
const url = await openPdfPreview(pdf);
window.open(url, '_blank');

// Generate and download
const pdf = await generateQuotationPdf(quotation, workspace);
await downloadPdf(pdf, `${quotation.quotation_number}.pdf`);
```

### Workspace Settings Used
- Company Name, Logo, Footer
- Bank Details, Tax Details
- Brand Colors, Template Style
- Invoice/Quote Prefix

---

## 9. Settings System

### Access Settings
```typescript
import { useWorkspace } from '@/hooks/useWorkspace';

const workspace = useWorkspace();

// Access settings
workspace.companyName;
workspace.currency;
workspace.logo;
workspace.theme.primary;
```

### Save Settings
```typescript
import { saveWorkspaceSettings } from '@/lib/firebase/database';

await saveWorkspaceSettings({
  companyName: 'New Name',
  currency: 'USD',
  // ... other settings
});
```

### Architecture Rules (from CRM_ARCHITECTURE.md)
1. Settings is the **single source of truth** for all workspace data
2. Never hardcode company info, branding, currencies, or tax info
3. Always use `useWorkspace()` hook to access settings
4. Never update database directly from another module
5. All document generation must use workspace settings

---

## Summary of All Routes

| Route | Module | Display Type |
|---|---|---|
| `/dashboard` | Dashboard | KPIs + Cards |
| `/leads` | Leads | Table |
| `/contacts` | Contacts | Card/Table |
| `/deals` | Deals | Table/Kanban |
| `/pipeline` | Pipeline | Kanban |
| `/funnel` | Funnel | Chart + Table |
| `/projects` | Projects | Kanban |
| `/tasks` | Tasks | Kanban |
| `/calendar` | Calendar | Calendar Grid |
| `/invoices` | Invoices | Table |
| `/invoices/new` | New Invoice | Form |
| `/invoices/[id]` | Invoice Detail | Document |
| `/quotes` | Quotes | Card Grid |
| `/quotes/new` | New Quote | Form |
| `/quotes/[id]` | Quote Detail | Document |
| `/proposals` | Proposals | Card Grid |
| `/payments` | Payments | Table |
| `/campaigns` | Campaigns | Table |
| `/social` | Social | Card Grid |
| `/email` | Email | Tabs |
| `/content-hub` | Content Hub | Card Grid |
| `/media-library` | Media Library | Grid/List |
| `/deliveries` | Deliveries | Table |
| `/team` | Team | Card Grid |
| `/analytics` | Analytics | Charts |
| `/overview` | Overview | Cards + Lists |
| `/activity` | Activity | Accordion |
| `/marketing-calendar` | Marketing Calendar | Calendar Grid |
| `/field-monitoring` | Field Monitoring | Cards |
| `/assets` | Assets | Grid |
| `/integrations` | Integrations | Cards |
| `/ai-assistant` | AI Assistant | Chat |
| `/settings` | Settings | Tabs + Forms |

---

## Summary of All Dialogs

| Dialog | Entity | Fields Count |
|---|---|---|
| lead-dialog | Lead | 15 fields |
| task-dialog | Task | 7 fields |
| project-dialog | Project | 10 fields |
| campaign-dialog | Campaign | 9 fields |
| team-dialog | Member | 2 fields |
| social-post-dialog | SocialPost | 6 fields |
| email-template-dialog | EmailTemplate | 5 fields |
| email-campaign-dialog | EmailCampaign | 7 fields |
| invoice-dialog | Invoice | 8 fields |
| quote-dialog | Quotation | 13 fields + items array |
| calendar-event-dialog | CalendarEvent | 3 fields |
| content-item-dialog | ContentItem | 4 fields |
| field-agent-dialog | FieldAgent | 5 fields |
| integration-dialog | Integration | 5 fields |
| media-item-dialog | MediaItem | 1 field (file) |
| automation-rule-dialog | AutomationRule | 3 fields |
| ai-conversation-dialog | AIConversation | 2 fields |
