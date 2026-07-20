'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Users, UserPlus, Building2, Search, X, Eye, Pencil, Trash2,
  MoreHorizontal, Mail, Phone, Calendar, Tag, Star, MapPin,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getLeads, deleteLead } from '@/lib/firebase/database';
import type { Lead } from '@/lib/db/types';
import { LeadDialog } from '@/components/dialogs/lead-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { toast } from 'sonner';

function parseTags(lead: Lead): string[] {
  return lead.tags ?? [];
}

function isRecentlyAdded(lead: Lead): boolean {
  if (!lead.created_at) return false;
  const d = new Date(lead.created_at);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return d >= sevenDaysAgo;
}

function isKeyAccount(lead: Lead): boolean {
  const tags = parseTags(lead);
  return tags.some((t) => /vip|decision.?(maker)/i.test(t));
}

function isEngaged(lead: Lead): boolean {
  return !!lead.last_contacted;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'cards'>('table');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
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

  const filtered = useMemo(() => {
    return leads.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) &&
            !(c.company ?? '').toLowerCase().includes(q) &&
            !c.email.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (companyFilter) {
        const q = companyFilter.toLowerCase();
        if (!(c.company ?? '').toLowerCase().includes(q)) return false;
      }
      if (tagsFilter) {
        const q = tagsFilter.toLowerCase();
        const tags = parseTags(c);
        if (!tags.some((t) => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [leads, search, companyFilter, tagsFilter]);

  const hasActiveFilters = !!(search || companyFilter || tagsFilter);

  function clearFilters() {
    setSearch('');
    setCompanyFilter('');
    setTagsFilter('');
  }

  const kpis = useMemo(() => {
    const total = leads.length;
    const recently = leads.filter(isRecentlyAdded).length;
    const keyAcc = leads.filter(isKeyAccount).length;
    const engaged = leads.filter(isEngaged).length;
    return { total, recently, keyAcc, engaged };
  }, [leads]);

  function handleDelete(lead: Lead) {
    setConfirmState({ open: true, id: lead.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setDeleting(confirmState.id);
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteLead(confirmState.id);
      toast.success('Contact deleted');
      load();
      setConfirmState({ open: false, loading: false });
    } catch {
      toast.error('Failed to delete contact');
      setConfirmState({ open: false, loading: false });
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading contacts...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Contacts</h2>
          <p className="text-sm text-muted-foreground">Manage your contact relationships</p>
        </div>
        <Button onClick={() => { setEditingLead(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <UserPlus size={16} className="mr-2" />
          Add Contact
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Contacts"
          value={kpis.total.toLocaleString()}
          change={`${kpis.total > 0 ? 'All' : 'No'} contacts`}
          trend="neutral"
          icon={Users}
          description="in database"
        />
        <KpiCard
          title="Recently Added"
          value={kpis.recently.toLocaleString()}
          change="Last 7 days"
          trend={kpis.recently > 0 ? 'up' : 'neutral'}
          icon={UserPlus}
          description="new contacts"
        />
        <KpiCard
          title="Key Accounts"
          value={kpis.keyAcc.toLocaleString()}
          change="VIP / Decision Maker"
          trend={kpis.keyAcc > 0 ? 'up' : 'neutral'}
          icon={Star}
          description="tagged accounts"
        />
        <KpiCard
          title="Engaged"
          value={kpis.engaged.toLocaleString()}
          change="Recent interaction"
          trend={kpis.engaged > 0 ? 'up' : 'neutral'}
          icon={Building2}
          description="last contacted"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, company, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Filter by company"
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-44"
            />
            <Input
              placeholder="Filter by tags"
              value={tagsFilter}
              onChange={(e) => setTagsFilter(e.target.value)}
              className="w-44"
            />
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X size={14} />
                Clear
              </Button>
            )}
          </div>
        </div>
        {/* View toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {leads.length} contact{leads.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            <Button
              variant={view === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              className="h-7 px-2 text-xs"
            >
              Table
            </Button>
            <Button
              variant={view === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('cards')}
              className="h-7 px-2 text-xs"
            >
              Cards
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filtered.length > 0 ? (
        view === 'table' ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((contact) => {
                  const tags = parseTags(contact);
                  return (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                              {contact.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-sm">{contact.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.company || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.phone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {tags.length > 0 ? tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          )) : <span className="text-xs text-muted-foreground">—</span>}
                          {tags.length > 3 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(contact.created_at)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Contact actions">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingLead(contact)}>
                              <Eye size={14} className="mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setEditingLead(contact); setDialogOpen(true); }}>
                              <Pencil size={14} className="mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(contact)}
                              disabled={deleting === contact.id}
                            >
                              <Trash2 size={14} className="mr-2" /> {deleting === contact.id ? 'Deleting...' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((contact) => {
              const tags = parseTags(contact);
              return (
                <Card key={contact.id} className="hover:shadow-sm transition-all duration-200 group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.status}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Contact actions">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingLead(contact)}>
                            <Eye size={14} className="mr-2" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditingLead(contact); setDialogOpen(true); }}>
                            <Pencil size={14} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(contact)}
                            disabled={deleting === contact.id}
                          >
                            <Trash2 size={14} className="mr-2" /> {deleting === contact.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 size={14} />
                        <span>{contact.company || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail size={14} />
                        <span className="truncate">{contact.email}</span>
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone size={14} />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.source && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin size={14} />
                          <span>Source: {contact.source}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {contact.potential_value != null && contact.potential_value > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          ${contact.potential_value.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">{hasActiveFilters ? 'No contacts match your filters' : 'No contacts yet'}</p></CardContent></Card>
      )}

      {/* View Modal */}
      <ViewContactDialog lead={viewingLead} onClose={() => setViewingLead(null)} />

      {/* Edit / Create Dialog */}
      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        lead={editingLead}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}

function ViewContactDialog({ lead, onClose }: { lead: Lead | null; onClose: () => void }) {
  if (!lead) return null;
  const tags = parseTags(lead);

  return (
    <Dialog open={!!lead} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            {lead.name}
          </DialogTitle>
          <DialogDescription>Contact details and activity</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Phone size={15} className="text-muted-foreground shrink-0" />
            <span>{lead.phone || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail size={15} className="text-muted-foreground shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Building2 size={15} className="text-muted-foreground shrink-0" />
            <span>{lead.company || '—'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Star size={15} className="text-muted-foreground shrink-0" />
            <span>{lead.status}</span>
          </div>
          {tags.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag size={15} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar size={15} className="text-muted-foreground shrink-0" />
            <span>Added {formatDate(lead.created_at)}</span>
          </div>
          {lead.last_contacted && (
            <div className="flex items-center gap-3">
              <Calendar size={15} className="text-muted-foreground shrink-0" />
              <span>Last contact {formatDate(lead.last_contacted)}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
