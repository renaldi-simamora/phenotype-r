'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { api } from '../../../lib/api';
import { MlModel } from '../../../types';
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

export default function AnalyticsPage() {
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

  // Active sub-filter for ablation metric view
  const [ablationMetric, setAblationMetric] = useState<'macroF1' | 'accuracy'>('macroF1');

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
  }, []);

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

  return (
    <div className="space-y-10 pb-12">
      {/* ======================================================== */}
      {/* SECTION 1: SVM MODEL OVERVIEW & RESEARCH CONSOLE HEADER */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
              ML RESEARCH &amp; EVALUATION CONSOLE
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
              {EXPERIMENT_METRICS.modelVersion}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 uppercase shadow-2xs">
              ACTIVE
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
            SVM Model Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Support Vector Machine evaluation, multi-sensor feature permutation importance, and comprehensive ablation performance analysis.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="px-3 py-1.5 rounded-full glass-pill border border-white/90 text-slate-600 text-[11px] font-medium flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Linear Kernel (C=1.0)</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-slate-950 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>15 Features · 3 Classes</span>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* ======================================================== */}
      {/* PRIMARY MODEL METRICS CARDS (EXPERIMENT RESULT)          */}
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
      {/* SECTION 2 & 3: CONFUSION MATRIX & CLASSIFICATION REPORT  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Confusion Matrix (7 cols) */}
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
      {/* SECTION 4: FEATURE IMPORTANCE (PERMUTATION IMPORTANCE)   */}
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
            const maxVal = 15; // normalize bar width against 15%
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
      {/* SECTION 5: MULTI-SENSOR FUSION FLOW & CARD               */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
              <Workflow className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">Multi-Sensor Fusion Architecture</h3>
              <p className="text-xs text-slate-500">Integration of 15 features across 3 discrete hardware sensors</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            15 Canonical Dimensions
          </span>
        </div>

        {/* Fusion Cards Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          {/* Sensor 1: AS7341 */}
          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-950">
                <Radio className="w-4 h-4 text-cyan-600" />
                <span>AS7341</span>
              </div>
              <span className="text-[10px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                10 Features
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Optical spectral bands: F1 (415nm) to F8 (680nm), Clear, NIR (910nm).
            </p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200/60 pt-1.5">
              10 Spectral Features
            </div>
          </div>

          {/* Sensor 2: TCS34725 */}
          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-950">
                <Sliders className="w-4 h-4 text-purple-600" />
                <span>TCS34725</span>
              </div>
              <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                4 Features
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Chromatic coordinates: Red, Green, Blue, and Clear irradiance channels.
            </p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200/60 pt-1.5">
              4 Color Features
            </div>
          </div>

          {/* Sensor 3: VL53L1X */}
          <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-950">
                <Gauge className="w-4 h-4 text-amber-600" />
                <span>VL53L1X</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                1 Feature
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Time-of-Flight ranging focal check: Distance_mm (target 35-50 mm).
            </p>
            <div className="text-[10px] font-mono text-slate-400 border-t border-slate-200/60 pt-1.5">
              1 Distance Feature
            </div>
          </div>

          {/* Combined Fusion Vector Output */}
          <div className="p-5 rounded-2xl bg-slate-950 text-white space-y-2 text-xs shadow-md">
            <div className="flex items-center justify-between">
              <div className="font-bold flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-emerald-400" />
                <span>15-D Vector</span>
              </div>
              <span className="text-[9.5px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                Fused
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              StandardScaler normalized array fed directly into Linear SVM Decision Function.
            </p>
            <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
              3 Discrete Classes Output
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 6: ABLATION STUDY (PERFORMANCE BY SENSOR CONFIG) */}
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
      {/* SECTION 7: DATASET OVERVIEW & DATA QUALITY AUDIT         */}
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
                <h3 className="text-sm font-bold text-slate-950">Data Quality &amp; Leakage Audit</h3>
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
      {/* SECTION 8: LIVE SYSTEM PREDICTION TELEMETRY & STATS      */}
      {/* ======================================================== */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/85 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-base font-bold text-slate-950">Live System Prediction Analytics</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time measurement records stored in Supabase database from active IoT node acquisitions.
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
      {/* SECTION 9: MODEL CONFIGURATION SPECIFICATIONS            */}
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
