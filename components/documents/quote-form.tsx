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
import { NotesSection } from './notes-section';
import { LivePreview } from './live-preview';
import { DocumentLayout } from './document-layout';
import { useWorkspace } from '@/lib/settings/workspace-context';
import { createQuotation, updateQuotation } from '@/lib/firebase/database';
import type { Quotation, QuotationStatus } from '@/lib/db/types';
import type {
  DocumentTemplate,
  DocumentMeta,
  DocumentClient,
  DocumentItem,
  DocumentPricing,
  DocumentNotes,
} from './types';
import { createEmptyItem, calculatePricing } from './types';

interface QuoteFormProps {
  existingQuote?: Quotation | null;
}

export function QuoteForm({ existingQuote }: QuoteFormProps) {
  const router = useRouter();
  const { settings } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Form state
  const [template, setTemplate] = useState<DocumentTemplate>(
    (settings.branding.template_style as DocumentTemplate) || 'modern'
  );
  const [meta, setMeta] = useState<DocumentMeta>({
    document_number: existingQuote?.quotation_number || `QTE-${Date.now().toString().slice(-6)}`,
    status: existingQuote?.status || 'draft',
    issue_date: existingQuote?.created_at
      ? new Date(existingQuote.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    valid_until: existingQuote?.valid_until
      ? new Date(existingQuote.valid_until).toISOString().split('T')[0]
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    currency: existingQuote?.currency || settings.general.default_currency || 'INR',
  });

  const [client, setClient] = useState<DocumentClient>({
    company: existingQuote?.client_company || '',
    contact_person: existingQuote?.client_name || '',
    email: existingQuote?.client_email || '',
    phone: '',
    address: existingQuote?.client_address || '',
    gstin: '',
  });

  const [items, setItems] = useState<DocumentItem[]>(() => {
    if (existingQuote?.items && existingQuote.items.length > 0) {
      return existingQuote.items.map((item, idx) => ({
        id: crypto.randomUUID(),
        name: item.description || '',
        description: '',
        quantity: item.quantity,
        unit: 'pcs',
        unit_price: item.unit_price,
        total: item.total,
      }));
    }
    return [createEmptyItem()];
  });

  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState<DocumentNotes>({
    notes: existingQuote?.notes || '',
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

  // Update meta defaults when settings change
  useEffect(() => {
    if (!existingQuote) {
      setMeta((prev) => ({
        ...prev,
        currency: settings.general.default_currency || 'INR',
      }));
      setNotes((prev) => ({
        ...prev,
        terms: settings.branding.default_terms || '',
      }));
    }
  }, [settings, existingQuote]);

  const handleSave = useCallback(
    async (status: QuotationStatus = 'draft') => {
      if (!client.company && !client.contact_person) {
        toast.error('Client name or company is required');
        return;
      }

      if (status === 'draft') {
        setSaving(true);
      } else {
        setSending(true);
      }

      try {
        const quotationData = {
          quotation_number: meta.document_number,
          client_id: '',
          client_name: client.contact_person,
          client_email: client.email,
          client_company: client.company,
          client_address: client.address,
          project_title: '',
          amount: pricing.grand_total,
          currency: meta.currency,
          valid_until: meta.valid_until ? new Date(meta.valid_until).toISOString() : '',
          status: status,
          description: '',
          notes: notes.notes,
          items: items.map((item) => ({
            description: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
          })),
        };

        if (existingQuote) {
          await updateQuotation(existingQuote.id, quotationData);
          toast.success(status === 'draft' ? 'Quote updated' : 'Quote sent');
        } else {
          await createQuotation(quotationData);
          toast.success(status === 'draft' ? 'Quote created' : 'Quote created and sent');
        }

        router.push('/quotes');
      } catch {
        toast.error('Something went wrong');
      } finally {
        setSaving(false);
        setSending(false);
      }
    },
    [meta, client, items, pricing, notes, existingQuote, router]
  );

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/quotes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{existingQuote ? 'Edit Quote' : 'New Quote'}</h1>
            <p className="text-sm text-muted-foreground">
              {existingQuote ? 'Update the quotation details' : 'Create a new quotation for your client'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving || sending}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button onClick={() => handleSave('sent')} disabled={saving || sending}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send Quote'}
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
              docType="quote"
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
            <NotesSection notes={notes} onNotesChange={(n) => setNotes((prev) => ({ ...prev, ...n }))} docType="quote" />
          </div>
        }
        rightColumn={
          <LivePreview
            docType="quote"
            template={template}
            meta={meta}
            client={client}
            items={items}
            pricing={pricing}
            notes={notes}
          />
        }
      />
    </div>
  );
}
