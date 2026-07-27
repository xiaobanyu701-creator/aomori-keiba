'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuthAndSync = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        const discordName = session.user.user_metadata?.full_name || session.user.user_metadata?.name;

        // 1. 自動ロール付与処理の呼び出し
        const providerToken = session.provider_token;
        if (providerToken) {
          try {
            await fetch('/api/assign-role', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ providerToken }),
            });
          } catch (e) {
            console.error('自動ロール付与エラー:', e);
          }
        }

        // 2. DBユーザー情報の同期
        if (discordName) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('discord_name', discordName)
            .single();

          if (!existingUser) {
            // 初回ログイン時にユーザー作成（初期資金100万G）
            const { data: newUser } = await supabase
              .from('users')
              .insert([{ discord_name: discordName, balance: 1000000, title: '新米馬主' }])
              .select('*')
              .single();
            setDbUser(newUser);
          } else {
            setDbUser(existingUser);
          }
        }
      } else {
        setUser(null);
        setDbUser(null);
      }
      setLoading(false);
    };

    initAuthAndSync();
  }, []);

  // 🎮 Discordログイン処理
  const handleDiscordSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // 🚪 ログアウト処理
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDbUser(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
        <p style={{ fontWeight: 'bold', color: '#1e3a8a' }}>🍏 読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', color: '#0f172a' }}>
      {/* 👑 ヘッダー */}
      <header style={{ backgroundColor: '#1e3a8a', padding: '14px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>🍏 青森県競馬 IPAT</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user && (
            <>
              <Link href="/owner" style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
                🏇 馬主ページ ↗
              </Link>
              <Link href="/admin" style={{ backgroundColor: '#ca8a04', color: '#fff', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
                👑 管理者 ↗
              </Link>
            </>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '800px', margin: '30px auto', padding: '0 16px' }}>
        {!user ? (
          /* 🔒 複アカ防止：Discordログイン必須画面 */
          <div style={{ backgroundColor: '#ffffff', padding: '40px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', textAlign: 'center' }}>
            <h2 style={{ color: '#1e3a8a', margin: '0 0 10px 0', fontSize: '22px', fontWeight: 'bold' }}>🍏 青森県競馬へようこそ！</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              公正なレース運用および複数アカウント（複アカ）防止のため、<br />
              <strong>Discord アカウントでの認証ログインが必須</strong>となっています。
            </p>

            <button
              onClick={handleDiscordSignIn}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '14px',
                backgroundColor: '#5865F2',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)',
              }}
            >
              🎮 Discord でログイン / 新規登録
            </button>
          </div>
        ) : (
          /* 🟢 ログイン完了画面（メインコンテンツ） */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 👤 ユーザー情報ステータスカード */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ログイン中のプレイヤー</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 {dbUser?.discord_name || user.user_metadata?.full_name}
                  {dbUser?.title && (
                    <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      🎖️ {dbUser.title}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>所持コイン</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#16a34a' }}>
                  {(dbUser?.balance || 0).toLocaleString()} <span style={{ fontSize: '14px' }}>G</span>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >
                ログアウト
              </button>
            </div>

            {/* 🏇 レース出走表・投票などメインエリア */}
            <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>🏁 本日の全12レース 開催中！</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                出走表の確認・即パット投票・パドック雑談チャットをご利用いただけます。
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}