import { Response, NextFunction } from 'express';
import { DeviceService } from '../services/deviceService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest, DeviceStatus } from '../types';

export class DeviceController {
  static async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '10', 10);
      const status = req.query.status as DeviceStatus | undefined;

      const result = await DeviceService.getAllDevices(page, limit, status);
      sendSuccess(res, 'Devices fetched successfully', result.data, 200, {
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
      const device = await DeviceService.getDeviceById(id);
      sendSuccess(res, 'Device fetched successfully', device);
    } catch (error) {
      next(error);
    }
  }

  static async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const device = await DeviceService.createDevice(req.body, req.user?.id);
      sendSuccess(res, 'Device registered successfully', device, 201);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const device = await DeviceService.updateDevice(id, req.body, req.user?.id);
      sendSuccess(res, 'Device updated successfully', device);
    } catch (error) {
      next(error);
    }
  }
}
