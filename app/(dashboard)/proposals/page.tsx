'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileSpreadsheet, MoreHorizontal, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getQuotations, deleteQuotation, updateQuotation, createQuotation } from '@/lib/firebase/database';
import type { Quotation } from '@/lib/db/types';
import { QuoteDialog } from '@/components/dialogs/quote-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { generateQuotationPdf, downloadPdf, openPdfPreview } from '@/lib/pdf-engine/generator';

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  sent: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  accepted: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  rejected: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
  expired: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

export default function ProposalsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quotation | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  async function load() {
    setLoading(true);
    const data = await getQuotations();
    setQuotations(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = quotations.filter((q) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      q.quotation_number.toLowerCase().includes(s) ||
      (q.client_name || '').toLowerCase().includes(s) ||
      (q.client_company || '').toLowerCase().includes(s)
    );
  });

  async function handleDelete(q: Quotation) {
    setConfirmState({ open: true, id: q.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    try {
      await deleteQuotation(confirmState.id);
      toast.success('Proposal deleted');
      load();
      setConfirmState({ open: false });
    } catch {
      toast.error('Failed to delete proposal');
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading proposals...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Proposals</h2>
          <p className="text-sm text-muted-foreground">Build and send professional proposals</p>
        </div>
        <Button onClick={() => { setEditingQuote(null); setDialogOpen(true); }} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          New Proposal
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search proposals..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((q) => (
            <Card key={q.id} className="hover:shadow-sm transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileSpreadsheet size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{q.description || q.quotation_number}</p>
                      <p className="text-xs text-muted-foreground">{q.client_name || q.client_company || '—'}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={statusStyles[q.status] || ''}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-muted">
                        {(q.client_name || q.client_company || '?')[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">{q.items?.length || 0} items</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{q.quotation_number}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(q.amount)}</span>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" aria-label="Proposal actions">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={async () => {
                        try {
                          await updateQuotation(q.id, { status: 'sent' });
                          toast.success(`Proposal ${q.quotation_number} sent`);
                          load();
                        } catch {
                          toast.error('Failed to send proposal');
                        }
                      }}>
                        <FileSpreadsheet size={14} className="mr-2" /> Send
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        try {
                          const pdf = await generateQuotationPdf(q, null);
                          const url = await openPdfPreview(pdf);
                          window.open(url, '_blank');
                        } catch { toast.error('Failed to generate preview'); }
                      }}>
                        <Eye size={14} className="mr-2" /> Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        try {
                          const pdf = await generateQuotationPdf(q, null);
                          await downloadPdf(pdf, `${q.quotation_number}.pdf`);
                          toast.success('Proposal downloaded');
                        } catch { toast.error('Failed to generate PDF'); }
                      }}>
                        <Download size={14} className="mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        try {
                          const { id, ...rest } = q;
                          await createQuotation({
                            ...rest,
                            quotation_number: `Q-${Date.now().toString().slice(-6)}`,
                            status: 'draft',
                          });
                          toast.success('Proposal duplicated');
                          load();
                        } catch {
                          toast.error('Failed to duplicate proposal');
                        }
                      }}>
                        <FileSpreadsheet size={14} className="mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { setEditingQuote(q); setDialogOpen(true); }}>
                        <Pencil size={14} className="mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(q)}>
                        <Trash2 size={14} className="mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-12 text-center"><p className="text-muted-foreground">No proposals yet</p></CardContent></Card>
      )}

      <QuoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={load}
        quote={editingQuote}
      />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Proposal"
        description="Are you sure you want to delete this proposal? This action cannot be undone."
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
