/**
 * Statutory Reports Generator
 * Compliance reports for India (GST), EU (VAT), and US (1099)
 */

import { TallyEngineWithAudit, Ledger } from './tally-engine';
import type { FinanceConfiguration, TaxRate } from './finance-config';

export interface GSTReport {
  period: { from: string; to: string };
  gstin: string;
  summary: {
    total_taxable_value: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_tax: number;
  };
  b2b_invoices: GSTR1B2BEntry[];
  b2c_summary: GSTR1B2CEntry[];
  hsn_summary: HSNSummary[];
}

export interface GSTR1B2BEntry {
  invoice_number: string;
  invoice_date: string;
  customer_gstin: string;
  customer_name: string;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_tax: number;
  invoice_value: number;
}

export interface GSTR1B2CEntry {
  type: 'B2C Large' | 'B2C Small' | 'B2C Others';
  rate: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface HSNSummary {
  hsn_code: string;
  description: string;
  uqc: string;
  quantity: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
}

export interface GSTR3BReport {
  period: { from: string; to: string };
  gstin: string;
  summary: {
    outward_supplies: {
      taxable_value: number;
      integrated_tax: number;
      central_tax: number;
      state_ut_tax: number;
    };
    inward_supplies: {
      itc_available: {
        integrated_tax: number;
        central_tax: number;
        state_ut_tax: number;
      };
      itc_reversed: {
        integrated_tax: number;
        central_tax: number;
        state_ut_tax: number;
      };
    };
    net_tax_liability: {
      integrated_tax: number;
      central_tax: number;
      state_ut_tax: number;
      cess: number;
    };
  };
}

export interface VATReturn {
  period: { from: string; to: string };
  vat_number: string;
  summary: {
    total_sales: number;
    total_vat_on_sales: number;
    total_purchases: number;
    total_vat_on_purchases: number;
    net_vat_due: number;
  };
  sales_by_rate: Array<{
    rate: number;
    net_sales: number;
    vat: number;
  }>;
  purchases_by_rate: Array<{
    rate: number;
    net_purchases: number;
    vat: number;
  }>;
}

export interface Form1099 {
  tax_year: string;
  payer_tin: string;
  payer_name: string;
  recipient_tin: string;
  recipient_name: string;
  rents: number;
  royalties: number;
  other_income: number;
  federal_tax_withheld: number;
  nonemployee_compensation: number;
}

/**
 * Statutory Report Generator
 */
export class StatutoryReportGenerator {
  private engine: TallyEngineWithAudit;
  private config: FinanceConfiguration;

  constructor(engine: TallyEngineWithAudit, config: FinanceConfiguration) {
    this.engine = engine;
    this.config = config;
  }

  /**
   * Generate GSTR-1 Report (Outward Supplies)
   */
  generateGSTR1(from_date: string, to_date: string): GSTReport {
    const ledgerEntries = this.engine.getPeriodLedger(from_date, to_date);
    
    // Filter sales/revenue entries
    const salesEntries = ledgerEntries.filter(e => 
      e.credit > 0 && (e.description.includes('Invoice') || e.description.includes('Sales'))
    );

    let totalTaxableValue = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;

    const b2bInvoices: GSTR1B2BEntry[] = salesEntries.map(entry => {
      const taxRate = this.config.tax_config.rates.find(r => r.id === entry.tax_rate_id);
      const taxableValue = entry.credit;
      const gstRate = taxRate?.rate || 18;
      
      // Assume inter-state if IGST is used
      const isInterState = entry.description.includes('IGST');
      
      const cgst = isInterState ? 0 : (taxableValue * (gstRate / 2)) / 100;
      const sgst = isInterState ? 0 : (taxableValue * (gstRate / 2)) / 100;
      const igst = isInterState ? (taxableValue * gstRate) / 100 : 0;
      const totalTax = cgst + sgst + igst;

      totalTaxableValue += taxableValue;
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;

      return {
        invoice_number: entry.reference_id,
        invoice_date: entry.date,
        customer_gstin: '', // Would be extracted from transaction metadata
        customer_name: entry.description,
        taxable_value: taxableValue,
        cgst_rate: isInterState ? 0 : gstRate / 2,
        cgst_amount: cgst,
        sgst_rate: isInterState ? 0 : gstRate / 2,
        sgst_amount: sgst,
        igst_rate: isInterState ? gstRate : 0,
        igst_amount: igst,
        total_tax: totalTax,
        invoice_value: taxableValue + totalTax,
      };
    });

    return {
      period: { from: from_date, to: to_date },
      gstin: this.config.tax_config.tax_id,
      summary: {
        total_taxable_value: totalTaxableValue,
        total_cgst: totalCGST,
        total_sgst: totalSGST,
        total_igst: totalIGST,
        total_tax: totalCGST + totalSGST + totalIGST,
      },
      b2b_invoices: b2bInvoices,
      b2c_summary: [],
      hsn_summary: [],
    };
  }

