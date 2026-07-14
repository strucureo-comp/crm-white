'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  MoreHorizontal,
  Phone,
  Mail,
  Building2,
  ArrowUpDown,
  Pencil,
  Trash2,
} from 'lucide-react';
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
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getLeads, deleteLead } from '@/lib/firebase/database';
import type { Lead } from '@/lib/db/types';
import { LeadDialog } from '@/components/dialogs/lead-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  new: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  contacted: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  qualified: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
  proposal: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  negotiation: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  won: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  lost: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = leads.filter((lead) => {
    const matchesSearch = !search || lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.company?.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleDelete(lead: Lead) {
    setConfirmState({ open: true, id: lead.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setDeleting(confirmState.id);
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteLead(confirmState.id);
      toast.success('Lead deleted');
      load();
      setConfirmState({ open: false, loading: false });
    } catch {
      toast.error('Failed to delete lead');
      setConfirmState({ open: false, loading: false });
    } finally {
      setDeleting(null);
    }
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead);
    setDialogOpen(true);
  }

  function openCreate() {
    setEditingLead(null);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Leads</h2>
          <p className="text-sm text-muted-foreground">Manage and track your sales leads</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select defaultValue="all" onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <SlidersHorizontal size={16} />
          </Button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={filtered}
              keyExtractor={(lead) => lead.id}
              mobileCardTitle={(lead) => lead.name}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (lead) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {lead.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{lead.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate"><Mail size={10} />{lead.email}</span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'company',
                  header: 'Company',
                  render: (lead) => (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 size={14} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{lead.company || '—'}</span>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (lead) => (
                    <Badge variant="secondary" className={statusColors[lead.status] || ''}>
                      {lead.status}
                    </Badge>
                  ),
                },
                {
                  key: 'value',
                  header: 'Value',
                  render: (lead) => (
                    <span className="text-sm font-medium">{lead.potential_value ? formatCurrency(lead.potential_value) : '—'}</span>
                  ),
                },
                {
                  key: 'source',
                  header: 'Source',
                  render: (lead) => <span className="text-sm">{lead.source || '—'}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-10',
                  render: (lead) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(lead)}>
                          <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(lead)}
                          disabled={deleting === lead.id}
                        >
                          <Trash2 size={14} className="mr-2" /> {deleting === lead.id ? 'Deleting...' : 'Delete'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{search || statusFilter !== 'all' ? 'No leads match your filters' : 'No leads yet'}</p>
          </CardContent>
        </Card>
      )}

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        lead={editingLead}
      />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Lead"
        description="Are you sure you want to delete this lead? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
