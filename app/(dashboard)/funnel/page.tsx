'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { KpiCard } from '@/components/dashboard/kpi-card';
import {
  DollarSign,
  TrendingUp,
  PieChart,
  TrendingDown,
  Loader2,
  List,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getLeads, getPipelines } from '@/lib/firebase/database';
import type { Lead, Pipeline } from '@/lib/db/types';
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

const FUNNEL_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won'] as const;

const STAGE_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#f59e0b',
  qualified: '#8b5cf6',
  proposal: '#a855f7',
  negotiation: '#10b981',
  won: '#22c55e',
  lost: '#ef4444',
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
};

export default function FunnelPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState('all');
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    Promise.all([
      getLeads(),
      getPipelines(),
    ])
      .then(([leadsData, pipelinesData]) => {
        setLeads(leadsData);
        setPipelines(pipelinesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const daysOld = dateRange === '7d' ? 7 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 30;
  const cutoff = new Date(Date.now() - daysOld * 86400000).toISOString();

  const filteredLeads = leads.filter((l) => l.created_at >= cutoff);

  const stageData = FUNNEL_STAGES.map((stage) => {
    const stageLeads = filteredLeads.filter((l) => l.status === stage);
    return {
      name: STAGE_LABELS[stage],
      value: stageLeads.reduce((s, l) => s + (l.potential_value || 0), 0),
      count: stageLeads.length,
      fill: STAGE_COLORS[stage],
    };
  });

  const conversionRates: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
    const current = FUNNEL_STAGES[i];
    const next = FUNNEL_STAGES[i + 1];
    const currentCount = filteredLeads.filter((l) => l.status === current).length;
    const nextCount = filteredLeads.filter((l) => l.status === next).length;
    const rate = currentCount > 0 ? ((nextCount / currentCount) * 100) : 0;
    conversionRates.push({
      from: STAGE_LABELS[current],
      to: STAGE_LABELS[next],
      rate: Math.round(rate * 10) / 10,
    });
  }

  const totalLeads = filteredLeads.length;
  const wonLeads = filteredLeads.filter((l) => l.status === 'won');
  const lostLeads = filteredLeads.filter((l) => l.status === 'lost');
  const wonCount = wonLeads.length;
  const lostCount = lostLeads.length;
  const inProgressCount = totalLeads - wonCount - lostCount;

  const totalPipelineValue = stageData.reduce((s, d) => s + d.value, 0);
  const winRate = totalLeads > 0 ? ((wonCount / totalLeads) * 100) : 0;
  const avgDealValue = totalLeads > 0
    ? Math.round(filteredLeads.reduce((s, l) => s + (l.potential_value || 0), 0) / totalLeads)
    : 0;
  const lostValue = lostLeads.reduce((s, l) => s + (l.potential_value || 0), 0);

  const wonPct = totalLeads > 0 ? (wonCount / totalLeads) * 100 : 0;
  const lostPct = totalLeads > 0 ? (lostCount / totalLeads) * 100 : 0;
  const inProgressPct = totalLeads > 0 ? (inProgressCount / totalLeads) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sales Funnel</h2>
          <p className="text-sm text-muted-foreground">Visual pipeline from lead to won deal</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="30d" value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">This year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Deals"
          value={`${totalLeads}`}
          change="In pipeline"
          trend={totalLeads > 0 ? 'up' : 'neutral'}
          icon={List}
        />
        <KpiCard
          title="Conversion Rate"
          value={`${winRate.toFixed(1)}%`}
          change={`${wonCount} won deals`}
          trend={winRate > 0 ? 'up' : 'neutral'}
          icon={TrendingUp}
        />
        <KpiCard
          title="Avg. Deal Value"
          value={formatCurrency(avgDealValue)}
          change="Per deal"
          trend={avgDealValue > 0 ? 'up' : 'neutral'}
          icon={DollarSign}
        />
        <KpiCard
          title="Lost Value"
          value={formatCurrency(lostValue)}
          change={`${lostCount} lost deals`}
          trend={lostValue > 0 ? 'down' : 'neutral'}
          icon={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Funnel Chart</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {totalLeads} total deals
                </Badge>
              </div>
              <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All pipelines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pipelines</SelectItem>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {filteredLeads.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${formatCurrency(value)} (${props.payload.count} leads)`,
                          name,
                        ]}
                      />
                      <Funnel
                        dataKey="value"
                        data={stageData}
                        isAnimationActive
                        width={400}
                      >
                        <LabelList
                          position="right"
                          fill="hsl(var(--foreground))"
                          stroke="none"
                          dataKey="name"
                          style={{ fontSize: 13 }}
                        />
                        <LabelList
                          position="left"
                          fill="hsl(var(--muted-foreground))"
                          stroke="none"
                          dataKey="count"
                          style={{ fontSize: 13 }}
                        />
                        {stageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <PieChart size={48} className="mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No lead data for this period</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage Name</TableHead>
                    <TableHead className="text-right">Deal Volume</TableHead>
                    <TableHead className="text-right">Stage Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stageData.map((stage) => (
                    <TableRow key={stage.name}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: stage.fill }}
                          />
                          <span className="font-medium">{stage.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{stage.count}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatCurrency(stage.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Win/Loss Ratio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Won Deals</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {wonPct.toFixed(1)}% ({wonCount})
                  </span>
                </div>
                <Progress
                  value={wonPct}
                  className="h-2.5 [&>div]:bg-emerald-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    <span>Lost Deals</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {lostPct.toFixed(1)}% ({lostCount})
                  </span>
                </div>
                <Progress
                  value={lostPct}
                  className="h-2.5 [&>div]:bg-red-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span>In Progress</span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {inProgressPct.toFixed(1)}% ({inProgressCount})
                  </span>
                </div>
                <Progress
                  value={inProgressPct}
                  className="h-2.5 [&>div]:bg-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversion Rates</CardTitle>
            </CardHeader>
            <CardContent>
              {conversionRates.length > 0 ? (
                <div className="space-y-3">
                  {conversionRates.map((cr) => (
                    <div key={`${cr.from}-${cr.to}`} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                      <span className="text-muted-foreground">
                        {cr.from} → {cr.to}
                      </span>
                      <span className="font-medium">{cr.rate}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No conversion data</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
