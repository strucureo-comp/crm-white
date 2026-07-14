'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, TrendingUp, ShoppingCart, BarChart3, Loader2 } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { useEffect, useState } from 'react';
import { getLeads, getProjects, getInvoices, getTransactions } from '@/lib/firebase/database';
import type { Lead, Project, Invoice, Transaction } from '@/lib/db/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    Promise.all([
      getLeads(),
      getProjects(),
      getInvoices(),
      getTransactions(),
    ]).then(([l, p, i, t]) => {
      setLeads(l);
      setProjects(p);
      setInvoices(i);
      setTransactions(t);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const daysOld = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 30;
  const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();

  const filteredInvoices = invoices.filter((inv) => inv.created_at >= cutoff);
  const filteredTransactions = transactions.filter((t) => t.created_at >= cutoff);
  const filteredLeads = leads.filter((l) => l.created_at >= cutoff);
  const filteredProjects = projects.filter((p) => p.created_at >= cutoff);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalRevenue = filteredInvoices.filter((inv) => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const totalTransactions = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const combinedRevenue = totalRevenue + totalTransactions;
  const activeUsers = Array.from(new Set(filteredProjects.map((p) => p.client_id).filter(Boolean))).length;
  const wonLeads = filteredLeads.filter((l) => l.status === 'won').length;
  const conversionRate = filteredLeads.length > 0 ? ((wonLeads / filteredLeads.length) * 100).toFixed(1) : '0.0';
  const totalDeals = filteredLeads.filter((l) => l.status === 'negotiation' || l.status === 'proposal').length;
  const avgDealSize = wonLeads > 0 ? Math.round(combinedRevenue / wonLeads) : 0;

  const kpiWidgets = [
    { title: 'Total Revenue', value: `$${combinedRevenue.toLocaleString()}`, change: 'From invoices & income', trend: 'up' as const, icon: DollarSign },
    { title: 'Active Clients', value: activeUsers.toString(), change: `${filteredLeads.length} leads (selected period)`, trend: 'up' as const, icon: Users },
    { title: 'Conversion Rate', value: `${conversionRate}%`, change: `${wonLeads} won deals`, trend: 'up' as const, icon: TrendingUp },
    { title: 'Avg. Deal Size', value: `$${avgDealSize.toLocaleString()}`, change: 'Per won deal', trend: avgDealSize > 0 ? 'up' as const : 'down' as const, icon: ShoppingCart },
    { title: 'Active Projects', value: projects.filter((p) => p.status === 'in_progress').length.toString(), change: `${projects.length} total projects`, trend: 'up' as const, icon: BarChart3 },
    { title: 'Pending Invoices', value: invoices.filter((i) => i.status === 'pending').length.toString(), change: 'Awaiting payment', trend: 'down' as const, icon: TrendingUp },
  ];

  const dealFunnelStages = [
    { stage: 'Qualified', count: filteredLeads.filter((l) => l.status === 'qualified').length, pct: 100 },
    { stage: 'Contacted', count: filteredLeads.filter((l) => l.status === 'contacted').length, pct: 67 },
    { stage: 'Proposal', count: filteredLeads.filter((l) => l.status === 'proposal').length, pct: 36 },
    { stage: 'Negotiation', count: filteredLeads.filter((l) => l.status === 'negotiation').length, pct: 19 },
    { stage: 'Closed Won', count: wonLeads, pct: wonLeads > 0 ? 10 : 0 },
  ];

  const revenueTarget = Math.max(combinedRevenue * 1.5, 500000);
  const leadTarget = Math.max(filteredLeads.length * 1.5, 100);
  const dealTarget = Math.max(totalDeals * 1.5, 40);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-sm text-muted-foreground">Track your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d" value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiWidgets.map((kpi) => (
          <KpiCard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const monthlyMap: Record<string, { month: string; invoices: number; transactions: number; total: number }> = {};
              const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              filteredInvoices.forEach((inv) => {
                const d = new Date(inv.created_at);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                if (!monthlyMap[key]) monthlyMap[key] = { month: `${months[d.getMonth()]} ${d.getFullYear()}`, invoices: 0, transactions: 0, total: 0 };
                monthlyMap[key].invoices += inv.amount || 0;
                monthlyMap[key].total += inv.amount || 0;
              });
              filteredTransactions.forEach((t) => {
                if (t.type === 'income') {
                  const d = new Date(t.created_at);
                  const key = `${d.getFullYear()}-${d.getMonth()}`;
                  if (!monthlyMap[key]) monthlyMap[key] = { month: `${months[d.getMonth()]} ${d.getFullYear()}`, invoices: 0, transactions: 0, total: 0 };
                  monthlyMap[key].transactions += t.amount || 0;
                  monthlyMap[key].total += t.amount || 0;
                }
              });
              const chartData = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
              return chartData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, undefined]} />
                      <Bar dataKey="invoices" name="Invoices" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} stackId="a" />
                      <Bar dataKey="transactions" name="Transactions" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No revenue data for this period</p>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Deal Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {dealFunnelStages.map((stage) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${stage.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: 'Revenue Target', current: `$${combinedRevenue.toLocaleString()}`, target: `$${Math.round(revenueTarget).toLocaleString()}`, pct: Math.min(100, Math.round((combinedRevenue / revenueTarget) * 100)) },
                { label: 'Lead Target', current: filteredLeads.length.toString(), target: Math.round(leadTarget).toString(), pct: Math.min(100, Math.round((filteredLeads.length / leadTarget) * 100)) },
                { label: 'Deal Target', current: totalDeals.toString(), target: Math.round(dealTarget).toString(), pct: Math.min(100, Math.round((totalDeals / dealTarget) * 100)) },
              ].map((metric) => (
                <div key={metric.label} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{metric.label}</span>
                    <span className="text-muted-foreground">{metric.current} / {metric.target}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{ width: `${metric.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
