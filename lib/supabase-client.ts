/**
 * 浏览器端 Supabase 客户端，用于 Realtime 订阅。
 * 需配置 NEXT_PUBLIC_SUPABASE_ANON_KEY（Supabase 控制台 -> Project Settings -> API -> anon public）
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!url || !anonKey) {
  console.warn(
    'Supabase Realtime 需要 NEXT_PUBLIC_SUPABASE_ANON_KEY，请在 .env.local 中配置'
  );
}

export const supabaseClient =
  url && anonKey ? createClient(url, anonKey) : null;
