import { supabaseAdmin } from '../config/supabase';
import { AuditLog } from '../types';

export class AuditLogRepository {
  static async log(
    action: string,
    resource: string,
    userId?: string,
    resourceId?: string,
    status: 'SUCCESS' | 'FAILURE' = 'SUCCESS',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action,
        resource,
        resource_id: resourceId,
        status,
        metadata_json: metadata,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Audit log should never crash the main request path
      console.error('Failed to insert audit log:', err);
    }
  }

  static async findAll(
    page = 1,
    limit = 20,
    filters?: { action?: string; resource?: string; userId?: string }
  ): Promise<{ data: AuditLog[]; total: number }> {
    let query = supabaseAdmin
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (filters?.action) query = query.eq('action', filters.action);
    if (filters?.resource) query = query.eq('resource', filters.resource);
    if (filters?.userId) query = query.eq('user_id', filters.userId);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as AuditLog[], total: count || 0 };
  }
}
