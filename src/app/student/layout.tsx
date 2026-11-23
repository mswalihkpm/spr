'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Award,
  Wallet,
  CheckSquare,
  Sparkles,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { clearClientCache } from '@/lib/client-cache';
import StudentAvatar from '@/components/ui/StudentAvatar';
import { registerForegroundMessageHandler } from '@/lib/firebase-client';
import { sanitizeStudentDeepLink } from '@/lib/notification-navigation';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  // The 6 authenticated Student Portal sections
  const isPortalRoute =
    pathname === '/student/dashboard' ||
    pathname.startsWith('/student/dashboard') ||
    pathname === '/student/dossier' ||
    pathname.startsWith('/student/dossier') ||
    pathname === '/student/cash' ||
    pathname.startsWith('/student/cash') ||
    pathname === '/student/tasks' ||
    pathname.startsWith('/student/tasks') ||
    pathname === '/student/activities' ||
    pathname.startsWith('/student/activities') ||
    pathname === '/student/settings' ||
    pathname.startsWith('/student/settings');

  // If on student login or public scorecard (/student/[id]), render cleanly without portal shell
  if (!isPortalRoute) {
    return <>{children}</>;
  }

  const [student, setStudent] = useState<any>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [foregroundAlert, setForegroundAlert] = useState<{
    title: string;
    body: string;
    url: string;
    category?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/student/auth/me')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/student/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.student) {
          setStudent(data.student);

          // For ordinary web browsers, auto-link existing Web Push token to this authenticated student session.
          // Native Android devices handle token registration through the secure native architecture.
          try {
            const isNative =
              typeof window !== 'undefined' &&
              (localStorage.getItem('spr_is_native_app') === '1' ||
                localStorage.getItem('spr_subscription_type') === 'ANDROID_NATIVE');

            if (!isNative) {
              const cachedToken = typeof window !== 'undefined' ? localStorage.getItem('spr_fcm_token') : null;
              const subType = typeof window !== 'undefined' ? localStorage.getItem('spr_subscription_type') : null;
              if (cachedToken && subType !== 'STUDENT') {
                fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    fcmToken: cachedToken,
                  }),
                }).then((res) => {
                  if (res.ok) {
                    localStorage.setItem('spr_subscription_type', 'STUDENT');
                  }
                }).catch(() => {});
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
  }, [router]);

  // Observer for foreground push notifications received while looking at active portal
  useEffect(() => {
    const cleanup = registerForegroundMessageHandler((msg) => {
      setForegroundAlert({
        title: msg.title,
        body: msg.body,
        url: msg.url || '/student/dashboard',
        category: msg.category,
      });
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('spr_fcm_token') : null;
      const res = await fetch('/api/student/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: token || undefined }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const failMessage =
          errorData.message ||
          'Unable to safely complete logout at this time. Please retry to ensure private notifications are disconnected.';
        setLogoutError(failMessage);
        setLoggingOut(false);
        return;
      }

      // Revert device token type to ANONYMOUS so it continues to receive general circulars
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('spr_subscription_type', 'ANONYMOUS');
      }
      clearClientCache();
      router.push('/student/login');
    } catch (err: any) {
      console.warn('Logout network error:', err);
      setLogoutError('Network connection failed during logout. Please check your connection and retry.');
      setLoggingOut(false);
    }
  };

  // The EXACT 6 primary navigation items in EXACT required order
  const navItems = [
    {
      href: '/student/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/student/dashboard',
    },
    {
      href: '/student/dossier',
      label: 'Student Dossier',
      icon: Award,
      active: pathname.startsWith('/student/dossier'),
    },
    {
      href: '/student/cash',
      label: 'Cash Account',
      icon: Wallet,
      active: pathname === '/student/cash',
    },
    {
      href: '/student/tasks',
      label: 'Tasks',
      icon: CheckSquare,
      active: pathname.startsWith('/student/tasks'),
    },
    {
      href: '/student/activities',
      label: 'Additional Activities',
      icon: Sparkles,
      active: pathname.startsWith('/student/activities'),
    },
    {
      href: '/student/settings',
      label: 'Settings',
      icon: Settings,
      active: pathname === '/student/settings',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#070d1e] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased selection:bg-blue-600 selection:text-white">
      {/* ---------------------------------------------------------------------
          DESKTOP PERSISTENT COLLAPSIBLE SIDEBAR
          --------------------------------------------------------------------- */}
      <aside
        className={`hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 z-30 shrink-0 sticky top-0 h-screen ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4">
          <Link href="/student/dashboard" className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 p-1.5 flex items-center justify-center shrink-0 shadow-md">
              <Image src="/logo.png" alt="SPR" width={32} height={32} className="object-contain" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <span className="font-black text-sm tracking-tight text-slate-900 dark:text-white block leading-tight">
                  SPR STUDENT
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Madin School</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Student Quick Profile Card */}
        {student && !collapsed && (
          <div className="p-4 mx-3 my-3 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/60 dark:from-slate-800/60 dark:to-slate-800/30 border border-blue-100 dark:border-slate-700/60 flex items-center space-x-3">
            <StudentAvatar
              photoUrl={student.photoUrl}
              name={student.fullName}
              size="md"
              studentId={student.sprStudentId || student.id}
              className="w-11 h-11 ring-2 ring-white/50 shadow-xs"
            />
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                {student.fullName}
              </div>
              <div className="text-[10.5px] font-mono text-blue-700 dark:text-blue-300 font-semibold truncate">
                {student.sprStudentId || 'SPR ID'}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {student.class?.name || 'Class Cohort'}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Links (Exact 6 Items in Order) */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                  item.active
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    item.active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            title={collapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ---------------------------------------------------------------------
          MOBILE TOP NAVBAR & DRAWER
          --------------------------------------------------------------------- */}
      <header className="md:hidden sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 h-14 flex items-center justify-between w-full max-w-full">
        <Link href="/student/dashboard" className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 p-1 flex items-center justify-center shrink-0">
            <Image src="/logo.png" alt="SPR" width={24} height={24} className="object-contain" />
          </div>
          <span className="font-black text-xs tracking-tight text-slate-900 dark:text-white uppercase truncate">
            SPR Portal
          </span>
        </Link>

        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href="/student/settings"
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Notification Preferences"
          >
            <Bell className="w-4 h-4" />
          </Link>
          {student && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-mono font-bold text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800">
                {student.sprStudentId}
              </span>
              <StudentAvatar
                photoUrl={student.photoUrl}
                name={student.fullName}
                size="sm"
                studentId={student.sprStudentId || student.id}
                className="w-7 h-7"
              />
            </div>
          )}
        </div>
      </header>

      {/* ---------------------------------------------------------------------
          PAGE MAIN CONTENT
          --------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6 w-full max-w-full overflow-x-hidden">
        {/* Foreground In-App Push Notification Toast */}
        {foregroundAlert && (
          <div className="mx-3.5 mt-3 sm:mx-6 sm:mt-4 p-4 rounded-2xl bg-slate-900 text-white shadow-xl border border-blue-500/40 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-3 z-50">
            <div className="flex items-start space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Bell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                    {foregroundAlert.category || 'Notification'}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {foregroundAlert.title}
                </h4>
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                  {foregroundAlert.body}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const targetUrl = sanitizeStudentDeepLink(foregroundAlert.url);
                  setForegroundAlert(null);
                  router.push(targetUrl);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition cursor-pointer"
              >
                View
              </button>
              <button
                type="button"
                onClick={() => setForegroundAlert(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Logout Security Failure Alert Banner */}
        {logoutError && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 shadow-md flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
            <div className="flex-1 mr-3">
              <span className="font-bold block text-sm mb-0.5">Logout Incomplete (Security Protection)</span>
              <span>{logoutError}</span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {loggingOut ? 'Retrying...' : 'Retry Logout'}
              </button>
              <button
                type="button"
                onClick={() => setLogoutError(null)}
                className="p-1 text-rose-400 hover:text-rose-600 dark:hover:text-rose-200 transition cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {children}
      </div>

      {/* ---------------------------------------------------------------------
          MOBILE COMPACT BOTTOM NAVIGATION (6 Primary Links)
          --------------------------------------------------------------------- */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around py-1.5 px-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all ${
                item.active
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[9px] tracking-tight truncate max-w-[50px] leading-none text-center">
                {item.label === 'Additional Activities' ? 'Activities' : item.label === 'Student Dossier' ? 'Dossier' : item.label === 'Cash Account' ? 'Cash' : item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
