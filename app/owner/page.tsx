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

  const [newHorseName, setNewHorseName] = useState('');
  const [selectedHorseName, setSelectedHorseName] = useState('');
  const [selectedJockey, setSelectedJockey] = useState('');

  useEffect(() => {
    fetchJockeys();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMyHorses();
    }
  }, [currentUser]);

  const fetchJockeys = async () => {
    const { data } = await supabase.from('jockeys').select('*');
    if (data && data.length > 0) {
      setJockeyList(data);
      setSelectedJockey(data[0].name);
    }
  };

  // 🌐 SupabaseのDBからオンライン同期された自分の所有馬を取得
  const loadMyHorses = async () => {
    if (!currentUser) return;

    const { data } = await supabase
      .from('horse_masters')
      .select('*')
      .eq('owner_name', currentUser.discord_name);

    if (data) {
      setMyHorses([...data].reverse());
      if (data.length > 0 && !selectedHorseName) {
        setSelectedHorseName(data[0].name);
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
      if (confirm(`「${discordInput}」さんを新規登録しますか？`)) {
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

  // 🎲 10万円 ダビスタ風仔馬生産 (全端末＆管理者オンライン同期版)
  const handleBreedGacha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return alert('馬名を入力してください');
    if ((currentUser.balance || 0) < 100000) return alert('資金が足りません');

    const probs = JSON.parse(localStorage.getItem('breeding_probs') || '{"SS":5,"S":15,"A":20,"B":30,"C":30}');
    const rand = Math.random() * 100;

    let rank = 'C';
    if (rand < probs.SS) rank = 'SS';
    else if (rand < probs.SS + probs.S) rank = 'S';
    else if (rand < probs.SS + probs.S + probs.A) rank = 'A';
    else if (rand < probs.SS + probs.S + probs.A + probs.B) rank = 'B';

    const paramMap: { [key: string]: string[] } = {
      SS: ['S', 'S', 'A', 'S'],
      S: ['A', 'S', 'B', 'A'],
      A: ['A', 'B', 'B', 'A'],
      B: ['B', 'C', 'B', 'B'],
      C: ['C', 'C', 'C', 'C'],
    };

    const [speed, stamina, guts, temper] = paramMap[rank];

    // 🌐 オンラインDB (horse_masters) へ直接保存して管理者画面と一発同期
    const { error } = await supabase.from('horse_masters').insert([
      {
        name: newHorseName,
        owner_name: currentUser.discord_name,
        rank: rank,
        speed: speed,
        stamina: stamina,
        guts: guts,
        temper: temper,
        status: '現役',
        age: 2,
      },
    ]);

    if (error) {
      return alert('生産エラー: ' + error.message);
    }

    const newBal = (currentUser.balance || 0) - 100000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setNewHorseName('');
    alert(`🎉 2歳仔馬「${newHorseName}」が誕生しました！\n【総合素質: ${rank}】\nスピード: ${speed} / スタミナ: ${stamina} / 根性: ${guts} / 気性: ${temper}`);
    loadMyHorses();
    setActiveTab('my_horses');
  };

  const handleRetireRequest = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」の引退を管理者に申請しますか？`)) return;

    await supabase.from('horse_masters').update({ status: '引退申請中' }).eq('id', horseId);
    alert(`📨 「${horseName}」の引退申請を送信しました！`);
    loadMyHorses();
  };

  const handleUpdateJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseName) return alert('愛馬を選択してください');

    await supabase.from('inquiries').insert([
      {
        user_id: currentUser.id,
        discord_name: currentUser.discord_name,
        title: `【主戦騎手変更申請】 ${selectedHorseName}`,
        content: `馬主: ${currentUser.discord_name}\n対象馬: ${selectedHorseName}\n希望騎手: ${selectedJockey}`,
      },
    ]);

    alert(`🏇 「${selectedHorseName}」の主戦騎手を【${selectedJockey}】様へ変更申請しました！`);
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
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#dcfce7' }}>🐴 馬主ラウンジ</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentUser ? (
            <div style={{ backgroundColor: '#14532d', padding: '8px 20px', borderRadius: '25px', display: 'flex', gap: '16px', border: '1px solid #22c55e' }}>
              <span>👤 {currentUser.discord_name} オーナー</span>
              <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{(currentUser.balance || 0).toLocaleString()} G (IPAT共通)</span>
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
              <input type="text" placeholder="ユーザー名 (Discord名)" value={discordInput} onChange={(e) => setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', border: 'none', cursor: 'pointer' }}>
                馬主としてログイン / 登録
              </button>
            </form>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            
            <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
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
                    まだ所有馬がいません。「10万円 仔馬生産」で生産するか、管理者の割り当てをお待ちください。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {myHorses.map((h) => {
                      const isRetired = h.status === '引退';
                      const isPendingRetire = h.status === '引退申請中';
                      const isRunning = h.status?.includes('出走');

                      return (
                        <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#16a34a' }}>🐎 {h.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#fff', backgroundColor: isRetired ? '#64748b' : isPendingRetire ? '#eab308' : isRunning ? '#dc2626' : '#16a34a' }}>
                              {h.status || '現役'}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', marginTop: '10px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>馬主: <strong>{currentUser.discord_name}</strong></div>
                            <div>総合素質: <strong style={{ color: '#dc2626' }}>【{h.rank || 'B'}ランク】</strong></div>
                            <div>スピード: {h.speed || 'B'} / スタミナ: {h.stamina || 'B'} / 根性: {h.guts || 'B'}</div>
                          </div>

                          {!isRetired && !isPendingRetire && (
                            <button
                              onClick={() => handleRetireRequest(h.id, h.name)}
                              style={{ marginTop: '12px', width: '100%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                            >
                              引退を申請する 🛑
                            </button>
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
                  100,000 G で新しい2歳仔馬を生産します。オンライン保存され管理者画面からもリアルタイムで確認・編集できます！
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

            {/* TAB 3: 騎手変更申請 */}
            {activeTab === 'jockey' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>
                  🏇 主戦騎手の指定・変更申請
                </h3>

                <form onSubmit={handleUpdateJockey} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>愛馬を選択</label>
                    <select value={selectedHorseName} onChange={(e) => setSelectedHorseName(e.target.value)} style={inputStyle}>
                      {myHorses.map((h) => (
                        <option key={h.id} value={h.name}>
                          🐎 {h.name}
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

                  <button
                    type="submit"
                    style={{
                      padding: '16px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                    }}
                  >
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
        padding: '12px 22px',
        borderRadius: '10px',
        border: active ? 'none' : '1px solid #cbd5e1',
        fontWeight: 'bold',
        fontSize: '15px',
        cursor: 'pointer',
        backgroundColor: active ? '#16a34a' : '#ffffff',
        color: active ? '#ffffff' : '#475569',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 'bold' };
const inputStyle = { padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', width: '100%', backgroundColor: '#fff' };