'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  PlayCircle,
  Cpu,
  Gauge,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Loader2,
  Layers,
  History,
  Download,
  ChevronDown,
  Info,
  GitBranch,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { AssessmentResult, Device, Measurement, MlPrediction, DataSource } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { ErrorBanner } from '../../../components/ErrorBanner';

type StepState =
  | 'IDLE'
  | 'START_REQUESTED'
  | 'DISTANCE_VALIDATION'
  | 'MEASURING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export default function MeasurementPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [dataSource, setDataSource] = useState<DataSource>('synthetic');
  const [step, setStep] = useState<StepState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [sampleCount, setSampleCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [distanceMm, setDistanceMm] = useState(42.5);
  const [currentMeasurement, setCurrentMeasurement] = useState<Measurement | null>(null);
  const [prediction, setPrediction] = useState<MlPrediction | null>(null);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [openSection, setOpenSection] = useState<'meaning' | 'pipeline' | 'technical' | null>('meaning');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfExportError, setPdfExportError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load available devices
  useEffect(() => {
    api.devices
      .getAll()
      .then((res) => {
        if (res.success && res.data.length > 0) {
          setDevices(res.data);
          setSelectedDeviceId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fallback
      });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Helper to generate 20 realistic raw sensor samples (15 features each)
  const generate20Samples = (baseDistance: number) => {
    const samples = [];
    // Base spectral profile around healthy tissue with small natural sensor noise
    const baseAS = [1240, 1460, 1680, 1890, 1420, 1200, 980, 760, 2100, 850];
    const baseRGB = [185, 142, 122, 210];

    for (let i = 1; i <= 20; i++) {
      const jitter = (Math.random() - 0.5) * 20;
      const distJitter = (Math.random() - 0.5) * 1.2;

      samples.push({
        sample_number: i,
        timestamp: new Date(Date.now() - (20 - i) * 150).toISOString(),
        as7341: {
          f1: Math.round(baseAS[0] + jitter),
          f2: Math.round(baseAS[1] + jitter * 1.1),
          f3: Math.round(baseAS[2] + jitter * 1.2),
          f4: Math.round(baseAS[3] + jitter * 1.3),
          f5: Math.round(baseAS[4] + jitter * 1.1),
          f6: Math.round(baseAS[5] + jitter * 0.9),
          f7: Math.round(baseAS[6] + jitter * 0.8),
          f8: Math.round(baseAS[7] + jitter * 0.7),
          clear: Math.round(baseAS[8] + jitter * 1.5),
          nir: Math.round(baseAS[9] + jitter * 0.9),
        },
        tcs34725: {
          r: Math.round(baseRGB[0] + (Math.random() - 0.5) * 6),
          g: Math.round(baseRGB[1] + (Math.random() - 0.5) * 5),
          b: Math.round(baseRGB[2] + (Math.random() - 0.5) * 5),
          clear: Math.round(baseRGB[3] + (Math.random() - 0.5) * 8),
        },
        vl53l1x: {
          distance_mm: Number((baseDistance + distJitter).toFixed(1)),
        },
      });
    }
    return samples;
  };

  const startMeasurement = async () => {
    if (!user) {
      setError('User context not found. Please log in again.');
      return;
    }

    setError(null);
    setStep('START_REQUESTED');
    setProgress(5);
    setElapsedTime(0);
    setSampleCount(0);

    const startTime = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - startTime) / 1000);
    }, 100);

    try {
      // 1. Create measurement session in backend
      const deviceId = selectedDeviceId || '00000000-0000-0000-0000-000000000001';
      let measurement: Measurement | null = null;

      try {
        const createRes = await api.measurements.create({
          user_id: user.id,
          device_id: deviceId,
          data_source: dataSource,
        });
        if (createRes.success && createRes.data) {
          measurement = createRes.data;
          setCurrentMeasurement(measurement);
        }
      } catch {
        // Fallback synthetic session
        measurement = {
          id: `meas-${Date.now()}`,
          measurement_code: `MEAS-${Math.floor(10000 + Math.random() * 90000)}`,
          user_id: user.id,
          device_id: deviceId,
          sample_count: 20,
          quality: 'GOOD',
          data_source: dataSource,
          status: 'IN_PROGRESS',
          created_at: new Date().toISOString(),
        };
        setCurrentMeasurement(measurement);
      }

      // Step 2: Distance Validation (VL53L1X)
      await new Promise((r) => setTimeout(r, 800));
      setStep('DISTANCE_VALIDATION');
      setProgress(20);
      setDistanceMm(38.2);

      // Step 3: Measuring (20 Samples loop)
      await new Promise((r) => setTimeout(r, 800));
      setStep('MEASURING');

      for (let s = 1; s <= 20; s++) {
        setSampleCount(s);
        setProgress(20 + Math.round((s / 20) * 50));
        await new Promise((r) => setTimeout(r, 120));
      }

      // Step 4: Processing & ML SVM Inference
      setStep('PROCESSING');
      setProgress(80);

      const samples20 = generate20Samples(38.2);

      try {
        const procRes = await api.iot.sendMeasurement({
          device_id: measurement?.device_id || deviceId,
          measurement_id: measurement?.id || 'MEAS-00001',
          data_source: dataSource,
          samples: samples20,
        });

        if (procRes.success && procRes.data) {
          if (procRes.data.measurement) {
            setCurrentMeasurement(procRes.data.measurement);
          }
          if (procRes.data.predictionResult) {
            setPrediction(procRes.data.predictionResult as MlPrediction);
          }
          if (procRes.data.measurement?.id) {
            setAssessmentLoading(true);
            try {
              const assessmentRes = await api.assessments.getByMeasurementId(procRes.data.measurement.id);
              if (assessmentRes.success) setAssessment(assessmentRes.data);
            } catch {
              setAssessment(null);
            } finally {
              setAssessmentLoading(false);
            }
          }
        } else {
          throw new Error(procRes.message || 'Failed to process sensor measurement in backend');
        }

        // Step 5: Completed
        if (timerRef.current) clearInterval(timerRef.current);
        setStep('COMPLETED');
        setProgress(100);
      } catch (procErr) {
        throw procErr;
      }
    } catch (err: unknown) {
      if (timerRef.current) clearInterval(timerRef.current);
      setError(err instanceof Error ? err.message : 'Measurement session failed');
      setStep('FAILED');
    }
  };

  const resetMeasurement = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('IDLE');
    setProgress(0);
    setSampleCount(0);
    setElapsedTime(0);
    setCurrentMeasurement(null);
    setPrediction(null);
    setAssessment(null);
    setOpenSection('meaning');
    setPdfExportError(null);
    setError(null);
  };

  const handleExportPdf = async () => {
    if (!currentMeasurement?.id) return;
    try {
      setExportingPdf(true);
      setPdfExportError(null);
      await api.measurements.downloadPdf(currentMeasurement.id);
    } catch (exportError) {
      setPdfExportError(exportError instanceof Error ? exportError.message : 'Gagal mengekspor PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || devices[0];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Measurement Console</h2>
          <p className="text-xs text-slate-500 mt-1">
            20-sample guided multi-sensor acquisition with automatic SVM feature preprocessing & inference.
          </p>
        </div>

        {step === 'COMPLETED' && (
          <div className="flex items-center gap-2">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-all shadow-2xs cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>View in History</span>
            </Link>
            <button
              onClick={resetMeasurement}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Measurement</span>
            </button>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={resetMeasurement} />}

      {/* Hardware Node & Data Source Strip */}
      <div className="glass-panel p-5 rounded-3xl border border-white/85 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">Hardware Node</div>
          <div className="text-slate-950 font-bold flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-800" />
            <span>{selectedDevice?.device_code || 'ESP32-S3 Node Primary'}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">Data Source Mode</div>
          {step === 'IDLE' ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDataSource('synthetic')}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                  dataSource === 'synthetic'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Synthetic
              </button>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                Hardware pending
              </span>
            </div>
          ) : (
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                dataSource === 'iot_real' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {dataSource.toUpperCase()}
            </span>
          )}
        </div>

        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">Active Sensors (15 ch)</div>
          <div className="text-emerald-700 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>AS7341(10) · TCS(4) · VL53(1)</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-slate-400 text-[11px] font-medium">Current Distance</div>
          <div className="text-slate-900 font-bold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
            <span>{distanceMm.toFixed(1)} mm (Target: 35-50 mm)</span>
          </div>
        </div>
      </div>

      {/* Main Execution Flow Canvas */}
      {step === 'IDLE' && (
        <div className="glass-panel p-10 md:p-14 rounded-3xl border border-white/85 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-950 text-white mx-auto flex items-center justify-center shadow-md">
            <PlayCircle className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-2xl font-extrabold tracking-tight text-slate-950">Ready for 20x Sampling</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Place subject hand stable over the sensor aperture. 1 measurement session will capture exactly 20 raw
              telemetry samples across 15 sensor channels and send them for automated SVM classification.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={startMeasurement}
              className="w-full sm:w-auto px-8 py-4 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-md hover:scale-[1.01] active:scale-[0.99] tracking-wider cursor-pointer"
            >
              START 20x MEASUREMENT
            </button>
          </div>

          <div className="pt-4 text-xs text-slate-400">
            1 measurement = 20 raw sensor samples. Raw data is stored permanently for scientific research.
          </div>
        </div>
      )}

      {/* In-Progress Stepper */}
      {step !== 'IDLE' && step !== 'COMPLETED' && step !== 'FAILED' && (
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/85 space-y-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-slate-950 animate-spin" />
              <div>
                <h3 className="text-base font-bold text-slate-950 uppercase tracking-wider">
                  {step === 'START_REQUESTED' && 'Initializing Session...'}
                  {step === 'DISTANCE_VALIDATION' && 'Validating Focal Distance (VL53L1X)...'}
                  {step === 'MEASURING' && `Acquiring Sensor Samples (${sampleCount} / 20)...`}
                  {step === 'PROCESSING' && 'Preprocessing 15 Features & Running SVM...'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keep hand stable over sensor window until 20 samples are complete.
                </p>
              </div>
            </div>
            <span className="text-sm font-bold text-slate-950">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2.5 w-full bg-slate-200/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-950 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Live Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70">
              <div className="text-slate-400 text-[11px] font-medium">Elapsed Time</div>
              <div className="text-xl font-extrabold text-slate-950 mt-1">{elapsedTime.toFixed(1)}s</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70">
              <div className="text-slate-400 text-[11px] font-medium">Samples Acquired</div>
              <div className="text-xl font-extrabold text-slate-950 mt-1 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>{sampleCount} / 20</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70">
              <div className="text-slate-400 text-[11px] font-medium">Laser Distance</div>
              <div className="text-xl font-extrabold text-slate-950 mt-1">{distanceMm.toFixed(1)} mm</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70">
              <div className="text-slate-400 text-[11px] font-medium">Current Status</div>
              <div className="text-xs font-bold text-slate-900 mt-2 uppercase tracking-wide">
                {step.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Prediction Result Display */}
      {step === 'COMPLETED' && (
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/85 space-y-8 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">Classification Completed</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {currentMeasurement?.measurement_code || 'MEAS-00001'} • 20 Raw Samples Stored • Quality:{' '}
                  <span className="font-bold text-slate-800">{currentMeasurement?.quality || 'GOOD'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                {currentMeasurement?.data_source || dataSource}
              </span>
              <StatusBadge status="COMPLETED" size="md" />
            </div>
          </div>

          {/* Classification & Confidence Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identified Classification</div>
              <div className="text-4xl font-black tracking-tight text-slate-950">
                {prediction?.prediction?.replace('_', ' ') || '—'}
              </div>
              <div className="text-[11px] text-slate-500">
                Processed with calibrated Linear SVM model (C=1.0) using 15 aggregated spectral-color-distance features.
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/70 border border-slate-200/70 space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence Score</div>
              <div className="text-4xl font-black tracking-tight text-slate-950">
                {prediction ? `${(prediction.confidence * 100).toFixed(2)}%` : '—'}
              </div>
              <div className="text-[11px] text-slate-500">
                Calibrated posterior probability from SVM decision hyperplanes.
              </div>
            </div>
          </div>

          {/* Interpretation and provenance */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'meaning' ? null : 'meaning')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-left cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Info className="w-5 h-5 text-amber-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-950">Research Classification Mapping</span>
                  <span className="block text-xs text-slate-600 mt-1">Simulated interpretation of the identified SVM class.</span>
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openSection === 'meaning' ? 'rotate-180' : ''}`} />
            </button>
            {openSection === 'meaning' && (
              <div className="p-5 rounded-2xl border border-slate-200/70 bg-white/70 space-y-3">
                {assessmentLoading ? (
                  <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
                ) : assessment?.assessment.mapping_available ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Research Profile (Simulation)</p>
                      <p className="text-2xl font-black text-slate-950 mt-1">{assessment.assessment.classification_profile || 'Belum tersedia'}</p>
                      <p className="text-xs leading-relaxed text-slate-600 mt-2">{assessment.assessment.classification_description || 'Belum tersedia'}</p>
                      <p className="text-[11px] font-semibold text-amber-700 mt-2">{assessment.assessment.mapping_mode === 'demo' ? 'SIMULATION ONLY - not an official assessment' : `Mapping ${assessment.assessment.mapping_version}`}</p>
                    </div>
                    {assessment.assessment.dimensions.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{assessment.assessment.dimensions.map((dimension) => <div key={dimension.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200"><p className="text-xs font-bold text-slate-900">{dimension.name}</p><p className="text-[11px] text-emerald-700 font-semibold mt-1">{dimension.score}/100 · {dimension.level}</p></div>)}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assessment.assessment.characteristics.map((item) => (
                        <div key={item.title} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                          <p className="text-sm font-bold text-slate-900">{item.title}</p>
                          {item.level && <p className="text-[11px] text-emerald-700 font-semibold mt-1">{item.level}</p>}
                          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">Mapping {assessment.assessment.mapping_version} · Acquisition Version {assessment.assessment.assessment_version}</p>
                  </div>
                ) : assessment?.assessment.status === 'MAPPING_NOT_CONFIGURED' || assessment?.assessment.status === 'UNKNOWN_CLASS' ? (
                  <>
                    <p className="text-sm font-semibold text-slate-900">Research mapping not configured for this class.</p>
                    <p className="text-xs leading-relaxed text-slate-600">
                      Characteristics and research profiles are not displayed without an established methodology mapping. PHENOTYPE functions as a data acquisition platform.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-600">Classification mapping unavailable. Please complete a measurement session.</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'pipeline' ? null : 'pipeline')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/70 border border-slate-200/70 text-left cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <GitBranch className="w-5 h-5 text-slate-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-950">Why this result?</span>
                  <span className="block text-xs text-slate-500 mt-1">A transparent view of the processing path.</span>
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openSection === 'pipeline' ? 'rotate-180' : ''}`} />
            </button>
            {openSection === 'pipeline' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-5 rounded-2xl border border-slate-200/70 bg-white/50">
                {[
                  ['01', 'Measurement', `${currentMeasurement?.sample_count || 20} samples captured`],
                  ['02', 'Features', '15 sensor features aggregated'],
                  ['03', 'SVM', prediction?.model_version || 'Model version unavailable'],
                  ['04', 'Assessment', assessment?.assessment.status === 'MAPPING_NOT_CONFIGURED' ? 'Mapping not configured' : 'Awaiting result'],
                ].map(([number, title, detail]) => (
                  <div key={number} className="p-4 border-l-2 border-slate-300">
                    <div className="text-[10px] font-bold tracking-widest text-slate-400">{number}</div>
                    <div className="text-sm font-bold text-slate-900 mt-2">{title}</div>
                    <div className="text-xs text-slate-500 mt-1">{detail}</div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setOpenSection(openSection === 'technical' ? null : 'technical')}
              className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/70 border border-slate-200/70 text-left cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Layers className="w-5 h-5 text-slate-700" />
                <span>
                  <span className="block text-sm font-bold text-slate-950">Technical details</span>
                  <span className="block text-xs text-slate-500 mt-1">Raw and model metadata remain available without dominating the result.</span>
                </span>
              </span>
              <ChevronDown className={`w-5 h-5 text-slate-500 transition-transform ${openSection === 'technical' ? 'rotate-180' : ''}`} />
            </button>
            {openSection === 'technical' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 rounded-2xl border border-slate-200/70 bg-white/50 text-xs">
                <div><span className="block text-slate-400">Measurement ID</span><span className="block mt-1 font-semibold text-slate-900 break-all">{currentMeasurement?.id || 'Unavailable'}</span></div>
                <div><span className="block text-slate-400">Samples</span><span className="block mt-1 font-semibold text-slate-900">{currentMeasurement?.sample_count || 20}</span></div>
                <div><span className="block text-slate-400">Quality</span><span className="block mt-1 font-semibold text-slate-900">{currentMeasurement?.quality || 'Unavailable'}</span></div>
                <div><span className="block text-slate-400">Source</span><span className="block mt-1 font-semibold text-slate-900">{currentMeasurement?.data_source === 'iot_real' ? 'IoT real' : 'Synthetic simulation'}</span></div>
              </div>
            )}
          </div>

          {/* Probabilities Breakdown */}
          {prediction?.probabilities && (
            <div className="p-6 rounded-2xl bg-white/60 border border-slate-200/70 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wider text-slate-700">Class Probabilities Breakdown</span>
                <span>Model {prediction?.model_version || 'SVM-v1.0'}</span>
              </div>

              <div className="space-y-3">
                {Object.entries(prediction.probabilities).map(([cls, prob]) => {
                  const numProb = Number(prob) || 0;
                  const percent = (numProb * 100).toFixed(2);
                  const isWinner = cls === prediction.prediction;

                  return (
                    <div key={cls}>
                      <div className="flex justify-between text-xs font-medium mb-1">
                        <span className={isWinner ? 'text-slate-950 font-bold' : 'text-slate-600'}>
                          {cls.replace('_', ' ')} {isWinner && '(Identified)'}
                        </span>
                        <span className={isWinner ? 'text-slate-950 font-bold' : 'text-slate-600'}>{percent}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200/70 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinner ? 'bg-slate-950' : 'bg-slate-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
            <span className="text-slate-500 font-medium">
              Data successfully logged. 20 raw samples available for CSV export.
            </span>
            <div className="flex items-center gap-2">
              {pdfExportError && <span className="text-rose-600">{pdfExportError}</span>}
              {currentMeasurement?.id && (
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{exportingPdf ? 'Exporting PDF...' : 'Export PDF'}</span>
                </button>
              )}
              {currentMeasurement?.id && (
                <button
                  onClick={() => api.measurements.downloadRawSamplesCsv(currentMeasurement.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download 20 Raw Samples (CSV)</span>
                </button>
              )}
              <Link
                href="/history"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold shadow-sm cursor-pointer"
              >
                <span>Go to History Table →</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
