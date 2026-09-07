import { supabaseAdmin } from '../config/supabase';
import { MlPrediction } from '../types';

export class MlPredictionRepository {
  static async savePrediction(predictionData: Partial<MlPrediction>): Promise<MlPrediction> {
    const { data, error } = await supabaseAdmin
      .from('ml_predictions')
      .insert({
        measurement_id: predictionData.measurement_id,
        model_name: predictionData.model_name || 'SVM-Classifier',
        model_version: predictionData.model_version || 'SVM-v1.0',
        prediction: predictionData.prediction,
        confidence: predictionData.confidence,
        processing_time_ms: predictionData.processing_time_ms,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as MlPrediction;
  }

  static async findByMeasurementId(measurementId: string): Promise<MlPrediction | null> {
    const { data, error } = await supabaseAdmin
      .from('ml_predictions')
      .select('*')
      .eq('measurement_id', measurementId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as MlPrediction;
  }

  static async getPredictionStats(): Promise<Record<string, number>> {
    const { data, error } = await supabaseAdmin
      .from('ml_predictions')
      .select('prediction');

    if (error || !data) return {};

    const dist: Record<string, number> = {};
    for (const row of data) {
      dist[row.prediction] = (dist[row.prediction] || 0) + 1;
    }
    return dist;
  }
}
