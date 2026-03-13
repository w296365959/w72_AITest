/**
 * 用户注册 API
 * POST /api/auth/register
 * Body: { username, email, password, displayName? }
 * 成功：201，返回 { user, token, expiresIn }
 * 使用 Supabase 表 auth_users 存储，密码 bcrypt 加密
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  validateUsername,
  validateEmail,
  validatePassword,
  sanitizeString,
  hashPassword,
  signToken,
  toUserPublic,
} from '@/lib/auth';
import { findExistingUser, insertAuthUser } from '@/lib/auth-supabase';
import type { AuthResponse } from '@/types/user';

type ErrorRes = { error: string; details?: string };

/** 请求体类型校验 */
function parseRegisterBody(body: unknown): { username: string; email: string; password: string; displayName?: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.username !== 'string' || typeof b.email !== 'string' || typeof b.password !== 'string') {
    return null;
  }
  return {
    username: b.username,
    email: b.email,
    password: b.password,
    displayName: typeof b.displayName === 'string' ? b.displayName : undefined,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse | ErrorRes>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `方法 ${req.method} 不允许` });
  }

  const parsed = parseRegisterBody(req.body);
  if (!parsed) {
    return res.status(400).json({ error: '请求体无效', details: '需要 username、email、password（均为字符串）' });
  }

  const usernameResult = validateUsername(parsed.username);
  if (!usernameResult.ok) {
    return res.status(400).json({ error: usernameResult.error });
  }
  const emailResult = validateEmail(parsed.email);
  if (!emailResult.ok) {
    return res.status(400).json({ error: emailResult.error });
  }
  const passwordResult = validatePassword(parsed.password);
  if (!passwordResult.ok) {
    return res.status(400).json({ error: passwordResult.error });
  }

  const username = usernameResult.value;
  const email = emailResult.value;
  const displayName = parsed.displayName !== undefined ? sanitizeString(parsed.displayName, 64) : undefined;

  try {
    const existing = await findExistingUser(username, email);
    if (existing.byUsername) {
      return res.status(409).json({ error: '用户名已存在' });
    }
    if (existing.byEmail) {
      return res.status(409).json({ error: '邮箱已被注册' });
    }

    const passwordHash = await hashPassword(parsed.password);
    const user = await insertAuthUser({
      username,
      email,
      passwordHash,
      displayName: displayName || null,
    });

    const { token, expiresIn } = signToken(user);
    const response: AuthResponse = {
      user: toUserPublic(user),
      token,
      expiresIn,
    };
    return res.status(201).json(response);
  } catch (e) {
    console.error('Register error:', e);
    return res.status(500).json({
      error: '注册失败，请稍后重试',
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
