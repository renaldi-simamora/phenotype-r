import { Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthenticatedRequest, DeviceStatus } from '../types';
import { Err } from '../utils/errors';
import { logger } from '../utils/logger';

export const deviceAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const deviceIdHeader = (req.headers['x-device-id'] as string) || req.body?.device_id;
    const deviceKeyHeader = (req.headers['x-device-key'] as string) || req.headers['x-api-key'] as string;

    if (!deviceIdHeader) {
      throw Err.unauthorized('Device authentication failed: Missing x-device-id header or device_id field', 'DEVICE_UNAUTHORIZED');
    }

    // Query device from DB by id or device_code
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(deviceIdHeader);
    const query = supabaseAdmin.from('devices').select('*');
    
    if (isUuid) {
      query.eq('id', deviceIdHeader);
    } else {
      query.eq('device_code', deviceIdHeader);
    }

    const { data: device, error } = await query.single();

    if (error || !device) {
      logger.warn(`Device authentication failed for ID: ${deviceIdHeader}`);
      throw Err.unauthorized('Device authentication failed: Device not found', 'DEVICE_UNAUTHORIZED');
    }

    // Verify key if device has a key configured
    if (device.device_key && deviceKeyHeader && device.device_key !== deviceKeyHeader) {
      logger.warn(`Device authentication key mismatch for ID: ${deviceIdHeader}`);
      throw Err.unauthorized('Device authentication failed: Invalid device key', 'DEVICE_UNAUTHORIZED');
    }

    // Attach device to request
    req.device = {
      id: device.id,
      device_code: device.device_code,
      device_name: device.device_name,
      status: device.status as DeviceStatus,
    };

    next();
  } catch (error) {
    next(error);
  }
};
