/**
 * 认证上下文：提供当前用户状态与登录/登出方法
 * 在 _app 中包裹后，子组件可通过 useAuth 获取用户信息
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { UserPublic } from '@/types/user';
import * as api from '@/lib/api';

interface AuthContextValue {
  /** 当前用户，未登录为 null */
  user: UserPublic | null;
  /** 是否正在加载用户（如首次拉取 /api/auth/me） */
  loading: boolean;
  /** 登录成功后调用，保存 token 并更新 user */
  setAuth: (token: string, user: UserPublic) => void;
  /** 登出：清除 token 与 user */
  logout: () => void;
  /** 重新拉取当前用户（token 有效时） */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = api.getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const u = await api.fetchCurrentUser();
      setUser(u);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const setAuth = useCallback((token: string, u: UserPublic) => {
    api.setStoredToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    api.logout();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    setAuth,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用');
  }
  return ctx;
}
