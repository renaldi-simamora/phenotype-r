import { z } from 'zod';

export const createDeviceSchema = z.object({
  device_name: z.string().min(2, 'Nama device minimal 2 karakter'),
  firmware_version: z.string().optional().default('1.0.0'),
});

export const updateDeviceSchema = z.object({
  device_name: z.string().min(2).optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'MEASURING', 'ERROR']).optional(),
  firmware_version: z.string().optional(),
});

export type CreateDeviceInput = z.infer<typeof createDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
