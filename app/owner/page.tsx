'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [activeTab, setActiveTab] = useState<'my_horses' | 'starhorse_breed' | 'pedigree' | 'jockey' | 'ai_hospital'>('my_horses');

  const [myHorses, setMyHorses] = useState<any[]>([]);
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [pedigreeList, setPedigreeList] = useState<any[]>([]);

  const [selectedSire, setSelectedSire] = useState('');
  const [selectedDam, setSelectedDam] = useState('');
  const [foalNameInput, setFoalNameInput] = useState('');

  const [entryModalHorse, setEntryModalHorse] = useState<any>(null);
  const [targetRaceNo, setTargetRaceNo] = useState<number>(1);
  const [preferredJockey, setPreferredJockey] = useState<string>('');

  const [selectedHorseName, setSelectedHorseName] = useState('');
  const [selectedJockey, setSelectedJockey] = useState('');

  useEffect(() => {
    setMounted(true);
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
        setPreferredJockey(data[0].name);
        setSelectedJockey(data[0].name);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPedigree = async () => {
    try {
      const { data } = await supabase.from('horse_masters').select('*').eq('status', '種牡馬/繁殖牝馬');
      if (data && data.length > 0) {
        setPedigreeList(data);
        setSelectedSire(data[0].name);
        setSelectedDam(data[0].name);
      } else {
        if (typeof window !== 'undefined') {
          const local = JSON.parse(localStorage.getItem('app_pedigree_masters') || '[]');
          setPedigreeList(local);
          if (local.length > 0) {
            setSelectedSire(local[0].name);
            setSelectedDam(local[0].name);
          }
        }
      }
    } catch (e) {
      console.error(e);
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
        const sorted = [...data].reverse();
        setMyHorses(sorted);
        if (sorted.length > 0 && !selectedHorseName) {
          setSelectedHorseName(sorted[0].name);
        }
      } else {
        if (typeof window !== 'undefined') {
          const local = JSON.parse(localStorage.getItem(`my_2yo_horses_${currentUser.discord_name}`) || '[]');
          setMyHorses(local);
          if (local.length > 0 && !selectedHorseName) {
            setSelectedHorseName(local[0].name);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 🛡️ IP判定 ＋ 既存ユーザーログイン時IP自動更新機能
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordInput || !pinInput) return alert('名前とPINコードを入力してください');

    const { data: users } = await supabase.from('users').select('*');
    const safeUsers = users || [];
    const exUser = safeUsers.find((u) => u.discord_name === discordInput);

    let userIp = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      userIp = ipData.ip;
    } catch (err) {
      console.error('IP取得失敗:', err);
    }

    if (exUser) {
      if (exUser.pin_code === pinInput) {
        if (userIp && exUser.ip_address !== userIp) {
          await supabase.from('users').update({ ip_address: userIp }).eq('id', exUser.id);
          exUser.ip_address = userIp;
        }
        setCurrentUser(exUser);
      } else {
        alert('PINコードが違います');
      }
    } else {
      if (userIp) {
        const isIpExists = safeUsers.some((u) => u.ip_address === userIp);
        if (isIpExists) {
          return alert(
            '❌ 複数アカウントの作成は禁止されています！\n（すでにこのネットワーク/回線からアカウントが作成されています）'
          );
        }
      }

      if (confirm(`「${discordInput}」さんを新規登録しますか？（10,000,000G付与）`)) {
        const { data: inserted, error } = await supabase
          .from('users')
          .insert([
            {
              discord_name: discordInput,
              pin_code: pinInput,
              balance: 10000000,
              ip_address: userIp,
            },
          ])
          .select('*');

        if (error) {
          return alert('登録エラー: ' + error.message);
        }

        if (inserted && inserted.length > 0) {
          setCurrentUser(inserted[0]);
          alert('🎉 馬主登録完了！ 10,000,000 G 付与！');
        }
      }
    }
  };

  // 🎓 1. AI調教師おまかせ調教処理
  const handleAiTrainerAutoTrain = async (horse: any, trainerType: 'yahagi' | 'fujisawa' | 'tataki') => {
    let nextCondition = '良好';
    let cost = 50000;
    let trainerName = '';

    if (trainerType === 'yahagi') {
      trainerName = '🔥 矢作風スパルタAI';
      nextCondition = '絶好調';
      cost = 80000;
    } else if (trainerType === 'fujisawa') {
      trainerName = '🌱 藤沢風おまかせAI';
      nextCondition = '良好';
      cost = 30000;
    } else {
      trainerName = '🎯 叩き良化型AI';
      nextCondition = '絶好調';
      cost = 60000;
    }

    if ((currentUser?.balance || 0) < cost) return alert(`所持金が足りません (${cost.toLocaleString()} G 必要)`);

    // 🩺 2. AI故障率計算フラグ
    const fatigue = horse.fatigue || 20;
    const injuryRate = (fatigue * 0.8) + (trainerType === 'yahagi' ? 25 : 5);
    const rand = Math.random() * 100;

    let isInjured = false;
    let injuryType = '';

    if (rand < injuryRate) {
      isInjured = true;
      injuryType = rand < 5 ? '屈腱炎(重傷)' : 'ソエ(軽傷)';
    }

    if (isInjured) {
      await supabase.from('horse_masters').update({ status: `故障休養中(${injuryType})`, condition: '疲労' }).eq('id', horse.id);
      alert(`🩺 【AI獣医師診断】 ${trainerName}の調教中、「${horse.name}」が【${injuryType}】を発症しました！温泉治療が必要です。`);
    } else {
      await supabase.from('horse_masters').update({ condition: nextCondition, fatigue: Math.min(100, fatigue + 15) }).eq('id', horse.id);
      alert(`🎓 【${trainerName}】が「${horse.name}」を最適仕上げしました！【コンディション: ${nextCondition}】`);
    }

    const newBal = (currentUser.balance || 0) - cost;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);
    setCurrentUser({ ...currentUser, balance: newBal });
    loadMyHorses();
  };

  // 温泉治療機能
  const handleHealHorseWithOnsen = async (horse: any) => {
    const cost = 200000;
    if ((currentUser?.balance || 0) < cost) return alert('治療費 (200,000 G) が足りません');
    if (!confirm(`「${horse.name}」を温泉施設で完治復帰させますか？ (費用: 200,000 G)`)) return;

    await supabase.from('horse_masters').update({ status: '現役', condition: '良好', fatigue: 0 }).eq('id', horse.id);
    const newBal = (currentUser.balance || 0) - cost;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    alert(`♨️ 「${horse.name}」のケガが全快し現役復帰しました！`);
    loadMyHorses();
  };

  // 🧬 4. AI配合評価・血統アナライザー診断計算
  const getAiBreedingReport = () => {
    if (!selectedSire || !selectedDam) return null;
    const isSame = selectedSire === selectedDam;

    let stars = '★★★★☆ (相性良好)';
    let comment = 'スピードとパワーのバランスが良い黄金配合です。マイル〜中距離で期待できます！';

    if (selectedSire.includes('サンデー') || selectedDam.includes('サンデー')) {
      stars = '★★★★★ (★5 黄金ニックス)';
      comment = '『奇跡の血量 3×4』検出！爆発的な瞬発力を秘めた最高峰配合です！';
    } else if (isSame) {
      stars = '★☆☆☆☆ (危険な近親交配)';
      comment = '血が濃すぎます！ケガ・健康度低下のリスクが高まります。';
    }

    return { stars, comment };
  };

  // 🥕 エサやり・調子コントロール機能
  const handleFeedHorse = async (horseId: string, horseName: string, itemType: 'carrot' | 'apple') => {
    const cost = itemType === 'carrot' ? 10000 : 50000;
    const itemName = itemType === 'carrot' ? '🥕 高級ニンジン' : '🍎 特選リンゴ';
    const targetCondition = itemType === 'carrot' ? '良好' : '絶好調';

    if ((currentUser?.balance || 0) < cost) return alert(`所持金が足りません (${cost.toLocaleString()} G 必要)`);
    if (!confirm(`「${horseName}」に【${itemName}】を与えますか？ (費用: ${cost.toLocaleString()} G)`)) return;

    await supabase.from('horse_masters').update({ condition: targetCondition }).eq('id', horseId);

    const newBal = (currentUser.balance || 0) - cost;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    alert(`✨ 「${horseName}」に${itemName}を与えました！【現在の調子: ${targetCondition}】`);
    loadMyHorses();
  };

  const handleSubmitRaceEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryModalHorse) return;

    await supabase.from('race_requests').insert([
      {
        horse_id: entryModalHorse.id,
        horse_name: entryModalHorse.name,
        owner_name: currentUser.discord_name,
        target_race_no: targetRaceNo,
        preferred_jockey: preferredJockey,
        status: 'pending',
      },
    ]);

    await supabase.from('horse_masters').update({ status: `${targetRaceNo}R出走申請中` }).eq('id', entryModalHorse.id);

    alert(`📨 「${entryModalHorse.name}」の【${targetRaceNo}R (騎手: ${preferredJockey})】への出走申請を送信しました！`);
    setEntryModalHorse(null);
    loadMyHorses();
  };

  // 🧬 スタホ配合
  const handleStarhorseBreed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foalNameInput.trim()) return alert('仔馬の名前を入力してください');
    if (!selectedSire || !selectedDam) return alert('父馬と母馬を選択してください');
    if (selectedSire === selectedDam) return alert('父馬と母馬には異なる血統を選択してください');

    const sireObj = pedigreeList.find((p) => p.name === selectedSire);
    const isMySire = sireObj?.owner_name === currentUser.discord_name;
    const fee = isMySire ? 0 : 500000;

    if ((currentUser?.balance || 0) < fee) return alert('種付け費用が足りません');

    const ranks = ['SS', 'S', 'A', 'B'];
    const inheritedRank = isMySire ? 'SS' : ranks[Math.floor(Math.random() * ranks.length)];

    const payload: any = {
      name: foalNameInput.trim(),
      owner_name: currentUser.discord_name,
      sire_name: selectedSire,
      dam_name: selectedDam,
      rank: inheritedRank,
      speed: 'S',
      stamina: 'A',
      guts: 'A',
      temper: 'A',
      status: '現役',
      condition: '良好',
      total_prize: 0,
      generation: 2,
    };

    let { error } = await supabase.from('horse_masters').insert([payload]);

    if (error) {
      console.warn('generationカラム未存在のため、互換モードで保存します:', error.message);
      delete payload.generation;
      const { error: fallbackError } = await supabase.from('horse_masters').insert([payload]);

      if (fallbackError) {
        return alert(`❌ 生産保存エラー: ${fallbackError.message}`);
      }
    }

    const newBal = (currentUser.balance || 0) - fee;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setFoalNameInput('');
    alert(`🎉 【${selectedSire} × ${selectedDam}】の超良血配合により「${foalNameInput}」が誕生しました！\n【確定素質: ${inheritedRank}ランク】`);

    await loadMyHorses();
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
    if ((currentUser?.balance || 0) < 50000) return alert('調教費用 (50,000 G) が足りません');
    if (!confirm(`「${horseName}」を【${type}調教】しますか？ (費用: 50,000 G)`)) return;

    let successRate = 70;
    let superRate = 15;
    if (typeof window !== 'undefined') {
      successRate = Number(localStorage.getItem('training_success_rate') || 70);
      superRate = Number(localStorage.getItem('training_super_rate') || 15);
    }

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

    if (typeof window !== 'undefined') {
      const local = JSON.parse(localStorage.getItem('app_pedigree_masters') || '[]');
      localStorage.setItem(
        'app_pedigree_masters',
        JSON.stringify([{ id: horseId, name: horseName, owner_name: currentUser.discord_name, status: '種牡馬/繁殖牝馬' }, ...local])
      );
    }

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

  const aiBreedingReport = getAiBreedingReport();

  if (!mounted) return null; // Hydration mismatch 防止

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header
        style={{
          backgroundColor: '#16a34a',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: '#ffffff', color: '#16a34a', padding: '4px 12px', fontWeight: '900', borderRadius: '20px', fontSize: '13px' }}>
            🍏 青森県競馬
          </span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#dcfce7' }}>🐴 馬主ラウンジ</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {currentUser && (
            <div style={{ backgroundColor: '#14532d', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', color: '#fef08a', fontWeight: 'bold', border: '1px solid #22c55e' }}>
              👤 {currentUser.discord_name} ({(currentUser.balance || 0).toLocaleString()}G)
            </div>
          )}

          <Link href="/" style={{ backgroundColor: '#1e3a8a', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
            🎫 IPAT ↗
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '1000px', margin: '16px auto', padding: '0 12px' }}>
        {!currentUser ? (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '40px 20px',
              borderRadius: '20px',
              textAlign: 'center',
              maxWidth: '400px',
              margin: '30px auto',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🐴</div>
            <h2 style={{ color: '#16a34a', margin: '0 0 10px 0', fontSize: '20px' }}>馬主 ログイン</h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
              <input type="text" placeholder="ユーザー名 (Discord名)" value={discordInput} onChange={(e) => setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer' }}>
                ログイン / 登録
              </button>
            </form>

            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowPrivacy(true)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }}
              >
                🔒 プライバシーポリシー（IPアドレスの取り扱いについて）
              </button>
            </div>

            {showPrivacy && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '450px', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: '16px' }}>🔒 プライバシーポリシー</h3>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    当サービス（青森県競馬馬主ラウンジ）では、個人情報保護法に基づき、ユーザーの個人情報・アクセスメタデータを以下の通り適切に管理・保護いたします。
                  </p>
                  <button
                    onClick={() => setShowPrivacy(false)}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '16px', cursor: 'pointer' }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <TabBtn active={activeTab === 'my_horses'} onClick={() => setActiveTab('my_horses')} text="📋 所有馬" />
              <TabBtn active={activeTab === 'ai_hospital'} onClick={() => setActiveTab('ai_hospital')} text="🎓 AI調教・診療所" />
              <TabBtn active={activeTab === 'starhorse_breed'} onClick={() => setActiveTab('starhorse_breed')} text="🧬 スタホ配合＆AI診断" />
              <TabBtn active={activeTab === 'pedigree'} onClick={() => setActiveTab('pedigree')} text={`🧬 血統書 (${pedigreeList.length})`} />
              <TabBtn active={activeTab === 'jockey'} onClick={() => setActiveTab('jockey')} text="🏇 騎手変更" />
            </div>

            {/* 所有馬タブ */}
            {activeTab === 'my_horses' && (
              <div>
                <h3 style={{ margin: '0 0 14px 0', color: '#16a34a', fontSize: '18px' }}>🐎 自分の所有馬一覧 ({myHorses.length}頭)</h3>
                {myHorses.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ所有馬がいません。「スタホ配合」で生産してみましょう！
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {myHorses.map((h, i) => {
                      const isRetired = h.status === '引退';
                      const isPedigree = h.status === '種牡馬/繁殖牝馬';
                      const isPendingRetire = h.status === '引退申請中';
                      const isRunning = h.status?.includes('出走');
                      const isAuction = h.status === 'セリ出品中';
                      const isInjured = h.status?.includes('故障');
                      const condition = h.condition || '良好';

                      return (
                        <div key={h.id || i} style={{ backgroundColor: isInjured ? '#fef2f2' : '#f8fafc', padding: '14px', borderRadius: '12px', border: `1px solid ${isInjured ? '#fca5a5' : '#e2e8f0'}` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#16a34a' }}>🐎 {h.name}</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', color: '#fff', backgroundColor: condition === '絶好調' ? '#ef4444' : condition === '良好' ? '#16a34a' : '#64748b' }}>
                                🔥 {condition}
                              </span>
                              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', color: '#fff', backgroundColor: isAuction ? '#d97706' : isPedigree ? '#8b5cf6' : isRetired ? '#64748b' : isPendingRetire ? '#eab308' : isRunning ? '#dc2626' : isInjured ? '#dc2626' : '#16a34a' }}>
                                {h.status || '現役'}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '12px', marginTop: '6px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div>血統: <strong>{h.sire_name || '自家'} × {h.dam_name || '自家'} ({h.generation || 1}代目)</strong></div>
                            <div>素質: <strong style={{ color: '#dc2626' }}>【{h.rank || 'B'}ランク】</strong></div>
                            <div>速: {h.speed || 'B'} / 体: {h.stamina || 'B'} / 根: {h.guts || 'B'}</div>
                            <div style={{ backgroundColor: '#e2e8f0', padding: '4px 8px', borderRadius: '6px', marginTop: '2px', fontWeight: 'bold', color: '#16a34a' }}>
                              🏆 累計賞金: {(h.total_prize || 0).toLocaleString()} G
                            </div>
                          </div>

                          {/* 🎓 AI調教師おまかせ選択メニュー */}
                          {!isInjured && !isRetired && !isPedigree && (
                            <div style={{ marginTop: '10px', backgroundColor: '#eff6ff', padding: '8px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '4px' }}>🎓 AI調教師におまかせ仕上げ:</div>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleAiTrainerAutoTrain(h, 'yahagi')} style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>🔥 矢作スパルタ</button>
                                <button onClick={() => handleAiTrainerAutoTrain(h, 'fujisawa')} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>🌱 藤沢安全</button>
                                <button onClick={() => handleAiTrainerAutoTrain(h, 'tataki')} style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>🎯 叩き良化</button>
                              </div>
                            </div>
                          )}

                          {/* 🩺 AI温泉治療ボタン */}
                          {isInjured && (
                            <button onClick={() => handleHealHorseWithOnsen(h)} style={{ width: '100%', marginTop: '10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                              温泉リハビリ施設で完治復帰する (20万G)
                            </button>
                          )}

                          {!isRetired && !isPendingRetire && !isPedigree && !isAuction && !isInjured && h.id && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                              <button
                                onClick={() => setEntryModalHorse(h)}
                                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}
                              >
                                🏆 レース出走 ＆ 騎手エントリー 🏇
                              </button>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleTrainHorse(h.id, h.name, '坂路')} style={{ flex: 1, backgroundColor: '#3b82f6', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>坂路(速)</button>
                                <button onClick={() => handleTrainHorse(h.id, h.name, 'ウッド')} style={{ flex: 1, backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>ウッド(根)</button>
                                <button onClick={() => handleTrainHorse(h.id, h.name, 'プール')} style={{ flex: 1, backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>プール(体)</button>
                              </div>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleFeedHorse(h.id, h.name, 'carrot')} style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>🥕 ニンジン (1万G)</button>
                                <button onClick={() => handleFeedHorse(h.id, h.name, 'apple')} style={{ flex: 1, backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '5px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>🍎 リンゴ (5万G)</button>
                              </div>

                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => handleSellAtAuction(h.id, h.name)} style={{ flex: 1, backgroundColor: '#d97706', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>セリ出品 🔨</button>
                                <button onClick={() => handleRegisterPedigree(h.id, h.name)} style={{ flex: 1, backgroundColor: '#8b5cf6', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>種牡馬 🧬</button>
                                <button onClick={() => handleRetireRequest(h.id, h.name)} style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '10px' }}>引退 🛑</button>
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

            {/* AI調教＆診療所 */}
            {activeTab === 'ai_hospital' && (
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '18px' }}>🎓 AI調教師 ＆ 🩺 獣医リハビリ診療所</h3>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>
                  AI調教師に愛馬を委託して調整させたり、疲労・ケガを負った馬を温泉治療できます。
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {myHorses.map((h) => {
                    const isInjured = h.status?.includes('故障');

                    return (
                      <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#16a34a' }}>🐎 {h.name}</div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px' }}>
                            ステータス: <strong>{h.status || '現役'}</strong> / 調子: <strong>{h.condition || '良好'}</strong>
                          </div>
                        </div>

                        <div>
                          {isInjured ? (
                            <button onClick={() => handleHealHorseWithOnsen(h)} style={{ padding: '8px 14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                              温泉治療 (20万G)
                            </button>
                          ) : (
                            <button onClick={() => handleAiTrainerAutoTrain(h, 'fujisawa')} style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px' }}>
                              🎓 AIおまかせ調教 (3万G)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI配合評価＆血統アナライザータブ */}
            {activeTab === 'starhorse_breed' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: '18px' }}>🧬 AI血統配合診断アナライザー</h3>
                <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '16px' }}>
                  所有種牡馬なら<strong>種付け料0G (無料)</strong>で種付けできます！
                </p>

                <form onSubmit={handleStarhorseBreed} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>① 父馬（種牡馬）</label>
                    <select value={selectedSire} onChange={(e) => setSelectedSire(e.target.value)} style={inputStyle}>
                      {pedigreeList.map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          🧬 {p.name} ({p.owner_name === currentUser.discord_name ? '自分・無料' : '他・50万G'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>② 母馬（繁殖牝馬）</label>
                    <select value={selectedDam} onChange={(e) => setSelectedDam(e.target.value)} style={inputStyle}>
                      {pedigreeList.map((p) => (
                        <option key={p.id || p.name} value={p.name}>
                          🧬 {p.name} ({p.owner_name})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* AI診断レポートパネル */}
                  {aiBreedingReport && (
                    <div style={{ backgroundColor: '#fefce8', border: '2px solid #eab308', padding: '12px', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 'bold', color: '#ca8a04', fontSize: '13px' }}>🤖 AI配合評価: {aiBreedingReport.stars}</div>
                      <div style={{ fontSize: '12px', color: '#854d0e', marginTop: '4px' }}>{aiBreedingReport.comment}</div>
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>③ 仔馬の名前</label>
                    <input type="text" placeholder="例: カマクラキング" value={foalNameInput} onChange={(e) => setFoalNameInput(e.target.value)} style={inputStyle} required />
                  </div>

                  <button type="submit" style={{ padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>
                    この配合で生産する 🧬
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'pedigree' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#8b5cf6', fontSize: '18px' }}>🧬 殿堂入り血統書ライブラリ</h3>
                {pedigreeList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ登録された種牡馬がいません。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                    {pedigreeList.map((p, idx) => (
                      <div key={p.id || idx} style={{ backgroundColor: '#faf5ff', padding: '14px', borderRadius: '12px', border: '2px solid #c084fc' }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#7e22ce' }}>🧬 {p.name}</div>
                        <div style={{ fontSize: '12px', color: '#6b21a8', marginTop: '4px' }}>元馬主: {p.owner_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jockey' && (
              <div style={{ maxWidth: '500px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#16a34a', fontWeight: 'bold', fontSize: '18px' }}>
                  🏇 主戦騎手の変更申請
                </h3>

                <form onSubmit={handleUpdateJockey} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      padding: '14px',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 'bold',
                      fontSize: '15px',
                      cursor: 'pointer',
                    }}
                  >
                    変更申請を送信 📨
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 出走＆騎手エントリーモーダル */}
      {entryModalHorse && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px 16px', borderRadius: '16px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 14px 0', color: '#16a34a', fontSize: '18px', fontWeight: 'bold' }}>
              🏆 「{entryModalHorse.name}」 出走エントリー
            </h3>
            <form onSubmit={handleSubmitRaceEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>出走希望レース (1〜12R)</label>
                <select value={targetRaceNo} onChange={(e) => setTargetRaceNo(Number(e.target.value))} style={inputStyle}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((no) => (
                    <option key={no} value={no}>【{no}R】に出走希望</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={labelStyle}>希望する騎手 (主戦)</label>
                <select value={preferredJockey} onChange={(e) => setPreferredJockey(e.target.value)} style={inputStyle}>
                  {jockeyList.map((j) => (
                    <option key={j.id} value={j.name}>🏇 {j.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button type="button" onClick={() => setEntryModalHorse(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  キャンセル
                </button>
                <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                  送信 📨
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, text }: { active: boolean; onClick: () => void; text: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        backgroundColor: active ? '#16a34a' : '#ffffff',
        color: active ? '#ffffff' : '#475569',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px' };