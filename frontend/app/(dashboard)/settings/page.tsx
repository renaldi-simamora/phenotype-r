'use client';

import React, { useState } from 'react';
import {
  User,
  Sliders,
  HardDrive,
  Binary,
  Save,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'measurement' | 'device' | 'model'>('account');

  // Account form
  const [fullName, setFullName] = useState(user?.full_name || 'Subject');
  const [email] = useState(user?.email || 'user@phenotype.edu');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Measurement params
  const [sampleCount, setSampleCount] = useState(10);
  const [measurementTimeout, setMeasurementTimeout] = useState(15);
  const [minDistance, setMinDistance] = useState(35);
  const [maxDistance, setMaxDistance] = useState(50);

  // Device params
  const [heartbeatInterval, setHeartbeatInterval] = useState(15);
  const [autoGain, setAutoGain] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">System Settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure operator account details, measurement thresholds, and hardware telemetry.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings saved successfully</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="glass-pill p-1.5 rounded-full border border-white/90 inline-flex flex-wrap gap-1 text-xs shadow-2xs">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'account'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
            }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Account</span>
        </button>

        <button
          onClick={() => setActiveTab('measurement')}
          className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'measurement'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
            }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Measurement</span>
        </button>

        <button
          onClick={() => setActiveTab('device')}
          className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'device'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
            }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Device Node</span>
        </button>

        <button
          onClick={() => setActiveTab('model')}
          className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === 'model'
              ? 'bg-slate-950 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
            }`}
        >
          <Binary className="w-3.5 h-3.5" />
          <span>Model Info</span>
        </button>
      </div>

      {/* Account Settings */}
      {activeTab === 'account' && (
        <form onSubmit={handleSave} className="glass-panel p-8 rounded-3xl border border-white/85 shadow-sm space-y-6 text-xs">
          <h3 className="text-sm font-bold text-slate-950">Operator Profile Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-slate-700 font-medium block">Change Password</label>
            <div className="relative max-w-sm">
              <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="New password (min 8 chars)"
                className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white placeholder:text-slate-400 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200/60">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Account Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* Measurement Settings */}
      {activeTab === 'measurement' && (
        <form onSubmit={handleSave} className="glass-panel p-8 rounded-3xl border border-white/85 shadow-sm space-y-6 text-xs">
          <h3 className="text-sm font-bold text-slate-950">Measurement Calibration Parameters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Sample Averaging Count</label>
              <input
                type="number"
                min="1"
                max="50"
                value={sampleCount}
                onChange={(e) => setSampleCount(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Number of sensor readings averaged per measurement</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Acquisition Timeout (seconds)</label>
              <input
                type="number"
                min="5"
                max="60"
                value={measurementTimeout}
                onChange={(e) => setMeasurementTimeout(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Max wait time before aborting acquisition</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Minimum Focal Distance (mm)</label>
              <input
                type="number"
                value={minDistance}
                onChange={(e) => setMinDistance(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Lower bound for VL53L1X position check</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Maximum Focal Distance (mm)</label>
              <input
                type="number"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Upper bound for VL53L1X position check</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200/60">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Update Measurement Parameters</span>
            </button>
          </div>
        </form>
      )}

      {/* Device Node Settings */}
      {activeTab === 'device' && (
        <form onSubmit={handleSave} className="glass-panel p-8 rounded-3xl border border-white/85 shadow-sm space-y-6 text-xs">
          <h3 className="text-sm font-bold text-slate-950">ESP32-S3 Hardware Configuration</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-slate-700 font-medium block">Telemetry Heartbeat Interval (seconds)</label>
              <input
                type="number"
                min="5"
                max="120"
                value={heartbeatInterval}
                onChange={(e) => setHeartbeatInterval(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
              />
              <p className="text-[11px] text-slate-500">Frequency of device alive pings to backend API</p>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-slate-700 font-medium block">Sensor Gain Optimization</label>
              <label className="flex items-center gap-2.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={autoGain}
                  onChange={(e) => setAutoGain(e.target.checked)}
                  className="rounded border-slate-300 text-slate-950 focus:ring-0"
                />
                <span>Enable automatic gain on AS7341 spectrometer</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200/60">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Node Config</span>
            </button>
          </div>
        </form>
      )}

      {/* Model Info */}
      {activeTab === 'model' && (
        <div className="glass-panel p-8 rounded-3xl border border-white/85 shadow-sm space-y-6 text-xs">
          <h3 className="text-sm font-bold text-slate-950">Machine Learning Model Metadata</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium">Algorithm</div>
              <div className="text-slate-950 font-bold text-sm">Support Vector Machine (SVC)</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium">Kernel Function</div>
              <div className="text-slate-950 font-bold text-sm">Linear Kernel (C=1.0)</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium">Feature Vector Count</div>
              <div className="text-slate-950 font-bold text-sm">15 Dimensions</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium">Active Version</div>
              <div className="text-purple-700 font-bold text-sm">SVM-v1.0</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/70 text-slate-600 text-[11px] leading-relaxed">
            The machine learning model operates in an isolated Python environment outside this frontend. Predictions are consumed strictly through server-to-server HTTP calls with zero local model retraining in the browser.
          </div>
        </div>
      )}
    </div>
  );
}
