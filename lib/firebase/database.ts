import { ref, get, set, update, push, remove, query, orderByChild, equalTo, limitToLast, onValue, off } from 'firebase/database';
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
import { createContact } from '@/lib/db/contacts/api';
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
  FieldAgent,
  FieldAlert,
  ContentItem,
  MediaItem,
  CalendarEvent,
  Integration,
  AutomationRule,
  AiConversation,
  Campaign,
  SocialPost,
  Delivery,
  DeliveryItem,
  ActivityLog,
  EmailTemplate,
  EmailCampaign,
  EmailLog,
  Pipeline,
  PipelineStage,
  Contract,
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

// ===== Workspace-scoped path helpers =====
// All entities live under workspaces/${companyId}/${entity}
// companyId IS the workspace ID (confirmed by event bridge pattern)

function wsRef(companyId: string, entity: string) {
  return ref(database, `workspaces/${companyId}/${entity}`);
}

function wsItemRef(companyId: string, entity: string, id: string) {
  return ref(database, `workspaces/${companyId}/${entity}/${id}`);
}

// ===== Project Functions =====

export async function getProjects(companyId?: string, clientId?: string): Promise<Project[]> {
  try {
    if (!companyId) return [];
    const projectsRef = wsRef(companyId, 'projects');
    const snapshot = await get(projectsRef);

    if (!snapshot.exists()) return [];

    const projects: Project[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        if (companyId && (val as any).company_id !== companyId) continue;
        const project = { id: key, ...val } as Project;
        if (!clientId || project.client_id === clientId) {
          projects.push(project);
        }
      }
    }

    return projects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

export async function getProject(projectId: string): Promise<Project | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'projects', projectId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as Project;
    }
    return null;
  } catch (error) {
    console.error('Error getting project:', error);
    return null;
  }
}

