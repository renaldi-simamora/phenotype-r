import { z } from 'zod';

export const createMeasurementSchema = z.object({
  user_id: z.string().uuid('user_id harus berupa UUID valid'),
  device_id: z.string().uuid('device_id harus berupa UUID valid'),
});

export const updateMeasurementStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ML_PROCESSING_FAILED']),
});

export type CreateMeasurementInput = z.infer<typeof createMeasurementSchema>;
export type UpdateMeasurementStatusInput = z.infer<typeof updateMeasurementStatusSchema>;
