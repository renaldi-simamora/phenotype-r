import { supabaseAdmin } from '../config/supabase';
import { Measurement, MeasurementStatus } from '../types';

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
    return data as unknown as Measurement;
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
    filters?: {
      userId?: string;
      deviceId?: string;
      status?: MeasurementStatus;
      startDate?: string;
      endDate?: string;
    }
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
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as unknown as Measurement[], total: count || 0 };
  }

  static async createMeasurement(measurement: Partial<Measurement>): Promise<Measurement> {
    const { data, error } = await supabaseAdmin
      .from('measurements')
      .insert(measurement)
      .select()
      .single();

    if (error) throw error;
    return data as Measurement;
  }

  static async updateStatus(id: string, status: MeasurementStatus, extra?: { started_at?: string; completed_at?: string }): Promise<Measurement> {
    const updates: Record<string, unknown> = { status };
    if (extra?.started_at) updates.started_at = extra.started_at;
    if (extra?.completed_at) updates.completed_at = extra.completed_at;

    const { data, error } = await supabaseAdmin
      .from('measurements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Measurement;
  }

  static async getNextMeasurementCode(): Promise<string> {
    const { count, error } = await supabaseAdmin
      .from('measurements')
      .select('*', { count: 'exact', head: true });

    const num = (count || 0) + 1;
    return `MEAS-${String(num).padStart(5, '0')}`;
  }
}
