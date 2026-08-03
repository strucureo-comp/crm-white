'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  RefreshCw, Calendar, Users, Target, Download, 
  Trash2, Clock, Play, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  TrendingUp, FileIcon, Sparkles, CheckCircle2, 
  ChevronDown, Check, X, Mail, Filter, LayoutTemplate, Plus, Copy,
  Eye, MousePointerClick, UserMinus, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import {
  subscribeToEmailData,
  deleteCampaign,
  deleteTemplate,
  deleteScheduled,
  updateScheduled,
  type EmailData,
  type CampaignRow,
  type SavedTemplate,
  type ScheduledCampaign,
  type AudienceSegment,
} from '@/lib/db/email/api';

// --- Schemas ---
type SortDir = 'asc' | 'desc' | null;
type CampaignType = 'newsletter' | 'promotional' | 'drip' | 'transactional' | 'reengagement' | 'all';

const CAMPAIGN_TYPES: { id: CampaignType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'promotional', label: 'Promotional' },
  { id: 'drip', label: 'Drip' },
  { id: 'transactional', label: 'Transactional' },
  { id: 'reengagement', label: 'Re-engagement' },
];

// --- Static chart data (derived from real data when available) ---
const EMPTY_ENGAGEMENT_TREND = [
  { name: 'Feb', openRate: 0, clickRate: 0 },
  { name: 'Mar', openRate: 0, clickRate: 0 },
  { name: 'Apr', openRate: 0, clickRate: 0 },
  { name: 'May', openRate: 0, clickRate: 0 },
  { name: 'Jun', openRate: 0, clickRate: 0 },
  { name: 'Jul', openRate: 0, clickRate: 0 },
];

