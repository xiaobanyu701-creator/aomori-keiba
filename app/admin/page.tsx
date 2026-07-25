'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<'horses' | 'umabashira' | 'race' | 'odds' | 'settle' | 'stats' | 'jockeys' | 'horse_masters' | 'owner_assign' | 'retired_horses' | 'users' | 'inquiries'>('horses');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(2);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);

  const [addJockeyName, setAddJockeyName] = useState('');
  const [addHorseMasterName, setAddHorseMasterName] = useState('');
  const [addHorseMasterOwner, setAddHorseMasterOwner] = useState('');

  const [assignTargetHorseId, setAssignTargetHorseId] = useState<string>('');
  const [assignTargetOwnerName, setAssignTargetOwnerName] = useState<string>('');

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [customPinInput, setCustomPinInput] = useState<string>('');

  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1600);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');

  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(2);
  const [newJockey, setNewJockey] = useState('');
  const [newWeight, setNewWeight] = useState('480kg');
  const [newPopularity, setNewPopularity] = useState(1);
  const [newMark, setNewMark] = useState('◎');
  const [newConditionMark, setNewConditionMark] = useState('S');

  const [firstHorse, setFirstHorse] = useState('');
  const [secondHorse, setSecondHorse] = useState('');
  const [thirdHorse, setThirdHorse] = useState('');

  // 生産確率手動コントロール用
  const [probSS, setProbSS] = useState(5);
  const [probS, setProbS] = useState(15);
  const [probA, setProbA] = useState(20);
  const [probB, setProbB] = useState(30);

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
        setEditTitle(race.title || '');
        setEditDistance(race.distance_m || 1600);
        setEditCondition(race.track_condition || '良');
        setEditWeather(race.weather || '晴');
        fetchHorses(race.id);
      }
    }
  }, [selectedRaceNo, races]);

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

  const fetchInquiries = async () => {
    const { data } = await supabase.from('inquiries').select('*');
    if (data) setInquiries([...data].reverse());
  };

  // 🔒 1レースごとの「投票締め切り / 解除」切り替え実行
  const handleToggleRaceStatus = async (newStatus: 'open' | 'closed') => {
    if (!currentRace) return;
    await supabase.from('races').update({ status: newStatus }).eq('id', currentRace.id);
    alert(`【${selectedRaceNo}R】のステータスを「${newStatus === 'closed' ? '🔒 締め切り' : '🟢 投票受付中'}」に変更しました！`);
    fetchRaces();
  };

  const handleUpdateRaceInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace) return;
    await supabase.from('races').update({
      title: editTitle,
      distance_m: editDistance,
      track_condition: editCondition,
      weather: editWeather
    }).eq('id', currentRace.id);
    alert('保存しました！');
    fetchRaces();
  };

  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRace || !newHorseName) return alert('馬名を選択してください');

    await supabase.from('horses').insert([{
      race_id: currentRace.id,
      horse_number: newHorseNumber,
      name: newHorseName,
      age: newHorseAge,
      jockey: newJockey,
      weight: newWeight,
      popularity: newPopularity,
      mark: newMark,
      condition_mark: newConditionMark
    }]);
    fetchHorses(currentRace.id);
    alert(`🎉 【${selectedRaceNo}R】に「${newHorseName}」を出走登録しました！`);
  };

  const handleSaveBreedingProbs = () => {
    const probConfig = { SS: probSS, S: probS, A: probA, B: probB, C: 100 - (probSS + probS + probA + probB) };
    localStorage.setItem('breeding_probs', JSON.stringify(probConfig));
    alert('🎲 ガチャ生産の出現確率設定を保存しました！');
  };

  const handleAdminLogin = (e: React.FormEvent) => { e.preventDefault(); if (pinInput === '0302') setIsAuthenticated(true); else alert('暗証番号が違います'); };

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

  // インフレ率ダミー算出荷重データ（ローカル馬券から集計）
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
          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '8px' }}>レース管理 (1〜12R)</div>
          <SideButton active={adminTab === 'race'} onClick={() => setAdminTab('race')} icon="🛠️" text="レース条件設定 / 締切" />
          <SideButton active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} icon="🐴" text="出走馬追加・編集" />
          <SideButton active={adminTab === 'odds'} onClick={() => setAdminTab('odds')} icon="📈" text="オッズ管理 (AI)" />
          <SideButton active={adminTab === 'settle'} onClick={() => setAdminTab('settle')} icon="🏆" text="着順確定＆自動振込" />

          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '24px' }}>データ分析・全体設定</div>
          <SideButton active={adminTab === 'stats'} onClick={() => setAdminTab('stats')} icon="📊" text="売上・インフレ率グラフ" />
          <SideButton active={adminTab === 'owner_assign'} onClick={() => setAdminTab('owner_assign')} icon="🤝" text="馬主＆馬 紐づけ管理" />
          <SideButton active={adminTab === 'horse_masters'} onClick={() => setAdminTab('horse_masters')} icon="🐎" text="現役競走馬マスター" />
          <SideButton active={adminTab === 'users'} onClick={() => setAdminTab('users')} icon="👤" text="プレイヤー管理" />
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
        
        {['horses', 'umabashira', 'race', 'odds', 'settle'].includes(adminTab) && (
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '8px' }}>編集するレースを選択 (1〜12R):</div>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(no => (
                  <button key={no} onClick={() => setSelectedRaceNo(no)} style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer', backgroundColor: selectedRaceNo === no ? '#1e3a8a' : '#f8fafc', color: selectedRaceNo === no ? '#ffffff' : '#475569' }}>
                    {no}R {races.find(r=>r.race_number===no)?.status === 'closed' ? '🔒' : races.find(r=>r.race_number===no)?.status === 'finished' ? '🏁' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: '1000px' }}>
          
          {/* 🛠️ TAB: レース条件 ＆ 締切管理 (1発ボタン付き) */}
          {adminTab === 'race' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>🛠️ 【{selectedRaceNo}R】 レース条件 ＆ 投票締切設定</h3>
              
              {/* 🔒 1レースごとの締切実行・解除ボタン */}
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
                <button type="submit" style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>レース条件を保存 💾</button>
              </form>
            </div>
          )}

          {/* 📊 TAB: インフレ率 ＆ 全レース分析グラフ */}
          {adminTab === 'stats' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ marginTop: 0, color: '#1e3a8a', fontWeight: 'bold', fontSize: '20px' }}>
                📊 レース別 インフレ率 ＆ 売上分析グラフ
              </h3>
              
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {raceStats.map(s => (
                  <div key={s.raceNo} style={{ display: 'flex', alignItems: 'center', gap: '16px', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                    <div style={{ width: '50px', fontWeight: 'bold', color: '#1e3a8a' }}>{s.raceNo}R</div>
                    <div style={{ flex: 1, backgroundColor: '#e2e8f0', borderRadius: '6px', height: '20px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, (s.totalSales / 500000) * 100)}%`, backgroundColor: '#2563eb', height: '100%', transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ width: '150px', fontSize: '13px', fontWeight: 'bold', textAlign: 'right' }}>
                      売上: {s.totalSales.toLocaleString()} G
                    </div>
                    <div style={{ width: '120px', fontSize: '13px', fontWeight: 'bold', color: '#dc2626', textAlign: 'right' }}>
                      インフレ率: {s.inflationRate}x
                    </div>
                  </div>
                ))}
              </div>

              {/* 生産確率コントロール */}
              <div style={{ marginTop: '36px', borderTop: '2px solid #f1f5f9', paddingTop: '24px' }}>
                <h4 style={{ color: '#16a34a', margin: '0 0 12px 0' }}>🎲 ダビスタ風 生産ガチャ確率 手動コントロール設定</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>SSランク (%)</label><input type="number" value={probSS} onChange={e=>setProbSS(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Sランク (%)</label><input type="number" value={probS} onChange={e=>setProbS(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Aランク (%)</label><input type="number" value={probA} onChange={e=>setProbA(Number(e.target.value))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Bランク (%)</label><input type="number" value={probB} onChange={e=>setProbB(Number(e.target.value))} style={inputStyle} /></div>
                </div>
                <button onClick={handleSaveBreedingProbs} style={{ marginTop: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
                  確率設定を保存 ⚙️
                </button>
              </div>
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
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SideButton({ active, onClick, icon, text }: { active: boolean; onClick: () => void; icon: string; text: string }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        width: '100%', 
        textAlign: 'left', 
        padding: '14px 16px', 
        borderRadius: '8px', 
        border: 'none', 
        fontWeight: 'bold', 
        cursor: 'pointer', 
        fontSize: '15px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        backgroundColor: active ? '#2563eb' : 'transparent', 
        color: active ? '#ffffff' : '#93c5fd', 
        transition: 'all 0.2s' 
      }}
    >
      <span style={{ fontSize: '18px' }}>{icon}</span> {text}
    </button>
  );
}

const labelStyle = { display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' };