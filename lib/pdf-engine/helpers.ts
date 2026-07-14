import { CompanySettings } from './types';
import { getSystemSetting } from '@/lib/firebase/database';

const DEFAULT_SETTINGS: CompanySettings = {
  company_name: 'Your Company',
  legal_name: 'Your Legal Name',
  tagline: 'Your Professional Solution Partner',
  address: '',
  phone: '',
  email: '',
  website: '',
  logo_url: '/logo_trans_(4884x4884)px_for_white_bg.png',
  footer_logo_url: '',
  gst_number: '',
  pan_number: '',
  registration_number: '',
  bank_name: '',
  bank_account: '',
  bank_ifsc: '',
  bank_swift: '',
  upi_id: '',
  qr_code_url: '',
  primary_color: '#2563eb',
  secondary_color: '#1e40af',
  accent_color: '#f59e0b',
  default_currency: 'USD',
  currency_symbol: '$',
  date_format: 'MM/dd/yyyy',
  timezone: 'UTC',
  tax_cgst: 0,
  tax_sgst: 0,
  tax_igst: 0,
  tax_vat: 0,
  tax_tin: '',
  default_terms: '',
  default_notes: '',
  footer_text: 'Powered by BridgeBreak',
  watermark: '',
  invoice_prefix: 'INV',
  quote_prefix: 'QTE',
  report_prefix: 'RPT',
  contract_prefix: 'CNT',
  purchase_order_prefix: 'PO',
  invoice_number_format: '{prefix}-{year}-{num}',
  quote_number_format: '{prefix}-{year}-{num}',
  template_style: 'modern',
  social_links: '',
  support_contact: '',
};

let cachedSettings: CompanySettings | null = null;

export async function getCompanySettings(): Promise<CompanySettings> {
  if (cachedSettings) return cachedSettings;
  try {
    const settings = await getSystemSetting('company_branding');
    if (settings) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...settings };
      return cachedSettings!;
    }
  } catch {
  }
  return DEFAULT_SETTINGS;
}

export function clearSettingsCache(): void {
  cachedSettings = null;
}

export function formatCurrency(amount: number, settings: CompanySettings): string {
  const symbol = settings.currency_symbol || '$';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(dateStr: string, settings: CompanySettings): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const fmt = settings.date_format || 'MM/dd/yyyy';
  const map: Record<string, string> = {
    'MM/dd/yyyy': d.toLocaleDateString('en-US'),
    'dd/MM/yyyy': d.toLocaleDateString('en-GB'),
    'yyyy-MM-dd': d.toISOString().split('T')[0],
    'dd-MM-yyyy': d.toLocaleDateString('en-GB').replace(/\//g, '-'),
    'MM-dd-yyyy': d.toLocaleDateString('en-US').replace(/\//g, '-'),
  };
  return map[fmt] || d.toLocaleDateString('en-US');
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const big = parseInt(clean, 16);
  return [(big >> 16) & 255, (big >> 8) & 255, big & 255];
}

export function getBase64ImageFromURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
