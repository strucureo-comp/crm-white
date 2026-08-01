'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { 
  Search, Plus, LayoutGrid, LayoutList, Kanban, Table as TableIcon, Calendar as CalendarIcon,
  CheckCircle2, AlertCircle, X, ChevronDown, MoreHorizontal, MessageSquare, Paperclip,
  Trash2, Filter, Settings, Flag, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { 
  Task, Assignee, SubTask, Comment, DealReference, Attachment, 
  TaskPriority, ViewType, TasksData,
  subscribeToTasksData, createTask, updateTask, deleteTask, saveTaskColumns 
} from '@/lib/db/tasks/api';
import { subscribeToProjectsData, createMember, Member } from '@/lib/db/projects/api';

export interface DashboardWidget {
  id: string;
  title: string;
  w: number; 
  h: number; 
  type: 'overview' | 'status-chart' | 'priority-chart' | 'team-activity';
}

// --- Mock Data ---
const MOCK_TASKS: Task[] = [];

const PriorityStyle = (priority: TaskPriority) => {
  switch (priority) {
    case 'Urgent': return 'text-rose-600 font-bold';
    case 'High': return 'text-amber-600 font-bold';
    case 'Medium': return 'text-blue-600 font-semibold';
    case 'Low': return 'text-slate-500 font-medium';
    default: return 'text-slate-500 font-medium';
  }
};

