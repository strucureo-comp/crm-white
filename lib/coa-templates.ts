/**
 * Chart of Accounts Templates
 * Pre-configured account structures for different standards
 */

import { Account, AccountType, AccountGroup } from './tally-engine';

export type COATemplate = 'IFRS' | 'INDIA_AS' | 'US_GAAP' | 'BASIC';

/**
 * IFRS Chart of Accounts
 */
export const IFRS_ACCOUNTS: Account[] = [
  // Assets (1000-1999)
  { id: 'ifrs_1010', name: 'Cash and Cash Equivalents', code: '1010', type: 'asset', group: 'Cash', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1020', name: 'Bank Accounts', code: '1020', type: 'asset', group: 'Bank', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1030', name: 'Trade Receivables', code: '1030', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1040', name: 'Other Receivables', code: '1040', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1050', name: 'Inventory', code: '1050', type: 'asset', group: 'Inventory', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1060', name: 'Prepaid Expenses', code: '1060', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1500', name: 'Property, Plant & Equipment', code: '1500', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1510', name: 'Accumulated Depreciation', code: '1510', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_1600', name: 'Intangible Assets', code: '1600', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Liabilities (2000-2999)
  { id: 'ifrs_2010', name: 'Trade Payables', code: '2010', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_2020', name: 'Other Payables', code: '2020', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_2030', name: 'Accrued Expenses', code: '2030', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_2040', name: 'Short-term Borrowings', code: '2040', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_2500', name: 'Long-term Borrowings', code: '2500', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Equity (3000-3999)
  { id: 'ifrs_3010', name: 'Share Capital', code: '3010', type: 'equity', group: 'Capital', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_3020', name: 'Retained Earnings', code: '3020', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_3030', name: 'Other Comprehensive Income', code: '3030', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Revenue (4000-4999)
  { id: 'ifrs_4010', name: 'Revenue from Contracts', code: '4010', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_4020', name: 'Service Revenue', code: '4020', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_4030', name: 'Interest Income', code: '4030', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_4040', name: 'Other Operating Income', code: '4040', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Expenses (5000-5999)
  { id: 'ifrs_5010', name: 'Cost of Sales', code: '5010', type: 'expense', group: 'Cost of Goods', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5020', name: 'Employee Benefits', code: '5020', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5030', name: 'Depreciation & Amortization', code: '5030', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5040', name: 'Rent Expense', code: '5040', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5050', name: 'Utilities', code: '5050', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5060', name: 'Professional Fees', code: '5060', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5070', name: 'Marketing & Advertising', code: '5070', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ifrs_5080', name: 'Finance Costs', code: '5080', type: 'expense', group: 'Financial Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
];

/**
 * India AS Chart of Accounts (with GST)
 */
export const INDIA_AS_ACCOUNTS: Account[] = [
  // Assets (1000-1999)
  { id: 'ind_1010', name: 'Cash in Hand', code: '1010', type: 'asset', group: 'Cash', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1020', name: 'Bank Accounts', code: '1020', type: 'asset', group: 'Bank', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1030', name: 'Sundry Debtors', code: '1030', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1040', name: 'GST Input (CGST)', code: '1040', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1041', name: 'GST Input (SGST)', code: '1041', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1042', name: 'GST Input (IGST)', code: '1042', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1050', name: 'Stock in Hand', code: '1050', type: 'asset', group: 'Inventory', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1060', name: 'Prepaid Expenses', code: '1060', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1070', name: 'TDS Receivable', code: '1070', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1500', name: 'Fixed Assets', code: '1500', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_1510', name: 'Accumulated Depreciation', code: '1510', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Liabilities (2000-2999)
  { id: 'ind_2010', name: 'Sundry Creditors', code: '2010', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2020', name: 'GST Output (CGST)', code: '2020', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2021', name: 'GST Output (SGST)', code: '2021', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2022', name: 'GST Output (IGST)', code: '2022', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2030', name: 'TDS Payable', code: '2030', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2040', name: 'Duties & Taxes', code: '2040', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2500', name: 'Secured Loans', code: '2500', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_2510', name: 'Unsecured Loans', code: '2510', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Capital (3000-3999)
  { id: 'ind_3010', name: 'Capital Account', code: '3010', type: 'equity', group: 'Capital', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_3020', name: 'Reserves & Surplus', code: '3020', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_3030', name: 'Profit & Loss Account', code: '3030', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Income (4000-4999)
  { id: 'ind_4010', name: 'Sales', code: '4010', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_4020', name: 'Service Income', code: '4020', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_4030', name: 'Interest Received', code: '4030', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_4040', name: 'Other Income', code: '4040', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Expenses (5000-5999)
  { id: 'ind_5010', name: 'Purchase', code: '5010', type: 'expense', group: 'Cost of Goods', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5020', name: 'Salaries & Wages', code: '5020', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5030', name: 'Rent', code: '5030', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5040', name: 'Electricity Charges', code: '5040', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5050', name: 'Telephone & Internet', code: '5050', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5060', name: 'Printing & Stationery', code: '5060', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5070', name: 'Professional Fees', code: '5070', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5080', name: 'Bank Charges', code: '5080', type: 'expense', group: 'Financial Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5090', name: 'Interest Paid', code: '5090', type: 'expense', group: 'Financial Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'ind_5100', name: 'Depreciation', code: '5100', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
];

/**
 * US GAAP Chart of Accounts
 */
export const US_GAAP_ACCOUNTS: Account[] = [
  // Assets (1000-1999)
  { id: 'us_1010', name: 'Checking Account', code: '1010', type: 'asset', group: 'Bank', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1020', name: 'Savings Account', code: '1020', type: 'asset', group: 'Bank', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1030', name: 'Petty Cash', code: '1030', type: 'asset', group: 'Cash', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1040', name: 'Accounts Receivable', code: '1040', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1050', name: 'Allowance for Doubtful Accounts', code: '1050', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1060', name: 'Inventory', code: '1060', type: 'asset', group: 'Inventory', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1070', name: 'Prepaid Insurance', code: '1070', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1500', name: 'Property, Plant & Equipment', code: '1500', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_1510', name: 'Accumulated Depreciation', code: '1510', type: 'asset', group: 'Fixed Assets', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Liabilities (2000-2999)
  { id: 'us_2010', name: 'Accounts Payable', code: '2010', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_2020', name: 'Sales Tax Payable', code: '2020', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_2030', name: 'Payroll Liabilities', code: '2030', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_2040', name: 'Accrued Expenses', code: '2040', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_2500', name: 'Notes Payable', code: '2500', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_2510', name: 'Long-term Debt', code: '2510', type: 'liability', group: 'Loans', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Equity (3000-3999)
  { id: 'us_3010', name: 'Common Stock', code: '3010', type: 'equity', group: 'Capital', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_3020', name: 'Retained Earnings', code: '3020', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_3030', name: 'Dividends', code: '3030', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Revenue (4000-4999)
  { id: 'us_4010', name: 'Sales Revenue', code: '4010', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_4020', name: 'Service Revenue', code: '4020', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_4030', name: 'Interest Income', code: '4030', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_4040', name: 'Gain on Sale of Assets', code: '4040', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Expenses (5000-5999)
  { id: 'us_5010', name: 'Cost of Goods Sold', code: '5010', type: 'expense', group: 'Cost of Goods', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5020', name: 'Wages & Salaries', code: '5020', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5030', name: 'Payroll Taxes', code: '5030', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5040', name: 'Rent Expense', code: '5040', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5050', name: 'Utilities', code: '5050', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5060', name: 'Office Supplies', code: '5060', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5070', name: 'Advertising & Marketing', code: '5070', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5080', name: 'Depreciation Expense', code: '5080', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5090', name: 'Interest Expense', code: '5090', type: 'expense', group: 'Financial Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'us_5100', name: 'Insurance Expense', code: '5100', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
];

/**
 * Get COA template by type
 */
export function getCOATemplate(template: COATemplate): Account[] {
  switch (template) {
    case 'IFRS':
      return IFRS_ACCOUNTS;
    case 'INDIA_AS':
      return INDIA_AS_ACCOUNTS;
    case 'US_GAAP':
      return US_GAAP_ACCOUNTS;
    case 'BASIC':
      return IFRS_ACCOUNTS; // Use IFRS as basic template
    default:
      return IFRS_ACCOUNTS;
  }
}

/**
 * COA Template Descriptions
 */
export const COA_DESCRIPTIONS: Record<COATemplate, string> = {
  IFRS: 'International Financial Reporting Standards - Global standard for public companies',
  INDIA_AS: 'Indian Accounting Standards - Includes GST tracking and India-specific accounts',
  US_GAAP: 'Generally Accepted Accounting Principles (US) - US-based companies',
  BASIC: 'Basic Chart of Accounts - Simple structure for small businesses',
};
