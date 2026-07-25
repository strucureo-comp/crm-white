'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Mail, Send, Eye, MousePointer, Trash2, UserMinus } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getEmailCampaigns, createEmailCampaign, deleteEmailCampaign, getEmailSegments, createEmailSegment } from '@/lib/db/automation/api';
import { EmailCampaign, EmailSegment } from '@/lib/db/automation/types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  sending: 'bg-yellow-100 text-yellow-800',
  sent: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export default function EmailMarketingPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSegmentDialog, setShowSegmentDialog] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', preview_text: '' });
  const [newSegment, setNewSegment] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([getEmailCampaigns(workspaceId), getEmailSegments(workspaceId)])
      .then(([c, s]) => { setCampaigns(c); setSegments(s); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) return;
    const campaign = await createEmailCampaign(workspaceId, {
      workspace_id: workspaceId,
      name: newCampaign.name,
      subject: newCampaign.subject,
      preview_text: newCampaign.preview_text,
      content: '',
      recipients: [],
      status: 'draft',
      metrics: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, open_rate: 0, click_rate: 0, bounce_rate: 0, unsubscribe_rate: 0 },
    });
    setCampaigns([campaign, ...campaigns]);
    setShowCreateDialog(false);
    setNewCampaign({ name: '', subject: '', preview_text: '' });
  };

  const handleDeleteCampaign = async (id: string) => {
    await deleteEmailCampaign(workspaceId, id);
    setCampaigns(campaigns.filter(c => c.campaign_id !== id));
  };

  const handleCreateSegment = async () => {
    if (!newSegment.name.trim()) return;
    const segment = await createEmailSegment(workspaceId, {
      workspace_id: workspaceId,
      name: newSegment.name,
      description: newSegment.description,
      conditions: [],
      contact_count: 0,
    });
    setSegments([segment, ...segments]);
    setShowSegmentDialog(false);
    setNewSegment({ name: '', description: '' });
  };

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase()));
  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent').length,
    totalSent: campaigns.reduce((s, c) => s + (c.metrics?.sent || 0), 0),
    avgOpenRate: campaigns.length > 0 ? campaigns.filter(c => c.status === 'sent').reduce((s, c) => s + (c.metrics?.open_rate || 0), 0) / Math.max(campaigns.filter(c => c.status === 'sent').length, 1) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Email Marketing</h1><p className="text-muted-foreground">Create campaigns, manage subscribers, and track engagement</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSegmentDialog(true)}><UserMinus size={16} className="mr-2" />New Segment</Button>
          <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />New Campaign</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Campaigns</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Sent</p><p className="text-2xl font-bold">{stats.sent}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Emails Sent</p><p className="text-2xl font-bold">{stats.totalSent.toLocaleString()}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Avg Open Rate</p><p className="text-2xl font-bold">{stats.avgOpenRate.toFixed(1)}%</p></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <Tabs defaultValue="campaigns">
        <TabsList><TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger><TabsTrigger value="segments">Segments ({segments.length})</TabsTrigger></TabsList>
        <TabsContent value="campaigns" className="space-y-4">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No campaigns yet</h3><Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Create Campaign</Button></CardContent></Card>
          ) : filtered.map(c => (
            <Card key={c.campaign_id}>
              <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2"><h3 className="text-lg font-semibold">{c.name}</h3><Badge className={statusColors[c.status]}>{c.status}</Badge></div>
                  <p className="text-sm text-muted-foreground">{c.subject}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center"><p className="text-xs text-muted-foreground">Sent</p><p className="text-sm font-semibold">{(c.metrics?.sent || 0).toLocaleString()}</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Open Rate</p><p className="text-sm font-semibold">{(c.metrics?.open_rate || 0).toFixed(1)}%</p></div>
                  <div className="text-center"><p className="text-xs text-muted-foreground">Click Rate</p><p className="text-sm font-semibold">{(c.metrics?.click_rate || 0).toFixed(1)}%</p></div>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteCampaign(c.campaign_id)}><Trash2 size={14} /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="segments" className="space-y-4">
          {segments.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><h3 className="text-lg font-medium mb-2">No segments yet</h3><Button onClick={() => setShowSegmentDialog(true)}><Plus size={16} className="mr-2" />Create Segment</Button></CardContent></Card>
          ) : segments.map(s => (
            <Card key={s.segment_id}><CardContent className="p-6"><div className="flex items-center justify-between"><div><h3 className="font-semibold">{s.name}</h3>{s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}</div><Badge variant="outline">{s.contact_count} contacts</Badge></div></CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create Email Campaign</h2>
            <div><label className="text-sm font-medium mb-2 block">Name *</label><Input placeholder="Campaign name" value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Subject *</label><Input placeholder="Email subject" value={newCampaign.subject} onChange={(e) => setNewCampaign({ ...newCampaign, subject: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Preview Text</label><Input placeholder="Preview text..." value={newCampaign.preview_text} onChange={(e) => setNewCampaign({ ...newCampaign, preview_text: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreateCampaign}>Create</Button></div>
          </div></Card>
        </div>
      )}

      {showSegmentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Create Segment</h2>
            <div><label className="text-sm font-medium mb-2 block">Name *</label><Input placeholder="Segment name" value={newSegment.name} onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Description</label><Textarea placeholder="Description..." value={newSegment.description} onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowSegmentDialog(false)}>Cancel</Button><Button onClick={handleCreateSegment}>Create</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
