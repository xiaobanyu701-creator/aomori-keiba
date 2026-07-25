'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SuperAdminConsole() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');

  const [adminTab, setAdminTab] = useState<'horses' | 'race' | 'odds' | 'settle' | 'stats' | 'horse_masters' | 'owner_assign' | 'users'>('users');

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceNo, setSelectedRaceNo] = useState<number>(1);
  const [currentRace, setCurrentRace] = useState<any>(null);
  const [horses, setHorses] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [jockeyList, setJockeyList] = useState<any[]>([]);
  const [horseMasterList, setHorseMasterList] = useState<any[]>([]);

  const [addHorseMasterName, setAddHorseMasterName] = useState('');
  const [addHorseMasterOwner, setAddHorseMasterOwner] = useState('');

  const [assignTargetHorseId, setAssignTargetHorseId] = useState<string>('');
  const [assignTargetOwnerName, setAssignTargetOwnerName] = useState<string>('');

  // 👤 プレイヤー管理用ステート
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [customBalanceInput, setCustomBalanceInput] = useState<string>('');
  const [amountToAddInput, setAmountToAddInput] = useState<number>(1000000); // 加算用
  const [customPinInput, setCustomPinInput] = useState<string>('');

  const [editTitle, setEditTitle] = useState('');
  const [editDistance, setEditDistance] = useState(1600);
  const [editCondition, setEditCondition] = useState('良');
  const [editWeather, setEditWeather] = useState('晴');
  const [editPrize, setEditPrize] = useState(1000000);

  const [newHorseNumber, setNewHorseNumber] = useState(1);
  const [newHorseName, setNewHorseName] = useState(''); 
  const [newHorseAge, setNewHorseAge] = useState(2);
  const [newJockey, setNewJockey] = useState('');

  const [firstHorse, setFirstHorse] = useState('');
  const [secondHorse, setSecondHorse] = useState('');
  const [thirdHorse, setThirdHorse] = useState('');

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

  // 💰 所持コインの直接上書き変更
  const handleSetUserBalance = async () => {
    if (!selectedUser) return;
    const newBal = Number(customBalanceInput);
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`💰 「${selectedUser.discord_name}」様の残高を ${newBal.toLocaleString()} G に変更しました！`);
    fetchUsers();
  };

  // ➕ 所持コインの追加（加算）
  const handleAddUserBalance = async (amount: number) => {
    if (!selectedUser) return;
    const currentBal = selectedUser.balance || 0;
    const newBal = currentBal + amount;
    await supabase.from('users').update({ balance: newBal }).eq('id', selectedUser.id);
    alert(`🎉 「${selectedUser.discord_name}」様に ${amount.toLocaleString()} G を追加しました！\n（変更後: ${newBal.toLocaleString()} G）`);
    fetchUsers();
  };

  // 🔑 PINコードの更新
  const handleUpdateUserPin = async () => {
    if (!selectedUser) return;
    await supabase.from('users').update({ pin_code: customPinInput }).eq('id', selectedUser.id);
    alert(`🔑 「${selectedUser.discord_name}」様のPINコードを [ ${customPinInput} ] に更新しました！`);
    fetchUsers();
  };

  // 🗑️ プレイヤーの完全削除
  const handleDeleteUser = async (userId?: string, userName?: string) => {
    const targetId = userId || selectedUser?.id;
    const targetName = userName || selectedUser?.discord_name;

    if (!targetId) return;
    if (!confirm(`⚠️ 本当に「${targetName}」様のアカウントを削除しますか？\n（この操作は取り消せません）`)) return;

    await supabase.from('users').delete().eq('id', targetId);
    alert(`🗑️ 「${targetName}」様を削除しました。`);
    
    if (targetId === selectedUserId) {
      setSelectedUserId('');
    }
    fetchUsers();
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

          <div style={{ fontSize: '12px', color: '#93c5fd', fontWeight: 'bold', padding: '0 8px', marginTop: '24px' }}>レース管理 (1〜12R)</div>
          <SideButton active={adminTab === 'race'} onClick={() => setAdminTab('race')} icon="🛠️" text="レース条件設定 / 締切" />
          <SideButton active={adminTab === 'horses'} onClick={() => setAdminTab('horses')} icon="🐴" text="出走馬追加・編集" />
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
        
        <div style={{ maxWidth: '1000px' }}>
          
          {/* 👤 TAB: プレイヤー管理 (お金追加 ＆ 削除対応) */}
          {adminTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
              
              {/* 操作パネル */}
              <div style={{ backgroundColor: '#ffffff', border: '2px solid #2563eb', borderRadius: '16px', padding: '28px' }}>
                <h2 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 プレイヤー設定・お金追加・アカウント削除
                </h2>
                
                <div style={{ marginBottom: '24px' }}>
                  <label style={labelStyle}>① 操作するプレイヤーを選択してください</label>
                  <select 
                    value={selectedUserId} 
                    onChange={e => setSelectedUserId(e.target.value)} 
                    style={{ padding: '14px', borderRadius: '10px', border: '2px solid #2563eb', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eff6ff', width: '100%' }}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        👤 {u.discord_name} （残高: {(u.balance || 0).toLocaleString()} G / PIN: {u.pin_code || '未設定'}）
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUser ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', backgroundColor: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                    
                    {/* お金直接追加（加算）セクション */}
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#16a34a', fontSize: '16px' }}>💰 所持コインを追加・付与する（加算）</h4>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input 
                          type="number" 
                          step="100000"
                          value={amountToAddInput} 
                          onChange={e => setAmountToAddInput(Number(e.target.value))} 
                          style={{ ...inputStyle, width: '200px', fontSize: '16px', fontWeight: 'bold' }} 
                        />
                        <span style={{ fontWeight: 'bold', color: '#475569' }}>G を</span>
                        <button 
                          onClick={() => handleAddUserBalance(amountToAddInput)} 
                          style={{ padding: '12px 20px', backgroundColor: '#16a34a', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                        >
                          ➕ プラス追加（加算）
                        </button>
                        <button 
                          onClick={() => handleAddUserBalance(-amountToAddInput)} 
                          style={{ padding: '12px 20px', backgroundColor: '#ca8a04', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                        >
                          ➖ マイナス引き落とし
                        </button>
                      </div>
                      
                      {/* クイック加算ボタン */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        {[1000000, 5000000, 10000000, 50000000].map(val => (
                          <button 
                            key={val} 
                            onClick={() => handleAddUserBalance(val)}
                            style={{ padding: '6px 12px', backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                          >
                            +{(val / 10000).toLocaleString()}万円
                          </button>
                        ))}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: 0 }} />

                    {/* 所持金直接変更 ＆ PIN変更 ＆ アカウント削除 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: '20px', alignItems: 'end' }}>
                      <div>
                        <label style={labelStyle}>所持コイン（直接上書き設定）</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="number" value={customBalanceInput} onChange={e => setCustomBalanceInput(e.target.value)} style={inputStyle} />
                          <button onClick={handleSetUserBalance} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>設定</button>
                        </div>
                      </div>

                      <div>
                        <label style={labelStyle}>暗証番号 (PIN 4桁)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input type="text" maxLength={4} value={customPinInput} onChange={e => setCustomPinInput(e.target.value)} style={{ ...inputStyle, textAlign: 'center', letterSpacing: '4px' }} />
                          <button onClick={handleUpdateUserPin} style={{ padding: '10px 16px', backgroundColor: '#0284c7', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}>更新</button>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <button 
                          onClick={() => handleDeleteUser()} 
                          style={{ width: '100%', padding: '12px', backgroundColor: '#dc2626', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}
                        >
                          🗑️ 削除
                        </button>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>登録されているプレイヤーがいません。</div>
                )}
              </div>

              {/* 全プレイヤー一覧カード表示 */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e3a8a', fontSize: '18px', fontWeight: 'bold' }}>
                  📋 全登録プレイヤー一覧 ({users.length}名)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {users.map(u => (
                    <div key={u.id} style={{ backgroundColor: selectedUserId === u.id ? '#eff6ff' : '#f8fafc', padding: '16px', borderRadius: '12px', border: `2px solid ${selectedUserId === u.id ? '#2563eb' : '#e2e8f0'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}>👤 {u.discord_name}</span>
                        <button 
                          onClick={() => setSelectedUserId(u.id)}
                          style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          選択・編集
                        </button>
                      </div>

                      <div style={{ fontSize: '14px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div>所持コイン: <strong style={{ color: '#16a34a' }}>{(u.balance || 0).toLocaleString()} G</strong></div>
                        <div>暗証番号: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{u.pin_code || '未設定'}</span></div>
                      </div>

                      <button 
                        onClick={() => handleDeleteUser(u.id, u.discord_name)}
                        style={{ marginTop: '12px', width: '100%', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                      >
                        🗑️ このユーザーを削除
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 🤝 TAB: 馬主＆馬 紐づけ管理 */}
          {adminTab === 'owner_assign' && (
            <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '650px' }}>
              <h3 style={{ marginTop: 0, color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>🤝 馬主と競走馬の一元紐づけ</h3>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>選択した競走馬を、指定の馬主（IPATユーザー）へ1対1で割り当て・変更できます。</p>
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