import { Response, NextFunction } from 'express';
import { MlPredictionRepository } from '../repositories/mlPredictionRepository';
import { MlModelRepository } from '../repositories/mlModelRepository';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class MlController {
  static async getPredictionByMeasurementId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { measurementId } = req.params;
      const prediction = await MlPredictionRepository.findByMeasurementId(measurementId);
      sendSuccess(res, 'Prediction fetched successfully', prediction);
    } catch (error) {
      next(error);
    }
  }

  static async getModels(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const models = await MlModelRepository.findAll();
      sendSuccess(res, 'ML Models fetched successfully', models);
    } catch (error) {
      next(error);
    }
  }

  static async getModelById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const model = await MlModelRepository.findById(id);
      sendSuccess(res, 'ML Model details fetched successfully', model);
    } catch (error) {
      next(error);
    }
  }
}
