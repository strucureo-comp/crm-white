import { ref, set, get, push, query, orderByChild, equalTo, update, remove } from 'firebase/database';
import { database } from '@/lib/firebase/config';

export interface Invite {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export async function sendInvite(workspaceId: string, workspaceName: string, email: string, role: string, invitedBy: string): Promise<Invite> {
  const invitesRef = ref(database, 'invites');
  const newInviteRef = push(invitesRef);
  const inviteId = newInviteRef.key as string;
  
  const invite: Invite = {
    id: inviteId,
    workspace_id: workspaceId,
    workspace_name: workspaceName,
    email: email.toLowerCase(),
    role,
    invited_by: invitedBy,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  await set(newInviteRef, invite);
  return invite;
}

export async function getPendingInvitesByEmail(email: string): Promise<Invite[]> {
  try {
    const invitesRef = ref(database, 'invites');
    const q = query(invitesRef, orderByChild('email'), equalTo(email.toLowerCase()));
    const snapshot = await get(q);
    
    if (!snapshot.exists()) return [];
    
    const invites: Invite[] = [];
    snapshot.forEach((child) => {
      const invite = child.val() as Invite;
      if (invite.status === 'pending') {
        invites.push(invite);
      }
    });
    
    return invites;
  } catch (error: any) {
    // If Firebase index is missing, it throws. Fallback to client-side filtering.
    if (error?.message?.includes('Index not defined')) {
      console.warn('Falling back to client-side filtering for invites due to missing index.');
      const snapshot = await get(ref(database, 'invites'));
      if (!snapshot.exists()) return [];
      
      const invites: Invite[] = [];
      snapshot.forEach((child) => {
        const invite = child.val() as Invite;
        if (invite.status === 'pending' && invite.email.toLowerCase() === email.toLowerCase()) {
          invites.push(invite);
        }
      });
      return invites;
    }
    throw error;
  }
}

export async function getWorkspaceInvites(workspaceId: string): Promise<Invite[]> {
  const invitesRef = ref(database, 'invites');
  const q = query(invitesRef, orderByChild('workspace_id'), equalTo(workspaceId));
  const snapshot = await get(q);
  
  if (!snapshot.exists()) return [];
  
  const invites: Invite[] = [];
  snapshot.forEach((child) => {
    invites.push(child.val() as Invite);
  });
  
  return invites;
}

export async function updateInviteStatus(inviteId: string, status: 'accepted' | 'declined'): Promise<void> {
  const inviteRef = ref(database, `invites/${inviteId}`);
  await update(inviteRef, { status });
}

export async function deleteInvite(inviteId: string): Promise<void> {
  const inviteRef = ref(database, `invites/${inviteId}`);
  await remove(inviteRef);
}
