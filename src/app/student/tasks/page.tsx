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
} from 'lucide-react';

interface TaskItem {
  id: string;
  taskId: string;
  title: string;
  description: string;
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
}

interface HistoryItem {
  recordId: string;
  taskId: string;
  taskCode: string;
  title: string;
  status: string;
  approvedPercentage: number | null;
  awardedPoints: number;
  awardedAmount: number;
  approvedAt: string | null;
  completedDate: string;
}

export default function StudentTasksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'HISTORY'>('AVAILABLE');
  const [student, setStudent] = useState<any>(null);
  const [availableTasks, setAvailableTasks] = useState<TaskItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Submit Modal state
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
    fetchTasks();
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
      setSubmissionNotes('');
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to submit report.' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoString: string) => {
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

  const totalPointsEarned = history.reduce((sum, h) => sum + (h.awardedPoints || 0), 0);
  const totalCashEarned = history.reduce((sum, h) => sum + (h.awardedAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-gold-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
              <CheckSquare className="w-4 h-4 text-gold-400" />
              <span>Student Tasks</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30">
                Earn Rewards
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {student ? `${student.fullName} (${student.sprStudentId})` : 'Student Portal'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchTasks(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Refresh Tasks"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-gold-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-xl transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="text-sm font-semibold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('AVAILABLE')}
            className={`pb-3 px-4 font-bold text-sm flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'AVAILABLE'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Available Tasks</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-gold-500/20 text-gold-300 font-extrabold border border-gold-500/30">
              {availableTasks.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`pb-3 px-4 font-bold text-sm flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'HISTORY'
                ? 'border-gold-500 text-gold-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Completed History</span>
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 font-extrabold border border-white/10">
              {history.length}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading student tasks...</p>
          </div>
        ) : activeTab === 'AVAILABLE' ? (
          /* Available Tasks Tab */
          <div>
            {availableTasks.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-white/5 p-8">
                <CheckSquare className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Tasks Available Right Now</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Active tasks will appear here when scheduled by administrators. Check back regularly to earn points
                  and wallet rewards!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {availableTasks.map((t) => {
                  const isSubmitted = t.status === 'SUBMITTED' || t.status === 'PENDING_REVIEW';
                  const isApproved = t.status === 'APPROVED' || t.status === 'COMPLETED';

                  return (
                    <div
                      key={t.id}
                      className="rounded-3xl bg-slate-900/70 border border-white/10 hover:border-gold-500/40 p-6 shadow-xl flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold-500/10 text-gold-400 border border-gold-500/20">
                            {t.taskId}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              isApproved
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : isSubmitted
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {isApproved ? 'Approved' : isSubmitted ? 'Under Review' : 'Open'}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white tracking-tight">{t.title}</h3>
                          <p className="text-xs text-slate-300 mt-1.5 line-clamp-3 leading-relaxed whitespace-pre-line">
                            {t.description}
                          </p>
                        </div>

                        {/* Reward Badges */}
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-2">
                            <Award className="w-4 h-4 text-gold-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Max Points</p>
                              <p className="text-sm font-extrabold text-white">{t.maxPoints} pts</p>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex items-center space-x-2">
                            <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                            <div>
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Max Reward</p>
                              <p className="text-sm font-extrabold text-emerald-300">₹{t.maxFund.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 text-xs text-slate-400 pt-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            Deadline: <strong className="text-slate-200">{formatDate(t.endDate)}</strong>
                          </span>
                        </div>

                        {isSubmitted && t.submissionNotes && (
                          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                            <p className="font-bold text-[10px] uppercase tracking-wider text-amber-400">
                              Your Submission Report:
                            </p>
                            <p className="mt-0.5 line-clamp-2">{t.submissionNotes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-5 mt-4 border-t border-white/10">
                        {isApproved ? (
                          <div className="w-full py-2.5 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              Approved ({t.approvedPercentage}%) • +{t.awardedPoints} pts • +₹
                              {t.awardedAmount.toFixed(2)}
                            </span>
                          </div>
                        ) : isSubmitted ? (
                          <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5">
                            <Clock className="w-4 h-4" />
                            <span>Report Under Review by Admin</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSubmitModalTask(t);
                              setSubmissionNotes('');
                            }}
                            className="w-full py-2.5 px-4 rounded-2xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-gold-500/20 transition-all hover:scale-[1.01]"
                          >
                            <Send className="w-3.5 h-3.5" />
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
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-white/10 shadow-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
                <h3 className="text-2xl font-black text-white mt-1">{history.length}</h3>
              </div>
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-gold-500/30 shadow-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Points Earned</p>
                <h3 className="text-2xl font-black text-gold-400 mt-1">+{totalPointsEarned} pts</h3>
              </div>
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-emerald-500/30 shadow-xl">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Credited</p>
                <h3 className="text-2xl font-black text-emerald-400 mt-1">+₹{totalCashEarned.toFixed(2)}</h3>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center rounded-3xl bg-slate-900/40 border border-white/5 p-8">
                <Award className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-300">No Completed Tasks Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  When you report completion on active tasks and administrators approve them, your rewards and history
                  will be tracked here.
                </p>
              </div>
            ) : (
              <div className="rounded-3xl bg-slate-900/70 border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4">Task</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-center">Completion</th>
                        <th className="py-3 px-4 text-right">Points</th>
                        <th className="py-3 px-4 text-right">Cash Reward</th>
                        <th className="py-3 px-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.map((h) => (
                        <tr key={h.recordId} className="hover:bg-white/5 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div>{h.title}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{h.taskCode}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                h.status === 'APPROVED' || h.status === 'COMPLETED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-200">
                            {h.approvedPercentage !== null ? `${h.approvedPercentage}%` : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-gold-400">+{h.awardedPoints} pts</td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-400">
                            +₹{h.awardedAmount.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400">
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

      {/* Report Completion Modal */}
      {submitModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Report Task Completion</h3>
                  <p className="text-xs text-slate-400">{submitModalTask.taskId}</p>
                </div>
              </div>
              <button
                onClick={() => setSubmitModalTask(null)}
                className="p-1 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <h4 className="text-sm font-bold text-white">{submitModalTask.title}</h4>
              <p className="text-xs text-slate-300 line-clamp-2">{submitModalTask.description}</p>
              <div className="pt-2 flex items-center space-x-4 text-xs font-semibold">
                <span className="text-gold-400">Max Points: {submitModalTask.maxPoints} pts</span>
                <span className="text-emerald-400">Max Fund: ₹{submitModalTask.maxFund.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Completion Notes / Details <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Describe what you completed, chapter/activity references, or how you fulfilled the task..."
                rows={4}
                className="w-full rounded-2xl bg-slate-950 border border-white/10 p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 transition-colors resize-none"
              />
            </div>

            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                Reporting completion notifies administrators. Points and monetary rewards are credited to your wallet
                automatically once an administrator reviews and approves your submission.
              </span>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSubmitModalTask(null)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs border border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-gold-500/20 transition-all"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
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
