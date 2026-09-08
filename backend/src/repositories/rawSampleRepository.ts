import { supabaseAdmin } from '../config/supabase';
import { RawSensorSample } from '../types';
import { logger } from '../utils/logger';

export class RawSampleRepository {
  /**
   * Save 20 raw sensor samples for a measurement directly in public.sensor_readings
   * under sensor_type='RAW_SAMPLES_20' and payload_json={count: 20, samples: [...]}.
   */
  static async insertBatch(samples: RawSensorSample[]): Promise<RawSensorSample[]> {
    if (!samples || samples.length === 0) return [];

    const measurementId = samples[0]?.measurement_id;
    if (!measurementId) return samples;

    const { error } = await supabaseAdmin.from('sensor_readings').insert({
      measurement_id: measurementId,
      sensor_type: 'RAW_SAMPLES_20',
      payload_json: { count: samples.length, samples },
      recorded_at: new Date().toISOString(),
    });

    if (error) {
      logger.error(`[RawSampleRepository.insertBatch] Error saving samples to sensor_readings: ${error.message}`);
      throw error;
    }

    return samples;
  }

  /**
   * Retrieve all 20 raw samples for a specific measurement from sensor_readings.
   */
  static async findByMeasurementId(measurementId: string): Promise<RawSensorSample[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('sensor_readings')
        .select('payload_json')
        .eq('measurement_id', measurementId)
        .eq('sensor_type', 'RAW_SAMPLES_20')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.payload_json?.samples && Array.isArray(data.payload_json.samples)) {
        return (data.payload_json.samples as RawSensorSample[]).sort(
          (a, b) => a.sample_number - b.sample_number
        );
      }
    } catch (err) {
      logger.error(`[RawSampleRepository.findByMeasurementId] Query failed for ${measurementId}:`, err);
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
        .from('sensor_readings')
        .select('payload_json')
        .in('measurement_id', measurementIds)
        .eq('sensor_type', 'RAW_SAMPLES_20');

      if (!error && data) {
        const results: RawSensorSample[] = [];
        for (const row of data) {
          if (row.payload_json?.samples && Array.isArray(row.payload_json.samples)) {
            results.push(...(row.payload_json.samples as RawSensorSample[]));
          }
        }
        return results;
      }
    } catch (err) {
      logger.error('[RawSampleRepository.findByMeasurementIds] Query failed:', err);
    }

    return [];
  }

  /**
   * Retrieve raw samples for global raw export.
   */
  static async findAll(limit = 2000): Promise<RawSensorSample[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('sensor_readings')
        .select('payload_json')
        .eq('sensor_type', 'RAW_SAMPLES_20')
        .order('recorded_at', { ascending: false })
        .limit(Math.ceil(limit / 20));

      if (!error && data) {
        const results: RawSensorSample[] = [];
        for (const row of data) {
          if (row.payload_json?.samples && Array.isArray(row.payload_json.samples)) {
            results.push(...(row.payload_json.samples as RawSensorSample[]));
          }
        }
        return results;
      }
    } catch (err) {
      logger.error('[RawSampleRepository.findAll] Query failed:', err);
    }

    return [];
  }
}

