'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { DollarSign, Users, TrendingUp, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { getLeads } from '@/lib/firebase/database';
import { getInvoices } from '@/lib/firebase/database';
import { getProjects } from '@/lib/firebase/database';
import { getTransactions } from '@/lib/firebase/database';
import type { Lead, Invoice } from '@/lib/db/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  contacted: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  qualified: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  proposal: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  negotiation: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  won: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  lost: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

export default function DashboardPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dealsWon, setDealsWon] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [leadData, invoiceData, projectData, transactionData] = await Promise.all([
          getLeads(),
          getInvoices(),
          getProjects(),
          getTransactions(),
        ]);
        setLeads(leadData);
        setInvoices(invoiceData);

        const revenue = invoiceData
          .filter((i) => i.status === 'paid')
          .reduce((sum, i) => sum + (i.amount || 0), 0);
        setTotalRevenue(revenue);

        const won = leadData.filter((l) => l.status === 'won').length;
        setDealsWon(won);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeLeads = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const wonLeadsCount = leads.filter((l) => l.status === 'won').length;
  const conversionRate = leads.length > 0 ? Math.round((wonLeadsCount / leads.length) * 100) : 0;

  const now = Date.now();
  const periodMs = 30 * 86400000;
  const currentPeriodStart = new Date(now - periodMs).toISOString();
  const previousPeriodStart = new Date(now - 2 * periodMs).toISOString();

  const currentRevenue = invoices.filter((i) => i.status === 'paid' && i.created_at >= currentPeriodStart).reduce((s, i) => s + (i.amount || 0), 0);
  const previousRevenue = invoices.filter((i) => i.status === 'paid' && i.created_at >= previousPeriodStart && i.created_at < currentPeriodStart).reduce((s, i) => s + (i.amount || 0), 0);
  const revenueChange = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);
  const revenueTrend = revenueChange >= 0 ? 'up' as const : 'down' as const;

  const currentLeads = leads.filter((l) => l.created_at >= currentPeriodStart).length;
  const previousLeads = leads.filter((l) => l.created_at >= previousPeriodStart && l.created_at < currentPeriodStart).length;
  const activeLeadsChange = previousLeads > 0 ? Math.round(((currentLeads - previousLeads) / previousLeads) * 100) : (currentLeads > 0 ? 100 : 0);

  const currentWon = leads.filter((l) => l.status === 'won' && l.created_at >= currentPeriodStart).length;
  const previousWon = leads.filter((l) => l.status === 'won' && l.created_at >= previousPeriodStart && l.created_at < currentPeriodStart).length;
  const dealsWonChange = previousWon > 0 ? Math.round(((currentWon - previousWon) / previousWon) * 100) : (currentWon > 0 ? 100 : 0);

  const currentTotalLeads = leads.filter((l) => l.created_at >= currentPeriodStart).length;
  const previousTotalLeads = leads.filter((l) => l.created_at >= previousPeriodStart && l.created_at < currentPeriodStart).length;
  const currentConversion = currentTotalLeads > 0 ? (leads.filter((l) => l.status === 'won' && l.created_at >= currentPeriodStart).length / currentTotalLeads) * 100 : 0;
  const previousConversion = previousTotalLeads > 0 ? (leads.filter((l) => l.status === 'won' && l.created_at >= previousPeriodStart && l.created_at < currentPeriodStart).length / previousTotalLeads) * 100 : 0;
  const convChange = previousConversion > 0 ? Math.round((currentConversion - previousConversion) * 10) / 10 : 0;
  const convTrend = convChange >= 0 ? 'up' as const : 'down' as const;

  const pipelineStages = [
    { name: 'New', count: leads.filter((l) => l.status === 'new').length, value: leads.filter((l) => l.status === 'new').reduce((s, l) => s + (l.potential_value || 0), 0), color: 'bg-blue-500' },
    { name: 'Contacted', count: leads.filter((l) => l.status === 'contacted').length, value: leads.filter((l) => l.status === 'contacted').reduce((s, l) => s + (l.potential_value || 0), 0), color: 'bg-amber-500' },
    { name: 'Qualified', count: leads.filter((l) => l.status === 'qualified').length, value: leads.filter((l) => l.status === 'qualified').reduce((s, l) => s + (l.potential_value || 0), 0), color: 'bg-violet-500' },
    { name: 'Proposal', count: leads.filter((l) => l.status === 'proposal').length, value: leads.filter((l) => l.status === 'proposal').reduce((s, l) => s + (l.potential_value || 0), 0), color: 'bg-purple-500' },
    { name: 'Negotiation', count: leads.filter((l) => l.status === 'negotiation').length, value: leads.filter((l) => l.status === 'negotiation').reduce((s, l) => s + (l.potential_value || 0), 0), color: 'bg-emerald-500' },
  ];

  const recentLeads = leads.slice(0, 5);
  const maxPipelineValue = Math.max(...pipelineStages.map((s) => s.count), 1);

  const tasksWithFollowUp = leads.filter((l) => l.next_follow_up).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatCurrency(totalRevenue)} change={`${revenueChange >= 0 ? '+' : ''}${revenueChange}%`} trend={revenueTrend} icon={DollarSign} description="from paid invoices" />
        <KpiCard title="Active Leads" value={String(activeLeads)} change={`${activeLeadsChange >= 0 ? '+' : ''}${activeLeadsChange}%`} trend={activeLeadsChange >= 0 ? 'up' : 'down'} icon={Users} description="in pipeline" />
        <KpiCard title="Conversion Rate" value={`${conversionRate}%`} change={`${convChange >= 0 ? '+' : ''}${convChange}%`} trend={convTrend} icon={TrendingUp} description="leads to won" />
        <KpiCard title="Deals Won" value={String(dealsWon)} change={`${dealsWonChange >= 0 ? '+' : ''}${dealsWonChange}%`} trend={dealsWonChange >= 0 ? 'up' : 'down'} icon={ShoppingCart} description="this quarter" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineStages.some((s) => s.count > 0) ? (
              <div className="space-y-4">
                {pipelineStages.map((stage) => (
                  <div key={stage.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stage.name}</span>
                      <span className="text-muted-foreground">{stage.count} leads · {formatCurrency(stage.value)}</span>
                    </div>
                    <Progress value={(stage.count / maxPipelineValue) * 100} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No leads in pipeline yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length > 0 ? (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center gap-3 cursor-pointer hover:bg-muted/30 rounded-lg p-1 -mx-1 transition-colors" onClick={() => router.push('/leads')}>
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {lead.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.company || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{lead.potential_value ? formatCurrency(lead.potential_value) : '—'}</p>
                      <Badge variant="secondary" className={`text-[10px] px-1 py-0 ${statusColors[lead.status] || ''}`}>{lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No leads yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <div className="space-y-4">
                {leads.slice(0, 5).map((lead, i) => (
                  <div key={lead.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm">
                        Lead <span className="font-medium">{lead.name}</span> created — status: {lead.status}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Follow-ups</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksWithFollowUp.length > 0 ? (
              <div className="space-y-3">
                {tasksWithFollowUp.map((lead) => {
                  const dueDate = lead.next_follow_up ? new Date(lead.next_follow_up) : null;
                  const isOverdue = dueDate && dueDate < new Date();
                  return (
                    <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/leads')}>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${isOverdue ? 'border-red-400' : 'border-muted-foreground/30'}`} />
                        <span className="text-sm">{lead.follow_up_notes || `Follow up with ${lead.name}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                          {isOverdue ? 'Overdue' : lead.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{dueDate?.toLocaleDateString() || '—'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No pending follow-ups</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
