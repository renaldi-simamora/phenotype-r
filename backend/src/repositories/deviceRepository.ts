import { supabaseAdmin } from '../config/supabase';
import { Device, DeviceStatus } from '../types';

export class DeviceRepository {
  static async findById(id: string): Promise<Device | null> {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Device;
  }

  static async findByCode(deviceCode: string): Promise<Device | null> {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('device_code', deviceCode)
      .single();

    if (error || !data) return null;
    return data as Device;
  }

  static async findAll(page = 1, limit = 10, status?: DeviceStatus): Promise<{ data: Device[]; total: number }> {
    let query = supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as Device[], total: count || 0 };
  }

  static async createDevice(device: Partial<Device>): Promise<Device> {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .insert(device)
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  }

  static async updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  }

  static async updateHeartbeat(id: string, status: DeviceStatus, ipAddress?: string, firmwareVersion?: string): Promise<void> {
    const updates: Record<string, unknown> = {
      status,
      last_seen: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (ipAddress) updates.ip_address = ipAddress;
    if (firmwareVersion) updates.firmware_version = firmwareVersion;

    const { error } = await supabaseAdmin
      .from('devices')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  static async getNextDeviceCode(): Promise<string> {
    const { count, error } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true });

    const num = (count || 0) + 1;
    return `DEVICE-${String(num).padStart(3, '0')}`;
  }
}
