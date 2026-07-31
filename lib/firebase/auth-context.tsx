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
import { getUserWorkspace, createWorkspace, findWorkspaceByName, createWorkspaceMember } from '@/lib/workspace/api';
import type { Workspace } from '@/lib/db/types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  workspace: Workspace | null;
  workspaceLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null; success: boolean }>;
  refreshUser: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

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
      return resolvedUser;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      let resolvedUser: User | null = null;
      
      // Handle permission denied errors gracefully
      if (errorMsg.includes('Permission denied')) {
        console.warn('Firebase permission denied. Using minimal user profile.');
        
        // Check if this is a known admin email
        const adminEmails = [
          'viyasramachandran@gmail.com',
          'aathish@strucureo.works',
          'aathihacker2004@gmail.com',
        ];
        const isAdmin = adminEmails.includes(firebaseUser.email?.toLowerCase() || '');
        
        // Still allow user to access the app with basic info
        resolvedUser = {
          id: firebaseUser.uid,
          user_id: firebaseUser.uid,
          company_id: '',
          email: firebaseUser.email!,
          full_name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: isAdmin ? 'admin' : 'client',
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
    } catch (error) {
      console.error('Error fetching workspace:', error);
      setWorkspace(null);
    } finally {
      setWorkspaceLoading(false);
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
    companyName?: string,
    existingCompanyId?: string,
    existingWorkspaceId?: string
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Check if this email is a known admin
      const adminEmails = [
        'viyasramachandran@gmail.com',
        'aathish@strucureo.works',
        'aathihacker2004@gmail.com',
      ];
      // The first user who signs up gets marked as 'admin' (unless they are invited to an existing company)
      let finalRole: UserRole = existingCompanyId ? 'client' : (adminEmails.includes(email.toLowerCase()) ? 'admin' : 'admin');

      let resolvedCompanyId = existingCompanyId || '';
      let resolvedWorkspaceId = existingWorkspaceId || '';

      if (!existingWorkspaceId && companyName) {
        const { findCompanyGlobalByName } = await import('@/lib/workspace/api');
        const existingCompany = await findCompanyGlobalByName(companyName);
        if (existingCompany) {
          resolvedWorkspaceId = existingCompany.workspaceId;
          resolvedCompanyId = existingCompany.companyId;
          finalRole = 'client';
          // Add user to workspace first so they have permission to read companies
          await createWorkspaceMember(resolvedWorkspaceId, newUser.uid, 'client');
        }
      }

      if (!resolvedWorkspaceId) {
        // 1. When a brand new company signs up, create workspace first
        const wsName = companyName || `${fullName}'s Workspace`;
        const workspace = await createWorkspace(wsName, newUser.uid);
        
        if (workspace) {
          resolvedWorkspaceId = workspace.id;
          setWorkspace(workspace);
          
          // Create the new record in the companies table
          const { createCompany } = await import('@/lib/db/companies/api');
          const newCompany = await createCompany(workspace.id, {
            name: companyName || `${fullName}'s Company`,
            legal_name: companyName || `${fullName}'s Company`,
            website: '', phone: '', email: email, address: '', city: '', state: '', country: '', pincode: '',
            gst_number: '', pan_number: '', vat_number: '', registration_number: '',
            currency: 'USD', timezone: 'UTC',
            bank_name: '', account_number: '', ifsc: '', swift: '', upi: '',
            logo_url: '', footer_text: ''
          });
          
          resolvedCompanyId = newCompany.company_id;
        }
      }

      // 2 & 3. Link the user to the new or existing company_id
      const userData: Omit<User, 'id' | 'user_id'> = {
        company_id: resolvedCompanyId,
        email: newUser.email!,
        full_name: fullName,
        role: finalRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createUser(newUser.uid, userData);
      
      // Fix the race condition: fetch the fresh data now that DB writes are done
      await refreshUser();
      if (resolvedWorkspaceId) {
        await fetchWorkspace(newUser.uid, resolvedCompanyId);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
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
        workspaceLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        refreshUser,
        refreshWorkspace,
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
