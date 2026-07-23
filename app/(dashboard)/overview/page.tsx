'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  DollarSign,
  Briefcase,
  CheckSquare,
  Target,
  TrendingUp,
  Loader2,
  FileText,
  Activity,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getLeads,
  getInvoices,
  getProjects,
  getUsers,
  getActivityLogs,
  getCampaigns,
  getContentItems,
} from '@/lib/firebase/database';
import type { Lead, Invoice, Project, User, ActivityLog, Campaign, ContentItem } from '@/lib/db/types';
import { formatCurrency } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-50 text-gray-600 dark:bg-gray-950 dark:text-gray-400',
  active: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  paused: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  completed: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
};

const stageColors: Record<string, string> = {
  lead: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  active: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  closed_won: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  closed_lost: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

export default function OverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);

  useEffect(() => {
    Promise.all([
      getLeads(),
      getInvoices(),
      getProjects(),
      getUsers(),
      getActivityLogs(10),
      getCampaigns(),
      getContentItems(),
    ])
      .then(([l, i, p, u, a, c, ci]) => {
        setLeads(l);
        setInvoices(i);
        setProjects(p);
        setUsers(u);
        setActivityLogs(a);
        setCampaigns(c);
        setContentItems(ci);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeDeals = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const pipelineValue = leads
    .filter((l) => l.status !== 'won' && l.status !== 'lost')
    .reduce((sum, l) => sum + (l.potential_value || 0), 0);

  const today = new Date().toISOString().split('T')[0];
  const openTasksToday = leads.filter((l) => l.next_follow_up && l.next_follow_up.startsWith(today)).length;

  const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

  const companies = leads.reduce((acc, lead) => {
    const company = lead.company || 'Unknown';
    if (!acc[company]) {
      acc[company] = {
        name: company,
        leads: [],
        totalValue: 0,
        stage: lead.status,
      };
    }
    acc[company].leads.push(lead);
    acc[company].totalValue += lead.potential_value || 0;
    if (lead.status === 'won') acc[company].stage = 'closed_won';
    else if (lead.status === 'lost') acc[company].stage = 'closed_lost';
    else if (lead.status !== 'new') acc[company].stage = 'active';
    return acc;
  }, {} as Record<string, { name: string; leads: Lead[]; totalValue: number; stage: string }>);
  const companyList = Object.values(companies).slice(0, 10);

  const funnelStages = [
    { name: 'Lead', count: leads.filter((l) => l.status === 'new').length, value: leads.filter((l) => l.status === 'new').reduce((s, l) => s + (l.potential_value || 0), 0) },
    { name: 'Qualified', count: leads.filter((l) => l.status === 'qualified').length, value: leads.filter((l) => l.status === 'qualified').reduce((s, l) => s + (l.potential_value || 0), 0) },
    { name: 'Proposal', count: leads.filter((l) => l.status === 'proposal').length, value: leads.filter((l) => l.status === 'proposal').reduce((s, l) => s + (l.potential_value || 0), 0) },
    { name: 'Negotiation', count: leads.filter((l) => l.status === 'negotiation').length, value: leads.filter((l) => l.status === 'negotiation').reduce((s, l) => s + (l.potential_value || 0), 0) },
    { name: 'Closed Won', count: leads.filter((l) => l.status === 'won').length, value: leads.filter((l) => l.status === 'won').reduce((s, l) => s + (l.potential_value || 0), 0) },
  ];

  const topDeals = leads
    .filter((l) => l.status !== 'won' && l.status !== 'lost')
    .sort((a, b) => (b.potential_value || 0) - (a.potential_value || 0))
    .slice(0, 4);

  const pendingInvoices = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  const activeContracts = projects
    .filter((p) => p.status === 'in_progress')
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="text-sm text-muted-foreground">High-level business pulse</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Deals"
          value={String(activeDeals)}
          change={`${activeDeals} in pipeline`}
          trend={activeDeals > 0 ? 'up' : 'neutral'}
          icon={Briefcase}
        />
        <KpiCard
          title="Pipeline Value"
          value={formatCurrency(pipelineValue)}
          change={`${activeDeals} deals`}
          trend={pipelineValue > 0 ? 'up' : 'neutral'}
          icon={DollarSign}
        />
        <KpiCard
          title="Open Tasks Today"
          value={String(openTasksToday)}
          change={`${openTasksToday} due`}
          trend={openTasksToday > 0 ? 'up' : 'neutral'}
          icon={CheckSquare}
        />
        <KpiCard
          title="Active Campaigns"
          value={String(activeCampaigns)}
          change={`${campaigns.length} total`}
          trend={activeCampaigns > 0 ? 'up' : 'neutral'}
          icon={Target}
        />
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {companyList.map((company) => (
            <Card key={company.name} className="w-64 shrink-0 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {company.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.leads.length} leads</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Stage</span>
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${stageColors[company.stage] || ''}`}>
                      {company.stage.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Pipeline Value</span>
                    <span className="text-xs font-medium">{formatCurrency(company.totalValue)}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Health Score</span>
                      <span className="text-muted-foreground">{Math.min(100, Math.round((company.totalValue / (pipelineValue || 1)) * 100 * company.leads.length))}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${Math.min(100, Math.round((company.totalValue / (pipelineValue || 1)) * 100 * company.leads.length))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pipeline Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {funnelStages.map((stage) => (
                <div key={stage.name} className="flex items-center gap-4">
                  <div className="w-24 shrink-0">
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(stage.count / Math.max(...funnelStages.map((s) => s.count), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-sm">{stage.count} companies</span>
                  </div>
                  <div className="w-24 text-right shrink-0">
                    <span className="text-sm font-medium">{formatCurrency(stage.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Weighted Deals</CardTitle>
          </CardHeader>
          <CardContent>
            {topDeals.length > 0 ? (
              <div className="space-y-3">
                {topDeals.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/leads')}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{deal.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{deal.company || '—'}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${stageColors[deal.status] || ''}`}>
                        {deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                      </Badge>
                      <span className="text-sm font-medium">{formatCurrency(deal.potential_value || 0)}</span>
                      <span className="text-xs text-muted-foreground">{deal.next_follow_up ? new Date(deal.next_follow_up).toLocaleDateString() : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No active deals</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Marketing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/campaigns')}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{campaign.channel}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-xs text-muted-foreground">{campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : '—'}</span>
                      <span className="text-sm font-medium">{formatCurrency(campaign.budget || 0)}</span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${statusColors[campaign.status] || ''}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No campaigns yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Assets</CardTitle>
          </CardHeader>
          <CardContent>
            {contentItems.length > 0 ? (
              <div className="space-y-3">
                {contentItems.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/content-hub')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={18} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{asset.title}</p>
                        <p className="text-xs text-muted-foreground">{asset.type}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-3">{new Date(asset.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No assets uploaded</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financials & Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvoices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Pending/Overdue Invoices</p>
                  <div className="space-y-2">
                    {pendingInvoices.map((invoice) => {
                      const dueDate = new Date(invoice.due_date);
                      const isOverdue = invoice.status === 'overdue' || dueDate < new Date();
                      return (
                        <div key={invoice.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/invoices')}>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{invoice.description || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-sm font-medium">{formatCurrency(invoice.amount)}</span>
                            <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${isOverdue ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'}`}>
                              {isOverdue ? 'Overdue' : 'Pending'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{dueDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {activeContracts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Active Contracts</p>
                  <div className="space-y-2">
                    {activeContracts.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push('/projects')}>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.title}</p>
                          <p className="text-xs text-muted-foreground">{project.manual_client_name || project.client_id || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-muted-foreground">{project.deadline ? `Ends ${new Date(project.deadline).toLocaleDateString()}` : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pendingInvoices.length === 0 && activeContracts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No pending invoices or active contracts</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Team Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-4">
                {activityLogs.slice(0, 8).map((log) => (
                  <div key={log.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{log.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{log.user_name}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity size={40} className="mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">Activity feed will appear once actions are logged.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
