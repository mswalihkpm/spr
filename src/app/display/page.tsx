'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Sliders,
  Settings,
  X,
  Image as ImageIcon,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import StudentAvatar from '@/components/ui/StudentAvatar';
import TvSlideshowSettingsModal from '@/components/modals/TvSlideshowSettingsModal';
import { TvSlideshowSettings, TvSlideImage } from '@/types';
import {
  DEFAULT_TV_SLIDESHOW_SETTINGS,
  parseTvSlideshowSettings,
  parseTvSlideImages,
} from '@/lib/tv-slideshow-config';

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

type SlideItem =
  | {
      type: 'LEADERBOARD';
      id: string;
      students: StudentLeaderboardEntry[];
      slideIndex: number;
      durationSeconds: number;
    }
  | {
      type: 'IMAGE';
      id: string;
      image: TvSlideImage;
      slideIndex: number;
      durationSeconds: number;
    };

export default function TvSlideshowPage() {
  const router = useRouter();

  // Data states
  const [leaderboard, setLeaderboard] = useState<StudentLeaderboardEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; code: string; name: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [institutionName, setInstitutionName] = useState('Madin School of Excellence');
  const [loading, setLoading] = useState(true);

  // Settings & Custom Images
  const [settings, setSettings] = useState<TvSlideshowSettings>(DEFAULT_TV_SLIDESHOW_SETTINGS);
  const [images, setImages] = useState<TvSlideImage[]>([]);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

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
  const fetchData = useCallback(
    async (isSilent = false) => {
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
          if (json.slideshowSettings) {
            setSettings(parseTvSlideshowSettings(JSON.stringify(json.slideshowSettings)));
          }
          if (json.slideshowImages) {
            setImages(parseTvSlideImages(JSON.stringify(json.slideshowImages)));
          }
        }
      } catch (err) {
        console.error('Failed to load TV display data:', err);
      } finally {
        setLoading(false);
      }
    },
    [selectedCategory, selectedClass]
  );

  useEffect(() => {
    fetchData();
    setCurrentSlideIndex(0);
    setSlideProgress(0);
  }, [fetchData]);

  // Periodic background refresh based on settings (default 2 minutes) without resetting active slide
  useEffect(() => {
    const intervalMs = (settings.autoRefreshInterval || 2) * 60 * 1000;
    const refreshTimer = setInterval(() => {
      fetchData(true);
    }, intervalMs);
    return () => clearInterval(refreshTimer);
  }, [fetchData, settings.autoRefreshInterval]);

  // Assemble the unified list of slides based on settings mode and interleave rules
  const slides: SlideItem[] = useMemo(() => {
    const studentsPerSlide = settings.studentsPerSlide || 14;
    const activeImages = images.filter((img) => img.active);

    // 1. Slice Leaderboard Slides
    const lbSlides: SlideItem[] = [];
    if (settings.mode !== 'IMAGES_ONLY') {
      const totalLbSlides = Math.max(1, Math.ceil(leaderboard.length / studentsPerSlide));
      for (let i = 0; i < totalLbSlides; i++) {
        const slice = leaderboard.slice(i * studentsPerSlide, (i + 1) * studentsPerSlide);
        if (slice.length > 0 || leaderboard.length === 0) {
          lbSlides.push({
            type: 'LEADERBOARD',
            id: `lb-slide-${i}`,
            students: slice,
            slideIndex: i,
            durationSeconds: settings.leaderboardSlideDuration || 7,
          });
        }
      }
    }

    // 2. Prepare Image Slides
    const imgSlides: SlideItem[] = [];
    if (settings.mode !== 'LEADERBOARD_ONLY') {
      activeImages.forEach((img, idx) => {
        imgSlides.push({
          type: 'IMAGE',
          id: img.id || `img-slide-${idx}`,
          image: img,
          slideIndex: idx,
          durationSeconds: img.duration || settings.imageSlideDuration || 8,
        });
      });
    }

    // 3. Combine according to mode
    if (settings.mode === 'IMAGES_ONLY') {
      return imgSlides.length > 0
        ? imgSlides
        : [
            {
              type: 'LEADERBOARD',
              id: 'empty-fallback',
              students: [],
              slideIndex: 0,
              durationSeconds: 7,
            },
          ];
    }

    if (settings.mode === 'LEADERBOARD_ONLY' || imgSlides.length === 0) {
      return lbSlides;
    }

    // BOTH MODE: Interleaving
    if (settings.interleaveMode === 'BEFORE_ALL') {
      return [...imgSlides, ...lbSlides];
    }
    if (settings.interleaveMode === 'AFTER_ALL') {
      return [...lbSlides, ...imgSlides];
    }

    // Interleave every N leaderboard slides
    const freq = Math.max(1, settings.interleaveFrequency || 1);
    const combined: SlideItem[] = [];
    let imgIdx = 0;

    for (let i = 0; i < lbSlides.length; i++) {
      combined.push(lbSlides[i]);
      if ((i + 1) % freq === 0 && imgIdx < imgSlides.length) {
        combined.push(imgSlides[imgIdx]);
        imgIdx = (imgIdx + 1) % imgSlides.length;
      }
    }

    // If there are remaining images that haven't been shown, append them
    while (imgIdx < imgSlides.length && imgSlides.length <= 3) {
      combined.push(imgSlides[imgIdx]);
      imgIdx++;
    }

    return combined.length > 0 ? combined : lbSlides;
  }, [leaderboard, images, settings]);

  const totalSlides = Math.max(1, slides.length);

  // Active slide
  const activeSlide: SlideItem | undefined = slides[currentSlideIndex % totalSlides];

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

  // Dynamic high-precision slide timer based on the current slide's exact duration
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1 || !activeSlide) {
      setSlideProgress(0);
      return;
    }

    const currentSlideDurationMs = (activeSlide.durationSeconds || 7) * 1000;
    const intervalStep = 50; // update progress every 50ms
    const totalSteps = currentSlideDurationMs / intervalStep;
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
  }, [isPlaying, totalSlides, currentSlideIndex, activeSlide]);

  // Notifications slideshow ticker: rotates every N seconds
  useEffect(() => {
    if (notifications.length <= 1) return;
    const notifTimer = setInterval(() => {
      setCurrentNotificationIndex((prev) => (prev + 1) % notifications.length);
    }, (settings.notificationDuration || 7) * 1000);
    return () => clearInterval(notifTimer);
  }, [notifications.length, settings.notificationDuration]);

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

  // Keyboard navigation: Escape to exit, Space to pause/play, Arrows for slides, F for fullscreen, S for settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsModalOpen) {
          setSettingsModalOpen(false);
        } else if (document.fullscreenElement) {
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
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setSettingsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, nextSlide, prevSlide, toggleFullscreen, settingsModalOpen]);

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

  // Active notification for header ticker
  const activeNotification =
    notifications.length > 0
      ? notifications[currentNotificationIndex % notifications.length]
      : null;

  // Visual Theme background classes
  const themeContainerClass = useMemo(() => {
    switch (settings.theme) {
      case 'COSMIC':
        return 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950 text-slate-100';
      case 'GOLD':
        return 'bg-gradient-to-br from-amber-950/80 via-slate-950 to-slate-950 text-slate-100';
      case 'EMERALD':
        return 'bg-gradient-to-br from-emerald-950/80 via-slate-950 to-teal-950 text-slate-100';
      case 'MIDNIGHT':
      default:
        return 'bg-slate-950 text-slate-100';
    }
  }, [settings.theme]);

  // Transition Animation class
  const transitionAnimationClass = useMemo(() => {
    switch (settings.transitionEffect) {
      case 'FADE':
        return 'animate-fade-in';
      case 'ZOOM':
        return 'animate-tv-zoom';
      case 'FLIP':
        return 'animate-tv-flip';
      case 'SLIDE':
      default:
        return 'animate-tv-slide';
    }
  }, [settings.transitionEffect]);

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6">
        <VideoLoader
          size="xl"
          text="Initializing Live TV Leaderboard..."
          subtext="Preparing 14-Student 2-Column Slideshow & Media Banners"
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col justify-between select-none overflow-hidden font-sans relative ${themeContainerClass}`}
    >
      {/* Top Slide Progress Bar */}
      {settings.showProgressBar && (
        <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-800 z-50 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-amber-400 to-amber-500 transition-all duration-75 ease-linear shadow-sm"
            style={{ width: `${slideProgress}%` }}
          />
        </div>
      )}

      {/* =========================================================================
          BROADCAST TV HEADER
          Left: Logo & Title
          Center: Notifications Slideshow Ticker
          Right: Slide Counter, Settings, Fullscreen & Play Controls
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
        {settings.showNotificationsTicker && (
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
        )}

        {/* Right: SLIDE COUNTING, SETTINGS, FULLSCREEN & CONTROLS */}
        <div className="flex items-center space-x-2 sm:space-x-2.5 shrink-0">
          {/* SLIDE COUNTER IN HEADER */}
          {settings.showSlideCounter && (
            <div
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-500/40 text-blue-200 font-mono text-xs sm:text-sm font-extrabold shadow-sm"
              title={`Slide ${currentSlideIndex + 1} of ${totalSlides}`}
            >
              <span className="text-blue-400 font-sans text-[11px] font-bold uppercase hidden sm:inline">
                {activeSlide?.type === 'IMAGE' ? 'Poster' : 'Rank'}
              </span>
              <span className="text-white font-black">{currentSlideIndex + 1}</span>
              <span className="text-blue-400">/</span>
              <span className="text-blue-300">{totalSlides}</span>
            </div>
          )}

          {/* Clock */}
          {settings.showClock && (
            <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-xs">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentTime}</span>
            </div>
          )}

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
            title={isPlaying ? 'Pause Auto-slideshow (Space)' : 'Resume Auto-slideshow (Space)'}
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

          {/* SLIDESHOW SETTINGS BUTTON */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition cursor-pointer"
            title="Customized Slideshow & Images Settings (S)"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* FULL SCREEN BUTTON */}
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

      {/* Mobile Notification Bar */}
      {settings.showNotificationsTicker && activeNotification && (
        <div className="md:hidden px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center space-x-2 text-xs">
          <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="truncate flex-1">
            <span className="font-bold text-white mr-1">{activeNotification.title}:</span>
            <span className="text-slate-300">{activeNotification.text}</span>
          </div>
        </div>
      )}

      {/* Optional Filters Bar */}
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
          MAIN BROADCAST TV CANVAS
          Handles both LEADERBOARD SLIDES (2 columns) & CUSTOM IMAGE BANNER SLIDES
          ========================================================================= */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 flex flex-col justify-center min-h-0 overflow-y-auto">
        {slides.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-3" />
            <p className="text-lg font-bold">No active slideshow content configured.</p>
            <p className="text-xs text-slate-500 mt-1">
              Add student records or upload custom image slides in slideshow settings.
            </p>
          </div>
        ) : activeSlide?.type === 'IMAGE' ? (
          /* =========================================================================
             CUSTOM IMAGE SLIDE DISPLAY
             Full presentation banner with headline and caption overlays
             ========================================================================= */
          <div
            key={`slide-image-${activeSlide.id}-${slideKey}`}
            className={`w-full max-w-6xl mx-auto flex flex-col items-center justify-center p-2 sm:p-4 ${transitionAnimationClass}`}
          >
            <div className="relative w-full rounded-3xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-2xl flex flex-col items-center justify-center max-h-[76vh]">
              <img
                src={activeSlide.image.imageUrl}
                alt={activeSlide.image.title || 'Broadcast Banner'}
                className="w-full h-auto max-h-[72vh] object-contain rounded-2xl"
              />

              {/* Title & Caption Overlay Banner */}
              {(activeSlide.image.title || activeSlide.image.caption) && (
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent text-white flex flex-col justify-end backdrop-blur-xs">
                  {activeSlide.image.title && (
                    <h3 className="text-base sm:text-2xl font-black uppercase tracking-tight text-amber-300 drop-shadow-md">
                      {activeSlide.image.title}
                    </h3>
                  )}
                  {activeSlide.image.caption && (
                    <p className="text-xs sm:text-sm text-slate-200 font-medium mt-1 line-clamp-2 drop-shadow">
                      {activeSlide.image.caption}
                    </p>
                  )}
                </div>
              )}

              {/* Top Banner Tag */}
              <div className="absolute top-3 left-3 sm:top-4 sm:left-4 px-3 py-1 rounded-full bg-slate-950/80 border border-slate-700/80 text-amber-300 text-[10px] sm:text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-md flex items-center space-x-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Special Feature</span>
              </div>
            </div>
          </div>
        ) : (
          /* =========================================================================
             LEADERBOARD SLIDE (14 STUDENTS IN 2 COLUMNS)
             ========================================================================= */
          (() => {
            const slideStudents = activeSlide?.students || [];
            const isSingleColumn = settings.columnLayout === 'SINGLE_COLUMN';
            const halfCount = isSingleColumn
              ? slideStudents.length
              : Math.ceil(slideStudents.length / 2);
            const column1 = slideStudents.slice(0, halfCount);
            const column2 = isSingleColumn ? [] : slideStudents.slice(halfCount);

            return (
              <div
                key={`slide-container-${currentSlideIndex}-${slideKey}`}
                className={`grid ${
                  isSingleColumn ? 'grid-cols-1 max-w-3xl' : 'grid-cols-1 md:grid-cols-2 max-w-7xl'
                } gap-3 sm:gap-4 lg:gap-5 w-full mx-auto ${transitionAnimationClass}`}
              >
                {/* COLUMN 1 */}
                <div className="space-y-2 sm:space-y-2.5 flex flex-col justify-start">
                  {column1.map((student, idx) => (
                    <StudentSlideRow
                      key={`col1-${student.studentCode || idx}-${student.rank}`}
                      student={student}
                      index={idx}
                      formatClassNumber={formatClassNumber}
                      formatScore={formatScore}
                    />
                  ))}
                </div>

                {/* COLUMN 2 */}
                {!isSingleColumn && (
                  <div className="space-y-2 sm:space-y-2.5 flex flex-col justify-start">
                    {column2.map((student, idx) => (
                      <StudentSlideRow
                        key={`col2-${student.studentCode || idx}-${student.rank}`}
                        student={student}
                        index={idx + halfCount}
                        formatClassNumber={formatClassNumber}
                        formatScore={formatScore}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()
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
            {activeSlide?.type === 'IMAGE'
              ? `Displaying Feature Poster #${(activeSlide?.slideIndex || 0) + 1}`
              : `Showing ${activeSlide?.students.length || 0} Ranked Students`}
          </span>
          <span className="hidden sm:inline text-slate-500">
            • {totalSlides} total slide{totalSlides > 1 ? 's' : ''} in cycle
          </span>
        </div>

        {/* Slide Indicator Dots */}
        {totalSlides > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-xs sm:max-w-md px-2">
            {Array.from({ length: totalSlides }).map((_, idx) => {
              const slide = slides[idx];
              const isImage = slide?.type === 'IMAGE';
              return (
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
                      : isImage
                      ? 'w-2 h-2 bg-indigo-500/70 hover:bg-indigo-400'
                      : 'w-2 h-2 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Go to Slide ${idx + 1} (${isImage ? 'Poster Image' : 'Rankings'})`}
                />
              );
            })}
          </div>
        )}

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="hidden sm:inline-flex items-center space-x-1 text-slate-300 hover:text-amber-400 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize (S)</span>
          </button>
          <span className="hidden lg:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              F
            </kbd>{' '}
            Fullscreen •{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
              Esc
            </kbd>{' '}
            Exit
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {isPlaying ? `${activeSlide?.durationSeconds || 7}s Auto` : 'Paused'}
          </span>
        </div>
      </footer>

      {/* TV Slideshow Advanced Customizer Modal */}
      <TvSlideshowSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onSettingsSaved={(newSettings, newImages) => {
          setSettings(newSettings);
          setImages(newImages);
          setCurrentSlideIndex(0);
          setSlideProgress(0);
          setSlideKey((k) => k + 1);
        }}
      />
    </div>
  );
}

/* =========================================================================
   STUDENT SLIDE ROW COMPONENT
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
        animationDelay: `${index * 35}ms`,
      }}
    >
      {/* LEFT: Rank Circle + Avatar + Student Name */}
      <div className="flex items-center space-x-2.5 sm:space-x-3.5 min-w-0 pr-2">
        {/* Rank Circle */}
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
