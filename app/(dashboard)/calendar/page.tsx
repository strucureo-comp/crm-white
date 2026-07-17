'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Loader2,
  Clock, Pencil, Trash2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { getCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/firebase/database';
import type { CalendarEvent } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const typeColors: Record<string, { dot: string; bg: string; border: string }> = {
  Meeting: { dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-300 dark:border-blue-700' },
  Task: { dot: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-300 dark:border-amber-700' },
  Deadline: { dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-300 dark:border-red-700' },
  Event: { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-300 dark:border-emerald-700' },
  Reminder: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-300 dark:border-purple-700' },
};

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  emerald: 'bg-emerald-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
  orange: 'bg-orange-500',
};

const colorOptions = Object.keys(colorMap);

const defaultForm = {
  title: '',
  type: 'Meeting',
  date: new Date().toISOString().split('T')[0],
  time: '',
  description: '',
  attendees: '',
  color: 'blue',
};

type EventForm = typeof defaultForm;

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCalendarEvents();
      setEvents(data);
    } catch {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNewEvent(date?: Date) {
    setEditing(null);
    setForm({
      ...defaultForm,
      date: date ? format(date, 'yyyy-MM-dd') : new Date().toISOString().split('T')[0],
    });
    setDialogOpen(true);
  }

  function openEdit(event: CalendarEvent) {
    setEditing(event);
    const e = event as CalendarEvent & { time?: string; description?: string; attendees?: string; color?: string };
    setForm({
      title: event.title,
      type: event.type,
      date: event.date.split('T')[0],
      time: e.time || '',
      description: e.description || '',
      attendees: e.attendees || '',
      color: e.color || 'blue',
    });
    setDialogOpen(true);
  }

  function setFormField<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.date) {
      toast.error('Title and date are required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        title: form.title,
        type: form.type,
        date: form.date,
        time: form.time,
        description: form.description,
        attendees: form.attendees,
        color: form.color,
      };
      if (editing) {
        await updateCalendarEvent(editing.id, payload as unknown as Partial<CalendarEvent>);
        toast.success('Event updated');
      } else {
        await createCalendarEvent(payload as unknown as Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Event created');
      }
      load();
      setDialogOpen(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteCalendarEvent(id);
      toast.success('Event deleted');
      load();
    } catch {
      toast.error('Failed to delete event');
    } finally {
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = (getDay(monthStart) + 6) % 7; // Monday = 0

  const monthEvents = events.filter((e) => {
    const d = parseISO(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Calendar</h2>
          <p className="text-sm text-muted-foreground">Manage your team events and schedule</p>
        </div>
        <Button onClick={() => openNewEvent()} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft size={16} />
                  </Button>
                  <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight size={16} />
                  </Button>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  <CalendarIcon size={14} className="mr-2" />
                  Today
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
                {Array.from({ length: startDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-background p-2 min-h-[110px]" />
                ))}
                {days.map((day) => {
                  const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day));
                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'bg-background p-1.5 min-h-[110px] border-b border-r border-muted/50 transition-colors cursor-pointer hover:bg-muted/20',
                        !isSameMonth(day, currentMonth) && 'opacity-50',
                        isToday(day) && 'bg-primary/5'
                      )}
                      onClick={() => openNewEvent(day)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                          isToday(day) && 'bg-primary text-primary-foreground'
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => {
                          const e = event as CalendarEvent & { color?: string; time?: string };
                          const tc = typeColors[event.type] || typeColors.Event;
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                'flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncator cursor-pointer border',
                                tc.bg, tc.border
                              )}
                              onClick={(ev) => { ev.stopPropagation(); openEdit(event); }}
                            >
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tc.dot)} />
                              {e.time && <Clock size={8} className="shrink-0" />}
                              <span className="truncate">{event.title}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Event Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(typeColors).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2 text-sm">
                  <span className={cn('w-2.5 h-2.5 rounded-full', colors.dot)} />
                  <span>{type}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {monthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events this month</p>
              ) : (
                monthEvents.slice(0, 6).map((event) => {
                  const e = event as CalendarEvent & { color?: string; time?: string };
                  const tc = typeColors[event.type] || typeColors.Event;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => openEdit(event)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', tc.dot)} />
                        <span className="truncate">{event.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {e.time && <span className="text-[10px] text-muted-foreground">{e.time}</span>}
                        <Badge variant="secondary" className="text-[10px]">{format(parseISO(event.date), 'MMM d')}</Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(typeColors).map(([type, colors]) => {
                const count = monthEvents.filter((e) => e.type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-2 h-2 rounded-full', colors.dot)} />
                      <span>{type}</span>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Event' : 'New Event'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the event details below.' : 'Enter the event details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setFormField('title', e.target.value)} placeholder="Team standup" />
              </div>
              <div>
                <Label htmlFor="type">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setFormField('type', v)}>
                  <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meeting">Meeting</SelectItem>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Deadline">Deadline</SelectItem>
                    <SelectItem value="Event">Event</SelectItem>
                    <SelectItem value="Reminder">Reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Select value={form.color} onValueChange={(v) => setFormField('color', v)}>
                  <SelectTrigger id="color"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {colorOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        <div className="flex items-center gap-2">
                          <span className={cn('w-3 h-3 rounded-full', colorMap[c] || 'bg-blue-500')} />
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" value={form.date} onChange={(e) => setFormField('date', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="time">Time</Label>
                <Input id="time" type="time" value={form.time} onChange={(e) => setFormField('time', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label htmlFor="attendees">Attendees</Label>
                <Input id="attendees" value={form.attendees} onChange={(e) => setFormField('attendees', e.target.value)} placeholder="john@example.com, jane@example.com" />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(e) => setFormField('description', e.target.value)} placeholder="Event description..." />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
