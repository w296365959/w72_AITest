-- 聊天表：用于跨浏览器实时互动（Supabase Realtime）
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本
--
-- Realtime 还需配置 .env.local：
--   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon密钥
-- 在 Supabase 控制台 -> Project Settings -> API 中复制 "anon public" 密钥

create table if not exists public.chat (
  id uuid primary key default gen_random_uuid(),
  txt text not null,
  sender_name text,
  created_at timestamptz not null default now()
);

-- 允许匿名读写（根据需要可改为 RLS 策略）
alter table public.chat enable row level security;

create policy "Allow all for chat"
  on public.chat
  for all
  using (true)
  with check (true);

-- 若表已存在，可单独执行以添加发送人字段：
-- alter table public.chat add column if not exists sender_name text;

-- 启用 Realtime：chat 表变更时推送
alter publication supabase_realtime add table public.chat;
