import { MeasurementRepository, MeasurementFilters } from '../repositories/measurementRepository';
import { DeviceRepository } from '../repositories/deviceRepository';
import { UserRepository } from '../repositories/userRepository';
import { SensorRepository } from '../repositories/sensorRepository';
import { RawSampleRepository } from '../repositories/rawSampleRepository';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { MlService } from './mlService';
import { CreateMeasurementInput } from '../validators/measurementValidator';
import { IotMeasurementInput, SingleSampleInput } from '../validators/iotValidator';
import {
  Measurement,
  MeasurementStatus,
  DataSource,
  MeasurementQuality,
  RawSensorSample,
  SensorPayload,
} from '../types';
import { Err } from '../utils/errors';
import { logger } from '../utils/logger';

export class MeasurementService {
  static async createMeasurement(
    input: CreateMeasurementInput & { data_source?: DataSource },
    operatorOrUserId?: string
  ): Promise<Measurement> {
    const user = await UserRepository.findById(input.user_id);
    if (!user) {
      throw Err.notFound('User subjek tidak ditemukan', 'USER_NOT_FOUND');
    }

    const device = await DeviceRepository.findById(input.device_id);
    if (!device) {
      throw Err.notFound('Device tidak ditemukan', 'DEVICE_NOT_FOUND');
    }

    if (device.status === 'OFFLINE' || device.status === 'ERROR') {
      throw Err.conflict(`Device sedang ${device.status.toLowerCase()}`, 'DEVICE_OFFLINE');
    }

    const code = await MeasurementRepository.getNextMeasurementCode();

    const measurement = await MeasurementRepository.createMeasurement({
      measurement_code: code,
      user_id: input.user_id,
      device_id: input.device_id,
      operator_id: operatorOrUserId,
      sample_count: 20,
      quality: 'GOOD',
      data_source: input.data_source || 'synthetic',
      status: 'PENDING',
    });

    // Update device status to MEASURING
    await DeviceRepository.updateDevice(device.id, { status: 'MEASURING' });

    await AuditLogRepository.log('MEASUREMENT_CREATED', 'measurements', operatorOrUserId, measurement.id, 'SUCCESS');
    return measurement;
  }

  static async getMeasurementById(id: string): Promise<Measurement> {
    const measurement = await MeasurementRepository.findById(id);
    if (!measurement) {
      throw Err.notFound('Measurement tidak ditemukan');
    }
    return measurement;
  }

  static async getMeasurements(page = 1, limit = 10, filters?: MeasurementFilters) {
    return MeasurementRepository.findAll(page, limit, filters);
  }

  static async getRawSamples(measurementId: string): Promise<RawSensorSample[]> {
    const measurement = await MeasurementRepository.findById(measurementId);
    if (!measurement) {
      throw Err.notFound(`Measurement ${measurementId} tidak ditemukan`);
    }
    return RawSampleRepository.findByMeasurementId(measurementId);
  }

  static async updateStatus(
    id: string,
    status: MeasurementStatus,
    actorUserId?: string,
    extraFields?: {
      quality?: MeasurementQuality;
      data_source?: DataSource;
      sample_count?: number;
      prediction_id?: string;
      features_summary?: Record<string, number>;
    }
  ): Promise<Measurement> {
    const measurement = await MeasurementRepository.findById(id);
    if (!measurement) {
      throw Err.notFound('Measurement tidak ditemukan');
    }

    const extra: {
      started_at?: string;
      completed_at?: string;
      quality?: MeasurementQuality;
      data_source?: DataSource;
      sample_count?: number;
      prediction_id?: string;
      features_summary?: Record<string, number>;
    } = { ...extraFields };

    if (status === 'IN_PROGRESS' && !measurement.started_at) {
      extra.started_at = new Date().toISOString();
    }
    if (status === 'COMPLETED' || status === 'ML_PROCESSING_FAILED' || status === 'CANCELLED') {
      extra.completed_at = new Date().toISOString();
    }

    const updated = await MeasurementRepository.updateStatus(id, status, extra);

    if (status === 'COMPLETED' || status === 'ML_PROCESSING_FAILED' || status === 'CANCELLED') {
      await DeviceRepository.updateDevice(measurement.device_id, { status: 'ONLINE' });
    }

    await AuditLogRepository.log('MEASUREMENT_STATUS_UPDATED', 'measurements', actorUserId, id, 'SUCCESS', { status });
    return updated;
  }

