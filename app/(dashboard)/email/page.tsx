'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Loader2, Pencil, Trash2, MoreHorizontal, Search, Eye, ArrowLeft, Mail, Send, BarChart3, Clock, CheckCircle2, Play, PauseCircle, MousePointerClick, X } from 'lucide-react';
import { getEmailTemplates, getEmailCampaigns, getEmailLogs, deleteEmailTemplate, deleteEmailCampaign } from '@/lib/firebase/database';
import type { EmailTemplate, EmailCampaign, EmailLog, EmailCampaignStatus } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmailTemplateDialog } from '@/components/dialogs/email-template-dialog';
import { EmailCampaignDialog } from '@/components/dialogs/email-campaign-dialog';

const statusBadge: Record<EmailCampaignStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  scheduling: { label: 'Scheduling', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  completed: { label: 'Completed', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  paused: { label: 'Paused', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
};

export default function EmailMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [search, setSearch] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; type?: 'template' | 'campaign'; loading?: boolean }>({ open: false });
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null);
  const [campaignLogs, setCampaignLogs] = useState<EmailLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([getEmailTemplates(), getEmailCampaigns()]);
      setTemplates(t);
      setCampaigns(c);
    } catch {
      toast.error('Failed to load email data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(type: 'template' | 'campaign', id: string) {
    setConfirmState({ open: true, id, type });
  }

  async function onDeleteConfirm() {
    const { id, type } = confirmState;
    if (!id || !type) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'template') {
        await deleteEmailTemplate(id);
        toast.success('Template deleted');
      } else {
        await deleteEmailCampaign(id);
        toast.success('Campaign deleted');
      }
      load();
    } catch {
      toast.error('Failed to delete');
    } finally {
      setConfirmState({ open: false });
    }
  }

  async function viewCampaign(campaign: EmailCampaign) {
    setSelectedCampaign(campaign);
    setLogsLoading(true);
    try {
      const logs = await getEmailLogs(campaign.id);
      setCampaignLogs(logs);
    } catch {
      toast.error('Failed to load campaign logs');
    } finally {
      setLogsLoading(false);
    }
  }

  const filteredTemplates = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (selectedCampaign) {
    const badge = statusBadge[selectedCampaign.status];
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedCampaign(null)}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{selectedCampaign.name}</h2>
            <p className="text-sm text-muted-foreground">{selectedCampaign.subject}</p>
          </div>
          <Badge className={`${badge.className} ml-auto`}>{badge.label}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-primary/10"><Send size={20} className="text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="text-lg font-bold">{selectedCampaign.stats?.sent || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-blue-500/10"><Eye size={20} className="text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Opened</p>
                <p className="text-lg font-bold">{selectedCampaign.stats?.opened || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-green-500/10"><MousePointerClick size={20} className="text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Clicked</p>
                <p className="text-lg font-bold">{selectedCampaign.stats?.clicked || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="p-2 rounded-lg bg-red-500/10"><X size={20} className="text-red-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Bounced</p>
                <p className="text-lg font-bold">{selectedCampaign.stats?.bounced || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Email Logs</h3>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : campaignLogs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Mail size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No logs yet</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Recipient</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Sent</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Opened</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Clicked</th>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Bounced</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignLogs.map((log) => (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 text-sm">{log.recipient_email}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(log.sent_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{log.opened_at ? <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Opened</Badge> : <span className="text-sm text-muted-foreground">-</span>}</td>
                          <td className="px-4 py-3">{log.clicked_at ? <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">Clicked</Badge> : <span className="text-sm text-muted-foreground">-</span>}</td>
                          <td className="px-4 py-3">{log.bounced ? <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Bounced</Badge> : <span className="text-sm text-muted-foreground">-</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Email Marketing</h2>
          <p className="text-sm text-muted-foreground">Manage templates and campaigns</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'templates' ? 'Search templates...' : 'Search campaigns...'}
                className="pl-9 h-9 w-[200px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={() => {
                if (activeTab === 'templates') {
                  setEditingTemplate(null);
                  setTemplateDialogOpen(true);
                } else {
                  setEditingCampaign(null);
                  setCampaignDialogOpen(true);
                }
              }}
            >
              <Plus size={14} className="mr-1" />
              {activeTab === 'templates' ? 'Template' : 'Campaign'}
            </Button>
          </div>
        </div>

        <TabsContent value="templates" className="mt-0">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No templates yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((tpl) => (
                <Card key={tpl.id} className="group relative">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText size={16} className="text-primary shrink-0" />
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1 shrink-0" onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === tpl.id ? null : tpl.id); }}>
                        <MoreHorizontal size={12} />
                      </Button>
                    </div>
                    {menuOpen === tpl.id && (
                      <div className="absolute right-2 top-10 z-10 w-28 rounded-md border bg-background shadow-lg">
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditingTemplate(tpl); setMenuOpen(null); setTemplateDialogOpen(true); }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete('template', tpl.id); setMenuOpen(null); }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground truncate mt-1">{tpl.subject}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <span>{tpl.variables?.length || 0} variables</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-0">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Send size={48} className="mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCampaigns.map((c) => {
                const badge = statusBadge[c.status];
                return (
                  <Card key={c.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => viewCampaign(c)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail size={16} className="text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                            <span title="Sent">{c.stats?.sent || 0} sent</span>
                            <span title="Opened">{c.stats?.opened || 0} opened</span>
                            <span title="Clicked">{c.stats?.clicked || 0} clicked</span>
                          </div>
                          <Badge className={`${badge.className} text-[10px]`}>{badge.label}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === c.id ? null : c.id); }}>
                            <MoreHorizontal size={12} />
                          </Button>
                        </div>
                      </div>
                      {menuOpen === c.id && (
                        <div className="absolute right-12 top-12 z-10 w-28 rounded-md border bg-background shadow-lg" onClick={(e) => e.stopPropagation()}>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditingCampaign(c); setMenuOpen(null); setCampaignDialogOpen(true); }}>
                            <Pencil size={12} /> Edit
                          </button>
                          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete('campaign', c.id); setMenuOpen(null); }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EmailTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        onSaved={load}
        item={editingTemplate}
      />

      <EmailCampaignDialog
        open={campaignDialogOpen}
        onOpenChange={setCampaignDialogOpen}
        onSaved={load}
        item={editingCampaign}
        templates={templates}
      />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title={confirmState.type === 'template' ? 'Delete template' : 'Delete campaign'}
        description={`Are you sure you want to delete this ${confirmState.type}? This action cannot be undone.`}
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
