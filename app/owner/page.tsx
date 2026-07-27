'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [activeTab, setActiveTab] = useState<'my_horses' | 'starhorse_breed' | 'pedigree' | 'jockey'>('my_horses');

  const [myHorses, setMyHorses] = useState<any[]>([]);
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [pedigreeList, setPedigreeList] = useState<any[]>([]);

  const [selectedSire, setSelectedSire] = useState('');
  const [selectedDam, setSelectedDam] = useState('');
  const [foalNameInput, setFoalNameInput] = useState('');

  const [selectedHorseName, setSelectedHorseName] = useState('');
  const [selectedJockey, setSelectedJockey] = useState('');

  useEffect(() => {
    fetchJockeys();
    fetchPedigree();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadMyHorses();
    }
  }, [currentUser]);

  const fetchJockeys = async () => {
    try {
      const { data } = await supabase.from('jockeys').select('*');
      if (data && data.length > 0) {
        setJockeyList(data);
        setSelectedJockey(data[0].name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPedigree = async () => {
    const { data } = await supabase.from('horse_masters').select('*').eq('status', '種牡馬/繁殖牝馬');
    if (data) {
      setPedigreeList(data);
      if (data.length > 0) {
        setSelectedSire(data[0].name);
        setSelectedDam(data[0].name);
      }
    } else {
      const local = JSON.parse(localStorage.getItem('app_pedigree_masters') || '[]');
      setPedigreeList(local);
    }
  };

  const loadMyHorses = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('horse_masters')
        .select('*')
        .eq('owner_name', currentUser.discord_name);

      if (data && !error) {
        setMyHorses([...data].reverse());
        if (data.length > 0 && !selectedHorseName) {
          setSelectedHorseName(data[0].name);
        }
      } else {
        const local = JSON.parse(localStorage.getItem(`my_2yo_horses_${currentUser.discord_name}`) || '[]');
        setMyHorses(local);
      }
    } catch (e) {
      console.error(e);
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

  const handleStarhorseBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foalNameInput.trim()) return alert('仔馬の名前を入力してください');
    if (!selectedSire || !selectedDam) return alert('父馬と母馬を選択してください');
    if (selectedSire === selectedDam) return alert('父馬と母馬には異なる血統を選択してください');

    const sireObj = pedigreeList.find(p => p.name === selectedSire);
    const isMySire = sireObj?.owner_name === currentUser.discord_name;
    const fee = isMySire ? 0 : 500000;

    if ((currentUser.balance || 0) < fee) return alert('種付け費用が足りません');

    const ranks = ['SS', 'S', 'A', 'B'];
    const inheritedRank = isMySire ? 'SS' : ranks[Math.floor(Math.random() * ranks.length)];

    await supabase.from('horse_masters').insert([
      {
        name: foalNameInput,
        owner_name: currentUser.discord_name,
        sire_name: selectedSire,
        dam_name: selectedDam,
        rank: inheritedRank,
        speed: 'S',
        stamina: 'A',
        guts: 'A',
        temper: 'A',
        status: '現役',
        generation: 2,
      },
    ]);

    const newBal = (currentUser.balance || 0) - fee;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setFoalNameInput('');
    alert(`🎉 【${selectedSire} × ${selectedDam}】の超良血配合により「${foalNameInput}」が誕生しました！\n【確定素質: ${inheritedRank}ランク】`);
    loadMyHorses();
    setActiveTab('my_horses');
  };

  const handleSellAtAuction = async (horseId: string, horseName: string) => {
    const startPriceStr = prompt(`「${horseName}」をセリ市に出品します。最低落札（開始）価格を入力してください(G):`, '500000');
    if (!startPriceStr) return;
    const startPrice = Number(startPriceStr);

    await supabase.from('auctions').insert([
      {
        horse_id: horseId,
        horse_name: horseName,
        seller_name: currentUser.discord_name,
        current_bid: startPrice,
        highest_bidder: 'なし',
        is_official: false,
        status: 'active',
      },
    ]);

    await supabase.from('horse_masters').update({ status: 'セリ出品中' }).eq('id', horseId);
    alert(`🔨 「${horseName}」をセリ市へ出品しました！`);
    loadMyHorses();
  };

  const handleTrainHorse = async (horseId: string, horseName: string, type: string) => {
    if ((currentUser.balance || 0) < 50000) return alert('調教費用 (50,000 G) が足りません');
    if (!confirm(`「${horseName}」を【${type}調教】しますか？ (費用: 50,000 G)`)) return;

    const successRate = Number(localStorage.getItem('training_success_rate') || 70);
    const superRate = Number(localStorage.getItem('training_super_rate') || 15);

    const rand = Math.random() * 100;
    let resultType = 'fail';

    if (rand < superRate) {
      resultType = 'super';
    } else if (rand < successRate) {
      resultType = 'success';
    }

    let targetField = 'speed';
    if (type === 'ウッド') targetField = 'guts';
    if (type === 'プール') targetField = 'stamina';

    if (resultType === 'super') {
      await supabase.from('horse_masters').update({ [targetField]: 'S', rank: 'S' }).eq('id', horseId);
      alert(`🌟 大成功！！「${horseName}」の能力が激上がりしました！【 ${type}能力: Sランク達成 】`);
    } else if (resultType === 'success') {
      await supabase.from('horse_masters').update({ [targetField]: 'A' }).eq('id', horseId);
      alert(`🎯 調教成功！「${horseName}」の${type}能力がアップしました！`);
    } else {
      alert(`❌ 残念…「${horseName}」の調教は失敗し、能力は変わりませんでした。`);
    }

    const newBal = (currentUser.balance || 0) - 50000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    loadMyHorses();
  };

  const handleRegisterPedigree = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」を伝説の「種牡馬/繁殖牝馬」として血統登録しますか？`)) return;

    await supabase.from('horse_masters').update({ status: '種牡馬/繁殖牝馬' }).eq('id', horseId);

    const local = JSON.parse(localStorage.getItem('app_pedigree_masters') || '[]');
    localStorage.setItem('app_pedigree_masters', JSON.stringify([{ id: horseId, name: horseName, owner_name: currentUser.discord_name, status: '種牡馬/繁殖牝馬' }, ...local]));

    alert(`🧬 「${horseName}」を血統ライブラリへ登録しました！`);
    loadMyHorses();
    fetchPedigree();
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
            
            <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px', overflowX: 'auto' }}>
              <TabBtn active={activeTab === 'my_horses'} onClick={() => setActiveTab('my_horses')} text="📋 自分の所有馬一覧" />
              <TabBtn active={activeTab === 'starhorse_breed'} onClick={() => setActiveTab('starhorse_breed')} text="🧬 スタホ風 本格配合生産" />
              <TabBtn active={activeTab === 'pedigree'} onClick={() => setActiveTab('pedigree')} text={`🧬 伝説血統書 (${pedigreeList.length})`} />
              <TabBtn active={activeTab === 'jockey'} onClick={() => setActiveTab('jockey')} text="🏇 騎手変更申請" />
            </div>

            {activeTab === 'my_horses' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🐎 自分の所有馬一覧 ({myHorses.length}頭)</h3>
                {myHorses.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ所有馬がいません。「スタホ風 本格配合」で生産するか、管理者の割り当てをお待ちください。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {myHorses.map((h, i) => {
                      const isRetired = h.status === '引退';
                      const isPedigree = h.status === '種牡馬/繁殖牝馬';
                      const isPendingRetire = h.status === '引退申請中';
                      const isRunning = h.status?.includes('出走');
                      const isAuction = h.status === 'セリ出品中';

                      return (
                        <div key={h.id || i} style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#16a34a' }}>🐎 {h.name}</span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '6px', color: '#fff', backgroundColor: isAuction ? '#d97706' : isPedigree ? '#8b5cf6' : isRetired ? '#64748b' : isPendingRetire ? '#eab308' : isRunning ? '#dc2626' : '#16a34a' }}>
                              {h.status || '現役'}
                            </span>
                          </div>

                          <div style={{ fontSize: '13px', marginTop: '10px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>馬主: <strong>{currentUser.discord_name}</strong></div>
                            <div>血統: <strong>{h.sire_name || '自家'} × {h.dam_name || '自家'} ({h.generation || 1}代目)</strong></div>
                            <div>総合素質: <strong style={{ color: '#dc2626' }}>【{h.rank || 'B'}ランク】</strong></div>
                            <div>スピード: {h.speed || 'B'} / スタミナ: {h.stamina || 'B'} / 根性: {h.guts || 'B'}</div>
                          </div>

                          {!isRetired && !isPendingRetire && !isPedigree && !isAuction && h.id && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleTrainHorse(h.id, h.name, '坂路')} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>坂路(速)</button>
                                <button onClick={() => handleTrainHorse(h.id, h.name, 'ウッド')} style={{ flex: 1, backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>ウッド(根)</button>
                                <button onClick={() => handleTrainHorse(h.id, h.name, 'プール')} style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>プール(体)</button>
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleSellAtAuction(h.id, h.name)} style={{ flex: 1, backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>セリ出品 🔨</button>
                                <button onClick={() => handleRegisterPedigree(h.id, h.name)} style={{ flex: 1, backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>種牡馬 🧬</button>
                                <button onClick={() => handleRetireRequest(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>引退 🛑</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'starhorse_breed' && (
              <div style={{ maxWidth: '600px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a' }}>🧬 スタホ風 自家製本格配合（父×母）</h3>
                <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                  殿堂入りした自分の所有種牡馬なら<strong>種付け料0G (無料)</strong>で種付けできます！
                </p>
                <form onSubmit={handleStarhorseBreed} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>① 父馬（種牡馬）を選択</label>
                    <select value={selectedSire} onChange={e => setSelectedSire(e.target.value)} style={inputStyle}>
                      {pedigreeList.map(p => (
                        <option key={p.id} value={p.name}>
                          🧬 {p.name} (元所有: {p.owner_name} {p.owner_name === currentUser.discord_name ? '【自分・種付け料無料】' : '【他馬主・50万G】'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>② 母馬（繁殖牝馬）を選択</label>
                    <select value={selectedDam} onChange={e => setSelectedDam(e.target.value)} style={inputStyle}>
                      {pedigreeList.map(p => (
                        <option key={p.id} value={p.name}>
                          🧬 {p.name} (元所有: {p.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>③ 誕生する仔馬の名前</label>
                    <input type="text" placeholder="例: カマクラキング" value={foalNameInput} onChange={e => setFoalNameInput(e.target.value)} style={inputStyle} required />
                  </div>

                  <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    この配合で最強仔馬を生産する 🧬
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'pedigree' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b5cf6' }}>🧬 殿堂入り 伝説の種牡馬・繁殖牝馬ライブラリ</h3>
                {pedigreeList.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ登録された種牡馬・繁殖牝馬がいません。愛馬を種牡馬登録してみましょう！
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {pedigreeList.map((p) => (
                      <div key={p.id} style={{ backgroundColor: '#faf5ff', padding: '18px', borderRadius: '12px', border: '2px solid #c084fc' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#7e22ce', marginBottom: '6px' }}>🧬 {p.name}</div>
                        <div style={{ fontSize: '13px', color: '#6b21a8' }}>元馬主: {p.owner_name}</div>
                        <div style={{ fontSize: '12px', color: '#a855f7', marginTop: '4px', fontWeight: 'bold' }}>⭐ 伝説の継承血統</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jockey' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>
                  🏇 主戦騎手の指定・変更申請
                </h3>

                <form onSubmit={handleUpdateJockey} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>愛馬を選択</label>
                    <select value={selectedHorseName} onChange={(e) => setSelectedHorseName(e.target.value)} style={inputStyle}>
                      {myHorses.map((h, i) => (
                        <option key={h.id || i} value={h.name}>
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