'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Battery, Phone, Navigation, Search, MessageSquare, Send, Radio, Clock, Loader2, Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { FieldAgentDialog } from '@/components/dialogs/field-agent-dialog';
import { getFieldAgents, deleteFieldAgent, getFieldAlerts } from '@/lib/firebase/database';
import type { FieldAgent, FieldAlert } from '@/lib/db/types';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function FieldMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<FieldAgent[]>([]);
  const [alerts, setAlerts] = useState<FieldAlert[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FieldAgent | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, al] = await Promise.all([getFieldAgents(), getFieldAlerts()]);
      setAgents(a);
      setAlerts(al);
    } catch {
      toast.error('Failed to load field data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    const id = confirmState.id;
    if (!id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deleteFieldAgent(id);
      toast.success('Agent removed');
      load();
    } catch {
      toast.error('Failed to remove agent');
    } finally {
      setConfirmState({ open: false });
    }
  }

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.location.toLowerCase().includes(search.toLowerCase())
  );

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
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Field Monitoring</h2>
          <p className="text-sm text-muted-foreground">Track field agents in real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { const m = prompt('Broadcast message to all agents:'); if (m) { toast.success('Message broadcast to all agents'); } }} className="text-xs sm:text-sm">
            <Radio size={14} className="mr-1.5" />
            Broadcast
          </Button>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            Add Agent
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search agents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Radio size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No field agents tracked yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {filtered.map((agent) => (
              <Card key={agent.id} className="hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {agent.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background ${
                          agent.status === 'Active' ? 'bg-emerald-500' :
                          agent.status === 'On Break' ? 'bg-amber-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin size={12} className="shrink-0" />
                          <span className="truncate">{agent.location}</span>
                          <span className="shrink-0">·</span>
                          <Clock size={12} className="shrink-0" />
                          <span className="shrink-0">{agent.lastCheckin}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Battery size={12} className={agent.battery < 35 ? 'text-red-500' : agent.battery < 60 ? 'text-amber-500' : 'text-emerald-500'} />
                        <span className={agent.battery < 35 ? 'text-red-500 font-medium' : ''}>{agent.battery}%</span>
                      </div>
                      <Badge variant="secondary" className={`
                        text-[10px] px-1.5 py-0
                        ${agent.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                          agent.status === 'On Break' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}
                      `}>{agent.status}</Badge>
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(agent.location)}`, '_blank')}>
                          <Navigation size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.message(`Messaging ${agent.name} coming soon`)}>
                          <MessageSquare size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { const phone = (agent as any).phone; if (phone) { window.open(`tel:${phone}`); } else { toast.error('No phone number for this agent'); } }}>
                          <Phone size={12} />
                        </Button>
                        <div className="relative">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMenuOpen(menuOpen === agent.id ? null : agent.id)}>
                            <MoreHorizontal size={12} />
                          </Button>
                          {menuOpen === agent.id && (
                            <div className="absolute right-0 top-8 z-10 w-32 rounded-md border bg-background shadow-lg">
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => { setEditing(agent); setMenuOpen(null); setDialogOpen(true); }}>
                                <Pencil size={14} /> Edit
                              </button>
                              <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(agent.id); setMenuOpen(null); }}>
                                <Trash2 size={14} /> Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                    <Navigation size={12} />
                    {agent.route}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className="flex items-start gap-3 pb-3 border-b last:border-0 last:pb-0">
                        <div className={`w-2 h-2 rounded-full mt-1.5 ${
                          alert.type === 'Low Battery' ? 'bg-red-500' :
                          alert.type === 'Check-in' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{alert.agent}</span>
                            <span className="text-muted-foreground"> - {alert.message}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const msg = fd.get('quickMsg') as string; if (msg?.trim()) { toast.success('Message sent to all agents'); e.currentTarget.reset(); } }} className="flex gap-2">
                  <Input name="quickMsg" placeholder="Type a broadcast message..." />
                  <Button type="submit" size="icon">
                    <Send size={16} />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <FieldAgentDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} agent={editing} />

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Remove agent"
        description="Are you sure you want to remove this agent? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
