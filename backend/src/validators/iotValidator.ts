import { z } from 'zod';

export const iotMeasurementSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  measurement_id: z.string().min(1, 'measurement_id wajib diisi'),
  timestamp: z.string().optional(),
  sensors: z.object({
    as7341: z.record(z.number()).optional(),
    tcs34725: z.object({
      red: z.number().optional(),
      green: z.number().optional(),
      blue: z.number().optional(),
      clear: z.number().optional(),
    }).optional(),
    vl53l1x: z.object({
      distance_mm: z.number().optional(),
    }).optional(),
    bme280: z.object({
      ambient_temperature_c: z.number().optional(),
      humidity_percent: z.number().optional(),
      pressure_hpa: z.number().optional(),
    }).optional(),
  }),
});

export const iotHeartbeatSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  firmware_version: z.string().optional(),
  ip_address: z.string().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MEASURING', 'ERROR']).optional().default('ONLINE'),
});

export const iotStatusSchema = z.object({
  status: z.enum(['ONLINE', 'OFFLINE', 'MEASURING', 'ERROR']),
  message: z.string().optional(),
});

export type IotMeasurementInput = z.infer<typeof iotMeasurementSchema>;
export type IotHeartbeatInput = z.infer<typeof iotHeartbeatSchema>;
export type IotStatusInput = z.infer<typeof iotStatusSchema>;
