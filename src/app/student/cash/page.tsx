'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  TrendingUp,
  Send,
  Store,
  RefreshCw,
  Award,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  BookOpen,
  GraduationCap,
  Sparkles,
  Feather,
  Trophy,
  CheckSquare,
  Coins,
  Search,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function StudentCashPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Transfer modal states
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

  const fetchCashData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/student/auth/me');
      if (res.status === 401 || res.status === 403) {
        router.push('/student/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load cash account');
      setData(json);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error fetching wallet' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCashData();
  }, []);

  // Fetch recipients for student-to-student transfer
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

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    const amt = parseFloat(transferAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      setTransferError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (transferType === 'STUDENT' && !selectedRecipientId) {
      setTransferError('Please select a recipient student.');
      return;
    }

    if (transferStep === 'INPUT') {
      setTransferStep('CONFIRM');
      return;
    }

    try {
      setTransferLoading(true);
      const res = await fetch('/api/student/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transferType,
          recipientId: selectedRecipientId,
          amount: amt,
          remarks: transferRemarks,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Transfer failed.');

      setStatusMsg({
        type: 'success',
        text: `Successfully transferred ₹${amt.toFixed(2)} ${
          transferType === 'STUDENT' ? 'to peer student' : 'to school store account'
        }!`,
      });
      setTransferModalOpen(false);
      setTransferAmount('');
      setTransferRemarks('');
      setSelectedRecipientId('');
      setTransferStep('INPUT');
      fetchCashData(true);
    } catch (err: any) {
      setTransferError(err.message || 'Error executing transfer.');
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <VideoLoader
          size="xl"
          text="Loading Student Cash Account & Wallet..."
          subtext="Accessing SPR Automated Ledger & Earnings"
          showProgress={true}
        />
      </div>
    );
  }

  const wallet = data.wallet || { balance: 0, totalEarnings: 0, totalTransferred: 0, totalReceived: 0 };
  const storeFund = data.storeFund || { availableFund: 0, totalContributed: 0, totalUsed: 0 };
  const categories = data.categoryEarnings || [];
  const transactions = data.transactions || [];

  const getCategoryTheme = (code: string) => {
    switch (code) {
      case 'ISLAMIC':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: BookOpen };
      case 'SCHOOL':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: GraduationCap };
      case 'QUALIFICATION':
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Award };
      case 'CREATIVE_HUB':
        return { bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Sparkles };
      case 'KUTHBKHANA':
      case 'LIBRARY':
        return { bg: 'bg-teal-50 text-teal-700 border-teal-200', icon: BookOpen };
      case 'LITERARY':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Feather };
      case 'PROGRAMS':
      case 'COMPETITIONS':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', icon: Trophy };
      case 'TASKS':
        return { bg: 'bg-sky-50 text-sky-700 border-sky-200', icon: CheckSquare };
      case 'FIELD_COLLECTION':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Coins };
      default:
        return { bg: 'bg-slate-50 text-slate-700 border-slate-200', icon: Award };
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-emerald-600" />
            <span>Student Cash &amp; Wallet Account</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your spendable wallet, peer-to-peer transfers, and institutional category monetization.
          </p>
        </div>

        <button
          onClick={() => fetchCashData(true)}
          disabled={refreshing}
          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition"
          title="Refresh balances"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
        </button>
      </div>

      {/* Status Alerts */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center space-x-2">
            {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3 Core Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 1. Spendable Wallet Balance */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-800 text-white p-5 shadow-lg shadow-emerald-700/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-emerald-100 border border-white/20">
                Spendable
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs text-emerald-100 uppercase tracking-wider font-semibold">
                Current Wallet Balance
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-0.5 font-mono">
                ₹{wallet.balance.toFixed(2)}
              </h2>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15 flex items-center space-x-2">
            <button
              onClick={() => {
                setTransferType('STUDENT');
                setTransferStep('INPUT');
                setTransferModalOpen(true);
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-emerald-900 font-black text-xs flex items-center justify-center space-x-1.5 shadow transition"
            >
              <Send className="w-3.5 h-3.5 text-emerald-700" />
              <span>Share Funds</span>
            </button>
            <button
              onClick={() => router.push('/student/tasks')}
              className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center space-x-1 border border-white/20 transition"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-300" />
              <span>Tasks</span>
            </button>
          </div>
        </div>

        {/* 2. Lifetime Earnings */}
        <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 text-white p-5 shadow-lg shadow-amber-600/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-amber-100 border border-white/20">
                Cumulative
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs text-amber-100 uppercase tracking-wider font-semibold">
                Total Lifetime Earnings
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-0.5 font-mono">
                ₹{wallet.totalEarnings.toFixed(2)}
              </h2>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15 flex items-center justify-between text-xs text-amber-100 font-medium">
            <span>Transferred: ₹{wallet.totalTransferred.toFixed(2)}</span>
            <span>Received: ₹{wallet.totalReceived.toFixed(2)}</span>
          </div>
        </div>

        {/* 3. School Store Fund */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 text-white p-5 shadow-lg shadow-indigo-600/15 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-indigo-100 border border-white/20">
                Store Account
              </span>
            </div>
            <div className="mt-4">
              <span className="text-xs text-indigo-100 uppercase tracking-wider font-semibold">
                Available Store Fund
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-0.5 font-mono">
                ₹{storeFund.availableFund.toFixed(2)}
              </h2>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/15 space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-100 font-medium">
              <span>Contributed: ₹{storeFund.totalContributed.toFixed(2)}</span>
              <span>Used: ₹{storeFund.totalUsed.toFixed(2)}</span>
            </div>
            <button
              onClick={() => {
                setTransferType('STORE');
                setTransferStep('INPUT');
                setTransferModalOpen(true);
              }}
              className="w-full py-1.5 px-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center space-x-1.5 border border-white/20 transition"
            >
              <Store className="w-3.5 h-3.5 text-indigo-200" />
              <span>Transfer Cash to Store</span>
            </button>
          </div>
        </div>
      </div>

      {/* Category-Wise SPR Earnings (EXACT MATCH TO IMAGE 3) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-600" />
              <span>Category-Wise SPR Earnings</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Formula: (Eligible Points / 10) × Multiplier. Only activities meeting institutional guidelines are monetized.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {categories.length} Categories Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c: any) => {
            const { bg, icon: Icon } = getCategoryTheme(c.categoryCode);
            return (
              <div
                key={c.categoryId || c.categoryCode}
                className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 hover:bg-white dark:hover:bg-slate-800 transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs ${bg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {c.categoryName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {c.eligiblePoints} pts • ×{c.multiplier}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                    ₹{c.earnings.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
          <History className="w-4 h-4 text-blue-600" />
          <span>Wallet Transaction History</span>
        </h3>

        {transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No transactions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 block">{tx.description}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(tx.createdAt).toLocaleDateString()} • Ref: {tx.reference}
                  </span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-black font-mono ${
                      Number(tx.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {Number(tx.amount) >= 0 ? '+' : ''}₹{Math.abs(Number(tx.amount)).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Bal: ₹{Number(tx.balanceAfter).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                {transferType === 'STUDENT' ? <Send className="w-4 h-4 text-emerald-600" /> : <Store className="w-4 h-4 text-indigo-600" />}
                <span>{transferType === 'STUDENT' ? 'Student-to-Student Transfer' : 'Transfer to Store Account'}</span>
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {transferError}
              </div>
            )}

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              {transferStep === 'INPUT' ? (
                <>
                  {transferType === 'STUDENT' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Select Recipient Student
                      </label>
                      <input
                        type="text"
                        placeholder="Search student by name or SPR ID..."
                        value={recipientSearch}
                        onChange={(e) => setRecipientSearch(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs mb-2"
                      />
                      <select
                        value={selectedRecipientId}
                        onChange={(e) => setSelectedRecipientId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                      >
                        <option value="">-- Choose recipient student --</option>
                        {recipientsList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.fullName} ({r.sprStudentId || 'SPR ID'} • {r.className})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Transfer Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={wallet.balance}
                      placeholder={`Max ₹${wallet.balance.toFixed(2)}`}
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Remarks / Purpose
                    </label>
                    <input
                      type="text"
                      placeholder="Optional remark..."
                      value={transferRemarks}
                      onChange={(e) => setTransferRemarks(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </>
              ) : (
                /* CONFIRM STEP */
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200">
                    Confirm Transfer
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    You are transferring <strong className="font-mono text-emerald-700">₹{parseFloat(transferAmount).toFixed(2)}</strong> from your wallet.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    This action is permanent and atomic. Balance will be updated instantly.
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-2">
                {transferStep === 'CONFIRM' && (
                  <button
                    type="button"
                    onClick={() => setTransferStep('INPUT')}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {transferLoading ? 'Processing...' : transferStep === 'INPUT' ? 'Review Transfer' : 'Confirm & Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
