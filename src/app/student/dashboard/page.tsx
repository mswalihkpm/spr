'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  Send,
  Store,
  PlusCircle,
  LogOut,
  KeyRound,
  History,
  GraduationCap,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  X,
  RefreshCw,
  Sparkles,
  BookOpen,
  Feather,
  Library,
  Trophy,
  Layers,
  ChevronRight,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transfer / Share Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferType, setTransferType] = useState<'STUDENT' | 'STORE'>('STUDENT');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientsList, setRecipientsList] = useState<any[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferRemarks, setTransferRemarks] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferStep, setTransferStep] = useState<'INPUT' | 'CONFIRM'>('INPUT');
  const [transferError, setTransferError] = useState('');

  // Add Funds Info Modal State
  const [addFundsModalOpen, setAddFundsModalOpen] = useState(false);

  // Change Password Modal State
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

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

  // Fetch recipients when transfer modal opens
  useEffect(() => {
    if (transferModalOpen && transferType === 'STUDENT') {
      fetch(`/api/student/recipients?q=${encodeURIComponent(recipientSearch)}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.recipients) setRecipientsList(json.recipients);
        })
        .catch(() => {});
    }
  }, [transferModalOpen, transferType, recipientSearch]);

  const handleLogout = async () => {
    await fetch('/api/student/auth/logout', { method: 'POST' });
    router.push('/student/login');
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');

    if (transferStep === 'INPUT') {
      if (transferType === 'STUDENT' && !selectedRecipientId) {
        setTransferError('Please select a recipient student.');
        return;
      }
      const num = parseFloat(transferAmount);
      if (isNaN(num) || num <= 0) {
        setTransferError('Please enter a valid transfer amount.');
        return;
      }
      if (num > (data?.wallet?.balance || 0)) {
        setTransferError(`Insufficient balance. Available: ₹${(data?.wallet?.balance || 0).toFixed(2)}`);
        return;
      }
      setTransferStep('CONFIRM');
      return;
    }

    setTransferLoading(true);
    setStatusMsg(null);

    try {
      const payload: any = {
        action: transferType === 'STUDENT' ? 'TRANSFER_STUDENT' : 'SHARE_STORE',
        amount: parseFloat(transferAmount),
        remarks: transferRemarks,
      };

      if (transferType === 'STUDENT') {
        payload.recipientStudentId = selectedRecipientId;
      }

      const res = await fetch('/api/student/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transaction failed.');

      setStatusMsg({ type: 'success', text: json.message });
      setTransferModalOpen(false);
      setTransferStep('INPUT');
      setTransferAmount('');
      setTransferRemarks('');
      setSelectedRecipientId('');
      setTransferError('');
      fetchDashboardData(true);
    } catch (err: any) {
      setTransferError(err.message || 'Transaction could not be completed.');
      setStatusMsg({ type: 'error', text: err.message || 'Transaction could not be completed.' });
    } finally {
      setTransferLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwdLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/student/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Password update failed.');

      setStatusMsg({ type: 'success', text: 'Password changed successfully.' });
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

  const getCategoryIcon = (code: string) => {
    switch (code) {
      case 'ISLAMIC':
        return BookOpen;
      case 'SCHOOL':
        return GraduationCap;
      case 'PROGRAMS':
        return Trophy;
      case 'CREATIVE_HUB':
        return Sparkles;
      case 'LITERARY':
        return Feather;
      case 'LIBRARY':
      case 'KUTHBKHANA':
        return Library;
      default:
        return Layers;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Loading Student Portal & Financial Ledger...
        </p>
      </div>
    );
  }

  const student = data?.student;
  const wallet = data?.wallet || { balance: 0, totalEarnings: 0, totalTransferred: 0, totalReceived: 0 };
  const storeFund = data?.storeFund || { totalContributed: 0, totalUsed: 0, availableFund: 0 };
  const categories = data?.categoryEarnings || [];
  const transactions = data?.recentTransactions || [];

  const selectedRecipientObj = recipientsList.find((r) => r.id === selectedRecipientId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-gold-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white p-1.5 shadow-md flex items-center justify-center">
            <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center space-x-2">
              <span>Madin SPR</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30">
                Student Portal
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {student?.fullName} ({student?.sprStudentId}) • {student?.className} ({student?.division})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => router.push('/student/tasks')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 text-xs font-bold transition-colors"
            title="View Available Tasks"
          >
            <CheckSquare className="w-3.5 h-3.5 text-gold-400" />
            <span>Tasks</span>
          </button>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Refresh Balances"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-gold-400' : ''}`} />
          </button>
          <button
            onClick={() => setPwdModalOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            title="Change Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-lg ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial Highlights Hero */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Current Wallet Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Spendable
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Current Wallet Balance
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{wallet.balance.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 flex items-center space-x-2 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setTransferType('STUDENT');
                  setTransferStep('INPUT');
                  setTransferModalOpen(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md hover:shadow-lg transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
              <button
                onClick={() => router.push('/student/tasks')}
                className="py-2 px-3 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 font-bold text-xs flex items-center space-x-1.5 border border-gold-500/30 transition-all shadow-sm"
                title="Open Tasks module to earn points and money"
              >
                <PlusCircle className="w-3.5 h-3.5 text-gold-400" />
                <span>Add (Tasks)</span>
              </button>
            </div>
          </div>

          {/* 2. Total Earnings Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gold-950/40 via-slate-900 to-slate-900 border border-gold-500/30 p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gold-500/20 text-gold-300 border border-gold-500/30">
                Cumulative
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Lifetime Earnings
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{wallet.totalEarnings.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Transferred Out: ₹{wallet.totalTransferred.toFixed(2)}</span>
              <span>Received: ₹{wallet.totalReceived.toFixed(2)}</span>
            </div>
          </div>

          {/* 3. Available Store Fund Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 p-6 shadow-2xl backdrop-blur-xl sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Store className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Store Account
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Available Store Fund
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{storeFund.availableFund.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Contributed: ₹{storeFund.totalContributed.toFixed(2)}</span>
              <span>Used: ₹{storeFund.totalUsed.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Category-Wise Earnings Section */}
        <div className="bg-slate-900/80 rounded-3xl border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Award className="w-4 h-4 text-gold-400" />
                <span>Category-Wise SPR Earnings</span>
              </h3>
              <p className="text-xs text-slate-400">
                Formula: (Eligible Points / 10) × Category Multiplier. Only activities meeting institutional date eligibility are monetized.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categories.map((c: any) => {
              const Icon = getCategoryIcon(c.categoryCode);
              return (
                <div
                  key={c.categoryId}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-gold-500/30 hover:bg-white/[0.07] transition-all flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-gold-400 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{c.categoryName}</h4>
                      <p className="text-[11px] text-slate-400">
                        {c.eligiblePoints} pts • ×{c.multiplier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400">
                      ₹{c.earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-slate-900/80 rounded-3xl border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Personal Transaction History</span>
            </h3>
            <span className="text-xs text-slate-400">
              {transactions.length} record(s)
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              No transactions recorded yet. Eligible activities and peer transfers will show here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pr-4">Reference</th>
                    <th className="pb-3 pr-4">Type</th>
                    <th className="pb-3 pr-4">Description</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Balance After</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {transactions.map((t: any) => {
                    const isCredit =
                      t.type === 'EARNING' ||
                      t.type === 'TRANSFER_RECEIVED' ||
                      (t.type === 'ADJUSTMENT' && t.amount > 0);
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-4 font-mono text-[11px] text-slate-400">
                          {t.reference}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCredit
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 border border-white/10'
                            }`}
                          >
                            {t.type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-slate-200 max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="py-3 pr-4 font-black">
                          <span className={isCredit ? 'text-emerald-400' : 'text-slate-300'}>
                            {isCredit ? '+' : '-'}₹{Math.abs(t.amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-semibold text-slate-400">
                          ₹{t.balanceAfter.toFixed(2)}
                        </td>
                        <td className="py-3 text-slate-400 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Share / Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Send className="w-4 h-4 text-gold-400" />
                <span>Share / Transfer Funds</span>
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-950 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setTransferType('STUDENT');
                  setTransferStep('INPUT');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  transferType === 'STUDENT'
                    ? 'bg-madin-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Transfer to Student
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransferType('STORE');
                  setTransferStep('INPUT');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  transferType === 'STORE'
                    ? 'bg-madin-900 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Share to Store
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {transferError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-semibold">{transferError}</span>
                </div>
              )}

              {transferStep === 'INPUT' ? (
                <>
                  {transferType === 'STUDENT' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Select Recipient Student</span>
                        {selectedRecipientObj && (
                          <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </span>
                        )}
                      </label>

                      {selectedRecipientObj ? (
                        <div className="p-3 bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl flex items-center justify-between shadow-xs">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                              <Check className="w-5 h-5 text-slate-950" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-white flex items-center space-x-2 truncate">
                                <span className="truncate">{selectedRecipientObj.fullName}</span>
                                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                                  {selectedRecipientObj.sprStudentId || 'No ID'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Class: {selectedRecipientObj.className} {selectedRecipientObj.division ? `(${selectedRecipientObj.division})` : ''}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecipientId('');
                              setTransferError('');
                            }}
                            className="text-xs text-slate-300 hover:text-white font-semibold px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 transition-colors shrink-0 ml-2"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search student by name or SPR ID (e.g. MT or SPR0122)..."
                              value={recipientSearch}
                              onChange={(e) => setRecipientSearch(e.target.value)}
                              className="block w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-white/10 rounded-xl p-1.5 bg-slate-950/60">
                            {recipientsList.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-500">
                                No matching students found{recipientSearch ? ` for "${recipientSearch}"` : ''}.
                              </div>
                            ) : (
                              recipientsList.map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecipientId(r.id);
                                    setTransferError('');
                                  }}
                                  className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:border-gold-500/50 hover:bg-gold-500/10 bg-slate-900/90 transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                                >
                                  <div className="pr-2 truncate">
                                    <div className="text-xs font-bold text-white group-hover:text-gold-300 transition-colors truncate">
                                      {r.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      {r.className} {r.division ? `(${r.division})` : ''}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span className="font-mono text-[10px] font-bold text-slate-300 bg-slate-800 border border-white/10 px-2 py-0.5 rounded">
                                      {r.sprStudentId || 'No ID'}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-950 bg-gold-500 group-hover:bg-gold-400 px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 shadow-sm">
                                      <span>Select</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </span>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {transferType === 'STORE' && (
                    <div className="p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200">
                      <p className="font-semibold flex items-center space-x-1.5">
                        <Store className="w-4 h-4 text-blue-400" />
                        <span>Madin School Store</span>
                      </p>
                      <p className="mt-1 text-[11px] text-blue-300/80">
                        Funds shared to Store will be credited to your School Store account and can be utilized during store purchases.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Amount (₹)</span>
                      <span className="text-slate-400 lowercase">
                        Available: ₹{wallet.balance.toFixed(2)}
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={wallet.balance}
                      required
                      placeholder="e.g. 15.00"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Remarks / Purpose (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stationery, Book share, Gift"
                      value={transferRemarks}
                      onChange={(e) => setTransferRemarks(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                </>
              ) : (
                /* Confirmation Screen */
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-3 text-xs">
                  <h4 className="font-bold text-white text-sm">Please Confirm Transaction</h4>
                  <div className="space-y-1.5 text-slate-300">
                    <p>
                      <span className="text-slate-400">Destination:</span>{' '}
                      <span className="font-semibold text-white">
                        {transferType === 'STUDENT'
                          ? `${selectedRecipientObj?.fullName} (${selectedRecipientObj?.sprStudentId})`
                          : 'School Store Fund'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Transfer Amount:</span>{' '}
                      <span className="font-black text-emerald-400 text-sm">
                        ₹{parseFloat(transferAmount).toFixed(2)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Wallet Balance After:</span>{' '}
                      <span className="font-semibold text-white">
                        ₹{(wallet.balance - parseFloat(transferAmount)).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                {transferStep === 'CONFIRM' && (
                  <button
                    type="button"
                    onClick={() => setTransferStep('INPUT')}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-all"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-black text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  {transferLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <span>
                      {transferStep === 'INPUT' ? 'Review Transfer' : 'Confirm & Send Funds'}
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Add Funds Institutional Info Modal */}
      {addFundsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-gold-400" />
                <span>Add Wallet Funds</span>
              </h3>
              <button onClick={() => setAddFundsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-gold-500/10 border border-gold-500/30 text-gold-300">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-gold-400" />
                  <span>Merit-Based Academic Rewards</span>
                </p>
                <p className="mt-1 text-[11px] text-gold-200/90">
                  SPR Student Wallets are directly earned through your academic, co-curricular, and literary achievements. Every 10 points convert into reward funds based on category multipliers.
                </p>
              </div>
              <p>
                For authorized institutional top-ups, scholarship disbursements, or approved manual funding, please contact the SPR Administrative Office or your Class Advisor.
              </p>
            </div>
            <button
              onClick={() => setAddFundsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* 3. Change Password Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-gold-400" />
                <span>Change Account Password</span>
              </h3>
              {!student?.mustChangePassword && (
                <button onClick={() => setPwdModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {student?.mustChangePassword && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                Your account password was reset by the administrator. Please establish your own new private password to continue.
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {!student?.mustChangePassword && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                {!student?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => setPwdModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-600 text-slate-950 font-black text-xs shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-1"
                >
                  {pwdLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
