/**
 * 用户登录页面
 * 支持用户名或邮箱 + 密码登录
 * 成功后保存 token 并跳转
 */

import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import * as api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.login({
        usernameOrEmail: usernameOrEmail.trim(),
        password,
      });
      setAuth(res.token, res.user);
      router.push('/profile').catch(() => router.push('/'));
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>登录 - AI Ttest</title>
      </Head>
      <div className="paper-texture font-journal min-h-screen flex flex-col items-center justify-center p-4">
        <div className="prompt-note rounded-lg p-6 w-full max-w-md">
          <h1 className="text-2xl font-semibold text-[#3d3229] mb-2">登录</h1>
          <p className="text-sm text-[#6b5b4f] mb-6">使用用户名或邮箱登录</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">
                {error}
              </div>
            )}
            <div>
              <label htmlFor="login-identity" className="block text-sm font-medium text-[#3d3229] mb-1">
                用户名或邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                id="login-identity"
                type="text"
                autoComplete="username"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="用户名或邮箱"
                required
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[#3d3229] mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#8b7355]/30 bg-white px-3 py-2 text-[#3d3229] focus:outline-none focus:ring-2 focus:ring-[#8b7355]/50"
                placeholder="密码"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-[#8b7355] text-white py-2 font-medium hover:bg-[#7a6349] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? '登录中…' : '登录'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#6b5b4f]">
            还没有账号？{' '}
            <Link href="/register" className="text-[#8b7355] font-medium hover:underline">
              去注册
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
