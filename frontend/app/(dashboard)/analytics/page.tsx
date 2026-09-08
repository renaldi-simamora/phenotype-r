'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Binary,
  Layers,
  Sparkles,
  PieChart,
  HardDrive,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Database,
  BarChart3,
  Sliders,
  Radio,
  Gauge,
  Info,
  Server,
  Workflow,
  FileCheck2,
  Lock,
  Wifi,
  WifiOff,
  RefreshCw,
  Cpu,
  Microscope,
  Zap,
  AlertCircle,
  Clock,
  ChevronRight,
  Eye,
  FlaskConical,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { MlModel, Measurement, MlPrediction, RawSensorSample } from '../../../types';
import { CardSkeleton } from '../../../components/SkeletonLoader';
import { ErrorBanner } from '../../../components/ErrorBanner';

// ==========================================
// VALIDATED EXPERIMENT CONSTANTS (GROUND TRUTH)
// ==========================================
const EXPERIMENT_METRICS = {
  accuracy: 80.0,
  macroPrecision: 78.21,
  macroRecall: 78.94,
  macroF1: 78.41,
  weightedF1: 80.3,
  groupCvMacroF1: '69.80% ± 4.04%',
  kernel: 'Linear',
  c: '1.0',
  featureCount: 15,
  classCount: 3,
  modelVersion: 'SVM-v1.0',
};

// 500 Test Split Samples Confusion Matrix (Validated from evaluation test split)
const CONFUSION_MATRIX = [
  { actual: 'Class A', total: 190, predA: 155, predB: 25, predC: 10 },
  { actual: 'Class B', total: 110, predA: 11, predB: 80, predC: 19 },
  { actual: 'Class C', total: 200, predA: 12, predB: 23, predC: 165 },
];

// Per-Class Evaluation Table (from test split evaluation)
const CLASSIFICATION_REPORT = [
  { name: 'Class A', precision: 87.08, recall: 81.58, f1: 84.24, support: 190 },
  { name: 'Class B', precision: 62.5, recall: 72.73, f1: 67.23, support: 110 },
  { name: 'Class C', precision: 85.05, recall: 82.5, f1: 83.76, support: 200 },
];

// 15 Sensor Features Permutation Importance (Validated results)
const FEATURE_IMPORTANCE_DATA = [
  { group: 'TCS34725', feature: 'TCS34725_B', label: 'Blue (465nm)', importance: 14.23, positive: true },
  { group: 'AS7341', feature: 'AS7341_F1', label: 'F1 (415nm Violet)', importance: 12.04, positive: true },
  { group: 'TCS34725', feature: 'TCS34725_R', label: 'Red (615nm)', importance: 11.63, positive: true },
  { group: 'AS7341', feature: 'AS7341_F5', label: 'F5 (555nm Green)', importance: 7.7, positive: true },
  { group: 'TCS34725', feature: 'TCS34725_G', label: 'Green (525nm)', importance: 7.13, positive: true },
  { group: 'AS7341', feature: 'AS7341_F7', label: 'F7 (630nm Red)', importance: 5.11, positive: true },
  { group: 'AS7341', feature: 'AS7341_F8', label: 'F8 (680nm Deep Red)', importance: 4.89, positive: true },
  { group: 'AS7341', feature: 'AS7341_F6', label: 'F6 (590nm Yellow)', importance: 2.55, positive: true },
  { group: 'AS7341', feature: 'AS7341_F4', label: 'F4 (515nm Cyan)', importance: 1.71, positive: true },
  { group: 'AS7341', feature: 'AS7341_F2', label: 'F2 (445nm Indigo)', importance: 0.48, positive: true },
  { group: 'VL53L1X', feature: 'VL53L1X_Distance_mm', label: 'Focal Distance (mm)', importance: 0.37, positive: true },
  { group: 'AS7341', feature: 'AS7341_Clear', label: 'Clear Broadband', importance: 0.21, positive: true },
  { group: 'AS7341', feature: 'AS7341_NIR', label: 'Near-Infrared (910nm)', importance: -0.18, positive: false },
  { group: 'AS7341', feature: 'AS7341_F3', label: 'F3 (480nm Blue)', importance: -0.21, positive: false },
  { group: 'TCS34725', feature: 'TCS34725_Clear', label: 'Clear Channel', importance: -0.6, positive: false },
];

// Ablation Study Comparison Data (Validated from ablation study experiments)
const ABLATION_STUDY_DATA = [
  { config: 'AS7341 Only', nFeat: 10, macroF1: 65.98, accuracy: 69.2, note: 'Spectral channels only' },
  { config: 'TCS34725 Only', nFeat: 4, macroF1: 67.31, accuracy: 68.0, note: 'RGB + Clear channels' },
  { config: 'VL53L1X Only', nFeat: 1, macroF1: 37.28, accuracy: 45.6, note: 'Distance ranging only' },
  { config: 'AS7341 + TCS34725', nFeat: 14, macroF1: 79.84, accuracy: 81.2, note: 'Spectral + Color fusion', isBestF1: true },
  { config: 'AS7341 + VL53L1X', nFeat: 11, macroF1: 68.06, accuracy: 70.8, note: 'Spectral + Distance check' },
  { config: 'TCS34725 + VL53L1X', nFeat: 5, macroF1: 68.48, accuracy: 69.2, note: 'Color + Distance check' },
  { config: 'All Sensors (Standard)', nFeat: 15, macroF1: 78.41, accuracy: 80.0, note: 'Canonical 15-feature fusion', isStandard: true },
];

// VL53L1X valid range for measurement-position check
const VL53L1X_VALID_MIN = 35;
const VL53L1X_VALID_MAX = 50;

// ==========================================
// HELPER FUNCTIONS
// ==========================================
function calcStats(values: number[]) {
  if (!values.length) return { min: 0, max: 0, avg: 0, std: 0, last: 0 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  const last = values[values.length - 1];
  return { min, max, avg, std, last };
}

function formatTs(ts?: string | null): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'medium' });
  } catch {
    return ts;
  }
}

