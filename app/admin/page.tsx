'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<'horses' | 'race' | 'odds' | 'settle' | 'jockeys' | 'horse_masters' | 'owner_assign' | 'users' | 'breed_edit' | 'news_edit' | 'pedigree_admin' | 'chat_admin' | 'auction_admin' | 'bulk_import' | 'pool_monitor' | 'race_requests_admin'>('users');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);

  const [raceRequests, setRaceRequests] = useState<any[]>([]);

  const [addJockeyName, setAddJockeyName] = useState('');
  const [addHorseMasterName, setAddHorseMasterName] = useState('');
  const [addHorseMasterOwner, setAddHorseMasterOwner] = useState('');

  const [assignTargetHorseId, setAssignTargetHorseId] = useState<string>('');
  const [assignTargetOwnerName, setAssignTargetOwnerName] = useState<string>('');

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [amountToAddInput, setAmountToAddInput] = useState<number>(1000000);
  const [customPinInput, setCustomPinInput] = useState<string>('');
  const [customTitleInput, setCustomTitleInput] = useState<string>('万馬券ハンター');

  const [breedEditOwnerName, setBreedEditOwnerName] = useState<string>('');
  const [userBredHorses, setUserBredHorses] = useState<any[]>([]);

  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsList, setNewsList] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [dailyBonusConfig, setDailyBonusConfig] = useState<number>(100000);
  const [trainingSuccessRate, setTrainingSuccessRate] = useState<number>(70);
  const [trainingSuperRate, setTrainingSuperRate] = useState<number>(15);

  const [officialHorseName, setOfficialHorseName] = useState('');
  const [officialStartPrice, setOfficialStartPrice] = useState<number>(1000000);

  const [bulkImportText, setBulkImportText] = useState('');
  const [allBets, setAllBets] = useState<any[]>([]);

  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1600);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');
  const [editPrize, setEditPrize] = useState(1000000);
  const [editGrade, setEditGrade] = useState('一般');

  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(2);
  const [newJockey, setNewJockey] = useState('');

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
      fetchRaces(); fetchUsers(); fetchJockeys(); fetchHorseMasters(); fetchNews(); fetchChat(); fetchAllBets(); fetchRaceRequests();
      const cfg = Number(localStorage.getItem('daily_bonus_amount') || 100000);
      setDailyBonusConfig(cfg);
      const sRate = Number(localStorage.getItem('training_success_rate') || 70);
      const spRate = Number(localStorage.getItem('training_super_rate') || 15);
      setTrainingSuccessRate(sRate);
      setTrainingSuperRate(spRate);
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
      } else {
        setEditTitle('');
        setEditDistance(1600);
        setEditCondition('良');
        setEditWeather('晴');
        setEditPrize(1000000);
        setEditGrade('一般');
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
    try {
      const { data, error } = await supabase.from('news').select('*');
      if (data && !error) setNewsList([...data].reverse());
    } catch (e) { console.error(e); }
  };

  const fetchChat = async () => {
    try {
      const { data, error } = await supabase.from('inquiries').select('*').eq('title', '【パット雑談チャット】');
      if (data && !error) setChatMessages([...data].reverse());
    } catch (e) { console.error(e); }
  };

  const fetchAllBets = async () => {
    const { data } = await supabase.from('bets').select('*');
    if (data) setAllBets(data);
  };

  const fetchRaceRequests = async () => {
    try {
      const { data } = await supabase.from('race_requests').select('*').eq('status', 'pending');
      if (data) setRaceRequests(data.reverse());
    } catch (e) { console.error(e); }
  };

  const handleApproveRaceRequest = async (req: any) => {
    let targetRace = races.find(r => r.race_number === req.target_race_no);
    let raceId = targetRace?.id;

    if (!raceId) {
      const { data: insertedRace } = await supabase.from('races').insert([{
        race_number: req.target_race_no,
        title: `${req.target_race_no}R 特別競走`,
        status: 'open',
      }]).select('*');
      if (insertedRace && insertedRace.length > 0) {
        raceId = insertedRace[0].id;
      }
    }

    if (!raceId) return alert('レース情報の取得に失敗しました');

    const { data: exHorses } = await supabase.from('horses').select('*').eq('race_id', raceId);
    const nextHorseNo = (exHorses?.length || 0) + 1;

    await supabase.from('horses').insert([{
      race_id: raceId,
      horse_number: nextHorseNo,
      name: req.horse_name,
      jockey: req.preferred_jockey,
      age: 3,
    }]);

    await supabase.from('horse_masters').update({ status: `出走(${req.target_race_no}R)` }).eq('name', req.horse_name);
    await supabase.from('race_requests').update({ status: 'approved' }).eq('id', req.id);

    alert(`🟢 「${req.horse_name}」を 【${req.target_race_no}R ${nextHorseNo}番 (騎手: ${req.preferred_jockey})】 に自動登録しました！`);
    fetchRaceRequests(); fetchRaces();
  };

  const handleRejectRaceRequest = async (req: any) => {
    if (!confirm(`「${req.horse_name}」の出走申請を拒否しますか？`)) return;
    await supabase.from('race_requests').update({ status: 'rejected' }).eq('id', req.id);
    await supabase.from('horse_masters').update({ status: '現役' }).eq('name', req.horse_name);
    fetchRaceRequests();
  };

  const handleBulkSetRaceStatus = async (status: 'open' | 'closed') => {
    const label = status === 'open' ? '🟢 一括受付開始' : '🔒 一括投票締切';
    if (!confirm(`1R〜12Rのすべてのレースを【 ${label} 】に変更しますか？`)) return;

    for (const r of races) {
      await supabase.from('races').update({ status }).eq('id', r.id);
    }
    alert(`⚡ 1R〜12Rすべてを【 ${label} 】に一括変更しました！`);
    fetchRaces();
  };

  const handleResetAllRaces = async () => {
    if (!confirm('⚠️ 警告: 1R〜12Rのすべての「出走馬」「投票データ」「着順確定」をまっ散らにリセットしますか？')) return;
    await supabase.from('horses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('bets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    for (const r of races) {
      await supabase.from('races').update({ status: 'open', first_horse: null, second_horse: null, third_horse: null }).eq('id', r.id);
    }
    alert('🧹 全12Rの開催データをまっ散らにリセットしました！');
    fetchRaces(); fetchAllBets();
  };

  const handleBulkImportHorses = async () => {
    if (!bulkImportText.trim() || !currentRace?.id) return alert('テキストを入力し、対象レースを選択してください');
    
    const lines = bulkImportText.trim().split('\n');
    let count = 0;

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        const hNo = Number(parts[0]) || (count + 1);
        const name = parts[1];
        const jockey = parts[2] || 'ルメール';
        const age = Number(parts[3]) || 3;

        await supabase.from('horses').insert([{
          race_id: currentRace.id,
          horse_number: hNo,
          name: name,
          jockey: jockey,
          age: age,
        }]);
        count++;
      }
    }

    alert(`🎉 【${selectedRaceNo}R】に ${count}頭 の出走馬をテキストから一括登録しました！`);
    setBulkImportText('');
    fetchHorses(currentRace.id);
  };

  const handleUpdateRaceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return alert('レース名を入力してください');

    const racePayload = {
      race_number: selectedRaceNo,
      title: editTitle,
      distance_m: editDistance,
      track_condition: editCondition,
      weather: editWeather,
      prize: editPrize,
      grade: editGrade,
      status: currentRace?.status || 'open',
    };

    if (currentRace?.id) {
      await supabase.from('races').update(racePayload).eq('id', currentRace.id);
    } else {
      await supabase.from('races').insert([racePayload]);
    }

    alert(`🎉 【${selectedRaceNo}R】 のレース名を「${editTitle}」へ変更・保存しました！`);
    fetchRaces();
  };

  const handleAddOfficialAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialHorseName) return alert('馬名を入力してください');

    await supabase.from('auctions').insert([
      {
        horse_name: officialHorseName,
        seller_name: '青森県競馬運営公式',
        current_bid: officialStartPrice,
        highest_bidder: 'なし',
        is_official: true,
        status: 'active',
      },
    ]);

    alert(`👑 運営公式セレクトセールに「${officialHorseName}」を出品しました！`);
    setOfficialHorseName('');
  };

  const handleSaveTrainingRates = () => {
    localStorage.setItem('training_success_rate', trainingSuccessRate.toString());
    localStorage.setItem('training_super_rate', trainingSuperRate.toString());
    alert(`🏋️‍♂️ 調教確率を保存しました！\n・通常成功率: ${trainingSuccessRate}%\n・大成功(Sランク)率: ${trainingSuperRate}%`);
  };

  const handleUpdateUserTitle = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ title: customTitleInput }).eq('id', selectedUser.id);
    alert(`🎖️ 「${selectedUser.discord_name}」様に称号【 ${customTitleInput} 】を授与しました！`);
    fetchUsers();
  };

  const handleAutoAssignMarks = async () => {
    const marks = ['◎', '○', '▲', '△', '×'];
    for (let i = 0; i < horses.length; i++) {
      const mark = marks[i] || '・';
      await supabase.from('horses').update({ mark: mark }).eq('id', horses[i].id);
    }
    alert('🗞️ 競馬新聞の予想印（◎○▲△）を自動設定しました！');
    if (currentRace?.id) fetchHorses(currentRace.id);
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
    await supabase.from('horse_masters').update({ [field]: value }).eq('id', horseId);
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
    await supabase.from('horses').delete().eq('id', horseId);
    if (currentRace?.id) fetchHorses(currentRace.id);
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
    alert('🤖 適用完了！');
    if (currentRace?.id) fetchHorses(currentRace.id);
  };

  const handleUpdateHorseDetail = async (horseId: string, field: string, value: any) => {
    await supabase.from('horses').update({ [field]: value }).eq('id', horseId);
    if (currentRace?.id) fetchHorses(currentRace.id);
  };

  const handleSettleFullRace = async () => {
    if (!currentRace || !rank1) return alert('最低限1着の馬を選択してください');
    if (!confirm(`【${selectedRaceNo}R】の結果を確定し、的中者全員へ配当金を自動振込＆馬柱戦績へ保存しますか？`)) return;

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

    const rankSelections = [rank1, rank2, rank3, rank4, rank5, rank6, rank7, rank8, rank9];
    for (let i = 0; i < rankSelections.length; i++) {
      const horseNo = rankSelections[i];
      if (horseNo) {
        const hObj = horses.find(h => String(h.horse_number) === String(horseNo));
        if (hObj) {
          try {
            await supabase.from('horse_results').insert([{
              horse_name: hObj.name,
              race_name: `${selectedRaceNo}R ${currentRace.title || ''}`,
              rank_result: i + 1,
              jockey: hObj.jockey || 'ルメール',
            }]);
          } catch(e){}
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

    alert(`🏆 【${selectedRaceNo}R】の結果を確定しました！\nnetkeiba風の馬柱成績が全自動で更新・保存されました！`); 
    fetchRaces(); fetchUsers(); fetchHorseMasters();
  };

  const handleAdminLogin = (e: React.FormEvent) => { 
    e.preventDefault(); 
    if (pinInput === '0302') setIsAuthenticated(true); 
    else alert('暗証番号が違います'); 
  };

  if (!isAuthenticated) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px 20px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)', textAlign: 'center', maxWidth: '380px', width: '100%' }}>
        <h2 style={{ color: '#1e3a8a', margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>🍏 運営管理者ログイン</h2>
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="暗証番号を入力" style={{ padding: '14px', fontSize: '18px', textAlign: 'center', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', letterSpacing: '6px' }} />
          <button type="submit" style={{ padding: '14px', backgroundColor: '#1e3a8a', color: '#fff', fontWeight: 'bold', fontSize: '16px', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>ログイン</button>
        </form>
        <div style={{ marginTop: '16px' }}><Link href="/" style={{ color: '#2563eb', fontSize: '13px', textDecoration: 'none', fontWeight: 'bold' }}>← ユーザー画面に戻る</Link></div>
      </div>
    </div>
  );

  const activeHorseMasters = horseMasterList.filter(h => h.status !== '引退' && h.status !== '種牡馬/繁殖牝馬');
  const pedigreeHorseMasters = horseMasterList.filter(h => h.status === '種牡馬/繁殖牝馬');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      {/* 📱 スマホ＆PCハイブリッド型 管理メニュー */}
      <header style={{ backgroundColor: '#1e3a8a', padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>🍏 青森県競馬 コントロールセンター</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/owner" style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>馬主 ↗</Link>
            <Link href="/" style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>IPAT ↗</Link>
          </div>
        </div>

        {/* 📱 スマホ横スクロール可能タブメニュー */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
          <NavChip active={adminTab === 'race_requests_admin'} onClick={() => setAdminTab('race_requests_admin')} text={`出走申請 (${raceRequests.length})`} />
          <NavChip active={adminTab === 'users'} onClick={() => setAdminTab('users')} text="プレイヤー管理" />
          <NavChip active={adminTab === 'race'} onClick={() => setAdminTab('race')} text="12R一括/条件" />
          <NavChip active={adminTab === 'settle'} onClick={() => setAdminTab('settle')} text="着順確定" />
          <NavChip active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} text="出走馬/新聞" />
          <NavChip active={adminTab === 'bulk_import'} onClick={() => setAdminTab('bulk_import')} text="テキスト一括" />
          <NavChip active={adminTab === 'pool_monitor'} onClick={() => setAdminTab('pool_monitor')} text="プール監視" />
          <NavChip active={adminTab === 'auction_admin'} onClick={() => setAdminTab('auction_admin')} text="セレクトセール" />
          <NavChip active={adminTab === 'news_edit'} onClick={() => setAdminTab('news_edit')} text="アプデ配信" />
          <NavChip active={adminTab === 'chat_admin'} onClick={() => setAdminTab('chat_admin')} text="チャット管理" />
          <NavChip active={adminTab === 'breed_edit'} onClick={() => setAdminTab('breed_edit')} text="生産馬編集" />
          <NavChip active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} text="現役馬マスター" />
        </div>
      </header>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        
        {['horses', 'race', 'odds', 'settle'].includes(adminTab) && (
          <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>編集するレースを選択 (1〜12R):</div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                <button key={no} onClick={() => setSelectedRaceNo(no)} style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc', color: selectedRaceNo === no ? '#ffffff' : '#475569' }}>
                  {no}R {races.find(r=>r.race_number===no)?.status === 'closed' ? '🔒' : races.find(r=>r.race_number===no)?.status === 'finished' ? '🏁' : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ maxWidth: '900px', margin: '0 auto' }}>

          {/* 📨 TAB: 馬主からの出走申請 */}
          {adminTab === 'race_requests_admin' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '2px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '16px', fontWeight: 'bold' }}>
                  📨 出走 ＆ 騎手 申請リスト ({raceRequests.length}件)
                </h2>
                <button onClick={fetchRaceRequests} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  🔄 更新
                </button>
              </div>

              {raceRequests.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                  現在未処理の出走申請はありません。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {raceRequests.map(req => (
                    <div key={req.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '13px' }}>
                            【{req.target_race_no}R】
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#16a34a' }}>🐎 {req.horse_name}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#475569' }}>馬主: {req.owner_name}</span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: 'bold' }}>
                        希望騎手: 🏇 {req.preferred_jockey}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleApproveRaceRequest(req)} style={{ flex: 1, padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                          承認・自動登録 🟢
                        </button>
                        <button onClick={() => handleRejectRaceRequest(req)} style={{ padding: '10px 14px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                          拒否 🔴
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 💬 TAB: 復活 パドックチャット管理・削除 */}
          {adminTab === 'chat_admin' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 14px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                💬 パドック雑談チャット リアルタイム監視＆削除
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {chatMessages.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>投稿はありません</div>
                ) : (
                  chatMessages.map(m => (
                    <div key={m.id} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '13px' }}>👤 {m.discord_name}</div>
                        <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>{m.content}</div>
                      </div>
                      <button onClick={() => handleDeleteChatMessage(m.id)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                        削除 🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 🧬 TAB: 復活 生産馬 個別確認・編集 */}
          {adminTab === 'breed_edit' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 14px 0', color: '#16a34a', fontSize: '18px', fontWeight: 'bold' }}>🧬 馬主別 生産馬パラメータ直接編集</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>確認・編集したい馬主を選択</label>
                <select value={breedEditOwnerName} onChange={e => setBreedEditOwnerName(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '2px solid #16a34a', fontSize: '14px', fontWeight: 'bold', backgroundColor: '#f0fdf4', width: '100%' }}>
                  {users.map(u => (
                    <option key={u.id} value={u.discord_name}>👤 {u.discord_name} 様の生産所有馬</option>
                  ))}
                </select>
              </div>

              <h3 style={{ margin: '16px 0 10px 0', color: '#1e3a8a', fontSize: '15px', fontWeight: 'bold' }}>
                🐎 【{breedEditOwnerName}】 様の生産馬 ({userBredHorses.length}頭)
              </h3>

              {userBredHorses.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '10px' }}>生産馬はありません</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {userBredHorses.map(h => (
                    <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', alignItems: 'center' }}>
                        <div><label style={labelStyle}>馬名</label><input type="text" value={h.name || ''} onChange={e => handleUpdateBredHorseDetail(h.id, 'name', e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} /></div>
                        <div><label style={labelStyle}>素質</label><select value={h.rank || 'C'} onChange={e => handleUpdateBredHorseDetail(h.id, 'rank', e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#dc2626' }}>{['SS', 'S', 'A', 'B', 'C'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>スピード</label><select value={h.speed || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'speed', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>スタミナ</label><select value={h.stamina || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'stamina', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label style={labelStyle}>根性</label><select value={h.guts || 'B'} onChange={e => handleUpdateBredHorseDetail(h.id, 'guts', e.target.value)} style={inputStyle}>{['S', 'A', 'B', 'C', 'D'].map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div style={{ textAlign: 'right', marginTop: '10px' }}><button onClick={() => handleDeleteBredHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>削除</button></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🐎 TAB: 復活 現役競走馬マスター */}
          {adminTab === 'horse_masters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>🐎 競走馬を新規直接登録</h3>
                <form onSubmit={handleAddHorseMaster} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <input type="text" placeholder="馬名" value={addHorseMasterName} onChange={e=>setAddHorseMasterName(e.target.value)} style={inputStyle} required />
                  <input type="text" placeholder="馬主名 (空欄なら運営直営)" value={addHorseMasterOwner} onChange={e=>setAddHorseMasterOwner(e.target.value)} style={inputStyle} />
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>登録</button>
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>📋 現役競走馬マスター ({activeHorseMasters.length}頭)</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '12px', minWidth: '450px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>馬名</th><th>馬主</th><th>状態</th><th>操作</th><th>削除</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHorseMasters.map(hm => (
                        <tr key={hm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: '#16a34a' }}>🐎 {hm.name}</td>
                          <td style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {hm.owner_name || '未設定'}</td>
                          <td><span style={{ padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px', color: '#fff', backgroundColor: hm.status === '引退申請中' ? '#eab308' : hm.status === '放牧中' ? '#3b82f6' : '#16a34a' }}>{hm.status || '現役'}</span></td>
                          <td><button onClick={() => handleToggleRestingStatus(hm.id, hm.status)} style={{ backgroundColor: hm.status === '放牧中' ? '#16a34a' : '#3b82f6', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>{hm.status === '放牧中' ? '復帰' : '放牧'}</button></td>
                          <td><button onClick={()=>handleDeleteHorseMaster(hm.id, hm.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>削除</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ⚡ 12R一括コントロール ＆ 開催リセット ＆ 個別条件設定 */}
          {adminTab === 'race' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '2px solid #2563eb' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>⚡ 1R〜12R 一括状態コントロール</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => handleBulkSetRaceStatus('open')} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    🟢 全12R 受付開始
                  </button>
                  <button onClick={() => handleBulkSetRaceStatus('closed')} style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    🔒 全12R 投票締切
                  </button>
                  <button onClick={handleResetAllRaces} style={{ backgroundColor: '#64748b', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                    🧹 開催クリア
                  </button>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>🛠️ 【{selectedRaceNo}R】 レース名・条件設定</h3>
                
                <form onSubmit={handleUpdateRaceInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <div>
                    <label style={labelStyle}>レース名</label>
                    <input type="text" placeholder="例: 青森県ダービー" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#1e3a8a' }} required />
                  </div>
                  
                  <div>
                    <label style={labelStyle}>🏆 レース格付け</label>
                    <select value={editGrade} onChange={e=>setEditGrade(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: editGrade === 'G1' ? '#dc2626' : editGrade === 'G2' ? '#d97706' : '#2563eb' }}>
                      <option value="一般">一般競走</option>
                      <option value="G3">G3 重賞</option>
                      <option value="G2">G2 重賞</option>
                      <option value="G1">G1 最高峰競走</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div><label style={labelStyle}>距離 (m)</label><input type="number" step="100" value={editDistance} onChange={e=>setEditDistance(Number(e.target.value))} style={inputStyle} /></div>
                    <div><label style={labelStyle}>馬場</label><select value={editCondition} onChange={e=>setEditCondition(e.target.value)} style={inputStyle}><option value="良">良</option><option value="稍重">稍重</option><option value="重">重</option><option value="不良">不良</option></select></div>
                    <div><label style={labelStyle}>天候</label><select value={editWeather} onChange={e=>setEditWeather(e.target.value)} style={inputStyle}><option value="晴">晴</option><option value="曇">曇</option><option value="雨">雨</option><option value="雪">雪</option></select></div>
                  </div>
                  <div>
                    <label style={labelStyle}>💰 1着総賞金 (G)</label>
                    <input type="number" step="100000" value={editPrize} onChange={e=>setEditPrize(Number(e.target.value))} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }} />
                  </div>
                  <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                    設定を保存 💾
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 📊 リアルタイム総プール ＆ 投票偏り監視パネル */}
          {adminTab === 'pool_monitor' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>📊 総プール＆偏り監視</h2>
                <button onClick={fetchAllBets} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>🔄 更新</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(no => {
                  const r = races.find(race => race.race_number === no);
                  const raceBets = allBets.filter(b => String(b.race_id) === String(r?.id));
                  const totalG = raceBets.reduce((sum, b) => sum + Number(b.amount || 0), 0);

                  return (
                    <div key={no} style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e3a8a' }}>【{no}R】{r?.title || '未設定'}</span>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>件数: {raceBets.length}件</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ fontSize: '16px', color: '#16a34a', fontWeight: '900' }}>{totalG.toLocaleString()} G</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📝 出走馬テキスト一括登録 */}
          {adminTab === 'bulk_import' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                📝 出走馬テキスト爆速一括登録
              </h2>
              <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '12px' }}>
                `馬番, 馬名, 騎手, 年齢` で貼り付けて一括登録！
              </p>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>対象レース</label>
                <select value={selectedRaceNo} onChange={e => setSelectedRaceNo(Number(e.target.value))} style={inputStyle}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                    <option key={no} value={no}>{no}R ({races.find(r=>r.race_number===no)?.title || '未設定'})</option>
                  ))}
                </select>
              </div>

              <textarea
                rows={6}
                placeholder="1, カマクラドリーム, 武豊, 3&#10;2, ツガルキング, ルメール, 4"
                value={bulkImportText}
                onChange={e => setBulkImportText(e.target.value)}
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical', marginBottom: '12px' }}
              />

              <button onClick={handleBulkImportHorses} style={{ width: '100%', padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                【{selectedRaceNo}R】に一括登録 📝
              </button>
            </div>
          )}

          {/* 👤 TAB: プレイヤー管理 ＋ 🎖️ 称号授与 ＋ 🎁 ログボ ＋ 🏋️‍♂️ 調教確率設定 */}
          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 14px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>👤 プレイヤー管理 ＆ 称号授与</h2>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>操作するプレイヤーを選択</label>
                  <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#eff6ff', width: '100%' }}>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.discord_name} (残高: {(u.balance || 0).toLocaleString()}G)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#16a34a', fontSize: '14px' }}>💰 コイン加算・引き落とし</h4>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input type="number" step="100000" value={amountToAddInput} onChange={e => setAmountToAddInput(Number(e.target.value))} style={{ ...inputStyle, width: '140px', fontWeight: 'bold' }} />
                        <button onClick={() => handleAddUserBalance(amountToAddInput)} style={{ padding: '10px 14px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>➕ 加算</button>
                        <button onClick={() => handleAddUserBalance(-amountToAddInput)} style={{ padding: '10px 14px', backgroundColor: '#ca8a04', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>➖ 減算</button>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                    <div>
                      <h4 style={{ margin: '0 0 8px 0', color: '#ca8a04', fontSize: '14px' }}>🎖️ 限定称号を授与</h4>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input type="text" placeholder="例: 万馬券ハンター" value={customTitleInput} onChange={e=>setCustomTitleInput(e.target.value)} style={inputStyle} />
                        <button onClick={handleUpdateUserTitle} style={{ padding: '10px 14px', backgroundColor: '#ca8a04', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px' }}>授与 🎖️</button>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>所持コイン（直接上書き）</label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input type="number" value={customBalanceInput} onChange={e => setCustomBalanceInput(e.target.value)} style={inputStyle} />
                          <button onClick={handleSetUserBalance} style={{ padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>設定</button>
                        </div>
                      </div>

                      <button onClick={() => handleDeleteUser()} style={{ padding: '10px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>🗑️ ユーザー削除</button>
                    </div>
                  </div>
                )}
              </div>

              {/* 🏋️‍♂️ 馬主限定 調教成功確率コントロール */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '2px solid #2563eb' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2563eb', fontSize: '16px', fontWeight: 'bold' }}>🏋️‍♂️ 調教成功確率設定</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>成功確率 (%)</label>
                    <input type="number" min="0" max="100" value={trainingSuccessRate} onChange={e=>setTrainingSuccessRate(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>大成功(S)率 (%)</label>
                    <input type="number" min="0" max="100" value={trainingSuperRate} onChange={e=>setTrainingSuperRate(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <button onClick={handleSaveTrainingRates} style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>保存</button>
                </div>
              </div>
            </div>
          )}

          {/* 🔨 TAB: 運営公式セレクトセール出品 */}
          {adminTab === 'auction_admin' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
              <h2 style={{ margin: '0 0 14px 0', color: '#d97706', fontSize: '18px', fontWeight: 'bold' }}>
                🔨 運営公式 セレクトセール出品
              </h2>
              <form onSubmit={handleAddOfficialAuction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>目玉競走馬の名前</label>
                  <input type="text" placeholder="例: ★SS確定 サンデーサイレンス産駒" value={officialHorseName} onChange={e=>setOfficialHorseName(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>最低開始価格 (G)</label>
                  <input type="number" step="100000" value={officialStartPrice} onChange={e=>setOfficialStartPrice(Number(e.target.value))} style={inputStyle} required />
                </div>
                <button type="submit" style={{ padding: '14px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                  セレクトセールに出品する 🔨
                </button>
              </form>
            </div>
          )}

          {/* 🐴 TAB: 出走馬追加 ＆ 🗞️ 競馬新聞印コントロール */}
          {adminTab === 'horses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '15px' }}>🗞️ 予想印（◎○▲△）管理</h3>
                </div>
                <button onClick={handleAutoAssignMarks} style={{ backgroundColor: '#1e3a8a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                  🤖 AI自動記印
                </button>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '16px' }}>➕ 【{selectedRaceNo}R】 出走馬追加</h3>
                <form onSubmit={handleAddHorse} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: '8px' }}>
                    <div><label style={labelStyle}>馬番</label><input type="number" value={newHorseNumber} onChange={e=>setNewHorseNumber(Number(e.target.value))} style={inputStyle} /></div>
                    <div>
                      <label style={labelStyle}>馬名</label>
                      <select value={newHorseName} onChange={e=>setNewHorseName(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#16a34a' }}>
                        {activeHorseMasters.map(h => <option key={h.id} value={h.name}>🐎 {h.name}</option>)}
                      </select>
                    </div>
                    <div><label style={labelStyle}>騎手</label><select value={newJockey} onChange={e=>setNewJockey(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#2563eb' }}>{jockeyList.map(j => <option key={j.id} value={j.name}>🏇 {j.name}</option>)}</select></div>
                  </div>
                  <button type="submit" style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>出走確定 ➕</button>
                </form>
              </div>

              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>📋 出走馬一覧</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '400px' }}>
                    <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}><th style={{ padding: '8px' }}>番</th><th>印</th><th>馬名</th><th>騎手</th><th>操作</th></tr></thead>
                    <tbody>
                      {horses.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{h.horse_number}</td>
                          <td>
                            <select value={h.mark || '・'} onChange={e => handleUpdateHorseDetail(h.id, 'mark', e.target.value)} style={{ padding: '2px', fontWeight: 'bold', color: '#dc2626' }}>
                              {['◎', '○', '▲', '△', '×', '・'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#16a34a' }}>🐎 {h.name}</td>
                          <td style={{ color: '#2563eb', fontWeight: 'bold' }}>🏇 {h.jockey}</td>
                          <td><button onClick={()=>handleDeleteHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>削除</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 🏆 TAB: 着順確定 */}
          {adminTab === 'settle' && (
            <div style={{ border: '2px solid #2563eb', padding: '20px', borderRadius: '16px', backgroundColor: '#ffffff' }}>
              <h3 style={{ color: '#1e3a8a', marginTop: 0, fontWeight: 'bold', fontSize: '18px' }}>
                🏆 【{selectedRaceNo}R】 着順確定（1着〜9着）
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div><label style={{ fontSize: '11px', color: '#dc2626', fontWeight: 'bold', display: 'block' }}>🥇 1着 (必須)</label><select value={rank1} onChange={e=>setRank1(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '11px', color: '#2563eb', fontWeight: 'bold', display: 'block' }}>🥈 2着</label><select value={rank2} onChange={e=>setRank2(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={{ fontSize: '11px', color: '#ca8a04', fontWeight: 'bold', display: 'block' }}>🥉 3着</label><select value={rank3} onChange={e=>setRank3(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>4着</label><select value={rank4} onChange={e=>setRank4(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>5着</label><select value={rank5} onChange={e=>setRank5(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
                <div><label style={labelStyle}>6着</label><select value={rank6} onChange={e=>setRank6(e.target.value)} style={inputStyle}><option value="">選択</option>{horses.map(h => <option key={h.id} value={h.horse_number}>{h.horse_number}番 {h.name}</option>)}</select></div>
              </div>

              <button 
                onClick={handleSettleFullRace} 
                style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '16px', fontSize: '16px', fontWeight: 'bold', borderRadius: '10px', cursor: 'pointer' }}
              >
                🏁 結果確定・配当金自動振込 💰
              </button>
            </div>
          )}

          {/* 📢 TAB: アプデ・お知らせ配信 */}
          {adminTab === 'news_edit' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
              <h2 style={{ margin: '0 0 14px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                📢 アプデ・お知らせ新規配信
              </h2>
              <form onSubmit={handleAddNews} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>タイトル</label>
                  <input type="text" placeholder="例: 大型アップデート完了！" value={newsTitle} onChange={e=>setNewsTitle(e.target.value)} style={inputStyle} required />
                </div>
                <div>
                  <label style={labelStyle}>本文</label>
                  <textarea rows={4} placeholder="内容を入力" value={newsContent} onChange={e=>setNewsContent(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} required />
                </div>
                <button type="submit" style={{ padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                  全プレイヤーにお知らせ配信 📢
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function NavChip({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '20px',
        border: 'none',
        fontWeight: 'bold',
        fontSize: '11px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        backgroundColor: active ? '#2563eb' : '#1e40af',
        color: active ? '#ffffff' : '#bfdbfe',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '3px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px' };