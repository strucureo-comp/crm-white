'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  RefreshCw, Calendar, Users, Target, Download, 
  Trash2, Clock, Play, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  TrendingUp, FileIcon, ShieldAlert, Sparkles, CheckCircle2, 
  ChevronDown, Check, X, Mail, Filter, LayoutTemplate, Plus, Copy,
  Eye, MousePointerClick, UserMinus, Send, MonitorPlay
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

// --- Data Schemas ---
type SortDir = 'asc' | 'desc' | null;
type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed';
type CampaignType = 'newsletter' | 'promotional' | 'drip' | 'transactional' | 'reengagement';
type AudienceType = 'all_contacts' | 'segment' | 'custom_list';

interface CampaignRow {
  id: number;
  name: string;
  subject: string;
  type: CampaignType;
  audience: string;
  audienceSize: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  status: CampaignStatus;
  sentAt: string | null;
}

interface SavedTemplate {
  id: string;
  name: string;
  category: CampaignType;
  thumbnailColor: string; 
  lastEdited: string;
  usageCount: number;
}

interface ScheduledCampaign {
  id: string;
  name: string;
  audience: string;
  scheduledFor: string;
  recipients: number;
  active: boolean;
}

interface AudienceSegment {
  id: string;
  name: string;
  contactCount: number;
  criteria: string; 
  growth: number;
}

// --- Mock Data ---
const MOCK_CAMPAIGNS: CampaignRow[] = [
  { id: 1, name: 'July Product Update', subject: 'See what is new this month 🚀', type: 'newsletter', audience: 'All Subscribers', audienceSize: 45000, sent: 44800, opened: 18400, clicked: 4100, bounced: 200, unsubscribed: 120, openRate: 41.1, clickRate: 9.1, status: 'sent', sentAt: '2026-07-28' },
  { id: 2, name: 'Q3 Enterprise Promo', subject: 'Unlock premium features at a discount', type: 'promotional', audience: 'Enterprise Leads', audienceSize: 12000, sent: 11950, opened: 5800, clicked: 1200, bounced: 50, unsubscribed: 45, openRate: 48.5, clickRate: 10.0, status: 'sent', sentAt: '2026-07-25' },
  { id: 3, name: 'Welcome Series - Day 1', subject: 'Welcome to the community!', type: 'drip', audience: 'New Signups', audienceSize: 850, sent: 850, opened: 680, clicked: 320, bounced: 5, unsubscribed: 2, openRate: 80.0, clickRate: 37.6, status: 'sending', sentAt: null },
  { id: 4, name: 'Inactive User Reactivation', subject: 'We miss you! Here is a special offer', type: 'reengagement', audience: 'Inactive > 90 Days', audienceSize: 28000, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, openRate: 0, clickRate: 0, status: 'scheduled', sentAt: null },
  { id: 5, name: 'Webinar Follow-up', subject: 'Recording inside: Mastering CRM', type: 'promotional', audience: 'Webinar Attendees', audienceSize: 4500, sent: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, openRate: 0, clickRate: 0, status: 'draft', sentAt: null },
  { id: 6, name: 'Billing Issue Notification', subject: 'Action Required: Payment Failed', type: 'transactional', audience: 'Past Due Accounts', audienceSize: 142, sent: 142, opened: 120, clicked: 45, bounced: 2, unsubscribed: 0, openRate: 84.5, clickRate: 31.7, status: 'failed', sentAt: '2026-07-29' },
];

const MOCK_TEMPLATES: SavedTemplate[] = [
  { id: 't1', name: 'Minimalist Newsletter', category: 'newsletter', thumbnailColor: '#3b82f6', lastEdited: '2 days ago', usageCount: 45 },
  { id: 't2', name: 'Bold Sale Announcement', category: 'promotional', thumbnailColor: '#ec4899', lastEdited: '1 week ago', usageCount: 128 },
  { id: 't3', name: 'Welcome Onboarding', category: 'drip', thumbnailColor: '#8b5cf6', lastEdited: '1 month ago', usageCount: 890 },
  { id: 't4', name: 'Standard Receipt', category: 'transactional', thumbnailColor: '#10b981', lastEdited: '3 months ago', usageCount: 5400 },
  { id: 't5', name: 'Re-engagement Offer', category: 'reengagement', thumbnailColor: '#f59e0b', lastEdited: '2 weeks ago', usageCount: 12 },
  { id: 't6', name: 'Product Release Notes', category: 'newsletter', thumbnailColor: '#3b82f6', lastEdited: '4 days ago', usageCount: 34 },
];

