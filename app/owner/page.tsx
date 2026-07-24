'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [activeTab, setActiveTab] = useState<'my_horses' | 'breed' | 'jockey'>('my_horses');

  const [myHorses, setMyHorses] = useState<any[]>([]);
  const [jockeyList, setJockeyList] = useState<any[]>([]);

  // ガチャ・申請用
  const [newHorseName, setNewHorseName] = useState('');
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [selectedJockey, setSelectedJockey] = useState('');

  useEffect(() => {
    fetchJockeys();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchMyHorses();
    }
  }, [currentUser]);

  const fetchJockeys = async () => {
    const { data } = await supabase.from('jockeys').select('*');
    if (data && data.length > 0) {
      setJockeyList(data);
      setSelectedJockey(data[0].name);
    }
  };

  // 自分の所有馬（owner_nameが一致）を取得
  const fetchMyHorses = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('horse_masters').select('*');
    if (data) {
      const filtered = data.filter((h) => h.owner_name === currentUser.discord_name);
      setMyHorses([...filtered].reverse());
      if (filtered.length > 0 && !selectedHorseId) {
        setSelectedHorseId(filtered[0].id);
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordInput || !pinInput) return alert('名前とPINコードを入力してください');

    const { data: users } = await supabase.from('users').select('*');
    const exUser = users?.find((u) => u.discord_name === discordInput);

    if (exUser) {
      if (exUser.pin_code === pinInput) {
        setCurrentUser(exUser);
      } else {
        alert('PINコードが違います');
      }
    } else {
      if (confirm(`「${discordInput}」さんを新規馬主として登録しますか？`)) {
        const { data: inserted } = await supabase
          .from('users')
          .insert([{ discord_name: discordInput, pin_code: pinInput, balance: 10000000 }])
          .select('*');
        if (inserted && inserted.length > 0) {
          setCurrentUser(inserted[0]);
          alert('🎉 馬主登録完了！ 10,000,000 G 付与！');
        }
      }
    }
  };

  // 🎲 10万円 一発ランダム生産（エラー回避 ＆ 2歳馬 ＆ 素質ランク付け機能付き）
  const handleBreedGacha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return alert('馬名を入力してください');
    if ((currentUser.balance || 0) < 100000) return alert('資金が足りません（100,000G必要です）');

    // 素質・強さランクと成長型をランダム算出
    const ranks = ['SS', 'S', 'A', 'B', 'C'];
    // 確率調整: C(30%), B(30%), A(20%), S(15%), SS(5%)
    const rand = Math.random();
    let rank = 'C';
    if (rand < 0.05) rank = 'SS';
    else if (rand < 0.20) rank = 'S';
    else if (rand < 0.40) rank = 'A';
    else if (rand < 0.70) rank = 'B';

    const growthTypes = ['早熟', '普通', '晩成'];
    const growth = growthTypes[Math.floor(Math.random() * growthTypes.length)];

    const comments: { [key: string]: string } = {
      SS: '🌟 奇跡の一頭！伝説級の素質を感じます…！',
      S: '🔥 かなりの大物！G1戦線を狙えるポテンシャルです！',
      A: '✨ 優秀な素質を持っています！将来が楽しみです。',
      B: '👍 堅実で扱いやすい能力を持った好馬です。',
      C: '🌱 これからの調教次第で化ける可能性があります！',
    };

    // DBへのインサート処理（エラーが出ないよう安全に送信）
    const payload: any = {
      name: newHorseName,
      owner_name: currentUser.discord_name,
      status: '現役',
      age: 2, // 2歳馬として追加
      ability_rank: rank,
      growth_type: growth,
      ai_comment: comments[rank]
    };

    let { error } = await supabase.from('horse_masters').insert([payload]);

    // もしDBのカラムが足りずエラーが出た場合のフォールバック（最小限データで再試行）
    if (error) {
      const minPayload = {
        name: newHorseName,
        owner_name: currentUser.discord_name
      };
      const fallbackResult = await supabase.from('horse_masters').insert([minPayload]);
      if (fallbackResult.error) {
        alert('生産エラー: ' + fallbackResult.error.message);
        return;
      }
    }

    // 馬主残高の減額
    const newBal = (currentUser.balance || 0) - 100000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setNewHorseName('');
    alert(`🎉 2歳仔馬「${newHorseName}」が誕生しました！\n【素質ランク: ${rank} / 成長型: ${growth}】\n自分の所有馬リストに自動追加されました！`);
    fetchMyHorses();
    setActiveTab('my_horses');
  };

  // 🐎 馬主自身による引退申請
  const handleRetireRequest = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」の引退を管理者に申請しますか？`)) return;

    const { error } = await supabase
      .from('horse_masters')
      .update({ status: '引退申請中' })
      .eq('id', horseId);

    if (!error) {
      alert(`📨 「${horseName}」の引退申請を行いました。管理者の承認をお待ちください。`);
      fetchMyHorses();
    }
  };

  // 🏇 騎手変更申請
  const handleUpdateJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseId) return alert('馬を選択してください');

    const targetHorse = myHorses.find((h) => h.id === selectedHorseId);
    if (!targetHorse) return;

    await supabase.from('inquiries').insert([
      {
        user_id: currentUser.id,
        discord_name: currentUser.discord_name,
        title: `【騎手変更申請】 ${targetHorse.name}`,
        content: `対象馬: ${targetHorse.name}\n希望騎手: ${selectedJockey}`,
      },
    ]);

    alert(`🏇 「${targetHorse.name}」の主戦騎手を【${selectedJockey}】へ変更する申請を送信しました！`);
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header
        style={{
          backgroundColor: '#16a34a',
          color: '#fff',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ backgroundColor: '#ffffff', color: '#16a34a', padding: '6px 16px', fontWeight: '900', borderRadius: '30px' }}>
            🍏 青森県競馬
          </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dcfce7' }}>🐴 馬主専用ラウンジ</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentUser ? (
            <div style={{ backgroundColor: '#14532d', padding: '8px 20px', borderRadius: '25px', display: 'flex', gap: '16px', border: '1px solid #22c55e' }}>
              <span>👤 {currentUser.discord_name} オーナー</span>
              <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{(currentUser.balance || 0).toLocaleString()} G</span>
            </div>
          ) : (
            <span style={{ color: '#dcfce7', fontSize: '14px' }}>未ログイン</span>
          )}

          <Link href="/" style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
            🎫 IPAT投票画面 ↗
          </Link>
          <Link href="/admin" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
            ⚙️ 運営管理 ↗
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
        {!currentUser ? (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '50px',
              borderRadius: '20px',
              textAlign: 'center',
              maxWidth: '400px',
              margin: '50px auto',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐴</div>
            <h2 style={{ color: '#16a34a', margin: '0 0 10px 0' }}>馬主ラウンジ ログイン</h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <input type="text" placeholder="Discordユーザー名（馬主名）" value={discordInput} onChange={(e) => setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', border: 'none', cursor: 'pointer' }}>
                馬主としてログイン / 登録
              </button>
            </form>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
              <TabBtn active={activeTab === 'my_horses'} onClick={() => setActiveTab('my_horses')} text="📋 自分の所有馬一覧" />
              <TabBtn active={activeTab === 'breed'} onClick={() => setActiveTab('breed')} text="🎲 10万円 仔馬生産" />
              <TabBtn active={activeTab === 'jockey'} onClick={() => setActiveTab('jockey')} text="🏇 騎手変更申請" />
            </div>

            {/* TAB 1: 自分の所有馬一覧 */}
            {activeTab === 'my_horses' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🐎 自分の所有馬一覧 ({myHorses.length}頭)</h3>
                {myHorses.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ所有馬がいません。「10万円 仔馬生産」から生産してください。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {myHorses.map((h) => {
                      const isRetired = h.status === '引退';
                      const isPendingRetire = h.status === '引退申請中';
                      const isResting = h.status === '放牧中';

                      return (
                        <div key={h.id} style={{ backgroundColor: isRetired ? '#f1f5f9' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `1px solid ${isRetired ? '#cbd5e1' : '#e2e8f0'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: isRetired ? '#64748b' : '#16a34a' }}>
                              🐎 {h.name}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                color: '#fff',
                                backgroundColor: isRetired ? '#64748b' : isPendingRetire ? '#eab308' : isResting ? '#3b82f6' : '#16a34a',
                              }}
                            >
                              {h.status || '現役'}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>年齢: <strong style={{ color: '#0f172a' }}>{h.age || 2}歳馬</strong></div>
                            <div>馬主: {h.owner_name || currentUser.discord_name}</div>
                            {h.ability_rank && (
                              <div>素質: <span style={{ fontWeight: '900', color: h.ability_rank === 'SS' ? '#dc2626' : h.ability_rank === 'S' ? '#ea580c' : '#2563eb' }}>【{h.ability_rank}ランク】</span> ({h.growth_type || '普通'}型)</div>
                            )}
                            {h.ai_comment && (
                              <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '6px', marginTop: '4px', border: '1px solid #cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>
                                💬 {h.ai_comment}
                              </div>
                            )}
                            {isResting && h.return_date && (
                              <div style={{ color: '#2563eb', fontWeight: 'bold', marginTop: '4px' }}>🏡 帰厩予定: {new Date(h.return_date).toLocaleDateString()}</div>
                            )}
                          </div>

                          {!isRetired && !isPendingRetire && (
                            <button
                              onClick={() => handleRetireRequest(h.id, h.name)}
                              style={{ marginTop: '12px', width: '100%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                            >
                              引退を申請する 🛑
                            </button>
                          )}
                          {isPendingRetire && (
                            <div style={{ marginTop: '10px', fontSize: '12px', color: '#ca8a04', textAlign: 'center', fontWeight: 'bold' }}>
                              ⏳ 管理者の引退承認待ちです
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 生産ガチャ */}
            {activeTab === 'breed' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🎲 10万円 仔馬（2歳）生産ガチャ</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  100,000 G で新しい2歳仔馬を生産します。素質ランク（SS〜C）がランダム決定され、すぐにあなたの所有馬へ自動追加されます！
                </p>
                <form onSubmit={handleBreedGacha} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>新しい競走馬の名前</label>
                    <input type="text" placeholder="例: ツガルキング" value={newHorseName} onChange={(e) => setNewHorseName(e.target.value)} style={inputStyle} required />
                  </div>
                  <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    100,000 G で2歳馬を誕生・自動登録 🎲
                  </button>
                </form>
              </div>
            )}

            {/* TAB 3: 騎手変更 */}
            {activeTab === 'jockey' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🏇 主戦騎手の指定・変更申請</h3>
                <form onSubmit={handleUpdateJockey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>愛馬を選択</label>
                    <select value={selectedHorseId} onChange={(e) => setSelectedHorseId(e.target.value)} style={inputStyle}>
                      {myHorses.filter(h => h.status !== '引退').map((h) => (
                        <option key={h.id} value={h.id}>
                          🐎 {h.name} ({h.age || 2}歳)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>指名する騎手</label>
                    <select value={selectedJockey} onChange={(e) => setSelectedJockey(e.target.value)} style={inputStyle}>
                      {jockeyList.map((j) => (
                        <option key={j.id} value={j.name}>
                          🏇 {j.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" style={{ padding: '16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    騎手変更申請を運営へ送信 📨
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontWeight: 'bold',
        cursor: 'pointer',
        backgroundColor: active ? '#16a34a' : '#fff',
        color: active ? '#fff' : '#475569',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', width: '100%' };