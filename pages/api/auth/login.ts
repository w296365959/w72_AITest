/**
 * 用户登录 API
 * POST /api/auth/login
 * Body: { usernameOrEmail, password }
 * 成功：200，返回 { user, token, expiresIn }
 * 用户数据来自 Supabase 表 auth_users
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import {
  validateUsernameOrEmail,
  validatePassword,
  comparePassword,
  signToken,
  toUserPublic,
} from '@/lib/auth';
import { findUserByUsernameOrEmail } from '@/lib/auth-supabase';
import type { AuthResponse } from '@/types/user';

type ErrorRes = { error: string; details?: string };

function parseLoginBody(body: unknown): { usernameOrEmail: string; password: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.usernameOrEmail !== 'string' || typeof b.password !== 'string') return null;
  return { usernameOrEmail: b.usernameOrEmail, password: b.password };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthResponse | ErrorRes>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `方法 ${req.method} 不允许` });
  }

  const parsed = parseLoginBody(req.body);
  if (!parsed) {
    return res.status(400).json({
      error: '请求体无效',
      details: '需要 usernameOrEmail、password（均为字符串）',
    });
  }

  const identityResult = validateUsernameOrEmail(parsed.usernameOrEmail);
  if (!identityResult.ok) {
    return res.status(400).json({ error: identityResult.error });
  }
  const passwordResult = validatePassword(parsed.password);
  if (!passwordResult.ok) {
    return res.status(400).json({ error: passwordResult.error });
  }

  const usernameOrEmail = identityResult.value;
  const isEmail = usernameOrEmail.includes('@');

  try {
    const user = await findUserByUsernameOrEmail(
      isEmail ? usernameOrEmail.toLowerCase() : usernameOrEmail,
      isEmail
    );
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    // 必须校验密码：仅在校验通过后签发 token
    if (!user.passwordHash || typeof user.passwordHash !== 'string') {
      console.error('Login: user missing passwordHash', user.id);
      return res.status(500).json({ error: '账户数据异常，请联系管理员' });
    }
    const passwordMatch = await comparePassword(parsed.password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const { token, expiresIn } = signToken(user);
    const response: AuthResponse = {
      user: toUserPublic(user),
      token,
      expiresIn,
    };
    return res.status(200).json(response);
  } catch (e) {
    console.error('Login error:', e);
    return res.status(500).json({
      error: '登录失败，请稍后重试',
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
