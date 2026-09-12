'use client';

import React from 'react';
import Link from 'next/link';
import { Menu, Plus, Radio } from 'lucide-react';

interface TopbarProps {
  onOpenMobile?: () => void;
  title?: string;
  subtitle?: string;
}

export function Topbar({ onOpenMobile, title = 'Console', subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-white/60 bg-[#E8EEF5]/70 backdrop-blur-xl px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-white/60 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-sm font-bold text-slate-950 tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Software-only simulation indicator (hardware not integrated) */}
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/90 bg-white/80 backdrop-blur-md text-slate-600 text-xs font-medium shadow-2xs">
          <Radio className="w-3.5 h-3.5 text-slate-400" />
          <span>Software-Only Simulation</span>
        </div>

        {/* Quick action button */}
        <Link
          href="/measurement"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Measurement</span>
        </Link>
      </div>
    </header>
  );
}