  /**
   * Process 20 raw sensor samples payload from ESP32-S3 or simulator.
   * 1 Measurement = 20 Raw Samples (15 features each).
   * Calculates mean aggregation for SVM pipeline, saves raw data, executes ML prediction,
   * calculates sample quality, and completes the measurement.
   */
  static async processIotSensorData(
    input: IotMeasurementInput
  ): Promise<{ measurement: Measurement; predictionResult?: unknown; rawSamplesCount: number }> {
    const startTime = Date.now();

    // 1. Locate measurement (by id or code)
    let measurement = await MeasurementRepository.findById(input.measurement_id);
    if (!measurement) {
      measurement = await MeasurementRepository.findByCode(input.measurement_id);
    }
    if (!measurement) {
      throw Err.notFound(`Measurement ${input.measurement_id} tidak ditemukan`, 'MEASUREMENT_NOT_FOUND');
    }

    const dataSource: DataSource = input.data_source || 'iot_real';

    // 2. Prepare exactly 20 raw samples
    const rawSamples: RawSensorSample[] = this.normalizeRawSamples(measurement.id, input);

    // 3. Save raw samples (guaranteed persistence, never discard raw research data)
    await RawSampleRepository.insertBatch(rawSamples);
    logger.info(`Persisted ${rawSamples.length} raw samples for measurement: ${measurement.id}`);

    // Also persist legacy sensor_readings for compatibility
    if (input.sensors) {
      await SensorRepository.saveReading(measurement.id, 'MULTI_SENSOR', input.sensors as SensorPayload);
    }

    // Update status to IN_PROGRESS if currently PENDING
    if (measurement.status === 'PENDING') {
      await MeasurementRepository.updateStatus(measurement.id, 'IN_PROGRESS', {
        started_at: new Date().toISOString(),
        data_source: dataSource,
        sample_count: rawSamples.length,
      });
    }

    // 4. Calculate aggregated 15 features summary & canonical feature vector for SVM
    const { featureVector, featureSummary, quality } = this.calculateSummaryAndQuality(rawSamples);

    // 5. Call external Python ML Service
    try {
      const mlResponse = await MlService.predict({
        measurement_id: measurement.id,
        features: featureVector,
        model_version: 'SVM-v1.0',
      });

      const processingTime = Date.now() - startTime;

      const probA = mlResponse.probabilities?.Class_A ?? undefined;
      const probB = mlResponse.probabilities?.Class_B ?? undefined;
      const probC = mlResponse.probabilities?.Class_C ?? undefined;

      // Save ML prediction to DB
      const predictionRecord = await MlPredictionRepository.savePrediction({
        measurement_id: measurement.id,
        model_name: 'SVM-Classifier',
        model_version: mlResponse.model_version || 'SVM-v1.0',
        prediction: mlResponse.prediction,
        confidence: mlResponse.confidence,
        probability_class_a: probA,
        probability_class_b: probB,
        probability_class_c: probC,
        probabilities: {
          Class_A: probA ?? 0,
          Class_B: probB ?? 0,
          Class_C: probC ?? 0,
          ...mlResponse.probabilities,
        },
        processing_time_ms: processingTime,
      });

      // Update measurement to COMPLETED with quality, sample count, prediction link, and feature summary
      const completedMeasurement = await MeasurementRepository.updateStatus(measurement.id, 'COMPLETED', {
        completed_at: new Date().toISOString(),
        quality,
        data_source: dataSource,
        sample_count: rawSamples.length,
        prediction_id: predictionRecord.id,
        features_summary: featureSummary,
      });

      completedMeasurement.prediction = predictionRecord;

      // Restore device status to ONLINE
      await DeviceRepository.updateDevice(measurement.device_id, { status: 'ONLINE' });

      await AuditLogRepository.log('ML_PREDICTION_GENERATED', 'ml_predictions', undefined, predictionRecord.id, 'SUCCESS');

      return {
        measurement: completedMeasurement,
        predictionResult: predictionRecord,
        rawSamplesCount: rawSamples.length,
      };
    } catch (mlError) {
      // If ML fails/times out, raw sensor data stays saved, status becomes ML_PROCESSING_FAILED
      logger.error(`ML Service call failed for measurement ${measurement.id}:`, mlError);

      const failedMeasurement = await MeasurementRepository.updateStatus(
        measurement.id,
        'ML_PROCESSING_FAILED',
        {
          completed_at: new Date().toISOString(),
          quality,
          data_source: dataSource,
          sample_count: rawSamples.length,
          features_summary: featureSummary,
        }
      );

      await DeviceRepository.updateDevice(measurement.device_id, { status: 'ONLINE' });

      await AuditLogRepository.log(
        'ML_PROCESSING_FAILED',
        'measurements',
        undefined,
        measurement.id,
        'FAILURE',
        { error: (mlError as Error).message }
      );

      return {
        measurement: failedMeasurement,
        rawSamplesCount: rawSamples.length,
      };
    }
  }

