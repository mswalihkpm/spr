'use client';

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Search,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  UserCheck,
  UserX,
  X,
  Eye,
  EyeOff,
  Copy,
  Wallet,
  TrendingUp,
  Store,
  Sparkles,
} from 'lucide-react';

export default function StudentAccountManagement() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'NOT_CREATED' | 'DISABLED'>('ALL');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected Student Drawer / Detail Modal
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Reset Password Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [customPassword, setCustomPassword] = useState('');
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Activation Code Result Modal State
  const [generatedCodeResult, setGeneratedCodeResult] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

  const fetchStudentAccounts = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/admin/student-accounts');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch student accounts.');

      setStudents(json.students || []);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading accounts.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStudentAccounts();
  }, []);

  const handleGenerateActivationCode = async (studentId: string) => {
    setGeneratingCode(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GENERATE_ACTIVATION_CODE',
          studentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate code.');

      setGeneratedCodeResult(json.activationCode);
      setStatusMsg({ type: 'success', text: json.message });
      fetchStudentAccounts(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to generate code.' });
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleExecutePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setResettingPassword(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/admin/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          studentId: selectedStudent.id,
          newPassword: customPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Password reset failed.');

      setTempPasswordResult(json.temporaryPassword);
      setStatusMsg({ type: 'success', text: json.message });
      fetchStudentAccounts(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reset password.' });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleStatus = async (studentId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          studentId,
          newStatus: nextStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Status update failed.');

      setStatusMsg({ type: 'success', text: json.message });
      fetchStudentAccounts(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update status.' });
    }
  };

  const handleRecalculateEarnings = async (studentId: string) => {
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/student-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RECALCULATE_EARNINGS',
          studentId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Recalculation failed.');

      setStatusMsg({ type: 'success', text: json.message });
      fetchStudentAccounts(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to recalculate.' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase();
    const matchesSearch =
      s.fullName.toLowerCase().includes(query) ||
      (s.sprStudentId && s.sprStudentId.toLowerCase().includes(query)) ||
      (s.studentId && s.studentId.toLowerCase().includes(query)) ||
      (s.className && s.className.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return s.accountStatus === 'ACTIVE';
    if (statusFilter === 'NOT_CREATED') return s.accountStatus === 'NOT_CREATED' || s.accountStatus === 'PENDING_ACTIVATION';
    if (statusFilter === 'DISABLED') return s.accountStatus === 'DISABLED' || s.accountStatus === 'LOCKED';
    return true;
  });

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-madin-900" />
            <span>Student Account Management & Password Control</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage student portal accounts, generate activation codes, perform secure administrative password resets, and inspect student wallet balances.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchStudentAccounts(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Refresh Account Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status Message */}
      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name, SPR ID, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {(['ALL', 'ACTIVE', 'NOT_CREATED', 'DISABLED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f
                  ? 'bg-madin-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL'
                ? `All (${students.length})`
                : f === 'ACTIVE'
                ? `Active (${students.filter((s) => s.accountStatus === 'ACTIVE').length})`
                : f === 'NOT_CREATED'
                ? `Unregistered (${students.filter((s) => s.accountStatus === 'NOT_CREATED' || s.accountStatus === 'PENDING_ACTIVATION').length})`
                : `Disabled (${students.filter((s) => s.accountStatus === 'DISABLED' || s.accountStatus === 'LOCKED').length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading student accounts...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500">
          No student records found matching the search or filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-3.5">Student Details</th>
                <th className="py-3 px-3.5">Class</th>
                <th className="py-3 px-3.5">Account Status</th>
                <th className="py-3 px-3.5">Activation Code</th>
                <th className="py-3 px-3.5">Wallet Balance</th>
                <th className="py-3 px-3.5">Last Sign In</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((s) => {
                const isActive = s.accountStatus === 'ACTIVE';
                const isNotCreated = s.accountStatus === 'NOT_CREATED' || s.accountStatus === 'PENDING_ACTIVATION';
                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900">{s.fullName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {s.sprStudentId || s.studentId}
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium">
                      {s.className} ({s.division})
                    </td>
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : isNotCreated
                            ? 'bg-slate-100 border-slate-200 text-slate-600'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {s.accountStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-[11px]">
                      {s.activationCode ? (
                        <span className="font-bold text-madin-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {s.activationCode}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleGenerateActivationCode(s.id)}
                          className="text-madin-900 hover:underline text-[11px] font-semibold"
                        >
                          + Issue Code
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      ₹{s.walletBalance.toFixed(2)}
                    </td>
                    <td className="py-3 px-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {s.lastLoginAt ? new Date(s.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => {
                            setSelectedStudent(s);
                            setCustomPassword('');
                            setTempPasswordResult(null);
                            setResetModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition text-[11px] font-bold flex items-center space-x-1"
                          title="Reset Password"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reset Password</span>
                        </button>

                        {s.hasAccount && (
                          <button
                            onClick={() => handleToggleStatus(s.id, s.accountStatus)}
                            className={`p-1.5 rounded-lg border transition ${
                              isActive
                                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                            }`}
                            title={isActive ? 'Disable Student Account' : 'Reactivate Student Account'}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= RESET PASSWORD MODAL ================= */}
      {resetModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <span>Reset Student Password</span>
              </h3>
              <button
                onClick={() => {
                  setResetModalOpen(false);
                  setTempPasswordResult(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
              <p className="font-bold">{selectedStudent.fullName} ({selectedStudent.sprStudentId})</p>
              <p className="text-[11px] text-amber-800">
                Class: {selectedStudent.className} ({selectedStudent.division})
              </p>
              <p className="text-[11px] text-amber-700 pt-1 border-t border-amber-200/60">
                Security Policy: Student existing passwords are never exposed or recovered. A secure temporary password will be assigned and the student will be prompted to set their own password upon login.
              </p>
            </div>

            {tempPasswordResult ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3">
                <p className="text-xs font-bold text-emerald-900">
                  Password Reset Succeeded! Provide this credential to the student:
                </p>
                <div className="flex items-center justify-between bg-white px-3.5 py-2.5 rounded-xl border border-emerald-300 font-mono text-base font-black text-slate-900">
                  <span>{tempPasswordResult}</span>
                  <button
                    onClick={() => copyToClipboard(tempPasswordResult)}
                    className="p-1 rounded text-slate-500 hover:text-slate-900"
                    title="Copy Temporary Password"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                {copied && (
                  <p className="text-[10px] text-emerald-700 font-semibold">
                    Copied to clipboard!
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(false);
                    setTempPasswordResult(null);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleExecutePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Custom Password (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Leave blank to auto-generate secure PIN"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    If left empty, a secure temporary PIN (e.g. SPR-ABC123) is automatically generated.
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    {resettingPassword ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Reset Credential</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
