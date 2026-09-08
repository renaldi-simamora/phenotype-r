import { supabaseAdmin } from '../config/supabase';
import { Measurement, MeasurementStatus, DataSource, MeasurementQuality } from '../types';
import { MlPredictionRepository } from './mlPredictionRepository';

export interface MeasurementFilters {
  userId?: string;
  deviceId?: string;
  status?: MeasurementStatus;
  dataSource?: DataSource;
  quality?: MeasurementQuality;
  classification?: string;
  startDate?: string;
  endDate?: string;
}

export class MeasurementRepository {
  static async findById(id: string): Promise<Measurement | null> {
    const { data, error } = await supabaseAdmin
      .from('measurements')
      .select(`
        *,
        user:profiles!measurements_user_id_fkey(id, full_name, email),
        device:devices!measurements_device_id_fkey(id, device_code, device_name, status)
      `)
      .eq('id', id)
      .single();

    if (error || !data) return null;

    const measurement = data as unknown as Measurement;
    // Attach prediction
    const prediction = await MlPredictionRepository.findByMeasurementId(id);
    if (prediction) {
      measurement.prediction = prediction;
    }

    return measurement;
  }

  static async findByCode(code: string): Promise<Measurement | null> {
    const { data, error } = await supabaseAdmin
      .from('measurements')
      .select('*')
      .eq('measurement_code', code)
      .single();

    if (error || !data) return null;
    return data as Measurement;
  }

  static async findAll(
    page = 1,
    limit = 10,
    filters?: MeasurementFilters
  ): Promise<{ data: Measurement[]; total: number }> {
    let query = supabaseAdmin
      .from('measurements')
      .select(`
        *,
        user:profiles!measurements_user_id_fkey(id, full_name, email),
        device:devices!measurements_device_id_fkey(id, device_code, device_name, status)
      `, { count: 'exact' });

    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.deviceId) query = query.eq('device_id', filters.deviceId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.dataSource) {
      // If filtering by data_source
      try {
        query = query.eq('data_source', filters.dataSource);
      } catch {
        // column may not exist yet
      }
    }
    if (filters?.quality) {
      try {
        query = query.eq('quality', filters.quality);
      } catch {
        // column may not exist yet
      }
    }
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    // If query fails due to unknown columns (data_source or quality before migration), retry without them
    if (error && (error.message?.includes('column') || error.message?.includes('schema cache'))) {
      let retryQuery = supabaseAdmin
        .from('measurements')
        .select(`
          *,
          user:profiles!measurements_user_id_fkey(id, full_name, email),
          device:devices!measurements_device_id_fkey(id, device_code, device_name, status)
        `, { count: 'exact' });
      if (filters?.userId) retryQuery = retryQuery.eq('user_id', filters.userId);
      if (filters?.deviceId) retryQuery = retryQuery.eq('device_id', filters.deviceId);
      if (filters?.status) retryQuery = retryQuery.eq('status', filters.status);
      if (filters?.startDate) retryQuery = retryQuery.gte('created_at', filters.startDate);
      if (filters?.endDate) retryQuery = retryQuery.lte('created_at', filters.endDate);

      const retryRes = await retryQuery
        .order('created_at', { ascending: false })
        .range(from, to);
      data = retryRes.data;
      count = retryRes.count;
      error = retryRes.error;
    }

    if (error) throw error;

    const measurements = (data || []) as unknown as Measurement[];
    const measurementIds = measurements.map((m) => m.id);

    // Attach predictions in bulk
    if (measurementIds.length > 0) {
      const predMap = await MlPredictionRepository.findByMeasurementIds(measurementIds);
      for (const m of measurements) {
        if (predMap[m.id]) {
          m.prediction = predMap[m.id];
        }
        // Defaults if columns not populated in DB
        if (!m.sample_count) m.sample_count = 20;
        if (!m.quality) m.quality = 'GOOD';
        if (!m.data_source) m.data_source = 'synthetic';
      }
    }

    // Apply in-memory classification filter if requested
    let result = measurements;
    if (filters?.classification) {
      const target = filters.classification.toLowerCase().replace(/[^a-z0-9]/g, '');
      result = measurements.filter((m) => {
        const pred = m.prediction?.prediction?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        return pred === target;
      });
    }

