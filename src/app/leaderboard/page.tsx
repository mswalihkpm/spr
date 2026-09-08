'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  Medal,
  Search,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  ArrowLeft,
  ArrowRight,
  Flag,
  RotateCcw,
  CheckCircle2,
  Lock,
  Layers,
  X,
  ExternalLink,
  ChevronRight,
  Percent,
  Printer,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import StudentReportModal from '@/components/modals/StudentReportModal';
import PwaFooterInstall from '@/components/pwa/PwaFooterInstall';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getAcademicMasterData } from '@/lib/academic-client';

// Global client-side memory caches for 0ms instant loading
const clientLeaderboardMemory = new Map<string, any[]>();
const clientProfileMemory = new Map<string, any>();

function LeaderboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('categoryId') || '';
  const initialStream = searchParams.get('stream') || '';
  const initialFest = searchParams.get('fest') || '';

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedStream, setSelectedStream] = useState(initialStream);
  const [selectedFest, setSelectedFest] = useState(initialFest);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingStudent, setReportingStudent] = useState<any | null>(null);

  // Student Dossier & % Calculation Modal State
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [modalCalcTab, setModalCalcTab] = useState<'OVERALL' | 'SUBJECTS' | 'PROGRAMMES'>('OVERALL');

  // Sync parameters from URL query changes
  useEffect(() => {
    const catParam = searchParams.get('categoryId') || '';
    const streamParam = searchParams.get('stream') || '';
    const festParam = searchParams.get('fest') || '';
    setSelectedCategory(catParam);
    setSelectedStream(streamParam);
    setSelectedFest(festParam);

    // Set sensible default calculation tab based on active view
    if (festParam) {
      setModalCalcTab('PROGRAMMES');
    } else if (streamParam || catParam) {
      const isExamCat = catParam && categories.find((c) => c.id === catParam)?.code === 'SCHOOL';
      if (streamParam || isExamCat) {
        setModalCalcTab('SUBJECTS');
      } else {
        setModalCalcTab('OVERALL');
      }
    } else {
      setModalCalcTab('OVERALL');
    }
  }, [searchParams, categories]);

  // Fetch reference master data with instant memory load
  useEffect(() => {
    getAcademicMasterData()
      .then((data) => {
        if (data.classes) setClasses(data.classes);
        if (data.schools) setSchools(data.schools);
        if (data.categories) setCategories(data.categories);
      })
      .catch((err) => console.error(err));
  }, []);

  const fetchLeaderboard = async () => {
    const params = new URLSearchParams();
    if (selectedFest) {
      params.append('fest', selectedFest);
    } else if (selectedStream) {
      params.append('stream', selectedStream);
    } else if (selectedCategory) {
      params.append('categoryId', selectedCategory);
    }
    if (selectedClass) params.append('classId', selectedClass);

    const cacheKey = params.toString() || 'overall';
    const cached = clientLeaderboardMemory.get(cacheKey);

    if (cached) {
      setLeaderboard(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      const data = await res.json();
      if (data.leaderboard) {
        clientLeaderboardMemory.set(cacheKey, data.leaderboard);
        setLeaderboard(data.leaderboard);
      }
      if (data.categories && categories.length === 0) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedCategory, selectedStream, selectedFest, selectedClass]);

  const switchLeaderboard = (target: {
    type: 'OVERALL' | 'STREAM' | 'FEST' | 'CATEGORY';
    stream?: string;
    fest?: string;
    categoryId?: string;
  }) => {
    let newCat = '';
    let newStream = '';
    let newFest = '';
    let url = '/leaderboard';

    if (target.type === 'OVERALL') {
      newCat = '';
      newStream = '';
      newFest = '';
      url = '/leaderboard';
    } else if (target.type === 'STREAM' && target.stream) {
      newCat = '';
      newStream = target.stream;
      newFest = '';
      url = `/leaderboard?stream=${target.stream}`;
    } else if (target.type === 'FEST' && target.fest) {
      newCat = '';
      newStream = '';
      newFest = target.fest;
      url = `/leaderboard?fest=${target.fest}`;
    } else if (target.type === 'CATEGORY' && target.categoryId) {
      newCat = target.categoryId;
      newStream = '';
      newFest = '';
      url = `/leaderboard?categoryId=${target.categoryId}`;
    }

    setSelectedCategory(newCat);
    setSelectedStream(newStream);
    setSelectedFest(newFest);
    router.push(url, { scroll: false });
  };

  const handleStudentRowClick = (studentId: string) => {
    if (!selectedCategory && !selectedStream && !selectedFest) {
      // Overall Institutional SPR Leaderboard -> Directly open full profile view!
      router.push(`/student/${studentId}`);
    } else {
      // Specific Leaderboard (Category / Stream / Fest) -> Open calculation breakdown modal for this specific context
      openStudentDossier(studentId);
    }
  };

  const openStudentDossier = (studentId: string) => {
    setSelectedStudentId(studentId);

    const cachedProfile = clientProfileMemory.get(studentId);
    if (cachedProfile) {
      setStudentProfile(cachedProfile);
      setLoadingProfile(false);
    } else {
      setLoadingProfile(true);
    }

    // Default tab based on active view context
    if (selectedFest) {
      setModalCalcTab('PROGRAMMES');
    } else if (selectedStream) {
      setModalCalcTab('SUBJECTS');
    } else if (selectedCategory) {
      const activeCat = categories.find((c) => c.id === selectedCategory);
      if (activeCat?.code === 'SCHOOL' || activeCat?.code === 'ISLAMIC') {
        setModalCalcTab('SUBJECTS');
      } else if (activeCat?.code === 'LITERARY' || activeCat?.code === 'PROGRAMS') {
        setModalCalcTab('PROGRAMMES');
      } else {
        setModalCalcTab('OVERALL');
      }
    } else {
      setModalCalcTab('OVERALL');
    }

    fetch(`/api/public/student/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.profile) {
          const profileData = {
            ...data.profile,
            creativeWorks: data.creativeWorks || [],
            libraryRecords: data.libraryRecords || [],
          };
          clientProfileMemory.set(studentId, profileData);
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

  const formatScore = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

  // Format Class to show ONLY number (e.g., "Class 8" -> "8", "Class 10" -> "10")
  const formatClassNumber = (val?: string) => {
    if (!val) return '';
    return val.replace(/^(class|std|standard|grade)\s*/i, '').trim();
  };

  const filteredEntries = leaderboard.filter((entry) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    const sName = (entry.name || entry.studentName || '').toLowerCase();
    const sCode = (entry.studentCode || entry.studentIdCode || entry.studentId || '').toLowerCase();
    const sprId = (entry.sprStudentId || '').toLowerCase();
    const cName = (entry.className || '').toLowerCase();
    const schName = (entry.schoolName || '').toLowerCase();
    const div = (entry.division || '').toLowerCase();

    return terms.every((t) => {
      // Normal match
      if (
        sName.includes(t) ||
        sCode.includes(t) ||
        sprId.includes(t) ||
        cName.includes(t) ||
        schName.includes(t) ||
        div.includes(t)
      ) {
        return true;
      }

      // If search term is like "spr3" or "spr-3", check against normalized sprStudentId
      const sprMatch = t.match(/^spr-?(\d+)$/i);
      if (sprMatch) {
        const formatted = `spr${String(parseInt(sprMatch[1], 10)).padStart(4, '0')}`;
        if (sprId === formatted || sprId.includes(formatted)) return true;
      }

      return false;
    });
  });

  const topThree = filteredEntries.slice(0, 3);

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

  const currentCategory = categories.find((c) => c.id === selectedCategory);

  // Configuration for Themed Hero Header with Logo matching colors and tiny white glow
  let heroTheme = {
    bgGradient: 'bg-gradient-to-r from-[#091e3a] via-[#1e3a8a] to-[#2563eb]',
    glowColor: 'from-white/25 via-blue-300/10 to-transparent',
    borderColor: 'border-blue-400/30',
    title: 'Overall Institutional SPR Leaderboard',
    subtitle: 'Continuous multi-dimensional evaluation covering 117 students with normalized scoring.',
    badge: 'Overall Institutional Standings',
    badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/40',
    logo: '/logo.png',
    isFest: false,
  };

  if (selectedFest === 'SAHITYOTSAV') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#500724] via-[#881337] to-[#be123c]',
      glowColor: 'from-white/30 via-rose-300/15 to-transparent',
      borderColor: 'border-rose-400/40',
      title: 'Sahityotsav Festival Leaderboard',
      subtitle: 'Literary & Arts Competitions: Malayalam, English, Arabic, and Urdu cultural events.',
      badge: 'Literary Festival Subcategory',
      badgeClass: 'bg-rose-500/25 text-rose-100 border-rose-300/40',
      logo: '/sahityotsav.png',
      isFest: true,
    };
  } else if (selectedFest === 'KALOTSAV') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#172554] via-[#1d4ed8] to-[#b91c1c]',
      glowColor: 'from-white/30 via-sky-300/15 to-transparent',
      borderColor: 'border-blue-400/40',
      title: 'Kerala School Kalotsavam Leaderboard',
      subtitle: 'State & District School Youth Arts Festival performance benchmarks and stage honors.',
      badge: 'Arts Kalotsavam Subcategory',
      badgeClass: 'bg-blue-500/25 text-blue-100 border-blue-300/40',
      logo: '/kalotsav.png',
      isFest: true,
    };
  } else if (selectedFest === 'M_LIT' || selectedFest === 'M-LIT') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#07192f] via-[#0f2942] to-[#047857]',
      glowColor: 'from-white/30 via-emerald-300/15 to-transparent',
      borderColor: 'border-emerald-400/40',
      title: 'M-Lit Fest Leaderboard',
      subtitle: 'Ma\'din Campus Literature & Creative Arts Festival with multi-tier stage scoring.',
      badge: 'M-Lit Fest Subcategory',
      badgeClass: 'bg-emerald-500/25 text-emerald-100 border-emerald-300/40',
      logo: '/m-lit.png',
      isFest: true,
    };
  } else if (selectedFest === 'JAMIA_MAHRAJAN' || selectedFest === 'MAHRAJAN') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#451a03] via-[#78350f] to-[#d97706]',
      glowColor: 'from-white/30 via-amber-300/15 to-transparent',
      borderColor: 'border-amber-400/40',
      title: 'Jamia Mahrajan National Fest Leaderboard',
      subtitle: 'National cultural & academic festival evaluations, debate tournaments, and grand trophies.',
      badge: 'Jamia Mahrajan Subcategory',
      badgeClass: 'bg-amber-500/25 text-amber-100 border-amber-300/40',
      logo: '/jamia-mahrajan.png',
      isFest: true,
    };
  } else if (selectedStream === 'JAMIATHUL_HIND') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#07192f] via-[#0A2540] to-[#1e40af]',
      glowColor: 'from-white/30 via-blue-300/15 to-transparent',
      borderColor: 'border-blue-400/40',
      title: 'Jamiathul Hind Al-Islamiyya Leaderboard',
      subtitle: 'Islamic Studies curriculum: Quran recitation, Hadith memorization & Fiqh evaluations.',
      badge: 'Islamic Studies Subcategory',
      badgeClass: 'bg-blue-500/25 text-blue-100 border-blue-300/40',
      logo: '/jamiathul-hind.png',
      isFest: false,
    };
  } else if (selectedStream === 'MADIN_ACADEMY') {
    heroTheme = {
      bgGradient: 'bg-gradient-to-r from-[#032e25] via-[#064e3b] to-[#0e7490]',
      glowColor: 'from-white/30 via-teal-300/15 to-transparent',
      borderColor: 'border-teal-400/40',
      title: 'Ma\'din Academy Islamic Stream Leaderboard',
      subtitle: 'Islamic Studies curriculum: Nahw & Sarf Arabic grammar, Tareekh & moral education.',
      badge: 'Islamic Studies Subcategory',
      badgeClass: 'bg-teal-500/25 text-teal-100 border-teal-300/40',
      logo: '/madin-academy.png',
      isFest: false,
    };
  } else if (currentCategory) {
    if (currentCategory.code === 'ISLAMIC') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#06203a] via-[#0A2540] to-[#1e40af]',
        glowColor: 'from-white/30 via-blue-300/15 to-transparent',
        borderColor: 'border-blue-400/40',
        title: 'Islamic Studies Leaderboard',
        subtitle: 'Comprehensive Islamic education: Quran, Hadith, Fiqh, Nahw & Sarf Arabic grammar.',
        badge: 'Assessment Wing Dedicated Page',
        badgeClass: 'bg-blue-500/25 text-blue-100 border-blue-300/40',
        logo: '/jamiathul-hind.png',
        isFest: false,
      };
    } else if (currentCategory.code === 'LITERARY') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#500724] via-[#881337] to-[#9f1239]',
        glowColor: 'from-white/30 via-rose-300/15 to-transparent',
        borderColor: 'border-rose-400/40',
        title: 'Literary Festivals Leaderboard',
        subtitle: 'Literary arts competitions: Sahityotsav, Kalotsavam, M-Lit Fest & Jamia Mahrajan.',
        badge: 'Assessment Wing Dedicated Page',
        badgeClass: 'bg-rose-500/25 text-rose-100 border-rose-300/40',
        logo: '/sahityotsav.png',
        isFest: true,
      };
    } else if (currentCategory.code === 'CREATIVE_HUB') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#083344] via-[#0e7490] to-[#0284c7]',
        glowColor: 'from-white/30 via-cyan-300/15 to-transparent',
        borderColor: 'border-cyan-400/40',
        title: 'Creative Hub Leaderboard',
        subtitle: 'Creative writing, artistic innovation, media design, calligraphy & literature projects.',
        badge: 'Assessment Wing Dedicated Page',
        badgeClass: 'bg-cyan-500/25 text-cyan-100 border-cyan-300/40',
        logo: '/creative-hub-logo.png',
        isFest: false,
      };
    } else if (currentCategory.code === 'SCHOOL') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#1e1b4b] via-[#312e81] to-[#4338ca]',
        glowColor: 'from-white/30 via-indigo-300/15 to-transparent',
        borderColor: 'border-indigo-400/40',
        title: 'School Education (Kerala / NCERT) Leaderboard',
        subtitle: 'School curriculum benchmarks: Mathematics, Science, Social Sciences & Languages.',
        badge: 'Curriculum Wing Dedicated Page',
        badgeClass: 'bg-indigo-500/25 text-indigo-100 border-indigo-300/40',
        logo: '/logo.png',
        isFest: false,
      };
    } else if (currentCategory.code === 'PROGRAMS') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#3b0764] via-[#581c87] to-[#7e22ce]',
        glowColor: 'from-white/30 via-purple-300/15 to-transparent',
        borderColor: 'border-purple-400/40',
        title: 'Programs & Leadership Leaderboard',
        subtitle: 'Campus initiatives, workshops, seminars, public speaking, leadership camps & events.',
        badge: 'Leadership Wing Dedicated Page',
        badgeClass: 'bg-purple-500/25 text-purple-100 border-purple-300/40',
        logo: '/logo.png',
        isFest: false,
      };
    } else if (currentCategory.code === 'LIBRARY') {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#451a03] via-[#713f12] to-[#a16207]',
        glowColor: 'from-white/30 via-amber-300/15 to-transparent',
        borderColor: 'border-amber-400/40',
        title: 'Library & Reading Leaderboard',
        subtitle: 'Book reading tracking, comprehensive book reviews, reading hours & literary digest.',
        badge: 'Literacy Wing Dedicated Page',
        badgeClass: 'bg-amber-500/25 text-amber-100 border-amber-300/40',
        logo: '/logo.png',
        isFest: false,
      };
    } else {
      heroTheme = {
        bgGradient: 'bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#334155]',
        glowColor: 'from-white/25 via-slate-300/15 to-transparent',
        borderColor: 'border-slate-400/30',
        title: `${currentCategory.name} Leaderboard`,
        subtitle: 'Continuous evaluation benchmarks for active institutional programs.',
        badge: 'Assessment Wing Dedicated Page',
        badgeClass: 'bg-slate-500/25 text-slate-100 border-slate-300/40',
        logo: '/logo.png',
        isFest: false,
      };
    }
  }

  // Determine active primary wing tab
  const isOverallActive = !selectedCategory && !selectedStream && !selectedFest;
  const isIslamicActive = Boolean(selectedStream || currentCategory?.code === 'ISLAMIC');
  const isFestActive = Boolean(selectedFest || currentCategory?.code === 'LITERARY');
  const isSchoolActive = currentCategory?.code === 'SCHOOL';
  const isCreativeActive = currentCategory?.code === 'CREATIVE_HUB';
  const isProgramsActive = currentCategory?.code === 'PROGRAMS';
  const isLibraryActive = currentCategory?.code === 'LIBRARY';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header with Low Opacity, Blur & Clean Navigation */}
      <header className="sticky top-0 z-40 bg-white/20 backdrop-blur-md border-b border-white/30 shadow-xs py-2.5 sm:py-3 px-4 sm:px-6 lg:px-8 animate-slide-down print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Madin SPR"
                width={44}
                height={44}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              {/* Desktop Branding */}
              <div className="hidden sm:block">
                <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-600">
                  Madin School of Excellence
                </div>
                <h1 className="text-sm sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  STUDENTS PERFORMANCE RATE (SPR)
                </h1>
              </div>

              {/* Clean Mobile Branding */}
              <div className="sm:hidden flex flex-col">
                <div className="text-[11px] font-black tracking-tight text-slate-900 uppercase leading-none">
                  MADIN EXCELLENCE
                </div>
                <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                  <span className="text-[9px] font-black tracking-widest uppercase">SPR STANDINGS</span>
                </div>
              </div>
            </div>
          </Link>

          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition btn-interactive"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Standings Container */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-5 flex-1 print:hidden">
        {/* Dedicated Separate Leaderboards Switcher Navigation Bar */}
        <div className="space-y-2 animate-slide-up">
          {/* Level 1: Primary Category / Wing Tabs */}
          <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none no-scrollbar">
            {/* Overall SPR */}
            <button
              onClick={() => switchLeaderboard({ type: 'OVERALL' })}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isOverallActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 ring-2 ring-blue-600/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${isOverallActive ? 'text-amber-300' : 'text-amber-500'}`} />
              <span>⭐ Overall SPR</span>
            </button>

            {/* Islamic Studies */}
            <button
              onClick={() => switchLeaderboard({ type: 'STREAM', stream: 'JAMIATHUL_HIND' })}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isIslamicActive
                  ? 'bg-blue-900 text-white shadow-sm shadow-blue-900/20 ring-2 ring-blue-900/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${isIslamicActive ? 'text-blue-200' : 'text-blue-600'}`} />
              <span>🕌 Islamic Studies</span>
            </button>

            {/* Literary Festivals */}
            <button
              onClick={() => switchLeaderboard({ type: 'FEST', fest: 'SAHITYOTSAV' })}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isFestActive
                  ? 'bg-rose-700 text-white shadow-sm shadow-rose-700/20 ring-2 ring-rose-700/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Feather className={`w-3.5 h-3.5 ${isFestActive ? 'text-rose-200' : 'text-rose-600'}`} />
              <span>🎭 Literary Festivals</span>
            </button>

            {/* School Education */}
            <button
              onClick={() => {
                const cat = categories.find((c) => c.code === 'SCHOOL');
                if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
              }}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isSchoolActive
                  ? 'bg-indigo-700 text-white shadow-sm shadow-indigo-700/20 ring-2 ring-indigo-700/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <GraduationCap className={`w-3.5 h-3.5 ${isSchoolActive ? 'text-indigo-200' : 'text-indigo-600'}`} />
              <span>🏫 School Education</span>
            </button>

            {/* Creative Hub */}
            <button
              onClick={() => {
                const cat = categories.find((c) => c.code === 'CREATIVE_HUB');
                if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
              }}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isCreativeActive
                  ? 'bg-cyan-700 text-white shadow-sm shadow-cyan-700/20 ring-2 ring-cyan-700/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCreativeActive ? 'text-cyan-200' : 'text-cyan-600'}`} />
              <span>💡 Creative Hub</span>
            </button>

            {/* Programs & Leadership */}
            <button
              onClick={() => {
                const cat = categories.find((c) => c.code === 'PROGRAMS');
                if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
              }}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isProgramsActive
                  ? 'bg-purple-700 text-white shadow-sm shadow-purple-700/20 ring-2 ring-purple-700/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 ${isProgramsActive ? 'text-purple-200' : 'text-purple-600'}`} />
              <span>🏆 Programs</span>
            </button>

            {/* Library / Reading */}
            <button
              onClick={() => {
                const cat = categories.find((c) => c.code === 'LIBRARY');
                if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
              }}
              className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-150 shrink-0 flex items-center space-x-1.5 ${
                isLibraryActive
                  ? 'bg-amber-700 text-white shadow-sm shadow-amber-700/20 ring-2 ring-amber-700/30'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              <Library className={`w-3.5 h-3.5 ${isLibraryActive ? 'text-amber-200' : 'text-amber-600'}`} />
              <span>📚 Library</span>
            </button>
          </div>

          {/* Level 2: Subcategory Pills for Multi-Stream & Multi-Fest Wings */}
          {isIslamicActive && (
            <div className="flex items-center gap-2 overflow-x-auto p-1.5 sm:p-2 bg-blue-50/90 rounded-2xl border border-blue-200/80 animate-slide-down">
              <span className="text-[10px] uppercase font-black text-blue-900 ml-1.5 shrink-0">Select Stream:</span>
              <button
                onClick={() => switchLeaderboard({ type: 'STREAM', stream: 'JAMIATHUL_HIND' })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
                  selectedStream === 'JAMIATHUL_HIND'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100/60 border border-blue-200'
                }`}
              >
                <span>🕌 Jamiathul Hind</span>
              </button>
              <button
                onClick={() => switchLeaderboard({ type: 'STREAM', stream: 'MADIN_ACADEMY' })}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
                  selectedStream === 'MADIN_ACADEMY'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-teal-100/60 border border-teal-200'
                }`}
              >
                <span>🏛️ Ma'din Academy</span>
              </button>
              <button
                onClick={() => {
                  const cat = categories.find((c) => c.code === 'ISLAMIC');
                  if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 flex items-center space-x-1.5 ${
                  selectedCategory && !selectedStream && currentCategory?.code === 'ISLAMIC'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📋 Combined Islamic</span>
              </button>
            </div>
          )}

          {isFestActive && (
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto p-1.5 sm:p-2 bg-rose-50/90 rounded-2xl border border-rose-200/80 animate-slide-down">
              <span className="text-[10px] uppercase font-black text-rose-900 ml-1.5 shrink-0">Festival:</span>
              <button
                onClick={() => switchLeaderboard({ type: 'FEST', fest: 'SAHITYOTSAV' })}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 flex items-center space-x-1 ${
                  selectedFest === 'SAHITYOTSAV'
                    ? 'bg-rose-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-rose-100/60 border border-rose-200'
                }`}
              >
                <span>🎭 Sahityotsav</span>
              </button>
              <button
                onClick={() => switchLeaderboard({ type: 'FEST', fest: 'KALOTSAV' })}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 flex items-center space-x-1 ${
                  selectedFest === 'KALOTSAV'
                    ? 'bg-blue-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100/60 border border-blue-200'
                }`}
              >
                <span>🎨 Kalotsavam</span>
              </button>
              <button
                onClick={() => switchLeaderboard({ type: 'FEST', fest: 'M_LIT' })}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 flex items-center space-x-1 ${
                  selectedFest === 'M_LIT'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-emerald-100/60 border border-emerald-200'
                }`}
              >
                <span>📖 M-Lit</span>
              </button>
              <button
                onClick={() => switchLeaderboard({ type: 'FEST', fest: 'JAMIA_MAHRAJAN' })}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 flex items-center space-x-1 ${
                  selectedFest === 'JAMIA_MAHRAJAN'
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-amber-100/60 border border-amber-200'
                }`}
              >
                <span>🏆 Mahrajan</span>
              </button>
              <button
                onClick={() => {
                  const cat = categories.find((c) => c.code === 'LITERARY');
                  if (cat) switchLeaderboard({ type: 'CATEGORY', categoryId: cat.id });
                }}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 flex items-center space-x-1 ${
                  selectedCategory && !selectedFest && currentCategory?.code === 'LITERARY'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span>📋 All Fests</span>
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Themed Subcategory Hero Banner (With Logo at Left Top, Name at Left Top, Tiny White Glow) */}
        <div
          className={`relative overflow-hidden rounded-3xl p-5 sm:p-7 shadow-xl border ${heroTheme.borderColor} ${heroTheme.bgGradient} text-white animate-slide-up`}
        >
          {/* Subtle Ambient Tiny White Glow Effect */}
          <div className="absolute top-0 left-0 w-80 h-80 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.28),transparent_70%)] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.15),transparent_70%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Fixed Subcategory Logo at Left Top & Name at Left Top */}
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-lg shadow-black/20 border border-white/60 ring-2 ring-white/30 backdrop-blur-sm group-hover:scale-105 transition">
                <Image
                  src={heroTheme.logo}
                  alt={heroTheme.title}
                  width={68}
                  height={68}
                  className="w-full h-full object-contain drop-shadow-xs"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-xs ${heroTheme.badgeClass}`}>
                    {heroTheme.badge}
                  </span>
                  <span className="text-[11px] text-white/70 font-semibold">• Academic Year 2025–2026</span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight mt-1.5 drop-shadow-sm">
                  {heroTheme.title}
                </h2>

                <p className="text-xs sm:text-sm text-white/90 max-w-2xl font-medium mt-1 leading-relaxed drop-shadow-2xs">
                  {heroTheme.subtitle}
                </p>
              </div>
            </div>

            {/* Quick Switcher Dropdown (Seamless in-tab navigation across all streams, fests & wings) */}
            <div className="flex items-center space-x-2.5 shrink-0">
              <select
                value={
                  selectedFest
                    ? `fest:${selectedFest}`
                    : selectedStream
                    ? `stream:${selectedStream}`
                    : selectedCategory
                    ? `cat:${selectedCategory}`
                    : ''
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('fest:')) {
                    const f = val.replace('fest:', '');
                    switchLeaderboard({ type: 'FEST', fest: f });
                  } else if (val.startsWith('stream:')) {
                    const s = val.replace('stream:', '');
                    switchLeaderboard({ type: 'STREAM', stream: s });
                  } else if (val.startsWith('cat:')) {
                    const c = val.replace('cat:', '');
                    switchLeaderboard({ type: 'CATEGORY', categoryId: c });
                  } else {
                    switchLeaderboard({ type: 'OVERALL' });
                  }
                }}
                className="px-3.5 py-2.5 bg-white/95 text-slate-900 font-bold rounded-2xl text-xs outline-none focus:ring-2 focus:ring-white shadow-md border border-white/40 cursor-pointer"
              >
                <option value="">⭐ Overall Institutional SPR</option>
                <optgroup label="Islamic Studies Subcategories">
                  <option value="stream:JAMIATHUL_HIND">🕌 Jamiathul Hind Al-Islamiyya</option>
                  <option value="stream:MADIN_ACADEMY">🏛️ Ma'din Academy Stream</option>
                  {categories.find((c) => c.code === 'ISLAMIC') && (
                    <option value={`cat:${categories.find((c) => c.code === 'ISLAMIC')?.id}`}>📋 All Islamic Studies</option>
                  )}
                </optgroup>
                <optgroup label="Literary Festivals Subcategories">
                  <option value="fest:SAHITYOTSAV">🎭 Sahityotsav</option>
                  <option value="fest:KALOTSAV">🎨 Kerala School Kalotsavam</option>
                  <option value="fest:M_LIT">📖 M-Lit Fest</option>
                  <option value="fest:JAMIA_MAHRAJAN">🏆 Jamia Mahrajan</option>
                  {categories.find((c) => c.code === 'LITERARY') && (
                    <option value={`cat:${categories.find((c) => c.code === 'LITERARY')?.id}`}>📋 All Literary Festivals</option>
                  )}
                </optgroup>
                <optgroup label="Assessment Wings">
                  {categories.map((c) => (
                    <option key={c.id} value={`cat:${c.id}`}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>

              <div className="px-3.5 py-2 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-center shrink-0 shadow-xs">
                <div className="text-[9px] sm:text-[10px] text-white/80 font-bold uppercase">Ranked</div>
                <div className="text-xs sm:text-sm font-black text-white">{filteredEntries.length} Students</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Top 3 Podium Cards (Dynamic Rank & Tie-Aware Layout) */}
        {topThree.length >= 3 && (
          <div className="space-y-4 max-w-4xl mx-auto pt-1">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end">
              {/* Left Card (Position 2 in array: topThree[1]) */}
              {(() => {
                const student = topThree[1];
                const rank = student?.rank ?? 2;
                const isTied = student?.isTied || filteredEntries.filter((s) => s.spr === student?.spr).length > 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;
                const isBronze = rank === 3;

                return (
                  <div
                    onClick={() => handleStudentRowClick(student.studentId)}
                    className={`rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 border-2 shadow-xs cursor-pointer hover:shadow-md transition-all flex flex-col justify-between order-1 text-center group animate-slide-left delay-150 ${
                      isGold
                        ? 'bg-gradient-to-b from-amber-50/90 via-white to-white border-amber-400 shadow-md hover:shadow-xl'
                        : isSilver
                        ? 'bg-white border-slate-200'
                        : 'bg-white border-amber-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1 sm:mb-2">
                      <StudentAvatar
                        photoUrl={student.photoUrl}
                        name={student.name || student.studentName}
                        size="lg"
                        className={`w-11 h-11 sm:w-18 sm:h-18 ${isGold ? 'ring-3 sm:ring-4 ring-amber-300/60' : ''}`}
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
                    <div
                      className={`text-[10px] sm:text-base font-extrabold mt-1 transition-colors leading-tight break-words ${
                        isGold ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-900 group-hover:text-blue-600'
                      }`}
                    >
                      {student.name || student.studentName}
                    </div>
                    <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5">
                      Std {formatClassNumber(student.className)}
                    </div>
                    <div
                      className={`mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t flex items-center justify-center ${
                        isGold ? 'border-amber-100' : 'border-slate-100'
                      }`}
                    >
                      <span className={`text-xs sm:text-lg font-black ${isGold ? 'text-amber-800' : 'text-slate-800'}`}>
                        {formatScore(student.spr ?? student.overallScore)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Center Card (Position 1 in array: topThree[0] - Elevated) */}
              {(() => {
                const student = topThree[0];
                const rank = student?.rank ?? 1;
                const isTied = student?.isTied || filteredEntries.filter((s) => s.spr === student?.spr).length > 1;

                return (
                  <div
                    onClick={() => handleStudentRowClick(student.studentId)}
                    className="bg-gradient-to-b from-amber-50/90 via-white to-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-md border-2 border-amber-400 cursor-pointer hover:shadow-xl transition-all flex flex-col justify-between order-2 -translate-y-2 sm:-translate-y-3 text-center group animate-zoom-up delay-100"
                  >
                    <div className="flex justify-center mb-1 sm:mb-2">
                      <StudentAvatar
                        photoUrl={student.photoUrl}
                        name={student.name || student.studentName}
                        size="xl"
                        className="w-13 h-13 sm:w-22 sm:h-22 ring-3 sm:ring-4 ring-amber-300/60"
                      />
                    </div>
                    <div className="text-[8px] sm:text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-100 px-2 sm:px-3 py-0.5 rounded-full inline-block shadow-2xs border border-amber-300">
                      ★ {rank === 1 ? '1st' : `${rank}th`} Rank {isTied ? '(Joint)' : ''} ★
                    </div>
                    <div className="text-xs sm:text-lg font-black text-slate-900 group-hover:text-amber-800 mt-1 transition-colors leading-tight break-words">
                      {student.name || student.studentName}
                    </div>
                    <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5">
                      Std {formatClassNumber(student.className)}
                    </div>
                    <div className="mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t border-amber-100 flex items-center justify-center">
                      <span className="text-xs sm:text-2xl font-black text-amber-800">
                        {formatScore(student.spr ?? student.overallScore)}%
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Right Card (Position 3 in array: topThree[2]) */}
              {(() => {
                const student = topThree[2];
                const rank = student?.rank ?? 3;
                const isTied = student?.isTied || filteredEntries.filter((s) => s.spr === student?.spr).length > 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;
                const isBronze = rank === 3;

                return (
                  <div
                    onClick={() => handleStudentRowClick(student.studentId)}
                    className={`rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 border-2 shadow-xs cursor-pointer hover:shadow-md transition-all flex flex-col justify-between order-3 text-center group animate-slide-right delay-150 ${
                      isGold
                        ? 'bg-gradient-to-b from-amber-50/90 via-white to-white border-amber-400 shadow-md hover:shadow-xl'
                        : isSilver
                        ? 'bg-white border-slate-200'
                        : 'bg-white border-amber-200'
                    }`}
                  >
                    <div className="flex justify-center mb-1 sm:mb-2">
                      <StudentAvatar
                        photoUrl={student.photoUrl}
                        name={student.name || student.studentName}
                        size="lg"
                        className={`w-11 h-11 sm:w-18 sm:h-18 ${isGold ? 'ring-3 sm:ring-4 ring-amber-300/60' : ''}`}
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
                    <div
                      className={`text-[10px] sm:text-base font-extrabold mt-1 transition-colors leading-tight break-words ${
                        isGold ? 'text-slate-900 group-hover:text-amber-800' : 'text-slate-900 group-hover:text-blue-600'
                      }`}
                    >
                      {student.name || student.studentName}
                    </div>
                    <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5">
                      Std {formatClassNumber(student.className)}
                    </div>
                    <div
                      className={`mt-1.5 sm:mt-2 pt-1.5 sm:pt-2 border-t flex items-center justify-center ${
                        isGold ? 'border-amber-100' : 'border-slate-100'
                      }`}
                    >
                      <span className={`text-xs sm:text-lg font-black ${isGold ? 'text-amber-800' : 'text-slate-800'}`}>
                        {formatScore(student.spr ?? student.overallScore)}%
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Joint Rank 1 Cohort Recognition Pill Bar */}
            {(() => {
              const rank1Students = filteredEntries.filter((s) => s.rank === 1);
              if (rank1Students.length <= 3) return null;
              return (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-center shadow-xs animate-fade-in">
                  <div className="text-xs font-black text-amber-950 flex items-center justify-center space-x-1.5">
                    <span>🏆</span>
                    <span>{rank1Students.length} Students Jointly Share 1st Rank ({formatScore(rank1Students[0]?.spr ?? 100)}% SPR)</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-2">
                    {rank1Students.map((st) => (
                      <button
                        key={st.studentId}
                        onClick={() => handleStudentRowClick(st.studentId)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-amber-300 rounded-full text-xs font-bold text-slate-800 hover:bg-amber-100/80 shadow-2xs transition"
                      >
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>{st.name || st.studentName}</span>
                        <span className="text-[10px] text-amber-800 font-semibold">Std {formatClassNumber(st.className)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 animate-slide-up delay-200">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ranked students by name..."
              className="w-full pl-8 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
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

        {/* Full Main Leaderboard Table (Click row to open complete % calculation modal) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full animate-slide-up delay-250">
          <div className="w-full">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-9 sm:w-16 text-center">Rank</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4">Student</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-4 w-10 sm:w-20 text-center">Class</th>
                  <th className="py-2.5 sm:py-3.5 px-2 sm:px-4 w-16 sm:w-28 text-right">Score / SPR</th>
                  <th className="py-2.5 sm:py-3.5 px-1 sm:px-3 w-8 sm:w-12 text-center" title="Report inaccuracy"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center">
                      <VideoLoader size="md" text="Computing live rankings..." subtext="SPR Evaluation Engine" />
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-500">
                      No ranked student records found matching the active filters.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((st, idx) => {
                    const isTop1 = st.rank === 1;
                    const isTop2 = st.rank === 2;
                    const isTop3 = st.rank === 3;
                    const studentDisplayName = st.name || st.studentName || 'Student';
                    const sprScore = formatScore(st.spr ?? st.overallScore);
                    const numericScore = parseFloat(sprScore);
                    const classNum = formatClassNumber(st.className);

                    return (
                      <tr
                        key={st.studentId}
                        onClick={() => handleStudentRowClick(st.studentId)}
                        style={{ animationDelay: `${Math.min(idx * 20, 450)}ms` }}
                        className={`animate-row hover:bg-blue-50/50 cursor-pointer transition-all duration-200 group ${
                          isTop1 ? 'bg-amber-50/20' : ''
                        }`}
                        title={
                          !selectedCategory && !selectedStream && !selectedFest
                            ? 'Click to view full student profile and score origin breakdown'
                            : 'Click to view calculation breakdown for this category'
                        }
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
                            <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">{st.rank}</span>
                          )}
                        </td>

                        <td className="py-2 sm:py-3.5 px-1.5 sm:px-4">
                          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            <StudentAvatar photoUrl={st.photoUrl} name={studentDisplayName} size="sm" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-[11px] sm:text-xs leading-tight line-clamp-2">
                              {studentDisplayName}
                            </span>
                          </div>
                        </td>

                        {/* Class column showing Number Only (e.g. "8", "9", "10") */}
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
                            {sprScore}%
                          </span>
                        </td>

                        {/* Report Discrepancy Icon */}
                        <td className="py-2 sm:py-3.5 px-1 sm:px-3 text-center">
                          <button
                            onClick={(e) => openReportModal(e, st)}
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

          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <span>Showing all {filteredEntries.length} ranked students in SPR Registry</span>
            <span>Madin School of Excellence • Official Record</span>
          </div>
        </div>
      </main>

      {/* Transparent % Calculation Breakdown Modal */}
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
                <VideoLoader size="lg" text="Computing mathematical % calculations..." subtext="Analyzing student performance dossier" />
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
                        <span>Verified Academic Record</span>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 mt-1">
                      {studentProfile.student?.fullName}
                    </h3>
                    <div className="text-xs text-slate-600 font-medium mt-0.5">
                      Standard: <span className="font-bold text-slate-900">{formatClassNumber(studentProfile.student?.class?.name)}</span> {studentProfile.student?.division ? `(Division ${studentProfile.student?.division})` : ''}
                    </div>
                  </div>

                  {/* Cumulative SPR Badge */}
                  <div className="text-center bg-blue-600 text-white p-4 rounded-2xl shadow-md min-w-[120px]">
                    <div className="text-[10px] uppercase font-bold text-blue-100">Cumulative SPR</div>
                    <div className="text-2xl font-black text-white mt-0.5">
                      {formatScore(studentProfile.overallScore ?? studentProfile.overallSPR)}%
                    </div>
                    <div className="text-[10px] text-blue-200 mt-0.5">
                      Rank #{studentProfile.rank || 1} of {studentProfile.totalStudentsOverall || leaderboard.length || 1}
                    </div>
                  </div>
                </div>

                {/* Calculation Mode Switcher Tabs */}
                <div className="space-y-3">
                  {/* Context Header for Specific Leaderboard */}
                  {(selectedCategory || selectedStream || selectedFest) && (
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-blue-950 font-bold">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          Leaderboard Score Origin:{' '}
                          <span className="text-blue-700 underline font-black">
                            {selectedFest
                              ? selectedFest === 'SAHITYOTSAV'
                                ? 'Sahityotsav'
                                : selectedFest === 'KALOTSAV'
                                ? 'Kerala School Kalotsavam'
                                : selectedFest === 'M_LIT'
                                ? 'M-Lit Fest'
                                : 'Jamia Mahrajan'
                              : selectedStream
                              ? selectedStream === 'JAMIATHUL_HIND'
                                ? 'Jamiathul Hind Al-Islamiyya'
                                : "Ma'din Academy Stream"
                              : categories.find((c) => c.id === selectedCategory)?.name || 'Selected Category'}
                          </span>
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-black bg-blue-600 text-white px-2 py-0.5 rounded-md">
                        Filtered View
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                    <div className="flex items-center space-x-1.5">
                      <Percent className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Exact % Calculation Breakdown
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1 p-0.5 rounded-xl bg-slate-100 text-[10px] font-bold">
                      <button
                        onClick={() => setModalCalcTab('OVERALL')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          modalCalcTab === 'OVERALL' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        SPR Formula %
                      </button>
                      <button
                        onClick={() => setModalCalcTab('SUBJECTS')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          modalCalcTab === 'SUBJECTS' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Subject-Wise %
                      </button>
                      <button
                        onClick={() => setModalCalcTab('PROGRAMMES')}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          modalCalcTab === 'PROGRAMMES' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Fest & Events %
                      </button>
                    </div>
                  </div>

                  {/* 1. OVERALL SPR CALCULATION FORMULA (%) */}
                  {modalCalcTab === 'OVERALL' && (
                    <div className="space-y-3 animate-fade-in">
                      <div className="p-3 bg-blue-50/90 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1">
                        <div className="font-bold flex items-center space-x-1.5">
                          <span>📐 Cumulative SPR Mathematical Formula:</span>
                        </div>
                        <p className="text-[11px] text-blue-900 font-mono leading-relaxed">
                          Overall SPR = Σ (Category Score % × Category Weight %) ÷ Active Weights Sum
                        </p>
                      </div>

                      <div className="space-y-2">
                        {(studentProfile.categoryBreakdown || studentProfile.categoryScores || []).map((cat: any) => {
                          const catScore = parseFloat(formatScore(cat.score ?? cat.percentage));
                          const weight = cat.weight || 10;
                          const contribution = ((catScore * weight) / 100).toFixed(2);

                          return (
                            <div key={cat.categoryId} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900">{cat.categoryName}</span>
                                <div className="text-right">
                                  <span className="font-mono font-extrabold text-blue-700 text-xs">{catScore.toFixed(1)}%</span>
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

                  {/* 2. SUBJECT-WISE BREAKDOWN (%) */}
                  {modalCalcTab === 'SUBJECTS' && (
                    <div className="space-y-2.5 animate-fade-in max-h-64 overflow-y-auto pr-1">
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                        📖 <strong>Subject Evaluation:</strong> Standardized percentage score out of 100%.
                      </div>
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
                          No direct subject records found. Academic evaluations are normalized into Islamic & School categories.
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. PROGRAMMES & FESTS BREAKDOWN (%) */}
                  {modalCalcTab === 'PROGRAMMES' && (
                    <div className="space-y-2.5 animate-fade-in max-h-64 overflow-y-auto pr-1">
                      <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200 text-[11px] text-purple-900 font-medium">
                        🎭 <strong>Fest & Event Evaluation:</strong> Standardized percentage score out of 100%.
                      </div>
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
                          No direct festival records logged. Aggregated under the Literary / Programs SPR category score.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
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
                      href={`/student/${selectedStudentId}?print=true`}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition active:scale-95"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                      <span>Print Scorecard</span>
                    </Link>

                    <Link
                      href={`/student/${selectedStudentId}`}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                    >
                      <span>View Full Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <VideoLoader size="xl" text="Loading SPR Leaderboard Standings..." subtext="Madin School of Excellence" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
