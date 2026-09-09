'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Award, Layers, Megaphone } from 'lucide-react';

export default function PublicMobileNav() {
  const pathname = usePathname();

  // Do not display public mobile nav on admin paths
  const isAdminPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/students') ||
    pathname.startsWith('/academics') ||
    pathname.startsWith('/programs') ||
    pathname.startsWith('/creative-hub') ||
    pathname.startsWith('/literary') ||
    pathname.startsWith('/library') ||
    pathname.startsWith('/weights') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/updates/manage') ||
    pathname.startsWith('/display');

  if (isAdminPath) {
    return null;
  }

  const isHome = pathname === '/';
  const isLeaderboard = pathname.startsWith('/leaderboard');
  const isCategories = pathname.startsWith('/subcategories') || pathname.startsWith('/categories');
  const isUpdates = pathname.startsWith('/updates');

  return (
    <nav
      id="public-mobile-nav"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around py-1.5 px-1 print:hidden"
    >
      {/* 1. Home */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          isHome ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {isHome && (
          <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 rounded-full" />
        )}
        <Home className={`w-5 h-5 mb-0.5 ${isHome ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className="text-[10px]">Home</span>
      </Link>

      {/* 2. Leaderboard */}
      <Link
        href="/leaderboard"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          isLeaderboard ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {isLeaderboard && (
          <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 rounded-full" />
        )}
        <Award className={`w-5 h-5 mb-0.5 ${isLeaderboard ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className="text-[10px]">Leaderboard</span>
      </Link>

      {/* 3. Categories / Subcategories */}
      <Link
        href="/subcategories"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          isCategories ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
        }`}
      >
        {isCategories && (
          <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 rounded-full" />
        )}
        <Layers className={`w-5 h-5 mb-0.5 ${isCategories ? 'text-blue-600' : 'text-slate-500'}`} />
        <span className="text-[10px]">Categories</span>
      </Link>

      {/* 4. Updates */}
      <Link
        href="/updates"
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
          isUpdates ? 'text-amber-600 font-bold' : 'text-slate-500 hover:text-amber-600'
        }`}
      >
        {isUpdates && (
          <span className="absolute -top-1.5 w-6 h-0.5 bg-amber-600 rounded-full" />
        )}
        <Megaphone className={`w-5 h-5 mb-0.5 ${isUpdates ? 'text-amber-600' : 'text-slate-500'}`} />
        <span className="text-[10px]">Updates</span>
      </Link>
    </nav>
  );
}
