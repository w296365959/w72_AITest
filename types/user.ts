/**
 * 用户相关类型定义
 * 用于登录注册与用户信息展示（存储于 Supabase PostgreSQL）
 */

/** 数据库中的用户行（含密码哈希），字段与 Supabase 表一致时使用 id */
export interface UserDocument {
  /** 主键，Supabase 使用 uuid */
  id: string;
  /** 用户名，唯一，用于登录 */
  username: string;
  /** 邮箱，唯一 */
  email: string;
  /** bcrypt 加密后的密码，永不返回给前端 */
  passwordHash: string;
  /** 显示名称，可选 */
  displayName?: string | null;
  /** 创建时间（ISO 字符串） */
  createdAt: string;
  /** 最后更新时间（ISO 字符串） */
  updatedAt: string;
}

/** 返回给前端的用户信息（不含密码） */
export interface UserPublic {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 注册请求体 */
export interface RegisterBody {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

/** 登录请求体 */
export interface LoginBody {
  /** 支持用户名或邮箱登录 */
  usernameOrEmail: string;
  password: string;
}

/** 登录/注册成功响应 */
export interface AuthResponse {
  user: UserPublic;
  token: string;
  /** JWT 过期时间（秒） */
  expiresIn: number;
}
