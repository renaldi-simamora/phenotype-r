import { supabaseAdmin } from '../config/supabase';
import { MlPrediction } from '../types';

export class MlPredictionRepository {
  static async savePrediction(predictionData: Partial<MlPrediction>): Promise<MlPrediction> {
    const insertPayload: Record<string, unknown> = {
      measurement_id: predictionData.measurement_id,
      model_name: predictionData.model_name || 'SVM-Classifier',
      model_version: predictionData.model_version || 'SVM-v1.0',
      prediction: predictionData.prediction,
      confidence: predictionData.confidence,
      processing_time_ms: predictionData.processing_time_ms,
      created_at: new Date().toISOString(),
    };

    if (predictionData.probability_class_a !== undefined) {
      insertPayload.probability_class_a = predictionData.probability_class_a;
    }
    if (predictionData.probability_class_b !== undefined) {
      insertPayload.probability_class_b = predictionData.probability_class_b;
    }
    if (predictionData.probability_class_c !== undefined) {
      insertPayload.probability_class_c = predictionData.probability_class_c;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('ml_predictions')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data as MlPrediction;
    } catch (err: any) {
      // If error indicates column does not exist (before migration applied), fallback without probability columns
      if (err?.message && (err.message.includes('column') || err.message.includes('schema cache'))) {
        const fallbackPayload = {
          measurement_id: predictionData.measurement_id,
          model_name: predictionData.model_name || 'SVM-Classifier',
          model_version: predictionData.model_version || 'SVM-v1.0',
          prediction: predictionData.prediction,
          confidence: predictionData.confidence,
          processing_time_ms: predictionData.processing_time_ms,
          created_at: new Date().toISOString(),
        };
        const { data: fbData, error: fbError } = await supabaseAdmin
          .from('ml_predictions')
          .insert(fallbackPayload)
          .select()
          .single();

        if (fbError) throw fbError;
        return {
          ...(fbData as MlPrediction),
          probability_class_a: predictionData.probability_class_a,
          probability_class_b: predictionData.probability_class_b,
          probability_class_c: predictionData.probability_class_c,
        };
      }
      throw err;
    }
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

  static async findByMeasurementIds(measurementIds: string[]): Promise<Record<string, MlPrediction>> {
    if (!measurementIds.length) return {};
    const { data, error } = await supabaseAdmin
      .from('ml_predictions')
      .select('*')
      .in('measurement_id', measurementIds)
      .order('created_at', { ascending: false });

    if (error || !data) return {};
    const map: Record<string, MlPrediction> = {};
    for (const row of data) {
      if (!map[row.measurement_id]) {
        map[row.measurement_id] = row as MlPrediction;
      }
    }
    return map;
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
