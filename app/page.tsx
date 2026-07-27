'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function IPATPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [mainTab, setMainTab] = useState<'bet' | 'history' | 'news' | 'ranking' | 'chat' | 'auction'>('bet');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [myBets, setMyBets] = useState<any[]>([]);
  const [newsList, setNewsList] = useState<any[]>([]);
  
  const [rankingUsers, setRankingUsers] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [hasClaimedBonus, setHasClaimedBonus] = useState(false);
  const [auctions, setAuctions] = useState<any[]>([]);
  const [bidAmountInput, setBidAmountInput] = useState<number>(100000);

  const [pastResults, setPastResults] = useState<{ [key: string]: any[] }>({});

  const [betType, setBetType] = useState('単勝');
  const [selectedHorse1, setSelectedHorse1] = useState('');
  const [selectedHorse2, setSelectedHorse2] = useState('');
  const [selectedHorse3, setSelectedHorse3] = useState('');
  const [betAmount, setBetAmount] = useState(1000);

  useEffect(() => {
    fetchRaces();
    fetchNews();
    fetchRanking();
    fetchChat();
    fetchAuctions();
    fetchPastResults();
  }, []);

  useEffect(() => {
    if (races.length > 0) {
      const race = races.find((r) => r.race_number === selectedRaceNo);
      if (race) {
        setCurrentRace(race);
        fetchHorsesAndOnlineOdds(race.id);
      } else {
        setCurrentRace({ race_number: selectedRaceNo, title: '特別競走', status: 'open' });
        setHorses([]);
      }
    }
  }, [selectedRaceNo, races]);

  useEffect(() => {
    if (currentUser) {
      fetchMyBets();
      checkDailyBonus();
    }
  }, [currentUser, selectedRaceNo]);

  const fetchRaces = async () => {
    try {
      const { data } = await supabase.from('races').select('*');
      if (data) setRaces([...data].sort((a, b) => (a.race_number || 0) - (b.race_number || 0)));
    } catch (e) { console.error(e); }
  };

  const fetchNews = async () => {
    try {
      const { data, error } = await supabase.from('news').select('*');
      if (data && !error) {
        setNewsList([...data].reverse());
      } else {
        const local = JSON.parse(localStorage.getItem('app_news_list') || '[]');
        setNewsList(local);
      }
    } catch (e) { console.error(e); }
  };

  const fetchRanking = async () => {
    try {
      const { data } = await supabase.from('users').select('*');
      if (data) {
        const sorted = [...data].sort((a, b) => (b.balance || 0) - (a.balance || 0));
        setRankingUsers(sorted);
      }
    } catch (e) { console.error(e); }
  };

  const fetchChat = async () => {
    try {
      const { data, error } = await supabase.from('inquiries').select('*').eq('title', '【パット雑談チャット】');
      if (data && !error) {
        setChatMessages([...data].reverse());
      } else {
        const local = JSON.parse(localStorage.getItem('app_paddock_chat') || '[]');
        setChatMessages(local);
      }
    } catch (e) { console.error(e); }
  };

  const fetchAuctions = async () => {
    try {
      const { data } = await supabase.from('auctions').select('*').eq('status', 'active');
      if (data) setAuctions(data);
    } catch (e) { console.error(e); }
  };

  const fetchPastResults = async () => {
    try {
      const { data } = await supabase.from('horse_results').select('*');
      if (data) {
        const map: { [key: string]: any[] } = {};
        data.forEach((r) => {
          if (!map[r.horse_name]) map[r.horse_name] = [];
          map[r.horse_name].push(r);
        });
        setPastResults(map);
      }
    } catch (e) { console.error(e); }
  };

  const checkDailyBonus = () => {
    if (!currentUser) return;
    const today = new Date().toLocaleDateString();
    const lastClaim = localStorage.getItem(`daily_bonus_${currentUser.id}`);
    setHasClaimedBonus(lastClaim === today);
  };

  const handleClaimDailyBonus = async () => {
    if (!currentUser || hasClaimedBonus) return;
    const today = new Date().toLocaleDateString();
    const bonusAmount = Number(localStorage.getItem('daily_bonus_amount') || 100000);

    const newBal = (currentUser.balance || 0) + bonusAmount;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    localStorage.setItem(`daily_bonus_${currentUser.id}`, today);
    setCurrentUser({ ...currentUser, balance: newBal });
    setHasClaimedBonus(true);
    alert(`🎁 本日のログインボーナス【 ${bonusAmount.toLocaleString()} G 】を受け取りました！`);
    fetchRanking();
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;

    const newMsg = {
      user_id: currentUser.id,
      discord_name: currentUser.discord_name,
      title: '【パット雑談チャット】',
      content: chatInput,
    };

    await supabase.from('inquiries').insert([newMsg]);

    const local = JSON.parse(localStorage.getItem('app_paddock_chat') || '[]');
    localStorage.setItem('app_paddock_chat', JSON.stringify([{ id: Date.now().toString(), ...newMsg, created_at: new Date().toLocaleTimeString() }, ...local]));

    setChatInput('');
    fetchChat();
  };

  const handlePlaceBid = async (auctionId: string, currentBid: number) => {
    if (!currentUser) return alert('ログインしてください');
    if (bidAmountInput <= currentBid) return alert('現在の最高入札額より高く入札してください');
    if ((currentUser.balance || 0) < bidAmountInput) return alert('所持コインが足りません');

    await supabase.from('auctions').update({
      current_bid: bidAmountInput,
      highest_bidder: currentUser.discord_name,
    }).eq('id', auctionId);

    alert(`🔨 【${bidAmountInput.toLocaleString()} G】で競り（入札）を行いました！現在最高額提示者です！`);
    fetchAuctions();
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

  // 🛡️ IP判定 ＋ 既存ユーザーログイン時IP自動更新機能
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordInput || !pinInput) return alert('名前とPINコードを入力してください');

    const { data: users } = await supabase.from('users').select('*');
    const exUser = users?.find((u) => u.discord_name === discordInput);

    let userIp = '';
    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      userIp = ipData.ip;
    } catch (err) {
      console.error('IP取得失敗:', err);
    }

    if (exUser) {
      // 既存ユーザーログイン
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
      // 新規ユーザー登録
      if (userIp) {
        const isIpExists = users?.some((u) => u.ip_address === userIp);
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
          alert('🎉 登録完了！ 10,000,000 G 付与！');
        }
      }
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
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
    if (currentRace.id) fetchHorsesAndOnlineOdds(currentRace.id);
    fetchRanking();
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
      
      {/* 📱 スマホ対応レスポンシブヘッダー */}
      <header
        style={{
          backgroundColor: '#1e3a8a',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '4px 12px', fontWeight: '900', borderRadius: '20px', fontSize: '13px' }}>
            🍏 青森県競馬
          </span>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#bfdbfe' }}>🎫 即パット</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {currentUser ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={handleClaimDailyBonus}
                disabled={hasClaimedBonus}
                style={{
                  padding: '6px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: hasClaimedBonus ? 'default' : 'pointer',
                  backgroundColor: hasClaimedBonus ? '#64748b' : '#eab308',
                  color: '#fff',
                  fontSize: '12px',
                }}
              >
                {hasClaimedBonus ? '🎁 受取済' : '🎁 ログボ'}
              </button>

              <div style={{ backgroundColor: '#1e40af', padding: '6px 14px', borderRadius: '20px', display: 'flex', gap: '8px', alignItems: 'center', border: '1px solid #60a5fa', fontSize: '13px' }}>
                {currentUser.title && <span style={{ backgroundColor: '#f59e0b', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>{currentUser.title}</span>}
                <span style={{ fontWeight: 'bold' }}>{currentUser.discord_name}</span>
                <span style={{ color: '#fef08a', fontWeight: 'bold' }}>{(currentUser.balance || 0).toLocaleString()}G</span>
              </div>

              <button
                onClick={handleSignOut}
                style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ログアウト
              </button>
            </div>
          ) : (
            <span style={{ color: '#93c5fd', fontSize: '12px' }}>未ログイン</span>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <Link href="/owner" style={{ backgroundColor: '#16a34a', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
              🐴 馬主
            </Link>
            <Link href="/admin" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
              ⚙️ 管理
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテナ */}
      <div style={{ maxWidth: '1000px', margin: '16px auto', padding: '0 12px' }}>
        {!currentUser ? (
          <div
            style={{
              backgroundColor: '#fff',
              padding: '32px 20px',
              borderRadius: '20px',
              textAlign: 'center',
              maxWidth: '400px',
              margin: '30px auto',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎫</div>
            <h2 style={{ color: '#1e3a8a', margin: '0 0 10px 0', fontSize: '20px' }}>IPAT ログイン</h2>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
              <input type="text" placeholder="ユーザー名 (Discord名)" value={discordInput} onChange={(e) => setDiscordInput(e.target.value)} style={inputStyle} />
              <input type="password" maxLength={4} value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="暗証番号 (4桁)" style={{ ...inputStyle, textAlign: 'center', letterSpacing: '6px' }} />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#1e3a8a', color: '#fff', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer' }}>
                ログイン / 新規登録
              </button>
            </form>

            {/* 📄 1. プライバシーポリシー表示ボタン */}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => setShowPrivacy(true)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', textDecoration: 'underline', cursor: 'pointer' }}
              >
                🔒 プライバシーポリシー（IPアドレスの取り扱いについて）
              </button>
            </div>

            {/* プライバシーポリシーモーダル */}
            {showPrivacy && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
                <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', maxWidth: '450px', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px' }}>🔒 プライバシーポリシー</h3>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    当サービス（青森県競馬即パット）では、個人情報保護法に基づき、ユーザーの個人情報・アクセスメタデータを以下の通り適切に管理・保護いたします。
                  </p>
                  <h4 style={{ fontSize: '13px', margin: '12px 0 6px 0', color: '#0f172a' }}>1. IPアドレスの取得と利用目的</h4>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    当サービスでは、不正アクセス防止および複数アカウントの重複作成（自作自演・新規特典の不正取得）を防止する目的のためにのみ、アクセス時のIPアドレスを取得・暗号化記録します。
                  </p>
                  <h4 style={{ fontSize: '13px', margin: '12px 0 6px 0', color: '#0f172a' }}>2. 第三者提供の禁止</h4>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    取得したIPアドレス等のデータは法令に基づく場合を除き、第三者へ提供・開示されることは一切ありません。
                  </p>
                  <h4 style={{ fontSize: '13px', margin: '12px 0 6px 0', color: '#0f172a' }}>3. データの消去</h4>
                  <p style={{ fontSize: '12px', color: '#475569', lineHeight: '1.6' }}>
                    アカウントが削除または利用停止された場合、紐づくIPアドレスデータもデータベースから一括消去されます。
                  </p>
                  <button
                    onClick={() => setShowPrivacy(false)}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '16px', cursor: 'pointer' }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
            
            {/* 📱 横スクロールタブナビゲーション */}
            <div style={{ display: 'flex', gap: '6px', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <TabBtn active={mainTab === 'bet'} onClick={() => setMainTab('bet')} text={isFinished ? '🏁 結果' : '🎫 投票'} />
              <TabBtn active={mainTab === 'history'} onClick={() => setMainTab('history')} text={`📋 履歴 (${myBets.length})`} />
              <TabBtn active={mainTab === 'auction'} onClick={() => setMainTab('auction')} text={`🔨 セリ (${auctions.length})`} />
              <TabBtn active={mainTab === 'ranking'} onClick={() => setMainTab('ranking')} text="👑 ランキング" />
              <TabBtn active={mainTab === 'chat'} onClick={() => setMainTab('chat')} text="💬 チャット" />
              <TabBtn active={mainTab === 'news'} onClick={() => setMainTab('news')} text={`📢 アプデ (${newsList.length})`} />
            </div>

            {mainTab === 'bet' && (
              <div>
                {/* 1R〜12R切り替えボタン */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', marginBottom: '6px' }}>レース切り替え (1〜12R):</div>
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', WebkitOverflowScrolling: 'touch' }}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((no) => {
                      const r = races.find((race) => race.race_number === no);
                      const isRaceClosed = r?.status === 'closed';
                      const isRaceFinished = r?.status === 'finished';
                      const grade = r?.grade || '一般';

                      return (
                        <button
                          key={no}
                          onClick={() => setSelectedRaceNo(no)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            fontSize: '13px',
                            backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc',
                            color: selectedRaceNo === no ? '#ffffff' : '#475569',
                          }}
                        >
                          {grade !== '一般' && <span style={{ fontSize: '10px', backgroundColor: grade === 'G1' ? '#ef4444' : grade === 'G2' ? '#f59e0b' : '#3b82f6', color: '#fff', padding: '2px 4px', borderRadius: '4px', marginRight: '4px' }}>{grade}</span>}
                          {no}R {isRaceFinished ? '🏁' : isRaceClosed ? '🔒' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* レース情報カード */}
                {currentRace && (
                  <div style={{ backgroundColor: isFinished ? '#f0fdf4' : '#eff6ff', padding: '14px', borderRadius: '12px', marginBottom: '20px', border: `1px solid ${isFinished ? '#86efac' : '#bfdbfe'}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {currentRace.grade && currentRace.grade !== '一般' && (
                          <span style={{ backgroundColor: currentRace.grade === 'G1' ? '#dc2626' : currentRace.grade === 'G2' ? '#d97706' : '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px' }}>
                            🏆 {currentRace.grade} 重賞
                          </span>
                        )}
                        <span style={{ fontSize: '17px', fontWeight: 'bold', color: isFinished ? '#16a34a' : '#1e3a8a' }}>
                          【{currentRace.race_number}R】{currentRace.title || '特別競走'}
                        </span>
                      </div>

                      <div>
                        {isFinished ? (
                          <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>🏁 結果確定</span>
                        ) : currentRace.status === 'closed' ? (
                          <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>🔒 締切</span>
                        ) : (
                          <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>🟢 受付中</span>
                        )}
                      </div>
                    </div>

                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: 'bold' }}>
                      {currentRace.distance_m || 1800}m / {currentRace.track_condition || '良'} / 天候: {currentRace.weather || '晴'} / 1着賞金: {(currentRace.prize || 1000000).toLocaleString()} G
                    </div>
                  </div>
                )}

                {/* 📱 投票フォーム */}
                {!isFinished && (
                  <form onSubmit={handleBuyBet} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={labelStyle}>① 券種</label>
                        <select value={betType} onChange={(e) => setBetType(e.target.value)} style={inputStyle}>
                          {['単勝', '複勝', '馬単', '馬連', 'ワイド', '3連複', '3連単'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        <div>
                          <label style={labelStyle}>1頭目 (1着/軸)</label>
                          <select value={selectedHorse1} onChange={(e) => setSelectedHorse1(e.target.value)} style={inputStyle}>
                            {horses.map((h) => (
                              <option key={h.id} value={h.horse_number}>
                                {h.horse_number}番 {h.name} ({h.calculatedOdds || h.manual_odds || 5.0}倍)
                              </option>
                            ))}
                          </select>
                        </div>

                        {['馬単', '馬連', 'ワイド', '3連複', '3連単'].includes(betType) && (
                          <div>
                            <label style={labelStyle}>2頭目 (2着/相手)</label>
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

                      <div>
                        <label style={labelStyle}>賭け金 (G)</label>
                        <input type="number" step="100" min="100" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} style={inputStyle} />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={currentRace?.status === 'closed'}
                      style={{
                        width: '100%',
                        padding: '14px',
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
                  </form>
                )}

                {/* 出走表（馬柱） */}
                <h3 style={{ margin: '0 0 12px 0', color: '#1e3a8a', fontSize: '16px' }}>
                  {isFinished ? '🏁 レース確定結果' : '🗞️ 出走表 ＆ 近走馬柱'}
                </h3>

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <table style={{ width: '100%', minWidth: '550px', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#1e3a8a', color: '#fff', textAlign: 'left' }}>
                        <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>印</th>
                        <th style={{ padding: '8px', textAlign: 'center', width: '35px' }}>{isFinished ? '着' : '枠'}</th>
                        <th style={{ width: '130px' }}>馬名 / 騎手</th>
                        <th>前走 (1走前)</th>
                        <th>前々走 (2走前)</th>
                        <th style={{ textAlign: 'right', paddingRight: '12px', width: '70px' }}>オッズ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(isFinished ? resultHorses : horses).map((h, idx) => {
                        const finishRank = idx + 1;
                        const hResults = pastResults[h.name] || [];
                        const last1 = hResults[hResults.length - 1];
                        const last2 = hResults[hResults.length - 2];

                        return (
                          <tr key={h.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: '#dc2626' }}>
                              {h.mark || (idx === 0 ? '◎' : idx === 1 ? '○' : idx === 2 ? '▲' : '△')}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>
                              {isFinished ? `${finishRank}着` : h.horse_number}
                            </td>
                            <td style={{ padding: '6px 8px' }}>
                              <div style={{ fontWeight: 'bold', color: '#16a34a', fontSize: '13px' }}>🐎 {h.name}</div>
                              <div style={{ color: '#2563eb', fontSize: '11px', fontWeight: 'bold' }}>🏇 {h.jockey}</div>
                            </td>

                            <td style={{ padding: '6px', backgroundColor: '#f8fafc', fontSize: '11px' }}>
                              {last1 ? (
                                <div>
                                  <span style={{ fontWeight: 'bold', color: last1.rank_result === 1 ? '#ca8a04' : '#1e3a8a' }}>
                                    {last1.rank_result}着 / {last1.race_name}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>前走なし</span>
                              )}
                            </td>

                            <td style={{ padding: '6px', backgroundColor: '#f8fafc', fontSize: '11px' }}>
                              {last2 ? (
                                <div>
                                  <span style={{ fontWeight: 'bold', color: last2.rank_result === 1 ? '#ca8a04' : '#1e3a8a' }}>
                                    {last2.rank_result}着 / {last2.race_name}
                                  </span>
                                </div>
                              ) : (
                                <span style={{ color: '#cbd5e1' }}>-</span>
                              )}
                            </td>

                            <td style={{ textAlign: 'right', paddingRight: '12px' }}>
                              <span style={{ fontSize: '14px', fontWeight: '900', color: '#dc2626' }}>
                                {h.calculatedOdds || h.manual_odds || 5.0}倍
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {isFinished && (
                  <div style={{ marginTop: '24px', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 12px 0', color: '#16a34a', fontSize: '16px', fontWeight: 'bold' }}>
                      💰 確定 払戻金（配当）一覧
                    </h4>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                      <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '12px', backgroundColor: '#fff', border: '1px solid #cbd5e1' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#16a34a', color: '#fff', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>券種</th>
                            <th>馬番・組み合わせ</th>
                            <th style={{ textAlign: 'right', paddingRight: '12px' }}>払戻金 (100G)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '8px 12px', fontWeight: 'bold' }}>単勝</td><td style={{ fontWeight: 'bold', color: '#dc2626' }}>{currentRace.first_horse}番</td><td style={{ textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#16a34a' }}>350 G</td></tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '8px 12px', fontWeight: 'bold' }}>馬連</td><td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} - {currentRace.second_horse}</td><td style={{ textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#16a34a' }}>850 G</td></tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '8px 12px', fontWeight: 'bold' }}>馬単</td><td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} → {currentRace.second_horse}</td><td style={{ textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#16a34a' }}>1,500 G</td></tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0' }}><td style={{ padding: '8px 12px', fontWeight: 'bold' }}>3連複</td><td style={{ fontWeight: 'bold' }}>{currentRace.first_horse} - {currentRace.second_horse} - {currentRace.third_horse}</td><td style={{ textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#16a34a' }}>2,200 G</td></tr>
                          <tr><td style={{ padding: '8px 12px', fontWeight: 'bold' }}>3連単</td><td style={{ fontWeight: 'bold', color: '#dc2626' }}>{currentRace.first_horse} → {currentRace.second_horse} → {currentRace.third_horse}</td><td style={{ textAlign: 'right', paddingRight: '12px', fontWeight: 'bold', color: '#16a34a' }}>6,500 G</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mainTab === 'auction' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#d97706', fontSize: '18px' }}>🔨 競走馬 セリ市会場</h3>
                {auctions.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    現在出品中の競走馬はありません。
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                    {auctions.map((a) => (
                      <div key={a.id} style={{ backgroundColor: a.is_official ? '#fefce8' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `2px solid ${a.is_official ? '#eab308' : '#cbd5e1'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#d97706' }}>🐎 {a.horse_name}</span>
                          {a.is_official && <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '8px' }}>👑 運営公式</span>}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                          <div>出品者: <strong>{a.seller_name}</strong></div>
                          <div>現在最高額: <strong style={{ color: '#16a34a', fontSize: '15px' }}>{(a.current_bid || 0).toLocaleString()} G</strong></div>
                          <div>最高額提示者: <strong>{a.highest_bidder}</strong> 様</div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <input type="number" step="100000" min={a.current_bid + 100000} value={bidAmountInput} onChange={e => setBidAmountInput(Number(e.target.value))} style={inputStyle} />
                          <button onClick={() => handlePlaceBid(a.id, a.current_bid)} style={{ padding: '8px 14px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            入札 🔨
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mainTab === 'ranking' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px' }}>👑 資産ランキング ＆ 称号者</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rankingUsers.map((u, index) => {
                    const rank = index + 1;
                    const crown = rank === 1 ? '👑 金冠' : rank === 2 ? '🥈 銀冠' : rank === 3 ? '🥉 銅冠' : `${rank}位`;
                    const isMe = u.id === currentUser?.id;

                    return (
                      <div
                        key={u.id}
                        style={{
                          backgroundColor: isMe ? '#eff6ff' : '#f8fafc',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          border: `2px solid ${rank === 1 ? '#eab308' : isMe ? '#2563eb' : '#cbd5e1'}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '900', color: rank === 1 ? '#ca8a04' : '#475569', width: '60px' }}>
                            {crown}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            {u.title && <span style={{ backgroundColor: '#f59e0b', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold' }}>{u.title}</span>}
                            <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#0f172a' }}>
                              👤 {u.discord_name}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#16a34a' }}>
                          {(u.balance || 0).toLocaleString()} G
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {mainTab === 'chat' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px' }}>💬 パドック予想 ＆ 雑談掲示板</h3>
                <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                  <input
                    type="text"
                    placeholder="予想やパドックの感想を投稿しよう！"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button type="submit" style={{ padding: '10px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    投稿 💬
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {chatMessages.map((m) => (
                    <div key={m.id} style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', color: '#1e3a8a', fontSize: '13px' }}>👤 {m.discord_name}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{m.created_at || 'たった今'}</span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155' }}>{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mainTab === 'history' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px' }}>📋 馬券購入履歴・的中一覧</h3>
                {myBets.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    まだ購入した馬券がありません。
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: `2px solid ${isWin ? '#eab308' : isLose ? '#cbd5e1' : '#bfdbfe'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e3a8a' }}>
                              🎫 【{b.bet_type}】 {b.selection}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              購入額: {Number(b.amount).toLocaleString()} G
                            </div>
                          </div>

                          <div>
                            {!isClaimed ? (
                              <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
                                ⏳ 確定待ち
                              </span>
                            ) : isWin ? (
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px' }}>
                                  🎯 的中！
                                </span>
                                <div style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a', marginTop: '2px' }}>
                                  + {payout.toLocaleString()} G
                                </div>
                              </div>
                            ) : (
                              <span style={{ backgroundColor: '#94a3b8', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
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

            {mainTab === 'news' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px' }}>📢 アプデ・お知らせ一覧</h3>
                {newsList.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                    現在お知らせはありません。
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {newsList.map((n) => (
                      <div key={n.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e3a8a' }}>📢 {n.title}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>{n.date || '本日'}</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
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
        padding: '8px 14px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        fontWeight: 'bold',
        fontSize: '13px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        backgroundColor: active ? '#1e3a8a' : '#fff',
        color: active ? '#fff' : '#475569',
      }}
    >
      {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13px' };