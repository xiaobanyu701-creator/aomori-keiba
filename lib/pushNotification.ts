// 🔔 スマホの通知許可をリクエストする関数
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('このブラウザは通知に対応していません');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

// 📱 スマホの画面上部にプッシュ通知を飛ばす関数
export function sendLocalPushNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico', // アイコン画像（あれば）
        badge: '/favicon.ico',
      });
    } catch (e) {
      console.error('スマホ通知送信失敗:', e);
    }
  }
}