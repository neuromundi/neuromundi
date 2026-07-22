/**
 * usePushSubscribe — activa las notificaciones push nativas (Web Push / VAPID).
 * Requiere VITE_VAPID_PUBLIC_KEY (igual a VAPID_PUBLIC_KEY del backend) y el
 * service worker (/sw.js) con el manejador push (public/push-sw.js). Guarda la
 * suscripción del navegador en push_subscriptions.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushState = 'idle' | 'unsupported' | 'unconfigured' | 'granted' | 'denied' | 'busy';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function usePushSubscribe() {
  const { userId } = useAuth();
  const [state, setState] = useState<PushState>('idle');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported');
    } else if (!VAPID) {
      setState('unconfigured');
    } else if (Notification.permission === 'granted') {
      setState('granted');
    } else if (Notification.permission === 'denied') {
      setState('denied');
    } else {
      setState('idle');
    }
  }, []);

  const enable = useCallback(async () => {
    if (!VAPID || !userId) return;
    setState('busy');
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState('denied'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID) as BufferSource,
      });
      const j = sub.toJSON();
      await supabase.from('push_subscriptions').upsert(
        {
          user_id: userId,
          endpoint: sub.endpoint,
          p256dh: j.keys?.p256dh ?? '',
          auth: j.keys?.auth ?? '',
        },
        { onConflict: 'endpoint' },
      );
      setState('granted');
    } catch {
      setState('idle');
    }
  }, [userId]);

  return { state, enable };
}
