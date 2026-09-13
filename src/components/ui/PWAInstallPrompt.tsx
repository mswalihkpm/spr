'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Share,
  PlusSquare,
  X,
  Smartphone,
  CheckCircle2,
  Download,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Laptop,
} from 'lucide-react';

export default function PWAInstallPrompt() {
  const [isIOS, setIsIOS] = useState(false);
  const [isMacSafari, setIsMacSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Check if already installed & running in standalone PWA mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isRunningStandalone);

    // 2. Detect Apple iOS (iPhone, iPad, iPod)
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);

    const isSafari =
      /safari/.test(ua) && !/chrome|crios|crmo|firefox|fxios|edg|opr|opera/.test(ua);

    const isMac = /macintosh|mac os x/.test(ua) && !isIOSDevice;

    setIsIOS(isIOSDevice);
    setIsMacSafari(isMac && isSafari);

    // 3. Listen for Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Show automatic non-intrusive prompt on iOS/Safari after 3.5 seconds if not standalone and not dismissed recently
    if (!isRunningStandalone) {
      const dismissedTime = localStorage.getItem('spr_pwa_dismissed_at');
      const now = Date.now();
      // If never dismissed, or dismissed more than 3 days ago, show smart banner
      if (!dismissedTime || now - parseInt(dismissedTime, 10) > 3 * 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          setBannerVisible(true);
        }, 3500);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for custom trigger from any "Install App" button on page
  useEffect(() => {
    const handleOpenTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            setDeferredPrompt(null);
            setBannerVisible(false);
          }
        });
      } else {
        setModalOpen(true);
      }
    };

    window.addEventListener('spr-open-pwa-install', handleOpenTrigger);
    return () => {
      window.removeEventListener('spr-open-pwa-install', handleOpenTrigger);
    };
  }, [deferredPrompt]);

  const handleDismissBanner = () => {
    setBannerVisible(false);
    localStorage.setItem('spr_pwa_dismissed_at', Date.now().toString());
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          setDeferredPrompt(null);
          setBannerVisible(false);
        }
      });
    } else {
      setModalOpen(true);
    }
  };

  if (!mounted || isStandalone) return null;

  return (
    <>
      {/* 1. Floating Bottom Banner on Mobile / iOS */}
      {bannerVisible && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-in">
          <div className="bg-gradient-to-r from-slate-950 via-madin-950 to-blue-950 text-white p-4 rounded-2xl shadow-2xl border border-gold-400/30 backdrop-blur-lg flex items-center justify-between gap-3.5 ring-1 ring-white/10">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white p-1 border border-gold-400/50 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                <Image
                  src="/apple-touch-icon.png"
                  alt="SPR App Icon"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain rounded-lg"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black tracking-tight text-white truncate">
                    SPR Platform App
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-gold-400 text-slate-950">
                    {isIOS ? 'Apple iOS' : 'PWA App'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-200 truncate mt-0.5">
                  {isIOS
                    ? 'Add to Apple Home Screen for instant offline access'
                    : 'Install standalone app for instant fast performance'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={handleInstallClick}
                className="px-3.5 py-2 bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition hover:scale-105 active:scale-95 flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5 text-slate-950" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismissBanner}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Apple iOS / Mac / Android Installation Instructions Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-5">
            {/* Top decorative gradient */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-madin-900"></div>

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 p-1.5 border-2 border-gold-400 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/apple-touch-icon.png"
                    alt="SPR App Icon"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 mb-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Official Apple &amp; Mobile PWA</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Install SPR on Your Device
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Apple iOS Step-by-Step Installation Guide */}
            {isIOS ? (
              <div className="space-y-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>How to Install on Apple iPhone &amp; iPad Safari:</span>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  {/* Step 1 */}
                  <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Tap the <span className="text-blue-600 font-black">Share button</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                        <span>Look for the</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-blue-600">
                          <Share className="w-3 h-3 inline mr-1" /> Share icon
                        </span>
                        <span>in Safari&apos;s bottom toolbar (or top right on iPad).</span>
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Scroll down &amp; tap <span className="text-indigo-600 font-black">&quot;Add to Home Screen&quot;</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                        <span>Select the</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-bold text-slate-800">
                          <PlusSquare className="w-3 h-3 inline mr-1 text-slate-700" /> Add to Home Screen
                        </span>
                        <span>option.</span>
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        Tap <span className="text-emerald-700 font-black">&quot;Add&quot;</span> in the top right corner
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        The SPR App will appear immediately on your Home Screen as a standalone fullscreen app!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isMacSafari ? (
              /* macOS Safari Guide */
              <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                  <Laptop className="w-4 h-4 text-blue-600" />
                  <span>How to Install on Apple Mac (macOS Safari):</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <p className="font-bold text-slate-900">
                      1. Click <span className="text-blue-600 font-black">File</span> in the Mac menu bar or tap the <Share className="w-3 h-3 inline text-blue-600" /> Share icon.
                    </p>
                    <p className="font-bold text-slate-900">
                      2. Choose <span className="text-indigo-600 font-black">&quot;Add to Dock...&quot;</span>
                    </p>
                    <p className="font-bold text-slate-900">
                      3. Click <span className="text-emerald-700 font-black">&quot;Add&quot;</span> to launch SPR from your Mac Dock.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Windows / Chrome Guide */
              <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Install SPR as a standalone progressive web application for instant loading, full offline capability, and quick one-tap access.
                </p>

                {deferredPrompt ? (
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 bg-madin-900 hover:bg-madin-950 text-white rounded-2xl text-xs font-bold shadow-md flex items-center justify-center space-x-2 transition hover:scale-105 active:scale-95"
                  >
                    <Download className="w-4 h-4 text-gold-400" />
                    <span>Install SPR App Now</span>
                  </button>
                ) : (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">In your browser menu (⋮):</p>
                    <p>Tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</p>
                  </div>
                )}
              </div>
            )}

            {/* PWA Benefits Checklist */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Lightning Fast Standalone</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Full Offline Access</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Full Screen Experience</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Zero Storage Overhead</span>
              </div>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                Got It, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
