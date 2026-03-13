/**
 * 认证工具库
 * 包含：密码 bcrypt 加密/校验、JWT 签发/验证、输入验证与清理
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserDocument, UserPublic } from '@/types/user';

/** bcrypt 盐轮数，平衡安全与性能 */
const SALT_ROUNDS = 12;
/** JWT 过期时间：7 天（秒） */
const JWT_EXPIRES_IN_SEC = 7 * 24 * 60 * 60;

const JWT_SECRET = process.env.JWT_SECRET || '';

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('JWT_SECRET 未设置，生产环境请务必配置');
}

// ---------- 输入验证与清理（防 XSS/注入） ----------

/** 用户名：字母数字下划线，3-32 位 */
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,32}$/;
/** 邮箱简单校验 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** 密码：至少 8 位，含字母和数字 */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{}|;':",.<>?/\\]{8,128}$/;

/**
 * 清理字符串：去除首尾空白，防止注入的换行/多余空白
 */
export function sanitizeString(value: unknown, maxLength: number): string {
  if (value === null || value === undefined) return '';
  const s = String(value).trim().slice(0, maxLength);
  // 移除控制字符，减少 XSS 风险
  return s.replace(/[\x00-\x1f\x7f]/g, '');
}

/**
 * 验证并清理用户名
 */
export function validateUsername(username: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = sanitizeString(username, 32);
  if (!s) return { ok: false, error: '用户名不能为空' };
  if (!USERNAME_REGEX.test(s)) {
    return { ok: false, error: '用户名只能包含字母、数字、下划线，且长度为 3-32 位' };
  }
  return { ok: true, value: s };
}

/**
 * 验证并清理邮箱
 */
export function validateEmail(email: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = sanitizeString(email, 256);
  if (!s) return { ok: false, error: '邮箱不能为空' };
  if (!EMAIL_REGEX.test(s)) return { ok: false, error: '邮箱格式不正确' };
  return { ok: true, value: s.toLowerCase() };
}

/**
 * 验证密码（不返回原值，仅校验强度）
 */
export function validatePassword(password: unknown): { ok: true } | { ok: false; error: string } {
  if (password === null || password === undefined || typeof password !== 'string') {
    return { ok: false, error: '密码不能为空' };
  }
  if (password.length < 8) return { ok: false, error: '密码至少 8 位' };
  if (password.length > 128) return { ok: false, error: '密码最多 128 位' };
  if (!PASSWORD_REGEX.test(password)) {
    return { ok: false, error: '密码需包含字母和数字' };
  }
  return { ok: true };
}

/**
 * 验证登录用“用户名或邮箱”字段
 */
export function validateUsernameOrEmail(
  usernameOrEmail: unknown
): { ok: true; value: string } | { ok: false; error: string } {
  const s = sanitizeString(usernameOrEmail, 256);
  if (!s) return { ok: false, error: '用户名或邮箱不能为空' };
  return { ok: true, value: s };
}

// ---------- 密码 bcrypt ----------

/**
 * 对明文密码进行 bcrypt 哈希（用于注册时存储）
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * 校验明文密码与哈希是否匹配（用于登录）
 */
export async function comparePassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

// ---------- JWT ----------

export interface JwtPayload {
  sub: string; // 用户 id（Supabase uuid）
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * 签发 JWT
 */
export function signToken(user: UserDocument): { token: string; expiresIn: number } {
  if (!JWT_SECRET) throw new Error('JWT_SECRET 未配置');
  const payload: JwtPayload = {
    sub: user.id,
    username: user.username,
  };
  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN_SEC,
    algorithm: 'HS256',
  });
  return { token, expiresIn: JWT_EXPIRES_IN_SEC };
}

/**
 * 验证并解析 JWT，返回 payload 或 null
 */
export function verifyToken(token: string): JwtPayload | null {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 从请求头 Authorization: Bearer <token> 中解析 token
 */
export function getBearerToken(authHeader: string | string[] | undefined): string | null {
  if (!authHeader || Array.isArray(authHeader)) return null;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1] || null;
}

// ---------- 用户文档转公开信息 ----------

/**
 * 将数据库用户行转为前端可用的公开信息（不含密码）
 */
export function toUserPublic(doc: UserDocument): UserPublic {
  return {
    id: doc.id,
    username: doc.username,
    email: doc.email,
    displayName: doc.displayName ?? undefined,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
