'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { getFirebaseMessaging, getVapidKey, isMessagingSupported } from '@/lib/firebase-client';

const DISMISSAL_KEY = 'spr_notification_prompt_dismissed';
const TOKEN_KEY = 'spr_fcm_token';
const SUB_TYPE_KEY = 'spr_subscription_type';

export default function FirstVisitNotificationCard() {
  const [isVisible, setIsVisible] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Helper to detect device type
  const detectDeviceType = useCallback((): string => {
    if (typeof window === 'undefined') return 'WEB';
    const ua = navigator.userAgent || '';
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (/android/i.test(ua) && (isStandalone || document.referrer.includes('android-app://'))) {
      return 'ANDROID_TWA';
    }
    if (/edg/i.test(ua)) return 'EDGE';
    if (/chrome|crios/i.test(ua) && !/edg/i.test(ua)) return 'CHROME';
    if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'SAFARI';
    if (/firefox|fxios/i.test(ua)) return 'FIREFOX';
    return 'WEB';
  }, []);

  // Determine whether to display the card on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if user previously dismissed or already subscribed
    const isDismissed = localStorage.getItem(DISMISSAL_KEY);
    const existingToken = localStorage.getItem(TOKEN_KEY);
    if (isDismissed || existingToken) {
      return;
    }

    // 2. Check if browser supports notifications
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    // 3. If permission was already decided (granted or denied), do not show first-visit prompt
    if (Notification.permission !== 'default') {
      return;
    }

    // 4. Verify Firebase Messaging capability before showing prompt
    isMessagingSupported().then((supported) => {
      if (supported) {
        // Small graceful delay to avoid visual clutter during initial page load
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }).catch(() => {});
  }, []);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    try {
      localStorage.setItem(DISMISSAL_KEY, 'true');
    } catch {}
  }, []);

  const handleEnableNotifications = async () => {
    try {
      setIsRegistering(true);
      setFeedback(null);

      // 1. Explicit user-triggered permission request
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        if (perm === 'denied') {
          handleDismiss();
        }
        setIsRegistering(false);
        return;
      }

      // 2. Initialise Firebase Messaging safely
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        throw new Error('Push notifications could not be initialized in this browser.');
      }

      // 3. Ensure Service Worker is ready
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker is required for push notifications.');
      }
      const registration = await navigator.serviceWorker.ready;

      // 4. Retrieve FCM token
      const { getToken } = await import('firebase/messaging');
      const vapidKey = getVapidKey();

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: registration,
      });

      if (!currentToken) {
        throw new Error('Unable to obtain a push registration token from Firebase.');
      }

      // 5. Register anonymous device subscription on server
      const devType = detectDeviceType();
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken: currentToken,
          deviceType: devType,
          isAnonymous: true,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Server rejected push registration.');
      }

      // 6. Record anonymous subscription in local storage and remember dismissal
      localStorage.setItem(TOKEN_KEY, currentToken);
      localStorage.setItem(SUB_TYPE_KEY, 'ANONYMOUS');
      localStorage.setItem(DISMISSAL_KEY, 'true');

      setFeedback({
        type: 'success',
        message: "You're all set! You will now receive general institutional updates.",
      });

      // Auto-hide card after showing success message
      setTimeout(() => {
        setIsVisible(false);
      }, 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to enable notifications.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Notification subscription banner"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full mx-auto px-4 sm:px-0 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 sm:p-5 relative overflow-hidden transition-all">
        {/* Top Decorative Highlight Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500" />

        {/* Dismiss X button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Dismiss notification prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start space-x-3.5">
          <div className="shrink-0 p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 mt-0.5">
            <Bell className="w-5 h-5" />
          </div>

          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-1.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Stay Connected with SPR
              </h3>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Receive institutional announcements, academic updates, events and important information directly on your device.
            </p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        {!feedback?.type && (
          <div className="mt-4 flex items-center justify-end space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isRegistering}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isRegistering}
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enabling...</span>
                </>
              ) : (
                <>
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Notifications</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
