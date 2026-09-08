import { ApiResponse, User, Device, Measurement, MlPrediction, MlModel, SensorReading, RawSensorSample } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const PRIMARY_AUTH_KEY = 'phenotype_token' as const;
export const AUTH_STORAGE_KEYS = ['phenotype_token', 'phenonode_token'] as const;

/**
 * Checks if a JWT token is expired or malformed client-side without a network call.
 * Returns true if definitely expired, false if active or valid.
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token || typeof token !== 'string') return true;
  try {
    const trimmed = token.trim();
    if (!trimmed) return true;
    const parts = trimmed.split('.');
    if (parts.length !== 3) {
      return false; // Not standard JWT, don't falsely expire
    }
    const base64Url = parts[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    try {
      const jsonPayload = decodeURIComponent(
        binary
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const decoded = JSON.parse(jsonPayload);
      if (typeof decoded.exp === 'number') {
        return Date.now() >= decoded.exp * 1000;
      }
      return false;
    } catch {
      const decoded = JSON.parse(binary);
      if (typeof decoded.exp === 'number') {
        return Date.now() >= decoded.exp * 1000;
      }
      return false;
    }
  } catch {
    return false;
  }
}

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export const setOnUnauthorized = (listener: UnauthorizedListener | null) => {
  unauthorizedListener = listener;
};

class ApiClient {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const token = localStorage.getItem(PRIMARY_AUTH_KEY) || localStorage.getItem('phenonode_token');
      if (token && token.trim().length > 0) {
        if (isTokenExpired(token.trim())) {
          this.setToken(null);
          return null;
        }
        return token.trim();
      }

      // Fallback: Check Supabase session token in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
          try {
            const parsed = JSON.parse(localStorage.getItem(key) || '');
            if (parsed?.access_token && !isTokenExpired(parsed.access_token)) {
              return parsed.access_token;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    try {
      if (token && token.trim().length > 0) {
        localStorage.setItem(PRIMARY_AUTH_KEY, token.trim());
      } else {
        localStorage.removeItem(PRIMARY_AUTH_KEY);
        localStorage.removeItem('phenonode_token');
      }
    } catch {
      // Storage access may fail in restricted sandboxes
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token && token.trim().length > 0) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      // Centralized 401 Unauthorized handler
      if (res.status === 401) {
        const isAuthEndpoint = cleanEndpoint.includes('/auth/login') || cleanEndpoint.includes('/auth/register');
        if (!isAuthEndpoint) {
          this.setToken(null);
          if (unauthorizedListener) {
            unauthorizedListener();
          } else if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('phenotype:auth:401'));
          }
        }
        const json = await res.json().catch(() => ({
          success: false,
          message: isAuthEndpoint ? 'Invalid credentials' : 'Unauthorized session expired. Redirecting to home.',
        }));
        throw new Error(json.message || (isAuthEndpoint ? 'Invalid credentials' : 'Unauthorized session expired. Redirecting to home.'));
      }

      const json: ApiResponse<T> = await res.json().catch(() => ({
        success: false,
        message: `HTTP error ${res.status}`,
        data: null as unknown as T,
      }));

      if (!res.ok) {
        throw new Error(json.message || `Request failed with status ${res.status}`);
      }

      return json;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      throw new Error(errorMsg);
    }
  }

  async downloadFile(endpoint: string, defaultFilename: string): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token && token.trim().length > 0) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Download failed with status ${res.status}`);
    }

    const contentDisposition = res.headers.get('content-disposition');
    let filename = defaultFilename;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) filename = match[1];
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(blobUrl);
  }

  // Auth endpoints
  auth = {
    register: (payload: { full_name: string; email: string; password: string; confirm_password: string }) =>
      this.request<{ profile: User; session: { access_token: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      this.request<{ profile: User; session: { access_token: string } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMe: () => this.request<User>('/auth/me'),
  };

  // Devices endpoints
  devices = {
    getAll: (params?: { page?: number; limit?: number; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.status) q.set('status', params.status);
      return this.request<Device[]>(`/devices?${q.toString()}`);
    },
    getById: (id: string) => this.request<Device>(`/devices/${id}`),
    create: (payload: { device_name: string; firmware_version?: string }) =>
      this.request<Device>('/devices', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Device>) =>
      this.request<Device>(`/devices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
  };

  // Measurements endpoints
  measurements = {
    getAll: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      user_id?: string;
      device_id?: string;
      data_source?: string;
      quality?: string;
      classification?: string;
      start_date?: string;
      end_date?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.status) q.set('status', params.status);
      if (params?.user_id) q.set('user_id', params.user_id);
      if (params?.device_id) q.set('device_id', params.device_id);
      if (params?.data_source) q.set('data_source', params.data_source);
      if (params?.quality) q.set('quality', params.quality);
      if (params?.classification) q.set('classification', params.classification);
      if (params?.start_date) q.set('start_date', params.start_date);
      if (params?.end_date) q.set('end_date', params.end_date);
      return this.request<Measurement[]>(`/measurements?${q.toString()}`);
    },
    getById: (id: string) => this.request<Measurement>(`/measurements/${id}`),
    getRawSamples: (id: string) => this.request<RawSensorSample[]>(`/measurements/${id}/raw-samples`),
    create: (payload: { user_id: string; device_id: string; data_source?: string }) =>
      this.request<Measurement>('/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateStatus: (id: string, status: string) =>
      this.request<Measurement>(`/measurements/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    getSensors: (id: string) => this.request<SensorReading[]>(`/measurements/${id}/sensors`),
    downloadMeasurementsCsv: (params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.set(k, String(v));
        });
      }
      return this.downloadFile(`/measurements/export/csv?${q.toString()}`, `measurements_${Date.now()}.csv`);
    },
    downloadRawSamplesCsv: (measurementId?: string, params?: Record<string, string | number | undefined>) => {
      const q = new URLSearchParams();
      if (measurementId) q.set('measurement_id', measurementId);
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== '') q.set(k, String(v));
        });
      }
      return this.downloadFile(
        `/measurements/export/raw-csv?${q.toString()}`,
        `raw_samples_${measurementId || 'all'}_${Date.now()}.csv`
      );
    },
  };

  // ML endpoints
  ml = {
    getPrediction: (measurementId: string) =>
      this.request<MlPrediction>(`/ml/predictions/${measurementId}`),
    getModels: () => this.request<MlModel[]>('/ml/models'),
    getModelById: (id: string) => this.request<MlModel>(`/ml/models/${id}`),
  };

  // Analytics endpoints
  analytics = {
    getMeasurements: () =>
      this.request<{ total: number; completed: number; failed: number }>('/analytics/measurements'),
    getPredictions: () =>
      this.request<Record<string, number>>('/analytics/predictions'),
    getDataSources: () =>
      this.request<{
        synthetic: number;
        iot_real: number;
        quality_good: number;
        quality_warning: number;
        quality_poor: number;
      }>('/analytics/sources'),
    getDevices: () =>
      this.request<{ total: number; online: number; measuring: number; offline: number }>('/analytics/devices'),
    getModelPerformance: () =>
      this.request<MlModel[]>('/analytics/model-performance'),
  };

  // IoT Simulation / direct submission
  iot = {
    sendMeasurement: (payload: {
      device_id: string;
      measurement_id: string;
      data_source?: string;
      samples?: unknown[];
      sensors?: unknown;
    }) =>
      this.request<{ measurement: Measurement; predictionResult?: unknown; rawSamplesCount?: number }>('/iot/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };
}

export const api = new ApiClient();
