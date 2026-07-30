'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { 
  RefreshCw, Calendar, Users, MapPin, Package, FileText, Download, 
  Trash2, Clock, Play, FileSpreadsheet, ArrowUpRight, ArrowDownRight,
  TrendingUp, CircleDollarSign, Target, Activity, FileIcon, ShieldAlert,
  Sparkles, CheckCircle2, ChevronDown, Check, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

// --- Data Schemas ---
type SortDir = 'asc' | 'desc' | null;
type ReportType = 'sales' | 'revenue' | 'activity' | 'conversion' | 'pipeline';
type FrequencyType = 'daily' | 'weekly' | 'monthly';

interface TableRow {
  id: number;
  agent: string;
  region: string;
  product: string;
  deals: number;
  revenue: number;
  conversion: number; 
  pipeline: number;
  status: string; 
}

interface SavedReport {
  id: string;
  name: string;
  type: ReportType;
  createdAt: string;
  lastRun: string;
  status: 'success' | 'error';
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: FrequencyType;
  nextRun: string;
  recipients: number;
  active: boolean; 
}

// --- Mock Data ---
const MOCK_TABLE_DATA: TableRow[] = [
  { id: 1, agent: 'Sarah Jenkins', region: 'North America', product: 'Enterprise Suite', deals: 45, revenue: 1250000, conversion: 68, pipeline: 2400000, status: 'Won' },
  { id: 2, agent: 'Michael Chen', region: 'APAC', product: 'Professional', deals: 82, revenue: 840000, conversion: 45, pipeline: 1100000, status: 'Active' },
  { id: 3, agent: 'Emma Wilson', region: 'Europe', product: 'Starter', deals: 156, revenue: 390000, conversion: 82, pipeline: 450000, status: 'Won' },
  { id: 4, agent: 'James Smith', region: 'North America', product: 'Enterprise Suite', deals: 12, revenue: 420000, conversion: 25, pipeline: 3800000, status: 'At Risk' },
  { id: 5, agent: 'Olivia Davis', region: 'LATAM', product: 'Professional', deals: 64, revenue: 620000, conversion: 54, pipeline: 890000, status: 'Active' },
];

const MOCK_SAVED_REPORTS: SavedReport[] = [
  { id: 'sr1', name: 'Q2 Global Revenue Summary', type: 'revenue', createdAt: '2026-06-30', lastRun: 'Today, 09:41 AM', status: 'success' },
  { id: 'sr2', name: 'APAC Underperforming Leads', type: 'conversion', createdAt: '2026-07-15', lastRun: 'Yesterday, 14:22 PM', status: 'success' },
  { id: 'sr3', name: 'Enterprise Pipeline Risk', type: 'pipeline', createdAt: '2026-07-28', lastRun: 'Jul 28, 08:00 AM', status: 'error' },
];

const MOCK_SCHEDULED_REPORTS: ScheduledReport[] = [
  { id: 'sch1', name: 'Daily Sales Flash', frequency: 'daily', nextRun: 'Tomorrow, 08:00 AM', recipients: 12, active: true },
  { id: 'sch2', name: 'Weekly Region Performance', frequency: 'weekly', nextRun: 'Monday, 09:00 AM', recipients: 45, active: true },
  { id: 'sch3', name: 'Monthly Board Packet (Data)', frequency: 'monthly', nextRun: 'Aug 1, 00:00 AM', recipients: 5, active: false },
];

const REVENUE_DATA = [
  { month: 'Jan', revenue: 1.2, target: 1.0 },
  { month: 'Feb', revenue: 1.5, target: 1.2 },
  { month: 'Mar', revenue: 1.4, target: 1.4 },
  { month: 'Apr', revenue: 1.8, target: 1.6 },
  { month: 'May', revenue: 2.2, target: 1.8 },
  { month: 'Jun', revenue: 2.4, target: 2.0 },
];

const FUNNEL_DATA = [
  { stage: 'Lead', count: 1240, fill: '#3b82f6' },
  { stage: 'Qualified', count: 850, fill: '#8b5cf6' },
  { stage: 'Proposal', count: 420, fill: '#ec4899' },
  { stage: 'Negotiation', count: 280, fill: '#f59e0b' },
  { stage: 'Closed Won', count: 156, fill: '#10b981' },
];

const REPORT_TYPES: { id: ReportType, label: string, color: string }[] = [
  { id: 'sales', label: 'Sales', color: 'bg-blue-500' },
  { id: 'revenue', label: 'Revenue', color: 'bg-emerald-500' },
  { id: 'activity', label: 'Customer activity', color: 'bg-purple-500' },
  { id: 'conversion', label: 'Lead conversion', color: 'bg-amber-500' },
  { id: 'pipeline', label: 'Pipeline', color: 'bg-pink-500' },
];

