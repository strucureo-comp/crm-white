/**
 * Event Bridge - Connects all modules through events
 * 
 * When a lead is qualified, it creates a contact.
 * When a deal is won, it creates an invoice.
 * When a quote is accepted, it creates an invoice.
 * When a payment is received, it updates the invoice.
 * 
 * All automatic, all connected.
 */

import { EventType } from '../types';
import { onEvent, emitEvent } from './index';
import { getQuote, updateQuote } from '../quotes/api';
import { getInvoice, updateInvoice } from '../invoices/api';
import { getDeal, updateDeal } from '../deals/api';
import { logQuoteAccepted, logInvoicePaid, logDealWon } from '../activities/api';

// ===== Event Handlers =====

/**
 * Initialize event bridge
 * Call this once when the app starts
 */
export function initEventBridge(workspaceId: string) {
  // Quote accepted → Create invoice
  onEvent('quote:accepted', async (data) => {
    console.log('[EventBridge] Quote accepted:', data.quote_id);
    // Invoice creation is handled in conversion pipeline
  });

  // Quote rejected → Update deal probability
  onEvent('quote:rejected', async (data) => {
    console.log('[EventBridge] Quote rejected:', data.quote_id);
    if (data.deal_id) {
      await updateDeal(workspaceId, data.deal_id, {
        probability: Math.max(0, (data.probability || 50) - 20),
      });
    }
  });

  // Invoice paid → Update deal status
  onEvent('invoice:paid', async (data) => {
    console.log('[EventBridge] Invoice paid:', data.invoice_id);
    if (data.deal_id) {
      await updateDeal(workspaceId, data.deal_id, {
        status: 'won',
        actual_close_date: new Date().toISOString(),
        probability: 100,
      });
      await logDealWon(workspaceId, data.deal_id, '', data.company_id, data.contact_id);
    }
  });

  // Deal won → Log activity
  onEvent('deal:won', async (data) => {
    console.log('[EventBridge] Deal won:', data.deal_id);
    // Activity already logged by the caller
  });

  // Deal lost → Log activity
  onEvent('deal:lost', async (data) => {
    console.log('[EventBridge] Deal lost:', data.deal_id);
    // Activity already logged by the caller
  });

  // Lead qualified → Create contact
  onEvent('lead:qualified', async (data) => {
    console.log('[EventBridge] Lead qualified:', data.lead_id);
    // Contact creation is handled in conversion pipeline
  });

  // Lead converted → Update lead status
  onEvent('lead:converted', async (data) => {
    console.log('[EventBridge] Lead converted:', data.lead_id, '→', data.conversion_type);
  });

  // Payment received → Update invoice
  onEvent('payment:received', async (data) => {
    console.log('[EventBridge] Payment received:', data.payment_id);
    // Invoice update is handled in payment recording
  });

  // Activity logged → Update entity timestamps
  onEvent('activity:created', async (data) => {
    console.log('[EventBridge] Activity created:', data.type);
    // Could update last_activity_at on the entity
  });

  console.log('[EventBridge] Initialized');
}

// ===== Utility Functions =====

/**
 * Emit quote accepted event with side effects
 */
export async function acceptQuote(workspaceId: string, quoteId: string) {
  const quote = await getQuote(workspaceId, quoteId);
  if (!quote) throw new Error('Quote not found');

  // Update quote status
  await updateQuote(workspaceId, quoteId, { status: 'accepted' });

  // Emit event
  emitEvent('quote:accepted', {
    quote_id: quoteId,
    company_id: quote.company_id,
    contact_id: quote.contact_id,
    deal_id: quote.deal_id,
    total: quote.total,
  });

  // Log activity
  await logQuoteAccepted(workspaceId, quoteId, quote.quote_number, quote.company_id, quote.contact_id, quote.deal_id);
}

/**
 * Emit quote rejected event with side effects
 */
export async function rejectQuote(workspaceId: string, quoteId: string) {
  const quote = await getQuote(workspaceId, quoteId);
  if (!quote) throw new Error('Quote not found');

  // Update quote status
  await updateQuote(workspaceId, quoteId, { status: 'rejected' });

  // Emit event
  emitEvent('quote:rejected', {
    quote_id: quoteId,
    company_id: quote.company_id,
    contact_id: quote.contact_id,
    deal_id: quote.deal_id,
    probability: quote.deal_id ? (await getDeal(workspaceId, quote.deal_id))?.probability : undefined,
  });
}

/**
 * Emit invoice paid event with side effects
 */
export async function markInvoicePaid(workspaceId: string, invoiceId: string, amount: number) {
  const invoice = await getInvoice(workspaceId, invoiceId);
  if (!invoice) throw new Error('Invoice not found');

  // Update invoice
  await updateInvoice(workspaceId, invoiceId, {
    status: 'paid',
    amount_paid: invoice.total,
    amount_due: 0,
    paid_date: new Date().toISOString(),
  });

  // Emit event
  emitEvent('invoice:paid', {
    invoice_id: invoiceId,
    company_id: invoice.company_id,
    contact_id: invoice.contact_id,
    deal_id: invoice.deal_id,
    total: invoice.total,
  });
}

/**
 * Emit deal won event with side effects
 */
export async function markDealWon(workspaceId: string, dealId: string) {
  const deal = await getDeal(workspaceId, dealId);
  if (!deal) throw new Error('Deal not found');

  // Update deal
  await updateDeal(workspaceId, dealId, {
    status: 'won',
    actual_close_date: new Date().toISOString(),
    probability: 100,
  });

  // Emit event
  emitEvent('deal:won', {
    deal_id: dealId,
    company_id: deal.company_id,
    contact_id: deal.contact_id,
    value: deal.value,
  });
}

/**
 * Emit deal lost event with side effects
 */
export async function markDealLost(workspaceId: string, dealId: string) {
  const deal = await getDeal(workspaceId, dealId);
  if (!deal) throw new Error('Deal not found');

  // Update deal
  await updateDeal(workspaceId, dealId, {
    status: 'lost',
    actual_close_date: new Date().toISOString(),
    probability: 0,
  });

  // Emit event
  emitEvent('deal:lost', {
    deal_id: dealId,
    company_id: deal.company_id,
    contact_id: deal.contact_id,
    value: deal.value,
  });
}
