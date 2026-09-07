import { ApiResponse, User, Device, Measurement, MlPrediction, MlModel, SensorReading } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('phenonode_token');
  }

  setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('phenonode_token', token);
    } else {
      localStorage.removeItem('phenonode_token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_BASE}${cleanEndpoint}`;

    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      const json: ApiResponse<T> = await res.json();

      if (!res.ok) {
        throw new Error(json.message || `Request failed with status ${res.status}`);
      }

      return json;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error';
      throw new Error(errorMsg);
    }
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
    getAll: (params?: { page?: number; limit?: number; status?: string; user_id?: string; device_id?: string }) => {
      const q = new URLSearchParams();
      if (params?.page) q.set('page', params.page.toString());
      if (params?.limit) q.set('limit', params.limit.toString());
      if (params?.status) q.set('status', params.status);
      if (params?.user_id) q.set('user_id', params.user_id);
      if (params?.device_id) q.set('device_id', params.device_id);
      return this.request<Measurement[]>(`/measurements?${q.toString()}`);
    },
    getById: (id: string) => this.request<Measurement>(`/measurements/${id}`),
    create: (payload: { user_id: string; device_id: string }) =>
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
      sensors: unknown;
    }) =>
      this.request<{ measurement: Measurement; predictionResult?: unknown }>('/iot/measurements', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  };
}

export const api = new ApiClient();
