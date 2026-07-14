/**
 * Tally Integration Utilities
 * Helper functions to integrate Tally accounting engine with Firebase database
 */

import { TallyEngine, DEFAULT_ACCOUNTS, Account } from '@/lib/tally-engine';
import type { CurrencyCode } from '@/lib/finance-config';
import type { Transaction, Invoice } from '@/lib/db/types';

/**
 * Initialize and populate Tally engine from database records
 */
export function initializeTallyEngine(
  transactions: Transaction[],
  invoices: Invoice[],
  startingBalance: number = 0
): TallyEngine {
  const engine = new TallyEngine(DEFAULT_ACCOUNTS);

  // Set opening balance
  const bankAccount = engine.getAllAccounts().find(a => a.id === 'acc_bank');
  if (bankAccount) {
    bankAccount.opening_balance = startingBalance;
  }

  // Record all manual transactions
  transactions.forEach(transaction => {
    if (transaction.type === 'income') {
      engine.recordIncome(
        transaction.amount,
        transaction.date,
        transaction.description,
        transaction.id,
        'acc_bank',
        {
          currency: transaction.currency as CurrencyCode | undefined,
          exchange_rate: transaction.exchange_rate,
          tax_rate_id: transaction.tax_rate_id,
        }
      );
    } else {
      engine.recordExpense(
        transaction.amount,
        transaction.date,
        transaction.description,
        transaction.id,
        'acc_supplies',
        {
          currency: transaction.currency as CurrencyCode | undefined,
          exchange_rate: transaction.exchange_rate,
          tax_rate_id: transaction.tax_rate_id,
        }
      );
    }
  });

  // Record paid invoices as income
  invoices
    .filter(inv => inv.status === 'paid')
    .forEach(invoice => {
      engine.recordIncome(
        invoice.amount,
        invoice.paid_at || invoice.updated_at,
        `Invoice #${invoice.invoice_number}`,
        invoice.id
      );
    });

  return engine;
}

/**
 * Get account balance summary for UI display
 */
export function getAccountBalanceSummary(engine: TallyEngine) {
  const accounts = engine.getAllAccounts();
  const summary: Record<string, { balance: number; accountName: string }> = {};

  accounts.forEach(account => {
    const balance = engine.calculateAccountBalance(account.id);
    summary[account.id] = {
      balance,
      accountName: account.name,
    };
  });

  return summary;
}

/**
 * Export financial report as JSON
 */
export function exportFinancialReport(engine: TallyEngine, from: string, to: string) {
  const statement = engine.generateFinancialStatement(from, to);
  const trialBalance = engine.getTrialBalance();
  const ratios = engine.calculateFinancialRatios();

  return {
    period: { from, to },
    generated_at: new Date().toISOString(),
    financial_statement: statement,
    trial_balance: trialBalance,
    financial_ratios: ratios,
  };
}

/**
 * Calculate cash flow trends
 */
export function calculateCashFlowTrends(
  engine: TallyEngine,
  transactions: Transaction[],
  periods: number = 12
) {
  const trends: {
    period: string;
    inflows: number;
    outflows: number;
    net: number;
  }[] = [];

  const now = new Date();
  for (let i = periods - 1; i >= 0; i--) {
    const periodStart = new Date(now);
    periodStart.setMonth(periodStart.getMonth() - i);
    periodStart.setDate(1);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0);

    const periodTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= periodStart && tDate <= periodEnd;
    });

    const inflows = periodTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const outflows = periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    trends.push({
      period: periodStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      inflows,
      outflows,
      net: inflows - outflows,
    });
  }

  return trends;
}

/**
 * Validate double-entry bookkeeping (debits should equal credits)
 */
export function validateDoubleEntry(engine: TallyEngine): {
  is_valid: boolean;
  total_debits: number;
  total_credits: number;
  variance: number;
} {
  const trialBalance = engine.getTrialBalance();
  const totalDebits = trialBalance.reduce((sum, tb) => sum + tb.debit, 0);
  const totalCredits = trialBalance.reduce((sum, tb) => sum + tb.credit, 0);
  const variance = Math.abs(totalDebits - totalCredits);

  return {
    is_valid: variance < 0.01, // Allow for floating point rounding
    total_debits: totalDebits,
    total_credits: totalCredits,
    variance,
  };
}

/**
 * Get key financial metrics
 */
export function getKeyMetrics(engine: TallyEngine) {
  const ratios = engine.calculateFinancialRatios();
  const accountSummary = engine.getAccountSummary();

  const totalAssets = accountSummary.asset.total;
  const totalLiabilities = accountSummary.liability.total;
  const totalEquity = accountSummary.equity.total;
  const totalRevenue = accountSummary.income.total;
  const totalExpenses = accountSummary.expense.total;

  return {
    financial_health: {
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      net_worth: totalAssets - totalLiabilities,
    },
    profitability: {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_income: totalRevenue - totalExpenses,
      profit_margin: ratios.profit_margin,
    },
    liquidity: {
      current_ratio: ratios.current_ratio,
    },
    solvency: {
      debt_to_equity: ratios.debt_to_equity,
    },
    efficiency: {
      operating_efficiency: ratios.operating_efficiency,
    },
  };
}

/**
 * Get expense breakdown by category
 */
export function getExpenseBreakdown(transactions: Transaction[]) {
  const breakdown: Record<string, number> = {};

  transactions
    .filter(t => t.type === 'expense')
    .forEach(transaction => {
      const category = transaction.category || 'Uncategorized';
      breakdown[category] = (breakdown[category] || 0) + transaction.amount;
    });

  return Object.entries(breakdown)
    .map(([category, amount]) => ({
      category,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Get income breakdown by source
 */
export function getIncomeBreakdown(transactions: Transaction[], invoices: Invoice[]) {
  const breakdown: Record<string, number> = {};

  // Manual income transactions
  transactions
    .filter(t => t.type === 'income')
    .forEach(transaction => {
      const category = transaction.category || 'Other Income';
      breakdown[category] = (breakdown[category] || 0) + transaction.amount;
    });

  // Invoice revenue
  invoices
    .filter(inv => inv.status === 'paid')
    .forEach(invoice => {
      const category = 'Project Revenue';
      breakdown[category] = (breakdown[category] || 0) + invoice.amount;
    });

  return Object.entries(breakdown)
    .map(([source, amount]) => ({
      source,
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Project cash position
 */
export function projectCashPosition(
  current_balance: number,
  monthly_inflow: number,
  monthly_outflow: number,
  months_ahead: number = 3
) {
  const projections: {
    month: number;
    projected_balance: number;
    net_cash_flow: number;
  }[] = [];

  let balance = current_balance;

  for (let i = 1; i <= months_ahead; i++) {
    const netCashFlow = monthly_inflow - monthly_outflow;
    balance += netCashFlow;

    projections.push({
      month: i,
      projected_balance: balance,
      net_cash_flow: netCashFlow,
    });
  }

  return projections;
}
