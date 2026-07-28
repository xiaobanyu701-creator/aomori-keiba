// 🗣️ 1. AIトラックマン パドック解説コメント生成
export function getAiTrackmanComment(odds: number): string {
  if (odds <= 2.5) {
    return '🗣️ 【AIパドック解説】 追い切りの動きは破格！気合十分で毛ツヤも冴え渡り、ここは勝ち負け必至の出来。';
  } else if (odds <= 6.0) {
    return '🗣️ 【AIパドック解説】 好仕上がりをキープ。距離適性も高く、展開ひとつで首位争いに加わる一頭。';
  } else {
    return '🗣️ 【AIパドック解説】 重馬場や展開の助けが必要か。一発穴をあける潜在能力はある。';
  }
}

// 🧬 2. AI血統配合診断アナライザー
export function getAiBreedingReport(sire: string, dam: string) {
  if (!sire || !dam) return null;
  const isSame = sire === dam;
  
  if (sire.includes('サンデー') || dam.includes('サンデー')) {
    return {
      stars: '★★★★★ (★5 黄金ニックス)',
      comment: '『奇跡の血量 3×4』検出！爆発的な瞬発力を秘めた最高峰配合です！'
    };
  } else if (isSame) {
    return {
      stars: '★☆☆☆☆ (危険な近親交配)',
      comment: '血が濃すぎます！ケガ・健康度低下のリスクが高まります。'
    };
  }

  return {
    stars: '★★★★☆ (相性良好)',
    comment: 'スピードとパワーのバランスが良い黄金配合です。マイル〜中距離で期待できます！'
  };
}

// 🎙️ 3. AI実況ダイジェスト文生成
export function generateAiDigestText(rank1: string, name1: string, rank2: string, name2: string): string {
  return `🎙️ **【AI実況ダイジェスト】**\n「最後の直線、激しい競り合いの中から堂々抜け出したのは **${rank1}番 ${name1}**！猛烈な追い上げを見せた **${rank2 ? `${rank2}番 ${name2}` : ''}** を振り切って見事栄冠に輝きました！」`;
}

// 🩺 4. AI故障判定ロジック
export function calculateInjuryRisk(fatigue: number, isSparta: boolean) {
  const baseRate = (fatigue * 0.8) + (isSparta ? 25 : 5);
  const rand = Math.random() * 100;
  
  if (rand < baseRate) {
    return { isInjured: true, type: rand < 5 ? '屈腱炎(重傷)' : 'ソエ(軽傷)' };
  }
  return { isInjured: false, type: '' };
}