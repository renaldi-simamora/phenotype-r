-- ============================================================
-- PHENOTYPE - Migration Update V2 (20 Samples & Raw Telemetry)
-- NOTE: THIS MIGRATION HAS NOT BEEN RUN TO SUPABASE YET.
-- Storage for 20 raw sensor samples remains in public.sensor_readings
-- via sensor_type = 'RAW_SAMPLES_20' and payload_json={count:20, samples:[...]}.
-- NO raw_sensor_samples or raw_samples table is created.
-- ============================================================

-- 1. Update Measurements Table with Required Columns
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
  ADD COLUMN IF NOT EXISTS probability_class_c DOUBLE PRECISION;

-- 3. Create Supporting Indexes for Performance & Filtering
CREATE INDEX IF NOT EXISTS idx_measurements_data_source ON public.measurements (data_source);
CREATE INDEX IF NOT EXISTS idx_measurements_quality ON public.measurements (quality);
