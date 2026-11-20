/**
 * SPR Push Notification System - Firebase Admin Server Module
 *
 * Server-side initialisation for Firebase Admin SDK and Cloud Messaging dispatch.
 *
 * Guarantees:
 * 1. Initialises strictly in server runtimes (throws if imported or invoked on the client).
 * 2. Reuses existing Admin App instances to prevent duplicate initialisation in Vercel serverless cold starts.
 * 3. Reads exclusively:
 *    - FIREBASE_PROJECT_ID
 *    - FIREBASE_CLIENT_EMAIL
 *    - FIREBASE_PRIVATE_KEY
 * 4. Correctly unescapes newline characters (`\n`) in private keys formatted as single-line env vars.
 * 5. Validates missing configuration with safe error messages (never logs or exposes credential values).
 * 6. Never exposes private admin credentials to the client bundle.
 */

import 'server-only';

import { initializeApp, getApps, getApp, cert, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

const ADMIN_APP_NAME = 'spr-firebase-admin';

let cachedAdminApp: App | null = null;
let cachedAdminMessaging: Messaging | null = null;

/**
 * Validates whether all required Firebase Admin environment variables are defined.
 * Safe to call at runtime; does not log or return credential contents.
 */
export function isFirebaseAdminConfigured(): boolean {
  if (typeof window !== 'undefined') {
    return false;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  return Boolean(projectId && clientEmail && privateKey);
}

/**
 * Normalises a private key from environment variables, replacing literal `\n` with real newlines.
 * Never logs or prints the key.
 */
function formatPrivateKey(rawKey: string): string {
  // Strip surrounding quotes if present in env configuration
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\n/g, '\n');
}

/**
 * Retrieves or initialises the singleton Firebase Admin App instance.
 *
 * @throws Error if invoked in a browser environment.
 * @throws Error if any required environment variable is missing.
 */
export function getFirebaseAdminApp(): App {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin SDK cannot be executed in browser environments.');
  }

  if (cachedAdminApp) {
    return cachedAdminApp;
  }

  // Check if an app with our specific name or default name was already initialised
  const existingApps = getApps();
  const existingApp =
    existingApps.find((app) => app.name === ADMIN_APP_NAME) ||
    existingApps.find((app) => app.name === '[DEFAULT]') ||
    (existingApps.length > 0 ? existingApps[0] : null);

  if (existingApp) {
    cachedAdminApp = existingApp;
    return cachedAdminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  const missingKeys: string[] = [];
  if (!projectId) missingKeys.push('FIREBASE_PROJECT_ID');
  if (!clientEmail) missingKeys.push('FIREBASE_CLIENT_EMAIL');
  if (!privateKey) missingKeys.push('FIREBASE_PRIVATE_KEY');

  if (missingKeys.length > 0) {
    throw new Error(
      `Firebase Admin initialisation failed: missing required environment variable(s): ${missingKeys.join(', ')}. ` +
      'Please verify that your Vercel server environment variables are configured.'
    );
  }

  try {
    const formattedKey = formatPrivateKey(privateKey!);

    cachedAdminApp = initializeApp(
      {
        credential: cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: formattedKey,
        }),
      },
      ADMIN_APP_NAME
    );

    return cachedAdminApp;
  } catch (err: unknown) {
    // If concurrent requests initialised the app, reuse it
    const apps = getApps();
    const app = apps.find((a) => a.name === ADMIN_APP_NAME) || apps[0];
    if (app) {
      cachedAdminApp = app;
      return cachedAdminApp;
    }

    const message = err instanceof Error ? err.message : 'Unknown error during Firebase Admin initialisation';
    throw new Error(`Firebase Admin initialisation failed: ${message}`);
  }
}

/**
 * Retrieves the Firebase Admin Cloud Messaging instance for server-side push dispatch.
 *
 * @throws Error if invoked in a browser environment.
 * @throws Error if Firebase Admin configuration is missing.
 */
export function getFirebaseAdminMessaging(): Messaging {
  if (typeof window !== 'undefined') {
    throw new Error('Firebase Admin Messaging cannot be executed in browser environments.');
  }

  if (cachedAdminMessaging) {
    return cachedAdminMessaging;
  }

  const app = getFirebaseAdminApp();
  cachedAdminMessaging = getMessaging(app);
  return cachedAdminMessaging;
}
