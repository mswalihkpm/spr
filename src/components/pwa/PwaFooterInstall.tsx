'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Download, CheckCircle2, X, Share2, PlusSquare, Sparkles, Smartphone, Laptop } from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';

export default function PwaFooterInstall() {
  const {
    isInstalled,
    isIOS,
    isAndroid,
    canPromptDirectly,
    triggerInstall,
  } = usePWAInstall();

  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const handleInstallClick = async () => {
    if (canPromptDirectly) {
      const result = await triggerInstall();
      if (result.success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 5000);
      } else if (result.fallbackToGuide) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <div className="flex items-center">
        {isInstalled ? (
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] tracking-tight">SPR App Installed</span>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            type="button"
            className="group relative inline-flex items-center space-x-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-blue-900/60 to-slate-900/90 hover:from-blue-800/80 hover:to-slate-800 text-white border border-blue-500/30 hover:border-blue-400/60 transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-95 text-left cursor-pointer"
            title="Install SPR App on Mobile / Desktop"
          >
            {/* PWA Logo */}
            <div className="w-6 h-6 rounded-lg bg-white/10 p-0.5 border border-white/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Image
                src="/pwa-logo.png"
                alt="SPR App Logo"
                width={24}
                height={24}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold text-slate-100 tracking-tight group-hover:text-blue-200 transition-colors">
                  Install SPR App
                </span>
                <Download className="w-3 h-3 text-blue-400 group-hover:translate-y-0.5 transition-transform" />
              </div>
              <span className="text-[9px] text-slate-400 leading-none">
                {isAndroid ? 'Android PWA' : isIOS ? 'Apple iOS' : 'Fast & Offline'}
              </span>
            </div>
          </button>
        )}
      </div>

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-500/50 flex items-center space-x-2.5 animate-bounce text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>SPR App installed successfully! Access it directly from your home screen.</span>
        </div>
      )}

      {/* PWA Installation Instructions Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 text-slate-100 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-700/80 relative space-y-5 animate-zoom-up">
            {/* Close button */}
            <button
              onClick={() => setShowGuideModal(false)}
              type="button"
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header with PWA Logo */}
            <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-white/10 p-1.5 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
                <Image
                  src="/pwa-logo.png"
                  alt="SPR App Logo"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center space-x-1.5">
                  <span>Install SPR Madin App</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400">
                  Madin School of Excellence • Student Performance Rate
                </p>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 text-xs">
              {isIOS ? (
                <>
                  <p className="text-slate-300 font-medium">
                    To install the app on your Apple iPhone or iPad:
                  </p>
                  <div className="space-y-2.5">
                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Tap the <strong className="text-white">Share</strong> icon <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> in Safari bottom toolbar.
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Scroll down and tap <strong className="text-white">&quot;Add to Home Screen&quot;</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Tap <strong className="text-white">&quot;Add&quot;</strong> in the top-right corner to finish.
                      </div>
                    </div>
                  </div>
                </>
              ) : isAndroid ? (
                <>
                  <p className="text-slate-300 font-medium">
                    To install the app on your Android device:
                  </p>
                  <div className="space-y-2.5">
                    {canPromptDirectly && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await triggerInstall();
                          if (res.success) setShowGuideModal(false);
                        }}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center space-x-2 shadow-md transition mb-3 cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Tap to Install on Android Now</span>
                      </button>
                    )}
                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Tap the browser menu (<strong className="text-white">⋮</strong>) at the top or bottom of Chrome / Samsung Internet.
                      </div>
                    </div>

                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Select <strong className="text-white">&quot;Install app&quot;</strong> or <strong className="text-white">&quot;Add to Home screen&quot;</strong>.
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300 font-medium">
                    To install the app on Desktop / Laptop:
                  </p>
                  <div className="space-y-2.5">
                    <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-slate-300 leading-relaxed">
                        Click the <strong className="text-white">Install icon</strong> <Download className="w-3.5 h-3.5 inline mx-1 text-blue-400" /> inside your browser address bar.
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md text-center cursor-pointer"
              >
                Got it, Thanks!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
