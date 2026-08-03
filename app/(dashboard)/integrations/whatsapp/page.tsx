'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Webhook as WebhookIcon,
  FileText,
  CheckCircle,
  XCircle,
  Copy,
  RefreshCw,
  Settings,
  Phone,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps, disconnectApp, getWebhooks } from '@/lib/db/automation/api';
import { ConnectedApp, Webhook } from '@/lib/db/automation/types';

export default function WhatsAppConnectorPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [app, setApp] = useState<ConnectedApp | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection form
  const [form, setForm] = useState({
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    verifyToken: '',
    appId: '',
    appSecret: '',
  });

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const [apps, wh] = await Promise.all([
          getConnectedApps(workspaceId),
          getWebhooks(workspaceId),
        ]);
        const waApp = apps.find((a) => a.platform === 'whatsapp' && a.status === 'connected');
        setApp(waApp || null);
        setWebhooks(wh.filter((w) => w.url.includes('whatsapp')));
      } catch (e) {
        console.error('Failed to load WhatsApp data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const handleConnect = async () => {
    if (!form.phoneNumberId || !form.wabaId || !form.accessToken) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/connectors/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date().toISOString();
        setApp({
          id: 'whatsapp-connected',
          app_id: 'whatsapp-connected',
          platform: 'whatsapp',
          name: 'WhatsApp',
          status: 'connected',
          config: { phoneNumberId: form.phoneNumberId, wabaId: form.wabaId },
          connected_at: now,
          created_at: now,
          updated_at: now,
        });
      }
    } catch (e) {
      console.error('Connect failed:', e);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!app?.app_id || !workspaceId) return;
    await disconnectApp(workspaceId, app.app_id);
    setApp(null);
  };

  const handleSendTest = async () => {
    if (!testPhone || !testMessage) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/connectors/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          body: testMessage,
          workspaceId,
        }),
      });
      const data = await res.json();
      setSendResult({
        success: data.success,
        message: data.success ? 'Message sent successfully' : data.error || 'Failed to send',
      });
    } catch (e) {
      setSendResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/connectors/whatsapp/webhook`
    : '/api/connectors/whatsapp/webhook';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/integrations">
          <Button variant="ghost" size="icon">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">WhatsApp Business</h1>
              <p className="text-muted-foreground">WhatsApp Cloud API Connector</p>
            </div>
          </div>
        </div>
        {app ? (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle size={12} className="mr-1" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline">
            <XCircle size={12} className="mr-1" />
            Not Connected
          </Badge>
        )}
      </div>

      <Tabs defaultValue={app ? 'send' : 'connect'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="connect">Connection</TabsTrigger>
          <TabsTrigger value="send">Send Message</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Cloud API Credentials</CardTitle>
              <CardDescription>
                Enter your Meta WhatsApp Business API credentials to connect.
                You can find these in your{' '}
                <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary underline">
                  Meta for Developers
                </a>{' '}
                dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {app ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Connected to WhatsApp</p>
                      <p className="text-sm text-muted-foreground">
                        Phone: {app.config?.displayPhoneNumber || app.config?.phoneNumberId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleDisconnect} className="text-red-600">
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number ID *</label>
                      <Input
                        placeholder="e.g. 1234567890"
                        value={form.phoneNumberId}
                        onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">WhatsApp Business Account ID *</label>
                      <Input
                        placeholder="e.g. WABA-123456"
                        value={form.wabaId}
                        onChange={(e) => setForm({ ...form, wabaId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Access Token *</label>
                      <Input
                        type="password"
                        placeholder="Permanent or temporary access token"
                        value={form.accessToken}
                        onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Verify Token</label>
                      <Input
                        placeholder="For webhook verification"
                        value={form.verifyToken}
                        onChange={(e) => setForm({ ...form, verifyToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">App ID</label>
                      <Input
                        placeholder="Meta App ID"
                        value={form.appId}
                        onChange={(e) => setForm({ ...form, appId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">App Secret</label>
                      <Input
                        type="password"
                        placeholder="Meta App Secret"
                        value={form.appSecret}
                        onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !form.phoneNumberId || !form.wabaId || !form.accessToken}
                    className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white dark:bg-green-600 dark:hover:bg-green-700"
                  >
                    {connecting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <MessageSquare size={16} className="mr-2" />
                    )}
                    {connecting ? 'Connecting...' : 'Connect WhatsApp'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Message Tab */}
        <TabsContent value="send" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Message</CardTitle>
              <CardDescription>
                Send a text message through the WhatsApp Cloud API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!app ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Connect WhatsApp first to send messages.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recipient Phone Number</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Include country code. Format: +[country code] [number]
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Message</label>
                    <Input
                      placeholder="Type your message..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={handleSendTest}
                    disabled={sending || !testPhone || !testMessage}
                  >
                    {sending ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Send size={16} className="mr-2" />
                    )}
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                  {sendResult && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        sendResult.success
                          ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {sendResult.message}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Tab */}
        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhook Configuration</CardTitle>
              <CardDescription>
                Configure this URL in your Meta App dashboard to receive incoming messages and status updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Webhook URL</label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={webhookUrl} className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Verify Token</label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={app?.config?.verifyToken || form.verifyToken || 'Set during connection'}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      navigator.clipboard.writeText(app?.config?.verifyToken || form.verifyToken || '')
                    }
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                <p className="font-medium">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-primary underline">Meta for Developers</a> → Your App → WhatsApp → Configuration</li>
                  <li>Under &quot;Webhook&quot;, click Edit and paste the Webhook URL above</li>
                  <li>Enter the Verify Token you set during connection</li>
                  <li>Subscribe to: <code className="bg-background px-1 rounded">messages</code>, <code className="bg-background px-1 rounded">message_template_status_update</code></li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>
                View and manage your WhatsApp Business message templates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Template management requires the connected WhatsApp account.
                </p>
                <Button variant="outline" asChild>
                  <a
                    href="https://business.facebook.com/wa/manage/message-templates/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Manage Templates in Meta
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
