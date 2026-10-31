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
  X,
  Flag,
  ArrowRight,
  Megaphone,
  Home,
  Clock,
  Calendar,
  Lock,
  Loader2,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import StudentReportModal from '@/components/modals/StudentReportModal';
import NewsDetailModal from '@/components/modals/NewsDetailModal';
import ItemLeaderboardModal from '@/components/modals/ItemLeaderboardModal';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getAcademicMasterData } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';
import { useAppBootstrap } from '@/context/AppBootstrapContext';
import { useTheme } from '@/context/ThemeContext';

// Global module-level client memory caches for instant 0ms loading
const homeLeaderboardMemory = new Map<string, any[]>();
const homeStudentProfileMemory = new Map<string, any>();

export default function PublicHomePage() {
  const router = useRouter();
  const {
    overviewLeaderboard: bootstrapLeaderboard,
    categories: bootstrapCategories,
    academicData: bootstrapAcademic,
    news: bootstrapNews,
    isBootstrapped,
  } = useAppBootstrap();

  const [categories, setCategories] = useState<any[]>(() =>
    bootstrapCategories.length > 0 ? bootstrapCategories : bootstrapAcademic?.categories || []
  );
  const [schools, setSchools] = useState<any[]>(() => bootstrapAcademic?.schools || []);
  const [classes, setClasses] = useState<any[]>(() => bootstrapAcademic?.classes || []);
  const [leaderboard, setLeaderboard] = useState<any[]>(() =>
    bootstrapLeaderboard.length > 0 ? bootstrapLeaderboard : homeLeaderboardMemory.get('overview') || []
  );
  const [newsUpdates, setNewsUpdates] = useState<any[]>(() =>
    bootstrapNews.length > 0 ? bootstrapNews.slice(0, 3) : []
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(
    () => bootstrapLeaderboard.length === 0 && !homeLeaderboardMemory.has('overview')
  );
  const [scrolled, setScrolled] = useState(false);

  // Sync state when bootstrap loads data
  useEffect(() => {
    if (bootstrapLeaderboard.length > 0 && !selectedClass) {
      setLeaderboard(bootstrapLeaderboard);
      setLoadingLeaderboard(false);
      homeLeaderboardMemory.set('overview', bootstrapLeaderboard);
    }
  }, [bootstrapLeaderboard]);

  useEffect(() => {
    if (bootstrapCategories.length > 0) {
      setCategories(bootstrapCategories);
    } else if (bootstrapAcademic?.categories) {
      setCategories(bootstrapAcademic.categories);
    }
    if (bootstrapAcademic?.classes) setClasses(bootstrapAcademic.classes);
    if (bootstrapAcademic?.schools) setSchools(bootstrapAcademic.schools);
  }, [bootstrapCategories, bootstrapAcademic]);

  useEffect(() => {
    if (bootstrapNews.length > 0) {
      setNewsUpdates(bootstrapNews.slice(0, 3));
    }
  }, [bootstrapNews]);

  // Search, modal and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchItems, setSearchItems] = useState<any[]>([]);
  const [selectedItemLeaderboard, setSelectedItemLeaderboard] = useState<any | null>(null);
  const [itemLeaderboardModalOpen, setItemLeaderboardModalOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [headerSearchVisible, setHeaderSearchVisible] = useState(false);
  const [showHeaderSearchDropdown, setShowHeaderSearchDropdown] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileHeaderSearchActive, setMobileHeaderSearchActive] = useState(false);
  const mobileHeaderSearchInputRef = useRef<HTMLInputElement>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [modalCalcTab, setModalCalcTab] = useState<'OVERALL' | 'SUBJECTS' | 'PROGRAMMES' | 'RAW'>('OVERALL');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingStudent, setReportingStudent] = useState<any | null>(null);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  // Dark/Light Theme Support & Secret Triple-Click on Imaginary Box
  const { theme, isDark, toggleTheme } = useTheme();
  const secretClickCountRef = useRef(0);
  const secretClickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [themeNotification, setThemeNotification] = useState<{ visible: boolean; mode: 'dark' | 'light' }>({
    visible: false,
    mode: 'light',
  });

  const handleSecretBoxTripleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    secretClickCountRef.current += 1;

    if (secretClickTimerRef.current) {
      clearTimeout(secretClickTimerRef.current);
    }

    if (secretClickCountRef.current >= 3) {
      secretClickCountRef.current = 0;
      const targetMode = isDark ? 'light' : 'dark';
      toggleTheme();
      setThemeNotification({ visible: true, mode: targetMode });
      setTimeout(() => {
        setThemeNotification((prev) => ({ ...prev, visible: false }));
      }, 1600);
    } else {
      secretClickTimerRef.current = setTimeout(() => {
        secretClickCountRef.current = 0;
      }, 1200);
    }
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const headerSearchContainerRef = useRef<HTMLDivElement>(null);
  const headerSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Track scroll position for header blur effect and animated search bar transition
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 20);

      let isVisible = false;
      if (searchContainerRef.current) {
        const rect = searchContainerRef.current.getBoundingClientRect();
        // Visible when hero search has scrolled past the sticky header (~60px)
        isVisible = rect.bottom < 60;
      } else {
        isVisible = scrollY > 220;
      }

      setHeaderSearchVisible((prev) => {
        if (prev !== isVisible) {
          // If search active with query, transfer dropdown visibility smoothly
          if (searchQuery.trim()) {
            if (isVisible) {
              setShowSearchDropdown(false);
              setShowHeaderSearchDropdown(true);
            } else {
              setShowHeaderSearchDropdown(false);
              setShowSearchDropdown(true);
            }
          }
        }
        return isVisible;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchQuery]);

  // Fetch Latest 3 Updates if not yet available in bootstrap
  useEffect(() => {
    if (bootstrapNews.length > 0) return;
    fetch('/api/news?limit=3')
      .then((res) => res.json())
      .then((data) => {
        if (data.news) setNewsUpdates(data.news);
      })
      .catch((err) => console.error('Error fetching homepage news:', err));
  }, [bootstrapNews]);

  // Click outside to close search dropdowns (both hero and header)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setShowSearchDropdown(false);
      }
      if (headerSearchContainerRef.current && !headerSearchContainerRef.current.contains(target)) {
        setShowHeaderSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial master data if not in bootstrap
  useEffect(() => {
    if (categories.length > 0 && classes.length > 0) return;
    getAcademicMasterData()
      .then((data) => {
        if (data.categories) setCategories(data.categories);
        if (data.classes) setClasses(data.classes);
        if (data.schools) setSchools(data.schools);
      })
      .catch((err) => console.error('Error fetching academic master data:', err));
  }, []);

  // Fetch Overall SPR leaderboard (with instant cache for default & filtered class views)
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClass) params.append('classId', selectedClass);
    const cacheKey = params.toString() || 'overview';

    // If overview and we have bootstrap data, use it immediately
    if (!selectedClass && bootstrapLeaderboard.length > 0) {
      setLeaderboard(bootstrapLeaderboard);
      setLoadingLeaderboard(false);
      return;
    }

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
  }, [selectedClass, bootstrapLeaderboard]);

  // Global search debouncing (search by Name, ID, Class, School, Programmes, Competitions, Exams)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchItems([]);
      setShowSearchDropdown(false);
      setShowHeaderSearchDropdown(false);
      setSearching(false);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(false);
    if (headerSearchVisible) {
      setShowHeaderSearchDropdown(true);
    } else {
      setShowSearchDropdown(true);
    }

    let isCurrent = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/public/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (!isCurrent) return;
          setSearchResults(data.students || []);
          setSearchItems((data.items || []).filter((item: any) => (item.participantCount || 0) > 0));
          setSearching(false);
          setHasSearched(true);
          if (headerSearchVisible) {
            setShowHeaderSearchDropdown(true);
          } else {
            setShowSearchDropdown(true);
          }
        })
        .catch((err) => {
          if (!isCurrent || err.name === 'AbortError') return;
          console.error(err);
          setSearching(false);
          setHasSearched(true);
        });
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [searchQuery, headerSearchVisible]);

  // Click on a Programme / Exam item from search
  const handleItemClick = (item: any) => {
    setSelectedItemLeaderboard(item);
    setItemLeaderboardModalOpen(true);
    setShowSearchDropdown(false);
    setShowHeaderSearchDropdown(false);
    setMobileSearchOpen(false);
  };

  // Direct Navigation to Student Profile
  const handleStudentClick = (studentId: string) => {
    if (!studentId) return;
    setShowSearchDropdown(false);
    setShowHeaderSearchDropdown(false);
    router.push(`/student/${studentId}`);
  };

  // Open Student Modal Dossier with 0ms instantaneous cache
  const openStudentDossier = (studentId: string) => {
    if (!studentId) return;
    setSelectedStudentId(studentId);
    setShowSearchDropdown(false);

    const cached = homeStudentProfileMemory.get(studentId);
    if (cached) {
      setStudentProfile(cached);
      setLoadingProfile(false);
    } else {
      setLoadingProfile(true);
    }

    fetch(`/api/public/student/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          const profileData = {
            ...data.profile,
            creativeWorks: data.creativeWorks || [],
            libraryRecords: data.libraryRecords || [],
          };
          homeStudentProfileMemory.set(studentId, profileData);
          setStudentProfile(profileData);
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

  // Scroll-driven row reveal observer for leaderboard
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-reveal-visible');
          }
        });
      },
      { rootMargin: '0px 0px -25px 0px', threshold: 0.05 }
    );

    const targets = document.querySelectorAll('.scroll-reveal-target');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [displayedLeaderboard, loadingLeaderboard]);

  // Shared Search Dropdown content renderer for Hero, Header, and Mobile search bars
  const renderSearchDropdownContent = (closeDropdown: () => void) => {
    if (searching || !hasSearched) {
      return (
        <div className="py-7 px-4 flex flex-col items-center justify-center space-y-2 text-center">
          <Loader2 className="w-6 h-6 text-blue-600 dark:text-blue-400 animate-spin" />
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Searching programmes, exams & students...
          </div>
          <div className="text-[10.5px] text-slate-400 dark:text-slate-500 font-medium">
            Accessing SPR Registry
          </div>
        </div>
      );
    }

    if (searchItems.length > 0 || searchResults.length > 0) {
      return (
        <>
          {/* Section 1: Programmes, Competitions & Exams */}
          {searchItems.length > 0 && (
            <div>
              <div className="p-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/40 dark:to-transparent border-b border-amber-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-300 font-bold">
                <span className="flex items-center space-x-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Evaluated Leaderboards ({searchItems.length})</span>
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Click to view leaderboard</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {searchItems.map((item) => (
                  <button
                    key={`d-${item.type}-${item.id || item.name}`}
                    onClick={() => {
                      closeDropdown();
                      handleItemClick(item);
                    }}
                    className="w-full px-3.5 py-2.5 text-left bg-white dark:bg-slate-900 hover:bg-amber-50/70 dark:hover:bg-slate-800/80 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate flex items-center space-x-1.5">
                        <span>{item.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center space-x-1.5 mt-0.5">
                        {item.parentName && (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300 font-semibold">
                            {item.parentName}
                          </span>
                        )}
                        <span>• {item.categoryName}</span>
                        {item.participantCount > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-bold">
                            • {item.participantCount} evaluated
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-2xs group-hover:bg-amber-500 group-hover:text-white transition">
                      <span>Leaderboard</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Students */}
          {searchResults.length > 0 && (
            <div>
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                <span>Found {searchResults.length} Students</span>
                <button
                  onClick={closeDropdown}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {searchResults.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      closeDropdown();
                      handleStudentClick(st.id);
                    }}
                    className="w-full px-3.5 py-2.5 text-left bg-white dark:bg-slate-900 hover:bg-blue-50/80 dark:hover:bg-slate-800/80 flex items-center justify-between group transition-colors duration-150 cursor-pointer"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="sm" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {st.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center space-x-1 mt-0.5">
                          <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800 text-[9.5px]">
                            {st.sprStudentId || st.studentId}
                          </span>
                          <span>• Standard {formatClassNumber(st.className)} {st.division ? `(${st.division})` : ''} {st.schoolName ? `• ${st.schoolName}` : ''}</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition shadow-2xs shrink-0 ml-2">
                      <Trophy className="w-3 h-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="py-6 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>No programmes, exams or students found for &ldquo;<span className="font-semibold text-slate-800 dark:text-slate-200">{searchQuery}</span>&rdquo;</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Try searching by student name, ID code (e.g. MSOE), or programme name (e.g. HS Essay, Elocution).</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080e1e] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white antialiased transition-colors duration-300">
      {/* Secret Toast Indicator upon successful 3-click trigger */}
      {themeNotification.visible && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-slide-down">
          <div className="px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-100/95 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md text-xs font-black flex items-center space-x-2 border border-white/20 dark:border-slate-800/20">
            <span className="text-sm">{themeNotification.mode === 'dark' ? '🌙' : '☀️'}</span>
            <span>{themeNotification.mode === 'dark' ? 'Dark Mode Activated' : 'Light Mode Activated'}</span>
          </div>
        </div>
      )}

      {/* Header with Very Low Opacity & Backdrop Blur */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 animate-slide-down bg-white/20 dark:bg-slate-950/45 backdrop-blur-md border-b border-white/30 dark:border-slate-800/40 shadow-xs print:hidden pt-[max(0.6rem,env(safe-area-inset-top))] ${
          scrolled ? 'py-2 sm:py-3 bg-white/25 dark:bg-slate-950/60' : 'py-2.5 sm:py-4 bg-white/15 dark:bg-slate-950/35'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          {mobileHeaderSearchActive ? (
            /* Mobile In-Header Full-Width Search Input Bar (Logo & App Name disappear) */
            <div className="sm:hidden flex-1 flex items-center space-x-2 animate-fade-in w-full">
              <div className="flex-1 relative bg-white/95 dark:bg-slate-900/95 rounded-xl border border-blue-500/80 px-2.5 py-1.5 flex items-center shadow-sm">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2 shrink-0" />
                <input
                  ref={mobileHeaderSearchInputRef}
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student, exam, or programme..."
                  className="w-full text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 bg-transparent outline-none font-semibold"
                />
                {searching && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 mr-1.5 shrink-0" />
                )}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchItems([]);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setMobileHeaderSearchActive(false);
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchItems([]);
                }}
                className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {/* Logo & Mobile Branding (EXCELLENCE) */}
              <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group shrink-0">
                <div className="w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                  <Image
                    src="/logo.png"
                    alt="School of Excellence"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain drop-shadow-xs"
                    priority
                  />
                </div>
                <div>
                  {/* Desktop Branding */}
                  <div className="hidden sm:block">
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                      MADIN SCHOOL OF EXCELLENCE
                    </h1>
                    <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase flex items-center space-x-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>SPR Evaluation Platform</span>
                    </div>
                  </div>

                  {/* Clean Mobile Branding: EXCELLENCE */}
                  <div className="sm:hidden flex flex-col">
                    <div className="text-[11px] font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">
                      EXCELLENCE
                    </div>
                    <div className="mt-1 inline-flex items-center px-1.5 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                      <span className="text-[8.5px] font-black tracking-widest uppercase">SPR PLATFORM</span>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Animated Header Search Bar (Revealed smoothly in header center on scroll) */}
              <div
                ref={headerSearchContainerRef}
                className={`hidden sm:flex flex-1 max-w-sm md:max-w-md lg:max-w-lg mx-2 sm:mx-4 relative z-30 transition-all duration-300 ease-out origin-center ${
                  headerSearchVisible
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                }`}
              >
                <div className="w-full relative bg-white/95 dark:bg-slate-900/95 rounded-xl shadow-md border border-slate-200/90 dark:border-slate-800 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 transition-all px-3 py-1.5 flex items-center">
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    ref={headerSearchInputRef}
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      if (searchQuery.trim()) setShowHeaderSearchDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowHeaderSearchDropdown(false);
                      if (e.key === 'Enter' && searchResults.length > 0) {
                        handleStudentClick(searchResults[0].id);
                      }
                    }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search student, programme or exam..."
                    className="w-full text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent outline-none font-semibold"
                  />
                  {searching && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 mr-2 shrink-0" />
                  )}
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setSearchItems([]);
                        setShowHeaderSearchDropdown(false);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Clear search"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Completely Opaque Search Dropdown for Header Search */}
                {showHeaderSearchDropdown && searchQuery.trim().length >= 1 && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] max-h-96 overflow-y-auto animate-slide-up divide-y divide-slate-100 dark:divide-slate-800">
                    {renderSearchDropdownContent(() => setShowHeaderSearchDropdown(false))}
                  </div>
                )}
              </div>

              {/* Header Action Icons */}
              <div className="flex items-center space-x-2 shrink-0">
                <Link
                  href="/updates"
                  className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-transparent dark:border-slate-800 btn-interactive"
                  title="Official News & Announcements"
                  aria-label="Updates"
                >
                  <Megaphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                </Link>
                {/* Search icon triggers in-header search on mobile */}
                <button
                  onClick={() => {
                    if (headerSearchVisible && headerSearchInputRef.current && window.innerWidth >= 640) {
                      headerSearchInputRef.current.focus();
                    } else {
                      setMobileHeaderSearchActive(true);
                      setTimeout(() => mobileHeaderSearchInputRef.current?.focus(), 50);
                    }
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-transparent dark:border-slate-800 btn-interactive ${
                    headerSearchVisible ? 'sm:hidden' : ''
                  }`}
                  title="Search Students & Programs"
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <Link
                  href="/leaderboard"
                  className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-transparent dark:border-slate-800 btn-interactive"
                  title="Open Full Standings"
                  aria-label="Leaderboard"
                >
                  <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                </Link>
                <Link
                  href="/categories"
                  className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-transparent dark:border-slate-800 btn-interactive"
                  title="Evaluation Categories & Wings"
                  aria-label="Categories"
                >
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400" />
                </Link>
                <Link
                  href="/student/login"
                  className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/90 dark:bg-slate-900/90 hover:bg-emerald-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-xs border border-transparent dark:border-slate-800 btn-interactive"
                  title="Student Portal (Earnings & Wallet)"
                  aria-label="Student Portal"
                >
                  <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
                </Link>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile In-Header Search Results Dropdown */}
      {mobileHeaderSearchActive && searchQuery.trim().length >= 1 && (
        <div className="sm:hidden fixed left-3 right-3 top-14 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[120] max-h-[75vh] overflow-y-auto animate-slide-up divide-y divide-slate-100 dark:divide-slate-800">
          {renderSearchDropdownContent(() => {
            setMobileHeaderSearchActive(false);
          })}
        </div>
      )}

      {/* Mobile Search Modal Overlay */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 pt-16 sm:hidden animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
                <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Search SPR Students</span>
              </div>
              <button
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearchQuery('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-1 flex items-center focus-within:ring-2 focus-within:ring-blue-600">
              <Search className="w-4 h-4 text-slate-400 ml-2.5 shrink-0" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter student name, ID (e.g. MSOE, SPR), or class..."
                className="w-full px-2.5 py-2 text-xs text-slate-900 dark:text-slate-100 bg-transparent outline-none font-semibold placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mr-1.5"
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
            ) : (searchItems.length > 0 || searchResults.length > 0) ? (
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {/* Programmes, Competitions & Exams */}
                {searchItems.length > 0 && (
                  <div className="border-b border-slate-100 dark:border-slate-800">
                    <div className="p-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-amber-950/30 text-[10.5px] font-bold text-amber-900 dark:text-amber-300 flex items-center justify-between">
                      <span className="flex items-center space-x-1">
                        <Trophy className="w-3 h-3 text-amber-600" />
                        <span>Evaluated Leaderboards ({searchItems.length})</span>
                      </span>
                      <span className="text-[9.5px] text-amber-700 dark:text-amber-400">View Rankings</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {searchItems.map((item) => (
                        <button
                          key={`m-${item.type}-${item.id || item.name}`}
                          onClick={() => handleItemClick(item)}
                          className="w-full p-2.5 text-left hover:bg-amber-50/70 dark:hover:bg-slate-800/80 flex items-center justify-between transition"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.name}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {item.parentName ? `${item.parentName} • ` : ''}{item.categoryName}
                              {item.participantCount > 0 ? ` • ${item.participantCount} evaluated` : ''}
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-700">
                            Leaderboard
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Students */}
                {searchResults.length > 0 && (
                  <div>
                    {searchItems.length > 0 && (
                      <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-[10.5px] font-bold text-slate-600 dark:text-slate-300">
                        Students ({searchResults.length})
                      </div>
                    )}
                    {searchResults.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setMobileSearchOpen(false);
                          handleStudentClick(st.id);
                        }}
                        className="w-full p-2.5 text-left hover:bg-blue-50/80 dark:hover:bg-slate-800/80 flex items-center justify-between transition"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="sm" />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{st.fullName}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center space-x-1 mt-0.5">
                              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1 py-0.2 rounded border border-blue-200 dark:border-blue-800 text-[9px]">
                                {st.sprStudentId || st.studentId}
                              </span>
                              <span>• Standard {formatClassNumber(st.className)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 ml-2">
                          <Trophy className="w-3 h-3" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : searchQuery.trim() ? (
              <div className="py-4 text-center text-xs text-slate-400">
                No programmes, exams, or students found matching &quot;{searchQuery}&quot;
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Top Hero Section with Rich Sunset Mosque Background (Clarity & Vivid Colors) */}
      <section className="relative overflow-hidden pt-8 pb-6 sm:pt-10 sm:pb-8 print:hidden">
        {/* Secret Imaginary Box for Theme Toggle (Click 3 times to switch Dark/Light mode) */}
        <div
          onClick={handleSecretBoxTripleClick}
          className="absolute top-0 left-0 w-[34%] sm:w-[28%] md:w-[26%] lg:w-[24%] h-[68%] sm:h-[75%] z-25 cursor-default select-none pointer-events-auto"
          aria-hidden="true"
        />

        {/* Rich Sunset Mosque Background Image with High Clarity */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.70] dark:opacity-[0.62] pointer-events-none select-none transition-opacity duration-500"
          style={{ backgroundImage: "url('/hero-bg.jpg')", height: '90%' }}
        />
        {/* Light black shadow on the background image in homepage when the app is in dark mode */}
        <div
          className="absolute inset-0 bg-black/0 dark:bg-black/55 pointer-events-none transition-colors duration-500"
          style={{ height: '90%' }}
        />
        {/* Soft, Transparent Gradient blending seamlessly into light and dark page backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 via-75% to-[#f8fafc] dark:from-transparent dark:via-[#080e1e]/40 dark:to-[#080e1e] pointer-events-none transition-colors duration-500" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#f8fafc] to-transparent dark:from-[#080e1e] dark:to-transparent pointer-events-none transition-colors duration-500" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Content with Smooth Staggered Slide-In & Harmonious Sunset Lighting */}
          <div id="search-section" className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4 pb-4 sm:pb-8">
            <div className="max-w-3xl mx-auto space-y-2 sm:space-y-3">
              <h2 className="text-xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-snug drop-shadow-lg animate-slide-up">
                Elevating Potential Through <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 drop-shadow-md">
                  Holistic Performance Analytics
                </span>
              </h2>

              <p className="text-[11px] sm:text-base text-white/95 max-w-xl mx-auto leading-relaxed font-semibold animate-slide-up delay-100 drop-shadow-md">
                A comprehensive, multi-dimensional evaluation benchmark uniting Islamic education, academic excellence, leadership, creative arts, and literacy.
              </p>
            </div>

            {/* Quick Student Search Box (Desktop Only; on mobile it is accessed via Header search icon) */}
            <div ref={searchContainerRef} className="hidden sm:block pt-2 max-w-2xl mx-auto relative z-30 text-left animate-slide-up delay-150">
              <div className="relative bg-white dark:bg-slate-900/90 rounded-2xl shadow-xl shadow-slate-300/40 dark:shadow-black/50 border-2 border-slate-200/90 dark:border-slate-800 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/15 transition-all p-1.5 sm:p-2 flex items-center">
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
                  placeholder="Search student, programme (e.g. HS Essay, Elocution), or exam..."
                  className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-transparent outline-none font-semibold"
                />
                {searching && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3 shrink-0" />
                )}
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchItems([]);
                      setShowSearchDropdown(false);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Completely Opaque Isolated Search Dropdown (z-[100]) */}
              {showSearchDropdown && searchQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] max-h-96 overflow-y-auto animate-slide-up divide-y divide-slate-100 dark:divide-slate-800">
                  {renderSearchDropdownContent(() => setShowSearchDropdown(false))}
                </div>
              )}
            </div>

            {/* Quick Counters */}
            <div className="pt-1 sm:pt-2 grid grid-cols-2 gap-2 sm:gap-4 max-w-xs sm:max-w-md mx-auto relative z-10">
              <div className="p-2 sm:p-3.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm animate-slide-left delay-200 card-interactive flex flex-col items-center justify-center text-center">
                <div className="text-base sm:text-2xl font-black text-blue-600 dark:text-blue-400 flex items-center justify-center space-x-1.5 text-center">
                  {loadingLeaderboard ? (
                    <span className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 dark:text-blue-400 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping inline-block mr-1"></span>
                      <span>Calculating...</span>
                    </span>
                  ) : (
                    <span>{leaderboard.length}</span>
                  )}
                </div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5 text-center">Evaluated Students</div>
              </div>
              <div className="p-2 sm:p-3.5 bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm animate-slide-right delay-200 card-interactive flex flex-col items-center justify-center text-center">
                <div className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 text-center">6 Wings</div>
                <div className="text-[10px] sm:text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5 text-center">Curricular & Co-curricular</div>
              </div>
            </div>
          </div>

          {/* Loading Process Video Container */}
          {loadingLeaderboard && (
            <div className="mt-4 pb-6 relative z-10 flex justify-center animate-fade-in">
              <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-sm rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-md max-w-sm w-full flex flex-col items-center justify-center text-center">
                <VideoLoader size="lg" text="Loading SPR Live Standings..." subtext="Accessing Student Performance Registry" />
              </div>
            </div>
          )}

          {/* Top 3 Institutional Podium Showcase (Dynamic Rank & Tie-Aware Layout) */}
          {!loadingLeaderboard && top3.length >= 3 && (
            <div className="mt-2 pb-6 relative z-10">
              <div className="text-center mb-5 animate-slide-up delay-200">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 bg-blue-50/90 dark:bg-blue-950/60 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800/80 shadow-2xs">
                  Top Institutional Honors
                </span>
                <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 drop-shadow-2xs">Overall SPR Champions</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">Leading institutional benchmarks across all evaluation wings</p>
              </div>

              {/* Mobile Top Honors Indicator */}
              <div className="sm:hidden flex items-center justify-between px-2 pb-2 text-[11px] text-slate-500 font-bold">
                <span className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200">
                  <span className="text-sm">🏆</span>
                  <span className="font-extrabold tracking-wide uppercase text-xs">Top Honors</span>
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-100/70 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300/80 dark:border-amber-800">
                  Podium
                </span>
              </div>

              {/* Top 3 Toppers: Vertically downward layout, 1st at center, 2nd at left, 3rd at right, box sizes reducing by rank */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-4 max-w-4xl mx-auto items-end px-1 sm:px-0 pt-2 sm:pt-4">
                {/* Left Column: 2nd Rank (Silver - Medium Box Size) */}
                {(() => {
                  const student = top3[1];
                  const rank = student?.rank ?? 2;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className="w-full cursor-pointer rounded-2xl sm:rounded-3xl p-2 sm:p-4 border-2 border-slate-300/90 dark:border-slate-700 bg-gradient-to-b from-slate-50/90 via-white to-white dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-between text-center min-h-[180px] sm:min-h-[240px] group animate-podium-2 hover:-translate-y-1"
                    >
                      <div className="flex flex-col items-center mb-1">
                        <div className="relative">
                          <StudentAvatar
                            photoUrl={student?.photoUrl}
                            name={student?.studentName || student?.name || 'Student'}
                            size="lg"
                            className="w-11 h-11 sm:w-16 sm:h-16 ring-2 sm:ring-3 ring-slate-300 dark:ring-slate-600 shadow-xs"
                          />
                          <span className="absolute -bottom-1 -right-1 text-[11px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-black bg-white dark:bg-slate-800 shadow-2xs border border-slate-200 dark:border-slate-700">
                            🥈
                          </span>
                        </div>
                        <div className="text-[8px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 sm:px-2.5 py-0.5 rounded-full shadow-2xs border bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 mt-1 sm:mt-1.5">
                          ★ 2nd Rank {isTied ? '(Joint)' : ''} ★
                        </div>
                      </div>

                      <div className="w-full min-w-0 px-0.5">
                        <h4 className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 leading-tight line-clamp-2">
                          {student?.studentName || student?.name}
                        </h4>
                        <div className="text-[8.5px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Std {formatClassNumber(student?.className)}
                        </div>
                      </div>

                      <div className="w-full pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1">
                        <span className="text-[11px] sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                          {formatScore(student?.overallScore ?? student?.spr)} <span className="text-[9px] sm:text-xs font-semibold text-slate-500">pts</span>
                        </span>
                        <button
                          onClick={(e) => openReportModal(e, student)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 transition"
                          title="Report discrepancy"
                        >
                          <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Center Column: 1st Rank (Champion - Largest Box Size, Highest Elevation) */}
                {(() => {
                  const student = top3[0];
                  const rank = student?.rank ?? 1;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className="w-full cursor-pointer rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 border-2 border-amber-400 dark:border-amber-500/70 bg-gradient-to-b from-amber-50/95 via-white to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 shadow-md sm:shadow-xl hover:shadow-2xl transition-all flex flex-col items-center justify-between text-center min-h-[210px] sm:min-h-[280px] -translate-y-2 sm:-translate-y-4 group animate-podium-1 animate-gold-glow"
                    >
                      <div className="flex flex-col items-center mb-1">
                        <div className="relative">
                          <StudentAvatar
                            photoUrl={student?.photoUrl}
                            name={student?.studentName || student?.name || 'Student'}
                            size="xl"
                            className="w-14 h-14 sm:w-22 sm:h-22 ring-3 sm:ring-4 ring-amber-300/70 dark:ring-amber-500/50 shadow-md shadow-amber-400/30"
                          />
                          <span className="absolute -bottom-1 -right-1 text-xs sm:text-sm px-1.5 py-0.5 rounded-full font-black bg-amber-100 dark:bg-amber-950 shadow-2xs border border-amber-300 dark:border-amber-700">
                            🥇
                          </span>
                        </div>
                        <div className="text-[9px] sm:text-xs font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 px-2 sm:px-3 py-0.5 rounded-full shadow-2xs mt-1 sm:mt-1.5">
                          ★ 1st Champion {isTied ? '(Joint)' : ''} ★
                        </div>
                      </div>

                      <div className="w-full min-w-0 px-0.5">
                        <h4 className="text-xs sm:text-base font-black text-slate-900 dark:text-white group-hover:text-amber-800 dark:group-hover:text-amber-400 leading-tight line-clamp-2">
                          {student?.studentName || student?.name}
                        </h4>
                        <div className="text-[9.5px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Std {formatClassNumber(student?.className)}
                        </div>
                      </div>

                      <div className="w-full pt-1.5 mt-1 border-t border-amber-100 dark:border-amber-950/60 flex items-center justify-center gap-1">
                        <span className="text-xs sm:text-2xl font-black text-amber-800 dark:text-amber-300">
                          {formatScore(student?.overallScore ?? student?.spr)} <span className="text-[9.5px] sm:text-xs font-semibold text-amber-700/80">pts</span>
                        </span>
                        <button
                          onClick={(e) => openReportModal(e, student)}
                          className="p-0.5 text-amber-600 hover:text-rose-600 transition"
                          title="Report discrepancy"
                        >
                          <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Right Column: 3rd Rank (Bronze - Smallest Box Size, Stepped Down Lowest) */}
                {(() => {
                  const student = top3[2];
                  const rank = student?.rank ?? 3;
                  const isTied = student?.isTied || leaderboard.filter((s) => s.spr === student?.spr).length > 1;

                  return (
                    <div
                      onClick={() => handleStudentClick(student?.studentId)}
                      className="w-full cursor-pointer rounded-2xl sm:rounded-3xl p-1.5 sm:p-3.5 border border-amber-300/80 dark:border-amber-900/60 bg-gradient-to-b from-amber-50/50 via-white to-white dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900 shadow-xs hover:shadow-md transition-all flex flex-col items-center justify-between text-center min-h-[160px] sm:min-h-[215px] group animate-podium-3 hover:-translate-y-1"
                    >
                      <div className="flex flex-col items-center mb-1">
                        <div className="relative">
                          <StudentAvatar
                            photoUrl={student?.photoUrl}
                            name={student?.studentName || student?.name || 'Student'}
                            size="md"
                            className="w-9 h-9 sm:w-14 sm:h-14 ring-2 ring-amber-600/50 dark:ring-amber-800/60 shadow-xs"
                          />
                          <span className="absolute -bottom-1 -right-1 text-[10px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded-full font-black bg-white dark:bg-slate-800 shadow-2xs border border-amber-200 dark:border-amber-800">
                            🥉
                          </span>
                        </div>
                        <div className="text-[7.5px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shadow-2xs border bg-amber-100/80 dark:bg-amber-950/70 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 mt-1 sm:mt-1.5">
                          ★ 3rd Rank {isTied ? '(Joint)' : ''} ★
                        </div>
                      </div>

                      <div className="w-full min-w-0 px-0.5">
                        <h4 className="text-[10px] sm:text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight line-clamp-2">
                          {student?.studentName || student?.name}
                        </h4>
                        <div className="text-[8px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          Std {formatClassNumber(student?.className)}
                        </div>
                      </div>

                      <div className="w-full pt-1.5 mt-1 border-t border-amber-100 dark:border-amber-950/60 flex items-center justify-center gap-1">
                        <span className="text-[10px] sm:text-base font-bold text-amber-800 dark:text-amber-300">
                          {formatScore(student?.overallScore ?? student?.spr)} <span className="text-[8.5px] sm:text-xs font-semibold text-slate-500">pts</span>
                        </span>
                        <button
                          onClick={(e) => openReportModal(e, student)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 transition"
                          title="Report discrepancy"
                        >
                          <Flag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
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
                  <div className="mt-4 p-3.5 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-900/50 rounded-2xl max-w-4xl mx-auto text-center shadow-xs animate-fade-in">
                    <div className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center justify-center space-x-1.5">
                      <span>🏆</span>
                      <span>{rank1Students.length} Students Jointly Share 1st Rank ({formatScore(rank1Students[0]?.spr ?? 0)} SPR Points)</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2">
                      {rank1Students.map((st) => (
                        <button
                          key={st.studentId}
                          onClick={() => handleStudentClick(st.studentId)}
                          className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-full text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-amber-100/80 dark:hover:bg-slate-800 shadow-2xs transition"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>{st.studentName || st.name}</span>
                          <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">Std {formatClassNumber(st.className)}</span>
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-100 dark:bg-blue-950/80 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Live Standings Overview
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Top Institutional Performers
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Institution-wide overall SPR benchmarks.
            </p>
          </div>

          <Link
            href="/leaderboard"
            className="inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-3.5 py-2 rounded-xl transition btn-interactive"
          >
            <span>Full Standings Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Toolbar (Search & Class Filter Only) */}
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search by student name..."
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden w-full">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-9 sm:w-16 text-center">#</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4">Student</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-4 w-10 sm:w-20 text-center">Class</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-24 sm:w-32 text-right">SPR Points</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 w-8 sm:w-12 text-center" title="Report issue"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {loadingLeaderboard ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading live standings..." subtext="SPR Evaluation Platform" />
                    </td>
                  </tr>
                ) : displayedLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400">
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
                    const classNum = formatClassNumber(row.className);

                    return (
                      <tr
                        key={row.studentId}
                        onClick={() => handleStudentClick(row.studentId)}
                        className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors duration-150 group ${
                          isTop1 ? 'bg-amber-50/20 dark:bg-amber-950/10' : ''
                        }`}
                        title="Click to view full student profile and score origin breakdown"
                      >
                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] sm:text-xs shadow-xs animate-gold-glow">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] sm:text-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-200 dark:bg-amber-700/60 text-amber-900 dark:text-amber-200 font-bold text-[10px] sm:text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] sm:text-xs">{row.rank}</span>
                          )}
                        </td>

                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            <StudentAvatar photoUrl={row.photoUrl} name={studentDisplayName} size="sm" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                            <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors text-[11px] sm:text-xs leading-tight line-clamp-2">
                              {studentDisplayName}
                            </span>
                          </div>
                        </td>

                        {/* Class column showing NUMBER ONLY (e.g., "8", "9", "10") */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs font-black">
                            {classNum}
                          </span>
                        </td>

                        <td className="py-2 sm:py-3.5 px-2 sm:px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg sm:rounded-xl font-mono text-xs font-black shadow-2xs border transition-all group-hover:scale-105 bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                            <span className={isTop1 ? 'text-amber-800 dark:text-amber-300 font-black' : isTop2 ? 'text-slate-800 dark:text-slate-200 font-black' : isTop3 ? 'text-amber-900 dark:text-amber-300 font-black' : 'text-blue-900 dark:text-blue-300 font-extrabold'}>
                              {studentSprScore}
                            </span>
                            <span className={`text-[8.5px] sm:text-[9.5px] font-black uppercase px-1 py-0.2 rounded ${
                              isTop1 ? 'bg-amber-400 dark:bg-amber-500 text-amber-950' : isTop2 ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : isTop3 ? 'bg-amber-300 dark:bg-amber-600 text-amber-950' : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            }`}>
                              PTS
                            </span>
                          </div>
                        </td>

                        {/* Report Icon Button */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                          <button
                            onClick={(e) => openReportModal(e, row)}
                            className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
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
          <div className="p-3 bg-slate-50/90 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 text-center">
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
            <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center space-x-1.5 w-fit">
              <Megaphone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Broadcasts & Circulars</span>
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              Latest Updates & Announcements
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Official bulletins, literary festival circulars, and assessment updates from Madin Excellence.
            </p>
          </div>

          <Link
            href="/updates"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-3.5 py-2 rounded-xl transition border border-amber-200 dark:border-amber-800 shadow-2xs btn-interactive w-fit"
          >
            <span>More Updates ({newsUpdates.length > 0 ? 'All' : '0'})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {newsUpdates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {newsUpdates.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/80 p-3 sm:p-5 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden"
              >
                <div className="space-y-2.5">
                  {item.imageUrl ? (
                    <div className="relative w-full h-40 sm:h-48 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-500"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-800">
                      <Megaphone className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex items-center space-x-1.5 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      {new Date(item.publishedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-400 transition leading-snug">
                    {item.title}
                  </h4>

                  {item.subtitle && (
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-400 font-semibold leading-relaxed">
                      {item.subtitle}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400 group-hover:text-amber-800 dark:group-hover:text-amber-300">
                  <span className="group-hover:underline">Read Full</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 flex items-center justify-center transition">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            No announcements posted at this time.
          </div>
        )}

        {/* More Updates Button */}
        <div className="text-center pt-2 pb-6">
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative my-8 max-h-[90vh] overflow-y-auto animate-zoom-up">
            <button
              onClick={closeStudentDossier}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition"
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
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-5 pb-6 border-b border-slate-100 dark:border-slate-800">
                  <StudentAvatar
                    photoUrl={studentProfile.student?.photoUrl}
                    name={studentProfile.student?.fullName || 'Student'}
                    size="xl"
                  />

                  <div className="text-center sm:text-left flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pb-0.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        SPR ID: {studentProfile.student?.sprStudentId || studentProfile.student?.studentId}
                      </span>
                      <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Verified Academic Profile</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {studentProfile.student?.fullName}
                    </h3>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                      Standard: <span className="font-bold text-slate-900 dark:text-white">{formatClassNumber(studentProfile.student?.class?.name)}</span> {studentProfile.student?.division ? `(Division ${studentProfile.student?.division})` : ''}
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
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Class Rank</div>
                    <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      #{studentProfile.classRank || 1}{' '}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">/ {studentProfile.totalStudentsInClass || 1}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total SPR Points</div>
                    <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                      {formatScore(studentProfile.overallScore ?? studentProfile.overallSPR)} pts
                    </div>
                  </div>
                </div>

                {/* Interactive Calculation Breakdown View Switcher */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Performance & Points Breakdown
                    </h4>
                    <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                      <button
                        onClick={() => setModalCalcTab('OVERALL')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'OVERALL' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        SPR Points
                      </button>
                      <button
                        onClick={() => setModalCalcTab('SUBJECTS')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'SUBJECTS' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Academic Marks
                      </button>
                      <button
                        onClick={() => setModalCalcTab('PROGRAMMES')}
                        className={`px-2 py-1 rounded-md transition ${
                          modalCalcTab === 'PROGRAMMES' ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
                            <div key={cat.categoryId} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-900 dark:text-white">{cat.categoryName}</span>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {cat.recordsCount || 0} valid record(s)
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-extrabold text-blue-700 dark:text-blue-400 text-sm">
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
                          <div key={r.id || idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{r.subjectName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  Category: {r.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Assessment: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.examName || r.termName || 'Assessment'}</span>
                                {r.institutionName && <span className="ml-1.5 text-blue-700 dark:text-blue-400">• {r.institutionName}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="font-mono font-extrabold text-blue-700 dark:text-blue-400 text-sm sm:text-base">
                                {r.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
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
                          <div key={r.id || idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs hover:bg-slate-100/70 dark:hover:bg-slate-700/60 transition">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{r.competitionName}</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  Category: {r.categoryName}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                Fest / Program: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.festName}</span>
                                <span className="ml-1.5 text-slate-400">• Level: <span className="font-semibold text-slate-700 dark:text-slate-300">{r.levelName}</span></span>
                              </div>
                              {r.remarks && <div className="text-[10px] text-emerald-700 dark:text-emerald-400 italic">{r.remarks}</div>}
                            </div>
                            <div className="text-right shrink-0 ml-3">
                              <div className="font-mono font-extrabold text-purple-700 dark:text-purple-400 text-sm sm:text-base">
                                {r.percentage.toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                          No direct festival records found. Literary & Program scores are aggregated in the overall SPR registry.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Creative Hub Works */}
                {studentProfile.creativeWorks && studentProfile.creativeWorks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Creative Hub Submissions ({studentProfile.creativeWorks.length})
                    </h4>
                    <div className="space-y-1.5">
                      {studentProfile.creativeWorks.map((work: any) => (
                        <div key={work.id} className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 dark:text-white">{work.title}</span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/70 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Category: Creative Hub ({work.category?.name || 'Literary'})
                              </span>
                            </div>
                            {work.content && <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{work.content}</div>}
                          </div>
                          <span className="font-bold text-purple-900 dark:text-purple-300 text-sm">{work.percentage ? `${work.percentage.toFixed(1)}%` : '100.0%'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modal Footer Actions (In SAME Tab) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                  <button
                    onClick={(e) => openReportModal(e, studentProfile)}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 text-xs font-bold transition"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Discrepancy</span>
                  </button>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/student/${studentProfile.student?.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1"
                    >
                      <span>View Official Dossier</span>
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

      {/* News Detail Reader Modal */}
      <NewsDetailModal
        isOpen={!!selectedNews}
        news={selectedNews}
        onClose={() => setSelectedNews(null)}
      />

      {/* Programme / Competition / Exam Item Leaderboard Modal */}
      <ItemLeaderboardModal
        isOpen={itemLeaderboardModalOpen}
        onClose={() => {
          setItemLeaderboardModalOpen(false);
          setSelectedItemLeaderboard(null);
        }}
        item={selectedItemLeaderboard}
        onSelectStudent={(studentId) => {
          setItemLeaderboardModalOpen(false);
          openStudentDossier(studentId);
        }}
      />

      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
