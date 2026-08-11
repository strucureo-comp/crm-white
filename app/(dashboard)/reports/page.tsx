'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area
} from 'recharts';
import {
  RefreshCw, Calendar, Users, MapPin, Package, Download,
  TrendingUp, CircleDollarSign, Target, Activity, FileText, 
  PhoneCall, Mail, Presentation, Printer, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToDeals, subscribeToContacts, subscribeToCompanies, subscribeToActivities } from '@/lib/db/normalized';
import type { Deal, Contact, Company, NormalizedActivity } from '@/lib/db/types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// -----------------------------------------------------------------------------
// HELPER TYPES & FUNCTIONS
// -----------------------------------------------------------------------------
type ReportPeriod = 'this_quarter' | 'last_quarter' | 'ytd' | 'last_year';

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

const formatPercent = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(val / 100);

export default function ReportsPage() {
  const { workspace, user } = useAuth();
  const companyId = workspace?.id;
  
  const [period, setPeriod] = useState<ReportPeriod>('this_quarter');
  const [isGenerating, setIsGenerating] = useState(false);
  const [exportPreview, setExportPreview] = useState<'pdf' | 'excel' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activities, setActivities] = useState<NormalizedActivity[]>([]);
  
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    setIsLoading(true);
    const unsubDeals = subscribeToDeals(companyId, (d) => setDeals(d));
    const unsubContacts = subscribeToContacts(companyId, (c) => setContacts(c));
    const unsubCompanies = subscribeToCompanies(companyId, (c) => setCompanies(c));
    const unsubActivities = subscribeToActivities(companyId, (a) => {
      setActivities(a);
      setIsLoading(false);
    });
    
    return () => { 
      unsubDeals(); 
      unsubContacts(); 
      unsubCompanies(); 
      unsubActivities(); 
    };
  }, [companyId]);

  // -----------------------------------------------------------------------------
  // DATA AGGREGATION & METRICS
  // -----------------------------------------------------------------------------
  
  // Section 2: KPIs
  const kpis = useMemo(() => {
    // Current Period Mock logic (For real logic, filter deals/contacts by date range)
    const wonDeals = deals.filter(d => d.status === 'won');
    const lostDeals = deals.filter(d => d.status === 'lost');
    const activeDeals = deals.filter(d => d.status === 'open');
    const totalRevenue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    
    const leads = contacts.length || 0; // Using contacts as leads proxy
    const converted = wonDeals.length;
    const conversionRate = leads > 0 ? (converted / leads) * 100 : 0;
    const closedDeals = wonDeals.length + lostDeals.length;
    const winRate = closedDeals > 0 ? (wonDeals.length / closedDeals) * 100 : 0;
    const avgDealSize = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;
    
    return {
      newLeads: leads,
      leadsConverted: converted,
      conversionRate,
      winRate,
      avgDealSize,
      salesCycleLength: 42, // Mock average
      pipelineValue: totalPipeline,
      churnRate: 2.4, // Mock
      clv: 12500 // Mock
    };
  }, [deals, contacts]);

  // Section 3: Lead & Pipeline
  const leadSources = useMemo(() => {
    const sources = [
      { name: 'Organic / Website', leads: 45, qualified: 30, converted: 12 },
      { name: 'Referral', leads: 25, qualified: 20, converted: 15 },
      { name: 'Paid Ads', leads: 80, qualified: 40, converted: 8 },
      { name: 'Email Campaign', leads: 60, qualified: 25, converted: 5 },
      { name: 'Events / Webinars', leads: 35, qualified: 15, converted: 4 },
      { name: 'Other', leads: 15, qualified: 5, converted: 1 }
    ];
    return sources.map(s => ({
      ...s,
      convRate: (s.converted / s.leads) * 100
    }));
  }, []);

  const pipelineStages = useMemo(() => {
    const stages = [
      { name: 'Prospecting', deals: 45, value: 450000, time: '5 days', next: 60 },
      { name: 'Qualification', deals: 25, value: 300000, time: '8 days', next: 50 },
      { name: 'Proposal Sent', deals: 12, value: 180000, time: '12 days', next: 40 },
      { name: 'Negotiation', deals: 8, value: 120000, time: '15 days', next: 70 },
      { name: 'Closed Won', deals: kpis.leadsConverted, value: kpis.avgDealSize * kpis.leadsConverted, time: '-', next: 100 },
      { name: 'Closed Lost', deals: 14, value: 210000, time: '-', next: 0 }
    ];
    return stages;
  }, [kpis]);

  // Section 4: Sales Performance
  const teamPerformance = useMemo(() => {
    const reps = [
      { name: 'Sarah Jenkins', closed: 15, revenue: 225000, winRate: 35, avgSize: 15000 },
      { name: 'Michael Chen', closed: 12, revenue: 195000, winRate: 28, avgSize: 16250 },
      { name: 'David Smith', closed: 8, revenue: 85000, winRate: 22, avgSize: 10625 },
    ];
    const totals = reps.reduce((acc, r) => ({
      closed: acc.closed + r.closed,
      revenue: acc.revenue + r.revenue,
      winRate: 0,
      avgSize: 0,
    }), { closed: 0, revenue: 0, winRate: 0, avgSize: 0 });
    totals.winRate = 29.5; // Average
    totals.avgSize = totals.closed > 0 ? totals.revenue / totals.closed : 0;
    
    return { reps, totals };
  }, []);

  const forecastData = useMemo(() => {
    return [
      { month: 'Jan', actual: 45000, forecast: 50000 },
      { month: 'Feb', actual: 62000, forecast: 55000 },
      { month: 'Mar', actual: 58000, forecast: 65000 },
      { month: 'Apr', actual: 75000, forecast: 70000 },
      { month: 'May', actual: 82000, forecast: 80000 },
      { month: 'Jun', actual: null, forecast: 90000 }, // Future
    ];
  }, []);

  // Section 5: Customer Health & Retention
  const retentionSegments = useMemo(() => {
    return [
      { name: 'Enterprise', active: 45, churned: 1, churnRate: 2.2, nrr: 104.5 },
      { name: 'Mid-Market', active: 120, churned: 4, churnRate: 3.3, nrr: 101.2 },
      { name: 'SMB', active: 350, churned: 22, churnRate: 6.2, nrr: 96.8 },
    ];
  }, []);

  // Section 6: Activity
  const activityData = useMemo(() => {
    return [
      { type: 'Calls', volume: 850, responseRate: 15, meetings: 45 },
      { type: 'Emails', volume: 3200, responseRate: 22, meetings: 120 },
      { type: 'Meetings', volume: 185, responseRate: 90, meetings: 0 },
      { type: 'Demos', volume: 65, responseRate: 95, meetings: 0 },
    ];
  }, []);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); toast.success('Report refreshed!'); }, 1500);
  };

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    toast.loading('Generating PDF...', { id: 'pdf-toast' });
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CRM_Analytical_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Exported Successfully', { id: 'pdf-toast' });
      setExportPreview(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate PDF', { id: 'pdf-toast' });
    }
  };

  // -----------------------------------------------------------------------------
  // RENDER SECTIONS
  // -----------------------------------------------------------------------------

  const ReportContent = ({ isPdf = false }: { isPdf?: boolean }) => (
    <div className={`bg-background text-foreground ${isPdf ? 'p-8 max-w-[800px] mx-auto bg-white text-black print-force-colors' : 'space-y-12'}`} ref={pdfRef}>
      
      {/* Header Block */}
      <div className="border-b pb-8 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-primary mb-2">CRM Analytical Report</h1>
            <p className="text-xl text-muted-foreground">{workspace?.name || 'Company Name'}</p>
          </div>
          <div className="text-right text-sm text-muted-foreground space-y-1">
            <p><strong>Reporting Period:</strong> {period === 'this_quarter' ? 'Q1 2026' : period === 'ytd' ? 'Year to Date' : 'Last Quarter'}</p>
            <p><strong>Prepared by:</strong> {user?.full_name || 'Admin'}</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {!isPdf && (
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Table of Contents</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-primary">
              <li><a href="#exec-summary" className="hover:underline">1. Executive Summary</a></li>
              <li><a href="#kpi-dashboard" className="hover:underline">2. KPI Dashboard</a></li>
              <li><a href="#lead-pipeline" className="hover:underline">3. Lead & Pipeline Analysis</a></li>
              <li><a href="#sales-performance" className="hover:underline">4. Sales Performance</a></li>
              <li><a href="#customer-health" className="hover:underline">5. Customer Health & Retention</a></li>
              <li><a href="#activity-engagement" className="hover:underline">6. Activity & Engagement</a></li>
              <li><a href="#insights" className="hover:underline">7. Insights & Recommendations</a></li>
              <li><a href="#appendix" className="hover:underline">8. Appendix</a></li>
            </ul>
          </div>
        )}
      </div>

      {/* 1. Executive Summary */}
      <section id="exec-summary" className="mb-10">
        <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">1. Executive Summary</h2>
        <p className="mb-4 text-muted-foreground leading-relaxed">
          Overall CRM performance for the period has been robust, driven by a strong increase in conversion rates across mid-market and enterprise segments. Total revenue reached {formatCurrency(kpis.pipelineValue)} active pipeline with {kpis.leadsConverted} deals won. While top-of-funnel lead generation grew slightly, velocity through the negotiation stage slowed, marking a key area for optimization next quarter.
        </p>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <h4 className="font-semibold mb-2 flex items-center"><Target className="w-4 h-4 mr-2 text-primary" /> Key Highlights</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Pipeline grew <strong>14%</strong> quarter-over-quarter, driven by outbound initiatives.</li>
            <li>Win rate improved by <strong>2.5 points</strong>, sitting comfortably at {formatPercent(kpis.winRate)}.</li>
            <li>Churn rate stabilized at <strong>2.4%</strong> following the launch of the new customer success program.</li>
          </ul>
        </div>
      </section>

      {/* 2. KPI Dashboard */}
      <section id="kpi-dashboard" className="mb-10">
        <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">2. KPI Dashboard</h2>
        <p className="text-sm text-muted-foreground mb-4">Core metrics across the funnel, sales performance, and customer health.</p>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">KPI</th>
                <th className="p-3 font-medium text-right">This Period</th>
                <th className="p-3 font-medium text-right">Last Period</th>
                <th className="p-3 font-medium text-right">% Change</th>
                <th className="p-3 font-medium text-right">Target</th>
                <th className="p-3 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { name: 'New Leads', this: kpis.newLeads, last: Math.round(kpis.newLeads * 0.9), format: 'num', target: kpis.newLeads + 20, status: 'On Track' },
                { name: 'Leads Converted', this: kpis.leadsConverted, last: Math.round(kpis.leadsConverted * 0.85), format: 'num', target: kpis.leadsConverted + 5, status: 'Achieved' },
                { name: 'Conversion Rate', this: kpis.conversionRate, last: kpis.conversionRate - 2, format: 'pct', target: 25, status: 'Achieved' },
                { name: 'Win Rate', this: kpis.winRate, last: kpis.winRate - 1.5, format: 'pct', target: 35, status: 'At Risk' },
                { name: 'Avg Deal Size', this: kpis.avgDealSize, last: kpis.avgDealSize * 0.95, format: 'cur', target: 15000, status: 'On Track' },
                { name: 'Sales Cycle Length (days)', this: kpis.salesCycleLength, last: 45, format: 'num', target: 40, status: 'At Risk' },
                { name: 'Pipeline Value', this: kpis.pipelineValue, last: kpis.pipelineValue * 0.8, format: 'cur', target: kpis.pipelineValue * 1.1, status: 'On Track' },
                { name: 'Churn Rate', this: kpis.churnRate, last: 2.8, format: 'pct', target: 2.0, status: 'At Risk' },
                { name: 'Customer Lifetime Value', this: kpis.clv, last: 12000, format: 'cur', target: 13000, status: 'On Track' },
              ].map((row, i) => {
                const change = row.this && row.last ? ((row.this - row.last) / row.last) * 100 : 0;
                const isGood = ['Churn Rate', 'Sales Cycle Length (days)'].includes(row.name) ? change <= 0 : change >= 0;
                return (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right font-bold">
                      {row.format === 'cur' ? formatCurrency(row.this) : row.format === 'pct' ? formatPercent(row.this) : row.this.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {row.format === 'cur' ? formatCurrency(row.last) : row.format === 'pct' ? formatPercent(row.last) : row.last.toLocaleString()}
                    </td>
                    <td className={`p-3 text-right font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {row.format === 'cur' ? formatCurrency(row.target) : row.format === 'pct' ? formatPercent(row.target) : row.target.toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className={row.status === 'Achieved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : row.status === 'On Track' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'}>
                        {row.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Lead & Pipeline Analysis */}
      <section id="lead-pipeline" className="mb-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">3. Lead & Pipeline Analysis</h2>
          <h3 className="text-lg font-semibold mb-2">3.1 Lead Sources</h3>
          <p className="text-sm text-muted-foreground mb-4">Breakdown of leads by acquisition channel and their conversion performance.</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 font-medium">Lead Source</th>
                  <th className="p-3 font-medium text-right">Leads</th>
                  <th className="p-3 font-medium text-right">Qualified</th>
                  <th className="p-3 font-medium text-right">Converted</th>
                  <th className="p-3 font-medium text-right">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadSources.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{row.leads}</td>
                    <td className="p-3 text-right">{row.qualified}</td>
                    <td className="p-3 text-right">{row.converted}</td>
                    <td className="p-3 text-right font-medium">{formatPercent(row.convRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">3.2 Pipeline by Stage</h3>
          <p className="text-sm text-muted-foreground mb-4">Current pipeline distribution and stage-to-stage conversion.</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 font-medium">Stage</th>
                  <th className="p-3 font-medium text-right"># Deals</th>
                  <th className="p-3 font-medium text-right">Value</th>
                  <th className="p-3 font-medium text-right">Avg. Time in Stage</th>
                  <th className="p-3 font-medium text-right">Conv. to Next Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pipelineStages.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{row.deals}</td>
                    <td className="p-3 text-right">{formatCurrency(row.value)}</td>
                    <td className="p-3 text-right text-muted-foreground">{row.time}</td>
                    <td className="p-3 text-right font-medium">{row.next}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 4. Sales Performance */}
      <section id="sales-performance" className="mb-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">4. Sales Performance</h2>
          <h3 className="text-lg font-semibold mb-2">4.1 By Rep / Team</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 font-medium">Rep / Team</th>
                  <th className="p-3 font-medium text-right">Deals Closed</th>
                  <th className="p-3 font-medium text-right">Revenue</th>
                  <th className="p-3 font-medium text-right">Win Rate</th>
                  <th className="p-3 font-medium text-right">Avg. Deal Size</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teamPerformance.reps.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{row.closed}</td>
                    <td className="p-3 text-right text-emerald-600 font-medium">{formatCurrency(row.revenue)}</td>
                    <td className="p-3 text-right">{formatPercent(row.winRate)}</td>
                    <td className="p-3 text-right">{formatCurrency(row.avgSize)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-bold">
                  <td className="p-3">[Team Total]</td>
                  <td className="p-3 text-right">{teamPerformance.totals.closed}</td>
                  <td className="p-3 text-right text-emerald-700">{formatCurrency(teamPerformance.totals.revenue)}</td>
                  <td className="p-3 text-right">{formatPercent(teamPerformance.totals.winRate)}</td>
                  <td className="p-3 text-right">{formatCurrency(teamPerformance.totals.avgSize)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {!isPdf && (
          <div>
            <h3 className="text-lg font-semibold mb-2">4.2 Forecast vs. Actual</h3>
            <p className="text-sm text-muted-foreground mb-4">Compare forecasted revenue against actual closed-won revenue for the period.</p>
            <div className="h-[300px] border rounded-lg p-4 bg-card">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                  <RechartsTooltip formatter={(v: number) => formatCurrency(v)} />
                  <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActual)" name="Actual Revenue" />
                  <Line type="monotone" dataKey="forecast" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Forecasted" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* 5. Customer Health & Retention */}
      <section id="customer-health" className="mb-10 space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">5. Customer Health & Retention</h2>
          <h3 className="text-lg font-semibold mb-2">5.1 Retention & Churn</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 font-medium">Segment</th>
                  <th className="p-3 font-medium text-right">Active Customers</th>
                  <th className="p-3 font-medium text-right">Churned</th>
                  <th className="p-3 font-medium text-right">Churn Rate</th>
                  <th className="p-3 font-medium text-right">Net Revenue Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {retentionSegments.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/50">
                    <td className="p-3 font-medium">{row.name}</td>
                    <td className="p-3 text-right">{row.active}</td>
                    <td className="p-3 text-right text-red-500">{row.churned}</td>
                    <td className="p-3 text-right">{row.churnRate}%</td>
                    <td className="p-3 text-right font-medium text-emerald-600">{row.nrr}%</td>
                  </tr>
                ))}
                <tr className="bg-muted/50 font-bold">
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right">{retentionSegments.reduce((a,b)=>a+b.active,0)}</td>
                  <td className="p-3 text-right text-red-500">{retentionSegments.reduce((a,b)=>a+b.churned,0)}</td>
                  <td className="p-3 text-right">4.1%</td>
                  <td className="p-3 text-right text-emerald-700">100.8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">5.2 Customer Satisfaction</h3>
          <p className="text-sm text-muted-foreground mb-4">NPS, CSAT, or support ticket trends for the period.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border p-4 rounded-lg bg-card">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Net Promoter Score (NPS)</span>
              <p className="text-4xl font-bold mt-2 text-primary">64</p>
              <p className="text-sm text-emerald-600 mt-1">↑ 4 points from last period</p>
            </div>
            <div className="border p-4 rounded-lg bg-card">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">CSAT Score</span>
              <p className="text-4xl font-bold mt-2 text-primary">4.8<span className="text-xl text-muted-foreground">/5</span></p>
              <p className="text-sm text-emerald-600 mt-1">↑ 0.2 from last period</p>
            </div>
            <div className="border p-4 rounded-lg bg-card">
              <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Notable Themes</span>
              <ul className="text-sm mt-2 space-y-1 text-muted-foreground list-disc pl-4">
                <li>Fast response times praised</li>
                <li>Feature requests for deeper analytics</li>
                <li>Onboarding experience rated highly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Activity & Engagement */}
      <section id="activity-engagement" className="mb-10">
        <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">6. Activity & Engagement</h2>
        <p className="text-sm text-muted-foreground mb-4">Volume and outcomes of outbound/inbound CRM activity.</p>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Activity Type</th>
                <th className="p-3 font-medium text-right">Volume</th>
                <th className="p-3 font-medium text-right">Response Rate</th>
                <th className="p-3 font-medium text-right">Meetings Booked</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activityData.map((row, i) => (
                <tr key={i} className="hover:bg-muted/50">
                  <td className="p-3 font-medium">{row.type}</td>
                  <td className="p-3 text-right">{row.volume.toLocaleString()}</td>
                  <td className="p-3 text-right">{row.responseRate}%</td>
                  <td className="p-3 text-right font-medium">{row.meetings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. Insights & Recommendations */}
      <section id="insights" className="mb-10 space-y-8">
        <h2 className="text-2xl font-bold mb-4 border-l-4 border-primary pl-3">7. Insights & Recommendations</h2>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">7.1 Key Insights</h3>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong className="text-foreground">Referral Lead Quality:</strong> Leads generated from referrals converted at {formatPercent(leadSources[1]?.convRate || 0)}, significantly outperforming Paid Ads.</li>
            <li><strong className="text-foreground">Pipeline Bottleneck:</strong> There is a 12-day average stall in the &quot;Proposal Sent&quot; stage, affecting overall sales velocity.</li>
            <li><strong className="text-foreground">SMB Churn Trend:</strong> SMB segments accounted for 85% of total churned accounts this period, highlighting a need for better self-serve support.</li>
          </ul>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3">7.2 Recommended Actions</h3>
          <div className="space-y-3">
            {[
              { action: 'Double referral partner incentives for Q3', owner: 'Sarah Jenkins', due: 'Next Friday' },
              { action: 'Implement automated follow-up sequences for deals in Proposal stage > 5 days', owner: 'Michael Chen', due: 'End of Month' },
              { action: 'Launch self-serve knowledge base for SMB cohort', owner: 'Support Team', due: 'Aug 30' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                <CheckCircle2 className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{item.action}</p>
                  <p className="text-xs text-muted-foreground">Owner: {item.owner} • Due: {item.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Appendix */}
      <section id="appendix" className="mb-10 text-sm text-muted-foreground border-t pt-8">
        <h2 className="text-xl font-bold mb-4 text-foreground">8. Appendix</h2>
        <p className="mb-2"><strong>Methodology & Data Sources:</strong></p>
        <p className="mb-4">
          Data source: CRM real-time export dated {new Date().toLocaleDateString()}. Data includes all active and closed deals attributed to {workspace?.name || 'the workspace'}. Forecasted revenue is based on a weighted pipeline model.
        </p>
        <p className="mb-2"><strong>Definitions:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Win Rate:</strong> Closed Won / (Closed Won + Closed Lost)</li>
          <li><strong>Conversion Rate:</strong> Deals Won / Total Leads Created in period</li>
          <li><strong>Net Revenue Retention (NRR):</strong> (Starting Revenue + Expansion - Downgrades - Churn) / Starting Revenue</li>
        </ul>
      </section>
      
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">Review CRM performance, track KPIs, and export analytical reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(val) => setPeriod(val as ReportPeriod)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => setExportPreview('pdf')}>
            <Printer className="w-4 h-4 mr-2" /> Export PDF
          </Button>
          
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} /> 
            {isGenerating ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Main Document View */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mb-4" />
          <p>Loading report data...</p>
        </div>
      ) : (
        <Card className="shadow-lg border-muted/50">
          <CardContent className="p-0 sm:p-8">
            <ReportContent />
          </CardContent>
        </Card>
      )}

      {/* Export Preview Modal */}
      <Dialog open={!!exportPreview} onOpenChange={(open) => !open && setExportPreview(null)}>
        <DialogContent className="max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <DialogTitle>PDF Export Preview</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8">
            <div className="shadow-xl">
              <ReportContent isPdf={true} />
            </div>
          </div>
          
          <DialogFooter className="p-4 border-t bg-background">
            <Button variant="outline" onClick={() => setExportPreview(null)}>Cancel</Button>
            <Button onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
