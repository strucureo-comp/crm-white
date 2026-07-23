import { 
  ref, 
  push, 
  set, 
  get, 
  query, 
  orderByChild, 
  equalTo,
  limitToLast,
  onValue,
  off
} from 'firebase/database';
import { database as db } from '@/lib/firebase/config';
import { NormalizedActivity, ActivityType } from '../types';
import { emitEvent } from '../events';
import { getCurrentUserId } from '@/lib/firebase/auth';

// ===== Collection Reference =====
function activitiesRef(workspaceId: string) {
  return ref(db, `workspaces/${workspaceId}/activities`);
}

// ===== Helper Functions =====

/**
 * Get display label for activity type
 */
export function getActivityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    lead_created: 'Lead created',
    lead_qualified: 'Lead qualified',
    lead_converted_contact: 'Lead converted to contact',
    lead_converted_deal: 'Lead converted to deal',
    contact_created: 'Contact created',
    contact_updated: 'Contact updated',
    deal_created: 'Deal created',
    deal_stage_changed: 'Deal stage changed',
    deal_won: 'Deal won',
    deal_lost: 'Deal lost',
    quote_created: 'Quote created',
    quote_sent: 'Quote sent',
    quote_viewed: 'Quote viewed',
    quote_accepted: 'Quote accepted',
    quote_rejected: 'Quote rejected',
    quote_expired: 'Quote expired',
    invoice_created: 'Invoice created',
    invoice_sent: 'Invoice sent',
    invoice_viewed: 'Invoice viewed',
    invoice_paid: 'Invoice paid',
    invoice_overdue: 'Invoice overdue',
    payment_received: 'Payment received',
    payment_failed: 'Payment failed',
    meeting_scheduled: 'Meeting scheduled',
    meeting_completed: 'Meeting completed',
    meeting_cancelled: 'Meeting cancelled',
    email_sent: 'Email sent',
    email_received: 'Email received',
    note_added: 'Note added',
    task_created: 'Task created',
    task_completed: 'Task completed',
    call_logged: 'Call logged',
    whatsapp_sent: 'WhatsApp sent',
    whatsapp_received: 'WhatsApp received',
    document_uploaded: 'Document uploaded',
    document_downloaded: 'Document downloaded',
    status_changed: 'Status changed',
    comment_added: 'Comment added',
    mention_added: 'Mention added',
  };
  return labels[type] || type;
}

/**
 * Get icon for activity type
 */
export function getActivityIcon(type: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    lead_created: 'UserPlus',
    lead_qualified: 'UserCheck',
    lead_converted_contact: 'UserPlus',
    lead_converted_deal: 'TrendingUp',
    contact_created: 'UserPlus',
    contact_updated: 'UserCog',
    deal_created: 'Briefcase',
    deal_stage_changed: 'ArrowRight',
    deal_won: 'CheckCircle',
    deal_lost: 'XCircle',
    quote_created: 'FileText',
    quote_sent: 'Send',
    quote_viewed: 'Eye',
    quote_accepted: 'CheckCircle',
    quote_rejected: 'XCircle',
    quote_expired: 'Clock',
    invoice_created: 'FileText',
    invoice_sent: 'Send',
    invoice_viewed: 'Eye',
    invoice_paid: 'DollarSign',
    invoice_overdue: 'AlertTriangle',
    payment_received: 'DollarSign',
    payment_failed: 'XCircle',
    meeting_scheduled: 'Calendar',
    meeting_completed: 'CheckCircle',
    meeting_cancelled: 'XCircle',
    email_sent: 'Mail',
    email_received: 'Inbox',
    note_added: 'FileText',
    task_created: 'CheckSquare',
    task_completed: 'CheckCircle',
    call_logged: 'Phone',
    whatsapp_sent: 'MessageSquare',
    whatsapp_received: 'MessageSquare',
    document_uploaded: 'Upload',
    document_downloaded: 'Download',
    status_changed: 'RefreshCw',
    comment_added: 'MessageCircle',
    mention_added: 'AtSign',
  };
  return icons[type] || 'Activity';
}

// ===== Core Functions =====

/**
 * Log an activity
 */