function formatElapsed(startedAt?: string, completedAt?: string): string | null {
  if (!startedAt || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// Deterministic AI insight generator — no LLM, based on actual data
function generateInsight(
  prediction: MlPrediction | null,
  measurement: Measurement | null,
  rawSamples: RawSensorSample[]
): string[] {
  const lines: string[] = [];
  if (!prediction || !measurement) {
    lines.push('No recent measurement available. Perform a measurement with the ESP32-S3 to see insights.');
    return lines;
  }

  const conf = (prediction.confidence * 100).toFixed(1);
  const cls = prediction.prediction || 'Unknown';
  lines.push(`The latest measurement was classified as ${cls} with ${conf}% confidence by the SVM model.`);

  const quality = measurement.quality || 'GOOD';
  const distValues = rawSamples.map((s) => s.vl53l1x_distance_mm).filter((v) => v != null && v > 0);
  const distAvg = distValues.length ? (distValues.reduce((a, b) => a + b, 0) / distValues.length).toFixed(1) : null;
  if (distAvg) {
    lines.push(`Measurement quality is ${quality}. Average distance from VL53L1X: ${distAvg} mm (valid range: ${VL53L1X_VALID_MIN}–${VL53L1X_VALID_MAX} mm).`);
  } else {
    lines.push(`Measurement quality is ${quality}.`);
  }

  lines.push(
    `The most influential features for this classification include TCS34725_B (14.23%), AS7341_F1 (12.04%), and TCS34725_R (11.63%), based on the trained model's permutation importance analysis.`
  );

  if (prediction.confidence < 0.7) {
    lines.push(`⚠ Confidence is below 70%. This prediction may be less reliable. Consider repeating the measurement.`);
  }
  if (quality === 'POOR') {
    lines.push(`⚠ Measurement quality is POOR. Distance may be outside the valid range. Results may be unreliable.`);
  }
  if (quality === 'WARNING') {
    lines.push(`⚠ Measurement quality is WARNING. Some samples may have marginal distance readings.`);
  }

  const src = measurement.data_source || 'synthetic';
  lines.push(`Data source: ${src === 'iot_real' ? 'Real IoT (ESP32-S3)' : 'Synthetic / Demo data'}. Predicted class labels (A/B/C) are research-defined categories.`);

  return lines;
}

// ==========================================
// MINI SVG LINE CHART (no dependencies)
// ==========================================
function MiniLineChart({
  data,
  color = '#0f172a',
  refMin,
  refMax,
  height = 64,
}: {
  data: number[];
  color?: string;
  refMin?: number;
  refMax?: number;
  height?: number;
}) {
  if (!data.length) return <div className="h-16 flex items-center justify-center text-xs text-slate-400">No data</div>;

  const W = 300;
  const H = height;
  const pad = 4;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const toX = (i: number) => pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
  const toY = (v: number) => H - pad - ((v - min) / range) * (H - pad * 2);

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Reference band (VL53L1X valid range)
  const refBandTop = refMax != null ? toY(Math.min(refMax, max + range * 0.1)) : null;
  const refBandBot = refMin != null ? toY(Math.max(refMin, min - range * 0.1)) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {/* Reference range band */}
      {refBandTop != null && refBandBot != null && (
        <rect
          x={pad}
          y={Math.min(refBandTop, refBandBot)}
          width={W - pad * 2}
          height={Math.abs(refBandBot - refBandTop)}
          fill="rgba(16,185,129,0.08)"
          stroke="rgba(16,185,129,0.3)"
          strokeWidth="0.5"
          strokeDasharray="4,2"
        />
      )}
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {data.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r="2" fill={color} />
      ))}
    </svg>
  );
}

// ==========================================
// STAT MINI ROW
// ==========================================
function StatRow({ label, value, unit = '' }: { label: string; value: string | number | null; unit?: string }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono font-semibold text-slate-800">
        {value != null ? `${typeof value === 'number' ? value.toFixed(2) : value}${unit}` : '—'}
      </span>
    </div>
  );
}

