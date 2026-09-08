import { supabaseAdmin } from '../config/supabase';
import { RawSensorSample } from '../types';

export class RawSampleRepository {
  /**
   * Save a batch of raw sensor samples (1 to 20 samples) for a measurement.
   * Dual-stores in public.raw_samples and public.sensor_readings for safety.
   */
  static async insertBatch(samples: RawSensorSample[]): Promise<RawSensorSample[]> {
    if (!samples || samples.length === 0) return [];

    let insertedSamples: RawSensorSample[] = [];
    let dbSuccess = false;

    try {
      const { data, error } = await supabaseAdmin
        .from('raw_samples')
        .insert(samples)
        .select();

      if (!error && data) {
        insertedSamples = data as RawSensorSample[];
        dbSuccess = true;
      } else if (error) {
        console.warn('[RawSampleRepository.insertBatch] raw_samples table notice:', error.message);
      }
    } catch (err) {
      console.warn('[RawSampleRepository.insertBatch] Exception writing to raw_samples:', err);
    }

    // Dual-storage backup in sensor_readings ensures raw research data is NEVER lost
    const measurementId = samples[0]?.measurement_id;
    if (measurementId) {
      try {
        await supabaseAdmin.from('sensor_readings').insert({
          measurement_id: measurementId,
          sensor_type: 'RAW_SAMPLES_20',
          payload_json: { samples, count: samples.length },
          recorded_at: new Date().toISOString(),
        });
      } catch (backupErr) {
        console.error('[RawSampleRepository] sensor_readings backup error:', backupErr);
      }
    }

    return dbSuccess ? insertedSamples : samples;
  }

  /**
   * Retrieve all 20 raw samples for a specific measurement, ordered by sample_number.
   */
  static async findByMeasurementId(measurementId: string): Promise<RawSensorSample[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('raw_samples')
        .select('*')
        .eq('measurement_id', measurementId)
        .order('sample_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as RawSensorSample[];
      }
    } catch (err) {
      console.warn('[RawSampleRepository.findByMeasurementId] raw_samples error, trying backup:', err);
    }

    // Fallback: check sensor_readings backup
    try {
      const { data: srData } = await supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .eq('measurement_id', measurementId)
        .eq('sensor_type', 'RAW_SAMPLES_20')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (srData?.payload_json?.samples && Array.isArray(srData.payload_json.samples)) {
        return srData.payload_json.samples as RawSensorSample[];
      }
    } catch (srErr) {
      console.error('[RawSampleRepository] Fallback sensor_readings query failed:', srErr);
    }

    return [];
  }

  /**
   * Retrieve raw samples for multiple measurement IDs.
   */
  static async findByMeasurementIds(measurementIds: string[]): Promise<RawSensorSample[]> {
    if (!measurementIds.length) return [];

    try {
      const { data, error } = await supabaseAdmin
        .from('raw_samples')
        .select('*')
        .in('measurement_id', measurementIds)
        .order('sample_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as RawSensorSample[];
      }
    } catch (err) {
      console.warn('[RawSampleRepository.findByMeasurementIds] Query error:', err);
    }

    // Fallback from sensor_readings
    const results: RawSensorSample[] = [];
    try {
      const { data: srList } = await supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .in('measurement_id', measurementIds)
        .eq('sensor_type', 'RAW_SAMPLES_20');

      if (srList) {
        for (const row of srList) {
          if (row.payload_json?.samples && Array.isArray(row.payload_json.samples)) {
            results.push(...(row.payload_json.samples as RawSensorSample[]));
          }
        }
      }
    } catch (srErr) {
      console.error('[RawSampleRepository] Batch fallback query failed:', srErr);
    }

    return results;
  }

  /**
   * Retrieve all raw samples with optional limit for global raw export.
   */
  static async findAll(limit = 2000): Promise<RawSensorSample[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('raw_samples')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data as RawSensorSample[];
      }
    } catch (err) {
      console.warn('[RawSampleRepository.findAll] raw_samples error, checking backup:', err);
    }

    // Fallback from sensor_readings
    const results: RawSensorSample[] = [];
    try {
      const { data: srList } = await supabaseAdmin
        .from('sensor_readings')
        .select('*')
        .eq('sensor_type', 'RAW_SAMPLES_20')
        .order('recorded_at', { ascending: false })
        .limit(Math.ceil(limit / 20));

      if (srList) {
        for (const row of srList) {
          if (row.payload_json?.samples && Array.isArray(row.payload_json.samples)) {
            results.push(...(row.payload_json.samples as RawSensorSample[]));
          }
        }
      }
    } catch (srErr) {
      console.error('[RawSampleRepository.findAll] Backup query failed:', srErr);
    }

    return results;
  }
}
