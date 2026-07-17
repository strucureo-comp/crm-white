'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  Pencil,
  Trash2,
  Megaphone,
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
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getCampaigns, deleteCampaign } from '@/lib/firebase/database';
import type { Campaign, CampaignChannel, CampaignStatus } from '@/lib/db/types';
import { CampaignDialog } from '@/components/dialogs/campaign-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  active: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
  paused: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400',
  completed: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
};

const channelColors: Record<string, string> = {
  email: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
  social: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  paid: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  sms: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = campaigns.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return c.name.toLowerCase().includes(s) || (c.target_audience || '').toLowerCase().includes(s);
    }
    return true;
  });

  async function handleDelete(c: Campaign) {
    setConfirmState({ open: true, id: c.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteCampaign(confirmState.id);
      toast.success('Campaign deleted');
      load();
    } catch {
      toast.error('Failed to delete campaign');
    } finally {
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading campaigns...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Campaigns</h2>
          <p className="text-sm text-muted-foreground">Manage and track your marketing campaigns</p>
        </div>
        <Button onClick={() => { setEditingCampaign(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search campaigns..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Channel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="social">Social</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => toast.message('Advanced filters coming soon')}>
            <SlidersHorizontal size={16} />
          </Button>
        </div>
      </div>

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={filtered}
              keyExtractor={(c) => c.id}
              mobileCardTitle={(c) => c.name}
              columns={[
                {
                  key: 'name',
                  header: 'Campaign',
                  render: (c) => (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Megaphone size={14} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        {c.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.description}</p>
                        )}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'channel',
                  header: 'Channel',
                  render: (c) => (
                    <Badge variant="secondary" className={channelColors[c.channel] || ''}>
                      {c.channel.charAt(0).toUpperCase() + c.channel.slice(1)}
                    </Badge>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (c) => (
                    <Badge variant="secondary" className={statusColors[c.status] || ''}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </Badge>
                  ),
                },
                {
                  key: 'budget',
                  header: 'Budget',
                  render: (c) => (
                    <div className="min-w-[140px]">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium">{c.budget ? formatCurrency(c.budget) : '—'}</span>
                        {c.budget ? (
                          <span className="text-xs text-muted-foreground">
                            {c.spent ? formatCurrency(c.spent) : '$0'} spent
                          </span>
                        ) : null}
                      </div>
                      {c.budget ? (
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min((c.spent || 0) / c.budget * 100, 100)}%` }}
                          />
                        </div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  key: 'dates',
                  header: 'Dates',
                  render: (c) => (
                    <div className="text-sm text-muted-foreground">
                      <p>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</p>
                      <p className="text-xs">{c.end_date ? `to ${new Date(c.end_date).toLocaleDateString()}` : ''}</p>
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-10',
                  render: (c) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Campaign actions">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCampaign(c); setDialogOpen(true); }}>
                          <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(c)}>
                          <Trash2 size={14} className="mr-2" /> Delete
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
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No campaigns yet</p></CardContent></Card>
      )}

      <CampaignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        campaign={editingCampaign}
      />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone."
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
