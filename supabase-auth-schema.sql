-- 用户表：用于自定义登录注册（bcrypt + JWT，与 Supabase Auth 独立）
-- 在 Supabase Dashboard -> SQL Editor 中执行此脚本
--
-- 依赖环境变量：JWT_SECRET（用于 API 签发 JWT）

create table if not exists public.auth_users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  email text not null,
  password_hash text not null,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_users_username_key unique (username),
  constraint auth_users_email_key unique (email)
);

-- 可选：启用 RLS；使用 service_role 的 API 会绕过 RLS
alter table public.auth_users enable row level security;

-- 仅允许通过 service role 访问（API 使用 SUPABASE_SERVICE_ROLE_KEY）
create policy "Service role only for auth_users"
  on public.auth_users
  for all
  using (false)
  with check (false);

comment on table public.auth_users is '自定义登录注册用户表（bcrypt 密码 + JWT）';
