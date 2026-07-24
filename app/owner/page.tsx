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
  ability_rank?: string;
  ai_comment?: string;
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

  const [activeTab, setActiveTab] = useState<"horses" | "breed" | "race_apply" | "ai_chat">("horses");

  const [horses, setHorses] = useState<Horse[]>([]);
  const [stallions, setStallions] = useState<Stallion[]>([]);
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);

  // 生産フォーム用
  const [selectedStallionId, setSelectedStallionId] = useState("");
  const [motherName, setMotherName] = useState("自家製繁殖牝馬");
  const [foalName, setFoalName] = useState("");

  // レース出走申請用
  const [selectedHorseId, setSelectedHorseId] = useState("");
  const [selectedRaceName, setSelectedRaceName] = useState("");

  // AIチャット用
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

    setMessages([
      { sender: "ai", text: `お疲れ様です、${data.name}オーナー！専属調教師です。愛馬の調教、出走予定、生産について何でもご相談ください！` }
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

    if (error) {
      alert("申請失敗: " + error.message);
    } else {
      alert("馬主登録申請を送信しました！管理者の承認をお待ちください。");
      setIsRegisterMode(false);
    }
  };

  const fetchOwnerData = async (id: string) => {
    const { data: owner } = await supabase.from("horse_masters").select("balance").eq("id", id).single();
    if (owner) setBalance(owner.balance || 0);

    const { data: h } = await supabase.from("horses").select("*").eq("owner_id", id);
    if (h) {
      setHorses(h);
      if (h.length > 0) setSelectedHorseId(h[0].id);
    }
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

  // 🧬 スタホ・ダビスタ風 生産システム
  const handleBreedHorse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foalName.trim()) {
      alert("馬名を入力してください。");
      return;
    }

    const stallion = stallions.find((s) => s.id === selectedStallionId);
    if (!stallion) return;

    if (balance < stallion.fee) {
      alert(`所持金が足りません！（種付け料: ¥${stallion.fee.toLocaleString()}）`);
      return;
    }

    // 🎲 スタホ・ダビスタ風 確率計算 (種牡馬ボーナス考慮)
    const rand = Math.random() * 100 + (stallion.rank_bonus || 0);
    let rank = "B";
    let comment = "";

    if (rand > 110) {
      rank = "SS";
      comment = "「…凄まじいオーラを感じます！父と母の最高の素質を受け継いだ超大物です！クラシックどころか世界を狙える逸材ですよ！」";
    } else if (rand > 90) {
      rank = "S";
      comment = "「これは素晴らしい出来です！バネのような柔らかさとしなやかな筋肉を兼ね備えています。重賞・G1戦線で大暴れしてくれるでしょう！」";
    } else if (rand > 60) {
      rank = "A";
      comment = "「手応えはかなり良いですよ！全体的にバランスが良く、順調に育っていけば上位クラスで安定して活躍できそうです。」";
    } else if (rand > 25) {
      rank = "B";
      comment = "「大きな癖もなく、素直で扱いやすそうな仔馬ですね。まずは1勝を目指してじっくり育てていきましょう！」";
    } else {
      rank = "C";
      comment = "「少し奥手で気性にも難がありそうですが、ハマったときの爆発力には秘めたものがあります。根気強く付き合っていきましょう。」";
    }

    // 1. 所持金を引き去り
    const newBalance = balance - stallion.fee;
    const { error: balError } = await supabase.from("horse_masters").update({ balance: newBalance }).eq("id", ownerId);
    if (balError) {
      alert("支払いエラー: " + balError.message);
      return;
    }

    // 2. 新馬をデータベースへ登録
    const colors = ["鹿毛", "栗毛", "黒鹿毛", "芦毛", "青毛"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const randomGender = Math.random() > 0.5 ? "牡" : "牝";

    const { error: insertError } = await supabase.from("horses").insert([
      {
        owner_id: ownerId,
        name: foalName,
        gender: randomGender,
        age: 2, // 当歳・2歳新馬
        color: randomColor,
        father: stallion.name,
        mother: motherName || "自家製繁殖牝馬",
        status: "現役",
        prize_money: 0,
        races_count: 0,
        wins_count: 0,
        ability_rank: rank,
        ai_comment: comment,
      }
    ]);

    if (insertError) {
      alert("生産エラー: " + insertError.message);
    } else {
      alert(`🎉 仔馬「${foalName}」が誕生しました！\n\nAI判定: 素質【${rank}】\n${comment}`);
      setFoalName("");
      setBalance(newBalance);
      fetchOwnerData(ownerId);
      setActiveTab("horses");
    }
  };

  // 🏁 レース出走申請
  const handleApplyRace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHorseId || !selectedRaceName) {
      alert("馬と出走先レースを選択してください。");
      return;
    }

    const { error } = await supabase.from("race_entries").insert([
      {
        horse_id: selectedHorseId,
        owner_id: ownerId,
        race_name: selectedRaceName,
        status: "pending",
      }
    ]);

    if (error) {
      alert("出走申請エラー: " + error.message);
    } else {
      alert("管理者へ出走申請を送信しました！確定をお待ちください。");
    }
  };

  // 🛑 自主引退申請
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
      let aiResponse = "なるほど、了解いたしました！しっかり仕上げておきます！";
      if (userText.includes("素質") || userText.includes("コメント") || userText.includes("評価")) {
        const topHorse = horses[0];
        if (topHorse && topHorse.ai_comment) {
          aiResponse = `「${topHorse.name}」ですね！${topHorse.ai_comment}`;
        } else {
          aiResponse = "愛馬たちの潜在能力は非常に高いですよ！追い切りの動きも抜群です。";
        }
      } else if (userText.includes("生産") || userText.includes("種")) {
        aiResponse = "良い種牡馬を配することで一発大物の素質馬が生まれる可能性が高まりますよ！";
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
            <p className="text-xs text-slate-400">
              {isRegisterMode ? "新規馬主アカウントの登録申請" : "登録済みの馬主アカウントでログイン"}
            </p>
          </div>

          <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">馬主名（オーナー名）</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="例: 青森 太郎"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">合言葉（パスコード）</label>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="合言葉を入力"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 text-sm"
                required
              />
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
  const retiredHorses = horses.filter((h) => h.status === "引退");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
      {/* 🧭 左側固定サイドバー（リストメニュー） */}
      <div className="w-full md:w-64 bg-slate-950 p-4 border-r border-slate-800 flex flex-col justify-between shrink-0 space-y-6">
        <div className="space-y-6">
          <div className="space-y-1">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Owner Lounge</span>
            <h1 className="text-xl font-bold text-white truncate">{ownerName} 殿</h1>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 mt-2">
              <div className="text-[10px] text-slate-400">馬主口座残高（馬券/賞金共通）</div>
              <div className="text-md font-bold text-yellow-400 font-mono">¥{balance.toLocaleString()}</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("horses")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === "horses" ? "bg-emerald-800 text-white shadow" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <span>🐴</span> 所有競走馬一覧 ({activeHorses.length})
            </button>
            <button
              onClick={() => setActiveTab("breed")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === "breed" ? "bg-emerald-800 text-white shadow" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <span>🧬</span> 競走馬の生産（ブリーディング）
            </button>
            <button
              onClick={() => setActiveTab("race_apply")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === "race_apply" ? "bg-emerald-800 text-white shadow" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <span>🏁</span> レース出走申請
            </button>
            <button
              onClick={() => setActiveTab("ai_chat")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition ${
                activeTab === "ai_chat" ? "bg-emerald-800 text-white shadow" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <span>💬</span> AI調教師相談室
            </button>
          </nav>
        </div>

        <button onClick={() => setIsAuthenticated(false)} className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs py-2 rounded-lg border border-slate-800">
          ログアウト
        </button>
      </div>

      {/* 🖥️ 右側メインコンテンツ */}
      <div className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">

        {/* 1️⃣ 所有競走馬一覧タブ */}
        {activeTab === "horses" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
              <span>🐴 所有競走馬一覧</span>
            </h2>

            {activeHorses.length === 0 ? (
              <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 text-center space-y-3">
                <p className="text-slate-400 text-sm">現在、現役の所有馬はいません。「生産」メニューから新しい競走馬を配合しましょう！</p>
                <button onClick={() => setActiveTab("breed")} className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs">
                  🧬 仔馬を生産する
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeHorses.map((horse) => (
                  <div key={horse.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{horse.name}</h3>
                          {horse.ability_rank && (
                            <span className="bg-yellow-950 text-yellow-300 border border-yellow-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              素質: {horse.ability_rank}
                            </span>
                          )}
                        </div>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 ${
                          horse.status === "放牧" ? "bg-blue-950 text-blue-300 border border-blue-700" :
                          horse.status === "引退申請中" ? "bg-rose-950 text-rose-300 border border-rose-700" :
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
                      <div>性齢: {horse.gender}{horse.age} ({horse.color})</div>
                      <div>主戦: {horse.jockey || "未定"}</div>
                      <div className="col-span-2 text-slate-400">血統: 父 {horse.father} × 母 {horse.mother}</div>
                      <div className="col-span-2 text-yellow-400 font-bold">獲得賞金: ¥{(horse.prize_money || 0).toLocaleString()}</div>
                    </div>

                    {horse.ai_comment && (
                      <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 text-xs text-emerald-300 italic">
                        💬 AI調教師: {horse.ai_comment}
                      </div>
                    )}

                    {horse.status !== "引退申請中" && (
                      <div className="pt-2 border-t border-slate-700/60 text-right">
                        <button
                          onClick={() => handleRequestRetirement(horse)}
                          className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs px-3 py-1 rounded"
                        >
                          🛑 自主引退を申請
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {retiredHorses.length > 0 && (
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-slate-400">📜 殿堂・引退馬リスト</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {retiredHorses.map((h) => (
                    <div key={h.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-slate-300">{h.name} (引退)</div>
                      <div className="text-slate-500">{h.races_count}戦{h.wins_count}勝 / ¥{(h.prize_money || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2️⃣ 生産（ブリーディング）タブ */}
        {activeTab === "breed" && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-xl font-bold text-emerald-400">🧬 競走馬の生産（ブリーディング）</h2>
              <p className="text-xs text-slate-400 mt-1">種牡馬と配合して大物競走馬を誕生させましょう！スタホ・ダビスタ風の能力AIコメントが付きます。</p>
            </div>

            <form onSubmit={handleBreedHorse} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">1. 種牡馬を選択（種付け料が口座から引かれます）</label>
                <div className="space-y-2">
                  {stallions.map((s) => (
                    <label
                      key={s.id}
                      onClick={() => setSelectedStallionId(s.id)}
                      className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer text-xs transition ${
                        selectedStallionId === s.id ? "bg-emerald-950/80 border-emerald-500 text-white" : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">{s.name}</div>
                        <div className="text-[10px] text-slate-400">素質ボーナス: +{s.rank_bonus}%</div>
                      </div>
                      <div className="text-right font-mono font-bold text-yellow-400">
                        種付け料: ¥{s.fee.toLocaleString()}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">2. 母馬名</label>
                  <input
                    type="text"
                    value={motherName}
                    onChange={(e) => setMotherName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">3. 誕生する仔馬の名前</label>
                  <input
                    type="text"
                    placeholder="例: アオモリキング"
                    value={foalName}
                    onChange={(e) => setFoalName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    required
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white py-3 rounded-lg text-sm shadow-lg transition">
                🎉 種付けして仔馬を生産する
              </button>
            </form>
          </div>
        )}

        {/* 3️⃣ レース出走申請タブ */}
        {activeTab === "race_apply" && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-xl font-bold text-blue-400">🏁 レース出走申請</h2>
              <p className="text-xs text-slate-400 mt-1">馬券のレース一覧から出走させたいレースを選んで管理者に申請します。</p>
            </div>

            <form onSubmit={handleApplyRace} className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">出走させる所有馬</label>
                <select
                  value={selectedHorseId}
                  onChange={(e) => setSelectedHorseId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {activeHorses.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} ({h.status})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">出走希望レース（馬券自動連携）</label>
                <select
                  value={selectedRaceName}
                  onChange={(e) => setSelectedRaceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {availableRaces.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-bold text-white py-3 rounded-lg text-sm transition">
                出走申請を送信
              </button>
            </form>
          </div>
        )}

        {/* 4️⃣ AI調教師相談室タブ */}
        {activeTab === "ai_chat" && (
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-xl font-bold text-emerald-400">💬 専属AI調教師相談室</h2>
            <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col h-[500px]">
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
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="愛馬の素質やコンディションについて質問..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white px-4 py-2 rounded-lg text-sm">
                  送信
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}