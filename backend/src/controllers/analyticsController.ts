import { Response, NextFunction } from 'express';
import { AnalyticsService } from '../services/analyticsService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AnalyticsController {
  static async getMeasurementsStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AnalyticsService.getMeasurementStats();
      sendSuccess(res, 'Measurement analytics fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  static async getPredictionsStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AnalyticsService.getPredictionDistribution();
      sendSuccess(res, 'Prediction distribution analytics fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  static async getDataSourcesStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AnalyticsService.getDataSourceStats();
      sendSuccess(res, 'Data sources analytics fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  static async getDevicesStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await AnalyticsService.getDeviceStats();
      sendSuccess(res, 'Device usage analytics fetched', stats);
    } catch (error) {
      next(error);
    }
  }

  static async getModelPerformance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const performance = await AnalyticsService.getModelPerformance();
      sendSuccess(res, 'Model performance metrics fetched', performance);
    } catch (error) {
      next(error);
    }
  }
}
