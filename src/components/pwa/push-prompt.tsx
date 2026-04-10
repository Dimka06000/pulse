'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushPrompt() {
  const { userId } = useAuthStore();
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    // Don't show if already granted or denied
    if (Notification.permission !== 'default') return;

    // Don't show if dismissed recently (24h)
    const dismissed = localStorage.getItem('pulse-push-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed, 10) < 24 * 60 * 60 * 1000) return;

    // Show after a delay
    const timer = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(timer);
  }, [userId]);

  const subscribe = useCallback(async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShow(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const sub = subscription.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });

      setShow(false);
    } catch {
      // Silently fail
    }
    setSubscribing(false);
  }, []);

  const dismiss = () => {
    localStorage.setItem('pulse-push-dismissed', String(Date.now()));
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 md:bottom-6 md:left-auto md:right-6">
      <div className="rounded-2xl border border-border bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-text">Activer les notifications ?</p>
            <p className="mt-1 text-xs text-muted">
              Recevez des alertes pour vos messages, rappels de séance et kudos.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={subscribe}
                disabled={subscribing}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
              >
                {subscribing ? 'Activation...' : 'Activer'}
              </button>
              <button
                onClick={dismiss}
                className="rounded-lg bg-surface px-4 py-2 text-xs font-semibold text-muted transition hover:bg-surface/80"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
