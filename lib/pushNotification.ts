// 🔔 iPhone / Safari 対応 通知許可リクエスト関数
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('❌ このブラウザは通知機能に対応していません。Safariのホーム画面追加アプリからお試しください。');
    return false;
  }

  // Service Workerの登録（iOSで通知を飛ばすために必須）
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      console.error('Service Worker登録エラー:', e);
    }
  }

  try {
    // 既存の許可状態をチェック
    if (Notification.permission === 'granted') {
      return true;
    }

    // ユーザーに許可をリクエスト
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return true;
    } else if (permission === 'denied') {
      alert('⚠️ 通知が拒否されています。\niPhoneの「設定」>「Safari」>「通知」またはWebサイトの設定から通知を「許可」に変更してください。');
      return false;
    }
  } catch (err) {
    console.error('Notification permission error:', err);
  }

  return false;
}

// 📱 スマホプッシュ通知送信処理（Service Worker 経由）
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