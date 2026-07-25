'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<'horses' | 'race' | 'odds' | 'settle' | 'jockeys' | 'horse_masters' | 'owner_assign' | 'users' | 'breed_edit' | 'news_edit' | 'pedigree_admin' | 'chat_admin'>('users');

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

  // 👤 プレイヤー管理 ＆ 🎖️ 称号付与用
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [amountToAddInput, setAmountToAddInput] = useState<number>(1000000);
  const [customPinInput, setCustomPinInput] = useState<string>('');
  const [customTitleInput, setCustomTitleInput] = useState<string>('万馬券ハンター');

  // 🧬 生産馬個別確認・編集用ステート
  const [breedEditOwnerName, setBreedEditOwnerName] = useState<string>('');
  const [userBredHorses, setUserBredHorses] = useState<any[]>([]);

  // 📢 アプデ・お知らせ＆💬 チャット＆🎁 ログボ設定用ステート
  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsList, setNewsList] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [dailyBonusConfig, setDailyBonusConfig] = useState<number>(100000);

  // レース設定用 (🏆 重賞グレードG1〜G3追加)
  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1600);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');
  const [editPrize, setEditPrize] = useState(1000000);
  const [editGrade, setEditGrade] = useState('一般');

  // 出走馬追加用
  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(2);
  const [newJockey, setNewJockey] = useState('');

  // 🏁 1着〜9着 着順確定用ステート
  const [rank1, setRank1] = useState('');
  const [rank2, setRank2] = useState('');
  const [rank3, setRank3] = useState('');
  const [rank4, setRank4] = useState('');
  const [rank5, setRank5] = useState('');
  const [rank6, setRank6] = useState('');
  const [rank7, setRank7] = useState('');
  const [rank8, setRank8] = useState('');
  const [rank9, setRank9] = useState('');

  useEffect(() => { 
    if (isAuthenticated) { 
      fetchRaces(); fetchUsers(); fetchJockeys(); fetchHorseMasters(); fetchNews(); fetchChat();
      const cfg = Number(localStorage.getItem('daily_bonus_amount') || 100000);
      setDailyBonusConfig(cfg);
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
        setEditGrade(race.grade || '一般');
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
        setCustomTitleInput(target.title || '万馬券ハンター');
      }
    } else {
      setSelectedUser(null);
    }
  }, [selectedUserId, users]);

  useEffect(() => {
    if (breedEditOwnerName) {
      loadOwnerBredHorses(breedEditOwnerName);
    }
  }, [breedEditOwnerName]);

  const loadOwnerBredHorses = async (ownerName: string) => {
    const { data } = await supabase
      .from('horse_masters')
      .select('*')
      .eq('owner_name', ownerName);
    if (data) {
      setUserBredHorses(data);
    }
  };

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
      if (reversed.length > 0) {
        if (!selectedUserId) setSelectedUserId(reversed[0].id);
        if (!assignTargetOwnerName) setAssignTargetOwnerName(reversed[0].discord_name);
        if (!breedEditOwnerName) setBreedEditOwnerName(reversed[0].discord_name);
      }
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

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*');
    if (data) {
      setNewsList([...data].reverse());
    } else {
      const local = JSON.parse(localStorage.getItem('app_news_list') || '[]');
      setNewsList(local);
    }
  };

  const fetchChat = async () => {
    const { data } = await supabase.from('inquiries').select('*').eq('title', '【パット雑談チャット】');
    if (data) {
      setChatMessages([...data].reverse());
    } else {
      const local = JSON.parse(localStorage.getItem('app_paddock_chat') || '[]');
      setChatMessages(local);
    }
  };

  // 🎖️ プレイヤー称号の付与
  const handleUpdateUserTitle = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ title: customTitleInput }).eq('id', selectedUser.id);
    alert(`🎖️ 「${selectedUser.discord_name}」様に称号【 ${customTitleInput} 】を授与しました！`);
    fetchUsers();
  };

  // 🗞️ 競馬新聞の「印（◎○▲△）」AI自動付与サポート
  const handleAutoAssignMarks = async () => {
    const marks = ['◎', '○', '▲', '△', '×'];
    for (let i = 0; i < horses.length; i++) {
      const mark = marks[i] || '・';
      await supabase.from('horses').update({ mark: mark }).eq('id', horses[i].id);
    }
    alert('🗞️ 競馬新聞の予想印（◎○▲△）を自動設定しました！');
    fetchHorses(currentRace.id);
  };

  const handleSaveBonusConfig = () => {
    localStorage.setItem('daily_bonus_amount', dailyBonusConfig.toString());
    alert(`🎁 1日1回のログインボーナス進呈額を【 ${dailyBonusConfig.toLocaleString()} G 】に設定しました！`);
  };

  const handleDeleteChatMessage = async (id: string) => {
    if (!confirm('この不適切な投稿を削除しますか？')) return;
    await supabase.from('inquiries').delete().eq('id', id);
    const local = JSON.parse(localStorage.getItem('app_paddock_chat') || '[]');
    const filtered = local.filter((m: any) => m.id !== id);
    localStorage.setItem('app_paddock_chat', JSON.stringify(filtered));
    fetchChat();
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsContent) return alert('タイトルと本文を入力してください');

    const newNews = { title: newsTitle, content: newsContent, date: new Date().toLocaleDateString() };
    await supabase.from('news').insert([newNews]);

    const local = JSON.parse(localStorage.getItem('app_news_list') || '[]');
    localStorage.setItem('app_news_list', JSON.stringify([{ id: Date.now().toString(), ...newNews }, ...local]));

    setNewsTitle(''); setNewsContent('');
    alert('📢 アプデ・お知らせを配信しました！'); fetchNews();
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('削除しますか？')) return;
    await supabase.from('news').delete().eq('id', id);
    const local = JSON.parse(localStorage.getItem('app_news_list') || '[]');
    const filtered = local.filter((n: any) => n.id !== id);
    localStorage.setItem('app_news_list', JSON.stringify(filtered));
    fetchNews();
  };

  const handleUpdateBredHorseDetail = async (horseId: string, field: string, value: any) => {
    await supabase.from('horse_masters').update({ [field]: value }).eq('id',horseId);
    loadOwnerBredHorses(breedEditOwnerName);
  };

  const handleDeleteBredHorse = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」を完全に削除しますか？`)) return;
    await supabase.from('horse_masters').delete().eq('id', horseId);
    loadOwnerBredHorses(breedEditOwnerName); alert(`🗑️ 「${horseName}」を削除しました。`);
  };

  const handleToggleRaceStatus = async (newStatus: 'open' | 'closed') => {
    if (!currentRace) return;
    await supabase.from('races').update({ status: newStatus }).eq('id', currentRace.id);
    alert(`【${selectedRaceNo}R】のステータスを「${newStatus === 'closed' ? '🔒 締め切り' : '🟢 投票受付中'}」に変更しました！`);
    fetchRaces();
  };

  const handleSetUserBalance = async () => {
    if (!selectedUser) return;
    const newBal = Number(customBalanceInput);
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`💰 「${selectedUser.discord_name}」様の残高を ${newBal.toLocaleString()} G に変更しました！`); fetchUsers();
  };

  const handleAddUserBalance = async (amount: number) => {
    if (!selectedUser) return;
    const currentBal = selectedUser.balance || 0;
    const newBal = currentBal + amount;
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`🎉 「${selectedUser.discord_name}」様に ${amount.toLocaleString()} G を追加しました！`); fetchUsers();
  };

  const handleUpdateUserPin = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ pin_code: customPinInput }).eq('id', selectedUser.id);
    alert(`🔑 「${selectedUser.discord_name}」様のPINコードを更新しました！`); fetchUsers();
  };

  const handleDeleteUser = async (userId?: string, userName?: string) => {
    const targetId = userId || selectedUser?.id;
    const targetName = userName || selectedUser?.discord_name;
    if (!targetId) return;
    if (!confirm(`⚠️ 本当に「${targetName}」様のアカウントを削除しますか？`)) return;

    await supabase.from('users').delete().eq('id', targetId);
    alert(`🗑️ 「${targetName}」様を削除しました。`);
    if (targetId === selectedUserId) setSelectedUserId(''); fetchUsers();
  };

  const handleAssignOwnerToHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetHorseId || !assignTargetOwnerName) return alert('選択してください');

    const targetHorse = horseMasterList.find(h => h.id === assignTargetHorseId);
    if (!targetHorse) return;

    await supabase.from('horse_masters').update({ owner_name: assignTargetOwnerName }).eq('id', assignTargetHorseId);
    alert(`🎉 「${targetHorse.name}」の馬主を【${assignTargetOwnerName}】様に紐づけ変更しました！`); fetchHorseMasters();
  };

  const handleAddHorseMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addHorseMasterName) return alert('馬名を入力してください');
    await supabase.from('horse_masters').insert([{ name: addHorseMasterName, owner_name: addHorseMasterOwner || '運営直営', status: '現役' }]);
    setAddHorseMasterName(''); setAddHorseMasterOwner(''); fetchHorseMasters(); alert('登録しました！');
  };

  const handleDeleteHorseMaster = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    await supabase.from('horse_masters').delete().eq('id', id); fetchHorseMasters();
  };

  const handleToggleRestingStatus = async (horseId: string, currentStatus: string) => {
    let nextStatus = currentStatus === '放牧中' ? '現役' : '放牧中';
    await supabase.from('horse_masters').update({ status: nextStatus }).eq('id', horseId);
    alert(`🔄 ステータスを「${nextStatus}」に変更しました！`); fetchHorseMasters();
  };

  const handleConfirmRetire = async (horseId: string, horseName: string) => {
    if (!confirm(`「${horseName}」を正式に引退させますか？`)) return;
    await supabase.from('horse_masters').update({ status: '引退' }).eq('id', horseId);
    alert(`🏁 「${horseName}」を引退処理しました。`); fetchHorseMasters();
  };

  // 🛠️ レース条件保存 (G1〜G3重賞設定追加)
  const handleUpdateRaceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace) return;
    await supabase.from('races').update({ title: editTitle, distance_m: editDistance, track_condition: editCondition, weather: editWeather, prize: editPrize, grade: editGrade }).eq('id', currentRace.id);
    alert('レース格付け・賞金を保存しました！'); fetchRaces();
  };

  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace || !newHorseName) return alert('馬名を選択してください');

    const { error } = await supabase.from('horses').insert([{
      race_id: currentRace.id, horse_number: newHorseNumber, name: newHorseName, age: newHorseAge, jockey: newJockey
    }]);

    if (error) {
      await supabase.from('horses').insert([{ race_id: currentRace.id, horse_number: newHorseNumber, name: newHorseName }]);
    }

    await supabase.from('horse_masters').update({ status: `出走(${selectedRaceNo}R)` }).eq('name', newHorseName);
    fetchHorses(currentRace.id); fetchHorseMasters(); alert(`🎉 出走登録しました！`);
  };

  const handleDeleteHorse = async (horseId: string, name: string) => {
    if (!confirm('削除しますか？')) return;
    await supabase.from('horses').delete().eq('id', horseId); fetchHorses(currentRace.id);
  };

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

  const handleSettleFullRace = async () => {
    if (!currentRace || !rank1) return alert('最低限1着の馬を選択してください');
    if (!confirm(`【${selectedRaceNo}R】の結果を確定し、的中者全員へ配当金を自動振込（残高加算）しますか？`)) return;

    const { data: bets } = await supabase.from('bets').select('*').eq('race_id', String(currentRace.id));

    if (bets && bets.length > 0) {
      for (const bet of bets) {
        let isWin = false;
        let winOdds = 3.5;
        const sel = String(bet.selection);

        if (bet.bet_type === '単勝' && sel === rank1) {
          isWin = true; winOdds = 3.5;
        } else if (bet.bet_type === '複勝' && [rank1, rank2, rank3].filter(Boolean).includes(sel)) {
          isWin = true; winOdds = 1.8;
        } else if (bet.bet_type === '馬単' && sel === `${rank1}-${rank2}`) {
          isWin = true; winOdds = 15.0;
        } else if (bet.bet_type === '馬連' && (sel === `${rank1}-${rank2}` || sel === `${rank2}-${rank1}`)) {
          isWin = true; winOdds = 8.5;
        } else if (bet.bet_type === 'ワイド') {
          const pair = sel.split('-');
          const top3 = [rank1, rank2, rank3].filter(Boolean);
          if (pair.length === 2 && top3.includes(pair[0]) && top3.includes(pair[1])) {
            isWin = true; winOdds = 3.2;
          }
        } else if (bet.bet_type === '3連複') {
          const trio = sel.split('-');
          const top3 = [rank1, rank2, rank3].filter(Boolean);
          if (trio.length === 3 && trio.every(h => top3.includes(h))) {
            isWin = true; winOdds = 22.0;
          }
        } else if (bet.bet_type === '3連単' && sel === `${rank1}-${rank2}-${rank3}`) {
          isWin = true; winOdds = 65.0;
        }

        if (isWin) {
          const payout = Math.floor(Number(bet.amount) * winOdds);
          await supabase.from('bets').update({ payout_amount: payout, is_claimed: true }).eq('id', bet.id);

          const { data: userData } = await supabase.from('users').select('balance').eq('id', bet.user_id);
          if (userData && userData.length > 0) {
            const currentBal = Number(userData[0].balance || 0);
            await supabase.from('users').update({ balance: currentBal + payout }).eq('id', bet.user_id);
          }
        } else {
          await supabase.from('bets').update({ payout_amount: 0, is_claimed: true }).eq('id', bet.id);
        }
      }
    }

    const winningHorseObj = horses.find(h => String(h.horse_number) === String(rank1));
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
          }
        }
      }
    }

    await supabase.from('races').update({ 
      status: 'finished', 
      first_horse: rank1, second_horse: rank2, third_horse: rank3, rank4, rank5, rank6, rank7, rank8, rank9
    }).eq('id', currentRace.id);

    alert(`🏆 【${selectedRaceNo}R】の結果を確定しました！\nnetkeiba風の結果順位表がユーザー画面に自動反映されました。`); 
    fetchRaces(); fetchUsers(); fetchHorseMasters();
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

  const activeHorseMasters = horseMasterList.filter(h => h.status !== '引退' && h.status !== '種牡馬/繁殖牝馬');
  const pedigreeHorseMasters = horseMasterList.filter(h => h.status === '種牡馬/繁殖牝馬');

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
          <SideButton active={adminTab === 'users'} onClick={() => setAdminTab('users')} icon="👤" text="プレイヤー管理 (お金/称号/削除)" />
          <SideButton active={adminTab === 'breed_edit'} onClick={() => setAdminTab('breed_edit')} icon="🧬" text="生産馬 個別確認・編集" />
          <SideButton active={adminTab === 'pedigree_admin'} onClick={() => setAdminTab('pedigree_admin')} icon="🧬" text="血統マスター管理" />
          <SideButton active={adminTab === 'chat_admin'} onClick={() => setAdminTab('chat_admin')} icon="💬" text="パドックチャット監視・削除" />
          <SideButton active={adminTab === 'news_edit'} onClick={() => setAdminTab('news_edit')} icon="📢" text="アプデ・お知らせ配信" />
          <SideButton active={adminTab === 'owner_assign'} onClick={() => setAdminTab('owner_assign')} icon="🤝" text="馬主＆馬 紐づけ管理" />
          <SideButton active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} icon="🐎" text="現役競走馬マスター" />

          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '24px' }}>レース管理 (1〜12R)</div>
          <SideButton active={adminTab === 'race'} onClick={() => setAdminTab('race')} icon="🛠️" text="レース条件設定 / G1重賞 / 締切" />
          <SideButton active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} icon="🐴" text="出走馬追加・新聞印編集" />
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

          {/* 👤 TAB: プレイヤー管理 ＋ 🎖️ 称号授与 ＋ 🎁 ログボ設定 */}
          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '28px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>👤 プレイヤー設定・お金追加・称号授与</h2>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>① 操作するプレイヤーを選択してください</label>
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '2px solid #2563eb', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff', width: '100%' }}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.discord_name} （残高: {(u.balance || 0).toLocaleString()} G / 称号: {u.title || 'なし'}）
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
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                    {/* 🎖️ 称号授与コントロール */}
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#ca8a04', fontSize: '16px' }}>🎖️ 限定称号を授与・付与する</h4>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input type="text" placeholder="例: 万馬券ハンター / 競馬神" value={customTitleInput} onChange={e=>setCustomTitleInput(e.target.value)} style={inputStyle} />
                        <button onClick={handleUpdateUserTitle} style={{ padding: '12px 20px', backgroundColor: '#ca8a04', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>称号を授与 🎖️</button>
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

              {/* 🎁 ログインボーナス設定 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#ca8a04', fontSize: '18px', fontWeight: 'bold' }}>🎁 デイリーログインボーナス設定</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input type="number" step="10000" value={dailyBonusConfig} onChange={e=>setDailyBonusConfig(Number(e.target.value))} style={inputStyle} />
                  <span style={{ fontWeight: 'bold' }}>G / 1日</span>
                  <button onClick={handleSaveBonusConfig} style={{ padding: '12px 20px', backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>保存 💾</button>
                </div>
              </div>
            </div>
          )}

          {/* 🛠️ TAB: レース条件 ＆ G1重賞 ＆ 締切 */}
          {adminTab === 'race' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>🛠️ 【{selectedRaceNo}R】 レース条件 ＆ G1重賞格付け ＆ 投票締切</h3>
              
              <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '2px solid #cbd5e1', marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#475569', marginBottom: '12px' }}>現在の投票ステータス: {currentRace?.status === 'closed' ? '🔒 締め切り中' : '🟢 投票受付中'}</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => handleToggleRaceStatus('closed')} style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    🔒 投票締切実行
                  </button>
                  <button onClick={() => handleToggleRaceStatus('open')} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    🔓 締切解除 (受付再開)
                  </button>
                </div>
              </div>

              <form onSubmit={handleUpdateRaceInfo} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div><label style={labelStyle}>レース名</label><input type="text" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={inputStyle} /></div>
                
                {/* 🏆 G1〜G3重賞設定追加 */}
                <div>
                  <label style={labelStyle}>🏆 レース格付け（重賞グレード）</label>
                  <select value={editGrade} onChange={e=>setEditGrade(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: editGrade === 'G1' ? '#dc2626' : editGrade === 'G2' ? '#d97706' : '#2563eb' }}>
                    <option value="一般">一般競走</option>
                    <option value="G3">G3 重賞</option>
                    <option value="G2">G2 重賞</option>
                    <option value="G1">G1 最高峰競走</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>距離 (m)</label><input type="number" step="100" value={editDistance} onChange={e=>setEditDistance(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>馬場状態</label><select value={editCondition} onChange={e=>setEditCondition(e.target.value)} style={inputStyle}><option value="良">良</option><option value="稍重">稍重</option><option value="重">重</option><option value="不良">不良</option></select></div>
                  <div><label style={labelStyle}>天候</label><select value={editWeather} onChange={e=>setEditWeather(e.target.value)} style={inputStyle}><option value="晴">晴</option><option value="曇">曇</option><option value="雨">雨</option><option value="雪">雪</option></select></div>
                </div>
                <div>
                  <label style={labelStyle}>💰 1着総賞金 (G) ※勝った馬主へ10%手当が自動支給されます</label>
                  <input type="number" step="100000" value={editPrize} onChange={e=>setEditPrize(Number(e.target.value))} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} />
                </div>
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>レース条件・格付けを保存 💾</button>
              </form>
            </div>
          )}

          {/* 🐴 TAB: 出走馬追加 ＆ 🗞️ 競馬新聞印コントロール */}
          {adminTab === 'horses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>🗞️ 競馬新聞の予想印（◎○▲△）管理</h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>「AI自動記印」を押すと人気や能力に応じた印を一括付与します。</p>
                </div>
                <button onClick={handleAutoAssignMarks} style={{ backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  🤖 AI自動記印（一括）
                </button>
              </div>

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
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>📋 出走馬一覧＆個別の印編集</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', textAlign: 'left' }}><th style={{ padding: '12px', width: '40px' }}>番</th><th>本命印</th><th>馬名</th><th>年齢</th><th>騎手</th><th>操作</th></tr></thead>
                  <tbody>
                    {horses.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', textAlign: 'center' }}>{h.horse_number}</td>
                        <td>
                          <select value={h.mark || '・'} onChange={e => handleUpdateHorseDetail(h.id, 'mark', e.target.value)} style={{ padding: '4px', fontWeight: 'bold', color: '#dc2626' }}>
                            {['◎', '○', '▲', '△', '×', '・'].map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </td>
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

          {/* 🧬 TAB: 殿堂入り血統マスター管理 */}
          {adminTab === 'pedigree_admin' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 16px 0', color: '#8b5cf6', fontSize: '20px', fontWeight: 'bold' }}>
                🧬 殿堂入り 種牡馬・繁殖牝馬（血統マスター）管理
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '16px', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#faf5ff', borderBottom: '2px solid #c084fc', textAlign: 'left' }}>
                    <th style={{ padding: '12px' }}>馬名</th>
                    <th>元所有馬主</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pedigreeHorseMasters.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#7e22ce' }}>🧬 {p.name}</td>
                      <td style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {p.owner_name}</td>
                      <td>
                        <button onClick={() => handleDeleteHorseMaster(p.id, p.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                          血統ライブラリから削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 💬 TAB: パドックチャット監視・削除 */}
          {adminTab === 'chat_admin' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>
                💬 パドック雑談チャット リアルタイム監視＆荒らし不適切削除
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {chatMessages.map(m => (
                  <div key={m.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e3a8a' }}>👤 {m.discord_name}</div>
                      <div style={{ fontSize: '14px', color: '#334155', marginTop: '4px' }}>{m.content}</div>
                    </div>
                    <button onClick={() => handleDeleteChatMessage(m.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      🗑️ 投稿削除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 📢 TAB: アプデ・お知らせ配信 */}
          {adminTab === 'news_edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold' }}>
                  📢 アプデ・お知らせ新規配信
                </h2>

                <form onSubmit={handleAddNews} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>タイトル</label>
                    <input type="text" placeholder="例: 【アップデート】新機能が追加されました！" value={newsTitle} onChange={e=>setNewsTitle(e.target.value)} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={labelStyle}>本文</label>
                    <textarea rows={5} placeholder="アップデート詳細やイベント情報を入力" value={newsContent} onChange={e=>setNewsContent(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} required />
                  </div>
                  <button type="submit" style={{ padding: '14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                    📢 全プレイヤーにお知らせを配信する
                  </button>
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                  📋 配信中のお知らせ一覧 ({newsList.length}件)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {newsList.map(n => (
                    <div key={n.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e3a8a' }}>📢 {n.title}</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{n.date}</div>
                      </div>
                      <button onClick={()=>handleDeleteNews(n.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                        削除
                      </button>
                    </div>
                  ))}
                </div>
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

          {/* 🏆 TAB: 着順確定 */}
          {adminTab === 'settle' && (
            <div style={{ border: '2px solid #2563eb', padding: '32px', borderRadius: '16px', backgroundColor: '#ffffff' }}>
              <h3 style={{ color: '#1e3a8a', marginTop: 0, fontWeight: 'bold', fontSize: '20px' }}>
                🏆 【{selectedRaceNo}R】 着順確定（1着〜9着）＆ 配当金・馬主手当 自動振込
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div>
                  <label style={{ fontSize: '13px', color: '#dc2626', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🥇 1着 (必須)</label>
                  <select value={rank1} onChange={e=>setRank1(e.target.value)} style={inputStyle}>
                    <option value="">選択してください</option>
                    {horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🥈 2着</label>
                  <select value={rank2} onChange={e=>setRank2(e.target.value)} style={inputStyle}>
                    <option value="">選択してください</option>
                    {horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '13px', color: '#ca8a04', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>🥉 3着</label>
                  <select value={rank3} onChange={e=>setRank3(e.target.value)} style={inputStyle}>
                    <option value="">選択してください</option>
                    {horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}
                  </select>
                </div>

                <div><label style={labelStyle}>4着</label><select value={rank4} onChange={e=>setRank4(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>5着</label><select value={rank5} onChange={e=>setRank5(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>6着</label><select value={rank6} onChange={e=>setRank6(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>7着</label><select value={rank7} onChange={e=>setRank7(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>8着</label><select value={rank8} onChange={e=>setRank8(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>9着</label><select value={rank9} onChange={e=>setRank9(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
              </div>

              <button 
                onClick={handleSettleFullRace} 
                style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '18px', fontSize: '18px', fontWeight: 'bold', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
              >
                🏁 結果確定・配当金＆馬主10%手当自動振込 💰
              </button>
            </div>
          )}

          {/* 🧬 TAB: 生産馬 個別確認・編集 */}
          {adminTab === 'breed_edit' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 16px 0', color: '#16a34a', fontSize: '20px', fontWeight: 'bold' }}>🧬 ユーザー別 生産馬一覧 ＆ パラメータ直接編集</h2>
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>① 確認・編集したい馬主（ユーザー）を選択</label>
                <select value={breedEditOwnerName} onChange={e => setBreedEditOwnerName(e.target.value)} style={{ padding: '14px', borderRadius: '10px', border: '2px solid #16a34a', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#f0fdf4', width: '100%' }}>
                  {users.map(u => (
                    <option key={u.id} value={u.discord_name}>👤 {u.discord_name} 様の生産所有馬リスト</option>
                  ))}
                </select>
              </div>

              <h3 style={{ margin: '20px 0 12px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: 'bold' }}>
                🐎 【{breedEditOwnerName}】 様の生産馬 ({userBredHorses.length}頭)
              </h3>

              {userBredHorses.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>この馬主はまだ仔馬を生産していません。</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {userBredHorses.map(h => (
                    <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr 80px', gap: '10px', alignItems: 'center' }}>
                        <div><label style={labelStyle}>馬名</label><input type="text" value={h.name || ''} onChange={e => handleUpdateBredHorseDetail(h.id, 'name', e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} /></div>
                        <div><label style={labelStyle}>素質ランク</label><select value={h.rank || 'C'} onChange={e => handleUpdateBredHorseDetail(h.id, 'rank', e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#dc2626' }}>{['SS', 'S', 'A', 'B', 'C'].map(r => <option key={r} value={r}>{r}ランク</option>)}</select></div>
                        <div><label style={labelStyle}>スピード</label><select value={h.speed || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'speed', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>スタミナ</label><select value={h.stamina || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'stamina', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>勝負根性</label><select value={h.guts || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'guts', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>気性</label><select value={h.temper || 'A'} onChange={e => handleUpdateBredHorseDetail(h.id, 'temper', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div style={{ textAlign: 'right', marginTop: '16px' }}><button onClick={() => handleDeleteBredHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>削除</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🤝 TAB: 馬主＆馬 紐づけ管理 */}
          {adminTab === 'owner_assign' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>🤝 馬主と競走馬の一元紐づけ</h3>
              <form onSubmit={handleAssignOwnerToHorse} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>① 対象の競走馬を選択</label>
                  <select value={assignTargetHorseId} onChange={e=>setAssignTargetHorseId(e.target.value)} style={inputStyle}>
                    {activeHorseMasters.map(h => <option key={h.id} value={h.id}>🐎 {h.name} (現在の馬主: {h.owner_name || '未設定'})</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>② 割り当てる馬主（ユーザー名）を選択</label>
                  <select value={assignTargetOwnerName} onChange={e=>setAssignTargetOwnerName(e.target.value)} style={inputStyle}>
                    {users.map(u => <option key={u.id} value={u.discord_name}>👤 {u.discord_name} (残高: {(u.balance || 0).toLocaleString()} G)</option>)}
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
                      <th style={{ padding: '12px' }}>馬名</th><th>馬主</th><th>ステータス</th><th>手動操作</th><th>引退承認</th><th>削除</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeHorseMasters.map(hm => (
                      <tr key={hm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#16a34a' }}>🐎 {hm.name}</td>
                        <td style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {hm.owner_name || '未設定'}</td>
                        <td><span style={{ padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', color: '#fff', backgroundColor: hm.status === '引退申請中' ? '#eab308' : hm.status === '放牧中' ? '#3b82f6' : '#16a34a' }}>{hm.status || '現役'}</span></td>
                        <td><button onClick={() => handleToggleRestingStatus(hm.id, hm.status)} style={{ backgroundColor: hm.status === '放牧中' ? '#16a34a' : '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>{hm.status === '放牧中' ? '現役に復帰' : '放牧に出す'}</button></td>
                        <td><button onClick={() => handleConfirmRetire(hm.id, hm.name)} style={{ backgroundColor: hm.status === '引退申請中' ? '#dc2626' : '#64748b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>{hm.status === '引退申請中' ? '⚠️ 引退を承認' : '引退確定'}</button></td>
                        <td><button onClick={()=>handleDeleteHorseMaster(hm.id, hm.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>削除</button></td>
                      </tr>
                    ))}
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