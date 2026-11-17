'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Award,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Wallet,
  Coins,
  ArrowUpDown,
  Filter,
  Users,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';

interface Reason {
  id: string;
  title: string;
  basePoint: number;
  description?: string | null;
  adjustmentsCount?: number;
}

interface StudentItem {
  id: string;
  studentId: string;
  sprStudentId: string;
  fullName: string;
  className: string;
  division?: string;
  photoUrl?: string | null;
  pointsForReason: number;
  totalAdjustment: number;
  positivePoints: number;
  negativePoints: number;
  adjustmentsCount: number;
}

export default function PointsAdjustmentPage() {
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reason modal state
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<Reason | null>(null);
  const [reasonTitle, setReasonTitle] = useState('');
  const [reasonBasePoint, setReasonBasePoint] = useState<number | string>(5);
  const [reasonDescription, setReasonDescription] = useState('');
  const [submittingReason, setSubmittingReason] = useState(false);

  // Wallet Direct Cash Adjustment Modal state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletStudent, setWalletStudent] = useState<StudentItem | null>(null);
  const [walletCurrentBalance, setWalletCurrentBalance] = useState<number>(0);
  const [walletLoadingBalance, setWalletLoadingBalance] = useState(false);
  const [walletAmount, setWalletAmount] = useState<string>('50');
  const [walletAction, setWalletAction] = useState<'ADD' | 'REDUCE'>('ADD');
  const [walletNote, setWalletNote] = useState('');
  const [walletSubmitting, setWalletSubmitting] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch reasons list
  const fetchReasons = useCallback(async () => {
    try {
      setLoadingReasons(true);
      const res = await fetch('/api/admin/point-corrections/reasons');
      const data = await res.json();
      if (data.reasons) {
        setReasons(data.reasons);
        if (data.reasons.length > 0 && !selectedReasonId) {
          setSelectedReasonId(data.reasons[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load correction reasons', 'error');
    } finally {
      setLoadingReasons(false);
    }
  }, [selectedReasonId]);

  useEffect(() => {
    fetchReasons();
  }, [fetchReasons]);

  // Fetch students for selected reason and filters
  const fetchStudents = useCallback(async () => {
    if (!selectedReasonId) return;
    try {
      setLoadingStudents(true);
      const params = new URLSearchParams({
        reasonId: selectedReasonId,
        classId: selectedClassId,
        search: searchQuery,
      });
      const res = await fetch(`/api/admin/point-corrections/students?${params.toString()}`);
      const data = await res.json();
      if (data.students) {
        setStudents(data.students);
      }
      if (data.classes && classes.length === 0) {
        setClasses(data.classes);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to load students', 'error');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedReasonId, selectedClassId, searchQuery, classes.length]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const activeReason = useMemo(() => {
    return reasons.find((r) => r.id === selectedReasonId) || null;
  }, [reasons, selectedReasonId]);

  // Apply point delta (+/- basePoint)
  const handleApplyPoints = async (studentId: string, action: 'ADD' | 'REDUCE') => {
    if (!selectedReasonId || !activeReason) return;
    const actionKey = `${studentId}_${action}`;
    setActionInProgress(actionKey);

    // Optimistic UI update
    const delta = action === 'ADD' ? activeReason.basePoint : -activeReason.basePoint;
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === studentId) {
          return {
            ...s,
            pointsForReason: Number((s.pointsForReason + delta).toFixed(2)),
            totalAdjustment: Number((s.totalAdjustment + delta).toFixed(2)),
          };
        }
        return s;
      })
    );

    try {
      const res = await fetch('/api/admin/point-corrections/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          reasonId: selectedReasonId,
          action,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to apply points');
      }
      showToast(
        `${action === 'ADD' ? '+' : ''}${delta} pts successfully ${action === 'ADD' ? 'added to' : 'reduced from'} student.`,
        'success'
      );
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error updating points', 'error');
      // Revert via re-fetch
      fetchStudents();
    } finally {
      setActionInProgress(null);
    }
  };

  // Create or Update Reason
  const handleSaveReason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonTitle.trim()) {
      showToast('Reason title is required', 'error');
      return;
    }
    const numBase = parseFloat(String(reasonBasePoint));
    if (isNaN(numBase) || numBase <= 0) {
      showToast('Base point must be a positive number', 'error');
      return;
    }

    try {
      setSubmittingReason(true);
      const isEdit = Boolean(editingReason);
      const url = '/api/admin/point-corrections/reasons';
      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        id: editingReason?.id,
        title: reasonTitle.trim(),
        basePoint: numBase,
        description: reasonDescription.trim() || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to save reason');
      }

      showToast(`Reason "${reasonTitle}" successfully ${isEdit ? 'updated' : 'created'}!`, 'success');
      setReasonModalOpen(false);
      setEditingReason(null);
      setReasonTitle('');
      setReasonBasePoint(5);
      setReasonDescription('');
      await fetchReasons();
      if (!isEdit && data.reason?.id) {
        setSelectedReasonId(data.reason.id);
      }
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error saving reason', 'error');
    } finally {
      setSubmittingReason(false);
    }
  };

  // Delete Reason
  const handleDeleteReason = async (reason: Reason) => {
    if (!confirm(`Are you sure you want to delete "${reason.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/point-corrections/reasons?id=${reason.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete reason');
      }
      showToast(`Reason "${reason.title}" deleted`, 'success');
      if (selectedReasonId === reason.id) {
        setSelectedReasonId(null);
      }
      await fetchReasons();
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error deleting reason', 'error');
    }
  };

  // Open Wallet Direct Cash Adjustment Modal
  const openWalletModal = async (student: StudentItem) => {
    setWalletStudent(student);
    setWalletModalOpen(true);
    setWalletAmount('50');
    setWalletAction('ADD');
    setWalletNote('Administrative cash update');
    try {
      setWalletLoadingBalance(true);
      const res = await fetch(`/api/admin/wallet/adjust?studentId=${student.id}`);
      const data = await res.json();
      if (data.wallet) {
        setWalletCurrentBalance(Number(data.wallet.balance || 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setWalletLoadingBalance(false);
    }
  };

  // Submit Wallet Cash Adjustment
  const handleSaveWalletAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletStudent) return;
    const num = parseFloat(walletAmount);
    if (isNaN(num) || num <= 0) {
      showToast('Please enter a valid cash amount', 'error');
      return;
    }

    try {
      setWalletSubmitting(true);
      const res = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: walletStudent.id,
          action: walletAction,
          amount: num,
          note: walletNote.trim() || 'Direct administrative cash adjustment',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to adjust wallet cash');
      }

      showToast(
        `Wallet cash successfully updated for ${walletStudent.fullName}. Direct balance adjusted without student transaction history.`,
        'success'
      );
      setWalletModalOpen(false);
      setWalletStudent(null);
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Error updating wallet cash', 'error');
    } finally {
      setWalletSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-7 max-w-7xl mx-auto space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div
            className={`fixed top-5 right-5 z-50 flex items-center space-x-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold transition-all animate-bounce ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
                <Award className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Points Adjustment &amp; Wallet Cash
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add or reduce students&apos; Total SPR Points based on custom administrative reasons with strict 3-column control, or directly adjust wallet cash.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingReason(null);
              setReasonTitle('');
              setReasonBasePoint(5);
              setReasonDescription('');
              setReasonModalOpen(true);
            }}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Reason</span>
          </button>
        </div>

        {/* =========================================================================
            SECTION 1: REASONS CARD BOX GRID
            ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Select or Manage Reasons ({reasons.length})
            </h2>
            <span className="text-[11px] text-slate-400">
              Click any card to load student entries
            </span>
          </div>

          {loadingReasons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-28 rounded-2xl bg-slate-100 animate-pulse border border-slate-200" />
              ))}
            </div>
          ) : reasons.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
              <Award className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No point correction reasons created yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Click &quot;Create New Reason&quot; to establish reasons like Conduct, Leadership, or Special Contribution.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {reasons.map((r) => {
                const isSelected = r.id === selectedReasonId;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedReasonId(r.id)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
                          {r.title}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-lg font-mono font-black text-[11px] shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {r.basePoint} pts
                        </span>
                      </div>
                      {r.description && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{r.description}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-400">
                        {r.adjustmentsCount || 0} applications
                      </span>
                      <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingReason(r);
                            setReasonTitle(r.title);
                            setReasonBasePoint(r.basePoint);
                            setReasonDescription(r.description || '');
                            setReasonModalOpen(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="Edit Reason"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteReason(r)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete Reason"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 2: SELECTED REASON STUDENT ENTRIES WITH STRICT 3-COLUMN TABLE
            ========================================================================= */}
        {activeReason && (
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            {/* Active Reason Banner */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">
                  Active Reason Box
                </span>
                <h3 className="text-base sm:text-lg font-black text-white">{activeReason.title}</h3>
                <p className="text-xs text-blue-200/80 mt-0.5">
                  Base Point Increment / Decrement: <strong className="text-amber-300">{activeReason.basePoint} points</strong> per click.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 font-bold">
                  Click (-) to reduce {activeReason.basePoint} pts
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/20 font-bold">
                  Click (+) to add {activeReason.basePoint} pts
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              {/* Class Filter */}
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedClassId('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                    selectedClassId === 'ALL'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Cohorts
                </button>
                {classes.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedClassId(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                      selectedClassId === c.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              {/* Global Search Option */}
              <div className="relative shrink-0 w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or SPR ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition"
                />
              </div>
            </div>

            {/* Strict 3-Column Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[80px_1fr_80px] sm:grid-cols-[100px_1fr_100px] bg-slate-100/80 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200 text-center">
                <div className="text-center font-bold text-rose-700">Reduce (-)</div>
                <div className="text-left pl-3 sm:pl-6 font-bold text-slate-700">Student Name &amp; Class</div>
                <div className="text-center font-bold text-emerald-700">Add (+)</div>
              </div>

              {loadingStudents ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading student records...</div>
              ) : students.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No students found matching current filters.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const isReducing = actionInProgress === `${student.id}_REDUCE`;
                    const isAdding = actionInProgress === `${student.id}_ADD`;

                    return (
                      <div
                        key={student.id}
                        className="grid grid-cols-[80px_1fr_80px] sm:grid-cols-[100px_1fr_100px] items-center px-4 py-3 hover:bg-blue-50/40 transition-colors"
                      >
                        {/* COLUMN 1: REDUCE (-) IN RED CIRCLE */}
                        <div className="flex items-center justify-center">
                          <button
                            disabled={isReducing || isAdding}
                            onClick={() => handleApplyPoints(student.id, 'REDUCE')}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-100 text-rose-700 hover:bg-rose-200 active:scale-95 border-2 border-rose-300 flex items-center justify-center font-black text-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title={`Reduce ${activeReason.basePoint} points from ${student.fullName}`}
                          >
                            <Minus className="w-5 h-5 stroke-[3]" />
                          </button>
                        </div>

                        {/* COLUMN 2: STUDENT NAME WITH CLASS */}
                        <div className="px-3 sm:px-6 min-w-0">
                          <div className="flex items-center space-x-3">
                            <StudentAvatar
                              photoUrl={student.photoUrl}
                              name={student.fullName}
                              size="sm"
                              studentId={student.sprStudentId || student.id}
                              className="w-9 h-9 shrink-0 ring-1 ring-slate-200"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                  {student.fullName}
                                </span>
                                <span className="text-[10px] font-mono text-blue-700 px-1.5 py-0.2 rounded bg-blue-50 border border-blue-200">
                                  {student.sprStudentId}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                                <span>
                                  {student.className} {student.division ? `(${student.division})` : ''}
                                </span>
                                <span>•</span>
                                <span className="font-mono font-bold text-slate-700">
                                  Reason Net: {student.pointsForReason > 0 ? `+${student.pointsForReason}` : student.pointsForReason} pts
                                </span>
                                <span>•</span>
                                <span className="font-mono text-slate-500">
                                  Total Adjustments: {student.totalAdjustment > 0 ? `+${student.totalAdjustment}` : student.totalAdjustment} pts
                                </span>
                                <button
                                  onClick={() => openWalletModal(student)}
                                  className="inline-flex items-center space-x-1 text-[10.5px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 cursor-pointer ml-1"
                                >
                                  <Wallet className="w-3 h-3" />
                                  <span>Adjust Cash</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* COLUMN 3: ADD (+) IN GREEN CIRCLE */}
                        <div className="flex items-center justify-center">
                          <button
                            disabled={isReducing || isAdding}
                            onClick={() => handleApplyPoints(student.id, 'ADD')}
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:scale-95 border-2 border-emerald-300 flex items-center justify-center font-black text-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                            title={`Add ${activeReason.basePoint} points to ${student.fullName}`}
                          >
                            <Plus className="w-5 h-5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            CREATE / EDIT REASON MODAL
            ========================================================================= */}
        {reasonModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  {editingReason ? 'Edit Correction Reason' : 'Create Point Correction Reason'}
                </h3>
                <button
                  onClick={() => setReasonModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveReason} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Reason Name / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Moral Conduct, Campus Discipline, Initiative"
                    value={reasonTitle}
                    onChange={(e) => setReasonTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Base Point (Points per Click) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    placeholder="5"
                    value={reasonBasePoint}
                    onChange={(e) => setReasonBasePoint(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none font-mono"
                  />
                  <p className="text-[10.5px] text-slate-400 mt-1">
                    Clicking (+) adds this base amount; clicking (-) subtracts this base amount.
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Brief description for administrative records"
                    value={reasonDescription}
                    onChange={(e) => setReasonDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setReasonModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReason}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {submittingReason ? 'Saving...' : editingReason ? 'Update Reason' : 'Create Reason Card'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =========================================================================
            DIRECT WALLET CASH ADJUSTMENT MODAL (NO STUDENT TRANSACTION RECORD)
            ========================================================================= */}
        {walletModalOpen && walletStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Wallet className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-black text-slate-900">Direct Wallet Cash Edit</h3>
                </div>
                <button
                  onClick={() => setWalletModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 leading-relaxed">
                <strong>Administrative Rule:</strong> This direct cash adjustment will <u>NOT</u> create any entry in the student&apos;s transaction history. It only adjusts the student&apos;s wallet balance directly.
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{walletStudent.fullName}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{walletStudent.sprStudentId} • {walletStudent.className}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Current Cash</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    {walletLoadingBalance ? '...' : `₹${walletCurrentBalance.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveWalletAdjustment} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Adjustment Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWalletAction('ADD')}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 border cursor-pointer ${
                        walletAction === 'ADD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cash (+)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWalletAction('REDUCE')}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center space-x-1.5 border cursor-pointer ${
                        walletAction === 'REDUCE'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Reduce Cash (-)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none font-mono text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Admin Audit Note (Visible to admin only)</label>
                  <input
                    type="text"
                    value={walletNote}
                    onChange={(e) => setWalletNote(e.target.value)}
                    placeholder="e.g. Correction of allowance, special cash award"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setWalletModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={walletSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {walletSubmitting ? 'Updating...' : `Confirm ${walletAction === 'ADD' ? 'Addition' : 'Reduction'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
