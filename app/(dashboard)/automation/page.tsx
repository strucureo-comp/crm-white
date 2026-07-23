'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Zap,
  Plus,
  Search,
  Activity,
  Key,
  Lock,
  Code,
  Webhook as WebhookIcon,
  FileText,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Pencil,
  Eye,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { 
  getRules, 
  createRule, 
  toggleRule, 
  deleteRule,
  getConnectedApps,
  disconnectApp,
  getExecutionLogs,
  getSecrets,
  getVariables,
  getTemplates,
  getWebhooks,
  getApiKeys,
} from '@/lib/db/automation/api';
import { 
  AutomationRule, 
  ConnectedApp, 
  ExecutionLog, 
  Secret, 
  Variable, 
  AutomationTemplate,
  Webhook,
  ApiKey 
} from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

const statusColors: Record<string, string> = {
  connected: 'bg-green-100 text-green-800',
  disconnected: 'bg-gray-100 text-gray-800',
  error: 'bg-red-100 text-red-800',
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  running: 'bg-blue-100 text-blue-800',
  started: 'bg-blue-100 text-blue-800',
  retrying: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

export default function AutomationHubPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';
  
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [apps, setApps] = useState<ConnectedApp[]>([]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!workspaceId) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const [rulesData, appsData, logsData, secretsData, variablesData, templatesData, webhooksData, apiKeysData] = await Promise.all([
          getRules(workspaceId),
          getConnectedApps(workspaceId),
          getExecutionLogs(workspaceId, undefined, 50),
          getSecrets(workspaceId),
          getVariables(workspaceId),
          getTemplates(workspaceId),
          getWebhooks(workspaceId),
          getApiKeys(workspaceId),
        ]);
        
        setRules(rulesData);
        setApps(appsData);
        setLogs(logsData);
        setSecrets(secretsData);
        setVariables(variablesData);
        setTemplates(templatesData);
        setWebhooks(webhooksData);
        setApiKeys(apiKeysData);
      } catch (error) {
        console.error('Failed to load automation data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [workspaceId]);

  const stats = {
    activeRules: rules.filter(r => r.enabled).length,
    totalExecutions: logs.length,
    successfulExecutions: logs.filter(l => l.status === 'completed').length,
    failedExecutions: logs.filter(l => l.status === 'failed').length,
    connectedApps: apps.filter(a => a.status === 'connected').length,
    activeWebhooks: webhooks.filter(w => w.status === 'active').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automation Hub</h1>
          <p className="text-muted-foreground">Connect apps, build workflows, and automate your business</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          New Automation
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">{stats.activeRules}</p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Executions</p>
                <p className="text-2xl font-bold">{stats.totalExecutions}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Apps</p>
                <p className="text-2xl font-bold">{stats.connectedApps}</p>
              </div>
              <Key className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">
                  {stats.totalExecutions > 0 
                    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
                    : 0}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:grid-cols-8 w-full">
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Zap size={14} />
            Rules
          </TabsTrigger>
          <TabsTrigger value="apps" className="flex items-center gap-2">
            <Key size={14} />
            Apps
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Activity size={14} />
            Logs
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <WebhookIcon size={14} />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Lock size={14} />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="variables" className="flex items-center gap-2">
            <Code size={14} />
            Variables
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText size={14} />
            Templates
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Settings size={14} />
            API
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button>
              <Plus size={16} className="mr-2" />
              Create Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No automation rules</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first rule to automate repetitive tasks
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules
                .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
                .map((rule) => (
                <Card key={rule.rule_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          rule.enabled ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <Zap className={`h-5 w-5 ${rule.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{rule.name}</h3>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {rule.trigger.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {rule.actions.length} actions
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {rule.execution_count} runs
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => toggleRule(workspaceId, rule.rule_id, checked)}
                        />
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Connected Apps Tab */}
        <TabsContent value="apps" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Connected Apps</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Connect App
            </Button>
          </div>

          {apps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No connected apps</h3>
                <p className="text-muted-foreground mb-4">
                  Connect your first app to start automating
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Connect App
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map((app) => (
                <Card key={app.app_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-lg font-bold">{app.name[0]}</span>
                        </div>
                        <div>
                          <h3 className="font-medium">{app.name}</h3>
                          <p className="text-xs text-muted-foreground capitalize">
                            {app.platform.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <Badge className={statusColors[app.status]}>
                        {app.status}
                      </Badge>
                    </div>
                    {app.last_synced_at && (
                      <p className="text-xs text-muted-foreground">
                        Last synced {formatDistanceToNow(new Date(app.last_synced_at))} ago
                      </p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Settings size={14} className="mr-1" />
                        Configure
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => disconnectApp(workspaceId, app.app_id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Execution Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Execution Logs</h2>
            <Button variant="outline">
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
          </div>

          {logs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No executions yet</h3>
                <p className="text-muted-foreground">
                  Execution logs will appear here when rules run
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.log_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          log.status === 'completed' ? 'bg-green-100' :
                          log.status === 'failed' ? 'bg-red-100' :
                          'bg-blue-100'
                        }`}>
                          {log.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : log.status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-600" />
                          ) : (
                            <Clock className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {log.trigger_source} trigger
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {log.steps.length} steps • {log.duration_ms ? `${log.duration_ms}ms` : 'In progress'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={statusColors[log.status]}>
                          {log.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.created_at))} ago
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Webhooks</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Create Webhook
            </Button>
          </div>

          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <WebhookIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No webhooks</h3>
                <p className="text-muted-foreground mb-4">
                  Create webhooks to receive or send data
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Create Webhook
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <Card key={webhook.webhook_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          webhook.direction === 'incoming' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          <ArrowRight className={`h-5 w-5 ${
                            webhook.direction === 'incoming' ? 'text-blue-600' : 'text-green-600'
                          } ${webhook.direction === 'incoming' ? 'rotate-180' : ''}`} />
                        </div>
                        <div>
                          <h3 className="font-medium">{webhook.name}</h3>
                          <p className="text-sm text-muted-foreground truncate max-w-md">
                            {webhook.url}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {webhook.direction}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {webhook.events.length} events
                            </span>
                            <span className="text-xs text-green-600">
                              {webhook.success_count} ✓
                            </span>
                            <span className="text-xs text-red-600">
                              {webhook.failure_count} ✗
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[webhook.status]}>
                          {webhook.status}
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Secrets Tab */}
        <TabsContent value="secrets" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Secrets</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Add Secret
            </Button>
          </div>

          {secrets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No secrets</h3>
                <p className="text-muted-foreground mb-4">
                  Store API keys and credentials securely
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Add Secret
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {secrets.map((secret) => (
                <Card key={secret.secret_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Lock className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{secret.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {secret.category.replace(/_/g, ' ')}
                            {secret.platform && ` • ${secret.platform.replace(/_/g, ' ')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Pencil size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600">
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Variables</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Add Variable
            </Button>
          </div>

          {variables.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Code className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No variables</h3>
                <p className="text-muted-foreground mb-4">
                  Create variables to use in templates and automations
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Add Variable
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variables.map((variable) => (
                <Card key={variable.variable_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium font-mono">{`{{${variable.name}}}`}</h3>
                      <Badge variant="outline" className="text-xs">
                        {variable.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{variable.value}</p>
                    {variable.description && (
                      <p className="text-xs text-muted-foreground mt-2">{variable.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Templates</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Create Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No templates</h3>
                <p className="text-muted-foreground mb-4">
                  Create reusable templates for emails, messages, and more
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card key={template.template_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {template.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {template.content}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        Used {template.usage_count} times
                      </span>
                      <Button variant="ghost" size="sm">
                        <Copy size={14} className="mr-1" />
                        Use
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">API Keys</h2>
            <Button>
              <Plus size={16} className="mr-2" />
              Generate Key
            </Button>
          </div>

          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No API keys</h3>
                <p className="text-muted-foreground mb-4">
                  Generate API keys to access your data programmatically
                </p>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Generate Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <Card key={key.key_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Key className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-medium">{key.name}</h3>
                          <p className="text-sm font-mono text-muted-foreground">
                            {key.key_prefix}...
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {key.scopes.map((scope) => (
                              <Badge key={scope} variant="outline" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Rate limit: {key.rate_limit}/min
                        </p>
                        {key.last_used_at && (
                          <p className="text-xs text-muted-foreground">
                            Last used {formatDistanceToNow(new Date(key.last_used_at))} ago
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
