/**
 * 获取当前登录用户信息
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * 成功：200，返回 UserPublic
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentUser } from '@/lib/auth-api';
import { toUserPublic } from '@/lib/auth';
import type { UserPublic } from '@/types/user';

type ErrorRes = { error: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserPublic | ErrorRes>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `方法 ${req.method} 不允许` });
  }

  const user = await getCurrentUser(req, res);
  if (!user) return;

  return res.status(200).json(toUserPublic(user));
}
