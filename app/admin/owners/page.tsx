"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminPage() {
  const [horses, setHorses] = useState<any[]>([]);
  const [races, setRaces] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // order()や特定select()による400エラーを防ぐためselect("*")のみ指定
    const { data: hData } = await supabase.from("horses").select("*");
    if (hData) setHorses(hData.reverse());

    const { data: rData } = await supabase.from("races").select("*");
    if (rData) setRaces(rData);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold text-yellow-400 mb-6">🏇 レース・馬柱 コントロールパネル</h1>
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h2 className="text-lg font-bold mb-4">登録競走馬一覧 ({horses.length}頭)</h2>
        <div className="space-y-2">
          {horses.map((h) => (
            <div key={h.id} className="bg-slate-950 p-3 rounded border border-slate-800 flex justify-between">
              <div>
                <span className="font-bold text-white">{h.name}</span>
                <span className="text-xs text-slate-400 ml-2">({h.gender}{h.age}歳)</span>
              </div>
              <div className="text-xs text-yellow-400 font-mono">騎手: {h.jockey || "未定"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}