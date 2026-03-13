import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import type { Task, TaskInsert } from '@/types/task';

type ErrorResponse = { error: string; details?: unknown };

function isTaskInsert(body: unknown): body is TaskInsert {
  return (
    typeof body === 'object' &&
    body !== null &&
    'title' in body &&
    typeof (body as TaskInsert).title === 'string'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Task[] | Task | ErrorResponse>
) {
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase GET tasks error:', error);
        return res.status(500).json({ error: '获取任务失败', details: error.message });
      }

      return res.status(200).json((data ?? []) as Task[]);
    } catch (e) {
      console.error('GET /api/tasks unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  if (req.method === 'POST') {
    if (!isTaskInsert(req.body)) {
      return res.status(400).json({
        error: '请求体无效',
        details: '需要至少包含 title（字符串）',
      });
    }

    const { title, description = null, status = 'pending', parent_id = null } = req.body;

    if (!title.trim()) {
      return res.status(400).json({ error: 'title 不能为空' });
    }

    const statusOk = status === 'pending' || status === 'completed';
    if (!statusOk) {
      return res.status(400).json({ error: 'status 只能是 pending 或 completed' });
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          description: description?.trim() || null,
          status,
          parent_id,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase POST task error:', error);
        return res.status(500).json({ error: '创建任务失败', details: error.message });
      }

      return res.status(201).json(data as Task);
    } catch (e) {
      console.error('POST /api/tasks unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: `方法 ${req.method} 不允许` });
}