export default function TaskManagerPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  // State
  const [columns, setColumns] = useState<string[]>(['To Do', 'In Progress', 'Review', 'Done']);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!user?.company_id) return;
    const unsubscribeTasks = subscribeToTasksData(user.company_id, (data) => {
      setTasks(data.tasks);
      setColumns(data.columns);
    });
    const unsubscribeProjects = subscribeToProjectsData(user.company_id, (data) => {
      setMembers(data.members);
    });
    return () => {
      unsubscribeTasks();
      unsubscribeProjects();
    };
  }, [user?.company_id]);
  const [view, setView] = useState<ViewType>('Kanban');
  const [search, setSearch] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Modals
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Sync viewingTask with live updates
  useEffect(() => {
    if (viewingTask) {
      const updated = tasks.find(t => t.id === viewingTask.id);
      if (updated) setViewingTask(updated);
    }
  }, [tasks]);

  // Subtask UI state
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [newSubtaskAssigneeIds, setNewSubtaskAssigneeIds] = useState<string[]>([]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());

  // New Task Form State
  const [formTitle, setFormTitle] = useState('');
  const [formStatus, setFormStatus] = useState('To Do');
  const [formPriority, setFormPriority] = useState<TaskPriority>('Medium');
  const [formDate, setFormDate] = useState('');
  const [formAssigneeIds, setFormAssigneeIds] = useState<string[]>([]);
  const [formDescription, setFormDescription] = useState('');
  const [newMemberName, setNewMemberName] = useState('');

  // Filters
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');

  // Derived
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      const taskAssignees = t.assignees || (t.assignee ? [t.assignee] : []);
      const matchesOwner = filterOwner === 'All' || taskAssignees.some(a => a.name === filterOwner);
      const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
      return matchesSearch && matchesOwner && matchesPriority;
    });
  }, [tasks, search, filterOwner, filterPriority]);

  // Handlers
  const handleCreateTask = async () => {
    if (!user?.company_id) return;
    if (!formTitle.trim()) return toast.error('Task title is required');
    
    const assignees = members
      .filter(m => formAssigneeIds.includes(m.id))
      .map(m => ({ ...m, email: '' }));
      
    if (assignees.length === 0 && members.length > 0) {
      assignees.push({ ...members[0], email: '' });
    }
    
    const newTask = {
      title: formTitle,
      description: formDescription,
      status: formStatus,
      assignees,
      priority: formPriority,
      dueDate: formDate || new Date().toISOString().split('T')[0],
      subtasks: [],
      comments: [],
      labels: [],
      dealReference: null,
      attachments: []
    };
    
    try {
      await createTask(user.company_id, newTask);
      setIsNewTaskOpen(false);
      toast.success('Task scheduled successfully');
      
      // Reset form
      setFormTitle('');
      setFormStatus('To Do');
      setFormPriority('Medium');
      setFormDate('');
      setFormAssigneeIds([]);
      setFormDescription('');
    } catch (e) {
      toast.error('Failed to create task');
    }
  };

  const handleSaveNewColumn = async () => {
    if (!user?.company_id) return;
    const trimmed = newColumnName.trim();
    if (trimmed && !columns.includes(trimmed)) {
      const nextCols = [...columns, trimmed];
      const success = await saveTaskColumns(user.company_id, nextCols);
      if (!success) {
        toast.error('Failed to save column to backend');
      } else {
        toast.success('Column added successfully');
        setNewColumnName('');
        setIsAddingColumn(false);
      }
    } else if (trimmed) {
      toast.error('Invalid or duplicate column name');
    }
  };

  const handleDeleteColumn = async (colToDelete: string) => {
    if (!user?.company_id) return;
    const colTasks = tasks.filter(t => t.status === colToDelete);
    if (colTasks.length > 0) {
      if (!window.confirm(`There are ${colTasks.length} tasks in "${colToDelete}". Are you sure you want to delete this column?`)) return;
    }
    
    const nextCols = columns.filter(c => c !== colToDelete);
    const success = await saveTaskColumns(user.company_id, nextCols);
    if (!success) {
      toast.error('Failed to delete column from backend');
    } else {
      toast.success(`Column "${colToDelete}" deleted`);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!user?.company_id) return;
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    
    try {
      await updateTask(user.company_id, draggableId, { status: destination.droppableId });
    } catch (e) {
      toast.error('Failed to move task');
    }
  };

  const toggleTaskSelection = (id: string) => {
    const next = new Set(selectedTaskIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedTaskIds(next);
  };

  const handleBulkDelete = async () => {
    if (!user?.company_id) return;
    try {
      const promises = Array.from(selectedTaskIds).map(id => deleteTask(user.company_id!, id));
      await Promise.all(promises);
      setSelectedTaskIds(new Set());
      toast.success('Selected tasks deleted');
    } catch (e) {
      toast.error('Failed to delete tasks');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (!user?.company_id) return;
    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(id => updateTask(user.company_id!, id, { status: newStatus }))
      );
      toast.success(`${selectedTaskIds.size} tasks moved to ${newStatus}`);
      setSelectedTaskIds(new Set());
    } catch (e) {
      toast.error('Failed to update tasks');
    }
  };

  const handleAddNewMember = async (e: React.MouseEvent, target: 'task' | 'subtask') => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.company_id) return;
    if (!newMemberName.trim()) return;
    
    const newMemb = {
      name: newMemberName,
      avatar: newMemberName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'U'
    };
    
    try {
      const newId = await createMember(user.company_id, newMemb);
      if (newId) {
        if (target === 'task') {
          setFormAssigneeIds(prev => [...prev, newId]);
        } else {
          setNewSubtaskAssigneeIds(prev => [...prev, newId]);
        }
      }
      setNewMemberName('');
    } catch (err) {
      toast.error('Failed to add member');
    }
  };

  const handleAddSubtask = async () => {
    if (!user?.company_id || !viewingTask) return;
    if (!newSubtaskTitle.trim()) return;
    
    const assignees = members
      .filter(m => newSubtaskAssigneeIds.includes(m.id))
      .map(m => ({ ...m, email: '' }));

    const newSubtask = {
      id: `st${Date.now()}`,
      title: newSubtaskTitle.trim(),
      completed: false,
      dueDate: newSubtaskDueDate || undefined,
      description: newSubtaskDescription.trim() || undefined,
      assignees: assignees.length > 0 ? assignees : undefined
    };

    const nextSubtasks = [...(viewingTask.subtasks || []), newSubtask];
    
    try {
      await updateTask(user.company_id, viewingTask.id, { subtasks: nextSubtasks });
      setIsAddingSubtask(false);
      setNewSubtaskTitle('');
      setNewSubtaskDueDate('');
      setNewSubtaskDescription('');
      setNewSubtaskAssigneeIds([]);
    } catch (e) {
      toast.error('Failed to add subtask');
    }
  };

  const toggleSubtaskExpansion = (id: string) => {
    setExpandedSubtasks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSubtaskCompletion = async (subtaskId: string) => {
    if (!user?.company_id || !viewingTask) return;
    const nextSubtasks = (viewingTask.subtasks || []).map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    );
    try {
      await updateTask(user.company_id, viewingTask.id, { subtasks: nextSubtasks });
    } catch (e) {
      toast.error('Failed to update subtask');
    }
  };

  const updateTaskField = async (id: string, field: keyof Task, value: any) => {
    if (!user?.company_id) return;
    try {
      await updateTask(user.company_id, id, { [field]: value });
    } catch (e) {
      toast.error('Failed to update task');
    }
  };

  const getCalendarDays = () => {
    return Array.from({length: 35}, (_, i) => {
      const date = new Date(2026, 7, i - 3);
      return { 
        date, 
        dateStr: date.toISOString().split('T')[0],
        dayNum: date.getDate(),
        isCurrentMonth: date.getMonth() === 7
      };
    });
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 space-y-4">
      
      {/* 2. Global Toolbar & Controls */}
      <div className="flex flex-col gap-4 shrink-0 bg-card p-4 rounded-xl border shadow-sm z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* View Switchers */}
          <div className="flex bg-muted p-1 rounded-lg border w-fit">
            {(['Kanban', 'Dashboard', 'List', 'Table', 'Calendar'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  view === v ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                }`}
              >
                {v === 'Kanban' && <Kanban className="w-3 h-3" />}
                {v === 'Dashboard' && <LayoutGrid className="w-3 h-3" />}
                {v === 'List' && <LayoutList className="w-3 h-3" />}
                {v === 'Table' && <TableIcon className="w-3 h-3" />}
                {v === 'Calendar' && <CalendarIcon className="w-3 h-3" />}
                {v}
              </button>
            ))}
          </div>

          {/* Top Right Actions */}
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search tasks..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="pl-9 h-9 bg-background focus-visible:ring-purple-500 text-sm" 
              />
            </div>
            <Button onClick={() => setIsNewTaskOpen(true)} className="h-9 bg-purple-600 hover:bg-purple-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        {view !== 'Dashboard' && (
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border/50">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Owner</span>
              <Select value={filterOwner} onValueChange={setFilterOwner}>
                <SelectTrigger className="h-8 text-xs w-[140px] bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                <SelectItem value="All">All Members</SelectItem>
                {members.map(a => (
                  <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                ))}
              </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Priority</span>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-8 text-xs w-[140px] bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priorities</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Tag</span>
              <Select defaultValue="All"><SelectTrigger className="h-8 text-xs w-[140px] bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All Tags</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Sort</span>
              <Select defaultValue="None"><SelectTrigger className="h-8 text-xs w-[140px] bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="None">None</SelectItem><SelectItem value="Due">Due Date</SelectItem></SelectContent></Select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bulk Actions Strip */}
      {selectedTaskIds.size > 0 && (view === 'List' || view === 'Table') && (
        <div className="shrink-0 bg-purple-50 border border-purple-200 shadow-sm rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-purple-600 animate-pulse" />
            <span className="text-sm font-bold text-purple-900">{selectedTaskIds.size} tasks selected</span>
          </div>
          <div className="flex items-center gap-3">
            <Select onValueChange={handleBulkStatusChange}>
              <SelectTrigger className="h-8 text-xs w-[150px] bg-white border-purple-200"><SelectValue placeholder="Move status to..." /></SelectTrigger>
              <SelectContent>
                {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-8 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold">
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
            <div className="w-px h-4 bg-purple-200" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-purple-600 hover:bg-purple-200" onClick={() => setSelectedTaskIds(new Set())}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 4. Dynamic Views */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        
        {/* A. Kanban Board View */}
        {view === 'Kanban' && (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full overflow-x-auto items-start pb-4">
              {columns.map((col, idx) => {
                const colTasks = filteredTasks.filter(t => t.status === col);
                const themeColors = [
                  { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
                  { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
                  { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
                  { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' }
                ];
                const theme = themeColors[idx % themeColors.length];

                return (
                  <div key={col} className="flex-shrink-0 w-[340px] flex flex-col max-h-full">
                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${theme.bg} ${theme.text} ring-4 ring-background shadow-sm`} style={{ backgroundColor: 'currentColor' }} />
                        <h3 className="font-bold text-sm uppercase tracking-wider">{col}</h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted/80 ml-1">
                          {colTasks.length}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-full" onClick={() => handleDeleteColumn(col)}><X className="w-3 h-3" /></Button>
                    </div>
                    
                    <Droppable droppableId={col}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto p-2 space-y-3 rounded-2xl transition-all duration-300 ${snapshot.isDraggingOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-muted/30 border border-border/50'}`}
                        >
                          {colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => {
                                const priorityColors = {
                                  Low: 'bg-blue-500',
                                  Medium: 'bg-amber-500',
                                  High: 'bg-rose-500',
                                  Urgent: 'bg-red-600 animate-pulse'
                                };
                                const pColor = priorityColors[task.priority as keyof typeof priorityColors] || 'bg-slate-500';

                                return (
                                  <Card
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    onClick={() => setViewingTask(task)}
                                    className={`cursor-pointer transition-all duration-200 border-l-4 bg-background group overflow-hidden
                                      ${snapshot.isDragging ? 'shadow-2xl rotate-3 ring-2 ring-primary/30' : 'shadow-sm hover:shadow-md hover:border-primary/40'}
                                    `}
                                    style={{
                                      ...provided.draggableProps.style,
                                      borderLeftColor: 'transparent'
                                    }}
                                  >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${pColor} opacity-80 group-hover:opacity-100 transition-opacity`} />
                                    <CardContent className="p-4 pl-5 space-y-3 relative">
                                      <div className="flex gap-1 flex-wrap">
                                        {task.labels?.map(l => <Badge key={l} variant="outline" className="text-[9px] px-2 py-0 border-primary/20 text-primary bg-primary/5">{l}</Badge>)}
                                      </div>
                                      <h4 className="font-bold text-[15px] leading-snug text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                                      {task.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
                                      )}
                                      
                                      {((task.subtasks?.length || 0) > 0 || (task.comments?.length || 0) > 0 || (task.attachments?.length || 0) > 0) && (
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium pt-2">
                                          {(task.subtasks?.length || 0) > 0 && <span className={`flex items-center gap-1 ${task.subtasks!.filter(s=>s.completed).length === task.subtasks!.length ? 'text-emerald-600' : ''}`}><CheckCircle2 className="w-3.5 h-3.5" /> {task.subtasks!.filter(s=>s.completed).length}/{task.subtasks!.length}</span>}
                                          {(task.comments?.length || 0) > 0 && <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> {task.comments!.length}</span>}
                                          {(task.attachments?.length || 0) > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {task.attachments!.length}</span>}
                                        </div>
                                      )}

                                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40">
                                        <div className="flex flex-col gap-0.5">
                                          <span className={`text-[10px] font-bold uppercase tracking-wider ${PriorityStyle(task.priority)}`}>{task.priority}</span>
                                          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3 h-3"/>{task.dueDate}</span>
                                        </div>
                                        <div className="flex -space-x-2 overflow-hidden">
                                          {(task.assignees || (task.assignee ? [task.assignee] : [])).slice(0, 3).map((a, i) => (
                                            <Avatar key={a.id || i} className="h-7 w-7 border-2 border-background shadow-sm ring-1 ring-border/50" title={a.name}>
                                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{a.avatar}</AvatarFallback>
                                            </Avatar>
                                          ))}
                                          {(task.assignees?.length || 0) > 3 && (
                                            <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[9px] font-bold text-muted-foreground ring-1 ring-border/50">
                                              +{(task.assignees?.length || 0) - 3}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              }}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          <Button variant="ghost" className="w-full text-muted-foreground text-xs font-bold border border-dashed border-muted-foreground/30 hover:border-foreground/30 hover:bg-foreground/5 h-12 rounded-xl mt-2 transition-colors" onClick={() => setIsNewTaskOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Add Task
                          </Button>
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
              {isAddingColumn ? (
                <div className="flex-shrink-0 w-[320px] bg-muted/10 border-2 rounded-xl border-primary/50 p-3 flex flex-col gap-2">
                  <Input
                    autoFocus
                    placeholder="Column title..."
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewColumn();
                      if (e.key === 'Escape') setIsAddingColumn(false);
                    }}
                    className="bg-background h-8 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="h-7 text-xs px-3" onClick={handleSaveNewColumn}>Add</Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddingColumn(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div onClick={() => setIsAddingColumn(true)} className="flex-shrink-0 w-[320px] flex items-center justify-center bg-muted/10 border-2 border-dashed rounded-xl border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-colors group">
                  <span className="text-sm font-bold text-muted-foreground group-hover:text-primary flex items-center"><Plus className="w-4 h-4 mr-2" /> Add Column</span>
                </div>
              )}
            </div>
          </DragDropContext>
        )}

        {/* B. Dashboard View */}
        {view === 'Dashboard' && (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-1">
              <Card className="md:col-span-4 border shadow-sm"><CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Overview KPIs</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-muted/30 p-4 rounded-lg"><p className="text-xs text-muted-foreground font-bold">Total Tasks</p><p className="text-2xl font-black mt-1">{tasks.length}</p></div>
                  <div className="bg-emerald-50 p-4 rounded-lg"><p className="text-xs text-emerald-700 font-bold">Completed</p><p className="text-2xl font-black text-emerald-800 mt-1">{tasks.filter(t=>t.status==='Done').length}</p></div>
                  <div className="bg-amber-50 p-4 rounded-lg"><p className="text-xs text-amber-700 font-bold">In Progress</p><p className="text-2xl font-black text-amber-800 mt-1">{tasks.filter(t=>t.status==='In Progress').length}</p></div>
                  <div className="bg-rose-50 p-4 rounded-lg"><p className="text-xs text-rose-700 font-bold">Urgent</p><p className="text-2xl font-black text-rose-800 mt-1">{tasks.filter(t=>t.priority==='Urgent').length}</p></div>
                </div>
              </CardContent></Card>
              <Card className="md:col-span-2 border shadow-sm"><CardContent className="p-6 h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <p className="font-bold mb-2">Status Pie Chart</p><div className="w-32 h-32 rounded-full bg-muted border-4 border-dashed" />
              </CardContent></Card>
              <Card className="md:col-span-2 border shadow-sm"><CardContent className="p-6 h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <p className="font-bold mb-2">Team Activity Bar Chart</p><div className="w-full h-32 bg-muted/50 rounded-lg flex items-end justify-around px-4 pb-2 pt-10 border-b border-l"><div className="w-8 bg-primary/20 h-full rounded-t-sm"/><div className="w-8 bg-primary/50 h-3/4 rounded-t-sm"/><div className="w-8 bg-primary/80 h-1/2 rounded-t-sm"/></div>
              </CardContent></Card>
            </div>
          </div>
        )}

        {/* C. Compact List View */}
        {view === 'List' && (
          <div className="h-full overflow-y-auto space-y-2 pb-4 px-1">
            <div className="flex items-center gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <div className="w-6 text-center"><input type="checkbox" className="rounded" onChange={(e) => setSelectedTaskIds(e.target.checked ? new Set(filteredTasks.map(t=>t.id)) : new Set())} checked={selectedTaskIds.size === filteredTasks.length && filteredTasks.length > 0} /></div>
              <div className="flex-1">Task Details</div>
              <div className="w-32">Status</div>
              <div className="w-32">Priority</div>
              <div className="w-32">Due Date</div>
              <div className="w-32">Assignee</div>
              <div className="w-12 text-center">Action</div>
            </div>
            {filteredTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all cursor-default ${selectedTaskIds.has(task.id) ? 'bg-purple-50 border-purple-300' : 'bg-card hover:border-primary/40 shadow-sm'}`}>
                <div className="w-6 text-center"><input type="checkbox" className="rounded text-purple-600 focus:ring-purple-500" checked={selectedTaskIds.has(task.id)} onChange={() => toggleTaskSelection(task.id)} /></div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingTask(task)}>
                  <p className="font-bold text-sm text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.description}</p>
                </div>
                <div className="w-32">
                  <Select value={task.status} onValueChange={(v) => updateTaskField(task.id, 'status', v)}>
                    <SelectTrigger className="h-8 text-xs bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Select value={task.priority} onValueChange={(v) => updateTaskField(task.id, 'priority', v)}>
                    <SelectTrigger className="h-8 text-xs bg-muted/50 border-0"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <input type="date" value={task.dueDate} onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)} className="h-8 w-full text-xs rounded-md border-0 bg-muted/50 px-2 outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div className="w-32 flex items-center gap-2">
                  <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] bg-primary/10 text-primary">{task.assignee.avatar}</AvatarFallback></Avatar>
                  <span className="text-xs font-semibold truncate">{task.assignee.name}</span>
                </div>
                <div className="w-12 text-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* D. Notion-Style Table View */}
        {view === 'Table' && (
          <div className="h-full overflow-y-auto">
            <Card className="border shadow-sm"><CardContent className="p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/30 border-b text-xs uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center"><input type="checkbox" className="rounded" onChange={(e) => setSelectedTaskIds(e.target.checked ? new Set(filteredTasks.map(t=>t.id)) : new Set())} /></th>
                    <th className="px-4 py-3 font-bold">Title / Core Goal Description</th>
                    <th className="px-4 py-3 font-bold w-40">Status</th>
                    <th className="px-4 py-3 font-bold w-36">Priority</th>
                    <th className="px-4 py-3 font-bold w-36">Due Date</th>
                    <th className="px-4 py-3 font-bold w-40">Lead Owner</th>
                    <th className="px-4 py-3 font-bold w-40">Deal Context</th>
                    <th className="px-4 py-3 font-bold w-16 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTasks.map(task => (
                    <tr key={task.id} className={`transition-colors ${selectedTaskIds.has(task.id) ? 'bg-purple-50/50' : 'hover:bg-muted/20 even:bg-muted/5'}`}>
                      <td className="px-4 py-3 text-center"><input type="checkbox" className="rounded text-purple-600 focus:ring-purple-500" checked={selectedTaskIds.has(task.id)} onChange={() => toggleTaskSelection(task.id)} /></td>
                      <td className="px-4 py-3">
                        <p className="font-bold cursor-pointer hover:text-primary transition-colors" onClick={() => setViewingTask(task)}>{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">{task.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={task.status} onValueChange={(v) => updateTaskField(task.id, 'status', v)}>
                          <SelectTrigger className="h-7 text-xs bg-transparent border-border/50 hover:bg-muted/50"><SelectValue /></SelectTrigger>
                          <SelectContent>{columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={task.priority} onValueChange={(v) => updateTaskField(task.id, 'priority', v)}>
                          <SelectTrigger className="h-7 text-xs bg-transparent border-border/50 hover:bg-muted/50">
                            <span className={PriorityStyle(task.priority)}><SelectValue /></span>
                          </SelectTrigger>
                          <SelectContent><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <input type="date" value={task.dueDate} onChange={(e) => updateTaskField(task.id, 'dueDate', e.target.value)} className="h-7 w-full text-xs rounded-md border border-border/50 bg-transparent px-2 hover:bg-muted/50 focus:bg-background outline-none focus:ring-1" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2"><Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary/10">{task.assignee.avatar}</AvatarFallback></Avatar><span className="text-xs font-semibold">{task.assignee.name}</span></div>
                      </td>
                      <td className="px-4 py-3">
                        {task.dealReference ? (
                          <div className="flex flex-col"><span className="text-xs font-bold text-blue-600 truncate">{task.dealReference.name}</span><span className="text-[10px] text-muted-foreground">{task.dealReference.value} &bull; {task.dealReference.stage}</span></div>
                        ) : <span className="text-xs text-muted-foreground italic">No context</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-rose-600" onClick={() => setTasks(prev => prev.filter(t => t.id !== task.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </div>
        )}

        {/* E. Calendar View */}
        {view === 'Calendar' && (
          <div className="h-full bg-card border shadow-sm rounded-xl overflow-hidden flex flex-col">
            <div className="grid grid-cols-7 border-b bg-muted/30 shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1 min-h-0 overflow-y-auto auto-rows-fr">
              {getCalendarDays().map((day, i) => {
                const dayTasks = filteredTasks.filter(t => t.dueDate === day.dateStr);
                return (
                  <div key={i} className={`border-b border-r p-1.5 flex flex-col gap-1 transition-colors hover:bg-muted/10 cursor-pointer ${day.isCurrentMonth ? 'bg-background' : 'bg-muted/20'}`} onClick={() => setIsNewTaskOpen(true)}>
                    <div className="text-right mb-1">
                      <span className={`text-[10px] font-bold w-5 h-5 inline-flex items-center justify-center rounded-full ${day.dateStr === '2026-08-15' ? 'bg-purple-600 text-white' : 'text-muted-foreground'}`}>{day.dayNum}</span>
                    </div>
                    {dayTasks.map(t => (
                      <div key={t.id} className="bg-purple-100 text-purple-800 border border-purple-200 rounded px-1.5 py-1 text-[9px] font-bold truncate shadow-sm cursor-default" onClick={e=>{e.stopPropagation(); setViewingTask(t);}}>
                        {t.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* 5. Modals */}
      
      {/* New Task Modal */}
      <Dialog open={isNewTaskOpen} onOpenChange={setIsNewTaskOpen}>
        <DialogContent className="sm:max-w-[500px] p-8 bg-[#fdfcff] dark:bg-card border-0 shadow-2xl rounded-[1.5rem] gap-6" hideCloseIcon>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-black text-[#1e1a4f] dark:text-slate-100 tracking-tight font-serif">Schedule New Task</DialogTitle>
            <button className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors" onClick={() => setIsNewTaskOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Task Title</Label>
              <Input placeholder="e.g. Audit regional liabilities" className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 placeholder:text-purple-400 dark:placeholder:text-slate-500 rounded-xl px-4 font-medium focus-visible:ring-purple-500" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Initial Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-medium focus:ring-purple-500"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="To Do">To Do</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Review">Review</SelectItem><SelectItem value="Done">Done</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Priority</Label>
                <Select value={formPriority} onValueChange={(v: TaskPriority) => setFormPriority(v)}>
                  <SelectTrigger className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-medium focus:ring-purple-500"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="Urgent">Urgent</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider block">Label Tags</Label>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#4f46e5] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#4f46e5]/50 transition-all"></div>
                <div className="w-7 h-7 rounded-full bg-[#3b82f6] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#3b82f6]/50 transition-all"></div>
                <div className="w-7 h-7 rounded-full bg-[#10b981] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#10b981]/50 transition-all"></div>
                <div className="w-7 h-7 rounded-full bg-[#f59e0b] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#f59e0b]/50 transition-all"></div>
                <div className="w-7 h-7 rounded-full bg-[#ef4444] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#ef4444]/50 transition-all"></div>
                <div className="w-7 h-7 rounded-full bg-[#ec4899] cursor-pointer ring-2 ring-offset-2 ring-transparent dark:ring-offset-background hover:ring-[#ec4899]/50 transition-all"></div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Date</Label>
                <Input type="date" className="h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 placeholder:text-purple-400 dark:placeholder:text-slate-500 rounded-xl px-4 font-medium focus-visible:ring-purple-500" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Assignees</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-11 bg-purple-50/50 dark:bg-slate-900 border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 rounded-xl px-4 font-medium hover:bg-purple-100/50 dark:hover:bg-slate-800 focus:ring-purple-500">
                      <div className="flex items-center gap-2 truncate">
                        {formAssigneeIds.length > 0 ? (
                          <div className="flex -space-x-2">
                            {members.filter(m => formAssigneeIds.includes(m.id)).slice(0, 3).map(m => (
                              <Avatar key={m.id} className="h-6 w-6 border-2 border-background">
                                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{m.avatar}</AvatarFallback>
                              </Avatar>
                            ))}
                            {formAssigneeIds.length > 3 && (
                              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold">
                                +{formAssigneeIds.length - 3}
                              </div>
                            )}
                          </div>
                        ) : "Select Assignees"}
                        {formAssigneeIds.length > 0 && <span className="ml-2">{formAssigneeIds.length} Selected</span>}
                      </div>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-xl border-border/50">
                    <div className="max-h-48 overflow-y-auto space-y-1 mb-2">
                      {members.map(member => (
                        <div 
                          key={member.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => setFormAssigneeIds(prev => prev.includes(member.id) ? prev.filter(id => id !== member.id) : [...prev, member.id])}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{member.avatar}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{member.name}</span>
                          </div>
                          {formAssigneeIds.includes(member.id) && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 p-1 border-t border-border/50 mt-1 pt-2">
                      <Input 
                        placeholder="New member name..." 
                        value={newMemberName}
                        onChange={e => setNewMemberName(e.target.value)}
                        onKeyDown={e => e.stopPropagation()}
                        className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                      />
                      <Button size="sm" onClick={(e) => handleAddNewMember(e, 'task')} className="h-8 shrink-0 bg-primary/90 text-white">Add</Button>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase text-purple-600 dark:text-white tracking-wider">Description</Label>
              <textarea placeholder="Provide more details..." className="w-full min-h-[80px] bg-purple-50/50 dark:bg-slate-900 border border-purple-100 dark:border-slate-800 text-purple-900 dark:text-slate-100 placeholder:text-purple-400 dark:placeholder:text-slate-500 rounded-xl p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" className="h-11 px-6 rounded-[2rem] border-purple-200 dark:border-slate-700 text-[#1e1a4f] dark:text-slate-200 font-bold hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-[#1e1a4f] dark:hover:text-slate-100" onClick={() => setIsNewTaskOpen(false)}>Cancel</Button>
            <Button className="h-11 px-6 rounded-[2rem] bg-[#8b5cf6] hover:bg-[#7c3aed] dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-white font-bold shadow-md" onClick={handleCreateTask}>Schedule Task</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Details Modal */}
      <Dialog open={!!viewingTask} onOpenChange={(open) => { if(!open) setViewingTask(null); }}>
        <DialogContent className="max-w-[90vw] md:max-w-[70vw] h-[85vh] p-0 bg-background shadow-2xl border-border/60 flex flex-col overflow-hidden rounded-2xl">
          {viewingTask && (
            <>
              <DialogHeader className="p-8 border-b shrink-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 flex flex-col items-start justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                <div className="space-y-4 relative z-10 w-full">
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur text-foreground border-border uppercase tracking-widest text-[10px] font-bold px-3 py-1 shadow-sm">{viewingTask.status}</Badge>
                    <Badge variant="secondary" className={`uppercase tracking-widest text-[10px] font-bold px-3 py-1 shadow-sm border ${PriorityStyle(viewingTask.priority)} bg-background/80 backdrop-blur`}>{viewingTask.priority} Priority</Badge>
                  </div>
                  <DialogTitle className="text-3xl font-black leading-tight tracking-tight text-foreground">{viewingTask.title}</DialogTitle>
                </div>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-8 flex flex-col md:flex-row gap-8 bg-muted/10">
                <div className="flex-1 space-y-10">
                  {viewingTask.description && (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><LayoutList className="w-4 h-4"/> Description</h4>
                      <div className="bg-card border border-border/50 rounded-xl p-5 text-[15px] leading-relaxed shadow-sm">
                        {viewingTask.description}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Subtasks</h4>
                      <Button variant="outline" size="sm" className="h-7 text-[11px] rounded-full px-4 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary" onClick={() => setIsAddingSubtask(true)}>
                        <Plus className="w-3 h-3 mr-1"/> Add Subtask
                      </Button>
                    </div>
                    <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-hidden">
                      {(viewingTask.subtasks?.length || 0) === 0 && !isAddingSubtask ? (
                        <div className="p-8 flex flex-col items-center justify-center text-center">
                          <CheckCircle2 className="w-10 h-10 text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground font-medium">Break this task down into smaller steps.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/50">
                          {viewingTask.subtasks?.map(s => {
                            const isExpanded = expandedSubtasks.has(s.id);
                            return (
                              <div key={s.id} className="flex flex-col hover:bg-muted/30 transition-colors group">
                                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => toggleSubtaskExpansion(s.id)}>
                                  <div className="flex items-center gap-4 flex-1">
                                    <input 
                                      type="checkbox" 
                                      checked={s.completed} 
                                      onChange={(e) => { e.stopPropagation(); toggleSubtaskCompletion(s.id); }}
                                      className="rounded border-muted-foreground/50 text-primary focus:ring-primary w-5 h-5 cursor-pointer shadow-sm" 
                                    />
                                    <div className="flex flex-col">
                                      <span className={`text-[15px] font-medium transition-all ${s.completed ? 'line-through text-muted-foreground opacity-70' : 'text-foreground'}`}>{s.title}</span>
                                      <div className="flex items-center gap-2 mt-1">
                                        {s.dueDate && !isExpanded && <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{s.dueDate}</span>}
                                        {s.assignees && s.assignees.length > 0 && !isExpanded && (
                                          <div className="flex -space-x-1.5 overflow-hidden">
                                            {s.assignees.slice(0, 3).map((a, i) => (
                                              <Avatar key={a.id || i} className="h-4 w-4 border border-background" title={a.name}>
                                                <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{a.avatar}</AvatarFallback>
                                              </Avatar>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="w-6 h-6 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                  </Button>
                                </div>
                                {isExpanded && (
                                  <div className="px-12 pb-4 pt-1 space-y-3 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-4 flex-wrap">
                                      {s.dueDate && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-primary/80 bg-primary/10 w-fit px-2 py-1 rounded-md">
                                          <CalendarIcon className="w-3 h-3" /> Due: {s.dueDate}
                                        </div>
                                      )}
                                      {s.assignees && s.assignees.length > 0 && (
                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted/40 w-fit px-2 py-1 rounded-md">
                                          <div className="flex -space-x-1.5 overflow-hidden">
                                            {s.assignees.map((a, i) => (
                                              <Avatar key={a.id || i} className="h-4 w-4 border border-background" title={a.name}>
                                                <AvatarFallback className="text-[7px] bg-primary/10 text-primary font-bold">{a.avatar}</AvatarFallback>
                                              </Avatar>
                                            ))}
                                          </div>
                                          <span>{s.assignees.map(a => a.name).join(', ')}</span>
                                        </div>
                                      )}
                                    </div>
                                    {s.description && (
                                      <div className="text-[13px] text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border border-border/30">
                                        {s.description}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {isAddingSubtask && (
                        <div className="p-4 flex flex-col gap-3 bg-primary/5 border-t border-primary/10">
                          <div className="flex items-center gap-4">
                            <input type="checkbox" disabled className="rounded border-primary/30 w-5 h-5 bg-background shrink-0" />
                            <Input 
                              autoFocus 
                              value={newSubtaskTitle} 
                              onChange={e => setNewSubtaskTitle(e.target.value)} 
                              placeholder="What needs to be done?"
                              className="h-10 text-[15px] bg-background border-primary/20 focus-visible:ring-primary shadow-inner px-3 flex-1 rounded-lg"
                              onKeyDown={e => {
                                if (e.key === 'Escape') { setIsAddingSubtask(false); setNewSubtaskTitle(''); setNewSubtaskDescription(''); setNewSubtaskDueDate(''); }
                              }}
                            />
                            <Input 
                              type="date"
                              value={newSubtaskDueDate}
                              onChange={e => setNewSubtaskDueDate(e.target.value)}
                              className="h-10 text-xs bg-background border-primary/20 focus-visible:ring-primary shadow-inner px-3 w-[140px] rounded-lg shrink-0"
                            />
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-10 border-primary/20 bg-background text-[11px] font-bold px-3 rounded-lg shadow-inner shrink-0">
                                  {newSubtaskAssigneeIds.length > 0 ? (
                                    <div className="flex -space-x-2 mr-2">
                                      {members.filter(m => newSubtaskAssigneeIds.includes(m.id)).slice(0, 3).map(m => (
                                        <Avatar key={m.id} className="h-5 w-5 border-2 border-background">
                                          <AvatarFallback className="text-[8px]">{m.avatar}</AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                  ) : "Assign"}
                                  {newSubtaskAssigneeIds.length > 0 ? `${newSubtaskAssigneeIds.length} Assigned` : "+ Assign"}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-border/50">
                                <div className="space-y-1 mb-2">
                                  {members.map(member => (
                                    <div 
                                      key={member.id}
                                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                      onClick={() => setNewSubtaskAssigneeIds(prev => prev.includes(member.id) ? prev.filter(id => id !== member.id) : [...prev, member.id])}
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{member.avatar}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{member.name}</span>
                                      </div>
                                      {newSubtaskAssigneeIds.includes(member.id) && <Check className="w-4 h-4 text-primary" />}
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2 p-1 border-t border-border/50 mt-1 pt-2">
                                  <Input 
                                    placeholder="New member..." 
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                    onKeyDown={e => e.stopPropagation()}
                                    className="h-8 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                                  />
                                  <Button size="sm" onClick={(e) => handleAddNewMember(e, 'subtask')} className="h-8 shrink-0 bg-primary/90">Add</Button>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div className="pl-9 flex gap-3 items-end">
                            <textarea
                              value={newSubtaskDescription}
                              onChange={e => setNewSubtaskDescription(e.target.value)}
                              placeholder="Add more details or context..."
                              className="w-full min-h-[60px] text-sm bg-background border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary shadow-inner p-3 rounded-lg resize-none"
                            />
                            <Button size="icon" onClick={handleAddSubtask} className="h-10 w-10 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md rounded-xl">
                              <Check className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-[320px] shrink-0 space-y-6">
                  <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6 sticky top-0">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Assignees</span>
                      <div className="flex flex-col gap-2 bg-muted/40 p-3 rounded-xl border border-border/50 max-h-48 overflow-y-auto">
                        {(viewingTask.assignees || (viewingTask.assignee ? [viewingTask.assignee] : [])).map(assignee => (
                          <div key={assignee.id} className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border-2 border-background shadow-sm ring-1 ring-border/50">
                              <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary to-primary/60 text-white font-bold">{assignee.avatar}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="text-[13px] font-bold block leading-tight">{assignee.name}</span>
                              <span className="text-[9px] text-muted-foreground font-medium">Assignee</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-border/50">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Due Date</span>
                      <div className="flex items-center gap-3 text-sm font-bold bg-muted/40 p-3 rounded-xl border border-border/50">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        {viewingTask.dueDate}
                      </div>
                    </div>
                    {viewingTask.dealReference && (
                      <div className="space-y-2 pt-4 border-t border-border/50">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Linked Deal</span>
                        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-primary text-sm font-bold flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          {viewingTask.dealReference.name}
                        </div>
                      </div>
                    )}
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
