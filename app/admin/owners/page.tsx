"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HorseMaster = {
  id: string;
  name: string;
  status: string;
  passcode: string;
  balance: number;
};

type Horse = {
  id: string;
  owner_id: string;
  name: string;
  gender: string;
  age: number;
  color: string;
  father: string;
  mother: string;
  status: string;
  prize_money: number;
  races_count: number;
  wins_count: number;
  jockey: string;
  ability_rank?: string;
  growth_type?: string;
  ai_comment?: string;
};

type Stallion = {
  id: string;
  name: string;
  fee: number;
  rank_bonus: number;
};

type RaceEntry = {
  id: string;
  horse_id: string;
  owner_id: string;
  race_name: string;
  status: string;
  horses?: { name: string; jockey: string };
  horse_masters?: { name: string };
};

export default function AdminOwnersPage() {
  const [pin, setPin] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const [owners, setOwners] = useState<HorseMaster[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntry[]>([]);
  const [stallions, setStallions] = useState<Stallion[]>([]);

  // AI確率設定用
  const [spawnRates, setSpawnRates] = useState({ SS: 5, S: 15, A: 30, B: 35, C: 15 });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "0302") {
      setIsAdminAuthenticated(true);
    } else {
      alert("暗証番号が違います！");
      setPin("");
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchOwners();
      fetchRaceEntries();
      fetchStallions();
      fetchSpawnRates();
    }
  }, [isAdminAuthenticated]);

  const fetchSpawnRates = async () => {
    const { data } = await supabase.from("system_settings").select("value_json").eq("key", "spawn_rates").single();
    if (data?.value_json) setSpawnRates(data.value_json);
  };

  const handleSaveRates = async () => {
    const { error } = await supabase.from("system_settings").upsert({
      key: "spawn_rates",
      value_json: spawnRates,
    });
    if (!error) alert("AI素質出現確率を更新しました！");
  };

  const fetchOwners = async () => {
    const { data } = await supabase.from("horse_masters").select("*").order("created_at", { ascending: false });
    if (data) {
      setOwners(data);
      const approved = data.filter((o) => o.status === "approved");
      if (approved.length > 0 && !selectedOwnerId) setSelectedOwnerId(approved[0].id);
    }
  };

  useEffect(() => {
    if (selectedOwnerId && isAdminAuthenticated) {
      fetchHorses(selectedOwnerId);
    }
  }, [selectedOwnerId, isAdminAuthenticated]);

  const fetchHorses = async (ownerId: string) => {
    const { data } = await supabase.from("horses").select("*").eq("owner_id", ownerId).order("created_at", { ascending: false });
    if (data) setHorses(data);
  };

  const fetchRaceEntries = async () => {
    const { data } = await supabase.from("race_entries").select("*, horses(name, jockey), horse_masters(name)").eq("status", "pending").order("created_at", { ascending: false });
    if (data) setRaceEntries(data as any);
  };

  const fetchStallions = async () => {
    const { data } = await supabase.from("stallions").select("*").order("fee", { ascending: false });
    if (data) setStallions(data);
  };

  // 🐴 強かった牡馬を「種牡馬リスト」へ昇格追加
  const handlePromoteToStallion = async (horse: Horse) => {
    const inputFee = prompt(`「${horse.name}」の種付け料（円）を設定してください:`, "5000000");
    if (inputFee === null) return;
    const fee = Number(inputFee);
    if (isNaN(fee)) return;

    const { error } = await supabase.from("stallions").insert([
      { name: horse.name, fee: fee, rank_bonus: 15 }
    ]);

    if (!error) {
      alert(`「${horse.name}」を種牡馬リストへ昇格登録しました！`);
      fetchStallions();
    }
  };

  // 育成放牧完了（即時入厩）
  const handleCompleteTraining = async (horse: Horse) => {
    let finalComment = `【${horse.growth_type || "普通"}型】能力が本格化してきました！`;
    if (horse.ability_rank === "SS") finalComment = `【${horse.growth_type || "普通"}型】圧倒的なオーラを纏って帰ってきました！世界を獲る準備は万全です！`;

    const { error } = await supabase.from("horses").update({
      status: "現役",
      ai_comment: finalComment,
    }).eq("id", horse.id);

    if (!error) {
      alert(`「${horse.name}」の育成放牧を完了し、現役復帰させました！`);
      fetchHorses(selectedOwnerId);
    }
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <form onSubmit={handlePinSubmit} className="bg-slate-900 p-8 rounded-2xl max-w-sm w-full space-y-5 border border-slate-800 shadow-2xl">
          <div className="text-center">
            <span className="text-3xl mb-2 block">🔒</span>
            <h1 className="text-xl font-bold text-yellow-400">管理者認証</h1>
          </div>
          <div>
            <input type="password" placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} className="w-full px-4 py-3 bg-slate-800 rounded-lg text-center text-2xl font-mono text-white" maxLength={4} required autoFocus />
          </div>
          <button type="submit" className="w-full bg-emerald-600 font-bold py-3 rounded-lg hover:bg-emerald-500 transition">認証</button>
        </form>
      </div>
    );
  }

  const approvedOwners = owners.filter((o) => o.status === "approved");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー */}
      <div className="w-full md:w-72 bg-slate-900/90 p-4 border-r border-slate-800 space-y-4 shrink-0">
        <h2 className="text-sm font-bold text-yellow-400">🏇 馬主一覧</h2>
        <div className="space-y-1.5">
          {approvedOwners.map((owner) => (
            <button key={owner.id} onClick={() => setSelectedOwnerId(owner.id)} className={`w-full text-left p-2.5 rounded-lg text-xs font-bold ${selectedOwnerId === owner.id ? "bg-emerald-800 text-white" : "bg-slate-900 text-slate-300"}`}>
              <div>{owner.name}</div>
              <div className="text-yellow-400 text-[10px]">¥{(owner.balance || 0).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <h1 className="text-2xl font-bold text-emerald-400">馬主・競走馬・生産・AI設定 コントロールセンター</h1>

        {/* 1️⃣ AI生産確率の手動調整 */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
          <h3 className="text-md font-bold text-amber-400">⚙️ AI生産 素質ランク別出現確率の手動調整 (%)</h3>
          <div className="grid grid-cols-5 gap-2 text-xs">
            {["SS", "S", "A", "B", "C"].map((r) => (
              <div key={r}>
                <label className="text-slate-400 block mb-1 font-bold">{r}ランク確率</label>
                <input
                  type="number"
                  value={(spawnRates as any)[r]}
                  onChange={(e) => setSpawnRates({ ...spawnRates, [r]: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white font-mono"
                />
              </div>
            ))}
          </div>
          <button onClick={handleSaveRates} className="bg-amber-600 hover:bg-amber-500 font-bold text-slate-950 px-4 py-1.5 rounded text-xs shadow">
            確率設定を保存
          </button>
        </div>

        {/* 2️⃣ 所属競走馬一覧 ＆ 牡馬の種牡馬昇格ボタン */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-md font-bold text-slate-200">📋 競走馬データ詳細</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">馬名</th>
                  <th className="p-3">性齢 / 成長型</th>
                  <th className="p-3">素質</th>
                  <th className="p-3">状態</th>
                  <th className="p-3">AIコメント / 操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {horses.map((horse) => (
                  <tr key={horse.id}>
                    <td className="p-3 font-bold text-white">{horse.name}</td>
                    <td className="p-3">{horse.gender}{horse.age}歳 ({horse.growth_type || "普通"})</td>
                    <td className="p-3 font-mono font-bold text-yellow-400">{horse.ability_rank || "B"}</td>
                    <td className="p-3 font-bold text-emerald-400">{horse.status}</td>
                    <td className="p-3 space-y-1">
                      <div className="text-[10px] text-slate-400">{horse.ai_comment}</div>
                      <div className="flex gap-2 pt-1">
                        {horse.status === "育成放牧中" && (
                          <button onClick={() => handleCompleteTraining(horse)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                            ✨ 育成放牧完了 (入厩)
                          </button>
                        )}
                        {horse.gender === "牡" && (
                          <button onClick={() => handlePromoteToStallion(horse)} className="bg-yellow-600 hover:bg-yellow-500 text-slate-950 text-[10px] px-2 py-0.5 rounded font-bold">
                            👑 種牡馬昇格登録
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}