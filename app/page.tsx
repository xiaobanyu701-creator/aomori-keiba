'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';

const getWakuColor = (number: number) => {
  const colors = [
    { bg: '#ffffff', text: '#0f172a', border: '#cbd5e1' }, { bg: '#1e293b', text: '#ffffff', border: '#0f172a' },
    { bg: '#ef4444', text: '#ffffff', border: '#b91c1c' }, { bg: '#3b82f6', text: '#ffffff', border: '#1d4ed8' },
    { bg: '#eab308', text: '#0f172a', border: '#ca8a04' }, { bg: '#22c55e', text: '#ffffff', border: '#15803d' },
    { bg: '#f97316', text: '#ffffff', border: '#c2410c' }, { bg: '#ec4899', text: '#ffffff', border: '#be185d' },
  ];
  return colors[(number - 1) % colors.length];
};

export default function ProfessionalAomoriKeibaUser() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // ★ タブに 'inquiry' を追加
  const [activeTab, setActiveTab] = useState<'card' | 'umabashira' | 'ranking' | 'betting' | 'history' | 'inquiry'>('card');
  const [betType, setBetType] = useState<'単勝'|'複勝'|'枠連'|'馬連'|'ワイド'|'馬単'|'3連複'|'3連単'>('単勝');
  const [rankingType, setRankingType] = useState<'単勝' | '馬連' | '3連単'>('単勝');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(11);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  
  const [cart, setCart] = useState<Array<{ type: string; selection: string; amount: number }>>([]);
  const [singleBetAmounts, setSingleBetAmounts] = useState<{ [key: string]: string }>({});
  
  const [horseSel1, setHorseSel1] = useState('');
  const [horseSel2, setHorseSel2] = useState('');
  const [horseSel3, setHorseSel3] = useState('');
  const [comboAmount, setComboAmount] = useState('1000');

  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<any[]>([]);

  // 📩 問い合わせフォーム用
  const [inquiryTitle, setInquiryTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');
  const [myInquiries, setMyInquiries] = useState<any[]>([]);

  const totalInvest = myHistory.reduce((sum, b) => sum + b.amount, 0);
  const totalPayout = myHistory.reduce((sum, b) => sum + b.payout_amount, 0);
  const recoveryRate = totalInvest > 0 ? ((totalPayout / totalInvest) * 100).toFixed(1) : '0.0';

  useEffect(() => { fetchRaces(); }, []);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find(r => r.race_number === selectedRaceNo);
      if (race) { setCurrentRace(race); fetchHorses(race.id); }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => { if (currentUser && activeTab === 'history') fetchMyHistory(); }, [activeTab, currentUser]);
  useEffect(() => { if (activeTab === 'ranking' && horses.length > 0) generateRanking(rankingType); }, [activeTab, rankingType, horses]);
  useEffect(() => { if (currentUser && activeTab === 'inquiry') fetchMyInquiries(); }, [activeTab, currentUser]);

  const fetchRaces = async () => { const { data } = await supabase.from('races').select('*').order('race_number'); if (data) setRaces(data); };
  const fetchHorses = async (raceId: string) => { const { data } = await supabase.from('horses').select('*').eq('race_id', raceId).order('horse_number'); if (data) setHorses(data); };
  const fetchMyHistory = async () => { const { data } = await supabase.from('bets').select('*, horses(name, horse_number), races(title)').eq('user_id', currentUser.id).order('created_at', { ascending: false }); if (data) setMyHistory(data); };

  const fetchMyInquiries = async () => {
    const { data } = await supabase.from('inquiries').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (data) setMyInquiries(data);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordInput || !pinInput) return alert('名前とPINコードを入力してください');
    const { data: exUser } = await supabase.from('users').select('*').eq('discord_name', discordInput).maybeSingle();
    if (exUser) {
      if (exUser.pin_code === pinInput) setCurrentUser(exUser); else alert('PINコードが違います');
    } else {
      if (confirm(`「${discordInput}」さんを新規登録しますか？`)) {
        const { data: newUser } = await supabase.from('users').insert([{ discord_name: discordInput, pin_code: pinInput, balance: 1000000 }]).select().single();
        setCurrentUser(newUser); alert('🎉 会員登録完了！ 1,000,000 G 付与！');
      }
    }
  };

  // 📩 問い合わせ送信
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryTitle || !inquiryContent) return alert('件名と内容を入力してください');
    
    await supabase.from('inquiries').insert([{
      user_id: currentUser.id,
      discord_name: currentUser.discord_name,
      title: inquiryTitle,
      content: inquiryContent
    }]);

    alert('✅ 運営にメッセージを送信しました！');
    setInquiryTitle('');
    setInquiryContent('');
    fetchMyInquiries();
  };

  const getTanshoOdds = (h: any) => h.manual_odds ? Number(h.manual_odds) : (h.popularity ? Number((1.5 + h.popularity * 1.8).toFixed(1)) : 2.0);
  const getUmarenOdds = (h1: any, h2: any) => Number((getTanshoOdds(h1) * getTanshoOdds(h2) * 0.5).toFixed(1));
  const getSanrentanOdds = (h1: any, h2: any, h3: any) => {
    if (!h1 || !h2 || !h3 || h1.id===h2.id || h2.id===h3.id || h1.id===h3.id) return 0;
    return Number((getTanshoOdds(h1) * getTanshoOdds(h2) * getTanshoOdds(h3) * 0.4).toFixed(1));
  };

  const generateRanking = (type: string) => {
    let list: any[] = [];
    if (type === '単勝') {
      list = horses.map(h => ({ selection: `${h.horse_number}`, nameStr: h.name, odds: getTanshoOdds(h) }));
    } else if (type === '馬連') {
      for (let i = 0; i < horses.length; i++) {
        for (let j = i + 1; j < horses.length; j++) {
          list.push({ selection: `${horses[i].horse_number}-${horses[j].horse_number}`, nameStr: `${horses[i].name} - ${horses[j].name}`, odds: getUmarenOdds(horses[i], horses[j]) });
        }
      }
    } else if (type === '3連単') {
      for (let i = 0; i < horses.length; i++) {
        for (let j = 0; j < horses.length; j++) {
          for (let k = 0; k < horses.length; k++) {
            if (i !== j && j !== k && i !== k) {
              list.push({ selection: `${horses[i].horse_number}-${horses[j].horse_number}-${horses[k].horse_number}`, nameStr: `${horses[i].name} ➔ ${horses[j].name} ➔ ${horses[k].name}`, odds: getSanrentanOdds(horses[i], horses[j], horses[k]) });
            }
          }
        }
      }
    }
    list.sort((a, b) => a.odds - b.odds);
    setRankingData(list.slice(0, 10));
  };

  const addToCart = (type: string, selection: string, amount: number) => {
    if (!selection || selection.includes('')) return alert('買い目を正しく選択してください');
    const selArr = selection.split('-');
    if (new Set(selArr).size !== selArr.length) return alert('同じ馬が複数選択されています！');
    if (amount <= 0) return alert('金額を入力してください');
    setCart([...cart, { type, selection, amount }]);
  };

  const removeFromCart = (index: number) => setCart(cart.filter((_, i) => i !== index));

  const executeCartBets = async () => {
    const cartTotal = cart.reduce((sum, item) => sum + item.amount, 0);
    if (currentUser.balance < cartTotal) return alert('所持金不足です');
    if (currentRace.status === 'finished') return alert('このレースは受付終了しています');

    for (const item of cart) {
      await supabase.from('bets').insert([{ user_id: currentUser.id, race_id: currentRace.id, bet_type: item.type, selection: item.selection, amount: item.amount, claim_code: 'AOMORI' }]);
    }
    const newBal = currentUser.balance - cartTotal;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);
    setCurrentUser({ ...currentUser, balance: newBal });
    setCart([]); alert('✅ 投票が完了しました！健闘を祈ります！');
  };

  const isSingle = betType === '単勝' || betType === '複勝';
  const isDouble = betType === '馬連' || betType === 'ワイド' || betType === '馬単';
  const isTriple = betType === '3連複' || betType === '3連単';

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      <header style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ backgroundColor: '#ffffff', color: '#1e3a8a', padding: '6px 16px', fontWeight: '900', borderRadius: '30px' }}>🍏 青森県競馬</span>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#93c5fd' }}>公式IPAT投票</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {currentUser ? (
            <div style={{ backgroundColor: '#172554', padding: '8px 20px', borderRadius: '25px', display: 'flex', gap: '16px', border: '1px solid #3b82f6' }}>
              <span>👤 {currentUser.discord_name}</span>
              <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{currentUser.balance.toLocaleString()} G</span>
            </div>
          ) : <span style={{ color: '#93c5fd', fontSize: '14px' }}>未ログイン</span>}
          <Link href="/admin" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px', border: '1px solid #60a5fa' }}>⚙️ 運営管理↗</Link>
        </div>
      </header>

      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        
        {!currentUser ? (
          <div style={{ backgroundColor: '#fff', padding: '50px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', margin: '50px auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏇</div>
            <h2 style={{ color: '#1e3a8a', margin: '0 0 10px 0' }}>青森県競馬 ログイン</h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
              <input type="text" placeholder="Discordユーザー名" value={discordInput} onChange={e=>setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', border: 'none', cursor: 'pointer' }}>ログイン / 会員登録</button>
            </form>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '20px' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                <button key={no} onClick={() => setSelectedRaceNo(no)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedRaceNo === no ? '#2563eb' : '#fff', color: selectedRaceNo === no ? '#fff' : '#475569' }}>
                  {no}R
                </button>
              ))}
            </div>

            {currentRace && (
              <div style={{ backgroundColor: '#fff', padding: '20px 24px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ backgroundColor: currentRace.status === 'finished' ? '#64748b' : '#2563eb', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold' }}>{currentRace.race_number}R</span>
                <h2 style={{ margin: 0, fontSize: '24px' }}>{currentRace.title}</h2>
                {currentRace.status === 'finished' && <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>受付終了 / 確定済</span>}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0' }}>
                
                {/* ★ 問い合わせタブを追加 */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
                  <TabBtn active={activeTab==='card'} onClick={()=>setActiveTab('card')} text="📋 出馬表" />
                  <TabBtn active={activeTab==='umabashira'} onClick={()=>setActiveTab('umabashira')} text="📰 新・馬柱" />
                  <TabBtn active={activeTab==='ranking'} onClick={()=>setActiveTab('ranking')} text="📈 人気オッズ" />
                  <TabBtn active={activeTab==='betting'} onClick={()=>setActiveTab('betting')} text="🎟️ 投票マークシート" />
                  <TabBtn active={activeTab==='history'} onClick={()=>setActiveTab('history')} text="📊 成績・履歴" />
                  <TabBtn active={activeTab==='inquiry'} onClick={()=>setActiveTab('inquiry')} text="💬 問い合わせ" />
                </div>

                {activeTab === 'card' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                    <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '14px' }}><th style={{padding:'12px'}}>印</th><th>枠番</th><th style={{textAlign:'left'}}>馬名 / 年齢</th><th style={{textAlign:'left'}}>騎手</th><th>人気</th><th>気配</th><th>単勝オッズ</th></tr></thead>
                    <tbody>
                      {horses.map(h => {
                        const waku = getWakuColor(h.horse_number);
                        return (
                          <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>{h.mark || '－'}</td>
                            <td><div style={{ backgroundColor: waku.bg, color: waku.text, width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: `2px solid ${waku.border}` }}>{h.horse_number}</div></td>
                            <td style={{ textAlign: 'left', padding: '12px' }}><span style={{fontWeight: 'bold', fontSize: '16px'}}>{h.name}</span><span style={{fontSize:'12px', color:'#64748b', marginLeft:'6px'}}>({h.age || 3}歳)</span></td>
                            <td style={{ textAlign: 'left', color: '#2563eb', fontWeight: 'bold' }}>🏇 {h.jockey}</td>
                            <td><span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{h.popularity}人気</span></td>
                            <td style={{ fontWeight: 'bold', color: h.condition_mark === 'S' ? '#dc2626' : '#475569' }}>{h.condition_mark}</td>
                            <td style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>{getTanshoOdds(h).toFixed(1)} 倍</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {activeTab === 'umabashira' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1e3a8a' }}>📰 専門紙風 新・馬柱（詳細・記者短評）</h3>
                    {horses.map(h => {
                      const waku = getWakuColor(h.horse_number);
                      return (
                        <div key={h.id} style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ backgroundColor: waku.bg, color: waku.text, width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #cbd5e1', fontWeight: 'bold' }}><div style={{ fontSize: '12px', opacity: 0.8 }}>馬番</div><div style={{ fontSize: '28px' }}>{h.horse_number}</div></div>
                          <div style={{ padding: '16px', borderRight: '1px solid #e2e8f0', minWidth: '170px', backgroundColor: '#f8fafc' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}><span style={{ color: '#dc2626', fontWeight: '900', fontSize: '22px' }}>{h.mark || '－'}</span><span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{h.name}</span></div><div style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', marginBottom: '4px' }}>馬齢: {h.age || 3}歳</div><div style={{ color: '#2563eb', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>🏇 {h.jockey}</div><div style={{ color: '#64748b', fontSize: '12px' }}>馬体重: {h.weight}</div></div>
                          <div style={{ padding: '16px', flex: 1, whiteSpace: 'pre-wrap', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>{h.detail_info || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>詳細なコメント情報はありません。</span>}</div>
                          <div style={{ padding: '16px', width: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#eff6ff', borderLeft: '1px solid #bfdbfe' }}><div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 'bold' }}>単勝</div><div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '22px' }}>{getTanshoOdds(h).toFixed(1)}</div></div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'ranking' && (
                  <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      {(['単勝', '馬連', '3連単'] as const).map(t => (
                        <button key={t} onClick={() => setRankingType(t)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: rankingType === t ? '#2563eb' : '#fff', color: rankingType === t ? '#fff' : '#475569', fontWeight: 'bold', cursor: 'pointer' }}>{t}</button>
                      ))}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '14px', color: '#475569' }}><th style={{padding:'10px'}}>順位</th><th>買い目</th><th>詳細</th><th>オッズ</th></tr></thead>
                      <tbody>
                        {rankingData.map((data, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>{index + 1}番人気</td>
                            <td style={{ fontWeight: 'bold', fontSize: '18px', color: '#2563eb' }}>{data.selection}</td>
                            <td style={{ color: '#475569', fontSize: '14px' }}>{data.nameStr}</td>
                            <td style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>{data.odds.toFixed(1)} 倍</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'betting' && currentRace && currentRace.status !== 'finished' && (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                      {(['単勝','複勝','枠連','馬連','ワイド','馬単','3連複','3連単'] as const).map(type => (
                        <button key={type} onClick={()=>setBetType(type)} style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: betType===type?'#2563eb':'#f1f5f9', color: betType===type?'#fff':'#475569' }}>{type}</button>
                      ))}
                    </div>

                    {isSingle && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {horses.map(h => (
                          <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{h.horse_number}番 {h.name} ({h.age || 3}歳) - 🏇 {h.jockey}</span>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <input type="number" placeholder="金額(G)" value={singleBetAmounts[h.horse_number] || ''} onChange={e=>setSingleBetAmounts({...singleBetAmounts, [h.horse_number]: e.target.value})} style={{ width: '100px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', textAlign: 'right' }} />
                              <button onClick={()=>addToCart(betType, h.horse_number.toString(), Number(singleBetAmounts[h.horse_number]))} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>追加</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(isDouble || isTriple) && (
                      <div style={{ backgroundColor: '#eff6ff', padding: '30px', borderRadius: '12px', border: '2px dashed #93c5fd', textAlign: 'center' }}>
                        <h3 style={{ color: '#1e40af', marginTop: 0 }}>【{betType}】 フォーメーション</h3>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0' }}>
                          <select value={horseSel1} onChange={e=>setHorseSel1(e.target.value)} style={selectStyle}><option value="">1頭目</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select>
                          <span style={{ fontSize: '20px', alignSelf: 'center', fontWeight: 'bold', color: '#1e40af' }}>-</span>
                          <select value={horseSel2} onChange={e=>setHorseSel2(e.target.value)} style={selectStyle}><option value="">2頭目</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select>
                          {isTriple && (
                            <>
                              <span style={{ fontSize: '20px', alignSelf: 'center', fontWeight: 'bold', color: '#1e40af' }}>-</span>
                              <select value={horseSel3} onChange={e=>setHorseSel3(e.target.value)} style={selectStyle}><option value="">3頭目</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select>
                            </>
                          )}
                        </div>
                        <div style={{ marginBottom: '20px', fontWeight: 'bold', color: '#1e40af' }}>金額: <input type="number" value={comboAmount} onChange={e=>setComboAmount(e.target.value)} style={{ width: '120px', padding: '8px', borderRadius: '8px', border: '1px solid #93c5fd', textAlign: 'right', fontSize: '16px' }} /> G</div>
                        <button onClick={() => {
                          const sel = isDouble ? `${horseSel1}-${horseSel2}` : `${horseSel1}-${horseSel2}-${horseSel3}`;
                          addToCart(betType, sel, Number(comboAmount));
                        }} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px 36px', borderRadius: '25px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>カートに追加 🛒</button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'betting' && currentRace && currentRace.status === 'finished' && (
                  <div style={{ backgroundColor: '#fef2f2', padding: '30px', borderRadius: '12px', border: '2px solid #ef4444', textAlign: 'center' }}>
                    <h2 style={{ color: '#dc2626', margin: '0 0 10px 0', fontSize: '28px' }}>🏁 レース結果 (確定)</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                      <div style={{ backgroundColor: '#fff', border: '2px solid #fca5a5', padding: '15px 30px', borderRadius: '12px' }}><div style={{ color: '#dc2626', fontWeight: 'bold' }}>🥇 1着</div><div style={{ fontSize: '32px', fontWeight: '900' }}>{currentRace.first_horse || '－'}</div></div>
                      <div style={{ backgroundColor: '#fff', border: '2px solid #93c5fd', padding: '15px 30px', borderRadius: '12px' }}><div style={{ color: '#2563eb', fontWeight: 'bold' }}>🥈 2着</div><div style={{ fontSize: '32px', fontWeight: '900' }}>{currentRace.second_horse || '－'}</div></div>
                      <div style={{ backgroundColor: '#fff', border: '2px solid #fde047', padding: '15px 30px', borderRadius: '12px' }}><div style={{ color: '#ca8a04', fontWeight: 'bold' }}>🥉 3着</div><div style={{ fontSize: '32px', fontWeight: '900' }}>{currentRace.third_horse || '－'}</div></div>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                  <div>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                      <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>総投資額</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalInvest.toLocaleString()} G</div></div>
                      <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center' }}><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>総払戻額</div><div style={{ fontSize: '20px', fontWeight: 'bold', color: '#16a34a' }}>{totalPayout.toLocaleString()} G</div></div>
                      <div style={{ flex: 1, backgroundColor: Number(recoveryRate) >= 100 ? '#fef2f2' : '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe', textAlign: 'center' }}><div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>回収率</div><div style={{ fontSize: '24px', fontWeight: '900', color: '#2563eb' }}>{recoveryRate} %</div></div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', fontSize: '14px', color: '#475569' }}><th style={{padding:'10px'}}>レース</th><th>券種</th><th>買い目</th><th>購入額</th><th>結果</th></tr></thead>
                      <tbody>
                        {myHistory.map(b => (
                          <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{b.races?.title}</td>
                            <td style={{ fontWeight: 'bold', color: '#2563eb' }}>{b.bet_type}</td>
                            <td style={{ fontWeight: 'bold' }}>{b.selection}</td>
                            <td>{b.amount.toLocaleString()} G</td>
                            <td style={{ fontWeight: 'bold' }}>{b.is_claimed ? (b.payout_amount > 0 ? <span style={{ color: '#16a34a' }}>🎯 +{b.payout_amount.toLocaleString()} G</span> : <span style={{ color: '#94a3b8' }}>不的中</span>) : <span style={{ color: '#eab308' }}>⏳ 待ち</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ==================== 💬 TAB: 問い合わせ (NEW) ==================== */}
                {activeTab === 'inquiry' && (
                  <div>
                    <div style={{ backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                      <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a' }}>📩 運営へのバグ報告・ご要望</h3>
                      <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
                        サイトのバグ、機能の追加要望、所持コインに関するトラブルなどがあれば、ここから運営へ直接メッセージを送ることができます。
                      </p>
                      <form onSubmit={handleSubmitInquiry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                          <label style={labelStyle}>件名 / カテゴリ</label>
                          <input type="text" placeholder="例: オッズ計算のバグについて" value={inquiryTitle} onChange={e=>setInquiryTitle(e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>お問い合わせ内容</label>
                          <textarea 
                            placeholder="具体的な内容を記載してください。" 
                            value={inquiryContent} 
                            onChange={e=>setInquiryContent(e.target.value)} 
                            style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} 
                          />
                        </div>
                        <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                          メッセージを送信 🚀
                        </button>
                      </form>
                    </div>

                    <h4 style={{ color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>📝 過去の送信履歴</h4>
                    {myInquiries.length === 0 ? (
                      <p style={{ color: '#64748b' }}>送信履歴はありません。</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {myInquiries.map(inq => (
                          <div key={inq.id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{inq.title}</span>
                              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff', backgroundColor: inq.status === 'resolved' ? '#16a34a' : '#ef4444', padding: '2px 8px', borderRadius: '6px' }}>
                                {inq.status === 'resolved' ? '✅ 対応済' : '⏳ 運営確認中'}
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#475569', whiteSpace: 'pre-wrap' }}>{inq.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>

              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 'fit-content' }}>
                <div>
                  <h3 style={{ margin: '0 0 16px 0', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', color: '#1e3a8a' }}>🛒 発券カート</h3>
                  <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px' }}>
                    {cart.map((item, index) => (
                      <div key={index} style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                        <div><span style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '12px', marginRight: '6px' }}>[{item.type}]</span><strong style={{ fontSize: '15px' }}>{item.selection}</strong></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold' }}>{item.amount.toLocaleString()}G</span> 
                          <button onClick={() => removeFromCart(index)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #f1f5f9' }}>
                  <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>合計金額</div>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb', marginBottom: '16px' }}>{cart.reduce((sum, item) => sum + item.amount, 0).toLocaleString()} G</div>
                  <button onClick={executeCartBets} disabled={cart.length === 0 || currentRace?.status === 'finished'} style={{ width: '100%', backgroundColor: cart.length > 0 ? '#16a34a' : '#94a3b8', color: '#fff', border: 'none', padding: '16px', borderRadius: '10px', fontWeight: 'bold', fontSize: '18px', cursor: cart.length > 0 ? 'pointer' : 'not-allowed' }}>まとめて投票確定 🚀</button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) {
  return <button onClick={onClick} style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: active ? '#2563eb' : '#fff', color: active ? '#fff' : '#475569' }}>{text}</button>;
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '16px', width: '100%' };
const selectStyle = { padding: '12px', borderRadius: '10px', border: '1px solid #93c5fd', fontSize: '16px' };