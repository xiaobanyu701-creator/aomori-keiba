'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<
    'horses' | 'race' | 'odds' | 'settle' | 'jockeys' | 'horse_masters' | 
    'owner_assign' | 'users' | 'breed_edit' | 'news_edit' | 'pedigree_admin' | 
    'chat_admin' | 'auction_admin' | 'bulk_import' | 'pool_monitor' | 
    'race_requests_admin' | 'live_stream' | 'mvp_reward' | 'maintenance' | 
    'anomaly_detect' | 'analytics'
  >('users');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);
  const [raceRequests, setRaceRequests] = useState<any[]>([]);

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

  // 🎁 全ユーザー一括配布用
  const [bulkGiftAmount, setBulkImportGiftAmount] = useState<number>(1000000);

  // 🌐 IPアドレス管理・検索用
  const [ipSearchQuery, setIpSearchQuery] = useState<string>('');

  const [breedEditOwnerName, setBreedEditOwnerName] = useState<string>('');
  const [userBredHorses, setUserBredHorses] = useState<any[]>([]);

  const [newsTitle, setNewsTitle] = useState('');
  const [newsContent, setNewsContent] = useState('');
  const [newsList, setNewsList] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [auctions, setAuctions] = useState<any[]>([]);
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
  // 🕒 発走予定時刻（自動締め切り用）
  const [editStartTime, setEditStartTime] = useState('15:30');

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

  // 🎥 生配信URL設定
  const [liveStreamUrl, setLiveStreamUrl] = useState('');

  // 🛑 メンテナンスモード設定
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // 🏷️ 個人間所有権譲渡用
  const [transferHorseName, setTransferHorseName] = useState('');
  const [transferTargetOwner, setTransferTargetOwner] = useState('');

  // 🤖 Discord WebHook 自動送信処理
  const sendDiscordNotification = async (title: string, description: string, color: number = 0x1e3a8a) => {
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: title,
              description: description,
              color: color,
              footer: { text: '🍏 青森県競馬 公式AI実況システム' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (e) {
      console.error('Discord通知送信失敗:', e);
    }
  };

  useEffect(() => { 
    if (isAuthenticated) { 
      fetchRaces(); fetchUsers(); fetchJockeys(); fetchHorseMasters(); fetchNews(); fetchChat(); fetchAllBets(); fetchRaceRequests(); fetchAuctions();
      const cfg = Number(localStorage.getItem('daily_bonus_amount') || 100000);
      setDailyBonusConfig(cfg);
      const sRate = Number(localStorage.getItem('training_success_rate') || 70);
      const spRate = Number(localStorage.getItem('training_super_rate') || 15);
      setTrainingSuccessRate(sRate);
      setTrainingSuperRate(spRate);
      
      const stream = localStorage.getItem('app_live_stream_url') || '';
      setLiveStreamUrl(stream);
      const maint = localStorage.getItem('app_maintenance_mode') === 'true';
      setIsMaintenanceMode(maint);
    } 
  }, [isAuthenticated]);

  // 🕒 毎10秒ごとに発走時刻を監視して自動で閉鎖（自動締め切りタイマー）
  useEffect(() => {
    if (!isAuthenticated || races.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      races.forEach(async (r) => {
        if (r.status === 'open' && r.start_time && currentHHMM >= r.start_time) {
          await supabase.from('races').update({ status: 'closed' }).eq('id', r.id);
          sendDiscordNotification(
            `🔒 【${r.race_number}R】 投票自動締め切り`,
            `発走予定時刻（${r.start_time}）に達したため、【${r.race_number}R ${r.title || ''}】の投票受付を自動締め切りました！`,
            0xdc2626
          );
          fetchRaces();
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [races, isAuthenticated]);

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
        setEditStartTime(race.start_time || '15:30');
        fetchHorses(race.id);
      } else {
        setEditTitle('');
        setEditDistance(1600);
        setEditCondition('良');
        setEditWeather('晴');
        setEditPrize(1000000);
        setEditGrade('一般');
        setEditStartTime('15:30');
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
    const { data } = await supabase.from('horse_masters').select('*').eq('owner_name', ownerName);
    if (data) setUserBredHorses(data);
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

  const fetchAuctions = async () => {
    try {
      const { data } = await supabase.from('auctions').select('*').eq('status', 'active');
      if (data) setAuctions(data);
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

  // 🎥 生配信URLの更新
  const handleSaveLiveStreamUrl = () => {
    localStorage.setItem('app_live_stream_url', liveStreamUrl);
    alert('🎥 生配信プレイヤーURLを更新しました！ユーザー画面に反映されます。');
  };

  // 🛑 メンテナンスモード切替
  const handleToggleMaintenance = () => {
    const nextState = !isMaintenanceMode;
    setIsMaintenanceMode(nextState);
    localStorage.setItem('app_maintenance_mode', nextState.toString());
    
    sendDiscordNotification(
      nextState ? '🛑 緊急メンテナンス開始' : '🟢 メンテナンス終了',
      nextState ? '現在システム更新のためメンテナンスモードに移行しました。' : 'メンテナンスが完了し、正常にサービスを再開いたしました！',
      nextState ? 0xef4444 : 0x16a34a
    );

    alert(`🛑 メンテナンスモードを【 ${nextState ? 'ON (ロック)' : 'OFF (通常)'} 】に切り替えました！`);
  };

  // 🏆 今節MVP表彰＆ボーナス付与
  const handleAwardMvp = async () => {
    if (!selectedUser) return;
    const bonus = 5000000;
    const newBal = (selectedUser.balance || 0) + bonus;

    await supabase.from('users').update({ balance: newBal, title: '👑 今節最優秀馬主' }).eq('id', selectedUser.id);

    sendDiscordNotification(
      '🏆 今節のMVP（最優秀馬主）表彰！',
      `🎉 今節の最優秀馬主賞は **${selectedUser.discord_name}** 様に決定！\n栄誉称号 **【 👑 今節最優秀馬主 】** ＆ 特別賞金 **${bonus.toLocaleString()} G** が贈呈されました！`,
      0xeab308
    );

    alert(`🏆 「${selectedUser.discord_name}」様を今節MVPとして表彰し、500万Gを贈呈しました！`);
    fetchUsers();
  };

  // 🏷️ 馬のダイレクト所有権譲渡
  const handleTransferHorseOwnership = async () => {
    if (!transferHorseName || !transferTargetOwner) return alert('馬名と譲渡先馬主名を入力してください');
    if (!confirm(`「${transferHorseName}」の所有権を「${transferTargetOwner}」様へ直接譲渡しますか？`)) return;

    await supabase.from('horse_masters').update({ owner_name: transferTargetOwner, status: '現役' }).eq('name', transferHorseName);

    sendDiscordNotification(
      '🏷️ 愛馬の所有権譲渡成立',
      `**【${transferHorseName}】** の所有権が **${transferTargetOwner}** 様へ正式に譲渡されました！`,
      0x2563eb
    );

    alert(`✅ 「${transferHorseName}」を「${transferTargetOwner}」様へ譲渡しました！`);
    setTransferHorseName(''); setTransferTargetOwner(''); fetchHorseMasters();
  };

  // 💉 故障ケガランダム発生・治療
  const handleInjuryOrHealHorse = async (horseId: string, horseName: string, action: 'injure' | 'heal') => {
    const nextStatus = action === 'injure' ? '故障休養中(屈腱炎)' : '現役';
    await supabase.from('horse_masters').update({ status: nextStatus }).eq('id', horseId);
    alert(`💉 「${horseName}」のステータスを【 ${nextStatus} 】へ変更しました。`);
    fetchHorseMasters();
  };

  // 🔑 PINコードのリセット機能
  const handleResetPinCode = async () => {
    if (!selectedUser) return;
    if (!confirm(`「${selectedUser.discord_name}」様の暗証番号（PIN）を【 0000 】に初期化しますか？`)) return;

    await supabase.from('users').update({ pin_code: '0000' }).eq('id', selectedUser.id);

    sendDiscordNotification(
      '🛡️ 管理者セキュリティログ',
      `ユーザー **${selectedUser.discord_name}** の暗証番号(PIN)が初期化されました。`,
      0x64748b
    );

    alert(`🔑 「${selectedUser.discord_name}」様の暗証番号を【 0000 】にリセットしました！`);
    setCustomPinInput('0000'); fetchUsers();
  };

  // 🎁 全ユーザー一括コイン配布
  const handleDistributeBulkCoins = async () => {
    if (bulkGiftAmount <= 0) return alert('正しい金額を入力してください');
    if (!confirm(`全プレイヤー（${users.length}名）へ一斉に【 ${bulkGiftAmount.toLocaleString()} G 】をプレゼントしますか？`)) return;

    for (const u of users) {
      const newBal = (u.balance || 0) + bulkGiftAmount;
      await supabase.from('users').update({ balance: newBal }).eq('id', u.id);
    }

    sendDiscordNotification(
      '🎁 運営特別一括ボーナス配布！',
      `全プレイヤーへ **【 ${bulkGiftAmount.toLocaleString()} G 】** がプレゼントされました！所持金をご確認ください！`,
      0xeab308
    );

    alert(`🎉 全プレイヤーへ ${bulkGiftAmount.toLocaleString()} G を一括配布しました！`);
    fetchUsers();
  };

  // 💸 馬券返還・全額自動返金処理
  const handleRefundRaceBets = async () => {
    if (!currentRace) return;
    if (!confirm(`⚠️ 警告: 【${selectedRaceNo}R】に賭けられたすべての馬券をキャンセルし、全ユーザーへ賭け金を完全返金しますか？`)) return;

    const { data: bets } = await supabase.from('bets').select('*').eq('race_id', String(currentRace.id));
    if (bets && bets.length > 0) {
      for (const b of bets) {
        const refundAmount = Number(b.amount || 0);
        if (refundAmount > 0) {
          const { data: uData } = await supabase.from('users').select('balance').eq('id', b.user_id);
          if (uData && uData.length > 0) {
            const currentBal = Number(uData[0].balance || 0);
            await supabase.from('users').update({ balance: currentBal + refundAmount }).eq('id', b.user_id);
          }
        }
        await supabase.from('bets').delete().eq('id', b.id);
      }
    }

    await supabase.from('races').update({ status: 'open' }).eq('id', currentRace.id);

    sendDiscordNotification(
      `💸 【${selectedRaceNo}R】全額返還（返金）のお知らせ`,
      `【${selectedRaceNo}R】は出走除外/中止のため、投票されたすべての馬券代金がプレイヤー口座へ全額自動返還されました。`,
      0xdc2626
    );

    alert(`💸 【${selectedRaceNo}R】の賭け金を全額返金し、投票データをリセットしました！`);
    fetchRaces(); fetchUsers(); fetchAllBets();
  };

  // 🔄 着順確定の取り消し（清算キャンセル）機能
  const handleUnsettleRace = async () => {
    if (!currentRace) return;
    if (!confirm(`⚠️ 【${selectedRaceNo}R】の確定状態を取り消しますか？\n（付与された的中配当金を引き落とし、未確定に戻します）`)) return;

    const { data: bets } = await supabase.from('bets').select('*').eq('race_id', String(currentRace.id));
    if (bets && bets.length > 0) {
      for (const b of bets) {
        const payout = Number(b.payout_amount || 0);
        if (payout > 0 && b.is_claimed) {
          const { data: uData } = await supabase.from('users').select('balance').eq('id', b.user_id);
          if (uData && uData.length > 0) {
            const currentBal = Number(uData[0].balance || 0);
            await supabase.from('users').update({ balance: Math.max(0, currentBal - payout) }).eq('id', b.user_id);
          }
        }
        await supabase.from('bets').update({ payout_amount: 0, is_claimed: false }).eq('id', b.id);
      }
    }

    await supabase.from('races').update({
      status: 'open',
      first_horse: null, second_horse: null, third_horse: null
    }).eq('id', currentRace.id);

    alert(`🔄 【${selectedRaceNo}R】の着順確定を取り消し、配当金を回収しました！`);
    fetchRaces(); fetchUsers(); fetchAllBets();
  };

  // 🔨 セリ（オークション）の強制取り消し
  const handleForceCancelAuction = async (auctionId: string, horseName: string) => {
    if (!confirm(`「${horseName}」のセリ出品を強制取り消し（削除）しますか？`)) return;

    await supabase.from('auctions').delete().eq('id', auctionId);
    await supabase.from('horse_masters').update({ status: '現役' }).eq('name', horseName);

    alert(`🔨 「${horseName}」のセリ出品を取り消しました。`);
    fetchAuctions(); fetchHorseMasters();
  };

  // 🏆 6. AIライバル馬主（CPU強豪馬）自動エントリー機能
  const handleAddAiRivalHorse = async () => {
    if (!currentRace) return;
    const rivals = ['[AI馬主] 帝王ペガサス', '[AI馬主] 疾風シャドー', '[AI馬主] 覇王カイザー', '[AI馬主] イナズマライジン'];
    const nextNo = horses.length + 1;
    const rivalName = rivals[Math.floor(Math.random() * rivals.length)];

    await supabase.from('horses').insert([{
      race_id: currentRace.id,
      horse_number: nextNo,
      name: rivalName,
      jockey: 'ルメール',
      manual_odds: 2.5,
    }]);

    alert(`🏆 【AIライバル陣営】 「${rivalName}」が ${nextNo}番枠に自動参戦しました！`);
    fetchHorses(currentRace.id);
  };

  // 🤖 7. AI自動オッズ計算・一括設定処理
  const handleAutoCalculateOdds = async () => {
    if (!horses || horses.length === 0) return alert('出走馬が登録されていません');
    if (!confirm(`【${selectedRaceNo}R】の全出走馬（${horses.length}頭）の単勝オッズをAI自動計算して一括更新しますか？`)) return;

    const baseOdds = [2.1, 3.5, 4.8, 6.2, 8.5, 12.0, 18.5, 25.0, 38.0, 50.0, 75.0, 99.0];

    for (let i = 0; i < horses.length; i++) {
      const h = horses[i];
      const masterObj = horseMasterList.find(m => m.name === h.name);
      
      let score = 50;
      if (masterObj) {
        const rankMap: { [key: string]: number } = { SS: 40, S: 30, A: 20, B: 10, C: 0 };
        score += rankMap[masterObj.rank] || 10;
        score += rankMap[masterObj.speed] || 10;
      }

      const randFactor = (Math.random() * 0.4) + 0.8; 
      let calculatedOdds = Number(( (baseOdds[i] || (i + 1) * 5) * randFactor ).toFixed(1));
      calculatedOdds = Math.max(1.3, calculatedOdds);

      await supabase.from('horses').update({ manual_odds: calculatedOdds }).eq('id', h.id);
    }

    alert(`🤖 【${selectedRaceNo}R】の出走馬オッズをAI自動設定・保存しました！`);
    if (currentRace?.id) fetchHorses(currentRace.id);
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

    sendDiscordNotification(
      '🐎 出走確定アナウンス',
      `**${req.owner_name}** 様の愛馬 **【${req.horse_name}】** が【${req.target_race_no}R】 ${nextHorseNo}番 (騎手: ${req.preferred_jockey}) に登録されました！`,
      0x16a34a
    );

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

    if (status === 'open') {
      sendDiscordNotification('📢 本日の全12レース 投票受付開始！', '全レースの即パット投票がオープンしました！IPAT画面から投票できます！', 0x2563eb);
    } else {
      sendDiscordNotification('🔒 全レース 投票一括締め切り', '本日全レースの投票受付が終了しました！発走までしばらくお待ちください。', 0xdc2626);
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
      start_time: editStartTime,
      status: currentRace?.status || 'open',
    };

    if (currentRace?.id) {
      await supabase.from('races').update(racePayload).eq('id', currentRace.id);
    } else {
      await supabase.from('races').insert([racePayload]);
    }

    alert(`🎉 【${selectedRaceNo}R】 の条件（発走時刻: ${editStartTime}）を保存しました！`);
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

    sendDiscordNotification(
      '🔨 運営公式 セレクトセール開催！',
      `目玉競走馬 **【${officialHorseName}】** がセリ会場に登場しました！\n最低開始価格: **${officialStartPrice.toLocaleString()} G**`,
      0xd97706
    );

    alert(`👑 運営公式セレクトセールに「${officialHorseName}」を出品しました！`);
    setOfficialHorseName(''); fetchAuctions();
  };

  const handleSaveTrainingRates = () => {
    localStorage.setItem('training_success_rate', trainingSuccessRate.toString());
    localStorage.setItem('training_super_rate', trainingSuperRate.toString());
    alert(`🏋️‍♂️ 調教確率を保存しました！\n・通常成功率: ${trainingSuccessRate}%\n・大成功(Sランク)率: ${trainingSuperRate}%`);
  };

  const handleUpdateUserTitle = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ title: customTitleInput }).eq('id', selectedUser.id);
    
    sendDiscordNotification(
      '🎖️ 栄誉ある称号授与！',
      `**${selectedUser.discord_name}** 様に限定称号 **【 ${customTitleInput} 】** が与えられました！`,
      0xca8a04
    );

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

    sendDiscordNotification(
      `📢 【アプデ・お知らせ】 ${newsTitle}`,
      newsContent,
      0x2563eb
    );

    setNewsTitle(''); setNewsContent('');
    alert('📢 アプデ・お知らせを配信しました！'); fetchNews();
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

  // 🗑️ アカウント消去 ＆ 不正セキュリティ通知
  const handleDeleteUser = async (userId?: string, userName?: string) => {
    const targetId = userId || selectedUser?.id;
    const targetName = userName || selectedUser?.discord_name;
    if (!targetId) return;
    if (!confirm(`⚠️ 本当に「${targetName}」様のアカウントを完全に削除しますか？\n（関連するIPアドレス・所持金データも一括消去されます）`)) return;

    await supabase.from('users').delete().eq('id', targetId);

    sendDiscordNotification(
      '🚨 運営アカウント処置通知',
      `不適切なアカウントまたは複アカ疑いの **${targetName}** がDBより物理消去（一括IP・データ消去）されました。`,
      0xef4444
    );

    alert(`🗑️ 「${targetName}」様のアカウントおよび登録IPアドレス情報を完全に消去しました。`);
    if (targetId === selectedUserId) setSelectedUserId(''); fetchUsers();
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

  const handleUpdateHorseDetail = async (horseId: string, field: string, value: any) => {
    await supabase.from('horses').update({ [field]: value }).eq('id', horseId);
    if (currentRace?.id) fetchHorses(currentRace.id);
  };

  // 🎙️ 5. AI実況速報機能付き 🏁 着順確定 ＆ 配当金清算 ＆ Discord自動速報
  const handleSettleFullRace = async () => {
    if (!currentRace || !rank1) return alert('最低限1着の馬を選択してください');
    if (!confirm(`【${selectedRaceNo}R】の結果を確定し、的中者全員へ配当金を自動振込＆AI実況Discord速報を送信しますか？`)) return;

    const h1 = horses.find(h => String(h.horse_number) === String(rank1));
    const h2 = horses.find(h => String(h.horse_number) === String(rank2));
    const h3 = horses.find(h => String(h.horse_number) === String(rank3));

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

    await supabase.from('races').update({ 
      status: 'finished', 
      first_horse: rank1, second_horse: rank2, third_horse: rank3, rank4, rank5, rank6, rank7, rank8, rank9
    }).eq('id', currentRace.id);

    // 🎙️ AI実況ダイジェスト文の動的生成
    const aiDigest = `🎙️ **【AI実況ダイジェスト】**\n「最後の直線、激しい競り合いの中から堂々抜け出したのは **${rank1}番 ${h1 ? h1.name : ''}**！猛烈な追い上げを見せた **${rank2 ? `${rank2}番 ${h2 ? h2.name : ''}` : ''}** を振り切って見事栄冠に輝きました！」`;

    const desc = `
${aiDigest}

🥇 **1着:** ${rank1}番 ${h1 ? h1.name : ''}
🥈 **2着:** ${rank2 ? `${rank2}番 ${h2 ? h2.name : ''}` : '-'}
🥉 **3着:** ${rank3 ? `${rank3}番 ${h3 ? h3.name : ''}` : '-'}

💰 **払戻金（概算）**
・単勝: 350 G
・馬単: 1,500 G
・3連単: 6,500 G

🎯 的中された皆様おめでとうございます！配当金が各口座へ自動振込されました！
`;
    sendDiscordNotification(`🏆 【${selectedRaceNo}R ${currentRace.title || '特別競走'}】 AIレース確定速報！`, desc, 0x16a34a);

    alert(`🏆 【${selectedRaceNo}R】の結果を確定しました！\nAI自動実況付きDiscord速報も自動送信されました！`); 
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

  const filteredUsers = users.filter((u) =>
    ipSearchQuery
      ? (u.ip_address || '').includes(ipSearchQuery) || (u.discord_name || '').includes(ipSearchQuery)
      : true
  );

  const suspiciousBets = allBets.filter(b => Number(b.amount || 0) >= 10000000);

  const betTypeStats = ['単勝', '複勝', '馬単', '馬連', 'ワイド', '3連複', '3連単'].map(type => {
    const total = allBets.filter(b => b.bet_type === type).reduce((sum, b) => sum + Number(b.amount || 0), 0);
    return { type, total };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', color: '#0f172a' }}>
      
      <header style={{ backgroundColor: '#1e3a8a', padding: '12px 16px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '900' }}>🍏 青森県競馬 コントロールセンター</h2>
            {isMaintenanceMode && <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '10px' }}>🛑 メンテ中</span>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Link href="/owner" style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>馬主 ↗</Link>
            <Link href="/" style={{ padding: '4px 10px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '11px', fontWeight: 'bold' }}>IPAT ↗</Link>
          </div>
        </div>

        {/* ナビゲーションタブ */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
          <NavChip active={adminTab === 'users'} onClick={() => setAdminTab('users')} text="👥 プレイヤー・IP照合" />
          <NavChip active={adminTab === 'race'} onClick={() => setAdminTab('race')} text="⚡ 12R一括/時刻設定/返金" />
          <NavChip active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} text="🗞️ 出走馬/AIオッズ/新聞" />
          <NavChip active={adminTab === 'anomaly_detect'} onClick={() => setAdminTab('anomaly_detect')} text={`⚠️ 異常検知 (${suspiciousBets.length})`} />
          <NavChip active={adminTab === 'analytics'} onClick={() => setAdminTab('analytics')} text="📊 売上アナリティクス" />
          <NavChip active={adminTab === 'live_stream'} onClick={() => setAdminTab('live_stream')} text="🎥 生配信枠設定" />
          <NavChip active={adminTab === 'maintenance'} onClick={() => setAdminTab('maintenance')} text="🛑 メンテナンス切替" />
          <NavChip active={adminTab === 'mvp_reward'} onClick={() => setAdminTab('mvp_reward')} text="🏆 今節MVP表彰" />
          <NavChip active={adminTab === 'settle'} onClick={() => setAdminTab('settle')} text="🏁 着順確定/消去" />
          <NavChip active={adminTab === 'race_requests_admin'} onClick={() => setAdminTab('race_requests_admin')} text={`📨 出走申請 (${raceRequests.length})`} />
          <NavChip active={adminTab === 'auction_admin'} onClick={() => setAdminTab('auction_admin')} text={`🔨 セリ管理 (${auctions.length})`} />
          <NavChip active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} text="🐎 現役馬・故障治療" />
          <NavChip active={adminTab === 'breed_edit'} onClick={() => setAdminTab('breed_edit')} text="🧬 生産・譲渡管理" />
          <NavChip active={adminTab === 'news_edit'} onClick={() => setAdminTab('news_edit')} text="📢 アプデ配信" />
          <NavChip active={adminTab === 'chat_admin'} onClick={() => setAdminTab('chat_admin')} text="💬 チャット管理" />
          <NavChip active={adminTab === 'bulk_import'} onClick={() => setAdminTab('bulk_import')} text="📝 テキスト一括" />
          <NavChip active={adminTab === 'pool_monitor'} onClick={() => setAdminTab('pool_monitor')} text="📊 プール監視" />
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

        <div style={{ maxWidth: '950px', margin: '0 auto' }}>

          {/* 🎥 生配信URL設定 */}
          {adminTab === 'live_stream' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
              <h2 style={{ color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🎥 YouTube/Twitch 生配信埋め込み設定</h2>
              <label style={labelStyle}>生配信プレイヤーURL (埋め込み用)</label>
              <input type="text" placeholder="https://www.youtube.com/embed/..." value={liveStreamUrl} onChange={e=>setLiveStreamUrl(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />
              <button onClick={handleSaveLiveStreamUrl} style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                生配信URLを公開保存 🎥
              </button>
            </div>
          )}

          {/* 🛑 メンテナンスモード切替 */}
          {adminTab === 'maintenance' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #ef4444', maxWidth: '500px' }}>
              <h2 style={{ color: '#ef4444', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🛑 メンテナンスモード状態コントロール</h2>
              <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                ONにすると一般プレイヤーのIPAT画面および馬主画面が一時ロックされ、アプデ作業を安全に行えます。
              </p>
              <button onClick={handleToggleMaintenance} style={{ width: '100%', padding: '16px', backgroundColor: isMaintenanceMode ? '#16a34a' : '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                {isMaintenanceMode ? '🟢 メンテナンスを終了する (解除)' : '🛑 緊急メンテナンスを開始する (ロック)'}
              </button>
            </div>
          )}

          {/* 🏆 今節MVP表彰 */}
          {adminTab === 'mvp_reward' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #eab308', maxWidth: '500px' }}>
              <h2 style={{ color: '#ca8a04', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>🏆 今節MVP（最優秀馬主）特別表彰</h2>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>表彰するプレイヤーを選択</label>
                <select value={selectedUserId} onChange={e=>setSelectedUserId(e.target.value)} style={inputStyle}>
                  {users.map(u => <option key={u.id} value={u.id}>👤 {u.discord_name}</option>)}
                </select>
              </div>
              <button onClick={handleAwardMvp} style={{ width: '100%', padding: '14px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                今節MVPとして表彰 ＆ 500万G贈呈 🏆
              </button>
            </div>
          )}

          {/* ⚠️ 異常賭け金アラート */}
          {adminTab === 'anomaly_detect' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#dc2626', fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0' }}>⚠️ 高額・異常取引（インサイダー/複アカ流金）リアルタイム監視</h2>
              {suspiciousBets.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                  現在1,000万G以上の異常・高額賭け金取引は検知されていません。
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {suspiciousBets.map(b => (
                    <div key={b.id} style={{ backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>🚨 異常検知</span>
                        <div style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>【{b.bet_type}】 {b.selection}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '16px', color: '#dc2626', fontWeight: '900' }}>{Number(b.amount).toLocaleString()} G</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 📊 売上アナリティクスグラフ */}
          {adminTab === 'analytics' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h2 style={{ color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold', margin: '0 0 16px 0' }}>📊 券種別 売上アナリティクス</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {betTypeStats.map(s => (
                  <div key={s.type}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
                      <span>🎫 {s.type}</span>
                      <span style={{ color: '#16a34a' }}>{s.total.toLocaleString()} G</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (s.total / 50000000) * 100)}%`, backgroundColor: '#2563eb', height: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ⚡ 12R一括コントロール ＆ 🕒 発走予定時刻設定 ＆ 💸 全額返金 */}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px' }}>🛠️ 【{selectedRaceNo}R】 レース名・自動締切時間設定</h3>
                  <button onClick={handleRefundRaceBets} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    💸 【{selectedRaceNo}R】全額自動返金
                  </button>
                </div>

                <form onSubmit={handleUpdateRaceInfo} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>レース名</label>
                    <input type="text" placeholder="例: 青森県ダービー" value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: '#1e3a8a' }} required />
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={labelStyle}>🏆 レース格付け</label>
                      <select value={editGrade} onChange={e=>setEditGrade(e.target.value)} style={{ ...inputStyle, fontWeight: 'bold', color: editGrade === 'G1' ? '#dc2626' : editGrade === 'G2' ? '#d97706' : '#2563eb' }}>
                        <option value="一般">一般競走</option>
                        <option value="G3">G3 重賞</option>
                        <option value="G2">G2 重賞</option>
                        <option value="G1">G1 最高峰競走</option>
                      </select>
                    </div>

                    {/* 🕒 自動締め切り発走時刻入力フォーム */}
                    <div>
                      <label style={labelStyle}>🕒 発走・自動締切時刻 (例: 15:30)</label>
                      <input
                        type="time"
                        value={editStartTime}
                        onChange={e => setEditStartTime(e.target.value)}
                        style={{ ...inputStyle, fontWeight: 'bold', color: '#dc2626' }}
                      />
                    </div>
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
                    設定を保存 💾 （時刻になると自動締め切り）
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 👥 TAB: プレイヤー管理 */}
          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ backgroundColor: '#fefce8', border: '2px solid #eab308', borderRadius: '16px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#ca8a04', fontSize: '15px', fontWeight: 'bold' }}>
                  🎁 全プレイヤー一括コインプレゼント
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="number" step="100000" value={bulkGiftAmount} onChange={(e) => setBulkImportGiftAmount(Number(e.target.value))} style={{ ...inputStyle, width: '160px', fontWeight: 'bold' }} />
                  <button onClick={handleDistributeBulkCoins} style={{ padding: '10px 16px', backgroundColor: '#eab308', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>全員に配る 🎁</button>
                </div>
              </div>

              <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '20px' }}>
                <h2 style={{ margin: '0 0 14px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>👤 プレイヤー個別管理 ＆ 称号・PIN</h2>
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '2px solid #2563eb', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#eff6ff', width: '100%' }}>
                  {users.map(u => <option key={u.id} value={u.id}>👤 {u.discord_name} (PIN: {u.pin_code || '未設定'} / 残高: {(u.balance || 0).toLocaleString()}G)</option>)}
                </select>

                {selectedUser && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#1e3a8a', fontWeight: 'bold' }}>🔑 PIN: <span style={{ color: '#dc2626' }}>{selectedUser.pin_code || '未設定'}</span></div>
                      <button onClick={handleResetPinCode} style={{ padding: '6px 12px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>🔑 0000に初期化</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input type="number" step="100000" value={amountToAddInput} onChange={e => setAmountToAddInput(Number(e.target.value))} style={{ ...inputStyle, width: '140px' }} />
                      <button onClick={() => handleAddUserBalance(amountToAddInput)} style={{ padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>➕ 加算</button>
                      <button onClick={() => handleAddUserBalance(-amountToAddInput)} style={{ padding: '10px', backgroundColor: '#ca8a04', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>➖ 減算</button>
                    </div>
                    <button onClick={() => handleDeleteUser()} style={{ padding: '10px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>🗑️ ユーザー削除</button>
                  </div>
                )}
              </div>

              {/* 🌐 登録ユーザーIPアドレス一覧＆重複検知テーブル */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#1e3a8a', fontSize: '16px', fontWeight: 'bold' }}>
                  🌐 ユーザー登録IPアドレス管理（複アカ照合・重複検知）
                </h3>

                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="🔍 ユーザー名 または IPアドレスで検索..."
                    value={ipSearchQuery}
                    onChange={(e) => setIpSearchQuery(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>ユーザー名</th>
                        <th style={{ padding: '8px 10px' }}>PIN</th>
                        <th style={{ padding: '8px 10px' }}>所持コイン</th>
                        <th style={{ padding: '8px 10px' }}>登録IPアドレス</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const sameIpCount = users.filter((other) => other.ip_address && other.ip_address === u.ip_address).length;
                        const isMultiAccount = sameIpCount > 1;

                        return (
                          <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: isMultiAccount ? '#fef2f2' : '#ffffff' }}>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#0f172a' }}>
                              👤 {u.discord_name}
                              {isMultiAccount && (
                                <span style={{ backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold' }}>
                                  ⚠️ IP重複 ({sameIpCount}件)
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                              {u.pin_code || '未設定'}
                            </td>
                            <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#16a34a' }}>
                              {(u.balance || 0).toLocaleString()} G
                            </td>
                            <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: u.ip_address ? '#1e40af' : '#94a3b8' }}>
                              🌐 {u.ip_address || '未記録 (旧アカウント)'}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.discord_name)}
                                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}
                              >
                                🗑️ 消去
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 🐴 TAB: 出走馬追加 ＆ 🤖 AI機能群（オッズ・予想印・AIライバル馬主） */}
          {adminTab === 'horses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '16px', border: '2px solid #2563eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>🤖 【{selectedRaceNo}R】 AI予想印 ＆ オッズ ＆ ライバル参戦</h3>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>AIがオッズ計算やCPU強豪馬のエントリーを自動で行います</div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={handleAutoCalculateOdds} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    📈 AIリアルタイムオッズ
                  </button>
                  <button onClick={handleAutoAssignMarks} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    🗞️ AI予想印設定
                  </button>
                  <button onClick={handleAddAiRivalHorse} style={{ backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                    🏆 AIライバル(CPU)参戦
                  </button>
                </div>
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
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>📋 出走馬 ＆ オッズ一覧</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '450px' }}>
                    <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}><th style={{ padding: '8px' }}>番</th><th>印</th><th>馬名</th><th>騎手</th><th>単勝オッズ</th><th>操作</th></tr></thead>
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
                          <td>
                            <input
                              type="number"
                              step="0.1"
                              value={h.manual_odds || 5.0}
                              onChange={e => handleUpdateHorseDetail(h.id, 'manual_odds', Number(e.target.value))}
                              style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: 'bold', color: '#dc2626' }}
                            /> 倍
                          </td>
                          <td><button onClick={()=>handleDeleteHorse(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>削除</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 💬 TAB: パドックチャット管理 */}
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

          {/* 🧬 TAB: 馬の譲渡 ＆ 生産馬管理 */}
          {adminTab === 'breed_edit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '16px', border: '2px solid #2563eb' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2563eb', fontSize: '16px', fontWeight: 'bold' }}>🏷️ 個人間ダイレクト所有権譲渡</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '8px', alignItems: 'end' }}>
                  <div><label style={labelStyle}>譲渡する馬名</label><input type="text" placeholder="例: カマクラキング" value={transferHorseName} onChange={e=>setTransferHorseName(e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>譲渡先馬主(Discord名)</label><input type="text" placeholder="例: 新馬主名" value={transferTargetOwner} onChange={e=>setTransferTargetOwner(e.target.value)} style={inputStyle} /></div>
                  <button onClick={handleTransferHorseOwnership} style={{ padding: '10px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>譲渡実行 🏷️</button>
                </div>
              </div>

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
            </div>
          )}

          {/* 🐎 TAB: 現役馬マスター ＆ 故障治療 */}
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
                <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '16px' }}>📋 現役競走馬マスター ({activeHorseMasters.length}頭) ＆ 💉 故障治療操作</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', fontSize: '12px', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>馬名</th><th>馬主</th><th>状態</th><th>ケガ/治療操作</th><th>操作</th><th>削除</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeHorseMasters.map(hm => (
                        <tr key={hm.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: '#16a34a' }}>🐎 {hm.name}</td>
                          <td style={{ fontWeight: 'bold', color: '#2563eb' }}>👤 {hm.owner_name || '未設定'}</td>
                          <td><span style={{ padding: '3px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px', color: '#fff', backgroundColor: hm.status?.includes('故障') ? '#ef4444' : hm.status === '放牧中' ? '#3b82f6' : '#16a34a' }}>{hm.status || '現役'}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => handleInjuryOrHealHorse(hm.id, hm.name, 'injure')} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>💉 屈腱炎</button>
                              <button onClick={() => handleInjuryOrHealHorse(hm.id, hm.name, 'heal')} style={{ backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>♨️ 完治復帰</button>
                            </div>
                          </td>
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

          {/* 🔨 TAB: セレクトセール出品 ＆ 強制キャンセル管理 */}
          {adminTab === 'auction_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
                <h2 style={{ margin: '0 0 14px 0', color: '#d97706', fontSize: '18px', fontWeight: 'bold' }}>
                  🔨 運営公式 セレクトセール出品（Discord通知付）
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

              {/* 出品中オークション強制管理 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#d97706', fontSize: '16px', fontWeight: 'bold' }}>
                  🔨 現在出品中のセリ市リスト（強制取り消し可能）
                </h3>
                {auctions.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>現在出品中の馬はありません</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {auctions.map(a => (
                      <div key={a.id} style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: '#d97706', fontSize: '14px' }}>🐎 {a.horse_name}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>出品者: {a.seller_name} / 最高額: {(a.current_bid || 0).toLocaleString()}G ({a.highest_bidder})</div>
                        </div>
                        <button onClick={() => handleForceCancelAuction(a.id, a.horse_name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '11px' }}>
                          強制削除 🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 🏆 TAB: 着順確定 ＆ 確定取り消し ＆ 🎙️ AI自動実況 */}
          {adminTab === 'settle' && (
            <div style={{ border: '2px solid #2563eb', padding: '20px', borderRadius: '16px', backgroundColor: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: '#1e3a8a', margin: 0, fontWeight: 'bold', fontSize: '18px' }}>
                  🏆 【{selectedRaceNo}R】 着順確定（1着〜9着） ＆ AI自動実況
                </h3>
                
                <button
                  onClick={handleUnsettleRace}
                  style={{ backgroundColor: '#ca8a04', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                >
                  🔄 【{selectedRaceNo}R】確定取り消し
                </button>
              </div>

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
                🏁 結果確定・配当自動振込 ＆ AI自動実況Discord速報 🎙️
              </button>
            </div>
          )}

          {/* 📢 TAB: アプデ・お知らせ配信 */}
          {adminTab === 'news_edit' && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0', maxWidth: '500px' }}>
              <h2 style={{ margin: '0 0 14px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                📢 アプデ・お知らせ新規配信（Discord同時通知）
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
                  全プレイヤー ＆ Discordに一斉配信 📢
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