export async function logActivity(
  workspaceId: string,
  data: {
    type: ActivityType;
    title: string;
    description?: string;
    company_id?: string;
    contact_id?: string;
    deal_id?: string;
    quote_id?: string;
    invoice_id?: string;
    lead_id?: string;
    metadata?: Record<string, any>;
  }
): Promise<NormalizedActivity> {
  const newRef = push(activitiesRef(workspaceId));
  const activityId = newRef.key!;
  
  const now = new Date().toISOString();
  const activity: NormalizedActivity = {
    activity_id: activityId,
    workspace_id: workspaceId,
    type: data.type,
    title: data.title,
    description: data.description || '',
    company_id: data.company_id || '',
    contact_id: data.contact_id || '',
    deal_id: data.deal_id || '',
    quote_id: data.quote_id || '',
    invoice_id: data.invoice_id || '',
    lead_id: data.lead_id || '',
    metadata: data.metadata || {},
    user_id: getCurrentUserId() || '',
    created_at: now,
  };
  
  await set(newRef, activity);
  
  emitEvent('activity:created', activity);
  
  return activity;
}

/**
 * Get all activities in a workspace
 */
export async function getActivities(
  workspaceId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(activitiesRef(workspaceId), orderByChild('created_at'));
  
  if (limit) {
    q = query(activitiesRef(workspaceId), orderByChild('created_at'), limitToLast(limit));
  }
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return Object.values(data) as NormalizedActivity[];
  }
  return [];
}

/**
 * Get activities for a company
 */
export async function getCompanyActivities(
  workspaceId: string, 
  companyId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('company_id'), 
    equalTo(companyId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    // Sort by created_at descending and apply limit
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

/**
 * Get activities for a deal
 */
export async function getDealActivities(
  workspaceId: string, 
  dealId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('deal_id'), 
    equalTo(dealId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

/**
 * Get activities for a contact
 */
export async function getContactActivities(
  workspaceId: string, 
  contactId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('contact_id'), 
    equalTo(contactId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

/**
 * Get activities for a quote
 */
export async function getQuoteActivities(
  workspaceId: string, 
  quoteId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('quote_id'), 
    equalTo(quoteId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

/**
 * Get activities for an invoice
 */
export async function getInvoiceActivities(
  workspaceId: string, 
  invoiceId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('invoice_id'), 
    equalTo(invoiceId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

/**
 * Get activities for a lead
 */
export async function getLeadActivities(
  workspaceId: string, 
  leadId: string,
  limit?: number
): Promise<NormalizedActivity[]> {
  let q = query(
    activitiesRef(workspaceId), 
    orderByChild('lead_id'), 
    equalTo(leadId)
  );
  
  const snapshot = await get(q);
  if (snapshot.exists()) {
    const data = snapshot.val();
    const activities = Object.values(data) as NormalizedActivity[];
    
    const sorted = activities.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    return limit ? sorted.slice(0, limit) : sorted;
  }
  return [];
}

// ===== Convenience Functions =====

/**
 * Log lead created
 */
export async function logLeadCreated(
  workspaceId: string,
  leadId: string,
  leadName: string,
  companyId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'lead_created',
    title: `Lead created: ${leadName}`,
    description: `New lead "${leadName}" was created`,
    lead_id: leadId,
    company_id: companyId,
  });
}

/**
 * Log lead qualified
 */
export async function logLeadQualified(
  workspaceId: string,
  leadId: string,
  leadName: string,
  companyId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'lead_qualified',
    title: `Lead qualified: ${leadName}`,
    description: `Lead "${leadName}" has been qualified`,
    lead_id: leadId,
    company_id: companyId,
  });
}

/**
 * Log deal created
 */
export async function logDealCreated(
  workspaceId: string,
  dealId: string,
  dealTitle: string,
  companyId: string,
  contactId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'deal_created',
    title: `Deal created: ${dealTitle}`,
    description: `New deal "${dealTitle}" was created`,
    deal_id: dealId,
    company_id: companyId,
    contact_id: contactId,
  });
}

/**
 * Log deal stage changed
 */
export async function logDealStageChanged(
  workspaceId: string,
  dealId: string,
  dealTitle: string,
  oldStage: string,
  newStage: string,
  companyId: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'deal_stage_changed',
    title: `Deal stage changed: ${dealTitle}`,
    description: `Deal "${dealTitle}" moved from "${oldStage}" to "${newStage}"`,
    deal_id: dealId,
    company_id: companyId,
    metadata: { old_stage: oldStage, new_stage: newStage },
  });
}

/**
 * Log quote created
 */
export async function logQuoteCreated(
  workspaceId: string,
  quoteId: string,
  quoteNumber: string,
  companyId: string,
  contactId?: string,
  dealId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'quote_created',
    title: `Quote created: ${quoteNumber}`,
    description: `New quote "${quoteNumber}" was created`,
    quote_id: quoteId,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId,
  });
}

/**
 * Log invoice created
 */
