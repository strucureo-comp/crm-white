'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { DocumentHeader } from './document-header';
import { ClientSection } from './client-section';
import { ItemsTable } from './items-table';
import { PricingSummary } from './pricing-summary';
import { PaymentSection } from './payment-section';
import { NotesSection } from './notes-section';
import { LivePreview } from './live-preview';
import { DocumentLayout } from './document-layout';
import { useWorkspace } from '@/lib/settings/workspace-context';
import { createInvoice, updateInvoice } from '@/lib/firebase/database';
import type { Invoice, InvoiceStatus } from '@/lib/db/types';
import type {
  DocumentTemplate,
  DocumentMeta,
  DocumentClient,
  DocumentItem,
  DocumentPricing,
  DocumentPayment,
  DocumentNotes,
} from './types';
import { createEmptyItem, calculatePricing } from './types';

interface InvoiceFormProps {
  existingInvoice?: Invoice | null;
}

export function InvoiceForm({ existingInvoice }: InvoiceFormProps) {
  const router = useRouter();
  const { settings } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [template, setTemplate] = useState<DocumentTemplate>(
    (settings.branding.template_style as DocumentTemplate) || 'modern'
  );
  const [meta, setMeta] = useState<DocumentMeta>({
    document_number: existingInvoice?.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
    status: existingInvoice?.status || 'draft',
    issue_date: existingInvoice?.created_at
      ? new Date(existingInvoice.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    due_date: existingInvoice?.due_date || '',
    currency: settings.general.default_currency || 'INR',
  });

  const [client, setClient] = useState<DocumentClient>({
    company: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    gstin: '',
  });

  const [items, setItems] = useState<DocumentItem[]>(() => {
    if (existingInvoice?.amount) {
      return [
        {
          id: crypto.randomUUID(),
          name: existingInvoice.description || 'Service',
          description: '',
          quantity: 1,
          unit: 'flat',
          unit_price: existingInvoice.amount,
          total: existingInvoice.amount,
        },
      ];
    }
    return [createEmptyItem()];
  });

  const [discountPercent, setDiscountPercent] = useState(0);

  const [payment, setPayment] = useState<DocumentPayment>({
    payment_terms: 'net_30',
    payment_method: 'bank_transfer',
    amount_paid: existingInvoice?.paid_at ? existingInvoice.amount : 0,
    balance_due: 0,
    payment_date: existingInvoice?.paid_at
      ? new Date(existingInvoice.paid_at).toISOString().split('T')[0]
      : '',
    transaction_id: '',
  });

  const [notes, setNotes] = useState<DocumentNotes>({
    notes: existingInvoice?.notes || '',
    terms: settings.branding.default_terms || '',
    internal_notes: '',
  });

  // Calculate pricing
  const pricing = calculatePricing(
    items,
    discountPercent,
    settings.branding.tax_cgst || 0,
    settings.branding.tax_sgst || 0,
    settings.branding.tax_igst || 0
  );

  // Update payment balance
  useEffect(() => {
    setPayment((prev) => ({
      ...prev,
      balance_due: pricing.grand_total - prev.amount_paid,
    }));
  }, [pricing.grand_total]);

  const handleSave = useCallback(
    async (status: InvoiceStatus = 'pending') => {
      if (!client.company && !client.contact_person) {
        toast.error('Client name or company is required');
        return;
      }

      if (status === 'pending') {
        setSaving(true);
      } else {
        setSending(true);
      }

      try {
        const invoiceData = {
          invoice_number: meta.document_number,
          project_id: '',
          client_id: '',
          amount: pricing.grand_total,
          due_date: meta.due_date || '',
          status: status,
          description: items[0]?.name || '',
          notes: notes.notes,
        };

        if (existingInvoice) {
          await updateInvoice(existingInvoice.id, invoiceData);
          toast.success(status === 'pending' ? 'Invoice updated' : 'Invoice sent');
        } else {
          await createInvoice(invoiceData);
          toast.success(status === 'pending' ? 'Invoice created' : 'Invoice created and sent');
        }

        router.push('/invoices');
      } catch {
        toast.error('Something went wrong');
      } finally {
        setSaving(false);
        setSending(false);
      }
    },
    [meta, client, items, pricing, notes, existingInvoice, router]
  );

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{existingInvoice ? 'Edit Invoice' : 'New Invoice'}</h1>
            <p className="text-sm text-muted-foreground">
              {existingInvoice ? 'Update the invoice details' : 'Create a new invoice for your client'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave('pending')} disabled={saving || sending}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave('pending')} disabled={saving || sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Invoice'}
          </Button>
        </div>
      </div>

      {/* Two-Column Layout */}
      <DocumentLayout
        leftColumn={
          <div className="space-y-6">
            <DocumentHeader
              meta={meta}
              onMetaChange={(m) => setMeta((prev) => ({ ...prev, ...m }))}
              template={template}
              onTemplateChange={setTemplate}
              docType="invoice"
            />
            <ClientSection client={client} onClientChange={(c) => setClient((prev) => ({ ...prev, ...c }))} />
            <ItemsTable items={items} onItemsChange={setItems} currency={meta.currency} />
            <PricingSummary
              pricing={pricing}
              onPricingChange={(p) => {
                if (p.discount_percent !== undefined) setDiscountPercent(p.discount_percent);
              }}
              currency={meta.currency}
            />
            <PaymentSection
              payment={payment}
              onPaymentChange={(p) => setPayment((prev) => ({ ...prev, ...p }))}
              grandTotal={pricing.grand_total}
              currency={meta.currency}
            />
            <NotesSection notes={notes} onNotesChange={(n) => setNotes((prev) => ({ ...prev, ...n }))} docType="invoice" />
          </div>
        }
        rightColumn={
          <LivePreview
            docType="invoice"
            template={template}
            meta={meta}
            client={client}
            items={items}
            pricing={pricing}
            notes={notes}
            payment={payment}
          />
        }
      />
    </div>
  );
}