export default function EmailCampaignsPage() {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const [activeType, setActiveType] = useState<CampaignType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'scheduled' | 'audience'>('campaigns');
  
  const [sortCol, setSortCol] = useState<keyof CampaignRow>('sentAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  const [emailData, setEmailData] = useState<EmailData>({
    campaigns: [],
    templates: [],
    scheduled: [],
    audiences: [],
  });

  const [exportPreview, setExportPreview] = useState<'pdf' | 'excel' | null>(null);

  // Firebase subscription
  useEffect(() => {
    if (!companyId) return;
    const unsubscribe = subscribeToEmailData(companyId, (data) => {
      setEmailData(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [companyId]);

  // Computed KPIs from real data
  const kpis = useMemo(() => {
    const { campaigns } = emailData;
    const sentCampaigns = campaigns.filter(c => c.status === 'sent' || c.status === 'sending');
    const totalSent = sentCampaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const avgOpen = sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + (c.openRate || 0), 0) / sentCampaigns.length
      : 0;
    const avgClick = sentCampaigns.length > 0
      ? sentCampaigns.reduce((sum, c) => sum + (c.clickRate || 0), 0) / sentCampaigns.length
      : 0;
    const totalUnsub = campaigns.reduce((sum, c) => sum + (c.unsubscribed || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
    const unsubRate = totalSent > 0 ? (totalUnsub / totalSent) * 100 : 0;

    return {
      totalSent,
      avgOpen,
      avgClick,
      unsubRate,
      campaignCount: campaigns.length,
    };
  }, [emailData]);

  // Computed funnel data from real campaigns
  const funnelData = useMemo(() => {
    const { campaigns } = emailData;
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sent || 0), 0);
    const totalOpened = campaigns.reduce((sum, c) => sum + (c.opened || 0), 0);
    const totalClicked = campaigns.reduce((sum, c) => sum + (c.clicked || 0), 0);
    const totalBounced = campaigns.reduce((sum, c) => sum + (c.bounced || 0), 0);
    const delivered = totalSent - totalBounced;

    if (totalSent === 0) {
      return [
        { stage: 'Sent', count: 0 },
        { stage: 'Delivered', count: 0 },
        { stage: 'Opened', count: 0 },
        { stage: 'Clicked', count: 0 },
      ];
    }

    return [
      { stage: 'Sent', count: totalSent },
      { stage: 'Delivered', count: Math.max(0, delivered) },
      { stage: 'Opened', count: totalOpened },
      { stage: 'Clicked', count: totalClicked },
    ];
  }, [emailData]);

  const handleSort = (col: keyof CampaignRow) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const filteredCampaigns = useMemo(() => {
    return emailData.campaigns.filter(c => activeType === 'all' || c.type === activeType);
  }, [emailData.campaigns, activeType]);

  const sortedData = useMemo(() => {
    return [...filteredCampaigns].sort((a, b) => {
      if (!sortDir) return 0;
      const modifier = sortDir === 'asc' ? 1 : -1;
      const valA = a[sortCol] ?? '';
      const valB = b[sortCol] ?? '';
      if (valA < valB) return -1 * modifier;
      if (valA > valB) return 1 * modifier;
      return 0;
    });
  }, [filteredCampaigns, sortCol, sortDir]);

  const toggleScheduled = async (id: string) => {
    if (!companyId) return;
    const item = emailData.scheduled.find(s => s.id === id);
    if (item) {
      await updateScheduled(companyId, id, { active: !item.active });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!companyId) return;
    await deleteCampaign(companyId, id);
    toast.success('Campaign deleted');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!companyId) return;
    await deleteTemplate(companyId, id);
    toast.success('Template deleted');
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!companyId) return;
    await deleteScheduled(companyId, id);
    toast.success('Scheduled campaign deleted');
  };

  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-background">
      
      {/* 2. Global Layout & Header */}
      <div className="p-6 pb-4 bg-card border-b border-border shrink-0">
        <div className="flex flex-col gap-6">
          
          <div>
            <h1 className="text-3xl text-foreground tracking-tight mb-1" style={{ fontWeight: 800 }}>Email Campaigns</h1>
            <p className="text-sm text-muted-foreground font-medium">Design, execute, and analyze targeted email communications.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_TYPES.map(ct => {
              const isActive = activeType === ct.id;
              return (
                <button
                  key={ct.id}
                  onClick={() => setActiveType(ct.id)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {ct.label}
                </button>
              )
            })}
          </div>

          <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card/50">
            <div className="p-3 px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Date Range</label>
                  <Select defaultValue="30d">
                    <SelectTrigger className="w-[160px] h-9 bg-background border-border rounded-xl font-bold text-sm shadow-sm"><Calendar className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="30d">Last 30 Days</SelectItem><SelectItem value="90d">Last 90 Days</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Status</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-background border-border rounded-xl font-bold text-sm shadow-sm"><Filter className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Audience</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-background border-border rounded-xl font-bold text-sm shadow-sm"><Users className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Audiences</SelectItem><SelectItem value="subscribers">Subscribers</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Type</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-background border-border rounded-xl font-bold text-sm shadow-sm"><Mail className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="newsletter">Newsletter</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-4 xl:pt-0">
                <Button variant="ghost" className="font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl"><Copy className="w-4 h-4 mr-2" /> Duplicate</Button>
                <div className="flex items-center bg-background border border-border rounded-xl p-1 shadow-sm">
                  <span className="text-xs font-black text-muted-foreground uppercase tracking-widest px-3">Export:</span>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setExportPreview('pdf')}><FileIcon className="w-3 h-3 mr-1" /> PDF</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> CSV</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> Excel</Button>
                </div>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-bold px-6">
                  <Plus className="w-4 h-4 mr-2" /> New campaign
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-muted border-t-primary rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-black text-primary animate-pulse">Loading campaigns...</h2>
          </div>
        )}

        <div className={`max-w-[1400px] mx-auto space-y-8 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* 3. KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sent', value: formatNumber(kpis.totalSent), icon: Send },
              { label: 'Avg. Open Rate', value: `${kpis.avgOpen.toFixed(1)}%`, icon: Eye },
              { label: 'Avg. Click Rate', value: `${kpis.avgClick.toFixed(1)}%`, icon: MousePointerClick },
              { label: 'Unsubscribe Rate', value: `${kpis.unsubRate.toFixed(1)}%`, icon: UserMinus },
            ].map((kpi, i) => (
              <Card key={i} className="border-border shadow-sm rounded-2xl bg-card">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase text-muted-foreground tracking-wider">{kpi.label}</span>
                    <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                      <kpi.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-black text-foreground tracking-tighter">{kpi.value}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm rounded-2xl bg-card">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">Engagement Trend</h3>
                <Badge variant="outline" className="text-muted-foreground font-bold border-border">Last 6 Months</Badge>
              </div>
              <div className="p-5 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={EMPTY_ENGAGEMENT_TREND} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }} formatter={(v: number) => [`${v}%`, '']} />
                    <Line yAxisId="left" type="monotone" dataKey="openRate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: 'hsl(var(--background))' }} activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }} name="Open Rate" />
                    <Line yAxisId="right" type="monotone" dataKey="clickRate" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Click Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-border shadow-sm rounded-2xl bg-card">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-foreground">Campaign Funnel</h3>
                <Badge variant="outline" className="text-muted-foreground font-bold border-border">All Campaigns</Badge>
              </div>
              <div className="p-5 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 4. Tabbed Content Area */}
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex border-b border-border overflow-x-auto hide-scrollbar">
              <button onClick={() => setActiveTab('campaigns')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'campaigns' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Campaigns</button>
              <button onClick={() => setActiveTab('templates')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'templates' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Templates</button>
              <button onClick={() => setActiveTab('scheduled')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'scheduled' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Scheduled</button>
              <button onClick={() => setActiveTab('audience')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audience' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Audience</button>
            </div>

            {activeTab === 'campaigns' && (
              <Card className="border-border shadow-sm rounded-2xl overflow-hidden bg-card">
                {sortedData.length === 0 ? (
                  <div className="p-12 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No campaigns yet</h3>
                    <p className="text-sm text-muted-foreground">Create your first email campaign to see it here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('name')}>Campaign Name</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('audience')}>Audience</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer text-right" onClick={() => handleSort('sent')}>Sent</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer w-48" onClick={() => handleSort('openRate')}>Open Rate</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer w-48" onClick={() => handleSort('clickRate')}>Click Rate</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-muted-foreground text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedData.map(row => (
                          <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-foreground truncate max-w-[200px]">{row.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.subject}</p>
                            </td>
                            <td className="p-4 text-sm font-medium text-muted-foreground">{row.audience}</td>
                            <td className="p-4 text-sm font-black text-foreground text-right">{formatNumber(row.sent)}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-foreground w-10 text-right">{row.openRate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(row.openRate, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-foreground w-10 text-right">{row.clickRate.toFixed(1)}%</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${Math.min(row.clickRate * 3, 100)}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border-border bg-background text-foreground`}>
                                {row.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-8 font-bold text-primary hover:text-primary hover:bg-muted" onClick={() => setExportPreview('pdf')}>Report</Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"><Copy className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCampaign(row.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {emailData.templates.length === 0 ? (
                  <div className="col-span-full p-12 text-center">
                    <LayoutTemplate className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No templates yet</h3>
                    <p className="text-sm text-muted-foreground">Create your first email template to see it here.</p>
                  </div>
                ) : (
                  emailData.templates.map(t => (
                    <Card key={t.id} className="border-border shadow-sm rounded-2xl hover:border-muted-foreground/30 transition-colors group overflow-hidden flex flex-col bg-card">
                      <div className="h-32 flex items-center justify-center relative transition-transform group-hover:scale-105 bg-muted">
                        <LayoutTemplate className="w-12 h-12 text-muted-foreground" />
                      </div>
                      <CardContent className="p-4 flex flex-col flex-1 gap-2 bg-card relative z-10">
                        <div>
                          <Badge variant="outline" className="mb-2 text-[9px] uppercase font-black tracking-widest text-muted-foreground border-border">{t.category}</Badge>
                          <h4 className="font-bold text-foreground leading-tight">{t.name}</h4>
                        </div>
                        <div className="mt-auto pt-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span>Used {t.usageCount} times</span>
                          <span>{t.lastEdited}</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button className="flex-1 font-bold bg-muted text-foreground hover:bg-muted/80 border-0">Use template</Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTemplate(t.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === 'scheduled' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailData.scheduled.length === 0 ? (
                  <div className="col-span-full p-12 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No scheduled campaigns</h3>
                    <p className="text-sm text-muted-foreground">Schedule a campaign to see it here.</p>
                  </div>
                ) : (
                  emailData.scheduled.map(s => (
                    <Card key={s.id} className="border-border shadow-sm rounded-2xl hover:border-muted-foreground/30 transition-colors bg-card">
                      <CardContent className="p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Clock className="w-5 h-5" /></div>
                            <div>
                              <h4 className="font-bold text-foreground leading-tight truncate max-w-[200px]">{s.name}</h4>
                              <p className="text-xs font-medium text-muted-foreground truncate max-w-[200px]">To: {s.audience}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest text-muted-foreground">{s.recipients.toLocaleString()} Recipients</Badge>
                          <span className="text-xs font-bold text-foreground">{s.scheduledFor}</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleScheduled(s.id)}>
                            <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${s.active ? 'bg-primary' : 'bg-muted'}`}>
                              <div className={`w-4 h-4 bg-card rounded-full shadow-sm transition-transform ${s.active ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                            <span className="text-xs font-bold text-foreground">{s.active ? 'Active' : 'Paused'}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteScheduled(s.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}

            {activeTab === 'audience' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {emailData.audiences.length === 0 ? (
                  <div className="col-span-full p-12 text-center">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-foreground mb-1">No audience segments</h3>
                    <p className="text-sm text-muted-foreground">Create audience segments to target your campaigns.</p>
                  </div>
                ) : (
                  emailData.audiences.map(a => (
                    <Card key={a.id} className="border-border shadow-sm rounded-2xl hover:border-muted-foreground/30 transition-colors bg-card">
                      <CardContent className="p-5 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-foreground leading-tight">{a.name}</h4>
                            <p className="text-xs font-medium text-muted-foreground mt-1 line-clamp-2">{a.criteria}</p>
                          </div>
                        </div>
                        <div className="flex items-end justify-between pt-3 border-t border-border mt-auto">
                          <div>
                            <span className="text-2xl font-black text-foreground tracking-tighter">{a.contactCount.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground font-medium ml-1">contacts</span>
                          </div>
                          <Badge className="bg-muted text-muted-foreground hover:bg-transparent font-bold border-transparent px-2">
                            {a.growth < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />} {Math.abs(a.growth)}%
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Export Preview Modal */}
      <Dialog open={!!exportPreview} onOpenChange={(open) => { if(!open) setExportPreview(null) }}>
        <DialogContent className={`max-w-[1200px] h-[90vh] p-0 border-0 shadow-2xl rounded-[1.5rem] overflow-hidden flex flex-col bg-background`}>
          <DialogHeader className="p-4 border-b border-border bg-card shrink-0 flex flex-row items-center justify-between text-foreground">
            <DialogTitle className="text-lg font-bold">
              {exportPreview === 'pdf' ? 'Campaign Performance Report' : 'Spreadsheet Preview (Excel/CSV)'}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md font-bold px-6 h-9"><Download className="w-4 h-4 mr-2" /> Export</Button>
              <DialogClose asChild>
                <button className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"><X className="w-4 h-4 text-foreground" /></button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            {exportPreview === 'pdf' ? (
              <div className="w-full max-w-[800px] bg-card border border-border shadow-xl min-h-[1100px] p-12 flex flex-col gap-8">
                <div className="border-b-2 border-border pb-6 text-center">
                  <h1 className="text-4xl text-foreground mb-2" style={{ fontWeight: 900 }}>Email Campaign Report</h1>
                  <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">Generated: {new Date().toLocaleDateString()}</p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3 border-l-4 border-primary pl-3">1. Executive Summary</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Across {kpis.campaignCount} campaigns, {formatNumber(kpis.totalSent)} emails were sent with an average open rate of {kpis.avgOpen.toFixed(1)}% and click rate of {kpis.avgClick.toFixed(1)}%. Unsubscribe rate remained at {kpis.unsubRate.toFixed(2)}%.
                  </p>
                </div>

                <div className="bg-muted border border-border p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24 text-primary" /></div>
                  <h3 className="text-foreground font-black text-lg mb-4 flex items-center gap-2 relative z-10"><Sparkles className="w-5 h-5 text-primary" /> Campaign Summary</h3>
                  <div className="flex gap-6 relative z-10">
                    <div className="flex-1 space-y-3">
                      <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                        <strong className="font-black text-foreground">Total Campaigns:</strong> {kpis.campaignCount}
                      </p>
                      <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                        <strong className="font-black text-foreground">Total Sent:</strong> {formatNumber(kpis.totalSent)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="border border-border p-4 rounded-lg"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sent</span><p className="text-2xl font-black text-foreground">{formatNumber(kpis.totalSent)}</p></div>
                  <div className="border border-border p-4 rounded-lg"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Open Rate</span><p className="text-2xl font-black text-foreground">{kpis.avgOpen.toFixed(1)}%</p></div>
                  <div className="border border-border p-4 rounded-lg"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Click Rate</span><p className="text-2xl font-black text-foreground">{kpis.avgClick.toFixed(1)}%</p></div>
                  <div className="border border-border p-4 rounded-lg"><span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Unsubs</span><p className="text-2xl font-black text-foreground">{formatNumber(emailData.campaigns.reduce((s, c) => s + (c.unsubscribed || 0), 0))}</p></div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground mb-3 border-l-4 border-primary pl-3">2. Campaign Breakdown</h2>
                  <table className="w-full text-left border-collapse mt-4">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="py-2 text-sm font-black uppercase text-foreground">Campaign</th>
                        <th className="py-2 text-sm font-black uppercase text-foreground text-right">Sent</th>
                        <th className="py-2 text-sm font-black uppercase text-foreground text-right">Open Rate</th>
                        <th className="py-2 text-sm font-black uppercase text-foreground text-right">Click Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {emailData.campaigns.slice(0, 5).map(c => (
                        <tr key={c.id}>
                          <td className="py-3 text-sm font-medium text-muted-foreground">{c.name}</td>
                          <td className="py-3 text-sm font-bold text-foreground text-right">{formatNumber(c.sent)}</td>
                          <td className="py-3 text-sm font-bold text-foreground text-right">{c.openRate.toFixed(1)}%</td>
                          <td className="py-3 text-sm font-bold text-foreground text-right">{c.clickRate.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col gap-6">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-foreground whitespace-nowrap">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border">Campaign</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border">Type</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border">Audience</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border text-right">Sent</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border text-right">Open Rate</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground border-r border-border text-right">Click Rate</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-sm">
                        {emailData.campaigns.map((c) => (
                          <tr key={c.id} className="hover:bg-muted/50">
                            <td className="p-3 border-r border-border text-foreground font-semibold">{c.name}</td>
                            <td className="p-3 border-r border-border text-foreground capitalize">{c.type}</td>
                            <td className="p-3 border-r border-border text-foreground">{c.audience}</td>
                            <td className="p-3 border-r border-border text-right">{formatNumber(c.sent)}</td>
                            <td className="p-3 border-r border-border text-right">{c.openRate.toFixed(1)}%</td>
                            <td className="p-3 border-r border-border text-right">{c.clickRate.toFixed(1)}%</td>
                            <td className="p-3 text-muted-foreground capitalize">{c.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
