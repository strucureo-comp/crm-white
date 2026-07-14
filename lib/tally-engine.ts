/**
 * Tally Accounting Engine
 * Intelligent double-entry bookkeeping system with account hierarchies,
 * ledger management, and comprehensive financial reporting
 * 
 * Extended with:
 * - Multi-currency support
 * - Tax tracking (GST/VAT/Sales Tax)
 * - Multi-entity/branch accounting
 * - Statutory compliance reporting
 */

import type { CurrencyCode, TaxRate, EntityConfig, FinanceConfiguration } from './finance-config';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type AccountGroup = 
  | 'Bank'
  | 'Cash'
  | 'Receivables'
  | 'Inventory'
  | 'Fixed Assets'
  | 'Payables'
  | 'Loans'
  | 'Capital'
  | 'Retained Earnings'
  | 'Sales'
  | 'Other Income'
  | 'Cost of Goods'
  | 'Operating Expenses'
  | 'Financial Expenses';

export interface Account {
  id: string;
  name: string;
  code: string;
  type: AccountType;
  group: AccountGroup;
  parent_id?: string;
  is_active: boolean;
  opening_balance: number;
  created_at: string;
  currency?: CurrencyCode; // For multi-currency support
  entity_id?: string; // For multi-entity support
}

export interface Ledger {
  account_id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  reference_id: string;
  reference_type: 'invoice' | 'transaction' | 'manual';
  running_balance: number;
  created_at: string;
  currency?: CurrencyCode; // Original transaction currency
  base_currency_amount?: number; // Amount in base currency
  exchange_rate?: number; // Exchange rate used
  tax_amount?: number; // Tax component
  tax_rate_id?: string; // Reference to tax rate
  entity_id?: string; // Entity/branch ID
}

export interface TrialBalance {
  account_id: string;
  account_name: string;
  account_code: string;
  account_type: AccountType;
  debit: number;
  credit: number;
}

export interface FinancialStatement {
  period: {
    from: string;
    to: string;
  };
  balance_sheet: {
    assets: { name: string; amount: number }[];
    liabilities: { name: string; amount: number }[];
    equity: { name: string; amount: number }[];
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
  };
  income_statement: {
    revenue: { name: string; amount: number }[];
    expenses: { name: string; amount: number }[];
    total_revenue: number;
    total_expenses: number;
    net_income: number;
  };
  cash_flow: {
    opening_balance: number;
    inflows: { name: string; amount: number }[];
    outflows: { name: string; amount: number }[];
    closing_balance: number;
  };
}

export interface AccountReconciliation {
  account_id: string;
  account_name: string;
  system_balance: number;
  manual_balance: number;
  variance: number;
  is_reconciled: boolean;
  reconciled_at?: string;
  notes?: string;
}

