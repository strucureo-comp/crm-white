'use client';

import React, { useState, useMemo } from 'react';
import { 
  CreditCard, Plus, Search, 
  Wallet, Receipt, TrendingUp, AlertCircle, CheckCircle2,
  Clock, X, ArrowUpRight, Banknote, Smartphone
} from 'lucide-react';

type PaymentMethod = 'UPI' | 'NEFT' | 'Cheque' | 'Pending';
type PaymentStatus = 'Received' | 'Pending' | 'Failed';

type Payment = {
  id: string;
  client: string;
  invoiceId: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  status: PaymentStatus;
};

const initialPayments: Payment[] = [];

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState<{
    client: string;
    invoiceId: string;
    amount: string;
    method: PaymentMethod;
    status: PaymentStatus;
  }>({
    client: '',
    invoiceId: '',
    amount: '',
    method: 'UPI',
    status: 'Received'
  });

  // Derived state
  const collected = useMemo(() => payments.filter(p => p.status === 'Received').reduce((acc, p) => acc + p.amount, 0), [payments]);
  const pendingCollection = useMemo(() => payments.filter(p => p.status === 'Pending').reduce((acc, p) => acc + p.amount, 0), [payments]);
  const pendingCount = useMemo(() => payments.filter(p => p.status === 'Pending').length, [payments]);
  const failedCount = useMemo(() => payments.filter(p => p.status === 'Failed').length, [payments]);
  
  const upiCollected = useMemo(() => payments.filter(p => p.method === 'UPI' && p.status === 'Received').reduce((acc, p) => acc + p.amount, 0), [payments]);
  const neftCollected = useMemo(() => payments.filter(p => p.method === 'NEFT' && p.status === 'Received').reduce((acc, p) => acc + p.amount, 0), [payments]);
  const chequeCollected = useMemo(() => payments.filter(p => p.method === 'Cheque' && p.status === 'Received').reduce((acc, p) => acc + p.amount, 0), [payments]);

  // Max value for progress bars to be relative to collected
  const maxCollected = Math.max(upiCollected, neftCollected, chequeCollected) || 1; 

  const recentActivity = useMemo(() => {
    return [...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  }, [payments]);

  const pendingFollowUps = useMemo(() => {
    return payments.filter(p => p.status === 'Failed' || p.status === 'Pending');
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (methodFilter !== 'All' && p.method !== methodFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return p.client.toLowerCase().includes(query) || p.invoiceId.toLowerCase().includes(query) || p.id.toLowerCase().includes(query);
      }
      return true;
    });
  }, [payments, search, methodFilter, statusFilter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client || !form.invoiceId || !form.amount) return;

    const newPayment: Payment = {
      id: `txn-${Math.floor(Math.random() * 10000)}`,
      client: form.client,
      invoiceId: form.invoiceId,
      amount: parseFloat(form.amount),
      date: new Date().toISOString().split('T')[0],
      method: form.method,
      status: form.status,
    };

    setPayments([newPayment, ...payments]);
    setModalOpen(false);
    setForm({ client: '', invoiceId: '', amount: '', method: 'UPI', status: 'Received' });
  };

  return (
    <div className="space-y-8 pb-8">
      {/* A. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="text-amber-500 w-6 h-6" />
            Payments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Collections, transaction history, and pending follow-ups.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {/* B. KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Collected</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">{formatCurrency(collected)}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>
        
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-amber-700 dark:text-amber-400">Pending Collection</h3>
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">{formatCurrency(pendingCollection)}</p>
          <p className="text-xs text-muted-foreground mt-1">Across {pendingCount} transactions</p>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Transactions</h3>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">{payments.length}</p>
          <p className="text-xs text-muted-foreground mt-1">All time</p>
        </div>

        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-rose-700 dark:text-rose-400">Failed / Returned</h3>
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">{failedCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Needs follow-up</p>
        </div>
      </div>

      {/* C. Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Recent Activity */}
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentActivity.map(txn => (
              <div key={txn.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  txn.status === 'Received' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400' :
                  txn.status === 'Failed' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-400' :
                  'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
                }`}>
                  {txn.status === 'Received' ? <CheckCircle2 className="w-5 h-5" /> :
                   txn.status === 'Failed' ? <AlertCircle className="w-5 h-5" /> :
                   <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-foreground truncate">{txn.client}</p>
                    <span className={`text-sm font-bold ${
                      txn.status === 'Received' ? 'text-emerald-600 dark:text-emerald-400' :
                      txn.status === 'Failed' ? 'text-rose-600 dark:text-rose-400' :
                      'text-amber-600 dark:text-amber-400'
                    }`}>
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-xs text-muted-foreground">
                    <span className="truncate">{txn.invoiceId} &bull; {txn.method}</span>
                    <span>{txn.date}</span>
                  </div>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity.</p>
            )}
          </div>
        </div>

        {/* Right Column: Collection by Method & Pending Follow-ups */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Collection by Method</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> UPI</span>
                  <span className="font-medium">{formatCurrency(upiCollected)}</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${(upiCollected / maxCollected) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5" /> NEFT</span>
                  <span className="font-medium">{formatCurrency(neftCollected)}</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${(neftCollected / maxCollected) * 100}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Cheque</span>
                  <span className="font-medium">{formatCurrency(chequeCollected)}</span>
                </div>
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${(chequeCollected / maxCollected) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border p-0 shadow-sm overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-sm">Pending Follow-ups</h3>
            </div>
            <div className="overflow-auto flex-1 max-h-48">
              <table className="w-full text-sm text-left">
                <tbody>
                  {pendingFollowUps.map((p, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="p-3 py-2 font-medium">{p.client}</td>
                      <td className="p-3 py-2 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          p.status === 'Failed' 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400' 
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pendingFollowUps.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-muted-foreground text-sm">No pending follow-ups.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* D. Filters Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search transactions..." 
            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as any)}
        >
          <option value="All">All Methods</option>
          <option value="UPI">UPI</option>
          <option value="NEFT">NEFT</option>
          <option value="Cheque">Cheque</option>
          <option value="Pending">Pending</option>
        </select>
        <select 
          className="border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="All">All Statuses</option>
          <option value="Received">Received</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>

      {/* E. Transactions Table */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b">
              <tr>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Txn ID</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Client</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Invoice</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Amount</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Method</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayments.map(txn => (
                <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{txn.id}</td>
                  <td className="px-4 py-3 font-medium">{txn.client}</td>
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{txn.invoiceId}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(txn.amount)}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{txn.date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border">
                      {txn.method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      txn.status === 'Received' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' :
                      txn.status === 'Failed' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800' :
                      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No transactions match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* F. Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
          <div className="bg-background rounded-xl border shadow-lg w-full max-w-md relative z-10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-semibold">Record Payment</h3>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:bg-muted p-1 rounded-md transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Client</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Arka Systems" 
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  value={form.client}
                  onChange={(e) => setForm({...form, client: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Invoice ID</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. INV-2091" 
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  value={form.invoiceId}
                  onChange={(e) => setForm({...form, invoiceId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Amount (₹)</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  step="0.01"
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                  value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Method</label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    value={form.method}
                    onChange={(e) => setForm({...form, method: e.target.value as any})}
                  >
                    <option value="UPI">UPI</option>
                    <option value="NEFT">NEFT</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status</label>
                  <select 
                    className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                    value={form.status}
                    onChange={(e) => setForm({...form, status: e.target.value as any})}
                  >
                    <option value="Received">Received</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 text-sm font-medium rounded-md transition-colors shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
