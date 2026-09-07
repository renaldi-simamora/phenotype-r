import { Request, Response, NextFunction } from 'express';
import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { AuthUser } from '../types';
import { Err } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Verifies Supabase JWT from Authorization: Bearer <token>
 * Attaches req.user with id, auth_user_id, full_name, email, and role from profiles table.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(Err.unauthorized('Missing or invalid Authorization header'));
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT with Supabase Auth
    const { data, error } = await supabaseClient.auth.getUser(token);
    if (error || !data.user) {
      return next(Err.unauthorized('Invalid or expired token'));
    }

    // Fetch role from profiles table (service role bypasses RLS)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, auth_user_id, full_name, email, role, status')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      logger.warn('Profile not found for auth user', { userId: data.user.id });
      return next(Err.unauthorized('User profile not found'));
    }

    if (profile.status === 'INACTIVE') {
      return next(Err.forbidden('Account is inactive'));
    }

    req.user = {
      id: profile.id,
      auth_user_id: profile.auth_user_id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
    };

    next();
  } catch (err) {
    next(err);
  }
}
