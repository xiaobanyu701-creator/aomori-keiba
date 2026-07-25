'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function IPATPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [mainTab, setMainTab] = useState<'bet' | 'history' | 'news'>('bet');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);

  // 投票用
  const [betType, setBetType] = useState('単勝');
  const [selectedHorse1, setSelectedHorse1] = useState('');
  const [selectedHorse2, setSelectedHorse2] = useState('');
  const [selectedHorse3, setSelectedHorse3] = useState('');
  const [betAmount, setBetAmount] = useState(1000);

  useEffect(() => {
    fetchRaces();
    fetchNews();
  }, []);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find((r) => r.race_number === selectedRaceNo);
      if (race) {
        setCurrentRace(race);
        fetchHorsesAndOnlineOdds(race.id);
      }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => {
    if (currentUser) {
      fetchMyBets();
    }
  }, [currentUser, selectedRaceNo]);

  const fetchRaces = async () => {
    const { data } = await supabase.from('races').select('*');
    if (data) setRaces([...data].sort((a, b) => (a.race_number || 0) - (b.race_number || 0)));
  };

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*');
    if (data) {
      setNewsList([...data].reverse());
    } else {
      const local = JSON.parse(localStorage.getItem('app_news_list') || '[]');
      setNewsList(local);
    }
  };

  const fetchHorsesAndOnlineOdds = async (raceId: string) => {
    const { data: hData } = await supabase.from('horses').select('*').eq('race_id', raceId);
    const { data: bData } = await supabase.from('bets').select('*').eq('race_id', String(raceId));

    if (hData) {
      const sorted = [...hData].sort((a, b) => (a.horse_number || 0) - (b.horse_number || 0));
      const totalAmount = bData ? bData.reduce((sum, b) => sum + Number(b.amount || 0), 0) : 0;

      const dynamicHorses = sorted.map((h) => {
        let calculatedOdds = Number(h.manual_odds || 5.0);
        if (totalAmount > 0 && bData) {
          const horseBets = bData.filter((b) => b.bet_type === '単勝' && String(b.selection) === String(h.horse_number));
          const horseTotal = horseBets.reduce((sum, b) => sum + Number(b.amount || 0), 0);

          if (horseTotal > 0) {
            const pool = totalAmount * 0.8;
            const odds = pool / horseTotal;
            calculatedOdds = Math.max(1.1, Number(odds.toFixed(1)));
          }
        }
        return { ...h, calculatedOdds };
      });

      setHorses(dynamicHorses);
      if (dynamicHorses.length > 0) {
        setSelectedHorse1(String(dynamicHorses[0].horse_number));
        if (dynamicHorses.length > 1) setSelectedHorse2(String(dynamicHorses[1].horse_number));
        if (dynamicHorses.length > 2) setSelectedHorse3(String(dynamicHorses[2].horse_number));
      }
    }
  };

  const fetchMyBets = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('bets').select('*').eq('user_id', String(currentUser.id));
    if (data) setMyBets([...data].reverse());
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
      if (confirm(`「${discordInput}」さんを新規登録しますか？（10,000,000G付与）`)) {
        const { data: inserted } = await supabase
          .from('users')
          .insert([{ discord_name: discordInput, pin_code: pinInput, balance: 10000000 }])
          .select('*');
        if (inserted && inserted.length > 0) {
          setCurrentUser(inserted[0]);
          alert('🎉 登録完了！ 10,000,000 G 付与！');
        }
      }
    }
  };

  const handleBuyBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return alert('ログインしてください');
    if (!currentRace) return;
    if (currentRace.status === 'closed' || currentRace.status === 'finished') {
      return alert('🔒 このレースは投票受付が締め切られています');
    }
    if ((currentUser.balance || 0) < betAmount) return alert('所持コインが足りません');

    let selection = selectedHorse1;
    if (['馬単', '馬連', 'ワイド'].includes(betType)) {
      if (selectedHorse1 === selectedHorse2) return alert('異なる馬を選択してください');
      selection = `${selectedHorse1}-${selectedHorse2}`;
    } else if (['3連複', '3連単'].includes(betType)) {
      if (new Set([selectedHorse1, selectedHorse2, selectedHorse3]).size < 3) {
        return alert('3頭とも異なる馬を選択してください');
      }
      selection = `${selectedHorse1}-${selectedHorse2}-${selectedHorse3}`;
    }

    const { error } = await supabase.from('bets').insert([
      {
        user_id: String(currentUser.id),
        race_id: String(currentRace.id),
        bet_type: String(betType),
        selection: String(selection),
        amount: Number(betAmount),
      },
    ]);

    if (error) {
      return alert('購入エラー: ' + error.message);
    }

    const newBal = (currentUser.balance || 0) - betAmount;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    alert(`🎫 【${currentRace.race_number}R】${betType} (${selection}) を ${betAmount.toLocaleString()} G で購入しました！`);
    fetchMyBets();
    fetchHorsesAndOnlineOdds(currentRace.id);
  };

  const isFinished = currentRace?.status === 'finished';

  const resultHorses = [...horses].sort((a, b) => {
    if (!isFinished) return 0;
    const rankMap: { [key: string]: number } = {
      [currentRace?.first_horse]: 1,
      [currentRace?.second_horse]: 2,
      [currentRace?.third_horse]: 3,
      [currentRace?.rank4]: 4,
      [currentRace?.rank5]: 5,
      [currentRace?.rank6]: 6,
      [currentRace?.rank7]: 7,
      [currentRace?.rank8]: 8,
      [currentRace?.rank9]: 9,
    };
    const rA = rankMap[String(a.horse_number)] || 99;
    const rB = rankMap[String(b.horse_number)] || 99;
    return rA - rB;
  });

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header
        style={{
          backgroundColor: '#1e3a8a',
          color: '#fff',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 16px', fontWeight: '900', borderRadius: '30px' }}>
            🍏 青森県競馬
          </span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#bfdbfe' }}>🎫 即パット IPAT投票システム</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {currentUser ? (
            <div style={{ backgroundColor: '#1e40af', padding: '8px 20px', borderRadius: '25px', display: 'flex', gap: '16px', border: '1px solid #60a5fa' }}>
              <span>👤 {currentUser.discord_name} 様</span>
              <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{(currentUser.balance || 0).toLocaleString()} G</span>
            </div>
          ) : (
            <span style={{ color: '#93c5fd', fontSize: '14px' }}>未ログイン</span>
          )}

          <Link href="/owner" style={{ backgroundColor: '#16a34a', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
            🐴 馬主ラウンジ ↗
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
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎫</div>
            <h2 style={{ color: '#1e3a8a', margin: '0 0 10px 0' }}>IPAT ログイン</h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <input type="text" placeholder="ユーザー名 (Discord名)" value={discordInput} onChange={(e) => setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#1e3a8a', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', border: 'none', cursor: 'pointer' }}>
                ログイン / 新規登録
              </button>
            </form>
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '10px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '24px' }}>
              <TabBtn active={mainTab === 'bet'} onClick={() => setMainTab('bet')} text={isFinished ? '🏁 レース確定結果・払戻金' : '🎫 馬券投票（オッズ自動連動）'} />
              <TabBtn active={mainTab === 'history'} onClick={() => setMainTab('history')} text={`📋 馬券購入履歴 (${myBets.length}件)`} />
              <TabBtn active={mainTab === 'news'} onClick={() => setMainTab('news')} text={`📢 アプデ・お知らせ (${newsList.length}件)`} />
            </div>

            {mainTab === 'bet' && (
              <div>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>レース切り替え (1〜12R):</div>
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((no) => {
                      const r = races.find((race) => race.race_number === no);
                      const isRaceClosed = r?.status === 'closed';
                      const isRaceFinished = r?.status === 'finished';

                      return (
                        <button
                          key={no}
                          onClick={() => setSelectedRaceNo(no)}
                          style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc',
                            color: selectedRaceNo === no ? '#ffffff' : '#475569',
                          }}
                        >
                          {no}R {isRaceFinished ? '🏁結果' : isRaceClosed ? '🔒' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {currentRace && (
                  <div style={{ backgroundColor: isFinished ? '#f0fdf4' : '#eff6ff', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: `1px solid ${isFinished ? '#86efac' : '#bfdbfe'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '20px', fontWeight: 'bold', color: isFinished ? '#16a34a' : '#1e3a8a' }}>
                        【{currentRace.race_number}R】{currentRace.title || '特別競走'}
                      </span>
                      <span style={{ marginLeft: '12px', fontSize: '14px', color: '#475569', fontWeight: 'bold' }}>
                        {currentRace.distance_m || 1800}m / {currentRace.track_condition || '良'} / 天候: {currentRace.weather || '晴'}
                      </span>
                    </div>
                    <div>
                      {isFinished ? (
                        <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>🏁 レース結果確定</span>
                      ) : currentRace.status === 'closed' ? (
                        <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>🔒 投票締め切り</span>
                      ) : (
                        <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>🟢 投票受付中</span>
                      )}
                    </div>
                  </div>
                )}

                {!isFinished && (
                  <form onSubmit={handleBuyBet} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div>
                        <label style={labelStyle}>券種を選択</label>
                        <select value={betType} onChange={(e) => setBetType(e.target.value)} style={inputStyle}>
                          {['単勝', '複勝', '馬単', '馬連', 'ワイド', '3連複', '3連単'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label style={labelStyle}>1頭目 (軸馬/1着)</label>
                        <select value={selectedHorse1} onChange={(e) => setSelectedHorse1(e.target.value)} style={inputStyle}>
                          {horses.map((h) => (
                            <option key={h.id} value={h.horse_number}>
                              {h.horse_number}番 {h.name} (オッズ: {h.calculatedOdds || h.manual_odds || 5.0}倍)
                            </option>
                          ))}
                        </select>
                      </div>

                      {['馬単', '馬連', 'ワイド', '3連複', '3連単'].includes(betType) && (
                        <div>
                          <label style={labelStyle}>2頭目 (相手/2着)</label>
                          <select value={selectedHorse2} onChange={(e) => setSelectedHorse2(e.target.value)} style={inputStyle}>
                            {horses.map((h) => (
                              <option key={h.id} value={h.horse_number}>
                                {h.horse_number}番 {h.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {['3連複', '3連単'].includes(betType) && (
                        <div>
                          <label style={labelStyle}>3頭目 (3着)</label>
                          <select value={selectedHorse3} onChange={(e) => setSelectedHorse3(e.target.value)} style={inputStyle}>
                            {horses.map((h) => (
                              <option key={h.id} value={h.horse_number}>
                                {h.horse_number}番 {h.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>賭け金 (G)</label>
                        <input type="number" step="100" min="100" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} style={inputStyle} />
                      </div>
                      <button
                        type="submit"
                        disabled={currentRace?.status === 'closed'}
                        style={{
                          padding: '14px 28px',
                          backgroundColor: currentRace?.status === 'closed' ? '#94a3b8' : '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          fontWeight: 'bold',
                          fontSize: '16px',
                          cursor: currentRace?.status === 'closed' ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {currentRace?.status === 'closed' ? '🔒 投票締切中' : '🎫 馬券を購入する'}
                      </button>
                    </div>
                  </form>
                )}

                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isFinished ? '🏁 レース確定結果順位表' : '📊 出走馬一覧 ＆ リアルタイムオッズ'}
                </h3>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', textAlign: 'left' }}>
                      <th style={{ padding: '12px', textAlign: 'center', width: '70px' }}>{isFinished ? '着順' : '馬番'}</th>
                      <th style={{ padding: '12px', textAlign: 'center', width: '50px' }}>馬番</th>
                      <th>馬名</th>
                      <th>年齢</th>
                      <th>騎手</th>
                      <th style={{ textAlign: 'right', paddingRight: '20px' }}>{isFinished ? '確定オッズ' : '単勝オッズ'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isFinished ? resultHorses : horses).map((h, idx) => {
                      const finishRank = idx + 1;
                      const isRank1 = isFinished && finishRank === 1;
                      const isRank2 = isFinished && finishRank === 2;
                      const isRank3 = isFinished && finishRank === 3;

                      return (
                        <tr
                          key={h.id}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: isRank1 ? '#fefce8' : isRank2 ? '#f8fafc' : isRank3 ? '#fff7ed' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', fontSize: '16px' }}>
                            {isFinished ? (
                              isRank1 ? <span style={{ color: '#ca8a04', fontWeight: '900' }}>🥇 1着</span> :
                              isRank2 ? <span style={{ color: '#475569', fontWeight: '900' }}>🥈 2着</span> :
                              isRank3 ? <span style={{ color: '#c2410c', fontWeight: '900' }}>🥉 3着</span> :
                              `${finishRank}着`
                            ) : (
                              h.horse_number
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{h.horse_number}</td>
                          <td style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '15px' }}>🐎 {h.name}</td>
                          <td>{h.age || 3}歳</td>
                          <td style={{ color: '#2563eb', fontWeight: 'bold' }}>🏇 {h.jockey}</td>
                          <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '900', color: '#dc2626' }}>
                              {h.calculatedOdds || h.manual_odds || 5.0} 倍
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {isFinished && (
                  <div style={{ marginTop: '32px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 16px 0', color: '#16a34a', fontSize: '18px', fontWeight: 'bold' }}>
                      💰 確定 払戻金（配当）一覧
                    </h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#16a34a', color: '#fff', textAlign: 'left' }}>
                          <th style={{ padding: '10px 16px' }}>券種</th>
                          <th>馬番・組み合わせ</th>
                          <th style={{ textAlign: 'right', paddingRight: '16px' }}>払戻金 (100Gあたり)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 'bold' }}>単勝</td>
                          <td style={{ fontWeight: 'bold', color: '#dc2626' }}>{currentRace.first_horse}番</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#16a34a' }}>350 G</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 'bold' }}>馬連</td>
                          <td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} - {currentRace.second_horse}</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#16a34a' }}>850 G</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 'bold' }}>馬単</td>
                          <td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} → {currentRace.second_horse}</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#16a34a' }}>1,500 G</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 'bold' }}>3連複</td>
                          <td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} - {currentRace.second_horse} - {currentRace.third_horse}</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#16a34a' }}>2,200 G</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '10px 16px', fontWeight: 'bold' }}>3連単</td>
                          <td style={{ fontWeight: 'bold', color: '#dc2626' }}>{currentRace.first_horse} → {currentRace.second_horse} → {currentRace.third_horse}</td>
                          <td style={{ textAlign: 'right', paddingRight: '16px', fontWeight: 'bold', color: '#16a34a' }}>6,500 G</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {mainTab === 'history' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>📋 あなたの馬券購入履歴・的中一覧</h3>
                {myBets.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ購入した馬券がありません。
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {myBets.map((b) => {
                      const isClaimed = b.is_claimed;
                      const payout = Number(b.payout_amount || 0);
                      const isWin = isClaimed && payout > 0;
                      const isLose = isClaimed && payout === 0;

                      return (
                        <div
                          key={b.id}
                          style={{
                            backgroundColor: isWin ? '#fefce8' : '#f8fafc',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            border: `2px solid ${isWin ? '#eab308' : isLose ? '#cbd5e1' : '#bfdbfe'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e3a8a' }}>
                              🎫 【{b.bet_type}】 {b.selection}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                              購入額: {Number(b.amount).toLocaleString()} G
                            </div>
                          </div>

                          <div>
                            {!isClaimed ? (
                              <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                ⏳ レース結果確定待ち
                              </span>
                            ) : isWin ? (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '4px 12px', borderRadius: '6px', fontWeight: 'bold', fontSize: '13px' }}>
                                  🎯 的中！
                                </span>
                                <div style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a', marginTop: '4px' }}>
                                  + {payout.toLocaleString()} G
                                </div>
                              </div>
                            ) : (
                              <span style={{ backgroundColor: '#94a3b8', color: '#fff', padding: '6px 14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px' }}>
                                ❌ 不的中
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 📢 アプデ・お知らせ一覧（【修正箇所】whiteSpaceを大文字に修正完了） */}
            {mainTab === 'news' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>📢 運営からのアプデ・お知らせ一覧</h3>
                {newsList.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    現在お知らせはありません。
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {newsList.map((n) => (
                      <div key={n.id} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#1e3a8a' }}>📢 {n.title}</span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{n.date || '本日'}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', marginTop: '8px' }}>
                          {n.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
        backgroundColor: active ? '#1e3a8a' : '#fff',
        color: active ? '#fff' : '#475569',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', width: '100%' };