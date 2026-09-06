'use client';

import React, { useState } from 'react';
import { Flag, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

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
          reporterName,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit report.');

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReporterName('');
        setMessage('');
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error sending report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2.5 text-rose-600 mb-3">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Report Inaccuracy / Issue</h3>
            <p className="text-[11px] text-slate-500">Submit an update request to the administration</p>
          </div>
        </div>

        {/* Student Context Card */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 mb-4 space-y-1">
          <div className="text-xs font-black text-slate-900">{resolvedName}</div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>{resolvedClass ? `Standard ${resolvedClass}` : (student.id || student.studentId ? `ID: ${student.studentId || student.id}` : 'Student Record')}</span>
            {resolvedRank && <span>Rank #{resolvedRank}</span>}
            {resolvedSpr !== null && resolvedSpr !== undefined && (
              <span className="font-bold text-blue-700">{resolvedSpr}% SPR</span>
            )}
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto animate-bounce" />
            <div className="text-sm font-bold text-slate-900">Report Submitted!</div>
            <p className="text-xs text-slate-500">The administration dashboard has received your report.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
              <input
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Enter your full name..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Report Details / Issue *</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the discrepancy (e.g. Marks missing for Term 2, Name spelling correction)..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Report to Admin</span>
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
