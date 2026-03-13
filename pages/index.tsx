import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import type { Task } from '@/types/task';
import * as api from '@/lib/api';
import { supabaseClient } from '@/lib/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

type TabId = 'todo' | 'prompt' | 'chat';

type TaskNode = Task & { children: TaskNode[] };

function buildTree(tasks: Task[]): TaskNode[] {
  const byId = new Map<string, TaskNode>();
  tasks.forEach((t) => byId.set(t.id, { ...t, children: [] }));
  const roots: TaskNode[] = [];
  tasks.forEach((t) => {
    const node = byId.get(t.id)!;
    if (!t.parent_id) {
      roots.push(node);
    } else {
      const parent = byId.get(t.parent_id);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  });
  roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  byId.forEach((n) => n.children.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  return roots;
}

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('chat');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [breakdownIds, setBreakdownIds] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchTasks();
      setTasks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleAdd = async () => {
    const title = input.trim();
    if (!title) return;
    setAdding(true);
    setError(null);
    try {
      const created = await api.createTask({ title });
      setTasks((prev) => [created, ...prev]);
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '添加失败');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (task: Task) => {
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const updated = await api.updateTask(task.id, { status: next });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    }
  };

  const handleBreakdown = async (task: Task) => {
    setBreakdownIds((prev) => new Set(prev).add(task.id));
    setError(null);
    try {
      const { subtasks } = await api.breakdownTask(task.id);
      setTasks((prev) => [...prev, ...subtasks]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '拆解失败');
    } finally {
      setBreakdownIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

  const handleDelete = async (task: Task) => {
    try {
      await api.deleteTask(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const tree = buildTree(tasks);

  return (
    <div className="paper-texture min-h-screen font-journal">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 登录/注册入口 */}
        <div className="flex justify-end gap-3 mb-4 text-sm">
          {user ? (
            <Link href="/profile" className="text-[#8b7355] hover:underline">
              {user.displayName || user.username}
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-[#8b7355] hover:underline">登录</Link>
              <Link href="/register" className="text-[#8b7355] hover:underline">注册</Link>
            </>
          )}
        </div>
        {/* Tab 切换 */}
        <div className="flex gap-1 mb-8 p-1 rounded-lg bg-amber-100/60 border border-amber-800/20">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 px-4 rounded-md font-journal text-lg transition-colors ${
              activeTab === 'chat'
                ? 'bg-amber-200/90 text-amber-950 shadow-sm'
                : 'text-amber-800/80 hover:bg-amber-150/60'
            }`}
          >
            聊天互动
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('todo')}
            className={`flex-1 py-2 px-4 rounded-md font-journal text-lg transition-colors ${
              activeTab === 'todo'
                ? 'bg-amber-200/90 text-amber-950 shadow-sm'
                : 'text-amber-800/80 hover:bg-amber-150/60'
            }`}
          >
            待办手账
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prompt')}
            className={`flex-1 py-2 px-4 rounded-md font-journal text-lg transition-colors ${
              activeTab === 'prompt'
                ? 'bg-amber-200/90 text-amber-950 shadow-sm'
                : 'text-amber-800/80 hover:bg-amber-150/60'
            }`}
          >
            提示词生成
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-md bg-red-100/90 border border-red-300 text-red-800 text-sm font-journal">
            {error}
          </div>
        )}

        {activeTab === 'prompt' ? (
          <PromptGenPanel onError={setError} />
        ) : activeTab === 'chat' ? (
          <ChatPanel onError={setError} />
        ) : (
          <>
        <h1 className="text-4xl font-bold text-amber-900/90 mb-8 font-journal tracking-tight">
          待办手账
        </h1>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="写下一件要做的事..."
            className="flex-1 px-4 py-2.5 rounded-md border-2 border-amber-800/30 bg-amber-50/80 text-amber-950 placeholder-amber-600/60 font-journal text-lg focus:outline-none focus:border-amber-700/50 focus:ring-1 focus:ring-amber-700/30"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="px-5 py-2.5 rounded-md border-2 border-amber-800/40 bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200/80 disabled:opacity-50 font-journal text-lg"
          >
            {adding ? '添加中…' : '添加'}
          </button>
        </div>

        {loading ? (
          <p className="text-amber-800/70 font-journal text-lg">加载中…</p>
        ) : tree.length === 0 ? (
          <p className="text-amber-800/60 font-journal text-lg">还没有任务，写一条吧～</p>
        ) : (
          <ul className="space-y-1">
            {tree.map((node) => (
              <TaskItem
                key={node.id}
                node={node}
                onToggle={handleToggle}
                onBreakdown={handleBreakdown}
                onDelete={handleDelete}
                breakdownIds={breakdownIds}
              />
            ))}
          </ul>
        )}
          </>
        )}
      </div>
    </div>
  );
}

const PROMPT_PLACEHOLDER = '例如：帮我写一个 Python 函数，计算斐波那契数列的第 n 项';

function PromptGenPanel({ onError }: { onError: (msg: string | null) => void }) {
  const [userRequest, setUserRequest] = useState('');
  const [optimized, setOptimized] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOptimize = async () => {
    const trimmed = userRequest.trim();
    if (!trimmed) return;
    setLoading(true);
    onError(null);
    setOptimized('');
    try {
      const { optimized: result } = await api.optimizePrompt(trimmed);
      setOptimized(result);
    } catch (e) {
      onError(e instanceof Error ? e.message : '优化失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-amber-900/90 font-journal tracking-tight">
        提示词生成
      </h1>
      <p className="text-amber-800/70 font-journal text-lg">
        写下你的模糊需求，AI 会帮你生成结构化的高质量 Prompt。
      </p>

      <div className="relative">
        <div className="absolute -left-1 top-2 w-1 h-8 bg-amber-400/50 rounded" />
        <textarea
          value={userRequest}
          onChange={(e) => setUserRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !userRequest.trim()) {
              e.preventDefault();
              setUserRequest(PROMPT_PLACEHOLDER);
            }
          }}
          placeholder={PROMPT_PLACEHOLDER}
          rows={4}
          className="w-full px-4 py-3 rounded-md border-2 border-amber-800/30 bg-amber-50/80 text-amber-950 placeholder-amber-600/60 font-journal text-lg focus:outline-none focus:border-amber-700/50 focus:ring-1 focus:ring-amber-700/30 resize-y"
          disabled={loading}
        />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleOptimize}
          disabled={loading || !userRequest.trim()}
          className="px-6 py-2.5 rounded-md border-2 border-amber-800/40 bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200/80 disabled:opacity-50 font-journal text-lg"
        >
          {loading ? '生成中…' : '优化提示词'}
        </button>
        <button
          type="button"
          onClick={() => {
            setUserRequest('');
            setOptimized('');
          }}
          className="px-6 py-2.5 rounded-md border-2 border-amber-800/30 bg-amber-50 text-amber-800 hover:bg-amber-100/80 font-journal text-lg"
        >
          清空提示词
        </button>
      </div>

      {optimized && (
        <div className="relative mt-6 p-5 rounded-lg prompt-note border border-amber-800/20">
          <span className="tape-decoration" style={{ top: '-6px', right: '20%' }} aria-hidden />
          <div className="absolute -left-1 top-6 w-1 h-14 bg-amber-500/50 rounded" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-amber-700/70 font-journal text-sm">生成的 Prompt</span>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(optimized);
              }}
              className="px-2 py-1 rounded text-sm border border-amber-700/40 bg-amber-50 text-amber-800 hover:bg-amber-100 font-journal"
            >
              复制
            </button>
          </div>
          <pre className="text-amber-950 font-journal text-base whitespace-pre-wrap break-words overflow-x-auto max-h-96 overflow-y-auto leading-relaxed">
            {optimized}
          </pre>
        </div>
      )}
    </div>
  );
}

const CHAT_GUEST_ID_KEY = 'chat_guest_id';

function getOrCreateGuestLabel(): string {
  if (typeof window === 'undefined') return '访客';
  let id = localStorage.getItem(CHAT_GUEST_ID_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 8);
    localStorage.setItem(CHAT_GUEST_ID_KEY, id);
  }
  return `访客-${id}`;
}

function ChatPanel({ onError }: { onError: (msg: string | null) => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<api.Chat[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const guestLabel = useRef(getOrCreateGuestLabel()).current;

  const loadChats = useCallback(async () => {
    try {
      const data = await api.fetchChats();
      setMessages(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : '加载聊天失败');
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Supabase Realtime：订阅 chat 表 INSERT，有新消息时直接追加
  useEffect(() => {
    const client = supabaseClient;
    if (!client) return;
    const channel = client
      .channel('chat-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat' },
        (payload: { new: api.Chat }) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, []);

  // 消息列表更新后滚动到底部（含初次加载、新消息），保证最新消息在可见区域
  useEffect(() => {
    if (messages.length === 0) return;
    const el = scrollContainerRef.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [messages]);

  const handleSend = async () => {
    const txt = input.trim();
    if (!txt || sending) return;
    setSending(true);
    onError(null);
    try {
      await api.sendChat(txt, user ? undefined : { senderName: guestLabel });
      setInput('');
      // 发送后由 Realtime 推送更新，无需再 loadChats；若 Realtime 未配置则手动拉一次
      if (!supabaseClient) await loadChats();
    } catch (e) {
      onError(e instanceof Error ? e.message : '发送失败');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold text-amber-900/90 font-journal tracking-tight">
        聊天互动
      </h1>
      <p className="text-amber-800/70 font-journal text-lg">
        在此输入内容并发送，另一浏览器会同步显示。
      </p>

      <div className="rounded-lg border-2 border-amber-800/30 bg-amber-50/80 overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="h-64 overflow-y-auto px-4 py-3 space-y-2 font-journal text-amber-950"
          style={{ minHeight: '16rem' }}
        >
          {loading ? (
            <p className="text-amber-700/70">加载中…</p>
          ) : messages.length === 0 ? (
            <p className="text-amber-700/60">暂无消息，发送一条试试～</p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="py-1.5 px-3 rounded-md bg-amber-100/60 border border-amber-800/20 text-base break-words"
              >
                <span className="text-sm text-amber-700/80 font-journal">
                  {m.sender_name ?? '匿名'}
                </span>
                <p className="mt-0.5 text-amber-950">{m.txt}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 p-3 border-t border-amber-800/20">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2.5 rounded-md border-2 border-amber-800/30 bg-white text-amber-950 placeholder-amber-600/60 font-journal focus:outline-none focus:border-amber-700/50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-5 py-2.5 rounded-md border-2 border-amber-800/40 bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200/80 disabled:opacity-50 font-journal"
          >
            {sending ? '发送中…' : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskItem({
  node,
  depth = 0,
  onToggle,
  onBreakdown,
  onDelete,
  breakdownIds,
}: {
  node: TaskNode;
  depth?: number;
  onToggle: (t: Task) => void;
  onBreakdown: (t: Task) => void;
  onDelete: (t: Task) => void;
  breakdownIds: Set<string>;
}) {
  const isCompleted = node.status === 'completed';
  const breakdownLoading = breakdownIds.has(node.id);

  return (
    <li className="list-none">
      <div
        className="group relative flex items-center gap-2 py-2 px-3 rounded-md hover:bg-amber-100/40 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {isCompleted && <span className="pin-decoration" aria-hidden />}
        <button
          type="button"
          onClick={() => onToggle(node)}
          className={`checkbox-hand ${isCompleted ? 'checked' : ''}`}
          aria-label={isCompleted ? '标记未完成' : '标记完成'}
        />
        <span
          className={`flex-1 font-journal text-lg text-amber-950 min-w-0 ${
            isCompleted ? 'line-through text-amber-700/80' : ''
          }`}
        >
          {node.title}
        </span>
        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onBreakdown(node)}
            disabled={breakdownLoading}
            className="px-2 py-1 rounded text-sm border border-amber-700/40 bg-amber-50 text-amber-800 hover:bg-amber-100 font-journal disabled:opacity-50"
          >
            {breakdownLoading ? '拆解中…' : '拆解'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="px-2 py-1 rounded text-sm border border-red-300/60 bg-red-50/80 text-red-700 hover:bg-red-100 font-journal"
          >
            删除
          </button>
        </div>
        {isCompleted && <span className="tape-decoration" aria-hidden />}
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <TaskItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onToggle={onToggle}
              onBreakdown={onBreakdown}
              onDelete={onDelete}
              breakdownIds={breakdownIds}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
