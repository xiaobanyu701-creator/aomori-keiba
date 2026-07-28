import { supabase } from './supabase';

export interface User {
  id: string;
  discord_name: string;
  pin_code: string;
  balance: number;
  ip_address?: string;
  session_token?: string;
  user_agent?: string;
  title?: string;
}

// 🔑 セッショントークン生成 ＆ User-Agent (端末情報) を保存
export async function saveSessionToken(user: User): Promise<string> {
  const token = `token_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  
  // ブラウザの端末情報（OS/ブラウザ種別）を取得
  const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';

  await supabase.from('users').update({ 
    session_token: token,
    user_agent: userAgent
  }).eq('id', user.id);

  if (typeof window !== 'undefined') {
    localStorage.setItem('app_session_token', token);
    localStorage.setItem('app_logged_user_id', user.id);
  }

  return token;
}

// 🔓 自動ログイン判定（トークン照合）
export async function checkAutoLogin(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  const savedToken = localStorage.getItem('app_session_token');
  const savedUserId = localStorage.getItem('app_logged_user_id');

  if (!savedToken || !savedUserId) return null;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', savedUserId)
      .single();

    if (user && user.session_token === savedToken) {
      return user;
    }
  } catch (e) {
    console.error('自動ログインエラー:', e);
  }

  return null;
}

// 🚪 ログアウト（トークン消去）
export async function logoutUser(userId: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('app_session_token');
    localStorage.removeItem('app_logged_user_id');
  }
  await supabase.from('users').update({ session_token: null }).eq('id', userId);
}

// 📱 簡易User-Agent整形表示用ヘルパー
export function parseUserAgent(ua?: string): string {
  if (!ua) return '不明';
  if (ua.includes('iPhone')) return '📱 iPhone (Safari)';
  if (ua.includes('iPad')) return '📱 iPad';
  if (ua.includes('Android')) return '📱 Android';
  if (ua.includes('Windows')) return '💻 Windows PC';
  if (ua.includes('Macintosh')) return '💻 Mac';
  return '🌐 Webブラウザ';
}