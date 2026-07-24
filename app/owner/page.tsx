"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Horse = {
  id: string;
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
  released_at?: string;
};

type Stallion = {
  id: string;
  name: string;
  fee: number;
  rank_bonus: number;
};

type Race = {
  id: string;
  name: string;
};

export default function OwnerPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [ownerName, setOwnerName] = useState("");
  const [passcode, setPasscode] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [balance, setBalance] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<"horses" | "jockey_select" | "breed" | "race_apply" | "ai_chat">("horses");

  const [horses, setHorses] = useState<Horse[]>([]);
  const [stallions, setStallions] = useState<Stallion[]>([]);
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);
  const [availableJockeys, setAvailableJockeys] = useState<string[]>([]); // 自動取得騎手リスト

  // 騎手変更申請フォーム
  const [selectedJockeyHorseId, setSelectedJockeyHorseId] = useState("");
  const [mainJockey, setMainJockey] = useState("");
  const [tempJockey, setTempJockey] = useState("");

  // 生産用
  const [selectedStallionId, setSelectedStallionId] = useState("");
  const [motherHorseId, setMotherHorseId] = useState("");
  const [foalName, setFoalName] = useState("");

  // レース申請
  const [selectedHorseId, setSelectedHorseId] = useState("");
  const [selectedRaceName, setSelectedRaceName] = useState("");

  // AIチャット
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from("horse_masters")
      .select("*")
      .eq("name", ownerName)
      .eq("passcode", passcode)
      .single();

    if (error || !data) {
      alert("馬主名または合言葉が違います。");
      return;
    }

    if (data.status !== "approved") {
      alert("アカウントは現在【管理者の承認待ち】です。");
      return;
    }

    setOwnerId(data.id);
    setBalance(data.balance || 0);
    setIsAuthenticated(true);
    fetchOwnerData(data.id);
    fetchStallions();
    fetchRaces();
    fetchJockeysFromRaces();

    setMessages([
      { sender: "ai", text: `お疲れ様です、${data.name}オーナー！専属AI調教師です。` }
    ]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !passcode) return;

    const { data: existing } = await supabase.from("horse_masters").select("id").eq("name", ownerName).single();
    if (existing) {
      alert("その馬主名は既に登録されています。");
      return;
    }

    const { error } = await supabase.from("horse_masters").insert([
      { name: ownerName, passcode, status: "pending", balance: 10000000 }
    ]);

    if (!error) {
      alert("馬主登録申請を送信しました！管理者の承認をお待ちください。");
      setIsRegisterMode(false);
    }
  };

  const fetchOwnerData = async (id: string) => {
    const { data: owner } = await supabase.from("horse_masters").select("balance").eq("id", id).single();
    if (owner) setBalance(owner.balance || 0);

    const { data: h } = await supabase.from("horses").select("*").eq("owner_id", id);
    if (h) {
      const updated = h.map((horse) => {
        if (horse.status === "育成放牧中" && horse.released_at) {
          if (new Date(horse.released_at) <= new Date()) {
            horse.status = "現役";
          }
        }
        return horse;
      });
      setHorses(updated);
      if (updated.length > 0) {
        setSelectedHorseId(updated[0].id);
        setSelectedJockeyHorseId(updated[0].id);
        setMainJockey(updated[0].jockey || "");
        setTempJockey(updated[0].temporary_jockey || "");
      }
    }
  };

  // 🏇 レース馬柱 (race_horses) や races テーブルから自動的に騎手名を読み込んで連動！
  const fetchJockeysFromRaces = async () => {
    const { data } = await supabase.from("race_horses").select("jockey");
    let jList: string[] = ["武豊", "ルメール", "川田将雅", "横山武史", "坂井瑠星", "松山弘平"];
    if (data && data.length > 0) {
      const dbJockeys = data.map((d) => d.jockey).filter((j): j is string => Boolean(j));
      jList = Array.from(new Set([...jList, ...dbJockeys])); // 重複排除
    }
    setAvailableJockeys(jList);
    if (jList.length > 0 && !mainJockey) setMainJockey(jList[0]);
  };

  const fetchStallions = async () => {
    const { data } = await supabase.from("stallions").select("*").order("fee", { ascending: false });
    if (data && data.length > 0) {
      setStallions(data);
      setSelectedStallionId(data[0].id);
    }
  };

  const fetchRaces = async () => {
    const { data } = await supabase.from("races").select("*");
    if (data && data.length > 0) {
      setAvailableRaces(data);
      setSelectedRaceName(data[0].name);
    }
  };

  // 騎手変更申請
  const handleApplyJockey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJockeyHorseId) return;

    const { error } = await supabase.from("horses").update({
      jockey: mainJockey,
      temporary_jockey: tempJockey || null,
      jockey_status: "pending", // 管理者承認待ちへ
    }).eq("id", selectedJockeyHorseId);

    if (!error) {
      alert("騎手選択・変更申請を管理者に送信しました！承認をお待ちください。");
      fetchOwnerData(ownerId);
    }
  };

  // 生産ロジック
  const handleBreed = async (type: "normal" | "random") => {
    if (!foalName.trim()) {
      alert("馬名を入力してください。");
      return;
    }

    let fee = 100000;
    let fatherName = "未知の種牡馬";
    let motherNameStr = "自家製繁殖牝馬";

    if (type === "normal") {
      const stallion = stallions.find((s) => s.id === selectedStallionId);
      if (!stallion) return;
      fee = stallion.fee;
      fatherName = stallion.name;

      if (motherHorseId) {
        const m = horses.find((h) => h.id === motherHorseId);
        if (m) motherNameStr = m.name;
      }
    }

    if (balance < fee) {
      alert(`所持金が足りません！（必要金額: ¥${fee.toLocaleString()}）`);
      return;
    }

    const { data: setRes } = await supabase.from("system_settings").select("value_json").eq("key", "spawn_rates").single();
    const rates = setRes?.value_json || { SS: 5, S: 15, A: 30, B: 35, C: 15 };

    const rand = Math.random() * 100;
    let rank = "B";
    if (rand < rates.SS) rank = "SS";
    else if (rand < rates.SS + rates.S) rank = "S";
    else if (rand < rates.SS + rates.S + rates.A) rank = "A";
    else if (rand < rates.SS + rates.S + rates.A + rates.B) rank = "B";
    else rank = "C";

    const growthTypes = ["早熟", "普通", "晩成"];
    const growth = growthTypes[Math.floor(Math.random() * growthTypes.length)];

    let commentStage1 = "「ただ者ではない雰囲気を感じます…2日後のトレセン入厩をお楽しみに！」";
    if (rank === "SS") commentStage1 = "「…とんでもない素質を秘めています！2日後の入厩が待ちきれません！」";

    const releaseTime = new Date();
    releaseTime.setDate(releaseTime.getDate() + 2);

    const newBal = balance - fee;
    await supabase.from("horse_masters").update({ balance: newBal }).eq("id", ownerId);

    const colors = ["鹿毛", "栗毛", "黒鹿毛", "芦毛", "青毛"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomGender = Math.random() > 0.5 ? "牡" : "牝";

    const { error } = await supabase.from("horses").insert([
      {
        owner_id: ownerId,
        name: foalName,
        gender: randomGender,
        age: 2,
        color: randomColor,
        father: fatherName,
        mother: motherNameStr,
        status: "育成放牧中",
        prize_money: 0,
        races_count: 0,
        wins_count: 0,
        jockey: "未定",
        jockey_status: "approved",
        ability_rank: rank,
        growth_type: growth,
        ai_comment: commentStage1,
        released_at: releaseTime.toISOString(),
      }
    ]);

    if (!error) {
      alert(`🎉 仔馬「${foalName}」が誕生しました！`);
      setFoalName("");
      setBalance(newBal);
      fetchOwnerData(ownerId);
      setActiveTab("horses");
    }
  };

  const handleApplyRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseId || !selectedRaceName) return;

    const { error } = await supabase.from("race_entries").insert([
      {
        horse_id: selectedHorseId,
        owner_id: ownerId,
        race_name: selectedRaceName,
        status: "pending",
      }
    ]);

    if (!error) alert("出走申請を送信しました！");
  };

  const handleRequestRetirement = async (horse: Horse) => {
    if (!confirm(`本当に「${horse.name}」の引退申請を送信しますか？`)) return;

    const { error } = await supabase.from("horses").update({ status: "引退申請中" }).eq("id", horse.id);
    if (!error) {
      alert("引退申請を管理者に送信しました。");
      fetchOwnerData(ownerId);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputMessage("");

    setTimeout(() => {
      let aiResponse = "了解いたしました！しっかり調整しておきます！";
      if (userText.includes("騎手") || userText.includes("乗り替わり")) {
        aiResponse = "愛馬の脚質に合わせた騎手選定が勝利のカギになりますよ！選択画面から申請してくださいね。";
      }
      setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);
    }, 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <span className="text-4xl block">🏇</span>
            <h1 className="text-2xl font-bold text-yellow-400">馬主専用ラウンジ</h1>
          </div>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">馬主名（オーナー名）</label>
              <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">合言葉（パスコード）</label>
              <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm" required />
            </div>

            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg shadow-lg transition">
              {isRegisterMode ? "管理者へ承認申請を送信" : "ラウンジへログイン"}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <button onClick={() => setIsRegisterMode(!isRegisterMode)} className="text-xs text-yellow-400 hover:underline">
              {isRegisterMode ? "ログイン画面へ戻る" : "新規馬主登録申請はこちら"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeHorses = horses.filter((h) => h.status !== "引退");
  const femaleHorses = horses.filter((h) => h.gender === "牝");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* 左サイドバー */}
      <div className="w-full md:w-64 bg-slate-950 p-4 border-r border-slate-800 flex flex-col justify-between shrink-0 space-y-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Owner Lounge</span>
            <h1 className="text-xl font-bold text-white truncate">{ownerName} 殿</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 mt-2">
              <div className="text-[10px] text-slate-400">馬主残高（馬券/賞金共通）</div>
              <div className="text-md font-bold text-yellow-400 font-mono">¥{balance.toLocaleString()}</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button onClick={() => setActiveTab("horses")} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold ${activeTab === "horses" ? "bg-emerald-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              <span>🐴</span> 所有馬一覧 ({activeHorses.length})
            </button>
            <button onClick={() => setActiveTab("jockey_select")} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold ${activeTab === "jockey_select" ? "bg-emerald-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              <span>🏇</span> 主戦・点乗り騎手選択
            </button>
            <button onClick={() => setActiveTab("breed")} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold ${activeTab === "breed" ? "bg-emerald-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              <span>🧬</span> 競走馬の生産 / 10万ガチャ
            </button>
            <button onClick={() => setActiveTab("race_apply")} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold ${activeTab === "race_apply" ? "bg-emerald-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              <span>🏁</span> レース出走申請
            </button>
            <button onClick={() => setActiveTab("ai_chat")} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold ${activeTab === "ai_chat" ? "bg-emerald-800 text-white" : "text-slate-400 hover:bg-slate-900"}`}>
              <span>💬</span> AI調教師相談室
            </button>
          </nav>
        </div>

        <button onClick={() => setIsAuthenticated(false)} className="w-full bg-slate-900 text-slate-400 text-xs py-2 rounded-lg border border-slate-800">ログアウト</button>
      </div>

      {/* 右メインコンテンツ */}
      <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">

        {/* 所有馬タブ */}
        {activeTab === "horses" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-yellow-400">🐴 所有競走馬一覧</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeHorses.map((horse) => (
                <div key={horse.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{horse.name}</h3>
                        <span className="bg-yellow-950 text-yellow-300 border border-yellow-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                          {horse.ability_rank || "B"}
                        </span>
                      </div>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 ${
                        horse.status === "育成放牧中" ? "bg-amber-950 text-amber-300 border border-amber-700 animate-pulse" :
                        "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      }`}>
                        {horse.status}
                      </span>
                    </div>
                    <span className="bg-slate-900 text-slate-300 text-xs px-2.5 py-1 rounded font-bold">
                      {horse.races_count || 0}戦{horse.wins_count || 0}勝
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>性齢: {horse.gender}{horse.age}歳 ({horse.color})</div>
                    <div>主戦騎手: <span className="text-yellow-400 font-bold">{horse.jockey || "未定"}</span></div>
                    {horse.temporary_jockey && (
                      <div className="col-span-2 text-blue-300 font-bold">
                        次走テン乗り騎手: {horse.temporary_jockey} {horse.jockey_status === "pending" && "(管理者承認待ち)"}
                      </div>
                    )}
                    <div className="col-span-2 text-slate-400">血統: 父 {horse.father} × 母 {horse.mother}</div>
                    <div className="col-span-2 text-yellow-400 font-bold">獲得賞金: ¥{(horse.prize_money || 0).toLocaleString()}</div>
                  </div>

                  {horse.ai_comment && (
                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 text-xs text-emerald-300 italic">
                      💬 AI診断: {horse.ai_comment}
                    </div>
                  )}

                  {horse.status !== "引退申請中" && (
                    <div className="pt-2 border-t border-slate-700 text-right">
                      <button onClick={() => handleRequestRetirement(horse)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs px-3 py-1 rounded">
                        🛑 自主引退申請
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🏇 騎手選択タブ */}
        {activeTab === "jockey_select" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-yellow-400">🏇 主戦騎手 ＆ テン乗り（点乗り）騎手選択</h2>
              <p className="text-xs text-slate-400 mt-1">馬券・レース画面の自動連動騎手リストから選んで管理者に決定申請を送信します。</p>
            </div>

            <form onSubmit={handleApplyJockey} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">対象の所有馬</label>
                <select
                  value={selectedJockeyHorseId}
                  onChange={(e) => {
                    setSelectedJockeyHorseId(e.target.value);
                    const h = horses.find((x) => x.id === e.target.value);
                    if (h) {
                      setMainJockey(h.jockey || availableJockeys[0] || "");
                      setTempJockey(h.temporary_jockey || "");
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {activeHorses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} (現在主戦: {h.jockey || "未定"})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">主戦騎手（基本騎乗者）</label>
                <select
                  value={mainJockey}
                  onChange={(e) => setMainJockey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-yellow-400 font-bold"
                >
                  {availableJockeys.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">次走テン乗り（乗り替わり）騎手（任意）</label>
                <select
                  value={tempJockey}
                  onChange={(e) => setTempJockey(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-blue-300 font-bold"
                >
                  <option value="">指定なし（主戦騎手が継続騎乗）</option>
                  {availableJockeys.map((j) => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white py-3 rounded-lg text-sm shadow">
                管理者へ騎手指定申請を送信
              </button>
            </form>
          </div>
        )}

        {/* 生産 ＆ ガチャ */}
        {activeTab === "breed" && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-bold text-emerald-400">🧬 競走馬の生産 ＆ ランダム10万ガチャ</h2>

            <div className="bg-gradient-to-r from-amber-950/60 to-slate-800 p-5 rounded-xl border border-amber-600/50 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-bold text-yellow-400">🎲 10万円 一発ランダム生産</h3>
                <span className="text-sm font-mono font-bold text-yellow-400">¥100,000</span>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="仔馬の名前を入力" value={foalName} onChange={(e) => setFoalName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
                <button onClick={() => handleBreed("random")} className="bg-amber-600 font-bold text-slate-950 px-5 py-2 rounded-lg text-sm">10万円で生産</button>
              </div>
            </div>

            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
              <h3 className="text-md font-bold text-slate-200">🐴 種牡馬 ＆ 自家牝馬で本格生産</h3>
              <div>
                <label className="text-xs text-slate-400 block mb-1">1. 種牡馬選択</label>
                <select value={selectedStallionId} onChange={(e) => setSelectedStallionId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  {stallions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (種付け料: ¥{s.fee.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">2. 繁殖牝馬選択</label>
                <select value={motherHorseId} onChange={(e) => setMotherHorseId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">自家製繁殖牝馬（初期）</option>
                  {femaleHorses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.age}歳牝馬)</option>
                  ))}
                </select>
              </div>

              <button onClick={() => handleBreed("normal")} className="w-full bg-emerald-600 font-bold text-white py-3 rounded-lg text-sm">🎉 種付けして仔馬を生産する</button>
            </div>
          </div>
        )}

        {/* 出走申請 */}
        {activeTab === "race_apply" && (
          <div className="space-y-6 max-w-xl">
            <h2 className="text-xl font-bold text-blue-400">🏁 レース出走申請</h2>
            <form onSubmit={handleApplyRace} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">出走させる所有馬</label>
                <select value={selectedHorseId} onChange={(e) => setSelectedHorseId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  {activeHorses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">出走希望レース</label>
                <select value={selectedRaceName} onChange={(e) => setSelectedRaceName(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  {availableRaces.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold text-white py-3 rounded-lg text-sm">出走申請を送信</button>
            </form>
          </div>
        )}

        {/* AI相談 */}
        {activeTab === "ai_chat" && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-xl font-bold text-emerald-400">💬 専属AI調教師相談室</h2>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col h-[450px]">
              <div className="flex-1 bg-slate-900 rounded-lg p-3 overflow-y-auto space-y-3 border border-slate-700">
                {messages.map((m, idx) => (
                  <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3.5 py-2 text-sm ${m.sender === "user" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-200 border border-slate-700"}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                <input type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} placeholder="質問を入力..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
                <button type="submit" className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-sm">送信</button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}