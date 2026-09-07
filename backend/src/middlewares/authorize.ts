import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { Err } from '../utils/errors';

/**
 * Role-based access control middleware factory.
 * Usage: authorize('ADMIN'), authorize('ADMIN', 'OPERATOR')
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(Err.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(Err.forbidden(`Role '${req.user.role}' is not authorized for this action`));
    }
    next();
  };
}
