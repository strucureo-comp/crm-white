'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Loader2, Wallet, ArrowUpRight, CalendarDays, TrendingUp, Banknote, CreditCard, Smartphone, Receipt, X, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { getPayments, updatePayment, createPayment, deletePayment, getInvoices } from '@/lib/firebase/database';
import type { Payment, Invoice } from '@/lib/db/types';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';

const methodStyles: Record<string, string> = {
  UPI: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
  NEFT: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
  Cheque: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
  Cash: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  Card: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const methodIcons: Record<string, typeof Smartphone> = {
  UPI: Smartphone,
  NEFT: ArrowUpRight,
  Cheque: Banknote,
  Cash: Wallet,
  Card: CreditCard,
  Other: Receipt,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const defaultPaymentForm = {
  invoice_id: '',
  amount: 0,
  payment_method: 'UPI',
  transaction_id: '',
  payment_date: new Date().toISOString().split('T')[0],
  notes: '',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [form, setForm] = useState({ ...defaultPaymentForm });
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; id?: string; loading?: boolean }>({ open: false });
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsData, invoicesData] = await Promise.all([getPayments(), getInvoices()]);
      setPayments(paymentsData);
      setInvoices(invoicesData);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = payments.filter((p) => {
    if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const inv = invoices.find((i) => i.id === p.invoice_id);
      return (
        (p.transaction_id || '').toLowerCase().includes(s) ||
        (inv?.invoice_number || '').toLowerCase().includes(s) ||
        (p.notes || '').toLowerCase().includes(s)
      );
    }
    if (dateRange.from && p.payment_date < dateRange.from) return false;
    if (dateRange.to && p.payment_date > dateRange.to) return false;
    return true;
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = invoices
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0);
  const thisMonth = payments
    .filter((p) => p.payment_date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((sum, p) => sum + p.amount, 0);
  const avgPayment = payments.length > 0 ? totalCollected / payments.length : 0;

  function getInvoiceRef(invoiceId: string) {
    return invoices.find((i) => i.id === invoiceId);
  }

  function openDetail(payment: Payment) {
    setSelectedPayment(payment);
    setDetailOpen(true);
  }

  function openDialog(payment?: Payment) {
    if (payment) {
      setEditingPayment(payment);
      setForm({
        invoice_id: payment.invoice_id,
        amount: payment.amount,
        payment_method: payment.payment_method,
        transaction_id: payment.transaction_id || '',
        payment_date: payment.payment_date.split('T')[0],
        notes: payment.notes || '',
      });
    } else {
      setEditingPayment(null);
      setForm({ ...defaultPaymentForm });
    }
    setDialogOpen(true);
  }

  function setFormField<K extends keyof typeof defaultPaymentForm>(key: K, value: (typeof defaultPaymentForm)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.invoice_id || form.amount <= 0 || !form.payment_date) {
      toast.error('Invoice, amount, and payment date are required');
      return;
    }
    setSaving(true);
    try {
      if (editingPayment) {
        await updatePayment(editingPayment.id, form);
        toast.success('Payment updated');
      } else {
        await createPayment(form);
        toast.success('Payment recorded');
      }
      load();
      setDialogOpen(false);
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(payment: Payment) {
    setConfirmState({ open: true, id: payment.id });
  }

  async function onDeleteConfirm() {
    if (!confirmState.id) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));
    try {
      await deletePayment(confirmState.id);
      toast.success('Payment deleted');
      load();
    } catch {
      toast.error('Failed to delete payment');
    } finally {
      setConfirmState({ open: false });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const MethodIcon = ({ method }: { method: string }) => {
    const Icon = methodIcons[method] || Receipt;
    return <Icon size={14} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Payments</h2>
          <p className="text-sm text-muted-foreground">Track and manage all incoming payments</p>
        </div>
        <Button onClick={() => openDialog()} className="w-full sm:w-auto">
          <Plus size={16} className="mr-2" />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <Wallet size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCollected)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Receipt size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">from unpaid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarDays size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(thisMonth)}</div>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString('default', { month: 'long' })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
            <TrendingUp size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgPayment)}</div>
            <p className="text-xs text-muted-foreground">per transaction</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by invoice, transaction ID..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="UPI">UPI</SelectItem>
            <SelectItem value="NEFT">NEFT</SelectItem>
            <SelectItem value="Cheque">Cheque</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Card">Card</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 items-center">
          <Input type="date" className="w-[140px]" value={dateRange.from} onChange={(e) => setDateRange((prev) => ({ ...prev, from: e.target.value }))} placeholder="From" />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="date" className="w-[140px]" value={dateRange.to} onChange={(e) => setDateRange((prev) => ({ ...prev, to: e.target.value }))} placeholder="To" />
          {(dateRange.from || dateRange.to) && (
            <Button variant="ghost" size="icon" onClick={() => setDateRange({ from: '', to: '' })}>
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {filtered.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={filtered}
              keyExtractor={(p) => p.id}
              mobileCardTitle={(p) => {
                const inv = getInvoiceRef(p.invoice_id);
                return inv?.invoice_number || `Payment #${p.id.slice(-6)}`;
              }}
              columns={[
                {
                  key: 'invoice',
                  header: 'Invoice',
                  render: (p) => {
                    const inv = getInvoiceRef(p.invoice_id);
                    return <span className="text-sm font-medium">{inv?.invoice_number || '—'}</span>;
                  },
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: (p) => <span className="text-sm font-medium">{formatCurrency(p.amount)}</span>,
                },
                {
                  key: 'method',
                  header: 'Method',
                  render: (p) => (
                    <Badge variant="secondary" className={methodStyles[p.payment_method] || ''}>
                      <span className="flex items-center gap-1">
                        <MethodIcon method={p.payment_method} />
                        {p.payment_method}
                      </span>
                    </Badge>
                  ),
                },
                {
                  key: 'transaction',
                  header: 'Transaction ID',
                  render: (p) => <span className="text-sm text-muted-foreground font-mono">{p.transaction_id || '—'}</span>,
                },
                {
                  key: 'date',
                  header: 'Payment Date',
                  render: (p) => <span className="text-sm text-muted-foreground">{new Date(p.payment_date).toLocaleDateString()}</span>,
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-24',
                  render: (p) => (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Payment actions">
                          <MoreHorizontal size={14} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => openDetail(p)}>
                          <Eye size={14} className="mr-2" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDialog(p)}>
                          <Pencil size={14} className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p)}>
                          <Trash2 size={14} className="mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet size={48} className="mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            <Button variant="outline" className="mt-4" onClick={() => openDialog()}>
              <Plus size={14} className="mr-2" />
              Record Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog (Create/Edit) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment' : 'Record Payment'}</DialogTitle>
            <DialogDescription>
              {editingPayment ? 'Update the payment details below.' : 'Enter the payment details below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="invoice">Invoice *</Label>
                <Select value={form.invoice_id} onValueChange={(v) => setFormField('invoice_id', v)}>
                  <SelectTrigger id="invoice"><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} – {formatCurrency(inv.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount *</Label>
                <Input id="amount" type="number" min={0} step={0.01} value={form.amount} onChange={(e) => setFormField('amount', parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <Label htmlFor="payment_method">Payment Method *</Label>
                <Select value={form.payment_method} onValueChange={(v) => setFormField('payment_method', v)}>
                  <SelectTrigger id="payment_method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="transaction_id">Transaction ID</Label>
                <Input id="transaction_id" value={form.transaction_id} onChange={(e) => setFormField('transaction_id', e.target.value)} placeholder="TXN123456" />
              </div>
              <div>
                <Label htmlFor="payment_date">Payment Date *</Label>
                <Input id="payment_date" type="date" value={form.payment_date} onChange={(e) => setFormField('payment_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setFormField('notes', e.target.value)} placeholder="Optional notes..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingPayment ? 'Update' : 'Record'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Detail Dialog (Read-Only) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Transaction information</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(selectedPayment.amount)}</p>
                </div>
                <Badge variant="secondary" className={methodStyles[selectedPayment.payment_method] || ''}>
                  <span className="flex items-center gap-1">
                    <MethodIcon method={selectedPayment.payment_method} />
                    {selectedPayment.payment_method}
                  </span>
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-medium">{getInvoiceRef(selectedPayment.invoice_id)?.invoice_number || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Transaction ID</p>
                  <p className="font-medium font-mono">{selectedPayment.transaction_id || '—'}</p>
                </div>
                {selectedPayment.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedPayment.notes}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-muted-foreground">Recorded At</p>
                  <p className="font-medium">{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmState.open}
        onOpenChange={(open) => setConfirmState((prev) => ({ ...prev, open }))}
        title="Delete Payment"
        description="Are you sure you want to delete this payment? This action cannot be undone."
        onConfirm={onDeleteConfirm}
        loading={confirmState.loading}
      />
    </div>
  );
}
