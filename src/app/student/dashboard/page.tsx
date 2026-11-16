'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearClientCache } from '@/lib/client-cache';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';
import {
  TrendingUp,
  Award,
  CheckSquare,
  Sparkles,
  Coins,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  ExternalLink,
  Lock,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  GraduationCap,
  Trophy,
  Calendar,
  Wallet,
  Store,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Change Password Modal State
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchDashboardData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/student/auth/me');
      if (res.status === 401 || res.status === 403) {
        router.push('/student/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load dashboard.');

      setData(json);
      if (json.student?.mustChangePassword) {
        setPwdModalOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading dashboard.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setPwdLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/student/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data?.student?.mustChangePassword ? undefined : currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update password.');

      setStatusMsg({ type: 'success', text: 'Password successfully updated!' });
      setPwdModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      fetchDashboardData(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <VideoLoader
          size="xl"
          text="Loading Student Performance Dashboard..."
          subtext="Accessing SPR Academic Records & Points Ledger"
          showProgress={true}
        />
      </div>
    );
  }

  const student = data?.student;
  const sprProfile = data?.sprProfile;
  const rankInfo = data?.rankInfo;
  const taskSummary = data?.taskSummary;
  const questionnairesSummary = data?.questionnairesSummary;
  const timeline = data?.performanceTimeline || [];
  const wallet = data?.wallet || { balance: 0, totalEarnings: 0 };
  const storeFund = data?.storeFund || { availableFund: 0 };

  const currentSprPct = sprProfile?.sprPercentage !== undefined ? Number(sprProfile.sprPercentage.toFixed(2)) : 0;
  const totalPoints = sprProfile?.totalWeightedScore !== undefined ? Number(sprProfile.totalWeightedScore.toFixed(1)) : 0;

  // Chart Tooltip Component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-xs backdrop-blur-md space-y-1">
          <div className="font-extrabold text-blue-300 uppercase tracking-wider text-[10px]">
            Academic Month: {label}
          </div>
          {p.sprPercentage !== null ? (
            <>
              <div className="font-black text-amber-300 font-mono text-sm">
                Cumulative SPR: {p.sprPercentage}%
              </div>
              <div className="text-slate-300 text-[11px]">
                Cumulative Points: <span className="font-mono font-bold text-white">{p.cumulativePoints} pts</span>
              </div>
              <div className="text-slate-400 text-[10px]">
                Activities Logged: {p.activityCount} record(s)
              </div>
            </>
          ) : (
            <div className="text-slate-400 italic">Upcoming Term Period</div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-white pb-12">
      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full max-w-full overflow-x-hidden min-w-0 mx-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
        {/* Welcome & Performance Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-7 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center space-x-3.5 sm:space-x-4">
              <StudentAvatar
                photoUrl={student?.photoUrl}
                name={student?.fullName || 'Student'}
                size="xl"
                studentId={student?.sprStudentId || student?.studentId}
                className="w-14 h-14 sm:w-16 sm:h-16 ring-4 ring-white/20 shadow-md shrink-0"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    Class {student?.className || 'Student'}
                  </span>
                  {student?.isProfileLocked && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Verified Profile</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight mt-1">
                  Welcome, {student?.fullName}
                </h2>
                <p className="text-xs text-blue-200 font-mono mt-0.5">
                  SPR ID: {student?.sprStudentId || student?.studentId} {student?.academicYear ? `• ${student.academicYear}` : ''}
                </p>
              </div>
            </div>

            {/* Quick Score Dials */}
            <div className="flex items-center space-x-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/10 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Official SPR</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 font-mono mt-0.5">
                  {sprProfile?.sprPercentage !== undefined ? `${sprProfile.sprPercentage.toFixed(2)}%` : '—'}
                </div>
              </div>
              <div className="h-10 w-[1px] bg-white/20" />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Overall Rank</div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-300 font-mono mt-0.5">
                  {rankInfo?.overallRank ? `#${rankInfo.overallRank}` : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================================
            ANNUAL ACADEMIC & SPR PERFORMANCE PROGRESSION LINE GRAPH
            ========================================================================= */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
          {/* Chart Header & Statistical Overview Dials */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Annual Performance Rate Progression (SPR %)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monthly cumulative performance trajectory across the 2025–2026 academic year.
              </p>
            </div>

            {/* Micro Dials */}
            <div className="flex items-center space-x-3 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Class Standing</span>
                <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-sm">
                  {rankInfo?.classRank ? `#${rankInfo.classRank}` : '—'}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Benchmark</span>
                <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-sm">
                  {currentSprPct}%
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Weighted Points</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                  {totalPoints} pts
                </span>
              </div>
            </div>
          </div>

          {/* Line & Area Chart Container */}
          <div className="w-full h-64 sm:h-72">
            {isMounted && timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sprGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${val}%`}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="sprPercentage"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#sprGradient)"
                    connectNulls={false}
                    activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Loading performance chart telemetry...
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            PRIMARY ACTION TILES: DOSSIER, TASKS, ACTIVITIES, CASH
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Official Student Dossier */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-400 transition-all">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Official Student SPR Dossier
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Inspect your itemized points ledger, exam scorecards, competition honors, attendance evaluations, and reading assessments.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                {sprProfile?.categoryScores?.length || 7} Evaluated Wings
              </span>
              <button
                onClick={() => router.push('/student/dossier')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Open Full Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Tasks & Assignments */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Institutional Tasks &amp; Missions
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Complete assigned projects, submit external verification links (Google Drive / OneDrive), and earn points & rewards.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 font-mono">
                {taskSummary?.pendingCount || 0} Pending • {taskSummary?.completedCount || 0} Done
              </span>
              <button
                onClick={() => router.push('/student/tasks')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>View Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 3: Additional Activities & Intelligence */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-purple-400 transition-all">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Student Intelligence Questionnaires
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Provide institutional survey responses, personal and family details, talents, and career ambitions across 12 modules.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                {questionnairesSummary?.completed || 0} of {questionnairesSummary?.total || 12} Completed
              </span>
              <button
                onClick={() => router.push('/student/activities')}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Activities</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 4: Financial Cash & Store Account */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-400 transition-all">
            <div className="space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Cash Account &amp; Store Funds
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  View wallet balances, check task earnings, share funds with fellow students, or transfer cash to your School Store account.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] font-black text-emerald-600 font-mono">
                Balance: ₹{wallet.balance.toFixed(2)}
              </span>
              <button
                onClick={() => router.push('/student/cash')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <span>Open Cash Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Password Update Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                {student?.mustChangePassword ? 'Mandatory Password Setup' : 'Change Password'}
              </h3>
              {!student?.mustChangePassword && (
                <button
                  onClick={() => setPwdModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              {!student?.mustChangePassword && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition disabled:opacity-50 mt-2"
              >
                {pwdLoading ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}