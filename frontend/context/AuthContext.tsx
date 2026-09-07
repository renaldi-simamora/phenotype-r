'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { User } from '../types';
import { api, setOnUnauthorized, AUTH_STORAGE_KEYS, PRIMARY_AUTH_KEY, isTokenExpired } from '../lib/api';
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
  const isLoggingOutRef = useRef(false);

  // Helper to read the active auth token from localStorage (including Supabase session)
  const getStoredToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(PRIMARY_AUTH_KEY);
      if (val && val.trim().length > 0) {
        return val.trim();
      }
      const fallback = localStorage.getItem('phenonode_token');
      if (fallback && fallback.trim().length > 0) {
        return fallback.trim();
      }
      // Check Supabase session keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '');
            if (parsed?.access_token) return parsed.access_token;
          } catch {
            // ignore
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Centralized logout function - cleans state, tokens, and redirects to landing page '/'
  const logout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      // 1. Sign out Supabase session if any
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore Supabase sign out network/session errors
      }

      // 2. Clean all authentication storage keys
      if (typeof window !== 'undefined') {
        try {
          AUTH_STORAGE_KEYS.forEach((key) => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
          // Clean Supabase auth session keys matching sb-*-auth-token
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              localStorage.removeItem(key);
            }
          }
          for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
              sessionStorage.removeItem(key);
            }
          }
        } catch {
          // Handle storage access errors in strict sandboxes
        }
      }

      // 3. Clear API client & in-memory state
      api.setToken(null);
      setToken(null);
      setUser(null);
      setIsLoading(false);

      // 4. Final destination for any unauthenticated state: Landing Page '/'
      // (Do NOT redirect if user is deliberately on login or register pages)
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path !== '/' && path !== '/login' && path !== '/register') {
          router.replace('/');
          // Fallback if client-side router transition is blocked
          setTimeout(() => {
            if (
              window.location.pathname !== '/' &&
              window.location.pathname !== '/login' &&
              window.location.pathname !== '/register'
            ) {
              window.location.replace('/');
            }
          }, 150);
        }
      }
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [router]);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        await logout();
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
        if (isTokenExpired(storedToken)) {
          // Token is expired -> run centralized logout and redirect '/'
          if (isMounted) {
            await logout();
          }
          return;
        }

        api.setToken(storedToken);
        if (isMounted) setToken(storedToken);
        try {
          const res = await api.auth.getMe();
          if (isMounted && res.success && res.data) {
            setUser(res.data);
            setIsLoading(false);
            return;
          } else {
            if (isMounted) await logout();
            return;
          }
        } catch {
          // Token is invalid or rejected by backend (401)
          if (isMounted) {
            await logout();
          }
          return;
        }
      }

      // 2. Check Supabase session (e.g. Google OAuth redirect)
      try {
        const hasOAuthParam =
          typeof window !== 'undefined' &&
          (window.location.hash.includes('access_token') || window.location.search.includes('code='));
        const hasSupabaseStorage =
          typeof window !== 'undefined' &&
          Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));

        if (hasOAuthParam || hasSupabaseStorage) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.access_token) {
            const supaToken = session.access_token;
            if (isTokenExpired(supaToken)) {
              if (isMounted) await logout();
              return;
            }

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
                  full_name:
                    session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
                  role: 'USER',
                  status: 'ACTIVE',
                  created_at: session.user.created_at,
                };
                setUser(oauthUser);
              }
            } catch {
              if (isMounted) await logout();
              return;
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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' && session?.access_token) {
        if (isTokenExpired(session.access_token)) {
          logout();
          return;
        }
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
              full_name:
                session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
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
            full_name:
              session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Researcher',
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
      if (e.key === PRIMARY_AUTH_KEY || e.key === 'phenonode_token' || e.key?.startsWith('sb-')) {
        if (!e.newValue) {
          logout();
        } else if (isTokenExpired(e.newValue)) {
          logout();
        }
      } else if (e.key === null) {
        // Entire localStorage was cleared
        logout();
      }
    };

    // Active same-tab check: Check token presence and expiration
    const checkActiveToken = () => {
      if (token || user) {
        const currentStored = getStoredToken();
        if (!currentStored || isTokenExpired(currentStored)) {
          logout();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', checkActiveToken);
    document.addEventListener('visibilitychange', checkActiveToken);
    window.addEventListener('click', checkActiveToken, true);
    window.addEventListener('keydown', checkActiveToken, true);
    window.addEventListener('pageshow', checkActiveToken);

    // Heartbeat interval while user is authenticated (300ms)
    // Ensures same-tab DevTools token deletion is detected automatically without requiring any user click
    const interval = setInterval(checkActiveToken, 300);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', checkActiveToken);
      document.removeEventListener('visibilitychange', checkActiveToken);
      window.removeEventListener('click', checkActiveToken, true);
      window.removeEventListener('keydown', checkActiveToken, true);
      window.removeEventListener('pageshow', checkActiveToken);
      clearInterval(interval);
    };
  }, [token, user, getStoredToken, logout]);

  const login = (newToken: string, newUser: User) => {
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setIsLoading(false);
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
