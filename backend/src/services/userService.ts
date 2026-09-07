import { UserRepository } from '../repositories/userRepository';
import { AuditLogRepository } from '../repositories/auditLogRepository';
import { CreateUserInput, UpdateUserInput } from '../validators/userValidator';
import { Profile, UserRole } from '../types';
import { supabaseAdmin } from '../config/supabase';
import { Err } from '../utils/errors';

export class UserService {
  static async getAllUsers(page = 1, limit = 10, role?: UserRole) {
    return UserRepository.findAll(page, limit, role);
  }

  static async getUserById(id: string): Promise<Profile> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw Err.notFound('Pengguna tidak ditemukan');
    }
    return user;
  }

  static async createUser(input: CreateUserInput, adminUserId?: string): Promise<Profile> {
    // 1. Check existing
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw Err.conflict('Email sudah terdaftar', 'EMAIL_TAKEN');
    }

    // 2. Create in Supabase Auth via admin API
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      throw Err.badRequest(authErr?.message || 'Gagal membuat pengguna');
    }

    // 3. Create profile with requested role
    const profile = await UserRepository.createProfile({
      auth_user_id: authData.user.id,
      full_name: input.full_name,
      email: input.email,
      role: input.role,
      status: 'ACTIVE',
    });

    await AuditLogRepository.log('USER_CREATED', 'users', adminUserId, profile.id, 'SUCCESS', { role: input.role });
    return profile;
  }

  static async updateUser(id: string, input: UpdateUserInput, actorUserId?: string): Promise<Profile> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw Err.notFound('Pengguna tidak ditemukan');
    }

    const updated = await UserRepository.updateProfile(id, input);
    await AuditLogRepository.log('USER_UPDATED', 'users', actorUserId, id, 'SUCCESS', input);
    return updated;
  }

  static async deleteUser(id: string, adminUserId?: string): Promise<void> {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw Err.notFound('Pengguna tidak ditemukan');
    }

    // Soft delete / deactivate profile
    await UserRepository.updateProfile(id, { status: 'INACTIVE' });
    await AuditLogRepository.log('USER_DEACTIVATED', 'users', adminUserId, id, 'SUCCESS');
  }
}
