'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { Cpu } from 'lucide-react';
import { AUTH_STORAGE_KEYS } from '../../lib/api';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Protected Route Guard: If not authenticated, redirect immediately to landing page '/'
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle Browser Back Button (bfcache / pageshow) & instant active validation
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // If page was restored from bfcache or back navigation
      const hasValidToken = AUTH_STORAGE_KEYS.some((key) => {
        try {
          const val = localStorage.getItem(key);
          return val && val.trim().length > 0;
        } catch {
          return false;
        }
      });

      if (!hasValidToken || !isAuthenticated) {
        logout();
        router.replace('/');
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [isAuthenticated, logout, router]);

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