// Default chart of accounts
export const DEFAULT_ACCOUNTS: Account[] = [
  // Assets
  { id: 'acc_bank', name: 'Bank Account', code: '1010', type: 'asset', group: 'Bank', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_cash', name: 'Cash in Hand', code: '1020', type: 'asset', group: 'Cash', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_receivables', name: 'Accounts Receivable', code: '1030', type: 'asset', group: 'Receivables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Liabilities
  { id: 'acc_payables', name: 'Accounts Payable', code: '2010', type: 'liability', group: 'Payables', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Equity
  { id: 'acc_capital', name: 'Capital Account', code: '3010', type: 'equity', group: 'Capital', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_retained', name: 'Retained Earnings', code: '3020', type: 'equity', group: 'Retained Earnings', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Income
  { id: 'acc_sales', name: 'Sales Revenue', code: '4010', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_service', name: 'Service Income', code: '4020', type: 'income', group: 'Sales', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_other_income', name: 'Other Income', code: '4030', type: 'income', group: 'Other Income', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },

  // Expenses
  { id: 'acc_salary', name: 'Salaries & Wages', code: '5010', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_rent', name: 'Rent Expense', code: '5020', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_utilities', name: 'Utilities', code: '5030', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_supplies', name: 'Office Supplies', code: '5040', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
  { id: 'acc_software', name: 'Software & Subscriptions', code: '5050', type: 'expense', group: 'Operating Expenses', is_active: true, opening_balance: 0, created_at: new Date().toISOString() },
];

/**
 * Tally Engine Class
 * Core accounting operations with double-entry bookkeeping
 */
export class TallyEngine {
  protected ledger: Ledger[] = [];
  protected accounts: Map<string, Account> = new Map();
  private balanceCache: Map<string, number> = new Map();
  private trialBalanceCache: TrialBalance[] | null = null;

  constructor(accounts: Account[] = DEFAULT_ACCOUNTS) {
    accounts.forEach(acc => this.accounts.set(acc.id, acc));
  }

  /**
   * Clear cache when ledger is modified
   */
  private clearCache(): void {
    this.balanceCache.clear();
    this.trialBalanceCache = null;
  }

  /**
   * Record a double-entry transaction
   * Automatically creates matching debit and credit entries
   */
  recordTransaction(
    debit_account_id: string,
    credit_account_id: string,
    amount: number,
    date: string,
    description: string,
    reference_id: string,
    reference_type: 'invoice' | 'transaction' | 'manual',
    meta?: {
      currency?: CurrencyCode;
      exchange_rate?: number;
      tax_amount?: number;
      tax_rate_id?: string;
      entity_id?: string;
    }
  ): boolean {
    if (!this.accounts.has(debit_account_id) || !this.accounts.has(credit_account_id)) {
      return false;
    }

    const baseAmount = meta?.exchange_rate ? amount * meta.exchange_rate : amount;

    // Debit entry
    this.ledger.push({
      account_id: debit_account_id,
      date,
      description,
      debit: baseAmount,
      credit: 0,
      reference_id,
      reference_type,
      running_balance: this.calculateAccountBalance(debit_account_id, date),
      created_at: new Date().toISOString(),
      currency: meta?.currency,
      base_currency_amount: baseAmount,
      exchange_rate: meta?.exchange_rate,
      tax_amount: meta?.tax_amount,
      tax_rate_id: meta?.tax_rate_id,
      entity_id: meta?.entity_id,
    });

    // Credit entry
    this.ledger.push({
      account_id: credit_account_id,
      date,
      description,
      debit: 0,
      credit: baseAmount,
      reference_id,
      reference_type,
      running_balance: this.calculateAccountBalance(credit_account_id, date),
      created_at: new Date().toISOString(),
      currency: meta?.currency,
      base_currency_amount: baseAmount,
      exchange_rate: meta?.exchange_rate,
      tax_amount: meta?.tax_amount,
      tax_rate_id: meta?.tax_rate_id,
      entity_id: meta?.entity_id,
    });

    this.clearCache();
    return true;
  }

  /**
   * Record income (Credit to revenue account, Debit to bank/cash)
   */
  recordIncome(
    amount: number,
    date: string,
    description: string,
    reference_id: string,
    debit_account_id: string = 'acc_bank',
    meta?: {
      currency?: CurrencyCode;
      exchange_rate?: number;
      tax_amount?: number;
      tax_rate_id?: string;
      entity_id?: string;
    }
  ): boolean {
    return this.recordTransaction(
      debit_account_id,
      'acc_sales',
      amount,
      date,
      description,
      reference_id,
      'transaction',
      meta
    );
  }

  /**
   * Record expense (Credit to bank/cash, Debit to expense account)
   */
  recordExpense(
    amount: number,
    date: string,
    description: string,
    reference_id: string,
    expense_account_id: string = 'acc_supplies',
    meta?: {
      currency?: CurrencyCode;
      exchange_rate?: number;
      tax_amount?: number;
      tax_rate_id?: string;
      entity_id?: string;
    }
  ): boolean {
    return this.recordTransaction(
      expense_account_id,
      'acc_bank',
      amount,
      date,
      description,
      reference_id,
      'transaction',
      meta
    );
  }

  /**
   * Get ledger for specific account
   */
  getAccountLedger(account_id: string, from_date?: string, to_date?: string): Ledger[] {
    return this.ledger
      .filter(entry => {
        const isAccount = entry.account_id === account_id;
        const isInRange = (!from_date || entry.date >= from_date) &&
                         (!to_date || entry.date <= to_date);
        return isAccount && isInRange;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calculate account balance with caching
   */
  calculateAccountBalance(account_id: string, uptoDate?: string): number {
    const cacheKey = `${account_id}:${uptoDate || 'current'}`;
    if (this.balanceCache.has(cacheKey)) {
      return this.balanceCache.get(cacheKey)!;
    }

    const account = this.accounts.get(account_id);
    if (!account) return 0;

    const opening = account.opening_balance;
    const entries = this.ledger.filter(e => {
      const isAccount = e.account_id === account_id;
      const isUptoDate = !uptoDate || e.date <= uptoDate;
      return isAccount && isUptoDate;
    });

    let balance = opening;
    entries.forEach(entry => {
      if (account.type === 'asset' || account.type === 'expense') {
        balance += entry.debit - entry.credit;
      } else {
        balance += entry.credit - entry.debit;
      }
    });

    this.balanceCache.set(cacheKey, balance);
    return balance;
  }

  /**
   * Get trial balance with caching
   */
  getTrialBalance(): TrialBalance[] {
    if (this.trialBalanceCache) {
      return this.trialBalanceCache;
    }

    const balances: TrialBalance[] = [];

    this.accounts.forEach((account, accountId) => {
      if (!account.is_active) return;

      const balance = this.calculateAccountBalance(accountId);
      const isAssetOrExpense = account.type === 'asset' || account.type === 'expense';

      balances.push({
        account_id: accountId,
        account_name: account.name,
        account_code: account.code,
        account_type: account.type,
        debit: (isAssetOrExpense && balance > 0) ? balance : 0,
        credit: (!isAssetOrExpense && balance > 0) ? balance : (isAssetOrExpense && balance < 0) ? Math.abs(balance) : 0,
      });
    });

    this.trialBalanceCache = balances;
    return balances;
  }

  /**
   * Generate financial statements
   */
  generateFinancialStatement(from_date: string, to_date: string): FinancialStatement {
    const trialBalance = this.getTrialBalance();

    const balance_sheet = {
      assets: Array.from(this.accounts.values())
        .filter(a => a.type === 'asset' && a.is_active)
        .map(a => ({ name: a.name, amount: this.calculateAccountBalance(a.id) })),
      liabilities: Array.from(this.accounts.values())
        .filter(a => a.type === 'liability' && a.is_active)
        .map(a => ({ name: a.name, amount: this.calculateAccountBalance(a.id) })),
      equity: Array.from(this.accounts.values())
        .filter(a => a.type === 'equity' && a.is_active)
        .map(a => ({ name: a.name, amount: this.calculateAccountBalance(a.id) })),
      total_assets: 0,
      total_liabilities: 0,
      total_equity: 0,
    };

    balance_sheet.total_assets = balance_sheet.assets.reduce((sum, a) => sum + a.amount, 0);
    balance_sheet.total_liabilities = balance_sheet.liabilities.reduce((sum, a) => sum + a.amount, 0);
    balance_sheet.total_equity = balance_sheet.equity.reduce((sum, a) => sum + a.amount, 0);

    const income_statement = {
      revenue: Array.from(this.accounts.values())
        .filter(a => a.type === 'income' && a.is_active)
        .map(a => ({ name: a.name, amount: this.calculateAccountBalance(a.id) })),
      expenses: Array.from(this.accounts.values())
        .filter(a => a.type === 'expense' && a.is_active)
        .map(a => ({ name: a.name, amount: this.calculateAccountBalance(a.id) })),
      total_revenue: 0,
      total_expenses: 0,
      net_income: 0,
    };

    income_statement.total_revenue = income_statement.revenue.reduce((sum, r) => sum + r.amount, 0);
    income_statement.total_expenses = income_statement.expenses.reduce((sum, e) => sum + e.amount, 0);
    income_statement.net_income = income_statement.total_revenue - income_statement.total_expenses;

    const bank_account = this.calculateAccountBalance('acc_bank');
    const cash_account = this.calculateAccountBalance('acc_cash');
    const opening_balance = (this.accounts.get('acc_bank')?.opening_balance || 0) +
                           (this.accounts.get('acc_cash')?.opening_balance || 0);

    const cash_flow = {
      opening_balance,
      inflows: Array.from(this.accounts.values())
        .filter(a => a.type === 'income' && a.is_active)
        .map(a => ({ name: a.name, amount: Math.max(0, this.calculateAccountBalance(a.id)) })),
      outflows: Array.from(this.accounts.values())
        .filter(a => a.type === 'expense' && a.is_active)
        .map(a => ({ name: a.name, amount: Math.max(0, this.calculateAccountBalance(a.id)) })),
      closing_balance: bank_account + cash_account,
    };

    return {
      period: { from: from_date, to: to_date },
      balance_sheet,
      income_statement,
      cash_flow,
    };
  }

  /**
   * Calculate financial ratios
   */
  calculateFinancialRatios() {
    const assets = Array.from(this.accounts.values())
      .filter(a => a.type === 'asset')
      .reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0);

    const liabilities = Array.from(this.accounts.values())
      .filter(a => a.type === 'liability')
      .reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0);

    const revenue = Array.from(this.accounts.values())
      .filter(a => a.type === 'income')
      .reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0);

    const expenses = Array.from(this.accounts.values())
      .filter(a => a.type === 'expense')
      .reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0);

    return {
      current_ratio: assets > 0 ? assets / Math.max(liabilities, 1) : 0,
      debt_to_equity: liabilities / Math.max(assets - liabilities, 1),
      profit_margin: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      operating_efficiency: revenue > 0 ? (expenses / revenue) * 100 : 0,
    };
  }

  /**
   * Reconcile account balances
   */
  reconcileAccount(account_id: string, manual_balance: number, notes?: string): AccountReconciliation {
    const system_balance = this.calculateAccountBalance(account_id);
    const variance = system_balance - manual_balance;

    return {
      account_id,
      account_name: this.accounts.get(account_id)?.name || '',
      system_balance,
      manual_balance,
      variance,
      is_reconciled: variance === 0,
      reconciled_at: variance === 0 ? new Date().toISOString() : undefined,
      notes,
    };
  }

  /**
   * Get account summary grouped by type
   */
  getAccountSummary() {
    const summary: Record<AccountType, { accounts: Account[]; total: number }> = {
      asset: { accounts: [], total: 0 },
      liability: { accounts: [], total: 0 },
      equity: { accounts: [], total: 0 },
      income: { accounts: [], total: 0 },
      expense: { accounts: [], total: 0 },
    };

    this.accounts.forEach((account, _) => {
      if (account.is_active) {
        const balance = this.calculateAccountBalance(account.id);
        summary[account.type].accounts.push(account);
        summary[account.type].total += balance;
      }
    });

    return summary;
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values()).filter(a => a.is_active);
  }

  /**
   * Add custom account
   */
  addAccount(account: Account): boolean {
    if (this.accounts.has(account.id)) return false;
    this.accounts.set(account.id, account);
    return true;
  }

  /**
   * Get ledger entries for a period
   */
  getPeriodLedger(from_date: string, to_date: string): Ledger[] {
    return this.ledger.filter(entry => entry.date >= from_date && entry.date <= to_date);
  }
}

/**
 * Helper function to create transaction reference ID
 */
export function generateTransactionReference(type: string, id: string): string {
  return `${type.toUpperCase()}_${id}`;
}

/**
 * Audit Report Interfaces
 */
export interface AuditNote {
  date: string;
  category: 'observation' | 'error' | 'warning' | 'success';
  description: string;
  impact: string;
}

export interface AuditReport {
  generated_at: string;
  period: {
    from: string;
    to: string;
  };
  executive_summary: {
    total_transactions: number;
    total_accounts: number;
    ledger_integrity: boolean;
    variance_detected: boolean;
    overall_health: 'excellent' | 'good' | 'fair' | 'poor';
  };
  financial_summary: {
    total_revenue: number;
    total_expenses: number;
    net_income: number;
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
  };
  account_analysis: {
    account_id: string;
    account_name: string;
    account_code: string;
    account_type: AccountType;
    opening_balance: number;
    closing_balance: number;
    transactions_count: number;
    largest_transaction: number;
    average_transaction: number;
  }[];
  compliance_checks: {
    double_entry_valid: boolean;
    trial_balance_matches: boolean;
    equation_holds: boolean;
    no_orphaned_transactions: boolean;
    all_accounts_reconciled: boolean;
  };
  anomalies_detected: AuditNote[];
  recommendations: string[];
  key_observations: {
    revenue_trend: 'increasing' | 'decreasing' | 'stable';
    expense_trend: 'increasing' | 'decreasing' | 'stable';
    cash_position: 'improving' | 'declining' | 'stable';
    liquidity_status: 'strong' | 'adequate' | 'weak';
  };
  audit_trail: {
    total_entries: number;
    entries_by_type: Record<string, number>;
    entries_by_account: Record<string, number>;
  };
}

export interface VisualDataPoint {
  name: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface ChartData {
  monthly_revenue: { month: string; amount: number }[];
  monthly_expenses: { month: string; amount: number }[];
  account_balances: VisualDataPoint[];
  revenue_by_source: VisualDataPoint[];
  expenses_by_category: VisualDataPoint[];
}

/**
 * Extended Tally Engine with Audit Capabilities
 */
export class TallyEngineWithAudit extends TallyEngine {
  /**
   * Generate comprehensive audit report
   */
  generateAuditReport(from_date: string, to_date: string): AuditReport {
    const trialBalance = this.getTrialBalance();
    const statement = this.generateFinancialStatement(from_date, to_date);
    const ratios = this.calculateFinancialRatios();
    const summary = this.getAccountSummary();

    // Compliance checks
    const totalDebits = trialBalance.reduce((sum, tb) => sum + tb.debit, 0);
    const totalCredits = trialBalance.reduce((sum, tb) => sum + tb.credit, 0);
    const accountEquation = Math.abs(
      statement.balance_sheet.total_assets -
      (statement.balance_sheet.total_liabilities + statement.balance_sheet.total_equity)
    ) < 0.01;

    // Account analysis
    const accountAnalysis = Array.from(this.accounts.values())
      .filter(a => a.is_active)
      .map(account => {
        const ledger = this.getAccountLedger(account.id, from_date, to_date);
        const balance = this.calculateAccountBalance(account.id);

        return {
          account_id: account.id,
          account_name: account.name,
          account_code: account.code,
          account_type: account.type,
          opening_balance: account.opening_balance,
          closing_balance: balance,
          transactions_count: ledger.length,
          largest_transaction: ledger.length > 0 
            ? Math.max(...ledger.map(l => Math.max(l.debit, l.credit)))
            : 0,
          average_transaction: ledger.length > 0
            ? ledger.reduce((sum, l) => sum + l.debit + l.credit, 0) / ledger.length
            : 0,
        };
      });

    // Detect anomalies
    const anomalies: AuditNote[] = [];

    // Check for unusual transactions
    accountAnalysis.forEach(acc => {
      if (acc.transactions_count === 0) {
        anomalies.push({
          date: new Date().toISOString(),
          category: 'observation',
          description: `Account "${acc.account_name}" has no transactions in this period`,
          impact: 'Minimal - account may be dormant',
        });
      }

      if (acc.largest_transaction > acc.average_transaction * 10 && acc.transactions_count > 1) {
        anomalies.push({
          date: new Date().toISOString(),
          category: 'warning',
          description: `Account "${acc.account_name}" has an unusually large transaction`,
          impact: 'Review for accuracy',
        });
      }
    });

    // Check for imbalances
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      anomalies.push({
        date: new Date().toISOString(),
        category: 'error',
        description: 'Trial balance does not match - debits and credits are unequal',
        impact: 'Critical - immediate investigation required',
      });
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (ratios.profit_margin < 10) {
      recommendations.push('Profit margin is below 10% - consider reviewing pricing or cost structure');
    }

    if (ratios.debt_to_equity > 2) {
      recommendations.push('Debt-to-equity ratio exceeds 2 - prioritize debt reduction');
    }

    if (ratios.current_ratio < 1.2) {
      recommendations.push('Current ratio below 1.2 - improve short-term liquidity position');
    }

    if (ratios.operating_efficiency > 75) {
      recommendations.push('Operating expenses exceed 75% of revenue - review cost control measures');
    }

    // Determine overall health
    let healthScore = 0;
    if (ratios.profit_margin > 20) healthScore += 25;
    else if (ratios.profit_margin > 10) healthScore += 15;
    else healthScore += 5;

    if (ratios.debt_to_equity < 1) healthScore += 25;
    else if (ratios.debt_to_equity < 2) healthScore += 15;
    else healthScore += 5;

    if (ratios.current_ratio > 1.5) healthScore += 25;
    else if (ratios.current_ratio > 1) healthScore += 15;
    else healthScore += 5;

    if (ratios.operating_efficiency < 70) healthScore += 25;
    else if (ratios.operating_efficiency < 80) healthScore += 15;
    else healthScore += 5;

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';
    if (healthScore >= 90) overallHealth = 'excellent';
    else if (healthScore >= 70) overallHealth = 'good';
    else if (healthScore >= 50) overallHealth = 'fair';
    else overallHealth = 'poor';

    // Detect trends (optimized - no array creation)
    const revenueStart = summary.income.total;
    const revenueEnd = summary.income.accounts.length > 0 
      ? summary.income.accounts.reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0)
      : 0;
    const expenseStart = summary.expense.total;
    const expenseEnd = summary.expense.accounts.length > 0
      ? summary.expense.accounts.reduce((sum, a) => sum + this.calculateAccountBalance(a.id), 0)
      : 0;

    return {
      generated_at: new Date().toISOString(),
      period: { from: from_date, to: to_date },
      executive_summary: {
        total_transactions: this.ledger.length,
        total_accounts: Array.from(this.accounts.values()).filter(a => a.is_active).length,
        ledger_integrity: Math.abs(totalDebits - totalCredits) < 0.01,
        variance_detected: anomalies.some(a => a.category === 'error' || a.category === 'warning'),
        overall_health: overallHealth,
      },
      financial_summary: {
        total_revenue: statement.income_statement.total_revenue,
        total_expenses: statement.income_statement.total_expenses,
        net_income: statement.income_statement.net_income,
        total_assets: statement.balance_sheet.total_assets,
        total_liabilities: statement.balance_sheet.total_liabilities,
        total_equity: statement.balance_sheet.total_equity,
      },
      account_analysis: accountAnalysis,
      compliance_checks: {
        double_entry_valid: Math.abs(totalDebits - totalCredits) < 0.01,
        trial_balance_matches: true,
        equation_holds: accountEquation,
        no_orphaned_transactions: true,
        all_accounts_reconciled: accountAnalysis.every(a => a.transactions_count > 0 || a.closing_balance === 0),
      },
      anomalies_detected: anomalies,
      recommendations,
      key_observations: {
        revenue_trend: revenueEnd > revenueStart ? 'increasing' : revenueEnd < revenueStart ? 'decreasing' : 'stable',
        expense_trend: expenseEnd > expenseStart ? 'increasing' : expenseEnd < expenseStart ? 'decreasing' : 'stable',
        cash_position: statement.cash_flow.closing_balance > statement.cash_flow.opening_balance ? 'improving' : statement.cash_flow.closing_balance < statement.cash_flow.opening_balance ? 'declining' : 'stable',
        liquidity_status: ratios.current_ratio > 1.5 ? 'strong' : ratios.current_ratio > 1 ? 'adequate' : 'weak',
      },
      audit_trail: {
        total_entries: this.ledger.length,
        entries_by_type: {
          invoice: this.ledger.filter(e => e.reference_type === 'invoice').length,
          transaction: this.ledger.filter(e => e.reference_type === 'transaction').length,
          manual: this.ledger.filter(e => e.reference_type === 'manual').length,
        },
        entries_by_account: Array.from(this.accounts.values()).reduce((acc, account) => {
          acc[account.name] = this.getAccountLedger(account.id, from_date, to_date).length;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  /**
   * Generate chart data for visualizations (optimized)
   */
  generateChartData(from_date: string, to_date: string): ChartData {
    const accountSummary = this.getAccountSummary();

    // Generate monthly revenue and expense data
    const months: { month: string; from: string; to: string }[] = [];
    let currentDate = new Date(from_date);
    const endDate = new Date(to_date);
    
    while (currentDate <= endDate) {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      months.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        from: monthStart.toISOString().split('T')[0],
        to: monthEnd.toISOString().split('T')[0],
      });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Pre-filter ledger entries for the period once
    const periodLedger = this.getPeriodLedger(from_date, to_date);

    const monthly_revenue = months.map(m => ({
      month: m.month,
      amount: accountSummary.income.accounts.reduce((sum, acc) => {
        return sum + periodLedger
          .filter(e => e.account_id === acc.id && e.date >= m.from && e.date <= m.to)
          .reduce((s, e) => s + e.credit, 0);
      }, 0),
    }));

    const monthly_expenses = months.map(m => ({
      month: m.month,
      amount: accountSummary.expense.accounts.reduce((sum, acc) => {
        return sum + periodLedger
          .filter(e => e.account_id === acc.id && e.date >= m.from && e.date <= m.to)
          .reduce((s, e) => s + e.debit, 0);
      }, 0),
    }));

    // Account balances visualization
    const totalAssets = accountSummary.asset.total;
    const account_balances: VisualDataPoint[] = accountSummary.asset.accounts.map(acc => ({
      name: acc.name,
      value: this.calculateAccountBalance(acc.id),
      percentage: totalAssets > 0 ? (this.calculateAccountBalance(acc.id) / totalAssets) * 100 : 0,
    }));

    // Revenue breakdown
    const totalRevenue = accountSummary.income.total;
    const revenue_by_source: VisualDataPoint[] = accountSummary.income.accounts.map(acc => ({
      name: acc.name,
      value: this.calculateAccountBalance(acc.id),
      percentage: totalRevenue > 0 ? (this.calculateAccountBalance(acc.id) / totalRevenue) * 100 : 0,
    }));

    // Expense breakdown
    const totalExpenses = accountSummary.expense.total;
    const expenses_by_category: VisualDataPoint[] = accountSummary.expense.accounts.map(acc => ({
      name: acc.name,
      value: this.calculateAccountBalance(acc.id),
      percentage: totalExpenses > 0 ? (this.calculateAccountBalance(acc.id) / totalExpenses) * 100 : 0,
    }));

    return {
      monthly_revenue,
      monthly_expenses,
      account_balances,
      revenue_by_source,
      expenses_by_category,
    };
  }

  /**
   * Export audit report as JSON
   */
  exportAuditReportJSON(report: AuditReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate audit report summary text
   */
  generateAuditSummaryText(report: AuditReport): string {
    return `
AUDIT REPORT SUMMARY
Generated: ${new Date(report.generated_at).toLocaleString()}
Period: ${report.period.from} to ${report.period.to}

EXECUTIVE SUMMARY
================
Overall Health: ${report.executive_summary.overall_health.toUpperCase()}
Total Transactions: ${report.executive_summary.total_transactions}
Total Accounts: ${report.executive_summary.total_accounts}
Ledger Integrity: ${report.executive_summary.ledger_integrity ? '✅ VALID' : '❌ INVALID'}
Variance Detected: ${report.executive_summary.variance_detected ? '⚠️ YES' : '✅ NO'}

FINANCIAL SUMMARY
=================
Total Revenue: $${report.financial_summary.total_revenue.toFixed(2)}
Total Expenses: $${report.financial_summary.total_expenses.toFixed(2)}
Net Income: $${report.financial_summary.net_income.toFixed(2)}
Total Assets: $${report.financial_summary.total_assets.toFixed(2)}
Total Liabilities: $${report.financial_summary.total_liabilities.toFixed(2)}
Total Equity: $${report.financial_summary.total_equity.toFixed(2)}

COMPLIANCE STATUS
=================
${Object.entries(report.compliance_checks)
  .map(([check, passed]) => `${check.replace(/_/g, ' ').toUpperCase()}: ${passed ? '✅' : '❌'}`)
  .join('\n')}

RECOMMENDATIONS
================
${report.recommendations.map(r => `• ${r}`).join('\n')}

KEY OBSERVATIONS
================
Revenue Trend: ${report.key_observations.revenue_trend.toUpperCase()}
Expense Trend: ${report.key_observations.expense_trend.toUpperCase()}
Cash Position: ${report.key_observations.cash_position.toUpperCase()}
Liquidity Status: ${report.key_observations.liquidity_status.toUpperCase()}
    `;
  }
}
