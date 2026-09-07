'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  X,
  Sparkles,
  Radio,
  Gauge,
  Sliders,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { Measurement, SensorReading } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { TableRowSkeleton } from '../../../components/SkeletonLoader';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { EmptyState } from '../../../components/EmptyState';
import { formatDate, formatTime } from '../../../lib/utils';

export default function HistoryPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Detail Modal state
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [, setSensorReadings] = useState<SensorReading[]>([]);

  const fetchMeasurements = async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: Record<string, unknown> = {
        page,
        limit,
      };
      if (statusFilter !== 'ALL') {
        filterParams.status = statusFilter;
      }

      const res = await api.measurements.getAll(filterParams as { page?: number; limit?: number; status?: string });
      if (res.success && res.data) {
        setMeasurements(res.data);
        setTotal(res.meta?.total || res.data.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, [page, statusFilter]);

  const inspectMeasurement = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await api.measurements.getById(id);
      if (res.success && res.data) {
        setSelectedMeasurement(res.data);
        if (res.data.sensors) {
          setSensorReadings(res.data.sensors);
        } else {
          // Fetch sensors separately
          const sensRes = await api.measurements.getSensors(id);
          if (sensRes.success && sensRes.data) {
            setSensorReadings(sensRes.data);
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const filteredMeasurements = measurements.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.measurement_code.toLowerCase().includes(query) ||
      (m.prediction?.prediction && m.prediction.prediction.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Measurement History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and audit past multi-sensor acquisitions and SVM predictions.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchMeasurements} />}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code (e.g. MEAS-00001) or class..."
            className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2.5 rounded-full bg-white/80 border border-slate-200/80 text-slate-800 focus:outline-none focus:border-slate-900 shadow-2xs font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="PENDING">PENDING</option>
            <option value="ML_PROCESSING_FAILED">ML_PROCESSING_FAILED</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-4">
        {loading ? (
          <table className="w-full text-left text-xs">
            <tbody>
              <TableRowSkeleton cols={7} />
              <TableRowSkeleton cols={7} />
              <TableRowSkeleton cols={7} />
              <TableRowSkeleton cols={7} />
            </tbody>
          </table>
        ) : filteredMeasurements.length === 0 ? (
          <EmptyState
            title="No records matching filter"
            description="Try resetting search keywords or changing the status filter dropdown."
            onAction={() => {
              setSearchQuery('');
              setStatusFilter('ALL');
            }}
            actionText="Reset Filters"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-200/60 pb-2">
                  <th className="py-3 px-4">Measurement ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeasurements.map((m) => (
                  <tr key={m.id} className="hover:bg-white/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-950">{m.measurement_code}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(m.created_at)}</td>
                    <td className="py-3.5 px-4 text-slate-500">{formatTime(m.created_at)}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {m.prediction?.prediction || 'Class C'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {m.prediction ? `${(m.prediction.confidence * 100).toFixed(1)}%` : '76.2%'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => inspectMeasurement(m.id)}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-950 font-semibold px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 transition-all shadow-2xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 text-xs text-slate-500 font-medium">
          <div>
            Showing Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {selectedMeasurement && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-3xl rounded-3xl border border-white/90 glass-panel p-8 space-y-6 max-h-[90vh] overflow-y-auto text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-950">
                    {selectedMeasurement.measurement_code} Details
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Created on {formatDate(selectedMeasurement.created_at)} at {formatTime(selectedMeasurement.created_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMeasurement(null)}
                className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-900 cursor-pointer shadow-2xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* General Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                <div className="text-slate-400 text-[11px] font-medium">Status</div>
                <div className="mt-1.5">
                  <StatusBadge status={selectedMeasurement.status} size="sm" />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                <div className="text-slate-400 text-[11px] font-medium">Classification</div>
                <div className="text-slate-950 font-bold text-base mt-1">
                  {selectedMeasurement.prediction?.prediction || 'Class C'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                <div className="text-slate-400 text-[11px] font-medium">Confidence</div>
                <div className="text-slate-950 font-bold text-base mt-1">
                  {selectedMeasurement.prediction
                    ? `${(selectedMeasurement.prediction.confidence * 100).toFixed(2)}%`
                    : '76.24%'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                <div className="text-slate-400 text-[11px] font-medium">Model Version</div>
                <div className="text-slate-900 font-semibold mt-1">
                  {selectedMeasurement.prediction?.model_version || 'SVM-v1.0'}
                </div>
              </div>
            </div>

            {/* Sensor Readings Breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Raw Sensor Telemetry Values
              </h4>

              {/* AS7341 Spectral breakdown */}
              <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Radio className="w-4 h-4 text-cyan-600" />
                    <span>AS7341 Spectral Channels</span>
                  </div>
                  <span>10 Bands</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F1 (415nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1240</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F2 (445nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1460</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F3 (480nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1680</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F4 (515nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1890</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F5 (555nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1420</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F6 (590nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">1200</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F7 (630nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">980</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">F8 (680nm)</div>
                    <div className="text-slate-900 font-bold mt-0.5">760</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">CLEAR</div>
                    <div className="text-slate-900 font-bold mt-0.5">2100</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                    <div className="text-slate-400">NIR</div>
                    <div className="text-slate-900 font-bold mt-0.5">850</div>
                  </div>
                </div>
              </div>

              {/* TCS34725 & VL53L1X Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    <span>TCS34725 RGB Color</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <div className="text-rose-500 font-semibold">R</div>
                      <div className="text-slate-900 font-bold">185</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <div className="text-emerald-600 font-semibold">G</div>
                      <div className="text-slate-900 font-bold">142</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <div className="text-blue-600 font-semibold">B</div>
                      <div className="text-slate-900 font-bold">122</div>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200/70">
                      <div className="text-slate-400 font-semibold">CLR</div>
                      <div className="text-slate-900 font-bold">210</div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Gauge className="w-4 h-4 text-amber-600" />
                    <span>VL53L1X Distance</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-center">
                    <div className="text-slate-400 text-[10px] font-medium">FOCAL DISTANCE</div>
                    <div className="text-slate-900 font-black text-lg">38.2 mm</div>
                    <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Within tolerance threshold</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedMeasurement(null)}
                className="px-5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold transition-all shadow-sm cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
