'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckSquare,
  Award,
  Wallet,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  X,
  Sparkles,
  FileText,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Eye,
  Info,
  Check,
  LayoutDashboard,
  User,
  Trophy,
  Zap,
  Users,
  Flame,
  Medal,
  Target,
  Timer,
  CheckCheck,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { getCachedStudentTasks, setCachedStudentTasks } from '@/lib/client-cache';

export interface TaskTelemetry {
  rewardMode: 'EQUAL' | 'RANK_BASED' | 'TIME_BASED' | 'COMBINED';
  totalSubmissions: number;
  slotsOccupied: number;
  winnerSlots: number | null;
  slotsRemaining: number | null;
  slotsPercentFilled: number;
  myPosition: number | null;
  mySubmissionTime: string | null;
  estimatedReward: {
    tierRank?: number;
    points: number;
    cash: number;
    tierName?: string;
    speedBonusMultiplier?: number;
    bonusLabel?: string;
    notes?: string;
  } | null;
  nextPotentialReward: {
    tierRank: number;
    points: number;
    cash: number;
    speedBonusMultiplier?: number;
  } | null;
  leaderboard: Array<{
    rank: number;
    studentId: string;
    studentName: string;
    sprStudentId: string;
    submittedAt: string;
    status: string;
    awardedPoints: number;
    awardedAmount: number;
    isCurrentStudent: boolean;
  }>;
  rewardTiers: Array<{
    rank: number;
    points: number;
    cash: number;
    claimedBy?: string | null;
    claimedSprId?: string | null;
    status: 'CLAIMED' | 'AVAILABLE';
  }>;
  timeBonusInfo?: {
    isEarlyBirdActive: boolean;
    earlyBirdHoursLeft: number;
    hoursRemaining: number;
  } | null;
  eligibility: {
    canSubmit: boolean;
    reason: string;
  };
}

interface TaskItem {
  id: string;
  taskId: string;
  title: string;
  description: string;
  instructions?: string | null;
  rewardMode?: string;
  rewardConfig?: any;
  winnerSlots?: number | null;
  closeWhenSlotsFilled?: boolean;
  submissionType?: string;
  maxPoints: number;
  maxFund: number;
  startDate: string;
  endDate: string;
  status: string;
  recordId: string | null;
  submissionNotes: string | null;
  submittedAt: string | null;
  approvedPercentage: number | null;
  awardedPoints: number;
  awardedAmount: number;
  telemetry?: TaskTelemetry;
}

interface HistoryItem {
  recordId: string;
  taskId: string;
  taskCode: string;
  title: string;
  description?: string;
  status: string;
  approvedPercentage: number | null;
  awardedPoints: number;
  awardedAmount: number;
  approvedAt: string | null;
  completedDate: string;
}

