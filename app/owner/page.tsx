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
  jockey: string;
};

export default function OwnerPage() {
  const [ownerName, setOwnerName] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ownerId, setOwnerId] = useState("");
  const [horses, setHorses] = useState<Horse[]>([]);

  // AI調教師チャット
  const [messages, setMessages] = useState<{ sender: "user" | "ai"; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  // 馬主ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase
      .from("horse_masters")
      .select("*")
      .eq("name", ownerName)
      .eq("passcode", passcode)
      .single();

    if (data) {
      setIsAuthenticated(true);
      setOwnerId(data.id);
      setMessages([
        { sender: "ai", text: `馬主の${data.name}様、お疲れ様です！調教師AIです。愛馬の出走相談やコンディションチェックなど、何でも聞いてください！` }
      ]);
    } else {
      alert("馬主名またはパスコードが違います！（初期パスコード: owner123）");
    }
  };

  // ログイン成功時に自身の馬を取得
  useEffect(() => {
    if (ownerId) {
      supabase.from("horses").select("*").eq("owner_id", ownerId).then(({ data }) => {
        if (data) setHorses(data);
      });
    }
  }, [ownerId]);

  // AIチャット送信処理
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setInputMessage("");

    setTimeout(() => {
      let aiReply = "愛馬の調教はバッチリ順調です！";
      if (userText.includes("おすすめ") || userText.includes("レース") || userText.includes("次")) {
        const topHorse = horses[0]?.name || "愛馬";
        aiReply = `「${topHorse}」は現在絶好調です！スタミナも十分なので、来週の【青森記念 (G1)】への出走が一番おすすめです！`;
      } else if (userText.includes("調子") || userText.includes("状態")) {
        aiReply = "毛艶も良く、追い切りのタイムも上々です。不安要素はありませんよ！";
      }
      setMessages((prev) => [...prev, { sender: "ai", text: aiReply }]);
    }, 600);
  };

  // 未ログイン時：馬主合言葉ログイン画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-slate-800 p-8 rounded-xl max-w-sm w-full space-y-4 border border-slate-700">
          <h1 className="text-2xl font-bold text-center text-yellow-400">🏇 馬主専用ラウンジ</h1>
          <input
            type="text"
            placeholder="馬主名 (例: 涼風)"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 rounded border border-slate-600 text-white"
            required
          />
          <input
            type="password"
            placeholder="パスコード (初期: owner123)"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-2 bg-slate-700 rounded border border-slate-600 text-white"
            required
          />
          <button type="submit" className="w-full bg-emerald-600 font-bold py-3 rounded hover:bg-emerald-500 transition">
            ログインして入室
          </button>
        </form>
      </div>
    );
  }

  // ログイン後：自分専用ダッシュボード ＆ AIチャット
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto mb-6 bg-slate-900 text-white p-6 rounded-xl shadow-md flex justify-between items-center border-b-4 border-emerald-500">
        <div>
          <span className="text-xs text-emerald-400 font-bold">Owner Dashboard</span>
          <h1 className="text-2xl font-bold">{ownerName} 殿 専用ページ</h1>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">所有頭数</span>
          <div className="text-xl font-bold text-yellow-400">{horses.length} 頭</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* トラッカー */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-lg font-bold text-slate-800 mb-4">📊 所有競走馬トラッカー</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-white bg-emerald-800 uppercase">
                <tr>
                  <th className="px-3 py-3">馬名</th>
                  <th className="px-2 py-3">性/年齢</th>
                  <th className="px-2 py-3">毛色</th>
                  <th className="px-3 py-3">血統</th>
                  <th className="px-2 py-3">状況</th>
                  <th className="px-3 py-3">賞金</th>
                </tr>
              </thead>
              <tbody>
                {horses.map((horse) => (
                  <tr key={horse.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold">{horse.name}</td>
                    <td className="px-2 py-3">{horse.gender}{horse.age}</td>
                    <td className="px-2 py-3">{horse.color}</td>
                    <td className="px-3 py-3 text-xs">{horse.father} × {horse.mother}</td>
                    <td className="px-2 py-3">
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded font-bold">
                        {horse.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold">¥{horse.prize_money.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AIチャット */}
        <div className="bg-white p-6 rounded-xl shadow-sm border flex flex-col h-[500px]">
          <h2 className="text-lg font-bold text-slate-800 mb-3 border-b pb-2">🤖 AI調教師相談室</h2>
          <div className="flex-1 overflow-y-auto space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.sender === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-800 border"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="おすすめレースは？ 等"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button type="submit" className="bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
              送信
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}