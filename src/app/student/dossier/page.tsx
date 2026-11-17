'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  ShieldCheck,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
  Layers,
  ArrowRight,
  Search,
  CheckSquare,
  Library,
  Feather,
  Filter,
  Check,
  Wallet,
  History,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';
import WeeklyPerformanceChart from '@/components/student/WeeklyPerformanceChart';
import { getCachedStudentDashboard, setCachedStudentDashboard } from '@/lib/client-cache';

export default function StudentDossierPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Instant client render from memory cache
    const cached = getCachedStudentDashboard();
    if (cached) {
      setData(cached);
      setLoading(false);
    }

    fetch('/api/student/auth/me')
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/student/login');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        setCachedStudentDashboard(json);
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        if (!cached) setError('Failed to load official dossier records.');
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const student = data?.student;
  const sprProfile = data?.sprProfile;
  const rankInfo = data?.rankInfo;
  const taskSummary = data?.taskSummary;
  const questionnairesSummary = data?.questionnairesSummary;
  const itemizedLedger: any[] = data?.itemizedPointsLedger || [];
  const wallet = data?.wallet || { balance: 0, totalEarnings: 0 };
  const storeFund = data?.storeFund || { availableFund: 0 };
  const recentTransactions: any[] = data?.transactions || data?.recentTransactions || [];

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    return itemizedLedger.filter((item) => {
      // Type filter
      if (activityFilter !== 'ALL') {
        if (activityFilter === 'EXAMS' && item.type !== 'EXAM') return false;
        if (activityFilter === 'PROGRAMMES' && item.type !== 'PROGRAMME') return false;
        if (activityFilter === 'ATTENDANCE' && item.type !== 'ATTENDANCE') return false;
        if (activityFilter === 'LIBRARY' && item.type !== 'LIBRARY') return false;
        if (activityFilter === 'CREATIVE_HUB' && item.type !== 'CREATIVE_HUB') return false;
        if (activityFilter === 'TASKS' && item.type !== 'TASK') return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (item.title || '').toLowerCase().includes(q);
        const catMatch = (item.categoryName || '').toLowerCase().includes(q);
        const expMatch = (item.explanation || '').toLowerCase().includes(q);
        if (!titleMatch && !catMatch && !expMatch) return false;
      }
      return true;
    });
  }, [itemizedLedger, activityFilter, searchQuery]);

  // Total points in filtered view
  const totalFilteredPoints = useMemo(() => {
    return filteredActivities.reduce((acc, item) => acc + (Number(item.pointsEarned) || 0), 0);
  }, [filteredActivities]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <VideoLoader
          size="xl"
          text="Loading Student Performance Dossier..."
          subtext="Accessing SPR Academic Records & Points Ledger"
          showProgress={true}
        />
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'EXAM':
        return { label: 'Academic Exam', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: GraduationCap };
      case 'PROGRAMME':
        return { label: 'Competition', bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Trophy };
      case 'ATTENDANCE':
        return { label: 'Attendance', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: Calendar };
      case 'LIBRARY':
        return { label: 'Library Reading', bg: 'bg-teal-100 text-teal-800 border-teal-200', icon: Library };
      case 'CREATIVE_HUB':
        return { label: 'Creative Hub', bg: 'bg-pink-100 text-pink-800 border-pink-200', icon: Sparkles };
      case 'TASK':
        return { label: 'Task Assignment', bg: 'bg-amber-100 text-amber-800 border-amber-200', icon: CheckSquare };
      case 'POINT_ADJUSTMENT':
        return { label: 'Admin Correction', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: ShieldCheck };
      default:
        return { label: 'Performance', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Award };
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-5xl mx-auto pb-16 p-3 sm:p-6 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Dossier Header Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-3.5 sm:p-8 shadow-xl w-full max-w-full">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-6 min-w-0 w-full">
          <div className="flex items-center space-x-3 sm:space-x-5 min-w-0 flex-1">
            <StudentAvatar
              photoUrl={student?.photoUrl}
              name={student?.fullName || 'Student'}
              size="xl"
              studentId={student?.sprStudentId || student?.studentId}
              className="w-12 h-12 sm:w-20 sm:h-20 ring-2 sm:ring-4 ring-white/20 shadow-lg shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30 shrink-0">
                  Certified Scorecard Dossier
                </span>
                {student?.isProfileLocked && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <h1 className="text-sm sm:text-2xl font-black text-white tracking-tight mt-1 truncate">
                {student?.fullName}
              </h1>
              <p className="text-[10px] sm:text-xs text-blue-200 font-mono mt-0.5 truncate">
                SPR ID: <span className="font-bold text-white">{student?.sprStudentId || student?.studentId}</span> • Class {student?.className || student?.class?.name}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:space-x-3 w-full sm:w-auto shrink-0 print:hidden min-w-0">
            <button
              onClick={handlePrint}
              className="w-full sm:w-auto px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10.5px] sm:text-xs font-bold border border-white/20 transition flex items-center justify-center space-x-1 shadow-xs cursor-pointer truncate"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Print Scorecard</span>
            </button>
            <button
              onClick={() => router.push(`/student/${encodeURIComponent(student?.sprStudentId || student?.studentId)}`)}
              className="w-full sm:w-auto px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10.5px] sm:text-xs font-bold transition flex items-center justify-center space-x-1 shadow-md cursor-pointer truncate"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Public View</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-center">
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200 truncate">Official SPR</div>
            <div className="text-sm sm:text-2xl font-black text-amber-300 font-mono mt-0.5 truncate">
              {sprProfile?.sprPercentage !== undefined && sprProfile?.sprPercentage !== null
                ? Number(sprProfile.sprPercentage).toFixed(2) + '%'
                : sprProfile?.overallSPR !== undefined && sprProfile?.overallSPR !== null
                ? Number(sprProfile.overallSPR).toFixed(2) + '%'
                : sprProfile?.overallScore !== undefined && sprProfile?.overallScore !== null
                ? Number(sprProfile.overallScore).toFixed(2) + '%'
                : sprProfile?.totalPoints !== undefined && sprProfile?.totalPoints !== null
                ? Number(sprProfile.totalPoints).toFixed(2)
                : totalFilteredPoints > 0
                ? Number(totalFilteredPoints).toFixed(2)
                : '—'}
            </div>
          </div>
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200 truncate">Total SPR Points</div>
            <div className="text-sm sm:text-2xl font-black text-white font-mono mt-0.5 flex items-center justify-center gap-1 flex-wrap">
              <span>
                {sprProfile?.totalPoints !== undefined && sprProfile?.totalPoints !== null
                  ? Number(sprProfile.totalPoints).toFixed(2)
                  : sprProfile?.overallScore !== undefined && sprProfile?.overallScore !== null
                  ? Number(sprProfile.overallScore).toFixed(2)
                  : totalFilteredPoints > 0
                  ? Number(totalFilteredPoints).toFixed(2)
                  : '—'}
              </span>
              {/* Show point corrections strictly as small numeric badge icons (+3 or -6) */}
              {sprProfile?.pointCorrections?.added > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                  +{sprProfile.pointCorrections.added}
                </span>
              )}
              {sprProfile?.pointCorrections?.reduced > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-rose-500/25 text-rose-300 border border-rose-400/40">
                  -{sprProfile.pointCorrections.reduced}
                </span>
              )}
            </div>
          </div>
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200 truncate">Overall Rank</div>
            <div className="text-sm sm:text-2xl font-black text-emerald-300 font-mono mt-0.5 truncate">
              {rankInfo?.overallRank ? `#${rankInfo.overallRank}` : '—'}
            </div>
          </div>
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 min-w-0">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-200 truncate">Class Rank</div>
            <div className="text-sm sm:text-2xl font-black text-indigo-300 font-mono mt-0.5 truncate">
              {rankInfo?.classRank ? `#${rankInfo.classRank}` : '—'}
            </div>
          </div>
        </div>

        {/* Administrative Discretionary Point Corrections Disclaimer */}
        {(sprProfile?.pointCorrections?.added > 0 || sprProfile?.pointCorrections?.reduced > 0) && (
          <div className="mt-3 pt-2.5 border-t border-white/10 text-center">
            <p className="text-[10px] sm:text-[11px] text-blue-200/90 font-medium italic">
              The Total SPR Points is calculated also with administrative corrections, so there may be some variations.
            </p>
          </div>
        )}
      </div>

      {/* Weekly Student Performance Graph */}
      <WeeklyPerformanceChart
        timeline={data?.weeklyPerformanceTimeline || []}
        currentSprPct={
          sprProfile?.sprPercentage !== undefined && sprProfile?.sprPercentage !== null
            ? Number(sprProfile.sprPercentage.toFixed(2))
            : sprProfile?.overallScore || 0
        }
        totalPoints={
          sprProfile?.totalWeightedScore !== undefined && sprProfile?.totalWeightedScore !== null
            ? Number(sprProfile.totalWeightedScore.toFixed(1))
            : sprProfile?.totalPoints || 0
        }
        classRank={rankInfo?.classRank}
      />

      {/* Main Grid: Profile Snapshot + Full Itemized Points Ledger */}
      <div className="space-y-5 sm:space-y-6">
        {/* =========================================================================
            ITEMIZED POINTS LEDGER & ACTIVITY EXPLANATIONS
            ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 shrink-0">
                  <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Itemized Points Ledger &amp; Activity Breakdown
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transparent audit log showing all evaluated exams, competition honours, monthly attendance, library reading, and tasks.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px] sm:text-xs">
                {filteredActivities.length} Activities Logged
              </span>
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs">
                +{totalFilteredPoints.toFixed(1)} pts
              </span>
            </div>
          </div>

          {/* Activity Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between min-w-0 w-full print:hidden">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 sm:pb-0 text-xs font-bold scrollbar-none min-w-0 w-full max-w-full">
              {[
                { id: 'ALL', label: 'All Records' },
                { id: 'EXAMS', label: 'Exams & Academics' },
                { id: 'PROGRAMMES', label: 'Competitions' },
                { id: 'ATTENDANCE', label: 'Attendance' },
                { id: 'LIBRARY', label: 'Library Reading' },
                { id: 'CREATIVE_HUB', label: 'Creative Hub' },
                { id: 'TASKS', label: 'Tasks' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActivityFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer shrink-0 ${
                    activityFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative shrink-0 w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search activity or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Activities List */}
          {filteredActivities.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800">
              No matching activity records found for this category filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((act: any, idx: number) => {
                const badge = getTypeBadge(act.type);
                const Icon = badge.icon;
                return (
                  <div
                    key={act.id || idx}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 hover:bg-white dark:hover:bg-slate-800 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white mt-1 break-words">
                            {act.title}
                          </h4>
                        </div>
                      </div>

                      {/* Points Pill */}
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
                        {act.percentage !== undefined && act.percentage !== null && (
                          <span className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-[10.5px] sm:text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {act.percentage}%
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-[10.5px] sm:text-xs font-black font-mono text-emerald-800 dark:text-emerald-300">
                          +{Number(act.pointsEarned).toFixed(1)} pts
                        </span>
                        {act.rewardAmount > 0 && (
                          <span className="px-2 py-0.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-[10.5px] sm:text-xs font-black font-mono text-amber-800 dark:text-amber-300">
                            +₹{act.rewardAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* How the Points Were Derived (Explanation) */}
                    <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-[10.5px] sm:text-[11px] text-slate-600 dark:text-slate-400 flex items-start space-x-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">Derivation:</span>
                      <span className="leading-relaxed break-words">{act.explanation}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            BOTTOM SUMMARY: CATEGORY SCORES & PERSONAL PROFILE
            ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Category-Wise Performance Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Weighted Category Standings</span>
              </h3>
              <span className="text-[11px] sm:text-xs text-slate-400">7 Core Categories</span>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {sprProfile?.categoryScores && sprProfile.categoryScores.length > 0 ? (
                sprProfile.categoryScores.map((cat: any) => {
                  const pct = Math.min(100, Math.max(0, cat.normalizedPercentage || 0));
                  return (
                    <div
                      key={cat.categoryId || cat.categoryCode}
                      className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-slate-900 dark:text-white truncate">
                          {cat.categoryName}
                        </span>
                        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                          <span className="font-mono text-slate-400 text-[10.5px] sm:text-[11px]">
                            {cat.rawScore?.toFixed(1) || 0} pts
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] sm:text-xs">
                            {pct.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  Category standings are being evaluated.
                </div>
              )}
            </div>
          </div>

          {/* Personal & Family Profile */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Personal &amp; Family Profile</span>
              </h3>
              {student?.isProfileLocked && (
                <span className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Father's Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student?.fatherName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Mother's Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student?.motherName || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Place / Locality</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student?.place || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">District</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student?.district || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Residential Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{student?.residentialStatus || '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Guardian Contact</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{student?.guardianPhone || '—'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Intelligence Profiles</span>
              <Link
                href="/student/activities"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1"
              >
                <span>View Questionnaires</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* =========================================================================
            MONETARY INCENTIVES & WALLET TRANSACTION LEDGER
            ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Monetized Incentive &amp; Wallet Ledger
                </h3>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transparent record of cash bonuses earned from tasks, academic evaluations, attendance consistency, and peer transfers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                Wallet: ₹{Number(wallet.balance || 0).toFixed(2)}
              </div>
              <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 font-mono font-bold text-xs text-purple-700 dark:text-purple-300">
                Store: ₹{Number(storeFund.availableFund || 0).toFixed(2)}
              </div>
              <Link
                href="/student/cash"
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center space-x-1"
              >
                <span>Full Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Transaction List */}
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No wallet transactions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentTransactions.slice(0, 15).map((tx: any) => {
                const isPositive = Number(tx.amount) >= 0;
                const isTaskReward = (tx.reference && tx.reference.startsWith('TXN-TASK')) || (tx.description && tx.description.toLowerCase().includes('from task'));
                return (
                  <div key={tx.id || tx.reference} className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs px-2 rounded-xl transition ${
                    isTaskReward ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
                  }`}>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center space-x-1.5 flex-wrap">
                        {isTaskReward && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            <CheckSquare className="w-2.5 h-2.5" />
                            <span>Task Reward</span>
                          </span>
                        )}
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{tx.description}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Ref: {tx.reference}
                      </span>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className={`font-black font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {isPositive ? '+' : ''}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                      </span>
                      {tx.balanceAfter !== undefined && (
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Bal: ₹{Number(tx.balanceAfter).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}