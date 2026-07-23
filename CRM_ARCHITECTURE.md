# CRM Architecture Rules

## Core Principle

The Settings module is the SINGLE SOURCE OF TRUTH for the entire CRM.

Never hardcode any company information, branding, currencies, tax information, document settings, or workspace configuration anywhere else.

---

# Workspace Settings

Always obtain the following values from the Settings API or global workspace context.

- Company Name
- Legal Name
- Company Logo
- Footer Logo
- Website
- Phone
- Email
- Address

- Currency
- Currency Symbol
- Timezone

- GST
- PAN
- VAT
- Registration Number

- Bank Name
- Account Number
- IFSC
- SWIFT
- UPI

- Quote Prefix
- Invoice Prefix
- Contract Prefix
- Report Prefix

- Date Format
- Footer Text
- Default Notes
- Terms & Conditions

- Theme
- Primary Color
- Secondary Color
- Accent Color

---

# Never Hardcode

Never write code like

companyName = "Tagverse"

logo = "/logo.png"

currency = "USD"

quotePrefix = "QTE"

invoicePrefix = "INV"

Instead use

workspace.companyName

workspace.logo

workspace.currency

workspace.document.quotePrefix

---

# Settings API

Only read data from

GET /api/settings

Only update data using

PUT /api/settings/general

PUT /api/settings/branding

PUT /api/settings/security

PUT /api/settings/team

PUT /api/settings/appearance

PUT /api/settings/notifications

Never update the database directly from another module.

---

# Global Workspace Context

Every page must access settings through

useWorkspace()

Example

const workspace = useWorkspace()

workspace.companyName

workspace.currency

workspace.logo

---

# Document Generation

Every Proposal

Invoice

Contract

Receipt

Purchase Order

Quotation

must use workspace settings.

Never ask users to enter company information again.

---

# PDF Generation

Always use

Company Logo

Company Name

Footer

Bank Details

Tax Details

Brand Colors

Template Style

from workspace settings.

---

# Email Templates

All outgoing emails must use

Company Name

Company Logo

Support Email

Phone

Footer

from workspace settings.

---

# Theme System

Never hardcode colors.

Use

workspace.theme.primary

workspace.theme.secondary

workspace.theme.accent

---

# Images

Logos are uploaded once in Settings.

Store only URLs.

All modules reference those URLs.

Never duplicate images.

---

# Future Modules

Whenever building a new feature, first ask

"Can this information already exist inside Settings?"

If YES

Reuse Settings.

If NO

Create a new module.

---

# Before Every Pull Request

Verify

- No hardcoded company name
- No hardcoded logo
- No hardcoded currency
- No hardcoded colors
- No duplicated branding information
- Uses useWorkspace()
- Uses Settings API
