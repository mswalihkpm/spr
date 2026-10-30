'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Trophy, Layers, Megaphone, GraduationCap } from 'lucide-react';

function PublicMobileNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const hasCategoryParam = Boolean(
    searchParams?.get('categoryId') ||
      searchParams?.get('cat') ||
      searchParams?.get('stream') ||
      searchParams?.get('fest') ||
      searchParams?.get('subcategoryId') ||
      searchParams?.get('sub')
  );

  const isHome = pathname === '/';
  const isLeaderboard = pathname === '/leaderboard' && !hasCategoryParam;
  const isCategories =
    pathname.startsWith('/categories') ||
    pathname.startsWith('/subcategories') ||
    (pathname.startsWith('/leaderboard') && hasCategoryParam);
  const isUpdates = pathname.startsWith('/updates');
  const isStudent = pathname.startsWith('/student');

  return (
    <nav
      id="public-mobile-nav"
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-2xl flex items-center justify-around pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] px-1 print:hidden"
    >
      {/* 1. Home */}
      <Link
        href="/"
        className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors relative ${
          isHome ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {isHome && <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        <Home className={`w-5 h-5 mb-0.5 ${isHome ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-[10px]">Home</span>
      </Link>

      {/* 2. Overall Leaderboard */}
      <Link
        href="/leaderboard"
        className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors relative ${
          isLeaderboard ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {isLeaderboard && <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        <Trophy className={`w-5 h-5 mb-0.5 ${isLeaderboard ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-[10px]">Leaderboard</span>
      </Link>

      {/* 3. Categories & Wings */}
      <Link
        href="/categories"
        className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors relative ${
          isCategories ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {isCategories && <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        <Layers className={`w-5 h-5 mb-0.5 ${isCategories ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-[10px]">Categories</span>
      </Link>

      {/* 4. Updates */}
      <Link
        href="/updates"
        className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors relative ${
          isUpdates ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
        }`}
      >
        {isUpdates && <span className="absolute -top-1.5 w-6 h-0.5 bg-amber-600 dark:bg-amber-400 rounded-full" />}
        <Megaphone className={`w-5 h-5 mb-0.5 ${isUpdates ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-[10px]">Updates</span>
      </Link>

      {/* 5. Student Login (Bottom Right Corner) */}
      <Link
        href="/student/login"
        className={`flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 transition-colors relative ${
          isStudent ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'
        }`}
        aria-label="Student Login"
      >
        {isStudent && <span className="absolute -top-1.5 w-6 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full" />}
        <GraduationCap className={`w-5 h-5 mb-0.5 ${isStudent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`} />
        <span className="text-[10px]">Student</span>
      </Link>
    </nav>
  );
}

export default function PublicMobileNav() {
  return (
    <Suspense fallback={null}>
      <PublicMobileNavContent />
    </Suspense>
  );
}
