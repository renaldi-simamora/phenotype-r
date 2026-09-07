import { Response, NextFunction } from 'express';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class AuditLogController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '20', 10);
      const action = req.query.action as string | undefined;
      const resource = req.query.resource as string | undefined;
      const userId = req.query.user_id as string | undefined;

      const result = await AuditLogRepository.findAll(page, limit, { action, resource, userId });
      sendSuccess(res, 'Audit logs fetched successfully', result.data, 200, {
        page,
        limit,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }
}
