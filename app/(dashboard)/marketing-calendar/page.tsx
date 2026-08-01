'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, getDay, isSameMonth, isSameDay, isToday, parseISO
} from 'date-fns';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
  Clock, MoreHorizontal, Pencil, Trash2, CalendarOff, List,
  Eye, Check, CheckCircle2, CircleDashed, Users, PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import { useAuth } from '@/lib/firebase/auth-context';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, subscribeToCalendar, ScheduledEvent } from '@/lib/db/marketing-calendar/api';

// --- Constants ---
const CHANNELS = ['LinkedIn', 'Twitter', 'Instagram', 'Email', 'Blog', 'YouTube'];
const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-slate-500'
];

const MOCK_EVENTS: ScheduledEvent[] = [];

export default function MarketingCalendarPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // State
  const [events, setEvents] = useState<ScheduledEvent[]>(MOCK_EVENTS);
  
  useEffect(() => {
    if (!user?.company_id) return;
    const unsubscribe = subscribeToCalendar(user.company_id, (data) => {
      setEvents(data);
      if (editingEvent) {
        setEditingEvent(prev => data.find(i => i.id === prev?.id) || null);
      }
      if (viewingEvent) {
        setViewingEvent(prev => data.find(i => i.id === prev?.id) || null);
      }
    });
    return () => unsubscribe();
  }, [user?.company_id]);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // null means "Month View"
  
  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [viewingEvent, setViewingEvent] = useState<ScheduledEvent | null>(null);
  
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formClient, setFormClient] = useState('');
  const [formChannel, setFormChannel] = useState(CHANNELS[0]);
  const [formColor, setFormColor] = useState(COLORS[0]);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  
  const [authors, setAuthors] = useState(['Alex R.', 'Sarah J.', 'Mike T.', 'Emma W.']);
  const [formAuthor, setFormAuthor] = useState(authors[0]);
  const [newAuthor, setNewAuthor] = useState('');

  // Derived
  const viewMode = selectedDate ? 'day' : 'month';
  const displayDate = selectedDate || currentMonth;
  
  const rightColumnEvents = useMemo(() => {
    return events.filter(e => {
      const eDate = parseISO(e.date as string);
      return viewMode === 'day' 
        ? isSameDay(eDate, displayDate)
        : isSameMonth(eDate, displayDate);
    }).sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
  }, [events, viewMode, displayDate]);

  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime());
  }, [events]);

  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOffset = getDay(startOfMonth(currentMonth));

  // Handlers
  const openScheduleModal = (eventToEdit?: ScheduledEvent, prefilledDate?: Date) => {
    if (eventToEdit) {
      setEditingEvent(eventToEdit);
      setFormTitle(eventToEdit.title);
      setFormCompany(eventToEdit.company || '');
      setFormClient(eventToEdit.client || '');
      setFormChannel(eventToEdit.channel);
      setFormColor(eventToEdit.color || COLORS[0]);
      setFormDate(format(parseISO(eventToEdit.date as string), 'yyyy-MM-dd'));
      setFormTime(eventToEdit.time); // Simple assumption format
      setFormAuthor(eventToEdit.author);
    } else {
      setEditingEvent(null);
      setFormTitle('');
      setFormCompany('');
      setFormClient('');
      setFormChannel(CHANNELS[0]);
      setFormColor(COLORS[0]);
      setFormDate(prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
      setFormTime('09:00 AM');
      setFormAuthor(authors[0]);
    }
    setIsScheduleModalOpen(true);
  };

  const saveEvent = async () => {
    if (!user?.company_id) return;
    if (!formTitle) return toast.error('Title is required');
    
    let finalDateStr = formDate;
    if (editingEvent) finalDateStr = editingEvent.date as string;
    else finalDateStr = new Date(formDate).toISOString();

    const finalEventData = {
      date: finalDateStr,
      title: formTitle,
      company: formCompany,
      client: formClient,
      channel: formChannel,
      color: formColor,
      time: formTime,
      author: formAuthor,
      status: editingEvent ? editingEvent.status : 'Scheduled'
    };

    try {
      if (editingEvent) {
        await updateCalendarEvent(user.company_id, editingEvent.id, finalEventData);
        toast.success('Post updated successfully!', { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      } else {
        await createCalendarEvent(user.company_id, finalEventData);
        toast.success('Post scheduled successfully!', { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      }
      setIsScheduleModalOpen(false);
    } catch (e) {
      toast.error('Failed to save post');
    }
  };

  const deleteEvent = async (id: string | number) => {
    if (!user?.company_id) return;
    try {
      await deleteCalendarEvent(user.company_id, id);
      toast.success('Post removed.', { className: 'bg-rose-50 text-rose-700 border-rose-200' });
    } catch (e) {
      toast.error('Failed to remove post');
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'LinkedIn': return 'bg-blue-100 text-blue-700';
      case 'Twitter': return 'bg-sky-100 text-sky-700';
      case 'Instagram': return 'bg-pink-100 text-pink-700';
      case 'YouTube': return 'bg-red-100 text-red-700';
      case 'Email': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* 2. Global Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 text-white">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Scheduling Calendar</h2>
            <p className="text-sm text-muted-foreground mt-1">Plan and coordinate granular posts across all marketing channels.</p>
          </div>
        </div>
        <Button onClick={() => openScheduleModal()} className="shadow-sm bg-primary text-primary-foreground">
          <Plus size={16} className="mr-2" />
          Schedule Post
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-h-0 space-y-6">
        {/* 3. Split View Section (Calendar & Events List) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 shrink-0 h-[450px]">
          
          {/* A. Left Column: Calendar View */}
          <Card className="flex flex-col border shadow-sm h-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/20 shrink-0">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <button 
                className="text-lg font-bold hover:text-primary transition-colors cursor-pointer"
                onClick={() => setSelectedDate(null)}
              >
                {format(currentMonth, 'MMMM yyyy')}
              </button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
              <div className="grid grid-cols-7 border-b shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{day}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 auto-rows-fr bg-border gap-px border-b">
                {Array.from({ length: startDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-background" />
                ))}
                {daysInMonth.map(day => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const dayEvents = events.filter(e => isSameDay(parseISO(e.date as string), day));
                  
                  return (
                    <div 
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        bg-background p-1.5 flex flex-col relative cursor-pointer hover:bg-muted/30 transition-colors
                        ${isSelected ? 'ring-2 ring-inset ring-purple-500 bg-purple-500/5 z-10' : ''}
                      `}
                    >
                      <span className={`text-xs font-medium self-end w-6 h-6 flex items-center justify-center rounded-full mb-1
                        ${isTodayDate ? 'bg-primary text-primary-foreground' : 'text-foreground/80'}
                      `}>
                        {format(day, 'd')}
                      </span>
                      
                      <div className="flex-1 flex flex-col justify-end gap-1 overflow-hidden pb-1">
                        {dayEvents.slice(0, 3).map((e, i) => (
                          <div key={i} className={`h-1.5 w-full rounded-sm ${e.color || 'bg-slate-400'}`} title={e.title} />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] font-bold text-muted-foreground text-center">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* B. Right Column: Events List */}
          <Card className="flex flex-col border shadow-sm h-full overflow-hidden bg-card">
            <div className="p-4 border-b flex items-center justify-between bg-muted/20 shrink-0">
              <div>
                <h3 className="font-bold text-lg">
                  {viewMode === 'day' ? format(displayDate, 'EEEE, MMM d') : format(displayDate, 'MMMM')}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {viewMode === 'day' ? 'Daily Schedule' : 'Monthly Schedule'}
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-background border">{rightColumnEvents.length}</Badge>
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => openScheduleModal(undefined, selectedDate || undefined)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
              {rightColumnEvents.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                  <CalendarOff className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-medium">Nothing scheduled</p>
                  <p className="text-xs mt-1 mb-4 opacity-70">There are no posts planned for this {viewMode}.</p>
                  <Button variant="outline" size="sm" onClick={() => openScheduleModal(undefined, selectedDate || undefined)}>
                    <Plus className="w-3 h-3 mr-2" /> Schedule Item
                  </Button>
                </div>
              ) : (
                rightColumnEvents.map(event => (
                  <div 
                    key={event.id}
                    className="relative group border rounded-lg bg-background p-3 pl-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                    onClick={() => { setViewingEvent(event); setIsDetailsModalOpen(true); }}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${event.color || 'bg-slate-400'}`} />
                    
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${getChannelBadge(event.channel)} border-transparent`}>{event.channel}</Badge>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${event.status === 'Published' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {event.status || 'Scheduled'}
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-bold text-foreground mb-3 leading-tight line-clamp-2 pr-12">{event.title}</h4>
                    
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">{event.time}</span>
                        {viewMode === 'month' && <span className="opacity-70 ml-1 border-l pl-2 border-border">{format(parseISO(event.date as string), 'MMM d')}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary">{event.author.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="font-medium">{event.author}</span>
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded p-1 shadow-sm border">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); openScheduleModal(event); }}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* 4. Upcoming Scheduled Table Section */}
        <Card className="border shadow-sm flex flex-col flex-1 min-h-[300px] overflow-hidden">
          <div className="p-4 border-b bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                <List className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg">All Upcoming Scheduled</h3>
              <Badge variant="outline" className="bg-background">{upcomingEvents.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-medium hover:bg-primary/10">
              View All &rarr;
            </Button>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Company / Client</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Content Title</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Channel</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Scheduled For</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Author</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 font-medium text-center whitespace-nowrap w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-background">
                {upcomingEvents.map(event => (
                  <tr key={event.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-3 text-muted-foreground font-medium">{event.company || '-'}</td>
                    <td className="px-6 py-3"><p className="font-bold text-foreground truncate max-w-[250px]">{event.title}</p></td>
                    <td className="px-6 py-3">
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${getChannelBadge(event.channel)} border-transparent`}>{event.channel}</Badge>
                    </td>
                    <td className="px-6 py-3 text-muted-foreground">
                      {format(parseISO(event.date as string), 'MMMM d, yyyy')} &bull; {event.time}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{event.author.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="font-medium text-foreground text-xs">{event.author}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${event.status === 'Published' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                        <span className="font-semibold text-xs text-foreground/80">{event.status || 'Scheduled'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 border-border/60 shadow-xl backdrop-blur-xl bg-background/95">
                          <DropdownMenuItem onClick={() => { setViewingEvent(event); setIsDetailsModalOpen(true); }} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openScheduleModal(event)} className="cursor-pointer">
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteEvent(event.id)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
                {upcomingEvents.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No upcoming posts.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 5. Modals & Notifications */}
      
      {/* Schedule / Edit Post Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl shadow-2xl border-border/60">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
            <DialogTitle className="text-xl font-bold">{editingEvent ? 'Edit Scheduled Post' : 'Schedule New Post'}</DialogTitle>
          </DialogHeader>
          
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Post Title</Label>
              <Input placeholder="E.g. Q4 Marketing Strategies..." value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="bg-background focus-visible:ring-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Company</Label>
                <Input placeholder="Company Name" value={formCompany} onChange={(e) => setFormCompany(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client</Label>
                <Input placeholder="Client Name (Optional)" value={formClient} onChange={(e) => setFormClient(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Channel</Label>
              <Select value={formChannel} onValueChange={setFormChannel}>
                <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Colour</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {COLORS.map(color => (
                  <button 
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={`w-8 h-8 rounded-full ${color} flex items-center justify-center transition-transform hover:scale-110 shadow-sm
                      ${formColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'ring-1 ring-border/20'}
                    `}
                  >
                    {formColor === color && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {!editingEvent && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="bg-background focus-visible:ring-1" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Time</Label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Author</Label>
                <Select value={formAuthor} onValueChange={setFormAuthor}>
                  <SelectTrigger className="bg-background focus:ring-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {authors.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    <div className="p-2 border-t mt-1 flex items-center gap-2">
                      <Input placeholder="New Author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="h-8 text-xs" />
                      <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); if (newAuthor) { setAuthors([...authors, newAuthor]); setFormAuthor(newAuthor); setNewAuthor(''); }}}>Add</Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t bg-muted/10">
            <Button variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>Cancel</Button>
            <Button onClick={saveEvent} className="shadow-sm">{editingEvent ? 'Save Changes' : 'Schedule Post'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl shadow-2xl border-border/60">
          {viewingEvent && (
            <>
              <div className={`h-2 w-full ${viewingEvent.color || 'bg-slate-400'}`} />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-foreground mb-6 leading-tight pr-8">{viewingEvent.title}</h2>
                
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-muted-foreground"/> {format(parseISO(viewingEvent.date as string), 'MMM d, yyyy')} &bull; {viewingEvent.time}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Channel</p>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${viewingEvent.color || 'bg-slate-400'}`} />
                      <p className="text-sm font-semibold">{viewingEvent.channel}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Status</p>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      {viewingEvent.status === 'Published' ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <CircleDashed className="w-4 h-4 text-amber-500"/>}
                      {viewingEvent.status || 'Scheduled'}
                    </p>
                  </div>
                  
                  {(viewingEvent.company || viewingEvent.client) && (
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Target</p>
                      <p className="text-sm font-semibold">{viewingEvent.company} {viewingEvent.client ? `/ ${viewingEvent.client}` : ''}</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Assignee / Author</p>
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                    <Avatar className="h-10 w-10 border shadow-sm"><AvatarFallback className="bg-background text-primary font-bold">{viewingEvent.author.substring(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <div>
                      <p className="font-bold text-sm text-foreground">{viewingEvent.author}</p>
                      <p className="text-xs text-muted-foreground">Content Creator</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
