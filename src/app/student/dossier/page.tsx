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
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';

export default function StudentDossierPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
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
        setData(json);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load official dossier records.');
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
      default:
        return { label: 'Performance', bg: 'bg-slate-100 text-slate-800 border-slate-200', icon: Award };
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 p-3.5 sm:p-6">
      {/* Dossier Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center space-x-4 sm:space-x-5">
            <StudentAvatar
              photoUrl={student?.photoUrl}
              name={student?.fullName || 'Student'}
              size="xl"
              studentId={student?.sprStudentId || student?.studentId}
              className="w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-white/20 shadow-lg shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Certified Scorecard Dossier
                </span>
                {student?.isProfileLocked && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {student?.fullName}
              </h1>
              <p className="text-xs text-blue-200 font-mono mt-0.5">
                SPR ID: {student?.sprStudentId || student?.studentId} • Class {student?.className || student?.class?.name} • Year {student?.academicYear || '2025-2026'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0 print:hidden">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Scorecard</span>
            </button>
            <button
              onClick={() => router.push(`/student/${encodeURIComponent(student?.sprStudentId || student?.studentId)}`)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-md cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Public View</span>
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div className="mt-6 pt-6 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Official SPR</div>
            <div className="text-xl sm:text-2xl font-black text-amber-300 font-mono mt-0.5">
              {sprProfile?.sprPercentage !== undefined ? `${sprProfile.sprPercentage.toFixed(2)}%` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Total SPR Points</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5">
              {sprProfile?.totalWeightedScore !== undefined ? sprProfile.totalWeightedScore.toFixed(2) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Overall Rank</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono mt-0.5">
              {rankInfo?.overallRank ? `#${rankInfo.overallRank}` : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Class Rank</div>
            <div className="text-xl sm:text-2xl font-black text-indigo-300 font-mono mt-0.5">
              {rankInfo?.classRank ? `#${rankInfo.classRank}` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Snapshot + Full Itemized Points Ledger */}
      <div className="space-y-6">
        {/* =========================================================================
            ITEMIZED POINTS LEDGER & ACTIVITY EXPLANATIONS
            "student also want to see his dossier will all points .and also want to see how he get that points,and from which programmes and exams and others..."
            ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <Award className="w-5 h-5" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Itemized Points Ledger &amp; Activity Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Transparent audit log showing all evaluated exams, competition honours, monthly attendance, library reading, and tasks.
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-700 dark:text-slate-300">
                {filteredActivities.length} Activities Logged
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-emerald-700 dark:text-emerald-300">
                +{totalFilteredPoints.toFixed(1)} pts
              </span>
            </div>
          </div>

          {/* Activity Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between print:hidden">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold scrollbar-none">
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
                  className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap cursor-pointer ${
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
            <div className="relative shrink-0 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search activity or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
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
                    className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 hover:bg-white dark:hover:bg-slate-800 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${badge.bg}`}
                            >
                              {badge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{act.date}</span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                            {act.title}
                          </h4>
                        </div>
                      </div>

                      {/* Points Pill */}
                      <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
                        {act.percentage !== undefined && act.percentage !== null && (
                          <span className="px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {act.percentage}%
                          </span>
                        )}
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-xs font-black font-mono text-emerald-800 dark:text-emerald-300">
                          +{Number(act.pointsEarned).toFixed(1)} pts
                        </span>
                        {act.rewardAmount > 0 && (
                          <span className="px-2 py-1 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-xs font-black font-mono text-amber-800 dark:text-amber-300">
                            +₹{act.rewardAmount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* How the Points Were Derived (Explanation) */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start space-x-2">
                      <span className="font-bold text-blue-600 dark:text-blue-400 shrink-0">Derivation:</span>
                      <span className="leading-relaxed">{act.explanation}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category-Wise Performance Summary */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Weighted Category Standings</span>
              </h3>
              <span className="text-xs text-slate-400">7 Core Categories</span>
            </div>

            <div className="space-y-3">
              {sprProfile?.categoryScores && sprProfile.categoryScores.length > 0 ? (
                sprProfile.categoryScores.map((cat: any) => {
                  const pct = Math.min(100, Math.max(0, cat.normalizedPercentage || 0));
                  return (
                    <div
                      key={cat.categoryId || cat.categoryCode}
                      className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {cat.categoryName}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400 text-[11px]">
                            {cat.rawScore?.toFixed(1) || 0} pts
                          </span>
                          <span className="font-mono font-black text-slate-900 dark:text-white px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
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
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>Personal &amp; Family Profile</span>
              </h3>
              {student?.isProfileLocked && (
                <span className="p-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
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
      </div>
    </div>
  );
}