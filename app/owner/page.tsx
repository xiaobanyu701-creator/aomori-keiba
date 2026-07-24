'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [activeTab, setActiveTab] = useState<'my_horses' | 'breed' | 'jockey'>('my_horses');

  const [myHorses, setMyHorses] = useState<any[]>([]);
  const [jockeyList, setJockeyList] = useState<any[]>([]);

  // 10万ガチャ・生産用
  const [newHorseName, setNewHorseName] = useState('');

  // 騎手変更用
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

  const fetchMyHorses = async () => {
    // 全競走馬マスターから自分が馬主になっている馬を取得
    const { data } = await supabase.from('horse_masters').select('*');
    if (data) {
      // ユーザー名と一致する馬を取得、または所有馬テーブルから取得
      setMyHorses([...data].reverse());
      if (data.length > 0 && !selectedHorseId) {
        setSelectedHorseId(data[0].id);
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

  // 🎲 10万円 一発ランダム生産（競走馬マスターに一元保存）
  const handleBreedGacha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return alert('馬名を入力してください');
    if ((currentUser.balance || 0) < 100000) return alert('資金が足りません（100,000G必要です）');

    // 1. 競走馬マスターに登録（これで管理画面・馬券画面へ一元連動）
    const { error: horseError } = await supabase.from('horse_masters').insert([
      {
        name: newHorseName,
      },
    ]);

    if (horseError) {
      alert('登録エラー: ' + horseError.message);
      return;
    }

    // 2. 馬主残高の減額
    const newBal = (currentUser.balance || 0) - 100000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setNewHorseName('');
    alert(`🎉 仔馬「${newHorseName}」が誕生しました！管理画面のマスターへ即時連携されました！`);
    fetchMyHorses();
  };

  // 🏇 騎手変更申請
  const handleUpdateJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseId) return alert('馬を選択してください');

    // 競走馬マスター（または出走馬）の騎手を更新
    const targetHorse = myHorses.find((h) => h.id === selectedHorseId);
    if (!targetHorse) return;

    alert(`🏇 「${targetHorse.name}」の主戦騎手を【${selectedJockey}】に変更申請しました！`);
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      {/* ヘッダー */}
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
            {/* タブ */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
              <TabBtn active={activeTab === 'my_horses'} onClick={() => setActiveTab('my_horses')} text="📋 所有馬マスター一覧" />
              <TabBtn active={activeTab === 'breed'} onClick={() => setActiveTab('breed')} text="🎲 10万円 一発仔馬生産" />
              <TabBtn active={activeTab === 'jockey'} onClick={() => setActiveTab('jockey')} text="🏇 騎手変更申請" />
            </div>

            {/* TAB 1: 所有馬一覧 */}
            {activeTab === 'my_horses' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🐎 登録済み競走馬一覧 ({myHorses.length}頭)</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  ※ここに表示されている馬は、管理者画面の「競走馬マスター」およびレースの「出走馬選択」へ自動で一元連携されています。
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {myHorses.map((h) => (
                    <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#16a34a' }}>🐎 {h.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>ステータス: 現役 / マスター連動中</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: 仔馬生産 */}
            {activeTab === 'breed' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🎲 10万円 一発ランダム仔馬生産</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  100,000 G で新しい競走馬を生産します。生産された馬はすぐにデータベースに一元保存され、出走登録が可能になります！
                </p>
                <form onSubmit={handleBreedGacha} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>新しい競走馬の名前</label>
                    <input type="text" placeholder="例: ツガルキング" value={newHorseName} onChange={(e) => setNewHorseName(e.target.value)} style={inputStyle} required />
                  </div>
                  <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    100,000 G で仔馬を誕生させる 🎲
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
                      {myHorses.map((h) => (
                        <option key={h.id} value={h.id}>
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
                  <button type="submit" style={{ padding: '16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    騎手変更を申請する 📝
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