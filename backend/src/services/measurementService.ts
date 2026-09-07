import { MeasurementRepository } from '../repositories/measurementRepository';
import { DeviceRepository } from '../repositories/deviceRepository';
import { UserRepository } from '../repositories/userRepository';
import { SensorRepository } from '../repositories/sensorRepository';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { MlService } from './mlService';
import { CreateMeasurementInput } from '../validators/measurementValidator';
import { IotMeasurementInput } from '../validators/iotValidator';
import { Measurement, MeasurementStatus, SensorPayload } from '../types';
import { Err } from '../utils/errors';
import { logger } from '../utils/logger';

export class MeasurementService {
  static async createMeasurement(input: CreateMeasurementInput, operatorOrUserId?: string): Promise<Measurement> {
    // 1. Validate user exists
    const user = await UserRepository.findById(input.user_id);
    if (!user) {
      throw Err.notFound('User subjek tidak ditemukan', 'USER_NOT_FOUND');
    }

    // 2. Validate device exists & is online
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

  static async getMeasurements(
    page = 1,
    limit = 10,
    filters?: { userId?: string; deviceId?: string; status?: MeasurementStatus; startDate?: string; endDate?: string }
  ) {
    return MeasurementRepository.findAll(page, limit, filters);
  }

  static async updateStatus(id: string, status: MeasurementStatus, actorUserId?: string): Promise<Measurement> {
    const measurement = await MeasurementRepository.findById(id);
    if (!measurement) {
      throw Err.notFound('Measurement tidak ditemukan');
    }

    const extra: { started_at?: string; completed_at?: string } = {};
    if (status === 'IN_PROGRESS' && !measurement.started_at) {
      extra.started_at = new Date().toISOString();
    }
    if (status === 'COMPLETED' || status === 'ML_PROCESSING_FAILED' || status === 'CANCELLED') {
      extra.completed_at = new Date().toISOString();
    }

    const updated = await MeasurementRepository.updateStatus(id, status, extra);
    
    // Reset device status back to ONLINE if completed or failed
    if (status === 'COMPLETED' || status === 'ML_PROCESSING_FAILED' || status === 'CANCELLED') {
      await DeviceRepository.updateDevice(measurement.device_id, { status: 'ONLINE' });
    }

    await AuditLogRepository.log('MEASUREMENT_STATUS_UPDATED', 'measurements', actorUserId, id, 'SUCCESS', { status });
    return updated;
  }

  /**
   * Process raw sensor payload received from ESP32 IoT device.
   * Follows C.10 Error Handling:
   * Saves sensor reading into DB first.
   * If ML Service fails or times out, data remains saved and measurement status -> ML_PROCESSING_FAILED.
   */
  static async processIotSensorData(input: IotMeasurementInput): Promise<{ measurement: Measurement; predictionResult?: unknown }> {
    const startTime = Date.now();

    // 1. Locate measurement (by id or code)
    let measurement = await MeasurementRepository.findById(input.measurement_id);
    if (!measurement) {
      measurement = await MeasurementRepository.findByCode(input.measurement_id);
    }
    if (!measurement) {
      throw Err.notFound(`Measurement ${input.measurement_id} tidak ditemukan`, 'MEASUREMENT_NOT_FOUND');
    }

    // 2. Save raw sensor readings into DB (Sensors data is ALWAYS persisted!)
    await SensorRepository.saveReading(
      measurement.id,
      'MULTI_SENSOR',
      input.sensors as SensorPayload
    );

    logger.info(`Saved sensor readings for measurement: ${measurement.id}`);

    // Update status to IN_PROGRESS if pending
    if (measurement.status === 'PENDING') {
      await MeasurementRepository.updateStatus(measurement.id, 'IN_PROGRESS', { started_at: new Date().toISOString() });
    }

    // 3. Extract feature vector for ML Service
    const features = this.extractFeatures(input.sensors);

    // 4. Call external ML Service via HTTP (server-to-server)
    try {
      const mlResponse = await MlService.predict({
        measurement_id: measurement.id,
        features,
        model_version: 'SVM-v1.0',
      });

      const processingTime = Date.now() - startTime;

      // Save ML prediction to DB
      const predictionRecord = await MlPredictionRepository.savePrediction({
        measurement_id: measurement.id,
        model_name: 'SVM-Classifier',
        model_version: mlResponse.model_version || 'SVM-v1.0',
        prediction: mlResponse.prediction,
        confidence: mlResponse.confidence,
        processing_time_ms: processingTime,
      });

      // Update measurement to COMPLETED
      const completedMeasurement = await MeasurementRepository.updateStatus(
        measurement.id,
        'COMPLETED',
        { completed_at: new Date().toISOString() }
      );

      // Restore device status to ONLINE
      await DeviceRepository.updateDevice(measurement.device_id, { status: 'ONLINE' });

      await AuditLogRepository.log('ML_PREDICTION_GENERATED', 'ml_predictions', undefined, predictionRecord.id, 'SUCCESS');

      return {
        measurement: completedMeasurement,
        predictionResult: predictionRecord,
      };
    } catch (mlError) {
      // C.10 Requirement: If ML fails/times out, sensor data stays saved, status becomes ML_PROCESSING_FAILED
      logger.error(`ML Service call failed for measurement ${measurement.id}:`, mlError);

      const failedMeasurement = await MeasurementRepository.updateStatus(
        measurement.id,
        'ML_PROCESSING_FAILED',
        { completed_at: new Date().toISOString() }
      );

      // Restore device status to ONLINE
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
      };
    }
  }

  /**
   * Helper to flatten sensor payload into numeric feature vector array according to PRD C.5.
   */
  private static extractFeatures(sensors: IotMeasurementInput['sensors']): number[] {
    const features: number[] = [];

    // AS7341 spectral channels
    if (sensors.as7341) {
      const fKeys = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'clear', 'nir'];
      for (const key of fKeys) {
        if (typeof sensors.as7341[key] === 'number') {
          features.push(sensors.as7341[key] as number);
        }
      }
    }

    // TCS34725 RGB
    if (sensors.tcs34725) {
      if (typeof sensors.tcs34725.red === 'number') features.push(sensors.tcs34725.red);
      if (typeof sensors.tcs34725.green === 'number') features.push(sensors.tcs34725.green);
      if (typeof sensors.tcs34725.blue === 'number') features.push(sensors.tcs34725.blue);
      if (typeof sensors.tcs34725.clear === 'number') features.push(sensors.tcs34725.clear);
    }

    // VL53L1X Distance
    if (sensors.vl53l1x && typeof sensors.vl53l1x.distance_mm === 'number') {
      features.push(sensors.vl53l1x.distance_mm);
    }

    return features;
  }
}