    return { data: result, total: count || 0 };
  }

  static async findAllForExport(filters?: MeasurementFilters, limit = 5000): Promise<Measurement[]> {
    let query = supabaseAdmin
      .from('measurements')
      .select(`
        *,
        user:profiles!measurements_user_id_fkey(id, full_name, email),
        device:devices!measurements_device_id_fkey(id, device_code, device_name, status)
      `);

    if (filters?.userId) query = query.eq('user_id', filters.userId);
    if (filters?.deviceId) query = query.eq('device_id', filters.deviceId);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);

    let { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[MeasurementRepository.findAllForExport] error:', error.message);
      return [];
    }

    const measurements = (data || []) as unknown as Measurement[];
    const measurementIds = measurements.map((m) => m.id);

    if (measurementIds.length > 0) {
      const predMap = await MlPredictionRepository.findByMeasurementIds(measurementIds);
      for (const m of measurements) {
        if (predMap[m.id]) {
          m.prediction = predMap[m.id];
        }
        if (!m.sample_count) m.sample_count = 20;
        if (!m.quality) m.quality = 'GOOD';
        if (!m.data_source) m.data_source = 'synthetic';
      }
    }

    let result = measurements;
    if (filters?.dataSource) {
      result = result.filter((m) => m.data_source === filters.dataSource);
    }
    if (filters?.quality) {
      result = result.filter((m) => m.quality === filters.quality);
    }
    if (filters?.classification) {
      const target = filters.classification.toLowerCase().replace(/[^a-z0-9]/g, '');
      result = result.filter((m) => {
        const pred = m.prediction?.prediction?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        return pred === target;
      });
    }

    return result;
  }

  static async createMeasurement(measurement: Partial<Measurement>): Promise<Measurement> {
    try {
      const { data, error } = await supabaseAdmin
        .from('measurements')
        .insert(measurement)
        .select()
        .single();

      if (!error && data) return data as Measurement;
      if (error) throw error;
    } catch (err: any) {
      // Fallback if newer columns not yet in DB schema
      if (err?.message && (err.message.includes('column') || err.message.includes('schema cache'))) {
        const standardPayload = {
          measurement_code: measurement.measurement_code,
          user_id: measurement.user_id,
          operator_id: measurement.operator_id,
          device_id: measurement.device_id,
          status: measurement.status || 'PENDING',
          started_at: measurement.started_at,
          completed_at: measurement.completed_at,
        };
        const { data: fbData, error: fbErr } = await supabaseAdmin
          .from('measurements')
          .insert(standardPayload)
          .select()
          .single();

        if (fbErr) throw fbErr;
        return {
          ...(fbData as Measurement),
          sample_count: measurement.sample_count || 20,
          quality: measurement.quality || 'GOOD',
          data_source: measurement.data_source || 'synthetic',
          prediction_id: measurement.prediction_id,
          features_summary: measurement.features_summary,
        };
      }
      throw err;
    }
    return measurement as Measurement;
  }

  static async updateStatus(
    id: string,
    status: MeasurementStatus,
    extra?: {
      started_at?: string;
      completed_at?: string;
      quality?: MeasurementQuality;
      data_source?: DataSource;
      sample_count?: number;
      prediction_id?: string;
      features_summary?: Record<string, number>;
    }
  ): Promise<Measurement> {
    const updates: Record<string, unknown> = { status, ...extra };

    try {
      const { data, error } = await supabaseAdmin
        .from('measurements')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data as Measurement;
      if (error) throw error;
    } catch (err: any) {
      // Fallback: strip fields that might not be in DB columns yet
      if (err?.message && (err.message.includes('column') || err.message.includes('schema cache'))) {
        const standardUpdates: Record<string, unknown> = { status };
        if (extra?.started_at) standardUpdates.started_at = extra.started_at;
        if (extra?.completed_at) standardUpdates.completed_at = extra.completed_at;

        const { data: fbData, error: fbErr } = await supabaseAdmin
          .from('measurements')
          .update(standardUpdates)
          .eq('id', id)
          .select()
          .single();

        if (fbErr) throw fbErr;
        return {
          ...(fbData as Measurement),
          quality: extra?.quality || 'GOOD',
          data_source: extra?.data_source || 'synthetic',
          sample_count: extra?.sample_count || 20,
          features_summary: extra?.features_summary,
          prediction_id: extra?.prediction_id,
        };
      }
      throw err;
    }
    return updates as unknown as Measurement;
  }

  static async getNextMeasurementCode(): Promise<string> {
    const { count } = await supabaseAdmin
      .from('measurements')
      .select('*', { count: 'exact', head: true });

    const num = (count || 0) + 1;
    return `MEAS-${String(num).padStart(5, '0')}`;
  }
}
