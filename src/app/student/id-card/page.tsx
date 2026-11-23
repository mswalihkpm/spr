'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  QrCode,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Download,
  Printer,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import DigitalStudentIdCard, { IdCardData } from '@/components/id-card/DigitalStudentIdCard';

export default function StudentIdCardPage() {
  const router = useRouter();
  const [data, setData] = useState<IdCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchIdCardData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setErrorMsg('');

      const res = await fetch('/api/student/id-card');
      if (res.status === 401 || res.status === 403) {
        router.push('/student/login');
        return;
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load Student ID card.');

      setData(json.idCard);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error generating Digital ID Card.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIdCardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <VideoLoader
          size="xl"
          text="Generating Digital Student ID Card..."
          subtext="Encoding secure QR identity and pulling institutional records"
          showProgress={true}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-4xl w-full max-w-full overflow-x-hidden min-w-0 mx-auto space-y-5 sm:space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/student/settings"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Settings</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-sky-600" />
            <span>Official Credential</span>
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-600 via-blue-700 to-slate-900 rounded-3xl p-6 text-white shadow-xl space-y-2">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
            Smart ID Card
          </span>
          <span className="text-xs text-sky-200 font-medium font-mono">SPR Verification Engine</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white">
          Digital Student ID &amp; Wallet QR
        </h1>
        <p className="text-xs text-sky-100 max-w-xl leading-relaxed">
          Your official horizontal institutional credential with secure opaque QR code. Authorized store admins can scan your QR code to view your wallet balance and active transactions.
        </p>
      </div>

      {errorMsg ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      ) : data ? (
        <DigitalStudentIdCard data={data} onRefresh={() => fetchIdCardData(true)} refreshing={refreshing} />
      ) : null}
    </div>
  );
}
