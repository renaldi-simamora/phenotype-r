import crypto from 'crypto';
import { DeviceRepository } from '../repositories/deviceRepository';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { CreateDeviceInput, UpdateDeviceInput } from '../validators/deviceValidator';
import { Device, DeviceStatus } from '../types';
import { Err } from '../utils/errors';

export class DeviceService {
  static async getAllDevices(page = 1, limit = 10, status?: DeviceStatus) {
    return DeviceRepository.findAll(page, limit, status);
  }

  static async getDeviceById(id: string): Promise<Device> {
    const device = await DeviceRepository.findById(id);
    if (!device) {
      throw Err.notFound('Device tidak ditemukan');
    }
    return device;
  }

  static async createDevice(input: CreateDeviceInput, adminUserId?: string): Promise<Device> {
    const deviceCode = await DeviceRepository.getNextDeviceCode();
    // Generate secure device key for ESP32 provisioning
    const deviceKey = crypto.randomBytes(16).toString('hex');

    const device = await DeviceRepository.createDevice({
      device_code: deviceCode,
      device_name: input.device_name,
      device_key: deviceKey,
      status: 'OFFLINE',
      firmware_version: input.firmware_version || '1.0.0',
    });

    await AuditLogRepository.log('DEVICE_CREATED', 'devices', adminUserId, device.id, 'SUCCESS', { deviceCode });
    return device;
  }

  static async updateDevice(id: string, input: UpdateDeviceInput, adminUserId?: string): Promise<Device> {
    const device = await DeviceRepository.findById(id);
    if (!device) {
      throw Err.notFound('Device tidak ditemukan');
    }

    const updated = await DeviceRepository.updateDevice(id, input);
    await AuditLogRepository.log('DEVICE_UPDATED', 'devices', adminUserId, id, 'SUCCESS', input);
    return updated;
  }

  static async updateHeartbeat(
    deviceId: string,
    status: DeviceStatus,
    ipAddress?: string,
    firmwareVersion?: string
  ): Promise<void> {
    const device = await DeviceRepository.findById(deviceId);
    if (!device) {
      throw Err.notFound('Device tidak ditemukan', 'DEVICE_NOT_FOUND');
    }

    await DeviceRepository.updateHeartbeat(device.id, status, ipAddress, firmwareVersion);
  }
}
