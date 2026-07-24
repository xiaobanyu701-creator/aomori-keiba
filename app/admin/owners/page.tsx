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

  // 種牡馬追加フォーム
  const [newStallion, setNewStallion] = useState({ name: "", fee: 3000000, rank_bonus: 10 });

  // 編集用ステート
  const [editingHorseId, setEditingHorseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    prize_money: 0,
    races_count: 0,
    wins_count: 0,
    ability_rank: "B",
    ai_comment: "",
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
    }
  }, [isAdminAuthenticated]);

  const fetchOwners = async () => {
    const { data } = await supabase.from("horse_masters").select("*").order("created_at", { ascending: false });
    if (data) {
      setOwners(data);
      const approved = data.filter((o) => o.status === "approved");
      if (approved.length > 0 && !selectedOwnerId) {
        setSelectedOwnerId(approved[0].id);
      }
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

  // 出走確定＆馬柱へ自動追加
  const handleApproveRace = async (entry: RaceEntry, status: "approved" | "rejected") => {
    const { error } = await supabase.from("race_entries").update({ status }).eq("id", entry.id);
    if (error) return;

    if (status === "approved") {
      await supabase.from("race_horses").insert([
        {
          race_name: entry.race_name,
          horse_id: entry.horse_id,
          horse_name: entry.horses?.name || "出走馬",
          owner_name: entry.horse_masters?.name || "馬主",
          jockey: entry.horses?.jockey || "未定",
          frame_number: 1,
          horse_number: 1,
          popularity: 1,
          odds: 2.0,
        }
      ]);
      alert("出走を確定し、馬柱へ自動登録しました！");
    } else {
      alert("出走申請を却下しました");
    }
    fetchRaceEntries();
  };

  // 馬のステータス変更
  const handleUpdateHorseStatus = async (horse: Horse, newStatus: string) => {
    const { error } = await supabase.from("horses").update({ status: newStatus }).eq("id", horse.id);
    if (!error && newStatus === "引退") {
      await supabase.from("race_horses").delete().eq("horse_id", horse.id);
      alert(`「${horse.name}」を引退処理し、出走表から自動削除しました。`);
    }
    fetchHorses(selectedOwnerId);
  };

  // 種牡馬追加
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

  // 能力・AIコメントの手動調整保存
  const startEditing = (horse: Horse) => {
    setEditingHorseId(horse.id);
    setEditForm({
      prize_money: horse.prize_money || 0,
      races_count: horse.races_count || 0,
      wins_count: horse.wins_count || 0,
      ability_rank: horse.ability_rank || "B",
      ai_comment: horse.ai_comment || "",
    });
  };

  const handleUpdateHorseStats = async () => {
    if (!editingHorseId) return;

    // ⚖️ ランク手動変更時に自動でAIコメントを更新生成
    let comment = editForm.ai_comment;
    if (editForm.ability_rank === "SS") comment = "「…手動調整による超大物覚醒！クラシックどころか世界を制覇する能力が覚醒しました！」";
    else if (editForm.ability_rank === "S") comment = "「素晴らしい動きです！能力調整により重賞・G1級のバネが備わりました！」";
    else if (editForm.ability_rank === "A") comment = "「非常に順調です。上位クラスで十分に勝ち負けできる手応えです。」";

    const { error } = await supabase.from("horses").update({
      prize_money: Number(editForm.prize_money),
      races_count: Number(editForm.races_count),
      wins_count: Number(editForm.wins_count),
      ability_rank: editForm.ability_rank,
      ai_comment: comment,
    }).eq("id", editingHorseId);

    if (!error) {
      alert("戦績・素質ランク・AIコメントを更新しました！");
      setEditingHorseId(null);
      fetchHorses(selectedOwnerId);
    }
  };

  // 所持金の手動調整
  const handleUpdateOwnerBalance = async (owner: HorseMaster) => {
    const input = prompt(`「${owner.name}」の新しい所持金（円）を入力してください:`, owner.balance?.toString() || "10000000");
    if (input === null) return;
    const newBal = Number(input);
    if (isNaN(newBal)) return;

    const { error } = await supabase.from("horse_masters").update({ balance: newBal }).eq("id", owner.id);
    if (!error) {
      alert("所持金を変更しました！");
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
            <p className="text-xs text-slate-400 mt-1">馬主管理コントロールセンター</p>
          </div>
          <div>
            <input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 text-center text-2xl font-mono text-white focus:outline-none focus:border-emerald-500"
              maxLength={4}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 font-bold py-3 rounded-lg hover:bg-emerald-500 transition">
            認証してログイン
          </button>
        </form>
      </div>
    );
  }

  const pendingOwners = owners.filter((o) => o.status === "pending");
  const approvedOwners = owners.filter((o) => o.status === "approved");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー */}
      <div className="w-full md:w-80 bg-slate-950 p-4 border-r border-slate-800 space-y-6">
        {pendingOwners.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-600/50 p-3 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400">⏳ 承認待ち馬主 ({pendingOwners.length}件)</h3>
            <div className="space-y-2">
              {pendingOwners.map((owner) => (
                <div key={owner.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{owner.name}</div>
                    <div className="text-slate-500">Pass: {owner.passcode}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleApproveOwner(owner.id)} className="bg-emerald-600 text-white font-bold px-2 py-1 rounded">承認</button>
                    <button onClick={() => handleDeleteOwner(owner.id, owner.name)} className="bg-rose-900 text-rose-200 px-2 py-1 rounded">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 出走申請リスト */}
        {raceEntries.length > 0 && (
          <div className="bg-blue-950/40 border border-blue-600/50 p-3 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-blue-400">🏁 出走申請中 ({raceEntries.length}件)</h3>
            <div className="space-y-2">
              {raceEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
                  <div className="font-bold text-white">{entry.horses?.name || "馬"}</div>
                  <div className="text-blue-300">出走希望: {entry.race_name}</div>
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => handleApproveRace(entry, "approved")} className="w-full bg-blue-600 text-white font-bold py-1 rounded">確定</button>
                    <button onClick={() => handleApproveRace(entry, "rejected")} className="bg-slate-800 text-slate-300 px-2 py-1 rounded">却下</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 馬主一覧 ＆ 所持金変更 */}
        <div>
          <h2 className="text-sm font-bold text-yellow-400 mb-3 px-1">🏇 馬主一覧（所持金手動変更）</h2>
          <div className="space-y-1.5">
            {approvedOwners.map((owner) => (
              <div
                key={owner.id}
                className={`p-2.5 rounded-lg text-xs flex justify-between items-center ${
                  selectedOwnerId === owner.id ? "bg-emerald-800 text-white shadow" : "bg-slate-900 text-slate-300"
                }`}
              >
                <button onClick={() => setSelectedOwnerId(owner.id)} className="flex-1 text-left font-bold">
                  <div>{owner.name}</div>
                  <div className="text-yellow-400 text-[10px]">¥{(owner.balance || 0).toLocaleString()}</div>
                </button>
                <button onClick={() => handleUpdateOwnerBalance(owner)} className="bg-slate-800 hover:bg-slate-700 text-yellow-300 text-[10px] px-2 py-1 rounded border border-slate-700 ml-1">
                  💰 残高変更
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h1 className="text-xl font-bold text-emerald-400">馬主・競走馬・生産 コントロールセンター</h1>
          <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full">
            管理者 (0302)
          </span>
        </div>

        {/* 🧬 種牡馬の追加・管理 */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
          <h3 className="text-sm font-bold text-emerald-400">🧬 種牡馬マスターの追加・管理</h3>
          <form onSubmit={handleAddStallion} className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              placeholder="種牡馬名"
              value={newStallion.name}
              onChange={(e) => setNewStallion({ ...newStallion, name: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              required
            />
            <input
              type="number"
              placeholder="種付け料 (円)"
              value={newStallion.fee}
              onChange={(e) => setNewStallion({ ...newStallion, fee: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              required
            />
            <input
              type="number"
              placeholder="素質ボーナス (%)"
              value={newStallion.rank_bonus}
              onChange={(e) => setNewStallion({ ...newStallion, rank_bonus: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
            <button type="submit" className="bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded px-3 py-1.5">
              種牡馬を追加
            </button>
          </form>
        </div>

        {/* 所属馬一覧（手動能力調整ボタン付き） */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-md font-bold text-slate-200">📋 競走馬一覧（素質ランク手動変更 ＆ AIコメント同期）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">馬名</th>
                  <th className="px-2 py-2">性齢</th>
                  <th className="px-3 py-2">素質ランク</th>
                  <th className="px-3 py-2">状態</th>
                  <th className="px-3 py-2">通算成績</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.id} className="border-b border-slate-700">
                    <td className="px-3 py-3 font-bold text-white">{horse.name}</td>
                    <td className="px-2 py-3">{horse.gender}{horse.age}</td>
                    <td className="px-3 py-3">
                      <span className="bg-yellow-950 text-yellow-300 font-bold px-2 py-0.5 rounded font-mono">
                        {horse.ability_rank || "B"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={horse.status}
                        onChange={(e) => handleUpdateHorseStatus(horse, e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                      >
                        <option value="現役">現役</option>
                        <option value="放牧">放牧</option>
                        <option value="引退">引退</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-emerald-400 font-bold">{horse.races_count || 0}戦{horse.wins_count || 0}勝</td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => startEditing(horse)}
                        className="bg-slate-700 hover:bg-slate-600 text-yellow-300 px-2.5 py-1 rounded font-bold"
                      >
                        ⚖️ 素質/賞金変更
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 素質・賞金手動変更モーダル */}
      {editingHorseId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full space-y-4">
            <h3 className="text-md font-bold text-yellow-400">⚖️ 平等調整（素質ランク ＆ 賞金）</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">潜在能力（素質ランク）手動設定</label>
                <select
                  value={editForm.ability_rank}
                  onChange={(e) => setEditForm({ ...editForm, ability_rank: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-bold"
                >
                  <option value="SS">🌟 SSランク（超大物・世界級）</option>
                  <option value="S">🔥 Sランク（重賞・G1級）</option>
                  <option value="A">✨ Aランク（オープン・勝ち上がり）</option>
                  <option value="B">🐎 Bランク（条件馬）</option>
                  <option value="C">💤 Cランク（試練型）</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">獲得賞金 (円)</label>
                <input
                  type="number"
                  value={editForm.prize_money}
                  onChange={(e) => setEditForm({ ...editForm, prize_money: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleUpdateHorseStats} className="w-full bg-emerald-600 font-bold text-white py-2 rounded text-xs">
                保存（AIコメントも自動同期）
              </button>
              <button onClick={() => setEditingHorseId(null)} className="bg-slate-800 text-slate-400 px-3 py-2 rounded text-xs">
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}