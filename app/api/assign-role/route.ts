import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { providerToken } = await req.json();

    if (!providerToken) {
      return NextResponse.json({ error: 'No provider token' }, { status: 400 });
    }

    // 1. ログインしたユーザーの Discord 情報を取得
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const discordUser = await userRes.json();

    if (!discordUser.id) {
      return NextResponse.json({ error: 'Failed to fetch Discord user' }, { status: 400 });
    }

    // ⚙️ 環境変数からID類を読み込み
    const guildId = process.env.DISCORD_GUILD_ID;
    const roleId = process.env.DISCORD_VERIFIED_ROLE_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!guildId || !roleId || !botToken) {
      console.log('Discord設定(環境変数)が未設定です');
      return NextResponse.json({ success: false, message: 'Env settings missing' });
    }

    // 2. Discord API経由でユーザーに「認証済」ロールを自動付与
    const assignRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${discordUser.id}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bot ${botToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (assignRes.ok) {
      return NextResponse.json({ success: true, message: 'Role assigned successfully' });
    } else {
      const errText = await assignRes.text();
      console.error('Role assign error:', errText);
      return NextResponse.json({ success: false, message: 'Failed to assign role', error: errText });
    }
  } catch (error) {
    console.error('Error in assign-role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}