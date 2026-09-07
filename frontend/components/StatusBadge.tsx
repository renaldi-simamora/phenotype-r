import React from 'react';
import { DeviceStatus, MeasurementStatus } from '../types';

interface StatusBadgeProps {
  status: DeviceStatus | MeasurementStatus | string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  let style = 'bg-slate-100 text-slate-700 border-slate-200/90';

  switch (status) {
    case 'ONLINE':
    case 'COMPLETED':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200/90';
      break;
    case 'MEASURING':
    case 'IN_PROGRESS':
      style = 'bg-cyan-50 text-cyan-700 border-cyan-200/90 animate-pulse';
      break;
    case 'PENDING':
      style = 'bg-amber-50 text-amber-700 border-amber-200/90';
      break;
    case 'OFFLINE':
      style = 'bg-slate-100 text-slate-500 border-slate-200/80';
      break;
    case 'ERROR':
    case 'ML_PROCESSING_FAILED':
    case 'CANCELLED':
      style = 'bg-rose-50 text-rose-700 border-rose-200/90';
      break;
  }

  const padding = size === 'sm' ? 'px-3 py-0.5 text-[11px]' : 'px-3.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded-full border shadow-2xs ${padding} ${style}`}
    >
      {status}
    </span>
  );
}
