'use client';

import React, { useState, useEffect } from 'react';
import { Flag, X, Send, CheckCircle2, AlertCircle, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface StudentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id?: string;
    studentId?: string;
    name: string;
    className?: string;
    rank?: number | string;
    spr?: number | string;
  } | null;
}

export default function StudentReportModal({
  isOpen,
  onClose,
  student,
}: StudentReportModalProps) {
  const [reporterName, setReporterName] = useState('');
  const [reporterPassword, setReporterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect logged-in student session if active
  useEffect(() => {
    if (isOpen) {
      fetch('/api/student/profile')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.student?.fullName && !reporterName) {
            setReporterName(data.student.fullName);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const resolvedName =
    student.name ||
    (student as any).fullName ||
    (student as any).studentName ||
    'Student';

  const resolvedStudentId =
    student.id ||
    student.studentId ||
    (student as any).studentCode ||
    (student as any).studentIdCode ||
    null;

  const resolvedClass = student.className || (student as any).class?.name || '';
  const resolvedSpr = student.spr ?? (student as any).overallScore ?? (student as any).overallSPR ?? null;
  const resolvedRank = student.rank ?? (student as any).classRank ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reporterPassword.trim()) {
      setError('Please enter your Student Portal password to verify your identity.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: resolvedStudentId,
          studentName: resolvedName.trim(),
          className: resolvedClass.trim(),
          rank: resolvedRank || null,
          sprScore: resolvedSpr || null,
          reporterName: reporterName.trim(),
          reporterPassword: reporterPassword.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReporterPassword('');
        setMessage('');
        onClose();
      }, 2200);
    } catch (err: any) {
      setError(err.message || 'Error sending report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-scale-in max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 text-rose-600 mb-3 pr-8">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/50 dark:border-rose-900/40">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report Rank / Inaccuracy</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Authenticated Student Submission</p>
          </div>
        </div>

        {/* Student Context Card */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 mb-3 space-y-1">
          <div className="text-xs font-black text-slate-900 dark:text-white truncate">{resolvedName}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between flex-wrap gap-1">
            <span>{resolvedClass ? `Standard ${resolvedClass}` : (student.id || student.studentId ? `ID: ${student.studentId || student.id}` : 'Student Record')}</span>
            {resolvedRank && <span>Rank #{resolvedRank}</span>}
            {resolvedSpr !== null && resolvedSpr !== undefined && (
              <span className="font-bold text-blue-700 dark:text-blue-400">{resolvedSpr}% SPR</span>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-2.5 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-200/70 dark:border-blue-900/50 mb-3 flex items-start space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-blue-800 dark:text-blue-300 leading-tight">
            To prevent false entries, only registered students can report. You must verify using your <strong className="font-semibold">Student Portal password</strong>.
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <div className="text-sm font-bold text-slate-900 dark:text-white">Identity Verified & Report Submitted!</div>
            <p className="text-xs text-slate-500 dark:text-slate-400">The administration dashboard has received your verified ticket.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2 border border-rose-200 dark:border-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Registered Student Name or SPR ID *
              </label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Muhammad Swalih or SPR2026-..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Student Portal Password *</span>
                <span className="text-[10px] text-slate-400 font-normal">For authentication</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={reporterPassword}
                  onChange={(e) => setReporterPassword(e.target.value)}
                  placeholder="Enter your student password..."
                  className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Report Details / Reason for Discrepancy *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue with this student's rank or points (e.g. Points calculation error in Arabic, missing evaluation)..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Verify & Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
