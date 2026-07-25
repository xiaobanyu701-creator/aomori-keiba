'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function OwnerPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [discordInput, setDiscordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [activeTab, setActiveTab] = useState<'my_horses' | 'breed'>('my_horses');
  const [my2yoHorses, setMy2yoHorses] = useState<any[]>([]);
  const [newHorseName, setNewHorseName] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadMy2yoHorses();
    }
  }, [currentUser]);

  const loadMy2yoHorses = () => {
    if (!currentUser) return;
    const storageKey = `my_2yo_horses_${currentUser.discord_name}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    setMy2yoHorses(saved);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discordInput || !pinInput) return alert('名前とPINコードを入力してください');

    const { data: users } = await supabase.from('users').select('*');
    const exUser = users?.find((u) => u.discord_name === discordInput);

    if (exUser) {
      if (exUser.pin_code === pinInput) {
        setCurrentUser(exUser);
      } else {
        alert('PINコードが違います');
      }
    } else {
      if (confirm(`「${discordInput}」さんを新規登録しますか？`)) {
        const { data: inserted } = await supabase
          .from('users')
          .insert([{ discord_name: discordInput, pin_code: pinInput, balance: 10000000 }])
          .select('*');
        if (inserted && inserted.length > 0) {
          setCurrentUser(inserted[0]);
          alert('🎉 馬主登録完了！ 10,000,000 G 付与！');
        }
      }
    }
  };

  // 🎲 10万円 ダビスタ風仔馬生産（スピード・スタミナ・根性・気性パラメータ付き）
  const handleBreedGacha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorseName.trim()) return alert('馬名を入力してください');
    if ((currentUser.balance || 0) < 100000) return alert('資金が足りません');

    // 管理者が設定した確率またはデフォルト
    const probs = JSON.parse(localStorage.getItem('breeding_probs') || '{"SS":5,"S":15,"A":20,"B":30,"C":30}');
    const rand = Math.random() * 100;

    let rank = 'C';
    if (rand < probs.SS) rank = 'SS';
    else if (rand < probs.SS + probs.S) rank = 'S';
    else if (rand < probs.SS + probs.S + probs.A) rank = 'A';
    else if (rand < probs.SS + probs.S + probs.A + probs.B) rank = 'B';

    const paramMap: { [key: string]: string[] } = {
      SS: ['S', 'S', 'A', 'S'],
      S: ['A', 'S', 'B', 'A'],
      A: ['A', 'B', 'B', 'A'],
      B: ['B', 'C', 'B', 'B'],
      C: ['C', 'C', 'C', 'C'],
    };

    const [speed, stamina, guts, temper] = paramMap[rank];

    const newHorse = {
      id: Date.now().toString(),
      name: newHorseName,
      age: 2,
      rank: rank,
      speed,
      stamina,
      guts,
      temper,
      owner: currentUser.discord_name,
      createdAt: new Date().toLocaleDateString()
    };

    const storageKey = `my_2yo_horses_${currentUser.discord_name}`;
    const currentList = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const updatedList = [newHorse, ...currentList];
    localStorage.setItem(storageKey, JSON.stringify(updatedList));

    const newBal = (currentUser.balance || 0) - 100000;
    await supabase.from('users').update({ balance: newBal }).eq('id', currentUser.id);

    setCurrentUser({ ...currentUser, balance: newBal });
    setNewHorseName('');
    alert(`🎉 2歳仔馬「${newHorseName}」が誕生しました！\n【総合素質: ${rank}】\nスピード: ${speed} / スタミナ: ${stamina} / 根性: ${guts} / 気性: ${temper}`);
    setMy2yoHorses(updatedList);
    setActiveTab('my_horses');
  };

  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', fontFamily: 'sans-serif', color: '#0f172a' }}>
      <header style={{ backgroundColor: '#16a34a', color: '#fff', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>🐴 青森県競馬 馬主ラウンジ</div>
        {currentUser && <div style={{ fontWeight: 'bold' }}>👤 {currentUser.discord_name} 様 ({(currentUser.balance || 0).toLocaleString()} G)</div>}
      </header>

      <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px' }}>
        {!currentUser ? (
          <form onSubmit={handleAuth} style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '16px', maxWidth: '400px', margin: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2 style={{ color: '#16a34a', margin: 0, textAlign: 'center' }}>馬主ログイン</h2>
            <input type="text" placeholder="Discord名" value={discordInput} onChange={e=>setDiscordInput(e.target.value)} style={inputStyle} />
            <input type="password" placeholder="PIN(4桁)" value={pinInput} onChange={e=>setPinInput(e.target.value)} style={inputStyle} />
            <button type="submit" style={{ padding: '14px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>ログイン</button>
          </form>
        ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '28px' }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <button onClick={() => setActiveTab('my_horses')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'my_horses' ? '#16a34a' : '#f1f5f9', color: activeTab === 'my_horses' ? '#fff' : '#475569' }}>🐎 自分の2歳所有馬</button>
              <button onClick={() => setActiveTab('breed')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'breed' ? '#16a34a' : '#f1f5f9', color: activeTab === 'breed' ? '#fff' : '#475569' }}>🎲 ダビスタ風 2歳仔馬生産</button>
            </div>

            {activeTab === 'my_horses' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {my2yoHorses.map(h => (
                  <div key={h.id} style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#16a34a' }}>🐎 {h.name} (2歳)</div>
                    <div style={{ fontSize: '13px', marginTop: '8px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div>総合素質: <strong style={{ color: '#dc2626' }}>【{h.rank}】</strong></div>
                      <div>スピード: {h.speed} / スタミナ: {h.stamina}</div>
                      <div>勝負根性: {h.guts} / 気性: {h.temper}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'breed' && (
              <form onSubmit={handleBreedGacha} style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3>🎲 100,000 G でダビスタ風2歳仔馬を生産</h3>
                <input type="text" placeholder="競走馬名" value={newHorseName} onChange={e=>setNewHorseName(e.target.value)} style={inputStyle} required />
                <button type="submit" style={{ padding: '16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>生産ガチャを回す 🎲</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = { padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', width: '100%' };