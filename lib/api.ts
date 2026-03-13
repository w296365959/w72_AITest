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


export type SendChatOptions = {
  /** 未登录时传入的访客/设备显示名，用于展示发送人 */
  senderName?: string;
};

export async function sendChat(txt: string, options?: SendChatOptions): Promise<Chat> {
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const body: { txt: string; sender_name?: string } = { txt };
  if (options?.senderName) body.sender_name = options.senderName;
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || '发送失败');
  }
  return res.json();
}

/** 流式提示词优化：每收到一段内容调用 onChunk，结束时调用 onDone，出错时调用 onError */
export async function optimizePromptStream(
  userRequest: string,
  callbacks: {
    onChunk: (text: string) => void;
    onDone: () => void;
    onError: (err: Error) => void;
  },
  userInput?: string
): Promise<void> {
  const { onChunk, onDone, onError } = callbacks;
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
    onError(new Error((err as { error?: string }).error || '提示词优化失败'));
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    onError(new Error('无法读取响应流'));
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            onDone();
            return;
          }
          try {
            const data = JSON.parse(payload) as { content?: string; error?: string };
            if (data.error) {
              onError(new Error(data.error));
              return;
            }
            if (typeof data.content === 'string') onChunk(data.content);
          } catch {
            // 忽略单行解析错误
          }
        }
      }
    }
    if (buffer.startsWith('data: ')) {
      const payload = buffer.slice(6).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const data = JSON.parse(payload) as { content?: string; error?: string };
          if (data.error) onError(new Error(data.error));
          else if (typeof data.content === 'string') onChunk(data.content);
        } catch {
          // ignore
        }
      }
    }
    onDone();
  } catch (e) {
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}

// ---------- 认证 API ----------

export type UserPublic = import('@/types/user').UserPublic;
export type AuthResponse = import('@/types/user').AuthResponse;

const AUTH_TOKEN_KEY = 'auth_token';

/** 获取本地存储的 token（仅浏览器端） */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** 存储 token（仅浏览器端） */
export function setStoredToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

/** 注册 */
export async function register(data: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || '注册失败');
  }
  return json as AuthResponse;
}

/** 登录 */
export async function login(data: { usernameOrEmail: string; password: string }): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || '登录失败');
  }
  return json as AuthResponse;
}

/** 登出（仅清除本地 token） */
export function logout(): void {
  setStoredToken(null);
}

/** 获取当前用户信息（需要已登录） */
export async function fetchCurrentUser(): Promise<UserPublic> {
  const token = typeof window !== 'undefined' ? getStoredToken() : null;
  if (!token) throw new Error('未登录');
  const res = await fetch(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setStoredToken(null);
    throw new Error((json as { error?: string }).error || '获取用户信息失败');
  }
  return json as UserPublic;
}
