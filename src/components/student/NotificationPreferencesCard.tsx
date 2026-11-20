'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  BookOpen,
  GraduationCap,
  CheckSquare,
  Megaphone,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  getFirebaseMessaging,
  getVapidKey,
  isMessagingSupported,
} from '@/lib/firebase-client';

interface Preferences {
  academicAlerts: boolean;
  examAlerts: boolean;
  taskAlerts: boolean;
  announcements: boolean;
}

export default function NotificationPreferencesCard() {
  // Notification category preferences
  const [preferences, setPreferences] = useState<Preferences>({
    academicAlerts: true,
    examAlerts: true,
    taskAlerts: true,
    announcements: true,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  // Device push registration state
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceType, setDeviceType] = useState<string>('WEB');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Helper to detect device client category
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

  // Fetch student preferences from server
  const fetchPreferences = useCallback(async () => {
    try {
      setLoadingPrefs(true);
      setPrefError(null);
      const res = await fetch('/api/notifications/preferences');
      if (res.status === 401 || res.status === 403) {
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load notification preferences.');
      }
      if (json.preferences) {
        setPreferences(json.preferences);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading notification preferences.';
      setPrefError(msg);
    } finally {
      setLoadingPrefs(false);
    }
  }, []);

  // Check browser push support and existing device permission with server verification
  useEffect(() => {
    setDeviceType(detectDeviceType());

    async function checkSupport() {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        setIsSupported(false);
        setPermission('unsupported');
        setIsSubscribed(false);
        return;
      }

      const supported = await isMessagingSupported();
      setIsSupported(supported);

      if (!supported) {
        setPermission('unsupported');
        setIsSubscribed(false);
        return;
      }

      const currentPerm = Notification.permission;
      setPermission(currentPerm);

      // Verify server subscription status rather than blindly trusting local state
      if (currentPerm === 'granted') {
        setIsVerifying(true);
        try {
          const cachedToken = localStorage.getItem('spr_fcm_token');
          if (cachedToken) {
            const res = await fetch(`/api/notifications/subscribe?fcmToken=${encodeURIComponent(cachedToken)}`);
            if (res.ok) {
              const json = await res.json();
              setIsSubscribed(Boolean(json.isSubscribed));
              if (json.deviceType) setDeviceType(json.deviceType);
            } else {
              setIsSubscribed(false);
            }
          } else {
            // Permission granted in browser, but no cached token: verify if account has any active subscription
            const res = await fetch('/api/notifications/subscribe');
            if (res.ok) {
              const json = await res.json();
              setIsSubscribed(Boolean(json.isSubscribed));
            } else {
              setIsSubscribed(false);
            }
          }
        } catch {
          setIsSubscribed(false);
        } finally {
          setIsVerifying(false);
        }
      } else {
        setIsSubscribed(false);
      }
    }

    checkSupport();
    fetchPreferences();
  }, [detectDeviceType, fetchPreferences]);

  // Handle individual preference toggle
  const handleToggle = async (key: keyof Preferences) => {
    const previousValue = preferences[key];
    const newValue = !previousValue;

    // Optimistic UI update
    setPreferences((prev) => ({ ...prev, [key]: newValue }));
    setSavingField(key);
    setPrefError(null);
    setPrefSuccess(null);

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to update preference.');
      }

      setPrefSuccess('Preference updated');
      setTimeout(() => setPrefSuccess(null), 3000);
    } catch (err: unknown) {
      // Revert optimistic update on failure
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      const msg = err instanceof Error ? err.message : 'Error updating preference.';
      setPrefError(msg);
    } finally {
      setSavingField(null);
    }
  };

  // User-initiated Push Notification Enable Flow
  const handleEnablePush = async () => {
    if (isRegistering) return; // Prevent duplicate concurrent requests
    setRegError(null);
    setRegSuccess(null);
    setIsRegistering(true);

    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Notifications are not supported in this browser.');
      }

      // 1. Explicit user prompt (if default) or permission confirmation
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        if (perm === 'denied') {
          setRegError(
            'Notifications were blocked. Please enable notification permissions for SPR in your browser site settings or device application settings.'
          );
        }
        setIsRegistering(false);
        return;
      }

      // 2. Initialise Firebase Messaging safely
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        throw new Error(
          'Push notifications are not configured or supported in this browser environment.'
        );
      }

      // 3. Ensure Service Worker is active
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker is required for push notifications.');
      }
      const registration = await navigator.serviceWorker.ready;

      // 4. Retrieve FCM registration token
      const { getToken } = await import('firebase/messaging');
      const vapidKey = getVapidKey();

      const currentToken = await getToken(messaging, {
        vapidKey: vapidKey || undefined,
        serviceWorkerRegistration: registration,
      });

      if (!currentToken) {
        throw new Error('Unable to obtain a push registration token from Google Firebase.');
      }

      // 5. Send registration token to server
      const devType = detectDeviceType();
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fcmToken: currentToken,
          deviceType: devType,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('This device token belongs to a staff account and cannot be registered to a student account.');
        }
        if (res.status === 401) {
          throw new Error('Your session has expired. Please sign in again.');
        }
        throw new Error(json.error || 'Server rejected push registration.');
      }

      localStorage.setItem('spr_fcm_token', currentToken);
      setIsSubscribed(true);
      setRegSuccess('Push notifications enabled successfully for this device!');
      setTimeout(() => setRegSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error enabling push notifications.';
      setRegError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  // User-initiated Push Notification Disable Flow
  const handleDisablePush = async () => {
    if (isRegistering) return; // Prevent duplicate concurrent requests
    setRegError(null);
    setRegSuccess(null);
    setIsRegistering(true);

    try {
      let token = localStorage.getItem('spr_fcm_token');

      // If token not in local storage cache, attempt to resolve from Firebase messaging
      if (!token) {
        try {
          const messaging = await getFirebaseMessaging();
          if (messaging && 'serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            const { getToken } = await import('firebase/messaging');
            const vapidKey = getVapidKey();
            token = await getToken(messaging, {
              vapidKey: vapidKey || undefined,
              serviceWorkerRegistration: registration,
            });
          }
        } catch {
          // If no token can be resolved, mark unsubscribed
        }
      }

      if (!token) {
        setIsSubscribed(false);
        setRegSuccess('Push notifications disabled.');
        setTimeout(() => setRegSuccess(null), 4000);
        setIsRegistering(false);
        return;
      }

      // 1. Deactivate subscription on the server FIRST
      const res = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: token }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Server rejected or network failed: do NOT delete local token so user can retry
        throw new Error(
          json.error || 'Failed to deactivate subscription on server. Please check your connection and retry.'
        );
      }

      // 2. Server deactivation confirmed: update state
      setIsSubscribed(false);

      // 3. Delete local Firebase token
      let localCleanupError = false;
      try {
        const messaging = await getFirebaseMessaging();
        if (messaging) {
          const { deleteToken } = await import('firebase/messaging');
          await deleteToken(messaging);
        }
      } catch (cleanupErr) {
        localCleanupError = true;
        console.warn('Local FCM token deletion warning:', cleanupErr);
      }

      // Clear local cache token
      localStorage.removeItem('spr_fcm_token');

      if (localCleanupError) {
        setRegSuccess(
          'Push notifications disabled on the server. Local browser token cleanup had an issue, but notifications are safely stopped.'
        );
      } else {
        setRegSuccess('Push notifications disabled for this device.');
      }
      setTimeout(() => setRegSuccess(null), 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error disabling push notifications.';
      setRegError(msg);
    } finally {
      setIsRegistering(false);
    }
  };

  const preferenceItems = [
    {
      key: 'academicAlerts' as const,
      label: 'Academic Alerts',
      description: 'Exam marks publication, term score updates, and formal report card releases.',
      icon: BookOpen,
      iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60',
    },
    {
      key: 'examAlerts' as const,
      label: 'Exam & Schedule Alerts',
      description: 'Examination dates, timetable announcements, seating halls, and schedule changes.',
      icon: GraduationCap,
      iconColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60',
    },
    {
      key: 'taskAlerts' as const,
      label: 'Task & Activity Updates',
      description: 'New assignment releases, submission approvals, status changes, and SPR point credits.',
      icon: CheckSquare,
      iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      key: 'announcements' as const,
      label: 'Institutional Announcements',
      description: 'School circulars, campus event notices, literary program updates, and urgent alerts.',
      icon: Megaphone,
      iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Push Notifications &amp; Alerts</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure device alerts, institutional circulars, and academic updates.
            </p>
          </div>
        </div>

        {/* Global Success / Saving Indicator */}
        {prefSuccess && (
          <span className="self-start sm:self-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center space-x-1.5 animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{prefSuccess}</span>
          </span>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          SECTION 1: DEVICE PUSH SUBSCRIPTION STATUS & PERMISSION FLOW
          --------------------------------------------------------------------- */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  This Device Status
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  {deviceType === 'ANDROID_TWA' ? 'Android TWA' : deviceType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {isSubscribed
                  ? 'Push notifications are actively configured and receiving alerts on this browser.'
                  : permission === 'denied'
                  ? 'Notifications are blocked in your browser site permissions.'
                  : isSupported === false
                  ? 'Web Push notifications are not supported in this browser environment.'
                  : 'Receive instant alerts on your lock-screen and device even when the app is closed.'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="shrink-0">
            {isVerifying ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                <span>Checking...</span>
              </span>
            ) : isSubscribed ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Active</span>
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <BellOff className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                <span>Blocked</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                <Bell className="w-3 h-3 text-slate-500" />
                <span>Not Enabled</span>
              </span>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {regError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
            <span className="font-medium">{regError}</span>
          </div>
        )}

        {regSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold">{regSuccess}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-2.5">
          {!isSubscribed && permission !== 'denied' && isSupported !== false && (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isRegistering}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enabling Push...</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  <span>Enable Push Notifications</span>
                </>
              )}
            </button>
          )}

          {isSubscribed && (
            <button
              type="button"
              onClick={handleDisablePush}
              disabled={isRegistering}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Device...</span>
                </>
              ) : (
                <>
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Disable on This Device</span>
                </>
              )}
            </button>
          )}

          <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 ml-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Zero lock-screen marks or sensitive data</span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          SECTION 2: NOTIFICATION CATEGORIES PREFERENCES
          --------------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
            Alert Categories
          </h3>
          <button
            type="button"
            onClick={fetchPreferences}
            disabled={loadingPrefs}
            className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-semibold cursor-pointer disabled:opacity-50"
            title="Refresh preferences"
          >
            <RefreshCw className={`w-3 h-3 ${loadingPrefs ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {prefError && (
          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{prefError}</span>
          </div>
        )}

        {loadingPrefs ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading preferences...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {preferenceItems.map((item) => {
              const Icon = item.icon;
              const isChecked = preferences[item.key];
              const isSaving = savingField === item.key;

              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start space-x-3 pr-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.label}
                        </span>
                        {isSaving && (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isChecked}
                    disabled={isSaving}
                    onClick={() => handleToggle(item.key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50 ${
                      isChecked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className="sr-only">Toggle {item.label}</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isChecked ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Institutional Privacy & Security Note */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start space-x-2 text-[11px] text-slate-400 dark:text-slate-500">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Notification preferences apply institutional wide across all devices where you sign in. Push registration binds securely to your verified session.
        </span>
      </div>
    </div>
  );
}
