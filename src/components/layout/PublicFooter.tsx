'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Lock, Share2 } from 'lucide-react';
import PublicMobileNav from './PublicMobileNav';
import { fetchWithDedupe } from '@/lib/client-cache';
import BrandedShareModal from '@/components/modals/BrandedShareModal';
import { executeBrandedShare, SharePayload } from '@/lib/share-utils';

export default function PublicFooter() {
  const [introFooter, setIntroFooter] = useState('2026 version 0.1');
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShareApp = async () => {
    await executeBrandedShare(
      {
        template: 'app',
      },
      {
        onFallbackModal: (p) => {
          setSharePayload(p);
          setIsShareModalOpen(true);
        },
      }
    );
  };

  useEffect(() => {
    fetchWithDedupe<any>('/api/display')
      .then((data) => {
        if (data && data.introFooter) setIntroFooter(data.introFooter);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Desktop/Tablet Footer: Hidden on mobile per design requirements, Edge-to-Edge Full Bleed on PC */}
      <footer
        id="footer-portal"
        className="hidden sm:block w-full mt-auto bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-[#030712] text-slate-300 border-t border-slate-800/80 print:hidden relative z-20 shadow-2xl overflow-hidden"
      >
        {/* Subtle glowing top accent gradient line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Ambient background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl w-full mx-auto py-10 px-6 lg:px-10 space-y-8 relative z-10">
          {/* Main Tier */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left: Branding & Verification (5 cols) */}
            <div className="md:col-span-5 space-y-3.5 text-left">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/10 p-1.5 flex items-center justify-center shrink-0 border border-blue-500/30 shadow-lg shadow-blue-500/10 backdrop-blur-xs">
                  <Image
                    src="/logo.png"
                    alt="Madin School of Excellence"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-white font-black text-base tracking-tight leading-tight">
                    Ma&apos;din School of Excellence
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Students Performance Rate (SPR) Platform
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                A multi-dimensional performance evaluation and certified ranking benchmark uniting Islamic education, academic rigor, leadership, and holistic activities.
              </p>

              <div className="flex items-center space-x-2 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Platform Online</span>
                </span>
                <span className="text-[11px] text-slate-400 font-mono font-semibold">
                  Session 2026-27 • {introFooter}
                </span>
              </div>
            </div>

            {/* Middle: Navigation Links (3 cols) */}
            <div className="md:col-span-3 space-y-3 text-left">
              <div className="text-xs font-black uppercase tracking-wider text-slate-200">
                Evaluation &amp; Rankings
              </div>
              <ul className="space-y-2 text-xs font-medium text-slate-400">
                <li>
                  <Link href="/leaderboard" className="hover:text-sky-400 transition flex items-center space-x-1.5">
                    <span>•</span>
                    <span>Overall SPR Leaderboard</span>
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="hover:text-sky-400 transition flex items-center space-x-1.5">
                    <span>•</span>
                    <span>Evaluation Wings &amp; Weights</span>
                  </Link>
                </li>
                <li>
                  <Link href="/updates" className="hover:text-sky-400 transition flex items-center space-x-1.5">
                    <span>•</span>
                    <span>Official News &amp; Updates</span>
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-sky-400 transition flex items-center space-x-1.5">
                    <span>•</span>
                    <span>Public Student Search</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right: Quick Access & Secure Portal (4 cols) */}
            <div className="md:col-span-4 space-y-3.5 text-left md:text-right flex flex-col md:items-end">
              <div className="text-xs font-black uppercase tracking-wider text-slate-200">
                Portals &amp; Operations
              </div>

              <div className="flex flex-wrap md:justify-end gap-2 text-xs font-semibold text-slate-400">
                <Link
                  href="/student/login"
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 transition"
                >
                  Student Portal
                </Link>
                <button
                  type="button"
                  onClick={handleShareApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 hover:border-emerald-700 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share App</span>
                </button>
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center space-x-1.5 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Staff Login</span>
                </Link>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
                <Link href="/privacy-policy" className="hover:text-slate-300 transition">
                  Privacy Policy
                </Link>
                <span>•</span>
                <Link href="/delete-account" className="hover:text-rose-400 transition">
                  Delete Account
                </Link>
                <span>•</span>
                <span>Certified Dossier Engine</span>
              </div>
            </div>
          </div>

          {/* Lower Tier: Institutional Copyright */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} <strong className="text-slate-300">Ma&apos;din School of Excellence</strong>. All Rights Reserved.
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Empowering Potential Through Holistic Performance Analytics
            </div>
          </div>
        </div>
      </footer>
    {/* Safe-area bottom padding spacer on mobile ensuring page buttons and content are never cut off by PublicMobileNav */}
    <div className="sm:hidden w-full h-[calc(max(env(safe-area-inset-bottom,0px),0.75rem)+4.5rem)] pointer-events-none" aria-hidden="true" />
    <PublicMobileNav />

    {/* Branded Sharing Modal */}
    <BrandedShareModal
      isOpen={isShareModalOpen}
      onClose={() => setIsShareModalOpen(false)}
      payload={sharePayload}
    />
  </>
  );
}
