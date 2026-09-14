'use client';

import { useState, useEffect, useCallback } from 'react';

// Extend window for global deferred prompt caching
declare global {
  interface Window {
    __deferredPrompt?: any;
    __pwaInstalled?: boolean;
  }
}

export interface PWAInstallState {
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isMac: boolean;
  canPromptDirectly: boolean;
  hasDeferredPrompt: boolean;
  triggerInstall: () => Promise<{ success: boolean; fallbackToGuide: boolean; outcome?: string }>;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // 1. Detect platform
    const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (typeof window !== 'undefined' &&
        window.navigator.platform === 'MacIntel' &&
        window.navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(ua);
    const isSafariBrowser =
      /safari/.test(ua) && !/chrome|crios|crmo|firefox|fxios|edg|opr|opera/.test(ua);
    const isMacDevice = /macintosh|mac os x/.test(ua) && !isIOSDevice;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsSafari(isSafariBrowser);
    setIsMac(isMacDevice);

    // 2. Check if already installed / standalone
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        window.__pwaInstalled === true);

    if (isStandalone) {
      setIsInstalled(true);
    }

    // 3. Pick up any existing early-captured prompt from layout.tsx
    if (typeof window !== 'undefined' && window.__deferredPrompt) {
      setDeferredPrompt(window.__deferredPrompt);
    }

    // 4. Event listener for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setDeferredPrompt(e);
    };

    // 5. Custom event listener from root layout script
    const handleDeferredReady = (e: any) => {
      const prompt = e.detail || window.__deferredPrompt;
      if (prompt) {
        setDeferredPrompt(prompt);
      }
    };

    // 6. App installed listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      window.__pwaInstalled = true;
      window.__deferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('spr-deferred-prompt-ready', handleDeferredReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('spr-app-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('spr-deferred-prompt-ready', handleDeferredReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('spr-app-installed', handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__deferredPrompt : null);

    if (promptEvent && typeof promptEvent.prompt === 'function') {
      try {
        await promptEvent.prompt();
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          if (typeof window !== 'undefined') {
            window.__deferredPrompt = null;
            window.__pwaInstalled = true;
          }
          setDeferredPrompt(null);
          return { success: true, fallbackToGuide: false, outcome: 'accepted' };
        }
        return { success: false, fallbackToGuide: false, outcome: 'dismissed' };
      } catch (err) {
        console.warn('PWA prompt error:', err);
        return { success: false, fallbackToGuide: true };
      }
    }

    // Fallback for iOS or browsers without direct JS prompt API
    return { success: false, fallbackToGuide: true };
  }, [deferredPrompt]);

  return {
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isMac,
    canPromptDirectly: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPrompt)),
    hasDeferredPrompt: Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__deferredPrompt)),
    triggerInstall,
  };
}
