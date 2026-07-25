'use client';

import { useState, useEffect } from 'react';
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
import { createProject, updateProject } from '@/lib/firebase/database';
import type { Project, ProjectStatus } from '@/lib/db/types';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  project?: Project | null;
  defaultStatus?: string;
  defaultClientId?: string;
}

const defaultForm = {
  title: '',
  description: '',
  status: 'pending' as ProjectStatus,
  estimated_cost: 0,
  deadline: '',
  progress_percentage: 0,
  github_link: '',
  manual_client_name: '',
  manual_client_email: '',
  manual_client_company: '',
};

export function ProjectDialog({ open, onOpenChange, onSaved, project, defaultStatus, defaultClientId }: ProjectDialogProps) {
  const [form, setForm] = useState({ ...defaultForm, status: (defaultStatus as ProjectStatus) || 'pending' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        title: project.title,
        description: project.description,
        status: project.status,
        estimated_cost: project.estimated_cost || 0,
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        progress_percentage: project.progress_percentage || 0,
        github_link: project.github_link || '',
        manual_client_name: project.manual_client_name || '',
        manual_client_email: project.manual_client_email || '',
        manual_client_company: project.manual_client_company || '',
      });
    } else {
      setForm({ ...defaultForm, status: (defaultStatus as ProjectStatus) || 'pending' });
    }
  }, [project, defaultStatus]);

  function set<K extends keyof typeof defaultForm>(key: K, value: (typeof defaultForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Project title is required');
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await updateProject(project.id, { ...form, deadline: form.deadline || undefined });
        toast.success('Project updated');
      } else {
        await createProject({
          ...form,
          deadline: form.deadline || undefined,
          client_id: defaultClientId || '',
        });
        toast.success('Project created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update the project details.' : 'Enter the project details.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Website Redesign" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Project overview..." rows={3} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} onValueChange={(v: ProjectStatus) => set('status', v)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="testing">Testing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimated_cost">Estimated Cost ($)</Label>
              <Input id="estimated_cost" type="number" min={0} value={form.estimated_cost} onChange={(e) => set('estimated_cost', Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="progress">Progress (%)</Label>
              <Input id="progress" type="number" min={0} max={100} value={form.progress_percentage} onChange={(e) => set('progress_percentage', Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="github_link">GitHub Link</Label>
              <Input id="github_link" value={form.github_link} onChange={(e) => set('github_link', e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="col-span-2 border-t pt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Client Details (optional)</p>
            </div>
            <div>
              <Label htmlFor="manual_client_name">Client Name</Label>
              <Input id="manual_client_name" value={form.manual_client_name} onChange={(e) => set('manual_client_name', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="manual_client_email">Client Email</Label>
              <Input id="manual_client_email" type="email" value={form.manual_client_email} onChange={(e) => set('manual_client_email', e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="manual_client_company">Client Company</Label>
              <Input id="manual_client_company" value={form.manual_client_company} onChange={(e) => set('manual_client_company', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : project ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
