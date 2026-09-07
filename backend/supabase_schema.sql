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
  status TEXT CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ML_PROCESSING_FAILED')) DEFAULT 'PENDING',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Sensor Readings Table (Multi-Sensor Ingestion)
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  sensor_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ML Predictions Table
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id UUID REFERENCES public.measurements(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prediction TEXT NOT NULL,
  confidence FLOAT NOT NULL,
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
