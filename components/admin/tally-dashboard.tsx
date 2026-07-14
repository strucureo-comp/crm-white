'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TallyEngine, FinancialStatement } from '@/lib/tally-engine';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TallyDashboardProps {
  engine: TallyEngine;
  onReconcile?: () => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function TallyDashboard({ engine, onReconcile }: TallyDashboardProps) {
  const accountSummary = engine.getAccountSummary();
  const ratios = engine.calculateFinancialRatios();
  const statement = engine.generateFinancialStatement(
    new Date(new Date().setDate(1)).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  );

  // Prepare data for charts
  const assetChartData = statement.balance_sheet.assets.map(a => ({
    name: a.name.split(' ')[0],
    value: a.amount
  }));

  const incomeExpenseData = [
    { name: 'Revenue', value: statement.income_statement.total_revenue },
    { name: 'Expenses', value: statement.income_statement.total_expenses }
  ];

  const accountTypeData = Object.entries(accountSummary).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    total: data.total,
    count: data.accounts.length
  }));

  const formatChartValue = (value: unknown, digits: number = 2) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num.toFixed(digits) : '0.00';
  };

  return (
    <div className="space-y-6">
      {/* Financial Health Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profit Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratios.profit_margin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratios.profit_margin > 30 ? '📈 Healthy' : ratios.profit_margin > 10 ? '⚠️ Fair' : '📉 Low'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Debt-to-Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratios.debt_to_equity.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratios.debt_to_equity < 1 ? '✅ Good' : '⚠️ High'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Ratio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratios.current_ratio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratios.current_ratio > 1.5 ? '✅ Strong' : '⚠️ Check'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Operating Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ratios.operating_efficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ratios.operating_efficiency < 70 ? '✅ Good' : '⚠️ High'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Balance Sheet Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Balance Sheet</CardTitle>
                <CardDescription>Assets, Liabilities & Equity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Assets</span>
                    <span className="text-lg font-bold text-blue-600">${statement.balance_sheet.total_assets.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-blue-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Liabilities</span>
                    <span className="text-lg font-bold text-red-600">${statement.balance_sheet.total_liabilities.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-red-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Equity</span>
                    <span className="text-lg font-bold text-green-600">${statement.balance_sheet.total_equity.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-green-200 rounded-full" />
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground">
                  {Math.abs(
                    statement.balance_sheet.total_assets -
                    (statement.balance_sheet.total_liabilities + statement.balance_sheet.total_equity)
                  ) < 0.01
                    ? '✅ Balanced'
                    : '❌ Imbalanced'}
                </div>
              </CardContent>
            </Card>

            {/* Income Statement Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Income Statement</CardTitle>
                <CardDescription>Revenue & Expenses Summary</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Total Revenue
                    </span>
                    <span className="text-lg font-bold text-green-600">${statement.income_statement.total_revenue.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-green-200 rounded-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Total Expenses
                    </span>
                    <span className="text-lg font-bold text-red-600">${statement.income_statement.total_expenses.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-red-200 rounded-full" />
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium font-bold">Net Income</span>
                    <span className={cn(
                      "text-lg font-bold",
                      statement.income_statement.net_income > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      ${statement.income_statement.net_income.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            {incomeExpenseData[0].value > 0 || incomeExpenseData[1].value > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={incomeExpenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        dataKey="value"
                        label={({ name, value }) => `${name}: $${formatChartValue(value, 0)}`}
                      >
                        {incomeExpenseData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${formatChartValue(value)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No data to display
                </CardContent>
              </Card>
            )}

            {assetChartData.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asset Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={assetChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${formatChartValue(value)}`} />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Asset Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No assets recorded
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          {Object.entries(accountSummary).map(([type, data]) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{type}s ({data.accounts.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {data.accounts.length > 0 ? (
                  <div className="space-y-2">
                    {data.accounts.map((account) => (
                      <div key={account.id} className="flex justify-between items-center p-2 rounded border">
                        <div>
                          <p className="text-sm font-medium">{account.name}</p>
                          <p className="text-xs text-muted-foreground">{account.code}</p>
                        </div>
                        <span className="text-sm font-bold">${engine.calculateAccountBalance(account.id).toFixed(2) ?? 0}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center p-2 rounded bg-muted font-bold">
                      <span>Total {type}</span>
                      <span>${data.total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No accounts in this category</p>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Statements Tab */}
        <TabsContent value="statements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trial Balance</CardTitle>
              <CardDescription>Debit and Credit Summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Account</th>
                      <th className="text-right py-2 px-2">Debit</th>
                      <th className="text-right py-2 px-2">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engine.getTrialBalance().map((tb) => (
                      <tr key={tb.account_id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{tb.account_name}</td>
                        <td className="text-right py-2 px-2">${tb.debit.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">${tb.credit.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financial Ratios & Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Profit Margin</p>
                  <p className="text-2xl font-bold">{ratios.profit_margin.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    How much profit per dollar of revenue. Higher is better.
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Debt-to-Equity Ratio</p>
                  <p className="text-2xl font-bold">{ratios.debt_to_equity.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Debt relative to equity. Lower is safer.
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Current Ratio</p>
                  <p className="text-2xl font-bold">{ratios.current_ratio.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ability to pay short-term obligations. &gt;1 is good.
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Operating Efficiency</p>
                  <p className="text-2xl font-bold">{ratios.operating_efficiency.toFixed(2)}%</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Expense ratio. Lower means efficient operations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ratios.profit_margin > 30 ? (
                <div className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-900">Excellent Profitability</p>
                    <p className="text-xs text-green-700">Your profit margin is healthy. Keep maintaining this performance.</p>
                  </div>
                </div>
              ) : null}

              {ratios.debt_to_equity > 2 ? (
                <div className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-900">High Debt Levels</p>
                    <p className="text-xs text-orange-700">Consider paying down debt to improve financial stability.</p>
                  </div>
                </div>
              ) : null}

              {ratios.current_ratio < 1 ? (
                <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-red-900">Liquidity Concern</p>
                    <p className="text-xs text-red-700">You may struggle to pay short-term obligations. Increase working capital.</p>
                  </div>
                </div>
              ) : null}

              {ratios.operating_efficiency > 80 ? (
                <div className="flex gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-900">High Operating Costs</p>
                    <p className="text-xs text-orange-700">Review expenses to identify areas for cost reduction.</p>
                  </div>
                </div>
              ) : null}

              {ratios.profit_margin <= 10 && ratios.profit_margin >= 0 ? (
                <div className="flex gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">Low Profit Margins</p>
                    <p className="text-xs text-yellow-700">Consider increasing prices or reducing operational costs.</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
