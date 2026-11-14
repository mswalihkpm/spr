/**
 * Safe Browser-Side Supabase Client for Public Reference Data
 * 
 * Objectives:
 * 1. Uses EXCLUSIVELY public anon/publishable credentials.
 * 2. Never references or bundles service-role keys.
 * 3. Disables auth session persistence (stateless public queries).
 * 4. Safe for browser bundles, Web, Android TWA, and PWA runtimes.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let browserClientInstance: SupabaseClient | null = null;

export function getPublicSupabaseConfig() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.TARGET_SUPABASE_URL ||
    '';

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.TARGET_SUPABASE_ANON_KEY ||
    '';

  return { url: url.trim(), anonKey: anonKey.trim() };
}

export function isSupabaseBrowserConfigured(): boolean {
  const { url, anonKey } = getPublicSupabaseConfig();
  return Boolean(url && anonKey);
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (browserClientInstance) {
    return browserClientInstance;
  }

  const { url, anonKey } = getPublicSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  browserClientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-client-info': 'spr-web-phase1',
      },
    },
  });

  return browserClientInstance;
}
