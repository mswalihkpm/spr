'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Bell,
  Send,
  Users,
  GraduationCap,
  User,
  Sparkles,
  BookOpen,
  Calendar,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Smartphone,
  Eye,
  Info,
} from 'lucide-react';

interface AcademicClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  fullName: string;
  studentId: string;
  sprStudentId?: string | null;
  className?: string;
}

interface NotificationHistoryLog {
  id: string;
  title: string;
  body: string;
  category: string;
  targetType: string;
  targetClassId?: string | null;
  targetClass?: { id: string; name: string } | null;
  targetStudentId?: string | null;
  targetStudent?: { id: string; fullName: string; sprStudentId?: string | null } | null;
  deepLink?: string | null;
  senderId: string;
  sender?: { id: string; name: string; email: string } | null;
  recipientCount: number;
  fcmAcceptedCount: number;
  failureCount: number;
  status: string;
  createdAt: string;
}

const CATEGORIES = [
  { id: 'GENERAL', label: 'General Announcement', icon: Sparkles, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'ACADEMIC', label: 'Academic Alert', icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'EXAM', label: 'Exam Notice', icon: Calendar, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'TASK', label: 'Task & Homework', icon: CheckSquare, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'EVENT', label: 'Campus Event', icon: Bell, color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const DEEP_LINK_PRESETS = [
  { label: 'Student Dashboard', path: '/student/dashboard' },
  { label: 'Tasks & Homework', path: '/student/tasks' },
  { label: 'Student Dossier', path: '/student/dossier' },
  { label: 'Leaderboard', path: '/leaderboard' },
];

export default function AdminPushNotificationsPage() {
  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<string>('GENERAL');
  const [targetType, setTargetType] = useState<'ALL_GENERAL_SUBSCRIBERS' | 'ALL_STUDENTS' | 'CLASS' | 'INDIVIDUAL'>('ALL_GENERAL_SUBSCRIBERS');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [deepLink, setDeepLink] = useState('/student/dashboard');

  // Options State
  const [classes, setClasses] = useState<AcademicClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // History State
  const [history, setHistory] = useState<NotificationHistoryLog[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Submission State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; message: string; details?: string } | null>(null);

  // Load Classes and Students for targeting
  useEffect(() => {
    async function loadTargetOptions() {
      setLoadingOptions(true);
      try {
        const res = await fetch('/api/admin/point-corrections/students');
        if (res.ok) {
          const data = await res.json();
          if (data.classes && Array.isArray(data.classes)) {
            setClasses(data.classes);
          }
          if (data.students && Array.isArray(data.students)) {
            setStudents(
              data.students.map((s: any) => ({
                id: s.id,
                fullName: s.fullName,
                studentId: s.studentId,
                sprStudentId: s.sprStudentId,
                className: s.className,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load classes or students:', err);
      } finally {
        setLoadingOptions(false);
      }
    }

    loadTargetOptions();
  }, []);

  // Fetch History
  const fetchHistory = useCallback(async (page = 1) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/push-notifications/history?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
        if (data.pagination) {
          setHistoryPage(data.pagination.page);
          setHistoryTotalPages(data.pagination.totalPages || 1);
          setHistoryTotalCount(data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.error('Failed to fetch notification history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyPage);
  }, [fetchHistory, historyPage]);

  // Validation
  const isFormValid = () => {
    if (!title.trim() || !body.trim()) return false;
    if (targetType === 'CLASS' && !targetClassId) return false;
    if (targetType === 'INDIVIDUAL' && !targetStudentId) return false;
    return true;
  };

  // Dispatch Handlers
  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;
    setFeedback(null);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmSend = async () => {
    setIsSending(true);
    setIsConfirmModalOpen(false);
    setFeedback(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: body.trim(),
        category,
        targetType,
        deepLink: deepLink.trim() || '/student/dashboard',
      };

      if (targetType === 'CLASS') {
        payload.targetClassId = targetClassId;
      } else if (targetType === 'INDIVIDUAL') {
        payload.targetStudentId = targetStudentId;
      }

      const res = await fetch('/api/admin/push-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to dispatch push notifications.',
        });
      } else {
        const log = data.log;
        if (log.status === 'FAILED') {
          setFeedback({
            type: 'error',
            message: 'Dispatch was not completed: Firebase service is not configured or rejected all tokens.',
            details: `Recipients: ${log.recipientCount}, Accepted: ${log.fcmAcceptedCount}, Failures: ${log.failureCount}`,
          });
        } else if (log.status === 'PARTIAL_FAILURE') {
          setFeedback({
            type: 'warning',
            message: 'Notification sent with partial delivery failures.',
            details: `Targeted Students: ${log.recipientCount} | FCM Accepted Tokens: ${log.fcmAcceptedCount} | Stale/Failed: ${log.failureCount}`,
          });
        } else {
          setFeedback({
            type: 'success',
            message: 'Push notification successfully accepted by Firebase Cloud Messaging!',
            details: `Eligible Students Reached: ${log.recipientCount} | Accepted FCM Message Handoffs: ${log.fcmAcceptedCount}`,
          });
        }

        // Reset form content on successful initiation
        setTitle('');
        setBody('');
        fetchHistory(1);
      }
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: 'Network or unexpected error while sending notifications.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Filtered Students for Individual Search
  const filteredStudents = students.filter(
    (s) =>
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.studentId.toLowerCase().includes(studentSearch.toLowerCase()) ||
      (s.sprStudentId && s.sprStudentId.toLowerCase().includes(studentSearch.toLowerCase()))
  );

  const selectedClassName = classes.find((c) => c.id === targetClassId)?.name || 'Selected Class';
  const selectedStudentName = students.find((s) => s.id === targetStudentId)?.fullName || 'Selected Student';

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Admin Portal</span>
              <span>/</span>
              <span className="text-gold-600">Notifications</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 flex items-center space-x-3">
              <span className="p-2.5 bg-madin-900 text-gold-400 rounded-2xl shadow-sm">
                <Bell className="w-7 h-7" />
              </span>
              <span>Push Notification Centre</span>
            </h1>
            <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">
              Dispatch real-time alerts, examination notices, and task updates to students using the Android TWA app and web browsers.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchHistory(historyPage)}
              disabled={loadingHistory}
              className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 shadow-sm transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh History</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : feedback.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedback.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              <div className="font-semibold">{feedback.message}</div>
              {feedback.details && <div className="text-xs opacity-90 mt-1">{feedback.details}</div>}
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold opacity-60 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================================= */}
          {/* Left Column: Notification Composer (7 Cols)                                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-7 bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gold-50 text-gold-600 rounded-xl">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Compose Push Notification</h2>
                  <p className="text-xs text-slate-500">Configure target audience, category, and message text.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleInitiateSend} className="space-y-5">
              {/* Target Audience Tabs */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTargetType('ALL_GENERAL_SUBSCRIBERS');
                      if (category !== 'GENERAL' && category !== 'EVENT') {
                        setCategory('GENERAL');
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                      targetType === 'ALL_GENERAL_SUBSCRIBERS'
                        ? 'bg-madin-900 text-white border-madin-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 mb-1" />
                    <span>All General</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('ALL_STUDENTS')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                      targetType === 'ALL_STUDENTS'
                        ? 'bg-madin-900 text-white border-madin-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Users className="w-4 h-4 mb-1" />
                    <span>All Students</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('CLASS')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                      targetType === 'CLASS'
                        ? 'bg-madin-900 text-white border-madin-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 mb-1" />
                    <span>Class Cohort</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetType('INDIVIDUAL')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition ${
                      targetType === 'INDIVIDUAL'
                        ? 'bg-madin-900 text-white border-madin-900 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-4 h-4 mb-1" />
                    <span>Individual</span>
                  </button>
                </div>

                {targetType === 'ALL_GENERAL_SUBSCRIBERS' && (
                  <p className="mt-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center space-x-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Broadcasts to both anonymous public visitors and enrolled students for general circulars and announcements.</span>
                  </p>
                )}

                {/* Conditional Sub-selectors */}
                {targetType === 'CLASS' && (
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Select Academic Class
                    </label>
                    <select
                      value={targetClassId}
                      onChange={(e) => setTargetClassId(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                    >
                      <option value="">-- Choose Target Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {targetType === 'INDIVIDUAL' && (
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Search & Select Student
                    </label>
                    <input
                      type="text"
                      placeholder="Type student name or SPR ID..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                    <select
                      value={targetStudentId}
                      onChange={(e) => setTargetStudentId(e.target.value)}
                      className="w-full text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500 max-h-36"
                    >
                      <option value="">-- Choose Student ({filteredStudents.length} available) --</option>
                      {filteredStudents.slice(0, 50).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.sprStudentId || s.studentId}) {s.className ? `- ${s.className}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Notification Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const selected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                          selected
                            ? 'bg-madin-900 text-gold-400 border-madin-900 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title & Body */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Notification Title
                    </label>
                    <span className="text-[10px] text-slate-400">{title.length} / 100</span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. Term Examination Timetable Published"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Notification Message Body
                    </label>
                    <span className="text-[10px] text-slate-400">{body.length} / 500</span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={500}
                    placeholder="Enter message text. Confidential marks and financial figures are strictly disallowed."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-gold-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* Destination Deep Link */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Internal Destination Deep Link
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {DEEP_LINK_PRESETS.map((preset) => (
                    <button
                      key={preset.path}
                      type="button"
                      onClick={() => setDeepLink(preset.path)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                        deepLink === preset.path
                          ? 'bg-gold-500/20 text-gold-700 border-gold-500/40 font-semibold'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="/student/dashboard"
                  value={deepLink}
                  onChange={(e) => setDeepLink(e.target.value)}
                  className="w-full text-xs font-mono px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1 font-semibold text-gold-400">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Android TWA & Web Lock-Screen Preview</span>
                  </span>
                  <span>Now</span>
                </div>
                <div className="flex items-start space-x-3 pt-1">
                  <div className="w-8 h-8 rounded-lg bg-white p-1 shrink-0">
                    <img src="/icon-192.png" alt="SPR" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {title.trim() || 'SPR Notification Title Preview'}
                    </div>
                    <div className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                      {body.trim() || 'Notification body text will appear here on the student lock screen.'}
                    </div>
                    <div className="text-[10px] text-gold-400/90 font-mono mt-1 truncate">
                      Tap opens: {deepLink || '/student/dashboard'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid() || isSending}
                className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 bg-madin-900 hover:bg-madin-800 text-gold-400 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Dispatching Push Notification...' : 'Review & Dispatch Notification'}</span>
              </button>
            </form>
          </div>

          {/* ========================================================================= */}
          {/* Right Column: Notification Delivery History (5 Cols)                       */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Broadcasts</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{historyTotalCount}</div>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Route</div>
                <div className="text-sm font-bold text-emerald-600 mt-2 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Firebase Admin v14</span>
                </div>
              </div>
            </div>

            {/* History Feed */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900">Recent Dispatches</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Page {historyPage} of {historyTotalPages}</span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading delivery history...</div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No push notifications sent yet.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-slate-50/90 transition text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-900 line-clamp-1">{log.title}</div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                            log.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.status === 'PARTIAL_FAILURE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {log.status === 'SENT' ? 'FCM Accepted' : log.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{log.body}</p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                        <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md font-semibold">
                          {log.category}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-medium">
                          Target: {log.targetType === 'ALL_GENERAL_SUBSCRIBERS' ? 'All General' : log.targetType === 'CLASS' ? log.targetClass?.name || 'Class' : log.targetType === 'INDIVIDUAL' ? log.targetStudent?.fullName || 'Student' : 'All Students'}
                        </span>
                        <span className="text-slate-400 ml-auto">
                          {new Date(log.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <span>Recipients: <strong className="text-slate-800">{log.recipientCount}</strong></span>
                        <span>Accepted: <strong className="text-emerald-700">{log.fcmAcceptedCount}</strong></span>
                        <span>Failed: <strong className="text-rose-600">{log.failureCount}</strong></span>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage <= 1 || loadingHistory}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Page {historyPage} of {historyTotalPages}
                    </span>
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                      disabled={historyPage >= historyTotalPages || loadingHistory}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Informational Disclaimer */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed flex items-start space-x-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Delivery Verification:</strong> FCM accepted message count records successful handoff to Google Firebase cloud routing servers. Actual device rendering depends on the student device connectivity and notification permissions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Safety Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center space-x-3 text-madin-900 border-b border-slate-100 pb-3">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Confirm Notification Dispatch</h3>
                <p className="text-xs text-slate-500">Please verify broadcast parameters before sending.</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Audience:</span>
                <span className="font-bold text-slate-900">
                  {targetType === 'ALL_GENERAL_SUBSCRIBERS'
                    ? 'All General Subscribers (Anonymous + Students)'
                    : targetType === 'ALL_STUDENTS'
                    ? 'All Registered Students'
                    : targetType === 'CLASS'
                    ? `Class: ${selectedClassName}`
                    : `Student: ${selectedStudentName}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Category:</span>
                <span className="font-bold text-slate-900">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">Deep Link:</span>
                <span className="font-mono text-slate-900">{deepLink}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500 block mb-0.5">Title:</span>
                <span className="font-bold text-slate-900">{title}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              This action will dispatch instant push notifications to student devices whose category preferences permit this alert.
            </p>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-madin-900 text-gold-400 hover:bg-madin-800 shadow-md transition active:scale-95"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
