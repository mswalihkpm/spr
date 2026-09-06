'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Image from 'next/image';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 bg-madin-900 text-white p-4 rounded-xl shadow-2xl border border-gold-500/30 max-w-sm animate-bounce-short flex items-center space-x-3">
      <div className="w-12 h-12 rounded-lg bg-white p-1 shrink-0 overflow-hidden shadow">
        <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gold-400">Install SPR App</h4>
        <p className="text-xs text-slate-300 truncate">Quick access to student ratings</p>
      </div>
      <div className="flex items-center space-x-1.5">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-madin-950 font-medium text-xs rounded-lg transition-colors shadow flex items-center space-x-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 hover:bg-white/10 rounded-md text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
