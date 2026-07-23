'use client';

import { ref, get, set, push, update, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/db/types';

const WORKSPACES_PATH = 'workspaces';
const WORKSPACE_MEMBERS_PATH = 'workspace_members';
const PLATFORM_ADMINS_PATH = 'platform_admins';

const SUPER_ADMIN_EMAILS = [
  'viyasramachandran@gmail.com',
  'aathish@strucureo.works',
  'aathihacker2004@gmail.com',
];

// ===== WORKSPACE CRUD =====

export async function createWorkspace(
  name: string,
  ownerId: string,
  slug?: string
): Promise<Workspace | null> {
  try {
    const workspaceSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const workspaceRef = push(ref(database, WORKSPACES_PATH));
    const workspaceId = workspaceRef.key!;

    const workspace: Workspace = {
      id: workspaceId,
      name,
      slug: workspaceSlug,
      owner_id: ownerId,
      setup_completed: false,
      setup_step: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await set(workspaceRef, workspace);

    // Add owner as workspace member
    await createWorkspaceMember(workspaceId, ownerId, 'owner');

    return workspace;
  } catch (error) {
    console.error('Error creating workspace:', error);
    return null;
  }
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  try {
    const snapshot = await get(ref(database, `${WORKSPACES_PATH}/${workspaceId}`));
    if (snapshot.exists()) {
      return snapshot.val() as Workspace;
    }
    return null;
  } catch (error) {
    console.error('Error fetching workspace:', error);
    return null;
  }
}

export async function getUserWorkspace(userId: string): Promise<Workspace | null> {
  try {
    // Find workspace where user is a member
    const memberSnapshot = await get(ref(database, WORKSPACE_MEMBERS_PATH));
    if (!memberSnapshot.exists()) return null;

    const members = memberSnapshot.val() as Record<string, WorkspaceMember>;
    const userMembership = Object.values(members).find(m => m.user_id === userId);

    if (!userMembership) return null;

    return getWorkspace(userMembership.workspace_id);
  } catch (error) {
    console.error('Error fetching user workspace:', error);
    return null;
  }
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Workspace>
): Promise<boolean> {
  try {
    await update(ref(database, `${WORKSPACES_PATH}/${workspaceId}`), {
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error updating workspace:', error);
    return false;
  }
}

export async function completeWorkspaceSetup(workspaceId: string): Promise<boolean> {
  return updateWorkspace(workspaceId, {
    setup_completed: true,
    setup_step: 5,
  });
}

// ===== WORKSPACE MEMBERS =====

export async function createWorkspaceMember(
  workspaceId: string,
  userId: string,
  role: WorkspaceRole,
  invitedBy?: string
): Promise<WorkspaceMember | null> {
  try {
    const memberRef = push(ref(database, WORKSPACE_MEMBERS_PATH));
    const memberId = memberRef.key!;

    const member: WorkspaceMember = {
      id: memberId,
      workspace_id: workspaceId,
      user_id: userId,
      role,
      invited_by: invitedBy,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await set(memberRef, member);
    return member;
  } catch (error) {
    console.error('Error creating workspace member:', error);
    return null;
  }
}

export async function getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  try {
    const snapshot = await get(ref(database, WORKSPACE_MEMBERS_PATH));
    if (!snapshot.exists()) return [];

    const members = snapshot.val() as Record<string, WorkspaceMember>;
    return Object.values(members).filter(m => m.workspace_id === workspaceId);
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    return [];
  }
}

export async function getUserWorkspaceRole(userId: string): Promise<{ workspace: Workspace; role: WorkspaceRole } | null> {
  try {
    const memberSnapshot = await get(ref(database, WORKSPACE_MEMBERS_PATH));
    if (!memberSnapshot.exists()) return null;

    const members = memberSnapshot.val() as Record<string, WorkspaceMember>;
    const userMembership = Object.values(members).find(m => m.user_id === userId);

    if (!userMembership) return null;

    const workspace = await getWorkspace(userMembership.workspace_id);
    if (!workspace) return null;

    return { workspace, role: userMembership.role };
  } catch (error) {
    console.error('Error fetching user workspace role:', error);
    return null;
  }
}

// ===== PLATFORM ADMINS =====

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  try {
    // Check hardcoded list first
    const userSnapshot = await get(ref(database, `users/${userId}`));
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val();
      if (SUPER_ADMIN_EMAILS.includes(userData.email?.toLowerCase())) {
        return true;
      }
    }

    // Check platform_admins collection
    const snapshot = await get(ref(database, PLATFORM_ADMINS_PATH));
    if (!snapshot.exists()) return false;

    const admins = snapshot.val() as Record<string, { user_id: string }>;
    return Object.values(admins).some(a => a.user_id === userId);
  } catch (error) {
    console.error('Error checking platform admin:', error);
    return false;
  }
}

// ===== HELPERS =====

export function generateWorkspaceSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
