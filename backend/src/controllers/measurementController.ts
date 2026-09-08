import { Response, NextFunction } from 'express';
import { MeasurementService } from '../services/measurementService';
import { SensorRepository } from '../repositories/sensorRepository';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, MeasurementStatus, DataSource, MeasurementQuality } from '../types';

export class MeasurementController {
  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const measurement = await MeasurementService.createMeasurement(req.body, req.user?.id);
      sendSuccess(res, 'Measurement session created successfully', measurement, 201);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const userId = req.query.user_id as string | undefined;
      const deviceId = req.query.device_id as string | undefined;
      const status = req.query.status as MeasurementStatus | undefined;
      const dataSource = req.query.data_source as DataSource | undefined;
      const quality = req.query.quality as MeasurementQuality | undefined;
      const classification = req.query.classification as string | undefined;
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      // Role filter check: USER role can only see their own measurements
      let effectiveUserId = userId;
      if (req.user?.role === 'USER') {
        effectiveUserId = req.user.id;
      }

      const result = await MeasurementService.getMeasurements(page, limit, {
        userId: effectiveUserId,
        deviceId,
        status,
        dataSource,
        quality,
        classification,
        startDate,
        endDate,
      });

      sendSuccess(res, 'Measurements fetched successfully', result.data, 200, {
        page,
        limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const measurement = await MeasurementService.getMeasurementById(id);
      
      const prediction = await MlPredictionRepository.findByMeasurementId(id);
      const sensors = await SensorRepository.findByMeasurementId(id);
      const rawSamples = await MeasurementService.getRawSamples(id);

      sendSuccess(res, 'Measurement details fetched successfully', {
        ...measurement,
        prediction: prediction || measurement.prediction,
        sensors,
        raw_samples: rawSamples,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRawSamples(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const rawSamples = await MeasurementService.getRawSamples(id);
      sendSuccess(res, 'Raw samples fetched successfully', rawSamples);
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await MeasurementService.updateStatus(id, status, req.user?.id);
      sendSuccess(res, 'Measurement status updated successfully', updated);
    } catch (error) {
      next(error);
    }
  }

  static async getSensors(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const sensors = await SensorRepository.findByMeasurementId(id);
      sendSuccess(res, 'Sensor readings fetched successfully', sensors);
    } catch (error) {
      next(error);
    }
  }

  static async exportMeasurements(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.role === 'USER' ? req.user.id : (req.query.user_id as string | undefined);
      const csvData = await MeasurementService.exportMeasurementsCsv({
        userId,
        deviceId: req.query.device_id as string | undefined,
        status: req.query.status as MeasurementStatus | undefined,
        dataSource: req.query.data_source as DataSource | undefined,
        quality: req.query.quality as MeasurementQuality | undefined,
        classification: req.query.classification as string | undefined,
        startDate: req.query.start_date as string | undefined,
        endDate: req.query.end_date as string | undefined,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="measurements_${Date.now()}.csv"`);
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  static async exportRawSamples(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const measurementId = req.query.measurement_id as string | undefined;
      const userId = req.user?.role === 'USER' ? req.user.id : (req.query.user_id as string | undefined);

      const csvData = await MeasurementService.exportRawSamplesCsv(measurementId, {
        userId,
        deviceId: req.query.device_id as string | undefined,
        status: req.query.status as MeasurementStatus | undefined,
        dataSource: req.query.data_source as DataSource | undefined,
        quality: req.query.quality as MeasurementQuality | undefined,
        classification: req.query.classification as string | undefined,
        startDate: req.query.start_date as string | undefined,
        endDate: req.query.end_date as string | undefined,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="raw_samples_${measurementId || 'all'}_${Date.now()}.csv"`
      );
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }
}
