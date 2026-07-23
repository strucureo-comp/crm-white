'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  BookOpen,
  FileText,
  Video,
  MessageCircle,
  Mail,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Zap,
  Users,
  Building2,
  Handshake,
  FileCheck,
  Receipt,
  CreditCard,
  Activity,
  Settings,
  HelpCircle,
  Lightbulb,
  ArrowRight,
  Globe,
  Bot,
  Calendar,
  Image,
  Share2,
  BarChart3,
  Code,
} from 'lucide-react';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  articles: DocArticle[];
}

interface DocArticle {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
}

const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Lightbulb size={20} />,
    description: 'Learn the basics and get up and running quickly',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to BridgeBreak',
        description: 'Overview of BridgeBreak CRM and what it can do for your business.',
        category: 'Basics',
        readTime: '5 min',
      },
      {
        id: 'quick-start',
        title: 'Quick Start Guide',
        description: 'Set up your workspace, add your first contacts, and create deals in minutes.',
        category: 'Setup',
        readTime: '10 min',
      },
      {
        id: 'import-data',
        title: 'Importing Your Data',
        description: 'How to import contacts, companies, and deals from spreadsheets or other CRMs.',
        category: 'Data',
        readTime: '8 min',
      },
    ],
  },
  {
    id: 'crm-essentials',
    title: 'CRM Essentials',
    icon: <Users size={20} />,
    description: 'Master contacts, companies, deals, and the sales pipeline',
    articles: [
      {
        id: 'managing-contacts',
        title: 'Managing Contacts',
        description: 'Create, edit, and organize your contacts with tags and notes.',
        category: 'Contacts',
        readTime: '6 min',
      },
      {
        id: 'companies',
        title: 'Working with Companies',
        description: 'Link contacts to companies and track company-level information.',
        category: 'Companies',
        readTime: '5 min',
      },
      {
        id: 'deals-pipeline',
        title: 'Deals & Pipeline',
        description: 'Manage your sales pipeline, track deal stages, and forecast revenue.',
        category: 'Deals',
        readTime: '8 min',
      },
      {
        id: 'lead-management',
        title: 'Lead Management',
        description: 'Capture leads, qualify them, and convert them into contacts and deals.',
        category: 'Leads',
        readTime: '7 min',
      },
    ],
  },
  {
    id: 'invoicing',
    title: 'Invoicing & Payments',
    icon: <Receipt size={20} />,
    description: 'Create invoices, track payments, and manage your finances',
    articles: [
      {
        id: 'creating-invoices',
        title: 'Creating Invoices',
        description: 'Generate professional invoices from deals or as standalone documents.',
        category: 'Invoicing',
        readTime: '6 min',
      },
      {
        id: 'tracking-payments',
        title: 'Tracking Payments',
        description: 'Record payments and keep your invoice status up to date.',
        category: 'Payments',
        readTime: '5 min',
      },
      {
        id: 'pdf-templates',
        title: 'PDF Templates',
        description: 'Customize your invoice and quote PDF templates with your branding.',
        category: 'Templates',
        readTime: '4 min',
      },
    ],
  },
  {
    id: 'automation',
    title: 'Automation',
    icon: <Zap size={20} />,
    description: 'Automate repetitive tasks and connect your tools',
    articles: [
      {
        id: 'automation-rules',
        title: 'Automation Rules',
        description: 'Create rules to automatically trigger actions based on events.',
        category: 'Rules',
        readTime: '8 min',
      },
      {
        id: 'connected-apps',
        title: 'Connected Apps',
        description: 'Integrate with Slack, Google Calendar, Stripe, and more.',
        category: 'Integrations',
        readTime: '6 min',
      },
      {
        id: 'webhooks',
        title: 'Webhooks',
        description: 'Send and receive data with custom HTTP webhooks.',
        category: 'Developer',
        readTime: '5 min',
      },
      {
        id: 'mcp-integration',
        title: 'MCP Integration',
        description: 'Connect AI assistants like Claude using the Model Context Protocol.',
        category: 'AI',
        readTime: '7 min',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing Tools',
    icon: <BarChart3 size={20} />,
    description: 'Campaigns, email marketing, social media, and content',
    articles: [
      {
        id: 'campaigns',
        title: 'Campaign Center',
        description: 'Create and manage multi-channel marketing campaigns.',
        category: 'Campaigns',
        readTime: '8 min',
      },
      {
        id: 'email-marketing',
        title: 'Email Marketing',
        description: 'Build email campaigns, manage subscribers, and track engagement.',
        category: 'Email',
        readTime: '7 min',
      },
      {
        id: 'social-media',
        title: 'Social Media',
        description: 'Schedule posts and track engagement across social platforms.',
        category: 'Social',
        readTime: '6 min',
      },
      {
        id: 'content-hub',
        title: 'Content Hub',
        description: 'Create and manage articles, guides, and landing pages.',
        category: 'Content',
        readTime: '5 min',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    icon: <Settings size={20} />,
    description: 'Configure your workspace and personalize your experience',
    articles: [
      {
        id: 'workspace-settings',
        title: 'Workspace Settings',
        description: 'Configure your company info, branding, and general settings.',
        category: 'Settings',
        readTime: '5 min',
      },
      {
        id: 'team-management',
        title: 'Team Management',
        description: 'Invite team members and manage roles and permissions.',
        category: 'Team',
        readTime: '6 min',
      },
      {
        id: 'api-access',
        title: 'API Access',
        description: 'Generate API keys and access your data programmatically.',
        category: 'Developer',
        readTime: '4 min',
      },
    ],
  },
];

export default function DocsPage() {
  const [search, setSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const filteredSections = docSections.filter(section => {
    const matchesSearch = search === '' ||
      section.title.toLowerCase().includes(search.toLowerCase()) ||
      section.description.toLowerCase().includes(search.toLowerCase()) ||
      section.articles.some(
        article =>
          article.title.toLowerCase().includes(search.toLowerCase()) ||
          article.description.toLowerCase().includes(search.toLowerCase())
      );
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Documentation</h1>
        <p className="text-muted-foreground">
          Learn how to get the most out of BridgeBreak CRM
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <Video size={20} />
              </div>
              <div>
                <h3 className="font-medium">Video Tutorials</h3>
                <p className="text-sm text-muted-foreground">Watch step-by-step guides</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>
              <div>
                <h3 className="font-medium">Community Forum</h3>
                <p className="text-sm text-muted-foreground">Ask questions and share tips</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Mail size={20} />
              </div>
              <div>
                <h3 className="font-medium">Contact Support</h3>
                <p className="text-sm text-muted-foreground">Get help from our team</p>
              </div>
              <ChevronRight size={16} className="ml-auto text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => (
          <Card key={section.id}>
            <button
              className="w-full text-left"
              onClick={() => toggleSection(section.id)}
            >
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      {section.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {section.articles.length} articles
                    </Badge>
                    {expandedSections.includes(section.id) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>
              </CardHeader>
            </button>

            {expandedSections.includes(section.id) && (
              <CardContent className="pt-4">
                <div className="space-y-2">
                  {section.articles.map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-muted-foreground" />
                        <div>
                          <h4 className="font-medium text-sm">{article.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {article.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-xs">
                          {article.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {article.readTime}
                        </span>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* API Reference */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Developer API</h3>
              <p className="text-sm text-muted-foreground">
                Access BridgeBreak data programmatically with our REST API.
                Build custom integrations and automate your workflows.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Code size={16} className="mr-2" />
                API Reference
              </Button>
              <Button>
                <ExternalLink size={16} className="mr-2" />
                Get API Key
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback */}
      <Card>
        <CardContent className="p-6 text-center">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Can't find what you're looking for?</h3>
          <p className="text-muted-foreground mb-4">
            Our support team is here to help. Send us a message and we'll get back to you within 24 hours.
          </p>
          <Button>
            <Mail size={16} className="mr-2" />
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
