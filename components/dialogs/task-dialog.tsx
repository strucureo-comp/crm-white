'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createTask, updateTask } from '@/lib/firebase/database';
import type { TaskItem, TaskPriority, TaskStatus } from '@/lib/db/types';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  task?: TaskItem | null;
}

const defaultForm = {
  title: '',
  description: '',
  project: '',
  priority: 'medium' as TaskPriority,
  status: 'todo' as TaskStatus,
  due_date: '',
  assignee: '',
};

export function TaskDialog({ open, onOpenChange, onSaved, task }: TaskDialogProps) {
  const [form, setForm] = useState(() => task
    ? {
        title: task.title,
        description: task.description || '',
        project: task.project || '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        assignee: task.assignee || '',
      }
    : { ...defaultForm }
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      if (task) {
        await updateTask(task.id, { ...form, due_date: form.due_date || undefined });
        toast.success('Task updated');
      } else {
        await createTask({ ...form, due_date: form.due_date || undefined });
        toast.success('Task created');
      }
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Add Task'}</DialogTitle>
          <DialogDescription>
            {task ? 'Update the task details.' : 'Enter the task details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Follow up with lead" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Task details..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project">Project</Label>
                <Input id="project" value={form.project} onChange={(e) => set('project', e.target.value)} placeholder="Sales" />
              </div>
              <div>
                <Label htmlFor="assignee">Assignee</Label>
                <Input id="assignee" value={form.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Alice" />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={form.priority} onValueChange={(v: TaskPriority) => set('priority', v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v: TaskStatus) => set('status', v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">Todo</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="due_date">Due Date</Label>
                <Input id="due_date" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : task ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