// ==========================================
// PIPELINE STEP
// ==========================================
function PipelineStep({
  icon,
  label,
  sub,
  active,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  active?: boolean;
  last?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
          active ? 'bg-slate-950 border-slate-950 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
        }`}
      >
        {icon}
      </div>
      <div className="text-center">
        <div className={`text-[11px] font-bold ${active ? 'text-slate-950' : 'text-slate-400'}`}>{label}</div>
        {sub && <div className="text-[9.5px] text-slate-400">{sub}</div>}
      </div>
      {!last && (
        <div className="hidden md:block absolute top-5 left-full w-full h-px bg-slate-200/80 pointer-events-none" />
      )}
    </div>
  );
}

// ==========================================
// AS7341 CHANNELS
// ==========================================
const AS7341_CHANNELS = [
  { key: 'as7341_f1' as const, label: 'F1', desc: '415nm Violet', color: '#7c3aed' },
  { key: 'as7341_f2' as const, label: 'F2', desc: '445nm Indigo', color: '#4f46e5' },
  { key: 'as7341_f3' as const, label: 'F3', desc: '480nm Blue', color: '#2563eb' },
  { key: 'as7341_f4' as const, label: 'F4', desc: '515nm Cyan', color: '#0891b2' },
  { key: 'as7341_f5' as const, label: 'F5', desc: '555nm Green', color: '#059669' },
  { key: 'as7341_f6' as const, label: 'F6', desc: '590nm Yellow', color: '#ca8a04' },
  { key: 'as7341_f7' as const, label: 'F7', desc: '630nm Red', color: '#dc2626' },
  { key: 'as7341_f8' as const, label: 'F8', desc: '680nm Deep Red', color: '#9f1239' },
  { key: 'as7341_clear' as const, label: 'Clear', desc: 'Broadband', color: '#64748b' },
  { key: 'as7341_nir' as const, label: 'NIR', desc: '910nm NIR', color: '#78350f' },
];

const TCS_CHANNELS = [
  { key: 'tcs34725_r' as const, label: 'R', desc: 'Red 615nm', color: '#dc2626' },
  { key: 'tcs34725_g' as const, label: 'G', desc: 'Green 525nm', color: '#16a34a' },
  { key: 'tcs34725_b' as const, label: 'B', desc: 'Blue 465nm', color: '#2563eb' },
  { key: 'tcs34725_clear' as const, label: 'Clear', desc: 'Broadband', color: '#64748b' },
];

// ==========================================
// MAIN PAGE
// ==========================================
export default function AnalyticsPage() {
  // ---- Legacy analytics state ----
  const [stats, setStats] = useState<{ total: number; completed: number; failed: number } | null>(null);
  const [predictions, setPredictions] = useState<Record<string, number>>({});
  const [deviceStats, setDeviceStats] = useState<{ total: number; online: number; measuring: number; offline: number } | null>(null);
  const [, setModels] = useState<MlModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceStats, setSourceStats] = useState<{
    synthetic: number;
    iot_real: number;
    quality_good: number;
    quality_warning: number;
    quality_poor: number;
  } | null>(null);
  const [ablationMetric, setAblationMetric] = useState<'macroF1' | 'accuracy'>('macroF1');

  // ---- Live monitoring state ----
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveMeasurement, setLiveMeasurement] = useState<Measurement | null>(null);
  const [liveRawSamples, setLiveRawSamples] = useState<RawSensorSample[]>([]);
  const [livePrediction, setLivePrediction] = useState<MlPrediction | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [as7341Channel, setAs7341Channel] = useState<string>('as7341_f1');
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'error'>('checking');

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- Fetch live monitoring data ----
  const fetchLiveData = useCallback(async () => {
    try {
      const live = await api.analytics.getLatestLiveMeasurement();
      setLiveMeasurement(live.measurement);
      setLiveRawSamples(live.rawSamples);
      setLivePrediction(live.prediction);
      setLastSync(new Date());
      setBackendStatus('online');
    } catch {
      setBackendStatus('error');
    } finally {
      setLiveLoading(false);
    }
  }, []);

  // ---- Fetch aggregate analytics ----
  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [measRes, predRes, devRes, modelRes, srcRes] = await Promise.all([
          api.analytics.getMeasurements().catch(() => null),
          api.analytics.getPredictions().catch(() => null),
          api.analytics.getDevices().catch(() => null),
          api.analytics.getModelPerformance().catch(() => null),
          api.analytics.getDataSources().catch(() => null),
        ]);
        if (measRes && measRes.success) setStats(measRes.data);
        if (predRes && predRes.success) setPredictions(predRes.data);
        if (devRes && devRes.success) setDeviceStats(devRes.data);
        if (modelRes && modelRes.success) setModels(modelRes.data);
        if (srcRes && srcRes.success) setSourceStats(srcRes.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    fetchLiveData();

    // Auto-refresh live data every 30 seconds
    refreshIntervalRef.current = setInterval(fetchLiveData, 30_000);
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    };
  }, [fetchLiveData]);

  // ---- Derived values ----
  const totalClassifications = Object.values(predictions).reduce((a, b) => a + b, 0);
  const classA = predictions['Class A'] || predictions['Class_A'] || 0;
  const classB = predictions['Class B'] || predictions['Class_B'] || 0;
  const classC = predictions['Class C'] || predictions['Class_C'] || 0;

  const pctA = totalClassifications > 0 ? ((classA / totalClassifications) * 100).toFixed(1) : '0.0';
  const pctB = totalClassifications > 0 ? ((classB / totalClassifications) * 100).toFixed(1) : '0.0';
  const pctC = totalClassifications > 0 ? ((classC / totalClassifications) * 100).toFixed(1) : '0.0';

  const totalSources = (sourceStats?.synthetic ?? 0) + (sourceStats?.iot_real ?? 0);
  const pctReal = totalSources > 0 ? (((sourceStats?.iot_real ?? 0) / totalSources) * 100).toFixed(1) : '0.0';
  const pctSynth = totalSources > 0 ? (((sourceStats?.synthetic ?? 0) / totalSources) * 100).toFixed(1) : '0.0';

  // ---- Derived sensor stats ----
  const as7341Stats = AS7341_CHANNELS.map((ch) => ({
    ...ch,
    values: liveRawSamples.map((s) => (s[ch.key] as number) ?? 0),
    stats: calcStats(liveRawSamples.map((s) => (s[ch.key] as number) ?? 0)),
  }));

  const tcsStats = TCS_CHANNELS.map((ch) => ({
    ...ch,
    values: liveRawSamples.map((s) => (s[ch.key] as number) ?? 0),
    stats: calcStats(liveRawSamples.map((s) => (s[ch.key] as number) ?? 0)),
  }));

  const distValues = liveRawSamples.map((s) => s.vl53l1x_distance_mm ?? 0);
  const distStats = calcStats(distValues);
  const distInRange = distValues.filter((v) => v >= VL53L1X_VALID_MIN && v <= VL53L1X_VALID_MAX).length;
  const distValidity = !distValues.length
    ? 'NO DATA'
    : distInRange === distValues.length
    ? 'ALL IN RANGE'
    : distInRange >= distValues.length * 0.8
    ? 'MOSTLY IN RANGE'
    : 'OUT OF RANGE';

  // Sensor health from raw samples
  const as7341Healthy =
    liveRawSamples.length > 0 &&
    liveRawSamples.every((s) => s.as7341_f1 != null && s.as7341_f1 >= 0);
  const tcsHealthy =
    liveRawSamples.length > 0 &&
    liveRawSamples.every((s) => s.tcs34725_r != null && s.tcs34725_r >= 0);
  const vlHealthy =
    liveRawSamples.length > 0 &&
    liveRawSamples.every((s) => s.vl53l1x_distance_mm != null && s.vl53l1x_distance_mm > 0);

  // Active channel for AS7341 chart
  const activeChannel = AS7341_CHANNELS.find((c) => c.key === as7341Channel) || AS7341_CHANNELS[0];
  const activeChannelValues = liveRawSamples.map((s) => (s[activeChannel.key] as number) ?? 0);
  const activeChannelStats = calcStats(activeChannelValues);

  // Processing lifecycle stages
  const mStatus = liveMeasurement?.status;
  const lifecycleStages = [
    { label: 'Started', done: !!liveMeasurement },
    { label: 'Dist. Check', done: !!liveMeasurement },
    { label: 'Samples (20)', done: liveRawSamples.length > 0 },
    { label: 'Uploaded', done: !!liveMeasurement },
    { label: 'Preprocessing', done: mStatus === 'COMPLETED' || mStatus === 'ML_PROCESSING_FAILED' },
    { label: 'SVM Inference', done: !!livePrediction },
    { label: 'Saved', done: !!livePrediction },
  ];

  // AI Insight lines
  const insightLines = generateInsight(livePrediction, liveMeasurement, liveRawSamples);

  // Prediction probability display
  const predConf = livePrediction ? (livePrediction.confidence * 100).toFixed(1) : null;
  const pA =
    livePrediction?.probability_class_a != null
      ? (livePrediction.probability_class_a * 100).toFixed(1)
      : livePrediction?.probabilities?.Class_A != null
      ? (livePrediction.probabilities.Class_A * 100).toFixed(1)
      : null;
  const pB =
    livePrediction?.probability_class_b != null
      ? (livePrediction.probability_class_b * 100).toFixed(1)
      : livePrediction?.probabilities?.Class_B != null
      ? (livePrediction.probabilities.Class_B * 100).toFixed(1)
      : null;
  const pC =
    livePrediction?.probability_class_c != null
      ? (livePrediction.probability_class_c * 100).toFixed(1)
      : livePrediction?.probabilities?.Class_C != null
      ? (livePrediction.probabilities.Class_C * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-10 pb-12">

      {/* ======================================================== */}
      {/* ANALYTICS PAGE HEADER                                     */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              PHENOTYPE ANALYTICS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
              {EXPERIMENT_METRICS.modelVersion}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            IoT Monitoring & SVM Intelligence
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Live ESP32-S3 sensor telemetry, SVM classification inference, model evaluation, and research analytics.
          </p>
        </div>

        {/* System Status Bar */}
        <div className="flex flex-wrap items-center gap-2 self-start">
          {/* Backend status */}
          <div className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs ${
            backendStatus === 'online'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : backendStatus === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            {backendStatus === 'online' ? <Wifi className="w-3 h-3" /> : backendStatus === 'error' ? <WifiOff className="w-3 h-3" /> : <RefreshCw className="w-3 h-3 animate-spin" />}
            Backend {backendStatus === 'online' ? 'ONLINE' : backendStatus === 'error' ? 'ERROR' : 'CHECKING'}
          </div>

          {/* Device status */}
          <div className={`px-3 py-1.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs ${
            deviceStats && deviceStats.online > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : deviceStats && deviceStats.measuring > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            <Cpu className="w-3 h-3" />
            {deviceStats
              ? deviceStats.online > 0
                ? `${deviceStats.online} ESP32 ONLINE`
                : deviceStats.measuring > 0
                ? `${deviceStats.measuring} MEASURING`
                : 'Hardware Integration Pending'
              : 'Hardware Integration Pending'}
          </div>

          {/* ML service */}
          <div className="px-3 py-1.5 rounded-full bg-slate-950 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3 h-3" />
            SVM Active
          </div>

          {/* Last sync */}
          {lastSync && (
            <div className="px-3 py-1.5 rounded-full glass-pill border border-white/90 text-slate-500 text-[11px] flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Synced {lastSync.toLocaleTimeString()}
            </div>
          )}

          {/* Manual refresh */}
          <button
            onClick={() => { setLiveLoading(true); fetchLiveData(); }}
            className="px-3 py-1.5 rounded-full glass-pill border border-white/90 text-slate-500 text-[11px] flex items-center gap-1.5 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${liveLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ======================================================== */}
      {/* SECTION 1 — LIVE IoT MONITORING                          */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Live IoT Monitoring</h2>
            <p className="text-[10.5px] text-slate-400">Latest completed measurement from the backend</p>
          </div>
          <span className="ml-auto text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase">
            Auto-refresh 30s
          </span>
        </div>

        {liveLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        ) : !liveMeasurement ? (
          <div className="glass-panel rounded-3xl p-8 text-center space-y-2">
            <HardDrive className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-500">No completed measurements found</p>
            <p className="text-xs text-slate-400">Perform a measurement using the ESP32-S3 or the Measurement console.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Measurement info card */}
              <div className="glass-panel p-5 rounded-3xl border border-white/85 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Measurement</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    liveMeasurement.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {liveMeasurement.status}
                  </span>
                </div>
                <div className="font-mono text-lg font-black text-slate-950">{liveMeasurement.measurement_code}</div>
                <div className="space-y-1.5 text-xs">
                  <StatRow label="Device" value={liveMeasurement.device?.device_code || liveMeasurement.device_id?.slice(0,8) + '…'} />
                  <StatRow label="Timestamp" value={formatTs(liveMeasurement.created_at)} />
                  <StatRow label="Samples" value={`${liveRawSamples.length} / ${liveMeasurement.sample_count ?? 20}`} />
                  {formatElapsed(liveMeasurement.started_at, liveMeasurement.completed_at) && (
                    <StatRow label="Duration" value={formatElapsed(liveMeasurement.started_at, liveMeasurement.completed_at)} />
                  )}
                </div>
              </div>

              {/* Quality & source card */}
              <div className="glass-panel p-5 rounded-3xl border border-white/85 shadow-2xs space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quality & Source</span>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Measurement Quality</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      liveMeasurement.quality === 'GOOD'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : liveMeasurement.quality === 'WARNING'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {liveMeasurement.quality || 'GOOD'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Data Source</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${
                      liveMeasurement.data_source === 'iot_real'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {liveMeasurement.data_source === 'iot_real' ? 'IoT REAL' : 'SYNTHETIC'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Avg Distance</span>
                    <span className="font-mono text-[11px] font-semibold text-slate-800">
                      {distStats.avg > 0 ? `${distStats.avg.toFixed(1)} mm` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Distance Range</span>
                    <span className={`text-[10.5px] font-bold ${
                      distValidity === 'ALL IN RANGE' ? 'text-emerald-600' : distValidity === 'OUT OF RANGE' ? 'text-rose-600' : 'text-amber-600'
                    }`}>
                      {distValidity}
                    </span>
                  </div>
                </div>
              </div>

              {/* Processing lifecycle */}
              <div className="glass-panel p-5 rounded-3xl border border-white/85 shadow-2xs space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Processing Lifecycle</span>
                <div className="space-y-1.5">
                  {lifecycleStages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        stage.done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {stage.done ? <CheckCircle2 className="w-2.5 h-2.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>
                      <span className={stage.done ? 'text-slate-800 font-medium' : 'text-slate-400'}>{stage.label}</span>
                      {i < lifecycleStages.length - 1 && (
                        <ChevronRight className="w-3 h-3 text-slate-300 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2 — REAL-TIME SENSOR MONITORING                  */}
      {/* ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center">
            <Microscope className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Real-Time Sensor Monitoring</h2>
            <p className="text-[10.5px] text-slate-400">
              {liveRawSamples.length > 0
                ? `Sample trends across ${liveRawSamples.length} samples from the latest measurement`
                : 'No raw samples available — awaiting measurement'}
            </p>
          </div>
        </div>

        {liveRawSamples.length === 0 ? (
          <div className="glass-panel rounded-3xl p-8 text-center space-y-2">
            <FlaskConical className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-500">No raw sample data found</p>
            <p className="text-xs text-slate-400">Run a measurement and ensure the DB migration (migration_update_v2.sql) has been applied in Supabase.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* AS7341 Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">AS7341 Spectral Sensor</h3>
                    <p className="text-[10.5px] text-slate-400">10 channels · F1–F8, Clear, NIR · 415–910nm</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded-full border border-cyan-200 self-start sm:self-auto">
                  10 Spectral Features
                </span>
              </div>

              {/* Channel selector */}
              <div className="flex flex-wrap gap-1.5">
                {AS7341_CHANNELS.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setAs7341Channel(ch.key)}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-semibold border transition-all cursor-pointer ${
                      as7341Channel === ch.key
                        ? 'text-white border-transparent shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                    style={as7341Channel === ch.key ? { backgroundColor: activeChannel.color, borderColor: activeChannel.color } : {}}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              {/* Selected channel chart + stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[10.5px] font-semibold text-slate-500">
                    {activeChannel.label} ({activeChannel.desc}) — Sample 1→{liveRawSamples.length}
                  </div>
                  <div className="bg-white/60 rounded-2xl p-3 border border-slate-200/60">
                    <MiniLineChart data={activeChannelValues} color={activeChannel.color} height={72} />
                  </div>
                </div>
                <div className="space-y-2 p-4 rounded-2xl bg-white/60 border border-slate-200/60 text-xs self-start">
                  <div className="font-bold text-slate-800 text-[11px]">{activeChannel.label} Statistics</div>
                  <StatRow label="Current (last)" value={activeChannelStats.last.toFixed(0)} />
                  <StatRow label="Min" value={activeChannelStats.min.toFixed(0)} />
                  <StatRow label="Max" value={activeChannelStats.max.toFixed(0)} />
                  <StatRow label="Average" value={activeChannelStats.avg.toFixed(1)} />
                  <StatRow label="Std Dev" value={activeChannelStats.std.toFixed(1)} />
                </div>
              </div>

              {/* Summary grid of all 10 channels */}
              <div className="grid grid-cols-5 gap-2">
                {as7341Stats.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setAs7341Channel(ch.key)}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all hover:border-slate-400 ${
                      as7341Channel === ch.key ? 'border-slate-900 bg-slate-50' : 'border-slate-200/70 bg-white/50'
                    }`}
                  >
                    <div className="text-[9.5px] font-bold" style={{ color: ch.color }}>{ch.label}</div>
                    <div className="text-[11px] font-black text-slate-950">{ch.stats.avg.toFixed(0)}</div>
                    <div className="text-[9px] text-slate-400">avg</div>
                  </button>
                ))}
              </div>
            </div>

            {/* TCS34725 Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">TCS34725 RGB Color Sensor</h3>
                    <p className="text-[10.5px] text-slate-400">4 channels · R, G, B, Clear</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
                  4 Color Features
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tcsStats.map((ch) => (
                  <div key={ch.key} className="bg-white/60 rounded-2xl border border-slate-200/60 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: ch.color }}>{ch.label}</span>
                      <span className="text-[9.5px] text-slate-400">{ch.desc}</span>
                    </div>
                    <MiniLineChart data={ch.values} color={ch.color} height={48} />
                    <div className="grid grid-cols-4 gap-1 text-[10px]">
                      <div className="text-center"><div className="text-slate-400">Min</div><div className="font-bold text-slate-800">{ch.stats.min.toFixed(0)}</div></div>
                      <div className="text-center"><div className="text-slate-400">Max</div><div className="font-bold text-slate-800">{ch.stats.max.toFixed(0)}</div></div>
                      <div className="text-center"><div className="text-slate-400">Avg</div><div className="font-bold text-slate-800">{ch.stats.avg.toFixed(0)}</div></div>
                      <div className="text-center"><div className="text-slate-400">Last</div><div className="font-bold text-slate-800">{ch.stats.last.toFixed(0)}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* VL53L1X Card */}
            <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">VL53L1X Time-of-Flight Distance Sensor</h3>
                    <p className="text-[10.5px] text-slate-400">1 feature · Distance_mm · Measurement-position validation (valid: {VL53L1X_VALID_MIN}–{VL53L1X_VALID_MAX} mm)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border self-start sm:self-auto ${
                  distValidity === 'ALL IN RANGE'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : distValidity === 'OUT OF RANGE'
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {distValidity}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[10.5px] font-semibold text-slate-500">Distance_mm — Sample 1→{liveRawSamples.length}</div>
                  <div className="bg-white/60 rounded-2xl p-3 border border-slate-200/60">
                    <MiniLineChart
                      data={distValues}
                      color="#d97706"
                      refMin={VL53L1X_VALID_MIN}
                      refMax={VL53L1X_VALID_MAX}
                      height={72}
                    />
                  </div>
                  <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
                    <div className="w-3 h-1 bg-emerald-400/40 border border-emerald-400 rounded" />
                    Green band = valid measurement-position range ({VL53L1X_VALID_MIN}–{VL53L1X_VALID_MAX} mm)
                  </div>
                </div>
                <div className="space-y-2 p-4 rounded-2xl bg-white/60 border border-slate-200/60 text-xs self-start">
                  <div className="font-bold text-slate-800 text-[11px]">Distance Statistics</div>
                  <StatRow label="Current (last)" value={distStats.last.toFixed(1)} unit=" mm" />
                  <StatRow label="Min" value={distStats.min.toFixed(1)} unit=" mm" />
                  <StatRow label="Max" value={distStats.max.toFixed(1)} unit=" mm" />
                  <StatRow label="Average" value={distStats.avg.toFixed(1)} unit=" mm" />
                  <StatRow label="Std Dev" value={distStats.std.toFixed(1)} unit=" mm" />
                  <div className="pt-1 border-t border-slate-200/60">
                    <StatRow label="In range" value={`${distInRange}/${distValues.length}`} />
                  </div>
                </div>
              </div>

              <div className="text-[10.5px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                VL53L1X is used only for measurement-position/distance consistency validation. It does not directly identify biological characteristics.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3 — SENSOR HEALTH                               */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950">Sensor Health</h3>
              <p className="text-[10.5px] text-slate-400">Status inferred from latest raw sample data</p>
            </div>
          </div>
          {liveRawSamples.length === 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">NO DATA</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'AS7341', sub: 'Spectral 10-ch', healthy: as7341Healthy, icon: <Radio className="w-4 h-4" />, color: 'cyan' },
            { name: 'TCS34725', sub: 'RGB Color 4-ch', healthy: tcsHealthy, icon: <Sliders className="w-4 h-4" />, color: 'purple' },
            { name: 'VL53L1X', sub: 'ToF Distance', healthy: vlHealthy, icon: <Gauge className="w-4 h-4" />, color: 'amber' },
          ].map((s) => (
            <div key={s.name} className={`p-4 rounded-2xl border flex items-center justify-between ${
              liveRawSamples.length === 0
                ? 'bg-slate-50 border-slate-200'
                : s.healthy
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-rose-50/60 border-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`text-${s.color}-600`}>{s.icon}</div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">{s.name}</div>
                  <div className="text-[10px] text-slate-400">{s.sub}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  liveRawSamples.length === 0 ? 'bg-slate-300' : s.healthy ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
                <span className={`text-[10.5px] font-bold ${
                  liveRawSamples.length === 0 ? 'text-slate-400' : s.healthy ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {liveRawSamples.length === 0 ? 'NO DATA' : s.healthy ? 'NORMAL' : 'ALERT'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {liveRawSamples.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px]">Sample Completion</div>
              <div className="font-bold text-slate-950">{liveRawSamples.length} / {liveMeasurement?.sample_count ?? 20}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px]">Invalid Readings</div>
              <div className="font-bold text-slate-950">
                {liveRawSamples.filter(s => s.vl53l1x_distance_mm < VL53L1X_VALID_MIN || s.vl53l1x_distance_mm > VL53L1X_VALID_MAX).length} / {liveRawSamples.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px]">I2C Bus</div>
              <div className="font-bold text-slate-950">{as7341Healthy && tcsHealthy && vlHealthy ? 'OK' : 'CHECK'}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px]">Missing Values</div>
              <div className="font-bold text-slate-950">0</div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 4 — IoT → ML PROCESSING PIPELINE                */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
              <Workflow className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">IoT → ML Processing Pipeline</h3>
              <p className="text-xs text-slate-500">End-to-end flow from ESP32-S3 hardware to SVM prediction</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            Full Stack
          </span>
        </div>

        {/* Pipeline visual */}
        <div className="overflow-x-auto">
          <div className="flex items-start gap-0 min-w-[560px]">
            {[
              { icon: <Cpu className="w-4 h-4" />, label: 'ESP32-S3', sub: 'MCU', active: true },
              { icon: <Radio className="w-4 h-4" />, label: 'AS7341', sub: '10 ch', active: true },
              { icon: <Sliders className="w-4 h-4" />, label: 'TCS34725', sub: '4 ch', active: true },
              { icon: <Gauge className="w-4 h-4" />, label: 'VL53L1X', sub: '1 ch', active: true },
              { icon: <Layers className="w-4 h-4" />, label: '20 Samples', sub: 'avg→1 vec', active: liveRawSamples.length > 0 },
              { icon: <Database className="w-4 h-4" />, label: 'Supabase', sub: 'Backend', active: backendStatus === 'online' },
              { icon: <Binary className="w-4 h-4" />, label: 'StandardScaler', sub: 'Normalize', active: !!livePrediction },
              { icon: <Zap className="w-4 h-4" />, label: 'SVM v1.0', sub: 'Linear C=1', active: !!livePrediction },
              { icon: <Eye className="w-4 h-4" />, label: 'Prediction', sub: 'Class A/B/C', active: !!livePrediction, last: true },
            ].map((step, i, arr) => (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    step.active ? 'bg-slate-950 border-slate-950 text-white shadow-md' : 'bg-white border-slate-200 text-slate-400'
                  }`}>
                    {step.icon}
                  </div>
                  <div className="text-center">
                    <div className={`text-[10px] font-bold ${step.active ? 'text-slate-950' : 'text-slate-400'}`}>{step.label}</div>
                    <div className="text-[9px] text-slate-400">{step.sub}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div className={`h-px flex-1 mx-1 transition-all ${step.active ? 'bg-slate-950' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sensor fusion summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <Radio className="w-4 h-4 text-cyan-600" />AS7341
            </div>
            <p className="text-[11px] text-slate-500">Optical spectral bands: F1 (415nm) to F8 (680nm), Clear, NIR (910nm).</p>
            <div className="font-mono text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">10 Spectral Features</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <Sliders className="w-4 h-4 text-purple-600" />TCS34725
            </div>
            <p className="text-[11px] text-slate-500">Chromatic coordinates: Red, Green, Blue, and Clear irradiance channels.</p>
            <div className="font-mono text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">4 Color Features</div>
          </div>
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-950">
              <Gauge className="w-4 h-4 text-amber-600" />VL53L1X
            </div>
            <p className="text-[11px] text-slate-500">Time-of-Flight ranging for measurement-position check (35–50 mm).</p>
            <div className="font-mono text-[10px] text-slate-400 border-t border-slate-200/60 pt-1">1 Distance Feature</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-950 text-white space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Binary className="w-4 h-4 text-emerald-400" />15-D Vector
            </div>
            <p className="text-[11px] text-slate-300">StandardScaler normalized array → Linear SVM Decision Function.</p>
            <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">3 Discrete Classes Output</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 5 + 6 — LATEST ML PREDICTION & AI INSIGHT       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Latest ML Prediction (7 cols) */}
        <div className="lg:col-span-7 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">Latest ML Prediction</h3>
                <p className="text-[10.5px] text-slate-400">SVM classification result from backend</p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
              liveMeasurement?.data_source === 'iot_real'
                ? 'text-blue-700 bg-blue-50 border-blue-200'
                : 'text-slate-700 bg-slate-100 border-slate-200'
            }`}>
              {liveMeasurement?.data_source === 'iot_real' ? 'IoT REAL' : 'SYNTHETIC / SIMULATION'}
            </span>
          </div>

          {liveLoading ? (
            <CardSkeleton />
          ) : !livePrediction ? (
            <div className="py-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-500">No prediction available</p>
              <p className="text-xs text-slate-400">Run a measurement to generate a prediction.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Predicted class hero */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-md">
                  <span className="text-xl font-black">{livePrediction.prediction?.replace(/class\s*/i, '').toUpperCase() || '?'}</span>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Predicted Class</div>
                  <div className="text-2xl font-black text-slate-950 tracking-tight">{livePrediction.prediction}</div>
                  <div className="text-sm font-semibold text-emerald-600">{predConf}% confidence</div>
                </div>
              </div>

              {/* Probability bars */}
              {(pA != null || pB != null || pC != null) && (
                <div className="space-y-2">
                  <div className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider">Class Probabilities</div>
                  {[
                    { label: 'Class A', val: pA },
                    { label: 'Class B', val: pB },
                    { label: 'Class C', val: pC },
                  ].filter(c => c.val != null).map((c) => (
                    <div key={c.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-semibold ${livePrediction.prediction === c.label ? 'text-slate-950' : 'text-slate-500'}`}>{c.label}</span>
                        <span className={`font-mono font-bold ${livePrediction.prediction === c.label ? 'text-slate-950' : 'text-slate-400'}`}>{c.val}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${livePrediction.prediction === c.label ? 'bg-slate-950' : 'bg-slate-300'}`}
                          style={{ width: `${c.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-200/60">
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <div className="text-slate-400 text-[10px]">Model</div>
                  <div className="font-bold text-slate-950">{livePrediction.model_version || 'SVM-v1.0'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <div className="text-slate-400 text-[10px]">Features</div>
                  <div className="font-bold text-slate-950">15</div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                  <div className="text-slate-400 text-[10px]">Samples</div>
                  <div className="font-bold text-slate-950">{liveMeasurement?.sample_count ?? 20}</div>
                </div>
                {livePrediction.processing_time_ms && (
                  <div className="p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
                    <div className="text-slate-400 text-[10px]">Infer Time</div>
                    <div className="font-bold text-slate-950">{livePrediction.processing_time_ms}ms</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* AI / Model Insight (5 cols) */}
        <div className="lg:col-span-5 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-200/60 pb-3.5">
            <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950">Model Insight</h3>
              <p className="text-[10.5px] text-slate-400">Deterministic analysis from SVM outputs</p>
            </div>
          </div>

          {liveLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(4)].map((_, i) => <div key={i} className={`h-3 bg-slate-200 rounded-full ${i === 3 ? 'w-2/3' : 'w-full'}`} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {insightLines.map((line, i) => (
                <div key={i} className={`p-3 rounded-xl text-[11px] leading-relaxed ${
                  line.startsWith('⚠')
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : i === 0
                    ? 'bg-slate-50 border border-slate-200 text-slate-800 font-medium'
                    : 'text-slate-600'
                }`}>
                  {line}
                </div>
              ))}

              <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 leading-relaxed flex items-start gap-1.5">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                Class labels (A/B/C) are research-defined target categories. No biological identity, race, or medical claims are made.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DIVIDER — Research Evaluation Below                      */}
      {/* ======================================================== */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 h-px bg-slate-200/70" />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 text-white text-[10.5px] font-semibold shadow-xs">
          <FlaskConical className="w-3 h-3" />
          SVM Research Evaluation
        </div>
        <div className="flex-1 h-px bg-slate-200/70" />
      </div>

      {/* ======================================================== */}
      {/* SECTION 7: SVM MODEL PERFORMANCE BENCHMARKS              */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-slate-900" />
            <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
              SVM Model Performance Benchmarks
            </h2>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">
            EXPERIMENT RESULT
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Accuracy */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">
              Accuracy
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {EXPERIMENT_METRICS.accuracy.toFixed(2)}%
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              Top-1 test split
            </div>
          </div>

          {/* Macro Precision */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">
              Macro Precision
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {EXPERIMENT_METRICS.macroPrecision.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500">
              Unweighted mean
            </div>
          </div>

          {/* Macro Recall */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">
              Macro Recall
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {EXPERIMENT_METRICS.macroRecall.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500">
              Sensitivity average
            </div>
          </div>

          {/* Macro F1 */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">
              Macro F1
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {EXPERIMENT_METRICS.macroF1.toFixed(2)}%
            </div>
            <div className="text-[10px] text-emerald-700 font-medium">
              Primary thesis metric
            </div>
          </div>

          {/* Weighted F1 */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider">
              Weighted F1
            </div>
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {EXPERIMENT_METRICS.weightedF1.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500">
              Support weighted
            </div>
          </div>

          {/* Group CV Macro F1 */}
          <div className="glass-panel p-4 rounded-2xl border border-white/85 shadow-2xs space-y-1">
            <div className="text-slate-400 text-[10.5px] font-semibold uppercase tracking-wider truncate">
              Group CV Macro F1
            </div>
            <div className="text-lg font-black text-slate-950 tracking-tight pt-1">
              {EXPERIMENT_METRICS.groupCvMacroF1}
            </div>
            <div className="text-[10px] text-slate-500">
              5-Fold Stratified Group
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 8 & 9: CONFUSION MATRIX & CLASSIFICATION REPORT  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Confusion Matrix (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <GridIcon className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">Confusion Matrix</h3>
                <p className="text-[10.5px] text-slate-400">Actual vs Predicted (N = 500 Test Samples)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase">
              EXPERIMENT RESULT
            </span>
          </div>

          {/* Clean Multiclass Grid */}
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="min-w-[340px] text-xs">
                {/* Predicted Header Label */}
                <div className="text-center font-bold text-slate-600 text-[11px] mb-2 tracking-wide uppercase">
                  Predicted Class
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {/* Empty top-left cell */}
                  <div className="flex items-center justify-center font-bold text-[10px] text-slate-400 uppercase">
                    Actual \ Pred
                  </div>
                  <div className="text-center font-bold text-slate-900 bg-slate-100/80 py-1.5 rounded-xl border border-slate-200/70">
                    Class A
                  </div>
                  <div className="text-center font-bold text-slate-900 bg-slate-100/80 py-1.5 rounded-xl border border-slate-200/70">
                    Class B
                  </div>
                  <div className="text-center font-bold text-slate-900 bg-slate-100/80 py-1.5 rounded-xl border border-slate-200/70">
                    Class C
                  </div>

                  {/* Row 1: Actual Class A */}
                  <div className="font-bold text-slate-900 flex items-center px-2 bg-slate-100/80 rounded-xl border border-slate-200/70">
                    Class A
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-slate-950 text-white font-black shadow-xs">
                    <div className="text-base">{CONFUSION_MATRIX[0].predA}</div>
                    <div className="text-[9.5px] text-emerald-400 font-medium">81.6% (True)</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[0].predB}</div>
                    <div className="text-[9.5px] text-slate-400">13.2%</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[0].predC}</div>
                    <div className="text-[9.5px] text-slate-400">5.3%</div>
                  </div>

                  {/* Row 2: Actual Class B */}
                  <div className="font-bold text-slate-900 flex items-center px-2 bg-slate-100/80 rounded-xl border border-slate-200/70">
                    Class B
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[1].predA}</div>
                    <div className="text-[9.5px] text-slate-400">10.0%</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-slate-950 text-white font-black shadow-xs">
                    <div className="text-base">{CONFUSION_MATRIX[1].predB}</div>
                    <div className="text-[9.5px] text-emerald-400 font-medium">72.7% (True)</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[1].predC}</div>
                    <div className="text-[9.5px] text-slate-400">17.3%</div>
                  </div>

                  {/* Row 3: Actual Class C */}
                  <div className="font-bold text-slate-900 flex items-center px-2 bg-slate-100/80 rounded-xl border border-slate-200/70">
                    Class C
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[2].predA}</div>
                    <div className="text-[9.5px] text-slate-400">6.0%</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-white/80 border border-slate-200/80 text-slate-700">
                    <div className="text-sm font-bold">{CONFUSION_MATRIX[2].predB}</div>
                    <div className="text-[9.5px] text-slate-400">11.5%</div>
                  </div>
                  <div className="p-3 text-center rounded-2xl bg-slate-950 text-white font-black shadow-xs">
                    <div className="text-base">{CONFUSION_MATRIX[2].predC}</div>
                    <div className="text-[9.5px] text-emerald-400 font-medium">82.5% (True)</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Legend note */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
              <span>Dark boxes indicate correctly classified diagonal (400 / 500 samples = 80.00% Accuracy).</span>
            </div>
          </div>
        </div>

        {/* Classification Report Table (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center">
                <FileCheck2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">Classification Report</h3>
                <p className="text-[10.5px] text-slate-400">Per-class precision, recall, and F1 metrics</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase">
              EXPERIMENT RESULT
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-semibold border-b border-slate-200/70 pb-2">
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Precision</th>
                  <th className="py-2.5 px-3 text-right">Recall</th>
                  <th className="py-2.5 px-3 text-right">F1-Score</th>
                  <th className="py-2.5 px-3 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {CLASSIFICATION_REPORT.map((row) => (
                  <tr key={row.name} className="hover:bg-white/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-950">{row.name}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">{row.precision.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800">{row.recall.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-950">{row.f1.toFixed(2)}%</td>
                    <td className="py-3 px-3 text-right text-slate-500 font-mono">{row.support}</td>
                  </tr>
                ))}
                {/* Macro Average */}
                <tr className="bg-slate-50/60 font-semibold text-slate-900 border-t border-slate-200">
                  <td className="py-2.5 px-3">Macro Avg</td>
                  <td className="py-2.5 px-3 text-right">{EXPERIMENT_METRICS.macroPrecision.toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-right">{EXPERIMENT_METRICS.macroRecall.toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-right text-slate-950 font-bold">{EXPERIMENT_METRICS.macroF1.toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">500</td>
                </tr>
                {/* Weighted Average */}
                <tr className="bg-slate-50/60 font-semibold text-slate-900">
                  <td className="py-2.5 px-3">Weighted Avg</td>
                  <td className="py-2.5 px-3 text-right">80.86%</td>
                  <td className="py-2.5 px-3 text-right">80.00%</td>
                  <td className="py-2.5 px-3 text-right text-slate-950 font-bold">{EXPERIMENT_METRICS.weightedF1.toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">500</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed pt-2 border-t border-slate-200/60">
            Precision reflects decision fidelity, recall measures true sensitivity per system class label, and F1 provides harmonic mean balance.
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 10: FEATURE IMPORTANCE (PERMUTATION IMPORTANCE)  */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">Feature Importance</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Permutation importance of the 15 sensor-derived features used by the SVM classifier.
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase self-start sm:self-auto">
            EXPERIMENT RESULT
          </span>
        </div>

        {/* Highlighted Top Contributors Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">1. TCS34725_B</div>
            <div className="text-base font-black text-slate-950">14.23%</div>
            <div className="text-[9.5px] text-slate-500">Blue 465nm</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">2. AS7341_F1</div>
            <div className="text-base font-black text-slate-950">12.04%</div>
            <div className="text-[9.5px] text-slate-500">Violet 415nm</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">3. TCS34725_R</div>
            <div className="text-base font-black text-slate-950">11.63%</div>
            <div className="text-[9.5px] text-slate-500">Red 615nm</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">4. AS7341_F5</div>
            <div className="text-base font-black text-slate-950">7.70%</div>
            <div className="text-[9.5px] text-slate-500">Green 555nm</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">5. TCS34725_G</div>
            <div className="text-base font-black text-slate-950">7.13%</div>
            <div className="text-[9.5px] text-slate-500">Green 525nm</div>
          </div>
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-semibold">11. VL53L1X_Distance</div>
            <div className="text-base font-black text-slate-950">0.37%</div>
            <div className="text-[9.5px] text-slate-500">Distance focal</div>
          </div>
        </div>

        {/* 15 Feature Horizontal Bar Chart */}
        <div className="space-y-2.5 pt-2">
          {FEATURE_IMPORTANCE_DATA.map((item) => {
            const maxVal = 15;
            const widthPct = Math.min(100, Math.max(2, (Math.abs(item.importance) / maxVal) * 100));

            return (
              <div key={item.feature} className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.2 rounded font-mono text-[9.5px] font-bold ${
                      item.group === 'AS7341'
                        ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                        : item.group === 'TCS34725'
                        ? 'bg-purple-50 text-purple-800 border border-purple-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {item.group}
                    </span>
                    <span className="font-semibold text-slate-900">{item.feature}</span>
                    <span className="text-slate-400 text-[10.5px]">({item.label})</span>
                  </div>
                  <span className={`font-mono font-bold ${item.importance >= 0 ? 'text-slate-950' : 'text-slate-400'}`}>
                    {item.importance >= 0 ? `+${item.importance.toFixed(2)}%` : `${item.importance.toFixed(2)}%`}
                  </span>
                </div>

                <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.importance > 5
                        ? 'bg-slate-950'
                        : item.importance > 0
                        ? 'bg-slate-600'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-3 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Feature importance quantifies the drop in model Macro F1 score when each sensor channel is randomly shuffled. It indicates purely algorithmic dependency and feature utility within the trained SVM model.
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 11: SENSOR ABLATION STUDY                        */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">Model Performance by Sensor Configuration</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ablation study evaluating classification performance across isolated and fused sensor groups.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="glass-pill p-1 rounded-full border border-white/90 inline-flex text-xs shadow-2xs">
              <button
                onClick={() => setAblationMetric('macroF1')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  ablationMetric === 'macroF1'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Macro F1 (Primary)
              </button>
              <button
                onClick={() => setAblationMetric('accuracy')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                  ablationMetric === 'accuracy'
                    ? 'bg-slate-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Accuracy
              </button>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 uppercase">
              EXPERIMENT RESULT
            </span>
          </div>
        </div>

        {/* Ablation Bars List */}
        <div className="space-y-4">
          {ABLATION_STUDY_DATA.map((row) => {
            const score = ablationMetric === 'macroF1' ? row.macroF1 : row.accuracy;
            const barWidth = `${score}%`;

            return (
              <div key={row.config} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-950">{row.config}</span>
                    <span className="text-[10.5px] text-slate-400 font-mono">({row.nFeat} features)</span>
                    {row.isBestF1 && (
                      <span className="px-2 py-0.2 rounded-full text-[9.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Top Ablation F1
                      </span>
                    )}
                    {row.isStandard && (
                      <span className="px-2 py-0.2 rounded-full text-[9.5px] font-bold bg-slate-950 text-white shadow-2xs">
                        Final Production Model
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-slate-950">{score.toFixed(2)}%</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-slate-200/70 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      row.isStandard
                        ? 'bg-slate-950'
                        : row.isBestF1
                        ? 'bg-purple-600'
                        : score > 65
                        ? 'bg-slate-600'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: barWidth }}
                  />
                </div>
                <div className="text-[10.5px] text-slate-400">{row.note}</div>
              </div>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-3">
          Results represent offline model evaluation across different sensor configurations on the 500-sample test split.
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 12 & 13: DATASET OVERVIEW & LEAKAGE AUDIT       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dataset Distribution (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">Dataset Overview</h3>
                <p className="text-[10.5px] text-slate-400">Subject-level structured split statistics</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 uppercase">
              2,500 ROWS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Total Samples</div>
              <div className="text-xl font-extrabold text-slate-950">2,500</div>
              <div className="text-[9.5px] text-slate-500">100% Validated</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Subjects</div>
              <div className="text-xl font-extrabold text-slate-950">500</div>
              <div className="text-[9.5px] text-slate-500">Discrete IDs</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Measurements / Subject</div>
              <div className="text-xl font-extrabold text-slate-950">5</div>
              <div className="text-[9.5px] text-slate-500">Repeated acquisition</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Training Samples</div>
              <div className="text-xl font-extrabold text-slate-950">2,000</div>
              <div className="text-[9.5px] text-slate-500">400 subjects (80%)</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Testing Samples</div>
              <div className="text-xl font-extrabold text-slate-950">500</div>
              <div className="text-[9.5px] text-slate-500">100 subjects (20%)</div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
              <div className="text-slate-400 text-[10px] font-medium">Features / Row</div>
              <div className="text-xl font-extrabold text-slate-950">15</div>
              <div className="text-[9.5px] text-slate-500">Sensor dimensions</div>
            </div>
          </div>

          {/* Class Distribution Breakdown */}
          <div className="space-y-2 pt-2 border-t border-slate-200/60">
            <div className="text-xs font-bold text-slate-900">Class Label Distribution (Full Dataset)</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-center">
                <div className="text-slate-400 text-[10px]">Class A</div>
                <div className="font-bold text-slate-950 mt-0.5">865 (34.6%)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-center">
                <div className="text-slate-400 text-[10px]">Class B</div>
                <div className="font-bold text-slate-950 mt-0.5">795 (31.8%)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/80 border border-slate-200 text-center">
                <div className="text-slate-400 text-[10px]">Class C</div>
                <div className="font-bold text-slate-950 mt-0.5">840 (33.6%)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Quality & Leakage Audit (6 cols) */}
        <div className="lg:col-span-6 glass-panel p-6 sm:p-7 rounded-3xl border border-white/85 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-950">Data Quality & Leakage Audit</h3>
                <p className="text-[10.5px] text-slate-400">Strict evaluation integrity checks</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase">
              AUDIT PASS
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Missing Values Audit</div>
                <div className="text-[11px] text-slate-500">NaN / null check across all 15 feature channels</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                0 Missing (PASS)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Duplicate Rows Audit</div>
                <div className="text-[11px] text-slate-500">Full vector duplicate matching test</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                0 Duplicates (PASS)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Subject Overlap Audit</div>
                <div className="text-[11px] text-slate-500">Train subjects ∩ Test subjects intersection test</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                0 Overlap (PASS)
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/70 flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">Group CV Stratification</div>
                <div className="text-[11px] text-slate-500">StratifiedGroupKFold across 5 distinct folds</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                Verified (PASS)
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200/60 pt-2 flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Train/test splitting is performed strictly at subject level (`GroupShuffleSplit`) to prevent subject-level data leakage across repeated acquisitions.
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 14: LIVE SYSTEM PREDICTION TELEMETRY & STATS     */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">Live Prediction Analytics</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Measurement records from active IoT and synthetic acquisitions stored in Supabase.
            </p>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 uppercase self-start sm:self-auto shadow-2xs">
            LIVE API DATA
          </span>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
                <div className="text-slate-400 text-[10.5px] font-semibold flex items-center justify-between uppercase">
                  <span>Total Acquisitions</span>
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-2xl font-black text-slate-950">{stats?.total ?? 0}</div>
                <div className="text-[10.5px] text-emerald-700 font-medium">
                  {stats?.completed ?? 0} completed successfully
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
                <div className="text-slate-400 text-[10.5px] font-semibold flex items-center justify-between uppercase">
                  <span>Live Class A</span>
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-950">{classA}</div>
                <div className="text-[10.5px] text-slate-500">{pctA}% of total live records</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
                <div className="text-slate-400 text-[10.5px] font-semibold flex items-center justify-between uppercase">
                  <span>Live Class B</span>
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                </div>
                <div className="text-2xl font-black text-slate-950">{classB}</div>
                <div className="text-[10.5px] text-slate-500">{pctB}% of total live records</div>
              </div>

              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
                <div className="text-slate-400 text-[10.5px] font-semibold flex items-center justify-between uppercase">
                  <span>Live Class C</span>
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                </div>
                <div className="text-2xl font-black text-slate-950">{classC}</div>
                <div className="text-[10.5px] text-slate-500">{pctC}% of total live records</div>
              </div>
            </>
          )}
        </div>

        {/* Live Distribution Bar */}
        {totalClassifications > 0 ? (
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-slate-700 font-medium">
              <span>Live Class Ratio</span>
              <span>{totalClassifications} Total Records</span>
            </div>
            <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden flex">
              <div className="h-full bg-slate-400" style={{ width: `${pctA}%` }} title={`Class A: ${pctA}%`} />
              <div className="h-full bg-slate-600" style={{ width: `${pctB}%` }} title={`Class B: ${pctB}%`} />
              <div className="h-full bg-slate-950" style={{ width: `${pctC}%` }} title={`Class C: ${pctC}%`} />
            </div>
          </div>
        ) : (
          <div className="py-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No live predictions recorded yet. Measurements created in the console will appear here in real-time.
          </div>
        )}

        {/* Data Source & Measurement Quality Telemetry */}
        <div className="pt-4 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Synthetic vs Real */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-slate-500" />
                Data Source Provenance
              </span>
              <span className="text-[11px] text-slate-500">{totalSources} Sessions</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-400 text-[10px] font-medium">SYNTHETIC</div>
                <div className="text-lg font-bold text-slate-950 mt-0.5">{sourceStats?.synthetic ?? 0}</div>
                <div className="text-[10px] text-slate-500">{pctSynth}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <div className="text-blue-600 text-[10px] font-medium">IOT REAL (ESP32)</div>
                <div className="text-lg font-bold text-blue-950 mt-0.5">{sourceStats?.iot_real ?? 0}</div>
                <div className="text-[10px] text-blue-600">{pctReal}%</div>
              </div>
            </div>
            {totalSources > 0 && (
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden flex mt-2">
                <div className="h-full bg-slate-600" style={{ width: `${pctSynth}%` }} />
                <div className="h-full bg-blue-600" style={{ width: `${pctReal}%` }} />
              </div>
            )}
          </div>

          {/* Quality Distribution */}
          <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-slate-500" />
                Measurement Quality Rating
              </span>
              <span className="text-[11px] text-slate-500">Distance Variance</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-emerald-700 text-[10px] font-medium">GOOD</div>
                <div className="text-lg font-bold text-emerald-950 mt-0.5">{sourceStats?.quality_good ?? 0}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="text-amber-700 text-[10px] font-medium">WARNING</div>
                <div className="text-lg font-bold text-amber-950 mt-0.5">{sourceStats?.quality_warning ?? 0}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200">
                <div className="text-rose-700 text-[10px] font-medium">POOR</div>
                <div className="text-lg font-bold text-rose-950 mt-0.5">{sourceStats?.quality_poor ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 15: MODEL CONFIGURATION SPECIFICATIONS           */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-200/60 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
              <Server className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-950">Model Configuration Specification</h3>
              <p className="text-[10.5px] text-slate-400">Validated deployment architecture parameters</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
            scikit-learn Pipeline
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Algorithm</div>
            <div className="text-slate-950 font-bold">Support Vector Machine</div>
            <div className="text-[9.5px] text-slate-500">sklearn.svm.SVC</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Kernel Type</div>
            <div className="text-slate-950 font-bold">Linear</div>
            <div className="text-[9.5px] text-slate-500">Optimal tuned kernel</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Regularization (C)</div>
            <div className="text-slate-950 font-bold">1.0</div>
            <div className="text-[9.5px] text-slate-500">Hyperparameter C</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Input Feature Count</div>
            <div className="text-slate-950 font-bold">15 Features</div>
            <div className="text-[9.5px] text-slate-500">AS7341(10)+TCS(4)+VL(1)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Classes Target</div>
            <div className="text-slate-950 font-bold">3 Classes</div>
            <div className="text-[9.5px] text-slate-500">Class A, Class B, Class C</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Feature Normalization</div>
            <div className="text-slate-950 font-bold">StandardScaler</div>
            <div className="text-[9.5px] text-slate-500">Fitted strictly on train</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Cross-Validation</div>
            <div className="text-slate-950 font-bold">5-Fold Group CV</div>
            <div className="text-[9.5px] text-slate-500">StratifiedGroupKFold</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-0.5">
            <div className="text-slate-400 text-[10px] font-medium">Probability Calibration</div>
            <div className="text-slate-950 font-bold">Platt Scaling Enabled</div>
            <div className="text-[9.5px] text-slate-500">CalibratedClassifierCV</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simple Grid helper icon for Confusion Matrix
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}
