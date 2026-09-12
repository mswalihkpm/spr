'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize,
  Minimize,
  Play,
  Pause,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Layers,
  ChevronRight,
  Clock,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import CustomSelect from '@/components/ui/CustomSelect';

export default function DisplayModePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const tableRef = useRef<HTMLDivElement>(null);

  // Time clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDisplayData = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedClass) params.append('classId', selectedClass);

      const res = await fetch(`/api/display?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Display fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisplayData();
    const interval = setInterval(fetchDisplayData, 15000); // 15s auto-refresh
    return () => clearInterval(interval);
  }, [selectedCategory, selectedClass]);

  // Gentle auto-scrolling for 16:9 displays
  useEffect(() => {
    if (!autoScroll || !tableRef.current) return;

    const scrollContainer = tableRef.current;
    let scrollInterval: any;

    scrollInterval = setInterval(() => {
      if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 5) {
        // Reset to top
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        scrollContainer.scrollBy({ top: 2, behavior: 'auto' });
      }
    }, 50);

    return () => clearInterval(scrollInterval);
  }, [autoScroll, data]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-madin-950 text-white flex items-center justify-center p-6">
        <VideoLoader size="xl" text="Initializing Live SPR Broadcast..." subtext="Connecting to Madin School of Excellence Live Feed" />
      </div>
    );
  }

  const topThree = data?.topThree || [];
  const leaderboard = data?.leaderboard || [];

  return (
    <div className="min-h-screen bg-madin-950 text-white flex flex-col justify-between select-none overflow-hidden font-sans">
      {/* 16:9 Broadcast Header */}
      <header className="px-6 py-4 bg-madin-900/90 backdrop-blur-md border-b border-gold-500/30 flex items-center justify-between shadow-2xl shrink-0">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white p-1.5 shadow-xl border-2 border-gold-400 overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="Madin SPR Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white">SPR</span>
              <span className="px-2 py-0.5 rounded bg-gold-500 text-madin-950 font-black text-xs tracking-widest uppercase">
                Official Results
              </span>
            </div>
            <h1 className="text-xs sm:text-sm font-semibold text-gold-400">
              {data?.institutionName || 'Madin School of Excellence'} • Performance Broadcast
            </h1>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-madin-950/80 border border-madin-800 text-gold-400 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-gold-500" />
            <span>{currentTime}</span>
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center space-x-1 border transition-colors ${
              autoScroll
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-white/10 text-slate-300 border-white/20'
            }`}
            title="Toggle Auto-scroll"
          >
            {autoScroll ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Filter / Category Selector Bar */}
      <div className="px-6 py-2.5 bg-madin-900/60 border-b border-madin-800 flex items-center justify-between overflow-x-auto space-x-2 shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === ''
                ? 'bg-gold-500 text-madin-950 shadow-md'
                : 'bg-madin-800/60 text-slate-300 hover:bg-madin-800'
            }`}
          >
            ⭐ Overall SPR Standings
          </button>

          {data?.categories?.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-gold-500 text-madin-950 shadow-md'
                  : 'bg-madin-800/60 text-slate-300 hover:bg-madin-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 shrink-0 w-48">
          <CustomSelect
            value={selectedClass}
            onChange={(val) => setSelectedClass(val)}
            placeholder="All Classes"
            options={[
              { value: '', label: 'All Classes' },
              ...(data?.classes || []).map((cls: any) => ({
                value: cls.id,
                label: cls.name,
              })),
            ]}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Left Column: Top 3 Gold/Silver/Bronze Podium */}
        <div className="lg:col-span-1 flex flex-col justify-between space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-gold-400 flex items-center space-x-2">
            <Award className="w-4 h-4 text-gold-400" />
            <span>Top Institutional Podium</span>
          </div>

          {topThree.length >= 3 && (
            <div className="space-y-3.5 flex-1 flex flex-col justify-center">
              {topThree.slice(0, 3).map((st: any, idx: number) => {
                const rank = st.rank || (idx + 1);
                const isTied = st.isTied || topThree.filter((s: any) => s.spr === st.spr).length > 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;
                const isBronze = rank === 3;

                return (
                  <div
                    key={st.studentId || idx}
                    className={`p-4 sm:p-5 rounded-2xl shadow-xl relative overflow-hidden transition-all ${
                      isGold
                        ? 'bg-gradient-to-r from-amber-500/30 via-gold-500/20 to-amber-600/30 border-2 border-gold-400 animate-pulse-subtle'
                        : isSilver
                        ? 'bg-slate-800/70 border-2 border-slate-400/50'
                        : 'bg-amber-950/40 border-2 border-amber-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`w-9 h-9 rounded-full font-black text-sm flex items-center justify-center shadow-lg ${
                          isGold ? 'bg-gold-400 text-madin-950' : isSilver ? 'bg-slate-300 text-slate-900' : 'bg-amber-600 text-white'
                        }`}
                      >
                        {isGold ? '🥇' : isSilver ? '🥈' : '🥉'}
                      </span>
                      <span
                        className={`text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${
                          isGold
                            ? 'text-gold-300 bg-madin-950/80 border-gold-400/40'
                            : isSilver
                            ? 'text-slate-200 bg-slate-900/80 border-slate-400/40'
                            : 'text-amber-300 bg-amber-950/80 border-amber-500/40'
                        }`}
                      >
                        {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Position {isTied ? '(Joint)' : ''}
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="text-lg sm:text-xl font-black text-white truncate">{st.name}</div>
                      <div className="text-xs text-slate-300 mt-0.5">
                        {st.className} • {st.schoolName}
                      </div>
                    </div>
                    <div
                      className={`mt-3 pt-2.5 border-t flex items-center justify-between ${
                        isGold ? 'border-gold-400/30' : isSilver ? 'border-slate-700' : 'border-amber-800/40'
                      }`}
                    >
                      <span className="text-xs font-mono text-slate-400">{st.studentCode}</span>
                      <span className={`text-xl sm:text-2xl font-black ${isGold ? 'text-gold-300' : isSilver ? 'text-slate-200' : 'text-amber-400'}`}>
                        {st.spr}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Full Auto-Scrolling Leaderboard */}
        <div className="lg:col-span-2 bg-madin-900/70 border border-madin-800 rounded-3xl p-5 shadow-2xl flex flex-col min-h-0 overflow-hidden">
          <div className="pb-3 border-b border-madin-800 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
              Complete Standings Table ({leaderboard.length} Students)
            </span>
            <span className="text-[10px] text-gold-400 font-mono">Live Broadcast Feed</span>
          </div>

          <div ref={tableRef} className="flex-1 overflow-y-auto pt-2 space-y-1.5 pr-1">
            {leaderboard.map((st: any) => (
              <div
                key={st.studentCode}
                className="flex items-center justify-between p-3 rounded-xl bg-madin-950/60 border border-madin-800/80 hover:border-gold-500/40 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                      st.rank === 1
                        ? 'bg-gold-500 text-madin-950 font-black'
                        : st.rank === 2
                        ? 'bg-slate-300 text-slate-900 font-black'
                        : st.rank === 3
                        ? 'bg-amber-600 text-white font-black'
                        : 'bg-madin-800 text-slate-300'
                    }`}
                  >
                    {st.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{st.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {st.className} • {st.schoolName}
                    </div>
                  </div>
                </div>

                <div className="text-right pl-3 shrink-0">
                  <span className="text-base font-black text-gold-400 bg-madin-900 px-3 py-1 rounded-lg border border-gold-500/30">
                    {st.spr}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Broadcast Footer Ticker */}
      <footer className="px-6 py-3 bg-madin-900/90 border-t border-madin-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="font-semibold text-slate-300">SPR ENGINE LIVE</span>
          <span>•</span>
          <span>Madin School of Excellence</span>
        </div>
        <div className="text-[11px] text-slate-500">
          Privacy Protected • Public Screen Broadcast
        </div>
      </footer>
    </div>
  );
}