const MOCK_SCHEDULED: ScheduledCampaign[] = [
  { id: 's1', name: 'Inactive User Reactivation', audience: 'Inactive > 90 Days', scheduledFor: 'Tomorrow, 10:00 AM', recipients: 28000, active: true },
  { id: 's2', name: 'August Newsletter Prep', audience: 'All Subscribers', scheduledFor: 'Aug 15, 08:00 AM', recipients: 46500, active: false },
  { id: 's3', name: 'Weekend Flash Sale', audience: 'Highly Engaged', scheduledFor: 'Saturday, 09:00 AM', recipients: 15400, active: true },
];

const MOCK_AUDIENCES: AudienceSegment[] = [
  { id: 'a1', name: 'All Subscribers', contactCount: 46500, criteria: 'Has active email subscription', growth: 2.4 },
  { id: 'a2', name: 'Highly Engaged', contactCount: 15400, criteria: 'Opened >3 emails in last 30 days', growth: 5.1 },
  { id: 'a3', name: 'Inactive > 90 Days', contactCount: 28000, criteria: 'No opens or clicks in last 90 days', growth: -1.2 },
  { id: 'a4', name: 'Enterprise Leads', contactCount: 12000, criteria: 'Company size > 500 AND Lead Status = Qualified', growth: 8.7 },
];

const ENGAGEMENT_TREND_DATA = [
  { name: 'Feb', openRate: 38.2, clickRate: 6.4 },
  { name: 'Mar', openRate: 40.1, clickRate: 7.2 },
  { name: 'Apr', openRate: 39.5, clickRate: 6.8 },
  { name: 'May', openRate: 42.4, clickRate: 8.5 },
  { name: 'Jun', openRate: 45.1, clickRate: 9.2 },
  { name: 'Jul', openRate: 44.8, clickRate: 8.9 },
];

const FUNNEL_DATA = [
  { stage: 'Sent', count: 45000, fill: '#94a3b8' },
  { stage: 'Delivered', count: 44800, fill: '#3b82f6' },
  { stage: 'Opened', count: 18400, fill: '#8b5cf6' },
  { stage: 'Clicked', count: 4100, fill: '#ec4899' },
  { stage: 'Converted', count: 850, fill: '#10b981' },
];

const CAMPAIGN_TYPES: { id: CampaignType | 'all', label: string, color: string }[] = [
  { id: 'all', label: 'All', color: 'bg-slate-800' },
  { id: 'newsletter', label: 'Newsletter', color: 'bg-blue-500' },
  { id: 'promotional', label: 'Promotional', color: 'bg-pink-500' },
  { id: 'drip', label: 'Drip', color: 'bg-purple-500' },
  { id: 'transactional', label: 'Transactional', color: 'bg-emerald-500' },
  { id: 'reengagement', label: 'Re-engagement', color: 'bg-amber-500' },
];

