'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps, disconnectApp } from '@/lib/db/automation/api';
import { ConnectedApp } from '@/lib/db/automation/types';

export default function GoogleConnectorPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [app, setApp] = useState<ConnectedApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Campaign form
  const [campaignName, setCampaignName] = useState('');
  const [dailyBudget, setDailyBudget] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection form
  const [form, setForm] = useState({
    clientId: '',
    clientSecret: '',
    refreshToken: '',
    developerToken: '',
    loginCustomerId: '',
    customerId: '',
  });

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const apps = await getConnectedApps(workspaceId);
        const gApp = apps.find((a) => a.platform === 'google_ads' && a.status === 'connected');
        setApp(gApp || null);
      } catch (e) {
        console.error('Failed to load Google data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const handleConnect = async () => {
    if (!form.clientId || !form.clientSecret || !form.refreshToken || !form.developerToken || !form.loginCustomerId || !form.customerId) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/connectors/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date().toISOString();
        setApp({
          id: 'google-connected',
          app_id: 'google-connected',
          platform: 'google_ads',
          name: 'Google Ads',
          status: 'connected',
          config: { customerId: form.customerId, loginCustomerId: form.loginCustomerId },
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

  const handleCreateCampaign = async () => {
    if (!campaignName || !dailyBudget || !targetUrl) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch('/api/connectors/google/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          dailyBudgetMicros: Math.round(parseFloat(dailyBudget) * 1_000_000),
          targetUrl,
          workspaceId,
        }),
      });
      const data = await res.json();
      setCreateResult({
        success: data.success,
        message: data.success
          ? `Campaign created: ${data.campaignResourceName || 'Check Google Ads'}`
          : data.error || 'Failed to create campaign',
      });
    } catch (e) {
      setCreateResult({ success: false, message: 'Network error' });
    } finally {
      setCreating(false);
    }
  };

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
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Google Ads</h1>
              <p className="text-muted-foreground">Google Ads API Connector</p>
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

      <Tabs defaultValue={app ? 'campaigns' : 'connect'} className="space-y-4">
        <TabsList>
          <TabsTrigger value="connect">Connection</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="queries">GAQL Queries</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google Ads API Credentials</CardTitle>
              <CardDescription>
                Enter your Google Ads API OAuth2 credentials. Create a{' '}
                <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">
                  Google Cloud Project
                </a>{' '}
                with Ads API enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {app ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Connected to Google Ads</p>
                      <p className="text-sm text-muted-foreground">
                        Customer ID: {app.config?.customerId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={handleDisconnect} className="text-red-600">
                    Disconnect
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client ID *</label>
                      <Input
                        placeholder="OAuth2 Client ID"
                        value={form.clientId}
                        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client Secret *</label>
                      <Input
                        type="password"
                        placeholder="OAuth2 Client Secret"
                        value={form.clientSecret}
                        onChange={(e) => setForm({ ...form, clientSecret: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Refresh Token *</label>
                      <Input
                        type="password"
                        placeholder="OAuth2 Refresh Token"
                        value={form.refreshToken}
                        onChange={(e) => setForm({ ...form, refreshToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Developer Token *</label>
                      <Input
                        placeholder="From Google Ads API Center"
                        value={form.developerToken}
                        onChange={(e) => setForm({ ...form, developerToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Login Customer ID *</label>
                      <Input
                        placeholder="123-456-7890 (no dashes)"
                        value={form.loginCustomerId}
                        onChange={(e) => setForm({ ...form, loginCustomerId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Customer ID *</label>
                      <Input
                        placeholder="123-456-7890 (no dashes)"
                        value={form.customerId}
                        onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !form.clientId || !form.clientSecret || !form.refreshToken || !form.developerToken || !form.loginCustomerId || !form.customerId}
                    className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    {connecting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <TrendingUp size={16} className="mr-2" />
                    )}
                    {connecting ? 'Connecting...' : 'Connect Google Ads'}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Campaign</CardTitle>
              <CardDescription>
                Create a new Google Search campaign with budget, ad group, and responsive search ad.
                All created in PAUSED state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!app ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Connect Google Ads first to create campaigns.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Campaign Name *</label>
                      <Input
                        placeholder="My Search Campaign"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Daily Budget (INR) *</label>
                      <Input
                        type="number"
                        placeholder="500"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Target URL *</label>
                      <Input
                        placeholder="https://example.com/landing"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={creating || !campaignName || !dailyBudget || !targetUrl}
                  >
                    {creating ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <DollarSign size={16} className="mr-2" />
                    )}
                    {creating ? 'Creating...' : 'Create Campaign'}
                  </Button>
                  {createResult && (
                    <div
                      className={`p-3 rounded-lg text-sm ${
                        createResult.success
                          ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {createResult.message}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GAQL Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GAQL Query Reference</CardTitle>
              <CardDescription>
                Google Ads Query Language (GAQL) examples for querying your campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    label: 'List all campaigns',
                    query: "SELECT campaign.id, campaign.name, campaign.status FROM campaign",
                  },
                  {
                    label: 'Campaign metrics',
                    query: "SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS",
                  },
                  {
                    label: 'Search terms report',
                    query: "SELECT search_term_view.search_term, metrics.impressions, metrics.clicks FROM search_term_view WHERE segments.date DURING LAST_7_DAYS",
                  },
                ].map((example) => (
                  <div key={example.label} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">{example.label}</p>
                    <code className="text-xs font-mono text-muted-foreground break-all">
                      {example.query}
                    </code>
                  </div>
                ))}
              </div>
              <Button variant="outline" asChild>
                <a
                  href="https://developers.google.com/google-ads/api/docs/gaql"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={16} className="mr-2" />
                  GAQL Documentation
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