export async function logInvoiceCreated(
  workspaceId: string,
  invoiceId: string,
  invoiceNumber: string,
  companyId: string,
  contactId?: string,
  dealId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'invoice_created',
    title: `Invoice created: ${invoiceNumber}`,
    description: `New invoice "${invoiceNumber}" was created`,
    invoice_id: invoiceId,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId,
  });
}

/**
 * Log payment received
 */
export async function logPaymentReceived(
  workspaceId: string,
  paymentId: string,
  amount: number,
  invoiceNumber: string,
  companyId: string,
  contactId?: string
): Promise<NormalizedActivity> {
  return logActivity(workspaceId, {
    type: 'payment_received',
    title: `Payment received: ${amount}`,
    description: `Payment of ${amount} received for invoice "${invoiceNumber}"`,
    company_id: companyId,
    contact_id: contactId,
    metadata: { amount, invoice_number: invoiceNumber },
  });
}

/**
 * Log quote accepted activity
 */
export async function logQuoteAccepted(
  workspaceId: string,
  quoteId: string,
  quoteNumber: string,
  companyId: string,
  contactId: string,
  dealId?: string
): Promise<void> {
  await logActivity(workspaceId, {
    type: 'quote_accepted',
    title: `Quote ${quoteNumber} accepted`,
    description: `Quote has been accepted by client`,
    quote_id: quoteId,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId || '',
    metadata: { quote_number: quoteNumber },
  });
}

/**
 * Log quote rejected activity
 */
export async function logQuoteRejected(
  workspaceId: string,
  quoteId: string,
  quoteNumber: string,
  companyId: string,
  contactId: string,
  dealId?: string
): Promise<void> {
  await logActivity(workspaceId, {
    type: 'quote_rejected',
    title: `Quote ${quoteNumber} rejected`,
    description: `Quote has been rejected by client`,
    quote_id: quoteId,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId || '',
    metadata: { quote_number: quoteNumber },
  });
}

/**
 * Log deal won activity
 */
export async function logDealWon(
  workspaceId: string,
  dealId: string,
  dealTitle: string,
  companyId: string,
  contactId: string
): Promise<void> {
  await logActivity(workspaceId, {
    type: 'deal_won',
    title: `Deal won: ${dealTitle}`,
    description: `Deal has been marked as won`,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId,
    metadata: { deal_title: dealTitle },
  });
}

/**
 * Log deal lost activity
 */
export async function logDealLost(
  workspaceId: string,
  dealId: string,
  dealTitle: string,
  companyId: string,
  contactId: string
): Promise<void> {
  await logActivity(workspaceId, {
    type: 'deal_lost',
    title: `Deal lost: ${dealTitle}`,
    description: `Deal has been marked as lost`,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId,
    metadata: { deal_title: dealTitle },
  });
}

/**
 * Log invoice paid activity
 */
export async function logInvoicePaid(
  workspaceId: string,
  invoiceId: string,
  invoiceNumber: string,
  companyId: string,
  contactId: string,
  dealId?: string
): Promise<void> {
  await logActivity(workspaceId, {
    type: 'invoice_paid',
    title: `Invoice ${invoiceNumber} paid`,
    description: `Invoice has been fully paid`,
    invoice_id: invoiceId,
    company_id: companyId,
    contact_id: contactId,
    deal_id: dealId || '',
    metadata: { invoice_number: invoiceNumber },
  });
}

// ===== Real-time Subscriptions =====

/**
 * Subscribe to activities changes
 */
export function subscribeToActivities(
  workspaceId: string,
  callback: (activities: NormalizedActivity[]) => void,
  limit?: number
): () => void {
  let q = query(activitiesRef(workspaceId), orderByChild('created_at'));
  
  if (limit) {
    q = query(activitiesRef(workspaceId), orderByChild('created_at'), limitToLast(limit));
  }
  
  const unsubscribe = onValue(q, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const activities = Object.values(data) as NormalizedActivity[];
      callback(activities.reverse()); // Reverse to get newest first
    } else {
      callback([]);
    }
  });
  
  return () => off(q, 'value', unsubscribe);
}

/**
 * Subscribe to company activities changes
 */
export function subscribeToCompanyActivities(
  workspaceId: string,
  companyId: string,
  callback: (activities: NormalizedActivity[]) => void
): () => void {
  const q = query(
    activitiesRef(workspaceId), 
    orderByChild('company_id'), 
    equalTo(companyId)
  );
  
  const unsubscribe = onValue(q, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const activities = Object.values(data) as NormalizedActivity[];
      const sorted = activities.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      callback(sorted);
    } else {
      callback([]);
    }
  });
  
  return () => off(q, 'value', unsubscribe);
}
