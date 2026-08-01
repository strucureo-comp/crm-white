'use client';

import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, MapPin, X, Users, Tag, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToCalendarEvents, createCalendarEvent, CalendarEvent as DBCalendarEvent } from '@/lib/db/calendar/api';
import { Member, subscribeToProjectsData } from '@/lib/db/projects/api';

// --- Data Schemas ---
// We will use the DB types, but we'll export/re-map them for this page if needed.
export type CalendarEvent = DBCalendarEvent;

const EVENT_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

type ViewType = 'Day' | 'Week' | 'Month';

export default function CalendarAgendaPage() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewType>('Month');
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Subscriptions
  React.useEffect(() => {
    if (!user?.company_id) return;
    
    const unsubEvents = subscribeToCalendarEvents(user.company_id, setEvents);
    const unsubMembers = subscribeToProjectsData(user.company_id, (data) => {
      setMembers(data.members || []);
    });

    return () => {
      unsubEvents();
      unsubMembers();
    };
  }, [user]);
  
  // Base date for rendering (approx July 2026)
  const [currentMonth, setCurrentMonth] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Modals
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('09:00');
  const [formColor, setFormColor] = useState(EVENT_COLORS[0]);
  const [formAttendees, setFormAttendees] = useState<string[]>([]);

  // Handlers
  const handleCreateEvent = async () => {
    if(!user?.company_id || !formTitle.trim()) return;
    
    const newEvent: Omit<CalendarEvent, 'id'> = {
      title: formTitle,
      date: formDate || new Date().toISOString().split('T')[0],
      time: formTime,
      color: formColor,
      attendees: formAttendees.length > 0 ? formAttendees : (members.length > 0 ? [members[0].id] : [])
    };
    
    try {
      await createCalendarEvent(user.company_id, newEvent);
      setIsScheduleOpen(false);
      
      // Reset form
      setFormTitle('');
      setFormDate('');
      setFormTime('09:00');
      setFormColor(EVENT_COLORS[0]);
      setFormAttendees([]);
    } catch (e) {
      console.error("Failed to create event", e);
    }
  };

  // Derived
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInCurrentMonth = getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  const firstDayOffset = getFirstDayOfMonth(currentMonth.getFullYear(), currentMonth.getMonth());
  // Adjust offset for Monday start if needed, but standard JS gets Sunday=0. Let's use Mon=0 to Sun=6 for standard EU/Business calendar.
  const adjustedOffset = firstDayOffset === 0 ? 6 : firstDayOffset - 1;

  const calendarCells = useMemo(() => {
    const cells = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // Empty cells before start of month
    for (let i = 0; i < adjustedOffset; i++) {
      cells.push({ empty: true, date: null, dateStr: '' });
    }
    
    // Actual days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      const d = new Date(year, month, i);
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      cells.push({ 
        empty: false, 
        date: d, 
        dateStr: `${year}-${mStr}-${dStr}`,
        isWeekend: d.getDay() === 0 || d.getDay() === 6
      });
    }
    
    // Fill remaining to complete grid (42 cells typical)
    const remaining = 42 - cells.length;
    for (let i = 0; i < remaining; i++) {
      cells.push({ empty: true, date: null, dateStr: '' });
    }
    
    return cells;
  }, [currentMonth, adjustedOffset, daysInCurrentMonth]);

  const selectedDayEvents = events.filter(e => e.date === selectedDate).sort((a,b) => a.time.localeCompare(b.time));
  
  const upcoming7DaysEvents = useMemo(() => {
    const start = new Date(selectedDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    
    return events.filter(e => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    }).sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });
  }, [selectedDate, events]);

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const handleToday = () => {
    // For demo purposes, we treat July 15, 2026 as "Today"
    setCurrentMonth(new Date(2026, 6, 1));
    setSelectedDate('2026-07-15');
  };

  const getMonthName = (date: Date) => date.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0">
      
      {/* 2. Global Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-background border-b shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-black text-[#1e1a4f] dark:text-foreground tracking-tight">Calendar Agenda</h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">Track schedules, meetings, and milestone due dates</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
            {(['Day', 'Week', 'Month'] as ViewType[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  view === v ? 'bg-white dark:bg-muted text-purple-700 dark:text-purple-300 shadow-sm border border-purple-100 dark:border-purple-800' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          
          <Button className="bg-[#8b5cf6] hover:bg-[#7c3aed] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white rounded-xl shadow-md font-bold px-5" onClick={() => setIsScheduleOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Schedule Event
          </Button>
        </div>
      </div>

      {/* 3. Main Layout Split */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-muted/10">
        
        {/* A. Left Side: Calendar Grid */}
        <div className="flex-1 flex flex-col min-w-0 border-r bg-background shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-10">
          
          <div className="flex items-center justify-between p-4 border-b shrink-0 bg-background">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/50"><CalendarIcon className="w-5 h-5" /></div>
              <h2 className="text-xl font-bold text-[#1e1a4f] dark:text-foreground">{getMonthName(currentMonth)}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg border-border/60 hover:bg-muted" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
              <Button variant="outline" className="h-9 rounded-lg border-border/60 font-bold hover:bg-muted px-4" onClick={handleToday}>Today</Button>
              <Button variant="outline" size="icon" className="w-9 h-9 rounded-lg border-border/60 hover:bg-muted" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === 'Month' ? (
              <div className="h-full flex flex-col">
                <div className="grid grid-cols-7 border-b bg-muted/20 shrink-0">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => (
                    <div key={day} className={`px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest ${i >= 5 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                      {day}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                  {calendarCells.map((cell, idx) => {
                    if (cell.empty) return <div key={idx} className="border-b border-r bg-muted/5 min-h-[100px]" />;
                    
                    const isSelected = selectedDate === cell.dateStr;
                    const cellEvents = events.filter(e => e.date === cell.dateStr);
                    const allItems = [...cellEvents.map(e => ({...e, isTask: false}))];
                    const displayItems = allItems.slice(0, 3);
                    const hasMore = allItems.length > 3;

                    return (
                      <div 
                        key={idx} 
                        className={`border-b border-r p-1.5 flex flex-col transition-colors cursor-pointer min-h-[100px]
                          ${isSelected ? 'bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-inset ring-purple-400 dark:ring-purple-500' : 'hover:bg-muted/30 bg-background'}
                        `}
                        onClick={() => setSelectedDate(cell.dateStr)}
                      >
                        <div className="text-right mb-1">
                          <span className={`text-[11px] font-bold w-6 h-6 inline-flex items-center justify-center rounded-full ${
                            cell.dateStr === '2026-07-15' && !isSelected ? 'bg-[#1e1a4f] dark:bg-slate-700 text-white' : 
                            isSelected ? 'bg-purple-600 text-white' : 
                            cell.isWeekend ? 'text-rose-400' : 'text-muted-foreground'
                          }`}>
                            {cell.date?.getDate()}
                          </span>
                        </div>
                        
                        <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                          {displayItems.map((item, i) => (
                              <div 
                                key={`e-${item.id}`} 
                                className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:opacity-80 text-[9px] font-bold text-gray-800 dark:text-gray-200 truncate border"
                                style={{ backgroundColor: `${(item as CalendarEvent).color}15`, borderColor: `${(item as CalendarEvent).color}30` }}
                                onClick={(e) => { e.stopPropagation(); setViewingEvent(item as CalendarEvent); }}
                              >
                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: (item as CalendarEvent).color }} />
                                <span className="font-semibold text-muted-foreground shrink-0">{(item as CalendarEvent).time}</span>
                                <span className="truncate" style={{ color: (item as CalendarEvent).color }}>{(item as CalendarEvent).title}</span>
                              </div>
                          ))}
                          {hasMore && <div className="text-[9px] font-bold text-muted-foreground text-center mt-auto hover:text-foreground">{allItems.length - 3} More ▾</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <Clock className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-bold text-lg text-muted-foreground">{view} View is currently under construction.</h3>
                <p className="text-sm text-muted-foreground mt-2">Please use the Month view to navigate and manage events.</p>
                <Button variant="outline" className="mt-4" onClick={() => setView('Month')}>Switch to Month View</Button>
              </div>
            )}
          </div>
        </div>

        {/* B. Right Side: Agenda Panel */}
        <div className="w-80 shrink-0 flex flex-col overflow-y-auto p-4 gap-4 bg-[#f8fafc] dark:bg-muted/5 border-l">
          
          <Card className="border-0 shadow-sm bg-white dark:bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-purple-50/50 dark:bg-purple-900/20 p-4 border-b border-purple-100 dark:border-purple-900/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗓️</span>
                <CardTitle className="text-[13px] font-black uppercase tracking-wider text-purple-900 dark:text-purple-100">Selected Day</CardTitle>
              </div>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/50">
              {selectedDayEvents.length === 0 && (
                <div className="p-6 text-center text-xs font-medium italic text-muted-foreground">No events scheduled.</div>
              )}
              
              {selectedDayEvents.map(e => (
                <div key={e.id} className="p-4 flex flex-col hover:bg-muted/10 transition-colors cursor-pointer group" style={{ borderLeft: `4px solid ${e.color}` }} onClick={() => setViewingEvent(e)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{e.title}</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><Clock className="w-3 h-3" /> {e.time}</div>
                    </div>
                  </div>
                  {e.attendees.length > 0 && (
                    <div className="flex items-center mt-3 pt-3 border-t border-border/50">
                      <div className="flex -space-x-2">
                        {e.attendees.map(aId => {
                          const member = members.find(m => m.id === aId);
                          if(!member) return null;
                          return (
                            <Avatar key={aId} className="w-6 h-6 border-2 border-white shadow-sm">
                              <AvatarFallback className="bg-muted text-[9px] font-bold">{member.avatar || member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white dark:bg-card rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <CardTitle className="text-[13px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Upcoming 7 Days</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/50">
              {upcoming7DaysEvents.length === 0 ? (
                <div className="p-6 text-center text-xs font-medium italic text-muted-foreground">No upcoming events.</div>
              ) : (
                upcoming7DaysEvents.map(e => (
                  <div key={`${e.id}-up`} className="p-4 flex items-center gap-3 hover:bg-muted/10 cursor-pointer" onClick={() => setViewingEvent(e)}>
                    <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                    <div className="flex flex-col flex-1 min-w-0">
                      <p className="text-xs font-bold text-muted-foreground mb-0.5">{new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p className="text-sm font-bold text-foreground truncate leading-tight">{e.title}</p>
                      <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">{e.time}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* 4. Modals */}
      
      {/* Event Detail Popup */}
      <Dialog open={!!viewingEvent} onOpenChange={(open) => { if (!open) setViewingEvent(null); }}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden rounded-[1.5rem] border-0 shadow-2xl bg-white dark:bg-card" hideCloseIcon>
          {viewingEvent && (
            <>
              <div className="h-2 w-full" style={{ backgroundColor: viewingEvent.color }} />
              <div className="p-6 pb-4 flex items-start justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 uppercase text-[9px] font-black tracking-widest text-slate-500 dark:text-slate-400">Event</Badge>
                    {viewingEvent.linkedRecord && <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 uppercase text-[9px] font-black tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Project Link</Badge>}
                  </div>
                  <DialogTitle className="text-2xl font-black text-[#1e1a4f] dark:text-slate-100 leading-tight">{viewingEvent.title}</DialogTitle>
                </div>
                <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0" onClick={() => setViewingEvent(null)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="px-6 py-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0"><CalendarIcon className="w-4 h-4" /></div>
                  <span className="text-slate-900 dark:text-slate-200">{new Date(viewingEvent.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-4 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border dark:border-slate-700 shadow-sm flex items-center justify-center text-slate-400 dark:text-slate-500 shrink-0"><Clock className="w-4 h-4" /></div>
                  <span className="text-slate-900 dark:text-slate-200">{viewingEvent.time}</span>
                </div>
                {viewingEvent.attendees.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-3">Attendees ({viewingEvent.attendees.length})</p>
                    <div className="space-y-3">
                      {viewingEvent.attendees.map(aId => {
                        const m = members.find(x => x.id === aId);
                        if(!m) return null;
                        return (
                          <div key={aId} className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border dark:border-slate-700"><AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100">{m.avatar || m.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                            <div className="flex flex-col"><span className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-none mb-1">{m.name}</span><span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{m.role}</span></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
                <Button variant="ghost" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-bold px-4 rounded-xl">Delete</Button>
                <div className="flex items-center gap-2">
                  <Button variant="outline" className="rounded-xl font-bold px-4 border-slate-200 dark:border-slate-700 dark:text-slate-300" onClick={() => setViewingEvent(null)}>Close</Button>
                  <Button className="rounded-xl font-bold bg-[#1e1a4f] dark:bg-slate-100 text-white dark:text-[#1e1a4f] px-4 hover:bg-[#2d2770] dark:hover:bg-white">Reschedule</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Event Modal */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-[500px] p-8 bg-[#fdfcff] dark:bg-card border-0 shadow-2xl rounded-[1.5rem] gap-6" hideCloseIcon>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black text-[#1e1a4f] dark:text-slate-100 tracking-tight">Schedule Event</DialogTitle>
            <button className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" onClick={() => setIsScheduleOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Event Title</label>
              <Input placeholder="e.g. Design Sync" className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 placeholder:text-purple-400 dark:placeholder:text-slate-500 rounded-xl px-4 font-bold focus-visible:ring-purple-500" value={formTitle} onChange={e=>setFormTitle(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Date</label>
                <Input type="date" className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-bold focus-visible:ring-purple-500" value={formDate} onChange={e=>setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Time</label>
                <Input type="time" className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-bold focus-visible:ring-purple-500" value={formTime} onChange={e=>setFormTime(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Link to Project (Optional)</label>
              <Select>
                <SelectTrigger className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-bold focus:ring-purple-500"><SelectValue placeholder="Select a project..." /></SelectTrigger>
                <SelectContent><SelectItem value="Alpha">Alpha Redesign</SelectItem><SelectItem value="Beta">Beta Launch</SelectItem></SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider block">Event Color</label>
              <div className="flex items-center gap-3">
                {EVENT_COLORS.map(c => (
                  <div 
                    key={c}
                    className={`w-7 h-7 rounded-full cursor-pointer ring-2 ring-offset-2 dark:ring-offset-background transition-all ${formColor === c ? 'ring-purple-500' : 'ring-transparent hover:ring-purple-200'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider block border-b border-purple-100 dark:border-slate-800 pb-2">Attendees</label>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      className="rounded border-purple-300 text-purple-600 focus:ring-purple-500" 
                      checked={formAttendees.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormAttendees(prev => [...prev, m.id]);
                        } else {
                          setFormAttendees(prev => prev.filter(id => id !== m.id));
                        }
                      }}
                    />
                    <Avatar className="w-7 h-7"><AvatarFallback className="bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 text-[10px] font-bold border border-purple-200 dark:border-slate-700">{m.avatar || m.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                    <div className="flex flex-col"><span className="text-sm font-bold text-purple-950 dark:text-slate-200 leading-none mb-0.5">{m.name}</span><span className="text-[10px] font-semibold text-purple-600 dark:text-slate-400">{m.role || 'Member'}</span></div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-purple-100 dark:border-slate-800">
            <Button variant="outline" className="h-11 px-6 rounded-[2rem] border-purple-200 dark:border-slate-700 text-[#1e1a4f] dark:text-slate-200 font-bold hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-[#1e1a4f] dark:hover:text-slate-100" onClick={() => setIsScheduleOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-[2rem] bg-[#8b5cf6] hover:bg-[#7c3aed] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-bold shadow-md" onClick={handleCreateEvent}>+ Schedule Event</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
