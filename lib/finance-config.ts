/**
 * Finance Configuration System
 * Manages localization, compliance, and feature settings
 */

export type TaxRegime = 'GST_INDIA' | 'VAT_EU' | 'SALES_TAX_US' | 'NONE';
export type AccountingStandard = 'IFRS' | 'INDIA_AS' | 'US_GAAP';
export type DateFormat = 'ISO' | 'US' | 'EU' | 'INDIA';
export type CurrencyCode = 'USD' | 'EUR' | 'INR' | 'GBP' | 'AUD' | 'CAD' | 'JPY' | 'CNY';

export interface FiscalYearConfig {
  start_month: number; // 1-12
  start_day: number; // 1-31
  label: string; // e.g., "FY 2024-25"
}

export interface TaxConfig {
  regime: TaxRegime;
  rates: TaxRate[];
  enable_tax_tracking: boolean;
  tax_id: string; // GST Number, VAT ID, Tax ID
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number; // percentage
  type: 'GST' | 'CGST' | 'SGST' | 'IGST' | 'VAT' | 'SALES_TAX';
  applicable_from: string;
  applicable_to?: string;
}

export interface CurrencyConfig {
  base_currency: CurrencyCode;
  enable_multi_currency: boolean;
  exchange_rates: ExchangeRate[];
}

export interface ExchangeRate {
  from_currency: CurrencyCode;
  to_currency: CurrencyCode;
  rate: number;
  effective_date: string;
}

export interface EntityConfig {
  id: string;
  name: string;
  type: 'HEAD_OFFICE' | 'BRANCH' | 'SUBSIDIARY' | 'DIVISION';
  parent_id?: string;
  currency: CurrencyCode;
  tax_config: TaxConfig;
  is_active: boolean;
}

export interface FinanceConfiguration {
  // Company Info
  company_name: string;
  company_id: string;
  
  // Accounting Standard
  accounting_standard: AccountingStandard;
  
  // Fiscal Year
  fiscal_year: FiscalYearConfig;
  
  // Date Format
  date_format: DateFormat;
  
  // Tax Configuration
  tax_config: TaxConfig;
  
  // Currency Configuration
  currency_config: CurrencyConfig;
  
  // Multi-Entity Support
  enable_multi_entity: boolean;
  entities: EntityConfig[];
  default_entity_id?: string;
  
  // Compliance & Reports
  enable_statutory_reports: boolean;
  statutory_reports: string[]; // ['GSTR1', 'GSTR3B', 'VAT_RETURN', 'P&L', 'BALANCE_SHEET']
  
  // Feature Flags
  features: {
    enable_tax_tracking: boolean;
    enable_multi_currency: boolean;
    enable_multi_entity: boolean;
    enable_branch_accounting: boolean;
    enable_cost_centers: boolean;
    enable_budget_tracking: boolean;
  };
}

// Predefined Tax Rates
export const GST_INDIA_RATES: TaxRate[] = [
  { id: 'gst_0', name: 'GST 0%', rate: 0, type: 'GST', applicable_from: '2017-07-01' },
  { id: 'gst_5', name: 'GST 5%', rate: 5, type: 'GST', applicable_from: '2017-07-01' },
  { id: 'gst_12', name: 'GST 12%', rate: 12, type: 'GST', applicable_from: '2017-07-01' },
  { id: 'gst_18', name: 'GST 18%', rate: 18, type: 'GST', applicable_from: '2017-07-01' },
  { id: 'gst_28', name: 'GST 28%', rate: 28, type: 'GST', applicable_from: '2017-07-01' },
];

export const VAT_EU_RATES: TaxRate[] = [
  { id: 'vat_0', name: 'VAT 0%', rate: 0, type: 'VAT', applicable_from: '2000-01-01' },
  { id: 'vat_standard', name: 'VAT Standard 20%', rate: 20, type: 'VAT', applicable_from: '2000-01-01' },
  { id: 'vat_reduced', name: 'VAT Reduced 5%', rate: 5, type: 'VAT', applicable_from: '2000-01-01' },
];

export const US_SALES_TAX_RATES: TaxRate[] = [
  { id: 'sales_tax_0', name: 'No Sales Tax', rate: 0, type: 'SALES_TAX', applicable_from: '2000-01-01' },
  { id: 'sales_tax_state', name: 'State Sales Tax', rate: 6.5, type: 'SALES_TAX', applicable_from: '2000-01-01' },
];

