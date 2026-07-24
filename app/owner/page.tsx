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
  jockey: string;
};

export default function OwnerPage() {
  const [isRegisterMode, setIsRegisterMode] = useState(false); // ログインか新規申請かの切替
  const [ownerName, setOwnerName] = useState("");
  const [passcode, setPasscode] = useState("");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [horses, setHorses] = useState<Horse[]>([]);

  // AIチャット用
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // 🔑 馬主ログイン（承認チェック付き）
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
      alert("アカウントは現在【管理者の承認待ち】です。承認完了までしばらくお待ちください。");
      return;
    }

    setOwnerId(data.id);
    setIsAuthenticated(true);
    fetchOwnerHorses(data.id);
    setMessages([
      { sender: "ai", text: `こんにちは、${data.name}オーナー！専属調教師です。愛馬の調子やレース出走について何でもご相談ください！` }
    ]);
  };

  // 📝 新規馬主の登録申請
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerName || !passcode) return;

    // 重複チェック
    const { data: existing } = await supabase.from("horse_masters").select("id").eq("name", ownerName).single();
    if (existing) {
      alert("その馬主名は既に登録されています。");
      return;
    }

    const { error } = await supabase.from("horse_masters").insert([
      {
        name: ownerName,
        passcode: passcode,
        status: "pending", // 承認待ちとして追加
      }
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
    if (data) setHorses(data);
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
      } else if (userText.includes("レース") || userText.includes("次走")) {
        aiResponse = "次走は条件がぴったりのレースをピックアップして提案させていただきます！";
      }
      setMessages((prev) => [...prev, { sender: "ai", text: aiResponse }]);
    }, 1000);
  };

  // 未ログイン画面
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
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs text-yellow-400 hover:underline"
            >
              {isRegisterMode ? "すでにアカウントをお持ちの方（ログイン）" : "新規馬主登録申請はこちら"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ログイン後のメイン画面
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div>
          <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Owner Lounge</span>
          <h1 className="text-2xl font-bold text-white">{ownerName} オーナー</h1>
        </div>
        <button onClick={() => setIsAuthenticated(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg">
          ログアウト
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 所属馬一覧 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 space-y-4">
          <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
            <span>🐴 所有競走馬一覧</span>
          </h2>
          {horses.length === 0 ? (
            <p className="text-slate-400 text-sm">現在、登録されている所有馬はありません。（管理者が登録すると表示されます）</p>
          ) : (
            <div className="space-y-3">
              {horses.map((horse) => (
                <div key={horse.id} className="bg-slate-900 p-4 rounded-lg border border-slate-700 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{horse.name}</h3>
                    <span className="bg-emerald-900/60 text-emerald-300 border border-emerald-700 text-xs px-2.5 py-0.5 rounded-full">
                      {horse.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div>性齢: {horse.gender}{horse.age} ({horse.color})</div>
                    <div>主戦: {horse.jockey || "未定"}</div>
                    <div>血統: {horse.father} × {horse.mother}</div>
                    <div className="text-yellow-400 font-bold">賞金: ¥{horse.prize_money.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI調教師相談室 */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-emerald-400 mb-3 flex items-center gap-2">
            <span>💬 専属AI調教師と相談</span>
          </h2>

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