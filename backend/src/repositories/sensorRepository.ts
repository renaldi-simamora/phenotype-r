import { supabaseAdmin } from '../config/supabase';
import { SensorReading, SensorPayload } from '../types';

export class SensorRepository {
  static async saveReading(
    measurementId: string,
    sensorType: string,
    payload: SensorPayload
  ): Promise<SensorReading> {
    const { data, error } = await supabaseAdmin
      .from('sensor_readings')
      .insert({
        measurement_id: measurementId,
        sensor_type: sensorType,
        payload_json: payload,
        recorded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as SensorReading;
  }

  static async findByMeasurementId(measurementId: string): Promise<SensorReading[]> {
    const { data, error } = await supabaseAdmin
      .from('sensor_readings')
      .select('*')
      .eq('measurement_id', measurementId)
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return (data || []) as SensorReading[];
  }
}
