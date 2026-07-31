const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/(dashboard)/payments/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  "import React, { useState, useMemo } from 'react';",
  "import React, { useState, useMemo, useEffect } from 'react';"
);

content = content.replace(
  "} from 'lucide-react';",
  "} from 'lucide-react';\nimport { createPayment, deletePayment, subscribeToPayments } from '@/lib/db/payments/api';\nimport type { NormalizedPayment, PaymentMethod, PaymentStatus } from '@/lib/db/types';\nimport { toast } from 'sonner';"
);

// 2. Types & Initial state
content = content.replace(
  /type PaymentMethod = .*?const initialPayments: Payment\[\] = \[\];/s,
  "const WORKSPACE_ID = 'default';"
);

// 3. Component signature and state
content = content.replace(
  /export default function PaymentsPage\(\) \{.*?status: 'Received'\n  \}\);/s,
  `export default function PaymentsPage() {
  const [payments, setPayments] = useState<NormalizedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'All' | PaymentMethod>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | PaymentStatus>('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToPayments(WORKSPACE_ID, (data) => {
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
    method: 'upi',
    status: 'completed'
  });`
);

// 4. Derived state logic
content = content.replace(
  /\/\/ Derived state.*?return true;\n    \}\);\n  \}, \[payments, search, methodFilter, statusFilter\]\);/s,
  `// Derived state
  const collected = useMemo(() => payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0), [payments]);
  const pendingCollection = useMemo(() => payments.filter(p => p.status === 'pending').reduce((acc, p) => acc + (p.amount || 0), 0), [payments]);
  const pendingCount = useMemo(() => payments.filter(p => p.status === 'pending').length, [payments]);
  const failedCount = useMemo(() => payments.filter(p => p.status === 'failed' || p.status === 'refunded').length, [payments]);
  
  const upiCollected = useMemo(() => payments.filter(p => p.method === 'upi' && p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0), [payments]);
  const neftCollected = useMemo(() => payments.filter(p => p.method === 'bank_transfer' && p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0), [payments]);
  const chequeCollected = useMemo(() => payments.filter(p => p.method === 'cheque' && p.status === 'completed').reduce((acc, p) => acc + (p.amount || 0), 0), [payments]);

  // Max value for progress bars to be relative to collected
  const maxCollected = Math.max(upiCollected, neftCollected, chequeCollected) || 1; 

  const recentActivity = useMemo(() => {
    return payments.slice(0, 4);
  }, [payments]);

  const pendingFollowUps = useMemo(() => {
    return payments.filter(p => p.status === 'failed' || p.status === 'pending');
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (methodFilter !== 'All' && p.method !== methodFilter) return false;
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (search) {
        const query = search.toLowerCase();
        return (p.company_id || '').toLowerCase().includes(query) || 
               (p.invoice_id || '').toLowerCase().includes(query) || 
               (p.payment_id || '').toLowerCase().includes(query);
      }
      return true;
    });
  }, [payments, search, methodFilter, statusFilter]);`
);

// 5. Form submission
content = content.replace(
  /const handleRecordPayment = \(e: React\.FormEvent\) => \{.*?setForm\(\{ client: '', invoiceId: '', amount: '', method: 'UPI', status: 'Received' \}\);\n  \};/s,
  `const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client || !form.invoiceId || !form.amount) return;

    try {
      await createPayment(WORKSPACE_ID, {
        company_id: form.client,
        contact_id: '',
        invoice_id: form.invoiceId,
        quote_id: '',
        deal_id: '',
        amount: parseFloat(form.amount),
        currency: 'INR',
        method: form.method,
        reference: '',
        status: form.status,
        date: new Date().toISOString(),
        notes: ''
      });
      toast.success('Payment recorded');
      setModalOpen(false);
      setForm({ client: '', invoiceId: '', amount: '', method: 'upi', status: 'completed' });
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    setDeleting(paymentId);
    try {
      await deletePayment(WORKSPACE_ID, paymentId);
      toast.success('Payment deleted');
    } catch {
      toast.error('Failed to delete payment');
    } finally {
      setDeleting(null);
    }
  };`
);

// 6. Status and values mapping in the JSX
content = content.replace(/txn\.status === 'Received'/g, "txn.status === 'completed'");
content = content.replace(/txn\.status === 'Failed'/g, "txn.status === 'failed'");
content = content.replace(/txn\.status === 'Pending'/g, "txn.status === 'pending'");

content = content.replace(/txn\.client/g, "txn.company_id");
content = content.replace(/txn\.invoiceId/g, "txn.invoice_id");
content = content.replace(/txn\.id/g, "txn.payment_id");
content = content.replace(/p\.client/g, "p.company_id");

content = content.replace(/txn\.date/g, "new Date(txn.date).toLocaleDateString()");
content = content.replace(/new Date\(new Date\(txn\.date\)\.toLocaleDateString\(\)\)\.toLocaleDateString\(\)/g, "new Date(txn.date).toLocaleDateString()");
content = content.replace(/new Date\(new Date\(txn\.date\)\.toLocaleDateString\(\)\)\.getTime\(\)/g, "new Date(txn.date).getTime()");

content = content.replace(/<option value="UPI">UPI<\/option>/g, '<option value="upi">UPI</option>');
content = content.replace(/<option value="NEFT">NEFT<\/option>/g, '<option value="bank_transfer">NEFT/Bank Transfer</option>');
content = content.replace(/<option value="Cheque">Cheque<\/option>/g, '<option value="cheque">Cheque</option>');
content = content.replace(/<option value="Pending">Pending<\/option>/g, '<option value="pending">Pending</option>');

content = content.replace(/<option value="Received">Received<\/option>/g, '<option value="completed">Completed</option>');
content = content.replace(/<option value="Failed">Failed<\/option>/g, '<option value="failed">Failed</option>');

content = content.replace(
  /<button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-red-600 transition-colors text-left">/g,
  '<button onClick={() => handleDelete(txn.payment_id)} disabled={deleting === txn.payment_id} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-red-600 transition-colors text-left">'
);

content = content.replace(
  /<div className="space-y-8 pb-8">/,
  '<div className="space-y-8 pb-8">\n      {loading && <div className="flex justify-center p-8"><p className="text-muted-foreground">Loading payments...</p></div>}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update complete');