  /**
   * Generate GSTR-3B Report (Monthly Return)
   */
  generateGSTR3B(from_date: string, to_date: string): GSTR3BReport {
    const gstr1 = this.generateGSTR1(from_date, to_date);
    const ledgerEntries = this.engine.getPeriodLedger(from_date, to_date);

    // Calculate ITC (Input Tax Credit) from purchases
    const purchaseEntries = ledgerEntries.filter(e => 
      e.debit > 0 && e.description.includes('Purchase')
    );

    let itcCGST = 0;
    let itcSGST = 0;
    let itcIGST = 0;

    purchaseEntries.forEach(entry => {
      const taxAmount = entry.tax_amount || 0;
      const isInterState = entry.description.includes('IGST');
      
      if (isInterState) {
        itcIGST += taxAmount;
      } else {
        itcCGST += taxAmount / 2;
        itcSGST += taxAmount / 2;
      }
    });

    return {
      period: { from: from_date, to: to_date },
      gstin: this.config.tax_config.tax_id,
      summary: {
        outward_supplies: {
          taxable_value: gstr1.summary.total_taxable_value,
          integrated_tax: gstr1.summary.total_igst,
          central_tax: gstr1.summary.total_cgst,
          state_ut_tax: gstr1.summary.total_sgst,
        },
        inward_supplies: {
          itc_available: {
            integrated_tax: itcIGST,
            central_tax: itcCGST,
            state_ut_tax: itcSGST,
          },
          itc_reversed: {
            integrated_tax: 0,
            central_tax: 0,
            state_ut_tax: 0,
          },
        },
        net_tax_liability: {
          integrated_tax: gstr1.summary.total_igst - itcIGST,
          central_tax: gstr1.summary.total_cgst - itcCGST,
          state_ut_tax: gstr1.summary.total_sgst - itcSGST,
          cess: 0,
        },
      },
    };
  }

  /**
   * Generate VAT Return (EU)
   */
  generateVATReturn(from_date: string, to_date: string): VATReturn {
    const ledgerEntries = this.engine.getPeriodLedger(from_date, to_date);

    const salesEntries = ledgerEntries.filter(e => e.credit > 0);
    const purchaseEntries = ledgerEntries.filter(e => e.debit > 0);

    let totalSales = 0;
    let totalVATOnSales = 0;
    const salesByRate = new Map<number, { net: number; vat: number }>();

    salesEntries.forEach(entry => {
      const taxRate = this.config.tax_config.rates.find(r => r.id === entry.tax_rate_id);
      const rate = taxRate?.rate || 20;
      const netSales = entry.credit;
      const vat = (netSales * rate) / 100;

      totalSales += netSales;
      totalVATOnSales += vat;

      const existing = salesByRate.get(rate) || { net: 0, vat: 0 };
      salesByRate.set(rate, {
        net: existing.net + netSales,
        vat: existing.vat + vat,
      });
    });

    let totalPurchases = 0;
    let totalVATOnPurchases = 0;
    const purchasesByRate = new Map<number, { net: number; vat: number }>();

    purchaseEntries.forEach(entry => {
      const taxRate = this.config.tax_config.rates.find(r => r.id === entry.tax_rate_id);
      const rate = taxRate?.rate || 20;
      const netPurchases = entry.debit;
      const vat = (netPurchases * rate) / 100;

      totalPurchases += netPurchases;
      totalVATOnPurchases += vat;

      const existing = purchasesByRate.get(rate) || { net: 0, vat: 0 };
      purchasesByRate.set(rate, {
        net: existing.net + netPurchases,
        vat: existing.vat + vat,
      });
    });

    return {
      period: { from: from_date, to: to_date },
      vat_number: this.config.tax_config.tax_id,
      summary: {
        total_sales: totalSales,
        total_vat_on_sales: totalVATOnSales,
        total_purchases: totalPurchases,
        total_vat_on_purchases: totalVATOnPurchases,
        net_vat_due: totalVATOnSales - totalVATOnPurchases,
      },
      sales_by_rate: Array.from(salesByRate.entries()).map(([rate, data]) => ({
        rate,
        net_sales: data.net,
        vat: data.vat,
      })),
      purchases_by_rate: Array.from(purchasesByRate.entries()).map(([rate, data]) => ({
        rate,
        net_purchases: data.net,
        vat: data.vat,
      })),
    };
  }

  /**
   * Export report as JSON
   */
  exportJSON(report: any): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as CSV
   */
  exportCSV(report: GSTReport | VATReturn): string {
    if ('gstin' in report) {
      // GSTR-1 CSV
      let csv = 'Invoice Number,Invoice Date,Customer Name,Taxable Value,CGST,SGST,IGST,Total Tax,Invoice Value\n';
      report.b2b_invoices.forEach(inv => {
        csv += `${inv.invoice_number},${inv.invoice_date},${inv.customer_name},${inv.taxable_value},${inv.cgst_amount},${inv.sgst_amount},${inv.igst_amount},${inv.total_tax},${inv.invoice_value}\n`;
      });
      return csv;
    } else {
      // VAT Return CSV
      let csv = 'Type,Rate,Net Amount,VAT\n';
      report.sales_by_rate.forEach(s => {
        csv += `Sales,${s.rate}%,${s.net_sales},${s.vat}\n`;
      });
      report.purchases_by_rate.forEach(p => {
        csv += `Purchases,${p.rate}%,${p.net_purchases},${p.vat}\n`;
      });
      return csv;
    }
  }
}
