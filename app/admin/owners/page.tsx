"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type HorseMaster = {
  id: string;
  name: string;
  status: string; // 'pending' または 'approved'
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
  status: string;
  prize_money: number;
  jockey: string;
};

export default function AdminOwnersPage() {
  const [pin, setPin] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const [owners, setOwners] = useState<HorseMaster[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [horses, setHorses] = useState<Horse[]>([]);

  // 馬の新規登録用フォーム
  const [newHorse, setNewHorse] = useState({
    name: "",
    gender: "牡",
    age: 3,
    color: "鹿毛",
    father: "",
    mother: "",
    prize_money: 0,
    jockey: "",
  });

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

  // ✅ 馬主の承認処理
  const handleApproveOwner = async (ownerId: string) => {
    const { error } = await supabase.from("horse_masters").update({ status: "approved" }).eq("id", ownerId);
    if (!error) {
      alert("馬主を承認しました！");
      fetchOwners();
    }
  };

  // ❌ 馬主の申請拒否・削除処理
  const handleDeleteOwner = async (ownerId: string) => {
    if (!confirm("本当に削除/拒否しますか？")) return;
    const { error } = await supabase.from("horse_masters").delete().eq("id", ownerId);
    if (!error) {
      alert("削除しました");
      fetchOwners();
    }
  };

  const handleAddHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorse.name || !selectedOwnerId) return;

    const { error } = await supabase.from("horses").insert([
      {
        ...newHorse,
        owner_id: selectedOwnerId,
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
        jockey: "",
      });
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
            <label className="block text-xs text-slate-400 mb-1">暗証番号 (PIN)</label>
            <input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 rounded-lg border border-slate-700 text-center text-2xl font-mono tracking-widest text-white focus:outline-none focus:border-emerald-500"
              maxLength={4}
              required
              autoFocus
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 font-bold py-3 rounded-lg hover:bg-emerald-500 transition shadow-lg">
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
      {/* 左サイドバー：馬主一覧＆承認エリア */}
      <div className="w-full md:w-80 bg-slate-950 p-4 border-r border-slate-800 space-y-6">
        {/* 🟡 承認待ち申請 */}
        {pendingOwners.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-600/50 p-3 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1">
              <span>⏳ 承認待ちの新規登録 ({pendingOwners.length}件)</span>
            </h3>
            <div className="space-y-2">
              {pendingOwners.map((owner) => (
                <div key={owner.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{owner.name}</div>
                    <div className="text-slate-500">Pass: {owner.passcode}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleApproveOwner(owner.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded">
                      承認
                    </button>
                    <button onClick={() => handleDeleteOwner(owner.id)} className="bg-rose-900 hover:bg-rose-800 text-rose-200 px-2 py-1 rounded">
                      拒否
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🟢 承認済み馬主一覧 */}
        <div>
          <h2 className="text-lg font-bold text-yellow-400 mb-3 px-1">🏇 馬主一覧（承認済み）</h2>
          <div className="space-y-1">
            {approvedOwners.map((owner) => (
              <button
                key={owner.id}
                onClick={() => setSelectedOwnerId(owner.id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg font-medium text-sm transition flex justify-between items-center ${
                  selectedOwnerId === owner.id ? "bg-emerald-800 text-white shadow" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <span>{owner.name}</span>
                <span className="text-xs text-slate-400">Pass: {owner.passcode}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h1 className="text-2xl font-bold text-emerald-400">馬主・競走馬管理ダッシュボード</h1>
          <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full">
            管理者認証中 (0302)
          </span>
        </div>

        {/* 馬追加フォーム */}
        <form onSubmit={handleAddHorse} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
          <h3 className="text-md font-bold text-slate-200">➕ 選択中馬主の競走馬を登録</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="馬名"
              value={newHorse.name}
              onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
              required
            />
            <select
              value={newHorse.gender}
              onChange={(e) => setNewHorse({ ...newHorse, gender: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            >
              <option value="牡">牡</option>
              <option value="牝">牝</option>
              <option value="セン">セン</option>
            </select>
            <input
              type="number"
              placeholder="年齢"
              value={newHorse.age}
              onChange={(e) => setNewHorse({ ...newHorse, age: Number(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="毛色"
              value={newHorse.color}
              onChange={(e) => setNewHorse({ ...newHorse, color: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="父馬"
              value={newHorse.father}
              onChange={(e) => setNewHorse({ ...newHorse, father: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="母馬"
              value={newHorse.mother}
              onChange={(e) => setNewHorse({ ...newHorse, mother: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              placeholder="主戦騎手"
              value={newHorse.jockey}
              onChange={(e) => setNewHorse({ ...newHorse, jockey: e.target.value })}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <button type="submit" className="bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded px-4 py-2 text-sm transition">
              馬を登録する
            </button>
          </div>
        </form>

        {/* 馬一覧 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h3 className="text-md font-bold text-slate-200 mb-4">📋 所属馬一覧</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="text-xs bg-slate-950 text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2">馬名</th>
                  <th className="px-2 py-2">性/年齢</th>
                  <th className="px-3 py-2">血統 (父 / 母)</th>
                  <th className="px-3 py-2">獲得賞金</th>
                  <th className="px-3 py-2">主戦騎手</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.id} className="border-b border-slate-700">
                    <td className="px-3 py-3 font-bold text-white">{horse.name}</td>
                    <td className="px-2 py-3">{horse.gender}{horse.age}</td>
                    <td className="px-3 py-3 text-xs">{horse.father} × {horse.mother}</td>
                    <td className="px-3 py-3 text-yellow-400">¥{horse.prize_money.toLocaleString()}</td>
                    <td className="px-3 py-3">{horse.jockey}</td>
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