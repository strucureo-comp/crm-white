'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Search, Plus, X, UploadCloud, FileText, Mail, FileIcon, MessageSquare,
  CheckCircle2, AlertCircle, Cloud, MoreHorizontal, Calendar, FolderOpen,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { useAuth } from '@/lib/firebase/auth-context';
import {
  ProjectStatus, TaskStatus, TaskPriority,
  Project, Member, Task, ProjectsData,
  subscribeToProjectsData, createProject, updateProject, deleteProject,
  createTask, updateTask, deleteTask,
  createMember, updateMember, deleteMember
} from '@/lib/db/projects/api';

const COLUMNS: ProjectStatus[] = ['Kick-off', 'Planning', 'Implementation', 'Review', 'Closing'];

// --- Mock Data ---
const MOCK_MEMBERS: Member[] = [
  { id: 'm1', name: 'Alex Rivera', avatar: 'AR' },
  { id: 'm2', name: 'Sarah Jones', avatar: 'SJ' },
  { id: 'm3', name: 'Mike Thomas', avatar: 'MT' }
];

const MOCK_PROJECTS: Project[] = [
  {
    id: 'p1', name: 'Website Redesign 2026', status: 'Planning', color: '#8b5cf6', members: ['m1', 'm2'],
    linkedDeal: 'Acme Corp Upgrade', emoji: '🎨', startDate: '2026-08-01', endDate: '2026-10-15',
    budget: { est: 15000, actual: 2500 }, progress: 35
  },
  {
    id: 'p2', name: 'Q3 Ad Campaign', status: 'Kick-off', color: '#ec4899', members: ['m3'],
    linkedDeal: null, emoji: '📢', startDate: '2026-07-15', endDate: '2026-09-30',
    budget: { est: 5000, actual: 0 }, progress: 5
  }
];

const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Wireframe Homepage', projectId: 'p1', owner: 'm1', status: 'Done', priority: 'High', due: '2026-08-10', phase: 'Planning' },
  { id: 't2', title: 'Approve Copywriting', projectId: 'p1', owner: 'm2', status: 'To Do', priority: 'Urgent', due: '2026-08-15', phase: 'Planning' }
];

