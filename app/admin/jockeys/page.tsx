'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminJockeyManager() {
  const [jockeys, setJockeys] = useState<any[]>([]);
  const [selectedJockey, setSelectedJockey] = useState<any>(null);

  // ➕ 新人騎手登録フォーム
  const [newJockeyName, setNewJockeyName] = useState('');
  const [newJockeyPin, setNewJockeyPin] = useState('0000');

  // ✏️ 編集フォーム用ステート
  const [editWins, setEditWins] = useState<number>(0);
  const [editRides, setEditRides] = useState<number>(0);
  const [editPin, setEditPin] = useState<string>('0000');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    fetchJockeys();
  }, []);

  const fetchJockeys = async () => {
    const { data } = await supabase.from('jockeys').select('*').order('created_at', { ascending: false });
    if (data) {
      setJockeys(data);
      if (data.length > 0 && !selectedJockey) {
        selectJockeyForEdit(data[0]);
      }
    }
  };

  const selectJockeyForEdit = (jockey: any) => {
    setSelectedJockey(jockey);
    setEditWins(jockey.wins || 0);
    setEditRides(jockey.rides || 0);
    setEditPin(jockey.pin_code || '0000');
  };

  // ➕ 新人騎手のデビュー登録
  const handleAddJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJockeyName.trim()) return alert('騎手名を入力してください');

    const { error } = await supabase.from('jockeys').insert([
      {
        name: newJockeyName.trim(),
        pin_code: newJockeyPin || '0000',
        status: '現役',
        wins: 0,
        rides: 0,
      },
    ]);

    if (error) {
      alert(`❌ 登録エラー: ${error.message}`);
    } else {
      alert(`🎉 新人騎手 「${newJockeyName}」 がデビュー登録されました！`);
      setNewJockeyName('');
      setNewJockeyPin('0000');
      fetchJockeys();
    }
  };

  // ✏️ 騎手パラメータ・PINの直接修正
  const handleUpdateJockeyStats = async () => {
    if (!selectedJockey) return;

    await supabase
      .from('jockeys')
      .update({
        wins: Number(editWins),
        rides: Number(editRides),
        pin_code: editPin,
      })
      .eq('id', selectedJockey.id);

    alert(`💾 騎手「${selectedJockey.name}」の成績・PINデータを更新しました！`);
    fetchJockeys();
  };

  // 🚪 騎手の引退 / 復帰ステート変更
  const handleToggleRetireJockey = async (jockeyId: string, currentStatus: string, name: string) => {
    const nextStatus = currentStatus === '引退' ? '現役' : '引退';
    if (!confirm(`騎手「${name}」のステータスを【 ${nextStatus} 】に変更しますか？`)) return;

    await supabase.from('jockeys').update({ status: nextStatus }).eq('id', jockeyId);
    alert(`🔄 騎手「${name}」を【 ${nextStatus} 】に切り替えました。`);
    fetchJockeys();
  };

  // 🗑️ 騎手データの完全削除
  const handleDeleteJockey = async (jockeyId: string, name: string) => {
    if (!confirm(`⚠️ 警告: 騎手「${name}」のマスターデータを完全に削除しますか？`)) return;

    await supabase.from('jockeys').delete().eq('id', jockeyId);
    alert(`🗑️ 騎手「${name}」を削除しました。`);
    setSelectedJockey(null);
    fetchJockeys();
  };

  const filteredJockeys = jockeys.filter((j) =>
    searchQuery
      ? (j.name || '').includes(searchQuery) || (j.status || '').includes(searchQuery)
      : true
  );

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f8fafc', padding: '16px' }}>
      
      {/* ヘッダー */}
      <header style={{ backgroundColor: '#1e293b', padding: '14px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            SUPER ADMIN
          </span>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>🏇 所属騎手マスター管理コンソール</h1>
        </div>
        <Link href="/admin" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
          ⚙️ 管理画面TOPへ ↗
        </Link>
      </header>

      <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ➕ 新人騎手デビュー登録 */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #059669', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#34d399', fontSize: '16px', fontWeight: 'bold' }}>
            ✨ 新人騎手 デビュー直接登録
          </h3>
          <form onSubmit={handleAddJockey} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>騎手名</label>
              <input type="text" placeholder="例: 武豊" value={newJockeyName} onChange={(e) => setNewJockeyName(e.target.value)} style={darkInput} required />
            </div>
            <div>
              <label style={labelStyle}>初期PIN (4桁)</label>
              <input type="text" maxLength={4} value={newJockeyPin} onChange={(e) => setNewJockeyPin(e.target.value)} style={{ ...darkInput, textAlign: 'center', letterSpacing: '4px' }} required />
            </div>
            <button type="submit" style={{ padding: '12px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
              デビュー ➕
            </button>
          </form>
        </div>

        {/* ✏️ 選択中騎手の詳細編集 ＆ PIN初期化 */}
        {selectedJockey && (
          <div style={{ backgroundColor: '#1e293b', border: '2px solid #2563eb', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '18px', fontWeight: 'bold' }}>
                ✏️ 騎手「{selectedJockey.name}」 パラメータ・成績直接修正
              </h3>
              <span style={{ backgroundColor: selectedJockey.status === '引退' ? '#ef4444' : '#10b981', color: '#fff', fontSize: '11px', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                {selectedJockey.status || '現役'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>通算1着数 (勝)</label>
                <input type="number" value={editWins} onChange={(e) => setEditWins(Number(e.target.value))} style={darkInput} />
              </div>
              <div>
                <label style={labelStyle}>通算騎乗数 (戦)</label>
                <input type="number" value={editRides} onChange={(e) => setEditRides(Number(e.target.value))} style={darkInput} />
              </div>
              <div>
                <label style={labelStyle}>暗証番号 (PIN)</label>
                <input type="text" maxLength={4} value={editPin} onChange={(e) => setEditPin(e.target.value)} style={{ ...darkInput, textAlign: 'center', letterSpacing: '4px', fontWeight: 'bold', color: '#facc15' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleUpdateJockeyStats} style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
                成績・PIN情報を保存 💾
              </button>
              <button onClick={() => handleToggleRetireJockey(selectedJockey.id, selectedJockey.status, selectedJockey.name)} style={{ padding: '12px 16px', backgroundColor: selectedJockey.status === '引退' ? '#10b981' : '#d97706', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                {selectedJockey.status === '引退' ? '現役復帰 ♨️' : '引退処理 🚪'}
              </button>
              <button onClick={() => handleDeleteJockey(selectedJockey.id, selectedJockey.name)} style={{ padding: '12px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                完全削除 🗑️
              </button>
            </div>
          </div>
        )}

        {/* 📋 所属騎手一覧テーブル */}
        <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 'bold' }}>
              📋 全所属騎手マスター一覧 ({jockeys.length}名)
            </h3>
            <input
              type="text"
              placeholder="🔍 騎手名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ ...darkInput, width: '200px', padding: '8px 12px', fontSize: '12px' }}
            />
          </div>

          <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #334155' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>騎手名</th>
                  <th style={{ padding: '10px' }}>ステータス</th>
                  <th style={{ padding: '10px' }}>PIN</th>
                  <th style={{ padding: '10px' }}>通算成績</th>
                  <th style={{ padding: '10px' }}>勝率</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredJockeys.map((j) => {
                  const winRate = j.rides > 0 ? ((j.wins / j.rides) * 100).toFixed(1) : '0.0';
                  const isSelected = selectedJockey?.id === j.id;

                  return (
                    <tr key={j.id} style={{ borderBottom: '1px solid #334155', backgroundColor: isSelected ? '#1e3a8a' : '#1e293b' }}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#38bdf8' }}>
                        🏇 {j.name}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={{ backgroundColor: j.status === '引退' ? '#64748b' : '#059669', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                          {j.status || '現役'}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontFamily: 'monospace', color: '#facc15', fontWeight: 'bold' }}>
                        {j.pin_code || '0000'}
                      </td>
                      <td style={{ padding: '10px', color: '#4ade80', fontWeight: 'bold' }}>
                        {j.wins || 0}勝 / {j.rides || 0}戦
                      </td>
                      <td style={{ padding: '10px', color: '#38bdf8', fontWeight: 'bold' }}>
                        {winRate}%
                      </td>
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          onClick={() => selectJockeyForEdit(j)}
                          style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          選択・編集 ✏️
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
    </div>
  );
}

const darkInput = {
  width: '100%',
  padding: '10px',
  borderRadius: '8px',
  border: '1px solid #334155',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontSize: '13px',
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  color: '#94a3b8',
  marginBottom: '4px',
  fontWeight: 'bold',
};