export default function StudentTasksPage() {
  const router = useRouter();
  const cachedTasks = getCachedStudentTasks();
  const [loading, setLoading] = useState(!cachedTasks);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'HISTORY'>('AVAILABLE');
  const [student, setStudent] = useState<any>(cachedTasks?.student || null);
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>(cachedTasks?.availableTasks || []);
  const [history, setHistory] = useState<HistoryItem[]>(cachedTasks?.history || []);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Full Task Detail Modal state
  const [detailModalTask, setDetailModalTask] = useState<TaskItem | HistoryItem | null>(null);

  // Submit Completion Report Modal state
  const [submitModalTask, setSubmitModalTask] = useState<TaskItem | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/student/tasks');
      if (res.status === 401) {
        router.push('/student/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch tasks.');
      }
      setCachedStudentTasks(data);
      setStudent(data.student);
      setAvailableTasks(data.availableTasks || []);
      setHistory(data.history || []);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading tasks.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const cached = getCachedStudentTasks();
    if (cached) {
      setStudent(cached.student);
      setAvailableTasks(cached.availableTasks || []);
      setHistory(cached.history || []);
      setLoading(false);
      fetchTasks(true);
    } else {
      fetchTasks(false);
    }
  }, []);

  const handleSubmitReport = async () => {
    if (!submitModalTask) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/student/tasks/${submitModalTask.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: submissionNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit completion report.');
      }
      setStatusMsg({
        type: 'success',
        text: 'Task completion report submitted successfully! Awaiting administrator review.',
      });
      setSubmitModalTask(null);
      setDetailModalTask(null);
      setSubmissionNotes('');
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit report.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return isoString;
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return isoString;
    }
  };

  const totalPointsEarned = history.reduce((sum, h) => sum + (h.awardedPoints || 0), 0);
  const totalCashEarned = history.reduce((sum, h) => sum + (h.awardedAmount || 0), 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans pb-[calc(max(env(safe-area-inset-bottom,0px),0.75rem)+5rem)] sm:pb-12">
      {/* Top Header Bar - Clean Light Theme */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 sm:px-8 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="p-2 min-h-touch min-w-touch rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              title="Back to Student Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-black text-slate-900 tracking-tight flex items-center space-x-1.5 sm:space-x-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">Tasks</span>
                <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Rewards
                </span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate max-w-[170px] sm:max-w-none">
                {student ? `${student.fullName} (${student.sprStudentId})` : 'Student Portal'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-touch rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              className="p-2 min-h-touch min-w-touch rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
              title="Refresh Tasks"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full max-w-full overflow-x-hidden min-w-0 mx-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
        {/* Status Toast Notification */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-md transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs sm:text-sm font-bold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Selector & Stats Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('AVAILABLE')}
              className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'AVAILABLE'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Available Tasks</span>
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'AVAILABLE'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {availableTasks.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>Completed History</span>
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'HISTORY'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {history.length}
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-500 font-medium">Click any card to read</span>
            <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              Full Task Details
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <VideoLoader
              size="xl"
              text="Loading Student Tasks & Assignments..."
              subtext="Synchronizing Reward Allocations & Real-Time Telemetry"
              showProgress={true}
            />
          </div>
        ) : activeTab === 'AVAILABLE' ? (
          /* Available Tasks Tab */
          <div>
            {availableTasks.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 p-8 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <CheckSquare className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Tasks Available Right Now</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Active challenges and assignments will appear here when scheduled by teachers and administrators.
                  Check back regularly to earn SPR points and wallet rewards!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {availableTasks.map((t) => {
                  const isSubmitted = t.status === 'SUBMITTED' || t.status === 'PENDING_REVIEW' || t.status === 'UNDER_REVIEW';
                  const isApproved = t.status === 'APPROVED' || t.status === 'COMPLETED';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setDetailModalTask(t)}
                      className="group relative rounded-3xl bg-white border-2 border-slate-200 hover:border-amber-400/90 p-5 sm:p-6 shadow-sm hover:shadow-lg flex flex-col justify-between transition-all duration-200 cursor-pointer"
                    >
                      <div className="space-y-3">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                            {t.taskId}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : isSubmitted
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-blue-100 text-blue-900 border-blue-300'
                              }`}
                            >
                              {isApproved ? 'Approved' : isSubmitted ? 'Under Review' : 'Open'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-600 flex items-center space-x-0.5">
                              <span>Details</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>

                        {/* Title and Short Body */}
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight group-hover:text-amber-800 transition-colors">
                            {t.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed whitespace-pre-line font-medium">
                            {t.description}
                          </p>
                        </div>

                        {/* Reward Badges Grid */}
                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-900">
                              <Award className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-amber-900 uppercase font-bold tracking-wider">Max Points</p>
                              <p className="text-sm font-black text-slate-900 font-mono">{t.maxPoints} pts</p>
                            </div>
                          </div>

                          <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-900">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] text-emerald-900 uppercase font-bold tracking-wider">Cash Reward</p>
                              <p className="text-sm font-black text-emerald-800 font-mono">₹{t.maxFund.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        {/* Real-Time Telemetry Bar for Modes 2, 3, 4 */}
                        {t.telemetry && t.telemetry.rewardMode !== 'EQUAL' && (
                          <div className="p-3 rounded-2xl bg-gradient-to-r from-slate-50 to-amber-50/50 border border-slate-200/90 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <div className="flex items-center space-x-1.5 text-slate-700">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span>{t.telemetry.totalSubmissions} Submitted</span>
                              </div>
                              {t.telemetry.winnerSlots !== null ? (
                                <span className="font-mono text-emerald-800 text-[10.5px]">
                                  {t.telemetry.slotsRemaining} of {t.telemetry.winnerSlots} slots open
                                </span>
                              ) : (
                                <span className="text-slate-500 font-medium text-[10px]">Open Slots</span>
                              )}
                            </div>

                            {/* Progress Bar for Winner Slots */}
                            {t.telemetry.winnerSlots !== null && (
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    t.telemetry.slotsPercentFilled >= 90
                                      ? 'bg-rose-500'
                                      : t.telemetry.slotsPercentFilled >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${t.telemetry.slotsPercentFilled}%` }}
                                />
                              </div>
                            )}

                            {/* Personal Standing / Estimated Reward Preview */}
                            <div className="flex items-center justify-between text-[10.5px] pt-0.5">
                              {t.telemetry.myPosition ? (
                                <span className="font-bold text-indigo-900 flex items-center space-x-1">
                                  <Medal className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>Your Rank: <strong>#{t.telemetry.myPosition}</strong></span>
                                </span>
                              ) : t.telemetry.nextPotentialReward ? (
                                <span className="font-bold text-slate-700 flex items-center space-x-1">
                                  <Target className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Next: <strong>Rank #{t.telemetry.nextPotentialReward.tierRank}</strong></span>
                                </span>
                              ) : null}

                              {t.telemetry.estimatedReward ? (
                                <span className="font-mono font-black text-emerald-700">
                                  Est: +{t.telemetry.estimatedReward.points} pts • ₹{t.telemetry.estimatedReward.cash.toFixed(2)}
                                </span>
                              ) : t.telemetry.nextPotentialReward ? (
                                <span className="font-mono font-black text-emerald-700">
                                  Est: +{t.telemetry.nextPotentialReward.points} pts • ₹{t.telemetry.nextPotentialReward.cash.toFixed(2)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {/* Deadline Row */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Deadline: <strong className="text-slate-800 font-semibold">{formatDate(t.endDate)}</strong>
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-amber-700 underline">Tap to read full task</span>
                        </div>

                        {isSubmitted && t.submissionNotes && (
                          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                            <p className="font-bold text-[10px] uppercase tracking-wider text-amber-800">
                              Your Reported Completion Notes:
                            </p>
                            <p className="mt-0.5 line-clamp-2">{t.submissionNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Button Section */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center space-x-2">
                        {isApproved ? (
                          <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-900 font-bold text-xs flex items-center justify-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            <span>
                              Approved ({t.approvedPercentage}%) • +{t.awardedPoints} pts • +₹
                              {t.awardedAmount.toFixed(2)}
                            </span>
                          </div>
                        ) : isSubmitted ? (
                          <div className="w-full py-2.5 px-4 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 font-bold text-xs flex items-center justify-center space-x-1.5">
                            <Clock className="w-4 h-4 text-amber-700" />
                            <span>Report Under Review by Admin</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubmitModalTask(t);
                              setSubmissionNotes('');
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center space-x-2 shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5 text-amber-400" />
                            <span>Report Completion</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Task History Tab */
          <div className="space-y-6">
            {/* History Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Tasks</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{history.length}</h3>
              </div>
              <div className="p-5 rounded-3xl bg-amber-50/60 border border-amber-200 shadow-xs">
                <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Points Earned</p>
                <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">+{totalPointsEarned} pts</h3>
              </div>
              <div className="p-5 rounded-3xl bg-emerald-50/60 border border-emerald-200 shadow-xs">
                <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Cash Credited</p>
                <h3 className="text-2xl font-black text-emerald-800 mt-1 font-mono">+₹{totalCashEarned.toFixed(2)}</h3>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 p-8 shadow-xs">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Award className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Completed Tasks Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  When you report completion on active tasks and administrators review and approve them, your rewarded
                  SPR points, cash reward, and task verification will be tracked here.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Task Details</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Score %</th>
                        <th className="py-3 px-4 text-right">Awarded SPR Points</th>
                        <th className="py-3 px-4 text-right">Cash Reward</th>
                        <th className="py-3 px-4 text-right">Date Approved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.map((h) => (
                        <tr
                          key={h.recordId}
                          onClick={() => {
                            // Find full task from availableTasks or construct item
                            const matched = availableTasks.find((t) => t.id === h.taskId);
                            setDetailModalTask(matched || h);
                          }}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="font-bold text-xs sm:text-sm text-slate-900">{h.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{h.taskCode} • Tap to view</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                h.status === 'APPROVED' || h.status === 'COMPLETED'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono text-slate-700">
                            {h.approvedPercentage !== null ? `${h.approvedPercentage}%` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-amber-800 text-xs sm:text-sm">
                            +{h.awardedPoints} pts
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-xs sm:text-sm">
                            +₹{h.awardedAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-500 font-medium">
                            {formatDate(h.approvedAt || h.completedDate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* FULL TASK DETAILS & BODY MODAL - Opens with complete full body text       */}
      {/* ========================================================================= */}
      {detailModalTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-50 via-amber-50/30 to-white border-b border-slate-200 flex items-start justify-between">
              <div className="space-y-1.5 pr-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-slate-900 text-white font-mono shadow-2xs">
                    {(detailModalTask as any).taskId || (detailModalTask as any).taskCode}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      detailModalTask.status === 'APPROVED' || detailModalTask.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : detailModalTask.status === 'SUBMITTED' || detailModalTask.status === 'UNDER_REVIEW'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-blue-100 text-blue-900 border-blue-300'
                    }`}
                  >
                    {detailModalTask.status === 'APPROVED' || detailModalTask.status === 'COMPLETED'
                      ? 'Approved'
                      : detailModalTask.status === 'SUBMITTED' || detailModalTask.status === 'UNDER_REVIEW'
                      ? 'Under Review'
                      : 'Open for Submission'}
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {detailModalTask.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalTask(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body with Full Description Text */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Reward & Deadline Metric Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">Maximum SPR Points</p>
                  <p className="text-base sm:text-lg font-black text-slate-900 font-mono mt-0.5">
                    {(detailModalTask as any).maxPoints !== undefined ? `${(detailModalTask as any).maxPoints} pts` : `${(detailModalTask as any).awardedPoints} pts`}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Cash Reward (Wallet)</p>
                  <p className="text-base sm:text-lg font-black text-emerald-800 font-mono mt-0.5">
                    ₹{(detailModalTask as any).maxFund !== undefined ? (detailModalTask as any).maxFund.toFixed(2) : (detailModalTask as any).awardedAmount.toFixed(2)}
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Submission Deadline</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                    {formatDate((detailModalTask as any).endDate || (detailModalTask as any).completedDate)}
                  </p>
                </div>
              </div>

              {/* REAL-TIME TRACKING SYSTEM FOR ADVANCED REWARD MODES */}
              {(detailModalTask as any).telemetry && (
                <div className="space-y-4 rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-xl border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        {(detailModalTask as any).telemetry.rewardMode === 'RANK_BASED' ? (
                          <Trophy className="w-4 h-4" />
                        ) : (detailModalTask as any).telemetry.rewardMode === 'TIME_BASED' ? (
                          <Zap className="w-4 h-4" />
                        ) : (
                          <Flame className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white tracking-tight">
                          {(detailModalTask as any).telemetry.rewardMode === 'RANK_BASED'
                            ? 'Rank-Based Multi-Tier Distribution'
                            : (detailModalTask as any).telemetry.rewardMode === 'TIME_BASED'
                            ? 'Time-Based Speed Bonuses (Early Bird)'
                            : (detailModalTask as any).telemetry.rewardMode === 'COMBINED'
                            ? 'Combined Multiplier Rewards'
                            : 'Standard Task Distribution'}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Real-time submission telemetry, slot occupation &amp; live leaderboard
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live Telemetry</span>
                    </span>
                  </div>

                  {/* 4 Live Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Users className="w-3 h-3 text-blue-400" />
                        <span>Submissions</span>
                      </div>
                      <p className="text-lg font-black text-white font-mono mt-1">
                        {(detailModalTask as any).telemetry.totalSubmissions}
                      </p>
                      <p className="text-[10px] text-slate-400">Total students</p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Target className="w-3 h-3 text-amber-400" />
                        <span>Reward Slots</span>
                      </div>
                      <p className="text-lg font-black text-amber-300 font-mono mt-1">
                        {(detailModalTask as any).telemetry.winnerSlots !== null
                          ? `${(detailModalTask as any).telemetry.slotsOccupied} / ${(detailModalTask as any).telemetry.winnerSlots}`
                          : 'Unlimited'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(detailModalTask as any).telemetry.slotsRemaining !== null
                          ? `${(detailModalTask as any).telemetry.slotsRemaining} available`
                          : 'Open for all'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Medal className="w-3 h-3 text-purple-400" />
                        <span>Your Standing</span>
                      </div>
                      <p className="text-lg font-black text-white font-mono mt-1">
                        {(detailModalTask as any).telemetry.myPosition ? `#${(detailModalTask as any).telemetry.myPosition}` : '—'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(detailModalTask as any).telemetry.myPosition
                          ? 'Current submission rank'
                          : (detailModalTask as any).telemetry.nextPotentialReward
                          ? `Next is #${(detailModalTask as any).telemetry.nextPotentialReward.tierRank}`
                          : 'Not submitted'}
                      </p>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center space-x-1.5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <Wallet className="w-3 h-3 text-emerald-400" />
                        <span>Est. Reward</span>
                      </div>
                      <p className="text-sm sm:text-base font-black text-emerald-300 font-mono mt-1 truncate">
                        {(detailModalTask as any).telemetry.estimatedReward
                          ? `+${(detailModalTask as any).telemetry.estimatedReward.points} pts • ₹${(detailModalTask as any).telemetry.estimatedReward.cash.toFixed(2)}`
                          : (detailModalTask as any).telemetry.nextPotentialReward
                          ? `+${(detailModalTask as any).telemetry.nextPotentialReward.points} pts • ₹${(detailModalTask as any).telemetry.nextPotentialReward.cash.toFixed(2)}`
                          : 'Standard'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {(detailModalTask as any).telemetry.estimatedReward?.tierName || 'Based on rank/speed'}
                      </p>
                    </div>
                  </div>

                  {/* Winner Slots Capacity Bar (if limited slots) */}
                  {(detailModalTask as any).telemetry.winnerSlots !== null && (
                    <div className="space-y-1.5 p-3 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-medium">Reward Slots Capacity</span>
                        <span className="font-mono font-bold text-amber-300">
                          {(detailModalTask as any).telemetry.slotsOccupied} occupied • {(detailModalTask as any).telemetry.slotsRemaining} slots remaining
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (detailModalTask as any).telemetry.slotsPercentFilled >= 90
                              ? 'bg-rose-500'
                              : (detailModalTask as any).telemetry.slotsPercentFilled >= 50
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${(detailModalTask as any).telemetry.slotsPercentFilled}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Early Bird Speed Bonus Alert (for TIME_BASED & COMBINED) */}
                  {(detailModalTask as any).telemetry.timeBonusInfo && (
                    <div
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        (detailModalTask as any).telemetry.timeBonusInfo.isEarlyBirdActive
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold">
                          {(detailModalTask as any).telemetry.timeBonusInfo.isEarlyBirdActive
                            ? `⚡ Early Submission Speed Bonus Active! (+50% bonus points & cash)`
                            : `Speed bonus window has closed. Standard reward rate applies.`}
                        </span>
                      </div>
                      {(detailModalTask as any).telemetry.timeBonusInfo.isEarlyBirdActive && (
                        <span className="text-[11px] font-mono font-bold text-amber-300 px-2 py-0.5 rounded-lg bg-amber-500/20">
                          {(detailModalTask as any).telemetry.timeBonusInfo.earlyBirdHoursLeft}h left
                        </span>
                      )}
                    </div>
                  )}

                  {/* First Submissions Leaderboard Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>First Submissions &amp; Ranking Podium</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Earliest submissions earn top tiers</span>
                    </div>

                    {(detailModalTask as any).telemetry.leaderboard.length === 0 ? (
                      <div className="py-6 text-center rounded-2xl bg-white/5 border border-white/5 p-4">
                        <p className="text-xs text-slate-400">
                          No submissions recorded yet. Be the first to submit and claim Rank #1!
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                              <th className="py-2.5 px-3 font-bold">Rank</th>
                              <th className="py-2.5 px-3 font-bold">Student</th>
                              <th className="py-2.5 px-3 font-bold hidden sm:table-cell">Submitted At</th>
                              <th className="py-2.5 px-3 font-bold text-center">Status</th>
                              <th className="py-2.5 px-3 font-bold text-right">Award</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-slate-200">
                            {(detailModalTask as any).telemetry.leaderboard.map((lb: any) => (
                              <tr
                                key={lb.rank}
                                className={
                                  lb.isCurrentStudent
                                    ? 'bg-amber-500/20 font-bold border-l-2 border-amber-400'
                                    : 'hover:bg-white/5'
                                }
                              >
                                <td className="py-2 px-3 font-mono font-bold">
                                  {lb.rank === 1 ? '🥇 #1' : lb.rank === 2 ? '🥈 #2' : lb.rank === 3 ? '🥉 #3' : `#${lb.rank}`}
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center space-x-1.5">
                                    <span className="truncate max-w-[130px] sm:max-w-none">
                                      {lb.studentName}
                                    </span>
                                    {lb.isCurrentStudent && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-400 text-slate-900">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-slate-400 text-[11px] hidden sm:table-cell">
                                  {formatDateTime(lb.submittedAt)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                      lb.status === 'APPROVED' || lb.status === 'COMPLETED'
                                        ? 'bg-emerald-500/20 text-emerald-300'
                                        : 'bg-amber-500/20 text-amber-300'
                                    }`}
                                  >
                                    {lb.status === 'APPROVED' ? 'Approved' : 'Submitted'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-emerald-300 text-[11px]">
                                  {lb.awardedPoints > 0 || lb.awardedAmount > 0
                                    ? `+${lb.awardedPoints} pts • ₹${lb.awardedAmount.toFixed(2)}`
                                    : 'Pending'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Rank Tiers Distribution Table (if RANK_BASED or COMBINED) */}
                  {(detailModalTask as any).telemetry.rewardTiers?.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                        <span>Configured Reward Tiers</span>
                        <span className="text-[10px] text-slate-400">Awarded in order of verified completion</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(detailModalTask as any).telemetry.rewardTiers.map((tier: any) => (
                          <div
                            key={tier.rank}
                            className={`p-2.5 rounded-xl border text-xs ${
                              tier.status === 'CLAIMED'
                                ? 'bg-white/5 border-white/10 text-slate-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>Rank #{tier.rank} Tier</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  tier.status === 'CLAIMED'
                                    ? 'bg-slate-800 text-slate-400'
                                    : 'bg-emerald-500/30 text-emerald-300'
                                }`}
                              >
                                {tier.status === 'CLAIMED' ? 'Claimed' : 'Available'}
                              </span>
                            </div>
                            <div className="mt-1 font-mono font-black text-sm text-white">
                              +{tier.points} pts • ₹{tier.cash.toFixed(2)}
                            </div>
                            {tier.claimedBy && (
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                By: {tier.claimedBy}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submission Eligibility Status Bar */}
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                      (detailModalTask as any).telemetry.eligibility.canSubmit
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {(detailModalTask as any).telemetry.eligibility.canSubmit ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-medium">{(detailModalTask as any).telemetry.eligibility.reason}</span>
                    </div>
                    {(detailModalTask as any).telemetry.eligibility.canSubmit && (detailModalTask as any).telemetry.nextPotentialReward && (
                      <span className="font-bold text-amber-300">
                        Next: Rank #{(detailModalTask as any).telemetry.nextPotentialReward.tierRank}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Full Body / Detailed Instructions Box */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-slate-700">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Full Task Details &amp; Body</span>
                </div>
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium select-text">
                  {(detailModalTask as any).description || 'No description provided for this task.'}
                </div>
              </div>

              {/* Status Details */}
              {detailModalTask.status === 'APPROVED' || detailModalTask.status === 'COMPLETED' ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 space-y-1.5 text-emerald-950">
                  <div className="flex items-center space-x-2 font-black text-sm text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Task Approved by Administration!</span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">
                    Percentage Approved: <strong>{detailModalTask.approvedPercentage}%</strong> • Points Earned:{' '}
                    <strong>+{detailModalTask.awardedPoints} pts</strong> • Cash Credited:{' '}
                    <strong>+₹{detailModalTask.awardedAmount.toFixed(2)}</strong>
                  </p>
                </div>
              ) : detailModalTask.status === 'SUBMITTED' || detailModalTask.status === 'UNDER_REVIEW' ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 space-y-1 text-amber-950">
                  <div className="flex items-center space-x-2 font-black text-sm text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700" />
                    <span>Report Under Review</span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Your completion report has been submitted and is currently being evaluated by teachers and administrators.
                  </p>
                  {(detailModalTask as any).submissionNotes && (
                    <div className="mt-2 p-2.5 rounded-xl bg-white border border-amber-200 text-xs text-slate-700">
                      <strong>Submitted Notes:</strong> {(detailModalTask as any).submissionNotes}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDetailModalTask(null)}
                className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition cursor-pointer"
              >
                Close
              </button>

              {detailModalTask.status !== 'APPROVED' &&
                detailModalTask.status !== 'COMPLETED' &&
                detailModalTask.status !== 'SUBMITTED' &&
                detailModalTask.status !== 'UNDER_REVIEW' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitModalTask(detailModalTask as TaskItem);
                      setSubmissionNotes('');
                    }}
                    className="py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center space-x-1.5 shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Report Completion Now</span>
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Report Completion Modal (Enter submission notes)                          */}
      {/* ========================================================================= */}
      {submitModalTask && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl animate-scale-in my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Report Task Completion</h3>
                  <p className="text-xs text-slate-500 font-mono">{submitModalTask.taskId}</p>
                </div>
              </div>
              <button
                onClick={() => setSubmitModalTask(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <h4 className="text-sm font-black text-slate-900">{submitModalTask.title}</h4>
                <p className="text-xs text-slate-600 line-clamp-2">{submitModalTask.description}</p>
                <div className="pt-2 flex items-center space-x-4 text-xs font-bold font-mono">
                  <span className="text-amber-800">Max Points: {submitModalTask.maxPoints} pts</span>
                  <span className="text-emerald-800">Max Cash: ₹{submitModalTask.maxFund.toFixed(2)}</span>
                </div>
                {submitModalTask.telemetry && submitModalTask.telemetry.rewardMode !== 'EQUAL' && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between font-bold text-amber-950">
                    <span className="flex items-center space-x-1.5">
                      <Target className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {submitModalTask.telemetry.myPosition
                          ? `Submitting update for Rank #${submitModalTask.telemetry.myPosition}`
                          : `Your submission will secure Rank #${(submitModalTask.telemetry.totalSubmissions || 0) + 1}`}
                      </span>
                    </span>
                    {submitModalTask.telemetry.nextPotentialReward && (
                      <span className="font-mono text-emerald-800 shrink-0">
                        Est: +{submitModalTask.telemetry.nextPotentialReward.points} pts • ₹{submitModalTask.telemetry.nextPotentialReward.cash.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Shareable Submission Link <span className="text-slate-400 font-normal">(Google Drive, OneDrive, Dropbox URL)</span>
                  </label>
                  <input
                    type="url"
                    value={submissionNotes}
                    onChange={(e) => setSubmissionNotes(e.target.value)}
                    placeholder="https://drive.google.com/... or https://..."
                    className="w-full rounded-xl bg-white border border-slate-300 p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all font-mono"
                  />
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11.5px] text-amber-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict Link-Only Policy:</strong> Direct file uploads are disabled to preserve database performance. Ensure your cloud link permissions are set to <em>&quot;Anyone with the link can view&quot;</em> so administrators can verify your work.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Reporting completion notifies administrators. SPR points and cash rewards will be awarded directly
                  to your profile and wallet upon admin approval.
                </span>
              </div>
            </div>

            {/* Pinned Action Buttons (Never Cut Off) */}
            <div className="flex items-center space-x-3 p-4 sm:p-5 border-t border-slate-100 shrink-0 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setSubmitModalTask(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
