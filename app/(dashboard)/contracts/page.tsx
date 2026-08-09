'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Download, Eye, Pencil, Trash2, Loader2, FileText, CheckCircle, Clock, AlertTriangle, Briefcase } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getContracts, deleteContract } from '@/lib/firebase/database';
import { useAuth } from '@/lib/firebase/auth-context';
import type { Contract, ContractStatus } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { CONTRACT_TEMPLATES } from '@/components/documents/contract-templates';
import { DataPagination } from '@/components/ui/data-pagination';
import jsPDF from 'jspdf';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  active: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  expiring: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  terminated: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
};

const PAGE_SIZE = 25;

export default function ContractsPage() {
  const router = useRouter();
  const { workspace, user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string }>({ open: false });
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getContracts(workspace?.id);
    setContracts(data);
    setLoading(false);
  }, [workspace?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, templateFilter]);

  const filtered = contracts.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (templateFilter !== 'all' && c.template_type !== templateFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.contract_number.toLowerCase().includes(s) ||
        c.client_name.toLowerCase().includes(s) ||
        (c.client_email || '').toLowerCase().includes(s)
      );
    }
    return true;
  });

  const paginatedData = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleDelete = (c: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmState({ open: true, id: c.id });
  };

  const onDeleteConfirm = async () => {
    if (!confirmState.id) return;
    try {
      await deleteContract(confirmState.id);
      toast.success('Contract deleted');
      if (selectedContract?.id === confirmState.id) {
        setSelectedContract(null);
      }
      load();
      setConfirmState({ open: false });
    } catch {
      toast.error('Failed to delete contract');
      setConfirmState({ open: false });
    }
  };

  const handleDownloadPdf = (c: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const title = CONTRACT_TEMPLATES.find((t) => t.id === c.template_type)?.name || 'Contract';
    
    // Add header
    doc.setFillColor(31, 41, 55);
    doc.rect(0, 0, 210, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(title.toUpperCase(), 15, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`NO: ${c.contract_number}`, 195, 18, { align: 'right' });

    // Render body
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(c.content || '', 180);
    
    let y = 45;
    const pageHeight = 280;

    for (const line of splitText) {
      if (y > pageHeight) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 6.5;
    }

    doc.save(`${title.replace(/\s+/g, '_')}_${c.contract_number}.pdf`);
    toast.success('PDF downloaded successfully');
  };

  // Metrics
  const activeContractsCount = contracts.filter((c) => c.status === 'active').length;
  const expiringContractsCount = contracts.filter((c) => c.status === 'expiring').length;
  const draftContractsCount = contracts.filter((c) => c.status === 'draft').length;
  const totalARR = contracts
    .filter((c) => c.status === 'active' && c.value)
    .reduce((sum, c) => sum + (c.value || 0), 0);

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
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Contracts</h2>
          <p className="text-sm text-muted-foreground">Manage organizational agreements and client contracts</p>
        </div>
        <Button onClick={() => router.push('/contracts/new')} className="w-full sm:w-auto rounded-xl font-bold px-6 shadow-md">
          <Plus size={16} className="mr-2" />
          New Contract
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-wider">Active</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{activeContractsCount}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle size={14} className="sm:hidden" /><CheckCircle size={16} className="hidden sm:block" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-wider">Expiring</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{expiringContractsCount}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><AlertTriangle size={14} className="sm:hidden" /><AlertTriangle size={16} className="hidden sm:block" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-wider">Draft</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{draftContractsCount}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-50 text-gray-600 flex items-center justify-center"><Clock size={14} className="sm:hidden" /><Clock size={16} className="hidden sm:block" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm rounded-xl">
          <CardContent className="p-3 sm:p-5 flex flex-col gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-wider">Active ARR</span>
            <div className="flex items-end justify-between">
              <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">{formatCurrency(totalARR, 'USD')}</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Briefcase size={14} className="sm:hidden" /><Briefcase size={16} className="hidden sm:block" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            className="pl-9 bg-background border-border rounded-xl font-medium focus-visible:ring-ring"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px] bg-background border-border rounded-xl font-medium text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring</SelectItem>
              <SelectItem value="terminated">Terminated</SelectItem>
            </SelectContent>
          </Select>

          <Select value={templateFilter} onValueChange={setTemplateFilter}>
            <SelectTrigger className="w-full sm:w-[180px] bg-background border-border rounded-xl font-medium text-sm">
              <SelectValue placeholder="Contract Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CONTRACT_TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Contracts Table */}
        <div className="flex-1 min-w-0">
          {filtered.length > 0 ? (
            <Card className="border-border shadow-sm rounded-xl overflow-hidden bg-card">
              <CardContent className="p-0">
                <ResponsiveTable
                  data={paginatedData}
                  keyExtractor={(c) => c.id}
                  onRowClick={(c) => setSelectedContract(c)}
                  mobileCardTitle={(c) => c.contract_number}
                  columns={[
                    {
                      key: 'number',
                      header: 'Contract ID',
                      render: (c) => <span className="text-sm font-semibold font-mono text-primary">{c.contract_number}</span>,
                    },
                    {
                      key: 'counterparty',
                      header: 'Counterparty',
                      render: (c) => <span className="text-sm font-medium">{c.client_name}</span>,
                    },
                    {
                      key: 'type',
                      header: 'Type',
                      render: (c) => (
                        <span className="text-sm text-muted-foreground capitalize">
                          {CONTRACT_TEMPLATES.find((t) => t.id === c.template_type)?.name || c.template_type}
                        </span>
                      ),
                    },
                    {
                      key: 'value',
                      header: 'Value',
                      render: (c) => (
                        <span className="text-sm font-bold text-foreground">
                          {c.value ? formatCurrency(c.value, c.currency || 'USD') : '—'}
                        </span>
                      ),
                    },
                    {
                      key: 'dates',
                      header: 'Start / End',
                      render: (c) => (
                        <span className="text-xs text-muted-foreground font-mono">
                          {c.start_date || '—'} / {c.end_date || '—'}
                        </span>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (c) => (
                        <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${statusStyles[c.status] || ''}`}>
                          {c.status}
                        </Badge>
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      render: (c) => (
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={(e) => handleDownloadPdf(c, e)}
                          >
                            <Download size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                            onClick={() => router.push(`/contracts/${c.id}`)}
                          >
                            <Pencil size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleDelete(c, e)}
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border shadow-sm rounded-xl bg-card p-12 text-center">
              <FileText size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-bold">No contracts found</h3>
              <p className="text-sm text-muted-foreground mt-1">Create a new contract or adjust your filters.</p>
            </Card>
          )}
        </div>

        {/* Live Detail Preview Side-pane */}
        {selectedContract && (
          <div className="w-full lg:w-[450px] shrink-0 border border-border bg-card rounded-xl shadow-lg p-6 space-y-6 flex flex-col justify-between">
            <div className="flex justify-between items-start border-b border-border pb-4">
              <div>
                <h3 className="text-md font-bold tracking-tight">Contract Preview</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedContract.contract_number}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContract(null)} className="rounded-lg text-muted-foreground">
                ✕ Close
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[500px] border border-dashed border-border rounded-lg bg-background p-6 font-serif text-[9px] leading-relaxed text-foreground select-none relative whitespace-pre-wrap">
              <div className="border-b border-border pb-3 mb-4 flex justify-between items-start font-sans">
                <div>
                  <h4 className="text-[10px] font-black tracking-wider text-primary">TAGVERSE</h4>
                  <p className="text-[7px] text-muted-foreground">brand under Blackbridge Collective</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] text-muted-foreground font-mono">NO: {selectedContract.contract_number}</p>
                  <p className="text-[7px] font-bold mt-0.5">{selectedContract.start_date}</p>
                </div>
              </div>
              <div>{selectedContract.content}</div>
            </div>

            <div className="flex gap-2 w-full pt-4 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={(e) => handleDownloadPdf(selectedContract, e)}>
                <Download size={14} className="mr-1.5" /> Download PDF
              </Button>
              <Button size="sm" className="flex-1 rounded-xl" onClick={() => router.push(`/contracts/${selectedContract.id}`)}>
                <Pencil size={14} className="mr-1.5" /> Edit Contract
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete Contract"
        description="Are you sure you want to permanently delete this contract? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        onCancel={() => setConfirmState({ open: false })}
      />

      {filtered.length > PAGE_SIZE && (
        <DataPagination
          page={page}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
