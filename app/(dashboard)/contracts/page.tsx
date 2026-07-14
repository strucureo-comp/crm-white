'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileSignature, MoreHorizontal, Eye, Loader2, Pencil, Trash2, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ContractDialog } from '@/components/dialogs/contract-dialog';
import { getContracts, deleteContract } from '@/lib/firebase/database';
import type { Contract } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { generateContractPdf, downloadPdf, openPdfPreview } from '@/lib/pdf-engine/generator';

export default function ContractsPage() {
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Contract | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getContracts();
    setContracts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setConfirmState({ open: true, id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    try {
      await deleteContract(confirmState.id);
      toast.success('Contract deleted');
      load();
      setConfirmState({ open: false });
    } catch {
      toast.error('Failed to delete contract');
      setConfirmState({ open: false });
    }
  }

  function handleEdit(c: Contract) {
    setEditing(c);
    setMenuOpen(null);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  const filtered = contracts.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.parties.toLowerCase().includes(search.toLowerCase())
  );

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
          <p className="text-sm text-muted-foreground">Manage contracts, NDAs, and agreements</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => { setEditing(null); setDialogOpen(true); toast.message('Create a new NDA contract template'); }}>
            <FileSignature size={14} className="mr-1.5" />NDA
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm" onClick={() => { setEditing(null); setDialogOpen(true); toast.message('Create a new service agreement template'); }}>
            <FileSignature size={14} className="mr-1.5" />Service
          </Button>
          <Button onClick={handleNew} size="sm" className="text-xs sm:text-sm">
            <Plus size={14} className="mr-1.5" />
            New
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search contracts..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <FileSignature size={48} className="mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No contracts yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((contract) => (
            <Card key={contract.id} className="hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileSignature size={20} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{contract.title}</p>
                      <p className="text-xs text-muted-foreground">{contract.parties}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={
                    contract.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' :
                    contract.status === 'Draft' ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' :
                    contract.status === 'Under Review' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400' :
                    'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                  }>{contract.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">{contract.type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Expiry</p>
                    <p className="font-medium">{contract.expiry || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <div className="flex items-center gap-2">
                      <Progress value={contract.progress} className="h-1.5 flex-1" />
                      <span className="text-xs font-medium">{contract.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t relative">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleEdit(contract)}><Eye size={14} className="mr-1" />View</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto" aria-label="Contract actions" onClick={() => setMenuOpen(menuOpen === contract.id ? null : contract.id)}>
                    <MoreHorizontal size={14} />
                  </Button>
                  {menuOpen === contract.id && (
                    <div className="absolute right-0 top-10 z-10 w-36 rounded-md border bg-background shadow-lg">
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={() => handleEdit(contract)}>
                        <Pencil size={14} /> Edit
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={async () => {
                        try {
                          const pdf = await generateContractPdf(contract);
                          await downloadPdf(pdf, `Contract-${contract.title.replace(/\s+/g, '_')}.pdf`);
                          toast.success('Contract downloaded');
                          setMenuOpen(null);
                        } catch { toast.error('Failed to generate PDF'); }
                      }}>
                        <Download size={14} /> Download
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted" onClick={async () => {
                        try {
                          const pdf = await generateContractPdf(contract);
                          const url = await openPdfPreview(pdf);
                          window.open(url, '_blank');
                          setMenuOpen(null);
                        } catch { toast.error('Failed to generate preview'); }
                      }}>
                        <Eye size={14} /> Preview
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-red-600" onClick={() => { handleDelete(contract.id); setMenuOpen(null); }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ContractDialog open={dialogOpen} onOpenChange={setDialogOpen} onSaved={load} contract={editing} />
      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState({ open })}
        title="Delete Contract"
        description="Are you sure you want to delete this contract? This action cannot be undone."
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
