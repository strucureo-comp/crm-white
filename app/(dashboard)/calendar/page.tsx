'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar, ChevronLeft, ChevronRight, Trash2, Target, Globe, Mail, Users, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getCalendarEvents, createCalendarEvent, deleteCalendarEvent } from '@/lib/db/automation/api';
import { CalendarEvent, CalendarEventType } from '@/lib/db/automation/types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';

const eventTypeColors: Record<string, string> = {
  campaign: 'bg-blue-100 text-blue-800', meeting: 'bg-orange-100 text-orange-800', email: 'bg-green-100 text-green-800',
  social: 'bg-purple-100 text-purple-800', deadline: 'bg-red-100 text-red-800', content: 'bg-cyan-100 text-cyan-800',
  task: 'bg-gray-100 text-gray-800', call: 'bg-yellow-100 text-yellow-800', follow_up: 'bg-pink-100 text-pink-800',
};

const eventTypeIcons: Record<string, React.ReactNode> = {
  campaign: <Target size={14} />, meeting: <Users size={14} />, email: <Mail size={14} />,
  social: <Globe size={14} />, deadline: <AlertTriangle size={14} />, content: <FileText size={14} />,
  task: <CheckCircle size={14} />, call: <Users size={14} />, follow_up: <Mail size={14} />,
};

export default function MarketingCalendarPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', type: 'campaign' as CalendarEventType, start_date: '', start_time: '', end_date: '', end_time: '', all_day: false });

  useEffect(() => {
    if (!workspaceId) return;
    getCalendarEvents(workspaceId).then(setEvents).finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.start_date) return;
    const startDateTime = newEvent.start_time ? `${newEvent.start_date}T${newEvent.start_time}` : newEvent.start_date;
    const endDateTime = newEvent.end_date ? (newEvent.end_time ? `${newEvent.end_date}T${newEvent.end_time}` : newEvent.end_date) : startDateTime;
    const event = await createCalendarEvent(workspaceId, {
      workspace_id: workspaceId,
      title: newEvent.title, description: newEvent.description, type: newEvent.type,
      start_date: startDateTime, end_date: endDateTime, all_day: newEvent.all_day,
      attendees: [],
    });
    setEvents([event, ...events]);
    setShowCreateDialog(false);
    setNewEvent({ title: '', description: '', type: 'campaign', start_date: '', start_time: '', end_date: '', end_time: '', all_day: false });
  };

  const handleDeleteEvent = async (id: string) => {
    await deleteCalendarEvent(workspaceId, id);
    setEvents(events.filter(e => e.event_id !== id));
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) { calendarDays.push(day); day = addDays(day, 1); }

  const getEventsForDate = (date: Date) => events.filter(e => isSameDay(parseISO(e.start_date), date));
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const stats = { total: events.length, thisMonth: events.filter(e => isSameMonth(parseISO(e.start_date), currentDate)).length, upcoming: events.filter(e => parseISO(e.start_date) >= new Date()).length };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Marketing Calendar</h1><p className="text-muted-foreground">Schedule and manage your marketing activities</p></div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />New Event</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Events</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">{stats.thisMonth}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-2xl font-bold">{stats.upcoming}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft size={16} /></Button>
              <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight size={16} /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((d, i) => {
                const dayEvents = getEventsForDate(d);
                const isCurrentMonth = isSameMonth(d, currentDate);
                const isSelected = selectedDate && isSameDay(d, selectedDate);
                return (
                  <div key={i} className={`min-h-[80px] p-1 border rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary' : isCurrentMonth ? 'hover:bg-muted/50' : 'opacity-40'}`} onClick={() => setSelectedDate(d)}>
                    <div className="text-xs font-medium mb-1">{format(d, 'd')}</div>
                    {dayEvents.slice(0, 2).map(e => <div key={e.event_id} className={`text-[10px] px-1 py-0.5 rounded mb-0.5 truncate ${eventTypeColors[e.type] || 'bg-gray-100'}`}>{e.title}</div>)}
                    {dayEvents.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayEvents.length - 2} more</div>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">{selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}</h3>
            {selectedDateEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events</p>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map(e => (
                  <div key={e.event_id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Badge className={eventTypeColors[e.type]}>{e.type}</Badge></div>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteEvent(e.event_id)}><Trash2 size={12} /></Button>
                    </div>
                    <p className="font-medium mt-1">{e.title}</p>
                    {e.description && <p className="text-xs text-muted-foreground mt-1">{e.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create Event</h2>
            <div><label className="text-sm font-medium mb-2 block">Title *</label><Input placeholder="Event title" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Type</label>
              <select value={newEvent.type} onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as CalendarEventType })} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="campaign">Campaign</option><option value="meeting">Meeting</option><option value="email">Email</option><option value="social">Social</option><option value="deadline">Deadline</option><option value="content">Content</option><option value="task">Task</option><option value="call">Call</option><option value="follow_up">Follow Up</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium mb-2 block">Date *</label><Input type="date" value={newEvent.start_date} onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })} /></div>
              <div><label className="text-sm font-medium mb-2 block">Time</label><Input type="time" value={newEvent.start_time} onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium mb-2 block">Description</label><Textarea placeholder="Description..." value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreateEvent}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
