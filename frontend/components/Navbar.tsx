'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#E8EEF5]/70 backdrop-blur-xl border-b border-white/60 transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
            PHENONODE<span className="text-emerald-500">.</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-9 text-xs font-medium text-slate-600">
          <a href="#about" className="hover:text-slate-950 transition-colors">
            About
          </a>
          <a href="#technology" className="hover:text-slate-950 transition-colors">
            Technology
          </a>
          <a href="#how-it-works" className="hover:text-slate-950 transition-colors">
            How It Works
          </a>
          <a href="#fusion" className="hover:text-slate-950 transition-colors">
            Sensor Fusion
          </a>
        </nav>

        {/* Action button */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm active:scale-95"
            >
              <span>Dashboard</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm active:scale-95"
              >
                <span>Get Started</span>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-slate-950 focus:outline-none"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-white/60 bg-[#E8EEF5]/95 backdrop-blur-2xl px-6 py-6 space-y-4">
          <nav className="flex flex-col gap-4 text-sm font-medium text-slate-800">
            <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-1">
              About
            </a>
            <a href="#technology" onClick={() => setMobileMenuOpen(false)} className="py-1">
              Technology
            </a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="py-1">
              How It Works
            </a>
            <a href="#fusion" onClick={() => setMobileMenuOpen(false)} className="py-1">
              Sensor Fusion
            </a>
          </nav>
          <div className="pt-4 border-t border-slate-300/60 flex flex-col gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="w-full text-center px-5 py-3 text-xs font-semibold text-white bg-slate-950 rounded-full"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full text-center px-5 py-3 text-xs font-semibold text-slate-900 border border-slate-300 rounded-full bg-white/60"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="w-full text-center px-5 py-3 text-xs font-semibold text-white bg-slate-950 rounded-full"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
