-- ============================================================
-- PHENOTYPE - Migration Update V2 (20 Samples & Raw Telemetry)
-- ============================================================

-- 1. Update Measurements Table
ALTER TABLE public.measurements
  ADD COLUMN IF NOT EXISTS sample_count INT DEFAULT 20,
  ADD COLUMN IF NOT EXISTS quality TEXT DEFAULT 'GOOD',
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'synthetic',
  ADD COLUMN IF NOT EXISTS prediction_id UUID,
  ADD COLUMN IF NOT EXISTS features_summary JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'measurements_quality_check'
  ) THEN
    ALTER TABLE public.measurements 
    ADD CONSTRAINT measurements_quality_check CHECK (quality IN ('GOOD', 'WARNING', 'POOR'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'measurements_data_source_check'
  ) THEN
    ALTER TABLE public.measurements 
    ADD CONSTRAINT measurements_data_source_check CHECK (data_source IN ('synthetic', 'iot_real'));
  END IF;
END $$;

-- 2. Update ML Predictions Table with Class Probabilities
ALTER TABLE public.ml_predictions
  ADD COLUMN IF NOT EXISTS probability_class_a DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS probability_class_b DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS probability_class_c DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS probabilities JSONB;

-- 3. Create Raw Samples Table (Exactly 15 Raw Sensor Features per Sample)
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

-- 4. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_raw_samples_measurement_id ON public.raw_samples (measurement_id);
CREATE INDEX IF NOT EXISTS idx_measurements_data_source ON public.measurements (data_source);
CREATE INDEX IF NOT EXISTS idx_measurements_quality ON public.measurements (quality);
