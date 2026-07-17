'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  UserCircle,
  Loader2,
  PlusCircle,
  FileText,
  ClipboardList,
  Activity,
  Calendar,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getLeads, getInvoices, getProjects, getUsers, getActivityLogs } from '@/lib/firebase/database';
import type { Lead, Invoice, Project, User, ActivityLog } from '@/lib/db/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function OverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    Promise.all([
      getLeads(),
      getInvoices(),
      getProjects(),
      getUsers(),
      getActivityLogs(10),
    ])
      .then(([l, i, p, u, a]) => {
        setLeads(l);
        setInvoices(i);
        setProjects(p);
        setUsers(u);
        setActivityLogs(a);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const daysOld = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 30;
  const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();

  const filteredLeads = leads.filter((l) => l.created_at >= cutoff);
  const filteredInvoices = invoices.filter((inv) => inv.created_at >= cutoff);
  const filteredProjects = projects.filter((p) => p.created_at >= cutoff);

  const revenue = filteredInvoices.filter((inv) => inv.status === 'paid').reduce((s, inv) => s + inv.amount, 0);
  const activeProjectsCount = filteredProjects.filter((p) => p.status === 'in_progress').length;
  const activeLeadsCount = filteredLeads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const wonLeadsCount = filteredLeads.filter((l) => l.status === 'won').length;
  const conversionRate = filteredLeads.length > 0 ? ((wonLeadsCount / filteredLeads.length) * 100).toFixed(1) : '0.0';
  const teamMembersCount = users.length;

  const upcomingFollowUps = leads
    .filter((l) => l.next_follow_up)
    .sort((a, b) => new Date(a.next_follow_up!).getTime() - new Date(b.next_follow_up!).getTime())
    .slice(0, 5);

  const upcomingDeadlines = projects
    .filter((p) => p.deadline && p.status !== 'completed' && p.status !== 'cancelled')
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
    .slice(0, 5);

  const dueInvoices = invoices
    .filter((inv) => inv.status === 'pending' || inv.status === 'overdue')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quickActions = [
    { label: 'New Lead', icon: PlusCircle, href: '/leads' },
    { label: 'New Invoice', icon: FileText, href: '/invoices' },
    { label: 'New Project', icon: ClipboardList, href: '/projects' },
    { label: 'New Task', icon: Calendar, href: '/tasks' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">High-level business pulse</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Revenue"
          value={formatCurrency(revenue)}
          change={`${filteredInvoices.filter((i) => i.status === 'paid').length} paid invoices`}
          trend={revenue > 0 ? 'up' : 'neutral'}
          icon={DollarSign}
        />
        <KpiCard
          title="Active Projects"
          value={String(activeProjectsCount)}
          change={`${filteredProjects.length} total projects`}
          trend={activeProjectsCount > 0 ? 'up' : 'neutral'}
          icon={Briefcase}
        />
        <KpiCard
          title="Active Leads"
          value={String(activeLeadsCount)}
          change={`${wonLeadsCount} won in period`}
          trend={activeLeadsCount > 0 ? 'up' : 'neutral'}
          icon={TrendingUp}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={`${wonLeadsCount} won / ${filteredLeads.length} total`}
          trend={parseFloat(conversionRate) > 0 ? 'up' : 'neutral'}
          icon={UserCircle}
        />
        <KpiCard
          title="Team Members"
          value={String(teamMembersCount)}
          change="Registered users"
          trend={teamMembersCount > 0 ? 'up' : 'neutral'}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity size={18} className="text-muted-foreground" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityLogs.length > 0 ? (
              <div className="space-y-4">
                {activityLogs.slice(0, 10).map((log) => (
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
                <p className="text-sm text-muted-foreground">
                  Activity feed will appear once actions are logged.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar size={18} className="text-muted-foreground" />
              Upcoming Follow-ups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length > 0 ? (
              <div className="space-y-3">
                {upcomingFollowUps.map((lead) => {
                  const dueDate = lead.next_follow_up ? new Date(lead.next_follow_up) : null;
                  const isOverdue = dueDate && dueDate < new Date();
                  return (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push('/leads')}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {lead.name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{lead.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.company || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            isOverdue
                              ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : lead.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {dueDate?.toLocaleDateString() || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming follow-ups</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase size={18} className="text-muted-foreground" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((project) => {
                  const deadline = project.deadline ? new Date(project.deadline) : null;
                  const isOverdue = deadline && deadline < new Date();
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push('/projects')}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{project.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.manual_client_name || project.client_id || '—'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            isOverdue
                              ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : project.status.replace('_', ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {deadline?.toLocaleDateString() || '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming deadlines</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText size={18} className="text-muted-foreground" />
            Due Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dueInvoices.length > 0 ? (
            <div className="space-y-3">
              {dueInvoices.map((invoice) => {
                const dueDate = new Date(invoice.due_date);
                const isOverdue = invoice.status === 'overdue' || dueDate < new Date();
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push('/invoices')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{invoice.invoice_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {invoice.description || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="text-sm font-medium">{formatCurrency(invoice.amount)}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${
                          isOverdue
                            ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                        }`}
                      >
                        {isOverdue ? 'Overdue' : invoice.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Due {dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No pending invoices</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-1.5"
            onClick={() => router.push(action.href)}
          >
            <action.icon size={20} />
            <span className="text-sm">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
