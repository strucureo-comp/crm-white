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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

import { useAuth } from '@/lib/firebase/auth-context';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, subscribeToCalendar, ScheduledEvent } from '@/lib/db/marketing-calendar/api';
import { Member, subscribeToProjectsData, createMember } from '@/lib/db/projects/api';

// --- Constants ---
const CHANNELS = ['LinkedIn', 'Twitter', 'Instagram', 'Email', 'Blog', 'YouTube'];
const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500', 'bg-orange-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-slate-500'
];

const MOCK_EVENTS: ScheduledEvent[] = [];

export default function MarketingCalendarPage() {
  const { workspace, user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // State
  const [events, setEvents] = useState<ScheduledEvent[]>(MOCK_EVENTS);
  const [members, setMembers] = useState<Member[]>([]);
  
  useEffect(() => {
    if (!workspace?.id) return;
    const unsubscribeCalendar = subscribeToCalendar(workspace?.id, (data) => {
      setEvents(data);
      if (editingEvent) {
        setEditingEvent(prev => data.find(i => i.id === prev?.id) || null);
      }
      if (viewingEvent) {
        setViewingEvent(prev => data.find(i => i.id === prev?.id) || null);
      }
    });
    const unsubscribeMembers = subscribeToProjectsData(workspace?.id, (data) => {
      setMembers(data.members || []);
    });
    return () => { unsubscribeCalendar(); unsubscribeMembers(); };
  }, [workspace?.id]);

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
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  
  const [formAuthor, setFormAuthor] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [authorPopoverOpen, setAuthorPopoverOpen] = useState(false);

  // Derived
  const viewMode = selectedDate ? 'day' : 'month';
  const displayDate = selectedDate || currentMonth;
  
  // Helper to get effective start/end dates for an event (backward compat)
  const getEventDateRange = (e: ScheduledEvent) => {
    const startStr = e.startDate || (e.date as string);
    const endStr = e.endDate || startStr;
    return { start: parseISO(startStr), end: parseISO(endStr), startStr, endStr };
  };

  const rightColumnEvents = useMemo(() => {
    return events.filter(e => {
      const { start, end } = getEventDateRange(e);
      if (viewMode === 'day') {
        return displayDate >= start && displayDate <= end || isSameDay(start, displayDate) || isSameDay(end, displayDate);
      } else {
        // Show if the event range overlaps with the displayed month
        const monthStart = startOfMonth(displayDate);
        const monthEnd = endOfMonth(displayDate);
        return start <= monthEnd && end >= monthStart;
      }
    }).sort((a, b) => {
      const aStart = a.startDate || (a.date as string);
      const bStart = b.startDate || (b.date as string);
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
  }, [events, viewMode, displayDate]);

  const upcomingEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aStart = a.startDate || (a.date as string);
      const bStart = b.startDate || (b.date as string);
      return new Date(aStart).getTime() - new Date(bStart).getTime();
    });
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
      const startStr = eventToEdit.startDate || format(parseISO(eventToEdit.date as string), 'yyyy-MM-dd');
      setFormStartDate(startStr);
      setFormEndDate(eventToEdit.endDate || startStr);
      setFormAuthor(eventToEdit.author);
      setFormDescription(eventToEdit.description || '');
    } else {
      setEditingEvent(null);
      setFormTitle('');
      setFormCompany('');
      setFormClient('');
      setFormChannel(CHANNELS[0]);
      setFormColor(COLORS[0]);
      const defaultDate = prefilledDate ? format(prefilledDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
      setFormStartDate(defaultDate);
      setFormEndDate(defaultDate);
      setFormAuthor(members.length > 0 ? members[0].id : '');
      setFormDescription('');
    }
    setIsScheduleModalOpen(true);
  };

  const saveEvent = async () => {
    if (!workspace?.id) return;
    if (!formTitle) return toast.error('Title is required');
    
    const startDateStr = formStartDate || format(new Date(), 'yyyy-MM-dd');
    const endDateStr = formEndDate || startDateStr;
    
    // Validate end date is not before start date
    if (endDateStr < startDateStr) {
      return toast.error('End date cannot be before start date');
    }

    let finalDateStr: string;
    if (editingEvent) finalDateStr = editingEvent.date as string;
    else finalDateStr = new Date(startDateStr).toISOString();

    const finalEventData = {
      date: finalDateStr,
      startDate: startDateStr,
      endDate: endDateStr,
      title: formTitle,
      company: formCompany,
      client: formClient,
      channel: formChannel,
      color: formColor,
      author: formAuthor,
      description: formDescription || '',
      status: editingEvent ? editingEvent.status : 'Scheduled'
    };

    try {
      if (editingEvent) {
        await updateCalendarEvent(workspace?.id, editingEvent.id, finalEventData);
        toast.success('Post updated successfully!', { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      } else {
        await createCalendarEvent(workspace?.id, finalEventData);
        toast.success('Post scheduled successfully!', { className: 'bg-emerald-50 text-emerald-700 border-emerald-200' });
      }
      setIsScheduleModalOpen(false);
    } catch (e) {
      toast.error('Failed to save post');
    }
  };

  const deleteEvent = async (id: string | number) => {
    if (!workspace?.id) return;
    try {
      await deleteCalendarEvent(workspace?.id, id);
      toast.success('Post removed.', { className: 'bg-rose-50 text-rose-700 border-rose-200' });
    } catch (e) {
      toast.error('Failed to remove post');
    }
  };

  const handleAddMember = async (e: React.MouseEvent | any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newAuthor.trim() || !workspace?.id) return;
    try {
      const newId = await createMember(workspace?.id, { name: newAuthor.trim(), role: 'Member', email: '', avatar: '', projectIds: [] });
      if (newId) { 
        setFormAuthor(newId); 
        setNewAuthor(''); 
        setAuthorPopoverOpen(false); 
      }
    } catch(err) { console.error('Failed to create member:', err); }
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

      <div className="flex-1 flex flex-col min-h-0 space-y-6 overflow-y-auto pr-1 pb-4">
        {/* 3. Split View Section (Calendar & Events List) */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 shrink-0 min-h-[600px]">
          
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
                  const dayEvents = events.filter(e => {
                    const { start, end } = getEventDateRange(e);
                    return day >= start && day <= end || isSameDay(start, day) || isSameDay(end, day);
                  });
                  
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
                      
                      <div className="flex-1 flex flex-col justify-start gap-1 overflow-y-auto mt-1 no-scrollbar">
                        {dayEvents.slice(0, 4).map((e, i) => (
                          <div 
                            key={i} 
                            onClick={(ev) => { ev.stopPropagation(); setViewingEvent(e); setIsDetailsModalOpen(true); }}
                            className="group flex items-center gap-1.5 text-[10px] px-1.5 py-1 rounded bg-muted/40 hover:bg-muted border border-transparent hover:border-border cursor-pointer transition-all"
                            title={e.title}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 shadow-sm ${e.color || 'bg-slate-500'}`} />
                            <span className="font-medium text-foreground/80 group-hover:text-foreground truncate">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="text-[10px] font-bold text-muted-foreground pl-1 mt-0.5">+{dayEvents.length - 4} more</div>
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
                        <CalendarIcon className="w-3 h-3" />
                        <span className="font-medium">
                          {format(parseISO(event.startDate || event.date as string), 'MMM d')}
                          {event.endDate && event.endDate !== (event.startDate || event.date as string) && ` - ${format(parseISO(event.endDate), 'MMM d')}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(() => {
                          const m = members.find(x => x.id === event.author);
                          const name = m ? m.name : event.author;
                          const initial = m ? (m.avatar || name.substring(0,2).toUpperCase()) : name.substring(0,2).toUpperCase();
                          return (
                            <>
                              <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary">{initial}</AvatarFallback></Avatar>
                              <span className="font-medium truncate max-w-[80px]">{name}</span>
                            </>
                          );
                        })()}
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
                      {format(parseISO(event.startDate || event.date as string), 'MMM d, yyyy')}
                      {event.endDate && event.endDate !== (event.startDate || event.date as string) && ` - ${format(parseISO(event.endDate), 'MMM d, yyyy')}`}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const m = members.find(x => x.id === event.author);
                          const name = m ? m.name : event.author;
                          const initial = m ? (m.avatar || name.substring(0,2).toUpperCase()) : name.substring(0,2).toUpperCase();
                          return (
                            <>
                              <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{initial}</AvatarFallback></Avatar>
                              <span className="font-medium text-foreground text-xs">{name}</span>
                            </>
                          );
                        })()}
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
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</Label>
                <Input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="bg-background focus-visible:ring-1" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</Label>
                <Input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} min={formStartDate} className="bg-background focus-visible:ring-1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Author</Label>
                <Popover open={authorPopoverOpen} onOpenChange={setAuthorPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal bg-background">
                      {formAuthor ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{members.find(m => m.id === formAuthor)?.avatar || members.find(m => m.id === formAuthor)?.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <span>{members.find(m => m.id === formAuthor)?.name}</span>
                        </div>
                      ) : 'Select author...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-2" align="start">
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {members.map(m => {
                        const isSelected = formAuthor === m.id;
                        return (
                          <div key={m.id}
                            className={`flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors ${isSelected ? 'bg-muted' : ''}`}
                            onClick={() => { setFormAuthor(m.id); setAuthorPopoverOpen(false); }}>
                            <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{m.avatar || m.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                            <span className="text-sm font-medium">{m.name}</span>
                            {m.role && <span className="text-xs text-muted-foreground ml-auto">{m.role}</span>}
                          </div>
                        );
                      })}
                      {members.length === 0 && <div className="text-xs text-muted-foreground p-2 text-center">No members found.</div>}
                    </div>
                    <div className="pt-2 mt-1 border-t flex items-center gap-2">
                      <Input placeholder="New Author" value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} className="h-8 text-xs" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMember(e as any); } }} />
                      <Button size="sm" variant="secondary" className="h-8 text-xs shrink-0" onClick={handleAddMember}>Add</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description (Optional)</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" 
                placeholder="Describe the event or post..."
                value={formDescription} 
                onChange={(e) => setFormDescription(e.target.value)} 
              />
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
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Date</p>
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground"/>
                      {format(parseISO(viewingEvent.startDate || viewingEvent.date as string), 'MMM d, yyyy')}
                      {viewingEvent.endDate && viewingEvent.endDate !== (viewingEvent.startDate || viewingEvent.date as string) && ` - ${format(parseISO(viewingEvent.endDate), 'MMM d, yyyy')}`}
                    </p>
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

                {viewingEvent.description && (
                  <div className="mt-6 pt-6 border-t">
                    <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Description</p>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{viewingEvent.description}</p>
                  </div>
                )}

                <div className="mt-8 pt-6 border-t">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-3">Assignee / Author</p>
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
                    {(() => {
                      const m = members.find(x => x.id === viewingEvent.author);
                      const name = m ? m.name : viewingEvent.author;
                      const initial = m ? (m.avatar || name.substring(0,2).toUpperCase()) : name.substring(0,2).toUpperCase();
                      const role = m?.role || 'Content Creator';
                      return (
                        <>
                          <Avatar className="h-10 w-10 border shadow-sm"><AvatarFallback className="bg-background text-primary font-bold">{initial}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-bold text-sm text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">{role}</p>
                          </div>
                        </>
                      );
                    })()}
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
