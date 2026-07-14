'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus, MoreHorizontal, Building2, DollarSign, Clock,
  Pencil, Trash2, ArrowRight,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
import { getLeads, deleteLead, updateLead } from '@/lib/firebase/database';
import type { Lead, LeadStatus } from '@/lib/db/types';
import { LeadDialog } from '@/components/dialogs/lead-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const pipelineStages: LeadStatus[] = ['qualified', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

const stageLabels: Record<string, string> = {
  qualified: 'Qualified',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Closed Won',
  lost: 'Closed Lost',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function DealsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped: Record<string, Lead[]> = {};
  for (const stage of pipelineStages) {
    grouped[stage] = leads.filter((l) => l.status === stage);
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

  async function handleStageChange(lead: Lead, newStage: LeadStatus) {
    try {
      await updateLead(lead.id, { status: newStage });
      toast.success(`Moved to ${stageLabels[newStage]}`);
      load();
    } catch {
      toast.error('Failed to move deal');
    }
  }

  function openCreateForStage(stage: LeadStatus) {
    setEditingLead(null);
    setDialogOpen(true);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading deals...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Deals</h2>
          <p className="text-sm text-muted-foreground">Track deals across your sales pipelines</p>
        </div>
        <Button onClick={() => { setEditingLead(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Add Deal
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipelineStages.map((stage) => {
          const stageLeads = grouped[stage] || [];
          return (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{stageLabels[stage]}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreateForStage(stage)}>
                  <Plus size={12} />
                </Button>
              </div>
              <div className="space-y-3">
                {stageLeads.map((lead) => (
                  <Card key={lead.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            (lead.probability || 0) <= 30 ? 'bg-blue-500' :
                            (lead.probability || 0) <= 60 ? 'bg-amber-500' :
                            'bg-emerald-500'
                          }`} />
                          <p className="text-sm font-medium">{lead.name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal size={12} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setEditingLead(lead); setDialogOpen(true); }}>
                              <Pencil size={14} className="mr-2" /> Edit
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
                          {lead.company || '—'}
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
                          <span>{lead.probability || 0}%</span>
                        </div>
                      </div>
                      <Progress value={lead.probability || 0} className="h-1 mt-2" />
                      <div className="mt-2">
                        <Select
                          value={lead.status}
                          onValueChange={(v: LeadStatus) => handleStageChange(lead, v)}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelineStages.map((s) => (
                              <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageLeads.length === 0 && (
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <p className="text-xs text-muted-foreground">No deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        lead={editingLead}
      />
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
