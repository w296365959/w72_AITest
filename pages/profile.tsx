/**
 * 用户信息展示页面
 * 需登录后访问；展示用户名、邮箱、显示名称、注册时间等
 */

import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login').catch(() => {});
    }
  }, [loading, user, router]);

  const handleLogout = () => {
    logout();
    router.push('/').catch(() => {});
  };

  if (loading) {
    return (
      <div className="paper-texture font-journal min-h-screen flex items-center justify-center">
        <p className="text-[#6b5b4f]">加载中…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>个人中心 - AI Ttest</title>
      </Head>
      <div className="paper-texture font-journal min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <nav className="flex items-center justify-between mb-8">
            <Link href="/" className="text-[#8b7355] hover:underline">
              ← 返回首页
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-700 hover:underline"
            >
              退出登录
            </button>
          </nav>

          <div className="prompt-note rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-[#3d3229] mb-6">个人中心</h1>

            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[#6b5b4f]">用户名</dt>
                <dd className="mt-1 text-[#3d3229] font-medium">{user.username}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#6b5b4f]">邮箱</dt>
                <dd className="mt-1 text-[#3d3229]">{user.email}</dd>
              </div>
              {user.displayName && (
                <div>
                  <dt className="text-sm text-[#6b5b4f]">显示名称</dt>
                  <dd className="mt-1 text-[#3d3229]">{user.displayName}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-[#6b5b4f]">注册时间</dt>
                <dd className="mt-1 text-[#3d3229]">
                  {new Date(user.createdAt).toLocaleString('zh-CN')}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#6b5b4f]">最后更新</dt>
                <dd className="mt-1 text-[#3d3229]">
                  {new Date(user.updatedAt).toLocaleString('zh-CN')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
