'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  RefreshCw, Calendar, Users, MapPin, Package, Download,
  Trash2, Clock, Play, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  TrendingUp, CircleDollarSign, Target, Activity, FileText, CheckCircle2, ShieldAlert,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToDeals } from '@/lib/db/deals/api';
import { subscribeToInvoices } from '@/lib/db/invoices/api';
import type { Deal, NormalizedInvoice as Invoice } from '@/lib/db/types';

type SortDir = 'asc' | 'desc' | null;
type ReportType = 'sales' | 'revenue' | 'activity' | 'conversion' | 'pipeline';

interface TableRow {
  id: string;
  name: string;
  source: string;
  deals: number;
  revenue: number;
  wonDeals: number;
  lostDeals: number;
  pipeline: number;
  status: string;
}

const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: 'sales', label: 'Sales' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'activity', label: 'Customer Activity' },
  { id: 'conversion', label: 'Lead Conversion' },
  { id: 'pipeline', label: 'Pipeline' },
];

const STATUS_COLORS: Record<string, string> = {
  Won: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
  Active: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'At Risk': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
};

export default function ReportsPage() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [activeType, setActiveType] = useState<ReportType>('revenue');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(true);
  const [activeTab, setActiveTab] = useState<'table' | 'saved' | 'scheduled'>('table');
  const [sortCol, setSortCol] = useState<keyof TableRow>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [exportPreview, setExportPreview] = useState<'pdf' | 'excel' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Firebase subscriptions
  useEffect(() => {
    if (!companyId) return;
    const unsubDeals = subscribeToDeals(companyId, (d) => {
      setDeals(d);
      setIsLoading(false);
    });
    const unsubInvoices = subscribeToInvoices(companyId, (inv) => {
      setInvoices(inv);
    });
    return () => { unsubDeals(); unsubInvoices(); };
  }, [companyId]);

  // Compute table data: group deals by source (acts as "region"/"product" proxy)
  const tableData = useMemo<TableRow[]>(() => {
    const sourceMap = new Map<string, { deals: number; revenue: number; wonDeals: number; lostDeals: number; pipeline: number }>();

    for (const deal of deals) {
      const source = deal.source || 'Unknown';
      const existing = sourceMap.get(source) || { deals: 0, revenue: 0, wonDeals: 0, lostDeals: 0, pipeline: 0 };
      existing.deals += 1;
      if (deal.status === 'won') {
        existing.wonDeals += 1;
        existing.revenue += deal.value || 0;
      } else if (deal.status === 'lost') {
        existing.lostDeals += 1;
      } else {
        existing.pipeline += deal.value || 0;
      }
      sourceMap.set(source, existing);
    }

    return Array.from(sourceMap.entries()).map(([source, data], i) => {
      const totalActive = data.deals - data.wonDeals - data.lostDeals;
      const conversion = data.deals > 0 ? Math.round((data.wonDeals / data.deals) * 100) : 0;
      let status = 'Active';
      if (conversion >= 60) status = 'Won';
      else if (conversion < 30 && data.deals > 3) status = 'At Risk';

      return {
        id: String(i + 1),
        name: source,
        source,
        deals: data.deals,
        revenue: data.revenue,
        wonDeals: data.wonDeals,
        lostDeals: data.lostDeals,
        pipeline: data.pipeline,
        status,
      };
    });
  }, [deals]);

  // KPIs from real data
  const kpis = useMemo(() => {
    const wonDeals = deals.filter(d => d.status === 'won');
    const activeDeals = deals.filter(d => d.status === 'open');
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const closedDeals = wonDeals.length;
    const conversion = deals.length > 0 ? Math.round((closedDeals / deals.length) * 100) : 0;

    return { totalRevenue, totalPipeline, closedDeals, conversion, totalDeals: deals.length };
  }, [deals]);

  // Revenue chart data: group won deals by month
  const revenueChartData = useMemo(() => {
    const monthMap = new Map<string, number>();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const deal of deals) {
      if (deal.status === 'won' && deal.actual_close_date) {
        const date = new Date(deal.actual_close_date);
        const monthKey = months[date.getMonth()];
        monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + (deal.value || 0));
      }
    }

    // Show last 6 months
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = months[d.getMonth()];
      result.push({ month: key, revenue: (monthMap.get(key) || 0) / 1000, target: (monthMap.get(key) || 0) / 1000 * 0.85 });
    }
    return result;
  }, [deals]);

  // Funnel data from real deals
  const funnelData = useMemo(() => {
    const stageCounts = new Map<string, number>();
    for (const deal of deals) {
      const status = deal.status || 'open';
      stageCounts.set(status, (stageCounts.get(status) || 0) + 1);
    }

    return [
      { stage: 'Open', count: stageCounts.get('open') || 0, fill: '#3b82f6' },
      { stage: 'Won', count: stageCounts.get('won') || 0, fill: '#10b981' },
      { stage: 'Lost', count: stageCounts.get('lost') || 0, fill: '#ef4444' },
    ];
  }, [deals]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => { setIsGenerating(false); setHasGenerated(true); }, 1500);
  };

  const handleSort = (col: keyof TableRow) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sortedData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      if (!sortDir) return 0;
      const modifier = sortDir === 'asc' ? 1 : -1;
      if (a[sortCol] < b[sortCol]) return -1 * modifier;
      if (a[sortCol] > b[sortCol]) return 1 * modifier;
      return 0;
    });
  }, [tableData, sortCol, sortDir]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Analyze performance, track trends, and schedule automated reports.</p>
        </div>

        {/* Report Type Tabs */}
        <div className="flex flex-wrap gap-2">
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.id}
              onClick={() => setActiveType(rt.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === rt.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {rt.label}
            </button>
          ))}
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <Select defaultValue="ytd">
                  <SelectTrigger className="w-[150px] h-9"><Calendar className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Date Range" /></SelectTrigger>
                  <SelectContent><SelectItem value="ytd">Year to Date</SelectItem><SelectItem value="q2">Q2 2026</SelectItem></SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px] h-9"><Users className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Agent" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Agents</SelectItem></SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px] h-9"><MapPin className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Region" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">Global</SelectItem><SelectItem value="na">North America</SelectItem></SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px] h-9"><Package className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Products</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm">Schedule</Button>
                <div className="flex items-center border rounded-lg p-1">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExportPreview('pdf')}><FileText className="w-3 h-3 mr-1" /> PDF</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> CSV</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> Excel</Button>
                </div>
                <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content */}
      <div className="relative">
        {(isGenerating || isLoading) && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Crunching numbers...</p>
          </div>
        )}

        {hasGenerated && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard title="Total Revenue" value={formatCurrency(kpis.totalRevenue)} change={`${kpis.closedDeals} deals won`} trend="up" icon={CircleDollarSign} />
              <KpiCard title="Deals Closed" value={String(kpis.closedDeals)} change={`${kpis.totalDeals} total`} trend="up" icon={Target} />
              <KpiCard title="Avg Conversion" value={`${kpis.conversion}%`} change={`${kpis.totalDeals} deals`} trend={kpis.conversion >= 50 ? 'up' : 'down'} icon={Activity} />
              <KpiCard title="Active Pipeline" value={formatCurrency(kpis.totalPipeline)} change={`${deals.filter(d => d.status === 'open').length} open deals`} trend="up" icon={TrendingUp} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">Revenue Trend</CardTitle>
                  <Badge variant="secondary">Last 6 Months</Badge>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueChartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}k`} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} formatter={(v: number) => [`$${v.toFixed(0)}k`, '']} />
                        <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Target" />
                        <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }} activeDot={{ r: 6, fill: '#10b981', stroke: 'hsl(var(--background))', strokeWidth: 2 }} name="Revenue" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-semibold">Deal Funnel</CardTitle>
                  <Badge variant="secondary">All Deals</Badge>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--foreground))', fontWeight: 600 }} dx={-10} />
                        <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                          {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content */}
            <div className="space-y-4">
              <div className="flex border-b">
                {(['table', 'saved', 'scheduled'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'table' ? 'Report Table' : tab === 'saved' ? 'Saved Reports' : 'Scheduled'}
                  </button>
                ))}
              </div>

              {activeTab === 'table' && (
                <Card>
                  {sortedData.length === 0 ? (
                    <div className="p-12 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-bold text-foreground mb-1">No data yet</h3>
                      <p className="text-sm text-muted-foreground">Add deals to see your report table.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b">
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground" onClick={() => handleSort('name')}>Source</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('deals')}>Deals</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('revenue')}>Revenue</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('wonDeals')}>Won</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('lostDeals')}>Lost</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground text-right" onClick={() => handleSort('pipeline')}>Pipeline</th>
                            <th className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {sortedData.map(row => (
                            <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                              <td className="p-4 font-medium">{row.name}</td>
                              <td className="p-4 text-sm font-medium text-right">{row.deals}</td>
                              <td className="p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 text-right">{formatCurrency(row.revenue)}</td>
                              <td className="p-4 text-sm font-medium text-right">{row.wonDeals}</td>
                              <td className="p-4 text-sm font-medium text-right">{row.lostDeals}</td>
                              <td className="p-4 text-sm font-medium text-right">{formatCurrency(row.pipeline)}</td>
                              <td className="p-4">
                                <Badge variant="secondary" className={STATUS_COLORS[row.status] || ''}>
                                  {row.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              )}

              {activeTab === 'saved' && (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No saved reports</h3>
                  <p className="text-sm text-muted-foreground">Generate a report and save it to see it here.</p>
                </div>
              )}

              {activeTab === 'scheduled' && (
                <div className="p-12 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-bold text-foreground mb-1">No scheduled reports</h3>
                  <p className="text-sm text-muted-foreground">Schedule a report to see it here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Export Preview Modal */}
      <Dialog open={!!exportPreview} onOpenChange={(open) => { if (!open) setExportPreview(null); }}>
        <DialogContent className="max-w-[1000px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {exportPreview === 'pdf' ? 'Report Preview (PDF)' : 'Spreadsheet Preview (Excel/CSV)'}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            {exportPreview === 'pdf' ? (
              <div className="space-y-6">
                <div className="text-center border-b pb-6">
                  <h2 className="text-2xl font-bold mb-1">CRM Analytical Report</h2>
                  <p className="text-sm text-muted-foreground">Generated: {new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 border-l-4 border-primary pl-3">1. Executive Summary</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Across {kpis.totalDeals} deals, total revenue reached {formatCurrency(kpis.totalRevenue)} with a {kpis.conversion}% conversion rate. Active pipeline stands at {formatCurrency(kpis.totalPipeline)}.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border p-4 rounded-lg"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</span><p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalRevenue)}</p></div>
                  <div className="border p-4 rounded-lg"><span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Pipeline</span><p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalPipeline)}</p></div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2 border-l-4 border-primary pl-3">2. Top Sources</h3>
                  <table className="w-full text-left text-sm mt-2">
                    <thead>
                      <tr className="border-b"><th className="py-2 font-medium">Source</th><th className="py-2 font-medium text-right">Deals</th><th className="py-2 font-medium text-right">Revenue</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedData.slice(0, 3).map(r => (
                        <tr key={r.id}>
                          <td className="py-2 font-medium">{r.name}</td>
                          <td className="py-2 text-right">{r.deals}</td>
                          <td className="py-2 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase">Source</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase text-right">Deals</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase text-right">Revenue</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase text-right">Won</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase text-right">Lost</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase text-right">Pipeline</th>
                      <th className="p-3 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedData.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/50">
                        <td className="p-3 font-medium">{r.name}</td>
                        <td className="p-3 text-right">{r.deals}</td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">{formatCurrency(r.revenue)}</td>
                        <td className="p-3 text-right">{r.wonDeals}</td>
                        <td className="p-3 text-right">{r.lostDeals}</td>
                        <td className="p-3 text-right">{formatCurrency(r.pipeline)}</td>
                        <td className="p-3">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
