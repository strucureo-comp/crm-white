'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  ExternalLink,
  CheckCircle,
  Zap,
  Globe,
  BarChart3,
  Mail,
  MessageSquare,
  FileText,
  Users,
  ShoppingCart,
  Calendar,
  Database,
  Cloud,
  Code,
  Shield,
  TrendingUp,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-context';
import { getConnectedApps } from '@/lib/db/automation/api';
import { ConnectedApp } from '@/lib/db/automation/types';
import { formatDistanceToNow } from 'date-fns';

interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  popular: boolean;
  connected?: boolean;
}

const marketplaceApps: MarketplaceApp[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications, update channels, and manage messages from Slack.',
    category: 'Communication',
    icon: <MessageSquare size={24} />,
    color: 'bg-purple-100 text-purple-600',
    features: ['Send messages', 'Create channels', 'Update status'],
    popular: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Post updates, manage servers, and engage with communities on Discord.',
    category: 'Communication',
    icon: <MessageSquare size={24} />,
    color: 'bg-indigo-100 text-indigo-600',
    features: ['Post messages', 'Manage channels', 'User roles'],
    popular: true,
  },
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Manage ad campaigns, track performance, and optimize spending.',
    category: 'Advertising',
    icon: <TrendingUp size={24} />,
    color: 'bg-blue-100 text-blue-600',
    features: ['Campaign management', 'Performance tracking', 'Budget alerts'],
    popular: true,
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Run Facebook and Instagram ad campaigns with advanced targeting.',
    category: 'Advertising',
    icon: <BarChart3 size={24} />,
    color: 'bg-blue-100 text-blue-600',
    features: ['Ad creation', 'Audience targeting', 'Performance reports'],
    popular: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Sync issues, manage repositories, and track development progress.',
    category: 'Development',
    icon: <Code size={24} />,
    color: 'bg-gray-100 text-gray-600',
    features: ['Issue sync', 'PR notifications', 'Release tracking'],
    popular: false,
  },
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync events, schedule meetings, and manage your team calendar.',
    category: 'Productivity',
    icon: <Calendar size={24} />,
    color: 'bg-green-100 text-green-600',
    features: ['Event sync', 'Meeting scheduling', 'Calendar sharing'],
    popular: true,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments, manage subscriptions, and track revenue.',
    category: 'Finance',
    icon: <ShoppingCart size={24} />,
    color: 'bg-indigo-100 text-indigo-600',
    features: ['Payment processing', 'Subscription management', 'Revenue tracking'],
    popular: true,
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Manage email campaigns, subscribers, and marketing automation.',
    category: 'Email Marketing',
    icon: <Mail size={24} />,
    color: 'bg-yellow-100 text-yellow-600',
    features: ['Email campaigns', 'Subscriber management', 'Analytics'],
    popular: false,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect to 5,000+ apps and automate workflows without code.',
    category: 'Automation',
    icon: <Zap size={24} />,
    color: 'bg-orange-100 text-orange-600',
    features: ['5000+ integrations', 'Multi-step zaps', 'Conditional logic'],
    popular: true,
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Sync data between Airtable bases and manage your databases.',
    category: 'Database',
    icon: <Database size={24} />,
    color: 'bg-cyan-100 text-cyan-600',
    features: ['Base sync', 'Record management', 'Views'],
    popular: false,
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts, deals, and marketing data with HubSpot CRM.',
    category: 'CRM',
    icon: <Users size={24} />,
    color: 'bg-orange-100 text-orange-600',
    features: ['Contact sync', 'Deal tracking', 'Marketing automation'],
    popular: false,
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Integrate with Salesforce for enterprise CRM synchronization.',
    category: 'CRM',
    icon: <Cloud size={24} />,
    color: 'bg-blue-100 text-blue-600',
    features: ['Lead sync', 'Opportunity tracking', 'Custom objects'],
    popular: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync pages, databases, and content between Notion and your apps.',
    category: 'Productivity',
    icon: <FileText size={24} />,
    color: 'bg-gray-100 text-gray-600',
    features: ['Page sync', 'Database sync', 'Content management'],
    popular: false,
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Connect to any service using HTTP webhooks.',
    category: 'Developer',
    icon: <Globe size={24} />,
    color: 'bg-teal-100 text-teal-600',
    features: ['HTTP requests', 'Custom headers', 'JSON payloads'],
    popular: false,
  },
  {
    id: 'api',
    name: 'REST API',
    description: 'Integrate with any REST API endpoint.',
    category: 'Developer',
    icon: <Code size={24} />,
    color: 'bg-gray-100 text-gray-600',
    features: ['GET/POST/PUT/DELETE', 'Authentication', 'Custom headers'],
    popular: false,
  },
];

