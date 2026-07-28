// 🔔 Service Workerの登録 ＆ 通知許可リクエスト
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Service Worker の登録
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker 登録成功');
    } catch (err) {
      console.error('Service Worker 登録失敗:', err);
    }
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

// 📱 スマホプッシュ通知を確実に発信（Service Worker 経由）
export async function sendLocalPushNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        registration.showNotification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          vibrate: [200, 100, 200],
        } as any);
      } else {
        new Notification(title, { body });
      }
    } catch (e) {
      console.error('スマホ通知送信エラー:', e);
    }
  }
}