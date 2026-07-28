'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function JockeyHubPage() {
  // --- 状態管理 ---
  const [currentJockey, setCurrentJockey] = useState<any>(null);
  const [jockeyNameInput, setJockeyNameInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  const [activeTab, setActiveTab] = useState<'offers' | 'mydata' | 'ranking' | 'interview'>('offers');
  
  // データ一覧
  const [offers, setOffers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [g1Wins, setG1Wins] = useState<any[]>([]);

  // ヒーローインタビュー入力用
  const [selectedRaceForInterview, setSelectedRaceForInterview] = useState<string>('');
  const [interviewComment, setInterviewComment] = useState<string>('');

  // 統計情報
  const [stats, setStats] = useState({
    wins: 0,
    places: 0,
    rides: 0,
    winRate: '0.0',
    totalEarnings: 0,
  });

  // --- 初期処理 ---
  useEffect(() => {
    fetchLeaderboard();

    const saved = localStorage.getItem('app_jockey_session_v2');
    if (saved) {
      const jData = JSON.parse(saved);
      setCurrentJockey(jData);
    }
  }, []);

  useEffect(() => {
    if (currentJockey) {
      loadJockeyDashboard(currentJockey.name);
    }
  }, [currentJockey]);

  // --- データ読み込み ---
  const loadJockeyDashboard = async (jockeyName: string) => {
    // 1. オファー（騎乗依頼）の取得
    const { data: reqData } = await supabase
      .from('race_requests')
      .select('*')
      .eq('preferred_jockey', jockeyName)
      .order('created_at', { ascending: false });
    if (reqData) setOffers(reqData);

    // 2. 騎乗成績 ＆ 獲得賞金の計算
    const { data: rData } = await supabase
      .from('horse_results')
      .select('*')
      .eq('jockey', jockeyName)
      .order('created_at', { ascending: false });

    if (rData) {
      setResults(rData);
      const wins = rData.filter((r) => r.rank_result === 1).length;
      const places = rData.filter((r) => r.rank_result === 2).length;
      const rides = rData.length;
      const winRate = rides > 0 ? ((wins / rides) * 100).toFixed(1) : '0.0';

      // 騎手手当・賞金計算（1着ごとに50,000G、騎乗手当10,000G）
      const totalEarnings = wins * 50000 + rides * 10000;

      setStats({ wins, places, rides, winRate, totalEarnings });

      // G1勝利レースの抽出（インタビュー用）
      const g1s = rData.filter((r) => r.rank_result === 1 && r.race_name?.includes('G1'));
      setG1Wins(g1s);
    }
  };

  // 騎手リーディング（順位表）集計
  const fetchLeaderboard = async () => {
    const { data: jData } = await supabase.from('jockeys').select('*');
    const { data: rData } = await supabase.from('horse_results').select('*');

    if (jData) {
      const statsMap: { [key: string]: { win: number; rides: number } } = {};

      if (rData) {
        rData.forEach((r) => {
          const name = r.jockey || '未設定';
          if (!statsMap[name]) statsMap[name] = { win: 0, rides: 0 };
          statsMap[name].rides += 1;
          if (r.rank_result === 1) statsMap[name].win += 1;
        });
      }

      const formatted = jData.map((j) => {
        const st = statsMap[j.name] || { win: 0, rides: 0 };
        const rate = st.rides > 0 ? ((st.win / st.rides) * 100).toFixed(1) : '0.0';
        return { ...j, wins: st.win, rides: st.rides, winRate: rate };
      });

      formatted.sort((a, b) => b.wins - a.wins);
      setLeaderboard(formatted);
    }
  };

  // --- アクション ---
  // ログイン
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: jData } = await supabase.from('jockeys').select('*').eq('name', jockeyNameInput).single();

    if (jData) {
      const expectedPin = jData.pin_code || '0000';
      if (pinInput === expectedPin) {
        setCurrentJockey(jData);
        localStorage.setItem('app_jockey_session_v2', JSON.stringify(jData));
      } else {
        alert('❌ PINコードが違います');
      }
    } else {
      alert('❌ 登録された騎手名が見つかりません');
    }
  };

  // オファーの受諾/辞退
  const handleOfferResponse = async (offerId: string, status: 'approved' | 'rejected') => {
    await supabase.from('race_requests').update({ status }).eq('id', offerId);
    alert(status === 'approved' ? '🟢 騎乗依頼を受諾しました！' : '🔴 騎乗依頼を辞退しました');
    if (currentJockey) loadJockeyDashboard(currentJockey.name);
  };

  // ヒーローインタビュー投稿
  const handlePostInterview = async () => {
    if (!selectedRaceForInterview || !interviewComment) return alert('レースとコメントを入力してください');

    await supabase.from('notifications').insert([{
      title: `🎙️ 【勝利騎手インタビュー】 ${currentJockey.name} 騎手`,
      message: `🏆 勝利レース: ${selectedRaceForInterview}\n💬 「${interviewComment}」`,
      type: 'system'
    }]);

    alert('✨ 勝利騎手インタビューを即パットアプリ全体へ配信しました！');
    setInterviewComment('');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', fontFamily: 'sans-serif', color: '#f8fafc' }}>
      
      {/* 👑 騎手専用ヘッダー */}
      <header style={{ backgroundColor: '#1e293b', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ backgroundColor: '#059669', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px' }}>
            JOCKEY HUB
          </span>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>🏇 騎手専用コックピット</h1>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {currentJockey && (
            <button
              onClick={() => { localStorage.removeItem('app_jockey_session_v2'); setCurrentJockey(null); }}
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
            >
              ログアウト
            </button>
          )}
          <Link href="/" style={{ backgroundColor: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', fontSize: '12px' }}>
            🎫 即パット ↗
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '850px', margin: '20px auto', padding: '0 12px' }}>
        
        {!currentJockey ? (
          /* 🔒 騎手認証画面 */
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #059669', borderRadius: '16px', padding: '32px 20px', maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏇</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#34d399', fontSize: '20px' }}>騎手プロファイル ログイン</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '20px' }}>騎手名と暗証番号（PINデフォルト: 0000）を入力</p>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="text"
                placeholder="騎手名（例: ルメール）"
                value={jockeyNameInput}
                onChange={(e) => setJockeyNameInput(e.target.value)}
                style={darkInput}
                required
              />
              <input
                type="password"
                maxLength={4}
                placeholder="PIN 4桁"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                style={{ ...darkInput, textAlign: 'center', letterSpacing: '8px' }}
                required
              />
              <button type="submit" style={{ padding: '14px', backgroundColor: '#059669', color: '#fff', borderRadius: '8px', fontWeight: 'bold', fontSize: '16px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                コックピットを起動 🚀
              </button>
            </form>
          </div>
        ) : (
          /* 📱 騎手専用ダッシュボード */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* 📊 騎手ステータスバー */}
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ backgroundColor: '#10b981', color: '#0f172a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>専属Jockey</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '22px', color: '#f8fafc' }}>🏇 {currentJockey.name} 騎手</h2>
              </div>

              <div style={{ display: 'flex', gap: '16px', backgroundColor: '#0f172a', padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>通算勝利</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#facc15' }}>{stats.wins} 勝</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>勝率</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{stats.winRate}%</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#94a3b8' }}>獲得手当・賞金</div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#4ade80' }}>{stats.totalEarnings.toLocaleString()} G</div>
                </div>
              </div>
            </div>

            {/* 📑 タブナビゲーション */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              <button onClick={() => setActiveTab('offers')} style={tabBtn(activeTab === 'offers')}>
                📩 騎乗オファー ({offers.filter(o => o.status !== 'rejected').length})
              </button>
              <button onClick={() => setActiveTab('mydata')} style={tabBtn(activeTab === 'mydata')}>
                📋 騎乗履歴 ＆ 分析
              </button>
              <button onClick={() => setActiveTab('interview')} style={tabBtn(activeTab === 'interview')}>
                🎙️ ヒーローインタビュー
              </button>
              <button onClick={() => setActiveTab('ranking')} style={tabBtn(activeTab === 'ranking')}>
                🏆 騎手リーディング
              </button>
            </div>

            {/* --- TAB 1: 📩 騎乗オファー --- */}
            {activeTab === 'offers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {offers.length === 0 ? (
                  <div style={emptyCard}>現在、あなた宛の新規騎乗オファーはありません。</div>
                ) : (
                  offers.map((o) => (
                    <div key={o.id} style={{ backgroundColor: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>【{o.target_race_no}R】</span>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80', marginLeft: '8px' }}>🐎 {o.horse_name}</span>
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>依頼馬主: 👤 {o.owner_name} 様</div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {o.status === 'approved' ? (
                          <span style={{ backgroundColor: '#059669', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>🟢 受諾済み</span>
                        ) : o.status === 'rejected' ? (
                          <span style={{ backgroundColor: '#dc2626', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>🔴 辞退済み</span>
                        ) : (
                          <>
                            <button onClick={() => handleOfferResponse(o.id, 'approved')} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                              受諾 ⭕
                            </button>
                            <button onClick={() => handleOfferResponse(o.id, 'rejected')} style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                              辞退 ❌
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* --- TAB 2: 📋 騎乗履歴 ＆ 分析 --- */}
            {activeTab === 'mydata' && (
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#38bdf8' }}>全騎乗戦績ログ</h3>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>着順</th>
                        <th style={{ padding: '8px' }}>馬名</th>
                        <th style={{ padding: '8px' }}>レース</th>
                        <th style={{ padding: '8px' }}>獲得手当・賞金</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold', color: r.rank_result === 1 ? '#facc15' : '#fff' }}>
                            {r.rank_result === 1 ? '🥇 1着' : `${r.rank_result}着`}
                          </td>
                          <td style={{ padding: '8px', color: '#4ade80', fontWeight: 'bold' }}>🐎 {r.horse_name}</td>
                          <td style={{ padding: '8px', color: '#94a3b8' }}>{r.race_name}</td>
                          <td style={{ padding: '8px', color: '#38bdf8' }}>
                            {r.rank_result === 1 ? '60,000 G' : '10,000 G'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- TAB 3: 🎙️ ヒーローインタビュー --- */}
            {activeTab === 'interview' && (
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#facc15' }}>🎙️ 勝利騎手ヒーローインタビューの発信</h3>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '16px' }}>
                  1着を獲得した勝利の歓びやレース振り返りを投稿すると、即パットアプリ全体へ一斉配信されます！
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <select
                    value={selectedRaceForInterview}
                    onChange={(e) => setSelectedRaceForInterview(e.target.value)}
                    style={darkInput}
                  >
                    <option value="">対象の勝利レースを選択...</option>
                    {results.filter(r => r.rank_result === 1).map((r, idx) => (
                      <option key={idx} value={`${r.race_name} (勝ち馬: ${r.horse_name})`}>
                        🏆 {r.race_name} - 🐎 {r.horse_name}
                      </option>
                    ))}
                  </select>

                  <textarea
                    rows={4}
                    placeholder="「手応え抜群でした！応援ありがとうございました！」など勝利の一言..."
                    value={interviewComment}
                    onChange={(e) => setInterviewComment(e.target.value)}
                    style={{ ...darkInput, resize: 'none' }}
                  />

                  <button
                    onClick={handlePostInterview}
                    style={{ backgroundColor: '#facc15', color: '#0f172a', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}
                  >
                    インタビューを全ファンへ配信 📣
                  </button>
                </div>
              </div>
            )}

            {/* --- TAB 4: 🏆 騎手リーディング --- */}
            {activeTab === 'ranking' && (
              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#facc15' }}>🏆 所属騎手リーディング順位</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {leaderboard.map((j, idx) => (
                    <div key={j.id} style={{ backgroundColor: j.name === currentJockey.name ? '#065f46' : '#0f172a', border: '1px solid #334155', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 'bold', color: idx === 0 ? '#facc15' : '#94a3b8', fontSize: '14px', width: '30px' }}>
                          {idx === 0 ? '👑1位' : `${idx + 1}位`}
                        </span>
                        <strong style={{ fontSize: '14px' }}>🏇 {j.name} 騎手 {j.name === currentJockey.name && '(あなた)'}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                        <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{j.wins} 勝</span>
                        <span style={{ color: '#38bdf8' }}>勝率 {j.winRate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

// スタイル補助
const darkInput = { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#f8fafc', fontSize: '14px' };
const emptyCard = { padding: '24px', textAlign: 'center' as const, color: '#94a3b8', backgroundColor: '#1e293b', borderRadius: '12px', border: '1px solid #334155', fontSize: '13px' };
const tabBtn = (active: boolean) => ({
  padding: '8px 14px',
  backgroundColor: active ? '#059669' : '#1e293b',
  color: active ? '#fff' : '#94a3b8',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 'bold' as const,
});