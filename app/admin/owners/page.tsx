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
  temporary_jockey?: string;
  jockey_status?: string;
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

  const [adminTab, setAdminTab] = useState<"horses" | "jockey_approve" | "add_horse" | "stallions" | "ai_settings" | "retired">("horses");

  const [owners, setOwners] = useState<HorseMaster[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [horses, setHorses] = useState<Horse[]>([]);
  const [raceEntries, setRaceEntries] = useState<RaceEntry[]>([]);
  const [stallions, setStallions] = useState<Stallion[]>([]);

  const [spawnRates, setSpawnRates] = useState({ SS: 5, S: 15, A: 30, B: 35, C: 15 });

  const [newHorse, setNewHorse] = useState({
    name: "",
    gender: "牡",
    age: 3,
    color: "鹿毛",
    father: "ディープインパクト",
    mother: "自家製牝馬",
    prize_money: 0,
    races_count: 0,
    wins_count: 0,
    jockey: "武豊",
    ability_rank: "A",
  });

  const [newStallion, setNewStallion] = useState({ name: "", fee: 3000000, rank_bonus: 10 });

  const [editingHorseId, setEditingHorseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    prize_money: 0,
    races_count: 0,
    wins_count: 0,
    ability_rank: "B",
    ai_comment: "",
    jockey: "",
    temporary_jockey: "",
  });

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
    const { data } = await supabase.from("system_settings").select("*").eq("key", "spawn_rates").maybeSingle();
    if (data?.value_json) setSpawnRates(data.value_json);
  };

  const handleSaveRates = async () => {
    const { error } = await supabase.from("system_settings").upsert({
      key: "spawn_rates",
      value_json: spawnRates,
    });
    if (!error) alert("AI素質出現確率を保存しました！");
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
    const { data } = await supabase.from("race_entries").select("*, horses(*), horse_masters(*)").eq("status", "pending").order("created_at", { ascending: false });
    if (data) setRaceEntries(data as any);
  };

  const fetchStallions = async () => {
    const { data } = await supabase.from("stallions").select("*").order("fee", { ascending: false });
    if (data) setStallions(data);
  };

  const handleApproveJockey = async (horse: Horse, isApproved: boolean) => {
    if (isApproved) {
      const { error } = await supabase.from("horses").update({ jockey_status: "approved" }).eq("id", horse.id);
      if (!error) {
        alert(`「${horse.name}」の騎手設定を承認しました！`);
        fetchHorses(selectedOwnerId);
      }
    } else {
      const { error } = await supabase.from("horses").update({
        temporary_jockey: null,
        jockey_status: "approved"
      }).eq("id", horse.id);
      if (!error) {
        alert("騎手申請を却下しました。");
        fetchHorses(selectedOwnerId);
      }
    }
  };

  const handleApproveOwner = async (ownerId: string) => {
    const { error } = await supabase.from("horse_masters").update({ status: "approved" }).eq("id", ownerId);
    if (!error) {
      alert("馬主を承認しました！");
      fetchOwners();
    }
  };

  const handleDeleteOwner = async (ownerId: string, ownerName: string) => {
    if (!confirm(`馬主「${ownerName}」を削除しますか？`)) return;
    const { error } = await supabase.from("horse_masters").delete().eq("id", ownerId);
    if (!error) {
      alert("削除しました");
      fetchOwners();
    }
  };

  const handleApproveRace = async (entry: RaceEntry, status: "approved" | "rejected") => {
    const { error } = await supabase.from("race_entries").update({ status }).eq("id", entry.id);
    if (error) return;

    if (status === "approved") {
      const h = horses.find((x) => x.id === entry.horse_id);
      const activeJockey = h?.temporary_jockey || h?.jockey || "未定";

      await supabase.from("race_horses").insert([
        {
          race_name: entry.race_name,
          horse_id: entry.horse_id,
          horse_name: entry.horses?.name || "出走馬",
          owner_name: entry.horse_masters?.name || "馬主",
          jockey: activeJockey,
          frame_number: 1,
          horse_number: 1,
          popularity: 1,
          odds: 2.0,
        }
      ]);
      alert("出走確定し、連動騎手データ付きで馬柱へ登録しました！");
    } else {
      alert("出走申請を却下しました");
    }
    fetchRaceEntries();
  };

  const handleUpdateHorseStatus = async (horse: Horse, newStatus: string) => {
    const { error } = await supabase.from("horses").update({ status: newStatus }).eq("id", horse.id);
    if (!error && newStatus === "引退") {
      await supabase.from("race_horses").delete().eq("horse_id", horse.id);
      alert(`「${horse.name}」を引退処理しました。`);
    }
    fetchHorses(selectedOwnerId);
  };

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

  const handleCompleteTraining = async (horse: Horse) => {
    let finalComment = `【${horse.growth_type || "普通"}型】能力が本格化してきました！`;
    if (horse.ability_rank === "SS") finalComment = `【${horse.growth_type || "普通"}型】圧倒的なオーラを纏って帰ってきました！`;

    const { error } = await supabase.from("horses").update({
      status: "現役",
      ai_comment: finalComment,
    }).eq("id", horse.id);

    if (!error) {
      alert(`「${horse.name}」の育成放牧を完了し、現役復帰させました！`);
      fetchHorses(selectedOwnerId);
    }
  };

  const handleAddStallion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStallion.name) return;
    const { error } = await supabase.from("stallions").insert([newStallion]);
    if (!error) {
      alert("種牡馬を追加しました！");
      setNewStallion({ name: "", fee: 3000000, rank_bonus: 10 });
      fetchStallions();
    }
  };

  const handleDeleteStallion = async (id: string, name: string) => {
    if (!confirm(`種牡馬「${name}」を削除しますか？`)) return;
    const { error } = await supabase.from("stallions").delete().eq("id", id);
    if (!error) fetchStallions();
  };

  const handleAddHorseDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorse.name || !selectedOwnerId) return;

    const { error } = await supabase.from("horses").insert([
      {
        ...newHorse,
        owner_id: selectedOwnerId,
        status: "現役",
        jockey_status: "approved",
        ai_comment: "管理者登録の期待馬です！",
      }
    ]);

    if (!error) {
      alert(`「${newHorse.name}」を追加しました！`);
      fetchHorses(selectedOwnerId);
      setAdminTab("horses");
    }
  };

  const startEditing = (horse: Horse) => {
    setEditingHorseId(horse.id);
    setEditForm({
      prize_money: horse.prize_money || 0,
      races_count: horse.races_count || 0,
      wins_count: horse.wins_count || 0,
      ability_rank: horse.ability_rank || "B",
      ai_comment: horse.ai_comment || "",
      jockey: horse.jockey || "武豊",
      temporary_jockey: horse.temporary_jockey || "",
    });
  };

  const handleUpdateHorseStats = async () => {
    if (!editingHorseId) return;

    const { error } = await supabase.from("horses").update({
      prize_money: Number(editForm.prize_money),
      races_count: Number(editForm.races_count),
      wins_count: Number(editForm.wins_count),
      ability_rank: editForm.ability_rank,
      jockey: editForm.jockey,
      temporary_jockey: editForm.temporary_jockey || null,
      ai_comment: editForm.ai_comment,
    }).eq("id", editingHorseId);

    if (!error) {
      alert("競走馬の詳細データを更新しました！");
      setEditingHorseId(null);
      fetchHorses(selectedOwnerId);
    }
  };

  const handleUpdateOwnerBalance = async (owner: HorseMaster) => {
    const input = prompt(`「${owner.name}」の新しい所持金（円）を入力してください:`, owner.balance?.toString() || "10000000");
    if (input === null) return;
    const newBal = Number(input);
    if (!isNaN(newBal)) {
      await supabase.from("horse_masters").update({ balance: newBal }).eq("id", owner.id);
      fetchOwners();
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

  const pendingOwners = owners.filter((o) => o.status === "pending");
  const approvedOwners = owners.filter((o) => o.status === "approved");
  const currentOwner = owners.find((o) => o.id === selectedOwnerId);

  const activeHorses = horses.filter((h) => h.status !== "引退");
  const pendingJockeyHorses = horses.filter((h) => h.jockey_status === "pending");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー */}
      <div className="w-full md:w-80 bg-slate-900/90 p-4 border-r border-slate-800 space-y-6 shrink-0">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-yellow-400">🏇 登録馬主・クラブ</h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{approvedOwners.length}名</span>
        </div>

        {pendingOwners.length > 0 && (
          <div className="bg-amber-950/50 border border-amber-600/60 p-3 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-amber-400">⏳ 承認待ち新規申請 ({pendingOwners.length}件)</h3>
            <div className="space-y-2">
              {pendingOwners.map((owner) => (
                <div key={owner.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{owner.name}</div>
                    <div className="text-[10px] text-slate-500">Pass: {owner.passcode}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleApproveOwner(owner.id)} className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[11px]">承認</button>
                    <button onClick={() => handleDeleteOwner(owner.id, owner.name)} className="bg-rose-950 text-rose-300 px-2 py-1 rounded text-[11px]">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 出走申請 */}
        {raceEntries.length > 0 && (
          <div className="bg-blue-950/50 border border-blue-600/60 p-3 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-blue-400">🏁 レース出走申請 ({raceEntries.length}件)</h3>
            <div className="space-y-2">
              {raceEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
                  <div className="font-bold text-white">{entry.horses?.name || "馬"}</div>
                  <div className="text-blue-300 text-[11px]">希望: {entry.race_name}</div>
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => handleApproveRace(entry, "approved")} className="w-full bg-blue-600 text-white font-bold py-1 rounded text-[11px]">確定</button>
                    <button onClick={() => handleApproveRace(entry, "rejected")} className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[11px]">却下</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {approvedOwners.map((owner) => (
            <div key={owner.id} className={`p-3 rounded-xl text-xs border flex justify-between items-center ${selectedOwnerId === owner.id ? "bg-emerald-950/80 border-emerald-500 text-white" : "bg-slate-900/80 border-slate-800 text-slate-300"}`}>
              <button onClick={() => setSelectedOwnerId(owner.id)} className="flex-1 text-left font-bold space-y-1">
                <div className="text-sm text-white">{owner.name}</div>
                <div className="text-yellow-400 font-mono font-bold">残高: ¥{(owner.balance || 0).toLocaleString()}</div>
              </button>
              <div className="flex flex-col gap-1 pl-2">
                <button onClick={() => handleUpdateOwnerBalance(owner)} className="bg-slate-800 text-yellow-300 text-[10px] px-2 py-1 rounded">残高変更</button>
                <button onClick={() => handleDeleteOwner(owner.id, owner.name)} className="bg-rose-950 text-rose-300 text-[10px] px-2 py-1 rounded">クラブ削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右メイン */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">馬主・競走馬・騎手 コントロールセンター</h1>
            <p className="text-xs text-slate-400 mt-1">選択中馬主: <span className="text-yellow-400 font-bold">{currentOwner?.name || "未選択"}</span></p>
          </div>
          <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full font-mono">管理者 (0302)</span>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-bold">
          <button onClick={() => setAdminTab("horses")} className={`px-4 py-2 rounded-lg ${adminTab === "horses" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
            📋 競走馬データ詳細 ({activeHorses.length})
          </button>
          <button onClick={() => setAdminTab("jockey_approve")} className={`px-4 py-2 rounded-lg relative ${adminTab === "jockey_approve" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
            🏇 騎手申請の承認 ({pendingJockeyHorses.length})
            {pendingJockeyHorses.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center animate-bounce">{pendingJockeyHorses.length}</span>}
          </button>
          <button onClick={() => setAdminTab("add_horse")} className={`px-4 py-2 rounded-lg ${adminTab === "add_horse" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
            ➕ 競走馬を直接登録
          </button>
          <button onClick={() => setAdminTab("stallions")} className={`px-4 py-2 rounded-lg ${adminTab === "stallions" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
            🧬 種牡馬マスター ({stallions.length})
          </button>
          <button onClick={() => setAdminTab("ai_settings")} className={`px-4 py-2 rounded-lg ${adminTab === "ai_settings" ? "bg-emerald-600 text-white" : "bg-slate-900 text-slate-400"}`}>
            ⚙️ AI素質確率設定
          </button>
        </div>

        {/* 競走馬データ詳細 */}
        {adminTab === "horses" && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-md font-bold text-slate-200">📋 所有馬一覧</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">馬名</th>
                    <th className="p-3">主戦騎手 / テン乗り</th>
                    <th className="p-3">素質</th>
                    <th className="p-3">状態</th>
                    <th className="p-3">成績 / 賞金</th>
                    <th className="p-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeHorses.map((horse) => (
                    <tr key={horse.id}>
                      <td className="p-3 font-bold text-white">{horse.name}</td>
                      <td className="p-3">
                        <div className="text-yellow-400 font-bold">主: {horse.jockey || "未定"}</div>
                        {horse.temporary_jockey && <div className="text-blue-300 text-[10px]">テン: {horse.temporary_jockey}</div>}
                      </td>
                      <td className="p-3 font-mono font-bold text-yellow-400">{horse.ability_rank || "B"}</td>
                      <td className="p-3 font-bold text-emerald-400">{horse.status}</td>
                      <td className="p-3 font-mono">{horse.races_count}戦{horse.wins_count}勝 / ¥{(horse.prize_money || 0).toLocaleString()}</td>
                      <td className="p-3 flex gap-1">
                        <button onClick={() => startEditing(horse)} className="bg-slate-800 text-yellow-300 px-2 py-1 rounded text-[10px]">⚖️ 編集</button>
                        {horse.status === "育成放牧中" && <button onClick={() => handleCompleteTraining(horse)} className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px]">✨ 育成完了</button>}
                        {horse.gender === "牡" && <button onClick={() => handlePromoteToStallion(horse)} className="bg-yellow-600 text-slate-950 px-2 py-1 rounded text-[10px]">👑 種牡馬昇格</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 🏇 騎手承認タブ */}
        {adminTab === "jockey_approve" && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-md font-bold text-yellow-400">🏇 馬主からの騎手変更・決定申請一覧</h3>
            {pendingJockeyHorses.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">現在、承認待ちの騎手変更申請はありません。</p>
            ) : (
              <div className="space-y-3">
                {pendingJockeyHorses.map((h) => (
                  <div key={h.id} className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-white text-sm">{h.name}</div>
                      <div className="text-yellow-400">申請主戦騎手: {h.jockey}</div>
                      {h.temporary_jockey && <div className="text-blue-300">申請テン乗り騎手: {h.temporary_jockey}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleApproveJockey(h, true)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded shadow">
                        承認・確定
                      </button>
                      <button onClick={() => handleApproveJockey(h, false)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-3 py-2 rounded">
                        却下
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 競走馬直接登録 */}
        {adminTab === "add_horse" && (
          <form onSubmit={handleAddHorseDirect} className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4 max-w-2xl">
            <h3 className="text-md font-bold text-yellow-400">➕ 競走馬を直接登録</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input type="text" placeholder="馬名" value={newHorse.name} onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" required />
              <select value={newHorse.gender} onChange={(e) => setNewHorse({ ...newHorse, gender: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"><option value="牡">牡</option><option value="牝">牝</option></select>
              <input type="text" placeholder="主戦騎手" value={newHorse.jockey} onChange={(e) => setNewHorse({ ...newHorse, jockey: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            </div>
            <button type="submit" className="w-full bg-emerald-600 font-bold text-white py-2.5 rounded text-xs">登録保存</button>
          </form>
        )}

        {/* 種牡馬マスター */}
        {adminTab === "stallions" && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4 max-w-2xl">
            <h3 className="text-md font-bold text-emerald-400">🧬 種牡馬マスター管理</h3>
            <form onSubmit={handleAddStallion} className="grid grid-cols-3 gap-2 text-xs">
              <input type="text" placeholder="種牡馬名" value={newStallion.name} onChange={(e) => setNewStallion({ ...newStallion, name: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" required />
              <input type="number" placeholder="種付け料" value={newStallion.fee} onChange={(e) => setNewStallion({ ...newStallion, fee: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" required />
              <button type="submit" className="bg-emerald-600 font-bold text-white rounded px-3 py-2">追加</button>
            </form>
          </div>
        )}

        {/* AI確率 */}
        {adminTab === "ai_settings" && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4 max-w-xl">
            <h3 className="text-md font-bold text-amber-400">⚙️ AI素質確率手動設定</h3>
            <div className="grid grid-cols-5 gap-2 text-xs">
              {["SS", "S", "A", "B", "C"].map((r) => (
                <div key={r}>
                  <label className="text-slate-300 block mb-1 font-bold">{r}%</label>
                  <input type="number" value={(spawnRates as any)[r]} onChange={(e) => setSpawnRates({ ...spawnRates, [r]: Number(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-2 text-white text-center font-bold" />
                </div>
              ))}
            </div>
            <button onClick={handleSaveRates} className="bg-amber-600 font-bold text-slate-950 px-5 py-2 rounded text-xs">保存</button>
          </div>
        )}
      </div>

      {/* モーダル */}
      {editingHorseId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-md font-bold text-yellow-400">⚖️ 詳細データ・騎手編集</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">主戦騎手</label>
                <input type="text" value={editForm.jockey} onChange={(e) => setEditForm({ ...editForm, jockey: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">テン乗り騎手</label>
                <input type="text" value={editForm.temporary_jockey} onChange={(e) => setEditForm({ ...editForm, temporary_jockey: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleUpdateHorseStats} className="w-full bg-emerald-600 font-bold text-white py-2 rounded text-xs">保存</button>
              <button onClick={() => setEditingHorseId(null)} className="bg-slate-800 text-slate-400 px-3 py-2 rounded text-xs">キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}