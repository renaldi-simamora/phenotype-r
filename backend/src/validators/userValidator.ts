import { z } from 'zod';

export const createUserSchema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  role: z.enum(['ADMIN', 'OPERATOR', 'USER']).default('USER'),
});

export const updateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'USER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
