export type UserRole = 'ADMIN' | 'OPERATOR' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MEASURING' | 'ERROR';
export type MeasurementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ML_PROCESSING_FAILED';

export interface User {
  id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface Device {
  id: string;
  device_code: string;
  device_name: string;
  status: DeviceStatus;
  firmware_version: string;
  ip_address?: string;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface SpectralData {
  f1?: number;
  f2?: number;
  f3?: number;
  f4?: number;
  f5?: number;
  f6?: number;
  f7?: number;
  f8?: number;
  clear?: number;
  nir?: number;
  [key: string]: number | undefined;
}

export interface ColorData {
  red?: number;
  green?: number;
  blue?: number;
  clear?: number;
}

export interface DistanceData {
  distance_mm?: number;
}

export interface AmbientData {
  ambient_temperature_c?: number;
  humidity_percent?: number;
  pressure_hpa?: number;
}

export interface SensorPayload {
  as7341?: SpectralData;
  tcs34725?: ColorData;
  vl53l1x?: DistanceData;
}

export interface SensorReading {
  id: string;
  measurement_id: string;
  sensor_type: string;
  payload_json: SensorPayload;
  recorded_at: string;
}

export interface MlPrediction {
  id: string;
  measurement_id: string;
  model_name: string;
  model_version: string;
  prediction: string;
  confidence: number;
  processing_time_ms: number;
  created_at: string;
  probabilities?: Record<string, number>;
}

export interface Measurement {
  id: string;
  measurement_code: string;
  user_id: string;
  operator_id?: string;
  device_id: string;
  status: MeasurementStatus;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  user?: Partial<User>;
  device?: Partial<Device>;
  prediction?: MlPrediction | null;
  sensors?: SensorReading[];
}

export interface MlModel {
  id: string;
  model_name: string;
  version: string;
  status: 'ACTIVE' | 'DEPRECATED' | 'TESTING';
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix?: number[][];
  dataset_version: string;
  feature_version: string;
  trained_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    details?: unknown;
  };
}
