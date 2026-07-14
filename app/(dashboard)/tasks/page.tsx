'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Clock, Flag, MoreHorizontal, CheckSquare, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getTasks, updateTask, deleteTask } from '@/lib/firebase/database';
import type { TaskItem, TaskPriority, TaskStatus } from '@/lib/db/types';
import { TaskDialog } from '@/components/dialogs/task-dialog';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const priorityStyles: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  high: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  medium: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  low: 'bg-muted text-muted-foreground',
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    setLoading(true);
    const data = await getTasks();
    setTasks(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = tasks.filter((t) => {
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.title.toLowerCase().includes(s) || (t.project || '').toLowerCase().includes(s);
    }
    return true;
  });

  async function handleToggleStatus(task: TaskItem) {
    const next: TaskStatus = task.status === 'done' ? 'todo' : task.status === 'in_progress' ? 'done' : 'in_progress';
    try {
      await updateTask(task.id, { status: next });
      load();
    } catch {
      toast.error('Failed to update task');
    }
  }

  async function handleDelete(task: TaskItem) {
    setConfirmState({ open: true, id: task.id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteTask(id);
      toast.success('Task deleted');
      load();
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground">Stay on top of your daily tasks</p>
        </div>
        <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Add Task
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <CheckSquare size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No tasks yet</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="space-y-0">
              {filtered.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      task.status === 'done' ? 'bg-emerald-500' :
                      task.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-300'
                    }`} />
                    <button
                      className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-muted-foreground/30 shrink-0 hover:border-primary transition-colors"
                      onClick={() => handleToggleStatus(task)}
                    >
                      {task.status === 'done' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {task.project && <span className="flex items-center gap-1"><Flag size={10} />{task.project}</span>}
                          {task.due_date && <span className="flex items-center gap-1"><Clock size={10} />{new Date(task.due_date).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={task.status}
                          onValueChange={async (v: TaskStatus) => { try { await updateTask(task.id, { status: v }); load(); } catch { toast.error('Failed to update status'); } }}
                        >
                          <SelectTrigger className="w-24 sm:w-28 h-7 text-xs border-0 bg-muted/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">Todo</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                        <Badge variant="secondary" className={priorityStyles[task.priority] || ''}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Badge>
                        {task.assignee && (
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-muted">{task.assignee[0]}</AvatarFallback>
                          </Avatar>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal size={14} /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                              <Pencil size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(task)}>
                              <Trash2 size={14} className="mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        task={editingTask}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
