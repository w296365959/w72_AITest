import type { Task, TaskInsert, TaskUpdate } from '@/types/task';

const BASE = '';

export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${BASE}/api/tasks`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '获取任务失败');
  }
  return res.json();
}

export async function createTask(data: TaskInsert): Promise<Task> {
  const res = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '添加任务失败');
  }
  return res.json();
}

export async function updateTask(id: string, data: TaskUpdate): Promise<Task> {
  const res = await fetch(`${BASE}/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '更新任务失败');
  }
  return res.json();
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '删除任务失败');
  }
}

export type BreakdownResult = { parent: Task; subtasks: Task[] };

export async function breakdownTask(taskId: string): Promise<BreakdownResult> {
  const res = await fetch(`${BASE}/api/tasks/breakdown`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '拆解任务失败');
  }
  return res.json();
}

export type OptimizePromptResult = { optimized: string };

export type Chat = import('@/types/chat').Chat;

export async function fetchChats(): Promise<Chat[]> {
  const res = await fetch(`${BASE}/api/chat`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '获取聊天记录失败');
  }
  return res.json();
}

export async function sendChat(txt: string): Promise<Chat> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '发送失败');
  }
  return res.json();
}

export async function optimizePrompt(userRequest: string, userInput?: string): Promise<OptimizePromptResult> {
  const res = await fetch(`${BASE}/api/prompts/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_request: userRequest,
      user_input: userInput ?? userRequest,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '提示词优化失败');
  }
  return res.json();
}
