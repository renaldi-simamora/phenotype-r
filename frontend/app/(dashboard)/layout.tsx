'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { Cpu } from 'lucide-react';
import { PRIMARY_AUTH_KEY, isTokenExpired } from '../../lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Protected Route Guard: If unauthenticated, redirect immediately to landing page '/'
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        router.replace('/');
      }
    }
  }, [isAuthenticated, isLoading, logout, router]);

  // Active validation in protected layout: Browser Back/Forward (popstate/pageshow) & DevTools token deletion
  useEffect(() => {
    const hasActiveToken = (): boolean => {
      try {
        const primary = localStorage.getItem(PRIMARY_AUTH_KEY);
        if (primary && primary.trim().length > 0 && !isTokenExpired(primary)) return true;
        const fallback = localStorage.getItem('phenonode_token');
        if (fallback && fallback.trim().length > 0 && !isTokenExpired(fallback)) return true;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            try {
              const parsed = JSON.parse(localStorage.getItem(key) || '');
              if (parsed?.access_token && !isTokenExpired(parsed.access_token)) return true;
            } catch {
              // ignore
            }
          }
        }
        return false;
      } catch {
        return false;
      }
    };

    const verifyProtectedAccess = () => {
      if (!isLoading && !hasActiveToken()) {
        logout();
        if (typeof window !== 'undefined' && window.location.pathname !== '/') {
          router.replace('/');
        }
      }
    };

    // Immediate check once initialized
    if (!isLoading) {
      verifyProtectedAccess();
    }

    // Heartbeat interval inside protected route layout
    const interval = setInterval(verifyProtectedAccess, 500);

    const handlePageShow = () => {
      verifyProtectedAccess();
    };

    const handlePopState = () => {
      verifyProtectedAccess();
    };

    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('popstate', handlePopState);

    return () => {
      clearInterval(interval);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLoading, logout, router]);

  // Loading Screen: Avoid flash of dashboard content while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#E8EEF5] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center text-white shadow-md animate-pulse">
          <Cpu className="w-6 h-6" />
        </div>
        <div className="text-xs font-mono text-slate-500">Verifying session...</div>
      </div>
    );
  }

  // If unauthenticated, do NOT render protected layout or children
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#E8EEF5] text-slate-900 flex selection:bg-slate-900 selection:text-white">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-6 md:p-10 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
