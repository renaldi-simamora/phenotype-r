import { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T | null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
}

export function sendSuccess<T>(
  res: Response,
  message: string,
  data: T | null = null,
  statusCode = 200,
  meta?: Record<string, unknown>
): Response {
  const body: ApiSuccess<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  code = 'INTERNAL_ERROR',
  statusCode = 500,
  details?: unknown
): Response {
  const body: ApiError = {
    success: false,
    message,
    error: { code, ...(details !== undefined ? { details } : {}) },
  };
  return res.status(statusCode).json(body);
}
