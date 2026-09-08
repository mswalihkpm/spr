'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock } from 'lucide-react';
import PwaFooterInstall from '@/components/pwa/PwaFooterInstall';

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

        {/* Center: Navigation Links */}
        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
          <Link href="/" className="hover:text-white transition">Home</Link>
          <span>•</span>
          <Link href="/leaderboard" className="hover:text-white transition">Leaderboard</Link>
          <span>•</span>
          <Link href="/updates" className="hover:text-white transition">Updates</Link>
          <span>•</span>
          <Link href="/login" className="hover:text-white transition">Admin Portal</Link>
        </div>

        {/* Right: PWA Install & Staff Login */}
        <div className="flex items-center space-x-3">
          <PwaFooterInstall />

          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs border border-slate-700"
            title="Staff & Admin Portal Login"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Staff Login</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
