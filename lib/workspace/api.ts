'use client';

import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '@/lib/firebase/config';
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/db/types';
import { ensureDefaultRoles } from '@/lib/db/roles/api';

const WORKSPACES_PATH = 'workspaces';
const WORKSPACE_MEMBERS_PATH = 'workspace_members';
const PLATFORM_ADMINS_PATH = 'platform_admins';

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
      workspace_id: workspaceId,
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

    // Seed default RBAC roles
    await ensureDefaultRoles(workspaceId);

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

export async function findWorkspaceByName(name: string): Promise<Workspace | null> {
  try {
    const snapshot = await get(ref(database, WORKSPACES_PATH));
    if (!snapshot.exists()) return null;

    const workspaces = snapshot.val() as Record<string, Workspace>;
    const targetName = name.toLowerCase();

    for (const workspace of Object.values(workspaces)) {
      if (workspace.name.toLowerCase() === targetName) {
        return workspace;
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding workspace by name:', error);
    return null;
  }
}

export async function getUserWorkspace(userId: string): Promise<Workspace | null> {
  try {
    const membersRef = ref(database, WORKSPACE_MEMBERS_PATH);
    const memberSnapshot = await get(membersRef);
    
    if (!memberSnapshot.exists()) return null;

    const data = memberSnapshot.val();
    let targetWorkspaceId = '';
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && (value as any).user_id === userId) {
        targetWorkspaceId = (value as any).workspace_id;
        break;
      }
    }

    if (!targetWorkspaceId) return null;

    return getWorkspace(targetWorkspaceId);
  } catch (error) {
    console.error('Error fetching user workspace:', error);
    return null;
  }
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  try {
    const membersRef = ref(database, WORKSPACE_MEMBERS_PATH);
    const memberSnapshot = await get(membersRef);
    
    if (!memberSnapshot.exists()) return [];

    const data = memberSnapshot.val();
    const workspaceIds = new Set<string>();
    
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && (value as any).user_id === userId) {
        workspaceIds.add((value as any).workspace_id);
      }
    }

    if (workspaceIds.size === 0) return [];

    const workspaces: Workspace[] = [];
    for (const wid of Array.from(workspaceIds)) {
      const ws = await getWorkspace(wid);
      if (ws) workspaces.push(ws);
    }
    
    return workspaces;
  } catch (error) {
    console.error('Error fetching user workspaces:', error);
    return [];
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

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  try {
    // Basic nodes to delete
    const pathsToDelete = [
      `${WORKSPACES_PATH}/${workspaceId}`,
      `workspaces/${workspaceId}`,
      `workspace_members`,
      `invites`
    ];
    
    // 1. Delete all workspace_members for this workspace
    const membersRef = ref(database, WORKSPACE_MEMBERS_PATH);
    const memberSnap = await get(membersRef);
    if (memberSnap.exists()) {
      const data = memberSnap.val();
      for (const [key, value] of Object.entries(data)) {
        if ((value as any).workspace_id === workspaceId) {
          await remove(ref(database, `${WORKSPACE_MEMBERS_PATH}/${key}`));
        }
      }
    }
    
    // 2. Delete all invites for this workspace
    const invitesRef = ref(database, 'invites');
    const invitesSnap = await get(invitesRef);
    if (invitesSnap.exists()) {
      const data = invitesSnap.val();
      for (const [key, value] of Object.entries(data)) {
        if ((value as any).workspace_id === workspaceId) {
          await remove(ref(database, `invites/${key}`));
        }
      }
    }
    
    // 3. Delete the workspace object itself and all its nested subcollections
    // In our structure, workspaces/{id} contains leads, invoices, etc.
    await remove(ref(database, `workspaces/${workspaceId}`));
    
    return true;
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return false;
  }
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
      workspace_member_id: memberId,
      workspace_id: workspaceId,
      user_id: userId,
      role,
      ...(invitedBy ? { invited_by: invitedBy } : {}),
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

export async function getWorkspaceMembersWithDetails(workspaceId: string): Promise<Array<{id: string, name: string, email: string, role: string}>> {
  try {
    const members = await getWorkspaceMembers(workspaceId);
    if (members.length === 0) return [];

    // Fetch user details for all members
    const result = [];
    for (const m of members) {
      try {
        const userSnap = await get(ref(database, `users/${m.user_id}`));
        if (userSnap.exists()) {
          const user = userSnap.val();
          result.push({
            id: m.id,
            name: user.full_name || 'Unknown User',
            email: user.email || '',
            role: m.role,
          });
        }
      } catch (e) {
        console.error('Failed to fetch user details for member', m.user_id);
      }
    }
    return result;
  } catch (error) {
    console.error('Error in getWorkspaceMembersWithDetails:', error);
    return [];
  }
}

export async function getUserWorkspaceRole(userId: string, workspaceId?: string): Promise<{ workspace: Workspace; role: WorkspaceRole } | null> {
  try {
    const memberSnapshot = await get(ref(database, WORKSPACE_MEMBERS_PATH));
    if (!memberSnapshot.exists()) return null;

    const members = memberSnapshot.val() as Record<string, WorkspaceMember>;
    const userMembership = Object.values(members).find(m => m.user_id === userId && (!workspaceId || m.workspace_id === workspaceId));

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

export async function findCompanyById(companyId: string): Promise<{ name: string, workspaceId: string } | null> {
  try {
    const snapshot = await get(ref(database, 'workspaces'));
    if (!snapshot.exists()) return null;
    const workspaces = snapshot.val();
    
    for (const [workspaceId, workspace] of Object.entries<any>(workspaces)) {
      if (workspace.companies && workspace.companies[companyId]) {
        return { name: workspace.companies[companyId].name, workspaceId };
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding company by ID:', error);
    return null;
  }
}

export async function findCompanyGlobalByName(name: string): Promise<{ companyId: string, workspaceId: string } | null> {
  try {
    const snapshot = await get(ref(database, 'workspaces'));
    if (!snapshot.exists()) return null;
    const workspaces = snapshot.val();
    
    const targetName = name.toLowerCase();

    for (const [workspaceId, workspace] of Object.entries<any>(workspaces)) {
      if (workspace.companies) {
        for (const [companyId, company] of Object.entries<any>(workspace.companies)) {
          if (company.name && company.name.toLowerCase() === targetName) {
            return { companyId, workspaceId };
          }
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Error finding global company by name:', error);
    return null;
  }
}
