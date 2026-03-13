/**
 * API 层认证辅助：从请求中解析 JWT 并返回当前用户
 * 用户数据来自 Supabase 表 auth_users
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getBearerToken, verifyToken } from '@/lib/auth';
import { findUserById } from '@/lib/auth-supabase';
import type { UserDocument } from '@/types/user';

type ErrorRes = { error: string };

/**
 * 从请求头中读取 JWT，验证后查询用户并返回。
 * 若未登录或 token 无效，返回 401 并返回 null。
 */
export async function getCurrentUser(
  req: NextApiRequest,
  res: NextApiResponse<ErrorRes>
): Promise<UserDocument | null> {
  const token = getBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({ error: '未提供认证信息，请先登录' });
    return null;
  }
  const payload = verifyToken(token);
  if (!payload?.sub) {
    res.status(401).json({ error: '登录已过期或无效，请重新登录' });
    return null;
  }
  const user = await findUserById(payload.sub);
  if (!user) {
    res.status(401).json({ error: '用户不存在或已被删除' });
    return null;
  }
  return user;
}

/**
 * 可选认证：仅解析 JWT 并返回用户，不写入 401 响应。
 * 用于允许匿名访问的接口（如聊天）中识别已登录用户。
 */
export async function getCurrentUserOptional(req: NextApiRequest): Promise<UserDocument | null> {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload?.sub) return null;
  return findUserById(payload.sub);
}
