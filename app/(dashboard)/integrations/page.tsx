'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Puzzle, Webhook, Code, Bot, Globe, Database, Mail, Calendar, MessageSquare, Plus, ArrowRight, Loader2, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { IntegrationDialog } from '@/components/dialogs/integration-dialog';
import { AutomationRuleDialog } from '@/components/dialogs/automation-rule-dialog';
import { getIntegrations, updateIntegration, deleteIntegration, getAutomationRules, deleteAutomationRule } from '@/lib/firebase/database';
import type { Integration, AutomationRule } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const iconMap: Record<string, React.ElementType> = {
  MessageSquare, Calendar, Mail, Globe, Database, Webhook, Bot, Puzzle, Code,
};

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; type?: 'integration' | 'rule'; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [i, r] = await Promise.all([getIntegrations(), getAutomationRules()]);
    setIntegrations(i);
    setRules(r);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id, type: 'integration' });
  }

  async function handleDeleteRule(id: string) {
    setConfirmState({ open: true, id, type: 'rule' });
  }

  async function onDeleteConfirm() {
    const { id, type } = confirmState;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      if (type === 'rule') {
        await deleteAutomationRule(id);
        toast.success('Rule deleted');
      } else {
        await deleteIntegration(id);
        toast.success('Integration removed');
      }
      load();
    } catch {
      toast.error(type === 'rule' ? 'Failed to delete rule' : 'Failed to remove integration');
    } finally {
      setConfirmState({ open: false });
    }
  }

  async function toggleIntegration(item: Integration, checked: boolean) {
    try {
      await updateIntegration(item.id, { enabled: checked });
      load();
    } catch {
      toast.error('Failed to update integration');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Automation Hub</h2>
          <p className="text-sm text-muted-foreground">Connect your tools and automate workflows</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast.info('Webhook endpoints: /api/webhooks/inbound — see docs for details')} className="text-xs sm:text-sm">
            <Webhook size={14} className="mr-1.5" />
            Webhooks
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/docs/api', '_blank')} className="text-xs sm:text-sm">
            <Code size={14} className="mr-1.5" />
            API
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('MCP (Model Context Protocol) server exposed at /api/mcp')} className="text-xs sm:text-sm">
            <Bot size={14} className="mr-1.5" />
            MCP
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            Add
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Connected Apps</h3>
        {integrations.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Puzzle size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No integrations connected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const Icon = iconMap[integration.name] || Puzzle;
              return (
                <Card key={integration.id} className="hover:shadow-sm transition-all group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.category}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={
                        integration.status === 'Connected' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                        integration.status === 'Active' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400' :
                        'bg-muted text-muted-foreground'
                      }>{integration.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{integration.description}</p>
                    <div className="flex items-center justify-between">
                      <Button variant={integration.status === 'Available' ? 'default' : 'outline'} size="sm" onClick={() => {
                        if (integration.status === 'Available') {
                          toast.info(`OAuth connection for ${integration.name} coming soon`);
                        } else {
                          toast.info(`Opening ${integration.name} configuration`);
                        }
                      }}>
                        {integration.status === 'Available' ? (
                          <>Connect <ArrowRight size={14} className="ml-1" /></>
                        ) : integration.status === 'Connected' ? (
                          <>Configure</>
                        ) : (
                          <>Manage</>
                        )}
                      </Button>
                      <div className="flex items-center gap-1">
                        {(integration.status === 'Connected' || integration.status === 'Active') && (
                          <Switch checked={integration.enabled} onCheckedChange={(c) => toggleIntegration(integration, c)} />
                        )}
                        <div className="relative">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMenuOpen(menuOpen === integration.id ? null : integration.id)}>
                            <MoreHorizontal size={12} />
                          </Button>
                          {menuOpen === integration.id && (
                            <div className="absolute right-0 top-7 z-10 w-28 rounded-md border bg-background shadow-lg">
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditing(integration); setMenuOpen(null); setDialogOpen(true); }}>
                                <Pencil size={12} /> Edit
                              </button>
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(integration.id); setMenuOpen(null); }}>
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Automation Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No automation rules configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Webhook size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm">
                        When <span className="font-medium">{rule.trigger}</span> →{' '}
                        <span className="font-medium">{rule.action}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={
                      rule.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'
                    }>{rule.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRule(rule); setRuleDialogOpen(true); }}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => handleDeleteRule(rule.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full border-2 border-dashed" onClick={() => { setEditingRule(null); setRuleDialogOpen(true); }}>
                <Plus size={16} className="mr-2" />
                Add Automation Rule
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <IntegrationDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} integration={editing} />
      <AutomationRuleDialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen} onSaved={load} rule={editingRule} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title={confirmState.type === 'rule' ? 'Delete rule' : 'Remove integration'}
        description={confirmState.type === 'rule' ? 'Are you sure you want to delete this automation rule? This action cannot be undone.' : 'Are you sure you want to remove this integration? This action cannot be undone.'}
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