  /**
   * Helper to normalize input into exactly 20 RawSensorSample objects.
   * If array of samples provided (1 to 20), maps each sample; pads or repeats if needed.
   * If legacy single sensor payload provided, generates 20 samples from it.
   */
  private static normalizeRawSamples(measurementId: string, input: IotMeasurementInput): RawSensorSample[] {
    const rawSamples: RawSensorSample[] = [];

    if (input.samples && input.samples.length > 0) {
      for (let i = 0; i < input.samples.length; i++) {
        const s = input.samples[i];
        rawSamples.push(this.mapSingleSample(measurementId, i + 1, s));
      }
      // If fewer than 20 were sent, repeat the last sample to ensure standard 20-sample count
      while (rawSamples.length < 20) {
        const last = rawSamples[rawSamples.length - 1];
        rawSamples.push({
          ...last,
          sample_number: rawSamples.length + 1,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (input.sensors) {
      // Legacy single payload fallback: synthesize 20 samples with slight natural jitter
      const base = this.mapLegacySensorPayload(measurementId, 1, input.sensors);
      for (let i = 1; i <= 20; i++) {
        rawSamples.push({
          ...base,
          sample_number: i,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return rawSamples.slice(0, 20);
  }

  private static mapSingleSample(
    measurementId: string,
    sampleNumber: number,
    s: SingleSampleInput
  ): RawSensorSample {
    const as7341 = s.as7341 || {};
    const tcs = s.tcs34725 || {};
    const vl = s.vl53l1x || {};

    return {
      measurement_id: measurementId,
      sample_number: s.sample_number || sampleNumber,
      timestamp: s.timestamp || new Date().toISOString(),
      as7341_f1: Number(as7341.f1 ?? 0),
      as7341_f2: Number(as7341.f2 ?? 0),
      as7341_f3: Number(as7341.f3 ?? 0),
      as7341_f4: Number(as7341.f4 ?? 0),
      as7341_f5: Number(as7341.f5 ?? 0),
      as7341_f6: Number(as7341.f6 ?? 0),
      as7341_f7: Number(as7341.f7 ?? 0),
      as7341_f8: Number(as7341.f8 ?? 0),
      as7341_clear: Number(as7341.clear ?? 0),
      as7341_nir: Number(as7341.nir ?? 0),
      tcs34725_r: Number(tcs.r ?? tcs.red ?? 0),
      tcs34725_g: Number(tcs.g ?? tcs.green ?? 0),
      tcs34725_b: Number(tcs.b ?? tcs.blue ?? 0),
      tcs34725_clear: Number(tcs.clear ?? 0),
      vl53l1x_distance_mm: Number(vl.distance_mm ?? 50),
    };
  }

  private static mapLegacySensorPayload(
    measurementId: string,
    sampleNumber: number,
    sensors: IotMeasurementInput['sensors']
  ): RawSensorSample {
    const as7341 = sensors?.as7341 || {};
    const tcs = sensors?.tcs34725 || {};
    const vl = sensors?.vl53l1x || {};

    return {
      measurement_id: measurementId,
      sample_number: sampleNumber,
      timestamp: new Date().toISOString(),
      as7341_f1: Number(as7341.f1 ?? 0),
      as7341_f2: Number(as7341.f2 ?? 0),
      as7341_f3: Number(as7341.f3 ?? 0),
      as7341_f4: Number(as7341.f4 ?? 0),
      as7341_f5: Number(as7341.f5 ?? 0),
      as7341_f6: Number(as7341.f6 ?? 0),
      as7341_f7: Number(as7341.f7 ?? 0),
      as7341_f8: Number(as7341.f8 ?? 0),
      as7341_clear: Number(as7341.clear ?? 0),
      as7341_nir: Number(as7341.nir ?? 0),
      tcs34725_r: Number(tcs.red ?? 0),
      tcs34725_g: Number(tcs.green ?? 0),
      tcs34725_b: Number(tcs.blue ?? 0),
      tcs34725_clear: Number(tcs.clear ?? 0),
      vl53l1x_distance_mm: Number(vl.distance_mm ?? 50),
    };
  }

  /**
   * Calculate aggregated 15 features (mean of 20 samples) and quality rating.
   * Quality is based on VL53L1X distance stability:
   * - standard deviation < 2.0 mm -> GOOD
   * - standard deviation between 2.0 and 8.0 mm -> WARNING
   * - standard deviation > 8.0 mm or distance <= 0 -> POOR
   */
  public static calculateSummaryAndQuality(samples: RawSensorSample[]): {
    featureVector: number[];
    featureSummary: Record<string, number>;
    quality: MeasurementQuality;
  } {
    const n = samples.length || 1;

    const sum = {
      AS7341_F1: 0,
      AS7341_F2: 0,
      AS7341_F3: 0,
      AS7341_F4: 0,
      AS7341_F5: 0,
      AS7341_F6: 0,
      AS7341_F7: 0,
      AS7341_F8: 0,
      AS7341_Clear: 0,
      AS7341_NIR: 0,
      TCS34725_R: 0,
      TCS34725_G: 0,
      TCS34725_B: 0,
      TCS34725_Clear: 0,
      VL53L1X_Distance_mm: 0,
    };

    const distances: number[] = [];

    for (const s of samples) {
      sum.AS7341_F1 += s.as7341_f1;
      sum.AS7341_F2 += s.as7341_f2;
      sum.AS7341_F3 += s.as7341_f3;
      sum.AS7341_F4 += s.as7341_f4;
      sum.AS7341_F5 += s.as7341_f5;
      sum.AS7341_F6 += s.as7341_f6;
      sum.AS7341_F7 += s.as7341_f7;
      sum.AS7341_F8 += s.as7341_f8;
      sum.AS7341_Clear += s.as7341_clear;
      sum.AS7341_NIR += s.as7341_nir;
      sum.TCS34725_R += s.tcs34725_r;
      sum.TCS34725_G += s.tcs34725_g;
      sum.TCS34725_B += s.tcs34725_b;
      sum.TCS34725_Clear += s.tcs34725_clear;
      sum.VL53L1X_Distance_mm += s.vl53l1x_distance_mm;
      distances.push(s.vl53l1x_distance_mm);
    }

    const featureSummary: Record<string, number> = {
      AS7341_F1: Number((sum.AS7341_F1 / n).toFixed(2)),
      AS7341_F2: Number((sum.AS7341_F2 / n).toFixed(2)),
      AS7341_F3: Number((sum.AS7341_F3 / n).toFixed(2)),
      AS7341_F4: Number((sum.AS7341_F4 / n).toFixed(2)),
      AS7341_F5: Number((sum.AS7341_F5 / n).toFixed(2)),
      AS7341_F6: Number((sum.AS7341_F6 / n).toFixed(2)),
      AS7341_F7: Number((sum.AS7341_F7 / n).toFixed(2)),
      AS7341_F8: Number((sum.AS7341_F8 / n).toFixed(2)),
      AS7341_Clear: Number((sum.AS7341_Clear / n).toFixed(2)),
      AS7341_NIR: Number((sum.AS7341_NIR / n).toFixed(2)),
      TCS34725_R: Number((sum.TCS34725_R / n).toFixed(2)),
      TCS34725_G: Number((sum.TCS34725_G / n).toFixed(2)),
      TCS34725_B: Number((sum.TCS34725_B / n).toFixed(2)),
      TCS34725_Clear: Number((sum.TCS34725_Clear / n).toFixed(2)),
      VL53L1X_Distance_mm: Number((sum.VL53L1X_Distance_mm / n).toFixed(2)),
    };

    // Canonical 15-features array matching Python FEATURE_ORDER
    const featureVector = [
      featureSummary.AS7341_F1,
      featureSummary.AS7341_F2,
      featureSummary.AS7341_F3,
      featureSummary.AS7341_F4,
      featureSummary.AS7341_F5,
      featureSummary.AS7341_F6,
      featureSummary.AS7341_F7,
      featureSummary.AS7341_F8,
      featureSummary.AS7341_Clear,
      featureSummary.AS7341_NIR,
      featureSummary.TCS34725_R,
      featureSummary.TCS34725_G,
      featureSummary.TCS34725_B,
      featureSummary.TCS34725_Clear,
      featureSummary.VL53L1X_Distance_mm,
    ];

    // Compute distance standard deviation for quality
    const avgDist = featureSummary.VL53L1X_Distance_mm;
    let variance = 0;
    for (const d of distances) {
      variance += Math.pow(d - avgDist, 2);
    }
    const stdDev = Math.sqrt(variance / n);

    let quality: MeasurementQuality = 'GOOD';
    if (avgDist <= 0 || stdDev > 8.0) {
      quality = 'POOR';
    } else if (stdDev > 2.0) {
      quality = 'WARNING';
    }

    return { featureVector, featureSummary, quality };
  }

  /**
   * Export Measurements CSV (Metadata + 15 Aggregated Features + Quality + Predictions + Source)
   */
  static async exportMeasurementsCsv(filters?: MeasurementFilters): Promise<string> {
    const measurements = await MeasurementRepository.findAllForExport(filters);

    const headers = [
      'measurement_id',
      'measurement_code',
      'device_code',
      'user_email',
      'data_source',
      'sample_count',
      'quality',
      'status',
      'created_at',
      'as7341_f1',
      'as7341_f2',
      'as7341_f3',
      'as7341_f4',
      'as7341_f5',
      'as7341_f6',
      'as7341_f7',
      'as7341_f8',
      'as7341_clear',
      'as7341_nir',
      'tcs34725_r',
      'tcs34725_g',
      'tcs34725_b',
      'tcs34725_clear',
      'vl53l1x_distance_mm',
      'predicted_class',
      'confidence',
      'probability_class_a',
      'probability_class_b',
      'probability_class_c',
    ];

    const rows = measurements.map((m) => {
      const s = m.features_summary || {};
      const p = m.prediction;
      const probA = p?.probability_class_a ?? p?.probabilities?.Class_A ?? '';
      const probB = p?.probability_class_b ?? p?.probabilities?.Class_B ?? '';
      const probC = p?.probability_class_c ?? p?.probabilities?.Class_C ?? '';

      return [
        m.id,
        m.measurement_code,
        m.device?.device_code || '',
        m.user?.email || '',
        m.data_source || 'synthetic',
        m.sample_count || 20,
        m.quality || 'GOOD',
        m.status,
        m.created_at,
        s.AS7341_F1 ?? '',
        s.AS7341_F2 ?? '',
        s.AS7341_F3 ?? '',
        s.AS7341_F4 ?? '',
        s.AS7341_F5 ?? '',
        s.AS7341_F6 ?? '',
        s.AS7341_F7 ?? '',
        s.AS7341_F8 ?? '',
        s.AS7341_Clear ?? '',
        s.AS7341_NIR ?? '',
        s.TCS34725_R ?? '',
        s.TCS34725_G ?? '',
        s.TCS34725_B ?? '',
        s.TCS34725_Clear ?? '',
        s.VL53L1X_Distance_mm ?? '',
        p?.prediction || '',
        p?.confidence ?? '',
        probA,
        probB,
        probC,
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export Raw Samples CSV (Measurement ID + Sample Number + Timestamp + 15 Raw Sensor Features)
   */
  static async exportRawSamplesCsv(measurementId?: string, filters?: MeasurementFilters): Promise<string> {
    let samples: RawSensorSample[] = [];

    if (measurementId) {
      samples = await RawSampleRepository.findByMeasurementId(measurementId);
    } else {
      const measurements = await MeasurementRepository.findAllForExport(filters, 500);
      const ids = measurements.map((m) => m.id);
      samples = await RawSampleRepository.findByMeasurementIds(ids);
    }

    const headers = [
      'measurement_id',
      'sample_number',
      'timestamp',
      'as7341_f1',
      'as7341_f2',
      'as7341_f3',
      'as7341_f4',
      'as7341_f5',
      'as7341_f6',
      'as7341_f7',
      'as7341_f8',
      'as7341_clear',
      'as7341_nir',
      'tcs34725_r',
      'tcs34725_g',
      'tcs34725_b',
      'tcs34725_clear',
      'vl53l1x_distance_mm',
    ];

    const rows = samples.map((s) =>
      [
        s.measurement_id,
        s.sample_number,
        s.timestamp || '',
        s.as7341_f1,
        s.as7341_f2,
        s.as7341_f3,
        s.as7341_f4,
        s.as7341_f5,
        s.as7341_f6,
        s.as7341_f7,
        s.as7341_f8,
        s.as7341_clear,
        s.as7341_nir,
        s.tcs34725_r,
        s.tcs34725_g,
        s.tcs34725_b,
        s.tcs34725_clear,
        s.vl53l1x_distance_mm,
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }
}
