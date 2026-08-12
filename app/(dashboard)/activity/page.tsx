'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isTomorrow, isPast, isBefore, startOfDay, parseISO } from 'date-fns';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getActivityLogs, getTasks, createActivityLog, deleteActivityLog } from '@/lib/firebase/database';
import { useAuth } from '@/lib/firebase/auth-context';
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
  const { workspace, user } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [rawTasks, setRawTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<TabFilter>('All');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(true);
  const [viewActivity, setViewActivity] = useState<EnrichedActivity | null>(null);
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    type: 'meeting',
    priority: 'medium',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSaveActivity() {
    if (!formState.title.trim()) return toast.error('Title is required');
    setIsSubmitting(true);
    try {
      await createActivityLog({
        action: 'task_created',
        description: formState.description || formState.title,
        entity_type: formState.type,
        user_id: user?.id || 'demo-user',
        user_name: user?.full_name || 'Demo User',
        workspace_id: workspace?.id || '',
        title: formState.title,
        date: formState.date,
        time: formState.time,
        metadata: { priority: formState.priority }
      });
      toast.success('Activity added');
      setDialogOpen(false);
      load();
      setFormState({ ...formState, title: '', description: '' });
    } catch (error) {
      toast.error('Failed to save activity');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function load() {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    try {
      const [activityLogs, tasks] = await Promise.all([
        getActivityLogs(workspace?.id, 100),
        getTasks(workspace?.id),
      ]);
      setLogs(activityLogs);
      setRawTasks(tasks);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [workspace?.id]);

  const allActivities = useMemo(() => {
    const fromTasks = rawTasks
      .filter((t) => t.status !== 'done' && t.due_date)
      .map((t) => {
        const normalizedDate = format(parseISO(t.due_date!), 'yyyy-MM-dd');
        return {
          id: `task-${t.id}`,
          type: 'task' as ActivityType,
          title: t.title,
          description: t.description || '',
          company: t.project || 'Internal',
          date: normalizedDate,
          time: formatTime(t.due_date!),
          sortTime: format(parseISO(t.due_date!), 'HH:mm'),
          duration: 0,
          priority: (t.priority === 'critical' ? 'critical' : t.priority === 'high' ? 'high' : t.priority === 'medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high' | 'critical',
          status: (t.status === 'done' ? 'completed' : 'pending') as 'completed' | 'pending',
          owner: t.assignee || 'Unassigned',
        };
      });
    const fromLogs = logs.map((l) => {
      let normalizedDate = '';
      if (l.date && l.date.length === 10) {
        normalizedDate = l.date;
      } else {
        normalizedDate = format(parseISO(l.created_at), 'yyyy-MM-dd');
      }

      let sortTime = '';
      let displayTime = '';
      if (l.time && l.time.match(/^\d{1,2}:\d{2}$/)) {
        sortTime = l.time.padStart(5, '0'); // pad 9:00 to 09:00
        const [hh, mm] = l.time.split(':');
        const h = parseInt(hh, 10);
        displayTime = `${h % 12 || 12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
      } else {
        sortTime = format(parseISO(l.created_at), 'HH:mm');
        displayTime = format(parseISO(l.created_at), 'h:mm a');
      }

      return {
        id: `log-${l.id}`,
        type: (l.entity_type === 'meeting' ? 'meeting' :
              l.entity_type === 'task' ? 'task' :
              l.entity_type === 'project' ? 'deadline' : 'followup') as ActivityType,
        title: l.title || l.description,
        description: l.action.replace(/_/g, ' '),
        company: l.entity_type,
        date: normalizedDate,
        time: displayTime,
        sortTime: sortTime,
        duration: 0,
        priority: (l.metadata?.priority || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        status: 'pending' as 'pending',
        owner: l.user_name,
      };
    });
    return [...fromTasks, ...fromLogs];
  }, [rawTasks, logs]);

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
    return [...filtered].sort((a, b) => a.sortTime.localeCompare(b.sortTime));
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

  async function handleDelete(id: string) {
    if (id.startsWith('log-')) {
      const dbId = id.replace('log-', '');
      if (workspace?.id) {
        await deleteActivityLog(workspace.id, dbId);
      }
    }
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => setViewActivity(activity)}>
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
              <Input 
                placeholder="Activity title" 
                value={formState.title}
                onChange={(e) => setFormState(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select 
                  value={formState.type} 
                  onValueChange={(v) => setFormState(prev => ({ ...prev, type: v }))}
                >
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
                <Select 
                  value={formState.priority} 
                  onValueChange={(v) => setFormState(prev => ({ ...prev, priority: v }))}
                >
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
            <div>
              <label className="text-sm font-medium mb-1 block">Description (Optional)</label>
              <Textarea 
                placeholder="Details about this activity..." 
                value={formState.description}
                onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Date</label>
                <Input 
                  type="date"
                  value={formState.date}
                  onChange={(e) => setFormState(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Time</label>
                <Input 
                  type="time"
                  value={formState.time}
                  onChange={(e) => setFormState(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveActivity} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewActivity} onOpenChange={(open) => !open && setViewActivity(null)}>
        <DialogContent>
          {viewActivity && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', typeConfig[viewActivity.type].color)}>
                    {(() => {
                      const Icon = typeConfig[viewActivity.type].icon;
                      return <Icon size={14} />;
                    })()}
                  </div>
                  {viewActivity.title}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="outline" className={priorityConfig[viewActivity.priority].className}>
                    {priorityConfig[viewActivity.priority].label} Priority
                  </Badge>
                  <Badge variant="secondary">
                    {typeConfig[viewActivity.type].label}
                  </Badge>
                  {viewActivity.status && (
                    <Badge variant={viewActivity.status === 'completed' ? 'default' : 'outline'}>
                      {viewActivity.status.charAt(0).toUpperCase() + viewActivity.status.slice(1)}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-muted rounded-md p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Date</p>
                      <p className="font-medium flex items-center gap-1.5"><CalendarIcon size={14}/> {viewActivity.date}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Time</p>
                      <p className="font-medium flex items-center gap-1.5"><Clock size={14}/> {viewActivity.time}</p>
                    </div>
                    {viewActivity.company && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground mb-1">Related To</p>
                        <p className="font-medium flex items-center gap-1.5"><Building2 size={14}/> {viewActivity.company}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground mb-1">Owner</p>
                      <p className="font-medium">{viewActivity.owner}</p>
                    </div>
                  </div>
                </div>

                {viewActivity.description && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewActivity.description}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewActivity(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
