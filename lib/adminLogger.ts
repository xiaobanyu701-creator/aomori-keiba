import { supabase } from './supabase';

// 📝 管理者操作ログをSupabaseに自動記録する関数
export async function logAdminAction(actionType: string, details: string, adminIp: string = '') {
  try {
    await supabase.from('admin_logs').insert([
      {
        admin_ip: adminIp || '不明IP',
        action_type: actionType,
        details: details,
      },
    ]);
  } catch (e) {
    console.error('管理者ログの書き込みに失敗しました:', e);
  }
}