// @ts-nocheck
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { subscribeToRoles } from '@/lib/db/roles/api';
import { subscribeToProjectsData } from '@/lib/db/projects/api';
import { Role, ModulePermissions } from '@/lib/db/types';

interface PermissionsContextType {
  permissions: Record<string, ModulePermissions> | null;
  loading: boolean;
  hasPermission: (module: string, action: 'view' | 'edit' | 'delete') => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: null,
  loading: true,
  hasPermission: () => false,
});

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspace?.id) {
      setLoading(false);
      return;
    }

    const unsubRoles = subscribeToRoles(workspace.id, (fetchedRoles) => {
      setRoles(fetchedRoles);
    });

    const unsubProjects = subscribeToProjectsData(workspace.id, (data) => {
      if (user?.email) {
        const member = (data.members || []).find(m => (m.email || '').toLowerCase() === user.email?.toLowerCase());
        if (member) {
          setUserRoleId(member.role || null);
        } else if (user.role === 'admin' || workspace.owner_id === user.id) {
          // Fallback to Admin role for workspace owners
          setUserRoleId('Admin');
        }
      }
      setLoading(false);
    });

    return () => {
      unsubRoles();
      unsubProjects();
    };
  }, [workspace?.id, user]);

  const activeRole = roles.find(r => r.id === userRoleId || r.name === userRoleId);
  const permissions = activeRole?.permissions || null;

  const hasPermission = (module: string, action: 'view' | 'edit' | 'delete') => {
    // Admins and Workspace Owners always have full access, even if roles are missing
    if (user?.role === 'Admin' || user?.role === 'admin' || workspace?.owner_id === user?.id) {
      return true;
    }

    if (!permissions) return false;
    const modPerms = permissions[module];
    if (!modPerms) return false;
    return modPerms[action];
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, hasPermission }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
