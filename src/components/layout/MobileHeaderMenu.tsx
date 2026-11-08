'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  MoreVertical,
  X,
  Sun,
  Moon,
  Trophy,
  GraduationCap,
  Lock,
  ShieldCheck,
  Trash2,
  Settings,
  Home,
  Layers,
  Megaphone,
  BookOpen,
  ChevronRight,
  Mail,
  Share2,
  Smartphone,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import BrandedShareModal from '@/components/modals/BrandedShareModal';
import { executeBrandedShare, SharePayload } from '@/lib/share-utils';

interface MobileHeaderMenuProps {
  className?: string;
  buttonClassName?: string;
}

export default function MobileHeaderMenu({
  className = '',
  buttonClassName = '',
}: MobileHeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { theme, isDark, toggleTheme } = useTheme();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShareApp = async () => {
    setIsOpen(false);
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

  // Ensure portal only mounts on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close drawer whenever route pathname changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 3-Dot Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu and settings"
        title="More options & settings"
        className={`p-2 min-h-touch min-w-touch rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs border border-transparent dark:border-slate-700/60 ${buttonClassName}`}
      >
        <MoreVertical className="w-5 h-5 text-slate-700 dark:text-slate-200" />
      </button>

      {/* Render Portal to document.body: Completely immune to parent header CSS transforms/animations */}
      {mounted &&
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[99999] print:hidden overflow-hidden">
            {/* Full-screen Dark Backdrop */}
            <div
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm animate-backdrop-in"
              aria-hidden="true"
            />

            {/* Slide-In Sidebar Drawer (Spans 100% Viewport Height) */}
            <div
              className="absolute inset-y-0 right-0 w-80 max-w-[85vw] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-drawer-in"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation and Settings Sidebar"
            >
              {/* Drawer Header */}
              <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-madin-900 p-1.5 flex items-center justify-center shrink-0 border border-white/10 shadow-xs">
                    <Image src="/logo.png" alt="SPR Logo" width={36} height={36} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-900 dark:text-white leading-tight tracking-tight uppercase">
                      SPR PLATFORM
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[170px]">
                      Madin School of Excellence
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Body (Scrollable with touch momentum) */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5 overscroll-contain">
                {/* 1. Theme Mode Toggle */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 text-amber-500 dark:text-blue-400 shadow-2xs">
                      {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {isDark ? 'Dark Theme' : 'Light Theme'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        {isDark ? 'Comfortable night reading' : 'Standard daytime theme'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-300 dark:bg-blue-600"
                    role="switch"
                    aria-checked={isDark}
                    aria-label="Toggle dark mode"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isDark ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Standings & Overview Navigation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Standings & Overview
                  </span>

                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname === '/'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>Home Dashboard</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/leaderboard"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname.startsWith('/leaderboard')
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span>Leaderboard Standings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/categories"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname.startsWith('/categories')
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Categories & Wings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/updates"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname.startsWith('/updates')
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Megaphone className="w-4 h-4 text-amber-600" />
                      <span>News & Updates</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>

                {/* 3. Portals & Authentication */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Portals & Authentication
                  </span>

                  <Link
                    href="/student/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span>Student Portal Login</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block -mt-0.5">
                          Earnings, wallet & personal SPR
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <div>
                        <span>Staff & Admin Login</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block -mt-0.5">
                          Faculty marks evaluation panel
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>

                {/* 4. Privacy, Compliance & Data Deletion */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Privacy & Legal (Google Play)
                  </span>

                  <Link
                    href="/delete-account"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname === '/delete-account'
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-rose-50/50 dark:hover:bg-rose-950/30'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <div>
                        <span className="text-rose-700 dark:text-rose-300">Account & Data Deletion</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block -mt-0.5">
                          Public deletion request portal
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/privacy-policy"
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                      pathname === '/privacy-policy'
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <div>
                        <span>Privacy Policy</span>
                        <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 block -mt-0.5">
                          Student data protection notice
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>

                {/* 5. Academic Sections & Settings */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 block">
                    Academics & Settings
                  </span>

                  <Link
                    href="/academics/islamic"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Islamic Studies</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/academics/school"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      <span>School Studies</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/kuthbkhana"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kuthbkhana Library</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Administration Settings</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/80 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2 shrink-0">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Official Portal</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">v2026-27</span>
                </div>

                <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <a href="mailto:excellence@madin.edu.in" className="hover:underline truncate">
                    excellence@madin.edu.in
                  </a>
                </div>

                <div className="text-[9.5px] text-slate-400 dark:text-slate-500 pt-0.5">
                  © Madin School of Excellence. All rights reserved.
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      {/* Branded Sharing Modal */}
      <BrandedShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        payload={sharePayload}
      />
    </div>
  );
}
