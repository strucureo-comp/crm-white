'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Plus, MoreHorizontal, Building2, DollarSign, Clock,
  Pencil, Trash2, GripVertical, LayoutList, Columns, Settings2,
  Eye, X, Send, Bot,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { getLeads, updateLead, deleteLead, getPipelines, createPipeline, updatePipeline, deletePipeline } from '@/lib/firebase/database';
import type { Lead, LeadStatus, Pipeline, PipelineStage } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const DEFAULT_PIPELINE_STAGES: PipelineStage[] = [
  { id: 'qualified', name: 'Qualified', color: '#8b5cf6', order: 0 },
  { id: 'contacted', name: 'Contacted', color: '#f59e0b', order: 1 },
  { id: 'proposal', name: 'Proposal', color: '#a855f7', order: 2 },
  { id: 'negotiation', name: 'Negotiation', color: '#10b981', order: 3 },
  { id: 'won', name: 'Closed Won', color: '#22c55e', order: 4 },
  { id: 'lost', name: 'Closed Lost', color: '#ef4444', order: 5 },
];

const stageLabels: Record<string, string> = {
  qualified: 'Qualified',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Closed Won',
  lost: 'Closed Lost',
  new: 'New',
};

const stageColors: Record<string, string> = {
  qualified: 'bg-violet-500',
  contacted: 'bg-amber-500',
  proposal: 'bg-purple-500',
  negotiation: 'bg-emerald-500',
  won: 'bg-green-500',
  lost: 'bg-red-500',
  new: 'bg-blue-500',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const mockWhatsAppMessages = [
  { id: '1', sender: 'client', text: 'Hi, I wanted to check the status of my project.', time: '10:30 AM' },
  { id: '2', sender: 'internal', text: 'Sure! We are currently in the development phase. Should be ready for review next week.', time: '10:32 AM' },
  { id: '3', sender: 'client', text: 'Great, thanks for the update!', time: '10:33 AM' },
  { id: '4', sender: 'internal', text: 'I will keep you posted on any changes.', time: '10:34 AM' },
];

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Lead | null>(null);
  const [dealFormStage, setDealFormStage] = useState<LeadStatus>('qualified');

  const [boardDialogOpen, setBoardDialogOpen] = useState(false);
  const [boardDialogMode, setBoardDialogMode] = useState<'create' | 'rename' | 'delete'>('create');
  const [boardNameInput, setBoardNameInput] = useState('');

  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [stageDialogMode, setStageDialogMode] = useState<'create' | 'rename'>('create');
  const [stageNameInput, setStageNameInput] = useState('');
  const [stageColorInput, setStageColorInput] = useState('#8b5cf6');
  const [editingStageId, setEditingStageId] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });
  const [deleting, setDeleting] = useState<string | null>(null);

  const [viewDeal, setViewDeal] = useState<Lead | null>(null);
  const [viewDealOpen, setViewDealOpen] = useState(false);

  const [waReply, setWaReply] = useState('');
  const [waMessages, setWaMessages] = useState(mockWhatsAppMessages);

  const activePipeline = pipelines.find((p) => p.id === activePipelineId);
  const stages = activePipeline?.stages || DEFAULT_PIPELINE_STAGES;

  async function load() {
    try {
      const [leadData, pipelineData] = await Promise.all([getLeads(), getPipelines()]);
      setLeads(leadData);
      setPipelines(pipelineData);
      if (pipelineData.length > 0 && !activePipelineId) {
        setActivePipelineId(pipelineData[0].id);
      }
    } catch {
      //
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped: Record<string, Lead[]> = {};
  for (const stage of stages) {
    grouped[stage.id] = leads.filter((l) => l.status === stage.id);
  }

  const totalPipelineValue = leads.filter((l) => l.status !== 'lost').reduce((sum, l) => sum + (l.potential_value || 0), 0);
  const confirmedOrders = leads.filter((l) => l.status === 'won').reduce((sum, l) => sum + (l.potential_value || 0), 0);
  const activeDeals = leads.filter((l) => l.status !== 'won' && l.status !== 'lost').length;
  const avgDealSize = activeDeals > 0 ? Math.round(totalPipelineValue / (leads.length || 1)) : 0;

  async function handleStageChange(lead: Lead, newStage: LeadStatus) {
    try {
      await updateLead(lead.id, { status: newStage });
      toast.success(`Moved to ${stageLabels[newStage] || newStage}`);
      load();
    } catch {
      toast.error('Failed to move deal');
    }
  }

  function openDealDialog(stageKey?: string, lead?: Lead) {
    setEditingDeal(lead || null);
    setDealFormStage((lead?.status || stageKey || 'qualified') as LeadStatus);
    setDealDialogOpen(true);
  }

  async function handleDelete(lead: Lead) {
    setConfirmState({ open: true, id: lead.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setDeleting(confirmState.id);
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteLead(confirmState.id);
      toast.success('Deal deleted');
      load();
      setConfirmState({ open: false, loading: false });
    } catch {
      toast.error('Failed to delete deal');
      setConfirmState({ open: false, loading: false });
    } finally {
      setDeleting(null);
    }
  }

  function openBoardDialog(mode: 'create' | 'rename' | 'delete') {
    setBoardDialogMode(mode);
    setBoardNameInput(mode === 'rename' && activePipeline ? activePipeline.name : '');
    setBoardDialogOpen(true);
  }

  async function handleBoardSubmit() {
    if (!boardNameInput.trim()) {
      toast.error('Pipeline name is required');
      return;
    }
    try {
      if (boardDialogMode === 'create') {
        await createPipeline({ name: boardNameInput.trim(), stages: DEFAULT_PIPELINE_STAGES });
        toast.success('Pipeline created');
      } else if (boardDialogMode === 'rename' && activePipelineId) {
        await updatePipeline(activePipelineId, { name: boardNameInput.trim() });
        toast.success('Pipeline renamed');
      }
      setBoardDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to save pipeline');
    }
  }

  async function handleDeletePipeline() {
    if (!activePipelineId) return;
    try {
      await deletePipeline(activePipelineId);
      setActivePipelineId(null);
      toast.success('Pipeline deleted');
      setBoardDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to delete pipeline');
    }
  }

  function openStageDialog(mode: 'create' | 'rename', stageId?: string) {
    setStageDialogMode(mode);
    setEditingStageId(stageId || null);
    if (mode === 'rename' && stageId && activePipeline) {
      const stage = activePipeline.stages.find((s) => s.id === stageId);
      setStageNameInput(stage?.name || '');
      setStageColorInput(stage?.color || '#8b5cf6');
    } else {
      setStageNameInput('');
      setStageColorInput('#8b5cf6');
    }
    setStageDialogOpen(true);
  }

  async function handleStageSubmit() {
    if (!stageNameInput.trim()) {
      toast.error('Stage name is required');
      return;
    }
    if (!activePipelineId || !activePipeline) return;
    try {
      let updatedStages = [...activePipeline.stages];
      if (stageDialogMode === 'create') {
        const newStage: PipelineStage = {
          id: stageNameInput.trim().toLowerCase().replace(/\s+/g, '_'),
          name: stageNameInput.trim(),
          color: stageColorInput,
          order: updatedStages.length,
        };
        updatedStages.push(newStage);
      } else if (stageDialogMode === 'rename' && editingStageId) {
        updatedStages = updatedStages.map((s) =>
          s.id === editingStageId ? { ...s, name: stageNameInput.trim(), color: stageColorInput } : s
        );
      }
      await updatePipeline(activePipelineId, { stages: updatedStages });
      toast.success(stageDialogMode === 'create' ? 'Stage created' : 'Stage updated');
      setStageDialogOpen(false);
      load();
    } catch {
      toast.error('Failed to save stage');
    }
  }

  async function handleDeleteStage(stageId: string) {
    if (!activePipelineId || !activePipeline) return;
    try {
      const updatedStages = activePipeline.stages.filter((s) => s.id !== stageId);
      await updatePipeline(activePipelineId, { stages: updatedStages });
      toast.success('Stage deleted');
      load();
    } catch {
      toast.error('Failed to delete stage');
    }
  }

  function sendWaReply() {
    if (!waReply.trim()) return;
    const newMsg = {
      id: String(Date.now()),
      sender: 'internal',
      text: waReply.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setWaMessages((prev) => [...prev, newMsg]);
    setWaReply('');
  }

  const handleDragStart = useCallback((e: React.DragEvent, leadId: string, fromStage: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ leadId, fromStage }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-muted/50');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-muted/50');
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-muted/50');
    try {
      const { leadId } = JSON.parse(e.dataTransfer.getData('text/plain'));
      const lead = leads.find((l) => l.id === leadId);
      if (lead && lead.status !== targetStage) {
        await updateLead(leadId, { status: targetStage as LeadStatus });
        toast.success(`Moved to ${stageLabels[targetStage] || targetStage}`);
        load();
      }
    } catch {
      // ignore
    }
  }, [leads, load]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading pipeline...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-sm text-muted-foreground">Manage your sales pipeline and deals</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('kanban')}
            >
              <Columns size={14} className="mr-1.5" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3"
              onClick={() => setViewMode('list')}
            >
              <LayoutList size={14} className="mr-1.5" />
              List
            </Button>
          </div>
          <Button onClick={() => openDealDialog()}>
            <Plus size={16} className="mr-2" />
            New Deal
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {pipelines.length === 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium px-3 py-1.5 rounded-md bg-muted">Default Pipeline</span>
              <Button variant="outline" size="sm" onClick={() => openBoardDialog('create')}>
                <Plus size={14} className="mr-1" /> New Board
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1 bg-muted/30 p-0.5 rounded-lg">
                {pipelines.map((p) => (
                  <Button
                    key={p.id}
                    variant={activePipelineId === p.id ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setActivePipelineId(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings2 size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openBoardDialog('create')}>
                    <Plus size={14} className="mr-2" /> New Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBoardDialog('rename')}>
                    <Pencil size={14} className="mr-2" /> Rename Board
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600" onClick={() => openBoardDialog('delete')}>
                    <Trash2 size={14} className="mr-2" /> Delete Board
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Pipeline Value" value={formatCurrency(totalPipelineValue)} change="open deals" trend="up" icon={DollarSign} description="all pipelines" />
        <KpiCard title="Confirmed Orders" value={formatCurrency(confirmedOrders)} change="closed won" trend="up" icon={DollarSign} description="this month" />
        <KpiCard title="Active Deals" value={String(activeDeals)} change={`${activeDeals} in progress`} trend="up" icon={Clock} description="current pipeline" />
        <KpiCard title="Avg. Deal Size" value={formatCurrency(avgDealSize)} change="per deal avg" trend="neutral" icon={Building2} description="estimated" />
      </div>

      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[400px]">
          {stages.map((stage) => {
            const stageLeads = grouped[stage.id] || [];
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-72"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-semibold truncate">{stage.name}</h3>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openDealDialog(stage.id)}>
                      <Plus size={12} />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal size={12} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openStageDialog('rename', stage.id)}>
                          <Pencil size={12} className="mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStage(stage.id)}>
                          <Trash2 size={12} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="space-y-3">
                  {stageLeads.map((lead) => (
                    <Card
                      key={lead.id}
                      className="hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id, lead.status)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
                            <p className="text-sm font-medium truncate">{lead.name}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label="Deal actions">
                                <MoreHorizontal size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingDeal(lead); setDealDialogOpen(true); }}>
                                <Pencil size={14} className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setViewDeal(lead); setViewDealOpen(true); }}>
                                <Eye size={14} className="mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(lead)} disabled={deleting === lead.id}>
                                <Trash2 size={14} className="mr-2" /> {deleting === lead.id ? 'Deleting...' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="space-y-1.5 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Building2 size={12} />
                            <span className="truncate">{lead.company || '—'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign size={12} />
                            {lead.potential_value ? formatCurrency(lead.potential_value) : '—'}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {lead.notes?.slice(0, 20) || '—'}
                            </span>
                            <span className="font-medium">{lead.probability || 0}%</span>
                          </div>
                        </div>
                        <Progress value={lead.probability || 0} className="h-1 mt-2" />
                        <div className="mt-2 flex items-center justify-between">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex gap-1 flex-wrap justify-end">
                            {lead.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[9px] px-1 py-0">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {stageLeads.length === 0 && (
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => openDealDialog(stage.id)}
                    >
                      <p className="text-xs text-muted-foreground">+ Add Deal</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="flex-shrink-0 w-16 flex items-start pt-8">
            <Button variant="outline" size="sm" className="h-8 w-8" onClick={() => openStageDialog('create')}>
              <Plus size={14} />
            </Button>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-3 font-medium">Deal Name</th>
                    <th className="p-3 font-medium">Client</th>
                    <th className="p-3 font-medium">Tags</th>
                    <th className="p-3 font-medium">Value</th>
                    <th className="p-3 font-medium">Stage</th>
                    <th className="p-3 font-medium">Days</th>
                    <th className="p-3 font-medium">Owner</th>
                    <th className="p-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {leads.filter((l) => l.status !== 'lost').length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground">No deals yet</td>
                    </tr>
                  ) : (
                    leads.filter((l) => l.status !== 'lost').map((lead) => (
                      <tr key={lead.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stageColors[lead.status] || 'bg-gray-400'}`} />
                            <span className="font-medium">{lead.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">{lead.company || '—'}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {lead.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0">{tag}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 font-medium">{lead.potential_value ? formatCurrency(lead.potential_value) : '—'}</td>
                        <td className="p-3">
                          <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: stageColors[lead.status] ? undefined : undefined }}>
                            {stageLabels[lead.status] || lead.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {lead.created_at ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000) : '—'}d
                        </td>
                        <td className="p-3">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                        </td>
                        <td className="p-3">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(lead)}>
                            <Trash2 size={12} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editingDeal ? 'Edit Deal' : 'New Deal'}</DialogTitle>
            <DialogDescription>
              {editingDeal ? 'Update deal details and WhatsApp conversation.' : 'Create a new deal and start the conversation.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Deal Name</Label>
                <Input placeholder="Enter deal name" defaultValue={editingDeal?.name || ''} id="deal-name" />
              </div>
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input placeholder="Client name" defaultValue={editingDeal?.name || ''} id="deal-client" />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input placeholder="Company name" defaultValue={editingDeal?.company || ''} id="deal-company" />
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input type="number" placeholder="Deal value" defaultValue={editingDeal?.potential_value || ''} id="deal-value" />
              </div>
              <div className="space-y-2">
                <Label>Pipeline Stage</Label>
                <Select defaultValue={dealFormStage} onValueChange={(v) => setDealFormStage(v as LeadStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="border-l pl-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={16} className="text-emerald-500" />
                <span className="text-sm font-medium">WhatsApp Activity</span>
              </div>
              {editingDeal ? (
                <div className="space-y-3">
                  <div className="space-y-2 max-h-[280px] overflow-y-auto">
                    {waMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === 'internal' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                          msg.sender === 'internal'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          <p>{msg.text}</p>
                          <p className={`text-[9px] mt-0.5 ${msg.sender === 'internal' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{msg.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a reply..."
                      value={waReply}
                      onChange={(e) => setWaReply(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') sendWaReply(); }}
                      className="text-xs"
                    />
                    <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendWaReply}>
                      <Send size={14} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[280px] text-center text-muted-foreground">
                  <Bot size={40} className="mb-3 text-muted-foreground/40" />
                  <p className="text-sm font-medium mb-1">WhatsApp Integration</p>
                  <p className="text-xs">Chat history will appear here once the deal is created and the client engages via WhatsApp.</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDealDialogOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              toast.success(editingDeal ? 'Deal updated' : 'Deal created');
              setDealDialogOpen(false);
              load();
            }}>
              {editingDeal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={boardDialogOpen} onOpenChange={setBoardDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {boardDialogMode === 'create' ? 'New Pipeline Board' : boardDialogMode === 'rename' ? 'Rename Board' : 'Delete Board'}
            </DialogTitle>
            <DialogDescription>
              {boardDialogMode === 'delete'
                ? 'Are you sure you want to delete this pipeline? This action cannot be undone.'
                : 'Enter a name for the pipeline board.'}
            </DialogDescription>
          </DialogHeader>
          {boardDialogMode !== 'delete' ? (
            <>
              <Input
                placeholder="Pipeline name"
                value={boardNameInput}
                onChange={(e) => setBoardNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleBoardSubmit(); }}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setBoardDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleBoardSubmit}>
                  {boardDialogMode === 'create' ? 'Create' : 'Rename'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <DialogFooter>
              <Button variant="outline" onClick={() => setBoardDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeletePipeline}>Delete</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{stageDialogMode === 'create' ? 'New Stage' : 'Rename Stage'}</DialogTitle>
            <DialogDescription>Enter the stage details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input
                placeholder="e.g. Discovery"
                value={stageNameInput}
                onChange={(e) => setStageNameInput(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={stageColorInput}
                  onChange={(e) => setStageColorInput(e.target.value)}
                  className="h-9 w-9 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{stageColorInput}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStageSubmit}>
              {stageDialogMode === 'create' ? 'Create' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDealOpen} onOpenChange={setViewDealOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Deal Details</DialogTitle>
            <DialogDescription>Comprehensive view of the selected deal.</DialogDescription>
          </DialogHeader>
          {viewDeal && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-lg font-bold">{viewDeal.potential_value ? formatCurrency(viewDeal.potential_value) : '—'}</p>
                  <p className="text-xs text-muted-foreground">Deal Value</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{viewDeal.probability || 0}%</p>
                  <p className="text-xs text-muted-foreground">Probability</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Name</p>
                  <p className="font-medium">{viewDeal.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Company</p>
                  <p className="font-medium">{viewDeal.company || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <p className="font-medium">{viewDeal.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{viewDeal.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Stage</p>
                  <Badge variant="secondary">{stageLabels[viewDeal.status] || viewDeal.status}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Source</p>
                  <p className="font-medium">{viewDeal.source || '—'}</p>
                </div>
              </div>
              {viewDeal.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm bg-muted/30 rounded-lg p-3">{viewDeal.notes}</p>
                </div>
              )}
              {viewDeal.tags && viewDeal.tags.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Tags</p>
                  <div className="flex gap-1 flex-wrap">
                    {viewDeal.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDealOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Deal"
        description="Are you sure you want to delete this deal? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