export default function EmailCampaignsPage() {
  const [activeType, setActiveType] = useState<CampaignType | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true); // Start loading to show skeleton
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates' | 'scheduled' | 'audience'>('campaigns');
  
  // Table state
  const [sortCol, setSortCol] = useState<keyof CampaignRow>('sentAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  // Scheduled state
  const [scheduled, setScheduled] = useState(MOCK_SCHEDULED);

  // Export Modal state
  const [exportPreview, setExportPreview] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleFilterChange = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  const handleSort = (col: keyof CampaignRow) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const filteredCampaigns = MOCK_CAMPAIGNS.filter(c => activeType === 'all' || c.type === activeType);

  const sortedData = [...filteredCampaigns].sort((a, b) => {
    if (!sortDir) return 0;
    const modifier = sortDir === 'asc' ? 1 : -1;
    const valA = a[sortCol] ?? '';
    const valB = b[sortCol] ?? '';
    
    if (valA < valB) return -1 * modifier;
    if (valA > valB) return 1 * modifier;
    return 0;
  });

  const toggleScheduled = (id: string) => {
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(val);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-[#f8fafc]">
      
      {/* 2. Global Layout & Header */}
      <div className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col gap-6">
          
          <div>
            <h1 className="text-3xl text-slate-900 tracking-tight mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>Email Campaigns</h1>
            <p className="text-sm text-slate-500 font-medium">Design, execute, and analyze targeted email communications.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_TYPES.map(ct => {
              const isActive = activeType === ct.id;
              return (
                <button
                  key={ct.id}
                  onClick={() => { setActiveType(ct.id); handleFilterChange(); }}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? `${ct.color} text-white shadow-lg ring-2 ring-offset-2 ring-transparent` 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={isActive ? { boxShadow: `0 8px 20px -8px ${ct.color.replace('bg-', 'var(--tw-colors-').replace('-500', '-500)')}` } : {}}
                >
                  {ct.label}
                </button>
              )
            })}
          </div>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50">
            <div className="p-3 px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Date Range</label>
                  <Select defaultValue="30d">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Calendar className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="30d">Last 30 Days</SelectItem><SelectItem value="90d">Last 90 Days</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Status</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Filter className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Audience</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Users className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Audiences</SelectItem><SelectItem value="subscribers">Subscribers</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Type</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Mail className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="newsletter">Newsletter</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-4 xl:pt-0">
                <Button variant="ghost" className="font-bold text-slate-600 rounded-xl"><Copy className="w-4 h-4 mr-2" /> Duplicate</Button>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-3">Export:</span>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-600" onClick={() => setExportPreview('pdf')}><FileIcon className="w-3 h-3 mr-1" /> PDF</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-green-50 hover:text-green-600 text-slate-600" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> CSV</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-600" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> Excel</Button>
                </div>
                <Button className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white rounded-xl shadow-md font-bold px-6">
                  <Plus className="w-4 h-4 mr-2" /> New campaign
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-[#1e1a4f] rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-black text-[#1e1a4f] animate-pulse">Loading campaigns...</h2>
          </div>
        )}

        <div className={`max-w-[1400px] mx-auto space-y-8 transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          
          {/* 3. Generated Content Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sent', value: '1.2M', delta: '+12.4%', icon: Send, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Avg. Open Rate', value: '42.8%', delta: '+4.1%', icon: Eye, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Avg. Click Rate', value: '8.4%', delta: '-0.4%', icon: MousePointerClick, color: 'text-rose-600', bg: 'bg-rose-50', down: true },
              { label: 'Unsubscribe Rate', value: '0.2%', delta: '-12.5%', icon: UserMinus, color: 'text-purple-600', bg: 'bg-purple-50', down: true }, // Down is good here, but styling as down
            ].map((kpi, i) => (
              <Card key={i} className="border-slate-200 shadow-sm rounded-2xl">
                <CardContent className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black uppercase text-slate-500 tracking-wider">{kpi.label}</span>
                    <div className={`w-8 h-8 rounded-full ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                      <kpi.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{kpi.value}</span>
                    <Badge className={`${kpi.down ? (i===3 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700') : 'bg-emerald-50 text-emerald-700'} hover:bg-transparent font-bold border-transparent px-2`}>
                      {kpi.down ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />} {kpi.delta}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm rounded-2xl">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Engagement Trend</h3>
                <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">Last 6 Months</Badge>
              </div>
              <div className="p-5 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ENGAGEMENT_TREND_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(v) => `${v}%`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`${v}%`, '']} />
                    <Line yAxisId="left" type="monotone" dataKey="openRate" stroke="#3b82f6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} name="Open Rate" />
                    <Line yAxisId="right" type="monotone" dataKey="clickRate" stroke="#ec4899" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Click Rate" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="border-slate-200 shadow-sm rounded-2xl">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Campaign Funnel</h3>
                <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">Avg. Performance</Badge>
              </div>
              <div className="p-5 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={FUNNEL_DATA} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(v) => `${v/1000}k`} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                      {FUNNEL_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* 4. Tabbed Content Area */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex border-b border-slate-200 overflow-x-auto hide-scrollbar">
              <button onClick={() => setActiveTab('campaigns')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'campaigns' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Campaigns</button>
              <button onClick={() => setActiveTab('templates')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'templates' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Templates</button>
              <button onClick={() => setActiveTab('scheduled')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'scheduled' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Scheduled</button>
              <button onClick={() => setActiveTab('audience')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'audience' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Audience</button>
            </div>

            {activeTab === 'campaigns' && (
              <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('name')}>Campaign Name</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('audience')}>Audience</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer text-right" onClick={() => handleSort('sent')}>Sent</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer w-48" onClick={() => handleSort('openRate')}>Open Rate</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer w-48" onClick={() => handleSort('clickRate')}>Click Rate</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                        <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedData.map(row => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4">
                            <p className="font-bold text-slate-900 truncate max-w-[200px]">{row.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[200px]">{row.subject}</p>
                          </td>
                          <td className="p-4 text-sm font-medium text-slate-600">{row.audience}</td>
                          <td className="p-4 text-sm font-black text-slate-900 text-right">{formatNumber(row.sent)}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-700 w-10 text-right">{row.openRate.toFixed(1)}%</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(row.openRate, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-700 w-10 text-right">{row.clickRate.toFixed(1)}%</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${Math.min(row.clickRate * 3, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border-transparent ${
                              row.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : 
                              row.status === 'scheduled' ? 'bg-blue-50 text-blue-700' : 
                              row.status === 'sending' ? 'bg-amber-50 text-amber-700' :
                              row.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => setExportPreview('pdf')}>Report</Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"><Copy className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'templates' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MOCK_TEMPLATES.map(t => (
                  <Card key={t.id} className="border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-colors group overflow-hidden flex flex-col">
                    <div className="h-32 flex items-center justify-center relative transition-transform group-hover:scale-105" style={{ backgroundColor: t.thumbnailColor + '20' }}>
                      <LayoutTemplate className="w-12 h-12" style={{ color: t.thumbnailColor }} />
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1 gap-2 bg-white relative z-10">
                      <div>
                        <Badge variant="outline" className="mb-2 text-[9px] uppercase font-black tracking-widest text-slate-500 border-slate-200">{t.category}</Badge>
                        <h4 className="font-bold text-slate-900 leading-tight">{t.name}</h4>
                      </div>
                      <div className="mt-auto pt-2 flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>Used {t.usageCount} times</span>
                        <span>{t.lastEdited}</span>
                      </div>
                      <Button className="w-full mt-2 font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">Use template</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'scheduled' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scheduled.map(s => (
                  <Card key={s.id} className="border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-colors">
                    <CardContent className="p-5 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><Clock className="w-5 h-5" /></div>
                          <div>
                            <h4 className="font-bold text-slate-900 leading-tight truncate max-w-[200px]">{s.name}</h4>
                            <p className="text-xs font-medium text-slate-500 truncate max-w-[200px]">To: {s.audience}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest text-slate-500">{s.recipients.toLocaleString()} Recipients</Badge>
                        <span className="text-xs font-bold text-blue-600">{s.scheduledFor}</span>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleScheduled(s.id)}>
                          <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${s.active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${s.active ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                          <span className="text-xs font-bold text-slate-600">{s.active ? 'Active' : 'Paused'}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === 'audience' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MOCK_AUDIENCES.map(a => (
                  <Card key={a.id} className="border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-colors">
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 leading-tight">{a.name}</h4>
                          <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-2">{a.criteria}</p>
                        </div>
                      </div>
                      <div className="flex items-end justify-between pt-3 border-t border-slate-100 mt-auto">
                        <div>
                          <span className="text-2xl font-black text-slate-900 tracking-tighter">{a.contactCount.toLocaleString()}</span>
                          <span className="text-xs text-slate-500 font-medium ml-1">contacts</span>
                        </div>
                        <Badge className={`${a.growth < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} hover:bg-transparent font-bold border-transparent px-2`}>
                          {a.growth < 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : <ArrowUpRight className="w-3 h-3 mr-0.5" />} {Math.abs(a.growth)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Export Preview Modal */}
      <Dialog open={!!exportPreview} onOpenChange={(open) => { if(!open) setExportPreview(null) }}>
        <DialogContent className={`max-w-[1200px] h-[90vh] p-0 border-0 shadow-2xl rounded-[1.5rem] overflow-hidden flex flex-col ${exportPreview === 'excel' ? 'bg-[#1e293b]' : 'bg-slate-100'}`}>
          <DialogHeader className="p-4 border-b border-white/10 bg-[#0f172a] shrink-0 flex flex-row items-center justify-between text-white">
            <DialogTitle className="text-lg font-bold">
              {exportPreview === 'pdf' ? 'Campaign Performance Report' : 'Spreadsheet Preview (Excel/CSV)'}
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md font-bold px-6 h-9"><Download className="w-4 h-4 mr-2" /> Export</Button>
              <DialogClose asChild>
                <button className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-8 flex justify-center">
            {exportPreview === 'pdf' ? (
              // PDF Preview Body (A4 Style)
              <div className="w-full max-w-[800px] bg-white shadow-xl min-h-[1100px] p-12 flex flex-col gap-8">
                <div className="border-b-2 border-slate-900 pb-6 text-center">
                  <h1 className="text-4xl text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>Email Campaign Report</h1>
                  <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Campaign: July Product Update • Sent: July 28, 2026</p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#1e1a4f] pl-3">1. Executive Summary</h2>
                  <p className="text-slate-600 leading-relaxed">
                    The "July Product Update" newsletter performed exceptionally well, achieving an open rate of 41.1% (significantly above the 35% benchmark). Click-through rates were concentrated heavily on the new features section, driving 4,100 targeted sessions to the application dashboard. Unsubscribes remained low at 0.26%.
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24 text-indigo-500" /></div>
                  <h3 className="text-indigo-900 font-black text-lg mb-4 flex items-center gap-2 relative z-10"><Sparkles className="w-5 h-5 text-indigo-600" /> Comprehensive AI Insights</h3>
                  <div className="flex gap-6 relative z-10">
                    <div className="flex-1 space-y-3">
                      <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                        <strong className="font-black text-indigo-950">Subject Line Analysis:</strong> The inclusion of the rocket emoji (🚀) correlated with a 12% higher open rate compared to last month's text-only subject.
                      </p>
                      <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                        <strong className="font-black text-indigo-950">Optimal Send Time:</strong> Engagement peaked at 10:30 AM EST. Consider shifting the default 9:00 AM send time for future newsletters.
                      </p>
                    </div>
                    <div className="w-48 h-32 bg-white rounded-lg p-2 shadow-sm border border-indigo-100 flex items-end justify-between px-4">
                      {/* Mini mock bar chart */}
                      {[100, 45, 12, 3].map((h, i) => <div key={i} className="w-6 bg-indigo-400 rounded-t-sm" style={{ height: `${h}%` }} />)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sent</span><p className="text-2xl font-black text-slate-900">44,800</p></div>
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Open Rate</span><p className="text-2xl font-black text-slate-900">41.1%</p></div>
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Click Rate</span><p className="text-2xl font-black text-slate-900">9.1%</p></div>
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Unsubs</span><p className="text-2xl font-black text-slate-900">120</p></div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#1e1a4f] pl-3">2. Link Performance</h2>
                  <table className="w-full text-left border-collapse mt-4">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="py-2 text-sm font-black uppercase text-slate-900">Link URL</th>
                        <th className="py-2 text-sm font-black uppercase text-slate-900 text-right">Unique Clicks</th>
                        <th className="py-2 text-sm font-black uppercase text-slate-900 text-right">CTR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="py-3 text-sm font-medium text-blue-600">/features/new-dashboard</td><td className="py-3 text-sm font-bold text-slate-700 text-right">2,840</td><td className="py-3 text-sm font-bold text-slate-700 text-right">6.3%</td></tr>
                      <tr><td className="py-3 text-sm font-medium text-blue-600">/pricing/upgrade</td><td className="py-3 text-sm font-bold text-slate-700 text-right">850</td><td className="py-3 text-sm font-bold text-slate-700 text-right">1.9%</td></tr>
                      <tr><td className="py-3 text-sm font-medium text-blue-600">/blog/best-practices</td><td className="py-3 text-sm font-bold text-slate-700 text-right">410</td><td className="py-3 text-sm font-bold text-slate-700 text-right">0.9%</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Excel/CSV Preview Body (Dark Mode)
              <div className="w-full flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  {['Total opens increased 12% vs last month', 'Highest engagement in North America region', 'Mobile open rate at 62%'].map((txt, i) => (
                    <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex gap-3 shadow-lg">
                      <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                      <p className="text-slate-300 text-sm font-medium">{txt}</p>
                    </div>
                  ))}
                </div>
                
                <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl flex-1">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-slate-300 whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-800 border-b border-slate-700">
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Recipient Email</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Status</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700 text-right">Opens</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700 text-right">Clicks</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Last Open Time</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400">Browser / OS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-sm">
                        {[
                          { e: 'sarah.j@example.com', s: 'Delivered', o: 4, c: 1, t: '2026-07-28 10:42:15', b: 'Chrome / MacOS' },
                          { e: 'mike.c@acme.inc', s: 'Delivered', o: 1, c: 0, t: '2026-07-28 09:15:02', b: 'Safari / iOS' },
                          { e: 'unknown@domain.com', s: 'Bounced', o: 0, c: 0, t: '-', b: '-' },
                          { e: 'emma.w@startup.io', s: 'Delivered', o: 2, c: 2, t: '2026-07-29 14:20:11', b: 'Edge / Windows' },
                          { e: 'david.b@corp.org', s: 'Delivered', o: 0, c: 0, t: '-', b: '-' },
                          { e: 'jessica.m@example.com', s: 'Unsubscribed', o: 1, c: 0, t: '2026-07-28 11:05:44', b: 'Mail App / iOS' },
                        ].map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="p-3 border-r border-slate-800 text-blue-400">{r.e}</td>
                            <td className="p-3 border-r border-slate-800 text-emerald-400">{r.s}</td>
                            <td className="p-3 border-r border-slate-800 text-right">{r.o}</td>
                            <td className="p-3 border-r border-slate-800 text-right">{r.c}</td>
                            <td className="p-3 border-r border-slate-800 text-slate-500">{r.t}</td>
                            <td className="p-3 text-slate-500">{r.b}</td>
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