// Default Configurations by Region
export const DEFAULT_CONFIG_INDIA: Partial<FinanceConfiguration> = {
  accounting_standard: 'INDIA_AS',
  fiscal_year: {
    start_month: 4, // April
    start_day: 1,
    label: 'FY 2024-25',
  },
  date_format: 'INDIA',
  tax_config: {
    regime: 'GST_INDIA',
    rates: GST_INDIA_RATES,
    enable_tax_tracking: true,
    tax_id: '',
  },
  currency_config: {
    base_currency: 'INR',
    enable_multi_currency: false,
    exchange_rates: [],
  },
  statutory_reports: ['GSTR1', 'GSTR3B', 'TDS_RETURN', 'P&L', 'BALANCE_SHEET'],
};

export const DEFAULT_CONFIG_EU: Partial<FinanceConfiguration> = {
  accounting_standard: 'IFRS',
  fiscal_year: {
    start_month: 1, // January
    start_day: 1,
    label: '2024',
  },
  date_format: 'EU',
  tax_config: {
    regime: 'VAT_EU',
    rates: VAT_EU_RATES,
    enable_tax_tracking: true,
    tax_id: '',
  },
  currency_config: {
    base_currency: 'EUR',
    enable_multi_currency: true,
    exchange_rates: [],
  },
  statutory_reports: ['VAT_RETURN', 'P&L', 'BALANCE_SHEET'],
};

export const DEFAULT_CONFIG_US: Partial<FinanceConfiguration> = {
  accounting_standard: 'US_GAAP',
  fiscal_year: {
    start_month: 1, // January
    start_day: 1,
    label: '2024',
  },
  date_format: 'US',
  tax_config: {
    regime: 'SALES_TAX_US',
    rates: US_SALES_TAX_RATES,
    enable_tax_tracking: true,
    tax_id: '',
  },
  currency_config: {
    base_currency: 'USD',
    enable_multi_currency: false,
    exchange_rates: [],
  },
  statutory_reports: ['1099', 'P&L', 'BALANCE_SHEET'],
};

/**
 * Format date based on configuration
 */
export function formatDate(date: Date | string, format: DateFormat): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'ISO':
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    case 'US':
      return d.toLocaleDateString('en-US'); // MM/DD/YYYY
    case 'EU':
      return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    case 'INDIA':
      return d.toLocaleDateString('en-IN'); // DD/MM/YYYY
    default:
      return d.toISOString().split('T')[0];
  }
}

/**
 * Get fiscal year for a given date
 */
export function getFiscalYear(date: Date | string, config: FiscalYearConfig): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  
  if (month >= config.start_month) {
    return `FY ${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `FY ${year - 1}-${year.toString().slice(-2)}`;
  }
}

/**
 * Calculate tax amount
 */
export function calculateTax(amount: number, taxRate: TaxRate): number {
  return (amount * taxRate.rate) / 100;
}

/**
 * Calculate GST components (CGST + SGST for intra-state, IGST for inter-state)
 */
export function calculateGSTComponents(
  amount: number,
  gstRate: number,
  isInterState: boolean
): { cgst: number; sgst: number; igst: number; total: number } {
  const totalGST = (amount * gstRate) / 100;
  
  if (isInterState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalGST,
      total: totalGST,
    };
  } else {
    return {
      cgst: totalGST / 2,
      sgst: totalGST / 2,
      igst: 0,
      total: totalGST,
    };
  }
}

/**
 * Convert currency
 */
export function convertCurrency(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  exchangeRates: ExchangeRate[]
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = exchangeRates.find(
    r => r.from_currency === fromCurrency && r.to_currency === toCurrency
  );
  
  if (rate) {
    return amount * rate.rate;
  }
  
  // Try reverse conversion
  const reverseRate = exchangeRates.find(
    r => r.from_currency === toCurrency && r.to_currency === fromCurrency
  );
  
  if (reverseRate) {
    return amount / reverseRate.rate;
  }
  
  return amount; // Return original if no rate found
}

/**
 * Currency symbols
 */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  EUR: '€',
  INR: '₹',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
};

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
