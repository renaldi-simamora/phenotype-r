import { supabaseAdmin } from '../config/supabase';
import { Profile, UserRole, UserStatus } from '../types';

export class UserRepository {
  static async findById(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }

  static async findByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }

  static async findByAuthUserId(authUserId: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) return null;
    return data as Profile;
  }

  static async findAll(page = 1, limit = 10, role?: UserRole): Promise<{ data: Profile[]; total: number }> {
    let query = supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact' });

    if (role) {
      query = query.eq('role', role);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as Profile[], total: count || 0 };
  }

  static async createProfile(profile: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert(profile)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }

  static async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Profile;
  }
}
