export type UserRole = 'ADMIN' | 'OPERATOR' | 'USER';
export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MEASURING' | 'ERROR';
export type MeasurementStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ML_PROCESSING_FAILED';
export type DataSource = 'synthetic' | 'iot_real';
export type MeasurementQuality = 'GOOD' | 'WARNING' | 'POOR';

// Class_A/Class_B/Class_C are synthetic research/simulation labels only.
// They carry no biological, personality, STIFIn, or assessment meaning.
export type LabelSemantics = 'synthetic_research_labels';

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
  r?: number;
  red?: number;
  g?: number;
  green?: number;
  b?: number;
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

export interface RawSensorSample {
  id?: string;
  measurement_id: string;
  sample_number: number;
  timestamp?: string;
  as7341_f1: number;
  as7341_f2: number;
  as7341_f3: number;
  as7341_f4: number;
  as7341_f5: number;
  as7341_f6: number;
  as7341_f7: number;
  as7341_f8: number;
  as7341_clear: number;
  as7341_nir: number;
  tcs34725_r: number;
  tcs34725_g: number;
  tcs34725_b: number;
  tcs34725_clear: number;
  vl53l1x_distance_mm: number;
  created_at?: string;
}

export interface MlPrediction {
  id: string;
  measurement_id: string;
  model_name: string;
  model_version: string;
  prediction: string;
  confidence: number;
  probability_class_a?: number;
  probability_class_b?: number;
  probability_class_c?: number;
  probabilities?: {
    Class_A?: number;
    Class_B?: number;
    Class_C?: number;
    [key: string]: number | undefined;
  };
  label_semantics?: LabelSemantics;
  processing_time_ms: number;
  created_at: string;
}

export interface AssessmentResult {
  measurement: {
    id: string;
    sample_count: number;
    quality: MeasurementQuality;
    data_source: DataSource;
  };
  prediction: {
    model_name: string;
    model_version: string;
    predicted_class: string;
    confidence: number;
    probabilities: MlPrediction['probabilities'] | null;
  } | null;
  assessment: {
    status: 'MAPPED' | 'MAPPING_NOT_CONFIGURED' | 'UNKNOWN_CLASS' | 'PREDICTION_NOT_AVAILABLE';
    mapping_available: boolean;
    mapping_version: string;
    assessment_version: string;
    mapping_mode: 'official' | 'demo';
    mapping_label: string;
    classification_profile: string | null;
    classification_description: string | null;
    dimensions: AssessmentDimension[];
    characteristics: AssessmentContentItem[];
    strengths: AssessmentContentItem[];
    developmentAreas: AssessmentContentItem[];
    recommendations: AssessmentContentItem[];
  };
}

export interface AssessmentContentItem {
  title: string;
  description: string;
  level?: string;
}

export interface AssessmentDimension {
  name: string;
  score: number;
  level: string;
  description: string;
}

export interface PatternChannelMetrics {
  mean: number;
  standardDeviation: number;
  coefficientOfVariation: number | null;
  slope: number | null;
  rSquared: number | null;
  outlierCount: number;
}

export interface PatternMetrics {
  channels: Record<string, PatternChannelMetrics>;
  averageCv: number | null;
  averageOutlierCount: number;
  trendChannel: string | null;
  trendSlope: number | null;
  trendRSquared: number | null;
  crossSensorPair: { first: string; second: string; correlation: number } | null;
  motionEvidence: boolean;
  available: boolean;
}

export interface Measurement {
  id: string;
  measurement_code: string;
  user_id: string;
  operator_id?: string;
  device_id: string;
  sample_count?: number;
  quality?: MeasurementQuality;
  data_source?: DataSource;
  prediction_id?: string;
  features_summary?: Record<string, number>;
  status: MeasurementStatus;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  user?: Partial<User>;
  device?: Partial<Device>;
  prediction?: MlPrediction | null;
  sensors?: SensorReading[];
  raw_samples?: RawSensorSample[];
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