export async function createProject(project: Omit<Project, 'id' | 'project_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const projectsRef = wsRef(project.company_id, 'projects');
    const newProjectRef = push(projectsRef);

    const projectData = cleanData({
      ...project,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newProjectRef, projectData);

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
    const project = await getProject(projectId);
    if (!project) return false;

    const projectRef = wsItemRef(project.company_id, 'projects', projectId);
    await update(projectRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (project) {
      await createNotification({
        user_id: project.client_id,
        title: 'Project Updated',
        message: `Your project "${project.title}" has been updated.`,
        type: 'project',
        link: `/projects/${projectId}`,
        read: false
      });

      const admins = await getAdmins(project.company_id);
      for (const admin of admins) {
        await createNotification({
          user_id: admin.id,
          title: 'Project Updated',
          message: `Project "${project.title}" has been updated.`,
          type: 'project',
          link: `/projects/${projectId}`,
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

export async function deleteProject(id: string): Promise<boolean> {
  try {
    const project = await getProject(id);
    if (!project) return false;
    const refPath = wsItemRef(project.company_id, 'projects', id);
    await remove(refPath);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    return false;
  }
}

// ===== Invoice Functions =====

export async function getInvoices(companyId: string, clientId?: string): Promise<Invoice[]> {
  try {
    if (!companyId) return [];
    const invoicesRef = wsRef(companyId, 'invoices');
    const snapshot = await get(invoicesRef);

    if (!snapshot.exists()) return [];

    const invoices: Invoice[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        const invoice = { id: key, ...val } as Invoice;
        if (!clientId || invoice.client_id === clientId) {
          invoices.push(invoice);
        }
      }
    }

    return invoices.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting invoices:', error);
    return [];
  }
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'invoices', invoiceId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as Invoice;
    }
    return null;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<boolean> {
  try {
    const invoice = await getInvoice(invoiceId);
    if (!invoice || !invoice.company_id) return false;

    const invoiceRef = wsItemRef(invoice.company_id, 'invoices', invoiceId);
    await update(invoiceRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (invoice && updates.status && updates.status === 'paid') {
      const admins = await getAdmins(invoice.company_id);
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

      await createNotification({
        user_id: invoice.contact_id || '',
        title: 'Payment Received',
        message: `We have received your payment for Invoice ${invoice.invoice_number}. Thank you!`,
        type: 'payment',
        link: `/invoices/${invoiceId}`,
        read: false
      });
    } else if (invoice) {
      await createNotification({
        user_id: invoice.contact_id || '',
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

export async function createInvoice(invoice: Omit<Invoice, 'id' | 'invoice_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    if (!invoice.company_id) return null;
    const invoicesRef = wsRef(invoice.company_id, 'invoices');
    const newInvoiceRef = push(invoicesRef);

    const invoiceData = cleanData({
      ...invoice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newInvoiceRef, invoiceData);

    await createNotification({
      user_id: invoice.contact_id || '',
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

export async function deleteInvoice(invoiceId: string): Promise<boolean> {
  try {
    const invoice = await getInvoice(invoiceId);
    if (!invoice || !invoice.company_id) return false;
    const invoiceRef = wsItemRef(invoice.company_id, 'invoices', invoiceId);
    await remove(invoiceRef);
    return true;
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return false;
  }
}

// ===== Support Request Functions =====

export async function getSupportRequests(companyId: string, clientId?: string): Promise<SupportRequest[]> {
  try {
    if (!companyId) return [];
    const supportRef = wsRef(companyId, 'support_requests');
    const snapshot = await get(supportRef);

    if (!snapshot.exists()) return [];

    const requests: SupportRequest[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        const request = { id: key, ...val } as SupportRequest;
        if (!clientId || request.client_id === clientId) {
          requests.push(request);
        }
      }
    }

    return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting support requests:', error);
    return [];
  }
}

export async function getSupportRequest(requestId: string): Promise<SupportRequest | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'support_requests', requestId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as SupportRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting support request:', error);
    return null;
  }
}

export async function updateSupportRequest(requestId: string, updates: Partial<SupportRequest>): Promise<boolean> {
  try {
    const request = await getSupportRequest(requestId);
    if (!request) return false;

    const supportRef = wsItemRef(request.company_id, 'support_requests', requestId);
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

export async function createSupportRequest(request: Omit<SupportRequest, 'id' | 'support_request_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const supportRef = wsRef(request.company_id, 'support_requests');
    const newRequestRef = push(supportRef);

    const requestData = cleanData({
      ...request,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRequestRef, requestData);

    const admins = await getAdmins(request.company_id);
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

// ===== User Functions =====

export async function getUsers(companyId?: string): Promise<User[]> {
  try {
    if (companyId) {
      const usersRef = wsRef(companyId, 'users');
      const snapshot = await get(usersRef);
      if (!snapshot.exists()) return [];
      const users: User[] = [];
      const data = snapshot.val();
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object') {
          users.push({ id: key, ...val } as User);
        }
      }
      return users;
    }

    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return [];
    const users: User[] = [];
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snapshot = await get(wsRef(wsKey, 'users'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') {
            users.push({ id: key, ...val } as User);
          }
        }
      }
    }
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

export async function getUser(userId: string): Promise<User | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'users', userId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function createUser(userId: string, userData: Omit<User, 'id'>): Promise<boolean> {
  try {
    const userRef = wsItemRef(userData.company_id, 'users', userId);
    await set(userRef, cleanData(userData));

    const admins = await getAdmins(userData.company_id);
    for (const admin of admins) {
      await createNotification({
        user_id: admin.id,
        title: 'New User Registered',
        message: `${userData.full_name} has registered as a ${userData.role}.`,
        type: 'system',
        link: `/admin/users`,
        read: false
      });
    }

    await sendWelcomeEmail(userData.email, userData.full_name);

    return true;
  } catch (error) {
    console.error('Error creating user:', error);
    return false;
  }
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<boolean> {
  try {
    const user = await getUser(userId);
    if (!user) return false;
    const userRef = wsItemRef(user.company_id, 'users', userId);
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
    const user = await getUser(userId);
    if (!user) return false;
    const userRef = wsItemRef(user.company_id, 'users', userId);
    await remove(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

async function getAdmins(companyId?: string): Promise<User[]> {
  const allUsers = await getUsers(companyId);
  return allUsers.filter(u => u.role === 'admin');
}

// ===== Notification Functions (global) =====

export async function createNotification(notification: Omit<Notification, 'id' | 'notification_id' | 'created_at'>): Promise<string | null> {
  try {
    const notificationsRef = ref(database, 'notifications');
    const newNotificationRef = push(notificationsRef);

    const notificationData = cleanData({
      ...notification,
      created_at: new Date().toISOString(),
    });

    await set(newNotificationRef, notificationData);

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

// ===== Invitation Functions (global) =====

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

// ===== Meeting Request Functions =====

export async function createMeetingRequest(meeting: Omit<MeetingRequest, 'id' | 'meeting_request_id' | 'created_at' | 'updated_at' | 'status'>): Promise<string | null> {
  try {
    const meetingsRef = wsRef(meeting.company_id, 'meeting_requests');
    const newMeetingRef = push(meetingsRef);

    const meetingData = cleanData({
      ...meeting,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newMeetingRef, meetingData);

    const admins = await getAdmins(meeting.company_id);
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
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'meeting_requests', meetingId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as MeetingRequest;
    }
    return null;
  } catch (error) {
    console.error('Error getting meeting:', error);
    return null;
  }
}

export async function updateMeeting(meetingId: string, updates: Partial<MeetingRequest>): Promise<boolean> {
  try {
    const meeting = await getMeeting(meetingId);
    if (!meeting) return false;

    const meetingRef = wsItemRef(meeting.company_id, 'meeting_requests', meetingId);
    await update(meetingRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));

    if (meeting && updates.status && updates.status !== meeting.status) {
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

// ===== Transaction Functions =====

export async function getTransactions(companyId: string): Promise<Transaction[]> {
  try {
    if (!companyId) return [];
    const transactionsRef = wsRef(companyId, 'transactions');
    const snapshot = await get(transactionsRef);

    if (!snapshot.exists()) return [];

    const transactions: Transaction[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        transactions.push({ id: key, ...val } as Transaction);
      }
    }

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function createTransaction(transaction: Omit<Transaction, 'id' | 'transaction_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const transactionsRef = wsRef(transaction.company_id, 'transactions');
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
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'transactions', transactionId));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'transactions', transactionId));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return false;
  }
}

// ===== System Settings (global) =====

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

// ===== Planning Notes (global) =====

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

export async function createPlanningNote(note: Omit<PlanningNote, 'id' | 'planning_note_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

// ===== Quotation Functions =====

export async function getQuotations(companyId: string, clientId?: string): Promise<Quotation[]> {
  try {
    if (!companyId) return [];
    const quotRef = wsRef(companyId, 'quotations');
    const snapshot = await get(quotRef);

    if (!snapshot.exists()) return [];

    const quotations: Quotation[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        const quotation = { id: key, ...val } as Quotation;
        if (!clientId || quotation.client_id === clientId) {
          quotations.push(quotation);
        }
      }
    }

    return quotations.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting quotations:', error);
    return [];
  }
}

export async function getQuotation(quotationId: string): Promise<Quotation | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'quotations', quotationId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as Quotation;
    }
    return null;
  } catch (error) {
    console.error('Error getting quotation:', error);
    return null;
  }
}

export async function createQuotation(quotation: Omit<Quotation, 'id' | 'quote_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const quotationsRef = wsRef(quotation.company_id, 'quotations');
    const newQuotationRef = push(quotationsRef);

    const quotationData = cleanData({
      ...quotation,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newQuotationRef, quotationData);

    await createNotification({
      user_id: quotation.client_id,
      title: 'New Quotation Received',
      message: `You have received a new quotation ${quotation.quotation_number}.`,
      type: 'payment',
      link: `/quotations`,
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
    const quotation = await getQuotation(quotationId);
    if (!quotation) return false;

    const quotationRef = wsItemRef(quotation.company_id, 'quotations', quotationId);
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

export async function deleteQuotation(quotationId: string): Promise<boolean> {
  try {
    const quotation = await getQuotation(quotationId);
    if (!quotation) return false;
    const quotationRef = wsItemRef(quotation.company_id, 'quotations', quotationId);
    await remove(quotationRef);
    return true;
  } catch (error) {
    console.error('Error deleting quotation:', error);
    return false;
  }
}

export async function convertQuotationToInvoice(quotation: Quotation): Promise<string | null> {
  try {
    const invoiceId = await createInvoice({
      project_id: quotation.project_id || '',
      client_id: quotation.client_id,
      workspace_id: quotation.company_id,
      company_id: quotation.company_id,
      contact_id: quotation.client_id,
      deal_id: '',
      quote_id: quotation.id,
      invoice_number: `INV-${Date.now()}`,
      items: (quotation.items || []).map((item, idx) => ({
        item_id: `item-${idx}`,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        tax_rate: 0,
      })),
      subtotal: quotation.amount,
      discount: 0,
      discount_type: 'percentage',
      tax: 0,
      tax_rate: 0,
      total: quotation.amount,
      amount: quotation.amount,
      currency: 'USD',
      status: 'pending',
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      paid_date: '',
      amount_paid: 0,
      amount_due: quotation.amount,
      notes: '',
      terms_and_conditions: '',
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
    const invoice = await getInvoice(invoiceId);
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
      company_id: invoice?.company_id || '',
    });

    return true;
  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return false;
  }
}

// ===== Enquiry Functions =====

export async function getEnquiries(companyId: string): Promise<Enquiry[]> {
  try {
    if (!companyId) return [];
    const enqRef = wsRef(companyId, 'enquiries');
    const snapshot = await get(enqRef);

    if (!snapshot.exists()) return [];

    const enquiries: Enquiry[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        enquiries.push({ id: key, ...val } as Enquiry);
      }
    }

    return enquiries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting enquiries:', error);
    return [];
  }
}

export async function createEnquiry(enquiry: Omit<Enquiry, 'id' | 'enquiry_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    if (!enquiry.company_id) return null;
    const refPath = wsRef(enquiry.company_id, 'enquiries');
    const newRef = push(refPath);

    const data = cleanData({
      ...enquiry,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRef, data);

    if (enquiry.company_id) {
      try {
        await createLead({
          company_id: enquiry.company_id,
          name: enquiry.name,
          email: enquiry.email,
          phone: enquiry.phone || '',
          status: 'new',
          source: 'Website',
          owner_id: '',
          notes: enquiry.message || '',
        });
      } catch (leadError) {
        console.error('Failed to auto-create lead from enquiry:', leadError);
      }
    }

    return newRef.key;
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return null;
  }
}

export async function updateEnquiry(id: string, updates: Partial<Enquiry>): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'enquiries', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'enquiries', id);
        await update(refPath, cleanData({
          ...updates,
          updated_at: new Date().toISOString(),
        }));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return false;
  }
}

// ===== Task Functions =====

export async function getTasks(companyId?: string): Promise<TaskItem[]> {
  try {
    if (companyId) {
      const refPath = wsRef(companyId, 'tasks');
      const snapshot = await get(refPath);

      if (!snapshot.exists()) return [];

      const tasks: TaskItem[] = [];
      const data = snapshot.val();
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object') {
          tasks.push({ id: key, ...val } as TaskItem);
        }
      }

      return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return [];
    const tasks: TaskItem[] = [];
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snapshot = await get(wsRef(wsKey, 'tasks'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        for (const [key, val] of Object.entries(data)) {
          if (val && typeof val === 'object') {
            tasks.push({ id: key, ...val } as TaskItem);
          }
        }
      }
    }
    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
}

export async function createTask(task: Omit<TaskItem, 'id' | 'task_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(task.company_id, 'tasks');
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
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'tasks', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'tasks', id);
        await update(refPath, cleanData({
          ...updates,
          updated_at: new Date().toISOString(),
        }));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error updating task:', error);
    return false;
  }
}

export async function deleteTask(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'tasks', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'tasks', id));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting task:', error);
    return false;
  }
}

export async function getTaskColumns(): Promise<string[]> {
  try {
    const refPath = ref(database, 'settings/task_columns');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return ['To Do', 'In Progress', 'Review', 'Done'];
    return snapshot.val() as string[];
  } catch (error) {
    console.error('Error getting task columns:', error);
    return ['To Do', 'In Progress', 'Review', 'Done'];
  }
}

export async function saveTaskColumns(columns: string[]): Promise<boolean> {
  try {
    const refPath = ref(database, 'settings/task_columns');
    await set(refPath, columns);
    return true;
  } catch (error) {
    console.error('Error saving task columns:', error);
    return false;
  }
}

// ===== Lead Functions =====

export async function getLeads(companyId?: string): Promise<Lead[]> {
  try {
    if (!companyId) return [];

    const refPath = wsRef(companyId, 'leads');
    const snapshot = await get(refPath);

    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    const leads: Lead[] = [];
    
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        leads.push({ id: key, ...val } as Lead);
      }
    }

    return leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting leads:', error);
    return [];
  }
}

export function subscribeToLeads(companyId: string, callback: (leads: Lead[]) => void): () => void {
  const refPath = wsRef(companyId, 'leads');
  const unsubscribe = onValue(refPath, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const leads: Lead[] = [];
      for (const [key, val] of Object.entries(data)) {
        if (val && typeof val === 'object' && (val as any).company_id === companyId) {
          leads.push({ id: key, ...(val as object) } as Lead);
        }
      }
      callback(leads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } else {
      callback([]);
    }
  });
  return () => off(refPath, 'value', unsubscribe);
}

export async function createLead(lead: Omit<Lead, 'id' | 'lead_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(lead.company_id, 'leads');
    const newRef = push(refPath);

    const data = cleanData({
      ...lead,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newRef, data);

    try {
      await createContact(lead.company_id || 'default', {
        name: lead.name,
        email: lead.email,
        company_id: lead.company_id || '',
        phone: lead.phone || '',
        is_primary: true,
        notes: lead.notes || '',
      });
    } catch (contactError) {
      console.error('Failed to auto-create contact for lead:', contactError);
    }

    return newRef.key;
  } catch (error) {
    console.error('Error creating lead:', error);
    return null;
  }
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'leads', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'leads', id);
        await update(refPath, cleanData({
          ...updates,
          updated_at: new Date().toISOString(),
        }));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error updating lead:', error);
    return false;
  }
}

export async function deleteLead(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'leads', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'leads', id));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error deleting lead:', error);
    return false;
  }
}

// ===== Field Agent Functions =====

export async function getFieldAgents(companyId: string): Promise<FieldAgent[]> {
  try {
    if (!companyId) return [];
    const refPath = ref(database, 'field_agents');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: FieldAgent[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        items.push({ id: key, ...val } as FieldAgent);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createFieldAgent(data: Omit<FieldAgent, 'id' | 'field_agent_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

export async function getFieldAlerts(companyId: string): Promise<FieldAlert[]> {
  try {
    if (!companyId) return [];
    const refPath = ref(database, 'field_alerts');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: FieldAlert[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        items.push({ id: key, ...val } as FieldAlert);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createFieldAlert(data: Omit<FieldAlert, 'id' | 'field_alert_id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'field_alerts');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ===== Content Item Functions =====

export async function getContentItems(companyId: string): Promise<ContentItem[]> {
  try {
    if (!companyId) return [];
    const refPath = wsRef(companyId, 'content_items');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: ContentItem[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        items.push({ id: key, ...val } as ContentItem);
      }
    }
    return items.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch {
    return [];
  }
}

export async function createContentItem(data: Omit<ContentItem, 'id' | 'content_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(data.company_id, 'content_items');
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
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'content_items', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'content_items', id);
        await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteContentItem(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'content_items', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'content_items', id));
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ===== Media Item Functions =====

export async function getMediaItems(companyId: string): Promise<MediaItem[]> {
  try {
    if (!companyId) return [];
    const refPath = ref(database, 'media_items');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: MediaItem[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object') {
        items.push({ id: key, ...val } as MediaItem);
      }
    }
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

// ===== Calendar Event Functions (global) =====

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

export async function createCalendarEvent(data: Omit<CalendarEvent, 'id' | 'calendar_event_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

// ===== Integration Functions (global) =====

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

export async function createIntegration(data: Omit<Integration, 'id' | 'integration_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

// ===== Automation Rule Functions =====

export async function getAutomationRules(companyId: string): Promise<AutomationRule[]> {
  try {
    if (!companyId) return [];
    const refPath = wsRef(companyId, 'automation_rules');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: AutomationRule[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        items.push({ id: key, ...val } as AutomationRule);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return [];
  }
}

export async function createAutomationRule(data: Omit<AutomationRule, 'id' | 'rule_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(data.company_id, 'automation_rules');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function updateAutomationRule(id: string, updates: Partial<AutomationRule>): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'automation_rules', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'automation_rules', id);
        await update(refPath, cleanData({ ...updates, updated_at: new Date().toISOString() }));
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteAutomationRule(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'automation_rules', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'automation_rules', id));
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ===== AI Conversation Functions (global) =====

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

export async function createAiConversation(data: Omit<AiConversation, 'id' | 'ai_conversation_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

// ===== Team Member Functions (global) =====

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

export async function createTeamMember(data: Omit<TeamMember, 'id' | 'team_member_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
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

// ===== Salary Payment Functions (global) =====

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

export async function createSalaryPayment(data: Omit<SalaryPayment, 'id' | 'salary_payment_id' | 'created_at'>): Promise<string | null> {
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

// ===== Project File Functions (global) =====

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

export async function createProjectFile(data: Omit<ProjectFile, 'id' | 'project_file_id' | 'created_at'>): Promise<string | null> {
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

// ===== Project Update Functions (global) =====

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

export async function createProjectUpdate(data: Omit<ProjectUpdate, 'id' | 'project_update_id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'project_updates');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ===== Support Message Functions (global) =====

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

export async function createSupportMessage(data: Omit<SupportMessage, 'id' | 'support_message_id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'support_messages');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

// ===== Payment Functions (global - reads from transactions) =====

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

export async function createPayment(data: Omit<Payment, 'id' | 'payment_id' | 'created_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'transactions');
    const newRef = push(refPath);
    await set(newRef, cleanData({ ...data, created_at: new Date().toISOString() }));
    return newRef.key;
  } catch {
    return null;
  }
}

export async function deletePayment(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `transactions/${id}`));
    return true;
  } catch {
    return false;
  }
}

// ===== Campaign Functions =====

export async function getCampaigns(companyId: string): Promise<Campaign[]> {
  try {
    if (!companyId) return [];
    const refPath = wsRef(companyId, 'campaigns');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Campaign[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        items.push({ id: key, ...val } as Campaign);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch { return []; }
}

export async function createCampaign(data: Omit<Campaign, 'id' | 'campaign_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(data.company_id, 'campaigns');
    const newRef = push(refPath);
    const campaign = { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    await set(newRef, campaign);
    await createNotification({
      user_id: 'system', title: 'Campaign Created', message: `Campaign "${data.name}" created`,
      type: 'system', link: '/campaigns', read: false,
    });
    return newRef.key;
  } catch { return null; }
}

export async function updateCampaign(id: string, updates: Partial<Campaign>): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'campaigns', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'campaigns', id);
        await update(refPath, { ...updates, updated_at: new Date().toISOString() });
        return true;
      }
    }
    return false;
  } catch { return false; }
}

export async function deleteCampaign(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'campaigns', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'campaigns', id));
        return true;
      }
    }
    return false;
  } catch { return false; }
}

// ===== Social Post Functions (global) =====

export async function getSocialPosts(): Promise<SocialPost[]> {
  try {
    const refPath = ref(database, 'social_posts');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: SocialPost[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as SocialPost);
    });
    return items.sort((a, b) => new Date(b.scheduled_at || 0).getTime() - new Date(a.scheduled_at || 0).getTime());
  } catch { return []; }
}

export async function createSocialPost(data: Omit<SocialPost, 'id' | 'social_post_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'social_posts');
    const newRef = push(refPath);
    await set(newRef, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

export async function updateSocialPost(id: string, updates: Partial<SocialPost>): Promise<boolean> {
  try {
    await update(ref(database, `social_posts/${id}`), { ...updates, updated_at: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function deleteSocialPost(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `social_posts/${id}`));
    return true;
  } catch { return false; }
}

// ===== Delivery Functions (global) =====

export async function getDeliveries(): Promise<Delivery[]> {
  try {
    const refPath = ref(database, 'deliveries');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Delivery[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Delivery);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch { return []; }
}

export async function createDelivery(data: Omit<Delivery, 'id' | 'delivery_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'deliveries');
    const newRef = push(refPath);
    await set(newRef, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

export async function updateDelivery(id: string, updates: Partial<Delivery>): Promise<boolean> {
  try {
    await update(ref(database, `deliveries/${id}`), { ...updates, updated_at: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function deleteDelivery(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `deliveries/${id}`));
    return true;
  } catch { return false; }
}

// ===== Activity Log Functions =====

export async function getActivityLogs(companyId: string, limitCount: number = 50): Promise<ActivityLog[]> {
  try {
    if (!companyId) return [];
    const logsRef = wsRef(companyId, 'activity_logs');
    const snapshot = await get(logsRef);
    if (!snapshot.exists()) return [];
    const items: ActivityLog[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        items.push({ id: key, ...val } as ActivityLog);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limitCount);
  } catch { return []; }
}

export async function createActivityLog(data: Omit<ActivityLog, 'id' | 'created_at'>): Promise<string | null> {
  try {
    if (!data.company_id) return null;
    const refPath = wsRef(data.company_id, 'activity_logs');
    const newRef = push(refPath);
    await set(newRef, { ...data, created_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

// ===== Email Template Functions (global) =====

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  try {
    const refPath = ref(database, 'email_templates');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: EmailTemplate[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as EmailTemplate);
    });
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch { return []; }
}

export async function createEmailTemplate(data: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'email_templates');
    const newRef = push(refPath);
    await set(newRef, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

export async function updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<boolean> {
  try {
    await update(ref(database, `email_templates/${id}`), { ...updates, updated_at: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function deleteEmailTemplate(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `email_templates/${id}`));
    return true;
  } catch { return false; }
}

// ===== Email Campaign Functions =====

export async function getEmailCampaigns(companyId: string): Promise<EmailCampaign[]> {
  try {
    if (!companyId) return [];
    const refPath = wsRef(companyId, 'email_campaigns');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: EmailCampaign[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        items.push({ id: key, ...val } as EmailCampaign);
      }
    }
    return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch { return []; }
}

export async function createEmailCampaign(data: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const refPath = wsRef(data.company_id, 'email_campaigns');
    const newRef = push(refPath);
    await set(newRef, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

export async function updateEmailCampaign(id: string, updates: Partial<EmailCampaign>): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'email_campaigns', id));
      if (snap.exists()) {
        const refPath = wsItemRef(wsKey, 'email_campaigns', id);
        await update(refPath, { ...updates, updated_at: new Date().toISOString() });
        return true;
      }
    }
    return false;
  } catch { return false; }
}

export async function deleteEmailCampaign(id: string): Promise<boolean> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return false;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'email_campaigns', id));
      if (snap.exists()) {
        await remove(wsItemRef(wsKey, 'email_campaigns', id));
        return true;
      }
    }
    return false;
  } catch { return false; }
}

// ===== Email Log Functions (global) =====

export async function getEmailLogs(campaignId?: string): Promise<EmailLog[]> {
  try {
    const refPath = ref(database, 'email_logs');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: EmailLog[] = [];
    snapshot.forEach((child) => {
      const log = { id: child.key, ...child.val() } as EmailLog;
      if (!campaignId || log.campaign_id === campaignId) items.push(log);
    });
    return items.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  } catch { return []; }
}

export async function createEmailLog(data: Omit<EmailLog, 'id'>): Promise<string | null> {
  try {
    const refPath = ref(database, 'email_logs');
    const newRef = push(refPath);
    await set(newRef, { ...data, sent_at: new Date().toISOString() });
    return newRef.key;
  } catch { return null; }
}

// ===== Pipeline Functions (global) =====

export async function getPipelines(): Promise<Pipeline[]> {
  try {
    const refPath = ref(database, 'pipelines');
    const snapshot = await get(refPath);
    if (!snapshot.exists()) return [];
    const items: Pipeline[] = [];
    snapshot.forEach((child) => {
      items.push({ id: child.key, ...child.val() } as Pipeline);
    });
    return items;
  } catch { return []; }
}

export async function getPipeline(id: string): Promise<Pipeline | null> {
  try {
    const snapshot = await get(ref(database, `pipelines/${id}`));
    if (!snapshot.exists()) return null;
    return { id: snapshot.key, ...snapshot.val() } as Pipeline;
  } catch { return null; }
}

export async function createPipeline(data: Omit<Pipeline, 'id' | 'pipeline_id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const newRef = push(ref(database, 'pipelines'));
    await set(newRef, { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    await createActivityLog({ action: 'project_created', description: `Created pipeline: ${data.name}`, entity_type: 'pipeline', entity_id: newRef.key || '', user_id: 'system', user_name: 'System', title: 'Pipeline Created', metadata: {} });
    return newRef.key;
  } catch { return null; }
}

export async function updatePipeline(id: string, updates: Partial<Pipeline>): Promise<boolean> {
  try {
    await update(ref(database, `pipelines/${id}`), { ...updates, updated_at: new Date().toISOString() });
    return true;
  } catch { return false; }
}

export async function deletePipeline(id: string): Promise<boolean> {
  try {
    await remove(ref(database, `pipelines/${id}`));
    return true;
  } catch { return false; }
}

// ===== Contract Functions =====

export async function getContracts(companyId: string): Promise<Contract[]> {
  try {
    if (!companyId) return [];
    const contractsRef = wsRef(companyId, 'contracts');
    const snapshot = await get(contractsRef);

    if (!snapshot.exists()) return [];

    const contracts: Contract[] = [];
    const data = snapshot.val();
    for (const [key, val] of Object.entries(data)) {
      if (val && typeof val === 'object' && (val as any).company_id === companyId) {
        contracts.push({ id: key, ...val } as Contract);
      }
    }

    return contracts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Error getting contracts:', error);
    return [];
  }
}

export async function getContract(contractId: string): Promise<Contract | null> {
  try {
    const workspacesSnap = await get(ref(database, 'workspaces'));
    if (!workspacesSnap.exists()) return null;
    for (const wsKey of Object.keys(workspacesSnap.val())) {
      const snap = await get(wsItemRef(wsKey, 'contracts', contractId));
      if (snap.exists()) return { id: snap.key!, ...snap.val() } as Contract;
    }
    return null;
  } catch (error) {
    console.error('Error getting contract:', error);
    return null;
  }
}

export async function createContract(contract: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<string | null> {
  try {
    const contractsRef = wsRef(contract.company_id, 'contracts');
    const newContractRef = push(contractsRef);

    const contractData = cleanData({
      ...contract,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await set(newContractRef, contractData);
    return newContractRef.key;
  } catch (error) {
    console.error('Error creating contract:', error);
    return null;
  }
}

export async function updateContract(contractId: string, updates: Partial<Contract>): Promise<boolean> {
  try {
    const contract = await getContract(contractId);
    if (!contract) return false;

    const contractRef = wsItemRef(contract.company_id, 'contracts', contractId);
    await update(contractRef, cleanData({
      ...updates,
      updated_at: new Date().toISOString(),
    }));
    return true;
  } catch (error) {
    console.error('Error updating contract:', error);
    return false;
  }
}

export async function deleteContract(contractId: string): Promise<boolean> {
  try {
    const contract = await getContract(contractId);
    if (!contract) return false;
    const contractRef = wsItemRef(contract.company_id, 'contracts', contractId);
    await remove(contractRef);
    return true;
  } catch (error) {
    console.error('Error deleting contract:', error);
    return false;
  }
}
