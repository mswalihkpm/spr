'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import PwaFooterInstall from '@/components/pwa/PwaFooterInstall';
import PublicMobileNav from './PublicMobileNav';

export default function PublicFooter() {
  const [introFooter, setIntroFooter] = useState('2026 version 0.1');

  useEffect(() => {
    fetch('/api/display')
      .then((res) => res.json())
      .then((data) => {
        if (data.introFooter) setIntroFooter(data.introFooter);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <footer id="footer-portal" className="mt-auto bg-slate-950 text-slate-300 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 print:hidden pb-24 sm:pb-8 relative z-20">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Left: Branding & Verification */}
        <div className="flex items-center space-x-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-2xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/10">
            <Image
              src="/logo.png"
              alt="Madin Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="text-white font-black text-sm tracking-tight">Madin School of Excellence</div>
            <div className="text-[11px] text-slate-400 font-medium">Students Performance Rate (SPR) Evaluation System</div>
            <div className="text-[10px] text-blue-400 font-mono font-semibold mt-0.5">{introFooter}</div>
          </div>
        </div>



        {/* Right: PWA Install & Staff Login Icon */}
        <div className="flex items-center space-x-3">
          <PwaFooterInstall />

          <Link
            href="/login"
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-blue-600 text-slate-300 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-slate-700/80 flex items-center justify-center"
            title="Staff & Admin Portal Login"
            aria-label="Staff Login"
          >
            <Lock className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </footer>
    <PublicMobileNav />
  </>
  );
}
