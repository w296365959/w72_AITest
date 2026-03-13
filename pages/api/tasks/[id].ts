import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import type { Task, TaskUpdate } from '@/types/task';

type ErrorResponse = { error: string; details?: unknown };

function parseId(id: unknown): string | null {
  if (typeof id === 'string' && id.length > 0) return id;
  return null;
}

function isTaskUpdate(body: unknown): body is TaskUpdate {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (b.title !== undefined && typeof b.title !== 'string') return false;
  if (
    b.description !== undefined &&
    b.description !== null &&
    typeof b.description !== 'string'
  )
    return false;
  if (
    b.status !== undefined &&
    !['pending', 'completed'].includes(String(b.status))
  )
    return false;
  if (
    b.parent_id !== undefined &&
    b.parent_id !== null &&
    typeof b.parent_id !== 'string'
  )
    return false;
  return true;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Task | ErrorResponse>
) {
  const id = parseId(req.query.id);
  if (!id) {
    return res.status(400).json({ error: '无效的任务 id' });
  }

  if (req.method === 'PATCH') {
    if (!isTaskUpdate(req.body)) {
      return res.status(400).json({
        error: '请求体无效',
        details:
          '允许的字段: title(string), description(string|null), status(pending|completed), parent_id(string|null)',
      });
    }

    const updates: TaskUpdate = {};
    if (req.body.title !== undefined) updates.title = req.body.title.trim();
    if (req.body.description !== undefined)
      updates.description = req.body.description?.trim() ?? null;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.parent_id !== undefined)
      updates.parent_id = req.body.parent_id ?? null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: '未提供要更新的字段' });
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase PATCH task error:', error);
        return res.status(500).json({ error: '更新任务失败', details: error.message });
      }

      if (!data) {
        return res.status(404).json({ error: '任务不存在' });
      }

      return res.status(200).json(data as Task);
    } catch (e) {
      console.error('PATCH /api/tasks/[id] unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) {
        console.error('Supabase DELETE task error:', error);
        return res.status(500).json({ error: '删除任务失败', details: error.message });
      }

      return res.status(204).end();
    } catch (e) {
      console.error('DELETE /api/tasks/[id] unexpected error:', e);
      return res.status(500).json({ error: '服务器错误', details: String(e) });
    }
  }

  res.setHeader('Allow', ['PATCH', 'DELETE']);
  return res.status(405).json({ error: `方法 ${req.method} 不允许` });
}
