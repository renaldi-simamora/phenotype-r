/** Domain-specific error that carries an HTTP status code and error code */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// --- Convenience factories ---

export const Err = {
  badRequest:     (msg: string, code = 'VALIDATION_ERROR', details?: unknown) => new AppError(msg, 400, code, details),
  unauthorized:   (msg = 'Unauthorized', code = 'UNAUTHORIZED', details?: unknown) => new AppError(msg, 401, code, details),
  deviceUnauth:   (msg = 'Device unauthorized', details?: unknown) => new AppError(msg, 401, 'DEVICE_UNAUTHORIZED', details),
  forbidden:      (msg = 'Forbidden', code = 'FORBIDDEN', details?: unknown) => new AppError(msg, 403, code, details),
  notFound:       (msg: string, code = 'NOT_FOUND', details?: unknown) => new AppError(msg, 404, code, details),
  conflict:       (msg: string, code = 'CONFLICT', details?: unknown) => new AppError(msg, 409, code, details),
  internal:       (msg = 'Internal server error', code = 'INTERNAL_ERROR', details?: unknown) => new AppError(msg, 500, code, details),
};
