import { supabaseClient, supabaseAdmin } from '../config/supabase';
import { RegisterInput, LoginInput } from '../validators/authValidator';
import { UserRepository } from '../repositories/userRepository';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { Err } from '../utils/errors';
import { Profile } from '../types';

export class AuthService {
  static async register(input: RegisterInput): Promise<{ profile: Profile; session: unknown }> {
    // 1. Register user with auto-confirmed email (using admin API to bypass email confirmation on localhost)
    let authUser = null;
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (adminError || !adminData.user) {
      // Fallback to standard signUp if admin API has any restriction
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email: input.email,
        password: input.password,
      });
      if (signUpError || !signUpData.user) {
        throw Err.badRequest(signUpError?.message || adminError?.message || 'Registrasi gagal', 'REGISTRATION_FAILED');
      }
      authUser = signUpData.user;
    } else {
      authUser = adminData.user;
    }

    // 2. Create Profile row in database (role: USER by default)
    let profile: Profile;
    try {
      profile = await UserRepository.createProfile({
        auth_user_id: authUser.id,
        full_name: input.full_name,
        email: input.email,
        role: 'USER',
        status: 'ACTIVE',
      });
    } catch (dbErr) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      throw Err.badRequest('Gagal membuat profil pengguna', 'PROFILE_CREATION_FAILED');
    }

    // 3. Automatically generate active session
    let session = null;
    const { data: loginData } = await supabaseClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (loginData?.session) {
      session = loginData.session;
    }

    await AuditLogRepository.log('USER_REGISTERED', 'users', profile.id, profile.id, 'SUCCESS');

    return {
      profile,
      session,
    };
  }

  static async login(input: LoginInput): Promise<{ profile: Profile; session: unknown }> {
    const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (authError || !authData.user || !authData.session) {
      throw Err.unauthorized('Email atau password salah', 'INVALID_CREDENTIALS');
    }

    // Fetch user profile
    const profile = await UserRepository.findByAuthUserId(authData.user.id);
    if (!profile) {
      throw Err.notFound('Profil pengguna tidak ditemukan', 'PROFILE_NOT_FOUND');
    }

    if (profile.status === 'INACTIVE') {
      throw Err.forbidden('Akun Anda sedang dinonaktifkan', 'ACCOUNT_INACTIVE');
    }

    await AuditLogRepository.log('USER_LOGGED_IN', 'users', profile.id, profile.id, 'SUCCESS');

    return {
      profile,
      session: authData.session,
    };
  }

  static async getMe(authUserId: string): Promise<Profile> {
    const profile = await UserRepository.findByAuthUserId(authUserId);
    if (!profile) {
      throw Err.notFound('Profil pengguna tidak ditemukan', 'PROFILE_NOT_FOUND');
    }
    return profile;
  }
}
