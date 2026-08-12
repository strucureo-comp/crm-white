'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { ref, set, get, child } from 'firebase/database';
import { auth, database } from './config';
import { User, UserRole } from '@/lib/db/types';
import { createUser } from './database';
import { getUserWorkspace, getUserWorkspaces, createWorkspace, findWorkspaceByName, createWorkspaceMember } from '@/lib/workspace/api';
import { getPendingInvitesByEmail, Invite } from '@/lib/workspace/invites';
import type { Workspace } from '@/lib/db/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  workspace: Workspace | null;
  workspaceRole: string | null;
  workspaceLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; hasInvites?: boolean }>;
  createInitialWorkspace: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; success: boolean }>;
  refreshUser: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  availableWorkspaces: Workspace[];
  pendingInvites: Invite[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<Workspace[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);

  const fetchUser = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = ref(database, `users/${firebaseUser.uid}`);
      const snapshot = await get(userRef);

      let resolvedUser: User | null = null;

      if (snapshot.exists()) {
        const userData = snapshot.val();
        resolvedUser = {
          id: firebaseUser.uid,
          user_id: firebaseUser.uid,
          email: firebaseUser.email!,
          ...userData,
        };
      } else {
        // User record doesn't exist yet, create a minimal user object
        resolvedUser = {
          id: firebaseUser.uid,
          user_id: firebaseUser.uid,
          company_id: '',
          email: firebaseUser.email!,
          full_name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      
      
      setUser(resolvedUser);
      
      // Load pending invites
      if (resolvedUser) {
        try {
          const invites = await getPendingInvitesByEmail(resolvedUser.email);
          setPendingInvites(invites);
        } catch (e) {
          console.error('Error fetching pending invites:', e);
        }
      }
      
      return resolvedUser;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      let resolvedUser: User | null = null;
      
      // Handle permission denied errors gracefully
      if (errorMsg.includes('Permission denied')) {
        console.warn('Firebase permission denied. Using minimal user profile.');
        
        // Default to client role; admin access managed via platform_admins collection
        resolvedUser = {
          id: firebaseUser.uid,
          user_id: firebaseUser.uid,
          company_id: '',
          email: firebaseUser.email!,
          full_name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        console.error('Error fetching user:', error);
      }
      
      if (resolvedUser) setUser(resolvedUser);
      return resolvedUser;
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUser(auth.currentUser);
    }
  };

  const fetchWorkspace = async (userId: string, companyId?: string) => {
    try {
      setWorkspaceLoading(true);
      let ws = await getUserWorkspace(userId);
      
      // Auto-heal broken users who have a workspace but no company_id (from older sign-up race conditions)
      if (ws && (!companyId || companyId === '')) {
        const { getCompanies } = await import('@/lib/db/companies/api');
        const companies = await getCompanies(ws.id);
        if (companies && companies.length > 0) {
          const trueCompanyId = companies[0].company_id;
          
          // Heal the user state globally
          setUser(prev => prev ? { ...prev, company_id: trueCompanyId } : null);
          
          // Heal the user record in Firebase
          const userRef = ref(database, `users/${userId}`);
          try {
            await import('firebase/database').then(({ update }) => {
              update(userRef, { company_id: trueCompanyId });
            });
          } catch (e) {
            console.error('Failed to auto-heal user company_id in DB', e);
          }
        }
      }
      
      if (!ws && companyId) {
        const { findCompanyById } = await import('@/lib/workspace/api');
        const companyInfo = await findCompanyById(companyId);
        if (companyInfo) {
          ws = {
            id: companyInfo.workspaceId,
            workspace_id: companyInfo.workspaceId,
            name: companyInfo.name,
            slug: companyInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            owner_id: userId,
            setup_completed: true,
            setup_step: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
      }
      
      
      setWorkspace(ws);
      
      // Fetch workspace role
      if (ws) {
        const { getUserWorkspaceRole } = await import('@/lib/workspace/api');
        const roleData = await getUserWorkspaceRole(userId, ws.id);
        if (roleData) {
          setWorkspaceRole(roleData.role);
        } else {
          setWorkspaceRole(null);
        }
      } else {
        setWorkspaceRole(null);
      }
      
      // Load all available workspaces
      try {
        const workspaces = await getUserWorkspaces(userId);
        if (ws && !workspaces.some(w => w.id === ws!.id)) {
            workspaces.unshift(ws);
        }
        setAvailableWorkspaces(workspaces);
      } catch (e) {
        console.error('Error fetching all workspaces:', e);
      }
      
    } catch (error) {
      console.error('Error fetching workspace:', error);
      setWorkspace(null);
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;
    try {
      // 1. Update the user document in database
      const userRef = ref(database, `users/${user.id}`);
      await import('firebase/database').then(({ update }) => {
        update(userRef, { company_id: workspaceId });
      });
      // 2. Update local state
      setUser(prev => prev ? { ...prev, company_id: workspaceId } : null);
      // 3. Re-fetch workspace data
      await fetchWorkspace(user.id, workspaceId);
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const refreshWorkspace = async () => {
    if (user) {
      await fetchWorkspace(user.id, user.company_id);
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        const resolvedUser = await fetchUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, companyId: resolvedUser?.company_id }),
          });
        } catch (e) {
          console.error('Failed to set session cookie:', e);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setWorkspace(null);
        setWorkspaceRole(null);
        try {
          await fetch('/api/auth/session', { method: 'DELETE' });
        } catch (e) {
          console.error('Failed to clear session cookie:', e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch workspace when user changes
  useEffect(() => {
    if (user && !loading) {
      fetchWorkspace(user.id, user.company_id);
    }
  }, [user, loading]);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { error: null };
    } catch (error) {
      console.error('Firebase Sign-in Error:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    existingCompanyId?: string,
    existingWorkspaceId?: string
  ) => {
    try {
      // Check for pending invites BEFORE creating Firebase Auth user
      let invitesForEmail: Invite[] = [];
      try {
        invitesForEmail = await getPendingInvitesByEmail(email);
      } catch (e) {
        console.warn('Could not check pending invites during sign-up:', e);
      }
      const hasInvites = invitesForEmail.length > 0;

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // If the user has pending invites, skip workspace creation entirely.
      if (hasInvites) {
        const userData: Omit<User, 'id' | 'user_id'> = {
          company_id: '',
          email: newUser.email!,
          full_name: fullName,
          role: 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await createUser(newUser.uid, userData);
        setPendingInvites(invitesForEmail);
        await refreshUser();
        
        return { error: null, hasInvites: true };
      }

      // No invites — auto-create a workspace and company
      let finalRole: UserRole = existingCompanyId ? 'client' : 'admin';
      let resolvedCompanyId = existingCompanyId || '';
      let resolvedWorkspaceId = existingWorkspaceId || '';

      if (!resolvedWorkspaceId) {
        const wsName = `${fullName}'s Workspace`;
        const workspace = await createWorkspace(wsName, newUser.uid);
        
        if (workspace) {
          resolvedWorkspaceId = workspace.id;
          setWorkspace(workspace);
          
          const { createCompany } = await import('@/lib/db/companies/api');
          const newCompany = await createCompany(workspace.id, {
            name: `${fullName}'s Company`,
            legal_name: `${fullName}'s Company`,
            website: '', phone: '', email: email, address: '', city: '', state: '', country: '', pincode: '',
            gst_number: '', pan_number: '', vat_number: '', registration_number: '',
            currency: 'USD', timezone: 'UTC',
            bank_name: '', account_number: '', ifsc: '', swift: '', upi: '',
            logo_url: '', footer_text: ''
          });
          
          resolvedCompanyId = newCompany.company_id;
        }
      }

      const userData: Omit<User, 'id' | 'user_id'> = {
        company_id: resolvedCompanyId,
        email: newUser.email!,
        full_name: fullName,
        role: finalRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createUser(newUser.uid, userData);
      
      await refreshUser();
      if (resolvedWorkspaceId) {
        await fetchWorkspace(newUser.uid, resolvedCompanyId);
      }

      return { error: null, hasInvites: false };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const createInitialWorkspace = async () => {
    if (!user) return;
    
    try {
      const wsName = `${user.full_name}'s Workspace`;
      const newWorkspace = await createWorkspace(wsName, user.id);
      
      if (newWorkspace) {
        const { createCompany } = await import('@/lib/db/companies/api');
        const newCompany = await createCompany(newWorkspace.id, {
          name: `${user.full_name}'s Company`,
          legal_name: `${user.full_name}'s Company`,
          website: '', phone: '', email: user.email, address: '', city: '', state: '', country: '', pincode: '',
          gst_number: '', pan_number: '', vat_number: '', registration_number: '',
          currency: 'USD', timezone: 'UTC',
          bank_name: '', account_number: '', ifsc: '', swift: '', upi: '',
          logo_url: '', footer_text: ''
        });
        
        // Update user record
        const userRef = ref(database, `users/${user.id}`);
        await import('firebase/database').then(({ update }) => {
          update(userRef, { company_id: newCompany.company_id, role: 'admin' });
        });
        
        await refreshUser();
        await fetchWorkspace(user.id, newCompany.company_id);
      }
    } catch (error) {
      console.error('Failed to create initial workspace', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Sign out error:', e);
    } finally {
      setUser(null);
      setFirebaseUser(null);
      setWorkspace(null);
      setWorkspaceRole(null);
      window.location.href = '/auth/login';
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null, success: true };
    } catch (error) {
      console.error('Reset Password Error:', error);
      return { error: error as Error, success: false };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        workspace,
        workspaceRole,
        workspaceLoading,
        signIn,
        signUp,
        createInitialWorkspace,
        signOut,
        resetPassword,
        refreshUser,
        refreshWorkspace,
        availableWorkspaces,
        pendingInvites,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
