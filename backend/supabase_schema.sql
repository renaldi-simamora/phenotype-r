-- 1. Profiles Table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('ADMIN', 'OPERATOR', 'USER')) DEFAULT 'USER',
  status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Devices Table (ESP32-S3 Nodes)
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL,
  device_key TEXT,
  status TEXT CHECK (status IN ('ONLINE', 'OFFLINE', 'MEASURING', 'ERROR')) DEFAULT 'OFFLINE',
  firmware_version TEXT DEFAULT '1.0.0',
  ip_address TEXT,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Measurements Table
CREATE TABLE IF NOT EXISTS public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  operator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
  sample_count INT DEFAULT 20,
  quality TEXT CHECK (quality IN ('GOOD', 'WARNING', 'POOR')) DEFAULT 'GOOD',
  data_source TEXT CHECK (data_source IN ('synthetic', 'iot_real')) DEFAULT 'synthetic',
  prediction_id UUID,
  features_summary JSONB,
  status TEXT CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ML_PROCESSING_FAILED')) DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Raw Sensor Samples Table (1 Measurement = 20 Samples, 15 Raw Features Each)
CREATE TABLE IF NOT EXISTS public.raw_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  sample_number INT NOT NULL CHECK (sample_number >= 1 AND sample_number <= 20),
  timestamp TIMESTAMPTZ DEFAULT now(),
  as7341_f1 DOUBLE PRECISION NOT NULL,
  as7341_f2 DOUBLE PRECISION NOT NULL,
  as7341_f3 DOUBLE PRECISION NOT NULL,
  as7341_f4 DOUBLE PRECISION NOT NULL,
  as7341_f5 DOUBLE PRECISION NOT NULL,
  as7341_f6 DOUBLE PRECISION NOT NULL,
  as7341_f7 DOUBLE PRECISION NOT NULL,
  as7341_f8 DOUBLE PRECISION NOT NULL,
  as7341_clear DOUBLE PRECISION NOT NULL,
  as7341_nir DOUBLE PRECISION NOT NULL,
  tcs34725_r DOUBLE PRECISION NOT NULL,
  tcs34725_g DOUBLE PRECISION NOT NULL,
  tcs34725_b DOUBLE PRECISION NOT NULL,
  tcs34725_clear DOUBLE PRECISION NOT NULL,
  vl53l1x_distance_mm DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT raw_samples_measurement_sample_unique UNIQUE (measurement_id, sample_number)
);

-- 5. Sensor Readings Table (Multi-Sensor Ingestion - Legacy/Payload Storage)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ML Predictions Table
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  probability_class_a DOUBLE PRECISION,
  probability_class_b DOUBLE PRECISION,
  probability_class_c DOUBLE PRECISION,
  probabilities JSONB,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ML Models Metadata Table
CREATE TABLE IF NOT EXISTS public.ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'DEPRECATED', 'TESTING')) DEFAULT 'ACTIVE',
  accuracy FLOAT,
  precision FLOAT,
  recall FLOAT,
  f1_score FLOAT,
  confusion_matrix JSONB,
  dataset_version TEXT,
  feature_version TEXT,
  trained_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id TEXT,
  status TEXT CHECK (status IN ('SUCCESS', 'FAILURE')) DEFAULT 'SUCCESS',
  metadata_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial default ML Model
INSERT INTO public.ml_models (model_name, version, status, accuracy, precision, recall, f1_score, dataset_version, feature_version)
VALUES (
  'Support Vector Machine (SVC)',
  'SVM-v1.0',
  'ACTIVE',
  0.942,
  0.935,
  0.948,
  0.941,
  'DATASET-v2.1',
  'FEAT-15'
) ON CONFLICT (version) DO NOTHING;

-- Seed an initial hardware device
INSERT INTO public.devices (device_code, device_name, status, firmware_version)
VALUES ('DEVICE-001', 'ESP32-S3 Node Primary', 'ONLINE', '1.0.0')
ON CONFLICT (device_code) DO NOTHING;
