'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, MoreHorizontal, Pencil, Trash2, AlertCircle, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getProjects, updateProject, deleteProject } from '@/lib/firebase/database';
import type { Project, ProjectStatus } from '@/lib/db/types';
import { ProjectDialog } from '@/components/dialogs/project-dialog';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const statusColumns = [
  { key: 'pending', label: 'Pending' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'testing', label: 'Testing' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const userColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [columnDefaultStatus, setColumnDefaultStatus] = useState<string | undefined>(undefined);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped: Record<string, Project[]> = {};
  for (const col of statusColumns) {
    grouped[col.key] = projects.filter((p) => p.status === col.key);
  }

  async function handleStatusChange(project: Project, newStatus: ProjectStatus) {
    setMutatingIds((prev) => new Set(prev).add(project.id));
    try {
      await updateProject(project.id, { status: newStatus });
      toast.success('Project moved');
      load();
    } catch {
      toast.error('Failed to update project status');
    } finally {
      setMutatingIds((prev) => {
        const next = new Set(prev);
        next.delete(project.id);
        return next;
      });
    }
  }

  function handleDelete(project: Project) {
    setConfirmState({ open: true, id: project.id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteProject(id);
      toast.success('Project deleted');
      load();
    } catch {
      toast.error('Failed to delete project');
    } finally {
      setConfirmState({ open: false });
    }
  }

  function openNewProject(status?: string) {
    setEditingProject(null);
    setColumnDefaultStatus(status);
    setDialogOpen(true);
  }

  function openEditProject(project: Project) {
    setColumnDefaultStatus(undefined);
    setEditingProject(project);
    setDialogOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading projects...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle size={24} className="text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RotateCcw size={14} className="mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Projects</h2>
          <p className="text-sm text-muted-foreground">Manage projects with Kanban boards</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => openNewProject()} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            New Project
          </Button>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusColumns.map((col) => (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{col.label}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  {grouped[col.key]?.length || 0}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNewProject(col.key)}>
                <Plus size={12} />
              </Button>
            </div>
            <div className="space-y-3">
              {grouped[col.key]?.map((project, idx) => (
                <Card key={project.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium">{project.title}</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" aria-label="Project actions">
                            <MoreHorizontal size={12} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEditProject(project)}>
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(project)}>
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      <Select
                        value={project.status}
                        onValueChange={(v: ProjectStatus) => handleStatusChange(project, v)}
                        disabled={mutatingIds.has(project.id)}
                      >
                        <SelectTrigger className="h-6 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusColumns.map((c) => (
                            <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {project.progress_percentage !== undefined && (
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={project.progress_percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{project.progress_percentage}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {project.deadline ? (
                        <span>{new Date(project.deadline).toLocaleDateString()}</span>
                      ) : <span>—</span>}
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className={`text-[8px] text-white ${userColors[idx % userColors.length]}`}>
                          {project.title.split(' ').map(w => w[0]).slice(0, 2).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!grouped[col.key] || grouped[col.key].length === 0) && (
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">Empty</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        project={editingProject}
        defaultStatus={columnDefaultStatus}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete project"
        description="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
