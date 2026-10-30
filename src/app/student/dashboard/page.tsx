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
  Check,
  ArrowRight,
  CheckSquare,
  LayoutDashboard,
  ExternalLink,
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

      const amt = parseFloat(transferAmount);
      if (isNaN(amt) || amt <= 0) {
        setTransferError('Please enter a valid positive amount.');
        return;
      }

      if (amt > (data?.wallet?.balance || 0)) {
        setTransferError(`Insufficient balance. You only have ₹${data?.wallet?.balance?.toFixed(2)}.`);
        return;
      }

      setTransferStep('CONFIRM');
      return;
    }

    // Step === CONFIRM
    try {
      setTransferLoading(true);
      const res = await fetch('/api/student/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transferType,
          recipientId: transferType === 'STUDENT' ? selectedRecipientId : undefined,
          amount: parseFloat(transferAmount),
          remarks: transferRemarks,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transfer failed.');

      setStatusMsg({
        type: 'success',
        text: `Successfully transferred ₹${parseFloat(transferAmount).toFixed(2)}! Ref: ${json.reference}`,
      });
      setTransferModalOpen(false);
      setTransferAmount('');
      setTransferRemarks('');
      setSelectedRecipientId('');
      setTransferStep('INPUT');

      fetchDashboardData(true);
    } catch (err: any) {
      setTransferError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setTransferLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setStatusMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    try {
      setPwdLoading(true);
      const res = await fetch('/api/student/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: student?.mustChangePassword ? undefined : currentPassword,
          newPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update password.');

      setStatusMsg({ type: 'success', text: 'Password successfully updated!' });
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
      case 'TASKS':
        return CheckSquare;
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

  const getCategoryTheme = (code: string) => {
    switch (code) {
      case 'TASKS':
        return {
          bg: 'bg-amber-100 text-amber-700 border-amber-200',
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      case 'ISLAMIC':
        return {
          bg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
      case 'SCHOOL':
        return {
          bg: 'bg-blue-100 text-blue-700 border-blue-200',
          badge: 'bg-blue-50 text-blue-800 border-blue-200',
        };
      case 'PROGRAMS':
        return {
          bg: 'bg-purple-100 text-purple-700 border-purple-200',
          badge: 'bg-purple-50 text-purple-800 border-purple-200',
        };
      case 'CREATIVE_HUB':
        return {
          bg: 'bg-pink-100 text-pink-700 border-pink-200',
          badge: 'bg-pink-50 text-pink-800 border-pink-200',
        };
      case 'LITERARY':
        return {
          bg: 'bg-orange-100 text-orange-700 border-orange-200',
          badge: 'bg-orange-50 text-orange-800 border-orange-200',
        };
      case 'LIBRARY':
      case 'KUTHBKHANA':
        return {
          bg: 'bg-teal-100 text-teal-700 border-teal-200',
          badge: 'bg-teal-50 text-teal-800 border-teal-200',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          badge: 'bg-slate-50 text-slate-800 border-slate-200',
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center text-slate-800">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wide text-slate-600">
          Loading Student Portal &amp; Balances...
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
  const dossierHref = `/student/${student?.sprStudentId || student?.studentId}`;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-white pb-[calc(max(env(safe-area-inset-bottom,0px),0.75rem)+5rem)] sm:pb-12">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-3.5 sm:px-8 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-slate-900 p-1.5 shadow-md flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight flex items-center space-x-1.5 sm:space-x-2">
              <span className="truncate">Madin SPR</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                Student
              </span>
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-none">
              {student?.fullName} ({student?.sprStudentId})
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          {/* Quick Tasks Link */}
          <button
            onClick={() => router.push('/student/tasks')}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 min-h-touch rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Earn points & rewards in Tasks"
          >
            <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Tasks</span>
          </button>

          {/* Quick Dossier Link */}
          <button
            onClick={() => router.push(dossierHref)}
            className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-touch rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            title="Open official SPR Dossier"
          >
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>My Dossier</span>
          </button>

          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="p-2 min-h-touch min-w-touch rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            title="Refresh Balances"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>

          <button
            onClick={() => setPwdModalOpen(true)}
            className="p-2 min-h-touch min-w-touch rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            title="Change Password"
          >
            <KeyRound className="w-4 h-4" />
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 min-h-touch rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">
        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-sm animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
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
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial Highlights Hero Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Spendable Wallet Balance Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white p-5 sm:p-6 shadow-lg shadow-emerald-700/15">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-emerald-100 border border-white/25">
                Spendable
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
                Current Wallet Balance
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{wallet.balance.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 flex items-center space-x-2 pt-4 border-t border-white/15">
              <button
                onClick={() => {
                  setTransferType('STUDENT');
                  setTransferStep('INPUT');
                  setTransferModalOpen(true);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-black text-xs flex items-center justify-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-700" />
                <span>Share Funds</span>
              </button>
              <button
                onClick={() => router.push('/student/tasks')}
                className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center space-x-1.5 border border-white/25 transition-all shadow-2xs cursor-pointer"
                title="Earn points and monetary rewards in Tasks"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>Earn (Tasks)</span>
              </button>
            </div>
          </div>

          {/* 2. Total Lifetime Earnings Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white p-5 sm:p-6 shadow-lg shadow-amber-600/15">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-amber-100 border border-white/25">
                Cumulative
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-amber-100 uppercase tracking-wider">
                Total Lifetime Earnings
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{wallet.totalEarnings.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-amber-100 font-medium">
              <span>Transferred: ₹{wallet.totalTransferred.toFixed(2)}</span>
              <span>Received: ₹{wallet.totalReceived.toFixed(2)}</span>
            </div>
          </div>

          {/* 3. School Store Fund Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white p-5 sm:p-6 shadow-lg shadow-indigo-600/15 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
                <Store className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-indigo-100 border border-white/25">
                Store Account
              </span>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">
                Available Store Fund
              </p>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                ₹{storeFund.availableFund.toFixed(2)}
              </h2>
            </div>
            <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100 font-medium">
              <span>Contributed: ₹{storeFund.totalContributed.toFixed(2)}</span>
              <span>Used: ₹{storeFund.totalUsed.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Quick Link Card: Dossier & Tasks Inspection */}
        <div className="rounded-3xl bg-white border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0 shadow-2xs">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Official Student SPR Dossier
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect your complete academic scorecard, rankings, and itemized task points awarded.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push(dossierHref)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Open My Dossier</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </button>
            <button
              onClick={() => router.push('/student/tasks')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Available Tasks</span>
            </button>
          </div>
        </div>

        {/* Category-Wise Earnings Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-600" />
                <span>Category-Wise SPR Earnings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Formula: (Eligible Points / 10) × Multiplier. Only activities meeting institutional guidelines are monetized.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {categories.length} Categories Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((c: any) => {
              const Icon = getCategoryIcon(c.categoryCode);
              const theme = getCategoryTheme(c.categoryCode);
              return (
                <div
                  key={c.categoryId || c.categoryCode}
                  onClick={() => {
                    if (c.categoryCode === 'TASKS') {
                      router.push('/student/tasks');
                    } else {
                      router.push(dossierHref);
                    }
                  }}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-amber-300 hover:shadow-xs transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${theme.bg}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors truncate">
                        {c.categoryName}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                        {c.eligiblePoints} pts • ×{c.multiplier}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-emerald-700">
                      ₹{c.earnings.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-500" />
              <span>Personal Transaction History</span>
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              {transactions.length} record(s)
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No transactions recorded yet. Eligible activities and peer transfers will show here.
            </div>
          ) : (
            <>
              {/* Mobile View: Clean Card List */}
              <div className="sm:hidden space-y-2.5">
                {transactions.map((t: any) => {
                  const isCredit =
                    t.type === 'EARNING' ||
                    t.type === 'TRANSFER_RECEIVED' ||
                    (t.type === 'ADJUSTMENT' && t.amount > 0);
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCredit
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {t.type.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-sm font-black font-mono ${
                            isCredit ? 'text-emerald-700' : 'text-slate-800'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₹{Math.abs(t.amount).toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium leading-relaxed">
                        {t.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60 font-mono">
                        <span>Ref: {t.reference}</span>
                        <span>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop View: Full Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="pb-3 pr-4">Reference</th>
                      <th className="pb-3 pr-4">Type</th>
                      <th className="pb-3 pr-4">Description</th>
                      <th className="pb-3 pr-4">Amount</th>
                      <th className="pb-3 pr-4">Balance After</th>
                      <th className="pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((t: any) => {
                      const isCredit =
                        t.type === 'EARNING' ||
                        t.type === 'TRANSFER_RECEIVED' ||
                        (t.type === 'ADJUSTMENT' && t.amount > 0);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 pr-4 font-mono text-[11px] text-slate-500 font-semibold">
                            {t.reference}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isCredit
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {t.type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-slate-800 font-medium max-w-xs truncate">
                            {t.description}
                          </td>
                          <td className="py-3 pr-4 font-black">
                            <span className={isCredit ? 'text-emerald-700' : 'text-slate-800'}>
                              {isCredit ? '+' : '-'}₹{Math.abs(t.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-semibold text-slate-600 font-mono">
                            ₹{t.balanceAfter.toFixed(2)}
                          </td>
                          <td className="py-3 text-slate-500 whitespace-nowrap">
                            {new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>

      {/* ================= MODALS ================= */}

      {/* 1. Share / Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>Share / Transfer Funds</span>
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setTransferType('STUDENT');
                  setTransferStep('INPUT');
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  transferType === 'STUDENT'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Share to Store
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {transferError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{transferError}</span>
                </div>
              )}

              {transferStep === 'INPUT' ? (
                <>
                  {transferType === 'STUDENT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Select Recipient Student</span>
                        {selectedRecipientObj && (
                          <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </span>
                        )}
                      </label>

                      {selectedRecipientObj ? (
                        <div className="p-3 bg-emerald-50/80 border-2 border-emerald-500 rounded-2xl flex items-center justify-between shadow-2xs">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                              <Check className="w-5 h-5" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-bold text-slate-900 flex items-center space-x-2 truncate">
                                <span className="truncate">{selectedRecipientObj.fullName}</span>
                                <span className="bg-emerald-100 text-emerald-800 font-mono text-[10px] px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                  {selectedRecipientObj.sprStudentId || 'No ID'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
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
                            className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors shrink-0 ml-2 cursor-pointer"
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
                              className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-1.5 bg-slate-50">
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
                                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 bg-white transition-all flex items-center justify-between group shadow-2xs cursor-pointer"
                                >
                                  <div className="pr-2 truncate">
                                    <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                                      {r.fullName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                      {r.className} {r.division ? `(${r.division})` : ''}
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                      {r.sprStudentId || 'No ID'}
                                    </span>
                                    <span className="text-[11px] font-bold text-white bg-emerald-600 group-hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 shadow-2xs">
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
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                      <p className="font-bold flex items-center space-x-1.5">
                        <Store className="w-4 h-4 text-blue-600" />
                        <span>Madin School Store</span>
                      </p>
                      <p className="mt-1 text-[11px] text-blue-700">
                        Funds shared to Store will be credited to your School Store account and can be utilized during store purchases.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Amount (₹)</span>
                      <span className="text-slate-500 font-semibold font-mono">
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
                      className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Remarks / Purpose (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stationery, Book share, Gift"
                      value={transferRemarks}
                      onChange={(e) => setTransferRemarks(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              ) : (
                /* Confirmation Screen */
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <h4 className="font-black text-slate-900 text-sm">Please Confirm Transaction</h4>
                  <div className="space-y-1.5 text-slate-700">
                    <p>
                      <span className="text-slate-500">Destination:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {transferType === 'STUDENT'
                          ? `${selectedRecipientObj?.fullName} (${selectedRecipientObj?.sprStudentId})`
                          : 'School Store Fund'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Transfer Amount:</span>{' '}
                      <span className="font-black text-emerald-700 text-sm font-mono">
                        ₹{parseFloat(transferAmount).toFixed(2)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-500">Wallet Balance After:</span>{' '}
                      <span className="font-bold text-slate-900 font-mono">
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
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  {transferLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>Add Wallet Funds</span>
              </h3>
              <button onClick={() => setAddFundsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Merit-Based Academic Rewards</span>
                </p>
                <p className="mt-1 text-[11px] text-amber-800">
                  SPR Student Wallets are directly earned through your academic, co-curricular, and literary achievements. Every 10 points convert into reward funds based on category multipliers.
                </p>
              </div>
              <p>
                For authorized institutional top-ups, scholarship disbursements, or approved manual funding, please contact the SPR Administrative Office or your Class Advisor.
              </p>
            </div>
            <button
              onClick={() => setAddFundsModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* 3. Change Password Modal */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Change Account Password</span>
              </h3>
              {!student?.mustChangePassword && (
                <button onClick={() => setPwdModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {student?.mustChangePassword && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                Your account password was reset by the administrator. Please establish your own new private password to continue.
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {!student?.mustChangePassword && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                {!student?.mustChangePassword && (
                  <button
                    type="button"
                    onClick={() => setPwdModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center space-x-1 cursor-pointer"
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

      {/* ========================================================================= */}
      {/* Mobile Sticky Bottom Navigation Bar                                       */}
      {/* ========================================================================= */}
      <nav className="sm:hidden fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] inset-x-3 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-2xl p-1.5 flex justify-around items-center z-40 shadow-xl">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-2 text-amber-600 font-black text-[10px] cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => router.push('/student/tasks')}
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-2 text-slate-500 hover:text-slate-900 text-[10px] font-bold cursor-pointer"
        >
          <CheckSquare className="w-4 h-4 mb-0.5" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => router.push(dossierHref)}
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-2 text-slate-500 hover:text-slate-900 text-[10px] font-bold cursor-pointer"
        >
          <Award className="w-4 h-4 mb-0.5" />
          <span>My Dossier</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 min-h-[44px] py-1 px-2 text-rose-500 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
        >
          <LogOut className="w-4 h-4 mb-0.5" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}
