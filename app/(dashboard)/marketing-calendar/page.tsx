'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Megaphone, FileText, MessageSquare, Loader2, Pencil, Trash2 } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { CalendarEventDialog } from '@/components/dialogs/calendar-event-dialog';
import { getCalendarEvents, deleteCalendarEvent } from '@/lib/firebase/database';
import type { CalendarEvent } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function MarketingCalendarPage() {
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getCalendarEvents();
    setEvents(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteCalendarEvent(id);
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

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const startDay = getDay(startOfMonth(currentMonth));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Marketing Calendar</h2>
          <p className="text-sm text-muted-foreground">Plan and schedule your marketing content</p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Add Event
        </Button>
      </div>

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
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="bg-background p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-background p-2 min-h-[100px]" />
            ))}
            {days.map((day) => {
              const dayEvents = events.filter((e) => isSameDay(parseISO(e.date), day));
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'bg-background p-2 min-h-[100px] border-b border-r border-muted/50 transition-colors',
                    !isSameMonth(day, currentMonth) && 'opacity-50',
                    isToday(day) && 'bg-primary/5'
                  )}
                >
                  <span className={cn(
                    'text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full',
                    isToday(day) && 'bg-primary text-primary-foreground'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-1 mt-1">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="group relative">
                        <div
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary truncate cursor-pointer hover:bg-primary/20"
                          onClick={() => { setEditing(event); setDialogOpen(true); }}
                        >
                          {event.title}
                        </div>
                        <button
                          className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); handleDelete(event.id); }}
                        >
                          <Trash2 size={6} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Megaphone size={16} className="text-primary" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => { setEditing(event); setDialogOpen(true); }}>
                  <span>{event.title}</span>
                  <Badge variant="secondary" className="text-[10px]">{format(parseISO(event.date), 'MMM d')}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText size={16} className="text-primary" />
              Content Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{events.length} items scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare size={16} className="text-primary" />
              Campaigns Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{events.length} scheduled items</p>
          </CardContent>
        </Card>
      </div>

      <CalendarEventDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} event={editing} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
