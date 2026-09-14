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
  Layers,
  Zap,
} from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';

export default function PWAInstallPrompt() {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    isSafari,
    isMac,
    canPromptDirectly,
    triggerInstall,
  } = usePWAInstall();

  const [modalOpen, setModalOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('android');

  useEffect(() => {
    setMounted(true);

    // Set initial tab based on device
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    // Show floating banner if not installed and not dismissed in the last 2 days
    if (!isInstalled) {
      const dismissedTime = localStorage.getItem('spr_pwa_dismissed_at');
      const now = Date.now();
      if (!dismissedTime || now - parseInt(dismissedTime, 10) > 2 * 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          setBannerVisible(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstalled, isIOS, isAndroid]);

  // Listen for custom trigger from any button across the app
  useEffect(() => {
    const handleOpenTrigger = async () => {
      if (canPromptDirectly) {
        const res = await triggerInstall();
        if (res.fallbackToGuide) {
          setModalOpen(true);
        }
      } else {
        setModalOpen(true);
      }
    };

    window.addEventListener('spr-open-pwa-install', handleOpenTrigger);
    return () => {
      window.removeEventListener('spr-open-pwa-install', handleOpenTrigger);
    };
  }, [canPromptDirectly, triggerInstall]);

  const handleDismissBanner = () => {
    setBannerVisible(false);
    localStorage.setItem('spr_pwa_dismissed_at', Date.now().toString());
  };

  const handleInstallAction = async () => {
    if (canPromptDirectly) {
      const res = await triggerInstall();
      if (res.success) {
        setBannerVisible(false);
        setModalOpen(false);
      } else if (res.fallbackToGuide) {
        setModalOpen(true);
      }
    } else {
      setModalOpen(true);
    }
  };

  if (!mounted || isInstalled) return null;

  return (
    <>
      {/* 1. Floating Smart Banner */}
      {bannerVisible && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-in">
          <div className="bg-gradient-to-r from-slate-950 via-madin-950 to-blue-950 text-white p-4 rounded-2xl shadow-2xl border border-amber-400/40 backdrop-blur-xl flex items-center justify-between gap-3.5 ring-1 ring-white/15">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-white/10 p-1 border border-amber-400/50 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                <Image
                  src="/pwa-logo.png"
                  alt="SPR App Icon"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black tracking-tight text-white truncate">
                    SPR Platform App
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-950 tracking-wide">
                    {isIOS ? 'Apple iOS' : isAndroid ? 'Android PWA' : 'Fast App'}
                  </span>
                </div>
                <p className="text-[11px] text-blue-200 truncate mt-0.5 font-medium">
                  {isIOS
                    ? 'Add to iPhone/iPad Home Screen'
                    : isAndroid
                    ? 'Install native Android application'
                    : 'Install standalone app for instant access'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={handleInstallAction}
                type="button"
                className="px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                <span>Install</span>
              </button>
              <button
                onClick={handleDismissBanner}
                type="button"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Installation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative overflow-hidden space-y-5">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-amber-500 to-madin-900" />

            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 p-1.5 border-2 border-amber-400 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/pwa-logo.png"
                    alt="SPR App Icon"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 mb-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Official Android &amp; Apple PWA</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    Install SPR Platform App
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                type="button"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex p-1 bg-slate-100 rounded-xl space-x-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'android'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'ios'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>Apple iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('desktop')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'desktop'
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-slate-700" />
                <span>Desktop / Mac</span>
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === 'android' && (
              <div className="space-y-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between text-xs font-black text-slate-900">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Android Chrome / Samsung Internet:</span>
                  </div>
                </div>

                {canPromptDirectly ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                      Direct 1-tap installation is available for your Android device!
                    </p>
                    <button
                      type="button"
                      onClick={handleInstallAction}
                      className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center space-x-2 transition hover:scale-[1.02] active:scale-95"
                    >
                      <Download className="w-4 h-4 text-white stroke-[2.5]" />
                      <span>Install SPR Android App Now</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          Tap the browser menu <span className="text-emerald-700 font-black">(⋮ or ⋯)</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Located in the top right or bottom bar of Chrome / Samsung Internet.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          Tap <span className="text-emerald-700 font-black">&quot;Install app&quot;</span> or <span className="text-emerald-700 font-black">&quot;Add to Home screen&quot;</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          SPR will install directly onto your home screen with the app icon.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ios' && (
              <div className="space-y-3.5 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <span>Apple iPhone &amp; iPad Safari:</span>
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
                        <span>in Safari bottom toolbar (or top right on iPad).</span>
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
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                  <Laptop className="w-4 h-4 text-slate-800" />
                  <span>Desktop Chrome, Edge &amp; Apple Mac Safari:</span>
                </div>

                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                    <p className="font-bold text-slate-900">
                      1. In Chrome / Edge: Click the <Download className="w-3 h-3 inline text-blue-600" /> <strong>Install icon</strong> in your browser address bar.
                    </p>
                    <p className="font-bold text-slate-900">
                      2. In Mac Safari: Click <span className="text-blue-600">File</span> &gt; <span className="text-indigo-600">&quot;Add to Dock...&quot;</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PWA Benefits Checklist */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Standalone Native Feel</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Offline Support</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Instant High Speed</span>
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
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-950 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
