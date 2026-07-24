"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RaceHorse = {
  id: string;
  race_name: string;
  frame_number: number;
  horse_number: number;
  horse_name: string;
  owner_name: string;
  jockey: string;
  popularity: number;
  odds: number;
};

type Horse = {
  id: string;
  name: string;
  jockey: string;
  gender: string;
  age: number;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"horses" | "races" | "bets">("horses");

  const [horses, setHorses] = useState<Horse[]>([]);
  const [raceHorses, setRaceHorses] = useState<RaceHorse[]>([]);
  const [selectedRace, setSelectedRace] = useState<string>("第1レース");

  // 新規出走馬登録フォーム
  const [newRaceHorse, setNewRaceHorse] = useState({
    race_name: "第1レース",
    frame_number: 1,
    horse_number: 1,
    horse_name: "",
    owner_name: "青森クラブ",
    jockey: "武豊",
    popularity: 1,
    odds: 2.5,
  });

  useEffect(() => {
    fetchData();
  }, []);

  // ★ 400エラーを防ぐため select("*") のみ指定して安全に取得
  const fetchData = async () => {
    const { data: hData } = await supabase.from("horses").select("*");
    if (hData) setHorses(hData.reverse());

    const { data: rhData } = await supabase.from("race_horses").select("*");
    if (rhData) setRaceHorses(rhData);
  };

  const handleAddRaceHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRaceHorse.horse_name) return;

    const { error } = await supabase.from("race_horses").insert([newRaceHorse]);
    if (!error) {
      alert(`「${newRaceHorse.horse_name}」を${newRaceHorse.race_name}に出走登録しました！`);
      setNewRaceHorse({ ...newRaceHorse, horse_name: "", horse_number: newRaceHorse.horse_number + 1 });
      fetchData();
    } else {
      alert("登録エラー: " + error.message);
    }
  };

  const handleDeleteRaceHorse = async (id: string, name: string) => {
    if (!confirm(`「${name}」を出走リストから削除しますか？`)) return;
    const { error } = await supabase.from("race_horses").delete().eq("id", id);
    if (!error) fetchData();
  };

  const currentRaceHorses = raceHorses.filter((rh) => rh.race_name === selectedRace);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">🏇 レース・馬柱 コントロールパネル</h1>
          <p className="text-xs text-slate-400 mt-1">出走馬登録・オッズ設定・全出走馬管理</p>
        </div>
        <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-mono font-bold">
          System Normal
        </span>
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-2 border-b border-slate-800 pb-3 text-xs font-bold">
        <button
          onClick={() => setActiveTab("horses")}
          className={`px-4 py-2 rounded-lg ${activeTab === "horses" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}
        >
          📋 出走馬登録・馬柱管理
        </button>
        <button
          onClick={() => setActiveTab("races")}
          className={`px-4 py-2 rounded-lg ${activeTab === "races" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}
        >
          🐴 全競走馬マスター ({horses.length}頭)
        </button>
      </div>

      {/* タブ1: 出走馬・馬柱管理 */}
      {activeTab === "horses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：出走馬登録フォーム */}
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h2 className="text-md font-bold text-yellow-400">➕ レース出走馬の追加</h2>
            <form onSubmit={handleAddRaceHorse} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">対象レース</label>
                <select
                  value={newRaceHorse.race_name}
                  onChange={(e) => setNewRaceHorse({ ...newRaceHorse, race_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                >
                  <option value="第1レース">第1レース</option>
                  <option value="第2レース">第2レース</option>
                  <option value="第3レース">第3レース</option>
                  <option value="メインレース">メインレース</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">枠番 (1-8)</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newRaceHorse.frame_number}
                    onChange={(e) => setNewRaceHorse({ ...newRaceHorse, frame_number: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">馬番</label>
                  <input
                    type="number"
                    min={1}
                    value={newRaceHorse.horse_number}
                    onChange={(e) => setNewRaceHorse({ ...newRaceHorse, horse_number: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">馬名 (既存馬から選択または手入力)</label>
                <input
                  type="text"
                  placeholder="例: ハイランドリーク"
                  value={newRaceHorse.horse_name}
                  onChange={(e) => setNewRaceHorse({ ...newRaceHorse, horse_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white font-bold"
                  required
                />
                <div className="flex gap-1 overflow-x-auto pt-1">
                  {horses.slice(0, 5).map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setNewRaceHorse({ ...newRaceHorse, horse_name: h.name, jockey: h.jockey || "武豊" })}
                      className="bg-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded whitespace-nowrap"
                    >
                      {h.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">騎手</label>
                  <input
                    type="text"
                    value={newRaceHorse.jockey}
                    onChange={(e) => setNewRaceHorse({ ...newRaceHorse, jockey: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">単勝オッズ</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRaceHorse.odds}
                    onChange={(e) => setNewRaceHorse({ ...newRaceHorse, odds: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-yellow-400 font-bold font-mono"
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white py-2.5 rounded text-xs transition">
                出走馬リストへ登録
              </button>
            </form>
          </div>

          {/* 右：出走馬一覧 */}
          <div className="lg:col-span-2 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-md font-bold text-slate-200">🏁 出走表一覧</h2>
              <div className="flex gap-2 text-xs">
                {["第1レース", "第2レース", "第3レース", "メインレース"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRace(r)}
                    className={`px-3 py-1 rounded font-bold ${selectedRace === r ? "bg-yellow-500 text-slate-950" : "bg-slate-950 text-slate-400"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">枠-馬</th>
                    <th className="p-2.5">馬名</th>
                    <th className="p-2.5">騎手</th>
                    <th className="p-2.5">馬主</th>
                    <th className="p-2.5">オッズ</th>
                    <th className="p-2.5">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currentRaceHorses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-500">
                        {selectedRace} に登録されている出走馬はありません。
                      </td>
                    </tr>
                  ) : (
                    currentRaceHorses.map((rh) => (
                      <tr key={rh.id}>
                        <td className="p-2.5 font-bold font-mono">
                          [{rh.frame_number}] - {rh.horse_number}
                        </td>
                        <td className="p-2.5 font-bold text-white">{rh.horse_name}</td>
                        <td className="p-2.5 text-yellow-400 font-bold">{rh.jockey}</td>
                        <td className="p-2.5 text-slate-400">{rh.owner_name}</td>
                        <td className="p-2.5 font-bold font-mono text-yellow-400">{rh.odds}倍</td>
                        <td className="p-2.5">
                          <button
                            onClick={() => handleDeleteRaceHorse(rh.id, rh.horse_name)}
                            className="bg-rose-950 text-rose-300 px-2 py-1 rounded text-[10px]"
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* タブ2: 全競走馬マスター */}
      {activeTab === "races" && (
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <h2 className="text-md font-bold text-slate-200">🐴 データベース登録馬 ({horses.length}頭)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {horses.map((h) => (
              <div key={h.id} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{h.name}</div>
                  <div className="text-slate-400 text-[11px]">{h.gender}{h.age}歳</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 font-bold">騎手: {h.jockey || "未定"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}