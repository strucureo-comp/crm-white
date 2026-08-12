import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency.
 * Uses Intl.NumberFormat for accurate locale-based currency symbols and formatting.
 * Defaults to USD if no currency code is provided.
 */
export function formatCurrency(value: number, currencyCode: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currencyCode,
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value);
  } catch (e) {
    // Fallback if currency code is invalid (e.g. if someone passes a symbol like '$' instead of 'USD')
    return `${currencyCode}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

/**
 * Format a date string using a format pattern from settings.
 */
export function formatDate(dateStr: string, format?: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  const fmt = format || 'MM/dd/yyyy';
  const map: Record<string, string> = {
    'MM/dd/yyyy': d.toLocaleDateString('en-US'),
    'dd/MM/yyyy': d.toLocaleDateString('en-GB'),
    'yyyy-MM-dd': d.toISOString().split('T')[0],
    'dd-MM-yyyy': d.toLocaleDateString('en-GB').replace(/\//g, '-'),
    'MM-dd-yyyy': d.toLocaleDateString('en-US').replace(/\//g, '-'),
  };
  return map[fmt] || d.toLocaleDateString('en-US');
}
