'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { getEnquiriesPaginated, updateEnquiry } from '@/lib/firebase/database';
import type { EnquiriesPageResult } from '@/lib/firebase/database';
import type { Enquiry } from '@/lib/db/types';
import { useAuth } from '@/lib/firebase/auth-context';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'converted', label: 'Converted' },
] as const;

const statusBadgeClass: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  read: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  replied: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function EnquiriesPage() {
  const { workspace, user } = useAuth();
  const [result, setResult] = useState<EnquiriesPageResult>({
    data: [],
    total: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('all');
  const [viewingEnquiry, setViewingEnquiry] = useState<Enquiry | null>(null);

  const load = useCallback(async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    try {
      const data = await getEnquiriesPaginated(workspace?.id, page, PAGE_SIZE, {
        status: statusTab,
        search,
      });
      setResult(data);
    } catch (err: any) {
      toast.error('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, page, statusTab, search]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusTab, search]);

  async function handleMarkRead(enquiry: Enquiry) {
    if (enquiry.status !== 'new') return;
    await updateEnquiry(enquiry.id, { status: 'read' });
    load();
  }

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(p, result.totalPages || 1)));
  }

  const pageNumbers = useMemo(() => {
    const { totalPages, page: current } = result;
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [result]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading enquiries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          title="Total Enquiries"
          value={result.total.toString()}
          change="All time"
          trend="neutral"
          icon={MessageSquare}
          description="Website submissions"
        />
        <KpiCard
          title="Current Page"
          value={`${result.page} / ${result.totalPages || 1}`}
          change={`${PAGE_SIZE} per page`}
          trend="neutral"
          icon={ChevronRight}
          description={`Showing ${result.data.length} of ${result.total}`}
        />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Enquiries</h2>
          <p className="text-sm text-muted-foreground">Manage website enquiry submissions</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-3 sm:space-y-4">
        <Tabs value={statusTab} onValueChange={setStatusTab}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <TabsList className="w-full sm:w-auto overflow-x-auto">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="relative flex-1 sm:flex-none sm:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, email, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </Tabs>
      </div>

      {/* Table */}
      {result.data.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={result.data}
              keyExtractor={(enq) => enq.id}
              mobileCardTitle={(enq) => enq.name}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (enq) => (
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {enq.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{enq.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 truncate">
                            <Mail size={10} /> {enq.email}
                          </span>
                          {enq.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={10} /> {enq.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'subject',
                  header: 'Subject',
                  hideOnMobile: true,
                  render: (enq) => (
                    <span className="text-sm truncate max-w-[200px] block">{enq.subject}</span>
                  ),
                },
                {
                  key: 'message',
                  header: 'Message',
                  hideOnMobile: true,
                  render: (enq) => (
                    <span className="text-sm text-muted-foreground truncate max-w-[250px] block">
                      {enq.message}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (enq) => (
                    <Badge
                      variant="secondary"
                      className={cn('text-xs font-medium', statusBadgeClass[enq.status] || '')}
                    >
                      {enq.status}
                    </Badge>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  hideOnMobile: true,
                  render: (enq) => (
                    <span className="text-sm text-muted-foreground">
                      {new Date(enq.created_at).toLocaleDateString()}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-10',
                  render: (enq) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => {
                        setViewingEnquiry(enq);
                        handleMarkRead(enq);
                      }}
                      aria-label="View enquiry"
                    >
                      <Eye size={14} />
                    </Button>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search || statusTab !== 'all' ? 'No enquiries match your filters' : 'No enquiries yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {(result.page - 1) * PAGE_SIZE + 1}–{Math.min(result.page * PAGE_SIZE, result.total)} of {result.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={result.page <= 1}
              onClick={() => goToPage(1)}
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={result.page <= 1}
              onClick={() => goToPage(result.page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">...</span>
              ) : (
                <Button
                  key={p}
                  variant={p === result.page ? 'default' : 'outline'}
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => goToPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={result.page >= result.totalPages}
              onClick={() => goToPage(result.page + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              disabled={result.page >= result.totalPages}
              onClick={() => goToPage(result.totalPages)}
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingEnquiry} onOpenChange={(open) => { if (!open) setViewingEnquiry(null); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{viewingEnquiry?.name}</DialogTitle>
            <DialogDescription>Enquiry details</DialogDescription>
          </DialogHeader>
          {viewingEnquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Email</p>
                  <p className="text-sm flex items-center gap-1 mt-0.5">
                    <Mail size={12} className="shrink-0" /> {viewingEnquiry.email}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Phone</p>
                  <p className="text-sm flex items-center gap-1 mt-0.5">
                    {viewingEnquiry.phone ? <><Phone size={12} className="shrink-0" /> {viewingEnquiry.phone}</> : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Subject</p>
                  <p className="text-sm mt-0.5">{viewingEnquiry.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <Badge variant="secondary" className={cn('mt-0.5 text-xs font-medium', statusBadgeClass[viewingEnquiry.status] || '')}>
                    {viewingEnquiry.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Date</p>
                  <p className="text-sm mt-0.5">{new Date(viewingEnquiry.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Message</p>
                <p className="text-sm mt-1 text-muted-foreground whitespace-pre-wrap">{viewingEnquiry.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
