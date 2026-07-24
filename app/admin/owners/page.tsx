"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HorseMaster = {
  id: string;
  name: string;
  status: string;
  passcode: string;
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
  status: string; // '現役', '放牧', '引退', '引退申請中'
  prize_money: number;
  races_count: number;
  wins_count: number;
  jockey: string;
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

  // 新規馬登録用
  const [newHorse, setNewHorse] = useState({
    name: "",
    gender: "牡",
    age: 3,
    color: "鹿毛",
    father: "",
    mother: "",
    prize_money: 0,
    races_count: 0,
    wins_count: 0,
    jockey: "",
  });

  // 戦績・賞金編集用
  const [editingHorseId, setEditingHorseId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ prize_money: 0, races_count: 0, wins_count: 0 });

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "0302") {
      setIsAdminAuthenticated(true);
    } else {
      alert("暗証番号が違います！（管理者専用）");
      setPin("");
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchOwners();
      fetchRaceEntries();
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
    const { data } = await supabase
      .from("horses")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (data) setHorses(data);
  };

  const fetchRaceEntries = async () => {
    const { data } = await supabase
      .from("race_entries")
      .select("*, horses(name, jockey), horse_masters(name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) setRaceEntries(data as any);
  };

  const handleApproveOwner = async (ownerId: string) => {
    const { error } = await supabase.from("horse_masters").update({ status: "approved" }).eq("id", ownerId);
    if (!error) {
      alert("馬主を承認しました！");
      fetchOwners();
    }
  };

  // 🏢 馬主（クラブ）の削除機能
  const handleDeleteOwner = async (ownerId: string, ownerName: string) => {
    if (!confirm(`本当にかの馬主・クラブ「${ownerName}」を削除しますか？所属馬も削除されます。`)) return;
    const { error } = await supabase.from("horse_masters").delete().eq("id", ownerId);
    if (!error) {
      alert("馬主・クラブを削除しました");
      if (selectedOwnerId === ownerId) setSelectedOwnerId("");
      fetchOwners();
    }
  };

  // 🏁 出走申請の承認 ＆ 馬柱テーブル（race_horses）へ自動登録！
  const handleApproveRace = async (entry: RaceEntry, status: "approved" | "rejected") => {
    const { error } = await supabase.from("race_entries").update({ status }).eq("id", entry.id);
    if (error) {
      alert("エラー: " + error.message);
      return;
    }

    if (status === "approved") {
      const { error: insertError } = await supabase.from("race_horses").insert([
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

      if (insertError) {
        alert("出走承認されましたが馬柱への自動登録に失敗しました: " + insertError.message);
      } else {
        alert("出走を確定し、レース馬柱に自動登録しました！");
      }
    } else {
      alert("出走申請を却下しました");
    }

    fetchRaceEntries();
  };

  // 🐴 馬のステータス変更（現役 / 放牧 / 引退）
  const handleUpdateHorseStatus = async (horse: Horse, newStatus: string) => {
    const { error } = await supabase.from("horses").update({ status: newStatus }).eq("id", horse.id);
    if (error) {
      alert("ステータス変更失敗: " + error.message);
      return;
    }

    // 🔴 引退になった場合、自動的にレース出走表（race_horses）から馬の名前を完全削除！
    if (newStatus === "引退") {
      await supabase.from("race_horses").delete().eq("horse_id", horse.id);
      alert(`「${horse.name}」を引退処理しました。レース馬柱から自動的に削除されました。`);
    } else {
      alert(`「${horse.name}」のステータスを【${newStatus}】に変更しました。`);
    }

    fetchHorses(selectedOwnerId);
  };

  // 🗑️ 引退馬の完全削除
  const handleDeleteHorsePermanently = async (horseId: string, horseName: string) => {
    if (!confirm(`引退馬「${horseName}」のデータを完全に削除しますか？`)) return;
    const { error } = await supabase.from("horses").delete().eq("id", horseId);
    if (!error) {
      alert("完全削除しました");
      fetchHorses(selectedOwnerId);
    }
  };

  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorse.name || !selectedOwnerId) return;

    const { error } = await supabase.from("horses").insert([
      {
        ...newHorse,
        owner_id: selectedOwnerId,
        status: "現役",
      },
    ]);

    if (error) {
      alert("登録失敗: " + error.message);
    } else {
      alert("競走馬を登録しました！");
      setNewHorse({
        name: "",
        gender: "牡",
        age: 3,
        color: "鹿毛",
        father: "",
        mother: "",
        prize_money: 0,
        races_count: 0,
        wins_count: 0,
        jockey: "",
      });
      fetchHorses(selectedOwnerId);
    }
  };

  const startEditing = (horse: Horse) => {
    setEditingHorseId(horse.id);
    setEditForm({
      prize_money: horse.prize_money || 0,
      races_count: horse.races_count || 0,
      wins_count: horse.wins_count || 0,
    });
  };

  const handleUpdateHorseStats = async () => {
    if (!editingHorseId) return;
    const { error } = await supabase
      .from("horses")
      .update({
        prize_money: Number(editForm.prize_money),
        races_count: Number(editForm.races_count),
        wins_count: Number(editForm.wins_count),
      })
      .eq("id", editingHorseId);

    if (error) {
      alert("更新エラー: " + error.message);
    } else {
      alert("戦績・賞金を更新しました！");
      setEditingHorseId(null);
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

  const activeHorses = horses.filter((h) => h.status !== "引退");
  const retiredHorses = horses.filter((h) => h.status === "引退");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー：馬主・クラブ一覧 */}
      <div className="w-full md:w-80 bg-slate-950 p-4 border-r border-slate-800 space-y-6">
        {pendingOwners.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-600/50 p-3 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-amber-400">⏳ 承認待ちの馬主 ({pendingOwners.length}件)</h3>
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
                  <div className="text-slate-400">馬主: {entry.horse_masters?.name}</div>
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => handleApproveRace(entry, "approved")} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded">出走確定</button>
                    <button onClick={() => handleApproveRace(entry, "rejected")} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded">却下</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 承認済み馬主・クラブ一覧（削除ボタン付き） */}
        <div>
          <h2 className="text-sm font-bold text-yellow-400 mb-3 px-1">🏇 馬主・クラブ一覧</h2>
          <div className="space-y-1.5">
            {approvedOwners.map((owner) => (
              <div
                key={owner.id}
                className={`p-2.5 rounded-lg text-xs transition flex justify-between items-center ${
                  selectedOwnerId === owner.id ? "bg-emerald-800 text-white shadow" : "bg-slate-900 hover:bg-slate-800 text-slate-300"
                }`}
              >
                <button
                  onClick={() => setSelectedOwnerId(owner.id)}
                  className="flex-1 text-left font-bold"
                >
                  <div>{owner.name}</div>
                  <div className="text-[10px] text-slate-400 font-normal">Pass: {owner.passcode}</div>
                </button>
                <button
                  onClick={() => handleDeleteOwner(owner.id, owner.name)}
                  className="bg-rose-950/80 hover:bg-rose-800 text-rose-300 border border-rose-700/50 text-[10px] px-2 py-1 rounded ml-2"
                  title="クラブ削除"
                >
                  クラブ削除
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h1 className="text-xl font-bold text-emerald-400">馬主・競走馬管理ダッシュボード</h1>
          <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full">
            管理者 (0302)
          </span>
        </div>

        {/* 馬追加フォーム */}
        <form onSubmit={handleAddHorse} className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
          <h3 className="text-sm font-bold text-slate-200">➕ 競走馬を新規登録</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <input type="text" placeholder="馬名" value={newHorse.name} onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white" required />
            <select value={newHorse.gender} onChange={(e) => setNewHorse({ ...newHorse, gender: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white">
              <option value="牡">牡</option>
              <option value="牝">牝</option>
              <option value="セン">セン</option>
            </select>
            <input type="number" placeholder="年齢" value={newHorse.age} onChange={(e) => setNewHorse({ ...newHorse, age: Number(e.target.value) })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white" />
            <input type="text" placeholder="毛色" value={newHorse.color} onChange={(e) => setNewHorse({ ...newHorse, color: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white" />
            <input type="text" placeholder="父馬" value={newHorse.father} onChange={(e) => setNewHorse({ ...newHorse, father: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white" />
            <input type="text" placeholder="母馬" value={newHorse.mother} onChange={(e) => setNewHorse({ ...newHorse, mother: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white" />
            <input type="text" placeholder="主戦騎手" value={newHorse.jockey} onChange={(e) => setNewHorse({ ...newHorse, jockey: e.target.value })} className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white" />
            <button type="submit" className="bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded px-3 py-1.5 transition">登録</button>
          </div>
        </form>

        {/* 所属馬一覧（現役・放牧・自主引退申請中） */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
          <h3 className="text-md font-bold text-slate-200">📋 所属競走馬一覧（現役・放牧）</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">馬名</th>
                  <th className="px-2 py-2">性齢</th>
                  <th className="px-3 py-2">状態 (変更)</th>
                  <th className="px-3 py-2">通算成績</th>
                  <th className="px-3 py-2">獲得賞金</th>
                  <th className="px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {activeHorses.map((horse) => (
                  <tr key={horse.id} className="border-b border-slate-700">
                    <td className="px-3 py-3 font-bold text-white">
                      {horse.name}
                      {horse.status === "引退申請中" && (
                        <span className="ml-2 bg-rose-900 text-rose-300 border border-rose-600 text-[10px] px-1.5 py-0.5 rounded font-bold animate-pulse">
                          ⚠️ 馬主が引退申請中
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3">{horse.gender}{horse.age}</td>
                    <td className="px-3 py-3">
                      <select
                        value={horse.status}
                        onChange={(e) => handleUpdateHorseStatus(horse, e.target.value)}
                        className={`border rounded px-2 py-1 font-bold text-xs ${
                          horse.status === "現役" ? "bg-emerald-950 border-emerald-600 text-emerald-300" :
                          horse.status === "放牧" ? "bg-blue-950 border-blue-600 text-blue-300" :
                          "bg-rose-950 border-rose-600 text-rose-300"
                        }`}
                      >
                        <option value="現役">🟢 現役</option>
                        <option value="放牧">🌿 放牧</option>
                        <option value="引退">🛑 引退（出走表から削除）</option>
                      </select>
                    </td>
                    <td className="px-3 py-3 text-emerald-400 font-bold">
                      {horse.races_count || 0}戦{horse.wins_count || 0}勝
                    </td>
                    <td className="px-3 py-3 text-yellow-400 font-bold">
                      ¥{(horse.prize_money || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => startEditing(horse)}
                        className="bg-slate-700 hover:bg-slate-600 text-yellow-300 px-2.5 py-1 rounded font-bold"
                      >
                        ✏️ 賞金/成績
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 📜 引退馬アーカイブ・リスト */}
        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
          <h3 className="text-md font-bold text-slate-400 flex items-center gap-2">
            <span>📜 引退馬リスト（自動出走削除済みアーカイブ）</span>
          </h3>
          {retiredHorses.length === 0 ? (
            <p className="text-xs text-slate-500">現在、引退馬の記録はありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-400">
                <thead className="bg-slate-900 text-slate-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">殿堂/引退馬名</th>
                    <th className="px-2 py-2">性齢</th>
                    <th className="px-3 py-2">生涯成績</th>
                    <th className="px-3 py-2">総獲得賞金</th>
                    <th className="px-3 py-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {retiredHorses.map((horse) => (
                    <tr key={horse.id} className="border-b border-slate-800">
                      <td className="px-3 py-2.5 font-bold text-slate-300">{horse.name} (引退)</td>
                      <td className="px-2 py-2.5">{horse.gender}{horse.age}</td>
                      <td className="px-3 py-2.5 text-slate-400">{horse.races_count || 0}戦{horse.wins_count || 0}勝</td>
                      <td className="px-3 py-2.5 text-yellow-500">¥{(horse.prize_money || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleDeleteHorsePermanently(horse.id, horse.name)}
                          className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded text-[10px]"
                        >
                          完全削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 賞金・戦績変更モーダル */}
      {editingHorseId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-sm w-full space-y-4">
            <h3 className="text-md font-bold text-yellow-400">✏️ 賞金 ＆ 戦績の編集</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">獲得賞金 (円)</label>
                <input
                  type="number"
                  value={editForm.prize_money}
                  onChange={(e) => setEditForm({ ...editForm, prize_money: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">出走数 (戦)</label>
                  <input
                    type="number"
                    value={editForm.races_count}
                    onChange={(e) => setEditForm({ ...editForm, races_count: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">勝利数 (勝)</label>
                  <input
                    type="number"
                    value={editForm.wins_count}
                    onChange={(e) => setEditForm({ ...editForm, wins_count: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleUpdateHorseStats} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white py-2 rounded text-xs">
                保存する
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