// --- Helpers ---
const CircularProgress = ({ progress, color }: { progress: number, color: string }) => {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
      <svg className="w-8 h-8 -rotate-90">
        <circle className="text-muted/30" strokeWidth="3" stroke="currentColor" fill="transparent" r={radius} cx="16" cy="16" />
        <circle strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke={color} fill="transparent" r={radius} cx="16" cy="16" />
      </svg>
      <span className="absolute text-[8px] font-bold">{progress}%</span>
    </div>
  );
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [search, setSearch] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!user?.company_id) return;
    const unsubscribe = subscribeToProjectsData(user.company_id, (data: ProjectsData) => {
      setProjects(data.projects);
      setMembers(data.members);
      setTasks(data.tasks);

      // Update selected project if it exists so overlay stays current
      if (selectedProject) {
        setSelectedProject(prev => data.projects.find(p => p.id === prev?.id) || null);
      }
    });
    return () => unsubscribe();
  }, [user?.company_id, selectedProject?.id]);

  // Overlay Tabs
  const [activeTab, setActiveTab] = useState<'Plan' | 'Files' | 'Notes' | 'Emails' | 'Documents'>('Plan');

  // Create Form State
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');
  const [formBudget, setFormBudget] = useState('10000');
  const [formMembers, setFormMembers] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState('');

  // Inline Task Form State
  const [addingTaskPhase, setAddingTaskPhase] = useState<ProjectStatus | null>(null);
  const [taskFormTitle, setTaskFormTitle] = useState('');
  const [taskFormOwner, setTaskFormOwner] = useState('');
  const [taskFormDue, setTaskFormDue] = useState('');
  const [taskFormPriority, setTaskFormPriority] = useState<TaskPriority>('Normal');

  // Derived
  const filteredProjects = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Handlers
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    if (!user?.company_id) return;
    try {
      await updateProject(user.company_id, draggableId, { status: destination.droppableId as ProjectStatus });
      toast.success(`Moved to ${destination.droppableId}`);
    } catch (e) {
      toast.error('Failed to move project');
    }
  };

  const handleCreateProject = async () => {
    if (!user?.company_id) return;
    if (!formName.trim()) return toast.error('Project name is required');

    const newProject = {
      name: formName,
      status: 'Kick-off' as ProjectStatus,
      color: formColor,
      members: formMembers,
      linkedDeal: null,
      emoji: '📁',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      budget: { est: Number(formBudget) || 0, actual: 0 },
      progress: 0
    };

    try {
      await createProject(user.company_id, newProject);
      setIsCreateOpen(false);
      toast.success('Project created successfully');

      // Reset
      setFormName('');
      setFormColor('#6366f1');
      setFormBudget('10000');
      setFormMembers([]);
    } catch (e) {
      toast.error('Failed to create project');
    }
  };

  const handleAddNewMember = async (e: React.MouseEvent) => {
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
      if (newId) setFormMembers(prev => [...prev, newId]);
      setNewMemberName('');
    } catch (err) {
      toast.error('Failed to add member');
    }
  };

  const handleCreateTask = async (phase: ProjectStatus) => {
    if (!user?.company_id) return;
    if (!taskFormTitle.trim()) return toast.error('Task title is required');
    if (!taskFormOwner) return toast.error('Assignee is required');

    const newTask = {
      title: taskFormTitle,
      projectId: selectedProject!.id,
      owner: taskFormOwner,
      status: 'To Do' as TaskStatus,
      priority: taskFormPriority,
      due: taskFormDue || 'No due date',
      phase
    };

    try {
      await createTask(user.company_id, newTask);
      setAddingTaskPhase(null);
      setTaskFormTitle('');
      setTaskFormOwner('');
      setTaskFormDue('');
      setTaskFormPriority('Normal');
      toast.success('Task created successfully');
    } catch (e) {
      toast.error('Failed to create task');
    }
  };

  const toggleFormMember = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFormMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  if (!isMounted) return null;

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">

      {/* 2. Global Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Project Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage projects across different phases</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background focus-visible:ring-1"
            />
          </div>
          <Button variant="outline" onClick={() => setIsCreateOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      </div>

      {/* 3. Project Board (Kanban View) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-5 overflow-x-auto h-full pb-4 items-start">
            {COLUMNS.map(col => {
              const colProjects = filteredProjects.filter(p => p.status === col);

              return (
                <div key={col} className="flex-shrink-0 w-[300px] flex flex-col max-h-full">
                  <div className="flex items-center gap-2 mb-4 px-1 shrink-0">
                    <h3 className="font-semibold text-sm uppercase tracking-wider">{col}</h3>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground px-1.5 py-0 text-xs">
                      {colProjects.length}
                    </Badge>
                  </div>

                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto space-y-3 min-h-[150px] transition-colors rounded-xl p-2 -mx-2 ${snapshot.isDraggingOver ? 'bg-muted/40' : ''}`}
                      >
                        {colProjects.map((project, index) => (
                          <Draggable key={project.id} draggableId={project.id} index={index}>
                            {(provided, snapshot) => (
                              <Card
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedProject(project)}
                                className={`cursor-pointer transition-all border shadow-sm hover:shadow-md bg-background group
                                  ${snapshot.isDragging ? 'shadow-xl ring-2 ring-primary/20 rotate-2' : 'hover:border-primary/30'}
                                `}
                                style={{ ...provided.draggableProps.style }}
                              >
                                <CardContent className="p-4 space-y-4">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex gap-2.5">
                                      <span className="text-2xl leading-none">{project.emoji}</span>
                                      <h4 className="font-bold text-sm leading-tight text-foreground line-clamp-2">{project.name}</h4>
                                    </div>
                                    <CircularProgress progress={project.progress} color={project.color} />
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                                    <span className="font-medium">{project.endDate ? `Due ${new Date(project.endDate).toLocaleDateString()}` : 'No due date'}</span>

                                    <div className="flex -space-x-2">
                                      {project.members.map(mid => {
                                        const mem = members.find(m => m.id === mid);
                                        if (!mem) return null;
                                        return (
                                          <Avatar key={mid} className="h-6 w-6 border-2 border-background shadow-sm" title={mem.name}>
                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">{mem.avatar}</AvatarFallback>
                                          </Avatar>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {/* 4. Create Project Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background/95 backdrop-blur-xl border-border/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Project Name</Label>
              <Input placeholder="E.g. Q4 Website Redesign" value={formName} onChange={e => setFormName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color Theme</Label>
                <div className="flex items-center gap-3">
                  <Input type="color" value={formColor} onChange={e => setFormColor(e.target.value)} className="w-12 h-10 p-1 cursor-pointer" />
                  <span className="text-sm font-mono text-muted-foreground uppercase">{formColor}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Est Budget ($)</Label>
                <Input type="number" value={formBudget} onChange={e => setFormBudget(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Assign Members</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal">
                    {formMembers.length > 0 ? `${formMembers.length} member(s) selected` : 'Select members...'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[450px] p-0" onClick={e => e.stopPropagation()}>
                  <div className="max-h-[200px] overflow-y-auto p-1">
                    {members.map(m => (
                      <div
                        key={m.id}
                        onClick={(e) => toggleFormMember(m.id, e)}
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted rounded-md cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary/10 text-primary">{m.avatar}</AvatarFallback></Avatar>
                          <span className="text-sm">{m.name}</span>
                        </div>
                        {formMembers.includes(m.id) && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t bg-muted/30 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Input placeholder="Add new member name..." value={newMemberName} onChange={e => setNewMemberName(e.target.value)} className="h-8 text-xs" />
                    <Button size="sm" onClick={handleAddNewMember} className="h-8">Add</Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateProject}>Create Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Project Detail Overlay (Full-Screen Modal) */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) setSelectedProject(null); }}>
        <DialogContent className="max-w-[90vw] h-[90vh] p-0 overflow-hidden flex bg-background shadow-2xl border-border/60">
          {selectedProject && (
            <>
              {/* A. Left Sidebar */}
              <div className="w-[320px] shrink-0 border-r bg-muted/10 flex flex-col">
                <div className="p-6 pb-0 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-4xl">{selectedProject.emoji}</span>
                    <h2 className="text-xl font-bold leading-tight mt-2">{selectedProject.name}</h2>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{selectedProject.status}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setSelectedProject(null)}>
                    <X size={18} />
                  </Button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>Progress</span>
                      <span style={{ color: selectedProject.color }}>{selectedProject.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${selectedProject.progress}%`, backgroundColor: selectedProject.color }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b pb-2">Dates</h4>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Start Date</span>
                      <span className="font-semibold">{selectedProject.startDate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="font-semibold">{selectedProject.endDate || 'Not set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time Tracked</span>
                      <span className="font-semibold">0h 0m</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b pb-2">Team</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.members.map(mid => {
                        const mem = members.find(m => m.id === mid);
                        if (!mem) return null;
                        return (
                          <Badge key={mid} variant="secondary" className="pl-1 pr-2 py-1 gap-1.5 bg-background border shadow-sm">
                            <Avatar className="h-4 w-4"><AvatarFallback className="text-[7px] bg-primary/10 text-primary">{mem.avatar}</AvatarFallback></Avatar>
                            <span className="font-medium text-xs">{mem.name}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-bold border-b pb-2">Linked Entities</h4>
                    {selectedProject.linkedDeal ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{selectedProject.linkedDeal}</Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No links attached</p>
                    )}
                  </div>
                </div>
              </div>

              {/* B. Right Panel (Tabs Area) */}
              <div className="flex-1 flex flex-col min-w-0 bg-background">
                <div className="flex px-6 border-b shrink-0 pt-4 gap-6 overflow-x-auto">
                  {(['Plan', 'Files', 'Notes', 'Emails', 'Documents'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`pb-3 text-sm transition-colors whitespace-nowrap ${activeTab === tab ? 'font-bold text-foreground border-b-[3px] border-purple-500' : 'font-medium text-muted-foreground hover:text-foreground'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">

                  {/* PLAN TAB */}
                  {activeTab === 'Plan' && (
                    <div className="space-y-8">
                      {COLUMNS.map(phase => {
                        const phaseTasks = tasks.filter(t => t.projectId === selectedProject.id && t.phase === phase);
                        return (
                          <div key={phase} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold">{phase}</h3>
                              <Badge variant="secondary" className="text-xs px-1.5 py-0">{phaseTasks.length}</Badge>
                            </div>

                            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
                              <table className="w-full text-sm text-left">
                                <tbody className="divide-y divide-border">
                                  {phaseTasks.map(task => {
                                    const owner = members.find(m => m.id === task.owner);
                                    return (
                                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="w-12 px-4 py-3 text-center">
                                          <input type="checkbox" checked={task.status === 'Done'} readOnly className="w-4 h-4 rounded border-muted-foreground text-primary focus:ring-primary" />
                                        </td>
                                        <td className={`px-4 py-3 font-medium ${task.status === 'Done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                          {task.title}
                                        </td>
                                        <td className="px-4 py-3 w-40">
                                          {owner && (
                                            <div className="flex items-center gap-2">
                                              <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary/10 text-primary">{owner.avatar}</AvatarFallback></Avatar>
                                              <span className="text-xs text-muted-foreground">{owner.name}</span>
                                            </div>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 w-32 text-xs text-muted-foreground">{task.due}</td>
                                        <td className="px-4 py-3 w-28">
                                          <Badge variant="outline" className={`text-[10px] ${task.priority === 'Urgent' ? 'bg-red-50 text-red-600 border-red-200' : task.priority === 'High' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600'}`}>
                                            {task.priority}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              <div className="p-2 bg-muted/20 border-t">
                                {addingTaskPhase === phase ? (
                                  <div className="flex items-center gap-2 bg-background p-2 rounded border shadow-sm flex-wrap sm:flex-nowrap">
                                    <Input placeholder="Task subject" value={taskFormTitle} onChange={e => setTaskFormTitle(e.target.value)} className="h-8 text-xs flex-1 min-w-[150px]" autoFocus />
                                    <Select value={taskFormOwner} onValueChange={setTaskFormOwner}>
                                      <SelectTrigger className="h-8 text-xs w-[120px]"><SelectValue placeholder="Assignee" /></SelectTrigger>
                                      <SelectContent>
                                        {selectedProject.members.map(mid => {
                                          const m = members.find(m => m.id === mid);
                                          return m ? <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem> : null;
                                        })}
                                      </SelectContent>
                                    </Select>
                                    <Input type="date" value={taskFormDue} onChange={e => setTaskFormDue(e.target.value)} className="h-8 text-xs w-[130px]" />
                                    <Select value={taskFormPriority} onValueChange={(v: TaskPriority) => setTaskFormPriority(v)}>
                                      <SelectTrigger className="h-8 text-xs w-[100px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Normal">Normal</SelectItem>
                                        <SelectItem value="High">High</SelectItem>
                                        <SelectItem value="Urgent">Urgent</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={() => handleCreateTask(phase)} className="h-8 text-xs">Add</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setAddingTaskPhase(null)} className="h-8 text-xs">Cancel</Button>
                                  </div>
                                ) : (
                                  <Button variant="ghost" size="sm" onClick={() => setAddingTaskPhase(phase)} className="w-full justify-start text-muted-foreground hover:text-foreground h-8 text-xs">
                                    <Plus className="w-3 h-3 mr-2" /> + Task / Activity / Milestone
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FILES TAB */}
                  {activeTab === 'Files' && (
                    <div className="space-y-6 h-full flex flex-col">
                      <div className="flex items-center justify-between border-b pb-4 shrink-0">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">All</Badge>
                          <Badge variant="outline" className="cursor-pointer">Deal files</Badge>
                          <Badge variant="outline" className="cursor-pointer">Project files</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          Expand all items <Switch />
                        </div>
                      </div>
                      <div className="border-2 border-dashed border-emerald-500/30 rounded-xl bg-emerald-500/5 p-8 flex flex-col items-center justify-center text-center shrink-0">
                        <UploadCloud className="w-10 h-10 text-emerald-600 mb-3" />
                        <p className="font-bold mb-4">Drag and drop files here</p>
                        <div className="flex gap-3">
                          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">Upload files</Button>
                          <Button variant="outline" className="bg-background">Connect to Google Drive</Button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <FileIcon className="w-16 h-16 mb-4" />
                        <p className="font-bold">No files added yet</p>
                      </div>
                    </div>
                  )}

                  {/* NOTES TAB */}
                  {activeTab === 'Notes' && (
                    <div className="space-y-6 h-full flex flex-col">
                      <div className="bg-card border shadow-sm rounded-xl p-4 shrink-0 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[10px] bg-primary text-primary-foreground">ME</AvatarFallback></Avatar>
                            <span className="text-sm font-bold">Current User</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold">✅ Complete</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground font-bold">✖ Cancel</Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                          </div>
                        </div>
                        <textarea className="w-full bg-transparent border-0 focus:ring-0 resize-none h-16 text-sm placeholder:text-muted-foreground/60 p-0" placeholder="Take a note, @name..."></textarea>
                      </div>
                      <div className="flex items-center justify-between border-b pb-4 shrink-0">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">All</Badge>
                          <Badge variant="outline" className="cursor-pointer">Deal notes</Badge>
                          <Badge variant="outline" className="cursor-pointer">Project notes</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          Expand all items <Switch />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <MessageSquare className="w-16 h-16 mb-4" />
                        <p className="font-bold">No notes added yet</p>
                      </div>
                    </div>
                  )}

                  {/* EMAILS TAB */}
                  {activeTab === 'Emails' && (
                    <div className="space-y-6 h-full flex flex-col">
                      <div className="bg-background border shadow-sm rounded-lg p-3 text-sm text-muted-foreground cursor-text hover:border-primary/50 transition-colors shrink-0">
                        Click here to add an email...
                      </div>
                      <div className="flex items-center justify-between border-b pb-4 shrink-0">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">All</Badge>
                          <Badge variant="outline" className="cursor-pointer">Deal emails</Badge>
                          <Badge variant="outline" className="cursor-pointer">Project emails</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                          Expand all items <Switch />
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Mail className="w-16 h-16 mb-4" />
                        <p className="font-bold">No emails linked yet</p>
                      </div>
                    </div>
                  )}

                  {/* DOCUMENTS TAB */}
                  {activeTab === 'Documents' && (
                    <div className="space-y-6 h-full flex flex-col">
                      <div className="flex items-center justify-between border-b pb-4 shrink-0">
                        <div className="flex gap-6 text-sm font-bold text-muted-foreground">
                          <span className="text-foreground border-b-2 border-primary pb-4 -mb-[18px]">Documents</span>
                          <span>Templates</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold">❓ Learn more</Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex gap-3 shrink-0">
                        <Button variant="outline" className="bg-background font-bold shadow-sm"><span className="mr-2">🖥️</span> Upload from device</Button>
                        <Button variant="outline" className="bg-background font-bold shadow-sm"><span className="mr-2">☁️</span> Connect cloud storage</Button>
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-4 opacity-70">Documents Created</p>
                        <FileText className="w-12 h-12 mb-3" />
                        <p className="font-bold text-sm">No documents created yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
