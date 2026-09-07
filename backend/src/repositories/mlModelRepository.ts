import { supabaseAdmin } from '../config/supabase';
import { MlModel } from '../types';

export class MlModelRepository {
  static async findAll(): Promise<MlModel[]> {
    const { data, error } = await supabaseAdmin
      .from('ml_models')
      .select('*')
      .order('trained_at', { ascending: false });

    if (error) throw error;
    return (data || []) as MlModel[];
  }

  static async findById(id: string): Promise<MlModel | null> {
    const { data, error } = await supabaseAdmin
      .from('ml_models')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as MlModel;
  }

  static async getActiveModel(): Promise<MlModel | null> {
    const { data, error } = await supabaseAdmin
      .from('ml_models')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('trained_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as MlModel;
  }
}
