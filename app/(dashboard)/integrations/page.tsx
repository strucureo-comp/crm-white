'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageSquare,
  BarChart3,
  TrendingUp,
  Globe,
  Plus,
  CheckCircle,
  XCircle,
  Settings,
  ArrowRight,
  Activity,
  Webhook as WebhookIcon,
  Zap,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps, getWebhooks } from '@/lib/db/automation/api';
import { ConnectedApp, Webhook } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

interface ConnectorDef {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href: string;
  platform: string;
  features: string[];
}

const connectors: ConnectorDef[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send and receive messages via WhatsApp Cloud API. Manage templates, webhooks, and two-way conversations.',
    icon: <MessageSquare size={24} />,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    href: '/integrations/whatsapp',
    platform: 'whatsapp',
    features: ['Send messages', 'Template management', 'Webhook events', 'Two-way chat'],
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Create and manage Facebook & Instagram ad campaigns. Track performance with real-time insights.',
    icon: <BarChart3 size={24} />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    href: '/integrations/meta',
    platform: 'meta_ads',
    features: ['Campaign creation', 'Audience targeting', 'Performance stats', 'Budget management'],
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Manage Google Search ad campaigns with GAQL queries. Create budgets, ad groups, and responsive search ads.',
    icon: <TrendingUp size={24} />,
    color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    href: '/integrations/google',
    platform: 'google_ads',
    features: ['GAQL queries', 'Budget management', 'Ad group creation', 'Performance tracking'],
  },
  {
    id: 'website_enquiries',
    name: 'Website Enquiries',
    description: 'HTTPS webhook endpoint to receive website form submissions directly into your CRM pipeline.',
    icon: <Globe size={24} />,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    href: '/integrations/website-enquiries',
    platform: 'website_enquiries',
    features: ['HTTPS webhook', 'Auto-create leads', 'Form validation', 'CRM pipeline sync'],
  },
];

export default function IntegrationsPage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';

  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      try {
        const [apps, wh] = await Promise.all([
          getConnectedApps(workspaceId),
          getWebhooks(workspaceId),
        ]);
        setConnectedApps(apps);
        setWebhooks(wh);
      } catch (e) {
        console.error('Failed to load integrations:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [workspaceId]);

  const isConnected = (platform: string) =>
    connectedApps.some((a) => a.platform === platform && a.status === 'connected');

  const connectedCount = connectedApps.filter((a) => a.status === 'connected').length;
  const activeWebhooks = webhooks.filter((w) => w.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Connector Hub</h1>
          <p className="text-muted-foreground">
            Connect your communication and advertising channels to the CRM
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold">{connectedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-2xl font-bold">{connectors.length}</p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Webhooks</p>
                <p className="text-2xl font-bold">{activeWebhooks}</p>
              </div>
              <WebhookIcon className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enquiries</p>
                <p className="text-2xl font-bold">
                  {connectedApps.filter((a) => a.platform === 'website_enquiries').length > 0
                    ? 'Active'
                    : 'Setup'}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connectors Grid */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Connectors</TabsTrigger>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="available">Available</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors.map((connector) => {
              const connected = isConnected(connector.platform);
              return (
                <Card key={connector.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${connector.color} flex items-center justify-center`}>
                        {connector.icon}
                      </div>
                      {connected ? (
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
                    <h3 className="text-lg font-semibold mb-2">{connector.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{connector.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {connector.features.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Link href={connector.href} className="flex-1">
                        <Button
                          className="w-full"
                          variant={connected ? 'outline' : 'default'}
                        >
                          {connected ? (
                            <>
                              <Settings size={16} className="mr-2" />
                              Configure
                            </>
                          ) : (
                            <>
                              <Plus size={16} className="mr-2" />
                              Connect
                            </>
                          )}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors
              .filter((c) => isConnected(c.platform))
              .map((connector) => (
                <Card key={connector.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${connector.color} flex items-center justify-center`}>
                        {connector.icon}
                      </div>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle size={12} className="mr-1" />
                        Connected
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{connector.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{connector.description}</p>
                    <Link href={connector.href}>
                      <Button variant="outline" className="w-full">
                        <Settings size={16} className="mr-2" />
                        Configure
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            {connectors.filter((c) => isConnected(c.platform)).length === 0 && (
              <Card className="col-span-2">
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No connected integrations</h3>
                  <p className="text-muted-foreground">
                    Connect your first channel to start automating
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {connectors
              .filter((c) => !isConnected(c.platform))
              .map((connector) => (
                <Card key={connector.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${connector.color} flex items-center justify-center`}>
                        {connector.icon}
                      </div>
                      <Badge variant="outline">Available</Badge>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{connector.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{connector.description}</p>
                    <Link href={connector.href}>
                      <Button className="w-full">
                        <Plus size={16} className="mr-2" />
                        Connect
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            {connectors.filter((c) => !isConnected(c.platform)).length === 0 && (
              <Card className="col-span-2">
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">All connectors are set up</h3>
                  <p className="text-muted-foreground">
                    Every available connector is already connected
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
