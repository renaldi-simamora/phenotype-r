import React from 'react';
import Link from 'next/link';
import { Cpu } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/60 bg-white/40 backdrop-blur-xl text-slate-600 py-12 px-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand column */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-950 flex items-center justify-center text-white shadow-sm">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-base tracking-tight font-bold text-slate-950">
              PHENONODE.
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-md leading-relaxed">
            IoT multi-sensor measurement and machine-learning classification platform. Designed for academic research in phenotype characteristic identification using optical and physical sensor fusion.
          </p>
          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/80 text-[11px] text-slate-500 leading-normal">
            Research Disclaimer: This system is a research instrument. It does not perform medical diagnosis, biological identification, or genetic DNA sequencing.
          </div>
        </div>

        {/* Links column 1 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">System</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <a href="#features" className="hover:text-slate-950 transition-colors">
                Multi-Sensor Fusion
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="hover:text-slate-950 transition-colors">
                Pipeline Architecture
              </a>
            </li>
            <li>
              <a href="#technology" className="hover:text-slate-950 transition-colors">
                Hardware & ML Stack
              </a>
            </li>
          </ul>
        </div>

        {/* Links column 2 */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900">Access</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link href="/login" className="hover:text-slate-950 transition-colors">
                Operator Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="hover:text-slate-950 transition-colors">
                Subject Registration
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="hover:text-slate-950 transition-colors">
                System Console
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div>PHENONODE Platform. Final Year University Research Project.</div>
        <div>All rights reserved.</div>
      </div>
    </footer>
  );
}
