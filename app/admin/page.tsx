'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<'horses' | 'race' | 'odds' | 'settle' | 'stats' | 'jockeys' | 'horse_masters' | 'owner_assign' | 'users'>('users');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);

  const [addJockeyName, setAddJockeyName] = useState('');
  const [addHorseMasterName, setAddHorseMasterName] = useState('');
  const [addHorseMasterOwner, setAddHorseMasterOwner] = useState('');

  const [assignTargetHorseId, setAssignTargetHorseId] = useState<string>('');
  const [assignTargetOwnerName, setAssignTargetOwnerName] = useState<string>('');

  // 👤 プレイヤー管理用ステート
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [amountToAddInput, setAmountToAddInput] = useState<number>(1000000);
  const [customPinInput, setCustomPinInput] = useState<string>('');

  // レース設定用
  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1600);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');
  const [editPrize, setEditPrize] = useState(1000000);

  // 出走馬追加用
  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(2);
  const [newJockey, setNewJockey] = useState('');
  const [newWeight, setNewWeight] = useState('480kg');
  const [newPopularity, setNewPopularity] = useState(1);
  const [newMark, setNewMark] = useState('◎');
  const [newConditionMark, setNewConditionMark] = useState('S');

  // 着順確定用
  const [firstHorse, setFirstHorse] = useState('');
  const [secondHorse, setSecondHorse] = useState('');
  const [thirdHorse, setThirdHorse] = useState('');

  // 生産確率コントロール用
  const [probSS, setProbSS] = useState(5);
  const [probS, setProbS] = useState(15);
  const [probA, setProbA] = useState(20);
  const [probB, setProbB] = useState(30);

  useEffect(() => { 
    if (isAuthenticated) { 
      fetchRaces(); fetchUsers(); fetchJockeys(); fetchHorseMasters();
    } 
  }, [isAuthenticated]);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find(r => r.race_number === selectedRaceNo);
      if (race) {
        setCurrentRace(race);
        setEditTitle(race.title || '');
        setEditDistance(race.distance_m || 1600);
        setEditCondition(race.track_condition || '良');
        setEditWeather(race.weather || '晴');
        setEditPrize(race.prize || 1000000);
        fetchHorses(race.id);
      }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const target = users.find(u => u.id === selectedUserId);
      if (target) {
        setSelectedUser(target);
        setCustomBalanceInput((target.balance || 0).toString());
        setCustomPinInput(target.pin_code || '');
      }
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, users]);

  const fetchRaces = async () => {
    const { data } = await supabase.from('races').select('*');
    if (data) setRaces([...data].sort((a, b) => (a.race_number || 0) - (b.race_number || 0)));
  };

  const fetchHorses = async (raceId: string) => {
    const { data } = await supabase.from('horses').select('*').eq('race_id', raceId);
    if (data) {
      const sorted = [...data].sort((a, b) => (a.horse_number || 0) - (b.horse_number || 0));
      setHorses(sorted);
      setNewHorseNumber(sorted.length + 1);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) {
      const reversed = [...data].reverse();
      setUsers(reversed);
      if (reversed.length > 0 && !selectedUserId) setSelectedUserId(reversed[0].id);
      if (reversed.length > 0 && !assignTargetOwnerName) setAssignTargetOwnerName(reversed[0].discord_name);
    }
  };
  
  const fetchJockeys = async () => {
    const { data } = await supabase.from('jockeys').select('*');
    if (data) {
      setJockeyList(data);
      if (data.length > 0 && !newJockey) setNewJockey(data[0].name);
    }
  };

  const fetchHorseMasters = async () => {
    const { data } = await supabase.from('horse_masters').select('*');
    if (data) {
      setHorseMasterList(data);
      if (data.length > 0 && !newHorseName) setNewHorseName(data[0].name);
      if (data.length > 0 && !assignTargetHorseId) setAssignTargetHorseId(data[0].id);
    }
  };

  // 🔒 締め切り切替
  const handleToggleRaceStatus = async (newStatus: 'open' | 'closed') => {
    if (!currentRace) return;
    await supabase.from('races').update({ status: newStatus }).eq('id', currentRace.id);
    alert(`【${selectedRaceNo}R】のステータスを「${newStatus === 'closed' ? '🔒 締め切り' : '🟢 投票受付中'}」に変更しました！`);
    fetchRaces();
  };

  // 💰 所持コイン変更＆加算
  const handleSetUserBalance = async () => {
    if (!selectedUser) return;
    const newBal = Number(customBalanceInput);
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`💰 「${selectedUser.discord_name}」様の残高を ${newBal.toLocaleString()} G に変更しました！`);
    fetchUsers();
  };

  const handleAddUserBalance = async (amount: number) => {
    if (!selectedUser) return;
    const currentBal = selectedUser.balance || 0;
    const newBal = currentBal + amount;
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`🎉 「${selectedUser.discord_name}」様に ${amount.toLocaleString()} G を追加しました！`);
    fetchUsers();
  };

  const handleUpdateUserPin = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ pin_code: customPinInput }).eq('id', selectedUser.id);
    alert(`🔑 「${selectedUser.discord_name}」様のPINコードを更新しました！`);
    fetchUsers();
  };

  const handleDeleteUser = async (userId?: string, userName?: string) => {
    const targetId = userId || selectedUser?.id;
    const targetName = userName || selectedUser?.discord_name;
    if (!targetId) return;
    if (!confirm(`⚠️ 本当に「${targetName}」様のアカウントを削除しますか？`)) return;

    await supabase.from('users').delete().eq('id', targetId);
    alert(`🗑️ 「${targetName}」様を削除しました。`);
    if (targetId === selectedUserId) setSelectedUserId('');
    fetchUsers();
  };

  // 🤝 馬と馬主の紐づけ
  const handleAssignOwnerToHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetHorseId || !assignTargetOwnerName) return alert('選択してください');

    const targetHorse = horseMasterList.find(h => h.id === assignTargetHorseId);
    if (!targetHorse) return;

    await supabase.from('horse_masters').update({ owner_name: assignTargetOwnerName }).eq('id', assignTargetHorseId);
    alert(`🎉 「${targetHorse.name}」の馬主を【${assignTargetOwnerName}】様に紐づけ変更しました！`);
    fetchHorseMasters();
  };

  // 🐎 競走馬マスター関連
  const handleAddHorseMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addHorseMasterName) return alert('馬名を入力してください');
    await supabase.from('horse_masters').insert([{ name: addHorseMasterName, owner_name: addHorseMasterOwner || '運営直営', status: '現役' }]);
    setAddHorseMasterName(''); setAddHorseMasterOwner(''); fetchHorseMasters(); alert('登録しました！');
  };

  const handleDeleteHorseMaster = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await supabase.from('horse_masters').delete().eq('id', id);
    fetchHorseMasters();
  };

  const handleToggleRestingStatus = async (horseId: string, currentStatus: string) => {
    let nextStatus = currentStatus === '放牧中' ? '現役' : '放牧中';
    await supabase.from('horse_masters').update({ status: nextStatus }).eq('id', horseId);
    alert(`🔄 ステータスを「${nextStatus}」に変更しました！`);
    fetchHorseMasters();
  };

  const handleConfirmRetire = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」を正式に引退させますか？`)) return;
    await supabase.from('horse_masters').update({ status: '引退' }).eq('id', horseId);
    alert(`🏁 「${horseName}」を引退処理しました。`);
    fetchHorseMasters();
  };

  // 🛠️ レース条件保存
  const handleUpdateRaceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace) return;
    await supabase.from('races').update({ title: editTitle, distance_m: editDistance, track_condition: editCondition, weather: editWeather, prize: editPrize }).eq('id', currentRace.id);
    alert('保存しました！'); fetchRaces();
  };

  // 🐴 出走馬追加
  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace || !newHorseName) return alert('馬名を選択してください');

    await supabase.from('horses').insert([{
      race_id: currentRace.id, horse_number: newHorseNumber, name: newHorseName, age: newHorseAge, jockey: newJockey, weight: newWeight, popularity: newPopularity, mark: newMark, condition_mark: newConditionMark
    }]);
    await supabase.from('horse_masters').update({ status: `出走(${selectedRaceNo}R)` }).eq('name', newHorseName);
    fetchHorses(currentRace.id); fetchHorseMasters(); alert(`🎉 出走登録しました！`);
  };

  const handleDeleteHorse = async (horseId: string, name: string) => {
    if (!confirm('削除しますか？')) return;
    await supabase.from('horses').delete().eq('id', horseId);
    fetchHorses(currentRace.id);
  };

  // 📈 AIオッズ
  const handleGenerateAIOdds = async () => {
    if (!confirm('自動設定しますか？')) return;
    const oddsTable: { [key: number]: number } = { 1: 1.8, 2: 3.2, 3: 5.5, 4: 8.8, 5: 14.2, 6: 22.5, 7: 35.0, 8: 58.0, 9: 84.0, 10: 120.0 };
    for (const h of horses) {
      const pop = h.popularity || 1;
      const baseOdds = oddsTable[pop] ? oddsTable[pop] : (pop * 15.0);
      const finalOdds = Math.max(1.1, Number((baseOdds + (Math.random() * 0.4) - 0.2).toFixed(1)));
      await supabase.from('horses').update({ manual_odds: finalOdds }).eq('id', h.id);
    }
    alert('🤖 適用完了！'); fetchHorses(currentRace.id);
  };

  const handleUpdateHorseDetail = async (horseId: string, field: string, value: any) => {
    await supabase.from('horses').update({ [field]: value }).eq('id', horseId);
    fetchHorses(currentRace.id);
  };

  // 🏆 着順確定 ＆ 配当 ＆ 馬主10%手当
  const handleSettleFullRace = async () => {
    if (!currentRace || !firstHorse) return alert('1着を指定してください');
    if (!confirm(`【${selectedRaceNo}R】の結果を確定して一括自動振込を行いますか？`)) return;

    // 1着馬主特定＆10%手当支給
    const winningHorseObj = horses.find(h => String(h.horse_number) === String(firstHorse));
    if (winningHorseObj) {
      const { data: masterHorse } = await supabase.from('horse_masters').select('*').eq('name', winningHorseObj.name);
      if (masterHorse && masterHorse.length > 0) {
        const ownerName = masterHorse[0].owner_name;
        if (ownerName) {
          const prizeMoney = currentRace.prize || 1000000;
          const ownerReward = Math.floor(prizeMoney * 0.10);
          const { data: ownerUser } = await supabase.from('users').select('*').eq('discord_name', ownerName);
          if (ownerUser && ownerUser.length > 0) {
            const newOwnerBal = (ownerUser[0].balance || 0) + ownerReward;
            await supabase.from('users').update({ balance: newOwnerBal }).eq('id', ownerUser[0].id);
            alert(`🎉 1着馬「${winningHorseObj.name}」の馬主【${ownerName}】様に 10%手当 (${ownerReward.toLocaleString()} G) を加算しました！`);
          }
        }
      }
    }

    await supabase.from('races').update({ status: 'finished', first_horse: firstHorse, second_horse: secondHorse, third_horse: thirdHorse }).eq('id', currentRace.id);
    alert(`🏆 【${selectedRaceNo}R】の結果確定・振込が完了しました！`); 
    fetchRaces(); fetchUsers(); fetchHorseMasters();
  };

  const handleSaveBreedingProbs = () => {
    const probConfig = { SS: probSS, S: probS, A: probA, B: probB, C: 100 - (probSS + probS + probA + probB) };
    localStorage.setItem('breeding_probs', JSON.stringify(probConfig));
    alert('🎲 ガチャ生産の出現確率設定を保存しました！');
  };

  const handleAdminLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (pinInput === '0302') setIsAuthenticated(true); 
    else alert('暗証番号が違います'); 
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

  const activeHorseMasters = horseMasterList.filter(h => h.status !== '引退');

  const allBets = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('all_user_bets') || '[]') : [];
  const raceStats = Array.from({ length: 12 }, (_, i) => {
    const raceNo = i + 1;
    const rBets = allBets.filter((b: any) => Number(b.race_number) === raceNo);
    const totalSales = rBets.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    const inflationRate = totalSales > 0 ? ((totalSales / 100000) * 1.5).toFixed(1) : '1.0';
    return { raceNo, totalSales, inflationRate: Number(inflationRate) };
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* 🟦 左サイドバー */}
      <div style={{ width: '250px', backgroundColor: '#1e3a8a', display: 'flex', flexDirection: 'column', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ padding: '24px 16px', textAlign: 'center', borderBottom: '1px solid #3b82f6' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚙️</div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '900', lineHeight: '1.4' }}>青森県競馬<br/>コントロールセンター</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: '16px 8px', gap: '8px', flex: 1 }}>
          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '8px' }}>マスター・全体管理</div>
          <SideButton active={adminTab === 'users'} onClick={() => setAdminTab('users')} icon="👤" text="プレイヤー管理 (お金/削除)" />
          <SideButton active={adminTab === 'owner_assign'} onClick={() => setAdminTab('owner_assign')} icon="🤝" text="馬主＆馬 紐づけ管理" />
          <SideButton active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} icon="🐎" text="現役競走馬マスター" />
          <SideButton active={adminTab === 'stats'} onClick={() => setAdminTab('stats')} icon="📊" text="売上・インフレ率グラフ" />

          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '24px' }}>レース管理 (1〜12R)</div>
          <SideButton active={adminTab === 'race'} onClick={() => setAdminTab('race')} icon="🛠️" text="レース条件設定 / 締切" />
          <SideButton active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} icon="🐴" text="出走馬追加・編集" />
          <SideButton active={adminTab === 'odds'} onClick={() => setAdminTab('odds')} icon="📈" text="オッズ管理 (AI)" />
          <SideButton active={adminTab === 'settle'} onClick={() => setAdminTab('settle')} icon="🏆" text="着順確定＆自動振込" />
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Link href="/owner" style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: '#16a34a', color: '#ffffff', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
            🐴 馬主ラウンジ ↗
          </Link>
          <Link href="/" style={{ display: 'block', textAlign: 'center', padding: '10px', backgroundColor: 'transparent', border: '1px solid #60a5fa', color: '#bfdbfe', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', fontSize: '13px' }}>
            🎫 IPAT投票画面 ↗
          </Link>
        </div>
      </div>

      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {['horses', 'race', 'odds', 'settle'].includes(adminTab) && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>編集するレースを選択 (1〜12R):</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                <button key={no} onClick={() => setSelectedRaceNo(no)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc', color: selectedRaceNo === no ? '#ffffff' : '#475569' }}>
                  {no}R {races.find(r=>r.race_number===no)?.status === 'closed' ? '🔒' : races.find(r=>r.race_number===no)?.status === 'finished' ? '🏁' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: '1000px' }}>
          
          {/* 👤 TAB: プレイヤー管理 */}
          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '28px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>👤 プレイヤー設定・お金追加・アカウント削除</h2>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>① 操作するプレイヤーを選択してください</label>
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '2px solid #2563eb', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff', width: '100%' }}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.discord_name} （残高: {(u.balance || 0).toLocaleString()} G / PIN: {u.pin_code || '未設定'}）
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#16a34a', fontSize: '16px' }}>💰 所持コインを追加・付与する（加算）</h4>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="number" step="100000" value={amountToAddInput} onChange={e => setAmountToAddInput(Number(e.target.value))} style={{ ...inputStyle, width: '200px', fontSize: '16px', fontWeight: 'bold' }} />
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>G を</span>
                        <button onClick={() => handleAddUserBalance(amountToAddInput)} style={{ padding: '12px 20px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>➕ プラス追加（加算）</button>
                        <button onClick={() => handleAddUserBalance(-amountToAddInput)} style={{ padding: '12px 20px', backgroundColor: '#ca8a04', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>➖ マイナス引き落とし</button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {[1000000, 5000000, 10000000, 50000000].map(val => (
                          <button key={val} onClick={() => handleAddUserBalance(val)} style={{ padding: '6px 12px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                            +{(val / 10000).toLocaleString()}万円
                          </button>
                        ))}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '20px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>所持コイン（直接上書き）</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" value={customBalanceInput} onChange={e => setCustomBalanceInput(e.target.value)} style={inputStyle} />
                          <button onClick={handleSetUserBalance} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>設定</button>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>暗証番号 (PIN 4桁)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" maxLength={4} value={customPinInput} onChange={e => setCustomPinInput(e.target.value)} style={{ ...inputStyle, textAlign: 'center', letterSpacing: '4px' }} />
                          <button onClick={handleUpdateUserPin} style={{ padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>更新</button>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button onClick={() => handleDeleteUser()} style={{ width: '100%', padding: '12px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🗑️ 削除</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>📋 全登録プレイヤー一覧 ({users.length}名)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ backgroundColor: selectedUserId === u.id ? '#eff6ff' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `2px solid ${selectedUserId === u.id ? '#2563eb' : '#e2e8f0'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>👤 {u.discord_name}</span>
                        <button onClick={() => setSelectedUserId(u.id)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>選択・編集</button>
                      </div>
                      <div style={{ fontSize: '14px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>所持コイン: <strong style={{ color: '#16a34a' }}>{(u.balance || 0).toLocaleString()} G</strong></div>
                        <div>暗証番号: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.pin_code || '未設定'}</span></div>
                      </div>
                      <button onClick={() => handleDeleteUser(u.id, u.discord_name)} style={{ marginTop: '12px', width: '100%', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>🗑️ このユーザーを削除</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🛠️ TAB: レース条件 ＆ 賞金 ＆ 締切 */}
          {adminTab === 'race' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>🛠️ 【{selectedRaceNo}R】 レース条件 ＆ 賞金設定 ＆ 投票締切</h3>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '2px solid #cbd5e1', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '12px' }}>現在の投票ステータス: {currentRace?.status === 'closed' ? '🔒 締め切り中' : '🟢 投票受付中'}</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => handleToggleRaceStatus('closed')} style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    🔒 【{selectedRaceNo}R】 投票締切実行
                  </button>
                  <button onClick={() => handleToggleRaceStatus('open')} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    🔓 【{selectedRaceNo}R】 締切解除 (受付再開)
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateRaceInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div><label style={labelStyle}>レース名</label><input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>距離 (m)</label><input type="number" step="100" value={editDistance} onChange={e=>setEditDistance(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>馬場状態</label><select value={editCondition} onChange={e=>setEditCondition(e.target.value)} style={inputStyle}><option value="良">良</option><option value="稍重">稍重</option><option value="重">重</option><option value="不良">不良</option></select></div>
                  <div><label style={labelStyle}>天候</label><select value={editWeather} onChange={e=>setEditWeather(e.target.value)} style={inputStyle}><option value="晴">晴</option><option value="曇">曇</option><option value="雨">雨</option><option value="雪">雪</option></select></div>
                </div>
                <div>
                  <label style={labelStyle}>💰 1着総賞金 (G) ※勝った馬主へ10%手当が自動支給されます</label>
                  <input type="number" step="100000" value={editPrize} onChange={e=>setEditPrize(Number(e.target.value))} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} />
                </div>
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>レース条件・賞金を保存 💾</button>
              </form>
            </div>
          )}

          {/* 🐴 TAB: 出走馬追加・編集 */}
          {adminTab === 'horses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>➕ 【{selectedRaceNo}R】 出走馬追加（競走馬マスターから選択）</h3>
                <form onSubmit={handleAddHorse} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1.5fr 80px 1.2fr', gap: '12px' }}>
                    <div><label style={labelStyle}>馬番</label><input type="number" value={newHorseNumber} onChange={e=>setNewHorseNumber(Number(e.target.value))} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>馬名（現役馬のみ）</label>
                      <select value={newHorseName} onChange={e=>setNewHorseName(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }}>
                        {activeHorseMasters.map(h => <option key={h.id} value={h.name}>🐎 {h.name} (馬主: {h.owner_name || '未設定'})</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>年齢</label><select value={newHorseAge} onChange={e=>setNewHorseAge(Number(e.target.value))} style={inputStyle}>{[2, 3, 4, 5, 6, 7, 8].map(a => <option key={a} value={a}>{a}歳</option>)}</select></div>
                    <div><label style={labelStyle}>騎手</label><select value={newJockey} onChange={e=>setNewJockey(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#2563eb' }}>{jockeyList.map(j => <option key={j.id} value={j.name}>🏇 {j.name}</option>)}</select></div>
                  </div>
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>このレースの出走馬として追加・確定 ➕</button>
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 出走馬一覧＆編集</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}><th style={{ padding: '12px', width: '40px' }}>番</th><th>馬名</th><th>年齢</th><th>騎手</th><th>操作</th></tr></thead>
                  <tbody>
                    {horses.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{h.horse_number}</td>
                        <td style={{ fontWeight: 'bold', color: '#16a34a' }}>🐎 {h.name}</td>
                        <td>{h.age || 3}歳</td>
                        <td style={{ color: '#2563eb', fontWeight: 'bold' }}>🏇 {h.jockey}</td>
                        <td><button onClick={()=>handleDeleteHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>削除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

          {/* 🏆 TAB: 着順確定 ＆ 10%手当支給 */}
          {adminTab === 'settle' && (
            <div style={{ border: '2px solid #2563eb', padding: '32px', borderRadius: '16px', backgroundColor: '#ffffff', maxWidth: '600px' }}>
              <h3 style={{ color: '#1e3a8a', marginTop: 0, fontWeight: 'bold', fontSize: '20px' }}>🏆 【{selectedRaceNo}R】 着順確定 ＆ 配当＆10%手当自動振込</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div><label style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>🥇 1着</label><select value={firstHorse} onChange={e=>setFirstHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>🥈 2着</label><select value={secondHorse} onChange={e=>setSecondHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', color: '#ca8a04', fontWeight: 'bold' }}>🥉 3着</label><select value={thirdHorse} onChange={e=>setThirdHorse(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
              </div>
              <button onClick={handleSettleFullRace} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '16px', fontSize: '18px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}>🏁 結果確定・配当金＆馬主10%手当自動振込 💰</button>
            </div>
          )}

          {/* 📊 TAB: 売上・インフレ率グラフ */}
          {adminTab === 'stats' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>📊 レース別 インフレ率 ＆ 売上分析グラフ</h3>
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {raceStats.map(s => (
                  <div key={s.raceNo} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ width: '50px', fontWeight: 'bold', color: '#1e3a8a' }}>{s.raceNo}R</div>
                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '6px', height: '20px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (s.totalSales / 500000) * 100)}%`, backgroundColor: '#2563eb', height: '100%' }} />
                    </div>
                    <div style={{ width: '150px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>売上: {s.totalSales.toLocaleString()} G</div>
                    <div style={{ width: '120px', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>インフレ率: {s.inflationRate}x</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '36px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
                <h4 style={{ color: '#16a34a', margin: '0 0 12px 0' }}>🎲 ダビスタ風 生産ガチャ確率 手動コントロール設定</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>SSランク (%)</label><input type="number" value={probSS} onChange={e=>setProbSS(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Sランク (%)</label><input type="number" value={probS} onChange={e=>setProbS(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Aランク (%)</label><input type="number" value={probA} onChange={e=>setProbA(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bランク (%)</label><input type="number" value={probB} onChange={e=>setProbB(Number(e.target.value))} style={inputStyle} /></div>
                </div>
                <button onClick={handleSaveBreedingProbs} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>確率設定を保存 ⚙️</button>
              </div>
            </div>
          )}

          {/* 🤝 TAB: 馬主＆馬 紐づけ管理 */}
          {adminTab === 'owner_assign' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>🤝 馬主と競走馬の一元紐づけ</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>選択した競走馬を、指定の馬主（IPATユーザー）へ1対1で割り当て・変更できます。</p>
              <form onSubmit={handleAssignOwnerToHorse} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>① 対象の競走馬を選択</label>
                  <select value={assignTargetHorseId} onChange={e=>setAssignTargetHorseId(e.target.value)} style={inputStyle}>
                    {activeHorseMasters.map(h => (
                      <option key={h.id} value={h.id}>🐎 {h.name} (現在の馬主: {h.owner_name || '未設定'})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>② 割り当てる馬主（ユーザー名）を選択</label>
                  <select value={assignTargetOwnerName} onChange={e=>setAssignTargetOwnerName(e.target.value)} style={inputStyle}>
                    {users.map(u => (
                      <option key={u.id} value={u.discord_name}>👤 {u.discord_name} (残高: {(u.balance || 0).toLocaleString()} G)</option>
                    ))}
                  </select>
                </div>
                <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>この競走馬の所有権を更新・紐づける 🤝</button>
              </form>
            </div>
          )}

          {/* 🐎 TAB: 現役競走馬マスター */}
          {adminTab === 'horse_masters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>🐎 競走馬を新規直接登録</h3>
                <form onSubmit={handleAddHorseMaster} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <input type="text" placeholder="馬名" value={addHorseMasterName} onChange={e=>setAddHorseMasterName(e.target.value)} style={inputStyle} required />
                  <input type="text" placeholder="馬主名 (例: 山田太郎 / 未入力なら「運営直営」)" value={addHorseMasterOwner} onChange={e=>setAddHorseMasterOwner(e.target.value)} style={inputStyle} />
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>登録</button>
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 現役競走馬マスター ({activeHorseMasters.length}頭)</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>馬名</th>
                      <th>馬主</th>
                      <th>ステータス</th>
                      <th>手動操作</th>
                      <th>引退承認</th>
                      <th>削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHorseMasters.map(hm => {
                      const isResting = hm.status === '放牧中';
                      const isPendingRetire = hm.status === '引退申請中';
                      return (
                        <tr key={hm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold', color: '#16a34a' }}>🐎 {hm.name}</td>
                          <td style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {hm.owner_name || '未設定'}</td>
                          <td>
                            <span style={{ padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: isPendingRetire ? '#eab308' : isResting ? '#3b82f6' : '#16a34a' }}>
                              {hm.status || '現役'}
                            </span>
                          </td>
                          <td>
                            <button onClick={() => handleToggleRestingStatus(hm.id, hm.status)} style={{ backgroundColor: isResting ? '#16a34a' : '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                              {isResting ? '現役に復帰' : '放牧に出す'}
                            </button>
                          </td>
                          <td>
                            <button onClick={() => handleConfirmRetire(hm.id, hm.name)} style={{ backgroundColor: isPendingRetire ? '#dc2626' : '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                              {isPendingRetire ? '⚠️ 引退を承認' : '引退確定'}
                            </button>
                          </td>
                          <td>
                            <button onClick={()=>handleDeleteHorseMaster(hm.id, hm.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>削除</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SideButton({ active, onClick, icon, text }: { active: boolean; onClick: () => void; icon: string; text: string }) {
  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: active ? '#2563eb' : 'transparent', color: active ? '#ffffff' : '#93c5fd', transition: 'all 0.2s' }}>
      <span style={{ fontSize: '18px' }}>{icon}</span> {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' };