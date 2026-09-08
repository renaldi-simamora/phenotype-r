import { supabaseAdmin } from '../config/supabase';
import { MlModelRepository } from '../repositories/mlModelRepository';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';

export class AnalyticsService {
  static async getMeasurementStats() {
    const { count: totalMeasurements } = await supabaseAdmin
      .from('measurements')
      .select('*', { count: 'exact', head: true });

    const { count: completedMeasurements } = await supabaseAdmin
      .from('measurements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'COMPLETED');

    const { count: failedMeasurements } = await supabaseAdmin
      .from('measurements')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ML_PROCESSING_FAILED');

    return {
      total: totalMeasurements || 0,
      completed: completedMeasurements || 0,
      failed: failedMeasurements || 0,
    };
  }

  static async getPredictionDistribution() {
    return MlPredictionRepository.getPredictionStats();
  }

  static async getDataSourceStats() {
    const { data } = await supabaseAdmin
      .from('measurements')
      .select('data_source, quality, status');

    const result = {
      synthetic: 0,
      iot_real: 0,
      quality_good: 0,
      quality_warning: 0,
      quality_poor: 0,
    };

    if (data) {
      for (const row of data) {
        if (row.data_source === 'iot_real') {
          result.iot_real++;
        } else {
          result.synthetic++;
        }

        if (row.quality === 'WARNING') result.quality_warning++;
        else if (row.quality === 'POOR') result.quality_poor++;
        else result.quality_good++;
      }
    }

    return result;
  }

  static async getDeviceStats() {
    const { count: totalDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true });

    const { count: onlineDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ONLINE');

    const { count: measuringDevices } = await supabaseAdmin
      .from('devices')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'MEASURING');

    return {
      total: totalDevices || 0,
      online: onlineDevices || 0,
      measuring: measuringDevices || 0,
      offline: (totalDevices || 0) - (onlineDevices || 0) - (measuringDevices || 0),
    };
  }

  static async getModelPerformance() {
    return MlModelRepository.findAll();
  }
}
