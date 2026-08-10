import re

with open('lib/db/types.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Invoice properties
invoice_props = """  tax_rate?: number;
  discount?: number; // Legacy
  discount_type?: 'percentage' | 'fixed'; // Legacy
  discount_percent?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  tax_amount?: number;
  total?: number;
  amount: number;
  currency?: string;
  currency_symbol?: string;
  due_date: string;"""
content = re.sub(r"  tax_rate\?: number;\n  total\?: number;\n  amount: number;\n  currency\?: string;\n  currency_symbol\?: string;\n  due_date: string;", invoice_props, content)

invoice_props2 = """  status: InvoiceStatus;
  description?: string;
  notes?: string;
  terms?: string;
  terms_and_conditions?: string; // Legacy
  internal_notes?: string;
  delivery_timeline?: string;
  client_gstin?: string;
  client_name?: string;
  client_email?: string;
  client_company?: string;
  client_address?: string;
  payment_qr_url?: string;
  payment_method?: string;
  payment_terms?: string;
  transaction_id?: string;
  custom_bank_name?: string;
  custom_bank_account?: string;
  custom_bank_ifsc?: string;
  custom_upi_id?: string;
  billing_address?: string;"""
content = re.sub(r"  status: InvoiceStatus;\n  description\?: string;\n  notes\?: string;\n  terms_and_conditions\?: string;\n  payment_qr_url\?: string;\n  payment_method\?: string;\n  payment_terms\?: string;\n  billing_address\?: string;", invoice_props2, content)

# QuotationItem
quote_item = """export interface QuotationItem {
  item_id?: string;
  name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}"""
content = re.sub(r"export interface QuotationItem \{\n  description: string;\n  quantity: number;\n  unit_price: number;\n  total: number;\n\}", quote_item, content)

# Quotation properties
quote_props = """  quotation_number: string;
  amount: number;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  tax_amount?: number;
  cgst_percent?: number;
  sgst_percent?: number;
  igst_percent?: number;
  valid_until: string;"""
content = re.sub(r"  quotation_number: string;\n  amount: number;\n  valid_until: string;", quote_props, content)

quote_props2 = """  items: QuotationItem[];
  notes?: string;
  terms?: string;
  internal_notes?: string;
  delivery_timeline?: string;
  client_gstin?: string;

  // Manual Client Details \(Non-registered\)"""
content = re.sub(r"  items: QuotationItem\[\];\n  notes\?: string;\n\n  // Manual Client Details \(Non-registered\)", quote_props2, content)

# InvoiceItem
inv_item = """export interface InvoiceItem {
  item_id: string;
  name?: string;
  description: string;"""
content = re.sub(r"export interface InvoiceItem \{\n  item_id: string;\n  description: string;", inv_item, content)

# ActivityAction
act_action = """  | 'campaign_created'
  | 'payment_received'
  | 'update_invoice' | 'create_invoice'
  | 'user_login' | 'user_created';"""
content = re.sub(r"  \| 'campaign_created'\n  \| 'payment_received'\n  \| 'user_login' \| 'user_created';", act_action, content)

# InvoiceStatus
inv_status = """export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid' | 'overpaid';"""
content = re.sub(r"export type InvoiceStatus = 'pending' \| 'paid' \| 'overdue' \| 'cancelled';", inv_status, content)

# Payment
payment_props = """  reference?: string;
  notes?: string;
  payment_type?: 'full' | 'partial' | 'excess';

  // Computed from relationships"""
content = re.sub(r"  reference\?: string;\n  notes\?: string;\n\n  // Computed from relationships", payment_props, content)

# FK optional
content = content.replace("company_id: string;      // FK → Company", "company_id?: string;      // FK → Company")
content = content.replace("company_id: string; // FK → Company", "company_id?: string; // FK → Company")
content = content.replace("company_id: string; // FK -> Company", "company_id?: string; // FK -> Company")

with open('lib/db/types.ts', 'w', encoding='utf-8') as f:
    f.write(content)

