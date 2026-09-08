import { z } from 'zod';

export const singleSampleSchema = z.object({
  sample_number: z.number().int().min(1).max(20).optional(),
  timestamp: z.string().optional(),
  as7341: z.object({
    f1: z.number().optional(),
    f2: z.number().optional(),
    f3: z.number().optional(),
    f4: z.number().optional(),
    f5: z.number().optional(),
    f6: z.number().optional(),
    f7: z.number().optional(),
    f8: z.number().optional(),
    clear: z.number().optional(),
    nir: z.number().optional(),
  }).passthrough(),
  tcs34725: z.object({
    r: z.number().optional(),
    red: z.number().optional(),
    g: z.number().optional(),
    green: z.number().optional(),
    b: z.number().optional(),
    blue: z.number().optional(),
    clear: z.number().optional(),
  }).passthrough(),
  vl53l1x: z.object({
    distance_mm: z.number().optional(),
  }).passthrough(),
});

export const iotMeasurementSchema = z.object({
  device_id: z.string().min(1, 'device_id wajib diisi'),
  measurement_id: z.string().min(1, 'measurement_id wajib diisi'),
  timestamp: z.string().optional(),
  data_source: z.enum(['synthetic', 'iot_real']).optional().default('iot_real'),
  samples: z.array(singleSampleSchema).min(1).max(20).optional(),
  sensors: z.object({
    as7341: z.record(z.number()).optional(),
    tcs34725: z.record(z.number()).optional(),
    vl53l1x: z.record(z.number()).optional(),
  }).optional(),
}).refine((data) => data.samples || data.sensors, {
  message: 'Either samples (array of 20 raw samples) or sensors payload must be provided',
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

export type SingleSampleInput = z.infer<typeof singleSampleSchema>;
export type IotMeasurementInput = z.infer<typeof iotMeasurementSchema>;
export type IotHeartbeatInput = z.infer<typeof iotHeartbeatSchema>;
export type IotStatusInput = z.infer<typeof iotStatusSchema>;
