/**
 * 认证相关 Supabase 读写
 * 将表 auth_users 的 snake_case 行映射为 UserDocument
 */

import { supabase } from '@/lib/supabase';
import type { UserDocument } from '@/types/user';

/** Supabase 返回的 auth_users 行（蛇形命名） */
interface AuthUserRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

/** 将数据库行转为 UserDocument */
export function rowToUserDocument(row: AuthUserRow): UserDocument {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 按用户名或邮箱查询用户（用于登录）
 */
export async function findUserByUsernameOrEmail(
  usernameOrEmail: string,
  isEmail: boolean
): Promise<UserDocument | null> {
  const column = isEmail ? 'email' : 'username';
  const { data, error } = await supabase
    .from('auth_users')
    .select('*')
    .eq(column, usernameOrEmail)
    .maybeSingle();

  if (error || !data) return null;
  return rowToUserDocument(data as AuthUserRow);
}

/**
 * 检查用户名或邮箱是否已存在（用于注册）
 */
export async function findExistingUser(
  username: string,
  email: string
): Promise<{ byUsername: boolean; byEmail: boolean }> {
  const { data: byUsername } = await supabase
    .from('auth_users')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  const { data: byEmail } = await supabase
    .from('auth_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  return {
    byUsername: !!byUsername,
    byEmail: !!byEmail,
  };
}

/**
 * 插入新用户并返回（用于注册）
 */
export async function insertAuthUser(params: {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string | null;
}): Promise<UserDocument> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('auth_users')
    .insert({
      username: params.username,
      email: params.email,
      password_hash: params.passwordHash,
      display_name: params.displayName ?? null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToUserDocument(data as AuthUserRow);
}

/**
 * 按 id 查询用户（用于 JWT 验证后获取当前用户）
 */
export async function findUserById(id: string): Promise<UserDocument | null> {
  const { data, error } = await supabase
    .from('auth_users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return rowToUserDocument(data as AuthUserRow);
}
