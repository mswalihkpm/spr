'use client';

import React, { useState, useEffect } from 'react';
import { Flag, X, Send, CheckCircle2, AlertCircle, Lock, Eye, EyeOff, ShieldCheck, UserCheck } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in print:hidden">
      <div className="bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-6 shadow-2xl border-t sm:border border-slate-200/90 dark:border-slate-800 relative animate-scale-in max-h-[92vh] overflow-y-auto">
        {/* Mobile Drag Indicator Bar */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-3 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-rose-600 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-500/25 shrink-0">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-display tracking-tight leading-snug">
              Report Rank / Inaccuracy
            </h3>
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 mt-0.5">
              <Lock className="w-2.5 h-2.5" />
              <span>Student Portal Verification</span>
            </div>
          </div>
        </div>

        {/* Student Context Card */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-slate-50 via-white to-slate-50/80 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-800/80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs mb-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 font-display">
            {resolvedName ? resolvedName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate font-display">
              {resolvedName}
            </div>
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {resolvedClass && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Std {resolvedClass}
                </span>
              )}
              {resolvedRank && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  Rank #{resolvedRank}
                </span>
              )}
              {resolvedSpr !== null && resolvedSpr !== undefined && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  {resolvedSpr}% SPR
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/60 mb-3.5 flex items-start space-x-2.5 shadow-2xs">
          <div className="w-5 h-5 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <p className="text-[11px] text-blue-900 dark:text-blue-200 leading-snug font-medium">
            To prevent false entries, only registered students can report. You must verify using your <strong className="font-bold text-blue-950 dark:text-white">Student Portal password</strong>.
          </p>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce" />
            <div className="text-sm font-bold text-slate-900 dark:text-white font-display">
              Identity Verified & Report Submitted!
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              The administration dashboard has received your verified ticket.
            </p>
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
              <label className="block text-[10.5px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Your Registered Student Name or SPR ID *
              </label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="e.g. Muhammad Swalih or SPR2026-..."
                className="w-full px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:text-xs outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-rose-500/10 transition shadow-2xs font-sans"
              />
            </div>

            <div>
              <label className="block text-[10.5px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between uppercase tracking-wider">
                <span>Student Portal Password *</span>
                <span className="text-[10px] text-slate-400 font-normal lowercase">for authentication</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={reporterPassword}
                  onChange={(e) => setReporterPassword(e.target.value)}
                  placeholder="Enter your student password..."
                  className="w-full px-3.5 py-2.5 pr-10 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:text-xs outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-rose-500/10 transition shadow-2xs font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">
                Report Details / Reason for Discrepancy *
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the issue with this student's rank or points (e.g. Points calculation error in Arabic, missing evaluation)..."
                className="w-full px-3.5 py-2.5 bg-slate-50/90 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:text-xs outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-rose-500/10 transition shadow-2xs font-sans resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs transition text-center cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center space-x-2 tracking-wide disabled:opacity-50 cursor-pointer"
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
