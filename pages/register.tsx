/**
 * 用户注册页面
 * 包含：用户名、邮箱、密码、显示名称（可选）
 * 成功后保存 token 并跳转到首页或用户信息页
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.register({
        username: username.trim(),
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined,
      });
      setAuth(res.token, res.user);
      router.push('/profile').catch(() => router.push('/'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>注册 - AI Ttest</title>
      </Head>
      <div className="paper-texture font-journal min-h-screen flex flex-col items-center justify-center p-4">
        <div className="prompt-note rounded-lg p-6 w-full max-w-md">
          <h1 className="text-2xl font-semibold text-[#3d3229] mb-2">创建账号</h1>
          <p className="text-sm text-[#6b5b4f] mb-6">填写以下信息完成注册</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="register-username" className="block text-sm font-medium text-[#3d3229] mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                id="register-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="3-32 位字母、数字或下划线"
                required
                maxLength={32}
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-[#3d3229] mb-1">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="your@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-[#3d3229] mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="至少 8 位，包含字母和数字"
                required
                minLength={8}
              />
            </div>
            <div>
              <label htmlFor="register-displayName" className="block text-sm font-medium text-[#3d3229] mb-1">
                显示名称（选填）
              </label>
              <input
                id="register-displayName"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="用于展示的昵称"
                maxLength={64}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#8b7355] text-white py-2 font-medium hover:bg-[#7a6349] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '注册中…' : '注册'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b5b4f]">
            已有账号？{' '}
            <Link href="/login" className="text-[#8b7355] font-medium hover:underline">
              去登录
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
