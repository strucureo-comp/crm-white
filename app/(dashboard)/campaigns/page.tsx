'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, BarChart3, TrendingUp, Eye, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getCampaigns, createCampaign, deleteCampaign } from '@/lib/db/automation/api';
import { Campaign } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  running: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
};

const channelIcons: Record<string, string> = {
  google_ads: 'Google Ads',
  meta_ads: 'Meta Ads',
  linkedin_ads: 'LinkedIn Ads',
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  social: 'Social',
  content: 'Content',
};

export default function CampaignsPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    channel: 'email' as Campaign['channel'],
    budget: '',
    target_audience: '',
  });

  useEffect(() => {
    if (!workspaceId) return;
    getCampaigns(workspaceId).then(setCampaigns).finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) return;
    const campaign = await createCampaign(workspaceId, {
      workspace_id: workspaceId,
      name: newCampaign.name,
      description: newCampaign.description,
      channel: newCampaign.channel,
      status: 'draft',
      budget: newCampaign.budget ? Number(newCampaign.budget) : undefined,
      spent: 0,
      currency: 'USD',
      target_audience: newCampaign.target_audience ? newCampaign.target_audience.split(',').map(s => s.trim()) : [],
      content: {},
      metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpm: 0, roas: 0, spend: 0, revenue: 0 },
    });
    setCampaigns([campaign, ...campaigns]);
    setShowCreateDialog(false);
    setNewCampaign({ name: '', description: '', channel: 'email', budget: '', target_audience: '' });
  };

  const handleDeleteCampaign = async (id: string) => {
    await deleteCampaign(workspaceId, id);
    setCampaigns(campaigns.filter(c => c.campaign_id !== id));
  };

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    totalImpressions: campaigns.reduce((s, c) => s + (c.metrics?.impressions || 0), 0),
    totalClicks: campaigns.reduce((s, c) => s + (c.metrics?.clicks || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Center</h1>
          <p className="text-muted-foreground">Create, manage, and track multi-channel campaigns</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />New Campaign</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{stats.total}</p></div><BarChart3 className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Running</p><p className="text-2xl font-bold">{stats.running}</p></div><TrendingUp className="h-8 w-8 text-green-500" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Impressions</p><p className="text-2xl font-bold">{stats.totalImpressions.toLocaleString()}</p></div><Eye className="h-8 w-8 text-primary" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-muted-foreground">Clicks</p><p className="text-2xl font-bold">{stats.totalClicks.toLocaleString()}</p></div><BarChart3 className="h-8 w-8 text-primary" /></div></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center"><BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No campaigns yet</h3><Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Create Campaign</Button></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((campaign) => (
            <Card key={campaign.campaign_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{campaign.name}</h3>
                      <Badge className={statusColors[campaign.status]}>{campaign.status}</Badge>
                      <Badge variant="outline">{channelIcons[campaign.channel] || campaign.channel}</Badge>
                    </div>
                    {campaign.description && <p className="text-sm text-muted-foreground mb-3">{campaign.description}</p>}
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:min-w-[400px]">
                    <div className="text-center"><p className="text-xs text-muted-foreground">Impressions</p><p className="text-sm font-semibold">{(campaign.metrics?.impressions || 0).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Clicks</p><p className="text-sm font-semibold">{(campaign.metrics?.clicks || 0).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">Conversions</p><p className="text-sm font-semibold">{(campaign.metrics?.conversions || 0).toLocaleString()}</p></div>
                    <div className="text-center"><p className="text-xs text-muted-foreground">ROAS</p><p className="text-sm font-semibold">{campaign.metrics?.roas ? `${campaign.metrics.roas}x` : '0x'}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm"><Pencil size={14} className="mr-1" />Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteCampaign(campaign.campaign_id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
                {campaign.budget && campaign.budget > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="font-medium">${campaign.spent?.toLocaleString() || 0} / ${campaign.budget.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2"><div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(((campaign.spent || 0) / campaign.budget) * 100, 100)}%` }} /></div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create New Campaign</h2>
            <div><label className="text-sm font-medium mb-2 block">Name *</label><Input placeholder="Campaign name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Description</label><Textarea placeholder="Description..." value={newCampaign.description} onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Channel</label>
              <select value={newCampaign.channel} onChange={(e) => setNewCampaign({ ...newCampaign, channel: e.target.value as Campaign['channel'] })} className="w-full px-3 py-2 border rounded-md bg-background text-sm">
                <option value="email">Email</option><option value="social">Social</option><option value="google_ads">Google Ads</option><option value="meta_ads">Meta Ads</option><option value="sms">SMS</option><option value="content">Content</option>
              </select>
            </div>
            <div><label className="text-sm font-medium mb-2 block">Budget (USD)</label><Input type="number" placeholder="0" value={newCampaign.budget} onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreateCampaign}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
