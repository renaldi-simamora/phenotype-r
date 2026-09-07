import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { code: err.code, details: err.details });
    }
    sendError(res, err.message, err.code, err.statusCode, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(res, 'Validation failed', 'VALIDATION_ERROR', 400, err.flatten());
    return;
  }

  // Unknown error
  const message = err instanceof Error ? err.message : 'Unexpected error';
  logger.error('Unhandled error', { message, stack: err instanceof Error ? err.stack : undefined });

  const detail = env.NODE_ENV === 'development' ? message : undefined;
  sendError(res, 'Internal server error', 'INTERNAL_ERROR', 500, detail);
}
