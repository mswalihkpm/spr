'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Store,
  Search,
  Users,
  CreditCard,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  History,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function StoreManagementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Usage Modal State
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [usageAmount, setUsageAmount] = useState<string>('');
  const [usageRemarks, setUsageRemarks] = useState('');
  const [submittingUsage, setSubmittingUsage] = useState(false);

  const fetchStoreData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch(`/api/store?q=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch store data.');

      setData(json);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading store data.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, [search]);

  const handleOpenUsageModal = (student: any) => {
    setSelectedStudent(student);
    setUsageAmount('');
    setUsageRemarks('');
    setUsageModalOpen(true);
  };

  const handleRecordUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    const num = parseFloat(usageAmount);
    if (isNaN(num) || num <= 0) {
      setStatusMsg({ type: 'error', text: 'Usage amount must be greater than zero.' });
      return;
    }

    if (num > selectedStudent.availableFund) {
      setStatusMsg({
        type: 'error',
        text: `Requested amount (₹${num.toFixed(2)}) exceeds available fund (₹${selectedStudent.availableFund.toFixed(2)}).`,
      });
      return;
    }

    setSubmittingUsage(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.studentId,
          amount: num,
          remarks: usageRemarks,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Deduction failed.');

      setStatusMsg({ type: 'success', text: json.message });
      setUsageModalOpen(false);
      setSelectedStudent(null);
      setUsageAmount('');
      setUsageRemarks('');
      fetchStoreData(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to record store usage.' });
    } finally {
      setSubmittingUsage(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 flex items-center justify-center">
          <VideoLoader
            size="xl"
            text="Loading Store Fund Records..."
            subtext="Accessing qualifying student contributions and store ledger"
          />
        </div>
      </AdminLayout>
    );
  }

  const students = data?.students || [];
  const stats = data?.stats || {
    qualifyingStudentsCount: 0,
    totalContributed: 0,
    totalUsed: 0,
    availableFund: 0,
  };
  const recentUsages = data?.recentUsages || [];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1">
                <Store className="w-3.5 h-3.5 text-blue-600" />
                <span>Store Fund Management</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
              Student Store Contributions & Redemption
            </h2>
            <p className="text-xs text-slate-500">
              Only students with qualifying Store contributions appear in this ledger. Fund redemptions are deducted exclusively from available store balance without altering student personal wallets or SPR points.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchStoreData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Refresh Records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
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
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Store Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Qualifying Students</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {stats.qualifyingStudentsCount}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">With store contributions</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Contributed</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">
              ₹{stats.totalContributed.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">All-time shared by students</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-subtle">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Utilized</span>
              <TrendingDown className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-slate-700 mt-2">
              ₹{stats.totalUsed.toFixed(2)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Redeemed during store purchases</p>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-subtle">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
              <span>Available Store Fund</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-900 mt-2">
              ₹{stats.availableFund.toFixed(2)}
            </p>
            <p className="text-[11px] text-blue-600 mt-1">Currently redeemable</p>
          </div>
        </div>

        {/* Student Fund Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
              <span>Qualifying Students (Alphabetical)</span>
            </h3>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student or SPR ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              No students with store contributions found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Class</th>
                    <th className="pb-3 pr-4">Total Contributed</th>
                    <th className="pb-3 pr-4">Amount Used</th>
                    <th className="pb-3 pr-4">Available Fund</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s: any) => (
                    <tr key={s.studentId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="font-bold text-slate-900">{s.studentName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {s.sprStudentId || s.studentCode}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-slate-600">
                        {s.className} ({s.division})
                      </td>
                      <td className="py-3.5 pr-4 font-semibold text-slate-700">
                        ₹{s.totalContributed.toFixed(2)}
                      </td>
                      <td className="py-3.5 pr-4 text-slate-500">
                        ₹{s.totalUsed.toFixed(2)}
                      </td>
                      <td className="py-3.5 pr-4 font-black text-blue-700 text-sm">
                        ₹{s.availableFund.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleOpenUsageModal(s)}
                          disabled={s.availableFund <= 0}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs"
                        >
                          Record Usage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Store Usage Records */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Recent Store Usage History</span>
            </h3>
            <span className="text-xs text-slate-400">
              {recentUsages.length} transaction(s)
            </span>
          </div>

          {recentUsages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No store redemptions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5 pr-4">Reference</th>
                    <th className="pb-2.5 pr-4">Student</th>
                    <th className="pb-2.5 pr-4">Amount Deducted</th>
                    <th className="pb-2.5 pr-4">Remarks</th>
                    <th className="pb-2.5 pr-4">Authorized Admin</th>
                    <th className="pb-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentUsages.map((u: any) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 pr-4 font-mono text-[11px] text-slate-400">
                        {u.reference}
                      </td>
                      <td className="py-2.5 pr-4 font-bold text-slate-900">
                        {u.studentName} ({u.sprStudentId || 'ID'})
                      </td>
                      <td className="py-2.5 pr-4 font-black text-rose-600">
                        -₹{u.amount.toFixed(2)}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600 truncate max-w-xs">
                        {u.remarks || 'Store deduction'}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500">
                        {u.actingAdminEmail}
                      </td>
                      <td className="py-2.5 text-right text-slate-400 whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString()} {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Usage Deduction Modal */}
      {usageModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Store className="w-5 h-5 text-blue-600" />
                <span>Record Store Fund Usage</span>
              </h3>
              <button
                onClick={() => setUsageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Student Name:</span>
                <span className="font-bold text-slate-900">{selectedStudent.studentName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">SPR Student ID:</span>
                <span className="font-mono font-bold text-slate-800">
                  {selectedStudent.sprStudentId || selectedStudent.studentCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Class & Division:</span>
                <span className="font-semibold text-slate-800">
                  {selectedStudent.className} ({selectedStudent.division})
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-blue-200/60">
                <span className="text-blue-900 font-bold">Available Store Fund:</span>
                <span className="text-base font-black text-blue-900">
                  ₹{selectedStudent.availableFund.toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordUsage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Amount to Deduct (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max={selectedStudent.availableFund}
                  required
                  placeholder={`Max: ${selectedStudent.availableFund.toFixed(2)}`}
                  value={usageAmount}
                  onChange={(e) => setUsageAmount(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Item Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Notebooks, pen set, uniform purchase"
                  value={usageRemarks}
                  onChange={(e) => setUsageRemarks(e.target.value)}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUsageModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUsage}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {submittingUsage ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm Deduction</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
