export async function sendDiscordNotification(title: string, description: string, color: number = 0x1e3a8a) {
  const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: title,
            description: description,
            color: color,
            footer: { text: '🍏 青森県競馬 公式AI実況システム' },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (e) {
    console.error('Discord通知送信失敗:', e);
  }
}