export default function ReportsPage() {
  const [activeType, setActiveType] = useState<ReportType>('revenue');
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(true); // Default true for demo
  const [activeTab, setActiveTab] = useState<'table' | 'saved' | 'scheduled'>('table');
  
  // Table state
  const [sortCol, setSortCol] = useState<keyof TableRow>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  // Scheduled state
  const [scheduled, setScheduled] = useState(MOCK_SCHEDULED_REPORTS);

  // Export Modal state
  const [exportPreview, setExportPreview] = useState<'pdf' | 'excel' | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setHasGenerated(false);
    setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 1500);
  };

  const handleSort = (col: keyof TableRow) => {
    if (sortCol === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const sortedData = [...MOCK_TABLE_DATA].sort((a, b) => {
    if (!sortDir) return 0;
    const modifier = sortDir === 'asc' ? 1 : -1;
    if (a[sortCol] < b[sortCol]) return -1 * modifier;
    if (a[sortCol] > b[sortCol]) return 1 * modifier;
    return 0;
  });

  const toggleScheduled = (id: string) => {
    setScheduled(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-0 bg-[#f8fafc]">
      
      {/* 2. Global Layout & Header */}
      <div className="p-6 pb-4 bg-white border-b border-slate-200 shrink-0">
        <div className="flex flex-col gap-6">
          
          <div>
            <h1 className="text-3xl text-slate-900 tracking-tight mb-1" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800 }}>Reports</h1>
            <p className="text-sm text-slate-500 font-medium">Analyze performance, track trends, and schedule automated reports.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {REPORT_TYPES.map(rt => {
              const isActive = activeType === rt.id;
              return (
                <button
                  key={rt.id}
                  onClick={() => setActiveType(rt.id)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all duration-300 ${
                    isActive 
                      ? `${rt.color} text-white shadow-lg ring-2 ring-offset-2 ring-transparent` 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  style={isActive ? { boxShadow: `0 8px 20px -8px ${rt.color.replace('bg-', 'var(--tw-colors-').replace('-500', '-500)')}` } : {}}
                >
                  {rt.label}
                </button>
              )
            })}
          </div>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50">
            <div className="p-3 px-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Date Range</label>
                  <Select defaultValue="ytd">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Calendar className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="ytd">Year to Date</SelectItem><SelectItem value="q2">Q2 2026</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Agent</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Users className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Agents</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Region</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><MapPin className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Global</SelectItem><SelectItem value="na">North America</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-1">Product</label>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[160px] h-9 bg-white border-slate-200 rounded-xl font-bold text-sm shadow-sm"><Package className="w-4 h-4 mr-2 text-slate-400" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Products</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-4 xl:pt-0">
                <Button variant="ghost" className="font-bold text-slate-600 rounded-xl">Schedule</Button>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest px-3">Export:</span>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-600" onClick={() => setExportPreview('pdf')}><FileIcon className="w-3 h-3 mr-1" /> PDF</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-green-50 hover:text-green-600 text-slate-600" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> CSV</Button>
                  <Button variant="ghost" size="sm" className="h-7 px-3 text-xs font-bold rounded-lg hover:bg-emerald-50 hover:text-emerald-600 text-slate-600" onClick={() => setExportPreview('excel')}><FileSpreadsheet className="w-3 h-3 mr-1" /> Excel</Button>
                </div>
                <Button className="bg-[#1e1a4f] hover:bg-[#2d2770] text-white rounded-xl shadow-md font-bold px-6" onClick={handleGenerate} disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 relative">
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-[#1e1a4f] rounded-full animate-spin mb-4" />
            <h2 className="text-xl font-black text-[#1e1a4f] animate-pulse">Crunching numbers...</h2>
          </div>
        )}

        {hasGenerated && (
          <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            
            {/* 3. Generated Content Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Revenue', value: '$3.5M', delta: '+15.2%', icon: CircleDollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Deals Closed', value: '359', delta: '+4.1%', icon: Target, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Avg Conversion', value: '54%', delta: '-2.4%', icon: Activity, color: 'text-rose-600', bg: 'bg-rose-50', down: true },
                { label: 'Active Pipeline', value: '$8.2M', delta: '+22.5%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
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
                      <Badge className={`${kpi.down ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} hover:bg-transparent font-bold border-transparent px-2`}>
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
                  <h3 className="font-bold text-slate-900">Revenue Trend vs Target</h3>
                  <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">Last 6 Months</Badge>
                </div>
                <div className="p-5 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={REVENUE_DATA} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} tickFormatter={(v) => `$${v}M`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} formatter={(v: number) => [`$${v}M`, '']} />
                      <Line type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Target" />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} name="Revenue" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="border-slate-200 shadow-sm rounded-2xl">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Pipeline Funnel</h3>
                  <Badge variant="outline" className="text-slate-500 font-bold border-slate-200">All Agents</Badge>
                </div>
                <div className="p-5 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={FUNNEL_DATA} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} />
                      <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 700 }} dx={-10} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
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
              <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('table')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'table' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Report table</button>
                <button onClick={() => setActiveTab('saved')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'saved' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Saved reports</button>
                <button onClick={() => setActiveTab('scheduled')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'scheduled' ? 'border-[#1e1a4f] text-[#1e1a4f]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>Scheduled</button>
              </div>

              {activeTab === 'table' && (
                <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('agent')}>Agent</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('region')}>Region</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('product')}>Product</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer text-right" onClick={() => handleSort('deals')}>Deals</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer text-right" onClick={() => handleSort('revenue')}>Revenue</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer w-48" onClick={() => handleSort('conversion')}>Conv. Rate</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer text-right" onClick={() => handleSort('pipeline')}>Pipeline</th>
                          <th className="p-4 text-[11px] font-black uppercase tracking-wider text-slate-500 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sortedData.map(row => (
                          <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 font-bold text-slate-900">{row.agent}</td>
                            <td className="p-4 text-sm font-medium text-slate-600">{row.region}</td>
                            <td className="p-4 text-sm font-medium text-slate-600">{row.product}</td>
                            <td className="p-4 text-sm font-black text-slate-900 text-right">{row.deals}</td>
                            <td className="p-4 text-sm font-black text-emerald-600 text-right">{formatCurrency(row.revenue)}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-slate-700 w-8">{row.conversion}%</span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.conversion}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm font-black text-slate-700 text-right">{formatCurrency(row.pipeline)}</td>
                            <td className="p-4">
                              <Badge variant="outline" className={`text-[10px] uppercase font-black tracking-wider px-2 py-0.5 border-transparent ${
                                row.status === 'Won' ? 'bg-emerald-50 text-emerald-700' : 
                                row.status === 'Active' ? 'bg-purple-50 text-purple-700' : 'bg-amber-50 text-amber-700'
                              }`}>
                                {row.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {activeTab === 'saved' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {MOCK_SAVED_REPORTS.map(r => (
                    <Card key={r.id} className="border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-colors">
                      <CardContent className="p-5 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500"><FileText className="w-5 h-5" /></div>
                            <div>
                              <h4 className="font-bold text-slate-900 leading-tight">{r.name}</h4>
                              <p className="text-xs font-medium text-slate-500 capitalize">{r.type} Report</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-slate-500 space-y-1">
                          <p>Created: {r.createdAt}</p>
                          <p>Last run: {r.lastRun}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          {r.status === 'success' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1" /> Success</Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 hover:bg-rose-50 border-rose-200"><ShieldAlert className="w-3 h-3 mr-1" /> Failed</Badge>
                          )}
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="h-8 font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3"><Play className="w-3 h-3 mr-1" /> Run</Button>
                            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </div>
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
                              <h4 className="font-bold text-slate-900 leading-tight">{s.name}</h4>
                              <p className="text-xs font-medium text-slate-500">{s.recipients} Recipients</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="uppercase text-[10px] font-black tracking-widest text-slate-500">{s.frequency}</Badge>
                          <span className="text-xs font-medium text-slate-500">Next: {s.nextRun}</span>
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
            </div>
          </div>
        )}
      </div>

      {/* 5. Export Preview Modal */}
      <Dialog open={!!exportPreview} onOpenChange={(open) => { if(!open) setExportPreview(null) }}>
        <DialogContent className={`max-w-[1200px] h-[90vh] p-0 border-0 shadow-2xl rounded-[1.5rem] overflow-hidden flex flex-col ${exportPreview === 'excel' ? 'bg-[#1e293b]' : 'bg-slate-100'}`}>
          <DialogHeader className="p-4 border-b border-white/10 bg-[#0f172a] shrink-0 flex flex-row items-center justify-between text-white">
            <DialogTitle className="text-lg font-bold">
              {exportPreview === 'pdf' ? 'Analytical Report Preview (PDF)' : 'Spreadsheet Preview (Excel/CSV)'}
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
                  <h1 className="text-4xl text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}>CRM Analytical Report</h1>
                  <p className="text-slate-500 font-bold tracking-widest uppercase text-sm">Generated: July 30, 2026</p>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#1e1a4f] pl-3">1. Executive Summary</h2>
                  <p className="text-slate-600 leading-relaxed">
                    This report synthesizes performance metrics across all global regions for the current period. Overall revenue has exceeded targets by 15.2%, driven primarily by strong enterprise software adoption in North America and APAC. Pipeline velocity remains stable, though specific starter segments require optimization to improve lead conversion rates.
                  </p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24 text-indigo-500" /></div>
                  <h3 className="text-indigo-900 font-black text-lg mb-4 flex items-center gap-2 relative z-10"><Sparkles className="w-5 h-5 text-indigo-600" /> Comprehensive AI Insights</h3>
                  <div className="flex gap-6 relative z-10">
                    <div className="flex-1 space-y-3">
                      <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                        <strong className="font-black text-indigo-950">High conversion predicted:</strong> Our models indicate a 24% higher likelihood of closing Enterprise deals in Q3 based on current engagement signals.
                      </p>
                      <p className="text-indigo-800 text-sm font-medium leading-relaxed">
                        <strong className="font-black text-indigo-950">Risk identified:</strong> Starter product pipeline has stagnated in Europe. Recommend launching the Q3 promotional campaign immediately.
                      </p>
                    </div>
                    <div className="w-48 h-32 bg-white rounded-lg p-2 shadow-sm border border-indigo-100 flex items-end justify-between px-4">
                      {/* Mini mock bar chart */}
                      {[60, 80, 40, 100].map((h, i) => <div key={i} className="w-6 bg-indigo-400 rounded-t-sm" style={{ height: `${h}%` }} />)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Revenue</span><p className="text-3xl font-black text-slate-900">$3.5M</p></div>
                  <div className="border border-slate-200 p-4 rounded-lg"><span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Pipeline</span><p className="text-3xl font-black text-slate-900">$8.2M</p></div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-3 border-l-4 border-[#1e1a4f] pl-3">2. Top Performers</h2>
                  <table className="w-full text-left border-collapse mt-4">
                    <thead>
                      <tr className="border-b-2 border-slate-200">
                        <th className="py-2 text-sm font-black uppercase text-slate-900">Agent</th>
                        <th className="py-2 text-sm font-black uppercase text-slate-900">Region</th>
                        <th className="py-2 text-sm font-black uppercase text-slate-900 text-right">Deals</th>
                        <th className="py-2 text-sm font-black uppercase text-slate-900 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MOCK_TABLE_DATA.slice(0, 3).map(r => (
                        <tr key={r.id}>
                          <td className="py-3 text-sm font-bold text-slate-700">{r.agent}</td>
                          <td className="py-3 text-sm text-slate-600">{r.region}</td>
                          <td className="py-3 text-sm font-bold text-slate-700 text-right">{r.deals}</td>
                          <td className="py-3 text-sm font-bold text-emerald-600 text-right">{formatCurrency(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // Excel/CSV Preview Body (Dark Mode)
              <div className="w-full flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4">
                  {['Revenue trend indicates +15% QoQ growth', 'Sarah Jenkins is top performer in NA', 'Enterprise Suite accounts for 65% of pipeline'].map((txt, i) => (
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
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">ID</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Agent Name</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Region</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700">Product Line</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700 text-right">Deals Closed</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700 text-right">Revenue (USD)</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 border-r border-slate-700 text-right">Pipeline (USD)</th>
                          <th className="p-3 text-xs font-black uppercase tracking-wider text-slate-400 text-right">Conv. %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-sm">
                        {[...MOCK_TABLE_DATA, ...MOCK_TABLE_DATA].map((r, i) => (
                          <tr key={i} className="hover:bg-slate-800/50">
                            <td className="p-3 border-r border-slate-800 text-slate-500">{r.id + (i > 4 ? 5 : 0)}</td>
                            <td className="p-3 border-r border-slate-800 text-blue-400">{r.agent}</td>
                            <td className="p-3 border-r border-slate-800">{r.region}</td>
                            <td className="p-3 border-r border-slate-800">{r.product}</td>
                            <td className="p-3 border-r border-slate-800 text-right">{r.deals}</td>
                            <td className="p-3 border-r border-slate-800 text-right text-emerald-400">{r.revenue}</td>
                            <td className="p-3 border-r border-slate-800 text-right">{r.pipeline}</td>
                            <td className="p-3 text-right">{r.conversion}</td>
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
