'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sparkles, X, ArrowUpCircle, CheckCircle } from 'lucide-react';

export default function AppUpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [latestVersionInfo, setLatestVersionInfo] = useState<{
    version?: string;
    buildId?: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Check for app updates via API and ServiceWorker
  const checkForUpdates = useCallback(async () => {
    try {
      // 1. Fetch latest server build information
      const res = await fetch(`/api/app-version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Pragma: 'no-cache', 'Cache-Control': 'no-cache' },
      });

      if (res.ok) {
        const data = await res.json();
        const serverBuild = data.buildId || data.version;

        if (serverBuild && typeof window !== 'undefined') {
          const storedBuild = localStorage.getItem('spr_app_version_build');

          if (!storedBuild) {
            // Initial save on first app opening
            localStorage.setItem('spr_app_version_build', serverBuild);
          } else if (storedBuild !== serverBuild) {
            // New version detected on server
            setLatestVersionInfo({ version: data.version, buildId: serverBuild });
            setUpdateAvailable(true);
            return;
          }
        }
      }
    } catch {
      // Silently proceed if network is temporarily unavailable
    }

    // 2. Check ServiceWorker registration update
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          reg.update().catch(() => {});

          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            setUpdateAvailable(true);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setWaitingWorker(newWorker);
                  setUpdateAvailable(true);
                }
              });
            }
          });
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    // Initial check on app opening after a gentle delay
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 1500);

    // Re-check when user focuses back to the window
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkForUpdates);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, [checkForUpdates]);

  const handleUpdateNow = async () => {
    setIsUpdating(true);

    try {
      // 1. Tell service worker to activate new version
      if (waitingWorker) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Clear browser cache storage
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch {}
      }

      // 3. Mark the new build version in localStorage so the notification stops
      if (latestVersionInfo?.buildId) {
        localStorage.setItem('spr_app_version_build', latestVersionInfo.buildId);
      }

      // 4. Reload the application
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="App update notification"
      className="fixed top-3 inset-x-3 sm:top-5 sm:inset-x-auto sm:right-5 z-50 max-w-md mx-auto sm:mx-0 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-amber-400/40 text-white rounded-2xl shadow-2xl p-4 sm:p-4.5 overflow-hidden relative group">
        {/* Glow accent */}
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/20 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          {/* Icon Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-5 h-5 animate-spin-slow" />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Update Ready
              </span>
              {latestVersionInfo?.version && (
                <span className="text-[11px] text-slate-400 font-mono">v{latestVersionInfo.version}</span>
              )}
            </div>

            <h2 className="text-sm font-bold text-white tracking-tight leading-snug">
              New Update Available
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              A newer version of SPR is ready with the latest performance and UI upgrades.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3.5">
              <button
                type="button"
                onClick={handleUpdateNow}
                disabled={isUpdating}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-75 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating SPR...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update Now</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDismissed(true)}
                disabled={isUpdating}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss update notification"
            className="absolute top-0 right-0 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
