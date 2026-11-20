/**
 * SPR Push Notification System - Firebase Web Client Module
 *
 * Safe client-side initialisation for Firebase App and Cloud Messaging.
 *
 * Guarantees:
 * 1. Uses exclusively public NEXT_PUBLIC_FIREBASE_* environment variables.
 * 2. Never references, logs, or bundles private Firebase Admin credentials.
 * 3. Reuses existing FirebaseApp instances to prevent duplicate initialisation warnings.
 * 4. Safe for SSR and Next.js server-side rendering (guards browser-only APIs).
 * 5. Does NOT request notification permissions automatically.
 * 6. Does NOT register a secondary service worker (attaches to existing /sw.js in later stages).
 * 7. Gracefully detects unsupported browser environments (e.g. Safari < 16.4, insecure contexts).
 */

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getMessaging, isSupported, type Messaging } from 'firebase/messaging';

/**
 * Public Firebase configuration retrieved from NEXT_PUBLIC_ environment variables.
 */
export const firebaseClientConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
};

/**
 * Validates whether the essential public Firebase credentials are present.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseClientConfig.apiKey &&
    firebaseClientConfig.projectId &&
    firebaseClientConfig.messagingSenderId &&
    firebaseClientConfig.appId
  );
}

/**
 * Retrieves the public VAPID key (Web Push certificate key) for FCM push subscription.
 */
export function getVapidKey(): string | null {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  return vapidKey || null;
}

/**
 * Retrieves or initialises the singleton Firebase App instance on the client.
 * Returns null if required configuration is missing or during SSR when uninitialised.
 */
export function getFirebaseApp(): FirebaseApp | null {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  try {
    return initializeApp(firebaseClientConfig);
  } catch {
    // If another component initialised concurrently, return the existing app
    const apps = getApps();
    return apps.length > 0 ? apps[0] : null;
  }
}

/**
 * Checks whether Firebase Cloud Messaging is supported in the current runtime environment.
 * Evaluates IndexedDB, Service Worker, and PushManager availability.
 * Always resolves to false in server-side rendering (SSR) environments.
 */
export async function isMessagingSupported(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return await isSupported();
  } catch {
    return false;
  }
}

let cachedMessagingInstance: Messaging | null = null;

/**
 * Retrieves the Firebase Cloud Messaging client instance.
 *
 * Guarantees:
 * - Returns null during server-side rendering.
 * - Returns null if the browser does not support Web Push / FCM.
 * - Returns null if Firebase client configuration is missing.
 * - Reuses the existing Messaging instance without duplicate listeners.
 * - Does NOT trigger notification permission prompts.
 */
export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (cachedMessagingInstance) {
    return cachedMessagingInstance;
  }

  const supported = await isMessagingSupported();
  if (!supported) {
    return null;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  try {
    cachedMessagingInstance = getMessaging(app);
    return cachedMessagingInstance;
  } catch {
    return null;
  }
}

export interface ForegroundMessagePayload {
  title: string;
  body: string;
  url?: string;
  category?: string;
  tag?: string;
}

/**
 * Registers an observer for Firebase Cloud Messaging push events received while
 * the web application is actively in the foreground.
 *
 * Guarantees:
 * 1. Safe during SSR (returns a no-op cleanup).
 * 2. Dynamically loads onMessage from firebase/messaging.
 * 3. Sanitises raw payload properties before invoking callback.
 * 4. Returns an unsubscribe cleanup function.
 */
export function registerForegroundMessageHandler(
  onMessageReceived: (payload: ForegroundMessagePayload) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let isCleanedUp = false;
  let unsubscribeFn: (() => void) | null = null;

  getFirebaseMessaging().then(async (messaging) => {
    if (!messaging || isCleanedUp) return;

    try {
      const { onMessage } = await import('firebase/messaging');
      if (isCleanedUp) return;

      unsubscribeFn = onMessage(messaging, (payload) => {
        const rawNotification = payload.notification || {};
        const customData = payload.data || {};

        const title =
          rawNotification.title ||
          customData.title ||
          'SPR Madin Notification';
        const body =
          rawNotification.body ||
          customData.body ||
          'You have a new update in your student portal.';
        const url = customData.url || customData.deepLink || '/student/dashboard';
        const category = customData.category || 'GENERAL';
        const tag = customData.tag || 'spr-notification';

        onMessageReceived({
          title: String(title).slice(0, 100),
          body: String(body).slice(0, 500),
          url: String(url),
          category: String(category),
          tag: String(tag),
        });
      });
    } catch (err) {
      console.warn('Could not register foreground message listener:', err);
    }
  });

  return () => {
    isCleanedUp = true;
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
}
