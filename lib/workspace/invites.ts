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
    email: email.trim().toLowerCase(),
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
    const q = query(invitesRef, orderByChild('email'), equalTo(email.trim().toLowerCase()));
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
        if (invite.status === 'pending' && invite.email?.trim().toLowerCase() === email.trim().toLowerCase()) {
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

export async function acceptWorkspaceInvite(
  invite: Invite, 
  user: { id: string; email?: string; full_name?: string }
): Promise<void> {
  await updateInviteStatus(invite.id, 'accepted');
  
  // 1. Create workspace member
  const { createWorkspaceMember } = await import('@/lib/workspace/api');
  await createWorkspaceMember(invite.workspace_id, user.id, invite.role as any, invite.invited_by);
  
  // 2. Sync / update status in project_members
  try {
    const projMembersRef = ref(database, `project_members/${invite.workspace_id}`);
    const snap = await get(projMembersRef);
    if (snap.exists()) {
      const data = snap.val();
      for (const [key, val] of Object.entries<any>(data)) {
        if (val && val.email && val.email.trim().toLowerCase() === invite.email.trim().toLowerCase()) {
          await update(ref(database, `project_members/${invite.workspace_id}/${key}`), {
            status: 'Active',
            name: user.full_name || val.name || invite.email.split('@')[0]
          });
          return;
        }
      }
    }
    
    // If not found in project_members, insert active member
    const mName = user.full_name || invite.email.split('@')[0];
    const initials = mName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const roleCapitalized = invite.role ? invite.role.charAt(0).toUpperCase() + invite.role.slice(1) : 'Viewer';
    const newRef = push(projMembersRef);
    await set(newRef, {
      name: mName,
      email: invite.email,
      role: roleCapitalized,
      status: 'Active',
      avatar: initials,
      projectIds: []
    });
  } catch (err) {
    console.warn('Could not sync project_members on invite accept:', err);
  }
}

export async function deleteInvite(inviteId: string): Promise<void> {
  const inviteRef = ref(database, `invites/${inviteId}`);
  await remove(inviteRef);
}