const categories = ['All', 'Communication', 'Advertising', 'Development', 'Productivity', 'Finance', 'Email Marketing', 'Automation', 'Database', 'CRM', 'Developer'];

export default function MarketplacePage() {
  const { workspace } = useAuth();
  const workspaceId = workspace?.id || '';
  
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    
    const loadConnectedApps = async () => {
      try {
        const apps = await getConnectedApps(workspaceId);
        setConnectedApps(apps);
      } catch (error) {
        console.error('Failed to load connected apps:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadConnectedApps();
  }, [workspaceId]);

  const isConnected = (appId: string) => {
    return connectedApps.some(app => app.platform === appId && app.status === 'connected');
  };

  const filteredApps = marketplaceApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const popularApps = filteredApps.filter(app => app.popular);
  const allApps = filteredApps;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Marketplace</h1>
          <p className="text-muted-foreground">Connect your favorite tools and services</p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Request Integration
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background text-sm"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Connected Apps Summary */}
      {connectedApps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connected Apps ({connectedApps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {connectedApps
                .filter(app => app.status === 'connected')
                .map(app => (
                <div
                  key={app.app_id}
                  className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                >
                  <CheckCircle size={14} className="text-green-600" />
                  <span className="text-sm font-medium">{app.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {app.platform}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="popular" className="space-y-4">
        <TabsList>
          <TabsTrigger value="popular" className="flex items-center gap-2">
            <TrendingUp size={14} />
            Popular
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe size={14} />
            All Integrations
          </TabsTrigger>
        </TabsList>

        {/* Popular Apps Tab */}
        <TabsContent value="popular" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularApps.map((app) => (
              <Card key={app.id} className="relative overflow-hidden">
                {app.popular && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary text-primary-foreground">Popular</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                    {app.icon}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{app.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {app.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {app.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {isConnected(app.id) ? (
                      <Button variant="outline" className="flex-1" disabled>
                        <CheckCircle size={16} className="mr-2" />
                        Connected
                      </Button>
                    ) : (
                      <Button className="flex-1">
                        <Zap size={16} className="mr-2" />
                        Connect
                      </Button>
                    )}
                    <Button variant="ghost" size="icon">
                      <ExternalLink size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* All Apps Tab */}
        <TabsContent value="all" className="space-y-4">
          {selectedCategory === 'All' ? (
            <div className="space-y-6">
              {categories.filter(cat => cat !== 'All').map(category => {
                const categoryApps = allApps.filter(app => app.category === category);
                if (categoryApps.length === 0) return null;
                
                return (
                  <div key={category}>
                    <h2 className="text-lg font-semibold mb-3">{category}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryApps.map((app) => (
                        <Card key={app.id}>
                          <CardContent className="p-6">
                            <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                              {app.icon}
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{app.name}</h3>
                            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                              {app.description}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {app.features.slice(0, 3).map((feature) => (
                                <Badge key={feature} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              {isConnected(app.id) ? (
                                <Button variant="outline" className="flex-1" disabled>
                                  <CheckCircle size={16} className="mr-2" />
                                  Connected
                                </Button>
                              ) : (
                                <Button className="flex-1">
                                  <Zap size={16} className="mr-2" />
                                  Connect
                                </Button>
                              )}
                              <Button variant="ghost" size="icon">
                                <ExternalLink size={16} />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allApps.map((app) => (
                <Card key={app.id}>
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl ${app.color} flex items-center justify-center mb-4`}>
                      {app.icon}
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{app.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {app.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {app.features.slice(0, 3).map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {isConnected(app.id) ? (
                        <Button variant="outline" className="flex-1" disabled>
                          <CheckCircle size={16} className="mr-2" />
                          Connected
                        </Button>
                      ) : (
                        <Button className="flex-1">
                          <Zap size={16} className="mr-2" />
                          Connect
                        </Button>
                      )}
                      <Button variant="ghost" size="icon">
                        <ExternalLink size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Custom Integration CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Need a custom integration?</h3>
              <p className="text-primary-foreground/80">
                Use our REST API or webhooks to connect to any service. 
                Our developer docs make it easy to build custom integrations.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary">
                <Code size={16} className="mr-2" />
                API Docs
              </Button>
              <Button variant="secondary">
                <Globe size={16} className="mr-2" />
                Webhooks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
