'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Sliders,
  Award,
  BarChart3,
  Tv,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Bell,
  PlusCircle,
  Layers,
  FileSpreadsheet,
  Megaphone,
  Home,
} from 'lucide-react';
import GlobalSearchModal from '../search/GlobalSearchModal';
import PWAInstallPrompt from '../ui/PWAInstallPrompt';

interface AdminLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export default function AdminLayout({ children, user: initialUser }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(initialUser || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [academicsOpen, setAcademicsOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);

  // Fetch current user on mount if not passed
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          if (data.user.mustChangePassword && pathname !== '/auth/change-password') {
            router.push('/auth/change-password');
          }
        } else if (pathname !== '/login' && !pathname.startsWith('/display')) {
          router.push('/login');
        }
      })
      .catch(() => {});
  }, [pathname, router]);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Enforce role-based route protection
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isCreativeHubAdmin = user?.role === 'CREATIVE_HUB_ADMIN';

  useEffect(() => {
    if (user) {
      if (isCreativeHubAdmin) {
        if (pathname !== '/creative-hub' && pathname !== '/auth/change-password' && !pathname.startsWith('/leaderboard')) {
          router.push('/creative-hub');
        }
      } else if (!isAdmin) {
        if (pathname.startsWith('/settings') || pathname.startsWith('/weights') || pathname.startsWith('/categories') || pathname.startsWith('/updates/manage')) {
          router.push('/dashboard');
        }
      }
    }
  }, [user, isAdmin, isCreativeHubAdmin, pathname, router]);

  const allNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/students', icon: Users },
    {
      name: 'Academics',
      icon: BookOpen,
      isDropdown: true,
      children: [
        { name: 'Islamic Studies', href: '/academics/islamic', icon: BookOpen },
        { name: 'School Studies', href: '/academics/school', icon: GraduationCap },
      ],
    },
    { name: 'Programs & Competitions', href: '/programs', icon: Trophy },
    { name: 'Creative Hub', href: '/creative-hub', icon: Sparkles },
    { name: 'Literary Programs', href: '/literary', icon: Feather },
    { name: 'Library / Reading', href: '/library', icon: Library },
    { name: 'Other Subcategories', href: '/subcategories', icon: Layers },
    { name: 'News & Updates', href: '/updates/manage', icon: Megaphone, adminOnly: true },
    { name: 'Custom Categories', href: '/categories', icon: Sliders, adminOnly: true },
    { name: 'Weight Management', href: '/weights', icon: Sliders, adminOnly: true },
    { name: 'Leaderboards', href: '/leaderboard', icon: Award },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const navItems = isCreativeHubAdmin
    ? [
        { name: 'Creative Hub', href: '/creative-hub', icon: Sparkles },
        { name: 'Leaderboards', href: '/leaderboard', icon: Award },
      ]
    : allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 selection:bg-madin-900 selection:text-white">
      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* PWA Install Notification Prompt */}
      <PWAInstallPrompt />

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-madin-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-white p-0.5 overflow-hidden">
              <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-white">SPR</span>
              <span className="text-[10px] text-gold-400 block -mt-1 font-medium">Madin Excellence</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg bg-white/10 text-slate-200 hover:text-white"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar & Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-madin-900 text-slate-200 flex flex-col justify-between transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:static md:w-64 lg:w-72 shrink-0 border-r border-madin-800 shadow-xl`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-madin-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 shadow-md overflow-hidden shrink-0">
              <img src="/logo.png" alt="Madin SPR" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-wide text-white flex items-center space-x-1.5">
                <span>SPR</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium truncate max-w-[140px]">
                Madin School of Excellence
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search Button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-madin-950/60 hover:bg-madin-950 text-slate-400 hover:text-slate-200 border border-madin-800 transition-colors text-xs font-medium"
          >
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <span>Search platform...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-madin-800/80 rounded border border-madin-700">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            if (item.isDropdown && item.children) {
              const isChildActive = item.children.some((c) => pathname === c.href);
              return (
                <div key={item.name} className="space-y-0.5">
                  <button
                    onClick={() => setAcademicsOpen(!academicsOpen)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isChildActive
                        ? 'bg-madin-800/80 text-gold-400'
                        : 'text-slate-300 hover:bg-madin-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isChildActive ? 'text-gold-400' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </div>
                    {academicsOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {academicsOpen && (
                    <div className="pl-6 pr-1 py-0.5 space-y-1 border-l-2 border-madin-800 ml-5">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        const active = pathname === child.href;
                        return (
                          <button
                            key={child.href}
                            onClick={() => {
                              router.push(child.href);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              active
                                ? 'bg-gold-500/20 text-gold-300 font-semibold'
                                : 'text-slate-400 hover:bg-madin-800/40 hover:text-white'
                            }`}
                          >
                            <ChildIcon className="w-3.5 h-3.5" />
                            <span>{child.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            const active = item.href ? pathname === item.href : false;
            return (
              <button
                key={item.name}
                onClick={() => {
                  if (item.href) {
                    router.push(item.href);
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-gold-500/20 text-gold-300 font-semibold border-l-4 border-gold-500 pl-2.5'
                    : 'text-slate-300 hover:bg-madin-800/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-gold-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer User Profile & Logout */}
        <div className="p-3 border-t border-madin-800 bg-madin-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl hover:bg-madin-800/50 transition-colors">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 text-gold-300 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</div>
                <div className="text-[10px] text-gold-400 truncate">
                  {user?.role === 'CREATIVE_HUB_ADMIN'
                    ? 'Creative Hub Admin'
                    : user?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : user?.role?.replace('_', ' ') || 'Admin'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-madin-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-3 items-center justify-between shadow-subtle">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Madin School of Excellence</span>
                <span className="text-slate-300">/</span>
                <span className="text-madin-700 font-semibold text-sm">
                  {navItems.find((n) => n.href === pathname)?.name || 'Performance Dashboard'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Action Menu */}
            {!isCreativeHubAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setQuickActionOpen(!quickActionOpen)}
                  className="px-3 py-1.5 rounded-lg bg-madin-900 hover:bg-madin-800 text-white font-medium text-xs flex items-center space-x-1.5 shadow transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-gold-400" />
                  <span>Quick Actions</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
                </button>

                {quickActionOpen && (
                  <div
                    onMouseLeave={() => setQuickActionOpen(false)}
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-fade-in"
                  >
                    <button
                      onClick={() => {
                        router.push('/students');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <Users className="w-4 h-4 text-madin-700" />
                      <span>+ Add New Student</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/students/bulk-import');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Bulk Excel Import</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/academics/islamic');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <BookOpen className="w-4 h-4 text-amber-600" />
                      <span>Enter Islamic Scores</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/academics/school');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <span>Enter School Exam Scores</span>
                    </button>
                    <button
                      onClick={() => {
                        router.push('/creative-hub');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Add Creative Work</span>
                    </button>
                    <div className="border-t border-slate-100 my-1"></div>
                    <button
                      onClick={() => {
                        router.push('/categories');
                        setQuickActionOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5"
                    >
                      <Layers className="w-4 h-4 text-slate-600" />
                      <span>+ Create Custom Category</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push('/creative-hub')}
                className="px-3 py-1.5 rounded-lg bg-madin-900 hover:bg-madin-800 text-white font-medium text-xs flex items-center space-x-1.5 shadow transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-gold-400" />
                <span>+ Add Creative Work</span>
              </button>
            )}

            {/* News & Updates Link Icon */}
            <a
              href="/updates"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Official News & Announcements"
            >
              <Megaphone className="w-4 h-4 text-amber-600" />
            </a>

            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
              title="Search (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Specialized Admin Mobile Bottom Navigation Bar */}
      {isCreativeHubAdmin ? (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around py-2 px-1">
          <button
            onClick={() => router.push('/creative-hub')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname === '/creative-hub'
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === '/creative-hub' ? 'bg-purple-50 text-purple-700' : ''}`}>
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] tracking-tight">Creative Hub</span>
          </button>

          <button
            onClick={() => router.push('/leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname === '/leaderboard'
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === '/leaderboard' ? 'bg-madin-50 text-madin-900' : ''}`}>
              <Award className="w-5 h-5 text-gold-600" />
            </div>
            <span className="text-[10px] tracking-tight">Leaderboard</span>
          </button>

          <button
            onClick={() => router.push('/auth/change-password')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname === '/auth/change-password'
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === '/auth/change-password' ? 'bg-amber-50 text-amber-700' : ''}`}>
              <Settings className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-[10px] tracking-tight">Password</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-madin-900 transition-all"
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Admin Menu</span>
          </button>
        </nav>
      ) : (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl flex items-center justify-around py-2 px-1">
          <button
            onClick={() => router.push('/dashboard')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname === '/dashboard'
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === '/dashboard' ? 'bg-madin-50 text-madin-900' : ''}`}>
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Dashboard</span>
          </button>

          <button
            onClick={() => router.push('/students')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname.startsWith('/students')
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname.startsWith('/students') ? 'bg-madin-50 text-madin-900' : ''}`}>
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Students</span>
          </button>

          <button
            onClick={() => router.push('/academics/school')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname.startsWith('/academics')
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname.startsWith('/academics') ? 'bg-madin-50 text-madin-900' : ''}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Academics</span>
          </button>

          <button
            onClick={() => router.push('/updates/manage')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
              pathname.startsWith('/updates')
                ? 'text-madin-900 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname.startsWith('/updates') ? 'bg-amber-50 text-amber-700' : ''}`}>
              <Megaphone className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] tracking-tight">Updates</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 text-slate-500 hover:text-madin-900 transition-all"
          >
            <div className="p-1 rounded-lg">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] tracking-tight">Admin Menu</span>
          </button>
        </nav>
      )}
    </div>
  );
}
