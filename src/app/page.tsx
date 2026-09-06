'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Lock,
  Flag,
  ArrowRight,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import StudentReportModal from '@/components/modals/StudentReportModal';
import PwaFooterInstall from '@/components/pwa/PwaFooterInstall';

export default function PublicHomePage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
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
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Student Scorecard Modal
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [modalCalcTab, setModalCalcTab] = useState<'OVERALL' | 'SUBJECTS' | 'PROGRAMMES'>('OVERALL');

  // Report Discrepancy Modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingStudent, setReportingStudent] = useState<any | null>(null);

  // Track scroll position for header blur effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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

  // Fetch initial master data
  useEffect(() => {
    fetch('/api/academic')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.classes) setClasses(data.classes);
        if (data.schools) setSchools(data.schools);
      })
      .catch((err) => console.error('Error fetching academic master data:', err));
  }, []);

  // Fetch Overall SPR leaderboard (Overview only)
  useEffect(() => {
    setLoadingLeaderboard(true);
    const params = new URLSearchParams();
    if (selectedClass) params.append('classId', selectedClass);

    fetch(`/api/leaderboard?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) setLeaderboard(data.leaderboard);
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
    const timeout = setTimeout(() => {
      fetch(`/api/public/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.students) {
            setSearchResults(data.students);
            setShowSearchDropdown(true);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setSearching(false));
    }, 150);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

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
    return isNaN(num) ? '0.0' : num.toFixed(1);
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
    const schName = (item.schoolName || '').toLowerCase();
    const div = (item.division || '').toLowerCase();

    return terms.every(
      (t) =>
        sName.includes(t) ||
        cName.includes(t) ||
        sCode.includes(t) ||
        schName.includes(t) ||
        div.includes(t)
    );
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
            <a
              href="#search-section"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-blue-50 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Search Students"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>
            <Link
              href="/leaderboard"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-amber-50 text-slate-700 hover:text-amber-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Open Full Standings"
              aria-label="Leaderboard"
            >
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
            </Link>
            <a
              href="#categories-section"
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs btn-interactive"
              title="Evaluation Wings"
              aria-label="Wings"
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            </a>
          </div>
        </div>
      </header>

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

            {/* Quick Student Search Box (Highest Stacking Context z-30) */}
            <div ref={searchContainerRef} className="pt-2 max-w-2xl mx-auto relative z-30 text-left animate-slide-up delay-150">
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
                      openStudentDossier(searchResults[0].id);
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
                    <div className="py-6 px-4 text-center flex items-center justify-center space-x-2 text-xs text-slate-500">
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>Searching students directory...</span>
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
                            onClick={() => openStudentDossier(st.id)}
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
              <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-sm animate-slide-left delay-200 card-interactive">
                <div className="text-xl sm:text-2xl font-black text-blue-600">{loadingLeaderboard ? '...' : leaderboard.length}</div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">Evaluated Students</div>
              </div>
              <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-sm animate-slide-right delay-200 card-interactive">
                <div className="text-xl sm:text-2xl font-black text-indigo-600">6 Wings</div>
                <div className="text-[11px] sm:text-xs font-semibold text-slate-600 mt-0.5">Curricular & Co-curricular</div>
              </div>
            </div>
          </div>

          {/* Top 3 Institutional Podium Showcase (Horizontal 3-card layout on mobile & PC, No badges above avatars, Class numbers only) */}
          {top3.length >= 3 && (
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
                {/* Rank 2 (★ 2nd Rank ★) */}
                <div
                  onClick={() => openStudentDossier(top3[1]?.studentId)}
                  className="cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 border-2 border-slate-200 shadow-lg hover:shadow-xl hover:border-slate-400 transition-all duration-300 text-center relative order-1 group animate-slide-left delay-200 hover:-translate-y-1"
                >
                  <div className="flex justify-center mb-1.5 sm:mb-2">
                    <StudentAvatar
                      photoUrl={top3[1]?.photoUrl}
                      name={top3[1]?.studentName || top3[1]?.name || 'Student'}
                      size="lg"
                      className="w-11 h-11 sm:w-20 sm:h-20"
                    />
                  </div>
                  <div className="text-[8px] sm:text-xs font-black text-slate-700 uppercase tracking-widest bg-slate-100/90 px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border border-slate-200">
                    ★ 2nd Rank ★
                  </div>
                  <h4 className="text-[10px] sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 mt-1 transition-colors leading-tight break-words">
                    {top3[1]?.studentName || top3[1]?.name}
                  </h4>
                  <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Std {formatClassNumber(top3[1]?.className)}
                  </div>
                  <div className="mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t border-slate-100 flex items-center justify-center sm:justify-between">
                    <span className="hidden sm:inline text-xs text-slate-400 font-medium">Overall</span>
                    <span className="text-[11px] sm:text-lg font-black text-slate-800">
                      {formatScore(top3[1]?.overallScore ?? top3[1]?.spr)}%
                    </span>
                  </div>
                </div>

                {/* Rank 1 (★ 1st Rank ★ - Center & Elevated) */}
                <div
                  onClick={() => openStudentDossier(top3[0]?.studentId)}
                  className="cursor-pointer bg-gradient-to-b from-amber-50/95 via-white to-white rounded-2xl sm:rounded-3xl p-3 sm:p-7 border-2 border-amber-400 shadow-xl hover:shadow-2xl hover:border-amber-500 transition-all duration-300 text-center relative order-2 -translate-y-2 sm:-translate-y-4 group animate-zoom-up delay-100 hover:-translate-y-5"
                >
                  <div className="flex justify-center mb-1.5 sm:mb-2">
                    <StudentAvatar
                      photoUrl={top3[0]?.photoUrl}
                      name={top3[0]?.studentName || top3[0]?.name || 'Student'}
                      size="xl"
                      className="w-13 h-13 sm:w-24 sm:h-24 ring-3 sm:ring-4 ring-amber-300/60"
                    />
                  </div>
                  <div className="text-[8px] sm:text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border border-amber-300">
                    ★ 1st Rank ★
                  </div>
                  <h4 className="text-xs sm:text-lg font-black text-slate-900 group-hover:text-amber-800 mt-1 transition-colors leading-tight break-words">
                    {top3[0]?.studentName || top3[0]?.name}
                  </h4>
                  <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Std {formatClassNumber(top3[0]?.className)}
                  </div>
                  <div className="mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t border-amber-100 flex items-center justify-center sm:justify-between">
                    <span className="hidden sm:inline text-xs text-amber-900 font-bold">Cumulative</span>
                    <span className="text-xs sm:text-2xl font-black text-amber-800">
                      {formatScore(top3[0]?.overallScore ?? top3[0]?.spr)}%
                    </span>
                  </div>
                </div>

                {/* Rank 3 (★ 3rd Rank ★) */}
                <div
                  onClick={() => openStudentDossier(top3[2]?.studentId)}
                  className="cursor-pointer bg-white rounded-2xl sm:rounded-3xl p-2.5 sm:p-6 border-2 border-amber-200 shadow-lg hover:shadow-xl hover:border-amber-300 transition-all duration-300 text-center relative order-3 group animate-slide-right delay-200 hover:-translate-y-1"
                >
                  <div className="flex justify-center mb-1.5 sm:mb-2">
                    <StudentAvatar
                      photoUrl={top3[2]?.photoUrl}
                      name={top3[2]?.studentName || top3[2]?.name || 'Student'}
                      size="lg"
                      className="w-11 h-11 sm:w-20 sm:h-20"
                    />
                  </div>
                  <div className="text-[8px] sm:text-xs font-black text-amber-800 uppercase tracking-widest bg-amber-100/90 px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border border-amber-200">
                    ★ 3rd Rank ★
                  </div>
                  <h4 className="text-[10px] sm:text-base font-extrabold text-slate-900 group-hover:text-blue-600 mt-1 transition-colors leading-tight break-words">
                    {top3[2]?.studentName || top3[2]?.name}
                  </h4>
                  <div className="text-[9px] sm:text-xs text-slate-500 font-medium mt-0.5">
                    Std {formatClassNumber(top3[2]?.className)}
                  </div>
                  <div className="mt-1.5 sm:mt-4 pt-1.5 sm:pt-3 border-t border-slate-100 flex items-center justify-center sm:justify-between">
                    <span className="hidden sm:inline text-xs text-slate-400 font-medium">Overall</span>
                    <span className="text-[11px] sm:text-lg font-black text-slate-800">
                      {formatScore(top3[2]?.overallScore ?? top3[2]?.spr)}%
                    </span>
                  </div>
                </div>
              </div>
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
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Filter by Class (All)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
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
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-16 sm:w-28 text-right">SPR</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 w-8 sm:w-12 text-center" title="Report issue"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading live standings...
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
                        onClick={() => openStudentDossier(row.studentId)}
                        style={{ animationDelay: `${Math.min(idx * 20, 350)}ms` }}
                        className={`animate-row hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group ${
                          isTop1 ? 'bg-amber-50/20' : ''
                        }`}
                        title="Click row to view complete student dossier"
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

                        <td className="py-2 sm:py-3.5 px-2 sm:px-4 text-right">
                          <span
                            className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-black ${
                              numericScore >= 90
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : numericScore >= 80
                                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {studentSprScore}%
                          </span>
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

      {/* 6 Assessment Wings Section (With Overlapped Subcategory Badges on Top-Right of Main Categories) */}
      <section id="categories-section" className="py-10 sm:py-12 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center max-w-3xl mx-auto animate-slide-up">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
              Integrated Assessment Wings
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              Comprehensive Multi-Wing Evaluation
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select any institutional wing to explore its dedicated rankings, subcategories, and calculations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. ISLAMIC STUDIES (Combined Main Category with Jamiathul Hind & Ma'din Academy Subcategories) */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-600 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-100 flex flex-col justify-between">
              {/* Overlapped Subcategory Badges on Top-Right */}
              <div className="absolute top-4 right-4 flex items-center -space-x-2 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-full border border-slate-200 shadow-2xs" title="Subcategories: Jamiathul Hind & Ma'din Academy">
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="Jamiathul Hind Al-Islamiyya">
                  <Image src="/jamiathul-hind.png" alt="Jamiathul Hind" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="Ma'din Academy">
                  <Image src="/madin-academy.png" alt="Ma'din Academy" width={24} height={24} className="w-full h-full object-contain" />
                </div>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition mb-3">
                  <BookOpen className="w-6 h-6 text-blue-700" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
                    Islamic Studies
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Quranic recitation, Hadith memorization, Fiqh jurisprudence, Arabic grammar (Nahw & Sarf), and Islamic history.
                </p>
              </div>

              {/* Subcategories Quick Links */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subcategories</div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/leaderboard?stream=JAMIATHUL_HIND"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-800 hover:text-blue-700 text-[11px] font-bold transition truncate"
                  >
                    <div className="w-4 h-4 shrink-0 rounded overflow-hidden">
                      <Image src="/jamiathul-hind.png" alt="JH" width={16} height={16} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">Jamiathul Hind</span>
                  </Link>

                  <Link
                    href="/leaderboard?stream=MADIN_ACADEMY"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-800 hover:text-teal-700 text-[11px] font-bold transition truncate"
                  >
                    <div className="w-4 h-4 shrink-0 rounded overflow-hidden">
                      <Image src="/madin-academy.png" alt="MA" width={16} height={16} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">Ma'din Academy</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 2. LITERARY FESTIVALS (With 4 Subcategories: Sahityotsav, Kalotsav, M-Lit, Jamia Mahrajan) */}
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-rose-500 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-150 flex flex-col justify-between">
              {/* Overlapped 4 Festival Badges on Top-Right */}
              <div className="absolute top-4 right-4 flex items-center -space-x-2 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-full border border-slate-200 shadow-2xs" title="Subcategories: Sahityotsav, Kalotsav, M-Lit, Jamia Mahrajan">
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="Sahityotsav">
                  <Image src="/sahityotsav.png" alt="Sahityotsav" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="Kalotsav">
                  <Image src="/kalotsav.png" alt="Kalotsav" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="M-Lit Fest">
                  <Image src="/m-lit.png" alt="M-Lit" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 p-0.5 overflow-hidden shadow-xs hover:scale-110 hover:z-20 transition" title="Jamia Mahrajan">
                  <Image src="/jamia-mahrajan.png" alt="Mahrajan" width={24} height={24} className="w-full h-full object-contain" />
                </div>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition mb-3">
                  <Feather className="w-6 h-6 text-rose-700" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-rose-700 transition">
                    Literary Festivals
                  </h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Sahityotsav, Kalotsavam, M-Lit Fest & Jamia Mahrajan literary and cultural arts competitions.
                </p>
              </div>

              {/* Subcategories Quick Links (4 Fests) */}
              <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Festival Subcategories</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href="/leaderboard?fest=SAHITYOTSAV"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-400 text-slate-800 hover:text-rose-700 text-[10px] font-bold transition truncate"
                  >
                    <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                      <Image src="/sahityotsav.png" alt="S" width={14} height={14} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">Sahityotsav</span>
                  </Link>

                  <Link
                    href="/leaderboard?fest=KALOTSAV"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-800 hover:text-blue-700 text-[10px] font-bold transition truncate"
                  >
                    <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                      <Image src="/kalotsav.png" alt="K" width={14} height={14} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">Kalotsav</span>
                  </Link>

                  <Link
                    href="/leaderboard?fest=M_LIT"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-400 text-slate-800 hover:text-emerald-700 text-[10px] font-bold transition truncate"
                  >
                    <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                      <Image src="/m-lit.png" alt="M" width={14} height={14} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">M-Lit Fest</span>
                  </Link>

                  <Link
                    href="/leaderboard?fest=JAMIA_MAHRAJAN"
                    className="flex items-center space-x-1.5 p-1.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 text-slate-800 hover:text-amber-700 text-[10px] font-bold transition truncate"
                  >
                    <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                      <Image src="/jamia-mahrajan.png" alt="J" width={14} height={14} className="w-full h-full object-contain" />
                    </div>
                    <span className="truncate">Mahrajan</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* 3. SCHOOL EDUCATION (Kerala / NCERT) */}
            <Link
              href={`/leaderboard?categoryId=${categories.find((c) => c.code === 'SCHOOL')?.id || ''}`}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-200 flex flex-col justify-between"
            >
              {/* Overlapped Badges */}
              <div className="absolute top-4 right-4 flex items-center -space-x-1 z-10">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs">General</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">Languages</span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition">
                    School Education (Kerala / NCERT)
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700 group-hover:translate-x-1 transition shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Academic subjects including Mathematics, Science, Social Sciences, English, and Languages across Class 8 to +2.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-blue-700 font-bold">
                <span>View Subject Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 4. CREATIVE HUB (With Pencil Logo & Subcategories) */}
            <Link
              href={`/leaderboard?categoryId=${categories.find((c) => c.code === 'CREATIVE_HUB')?.id || ''}`}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-teal-500 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-250 flex flex-col justify-between"
            >
              {/* Overlapped Badges */}
              <div className="absolute top-4 right-4 flex items-center -space-x-1 z-10">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-teal-100 text-teal-900 border border-teal-200 shadow-2xs">Writing</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">Media Design</span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-white p-1 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition mb-3">
                  <Image
                    src="/creative-hub-logo.png"
                    alt="Creative Hub Logo"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                    Creative Hub
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 group-hover:translate-x-1 transition shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Creative writing, poems, essays, research articles, calligraphy, and innovative projects with editorial reviews.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-teal-700 font-bold">
                <span>View Creative Standings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 5. PROGRAMS & LEADERSHIP */}
            <Link
              href={`/leaderboard?categoryId=${categories.find((c) => c.code === 'PROGRAMS')?.id || ''}`}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-400 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-300 flex flex-col justify-between"
            >
              {/* Overlapped Badges */}
              <div className="absolute top-4 right-4 flex items-center -space-x-1 z-10">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">Events</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">Leadership</span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mb-3 group-hover:bg-emerald-600 group-hover:text-white transition">
                  <Trophy className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    Programs & Leadership
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Campus initiatives, workshops, seminars, public speaking, leadership camps, and institutional activities.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-emerald-700 font-bold">
                <span>View Program Rankings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>

            {/* 6. LIBRARY & READING */}
            <Link
              href={`/leaderboard?categoryId=${categories.find((c) => c.code === 'LIBRARY')?.id || ''}`}
              className="p-6 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition-all duration-300 card-interactive space-y-3 relative group animate-slide-up delay-350 flex flex-col justify-between"
            >
              {/* Overlapped Badges */}
              <div className="absolute top-4 right-4 flex items-center -space-x-1 z-10">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">Books</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-orange-100 text-orange-900 border border-orange-200 shadow-2xs">Reading Logs</span>
              </div>

              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mb-3 group-hover:bg-amber-600 group-hover:text-white transition">
                  <Layers className="w-6 h-6 text-amber-700" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition">
                    Library / Reading
                  </h4>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 group-hover:translate-x-1 transition shrink-0" />
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  Book reading tracking, comprehensive book reviews, reading hours, and literary digest evaluations.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-amber-700 font-bold">
                <span>View Reading Rankings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </Link>
          </div>
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
              <div className="py-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="text-xs font-bold text-slate-600">Loading Student Performance Dossier...</div>
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
                    <div className="text-[10px] uppercase font-bold text-blue-100">Cumulative SPR</div>
                    <div className="text-2xl font-black text-white mt-0.5">
                      {formatScore(studentProfile.overallScore ?? studentProfile.overallSPR)}%
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
                    <div className="text-xs text-slate-500 font-medium">Percentile</div>
                    <div className="text-base font-black text-blue-600 mt-0.5">
                      {studentProfile.percentile ? `${studentProfile.percentile.toFixed(0)}th` : 'Top 5%'}
                    </div>
                  </div>
                </div>

                {/* Interactive Calculation Breakdown View Switcher */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Performance & % Calculation
                    </h4>
                    <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100 text-[10px] font-bold">
                      <button
                        onClick={() => setModalCalcTab('OVERALL')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'OVERALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        SPR Formula %
                      </button>
                      <button
                        onClick={() => setModalCalcTab('SUBJECTS')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'SUBJECTS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Subject-Wise %
                      </button>
                      <button
                        onClick={() => setModalCalcTab('PROGRAMMES')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'PROGRAMMES' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fest & Events %
                      </button>
                    </div>
                  </div>

                  {/* 1. OVERALL SPR CALCULATION FORMULA */}
                  {modalCalcTab === 'OVERALL' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>📐 Cumulative SPR Mathematical Formula:</span>
                        </div>
                        <p className="text-[11px] text-blue-800 font-mono leading-relaxed">
                          Overall SPR = Σ (Category Score % × Category Weight %) ÷ Active Weights Sum
                        </p>
                      </div>

                      <div className="space-y-2">
                        {(studentProfile.categoryBreakdown || studentProfile.categoryScores || []).map((cat: any) => {
                          const catScore = parseFloat(formatScore(cat.score ?? cat.percentage));
                          const weight = cat.weight || 10;
                          const contribution = ((catScore * weight) / 100).toFixed(2);

                          return (
                            <div key={cat.categoryId} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">{cat.categoryName}</span>
                                <div className="text-right">
                                  <span className="font-mono font-extrabold text-blue-700">{catScore.toFixed(1)}%</span>
                                  <span className="text-[10px] text-slate-400 font-normal ml-1">× {weight}% wt = </span>
                                  <span className="font-mono font-bold text-emerald-700 text-xs ml-1">+{contribution}%</span>
                                </div>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    catScore >= 85 ? 'bg-emerald-600' : catScore >= 70 ? 'bg-blue-600' : 'bg-amber-600'
                                  }`}
                                  style={{ width: `${Math.min(catScore, 100)}%` }}
                                />
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

      {/* Footer */}
      <footer id="footer-portal" className="mt-auto bg-slate-950 text-slate-300 border-t border-slate-800 py-8 px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              <Image
                src="/footer-logo.png"
                alt="Madin Logo"
                width={40}
                height={40}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="text-white font-bold text-xs tracking-tight">Madin School of Excellence</div>
              <div className="text-[10px] text-slate-400">Students Performance Rate (SPR) System</div>
            </div>
          </div>

          {/* PWA Install Option in Website Footer Only */}
          <div className="flex items-center space-x-4">
            <PwaFooterInstall />

            <span className="hidden sm:inline text-[11px] text-slate-500">
              © {new Date().getFullYear()} Madin School of Excellence.
            </span>

            <Link
              href="/login"
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs"
              title="Staff & Admin Portal"
              aria-label="Staff Login"
            >
              <Lock className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
