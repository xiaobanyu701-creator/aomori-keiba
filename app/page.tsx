'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [dbUser, setDbUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // レース・馬・馬券データ
  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [userBets, setUserBets] = useState<any[]>([]);

  // 投票用ステート
  const [betType, setBetType] = useState<string>('単勝');
  const [selectedHorse1, setSelectedHorse1] = useState<string>('');
  const [selectedHorse2, setSelectedHorse2] = useState<string>('');
  const [betAmount, setBetAmount] = useState<number>(1000);

  // パドック雑談チャット
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');

  // 1. ログイン状態の同期 ＆ 自動ロール付与API呼び出し
  useEffect(() => {
    const initAuthAndSync = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setUser(session.user);
        const discordName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.user_metadata?.preferred_username;

        // 🤖 自動ロール付与処理
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

        // DBユーザー同期
        if (discordName) {
          const { data: existingUser } = await supabase
            .from('users')
            .select('*')
            .eq('discord_name', discordName)
            .single();

          if (!existingUser) {
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

  // データ取得
  useEffect(() => {
    if (user) {
      fetchRaces();
      fetchChat();
    }
  }, [user]);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find(r => r.race_number === selectedRaceNo);
      if (race) {
        setCurrentRace(race);
        fetchHorses(race.id);
      } else {
        setCurrentRace(null);
        setHorses([]);
      }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => {
    if (currentRace && dbUser) {
      fetchUserBets(currentRace.id, dbUser.id);
    }
  }, [currentRace, dbUser]);

  const fetchRaces = async () => {
    const { data } = await supabase.from('races').select('*');
    if (data) setRaces([...data].sort((a, b) => (a.race_number || 0) - (b.race_number || 0)));
  };

  const fetchHorses = async (raceId: string) => {
    const { data } = await supabase.from('horses').select('*').eq('race_id', raceId);
    if (data) {
      const sorted = [...data].sort((a, b) => (a.horse_number || 0) - (b.horse_number || 0));
      setHorses(sorted);
      if (sorted.length > 0) setSelectedHorse1(String(sorted[0].horse_number));
      if (sorted.length > 1) setSelectedHorse2(String(sorted[1].horse_number));
    }
  };

  const fetchUserBets = async (raceId: string, userId: string) => {
    const { data } = await supabase.from('bets').select('*').eq('race_id', raceId).eq('user_id', userId);
    if (data) setUserBets(data);
  };

  const fetchChat = async () => {
    const { data } = await supabase.from('inquiries').select('*').eq('title', '【パット雑談チャット】').order('created_at', { ascending: false }).limit(20);
    if (data) setChatMessages(data.reverse());
  };

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

  // 🗳️ 馬券購入処理
  const handlePlaceBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace || !dbUser) return;
    if (currentRace.status === 'closed' || currentRace.status === 'finished') {
      return alert('⚠️ このレースは投票受付を終了しています。');
    }

    if (!selectedHorse1) return alert('馬を選択してください');
    if (['馬連', '馬単'].includes(betType) && selectedHorse1 === selectedHorse2) {
      return alert('2頭丹念な馬を選択してください');
    }

    if (betAmount <= 0) return alert('正しい購入金額を入力してください');
    if ((dbUser.balance || 0) < betAmount) {
      return alert('所持コインが不足しています！');
    }

    let selectionStr = selectedHorse1;
    if (['馬連', '馬単'].includes(betType)) {
      selectionStr = `${selectedHorse1}-${selectedHorse2}`;
    }

    // 1. 馬券データを保存
    const { error: betErr } = await supabase.from('bets').insert([{
      race_id: currentRace.id,
      user_id: dbUser.id,
      bet_type: betType,
      selection: selectionStr,
      amount: betAmount,
      is_claimed: false,
    }]);

    if (betErr) return alert('馬券の購入に失敗しました');

    // 2. 残高引き落とし
    const newBal = (dbUser.balance || 0) - betAmount;
    await supabase.from('users').update({ balance: newBal }).eq('id', dbUser.id);

    setDbUser({ ...dbUser, balance: newBal });
    alert(`🎉 【${selectedRaceNo}R】 ${betType} (${selectionStr}) を ${betAmount.toLocaleString()} G で発注しました！`);
    fetchUserBets(currentRace.id, dbUser.id);
  };

  // 💬 チャット送信処理
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !dbUser) return;

    await supabase.from('inquiries').insert([{
      title: '【パット雑談チャット】',
      content: chatInput,
      discord_name: dbUser.discord_name,
    }]);

    setChatInput('');
    fetchChat();
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
      <header style={{ backgroundColor: '#1e3a8a', padding: '12px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>🍏 青森県競馬 IPAT</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {user && (
            <>
              <Link href="/owner" style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>
                🏇 馬主 ↗
              </Link>
              <Link href="/admin" style={{ backgroundColor: '#ca8a04', color: '#fff', padding: '6px 10px', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>
                👑 管理者 ↗
              </Link>
            </>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '20px auto', padding: '0 12px' }}>
        {!user ? (
          /* 🔒 複アカ防止：Discordログイン必須画面 */
          <div style={{ backgroundColor: '#ffffff', padding: '40px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: '420px', margin: '40px auto' }}>
            <h2 style={{ color: '#1e3a8a', margin: '0 0 10px 0', fontSize: '20px', fontWeight: 'bold' }}>🍏 青森県競馬へようこそ！</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              公正なレース運用および複数アカウント（複アカ）防止のため、<br />
              <strong>Discord アカウントでの認証ログインが必須</strong>となっています。
            </p>

            <button
              onClick={handleDiscordSignIn}
              style={{
                width: '100%',
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
                gap: '8px',
                boxShadow: '0 4px 12px rgba(88, 101, 242, 0.3)',
              }}
            >
              🎮 Discord でログイン / 新規登録
            </button>
          </div>
        ) : (
          /* 🟢 IPATメイン画面 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 👤 ユーザー情報 ＆ 残高カード */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>ログイン中の馬主・プレイヤー</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 {dbUser?.discord_name || user.user_metadata?.full_name}
                  {dbUser?.title && (
                    <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                      🎖️ {dbUser.title}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>所持コイン</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a' }}>
                    {(dbUser?.balance || 0).toLocaleString()} <span style={{ fontSize: '12px' }}>G</span>
                  </div>
                </div>

                <button onClick={handleSignOut} style={{ padding: '6px 10px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                  ログアウト
                </button>
              </div>
            </div>

            {/* 🏁 レース選択タブ (1R〜12R) */}
            <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>レースを選択:</div>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(no => {
                  const r = races.find(race => race.race_number === no);
                  const isClosed = r?.status === 'closed' || r?.status === 'finished';
                  return (
                    <button
                      key={no}
                      onClick={() => setSelectedRaceNo(no)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        fontSize: '12px',
                        backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc',
                        color: selectedRaceNo === no ? '#ffffff' : '#475569',
                      }}
                    >
                      {no}R {isClosed ? '🔒' : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 📋 対象レースの出走表 ＆ オッズ */}
            {currentRace && (
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px' }}>
                      【{selectedRaceNo}R】 {currentRace.grade || '一般'}
                    </span>
                    <h2 style={{ display: 'inline', margin: '0 0 0 8px', fontSize: '16px', color: '#1e3a8a', fontWeight: 'bold' }}>
                      {currentRace.title || '特別競走'}
                    </h2>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {currentRace.distance_m || 1600}m | {currentRace.track_condition || '良'} | {currentRace.weather || '晴'}
                  </div>
                </div>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '450px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>印</th>
                        <th>馬番</th>
                        <th>馬名</th>
                        <th>性齢</th>
                        <th>騎手</th>
                      </tr>
                    </thead>
                    <tbody>
                      {horses.length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>出走馬が登録されていません</td></tr>
                      ) : (
                        horses.map(h => (
                          <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold', color: '#dc2626' }}>{h.mark || '・'}</td>
                            <td style={{ fontWeight: 'bold' }}>{h.horse_number}</td>
                            <td style={{ fontWeight: 'bold', color: '#16a34a' }}>🐎 {h.name}</td>
                            <td style={{ color: '#64748b' }}>牡{h.age || 3}</td>
                            <td style={{ color: '#2563eb', fontWeight: 'bold' }}>🏇 {h.jockey || '未定'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 🗳️ 即パット馬券購入フォーム */}
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #2563eb' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: 'bold' }}>
                🗳️ 即パット 馬券購入【{selectedRaceNo}R】
              </h3>

              {currentRace?.status === 'closed' || currentRace?.status === 'finished' ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '10px', fontWeight: 'bold' }}>
                  🔒 このレースの投票受付は締め切られました
                </div>
              ) : (
                <form onSubmit={handlePlaceBet} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={labelStyle}>式別</label>
                      <select value={betType} onChange={e => setBetType(e.target.value)} style={inputStyle}>
                        <option value="単勝">単勝</option>
                        <option value="複勝">複勝</option>
                        <option value="馬連">馬連</option>
                        <option value="馬単">馬単</option>
                      </select>
                    </div>

                    <div>
                      <label style={labelStyle}>{['馬連', '馬単'].includes(betType) ? '1頭目 / 軸' : '選択馬'}</label>
                      <select value={selectedHorse1} onChange={e => setSelectedHorse1(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }}>
                        {horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}
                      </select>
                    </div>

                    {['馬連', '馬単'].includes(betType) && (
                      <div>
                        <label style={labelStyle}>2頭目 / 相手</label>
                        <select value={selectedHorse2} onChange={e => setSelectedHorse2(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold' }}>
                          {horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>購入金額 (G)</label>
                    <input type="number" step="1000" min="100" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} required />
                  </div>

                  <button type="submit" style={{ padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                    発注する 🗳️
                  </button>
                </form>
              )}
            </div>

            {/* 📝 購入履歴 */}
            {userBets.length > 0 && (
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '14px', fontWeight: 'bold' }}>📝 【{selectedRaceNo}R】 購入済み馬券</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {userBets.map(b => (
                    <div key={b.id} style={{ backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '13px' }}>[{b.bet_type}] {b.selection}</span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>購入額: {Number(b.amount).toLocaleString()} G</div>
                      </div>
                      <div>
                        {b.payout_amount > 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '13px' }}>🎉 的中 +{b.payout_amount.toLocaleString()} G</span>
                        ) : b.payout_amount === 0 && currentRace?.status === 'finished' ? (
                          <span style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '12px' }}>不的中</span>
                        ) : (
                          <span style={{ color: '#ca8a04', fontWeight: 'bold', fontSize: '12px' }}>判定待ち</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 💬 パドック雑談チャット */}
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '15px', fontWeight: 'bold' }}>💬 パドック雑談チャット</h3>
              <div style={{ backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', border: '1px solid #cbd5e1' }}>
                {chatMessages.length === 0 ? <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>メッセージはありません</div> : (
                  chatMessages.map(m => (
                    <div key={m.id} style={{ fontSize: '12px' }}>
                      <strong style={{ color: '#1e3a8a' }}>{m.discord_name}: </strong>
                      <span style={{ color: '#334155' }}>{m.content}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '6px' }}>
                <input type="text" placeholder="パドックの感想や予想をつぶやく..." value={chatInput} onChange={e => setChatInput(e.target.value)} style={inputStyle} />
                <button type="submit" style={{ backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}>送信</button>
              </form>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px' };