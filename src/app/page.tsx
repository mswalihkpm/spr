'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Layers,
  CheckCircle2,
  Printer,
  X,
  Flag,
  ArrowRight,
  Megaphone,
  Home,
  Clock,
  Calendar,
  Lock,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import StudentReportModal from '@/components/modals/StudentReportModal';
import PwaFooterInstall from '@/components/pwa/PwaFooterInstall';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getAcademicMasterData } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';

export default function PublicHomePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newsUpdates, setNewsUpdates] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  // Filters (Overview only on home page; filter by Class & Search)
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [tableSearch, setTableSearch] = useState<string>('');

  // Global Student Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Student Scorecard Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [modalCalcTab, setModalCalcTab] = useState<'OVERALL' | 'SUBJECTS' | 'PROGRAMMES'>('OVERALL');

  // Report Discrepancy Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingStudent, setReportingStudent] = useState<any | null>(null);

// Global client caches for instantaneous loading
const homeLeaderboardMemory = new Map<string, any[]>();
let homeAcademicMemory: any = null;

  // Track scroll position for header blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch Latest 3 Updates for Homepage
  useEffect(() => {
    fetch('/api/news?limit=3')
      .then((res) => res.json())
      .then((data) => {
        if (data.news) setNewsUpdates(data.news);
      })
      .catch((err) => console.error('Error fetching homepage news:', err));
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial master data with instant client cache
  useEffect(() => {
    getAcademicMasterData()
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.classes) setClasses(data.classes);
        if (data.schools) setSchools(data.schools);
      })
      .catch((err) => console.error('Error fetching academic master data:', err));
  }, []);

  // Fetch Overall SPR leaderboard (Overview only) with instant cache
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClass) params.append('classId', selectedClass);
    const cacheKey = params.toString() || 'overview';

    const cached = homeLeaderboardMemory.get(cacheKey);
    if (cached) {
      setLeaderboard(cached);
      setLoadingLeaderboard(false);
    } else {
      setLoadingLeaderboard(true);
    }

    fetch(`/api/leaderboard?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) {
          homeLeaderboardMemory.set(cacheKey, data.leaderboard);
          setLeaderboard(data.leaderboard);
        }
      })
      .catch((err) => console.error('Error fetching leaderboard:', err))
      .finally(() => setLoadingLeaderboard(false));
  }, [selectedClass]);

  // Global search debouncing (search by Name, ID, Class, School)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    setShowSearchDropdown(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/public/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.students) {
            setSearchResults(data.students);
            setShowSearchDropdown(true);
          }
        })
        .catch((err) => {
          if (err.name !== 'AbortError') console.error(err);
        })
        .finally(() => setSearching(false));
    }, 150);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery]);

  // Direct Navigation to Student Profile
  const handleStudentClick = (studentId: string) => {
    if (!studentId) return;
    setShowSearchDropdown(false);
    router.push(`/student/${studentId}`);
  };

  // Open Student Modal Dossier
  const openStudentDossier = (studentId: string) => {
    if (!studentId) return;
    setSelectedStudentId(studentId);
    setShowSearchDropdown(false);
    setLoadingProfile(true);
    fetch(`/api/public/student/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setStudentProfile({
            ...data.profile,
            creativeWorks: data.creativeWorks || [],
            libraryRecords: data.libraryRecords || [],
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingProfile(false));
  };

  const closeStudentDossier = () => {
    setSelectedStudentId(null);
    setStudentProfile(null);
  };

  const openReportModal = (e: React.MouseEvent, st: any) => {
    e.stopPropagation();
    if (!st) return;

    const studentObj = st.student || st;
    const studentName =
      studentObj.fullName ||
      studentObj.studentName ||
      studentObj.name ||
      st.fullName ||
      st.studentName ||
      st.name ||
      '';
    const studentId =
      studentObj.studentId ||
      studentObj.studentCode ||
      studentObj.studentIdCode ||
      studentObj.id ||
      st.studentId ||
      st.id ||
      '';
    const rawClass =
      studentObj.class?.name ||
      studentObj.className ||
      st.class?.name ||
      st.className ||
      '';
    const rankVal = st.rank ?? studentObj.rank ?? st.classRank ?? studentObj.classRank ?? null;
    const sprVal =
      st.overallScore ??
      st.overallSPR ??
      st.spr ??
      studentObj.overallScore ??
      studentObj.overallSPR ??
      studentObj.spr ??
      null;

    setReportingStudent({
      id: studentId,
      studentId: studentId,
      name: studentName,
      className: formatClassNumber(rawClass) || rawClass || '',
      rank: rankVal,
      spr: sprVal !== null && sprVal !== undefined ? formatScore(sprVal) : undefined,
    });
    setReportModalOpen(true);
  };

  const formatScore = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toLocaleString('en-US');
    const fixed = Number(num.toFixed(2));
    return fixed.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Format Class to show ONLY number (e.g., "Class 8" -> "8", "Class 10" -> "10")
  const formatClassNumber = (val?: string) => {
    if (!val) return '';
    return val.replace(/^(class|std|standard|grade)\s*/i, '').trim();
  };

  // Filtered leaderboard list with multi-term support
  const filteredLeaderboard = leaderboard.filter((item) => {
    if (!tableSearch.trim()) return true;
    const q = tableSearch.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    const sName = (item.studentName || item.name || '').toLowerCase();
    const cName = (item.className || '').toLowerCase();
    const sCode = (item.studentCode || item.studentIdCode || item.studentId || '').toLowerCase();
    const sprId = (item.sprStudentId || '').toLowerCase();
    const schName = (item.schoolName || '').toLowerCase();
    const div = (item.division || '').toLowerCase();

    return terms.every((t) => {
      if (
        sName.includes(t) ||
        cName.includes(t) ||
        sCode.includes(t) ||
        sprId.includes(t) ||
        schName.includes(t) ||
        div.includes(t)
      ) {
        return true;
      }

      const sprMatch = t.match(/^spr-?(\d+)$/i);
      if (sprMatch) {
        const formatted = `spr${String(parseInt(sprMatch[1], 10)).padStart(4, '0')}`;
        if (sprId === formatted || sprId.includes(formatted)) return true;
      }

      return false;
    });
  });

  // Top 15 on homepage overview
  const displayedLeaderboard = filteredLeaderboard.slice(0, 15);
  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white antialiased">
      {/* Header with Very Low Opacity & Backdrop Blur */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 animate-slide-down bg-white/20 backdrop-blur-md border-b border-white/30 shadow-xs print:hidden ${
          scrolled ? 'py-2.5 sm:py-3 bg-white/25' : 'py-3 sm:py-4 bg-white/15'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Logo & Mobile Branding (Fire icon removed) */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Madin School of Excellence"
                width={48}
                height={48}
                className="w-full h-full object-contain drop-shadow-xs"
                priority
              />
            </div>
            <div>
              {/* Desktop Branding */}
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight">
                  MADIN SCHOOL OF EXCELLENCE
                </h1>
                <div className="text-[11px] font-bold text-blue-600 tracking-wider uppercase flex items-center space-x-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>SPR Evaluation Platform</span>
                </div>
              </div>

              {/* Clean Mobile Branding without fire icon */}
              <div className="sm:hidden flex flex-col">
                <div className="text-[11px] font-black tracking-tight text-slate-900 uppercase leading-none">
                  MADIN EXCELLENCE
                </div>
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  <span className="text-[9px] font-black tracking-widest uppercase">SPR PLATFORM</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Header Action Icons (Navigate in SAME tab) */}
          <div className="flex items-center space-x-2">
            <Link
              href="/updates"
              className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Official News & Announcements"
              aria-label="Updates"
            >
              <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            </Link>
            <button
              onClick={() => {
                setMobileSearchOpen(true);
                setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
              }}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Search Students"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <Link
              href="/leaderboard"
              className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Open Full Standings"
              aria-label="Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            </Link>
            <Link
              href="/categories"
              className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Evaluation Categories & Wings"
              aria-label="Categories"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile Search Modal Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:hidden animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-4 shadow-2xl border border-slate-200 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-slate-800">
                <Search className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider">Search SPR Students</span>
              </div>
              <button
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-slate-50 rounded-2xl border border-slate-200 p-1 flex items-center focus-within:ring-2 focus-within:ring-blue-600">
              <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter student name, ID (e.g. MSOE, SPR), or class..."
                className="w-full px-2.5 py-2 text-xs text-slate-900 bg-transparent outline-none font-semibold"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 mr-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Results List */}
            {searching ? (
              <div className="py-6 flex items-center justify-center">
                <VideoLoader size="sm" text="Searching registry..." />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white">
                {searchResults.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setMobileSearchOpen(false);
                      handleStudentClick(st.id);
                    }}
                    className="w-full p-2.5 text-left hover:bg-blue-50/80 flex items-center justify-between transition"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{st.fullName}</div>
                        <div className="text-[10px] text-slate-500 font-medium truncate flex items-center space-x-1 mt-0.5">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200 text-[9px]">
                            {st.sprStudentId || st.studentId}
                          </span>
                          <span>• Standard {formatClassNumber(st.className)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 ml-2">
                      <Trophy className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No students found matching &quot;{searchQuery}&quot;
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Top Hero Section with Rich Sunset Mosque Background (Clarity & Vivid Colors) */}
      <section className="relative overflow-hidden pt-8 pb-6 sm:pt-10 sm:pb-8 print:hidden">
        {/* Rich Sunset Mosque Background Image with High Clarity */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.70] pointer-events-none select-none"
          style={{ backgroundImage: "url('/hero-bg.jpg')", height: '90%' }}
        />
        {/* Soft, Transparent Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/30 via-65% to-[#f8fafc] pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/80 to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content with Smooth Staggered Slide-In & Harmonious Sunset Lighting */}
          <div id="search-section" className="max-w-4xl mx-auto text-center space-y-4 pb-6 sm:pb-8">
            <div className="max-w-3xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-lg animate-slide-up">
                Elevating Potential Through <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 drop-shadow-md">
                  Holistic Performance Analytics
                </span>
              </h2>

              <p className="text-xs sm:text-base text-white/95 max-w-2xl mx-auto leading-relaxed font-semibold animate-slide-up delay-100 drop-shadow-md">
                A comprehensive, multi-dimensional evaluation benchmark uniting Islamic education, academic excellence, leadership, creative arts, and literacy.
              </p>
            </div>

            {/* Quick Student Search Box (Desktop Only; on mobile it is accessed via Header search icon) */}
            <div ref={searchContainerRef} className="hidden sm:block pt-2 max-w-2xl mx-auto relative z-30 text-left animate-slide-up delay-150">
              <div className="relative bg-white rounded-2xl shadow-xl shadow-slate-300/40 border-2 border-slate-200/90 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/15 transition-all p-1.5 sm:p-2 flex items-center">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 ml-2.5 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSearchDropdown(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setShowSearchDropdown(false);
                    if (e.key === 'Enter' && searchResults.length > 0) {
                      handleStudentClick(searchResults[0].id);
                    }
                  }}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student by name (e.g. Irfan, Swalih), ID, or Class..."
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 bg-transparent outline-none font-semibold"
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3 shrink-0" />
                )}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchDropdown(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 mr-2 rounded-full hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Completely Opaque Isolated Search Dropdown (z-[100]) */}
              {showSearchDropdown && searchQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[100] max-h-80 overflow-y-auto animate-slide-up">
                  {searching ? (
                    <div className="py-6 px-4 flex items-center justify-center">
                      <VideoLoader size="sm" text="Searching students..." subtext="SPR Registry" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>Found {searchResults.length} Students</span>
                        <button
                          onClick={() => setShowSearchDropdown(false)}
                          className="text-slate-400 hover:text-slate-700 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 bg-white">
                        {searchResults.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => handleStudentClick(st.id)}
                            className="w-full px-3.5 py-2.5 text-left bg-white hover:bg-blue-50/80 flex items-center justify-between group transition-colors duration-150"
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="sm" />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                  {st.fullName}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium truncate flex items-center space-x-1 mt-0.5">
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[9.5px]">
                                    {st.sprStudentId || st.studentId}
                                  </span>
                                  <span>• Standard {formatClassNumber(st.className)} {st.division ? `(${st.division})` : ''} {st.schoolName ? `• ${st.schoolName}` : ''}</span>
                                </div>
                              </div>
                            </div>
                            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs shrink-0 ml-2">
                              <Trophy className="w-3 h-3" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="py-6 px-4 text-center text-xs text-slate-500">
                      <p>No students found for &ldquo;<span className="font-semibold text-slate-800">{searchQuery}</span>&rdquo;</p>
                      <p className="text-[11px] text-slate-400 mt-1">Try searching by student name, ID code (e.g. MSOE), or class number.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Counters */}
            <div className="pt-2 grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto relative z-10">
              <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-sm animate-slide-left delay-200 card-interactive flex flex-col justify-center">
                <div className="text-xl sm:text-2xl font-black text-blue-600 flex items-center space-x-1.5">
                  {loadingLeaderboard ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block mr-1"></span>
                      <span>Calculating...</span>
                    </span>
                  ) : (
                    <span>{leaderboard.length}</span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">Evaluated Students</div>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-sm animate-slide-right delay-200 card-interactive flex flex-col justify-center">
                <div className="text-xl sm:text-2xl font-black text-indigo-600">6 Wings</div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">Curricular & Co-curricular</div>
              </div>
            </div>
          </div>

          {/* Loading Process Video Container */}
          {loadingLeaderboard && (
            <div className="mt-4 pb-6 relative z-10 flex justify-center animate-fade-in">
              <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-md max-w-sm w-full flex flex-col items-center justify-center text-center">
                <VideoLoader size="lg" text="Loading SPR Live Standings..." subtext="Accessing Student Performance Registry" />
              </div>
            </div>
          )}

          {/* Top 3 Institutional Podium Showcase (Dynamic Rank & Tie-Aware Layout) */}
          {!loadingLeaderboard && top3.length >= 3 && (
            <div className="mt-2 pb-6 relative z-10">
              <div className="text-center mb-5 animate-slide-up delay-200">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50/90 px-3 py-1 rounded-full border border-blue-200 shadow-2xs">
                  Top Institutional Honors
                </span>
                <h3 className="text-xl sm:text-3xl font-black text-slate-900 mt-1 drop-shadow-2xs">Overall SPR Champions</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 font-medium mt-0.5">Leading institutional benchmarks across all evaluation wings</p>
              </div>

              {/* Horizontal 3-card Podium (grid-cols-3 on mobile and desktop) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-5 max-w-4xl mx-auto items-end">
                {/* Left Card (Position 2 in array: top3[1]) */}
                {(() => {
                  const student = top3[1];
                  const rank = student?.rank ?? 2;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className={`cursor-pointer rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 border-2 transition-all duration-300 text-center relative order-1 group animate-slide-left delay-200 hover:-translate-y-1 ${
                        isGold
                          ? 'bg-gradient-to-b from-amber-50/95 via-white to-white border-amber-400 shadow-xl hover:shadow-2xl hover:border-amber-500'
                          : isSilver
                          ? 'bg-white border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-400'
                          : 'bg-white border-amber-200 shadow-lg hover:shadow-xl hover:border-amber-300'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5 sm:mb-2">
                        <StudentAvatar
                          photoUrl={student?.photoUrl}
                          name={student?.studentName || student?.name || 'Student'}
                          size="lg"
                          className={`w-11 h-11 sm:w-20 sm:h-20 ${isGold ? 'ring-3 sm:ring-4 ring-amber-300/60' : ''}`}
                        />
                      </div>
                      <div
                        className={`text-[8px] sm:text-xs font-black uppercase tracking-widest px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border ${
                          isGold
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : isSilver
                            ? 'bg-slate-100/90 text-slate-700 border-slate-200'
                            : 'bg-amber-100/90 text-amber-800 border-amber-200'
                        }`}
                      >
                        ★ {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Rank {isTied ? '(Joint)' : ''} ★
                      </div>
                      <h4
                        className={`text-[10px] sm:text-base font-extrabold mt-1 transition-colors leading-tight break-words ${
                          isGold ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {student?.studentName || student?.name}
                      </h4>
                      <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                        Std {formatClassNumber(student?.className)}
                      </div>
                      <div
                        className={`mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t flex items-center justify-center sm:justify-between ${
                          isGold ? 'border-amber-100' : 'border-slate-100'
                        }`}
                      >
                        <span className={`hidden sm:inline text-xs ${isGold ? 'text-amber-900 font-bold' : 'text-slate-400 font-medium'}`}>
                          {isGold ? 'Cumulative' : 'Overall'}
                        </span>
                        <span className={`text-[11px] sm:text-lg font-black ${isGold ? 'text-amber-800' : 'text-slate-800'}`}>
                          {formatScore(student?.overallScore ?? student?.spr)} pts
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Center Card (Position 1 in array: top3[0] - Elevated) */}
                {(() => {
                  const student = top3[0];
                  const rank = student?.rank ?? 1;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;
                  const isGold = rank === 1;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className={`cursor-pointer bg-gradient-to-b from-amber-50/95 via-white to-white rounded-2xl sm:rounded-3xl p-3 sm:p-7 border-2 border-amber-400 shadow-xl hover:shadow-2xl hover:border-amber-500 transition-all duration-300 text-center relative order-2 -translate-y-2 sm:-translate-y-4 group animate-zoom-up delay-100 hover:-translate-y-5`}
                    >
                      <div className="flex justify-center mb-1.5 sm:mb-2">
                        <StudentAvatar
                          photoUrl={student?.photoUrl}
                          name={student?.studentName || student?.name || 'Student'}
                          size="xl"
                          className="w-13 h-13 sm:w-24 sm:h-24 ring-3 sm:ring-4 ring-amber-300/60"
                        />
                      </div>
                      <div className="text-[8px] sm:text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border border-amber-300">
                        ★ {rank === 1 ? '1st' : `${rank}th`} Rank {isTied ? '(Joint)' : ''} ★
                      </div>
                      <h4 className="text-xs sm:text-lg font-black text-slate-900 group-hover:text-amber-800 mt-1 transition-colors leading-tight break-words">
                        {student?.studentName || student?.name}
                      </h4>
                      <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                        Std {formatClassNumber(student?.className)}
                      </div>
                      <div className="mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t border-amber-100 flex items-center justify-center sm:justify-between">
                        <span className="hidden sm:inline text-xs text-amber-900 font-bold">Cumulative</span>
                        <span className="text-xs sm:text-2xl font-black text-amber-800">
                          {formatScore(student?.overallScore ?? student?.spr)} pts
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Right Card (Position 3 in array: top3[2]) */}
                {(() => {
                  const student = top3[2];
                  const rank = student?.rank ?? 3;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className={`cursor-pointer rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 border-2 transition-all duration-300 text-center relative order-3 group animate-slide-right delay-200 hover:-translate-y-1 ${
                        isGold
                          ? 'bg-gradient-to-b from-amber-50/95 via-white to-white border-amber-400 shadow-xl hover:shadow-2xl hover:border-amber-500'
                          : isSilver
                          ? 'bg-white border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-400'
                          : 'bg-white border-amber-200 shadow-lg hover:shadow-xl hover:border-amber-300'
                      }`}
                    >
                      <div className="flex justify-center mb-1.5 sm:mb-2">
                        <StudentAvatar
                          photoUrl={student?.photoUrl}
                          name={student?.studentName || student?.name || 'Student'}
                          size="lg"
                          className={`w-11 h-11 sm:w-20 sm:h-20 ${isGold ? 'ring-3 sm:ring-4 ring-amber-300/60' : ''}`}
                        />
                      </div>
                      <div
                        className={`text-[8px] sm:text-xs font-black uppercase tracking-widest px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border ${
                          isGold
                            ? 'bg-amber-100 text-amber-700 border-amber-300'
                            : isSilver
                            ? 'bg-slate-100/90 text-slate-700 border-slate-200'
                            : 'bg-amber-100/90 text-amber-800 border-amber-200'
                        }`}
                      >
                        ★ {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Rank {isTied ? '(Joint)' : ''} ★
                      </div>
                      <h4
                        className={`text-[10px] sm:text-base font-extrabold mt-1 transition-colors leading-tight break-words ${
                          isGold ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-900 group-hover:text-blue-600'
                        }`}
                      >
                        {student?.studentName || student?.name}
                      </h4>
                      <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                        Std {formatClassNumber(student?.className)}
                      </div>
                      <div
                        className={`mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t flex items-center justify-center sm:justify-between ${
                          isGold ? 'border-amber-100' : 'border-slate-100'
                        }`}
                      >
                        <span className={`hidden sm:inline text-xs ${isGold ? 'text-amber-900 font-bold' : 'text-slate-400 font-medium'}`}>
                          {isGold ? 'Cumulative' : 'Overall'}
                        </span>
                        <span className={`text-[11px] sm:text-lg font-black ${isGold ? 'text-amber-800' : 'text-slate-800'}`}>
                          {formatScore(student?.overallScore ?? student?.spr)} pts
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Joint Rank 1 Cohort Recognition Pill Bar */}
              {(() => {
                const rank1Students = leaderboard.filter((s) => s.rank === 1);
                if (rank1Students.length <= 1) return null;
                return (
                  <div className="mt-4 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl max-w-4xl mx-auto text-center shadow-xs animate-fade-in">
                    <div className="text-xs font-black text-amber-950 flex items-center justify-center space-x-1.5">
                      <span>🏆</span>
                      <span>{rank1Students.length} Students Jointly Share 1st Rank ({formatScore(rank1Students[0]?.spr ?? 0)} SPR Points)</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2">
                      {rank1Students.map((st) => (
                        <button
                          key={st.studentId}
                          onClick={() => handleStudentClick(st.studentId)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-amber-300 rounded-full text-xs font-bold text-slate-800 hover:bg-amber-100/80 shadow-2xs transition"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{st.studentName || st.name}</span>
                          <span className="text-[10px] text-amber-800 font-semibold">Std {formatClassNumber(st.className)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </section>

      {/* Overview Leaderboard Section (100% Mobile Responsive without Horizontal Dragging) */}
      <section id="leaderboard-section" className="py-6 sm:py-8 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-4 animate-slide-up delay-250 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200">
              Live Standings Overview
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Top Institutional Performers
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Institution-wide overall SPR benchmarks.
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition btn-interactive"
          >
            <span>Full Standings Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Toolbar (Search & Class Filter Only) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          <div>
            <CustomSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              placeholder="Filter by Class (All)"
              options={[
                { value: '', label: 'Filter by Class (All)' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </div>
        </div>

        {/* Overview Leaderboard Table (No Horizontal Dragging on Mobile) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-9 sm:w-16 text-center">#</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4">Student</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-4 w-10 sm:w-20 text-center">Class</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-24 sm:w-32 text-right">SPR Points</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 w-8 sm:w-12 text-center" title="Report issue"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading live standings..." subtext="SPR Evaluation Platform" />
                    </td>
                  </tr>
                ) : displayedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No student records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  displayedLeaderboard.map((row, idx) => {
                    const isTop1 = row.rank === 1;
                    const isTop2 = row.rank === 2;
                    const isTop3 = row.rank === 3;
                    const studentDisplayName = row.studentName || row.name || 'Student';
                    const studentSprScore = formatScore(row.overallScore ?? row.spr);
                    const numericScore = parseFloat(studentSprScore);
                    const classNum = formatClassNumber(row.className);

                    return (
                      <tr
                        key={row.studentId}
                        onClick={() => handleStudentClick(row.studentId)}
                        style={{ animationDelay: `${Math.min(idx * 20, 350)}ms` }}
                        className={`animate-row hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group ${
                          isTop1 ? 'bg-amber-50/20' : ''
                        }`}
                        title="Click to view full student profile and score origin breakdown"
                      >
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] sm:text-xs shadow-xs">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300 text-slate-800 font-bold text-[10px] sm:text-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] sm:text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">{row.rank}</span>
                          )}
                        </td>

                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            <StudentAvatar photoUrl={row.photoUrl} name={studentDisplayName} size="sm" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-[11px] sm:text-xs leading-tight line-clamp-2">
                              {studentDisplayName}
                            </span>
                          </div>
                        </td>

                        {/* Class column showing NUMBER ONLY (e.g., "8", "9", "10") */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 text-center font-bold text-slate-800">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] sm:text-xs font-black">
                            {classNum}
                          </span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-2 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-mono text-xs font-black shadow-2xs border transition-all group-hover:scale-105 bg-white border-slate-200">
                            <span className={isTop1 ? 'text-amber-800 font-black' : isTop2 ? 'text-slate-800 font-black' : isTop3 ? 'text-amber-900 font-black' : 'text-blue-900 font-extrabold'}>
                              {studentSprScore}
                            </span>
                            <span className={`text-[8.5px] sm:text-[9.5px] font-black uppercase px-1 py-0.2 rounded ${
                              isTop1 ? 'bg-amber-400 text-amber-950' : isTop2 ? 'bg-slate-300 text-slate-800' : isTop3 ? 'bg-amber-300 text-amber-950' : 'bg-blue-100 text-blue-800'
                            }`}>
                              PTS
                            </span>
                          </div>
                        </td>

                        {/* Report Icon Button */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                          <button
                            onClick={(e) => openReportModal(e, row)}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Report inaccuracy to administration"
                          >
                            <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* View Full Leaderboard (Opens full leaderboard in SAME tab) */}
          <div className="p-3 bg-slate-50/90 border-t border-slate-200 text-center">
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center space-x-2 px-5 py-2 sm:px-6 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all duration-200 hover:scale-105 active:scale-95 btn-interactive w-full sm:w-auto"
            >
              <span>View Full Leaderboard ({leaderboard.length} Students)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Latest News & Official Announcements Section (Top 3 on Home) */}
      <section id="updates-section" className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1.5 w-fit">
              <Megaphone className="w-3.5 h-3.5 text-amber-600" />
              <span>Broadcasts & Circulars</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
              Latest Updates & Announcements
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Official bulletins, literary festival circulars, and assessment updates from Madin Excellence.
            </p>
          </div>

          <Link
            href="/updates"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 rounded-xl transition border border-amber-200 shadow-2xs btn-interactive w-fit"
          >
            <span>More Updates ({newsUpdates.length > 0 ? 'All' : '0'})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {newsUpdates.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-5">
            {newsUpdates.map((item, idx) => (
              <Link
                key={item.id}
                href="/updates"
                className="group bg-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-amber-400 p-2.5 sm:p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-2 sm:space-y-3 relative overflow-hidden"
              >
                <div className="space-y-1.5 sm:space-y-2.5">
                  {item.imageUrl ? (
                    <div className="relative w-full h-16 sm:h-36 rounded-lg sm:rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                      <Image src={item.imageUrl} alt={item.title} fill className="object-cover group-hover:scale-105 transition duration-500" unoptimized />
                    </div>
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                      <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  )}

                  <div className="flex items-center space-x-1 sm:space-x-2 text-[8px] sm:text-[10px] text-slate-400 font-medium">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{new Date(item.publishedAt).toLocaleDateString()}</span>
                  </div>

                  <h4 className="text-[10px] sm:text-sm font-bold text-slate-900 group-hover:text-amber-700 transition leading-tight line-clamp-2">
                    {item.title}
                  </h4>

                  {item.subtitle && (
                    <p className="hidden sm:block text-xs text-blue-700 font-semibold line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}

                  <p className="hidden sm:block text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>

                <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-xs font-bold text-amber-700">
                  <span className="truncate">Read More</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 group-hover:translate-x-1 transition shrink-0 ml-1" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            No announcements posted at this time.
          </div>
        )}

        {/* More Updates Button */}
        <div className="text-center pt-1">
          <Link
            href="/updates"
            className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-all duration-200 hover:scale-105 active:scale-95 btn-interactive"
          >
            <span>View All News & Updates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Individual Student Status Dossier Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto animate-zoom-up">
            <button
              onClick={closeStudentDossier}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingProfile || !studentProfile ? (
              <div className="py-12 text-center">
                <VideoLoader size="lg" text="Loading Student Performance Dossier..." subtext="Madin School of Excellence" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Profile Card */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 pb-6 border-b border-slate-100">
                  <StudentAvatar
                    photoUrl={studentProfile.student?.photoUrl}
                    name={studentProfile.student?.fullName || 'Student'}
                    size="xl"
                  />

                  <div className="text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pb-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        SPR ID: {studentProfile.student?.sprStudentId || studentProfile.student?.studentId}
                      </span>
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Academic Profile</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {studentProfile.student?.fullName}
                    </h3>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      Standard: <span className="font-bold text-slate-900">{formatClassNumber(studentProfile.student?.class?.name)}</span> {studentProfile.student?.division ? `(Division ${studentProfile.student?.division})` : ''}
                    </div>
                  </div>

                  {/* Overall SPR Badge */}
                  <div className="text-center bg-blue-600 text-white p-4 rounded-2xl shadow-md min-w-[120px]">
                    <div className="text-[10px] uppercase font-bold text-blue-100">Total SPR Points</div>
                    <div className="text-2xl font-black text-white mt-0.5 font-mono">
                      {formatScore(studentProfile.overallScore ?? studentProfile.overallSPR)} PTS
                    </div>
                    <div className="text-[10px] text-blue-200 mt-0.5">
                      Rank #{studentProfile.rank || 1} of {studentProfile.totalStudentsOverall || 1}
                    </div>
                  </div>
                </div>

                {/* Rank Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-medium">Class Rank</div>
                    <div className="text-base font-black text-slate-900 mt-0.5">
                      #{studentProfile.classRank || 1}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">/ {studentProfile.totalStudentsInClass || 1}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="text-xs text-slate-500 font-medium">Total SPR Points</div>
                    <div className="text-base font-black text-blue-600 mt-0.5 font-mono">
                      {formatScore(studentProfile.overallScore ?? studentProfile.overallSPR)} pts
                    </div>
                  </div>
                </div>

                {/* Interactive Calculation Breakdown View Switcher */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Performance & Points Breakdown
                    </h4>
                    <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100 text-[10px] font-bold">
                      <button
                        onClick={() => setModalCalcTab('OVERALL')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'OVERALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        SPR Points
                      </button>
                      <button
                        onClick={() => setModalCalcTab('SUBJECTS')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'SUBJECTS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Academic Marks
                      </button>
                      <button
                        onClick={() => setModalCalcTab('PROGRAMMES')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'PROGRAMMES' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Competitions
                      </button>
                    </div>
                  </div>

                  {/* 1. OVERALL SPR POINTS BREAKDOWN */}
                  {modalCalcTab === 'OVERALL' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="space-y-2">
                        {(studentProfile.categoryBreakdown || studentProfile.categoryScores || []).map((cat: any) => {
                          const pts = cat.earnedPoints ?? 0;
                          return (
                            <div key={cat.categoryId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900">{cat.categoryName}</span>
                                <div className="text-[10px] text-slate-400">
                                  {cat.recordsCount || 0} valid record(s)
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-blue-700 text-sm">
                                  +{typeof pts === 'number' ? pts.toLocaleString('en-US') : pts} pts
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. SUBJECT-WISE BREAKDOWN */}
                  {modalCalcTab === 'SUBJECTS' && (
                    <div className="space-y-2.5 animate-fade-in max-h-64 overflow-y-auto pr-1">
                      {studentProfile.subjectWiseRecords && studentProfile.subjectWiseRecords.length > 0 ? (
                        studentProfile.subjectWiseRecords.map((r: any, idx: number) => (
                          <div key={r.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/70 transition">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{r.subjectName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                                  Category: {r.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                Assessment: <span className="font-semibold text-slate-700">{r.examName || r.termName || 'Assessment'}</span>
                                {r.institutionName && <span className="ml-1.5 text-blue-700">• {r.institutionName}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="font-mono font-extrabold text-blue-700 text-sm sm:text-base">
                                {r.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                          No direct subject exam records found. Academic evaluations are normalized into Islamic and School percentages.
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. PROGRAMMES & FESTS BREAKDOWN */}
                  {modalCalcTab === 'PROGRAMMES' && (
                    <div className="space-y-2.5 animate-fade-in max-h-64 overflow-y-auto pr-1">
                      {studentProfile.programmeWiseRecords && studentProfile.programmeWiseRecords.length > 0 ? (
                        studentProfile.programmeWiseRecords.map((r: any, idx: number) => (
                          <div key={r.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs hover:bg-slate-100/70 transition">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm">{r.competitionName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  Category: {r.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                Fest / Program: <span className="font-semibold text-slate-700">{r.festName}</span>
                                <span className="ml-1.5 text-slate-400">• Level: <span className="font-semibold text-slate-700">{r.levelName}</span></span>
                              </div>
                              {r.remarks && <div className="text-[10px] text-emerald-700 italic">{r.remarks}</div>}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="font-mono font-extrabold text-purple-700 text-sm sm:text-base">
                                {r.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                          No direct festival records found. Literary & Program scores are aggregated in the overall SPR registry.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Creative Hub Works */}
                {studentProfile.creativeWorks && studentProfile.creativeWorks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Creative Hub Submissions ({studentProfile.creativeWorks.length})
                    </h4>
                    <div className="space-y-1.5">
                      {studentProfile.creativeWorks.map((work: any) => (
                        <div key={work.id} className="p-3 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{work.title}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                Category: Creative Hub ({work.category?.name || 'Literary'})
                              </span>
                            </div>
                            {work.content && <div className="text-[10px] text-slate-500 line-clamp-1">{work.content}</div>}
                          </div>
                          <span className="font-bold text-purple-900 text-sm">{work.percentage ? `${work.percentage.toFixed(1)}%` : '100.0%'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions (In SAME Tab) */}
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    onClick={(e) => openReportModal(e, studentProfile)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Discrepancy</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/student/${studentProfile.student?.id}?print=true`}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Print Official Scorecard</span>
                    </Link>

                    <Link
                      href={`/student/${studentProfile.student?.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
                    >
                      <span>Full Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Inaccuracy Modal */}
      <StudentReportModal
        isOpen={reportModalOpen}
        onClose={() => {
          setReportModalOpen(false);
          setReportingStudent(null);
        }}
        student={reportingStudent}
      />

      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
