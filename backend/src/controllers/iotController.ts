import { Response, NextFunction } from 'express';
import { MeasurementService } from '../services/measurementService';
import { DeviceService } from '../services/deviceService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class IotController {
  static async sendSensorData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await MeasurementService.processIotSensorData(req.body);
      sendSuccess(res, 'Sensor payload received and processed', result, 201);
    } catch (error) {
      next(error);
    }
  }

  static async heartbeat(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.device?.id || req.body.device_id;
      const ip = req.ip || req.body.ip_address;
      await DeviceService.updateHeartbeat(deviceId, req.body.status || 'ONLINE', ip, req.body.firmware_version);
      sendSuccess(res, 'Heartbeat recorded successfully', { status: 'ONLINE', timestamp: new Date().toISOString() });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const deviceId = req.device?.id || req.body.device_id;
      await DeviceService.updateHeartbeat(deviceId, req.body.status);
      sendSuccess(res, 'Device status updated successfully', { status: req.body.status });
    } catch (error) {
      next(error);
    }
  }

  static async getDeviceStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deviceId } = req.params;
      const device = await DeviceService.getDeviceById(deviceId);
      sendSuccess(res, 'Device status fetched successfully', {
        id: device.id,
        device_code: device.device_code,
        status: device.status,
        last_seen: device.last_seen,
        firmware_version: device.firmware_version,
      });
    } catch (error) {
      next(error);
    }
  }
}
