'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // タブ管理 ('horses' | 'umabashira' | 'race' | 'odds' | 'settle' | 'jockeys' | 'horse_masters' | 'users' | 'inquiries')
  const [adminTab, setAdminTab] = useState<'horses' | 'umabashira' | 'race' | 'odds' | 'settle' | 'jockeys' | 'horse_masters' | 'users' | 'inquiries'>('horses');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(11);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);

  const [addJockeyName, setAddJockeyName] = useState('');
  const [addHorseMasterName, setAddHorseMasterName] = useState('');

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [customPinInput, setCustomPinInput] = useState<string>('');

  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1800);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');

  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(3);
  const [newJockey, setNewJockey] = useState('');
  const [newWeight, setNewWeight] = useState('480kg');
  const [newPopularity, setNewPopularity] = useState(1);
  const [newMark, setNewMark] = useState('◎');
  const [newConditionMark, setNewConditionMark] = useState('S');

  const [firstHorse, setFirstHorse] = useState('');
  const [secondHorse, setSecondHorse] = useState('');
  const [thirdHorse, setThirdHorse] = useState('');

  useEffect(() => { 
    if (isAuthenticated) { 
      fetchRaces(); fetchUsers(); fetchJockeys(); fetchHorseMasters(); fetchInquiries();
    } 
  }, [isAuthenticated]);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find(r => r.race_number === selectedRaceNo);
      if (race) {
        setCurrentRace(race);
        setEditTitle(race.title);
        setEditDistance(race.distance_m || 1800);
        setEditCondition(race.track_condition || '良');
        setEditWeather(race.weather || '晴');
        fetchHorses(race.id);
      }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const target = users.find(u => u.id === selectedUserId);
      if (target) {
        setSelectedUser(target);
        setCustomBalanceInput(target.balance.toString());
        setCustomPinInput(target.pin_code);
      }
    } else { setSelectedUser(null); }
  }, [selectedUserId, users]);

  const fetchRaces = async () => { const { data } = await supabase.from('races').select('*').order('race_number'); if (data) setRaces(data); };
  const fetchHorses = async (raceId: string) => { const { data } = await supabase.from('horses').select('*').eq('race_id', raceId).order('horse_number'); if (data) { setHorses(data); setNewHorseNumber(data.length + 1); } };
  const fetchUsers = async () => { const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false }); if (data) { setUsers(data); if (data.length > 0 && !selectedUserId) setSelectedUserId(data[0].id); } };
  
  const fetchJockeys = async () => { const { data } = await supabase.from('jockeys').select('*').order('created_at'); if (data) { setJockeyList(data); if (data.length > 0 && !newJockey) setNewJockey(data[0].name); } };
  const fetchHorseMasters = async () => { const { data } = await supabase.from('horse_masters').select('*').order('created_at'); if (data) { setHorseMasterList(data); if (data.length > 0 && !newHorseName) setNewHorseName(data[0].name); } };
  const fetchInquiries = async () => { const { data } = await supabase.from('inquiries').select('*').order('created_at', { ascending: false }); if (data) setInquiries(data); };

  const handleAddJockey = async (e: React.FormEvent) => { e.preventDefault(); if (!addJockeyName) return alert('入力してください'); const { error } = await supabase.from('jockeys').insert([{ name: addJockeyName }]); if (error) alert('既に登録されています'); else { setAddJockeyName(''); fetchJockeys(); alert('登録しました！'); } };
  const handleDeleteJockey = async (id: string, name: string) => { if (!confirm(`「${name}」を削除しますか？`)) return; await supabase.from('jockeys').delete().eq('id', id); fetchJockeys(); };

  const handleAddHorseMaster = async (e: React.FormEvent) => { e.preventDefault(); if (!addHorseMasterName) return alert('入力してください'); const { error } = await supabase.from('horse_masters').insert([{ name: addHorseMasterName }]); if (error) alert('既に登録されています'); else { setAddHorseMasterName(''); fetchHorseMasters(); alert('登録しました！'); } };
  const handleDeleteHorseMaster = async (id: string, name: string) => { if (!confirm(`「${name}」を削除しますか？`)) return; await supabase.from('horse_masters').delete().eq('id', id); fetchHorseMasters(); };

  const handleUpdateRaceInfo = async (e: React.FormEvent) => { e.preventDefault(); if (!currentRace) return; await supabase.from('races').update({ title: editTitle, distance_m: editDistance, track_condition: editCondition, weather: editWeather, status: 'open' }).eq('id', currentRace.id); alert('保存しました！'); fetchRaces(); };

  const handleAddHorse = async (e: React.FormEvent) => { e.preventDefault(); if (!currentRace || !newHorseName) return alert('馬名を選択してください'); await supabase.from('horses').insert([{ race_id: currentRace.id, horse_number: newHorseNumber, name: newHorseName, age: newHorseAge, jockey: newJockey, weight: newWeight, popularity: newPopularity, mark: newMark, condition_mark: newConditionMark }]); fetchHorses(currentRace.id); alert('出走馬を追加しました！'); };
  const handleUpdateHorseDetail = async (horseId: string, field: string, value: any) => { await supabase.from('horses').update({ [field]: value }).eq('id', horseId); fetchHorses(currentRace.id); };
  const handleDeleteHorse = async (horseId: string, name: string) => { if (!confirm('削除しますか？')) return; await supabase.from('horses').delete().eq('id', horseId); fetchHorses(currentRace.id); };

  const handleGenerateAIOdds = async () => { if (!confirm('自動設定しますか？')) return; const oddsTable: { [key: number]: number } = { 1: 1.8, 2: 3.2, 3: 5.5, 4: 8.8, 5: 14.2, 6: 22.5, 7: 35.0, 8: 58.0, 9: 84.0, 10: 120.0 }; for (const h of horses) { const pop = h.popularity || 1; const baseOdds = oddsTable[pop] ? oddsTable[pop] : (pop * 15.0); const finalOdds = Math.max(1.1, Number((baseOdds + (Math.random() * 0.4) - 0.2).toFixed(1))); await supabase.from('horses').update({ manual_odds: finalOdds }).eq('id', h.id); } alert('🤖 適用完了！'); fetchHorses(currentRace.id); };

  const handleSettleFullRace = async () => {
    if (!currentRace || !firstHorse) return alert('1着を指定してください');
    if (!confirm(`確定して払戻金を一括振込しますか？`)) return;

    const { data: bets } = await supabase.from('bets').select('*').eq('race_id', currentRace.id);
    if (bets) {
      for (const bet of bets) {
        let isWin = false; let odds = 0; const sel = String(bet.selection);
        if (bet.bet_type === '単勝' && sel === firstHorse) { isWin = true; odds = 2.5; }
        else if (bet.bet_type === '複勝' && (sel === firstHorse || sel === secondHorse || sel === thirdHorse)) { isWin = true; odds = 1.5; }
        else if (bet.bet_type === '馬単') { const [h1, h2] = sel.split('-'); if (h1 === firstHorse && h2 === secondHorse) { isWin = true; odds = 15.0; } }
        else if (bet.bet_type === '馬連') { const [h1, h2] = sel.split('-'); if ((h1 === firstHorse && h2 === secondHorse) || (h1 === secondHorse && h2 === firstHorse)) { isWin = true; odds = 8.5; } }
        else if (bet.bet_type === 'ワイド') {
          const [h1, h2] = sel.split('-');
          const w1 = (h1===firstHorse&&h2===secondHorse)||(h1===secondHorse&&h2===firstHorse);
          const w2 = (h1===firstHorse&&h2===thirdHorse)||(h1===thirdHorse&&h2===firstHorse);
          const w3 = (h1===secondHorse&&h2===thirdHorse)||(h1===thirdHorse&&h2===secondHorse);
          if (w1 || w2 || w3) { isWin = true; odds = 3.0; }
        }
        else if (bet.bet_type === '3連複') { const arr = sel.split('-'); const resultArr = [firstHorse, secondHorse, thirdHorse]; if (arr.every((x: string) => resultArr.indexOf(x) !== -1)) { isWin = true; odds = 15.0; } }
        else if (bet.bet_type === '3連単') { if (sel === `${firstHorse}-${secondHorse}-${thirdHorse}`) { isWin = true; odds = 45.0; } }

        if (isWin) {
          const payout = Math.floor(bet.amount * odds);
          await supabase.from('bets').update({ payout_amount: payout, is_claimed: true }).eq('id', bet.id);
          const { data: u } = await supabase.from('users').select('balance').eq('id', bet.user_id).single();
          if (u) await supabase.from('users').update({ balance: u.balance + payout }).eq('id', bet.user_id);
        } else {
          await supabase.from('bets').update({ payout_amount: 0, is_claimed: true }).eq('id', bet.id);
        }
      }
    }
    await supabase.from('races').update({ status: 'finished', first_horse: firstHorse, second_horse: secondHorse, third_horse: thirdHorse }).eq('id', currentRace.id);
    alert('🏆 結果確定＆振込完了！'); fetchRaces(); fetchUsers();
  };

  const handleAdminLogin = (e: React.FormEvent) => { e.preventDefault(); if (pinInput === '0302') setIsAuthenticated(true); else alert('暗証番号が違います'); };
  const handleSetUserBalance = async () => { if (!selectedUser) return; await supabase.from('users').update({ balance: Number(customBalanceInput) }).eq('id', selectedUser.id); alert('変更しました'); fetchUsers(); };
  const handleUpdateUserPin = async () => { if (!selectedUser) return; await supabase.from('users').update({ pin_code: customPinInput }).eq('id', selectedUser.id); alert('変更しました'); fetchUsers(); };
  const handleDeleteUser = async () => { if (!selectedUser || !confirm('削除しますか？')) return; await supabase.from('users').delete().eq('id', selectedUser.id); alert('削除しました'); setSelectedUserId(''); fetchUsers(); };

  const handleUpdateInquiry = async (id: string, newStatus: string) => {
    await supabase.from('inquiries').update({ status: newStatus }).eq('id', id);
    fetchInquiries();
  };
  const handleDeleteInquiry = async (id: string) => {
    if(!confirm('削除しますか？')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    fetchInquiries();
  };

  if (!isAuthenticated) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '50px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', textAlign: 'center', maxWidth: '400px', width: '100%' }}>
        <h2 style={{ color: '#1e3a8a', margin: '0 0 20px 0', fontSize: '24px', fontWeight: 'bold' }}>🍏 運営管理者ログイン</h2>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="暗証番号を入力" style={{ padding: '16px', fontSize: '20px', textAlign: 'center', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', letterSpacing: '6px' }} />
          <button type="submit" style={{ padding: '16px', backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold', fontSize: '18px', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>ログイン</button>
        </form>
        <div style={{ marginTop: '20px' }}><Link href="/" style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none', fontWeight: 'bold' }}>← ユーザー画面に戻る</Link></div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* 🟦 左サイドバー */}
      <div style={{ width: '250px', backgroundColor: '#1e3a8a', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ padding: '24px 16px', textAlign: 'center', borderBottom: '1px solid #3b82f6' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '900', lineHeight: '1.4' }}>青森県競馬<br/>コントロールセンター</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 8px', gap: '8px', flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '8px' }}>レース管理 (1〜12R)</div>
          <SideButton active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} icon="🐴" text="出走馬追加・編集" />
          <SideButton active={adminTab === 'umabashira'} onClick={() => setAdminTab('umabashira')} icon="📰" text="新・馬柱 記事編集" />
          <SideButton active={adminTab === 'race'} onClick={() => setAdminTab('race')} icon="🛠️" text="レース条件設定" />
          <SideButton active={adminTab === 'odds'} onClick={() => setAdminTab('odds')} icon="📈" text="オッズ管理 (AI)" />
          <SideButton active={adminTab === 'settle'} onClick={() => setAdminTab('settle')} icon="🏆" text="着順確定＆払戻" />

          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '24px' }}>マスター・全体管理</div>
          <SideButton active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} icon="🐎" text="競走馬マスター" />
          <SideButton active={adminTab === 'jockeys'} onClick={() => setAdminTab('jockeys')} icon="🏇" text="騎手マスター" />
          <SideButton active={adminTab === 'users'} onClick={() => setAdminTab('users')} icon="👤" text="プレイヤー管理" />
          <SideButton active={adminTab === 'inquiries'} onClick={() => setAdminTab('inquiries')} icon="📩" text="お問い合わせ対応" />
        </div>

        <div style={{ padding: '16px' }}>
          <Link href="/" style={{ display: 'block', textAlign: 'center', padding: '12px', backgroundColor: 'transparent', border: '1px solid #60a5fa', color: '#bfdbfe', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
            ← ユーザー画面へ
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {['horses', 'umabashira', 'race', 'odds', 'settle'].includes(adminTab) && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>編集するレースを選択 (1〜12R):</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                <button key={no} onClick={() => setSelectedRaceNo(no)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc', color: selectedRaceNo === no ? '#ffffff' : '#475569' }}>
                  {no}R {races.find(r=>r.race_number===no)?.status === 'finished' ? '🏁' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: '1000px' }}>
          
          {/* 📩 TAB: お問い合わせ管理 */}
          {adminTab === 'inquiries' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>
                📩 ユーザーからのバグ報告・お問い合わせ
              </h3>
              
              {inquiries.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>現在届いているお問い合わせはありません。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                  {inquiries.map(inq => (
                    <div key={inq.id} style={{ border: `2px solid ${inq.status === 'resolved' ? '#e2e8f0' : '#fca5a5'}`, borderRadius: '12px', padding: '20px', backgroundColor: inq.status === 'resolved' ? '#f8fafc' : '#fef2f2' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div>
                          <span style={{ backgroundColor: inq.status === 'resolved' ? '#94a3b8' : '#ef4444', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', marginRight: '10px' }}>
                            {inq.status === 'resolved' ? '対応済' : '未対応'}
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>{inq.title}</span>
                        </div>
                        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>👤 {inq.discord_name}</div>
                      </div>
                      
                      <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5', marginBottom: '16px' }}>
                        {inq.content}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        {inq.status === 'unread' ? (
                          <button onClick={() => handleUpdateInquiry(inq.id, 'resolved')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>✅ 対応済みにする</button>
                        ) : (
                          <button onClick={() => handleUpdateInquiry(inq.id, 'unread')} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>↩️ 未対応に戻す</button>
                        )}
                        <button onClick={() => handleDeleteInquiry(inq.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🗑️ 削除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🐴 TAB: 出走馬管理 */}
          {adminTab === 'horses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>➕ 【{selectedRaceNo}R】 出走馬追加</h3>
                {horseMasterList.length === 0 ? <p style={{ color: '#ef4444' }}>先に「競走馬マスター」から馬を登録してください。</p> : (
                  <form onSubmit={handleAddHorse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '70px 1.5fr 80px 1.2fr', gap: '12px' }}>
                      <div><label style={labelStyle}>馬番</label><input type="number" value={newHorseNumber} onChange={e=>setNewHorseNumber(Number(e.target.value))} style={inputStyle} /></div>
                      <div><label style={labelStyle}>馬名</label><select value={newHorseName} onChange={e=>setNewHorseName(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }}>{horseMasterList.map(h => <option key={h.id} value={h.name}>{h.name}</option>)}</select></div>
                      <div><label style={labelStyle}>年齢</label><select value={newHorseAge} onChange={e=>setNewHorseAge(Number(e.target.value))} style={inputStyle}>{[2, 3, 4, 5, 6, 7, 8].map(a => <option key={a} value={a}>{a}歳</option>)}</select></div>
                      <div><label style={labelStyle}>騎手</label><select value={newJockey} onChange={e=>setNewJockey(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#2563eb' }}>{jockeyList.map(j => <option key={j.id} value={j.name}>🏇 {j.name}</option>)}</select></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                      <div><label style={labelStyle}>体重</label><input type="text" value={newWeight} onChange={e=>setNewWeight(e.target.value)} style={inputStyle} /></div>
                      <div><label style={labelStyle}>人気</label><input type="number" min="1" value={newPopularity} onChange={e=>setNewPopularity(Number(e.target.value))} style={inputStyle} /></div>
                      <div><label style={labelStyle}>予想印</label><select value={newMark} onChange={e=>setNewMark(e.target.value)} style={inputStyle}><option value="◎">◎</option><option value="○">○</option><option value="▲">▲</option><option value="△">△</option><option value="☆">☆</option><option value="－">－</option></select></div>
                      <div><label style={labelStyle}>気配</label><select value={newConditionMark} onChange={e=>setNewConditionMark(e.target.value)} style={inputStyle}><option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></div>
                    </div>
                    <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>登録 ➕</button>
                  </form>
                )}
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 出走馬一覧＆編集</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}><th style={{ padding: '12px', width: '40px' }}>番</th><th>馬名</th><th>年齢</th><th>騎手</th><th>体重</th><th>人気</th><th>印</th><th>調子</th><th>操作</th></tr></thead>
                  <tbody>
                    {horses.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{h.horse_number}</td>
                        <td><select value={h.name} onChange={e=>handleUpdateHorseDetail(h.id, 'name', e.target.value)} style={{ ...smallInputStyle, fontWeight: 'bold', color: '#16a34a' }}><option value={h.name}>{h.name}</option>{horseMasterList.map(hm => <option key={hm.id} value={hm.name}>{hm.name}</option>)}</select></td>
                        <td><select value={h.age || 3} onChange={e=>handleUpdateHorseDetail(h.id, 'age', Number(e.target.value))} style={{ ...smallInputStyle, width: '60px' }}>{[2, 3, 4, 5, 6, 7, 8].map(a => <option key={a} value={a}>{a}歳</option>)}</select></td>
                        <td><select value={h.jockey} onChange={e=>handleUpdateHorseDetail(h.id, 'jockey', e.target.value)} style={{ ...smallInputStyle, fontWeight: 'bold', color: '#2563eb' }}><option value={h.jockey}>{h.jockey}</option>{jockeyList.map(j => <option key={j.id} value={j.name}>{j.name}</option>)}</select></td>
                        <td><input type="text" value={h.weight} onChange={e=>handleUpdateHorseDetail(h.id, 'weight', e.target.value)} style={smallInputStyle} /></td>
                        <td><input type="number" value={h.popularity} onChange={e=>handleUpdateHorseDetail(h.id, 'popularity', Number(e.target.value))} style={{ ...smallInputStyle, width: '50px' }} /></td>
                        <td><select value={h.mark} onChange={e=>handleUpdateHorseDetail(h.id, 'mark', e.target.value)} style={smallInputStyle}><option value="◎">◎</option><option value="○">○</option><option value="▲">▲</option><option value="△">△</option><option value="☆">☆</option><option value="－">－</option></select></td>
                        <td><select value={h.condition_mark} onChange={e=>handleUpdateHorseDetail(h.id, 'condition_mark', e.target.value)} style={smallInputStyle}><option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></td>
                        <td><button onClick={()=>handleDeleteHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>削除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 🐎 TAB: 競走馬マスター */}
          {adminTab === 'horse_masters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>🐎 競走馬を新規登録</h3>
                <form onSubmit={handleAddHorseMaster} style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="馬名" value={addHorseMasterName} onChange={e=>setAddHorseMasterName(e.target.value)} style={{...inputStyle, flex: 1}} />
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>登録</button>
                </form>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 登録済み競走馬</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  {horseMasterList.map(hm => (
                    <div key={hm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#16a34a' }}>🐎 {hm.name}</span>
                      <button onClick={()=>handleDeleteHorseMaster(hm.id, hm.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🏇 TAB: 騎手マスター */}
          {adminTab === 'jockeys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
                <h3 style={{ marginTop: 0, color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}>🏇 騎手を新規登録</h3>
                <form onSubmit={handleAddJockey} style={{ display: 'flex', gap: '10px' }}>
                  <input type="text" placeholder="騎手名" value={addJockeyName} onChange={e=>setAddJockeyName(e.target.value)} style={{...inputStyle, flex: 1}} />
                  <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>登録</button>
                </form>
              </div>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 登録済み騎手</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  {jockeyList.map(j => (
                    <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#2563eb' }}>🏇 {j.name}</span>
                      <button onClick={()=>handleDeleteJockey(j.id, j.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 📰 TAB: 馬柱編集 */}
          {adminTab === 'umabashira' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>📰 【{selectedRaceNo}R】 新・馬柱（詳細コメント）入力</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                {horses.map(h => (
                  <div key={h.id} style={{ display: 'flex', gap: '20px', padding: '20px', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#f8fafc' }}>
                    <div style={{ width: '160px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '20px' }}>{h.horse_number}番 ({h.age || 3}歳)</div>
                      <div style={{ color: '#16a34a', fontWeight: 'bold', marginTop: '4px' }}>{h.name}</div>
                      <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold', marginTop: '4px' }}>🏇 {h.jockey}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea value={h.detail_info || ''} onChange={e => handleUpdateHorseDetail(h.id, 'detail_info', e.target.value)} placeholder="記者コメント・血統などを入力" style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', minHeight: '100px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 🛠️ TAB: レース条件 */}
          {adminTab === 'race' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <form onSubmit={handleUpdateRaceInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div><label style={labelStyle}>レース名</label><input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>距離</label><input type="number" step="100" value={editDistance} onChange={e=>setEditDistance(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>コンディション</label><select value={editCondition} onChange={e=>setEditCondition(e.target.value)} style={inputStyle}><option value="良">良</option><option value="稍重">稍重</option><option value="重">重</option><option value="不良">不良</option></select></div>
                  <div><label style={labelStyle}>天候</label><select value={editWeather} onChange={e=>setEditWeather(e.target.value)} style={inputStyle}><option value="晴">晴</option><option value="曇">曇</option><option value="雨">雨</option><option value="雪">雪</option></select></div>
                </div>
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>保存 💾</button>
              </form>
            </div>
          )}

          {/* 📈 TAB: オッズ管理 */}
          {adminTab === 'odds' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>📈 オッズ設定</h2>
                <button onClick={handleGenerateAIOdds} style={{ backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>🤖 AIオッズ自動生成</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '15px' }}>
                <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}><th style={{ padding: '12px' }}>馬番</th><th>馬名</th><th>人気順</th><th>単勝オッズ</th></tr></thead>
                <tbody>
                  {horses.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{h.horse_number}番</td>
                      <td style={{ fontWeight: 'bold', color: '#16a34a' }}>{h.name}</td>
                      <td>{h.popularity}番人気</td>
                      <td><input type="number" step="0.1" value={h.manual_odds || ''} onChange={e=>handleUpdateHorseDetail(h.id, 'manual_odds', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '2px solid #3b82f6', width: '100px', fontWeight: 'bold', textAlign: 'center' }} /> 倍</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 🏆 TAB: 着順確定 */}
          {adminTab === 'settle' && (
            <div style={{ border: '2px solid #2563eb', padding: '32px', borderRadius: '16px', backgroundColor: '#ffffff', maxWidth: '600px' }}>
              <h3 style={{ color: '#1e3a8a', marginTop: 0, fontWeight: 'bold', fontSize: '20px' }}>🏆 着順確定 ＆ 配当自動振込</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div><label style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>🥇 1着</label><select value={firstHorse} onChange={e=>setFirstHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>🥈 2着</label><select value={secondHorse} onChange={e=>setSecondHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: '#ca8a04', fontWeight: 'bold' }}>🥉 3着</label><select value={thirdHorse} onChange={e=>setThirdHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
              </div>
              <button onClick={handleSettleFullRace} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '16px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}>🏁 結果を確定する</button>
            </div>
          )}

          {/* 👤 TAB: プレイヤー管理 */}
          {adminTab === 'users' && (
            <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '28px' }}>
              <h2 style={{ margin: '0 0 20px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>👤 プレイヤー管理</h2>
              <div style={{ marginBottom: '24px' }}><select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff' }}>{users.map(u => (<option key={u.id} value={u.id}>{u.discord_name} ({u.balance.toLocaleString()} G)</option>))}</select></div>
              {selectedUser && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', alignItems: 'end' }}>
                  <div><label style={labelStyle}>所持コイン</label><div style={{ display: 'flex', gap: '8px' }}><input type="number" value={customBalanceInput} onChange={e => setCustomBalanceInput(e.target.value)} style={inputStyle} /><button onClick={handleSetUserBalance} style={{padding:'10px', backgroundColor:'#2563eb', color:'#fff', borderRadius:'6px', border:'none', cursor:'pointer'}}>変更</button></div></div>
                  <div><label style={labelStyle}>PIN</label><div style={{ display: 'flex', gap: '8px' }}><input type="text" value={customPinInput} onChange={e => setCustomPinInput(e.target.value)} style={inputStyle} /><button onClick={handleUpdateUserPin} style={{padding:'10px', backgroundColor:'#0284c7', color:'#fff', borderRadius:'6px', border:'none', cursor:'pointer'}}>更新</button></div></div>
                  <div style={{textAlign: 'right'}}><button onClick={handleDeleteUser} style={{ padding:'12px 20px', backgroundColor:'#dc2626', color:'#fff', borderRadius:'6px', border:'none', cursor:'pointer'}}>削除</button></div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SideButton({ active, onClick, icon, text }: { active: boolean; onClick: () => void; icon: string; text: string }) {
  return (<button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: active ? '#2563eb' : 'transparent', color: active ? '#ffffff' : '#93c5fd', transition: 'all 0.2s' }}><span style={{ fontSize: '18px' }}>{icon}</span> {text}</button>);
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' };
const smallInputStyle = { padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px', width: '100%' };