# 用户登录注册功能说明

## 功能概览

- **注册**：用户名、邮箱、密码（bcrypt 加密存储）、可选显示名称
- **登录**：支持用户名或邮箱 + 密码，返回 JWT
- **获取当前用户**：携带 JWT 访问 `/api/auth/me` 获取用户信息
- **前端页面**：注册页 `/register`、登录页 `/login`、个人中心 `/profile`
- **数据库**：使用 **Supabase（PostgreSQL）**，表名为 `auth_users`

## 环境变量

在 `.env.local` 中配置（可参考项目根目录 `env.example`）：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL（必填） |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role 密钥（必填，API 用） |
| `JWT_SECRET` | JWT 签名密钥，生产环境务必使用强随机字符串（必填） |

## 建表

在 Supabase Dashboard → SQL Editor 中执行项目根目录的 **`supabase-auth-schema.sql`**，会创建表 `public.auth_users`（含 `username`、`email` 唯一约束）。

## API 接口（RESTful）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册，Body: `{ username, email, password, displayName? }` |
| POST | `/api/auth/login` | 登录，Body: `{ usernameOrEmail, password }` |
| GET | `/api/auth/me` | 获取当前用户，Header: `Authorization: Bearer <token>` |

- 注册/登录成功返回：`{ user, token, expiresIn }`
- 错误时返回：`{ error: string, details?: string }`，HTTP 状态码 4xx/5xx

## 安全措施

- **密码**：使用 bcrypt（盐轮数 12）加密存储，不返回给前端
- **JWT**：HS256 签名，默认过期时间 7 天
- **输入**：用户名/邮箱/密码格式与长度校验，字符串清理（去控制字符、截断长度），降低 XSS/注入风险
- **数据库**：Supabase 表 `auth_users` 对 `username`、`email` 建唯一约束，防止重复注册
- **敏感接口**：`/api/auth/me` 需在请求头携带有效 JWT，否则返回 401
- **访问方式**：API 使用 `SUPABASE_SERVICE_ROLE_KEY` 访问表，绕过 RLS，仅服务端可操作

## 前端使用

- 使用 `AuthProvider` 包裹应用（已在 `_app.tsx` 中配置）
- 在组件中通过 `useAuth()` 获取 `user`、`loading`、`setAuth`、`logout`、`refreshUser`
- Token 存储在 `localStorage`（键：`auth_token`），请求 `/api/auth/me` 时自动带 `Authorization: Bearer <token>`

## 校验规则

- **用户名**：3–32 位，仅字母、数字、下划线
- **邮箱**：常见邮箱格式
- **密码**：8–128 位，须包含字母和数字
