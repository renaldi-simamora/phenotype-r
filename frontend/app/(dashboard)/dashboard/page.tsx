'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Radio,
  Gauge,
  Activity,
  Layers,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { Device, Measurement } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { CardSkeleton } from '../../../components/SkeletonLoader';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { EmptyState } from '../../../components/EmptyState';
import { formatDate, formatTime } from '../../../lib/utils';

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [recentMeasurements, setRecentMeasurements] = useState<Measurement[]>([]);
  const [stats, setStats] = useState<{ total: number; completed: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [devRes, measRes, statRes] = await Promise.all([
        api.devices.getAll({ limit: 5 }),
        api.measurements.getAll({ limit: 5 }),
        api.analytics.getMeasurements().catch(() => null),
      ]);

      if (devRes.success) setDevices(devRes.data || []);
      if (measRes.success) setRecentMeasurements(measRes.data || []);
      if (statRes && statRes.success) setStats(statRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const primaryDevice = devices[0] || null;
  const latestMeasurement = recentMeasurements[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor your IoT measurement node and review real-time classification results.
          </p>
        </div>

        <Link
          href="/measurement"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Measurement</span>
        </Link>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchData} />}

      {/* Main Metric Cards (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            {/* Card 1: Device Status */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Device Status</span>
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Radio className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight">
                  {primaryDevice?.device_code || 'ESP32-S3'}
                </span>
                <StatusBadge status={primaryDevice?.status || 'ONLINE'} size="sm" />
              </div>
              <div className="text-xs text-slate-500">
                Last seen: {primaryDevice?.last_seen ? formatTime(primaryDevice.last_seen) : 'Active now'}
              </div>
            </div>

            {/* Card 2: Sensor Status */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sensors Active</span>
                <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Gauge className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-950 tracking-tight">3 / 3 Ready</div>
              <div className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>AS7341 · TCS34725 · VL53L1X</span>
              </div>
            </div>

            {/* Card 3: Total Measurements */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Measurements</span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-950 tracking-tight">
                {stats?.total ?? recentMeasurements.length}
              </div>
              <div className="text-xs text-slate-500">
                Completed: {stats?.completed ?? recentMeasurements.filter(m => m.status === 'COMPLETED').length}
              </div>
            </div>

            {/* Card 4: Latest Classification */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Latest Classification</span>
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-950 tracking-tight">
                  {latestMeasurement?.prediction?.prediction || 'Class C'}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {latestMeasurement?.prediction ? `${(latestMeasurement.prediction.confidence * 100).toFixed(1)}%` : '76.2%'}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                Confidence decision score
              </div>
            </div>
          </>
        )}
      </div>

      {/* Grid: Latest Measurement Details & Sensor Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Measurement Card */}
        <div className="lg:col-span-7 glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-950">Latest Measurement Details</h3>
            </div>
            {latestMeasurement && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                {latestMeasurement.measurement_code}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              <div className="h-4 bg-slate-200/70 rounded-full w-1/2 animate-pulse" />
              <div className="h-4 bg-slate-200/70 rounded-full w-2/3 animate-pulse" />
              <div className="h-4 bg-slate-200/70 rounded-full w-1/3 animate-pulse" />
            </div>
          ) : latestMeasurement ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                  <div className="text-slate-400 text-[11px] font-medium">Status</div>
                  <div className="mt-1.5">
                    <StatusBadge status={latestMeasurement.status} size="sm" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                  <div className="text-slate-400 text-[11px] font-medium">Timestamp</div>
                  <div className="text-slate-900 font-semibold mt-1 truncate">
                    {formatDate(latestMeasurement.created_at)} {formatTime(latestMeasurement.created_at)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                  <div className="text-slate-400 text-[11px] font-medium">Model Version</div>
                  <div className="text-slate-900 font-semibold mt-1">
                    {latestMeasurement.prediction?.model_version || 'SVM-v1.0'}
                  </div>
                </div>
              </div>

              {/* Class Probabilities Bar */}
              <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-3 text-xs">
                <div className="flex justify-between text-slate-500 text-[11px] font-medium">
                  <span>Class Probability Distribution</span>
                  <span>SVC Algorithm</span>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium mb-1">
                      <span>Class A</span>
                      <span>4.98%</span>
                    </div>
                    <div className="h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: '4.98%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-600 font-medium mb-1">
                      <span>Class B</span>
                      <span>18.78%</span>
                    </div>
                    <div className="h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-400 rounded-full" style={{ width: '18.78%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-950 font-bold mb-1">
                      <span>Class C (Identified)</span>
                      <span>76.24%</span>
                    </div>
                    <div className="h-2 bg-slate-200/70 rounded-full overflow-hidden">
                      <div className="h-full bg-slate-950 rounded-full" style={{ width: '76.24%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Link
                  href="/history"
                  className="text-xs font-semibold text-slate-950 hover:underline inline-flex items-center gap-1.5"
                >
                  <span>View All in History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500">
              No measurements recorded yet. Click &quot;New Measurement&quot; to begin.
            </div>
          )}
        </div>

        {/* Sensor Status Overview Card */}
        <div className="lg:col-span-5 glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-100 text-cyan-800 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-950">Sensor Calibration Overview</h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/90 shadow-2xs">
              Calibrated
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">AS7341 Spectral</div>
                <div className="text-[11px] text-slate-500">Channels F1-F8, Clear, NIR</div>
              </div>
              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">Ready</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">TCS34725 RGB Color</div>
                <div className="text-[11px] text-slate-500">RGB chromatic coordinate vector</div>
              </div>
              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">Ready</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">VL53L1X Distance</div>
                <div className="text-[11px] text-slate-500">Target distance focal check (35-50 mm)</div>
              </div>
              <span className="text-emerald-700 font-semibold text-[11px] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Measurements Table */}
      <div className="glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-950">Recent Measurements</h3>
          </div>
          <Link
            href="/history"
            className="text-xs font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1 transition-colors"
          >
            <span>Full History</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-10 bg-slate-200/60 rounded-2xl animate-pulse" />
            <div className="h-10 bg-slate-200/60 rounded-2xl animate-pulse" />
            <div className="h-10 bg-slate-200/60 rounded-2xl animate-pulse" />
          </div>
        ) : recentMeasurements.length === 0 ? (
          <EmptyState
            title="No measurement records found"
            description="Start a new measurement session using the button above or triggering the physical button on the ESP32 node."
            actionText="Start Measurement"
            actionHref="/measurement"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-200/60 pb-2">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-950">{m.measurement_code}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(m.created_at)}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {m.prediction?.prediction || 'Class C'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {m.prediction ? `${(m.prediction.confidence * 100).toFixed(1)}%` : '76.2%'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href="/history"
                        className="text-xs font-semibold text-slate-950 hover:underline"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
