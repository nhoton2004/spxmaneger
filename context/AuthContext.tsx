'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase';

export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  assignedShops: string[];
  createdAt: string;
  updatedAt: string;
  disabled?: boolean;
}

interface AuthContextType {
  user: any;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  const fetchUserProfile = async (uid: string) => {
    try {
      const { data, error: err } = await supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();

      if (err && err.code !== 'PGRST116') {
        console.error('Error fetching user profile:', err);
        return null;
      }

      if (data) {
        setUserProfile(data as UserProfile);
        return data;
      }

      return null;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  const createDefaultUserProfile = async (uid: string, email: string, displayName?: string) => {
    try {
      const profile: UserProfile = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        role: 'user',
        assignedShops: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: err } = await supabase
        .from('users')
        .insert([profile]);

      if (err) {
        console.error('Error creating user profile:', err);
        return null;
      }

      setUserProfile(profile);
      return profile;
    } catch (err) {
      console.error('Error creating user profile:', err);
      return null;
    }
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    await fetchUserProfile(user.id);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error: err } = await supabase.auth.getSession();

        if (err) {
          console.error('Error getting session:', err);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          
          let profile = await fetchUserProfile(session.user.id);
          if (!profile) {
            profile = await createDefaultUserProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.displayName
            );
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          let profile = await fetchUserProfile(session.user.id);
          if (!profile && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
            profile = await createDefaultUserProfile(
              session.user.id,
              session.user.email || '',
              session.user.user_metadata?.displayName
            );
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (err) {
        setError(err.message);
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      throw err;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { displayName: displayName || email.split('@')[0] },
        },
      });

      if (err) {
        setError(err.message);
        throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      const { error: err } = await supabase.auth.signOut();

      if (err) {
        setError(err.message);
        throw err;
      }

      setUser(null);
      setUserProfile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        refreshUserProfile,
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
