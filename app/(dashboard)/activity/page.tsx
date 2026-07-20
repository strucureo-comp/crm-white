'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, isBefore, startOfDay, parseISO, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getActivityLogs, getTasks } from '@/lib/firebase/database';
import type { ActivityLog, TaskItem, ActivityAction } from '@/lib/db/types';
import { toast } from 'sonner';
import {
  CalendarDays,
  Video,
  CheckSquare,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Clock,
  Calendar as CalendarIcon,
  Building2,
  Flag,
  MoreHorizontal,
  TrendingUp,
  Zap,
  Sparkles,
  ListChecks,
} from 'lucide-react';

type ActivityType = 'meeting' | 'task' | 'deadline' | 'followup';

interface EnrichedActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  company: string;
  date: string;
  time: string;
  duration: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'completed' | 'cancelled';
  owner: string;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400' },
  medium: { label: 'Medium', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' },
  low: { label: 'Low', className: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' },
};

const typeConfig: Record<ActivityType, { icon: React.ElementType; label: string; color: string }> = {
  meeting: { icon: Video, label: 'Meeting', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950' },
  task: { icon: CheckSquare, label: 'Task', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950' },
  deadline: { icon: AlertTriangle, label: 'Deadline', color: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950' },
  followup: { icon: RefreshCw, label: 'Follow-up', color: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950' },
};

const tabFilters = ['All', 'Meetings', 'Tasks', 'Deadlines', 'Followups'] as const;
type TabFilter = (typeof tabFilters)[number];

function generateMockActivities(date: Date): EnrichedActivity[] {
  const baseDate = date.toISOString().split('T')[0];
  const nextDay = addDays(date, 1).toISOString().split('T')[0];
  const dayAfter = addDays(date, 2).toISOString().split('T')[0];

  return [
    {
      id: 'mock-m1', type: 'meeting', title: 'Q3 Sprint Review',
      description: 'Review sprint progress and plan next iteration',
      company: 'Acme Corp', date: baseDate, time: '09:00 AM', duration: 45,
      priority: 'high', status: 'pending', owner: 'Sarah Chen',
    },
    {
      id: 'mock-m2', type: 'meeting', title: 'Client Onboarding Call',
      description: 'New client orientation and requirements gathering',
      company: 'Globex Inc', date: baseDate, time: '11:30 AM', duration: 30,
      priority: 'medium', status: 'pending', owner: 'Mike Ross',
    },
    {
      id: 'mock-t1', type: 'task', title: 'Update landing page copy',
      description: 'Refresh hero section and feature descriptions',
      company: 'Internal', date: baseDate, time: '10:00 AM', duration: 60,
      priority: 'medium', status: 'pending', owner: 'Alex Kim',
    },
    {
      id: 'mock-t2', type: 'task', title: 'Fix payment gateway bug',
      description: 'Stripe integration returning 402 errors',
      company: 'Internal', date: baseDate, time: '02:00 PM', duration: 120,
      priority: 'critical', status: 'pending', owner: 'Jordan Lee',
    },
    {
      id: 'mock-d1', type: 'deadline', title: 'Q3 Tax Filing Due',
      description: 'Submit quarterly tax returns to IRS',
      company: 'Acme Corp', date: baseDate, time: '05:00 PM', duration: 0,
      priority: 'high', status: 'pending', owner: 'Priya Patel',
    },
    {
      id: 'mock-f1', type: 'followup', title: 'Follow up on proposal',
      description: 'Check status of submitted proposal #1024',
      company: 'Stark Industries', date: baseDate, time: '03:30 PM', duration: 15,
      priority: 'low', status: 'pending', owner: 'Taylor Wong',
    },
    {
      id: 'mock-m3', type: 'meeting', title: 'Team Standup',
      description: 'Daily sync with development team',
      company: 'Internal', date: baseDate, time: '08:30 AM', duration: 15,
      priority: 'low', status: 'pending', owner: 'Sarah Chen',
    },
    {
      id: 'mock-m4', type: 'meeting', title: 'Design Review',
      description: 'Review new mockups for dashboard v2',
      company: 'Internal', date: baseDate, time: '04:00 PM', duration: 60,
      priority: 'medium', status: 'pending', owner: 'Mike Ross',
    },
    {
      id: 'mock-t3', type: 'task', title: 'Write API documentation',
      description: 'Document all REST endpoints for the public API',
      company: 'Internal', date: baseDate, time: '01:00 PM', duration: 90,
      priority: 'medium', status: 'completed', owner: 'Alex Kim',
    },
    {
      id: 'mock-t4', type: 'task', title: 'Database migration script',
      description: 'Migrate user data to new schema',
      company: 'Internal', date: baseDate, time: '11:00 AM', duration: 180,
      priority: 'high', status: 'completed', owner: 'Jordan Lee',
    },
    {
      id: 'mock-m5', type: 'meeting', title: 'Product Roadmap Planning',
      description: 'Quarterly planning session for product team',
      company: 'Internal', date: nextDay, time: '10:00 AM', duration: 90,
      priority: 'high', status: 'pending', owner: 'Sarah Chen',
    },
    {
      id: 'mock-t5', type: 'task', title: 'Security audit prep',
      description: 'Prepare documentation for external audit',
      company: 'Internal', date: nextDay, time: '09:00 AM', duration: 120,
      priority: 'high', status: 'pending', owner: 'Priya Patel',
    },
    {
      id: 'mock-d2', type: 'deadline', title: 'Contract renewal',
      description: 'Renew annual maintenance contract',
      company: 'Globex Inc', date: nextDay, time: '12:00 PM', duration: 0,
      priority: 'medium', status: 'pending', owner: 'Taylor Wong',
    },
    {
      id: 'mock-m6', type: 'meeting', title: 'Vendor negotiation',
      description: 'Negotiate terms with new cloud provider',
      company: 'Acme Corp', date: dayAfter, time: '02:00 PM', duration: 60,
      priority: 'critical', status: 'pending', owner: 'Mike Ross',
    },
    {
      id: 'mock-t6', type: 'task', title: 'Update employee handbook',
      description: 'Revise remote work policy section',
      company: 'Internal', date: dayAfter, time: '10:00 AM', duration: 60,
      priority: 'low', status: 'pending', owner: 'Alex Kim',
    },
  ];
}

function getDayLabel(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'EEEE, MMM d');
}

function formatTime(dateStr: string): string {
  return format(parseISO(dateStr), 'h:mm a');
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return 'All day';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function getMotivationLabel(pct: number): { label: string; icon: React.ElementType; color: string } {
  if (pct >= 100) return { label: 'Perfect Day!', icon: Sparkles, color: 'text-yellow-500' };
  if (pct >= 75) return { label: 'Almost There', icon: TrendingUp, color: 'text-emerald-500' };
  if (pct >= 50) return { label: 'On Track', icon: Zap, color: 'text-blue-500' };
  if (pct >= 25) return { label: 'Getting Started', icon: ListChecks, color: 'text-amber-500' };
  return { label: 'Let\'s Go!', icon: Flag, color: 'text-rose-500' };
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [rawTasks, setRawTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(true);

  async function load() {
    try {
      const [activityLogs, tasks] = await Promise.all([
        getActivityLogs(100),
        getTasks(),
      ]);
      setLogs(activityLogs);
      setRawTasks(tasks);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const mockActivities = useMemo(() => generateMockActivities(date), [date]);

  const allActivities = useMemo(() => {
    const fromMock = mockActivities.map((a) => ({
      ...a,
    }));
    const fromTasks = rawTasks
      .filter((t) => t.status !== 'done' && t.due_date)
      .map((t) => ({
        id: `task-${t.id}`,
        type: 'task' as ActivityType,
        title: t.title,
        description: t.description || '',
        company: t.project || 'Internal',
        date: t.due_date!,
        time: formatTime(t.due_date!),
        duration: 0,
        priority: (t.priority === 'critical' ? 'critical' : t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical',
        status: (t.status === 'done' ? 'completed' : 'pending') as 'completed' | 'pending',
        owner: t.assignee || 'Unassigned',
      }));
    const fromLogs = logs.map((l) => ({
      id: `log-${l.id}`,
      type: (l.entity_type === 'meeting' ? 'meeting' :
            l.entity_type === 'task' ? 'task' :
            l.entity_type === 'project' ? 'deadline' : 'followup') as ActivityType,
      title: l.description,
      description: l.action.replace(/_/g, ' '),
      company: l.entity_type,
      date: l.created_at,
      time: formatTime(l.created_at),
      duration: 0,
      priority: 'medium' as const,
      status: 'pending' as 'pending',
      owner: l.user_name,
    }));
    return [...fromMock, ...fromTasks, ...fromLogs];
  }, [mockActivities, rawTasks, logs]);

  const selectedDateStr = format(date, 'yyyy-MM-dd');

  const dayActivities = useMemo(() => {
    return allActivities.filter((a) => a.date.startsWith(selectedDateStr));
  }, [allActivities, selectedDateStr]);

  const pendingActivities = useMemo(() => {
    return dayActivities.filter((a) => a.status === 'pending');
  }, [dayActivities]);

  const completedActivities = useMemo(() => {
    return dayActivities.filter((a) => a.status === 'completed');
  }, [dayActivities]);

  const filtered = useMemo(() => {
    if (activeTab === 'All') return pendingActivities;
    const typeMap: Record<TabFilter, ActivityType> = {
      All: 'meeting',
      Meetings: 'meeting',
      Tasks: 'task',
      Deadlines: 'deadline',
      Followups: 'followup',
    };
    return pendingActivities.filter((a) => a.type === typeMap[activeTab]);
  }, [pendingActivities, activeTab]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
  }, [filtered]);

  const badges = useMemo(() => ({
    meetings: pendingActivities.filter((a) => a.type === 'meeting').length,
    tasks: pendingActivities.filter((a) => a.type === 'task').length,
    deadlines: pendingActivities.filter((a) => a.type === 'deadline').length,
  }), [pendingActivities]);

  const completionRate = useMemo(() => {
    const total = dayActivities.length;
    if (total === 0) return 0;
    return Math.round((completedActivities.length / total) * 100);
  }, [dayActivities, completedActivities]);

  const motivation = getMotivationLabel(completionRate);

  const upcomingActivities = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return allActivities
      .filter((a) => a.status === 'pending' && a.date.slice(0, 10) > todayStr)
      .sort((a, b) => a.date.slice(0, 10).localeCompare(b.date.slice(0, 10)) || a.time.localeCompare(b.time));
  }, [allActivities]);

  const upcomingGrouped = useMemo(() => {
    const groups: Record<string, EnrichedActivity[]> = {};
    for (const a of upcomingActivities) {
      if (!groups[a.date]) groups[a.date] = [];
      groups[a.date].push(a);
    }
    return groups;
  }, [upcomingActivities]);

  function handleDelete(id: string) {
    setLogs((prev) => prev.filter((l) => `log-${l.id}` !== id));
    toast.success('Activity deleted');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  const MotivationIcon = motivation.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon size={16} />
                <span className="font-semibold">TODAY&apos;S SCHEDULE</span>
                <span className="text-muted-foreground">({format(date, 'MMM d, yyyy')})</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus size={16} className="mr-1.5" />
            Add Activity
          </Button>
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  <Video size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Meetings</p>
                  <p className="text-xl font-bold">{badges.meetings}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center shrink-0">
                  <CheckSquare size={20} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tasks</p>
                  <p className="text-xl font-bold">{badges.tasks}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deadlines</p>
                  <p className="text-xl font-bold">{badges.deadlines}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabFilter)}>
                <TabsList>
                  {tabFilters.map((tab) => (
                    <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              {sorted.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No {activeTab !== 'All' ? activeTab.toLowerCase() : 'pending'} activities
                </div>
              ) : (
                <div className="divide-y">
                  {sorted.map((activity) => {
                    const cfg = typeConfig[activity.type];
                    const pc = priorityConfig[activity.priority];
                    const Icon = cfg.icon;
                    return (
                      <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors group">
                        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', cfg.color)}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{activity.title}</span>
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', pc.className)}>
                              {pc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {activity.time}
                            </span>
                            {activity.company && (
                              <span className="flex items-center gap-1">
                                <Building2 size={12} />
                                {activity.company}
                              </span>
                            )}
                            {activity.duration > 0 && (
                              <span>{formatDuration(activity.duration)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
                            <Eye size={14} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" title="Delete" onClick={() => handleDelete(activity.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {completedActivities.length > 0 && (
            <Card>
              <Accordion type="single" collapsible value={completedOpen ? 'completed' : ''} onValueChange={(v) => setCompletedOpen(v === 'completed')}>
                <AccordionItem value="completed" className="border-0">
                  <CardHeader className="pb-0">
                    <AccordionTrigger className="py-3">
                      <span className="text-sm font-medium">
                        Completed Today ({completedActivities.length})
                      </span>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {completedActivities.map((activity) => {
                          const cfg = typeConfig[activity.type];
                          const Icon = cfg.icon;
                          return (
                            <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 opacity-60', cfg.color)}>
                                <Icon size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-muted-foreground line-through">{activity.title}</span>
                                <div className="text-xs text-muted-foreground/60 mt-0.5">
                                  {activity.time}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                Coming Up
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {Object.keys(upcomingGrouped).length === 0 ? (
                <div className="px-4 pb-4 text-sm text-muted-foreground">No upcoming events</div>
              ) : (
                <div className="divide-y">
                  {Object.entries(upcomingGrouped).slice(0, 4).map(([dateKey, items]) => {
                    const dayLabel = getDayLabel(dateKey);
                    return (
                      <div key={dateKey} className="px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">{dayLabel}</p>
                        <div className="space-y-2">
                          {items.slice(0, 3).map((item) => {
                            const cfg = typeConfig[item.type];
                            const Icon = cfg.icon;
                            return (
                              <div key={item.id} className="flex items-start gap-2.5">
                                <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', cfg.color.split(' ')[0].replace('text-', 'bg-'))} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium truncate">{item.title}</p>
                                  <p className="text-[11px] text-muted-foreground">{item.time} &middot; {item.owner}</p>
                                </div>
                              </div>
                            );
                          })}
                          {items.length > 3 && (
                            <p className="text-[11px] text-primary font-medium pl-4">+{items.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                Productivity Tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold">{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2.5" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedActivities.length} of {dayActivities.length} completed</span>
                  <span className={cn('flex items-center gap-1 font-medium', motivation.color)}>
                    <MotivationIcon size={14} />
                    {motivation.label}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input placeholder="Activity title" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select defaultValue="meeting">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                    <SelectItem value="followup">Follow-up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Priority</label>
                <Select defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDialogOpen(false); toast.success('Activity added'); }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
