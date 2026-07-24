"use client";

import { useState } from "react";
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
  const [horses, setHorses] = useState<Horse[]>([]);
  const [availableRaces, setAvailableRaces] = useState<Race[]>([]);

  const [selectedHorseId, setSelectedHorseId] = useState("");
  const [selectedRaceName, setSelectedRaceName] = useState("");

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
    setIsAuthenticated(true);
    fetchOwnerHorses(data.id);
    fetchRaces();
    setMessages([
      { sender: "ai", text: `こんにちは、${data.name}オーナー！専属調教師です。愛馬の調子やレース出走について何でもご相談ください！` }
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
      { name: ownerName, passcode, status: "pending" }
    ]);

    if (error) {
      alert("申請失敗: " + error.message);
    } else {
      alert("馬主登録申請を送信しました！管理者の承認をお待ちください。");
      setIsRegisterMode(false);
    }
  };

  const fetchOwnerHorses = async (id: string) => {
    const { data } = await supabase.from("horses").select("*").eq("owner_id", id);
    if (data) {
      setHorses(data);
      if (data.length > 0) setSelectedHorseId(data[0].id);
    }
  };

  const fetchRaces = async () => {
    const { data } = await supabase.from("races").select("*");
    if (data && data.length > 0) {
      setAvailableRaces(data);
      setSelectedRaceName(data[0].name);
    }
  };

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

  // 🛑 馬主からの自主引退申請
  const handleRequestRetirement = async (horse: Horse) => {
    if (!confirm(`本当に「${horse.name}」の引退申請を送信しますか？管理者画面へ送られます。`)) return;

    const { error } = await supabase.from("horses").update({ status: "引退申請中" }).eq("id", horse.id);
    if (!error) {
      alert("引退申請を管理者に送信しました。承認完了までお待ちください。");
      fetchOwnerHorses(ownerId);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputMessage("");

    setTimeout(() => {
      let aiResponse = "なるほど、了解いたしました。しっかり調整しておきます！";
      if (userText.includes("調子") || userText.includes("状態")) {
        aiResponse = "愛馬たちの毛ツヤも良く、追い切りも非常に良いタイムが出ていますよ！";
      } else if (userText.includes("引退")) {
        aiResponse = "寂しくなりますね…長い間本当にお疲れ様でした。";
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
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs text-emerald-400 font-bold uppercase">Owner Lounge</span>
          <h1 className="text-2xl font-bold text-white">{ownerName} オーナー</h1>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg">
          ログアウト
        </button>
      </div>

      {/* 🏁 出走申請フォーム */}
      <form onSubmit={handleApplyRace} className="bg-gradient-to-r from-slate-900 to-blue-950 p-5 rounded-xl border border-blue-800/60 flex flex-col md:flex-row gap-3 items-end">
        <div className="w-full md:w-1/3">
          <label className="text-xs font-bold text-blue-300 block mb-1">出走させる所有馬</label>
          <select
            value={selectedHorseId}
            onChange={(e) => setSelectedHorseId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {activeHorses.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.status})</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-1/3">
          <label className="text-xs font-bold text-blue-300 block mb-1">出走希望レース</label>
          <select
            value={selectedRaceName}
            onChange={(e) => setSelectedRaceName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            {availableRaces.length === 0 ? (
              <option value="">（登録レースなし）</option>
            ) : (
              availableRaces.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))
            )}
          </select>
        </div>
        <button type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 font-bold text-white px-5 py-2 rounded-lg text-sm transition">
          出走申請を送信
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 所有馬一覧 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-yellow-400">🐴 所有競走馬一覧</h2>
          {activeHorses.length === 0 ? (
            <p className="text-slate-400 text-sm">現在、現役の所有馬はありません。</p>
          ) : (
            <div className="space-y-3">
              {activeHorses.map((horse) => (
                <div key={horse.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">{horse.name}</h3>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 ${
                        horse.status === "放牧" ? "bg-blue-950 text-blue-300 border border-blue-700" :
                        horse.status === "引退申請中" ? "bg-rose-950 text-rose-300 border border-rose-700" :
                        "bg-emerald-950 text-emerald-300 border border-emerald-700"
                      }`}>
                        ステータス: {horse.status}
                      </span>
                    </div>
                    <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded">
                      {horse.races_count || 0}戦{horse.wins_count || 0}勝
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>性齢: {horse.gender}{horse.age} ({horse.color})</div>
                    <div>主戦: {horse.jockey || "未定"}</div>
                    <div>血統: {horse.father} × {horse.mother}</div>
                    <div className="text-yellow-400 font-bold">獲得賞金: ¥{(horse.prize_money || 0).toLocaleString()}</div>
                  </div>

                  {horse.status !== "引退申請中" && (
                    <div className="pt-2 border-t border-slate-800 text-right">
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

          {/* 引退馬一覧 */}
          {retiredHorses.length > 0 && (
            <div className="pt-4 border-t border-slate-700 space-y-2">
              <h3 className="text-xs font-bold text-slate-400">📜 引退馬（殿堂入り）</h3>
              <div className="space-y-1">
                {retiredHorses.map((h) => (
                  <div key={h.id} className="bg-slate-950 p-2 rounded text-xs text-slate-400 flex justify-between">
                    <span>{h.name} (引退)</span>
                    <span>{h.races_count}戦{h.wins_count}勝 / ¥{(h.prize_money || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI調教師相談室 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-emerald-400 mb-3">💬 専属AI調教師と相談</h2>

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
              placeholder="調教状態や次走について質問..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white px-4 py-2 rounded-lg text-sm">
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}