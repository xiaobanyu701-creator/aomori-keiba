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

  // 管理者直接馬追加フォーム
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
    jockey: "未定",
    ability_rank: "A",
  });

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
    jockey: "",
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
    if (!confirm(`本当に馬主「${ownerName}」を削除しますか？所属馬も全て消去されます。`)) return;
    const { error } = await supabase.from("horse_masters").delete().eq("id", ownerId);
    if (!error) {
      alert("馬主・クラブを削除しました");
      fetchOwners();
    }
  };

  // 出走確定 ＆ 馬柱へ自動追加
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
      alert("出走を確定し、レース馬柱に自動連動登録しました！");
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

  // 種牡馬削除
  const handleDeleteStallion = async (id: string, name: string) => {
    if (!confirm(`種牡馬「${name}」を削除しますか？`)) return;
    const { error } = await supabase.from("stallions").delete().eq("id", id);
    if (!error) fetchStallions();
  };

  // 馬を新規追加
  const handleAddHorseDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHorse.name || !selectedOwnerId) return;

    let comment = "管理者登録された期待の競走馬です！";
    if (newHorse.ability_rank === "SS") comment = "「…凄まじいオーラを感じます！世界を狙える逸材ですよ！」";
    else if (newHorse.ability_rank === "S") comment = "「これは素晴らしい出来です！重賞・G1戦線で大暴れしてくれるでしょう！」";

    const { error } = await supabase.from("horses").insert([
      {
        ...newHorse,
        owner_id: selectedOwnerId,
        status: "現役",
        ai_comment: comment,
      }
    ]);

    if (!error) {
      alert(`競走馬「${newHorse.name}」を追加しました！`);
      setNewHorse({
        name: "",
        gender: "牡",
        age: 3,
        color: "鹿毛",
        father: "ディープインパクト",
        mother: "自家製牝馬",
        prize_money: 0,
        races_count: 0,
        wins_count: 0,
        jockey: "未定",
        ability_rank: "A",
      });
      fetchHorses(selectedOwnerId);
    }
  };

  // 素質・戦績・AIコメントの手動調整保存
  const startEditing = (horse: Horse) => {
    setEditingHorseId(horse.id);
    setEditForm({
      prize_money: horse.prize_money || 0,
      races_count: horse.races_count || 0,
      wins_count: horse.wins_count || 0,
      ability_rank: horse.ability_rank || "B",
      ai_comment: horse.ai_comment || "",
      jockey: horse.jockey || "未定",
    });
  };

  const handleUpdateHorseStats = async () => {
    if (!editingHorseId) return;

    let comment = editForm.ai_comment;
    if (editForm.ability_rank === "SS") comment = "「…手動調整による超大物覚醒！クラシックどころか世界を制覇する能力が覚醒しました！」";
    else if (editForm.ability_rank === "S") comment = "「素晴らしい動きです！能力調整により重賞・G1級のバネが備わりました！」";
    else if (editForm.ability_rank === "A") comment = "「非常に順調です。上位クラスで十分に勝ち負けできる手応えです。」";

    const { error } = await supabase.from("horses").update({
      prize_money: Number(editForm.prize_money),
      races_count: Number(editForm.races_count),
      wins_count: Number(editForm.wins_count),
      ability_rank: editForm.ability_rank,
      jockey: editForm.jockey,
      ai_comment: comment,
    }).eq("id", editingHorseId);

    if (!error) {
      alert("競走馬の詳細データを更新しました！");
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
  const currentOwner = owners.find((o) => o.id === selectedOwnerId);

  const activeHorses = horses.filter((h) => h.status !== "引退");
  const retiredHorses = horses.filter((h) => h.status === "引退");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー：馬主・申請管理 */}
      <div className="w-full md:w-80 bg-slate-900/90 p-4 border-r border-slate-800 space-y-6 shrink-0">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold text-yellow-400">🏇 登録馬主一覧</h2>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{approvedOwners.length}名</span>
        </div>

        {/* 承認待ち馬主 */}
        {pendingOwners.length > 0 && (
          <div className="bg-amber-950/50 border border-amber-600/60 p-3 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-amber-400">⏳ 承認待ちの新規申請 ({pendingOwners.length}件)</h3>
            <div className="space-y-2">
              {pendingOwners.map((owner) => (
                <div key={owner.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{owner.name}</div>
                    <div className="text-[10px] text-slate-500">Pass: {owner.passcode}</div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleApproveOwner(owner.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2 py-1 rounded text-[11px]">承認</button>
                    <button onClick={() => handleDeleteOwner(owner.id, owner.name)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 px-2 py-1 rounded text-[11px]">拒否</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* レース出走申請リスト */}
        {raceEntries.length > 0 && (
          <div className="bg-blue-950/50 border border-blue-600/60 p-3 rounded-xl space-y-2">
            <h3 className="text-xs font-bold text-blue-400">🏁 レース出走申請中 ({raceEntries.length}件)</h3>
            <div className="space-y-2">
              {raceEntries.map((entry) => (
                <div key={entry.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 text-xs">
                  <div className="font-bold text-white">{entry.horses?.name || "馬"}</div>
                  <div className="text-blue-300 text-[11px]">希望: {entry.race_name}</div>
                  <div className="text-slate-400 text-[10px]">馬主: {entry.horse_masters?.name}</div>
                  <div className="flex gap-1 pt-1">
                    <button onClick={() => handleApproveRace(entry, "approved")} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 rounded text-[11px]">出走確定＆自動連動</button>
                    <button onClick={() => handleApproveRace(entry, "rejected")} className="bg-slate-800 text-slate-300 px-2 py-1 rounded text-[11px]">却下</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 承認済み馬主・クラブ一覧 */}
        <div className="space-y-2">
          {approvedOwners.map((owner) => (
            <div
              key={owner.id}
              className={`p-3 rounded-xl text-xs transition border flex justify-between items-center ${
                selectedOwnerId === owner.id ? "bg-emerald-950/80 border-emerald-500 text-white shadow-lg" : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850"
              }`}
            >
              <button onClick={() => setSelectedOwnerId(owner.id)} className="flex-1 text-left font-bold space-y-1">
                <div className="text-sm text-white">{owner.name}</div>
                <div className="text-yellow-400 font-mono font-bold">残高: ¥{(owner.balance || 0).toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-normal">Pass: {owner.passcode}</div>
              </button>
              <div className="flex flex-col gap-1 pl-2">
                <button onClick={() => handleUpdateOwnerBalance(owner)} className="bg-slate-800 hover:bg-slate-700 text-yellow-300 text-[10px] px-2 py-1 rounded border border-slate-700">
                  💰 残高変更
                </button>
                <button onClick={() => handleDeleteOwner(owner.id, owner.name)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 text-[10px] px-2 py-1 rounded border border-rose-900/50">
                  クラブ削除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右メインエリア */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">馬主・競走馬 コントロールセンター</h1>
            <p className="text-xs text-slate-400 mt-1">選択中馬主: <span className="text-yellow-400 font-bold text-sm">{currentOwner?.name || "未選択"}</span> (残高: ¥{(currentOwner?.balance || 0).toLocaleString()})</p>
          </div>
          <span className="text-xs bg-emerald-900/50 text-emerald-300 border border-emerald-700 px-3 py-1 rounded-full font-mono">
            管理者認証中 (0302)
          </span>
        </div>

        {/* 1️⃣ 選択馬主へ直接馬を追加するフォーム */}
        <form onSubmit={handleAddHorseDirect} className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3 shadow-lg">
          <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
            <span>➕ 「{currentOwner?.name}」へ新規競走馬を直接登録</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <input type="text" placeholder="馬名" value={newHorse.name} onChange={(e) => setNewHorse({ ...newHorse, name: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" required />
            <select value={newHorse.gender} onChange={(e) => setNewHorse({ ...newHorse, gender: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white">
              <option value="牡">牡</option>
              <option value="牝">牝</option>
              <option value="セン">セン</option>
            </select>
            <input type="number" placeholder="年齢" value={newHorse.age} onChange={(e) => setNewHorse({ ...newHorse, age: Number(e.target.value) })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            <input type="text" placeholder="毛色 (例: 鹿毛)" value={newHorse.color} onChange={(e) => setNewHorse({ ...newHorse, color: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            <input type="text" placeholder="父馬" value={newHorse.father} onChange={(e) => setNewHorse({ ...newHorse, father: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            <input type="text" placeholder="母馬" value={newHorse.mother} onChange={(e) => setNewHorse({ ...newHorse, mother: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            <input type="text" placeholder="主戦騎手" value={newHorse.jockey} onChange={(e) => setNewHorse({ ...newHorse, jockey: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white" />
            <select value={newHorse.ability_rank} onChange={(e) => setNewHorse({ ...newHorse, ability_rank: e.target.value })} className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-yellow-400 font-bold">
              <option value="SS">SSランク（超大物）</option>
              <option value="S">Sランク（重賞級）</option>
              <option value="A">Aランク（オープン）</option>
              <option value="B">Bランク（条件馬）</option>
              <option value="C">Cランク（試練型）</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded py-2 text-xs transition">
            競走馬を登録追加する
          </button>
        </form>

        {/* 2️⃣ 所属馬一覧（詳細情報カード＆テーブル表示） */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 shadow-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-bold text-slate-200">📋 所属競走馬 一覧・詳細データ</h3>
            <span className="text-xs text-slate-400">現役: {activeHorses.length}頭 / 引退: {retiredHorses.length}頭</span>
          </div>

          {activeHorses.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">現在、現役の所属馬はいません。上のフォームから登録できます。</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300 border-collapse">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">馬名 / 血統</th>
                    <th className="p-3">性齢 / 毛色</th>
                    <th className="p-3">主戦騎手</th>
                    <th className="p-3">素質ランク</th>
                    <th className="p-3">状態 (操作)</th>
                    <th className="p-3">通算成績</th>
                    <th className="p-3">獲得賞金</th>
                    <th className="p-3">AIコメント / 操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activeHorses.map((horse) => (
                    <tr key={horse.id} className="hover:bg-slate-850/50 transition">
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{horse.name}</div>
                        <div className="text-[10px] text-slate-400">父: {horse.father} × 母: {horse.mother}</div>
                      </td>
                      <td className="p-3">
                        <div>{horse.gender}{horse.age}歳</div>
                        <div className="text-[10px] text-slate-500">{horse.color}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-200">{horse.jockey || "未定"}</td>
                      <td className="p-3">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          horse.ability_rank === "SS" ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20" :
                          horse.ability_rank === "S" ? "bg-yellow-950 text-yellow-300 border border-yellow-700" :
                          horse.ability_rank === "A" ? "bg-emerald-950 text-emerald-300 border border-emerald-700" :
                          "bg-slate-800 text-slate-300"
                        }`}>
                          {horse.ability_rank || "B"}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          value={horse.status}
                          onChange={(e) => handleUpdateHorseStatus(horse, e.target.value)}
                          className={`border rounded px-2 py-1 font-bold text-[11px] ${
                            horse.status === "現役" ? "bg-emerald-950 border-emerald-700 text-emerald-300" :
                            horse.status === "放牧" ? "bg-blue-950 border-blue-700 text-blue-300" :
                            "bg-rose-950 border-rose-700 text-rose-300"
                          }`}
                        >
                          <option value="現役">🟢 現役</option>
                          <option value="放牧">🌿 放牧</option>
                          <option value="引退">🛑 引退 (自動枠削除)</option>
                        </select>
                      </td>
                      <td className="p-3 font-bold text-emerald-400 font-mono">
                        {horse.races_count || 0}戦{horse.wins_count || 0}勝
                      </td>
                      <td className="p-3 font-bold text-yellow-400 font-mono">
                        ¥{(horse.prize_money || 0).toLocaleString()}
                      </td>
                      <td className="p-3 space-y-1">
                        <div className="text-[10px] text-slate-400 italic max-w-xs truncate">
                          {horse.ai_comment || "コメントなし"}
                        </div>
                        <button
                          onClick={() => startEditing(horse)}
                          className="bg-slate-800 hover:bg-slate-700 text-yellow-300 px-2.5 py-1 rounded text-[10px] font-bold border border-slate-700"
                        >
                          ⚖️ 素質/賞金/騎手変更
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3️⃣ 種牡馬マスターの追加・一覧管理 */}
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4 shadow-lg">
          <h3 className="text-md font-bold text-emerald-400">🧬 種牡馬マスターの管理 ({stallions.length}頭)</h3>

          <form onSubmit={handleAddStallion} className="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
            <input
              type="text"
              placeholder="種牡馬名 (例: コントレイル)"
              value={newStallion.name}
              onChange={(e) => setNewStallion({ ...newStallion, name: e.target.value })}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
              required
            />
            <input
              type="number"
              placeholder="種付け料 (円)"
              value={newStallion.fee}
              onChange={(e) => setNewStallion({ ...newStallion, fee: Number(e.target.value) })}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
              required
            />
            <input
              type="number"
              placeholder="素質ボーナス (%)"
              value={newStallion.rank_bonus}
              onChange={(e) => setNewStallion({ ...newStallion, rank_bonus: Number(e.target.value) })}
              className="bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
            />
            <button type="submit" className="bg-emerald-600 font-bold hover:bg-emerald-500 text-white rounded px-3 py-2">
              種牡馬を追加
            </button>
          </form>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
            {stallions.map((s) => (
              <div key={s.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">{s.name}</div>
                  <div className="text-yellow-400 font-mono text-[10px]">¥{s.fee.toLocaleString()}</div>
                </div>
                <button
                  onClick={() => handleDeleteStallion(s.id, s.name)}
                  className="text-rose-400 hover:text-rose-300 text-[10px] px-1.5 py-0.5"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 4️⃣ 引退馬アーカイブ */}
        {retiredHorses.length > 0 && (
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-slate-400">📜 殿堂・引退馬アーカイブ ({retiredHorses.length}頭)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {retiredHorses.map((h) => (
                <div key={h.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                  <div>
                    <div className="font-bold text-slate-300">{h.name} (引退)</div>
                    <div className="text-slate-500 text-[10px]">{h.races_count}戦{h.wins_count}勝 / ¥{(h.prize_money || 0).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 編集用モーダル */}
      {editingHorseId && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl max-w-md w-full space-y-4">
            <h3 className="text-md font-bold text-yellow-400">⚖️ 競走馬の詳細データ・平等調整</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">潜在能力（素質ランク）</label>
                <select
                  value={editForm.ability_rank}
                  onChange={(e) => setEditForm({ ...editForm, ability_rank: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-yellow-400 font-bold"
                >
                  <option value="SS">🌟 SSランク（超大物・世界級）</option>
                  <option value="S">🔥 Sランク（重賞・G1級）</option>
                  <option value="A">✨ Aランク（オープン）</option>
                  <option value="B">🐎 Bランク（条件馬）</option>
                  <option value="C">💤 Cランク（試練型）</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400 block mb-1">主戦騎手</label>
                <input
                  type="text"
                  value={editForm.jockey}
                  onChange={(e) => setEditForm({ ...editForm, jockey: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
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
              <div>
                <label className="text-slate-400 block mb-1">獲得賞金 (円)</label>
                <input
                  type="number"
                  value={editForm.prize_money}
                  onChange={(e) => setEditForm({ ...editForm, prize_money: Number(e.target.value) })}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleUpdateHorseStats} className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white py-2 rounded text-xs">
                設定を保存（AIコメント同期）
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