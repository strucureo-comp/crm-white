import { ref, get, set, update, push, remove, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { database } from './config';
import {
  sendWelcomeEmail,
  sendProjectUpdateEmail,
  sendSupportTicketEmail,
  sendInvoiceEmail,
  sendMeetingStatusEmail,
  sendNotificationEmail,
  sendInvitationEmail
} from '../services/email';
import type {
  Project,
  Invoice,
  SupportRequest,
  User,
  UserRole,
  ProjectFile,
  ProjectUpdate,
  SupportMessage,
  MeetingRequest,
  PriorityLevel,
  Payment,
  TeamMember,
  SalaryPayment,
  Notification,
  Transaction,
  PlanningNote,
  Quotation,
  Enquiry,
  Lead,
  TaskItem,
  Contract,
  FieldAgent,
  FieldAlert,
  ContentItem,
  MediaItem,
  CalendarEvent,
  Report,
  Integration,
  AutomationRule,
  AiConversation,
} from '@/lib/db/types';

function cleanData(data: any) {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

export async function getProjects(clientId?: string): Promise<Project[]> {
  try {
    const projectsRef = ref(database, 'projects');
    const snapshot = await get(projectsRef);

    if (!snapshot.exists()) return [];

    const projects: Project[] = [];
    snapshot.forEach((childSnapshot) => {
      const project = { id: childSnapshot.key, ...childSnapshot.val() } as Project;
      if (!clientId || project.client_id === clientId) {
        projects.push(project);
      }
    });

    return projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as Project;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

export async function createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const projectsRef = ref(database, 'projects');
    const newProjectRef = push(projectsRef);

    const projectData = cleanData({
      ...project,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newProjectRef, projectData);

    // Notify Client if project is linked to a registered user
    if (project.client_id) {
      await createNotification({
        user_id: project.client_id,
        title: 'New Project Created',
        message: `Your project "${project.title}" has been created and is now active.`,
        type: 'project',
        link: `/projects/${newProjectRef.key}`,
        read: false
      });
    }

    return newProjectRef.key;
  } catch (error) {
    console.error('Error creating project:', error);
    return null;
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>, updatedBy?: string): Promise<boolean> {
  try {
    const projectRef = ref(database, `projects/${projectId}`);
    const snapshot = await get(projectRef);
    const oldProject = snapshot.val() as Project;

    await update(projectRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    // Notify client and admin of the update
    if (oldProject) {
      // Notify Client
      await createNotification({
        user_id: oldProject.client_id,
        title: 'Project Updated',
        message: `Your project "${oldProject.title}" has been updated.`,
        type: 'project',
        link: `/projects/${projectId}`,
        read: false
      });

      // Notify Admins (except if updated by admin, but for now broad casting is safer for "every update")
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: 'Project Updated',
          message: `Project "${oldProject.title}" has been updated.`,
          type: 'project',
          link: `/admin/projects/${projectId}`,
          read: false
        });
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating project:', error);
    return false;
  }
}

export async function getInvoices(clientId?: string): Promise<Invoice[]> {
  try {
    const invoicesRef = ref(database, 'invoices');
    const snapshot = await get(invoicesRef);

    if (!snapshot.exists()) return [];

    const invoices: Invoice[] = [];
    snapshot.forEach((childSnapshot) => {
      const invoice = { id: childSnapshot.key, ...childSnapshot.val() } as Invoice;
      if (!clientId || invoice.client_id === clientId) {
        invoices.push(invoice);
      }
    });

    return invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting invoices:', error);
    return [];
  }
}
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    const snapshot = await get(invoiceRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as Invoice;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<boolean> {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    const snapshot = await get(invoiceRef);
    const invoice = snapshot.val() as Invoice;

    await update(invoiceRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (invoice && updates.status && updates.status === 'paid') {
      // Notify Admin that client paid
      const admins = await getAdmins();
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: 'Invoice Paid',
          message: `Invoice ${invoice.invoice_number} has been marked as paid.`,
          type: 'payment',
          link: `/admin/invoices`,
          read: false
        });
      }

      // Also notify client that payment was received
      await createNotification({
        user_id: invoice.client_id,
        title: 'Payment Received',
        message: `We have received your payment for Invoice ${invoice.invoice_number}. Thank you!`,
        type: 'payment',
        link: `/invoices/${invoiceId}`,
        read: false
      });
    } else if (invoice) {
      // For any other update (like status change to pending/overdue or amount update), notify client
      await createNotification({
        user_id: invoice.client_id,
        title: 'Invoice Updated',
        message: `Invoice ${invoice.invoice_number} has been updated.`,
        type: 'payment',
        link: `/invoices/${invoiceId}`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating invoice:', error);
    return false;
  }
}

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const invoicesRef = ref(database, 'invoices');
    const newInvoiceRef = push(invoicesRef);

    const invoiceData = cleanData({
      ...invoice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newInvoiceRef, invoiceData);

    // Notify Client
    await createNotification({
      user_id: invoice.client_id,
      title: 'New Invoice Issued',
      message: `A new invoice ${invoice.invoice_number} for $${invoice.amount} has been issued.`,
      type: 'payment',
      link: `/invoices`,
      read: false
    });

    return newInvoiceRef.key;
  } catch (error) {
    console.error('Error creating invoice:', error);
    return null;
  }
}

export async function getSupportRequests(clientId?: string): Promise<SupportRequest[]> {
  try {
    const supportRef = ref(database, 'support_requests');
    const snapshot = await get(supportRef);

    if (!snapshot.exists()) return [];

    const requests: SupportRequest[] = [];
    snapshot.forEach((childSnapshot) => {
      const request = { id: childSnapshot.key, ...childSnapshot.val() } as SupportRequest;
      if (!clientId || request.client_id === clientId) {
        requests.push(request);
      }
    });

    return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting support requests:', error);
    return [];
  }
}

export async function getSupportRequest(requestId: string): Promise<SupportRequest | null> {
  try {
    const supportRef = ref(database, `support_requests/${requestId}`);
    const snapshot = await get(supportRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as SupportRequest;
  } catch (error) {
    console.error('Error getting support request:', error);
    return null;
  }
}

export async function updateSupportRequest(requestId: string, updates: Partial<SupportRequest>): Promise<boolean> {
  try {
    const supportRef = ref(database, `support_requests/${requestId}`);
    const snapshot = await get(supportRef);
    const request = snapshot.val() as SupportRequest;

    await update(supportRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (request && updates.status && updates.status !== request.status) {
      await createNotification({
        user_id: request.client_id,
        title: 'Support Ticket Updated',
        message: `Your ticket "${request.subject}" has been marked as ${updates.status.replace('_', ' ')}.`,
        type: 'support',
        link: `/support/${requestId}`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating support request:', error);
    return false;
  }
}

export async function createSupportRequest(request: Omit<SupportRequest, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const supportRef = ref(database, 'support_requests');
    const newRequestRef = push(supportRef);

    const requestData = cleanData({
      ...request,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRequestRef, requestData);

    // Notify Admin
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New Support Ticket',
        message: `A new ticket "${request.subject}" has been submitted.`,
        type: 'support',
        link: `/admin/support/${newRequestRef.key}`,
        read: false
      });
    }

    return newRequestRef.key;
  } catch (error) {
    console.error('Error creating support request:', error);
    return null;
  }
}

export async function getUsers(): Promise<User[]> {
  try {
    const usersRef = ref(database, 'users');
    const snapshot = await get(usersRef);

    if (!snapshot.exists()) return [];

    const users: User[] = [];
    snapshot.forEach((childSnapshot) => {
      users.push({ id: childSnapshot.key, ...childSnapshot.val() } as User);
    });

    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const userRef = ref(database, `users/${userId}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as User;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function createUser(userId: string, userData: Omit<User, 'id'>): Promise<boolean> {
  try {
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, cleanData(userData));

    // Notify Admin of new user
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New User Registered',
        message: `${userData.full_name} has registered as a ${userData.role}.`,
        type: 'system',
        link: `/admin/users`, // Assuming there is a users list
        read: false
      });
    }

    // Send Welcome Email
    await sendWelcomeEmail(userData.email, userData.full_name);

    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

async function getAdmins(): Promise<User[]> {
  const allUsers = await getUsers();
  return allUsers.filter(u => u.role === 'admin');
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);

    const notificationData = cleanData({
      ...notification,
      created_at: new Date().toISOString(),
    });

    await set(newNotificationRef, notificationData);

    // Trigger Email
    const user = await getUser(notification.user_id);
    if (user) {
      switch (notification.type) {
        case 'project':
          await sendProjectUpdateEmail(user.email, notification.title, notification.message, 'BridgeBreak Team');
          break;
        case 'support':
          await sendSupportTicketEmail(user.email, notification.title, notification.message, user.full_name, user.role === 'admin');
          break;
        case 'payment':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
        case 'meeting':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
        case 'system':
          await sendNotificationEmail(user.email, notification.title, notification.title, notification.message, notification.link);
          break;
      }
    }

    return newNotificationRef.key;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const notificationsRef = ref(database, 'notifications');
    const snapshot = await get(notificationsRef);

    if (!snapshot.exists()) return [];

    const notifications: Notification[] = [];
    snapshot.forEach((childSnapshot) => {
      const notification = { id: childSnapshot.key, ...childSnapshot.val() } as Notification;
      if (notification.user_id === userId) {
        notifications.push(notification);
      }
    });

    return notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const notificationRef = ref(database, `notifications/${notificationId}`);
    await update(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

export async function createInvitation(invitation: { email: string; role: UserRole; invited_by: string }): Promise<string | null> {
  try {
    const invitationsRef = ref(database, 'invitations');
    const newInvitationRef = push(invitationsRef);

    const invitationData = cleanData({
      ...invitation,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    await set(newInvitationRef, invitationData);

    // Send actual email
    const sender = await getUser(invitation.invited_by);
    if (sender) {
      await sendInvitationEmail(invitation.email, invitation.role, sender.full_name);
    }

    return newInvitationRef.key;
  } catch (error) {
    console.error('Error creating invitation:', error);
    return null;
  }
}

export async function getInvitations(): Promise<any[]> {
  try {
    const invitationsRef = ref(database, 'invitations');
    const snapshot = await get(invitationsRef);

    if (!snapshot.exists()) return [];

    const invitations: any[] = [];
    snapshot.forEach((childSnapshot) => {
      invitations.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    return invitations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting invitations:', error);
    return [];
  }
}

export async function createMeetingRequest(meeting: Omit<MeetingRequest, 'id' | 'created_at' | 'updated_at' | 'status'>): Promise<string | null> {
  try {
    const meetingsRef = ref(database, 'meeting_requests');
    const newMeetingRef = push(meetingsRef);

    const meetingData = cleanData({
      ...meeting,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newMeetingRef, meetingData);

    // Notify Admin
    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New Meeting Request',
        message: `A new meeting for "${meeting.purpose}" has been requested.`,
        type: 'meeting',
        link: `/admin/meetings`,
        read: false
      });
    }

    return newMeetingRef.key;
  } catch (error) {
    console.error('Error creating meeting request:', error);
    return null;
  }
}

export async function getMeeting(meetingId: string): Promise<MeetingRequest | null> {
  try {
    const meetingRef = ref(database, `meeting_requests/${meetingId}`);
    const snapshot = await get(meetingRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as MeetingRequest;
  } catch (error) {
    console.error('Error getting meeting:', error);
    return null;
  }
}

export async function updateMeeting(meetingId: string, updates: Partial<MeetingRequest>): Promise<boolean> {
  try {
    const meetingRef = ref(database, `meeting_requests/${meetingId}`);
    const snapshot = await get(meetingRef);
    const meeting = snapshot.val() as MeetingRequest;

    await update(meetingRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (meeting && updates.status && updates.status !== meeting.status) {
      // Notify Client
      await createNotification({
        user_id: meeting.client_id,
        title: 'Meeting Updated',
        message: `Your meeting request for "${meeting.purpose}" has been ${updates.status}.`,
        type: 'meeting',
        link: `/meetings`,
        read: false
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating meeting:', error);
    return false;
  }
}


export async function getTransactions(): Promise<Transaction[]> {
  try {
    const transactionsRef = ref(database, 'transactions');
    const snapshot = await get(transactionsRef);

    if (!snapshot.exists()) return [];

    const transactions: Transaction[] = [];
    snapshot.forEach((childSnapshot) => {
      transactions.push({ id: childSnapshot.key, ...childSnapshot.val() } as Transaction);
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const transactionsRef = ref(database, 'transactions');
    const newTransactionRef = push(transactionsRef);

    const transactionData = cleanData({
      ...transaction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newTransactionRef, transactionData);
    return newTransactionRef.key;
  } catch (error) {
    console.error('Error creating transaction:', error);
    return null;
  }
}

export async function deleteTransaction(transactionId: string): Promise<boolean> {
  try {
    const transactionRef = ref(database, `transactions/${transactionId}`);
    await remove(transactionRef);
    return true;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
}

export async function getSystemSetting(key: string): Promise<any> {
  try {
    const settingsRef = ref(database, `system_settings/${key}`);
    const snapshot = await get(settingsRef);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error(`Error getting system setting ${key}:`, error);
    return null;
  }
}

export async function setSystemSetting(key: string, value: any): Promise<boolean> {
  try {
    const settingsRef = ref(database, `system_settings/${key}`);
    await set(settingsRef, value);
    return true;
  } catch (error) {
    console.error(`Error setting system setting ${key}:`, error);
    return false;
  }
}

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  try {
    const invoiceRef = ref(database, `invoices/${invoiceId}`);
    await remove(invoiceRef);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

export async function getPlanningNotes(): Promise<PlanningNote[]> {
  try {
    const notesRef = ref(database, 'admin_notes');
    const snapshot = await get(notesRef);

    if (!snapshot.exists()) return [];

    const notes: PlanningNote[] = [];
    snapshot.forEach((childSnapshot) => {
      notes.push({ id: childSnapshot.key, ...childSnapshot.val() } as PlanningNote);
    });

    return notes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (error) {
    console.error('Error getting planning notes:', error);
    return [];
  }
}

export async function createPlanningNote(note: Omit<PlanningNote, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const notesRef = ref(database, 'admin_notes');
    const newNoteRef = push(notesRef);

    const noteData = cleanData({
      ...note,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    await set(newNoteRef, noteData);
    return newNoteRef.key;
  } catch (error) {
    console.error('Error creating planning note:', error);
    return null;
  }
}

export async function updatePlanningNote(noteId: string, updates: Partial<PlanningNote>): Promise<boolean> {
  try {
    const noteRef = ref(database, `admin_notes/${noteId}`);
    await update(noteRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating planning note:', error);
    return false;
  }
}

export async function deletePlanningNote(noteId: string): Promise<boolean> {
  try {
    const noteRef = ref(database, `admin_notes/${noteId}`);
    await remove(noteRef);
    return true;
  } catch (error) {
    console.error('Error deleting planning note:', error);
    return false;
  }
}

export async function getQuotations(clientId?: string): Promise<Quotation[]> {
  try {
    const quotationsRef = ref(database, 'quotations');
    const snapshot = await get(quotationsRef);

    if (!snapshot.exists()) return [];

    const quotations: Quotation[] = [];
    snapshot.forEach((childSnapshot) => {
      const quotation = { id: childSnapshot.key, ...childSnapshot.val() } as Quotation;
      if (!clientId || quotation.client_id === clientId) {
        quotations.push(quotation);
      }
    });

    return quotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting quotations:', error);
    return [];
  }
}

export async function getQuotation(quotationId: string): Promise<Quotation | null> {
  try {
    const quotationRef = ref(database, `quotations/${quotationId}`);
    const snapshot = await get(quotationRef);

    if (!snapshot.exists()) return null;

    return { id: snapshot.key, ...snapshot.val() } as Quotation;
  } catch (error) {
    console.error('Error getting quotation:', error);
    return null;
  }
}

export async function createQuotation(quotation: Omit<Quotation, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const quotationsRef = ref(database, 'quotations');
    const newQuotationRef = push(quotationsRef);

    const quotationData = cleanData({
      ...quotation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newQuotationRef, quotationData);

    // Notify Client
    await createNotification({
      user_id: quotation.client_id,
      title: 'New Quotation Received',
      message: `You have received a new quotation ${quotation.quotation_number}.`,
      type: 'payment', // reusing payment type or maybe system
      link: `/quotations`, // Client side link
      read: false
    });

    return newQuotationRef.key;
  } catch (error) {
    console.error('Error creating quotation:', error);
    return null;
  }
}

export async function updateQuotation(quotationId: string, updates: Partial<Quotation>): Promise<boolean> {
  try {
    const quotationRef = ref(database, `quotations/${quotationId}`);
    await update(quotationRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating quotation:', error);
    return false;
  }
}

export async function convertQuotationToInvoice(quotation: Quotation): Promise<string | null> {
  try {
    const invoiceId = await createInvoice({
      project_id: quotation.project_id || '',
      client_id: quotation.client_id,
      invoice_number: `INV-${Date.now()}`,
      amount: quotation.amount,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      description: quotation.description || `Invoice for ${quotation.quotation_number}`,
    });

    if (invoiceId) {
      await updateQuotation(quotation.id, { status: 'accepted' });
    }

    return invoiceId;
  } catch (error) {
    console.error('Error converting quotation to invoice:', error);
    return null;
  }
}

export async function markInvoiceAsPaid(
  invoiceId: string,
  paymentData: { amount: number; payment_method: string; transaction_id?: string }
): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    await updateInvoice(invoiceId, {
      status: 'paid',
      paid_at: now,
    });

    await createTransaction({
      type: 'income',
      amount: paymentData.amount,
      category: 'invoice_payment',
      description: `Payment for invoice ${invoiceId}`,
      date: now,
      created_by: '',
    });

    return true;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return false;
  }
}

export async function deleteQuotation(quotationId: string): Promise<boolean> {
  try {
    const quotationRef = ref(database, `quotations/${quotationId}`);
    await remove(quotationRef);
    return true;
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return false;
  }
}

// ----------------------------------------------------
// ENQUIRY FUNCTIONS
// ----------------------------------------------------

export async function getEnquiries(): Promise<Enquiry[]> {
  try {
    const refPath = ref(database, 'enquiries');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const enquiries: Enquiry[] = [];
    snapshot.forEach((childSnapshot) => {
      enquiries.push({ id: childSnapshot.key, ...childSnapshot.val() } as Enquiry);
    });

    return enquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting enquiries:', error);
    return [];
  }
}

export async function createEnquiry(enquiry: Omit<Enquiry, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'enquiries');
    const newRef = push(refPath);

    const data = cleanData({
      ...enquiry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRef, data);
    return newRef.key;
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return null;
  }
}

export async function updateEnquiry(id: string, updates: Partial<Enquiry>): Promise<boolean> {
  try {
    const refPath = ref(database, `enquiries/${id}`);
    await update(refPath, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return false;
  }
}

// ----------------------------------------------------
// TASK FUNCTIONS
// ----------------------------------------------------

export async function getTasks(): Promise<TaskItem[]> {
  try {
    const refPath = ref(database, 'tasks');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const tasks: TaskItem[] = [];
    snapshot.forEach((childSnapshot) => {
      tasks.push({ id: childSnapshot.key, ...childSnapshot.val() } as TaskItem);
    });

    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
}

export async function createTask(task: Omit<TaskItem, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'tasks');
    const newRef = push(refPath);

    const data = cleanData({
      ...task,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRef, data);
    return newRef.key;
  } catch (error) {
    console.error('Error creating task:', error);
    return null;
  }
}

export async function updateTask(id: string, updates: Partial<TaskItem>): Promise<boolean> {
  try {
    const refPath = ref(database, `tasks/${id}`);
    await update(refPath, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const refPath = ref(database, `tasks/${id}`);
    await remove(refPath);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

// ----------------------------------------------------
// LEAD FUNCTIONS
// ----------------------------------------------------

export async function getLeads(): Promise<Lead[]> {
  try {
    const refPath = ref(database, 'leads');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const leads: Lead[] = [];
    snapshot.forEach((childSnapshot) => {
      leads.push({ id: childSnapshot.key, ...childSnapshot.val() } as Lead);
    });

    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting leads:', error);
    return [];
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
  try {
    const userRef = ref(database, `users/${userId}`);
    await update(userRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const userRef = ref(database, `users/${userId}`);
    await remove(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

export async function createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'leads');
    const newRef = push(refPath);

    const data = cleanData({
      ...lead,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRef, data);
    return newRef.key;
  } catch (error) {
    console.error('Error creating lead:', error);
    return null;
  }
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
  try {
    const refPath = ref(database, `leads/${id}`);
    await update(refPath, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating lead:', error);
    return false;
  }
}

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const refPath = ref(database, `projects/${id}`);
    await remove(refPath);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

export async function deleteLead(id: string): Promise<boolean> {
  try {
    const refPath = ref(database, `leads/${id}`);
    await remove(refPath);
    return true;
  } catch (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
}

// ----------------------------------------------------
// CONTRACT FUNCTIONS
// ----------------------------------------------------

export async function getContracts(): Promise<Contract[]> {
  try {
    const refPath = ref(database, 'contracts');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Contract[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Contract);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createContract(data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'contracts');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateContract(id: string, updates: Partial<Contract>): Promise<boolean> {
  try {
    const refPath = ref(database, `contracts/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteContract(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `contracts/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// FIELD AGENT FUNCTIONS
// ----------------------------------------------------

export async function getFieldAgents(): Promise<FieldAgent[]> {
  try {
    const refPath = ref(database, 'field_agents');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: FieldAgent[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as FieldAgent);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createFieldAgent(data: Omit<FieldAgent, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'field_agents');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateFieldAgent(id: string, updates: Partial<FieldAgent>): Promise<boolean> {
  try {
    const refPath = ref(database, `field_agents/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteFieldAgent(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `field_agents/${id}`));
    return true;
  } catch {
    return false;
  }
}

export async function getFieldAlerts(): Promise<FieldAlert[]> {
  try {
    const refPath = ref(database, 'field_alerts');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: FieldAlert[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as FieldAlert);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createFieldAlert(data: Omit<FieldAlert, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'field_alerts');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// CONTENT ITEM FUNCTIONS
// ----------------------------------------------------

export async function getContentItems(): Promise<ContentItem[]> {
  try {
    const refPath = ref(database, 'content_items');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: ContentItem[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as ContentItem);
    });
    return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch {
    return [];
  }
}

export async function createContentItem(data: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'content_items');
    const newRef = push(refPath);
    const now = new Date().toISOString();
    await set(newRef, cleanData({ ...data, updated_at: now, created_at: now }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateContentItem(id: string, updates: Partial<ContentItem>): Promise<boolean> {
  try {
    const refPath = ref(database, `content_items/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteContentItem(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `content_items/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// MEDIA ITEM FUNCTIONS
// ----------------------------------------------------

export async function getMediaItems(): Promise<MediaItem[]> {
  try {
    const refPath = ref(database, 'media_items');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: MediaItem[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as MediaItem);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createMediaItem(data: Omit<MediaItem, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'media_items');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function deleteMediaItem(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `media_items/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// CALENDAR EVENT FUNCTIONS
// ----------------------------------------------------

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const refPath = ref(database, 'calendar_events');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: CalendarEvent[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as CalendarEvent);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createCalendarEvent(data: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'calendar_events');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<boolean> {
  try {
    const refPath = ref(database, `calendar_events/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `calendar_events/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// REPORT FUNCTIONS
// ----------------------------------------------------

export async function getReports(): Promise<Report[]> {
  try {
    const refPath = ref(database, 'reports');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Report[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Report);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createReport(data: Omit<Report, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'reports');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateReport(id: string, updates: Partial<Report>): Promise<boolean> {
  try {
    const refPath = ref(database, `reports/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteReport(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `reports/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// INTEGRATION FUNCTIONS
// ----------------------------------------------------

export async function getIntegrations(): Promise<Integration[]> {
  try {
    const refPath = ref(database, 'integrations');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Integration[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Integration);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createIntegration(data: Omit<Integration, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'integrations');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateIntegration(id: string, updates: Partial<Integration>): Promise<boolean> {
  try {
    const refPath = ref(database, `integrations/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteIntegration(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `integrations/${id}`));
    return true;
  } catch {
    return false;
  }
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  try {
    const refPath = ref(database, 'automation_rules');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: AutomationRule[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as AutomationRule);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createAutomationRule(data: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'automation_rules');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<boolean> {
  try {
    const refPath = ref(database, `automation_rules/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteAutomationRule(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `automation_rules/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// AI CONVERSATION FUNCTIONS
// ----------------------------------------------------

export async function getAiConversations(): Promise<AiConversation[]> {
  try {
    const refPath = ref(database, 'ai_conversations');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: AiConversation[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as AiConversation);
    });
    return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch {
    return [];
  }
}

export async function createAiConversation(data: Omit<AiConversation, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'ai_conversations');
    const newRef = push(refPath);
    const now = new Date().toISOString();
    await set(newRef, cleanData({ ...data, created_at: now, updated_at: now }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateAiConversation(id: string, updates: Partial<AiConversation>): Promise<boolean> {
  try {
    const refPath = ref(database, `ai_conversations/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteAiConversation(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `ai_conversations/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// TEAM MEMBER FUNCTIONS
// ----------------------------------------------------

export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const refPath = ref(database, 'team_members');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: TeamMember[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as TeamMember);
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function getTeamMember(id: string): Promise<TeamMember | null> {
  try {
    const refPath = ref(database, `team_members/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return null;
    return { id: snapshot.key, ...snapshot.val() } as TeamMember;
  } catch {
    return null;
  }
}

export async function createTeamMember(data: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'team_members');
    const newRef = push(refPath);
    const now = new Date().toISOString();
    await set(newRef, cleanData({ ...data, created_at: now, updated_at: now }));

    const admins = await getAdmins();
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New Team Member Added',
        message: `${data.name} has been added as a team member.`,
        type: 'system',
        link: `/admin/team`,
        read: false
      });
    }

    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<boolean> {
  try {
    const refPath = ref(database, `team_members/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export async function deleteTeamMember(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `team_members/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// SALARY PAYMENT FUNCTIONS
// ----------------------------------------------------

export async function getSalaryPayments(teamMemberId?: string): Promise<SalaryPayment[]> {
  try {
    const refPath = ref(database, 'salary_payments');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: SalaryPayment[] = [];
    snapshot.forEach((child) => {
      const item = { id: child.key, ...child.val() } as SalaryPayment;
      if (!teamMemberId || item.team_member_id === teamMemberId) {
        items.push(item);
      }
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createSalaryPayment(data: Omit<SalaryPayment, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'salary_payments');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function deleteSalaryPayment(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `salary_payments/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// PROJECT FILE FUNCTIONS
// ----------------------------------------------------

export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  try {
    const refPath = ref(database, 'project_files');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: ProjectFile[] = [];
    snapshot.forEach((child) => {
      const item = { id: child.key, ...child.val() } as ProjectFile;
      if (item.project_id === projectId) {
        items.push(item);
      }
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createProjectFile(data: Omit<ProjectFile, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'project_files');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function deleteProjectFile(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `project_files/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ----------------------------------------------------
// PROJECT UPDATE FUNCTIONS
// ----------------------------------------------------

export async function getProjectUpdates(projectId: string): Promise<ProjectUpdate[]> {
  try {
    const refPath = ref(database, 'project_updates');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: ProjectUpdate[] = [];
    snapshot.forEach((child) => {
      const item = { id: child.key, ...child.val() } as ProjectUpdate;
      if (item.project_id === projectId) {
        items.push(item);
      }
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createProjectUpdate(data: Omit<ProjectUpdate, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'project_updates');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// SUPPORT MESSAGE FUNCTIONS
// ----------------------------------------------------

export async function getSupportMessages(requestId: string): Promise<SupportMessage[]> {
  try {
    const refPath = ref(database, 'support_messages');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: SupportMessage[] = [];
    snapshot.forEach((child) => {
      const item = { id: child.key, ...child.val() } as SupportMessage;
      if (item.support_request_id === requestId) {
        items.push(item);
      }
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createSupportMessage(data: Omit<SupportMessage, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'support_messages');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ----------------------------------------------------
// PAYMENT FUNCTIONS
// ----------------------------------------------------

export async function getPayments(): Promise<Payment[]> {
  try {
    const refPath = ref(database, 'transactions');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const items: Payment[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Payment);
    });

    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function getPayment(id: string): Promise<Payment | null> {
  try {
    const refPath = ref(database, `transactions/${id}`);
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return null;
    return { id: snapshot.key, ...snapshot.val() } as Payment;
  } catch {
    return null;
  }
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<boolean> {
  try {
    const refPath = ref(database, `transactions/${id}`);
    await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}
