'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      api.setToken(null);
      setToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check local storage token
      const storedToken = localStorage.getItem('phenonode_token');
      if (storedToken) {
        api.setToken(storedToken);
        setToken(storedToken);
        try {
          const res = await api.auth.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            setIsLoading(false);
            return;
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('phenonode_token');
          api.setToken(null);
          setToken(null);
          setUser(null);
        }
      }

      // 2. Check Supabase session (e.g. from Google OAuth redirect)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const supaToken = session.access_token;
          api.setToken(supaToken);
          setToken(supaToken);

          // Attempt to get backend profile or construct from session
          try {
            const res = await api.auth.getMe();
            if (res.success && res.data) {
              setUser(res.data);
            } else {
              // Fallback user from OAuth metadata
              const oauthUser: User = {
                id: session.user.id,
                auth_user_id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
                role: 'USER',
                status: 'ACTIVE',
                created_at: session.user.created_at,
              };
              setUser(oauthUser);
            }
          } catch {
            const oauthUser: User = {
              id: session.user.id,
              auth_user_id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
              role: 'USER',
              status: 'ACTIVE',
              created_at: session.user.created_at,
            };
            setUser(oauthUser);
          }
        }
      } catch {
        // No active supabase session
      }

      setIsLoading(false);
    };

    initAuth();

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        api.setToken(session.access_token);
        setToken(session.access_token);
        try {
          const res = await api.auth.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            setUser({
              id: session.user.id,
              auth_user_id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
              role: 'USER',
              status: 'ACTIVE',
              created_at: session.user.created_at,
            });
          }
        } catch {
          setUser({
            id: session.user.id,
            auth_user_id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
            role: 'USER',
            status: 'ACTIVE',
            created_at: session.user.created_at,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        api.setToken(null);
        setToken(null);
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('phenonode_token', newToken);
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    localStorage.removeItem('phenonode_token');
    api.setToken(null);
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const signInWithGoogle = async () => {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
