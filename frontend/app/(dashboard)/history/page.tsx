'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Download,
  Database,
  Layers,
  Calendar,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { AssessmentResult, Measurement, RawSensorSample, DataSource, MeasurementQuality } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { TableRowSkeleton } from '../../../components/SkeletonLoader';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { EmptyState } from '../../../components/EmptyState';
import { formatDate, formatTime } from '../../../lib/utils';

export default function HistoryPage() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Export states
  const [exportingMeasurements, setExportingMeasurements] = useState(false);
  const [exportingRaw, setExportingRaw] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);

  // Detail Modal state
  const [selectedMeasurement, setSelectedMeasurement] = useState<Measurement | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rawSamples, setRawSamples] = useState<RawSensorSample[]>([]);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [modalTab, setModalTab] = useState<'summary' | 'raw_samples'>('summary');

  const fetchMeasurements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filterParams: Record<string, unknown> = {
        page,
        limit,
      };
      if (statusFilter !== 'ALL') filterParams.status = statusFilter;
      if (sourceFilter !== 'ALL') filterParams.data_source = sourceFilter;
      if (classFilter !== 'ALL') filterParams.classification = classFilter;
      if (qualityFilter !== 'ALL') filterParams.quality = qualityFilter;
      if (startDate) filterParams.start_date = new Date(startDate).toISOString();
      if (endDate) {
        const eDate = new Date(endDate);
        eDate.setHours(23, 59, 59, 999);
        filterParams.end_date = eDate.toISOString();
      }

      const res = await api.measurements.getAll(filterParams as {
        page?: number;
        limit?: number;
        status?: string;
        data_source?: string;
        quality?: string;
        classification?: string;
        start_date?: string;
        end_date?: string;
      });
      if (res.success && res.data) {
        setMeasurements(res.data);
        setTotal(res.meta?.total || res.data.length);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, sourceFilter, classFilter, qualityFilter, startDate, endDate]);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const inspectMeasurement = async (id: string) => {
    setDetailLoading(true);
    setRawSamples([]);
    setAssessment(null);
    setModalTab('summary');
    try {
      const res = await api.measurements.getById(id);
      if (res.success && res.data) {
        setSelectedMeasurement(res.data);
        try {
          const assessmentRes = await api.assessments.getByMeasurementId(id);
          if (assessmentRes.success) setAssessment(assessmentRes.data);
        } catch {
          setAssessment(null);
        }
        if (res.data.raw_samples && res.data.raw_samples.length > 0) {
          setRawSamples(res.data.raw_samples);
        } else {
          // Fetch raw samples separately
          const rawRes = await api.measurements.getRawSamples(id);
          if (rawRes.success && rawRes.data) {
            setRawSamples(rawRes.data);
          }
        }
      }
    } catch {
      // Fallback
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportMeasurementsCsv = async () => {
    try {
      setExportingMeasurements(true);
      await api.measurements.downloadMeasurementsCsv({
        data_source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        quality: qualityFilter !== 'ALL' ? qualityFilter : undefined,
        classification: classFilter !== 'ALL' ? classFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export CSV');
    } finally {
      setExportingMeasurements(false);
    }
  };

  const handleExportRawCsv = async (measurementId?: string) => {
    try {
      setExportingRaw(true);
      await api.measurements.downloadRawSamplesCsv(measurementId, {
        data_source: sourceFilter !== 'ALL' ? sourceFilter : undefined,
        quality: qualityFilter !== 'ALL' ? qualityFilter : undefined,
        classification: classFilter !== 'ALL' ? classFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export raw samples CSV');
    } finally {
      setExportingRaw(false);
    }
  };

  const handleExportPdf = async (measurementId: string) => {
    try {
      setExportingPdf(true);
      setPdfExportError(null);
      await api.measurements.downloadPdf(measurementId);
    } catch (err) {
      setPdfExportError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const filteredMeasurements = measurements.filter((m) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.measurement_code.toLowerCase().includes(query) ||
      (m.prediction?.prediction && m.prediction.prediction.toLowerCase().includes(query)) ||
      (m.device?.device_code && m.device.device_code.toLowerCase().includes(query))
    );
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const renderQualityBadge = (quality?: MeasurementQuality | string) => {
    const q = quality || 'GOOD';
    if (q === 'GOOD') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          GOOD
        </span>
      );
    }
    if (q === 'WARNING') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
          WARNING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
        POOR
      </span>
    );
  };

  const renderSourceBadge = (source?: DataSource | string) => {
    const s = source || 'synthetic';
    if (s === 'iot_real') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          IOT_REAL
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
        SYNTHETIC
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header with Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Measurement History</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse, search, and audit past multi-sensor acquisitions (20 samples/measurement) and SVM predictions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportMeasurementsCsv}
            disabled={exportingMeasurements}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{exportingMeasurements ? 'Exporting...' : 'Export Measurements CSV'}</span>
          </button>
          <button
            onClick={() => handleExportRawCsv()}
            disabled={exportingRaw}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-slate-300" />
            <span>{exportingRaw ? 'Exporting Raw...' : 'Export Raw Samples CSV'}</span>
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchMeasurements} />}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between text-xs">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code (MEAS-00001), class, or device..."
              className="w-full pl-11 pr-4 py-2 rounded-full bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 transition-all shadow-2xs"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Data Source Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Source:</span>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium cursor-pointer shadow-2xs text-xs focus:outline-none"
              >
                <option value="ALL">All Sources</option>
                <option value="synthetic">Synthetic</option>
                <option value="iot_real">IoT Real</option>
              </select>
            </div>

            {/* Classification Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Class:</span>
              <select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium cursor-pointer shadow-2xs text-xs focus:outline-none"
              >
                <option value="ALL">All Classes</option>
                <option value="Class_A">Class A</option>
                <option value="Class_B">Class B</option>
                <option value="Class_C">Class C</option>
              </select>
            </div>

            {/* Quality Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Quality:</span>
              <select
                value={qualityFilter}
                onChange={(e) => {
                  setQualityFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium cursor-pointer shadow-2xs text-xs focus:outline-none"
              >
                <option value="ALL">All Quality</option>
                <option value="GOOD">Good</option>
                <option value="WARNING">Warning</option>
                <option value="POOR">Poor</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-800 font-medium cursor-pointer shadow-2xs text-xs focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="PENDING">PENDING</option>
                <option value="ML_PROCESSING_FAILED">FAILED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-[11px]">Date Filter:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none"
            />
            {(startDate || endDate || sourceFilter !== 'ALL' || classFilter !== 'ALL' || qualityFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSourceFilter('ALL');
                  setClassFilter('ALL');
                  setQualityFilter('ALL');
                  setStatusFilter('ALL');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="ml-2 text-rose-600 hover:text-rose-800 text-[11px] font-semibold cursor-pointer underline"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: 1 Row = 1 Measurement */}
      <div className="glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-4">
        {loading ? (
          <table className="w-full text-left text-xs">
            <tbody>
              <TableRowSkeleton cols={8} />
              <TableRowSkeleton cols={8} />
              <TableRowSkeleton cols={8} />
              <TableRowSkeleton cols={8} />
            </tbody>
          </table>
        ) : filteredMeasurements.length === 0 ? (
          <EmptyState
            title="No measurements matching filter"
            description="Try adjusting your search criteria or resetting filters."
            onAction={() => {
              setSearchQuery('');
              setSourceFilter('ALL');
              setClassFilter('ALL');
              setQualityFilter('ALL');
              setStatusFilter('ALL');
              setStartDate('');
              setEndDate('');
              setPage(1);
            }}
            actionText="Reset Filters"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-200/60 pb-2">
                  <th className="py-3 px-4">Measurement ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Samples</th>
                  <th className="py-3 px-4">Quality</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMeasurements.map((m) => {
                  const predClass = m.prediction?.prediction || '—';
                  const confText = m.prediction ? `${(m.prediction.confidence * 100).toFixed(1)}%` : '—';

                  return (
                    <tr key={m.id} className="hover:bg-white/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-950">{m.measurement_code}</td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div>{formatDate(m.created_at)}</div>
                        <div className="text-[10px] text-slate-400">{formatTime(m.created_at)}</div>
                      </td>
                      <td className="py-3.5 px-4">{renderSourceBadge(m.data_source)}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="inline-flex items-center gap-1 font-semibold">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {m.sample_count || 20}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">{renderQualityBadge(m.quality)}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{predClass}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{confText}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 text-xs text-slate-500 font-medium">
          <div>
            Showing Page {page} of {totalPages} ({total} total measurements)
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

      {/* Detail Inspection Modal with 20 Raw Samples tab */}
      {selectedMeasurement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl border border-white/90 glass-panel p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto text-xs shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-950">
                      {selectedMeasurement.measurement_code}
                    </h3>
                    {renderSourceBadge(selectedMeasurement.data_source)}
                    {renderQualityBadge(selectedMeasurement.quality)}
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Recorded on {formatDate(selectedMeasurement.created_at)} at {formatTime(selectedMeasurement.created_at)} • {selectedMeasurement.sample_count || 20} Raw Samples Processed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPdf(selectedMeasurement.id)}
                  disabled={exportingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                  title="Export measurement report as PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
                </button>
                <button
                  onClick={() => handleExportRawCsv(selectedMeasurement.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold cursor-pointer shadow-2xs"
                  title="Export 20 Raw Samples as CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Download Raw CSV</span>
                </button>
                <button
                  onClick={() => setSelectedMeasurement(null)}
                  className="p-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer shadow-2xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {pdfExportError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {pdfExportError}
              </div>
            )}

            {/* Tabs Selector */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setModalTab('summary')}
                className={`px-4 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                  modalTab === 'summary'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Aggregated Summary & SVM
              </button>
              <button
                onClick={() => setModalTab('raw_samples')}
                className={`px-4 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                  modalTab === 'raw_samples'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                20 Raw Sensor Samples ({rawSamples.length || selectedMeasurement.sample_count || 20})
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400">Loading measurement details...</div>
            ) : modalTab === 'summary' ? (
              <div className="space-y-6">
                {/* General Meta Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium">Status</div>
                    <div className="mt-1.5">
                      <StatusBadge status={selectedMeasurement.status} size="sm" />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium">SVM Prediction</div>
                    <div className="text-slate-950 font-bold text-base mt-1">
                      {selectedMeasurement.prediction?.prediction || '—'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium">Confidence</div>
                    <div className="text-slate-950 font-bold text-base mt-1">
                      {selectedMeasurement.prediction
                        ? `${(selectedMeasurement.prediction.confidence * 100).toFixed(2)}%`
                        : '—'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70">
                    <div className="text-slate-400 text-[11px] font-medium">Model & Speed</div>
                    <div className="text-slate-900 font-semibold mt-1">
                      {selectedMeasurement.prediction?.model_version || 'SVM-v1.0'}
                      {selectedMeasurement.prediction?.processing_time_ms ? (
                        <span className="text-[10px] text-slate-400 block">
                          {selectedMeasurement.prediction.processing_time_ms}ms
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Class Probabilities Breakdown */}
                {selectedMeasurement.prediction?.probabilities && (
                  <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/70 space-y-2">
                    <div className="font-bold text-slate-900 text-xs">SVM Class Probability Distribution</div>
                    <div className="grid grid-cols-3 gap-3">
                      {Object.entries(selectedMeasurement.prediction.probabilities).map(([cls, prob]) => (
                        <div key={cls} className="p-3 rounded-xl bg-white border border-slate-200/80">
                          <div className="text-slate-400 text-[10px] uppercase font-bold">{cls.replace('_', ' ')}</div>
                          <div className="text-slate-900 font-extrabold text-sm mt-0.5">
                            {typeof prob === 'number' ? `${(prob * 100).toFixed(2)}%` : '—'}
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-slate-900 h-1.5 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, (Number(prob) || 0) * 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Classification Profile (Simulation)</h4>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {assessment?.assessment.mapping_available ? 'SIMULATION MAPPING CONFIGURED' : 'MAPPING NOT CONFIGURED'}
                    </span>
                  </div>
                  {assessment?.assessment.mapping_available ? (
                    <>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Simulation Profile</div>
                        <div className="text-xl font-black text-slate-950 mt-1">{assessment.assessment.classification_profile || 'Belum tersedia'}</div>
                        <p className="text-xs text-slate-600 mt-1">{assessment.assessment.classification_description || 'Belum tersedia'}</p>
                        <p className="text-[11px] font-semibold text-amber-700 mt-2">{assessment.assessment.mapping_mode === 'demo' ? 'SIMULATION ONLY - not an official assessment' : `Mapping ${assessment.assessment.mapping_version}`}</p>
                      </div>
                      {assessment.assessment.dimensions.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{assessment.assessment.dimensions.map((dimension) => <div key={dimension.name} className="p-3 rounded-xl bg-white border border-amber-200/70"><div className="text-xs font-bold text-slate-900">{dimension.name}</div><div className="text-[11px] text-emerald-700 font-semibold mt-1">{dimension.score}/100 · {dimension.level}</div></div>)}</div>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {assessment.assessment.characteristics.map((item) => (
                          <div key={item.title} className="p-3 rounded-xl bg-white border border-amber-200/70">
                            <div className="text-sm font-bold text-slate-900">{item.title}</div>
                            {item.level && <div className="text-[11px] text-emerald-700 font-semibold mt-1">{item.level}</div>}
                            <div className="text-xs text-slate-600 mt-1">{item.description}</div>
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-500">Mapping {assessment.assessment.mapping_version} · Acquisition Version {assessment.assessment.assessment_version}</div>
                    </>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-600">Simulation mapping not configured for this class. Characteristics and profiles are simulation-only interpretations and not displayed without established methodology.</p>
                  )}
                </div>

                {/* 15 Aggregated Features Summary (Mean of 20 Samples) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Aggregated 15 Features (Mean Across 20 Samples)
                    </h4>
                    <span className="text-[11px] text-slate-400">Canonical SVM Input</span>
                  </div>

                  {/* AS7341 Spectral breakdown */}
                  <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-3">
                    <div className="flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Radio className="w-4 h-4 text-cyan-600" />
                        <span>AS7341 Spectral Channels (10 Bands)</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center text-[11px]">
                      {['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'Clear', 'NIR'].map((band) => {
                        const val =
                          selectedMeasurement.features_summary?.[`AS7341_${band}`] ??
                          (rawSamples.length
                            ? (
                                rawSamples.reduce(
                                  (acc, s) =>
                                    acc +
                                    (Number((s as unknown as Record<string, number>)[`as7341_${band.toLowerCase()}`]) ||
                                      0),
                                  0
                                ) / rawSamples.length
                              ).toFixed(1)
                            : '—');
                        return (
                          <div key={band} className="p-2 rounded-xl bg-white border border-slate-200/70">
                            <div className="text-slate-400 font-medium">{band}</div>
                            <div className="text-slate-900 font-bold mt-0.5">{val}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* TCS34725 & VL53L1X */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Sliders className="w-4 h-4 text-purple-600" />
                        <span>TCS34725 Color (4 Channels)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                        {['R', 'G', 'B', 'Clear'].map((ch) => {
                          const val =
                            selectedMeasurement.features_summary?.[`TCS34725_${ch}`] ??
                            (rawSamples.length
                              ? (
                                  rawSamples.reduce(
                                    (acc, s) =>
                                      acc +
                                      (Number((s as unknown as Record<string, number>)[`tcs34725_${ch.toLowerCase()}`]) ||
                                        0),
                                    0
                                  ) / rawSamples.length
                                ).toFixed(1)
                              : '—');
                          return (
                            <div key={ch} className="p-2 rounded-xl bg-white border border-slate-200/70">
                              <div className="text-slate-400 font-semibold">{ch}</div>
                              <div className="text-slate-900 font-bold mt-0.5">{val}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white/60 border border-slate-200/70 space-y-2">
                      <div className="flex items-center gap-2 font-semibold text-slate-900">
                        <Gauge className="w-4 h-4 text-amber-600" />
                        <span>VL53L1X Distance</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200/70 text-center">
                        <div className="text-slate-400 text-[10px] font-medium">MEAN DISTANCE</div>
                        <div className="text-slate-900 font-black text-lg">
                          {selectedMeasurement.features_summary?.VL53L1X_Distance_mm ??
                            (rawSamples.length
                              ? (
                                  rawSamples.reduce((acc, s) => acc + s.vl53l1x_distance_mm, 0) / rawSamples.length
                                ).toFixed(1)
                              : '—')}{' '}
                          mm
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Quality Rating: <span className="font-bold">{selectedMeasurement.quality || 'GOOD'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Tab 2: 20 Raw Samples Table */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      20 Raw Sensor Samples Log
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      All 15 stored sensor channels per sample. Source may be synthetic/simulation unless otherwise recorded.
                    </p>
                  </div>
                  <button
                    onClick={() => handleExportRawCsv(selectedMeasurement.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 text-white font-semibold shadow-xs cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV</span>
                  </button>
                </div>

                {rawSamples.length === 0 ? (
                  <div className="p-8 text-center bg-white/60 rounded-2xl border border-slate-200 text-slate-500">
                    No individual raw sample records found for this measurement.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[380px] rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="py-2.5 px-3 font-bold">#</th>
                          <th className="py-2.5 px-2">F1</th>
                          <th className="py-2.5 px-2">F2</th>
                          <th className="py-2.5 px-2">F3</th>
                          <th className="py-2.5 px-2">F4</th>
                          <th className="py-2.5 px-2">F5</th>
                          <th className="py-2.5 px-2">F6</th>
                          <th className="py-2.5 px-2">F7</th>
                          <th className="py-2.5 px-2">F8</th>
                          <th className="py-2.5 px-2">Clear</th>
                          <th className="py-2.5 px-2">NIR</th>
                          <th className="py-2.5 px-2 font-bold text-rose-600">R</th>
                          <th className="py-2.5 px-2 font-bold text-emerald-600">G</th>
                          <th className="py-2.5 px-2 font-bold text-blue-600">B</th>
                          <th className="py-2.5 px-2">CLR</th>
                          <th className="py-2.5 px-3 font-bold text-amber-600">Dist(mm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rawSamples.map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-slate-50/80 font-mono text-[10.5px]">
                            <td className="py-2 px-3 font-bold text-slate-950">{s.sample_number || idx + 1}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f1}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f2}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f3}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f4}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f5}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f6}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f7}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_f8}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_clear}</td>
                            <td className="py-2 px-2 text-slate-700">{s.as7341_nir}</td>
                            <td className="py-2 px-2 font-semibold text-rose-700">{s.tcs34725_r}</td>
                            <td className="py-2 px-2 font-semibold text-emerald-700">{s.tcs34725_g}</td>
                            <td className="py-2 px-2 font-semibold text-blue-700">{s.tcs34725_b}</td>
                            <td className="py-2 px-2 text-slate-700">{s.tcs34725_clear}</td>
                            <td className="py-2 px-3 font-bold text-amber-700">{s.vl53l1x_distance_mm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Footer button */}
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
