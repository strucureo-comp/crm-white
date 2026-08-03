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
  BarChart3,
  TrendingUp,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Eye,
  MousePointerClick,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps, disconnectApp } from '@/lib/db/automation/api';
import { ConnectedApp } from '@/lib/db/automation/types';

export default function MetaConnectorPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [app, setApp] = useState<ConnectedApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [campaignObjective, setCampaignObjective] = useState('OUTCOME_TRAFFIC');
  const [dailyBudget, setDailyBudget] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection form
  const [form, setForm] = useState({
    accessToken: '',
    adAccountId: '',
    apiVersion: 'v25.0',
  });

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const apps = await getConnectedApps(workspaceId);
        const metaApp = apps.find((a) => a.platform === 'meta_ads' && a.status === 'connected');
        setApp(metaApp || null);
      } catch (e) {
        console.error('Failed to load Meta data:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const handleConnect = async () => {
    if (!form.accessToken || !form.adAccountId) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/connectors/meta/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId }),
      });
      const data = await res.json();
      if (data.success) {
        const now = new Date().toISOString();
        setApp({
          id: 'meta-connected',
          app_id: 'meta-connected',
          platform: 'meta_ads',
          name: 'Meta Ads',
          status: 'connected',
          config: { adAccountId: form.adAccountId, apiVersion: form.apiVersion },
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
    if (!campaignName || !dailyBudget) return;
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch('/api/connectors/meta/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName,
          objective: campaignObjective,
          dailyBudgetCents: Math.round(parseFloat(dailyBudget) * 100),
          workspaceId,
        }),
      });
      const data = await res.json();
      setCreateResult({
        success: data.success,
        message: data.success
          ? `Campaign created: ${data.campaignId || 'Check Meta Ads Manager'}`
          : data.error || 'Failed to create campaign',
      });
    } catch (e) {
      setCreateResult({ success: false, message: 'Network error' });
    } finally {
      setCreating(false);
    }
  };

  const objectives = [
    { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
    { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
    { value: 'OUTCOME_LEADS', label: 'Leads' },
    { value: 'OUTCOME_SALES', label: 'Sales' },
    { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
    { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
  ];

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
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Meta Ads</h1>
              <p className="text-muted-foreground">Facebook & Instagram Ads Manager</p>
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
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Connection Tab */}
        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meta Ads API Credentials</CardTitle>
              <CardDescription>
                Enter your Meta Graph API credentials. You need a System User Token with{' '}
                <code className="bg-background px-1 rounded">ads_management</code> permission.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {app ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Connected to Meta Ads</p>
                      <p className="text-sm text-muted-foreground">
                        Ad Account: {app.config?.adAccountId || 'N/A'}
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
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">Access Token *</label>
                      <Input
                        type="password"
                        placeholder="Meta System User Access Token"
                        value={form.accessToken}
                        onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Ad Account ID *</label>
                      <Input
                        placeholder="act_123456789"
                        value={form.adAccountId}
                        onChange={(e) => setForm({ ...form, adAccountId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Version</label>
                      <Input
                        placeholder="v25.0"
                        value={form.apiVersion}
                        onChange={(e) => setForm({ ...form, apiVersion: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !form.accessToken || !form.adAccountId}
                    className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {connecting ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <BarChart3 size={16} className="mr-2" />
                    )}
                    {connecting ? 'Connecting...' : 'Connect Meta Ads'}
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
                Create a new Facebook/Instagram ad campaign. All campaigns are created in PAUSED state.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!app ? (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Connect Meta Ads first to create campaigns.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Campaign Name *</label>
                      <Input
                        placeholder="My Ad Campaign"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Objective</label>
                      <select
                        value={campaignObjective}
                        onChange={(e) => setCampaignObjective(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-background text-sm"
                      >
                        {objectives.map((obj) => (
                          <option key={obj.value} value={obj.value}>
                            {obj.label}
                          </option>
                        ))}
                      </select>
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
                  </div>
                  <Button
                    onClick={handleCreateCampaign}
                    disabled={creating || !campaignName || !dailyBudget}
                  >
                    {creating ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <TrendingUp size={16} className="mr-2" />
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

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Insights</CardTitle>
              <CardDescription>
                View performance metrics for your Meta Ads campaigns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Insights will appear here once campaigns are running.
                </p>
                <Button variant="outline" asChild>
                  <a
                    href="https://adsmanager.facebook.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={16} className="mr-2" />
                    Open Ads Manager
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
