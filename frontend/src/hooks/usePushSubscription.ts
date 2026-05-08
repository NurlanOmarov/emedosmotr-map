import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((sub) => {
          setSubscription(sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    
    setIsSubscribing(true);
    try {
      // 1. Get VAPID public key from backend
      const { data: { publicKey } } = await api.get('/push/vapid-public-key');
      
      const registration = await navigator.serviceWorker.ready;
      
      // 2. Subscribe user
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      
      // 3. Send subscription to backend
      const p256dh = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('p256dh')!) as any));
      const auth = btoa(String.fromCharCode.apply(null, new Uint8Array(sub.getKey('auth')!) as any));
      
      await api.post('/push/subscribe', {
        endpoint: sub.endpoint,
        p256dh,
        auth,
      });
      
      setSubscription(sub);
      return sub;
    } catch (err) {
      console.error('Failed to subscribe to push notifications:', err);
      throw err;
    } finally {
      setIsSubscribing(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    
    try {
      await api.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
      setSubscription(null);
    } catch (err) {
      console.error('Failed to unsubscribe from push notifications:', err);
    }
  }, [subscription]);

  return {
    isSupported,
    subscription,
    isSubscribing,
    subscribe,
    unsubscribe,
    isSubscribed: !!subscription,
  };
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
