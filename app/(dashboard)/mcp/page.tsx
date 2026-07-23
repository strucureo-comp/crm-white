'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Plus, Search, Bot, Code, Terminal, Zap, Shield, Trash2, Eye, EyeOff, ExternalLink, BookOpen, Lock } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getMcpServers, createMcpServer, deleteMcpServer, getMcpTools } from '@/lib/db/automation/api';
import { McpServer, McpTool } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  connected: 'bg-green-100 text-green-800', disconnected: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800', connecting: 'bg-yellow-100 text-yellow-800',
};

export default function McpPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [newServer, setNewServer] = useState({ name: '', url: '', api_key: '', description: '', capabilities: [] as string[] });

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([getMcpServers(workspaceId), getMcpTools(workspaceId)])
      .then(([s, t]) => { setServers(s); setTools(t); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleCreateServer = async () => {
    if (!newServer.name.trim() || !newServer.url.trim()) return;
    const server = await createMcpServer(workspaceId, {
      workspace_id: workspaceId,
      name: newServer.name, url: newServer.url, api_key: newServer.api_key,
      description: newServer.description, status: 'disconnected', capabilities: newServer.capabilities,
    });
    setServers([server, ...servers]);
    setShowCreateDialog(false);
    setNewServer({ name: '', url: '', api_key: '', description: '', capabilities: [] });
  };

  const handleDeleteServer = async (id: string) => {
    await deleteMcpServer(workspaceId, id);
    setServers(servers.filter(s => s.server_id !== id));
  };

  const toggleApiKeyVisibility = (id: string) => setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = servers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const stats = { total: servers.length, connected: servers.filter(s => s.status === 'connected').length, totalTools: tools.length, activeTools: tools.filter(t => t.enabled).length };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">MCP Integration</h1><p className="text-muted-foreground">Connect AI assistants using the Model Context Protocol</p></div>
        <Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Add Server</Button>
      </div>

      <Card className="bg-primary/5 border-primary/20"><CardContent className="p-6"><div className="flex items-start gap-4"><div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Bot className="h-6 w-6 text-primary" /></div><div><h3 className="font-semibold mb-1">What is MCP?</h3><p className="text-sm text-muted-foreground">The Model Context Protocol (MCP) is an open standard that lets AI assistants like Claude connect to your CRM data using natural language.</p></div></div></CardContent></Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Servers</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Connected</p><p className="text-2xl font-bold">{stats.connected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Tools</p><p className="text-2xl font-bold">{stats.totalTools}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active Tools</p><p className="text-2xl font-bold">{stats.activeTools}</p></CardContent></Card>
      </div>

      <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search servers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>

      <Tabs defaultValue="servers">
        <TabsList><TabsTrigger value="servers">Servers ({stats.total})</TabsTrigger><TabsTrigger value="tools">Tools ({stats.totalTools})</TabsTrigger><TabsTrigger value="docs">Documentation</TabsTrigger></TabsList>
        <TabsContent value="servers" className="space-y-4">
          {filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Terminal className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-medium mb-2">No MCP servers</h3><Button onClick={() => setShowCreateDialog(true)}><Plus size={16} className="mr-2" />Add Server</Button></CardContent></Card>
          ) : filtered.map(s => (
            <Card key={s.server_id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{s.name}</h3>
                      <Badge className={statusColors[s.status]}>{s.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{s.description || 'No description'}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.url}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.api_key && (<Button variant="ghost" size="sm" onClick={() => toggleApiKeyVisibility(s.server_id)}>{showApiKey[s.server_id] ? <EyeOff size={14} /> : <Eye size={14} />}</Button>)}
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteServer(s.server_id)}><Trash2 size={14} /></Button>
                  </div>
                </div>
                {s.api_key && showApiKey[s.server_id] && (
                  <div className="mt-3 p-3 bg-muted rounded-lg"><code className="text-xs break-all">{s.api_key}</code></div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="tools" className="space-y-4">
          {tools.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No tools available. Connect a server first.</p></CardContent></Card>
          ) : tools.map(t => (
            <Card key={t.tool_id}><CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3"><Zap className="h-5 w-5 text-primary" /><div><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.description}</p></div></div>
              <Badge variant={t.enabled ? 'default' : 'secondary'}>{t.enabled ? 'Active' : 'Disabled'}</Badge>
            </CardContent></Card>
          ))}
        </TabsContent>
        <TabsContent value="docs">
          <Card><CardContent className="p-6 space-y-6">
            <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen size={20} />MCP Documentation</h3>
            <div className="space-y-4">
              <div><h4 className="font-medium mb-2">Getting Started</h4><p className="text-sm text-muted-foreground">Add your MCP server URL and API key to connect your AI assistant. Once connected, the AI can query your CRM data including contacts, deals, campaigns, and more.</p></div>
              <div><h4 className="font-medium mb-2">Authentication</h4><p className="text-sm text-muted-foreground">MCP servers are authenticated using API keys. Generate an API key from the API Keys section and include it in the server configuration.</p></div>
              <div><h4 className="font-medium mb-2">Available Tools</h4><p className="text-sm text-muted-foreground">Tools are automatically discovered from connected servers. Each tool represents a capability the AI assistant can use, such as searching contacts, creating deals, or sending emails.</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg"><div className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Add MCP Server</h2>
            <div><label className="text-sm font-medium mb-2 block">Name *</label><Input placeholder="Server name" value={newServer.name} onChange={(e) => setNewServer({ ...newServer, name: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">URL *</label><Input placeholder="https://..." value={newServer.url} onChange={(e) => setNewServer({ ...newServer, url: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">API Key</label><Input type="password" placeholder="API key" value={newServer.api_key} onChange={(e) => setNewServer({ ...newServer, api_key: e.target.value })} /></div>
            <div><label className="text-sm font-medium mb-2 block">Description</label><Input placeholder="Description" value={newServer.description} onChange={(e) => setNewServer({ ...newServer, description: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button><Button onClick={handleCreateServer}>Add</Button></div>
          </div></Card>
        </div>
      )}
    </div>
  );
}
