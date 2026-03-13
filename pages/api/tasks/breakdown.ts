import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types/task';

type ErrorResponse = { error: string; details?: unknown };

type BreakdownResponse = {
  parent: Task;
  subtasks: Task[];
};

function parseTaskId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;
  const id = b.taskId ?? b.task_id;
  if (typeof id === 'string' && id.length > 0) return id;
  return null;
}

/** 从 AI 返回的文本中解析出步骤标题列表（支持换行、编号、JSON 等） */
function parseStepsFromText(text: string): string[] {
  const trimmed = text.trim();
  const lines = trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean);
  const steps: string[] = [];
  for (const line of lines) {
    // 去掉常见编号：1. 2. 1) 2) - *
    const cleaned = line
      .replace(/^\s*\d+[.)]\s*/, '')
      .replace(/^\s*[-*]\s*/, '')
      .trim();
    if (cleaned.length > 0) steps.push(cleaned);
  }
  if (steps.length > 0) return steps.slice(0, 10); // 最多取 10 条，后面再截 3-5
  // 尝试 JSON 数组
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    // ignore
  }
  return [];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BreakdownResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `方法 ${req.method} 不允许` });
  }

  const taskId = parseTaskId(req.body);
  if (!taskId) {
    return res.status(400).json({
      error: '请求体无效',
      details: '需要提供 taskId 或 task_id（字符串）',
    });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: '服务配置错误',
      details: '未配置 DEEPSEEK_API_KEY',
    });
  }

  try {
    // 1. 查询原任务
    const { data: parent, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (fetchError || !parent) {
      return res.status(404).json({
        error: '任务不存在',
        details: fetchError?.message,
      });
    }

    const parentTask = parent as Task;
    const taskTitle = parentTask.title;

    const unuiApiBaseUrl = process.env.UIUIAPI_BASE_URL;
    // 2. 调用 DeepSeek 拆解任务
    const openai = new OpenAI({
      apiKey,
      baseURL: unuiApiBaseUrl,
    });

    const completion = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content:
            '你是一个任务拆解助手。请把用户给出的任务拆解成 3 到 5 个可执行的小步骤。只输出步骤列表，每行一个步骤，不要编号或多余说明。步骤标题简洁清晰。',
        },
        {
          role: 'user',
          content: `请把以下任务拆解成 3～5 个可执行的小步骤：\n\n「${taskTitle}」`,
        },
      ],
      temperature: 0.3,
    });

    const rawContent =
      completion.choices?.[0]?.message?.content?.trim() ?? '';
    const stepTitles = parseStepsFromText(rawContent);

    // 限制为 3～5 步
    const finalSteps =
      stepTitles.length >= 3 && stepTitles.length <= 5
        ? stepTitles
        : stepTitles.length > 5
          ? stepTitles.slice(0, 5)
          : stepTitles.length >= 1
            ? stepTitles
            : ['步骤 1', '步骤 2', '步骤 3'].map((s, i) => `${taskTitle} - ${s}`);

    if (finalSteps.length === 0) {
      return res.status(502).json({
        error: 'AI 未返回有效步骤',
        details: rawContent || '空响应',
      });
    }

    // 3. 写入子任务
    const inserts = finalSteps.map((title) => ({
      title,
      description: null,
      status: 'pending' as const,
      parent_id: taskId,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('tasks')
      .insert(inserts)
      .select();

    if (insertError) {
      console.error('Supabase insert subtasks error:', insertError);
      return res.status(500).json({
        error: '保存子任务失败',
        details: insertError.message,
      });
    }

    const subtasks = (inserted ?? []) as Task[];

    return res.status(200).json({
      parent: parentTask,
      subtasks,
    });
  } catch (e) {
    console.error('POST /api/tasks/breakdown unexpected error:', e);
    return res.status(500).json({
      error: '服务器错误',
      details: String(e),
    });
  }
}
