'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  TrendingUp,
  FileText,
  CheckCircle,
  FolderPlus,
  CheckSquare,
  DollarSign,
  LogIn,
  Pencil,
  Trash2,
  ThumbsUp,
  FileSignature,
  Megaphone,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { getActivityLogs } from '@/lib/firebase/database';
import type { ActivityLog, ActivityAction } from '@/lib/db/types';
import { toast } from 'sonner';

const actionIcons: Record<string, React.ReactNode> = {
  lead_created: <UserPlus size={16} />,
  lead_updated: <Pencil size={16} />,
  lead_deleted: <Trash2 size={16} />,
  deal_stage_changed: <TrendingUp size={16} />,
  invoice_created: <FileText size={16} />,
  invoice_paid: <CheckCircle size={16} />,
  quote_created: <FileText size={16} />,
  quote_accepted: <ThumbsUp size={16} />,
  project_created: <FolderPlus size={16} />,
  project_updated: <Pencil size={16} />,
  task_created: <CheckSquare size={16} />,
  task_completed: <CheckCircle size={16} />,
  contract_signed: <FileSignature size={16} />,
  campaign_created: <Megaphone size={16} />,
  payment_received: <DollarSign size={16} />,
  user_login: <LogIn size={16} />,
  user_created: <UserPlus size={16} />,
};

const actionColors: Record<string, string> = {
  lead_created: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
  lead_updated: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
  lead_deleted: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950',
  deal_stage_changed: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950',
  invoice_created: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950',
  invoice_paid: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
  quote_created: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950',
  quote_accepted: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
  project_created: 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-950',
  project_updated: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
  task_created: 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950',
  task_completed: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950',
  contract_signed: 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950',
  campaign_created: 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950',
  payment_received: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
  user_login: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950',
  user_created: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
};

const entityTypes = [
  { value: 'all', label: 'All Activity' },
  { value: 'lead', label: 'Leads' },
  { value: 'deal', label: 'Deals' },
  { value: 'invoice', label: 'Invoices' },
  { value: 'quote', label: 'Quotes' },
  { value: 'project', label: 'Projects' },
  { value: 'task', label: 'Tasks' },
  { value: 'contract', label: 'Contracts' },
  { value: 'campaign', label: 'Campaigns' },
  { value: 'payment', label: 'Payments' },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await getActivityLogs(100);
      setLogs(data);
    } catch {
      toast.error('Failed to load activity');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = entityFilter === 'all'
    ? logs
    : logs.filter((l) => l.entity_type === entityFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Activity Feed</h2>
          <p className="text-sm text-muted-foreground">Real-time log of all system activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              {entityTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No activity yet</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y max-h-[70vh] overflow-y-auto">
              {filtered.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${actionColors[log.action] || 'bg-muted text-muted-foreground'}`}>
                    {actionIcons[log.action] || <Activity size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.user_name}</span>
                      <span className="text-xs text-muted-foreground">{log.description}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{timeAgo(log.created_at)}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">{log.entity_type}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
