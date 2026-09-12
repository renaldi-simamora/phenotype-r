import { Response, NextFunction } from 'express';
import { AssessmentService } from '../services/assessmentService';
import { AuthenticatedRequest } from '../types';
import { sendSuccess } from '../utils/response';

export class AssessmentController {
  static async getByMeasurementId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AssessmentService.getByMeasurementId(req.params.measurementId);
      sendSuccess(res, 'Assessment fetched successfully', result);
    } catch (error) {
      next(error);
    }
  }
}