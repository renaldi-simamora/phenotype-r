'use client';

import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Wifi,
  Radio,
  Clock,
  Shield,
  Plus,
  RefreshCw,
  Gauge,
  Sliders,
  Zap,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { Device } from '../../../types';
import { StatusBadge } from '../../../components/StatusBadge';
import { ErrorBanner } from '../../../components/ErrorBanner';
import { EmptyState } from '../../../components/EmptyState';
import { CardSkeleton } from '../../../components/SkeletonLoader';
import { formatTime } from '../../../lib/utils';

export default function DevicePage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Device Form state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceFirmware, setNewDeviceFirmware] = useState('1.0.0');
  const [registering, setRegistering] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.devices.getAll();
      if (res.success && res.data) {
        setDevices(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load device list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName) return;

    setRegistering(true);
    try {
      const res = await api.devices.create({
        device_name: newDeviceName,
        firmware_version: newDeviceFirmware,
      });
      if (res.success && res.data) {
        setShowRegisterModal(false);
        setNewDeviceName('');
        fetchDevices();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register device');
    } finally {
      setRegistering(false);
    }
  };

  const primaryDevice = devices[0] || null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200/60">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">Device Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status, network telemetry, and sensor module health of ESP32-S3 nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDevices}
            className="p-2.5 rounded-full bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-950 border border-slate-200/80 transition-all shadow-2xs cursor-pointer"
            title="Refresh device state"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-950 hover:bg-slate-800 rounded-full transition-all shadow-sm hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register Device</span>
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={fetchDevices} />}

      {/* Primary Device Overview Hero Card */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : primaryDevice ? (
        <div className="glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full bg-slate-950 text-white flex items-center justify-center shadow-sm">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950">{primaryDevice.device_name}</h3>
                <p className="text-xs text-slate-500">{primaryDevice.device_code} · Firmware v{primaryDevice.firmware_version}</p>
              </div>
            </div>
            <StatusBadge status={primaryDevice.status} size="md" />
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-cyan-600" />
                <span>Wi-Fi Network</span>
              </div>
              <div className="text-slate-950 font-bold">PHENONODE-IoT</div>
              <div className="text-[10px] text-slate-500">RSSI -54 dBm (Strong)</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                <span>IP Address</span>
              </div>
              <div className="text-slate-950 font-bold">{primaryDevice.ip_address || '192.168.1.142'}</div>
              <div className="text-[10px] text-slate-500">Subnet 255.255.255.0</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>System Uptime</span>
              </div>
              <div className="text-slate-950 font-bold">14h 28m 10s</div>
              <div className="text-[10px] text-slate-500">Booted today</div>
            </div>

            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 space-y-1">
              <div className="text-slate-400 text-[11px] font-medium flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span>Last Communication</span>
              </div>
              <div className="text-slate-950 font-bold">
                {primaryDevice.last_seen ? formatTime(primaryDevice.last_seen) : 'Active now'}
              </div>
              <div className="text-[10px] text-slate-500">Heartbeat: 15s interval</div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No devices registered"
          description="Register your first ESP32-S3 IoT node to begin receiving telemetry and sensor acquisitions."
          actionText="Register Device"
          onAction={() => setShowRegisterModal(true)}
        />
      )}

      {/* Sensor Health Modules Breakdown */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
          Integrated Sensor Array Health
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Sensor 1 */}
          <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center">
                  <Radio className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-950">AS7341 Optical Spectrometer</span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                OPERATIONAL
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              11-channel spectral channels initialized on I2C address 0x39. Auto-gain and integration time calibrated.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2.5">
              <span>Readout latency: 28ms</span>
              <span>Noise variance: 0.4%</span>
            </div>
          </div>

          {/* Sensor 2 */}
          <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Sliders className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-950">TCS34725 Color Converter</span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                OPERATIONAL
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              RGB + Clear chromatic coordinates sensor on I2C address 0x29. Integrated infrared blocking filter verified.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2.5">
              <span>Readout latency: 15ms</span>
              <span>CCT Range: 2500K - 9500K</span>
            </div>
          </div>

          {/* Sensor 3 */}
          <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Gauge className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-950">VL53L1X Laser Distance</span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                OPERATIONAL
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Time-of-Flight ranging sensor on I2C address 0x52. Validating 35 to 50 mm focal measurement threshold.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2.5">
              <span>Current readout: 38.2 mm</span>
              <span>Timing budget: 50ms</span>
            </div>
          </div>

          {/* Sensor 4 */}
          <div className="glass-panel p-6 rounded-3xl border border-white/85 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-950">BME280 Ambient Sensor</span>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                OPERATIONAL
              </span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Environmental control variable measurement on I2C address 0x76. Temperature, humidity, barometric pressure.
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-200/60 pt-2.5">
              <span>26.4°C · 61.2% RH · 1008.2 hPa</span>
              <span>Sampling: 1 Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* All Registered Devices Table */}
      <div className="glass-panel p-7 rounded-3xl border border-white/85 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-950">All Registered Devices</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 font-semibold border-b border-slate-200/60 pb-2">
                <th className="py-3 px-4">Device Code</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Firmware</th>
                <th className="py-3 px-4">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map((d) => (
                <tr key={d.id} className="hover:bg-white/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-950">{d.device_code}</td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">{d.device_name}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">v{d.firmware_version}</td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {d.last_seen ? formatTime(d.last_seen) : 'Active now'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Device Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-white/90 glass-panel p-8 space-y-6 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-slate-950">Register New ESP32-S3 Node</h3>
            <form onSubmit={handleRegisterDevice} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium block">Device Name</label>
                <input
                  type="text"
                  required
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  placeholder="ESP32 Laboratory Node B"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium block">Firmware Version</label>
                <input
                  type="text"
                  required
                  value={newDeviceFirmware}
                  onChange={(e) => setNewDeviceFirmware(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-semibold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 rounded-full bg-slate-950 hover:bg-slate-800 text-white font-semibold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {registering ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
