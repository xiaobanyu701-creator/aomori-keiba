'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // タブ管理（2歳自家生産馬 / 管理者登録馬 / ガチャ / 騎手申請）
  const [activeTab, setActiveTab] = useState<'my_2yo' | 'all_horses' | 'breed' | 'jockey'>('my_2yo');
  const [ageFilter, setAgeFilter] = useState<number>(2);

  const [my2yoHorses, setMy2yoHorses] = useState<any[]>([]);
  const [adminHorses, setAdminHorses] = useState<any[]>([]);
  const [jockeyList, setJockeyList] = useState<any[]>([]);

  const [newHorseName, setNewHorseName] = useState('');
  const [selectedHorseName, setSelectedHorseName] = useState('');
  const [selectedJockey, setSelectedJockey] = useState('');

  useEffect(() => {
    fetchJockeys();
    fetchAdminHorses();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMy2yoHorses();
    }
  }, [currentUser]);

  const fetchJockeys = async () => {
    const { data } = await supabase.from('jockeys').select('*');
    if (data && data.length > 0) {
      setJockeyList(data);
      setSelectedJockey(data[0].name);
    }
  };

  // 管理者が登録した2〜8歳馬の一覧を取得
  const fetchAdminHorses = async () => {
    const { data } = await supabase.from('horse_masters').select('*');
    if (data) {
      setAdminHorses(data);
    }
  };

  // 🔒 自分が生産した2歳馬（端末ローカル安全保存）を読み込み
  const loadMy2yoHorses = () => {
    if (!currentUser) return;
    const storageKey = `my_2yo_horses_${currentUser.discord_name}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    setMy2yoHorses(saved);
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

  // 🎲 10万円 2歳馬ガチャ（絶対重複エラーが出ない自分専用登録）
  const handleBreedGacha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return alert('馬名を入力してください');
    if ((currentUser.balance || 0) < 100000) return alert('資金が足りません（100,000G必要です）');

    // 素質判定
    const rand = Math.random();
    let rank = 'C';
    if (rand < 0.05) rank = 'SS';
    else if (rand < 0.20) rank = 'S';
    else if (rand < 0.40) rank = 'A';
    else if (rand < 0.70) rank = 'B';

    const newHorse = {
      id: Date.now().toString(),
      name: newHorseName,
      age: 2,
      rank: rank,
      owner: currentUser.discord_name,
      createdAt: new Date().toLocaleDateString()
    };

    // 🔒 自分の端末専用保存リストへ書き込み（他人の馬と混ざりません）
    const storageKey = `my_2yo_horses_${currentUser.discord_name}`;
    const currentList = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedList = [newHorse, ...currentList];
    localStorage.setItem(storageKey, JSON.stringify(updatedList));

    // 残高減額
    const newBal = (currentUser.balance || 0) - 100000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    // 管理者へ「出走登録依頼」をお問い合わせへ自動送信（管理者がレースに出せるように連携）
    await supabase.from('inquiries').insert([
      {
        user_id: currentUser.id,
        discord_name: currentUser.discord_name,
        title: `【新馬生産完了】 ${newHorseName} (2歳/素質:${rank})`,
        content: `馬主: ${currentUser.discord_name}\n馬名: ${newHorseName}\n年齢: 2歳\n素質ランク: ${rank}`,
      }
    ]);

    setCurrentUser({ ...currentUser, balance: newBal });
    setNewHorseName('');
    alert(`🎉 2歳仔馬「${newHorseName}」が誕生しました！\n【素質: ${rank}ランク】\n「自分の2歳所有馬」タブへ自動反映されました！`);
    setMy2yoHorses(updatedList);
    setActiveTab('my_2yo');
  };

  const handleRetireRequest = async (horseName: string) => {
    if (!confirm(`「${horseName}」の引退を管理者に申請しますか？`)) return;

    await supabase.from('inquiries').insert([
      {
        user_id: currentUser.id,
        discord_name: currentUser.discord_name,
        title: `【引退申請】 ${horseName}`,
        content: `馬主 ${currentUser.discord_name} 様より「${horseName}」の引退申請がありました。`,
      },
    ]);

    alert(`📨 「${horseName}」の引退申請を管理者に送信しました。`);
  };

  const handleUpdateJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseName) return alert('馬を選択してください');

    await supabase.from('inquiries').insert([
      {
        user_id: currentUser.id,
        discord_name: currentUser.discord_name,
        title: `【騎手変更申請】 ${selectedHorseName}`,
        content: `対象馬: ${selectedHorseName}\n希望騎手: ${selectedJockey}`,
      },
    ]);

    alert(`🏇 「${selectedHorseName}」の主戦騎手を【${selectedJockey}】へ変更する申請を送信しました！`);
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
            {/* メインタブ */}
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
              <TabBtn active={activeTab === 'my_2yo'} onClick={() => setActiveTab('my_2yo')} text="🐎 自分の2歳所有馬" />
              <TabBtn active={activeTab === 'all_horses'} onClick={() => setActiveTab('all_horses')} text="📋 年齢別 競走馬名鑑 (2〜8歳)" />
              <TabBtn active={activeTab === 'breed'} onClick={() => setActiveTab('breed')} text="🎲 10万円 2歳仔馬生産" />
              <TabBtn active={activeTab === 'jockey'} onClick={() => setActiveTab('jockey')} text="🏇 騎手変更申請" />
            </div>

            {/* TAB 1: 自分の2歳所有馬（完全分離） */}
            {activeTab === 'my_2yo' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🐎 自分の2歳所有馬一覧 ({my2yoHorses.length}頭)</h3>
                {my2yoHorses.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ生産した2歳馬がいません。「10万円 2歳仔馬生産」からガチャを回してください。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {my2yoHorses.map((h) => (
                      <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#16a34a' }}>
                            🐎 {h.name}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#fff', backgroundColor: '#16a34a' }}>
                            2歳馬
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div>馬主: {currentUser.discord_name}</div>
                          <div>素質ランク: <strong style={{ color: '#dc2626' }}>【{h.rank}】</strong></div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>生産日: {h.createdAt}</div>
                        </div>

                        <button
                          onClick={() => handleRetireRequest(h.name)}
                          style={{ marginTop: '12px', width: '100%', backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                        >
                          引退を申請する 🛑
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 年齢別 競走馬名鑑 (2〜8歳) */}
            {activeTab === 'all_horses' && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a' }}>📋 年齢別 登録競走馬一覧</h3>
                {/* 年齢切り替えボタン (2〜8歳) */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  {[2, 3, 4, 5, 6, 7, 8].map((age) => (
                    <button
                      key={age}
                      onClick={() => setAgeFilter(age)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: ageFilter === age ? '#1e3a8a' : '#f8fafc',
                        color: ageFilter === age ? '#fff' : '#475569',
                      }}
                    >
                      {age}歳馬
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                  {adminHorses
                    .filter((h) => (h.age || 3) === ageFilter)
                    .map((h) => (
                      <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '16px' }}>🐎 {h.name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>年齢: {ageFilter}歳</div>
                        <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '2px' }}>馬主: {h.owner_name || '運営管理'}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: 2歳仔馬生産 */}
            {activeTab === 'breed' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🎲 10万円 2歳仔馬生産ガチャ</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  100,000 G で新しい2歳仔馬を生産します。自分専用の「2歳所有馬」タブに即座に保存されます！
                </p>
                <form onSubmit={handleBreedGacha} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>新しい競走馬の名前</label>
                    <input type="text" placeholder="例: ツガルキング" value={newHorseName} onChange={(e) => setNewHorseName(e.target.value)} style={inputStyle} required />
                  </div>
                  <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    100,000 G で2歳馬を誕生・自動反映 🎲
                  </button>
                </form>
              </div>
            )}

            {/* TAB 4: 騎手変更申請 */}
            {activeTab === 'jockey' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🏇 主戦騎手の指定・変更申請</h3>
                <form onSubmit={handleUpdateJockey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>愛馬（自分の2歳馬）を選択</label>
                    <select value={selectedHorseName} onChange={(e) => setSelectedHorseName(e.target.value)} style={inputStyle}>
                      <option value="">馬を選択してください</option>
                      {my2yoHorses.map((h) => (
                        <option key={h.id} value={h.name}>
                          🐎 {h.name} (2歳/素質:{h.rank})
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