'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  LayoutDashboard,
  PlayCircle,
  History,
  HardDrive,
  BarChart3,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    {
      group: 'MAIN',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Measurement', href: '/measurement', icon: PlayCircle },
        { label: 'History', href: '/history', icon: History },
      ],
    },
    {
      group: 'MONITORING',
      items: [
        { label: 'Device', href: '/device', icon: HardDrive },
        { label: 'Analytics', href: '/analytics', icon: BarChart3 },
      ],
    },
    {
      group: 'SYSTEM',
      items: [
        { label: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/20 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-white/80 bg-white/80 backdrop-blur-2xl flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Header */}
        <div>
          <div className="h-16 border-b border-slate-200/60 px-6 flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-white shadow-sm">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-base tracking-tight font-bold text-slate-950">
                PHENOTYPE.
              </span>
            </Link>
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="py-6 px-4 space-y-6">
            {navItems.map((group) => (
              <div key={group.group} className="space-y-1.5">
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.group}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-medium transition-all ${active
                            ? 'bg-slate-950 text-white shadow-sm font-semibold'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-white/70'
                          }`}
                      >
                        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Profile & Logout Bottom Bar */}
        <div className="p-4 border-t border-slate-200/60 space-y-3">
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.full_name || 'Subject'}
              </div>
              <div className="text-[10.5px] text-slate-400 truncate">
                {user?.email || 'user@phenotype.edu'}
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/80 uppercase">
              {user?.role || 'USER'}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-full text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50/80 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
