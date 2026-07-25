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
import { getUserWorkspace, createWorkspace } from '@/lib/workspace/api';
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

      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          ...userData,
        });
      } else {
        // User record doesn't exist yet, create a minimal user object
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          full_name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
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
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          full_name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: isAdmin ? 'admin' : 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        console.error('Error fetching user:', error);
      }
    }
  };

  const refreshUser = async () => {
    if (auth.currentUser) {
      await fetchUser(auth.currentUser);
    }
  };

  const fetchWorkspace = async (userId: string) => {
    try {
      setWorkspaceLoading(true);
      const ws = await getUserWorkspace(userId);
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
      await fetchWorkspace(user.id);
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUser(firebaseUser);
        await fetchUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
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
      fetchWorkspace(user.id);
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

  const signUp = async (email: string, password: string, fullName: string, companyName?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      // Check if this email is a known admin
      const adminEmails = [
        'viyasramachandran@gmail.com',
        'aathish@strucureo.works',
        'aathihacker2004@gmail.com',
      ];
      const finalRole = adminEmails.includes(email.toLowerCase()) ? 'admin' : 'client';

      const userData: Omit<User, 'id'> = {
        email: newUser.email!,
        full_name: fullName,
        role: finalRole,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createUser(newUser.uid, userData);

      // Create workspace for the new user
      const wsName = companyName || `${fullName}'s Workspace`;
      const workspace = await createWorkspace(wsName, newUser.uid);
      if (workspace) {
        setWorkspace(workspace);
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
