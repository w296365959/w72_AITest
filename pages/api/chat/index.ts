import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { getCurrentUserOptional } from '@/lib/auth-api';
import { sanitizeString } from '@/lib/auth';
import type { Chat, ChatInsert } from '@/types/chat';

type ErrorResponse = { error: string; details?: unknown };

const SENDER_NAME_MAX_LEN = 64;

function isChatInsert(body: unknown): body is ChatInsert {
  return (
    typeof body === 'object' &&
    body !== null &&
    'txt' in body &&
    typeof (body as ChatInsert).txt === 'string'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Chat[] | Chat | ErrorResponse>
) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('chat')
        .select('id, txt, sender_name, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Supabase GET chat error:', error);
        return res.status(500).json({ error: '获取聊天记录失败', details: error.message });
      }

      return res.status(200).json((data ?? []) as Chat[]);
    } catch (e) {
      console.error('GET /api/chat unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  if (req.method === 'POST') {
    if (!isChatInsert(req.body)) {
      return res.status(400).json({
        error: '请求体无效',
        details: '需要包含 txt（字符串）',
      });
    }

    const { txt } = req.body;

    if (!txt.trim()) {
      return res.status(400).json({ error: 'txt 不能为空' });
    }

    let sender_name: string | null = null;
    const user = await getCurrentUserOptional(req);
    if (user) {
      sender_name = (user.displayName || user.username) ?? null;
    } else if (typeof req.body.sender_name === 'string' && req.body.sender_name.trim()) {
      sender_name = sanitizeString(req.body.sender_name.trim(), SENDER_NAME_MAX_LEN) || null;
    }

    try {
      const { data, error } = await supabase
        .from('chat')
        .insert({ txt: txt.trim(), sender_name })
        .select()
        .single();

      if (error) {
        console.error('Supabase POST chat error:', error);
        return res.status(500).json({ error: '发送失败', details: error.message });
      }

      return res.status(201).json(data as Chat);
    } catch (e) {
      console.error('POST /api/chat unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `方法 ${req.method} 不允许` });
}
