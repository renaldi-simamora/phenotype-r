import React from 'react';

export function SkeletonLoader({
  className = 'h-6 w-full',
  rows = 1,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-3 w-full animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`bg-white/60 rounded-2xl border border-white/80 ${className}`}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-panel rounded-3xl p-6 space-y-4 animate-pulse">
      <div className="h-4 bg-slate-200/70 rounded-full w-1/3" />
      <div className="h-8 bg-slate-200/90 rounded-full w-2/3" />
      <div className="h-3 bg-slate-200/50 rounded-full w-1/2" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-200/60 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-slate-200/70 rounded-full w-4/5" />
        </td>
      ))}
    </tr>
  );
}
