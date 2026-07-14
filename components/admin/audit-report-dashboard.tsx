'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TermHelp } from '@/components/common/term-help';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  Shield,
  PieChart as PieChartIcon,
  BarChart3,
  FileText,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { AuditReport, ChartData, VisualDataPoint } from '@/lib/tally-engine';

interface AuditReportDashboardProps {
  report: AuditReport;
  chartData: ChartData;
  onExport?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const STATUS_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  fair: '#f59e0b',
  poor: '#ef4444',
};

export function AuditReportDashboard({
  report,
  chartData,
  onExport,
}: AuditReportDashboardProps) {
  const [selectedTab, setSelectedTab] = useState('overview');

  const healthColor = STATUS_COLORS[report.executive_summary.overall_health as keyof typeof STATUS_COLORS];

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Audit Report</h2>
          <p className="text-sm text-gray-500">
            Generated on {new Date(report.generated_at).toLocaleDateString()} •{' '}
            {report.period.from} to {report.period.to}
          </p>
        </div>
        <Button onClick={onExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Overall Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Overall Health
              <TermHelp term="overall_health" />
            </CardTitle>
            <Shield className="h-4 w-4" style={{ color: healthColor }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize" style={{ color: healthColor }}>
              {report.executive_summary.overall_health}
            </div>
            <p className="text-xs text-gray-500">Financial position</p>
          </CardContent>
        </Card>

        {/* Ledger Integrity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Ledger Integrity
              <TermHelp term="ledger_integrity" />
            </CardTitle>
            {report.executive_summary.ledger_integrity ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.executive_summary.ledger_integrity ? '✅ Valid' : '❌ Invalid'}
            </div>
            <p className="text-xs text-gray-500">Double-entry bookkeeping</p>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Total Transactions
              <TermHelp term="total_transactions" />
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.executive_summary.total_transactions}</div>
            <p className="text-xs text-gray-500">In this period</p>
          </CardContent>
        </Card>

        {/* Accounts Monitored */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              Accounts
              <TermHelp term="accounts_monitored" />
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.executive_summary.total_accounts}</div>
            <p className="text-xs text-gray-500">Active accounts</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {report.anomalies_detected.length > 0 && (
        <Alert variant={report.anomalies_detected.some(a => a.category === 'error') ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ {report.anomalies_detected.length} Anomalies Detected</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 space-y-1">
              {report.anomalies_detected.slice(0, 3).map((anomaly, idx) => (
                <li key={idx} className="text-sm">
                  {anomaly.category === 'error' && '❌'} {anomaly.category === 'warning' && '⚠️'}{' '}
                  {anomaly.category === 'observation' && 'ℹ️'} {anomaly.description}
                </li>
              ))}
              {report.anomalies_detected.length > 3 && (
                <li className="text-sm font-semibold">
                  +{report.anomalies_detected.length - 3} more
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Section */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="financials" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financials</span>
          </TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Details</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Revenue & Expense Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Monthly Cash Flow
                  <TermHelp term="monthly_cash_flow" />
                </CardTitle>
                <CardDescription>Revenue vs Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData.monthly_revenue.map((m, idx) => ({
                    month: m.month,
                    revenue: m.amount,
                    expenses: chartData.monthly_expenses[idx]?.amount || 0,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" />
                    <Bar dataKey="expenses" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Financial Position Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Financial Position
                  <TermHelp term="financial_position" />
                </CardTitle>
                <CardDescription>Assets vs Liabilities vs Equity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Assets</span>
                      <span className="text-lg font-bold text-blue-600">
                        ${report.financial_summary.total_assets.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: '100%',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Liabilities</span>
                      <span className="text-lg font-bold text-red-600">
                        ${report.financial_summary.total_liabilities.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${(report.financial_summary.total_liabilities / report.financial_summary.total_assets) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Equity</span>
                      <span className="text-lg font-bold text-green-600">
                        ${report.financial_summary.total_equity.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(report.financial_summary.total_equity / report.financial_summary.total_assets) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net Income Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Net Income Statement
                <TermHelp term="net_income" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-green-50 p-4">
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${report.financial_summary.total_revenue.toFixed(2)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-sm text-gray-600">Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${report.financial_summary.total_expenses.toFixed(2)}
                  </p>
                </div>
                <div className={`rounded-lg p-4 ${
                  report.financial_summary.net_income >= 0 ? 'bg-blue-50' : 'bg-red-50'
                }`}>
                  <p className="text-sm text-gray-600">Net Income</p>
                  <p className={`text-2xl font-bold ${
                    report.financial_summary.net_income >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    ${report.financial_summary.net_income.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financials Tab */}
        <TabsContent value="financials" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue by Source */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Revenue by Source
                  <TermHelp term="revenue_by_source" />
                </CardTitle>
                <CardDescription>Income distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.revenue_by_source}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.revenue_by_source.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Expenses by Category
                  <TermHelp term="expenses_by_category" />
                </CardTitle>
                <CardDescription>Cost distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.expenses_by_category}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.expenses_by_category.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Account Balances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Account Balance Distribution
                <TermHelp term="account_balance_distribution" />
              </CardTitle>
              <CardDescription>Assets breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.account_balances}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold">Compliance Health Check</h3>
            <TermHelp term="compliance_status" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(report.compliance_checks).map(([check, passed]) => (
              <Card key={check} className={passed ? "bg-green-50/50 border-green-200" : "bg-red-50/50 border-red-200"}>
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-2">
                  {passed ? (
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  )}
                  <h3 className="font-semibold capitalize text-gray-900">
                    {check.replace(/_/g, ' ')}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {passed ? "PASSED" : "FAILED"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Audit Trail Summary */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Audit Trail Composition
                  <TermHelp term="audit_trail" />
                </CardTitle>
                <CardDescription>Source of all financial entries</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(report.audit_trail.entries_by_type).map(
                        ([type, count]) => ({
                          name: type,
                          value: count,
                        })
                      )}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={5}
                    >
                      {['invoice', 'transaction', 'manual'].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Key Observations */}
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Key Financial Observations</CardTitle>
                <CardDescription>Automated trend analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">
                      {report.key_observations.revenue_trend === 'increasing' ? (
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">Revenue <TermHelp term="revenue_trend" /></span>
                    <span className="font-bold capitalize text-slate-900">{report.key_observations.revenue_trend}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">
                      {report.key_observations.expense_trend === 'increasing' ? (
                        <TrendingUp className="h-5 w-5 text-red-500" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">Expenses <TermHelp term="expense_trend" /></span>
                    <span className="font-bold capitalize text-slate-900">{report.key_observations.expense_trend}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">
                      <DollarSign className="h-5 w-5 text-blue-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">Cash Position <TermHelp term="cash_position" /></span>
                    <span className="font-bold capitalize text-slate-900">{report.key_observations.cash_position}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="mb-2 p-2 bg-white rounded-full shadow-sm">
                      <Shield className="h-5 w-5 text-purple-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">Liquidity <TermHelp term="liquidity_status" /></span>
                    <span className="font-bold capitalize text-slate-900">{report.key_observations.liquidity_status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Strategic Recommendations
                <TermHelp term="recommendations" />
              </h3>
              <div className="space-y-3">
                {report.recommendations.length > 0 ? (
                  report.recommendations.map((rec, idx) => (
                    <Card key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-none shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex gap-4 items-start">
                        <div className="mt-1 bg-white p-1.5 rounded-lg shadow-sm text-blue-600">
                          <Zap className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{rec}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-green-50 border-none">
                    <CardContent className="p-6 text-center text-green-700">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Financial health is excellent. No immediate actions required.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div>
               <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Detected Anomalies
                <TermHelp term="anomalies" />
              </h3>
              <div className="space-y-3">
                {report.anomalies_detected.length > 0 ? (
                  report.anomalies_detected.map((anomaly, idx) => (
                    <Card key={idx} className={`border-l-4 shadow-sm ${
                        anomaly.category === 'error'
                          ? 'border-l-red-500 bg-red-50/30'
                          : anomaly.category === 'warning'
                          ? 'border-l-amber-500 bg-amber-50/30'
                          : 'border-l-blue-500 bg-blue-50/30'
                      }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${
                             anomaly.category === 'error' ? 'bg-red-100 text-red-700' :
                             anomaly.category === 'warning' ? 'bg-amber-100 text-amber-700' :
                             'bg-blue-100 text-blue-700'
                          }`}>
                            {anomaly.category}
                          </span>
                          <span className="text-xs text-muted-foreground">Impact: {anomaly.impact}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-800 mt-2">{anomaly.description}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="bg-slate-50 border-dashed">
                    <CardContent className="p-8 text-center text-slate-500">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>No anomalies detected in the ledger.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Account Performance Analysis
                <TermHelp term="account_analysis" />
              </CardTitle>
              <CardDescription>Detailed breakdown by account with balance visualization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Account Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="w-[100px] text-right">Activity</TableHead>
                      <TableHead className="w-[150px]">Balance Distribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.account_analysis.map((account) => {
                      // Calculate max balance for relative bar width (simple approximation)
                      const maxBal = Math.max(...report.account_analysis.map(a => Math.abs(a.closing_balance))) || 1;
                      const percent = Math.min((Math.abs(account.closing_balance) / maxBal) * 100, 100);
                      
                      return (
                        <TableRow key={account.account_id}>
                          <TableCell>
                            <div className="font-medium text-slate-900">{account.account_name}</div>
                            <div className="text-xs text-slate-500 font-mono">{account.account_code}</div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize 
                              ${account.account_type === 'asset' ? 'bg-blue-100 text-blue-800' : 
                                account.account_type === 'liability' ? 'bg-red-100 text-red-800' : 
                                account.account_type === 'equity' ? 'bg-green-100 text-green-800' : 
                                account.account_type === 'income' ? 'bg-emerald-100 text-emerald-800' : 
                                'bg-orange-100 text-orange-800'}`}>
                              {account.account_type}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${account.closing_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right">
                             <span className="text-xs text-slate-500">{account.transactions_count} txns</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${account.closing_balance >= 0 ? 'bg-blue-500' : 'bg-red-500'}`}
                                  style={{ width: `${percent}%` }} 
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
