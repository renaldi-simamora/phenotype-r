'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { api, setOnUnauthorized, AUTH_STORAGE_KEYS } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Helper to read any saved auth token
  const getStoredToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      for (const key of AUTH_STORAGE_KEYS) {
        const val = localStorage.getItem(key);
        if (val && val.trim().length > 0) return val.trim();
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Centralized logout function - cleans state, tokens, and redirects to landing page '/'
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore Supabase sign out network/session errors
    }

    // Clean all authentication storage keys
    if (typeof window !== 'undefined') {
      try {
        AUTH_STORAGE_KEYS.forEach((key) => {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        });
      } catch {
        // Handle storage access errors in strict sandboxes
      }
    }

    api.setToken(null);
    setToken(null);
    setUser(null);

    // Final destination for any unauthenticated state: Landing Page '/'
    if (typeof window !== 'undefined') {
      // Use router replace to avoid pushing back button loop
      router.replace('/');
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch {
      await logout();
    }
  }, [logout]);

  // Initial Auth Check
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // 1. Check local storage token
      const storedToken = getStoredToken();
      if (storedToken) {
        api.setToken(storedToken);
        if (isMounted) setToken(storedToken);
        try {
          const res = await api.auth.getMe();
          if (isMounted && res.success && res.data) {
            setUser(res.data);
            setIsLoading(false);
            return;
          }
        } catch {
          // Token is invalid or expired
          if (isMounted) {
            api.setToken(null);
            setToken(null);
            setUser(null);
          }
        }
      }

      // 2. Check Supabase session (e.g. Google OAuth redirect)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const supaToken = session.access_token;
          api.setToken(supaToken);
          if (isMounted) setToken(supaToken);

          try {
            const res = await api.auth.getMe();
            if (isMounted && res.success && res.data) {
              setUser(res.data);
            } else if (isMounted) {
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
            if (isMounted) {
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
        }
      } catch {
        // No active supabase session
      }

      if (isMounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
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
        logout();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [getStoredToken, logout]);

  // Connect Centralized 401 callback from API Client
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });

    const handleCustom401 = () => {
      logout();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('phenotype:auth:401', handleCustom401);
    }

    return () => {
      setOnUnauthorized(null);
      if (typeof window !== 'undefined') {
        window.removeEventListener('phenotype:auth:401', handleCustom401);
      }
    };
  }, [logout]);

  // Active validation: Multi-tab storage event + DevTools same-tab token deletion listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Multi-tab storage event: Detects when token is deleted or cleared in another tab
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && AUTH_STORAGE_KEYS.includes(e.key as (typeof AUTH_STORAGE_KEYS)[number])) {
        if (!e.newValue) {
          logout();
        }
      } else if (e.key === null) {
        // Storage was cleared completely
        logout();
      }
    };

    // Active same-tab check: Check token presence on focus, visibility change, and gentle 1s interval
    const checkActiveToken = () => {
      if (token && user) {
        const currentStored = getStoredToken();
        if (!currentStored) {
          logout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkActiveToken);
    document.addEventListener('visibilitychange', checkActiveToken);

    // Heartbeat interval while user is authenticated (1000ms)
    const interval = setInterval(checkActiveToken, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkActiveToken);
      document.removeEventListener('visibilitychange', checkActiveToken);
      clearInterval(interval);
    };
  }, [token, user, getStoredToken, logout]);

  const login = (newToken: string, newUser: User) => {
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
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
