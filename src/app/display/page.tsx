'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Maximize,
  Minimize,
  Play,
  Pause,
  Award,
  Trophy,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Megaphone,
  Flag,
  ArrowLeft,
  Tv,
  Layers,
  RefreshCw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import StudentAvatar from '@/components/ui/StudentAvatar';

interface StudentLeaderboardEntry {
  rank: number;
  name: string;
  studentName?: string;
  studentCode: string;
  sprStudentId?: string;
  className: string;
  schoolName?: string;
  division?: string;
  photoUrl?: string | null;
  spr: number;
}

interface NotificationItem {
  id: string;
  title: string;
  text: string;
}

const SLIDE_DURATION_MS = 7000; // 7 seconds per slide
const STUDENTS_PER_SLIDE = 14; // 14 students per slide (7 per column)

export default function TvSlideshowPage() {
  const router = useRouter();

  // Data states
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; code: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [institutionName, setInstitutionName] = useState('Madin School of Excellence');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  // Slideshow states
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [currentNotificationIndex, setCurrentNotificationIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [slideProgress, setSlideProgress] = useState(0);
  const [slideKey, setSlideKey] = useState(0);

  // Display states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch broadcast data
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedClass) params.append('classId', selectedClass);
      params.append('limit', '280'); // up to 20 slides of 14 students

      const res = await fetch(`/api/display?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setLeaderboard(json.leaderboard || []);
        if (json.notifications && json.notifications.length > 0) {
          setNotifications(json.notifications);
        }
        if (json.categories) setCategories(json.categories);
        if (json.classes) setClasses(json.classes);
        if (json.institutionName) setInstitutionName(json.institutionName);
      }
    } catch (err) {
      console.error('Failed to load TV display data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedClass]);

  useEffect(() => {
    fetchData();
    setCurrentSlideIndex(0);
    setSlideProgress(0);
  }, [fetchData]);

  // Periodic background refresh every 2 minutes without interrupting active slide
  useEffect(() => {
    const refreshTimer = setInterval(() => {
      fetchData(true);
    }, 120000);
    return () => clearInterval(refreshTimer);
  }, [fetchData]);

  // Total slides calculation
  const totalSlides = Math.max(1, Math.ceil(leaderboard.length / STUDENTS_PER_SLIDE));

  // Advance to next slide
  const nextSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
    setSlideProgress(0);
    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  // Go to previous slide
  const prevSlide = useCallback(() => {
    setCurrentSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
    setSlideProgress(0);
    setSlideKey((k) => k + 1);
  }, [totalSlides]);

  // 7-second slide timer with high-precision frame progress
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1) {
      setSlideProgress(0);
      return;
    }

    const intervalStep = 50; // update progress every 50ms
    const totalSteps = SLIDE_DURATION_MS / intervalStep;
    let stepCount = 0;

    const interval = setInterval(() => {
      stepCount += 1;
      const progressPercent = Math.min(100, (stepCount / totalSteps) * 100);
      setSlideProgress(progressPercent);

      if (stepCount >= totalSteps) {
        stepCount = 0;
        setSlideProgress(0);
        setCurrentSlideIndex((prev) => (prev + 1) % totalSlides);
        setSlideKey((k) => k + 1);
      }
    }, intervalStep);

    return () => clearInterval(interval);
  }, [isPlaying, totalSlides, currentSlideIndex]);

  // Notifications slideshow ticker: rotates every 7 seconds
  useEffect(() => {
    if (notifications.length <= 1) return;
    const notifTimer = setInterval(() => {
      setCurrentNotificationIndex((prev) => (prev + 1) % notifications.length);
    }, 7000);
    return () => clearInterval(notifTimer);
  }, [notifications.length]);

  // Fullscreen management
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
    }
  }, []);

  // Sync fullscreen state with browser events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard navigation: Escape to exit, Space to pause/play, Arrows for slides, F for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          router.push('/dashboard');
        }
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, nextSlide, prevSlide, toggleFullscreen]);

  // Format Class Number (e.g. "Class 10" -> "10", "Std +2" -> "+2")
  const formatClassNumber = (val?: string) => {
    if (!val) return '';
    return val.replace(/^(class|std|standard|grade)\s*/i, '').trim();
  };

  // Format SPR score to clean 2 decimal places
  const formatScore = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '0';
    if (Number.isInteger(num)) return num.toLocaleString('en-US');
    const fixed = Number(num.toFixed(2));
    return fixed.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  // Slice 14 students for current slide
  const slideStudents = leaderboard.slice(
    currentSlideIndex * STUDENTS_PER_SLIDE,
    (currentSlideIndex + 1) * STUDENTS_PER_SLIDE
  );

  // Divide into two columns (7 students in Col 1, 7 students in Col 2)
  const halfCount = Math.min(7, Math.ceil(slideStudents.length / 2));
  const column1Students = slideStudents.slice(0, halfCount);
  const column2Students = slideStudents.slice(halfCount);

  // Active notification for header ticker
  const activeNotification =
    notifications.length > 0
      ? notifications[currentNotificationIndex % notifications.length]
      : null;

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <VideoLoader
          size="xl"
          text="Initializing Live TV Leaderboard..."
          subtext="Preparing 14-Student 2-Column Slideshow for Madin School of Excellence"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none overflow-hidden font-sans relative">
      {/* 7-Second Top Slide Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-800 z-50 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-amber-500 transition-all duration-75 ease-linear shadow-sm"
          style={{ width: `${slideProgress}%` }}
        />
      </div>

      {/* =========================================================================
          BROADCAST TV HEADER
          Left: Logo & Title
          Center: Notifications Slideshow Ticker
          Right: Slide Counter, Fullscreen & Play Controls
          ========================================================================= */}
      <header className="px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-xl z-40">
        {/* Left: Branding & School Identity */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center space-x-1.5 cursor-pointer"
            title="Exit to Dashboard (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xl:inline text-xs font-bold">Dashboard</span>
          </button>

          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white p-1 shadow-md border border-amber-400/60 overflow-hidden flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="Madin Logo" className="w-full h-full object-contain" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-black tracking-wider text-white uppercase truncate">
                {institutionName}
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] tracking-widest uppercase shrink-0 shadow-xs">
                TV Broadcast
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] font-semibold text-blue-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>SPR Evaluation Platform • Live Standings</span>
            </div>
          </div>
        </div>

        {/* Center: NOTIFICATIONS SLIDESHOW IN HEADER */}
        <div className="flex-1 max-w-xl lg:max-w-2xl mx-2 sm:mx-4 hidden md:block">
          {activeNotification && (
            <div
              key={`notif-${activeNotification.id}-${currentNotificationIndex}`}
              className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl px-3.5 py-1.5 shadow-md flex items-center space-x-2.5 transition-all overflow-hidden animate-tv-slide"
            >
              <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1 shrink-0">
                <Megaphone className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                <span className="text-[10px] font-black uppercase tracking-wider">Announcement</span>
              </div>
              <div className="min-w-0 flex-1 truncate">
                <span className="text-xs font-black text-white mr-1.5 truncate">
                  {activeNotification.title}:
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                  {activeNotification.text}
                </span>
              </div>
              {notifications.length > 1 && (
                <span className="text-[10px] font-mono text-slate-400 shrink-0 px-1.5 py-0.5 rounded bg-slate-900/60">
                  {currentNotificationIndex + 1}/{notifications.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: SLIDE COUNTING, FULLSCREEN & CONTROLS */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* SLIDE COUNTER IN HEADER */}
          <div
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 font-mono text-xs sm:text-sm font-extrabold shadow-sm"
            title={`Slide ${currentSlideIndex + 1} of ${totalSlides}`}
          >
            <span className="text-blue-400 font-sans text-[11px] font-bold uppercase hidden sm:inline">Slide</span>
            <span className="text-white font-black">{currentSlideIndex + 1}</span>
            <span className="text-blue-400">/</span>
            <span className="text-blue-300">{totalSlides}</span>
          </div>

          {/* Clock */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime}</span>
          </div>

          {/* Prev Slide */}
          <button
            onClick={prevSlide}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Previous Slide (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Pause / Play */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center space-x-1 border transition-colors cursor-pointer ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
            title={isPlaying ? 'Pause 7s Auto-slideshow (Space)' : 'Resume Auto-slideshow (Space)'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Next Slide */}
          <button
            onClick={nextSlide}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Next Slide (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Filter Toggle Button */}
          <button
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            className={`p-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              selectedCategory || selectedClass
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Filter by Category or Class"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* FULL SCREEN BUTTON (Requested by user) */}
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center space-x-1.5 shadow-md shadow-blue-900/30 border border-blue-400/40 transition-all cursor-pointer active:scale-95"
            title="Toggle Full Screen (F or Esc to exit)"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Notification Bar (Shown on small screens where header ticker is hidden) */}
      {activeNotification && (
        <div className="md:hidden px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 text-xs">
          <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="truncate flex-1">
            <span className="font-bold text-white mr-1">{activeNotification.title}:</span>
            <span className="text-slate-300">{activeNotification.text}</span>
          </div>
        </div>
      )}

      {/* Optional Filters Bar (Collapsible for Clean TV Presentation) */}
      {filterMenuOpen && (
        <div className="px-6 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 animate-tv-slide z-30">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                selectedCategory === ''
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ⭐ Overall SPR
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  selectedCategory === c.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-1 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 outline-none"
            >
              <option value="">All Cohorts / Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setFilterMenuOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
              title="Close filter menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN BROADCAST TV CANVAS: 14 STUDENTS IN 2 COLUMNS WITH MODERN ANIMATION
          Exact layout style of the user screenshot:
          Rank circle (Gold, Silver, Bronze, Slate) | Avatar | Student Name | Class | Points PTS | Flag
          ========================================================================= */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 flex flex-col justify-center min-h-0 overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold">No ranked student records found.</p>
            <p className="text-xs text-slate-500 mt-1">
              Adjust filters or verify evaluation records in the admin dashboard.
            </p>
          </div>
        ) : (
          <div
            key={`slide-container-${currentSlideIndex}-${slideKey}`}
            className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 w-full max-w-7xl mx-auto animate-tv-slide"
          >
            {/* COLUMN 1: First 7 Students of this Slide (Order of Ranking) */}
            <div className="space-y-2 sm:space-y-2.5 flex flex-col justify-start">
              {column1Students.map((student, idx) => (
                <StudentSlideRow
                  key={`col1-${student.studentCode || idx}-${student.rank}`}
                  student={student}
                  index={idx}
                  formatClassNumber={formatClassNumber}
                  formatScore={formatScore}
                />
              ))}
            </div>

            {/* COLUMN 2: Next 7 Students of this Slide (Order of Ranking) */}
            <div className="space-y-2 sm:space-y-2.5 flex flex-col justify-start">
              {column2Students.map((student, idx) => (
                <StudentSlideRow
                  key={`col2-${student.studentCode || idx}-${student.rank}`}
                  student={student}
                  index={idx + 7}
                  formatClassNumber={formatClassNumber}
                  formatScore={formatScore}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          BROADCAST TV FOOTER
          Slide dots / indicator, Keyboard Shortcut Hints, and Live Status
          ========================================================================= */}
      <footer className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900/90 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 shrink-0 z-30">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-slate-300">
            Showing {slideStudents.length} of {leaderboard.length} Ranked Students
          </span>
          <span className="hidden sm:inline text-slate-500">• 14 per slide in 2 columns</span>
        </div>

        {/* Slide Indicator Dots */}
        {totalSlides > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-xs sm:max-w-md px-2">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentSlideIndex(idx);
                  setSlideProgress(0);
                  setSlideKey((k) => k + 1);
                }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentSlideIndex
                    ? 'w-6 sm:w-8 h-2 bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm'
                    : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Go to Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="hidden lg:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">F</kbd> for Fullscreen • <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Esc</kbd> to Exit
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {isPlaying ? '7s Auto' : 'Paused'}
          </span>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================================
   STUDENT SLIDE ROW COMPONENT
   Matches the exact row design in user screenshot:
   Rank Badge | Student Avatar | Student Name | Class Pill | Score PTS Pill | Flag
   ========================================================================= */
function StudentSlideRow({
  student,
  index,
  formatClassNumber,
  formatScore,
}: {
  student: StudentLeaderboardEntry;
  index: number;
  formatClassNumber: (cls?: string) => string;
  formatScore: (val: any) => string;
}) {
  const isRank1 = student.rank === 1;
  const isRank2 = student.rank === 2;
  const isRank3 = student.rank === 3;

  return (
    <div
      className={`animate-tv-card flex items-center justify-between px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl border transition-all duration-300 shadow-xs ${
        isRank1
          ? 'bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border-amber-400/60 shadow-amber-500/10'
          : isRank2
          ? 'bg-gradient-to-r from-slate-300/10 via-slate-900 to-slate-900 border-slate-400/50'
          : isRank3
          ? 'bg-gradient-to-r from-amber-700/10 via-slate-900 to-slate-900 border-amber-600/40'
          : 'bg-white/95 text-slate-900 border-slate-100 hover:bg-white'
      }`}
      style={{
        animationDelay: `${index * 38}ms`,
      }}
    >
      {/* LEFT: Rank Circle + Avatar + Student Name */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 pr-2">
        {/* Rank Circle: Gold, Silver, Bronze, or Light Slate */}
        <div
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-sm ${
            isRank1
              ? 'bg-amber-400 text-amber-950 ring-4 ring-amber-400/30'
              : isRank2
              ? 'bg-slate-300 text-slate-900 ring-4 ring-slate-300/20'
              : isRank3
              ? 'bg-amber-300 text-amber-950 ring-4 ring-amber-300/20'
              : 'bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          {student.rank}
        </div>

        {/* Student Avatar */}
        <div className="shrink-0">
          <StudentAvatar
            photoUrl={student.photoUrl}
            name={student.name || student.studentName}
            studentId={student.sprStudentId || student.studentCode}
            size="sm"
            className="w-8 h-8 sm:w-9 sm:h-9 ring-2 ring-slate-200/80 shadow-xs"
          />
        </div>

        {/* Student Name */}
        <div className="min-w-0 truncate">
          <div
            className={`font-black text-xs sm:text-sm tracking-tight truncate uppercase ${
              isRank1
                ? 'text-amber-300'
                : isRank2
                ? 'text-slate-100'
                : isRank3
                ? 'text-amber-200'
                : student.rank === 4
                ? 'text-blue-700'
                : 'text-slate-900'
            }`}
          >
            {student.name || student.studentName}
          </div>
          <div
            className={`text-[9.5px] sm:text-[10px] font-mono truncate ${
              isRank1 || isRank2 || isRank3 ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            {student.sprStudentId || student.studentCode}
          </div>
        </div>
      </div>

      {/* RIGHT: Class Badge + SPR Points PTS + Flag Icon */}
      <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
        {/* Class Pill */}
        {student.className && (
          <span
            className={`px-2 py-0.5 rounded-lg text-[10.5px] sm:text-xs font-black font-mono shrink-0 ${
              isRank1 || isRank2 || isRank3
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-slate-100 text-slate-800 border border-slate-200/80'
            }`}
          >
            {formatClassNumber(student.className)}
          </span>
        )}

        {/* SPR Points Badge */}
        <div
          className={`px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full font-mono font-black text-xs sm:text-[13px] flex items-center space-x-1 shrink-0 ${
            isRank1
              ? 'bg-amber-400 text-amber-950 shadow-xs'
              : 'bg-amber-50 text-amber-900 border border-amber-300/80'
          }`}
        >
          <span>{formatScore(student.spr)}</span>
          <span className="text-[9.5px] sm:text-[10px] text-amber-700 font-extrabold">PTS</span>
        </div>

        {/* Decorative Flag */}
        <Flag
          className={`w-3.5 h-3.5 shrink-0 ${
            isRank1
              ? 'text-amber-400'
              : isRank2
              ? 'text-slate-400'
              : isRank3
              ? 'text-amber-300'
              : 'text-slate-300'
          }`}
        />
      </div>
    </div>
  );
}
