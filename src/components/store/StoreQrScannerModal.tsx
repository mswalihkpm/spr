'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Search,
  Wallet,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  QrCode,
  ShieldCheck,
  User,
  GraduationCap,
  Calendar,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  History,
  FlipHorizontal,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import StudentAvatar from '@/components/ui/StudentAvatar';

interface StoreQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StoreQrScannerModal({ isOpen, onClose }: StoreQrScannerModalProps) {
  const [activeTab, setActiveTab] = useState<'CAMERA' | 'MANUAL'>('CAMERA');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualSprId, setManualSprId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Scanned result state
  const [scannedResult, setScannedResult] = useState<{
    student: any;
    wallet: any;
    transactions: any[];
    scannedAt?: string;
  } | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'spr-store-qr-reader';

  // Cleanup scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop error (ignored):', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  // Start Camera Scanner
  const startScanner = async () => {
    await stopScanner();
    setCameraError(null);
    setErrorMsg(null);

    // Wait for DOM node to render
    setTimeout(async () => {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      try {
        const qrScanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        };

        await qrScanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          () => {
            // Frame decode errors are normal between QR frames
          }
        );

        setScanning(true);
      } catch (err: any) {
        console.error('Camera start error:', err);
        setCameraError(
          err.message ||
            'Unable to access camera. Please allow camera permissions or use the manual SPR ID search.'
        );
        setScanning(false);
      }
    }, 150);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'CAMERA' && !scannedResult) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab, scannedResult]);

  // Handle scanned QR payload
  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    fetchStudentAndWallet({ qrToken: decodedText });
  };

  // Handle manual SPR ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSprId.trim()) return;
    fetchStudentAndWallet({ sprStudentId: manualSprId.trim() });
  };

  // Server verification
  const fetchStudentAndWallet = async (payload: { qrToken?: string; sprStudentId?: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/store/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to verify QR code.');
      }

      setScannedResult({
        student: json.student,
        wallet: json.wallet,
        transactions: json.transactions || [],
        scannedAt: json.scannedAt,
      });
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMsg(err.message || 'Error resolving student wallet details.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNextScan = () => {
    setScannedResult(null);
    setErrorMsg(null);
    setManualSprId('');
    if (activeTab === 'CAMERA') {
      startScanner();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Store Admin QR Scanner
              </h2>
              <p className="text-[11px] text-slate-500">
                Scan Digital ID card to view student digital wallet details
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            STATE 1: STUDENT & WALLET VIEWING INTERFACE (READ-ONLY)
            ========================================================================= */}
        {scannedResult ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Student Profile Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800/80 dark:to-blue-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5 min-w-0">
                <StudentAvatar
                  photoUrl={scannedResult.student.photoUrl}
                  name={scannedResult.student.fullName}
                  size="xl"
                  studentId={scannedResult.student.sprStudentId}
                  className="w-14 h-14 ring-4 ring-sky-500/20 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-slate-900 text-sky-300">
                      {scannedResult.student.sprStudentId}
                    </span>
                    <span className="text-[10.5px] font-bold text-sky-700 dark:text-sky-300">
                      Class: {scannedResult.student.className} ({scannedResult.student.division})
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                    {scannedResult.student.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Session: {scannedResult.student.academicYear} • Verified Digital Identity
                  </p>
                </div>
              </div>

              <span className="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </span>
            </div>

            {/* Authoritative Wallet Balance Display */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-sky-200 uppercase tracking-wider">
                    Available Digital Wallet Balance
                  </span>
                </div>
                {scannedResult.wallet?.isActivated ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active Wallet
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Wallet Not Yet Activated
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  ₹{Number(scannedResult.wallet?.availableBalance || 0).toFixed(2)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Read-only view • Authoritative real-time balance from institutional database
                </p>
              </div>

              {/* Financial Metrics Summary */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10 text-xs">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                  <div className="flex items-center space-x-1 text-slate-400 text-[10.5px]">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span>Total Credited / Earned</span>
                  </div>
                  <div className="font-mono font-bold text-emerald-300 text-sm">
                    ₹{Number(scannedResult.wallet?.totalCredited || 0).toFixed(2)}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                  <div className="flex items-center space-x-1 text-slate-400 text-[10.5px]">
                    <TrendingDown className="w-3 h-3 text-rose-400" />
                    <span>Total Spent / Debited</span>
                  </div>
                  <div className="font-mono font-bold text-rose-300 text-sm">
                    ₹{Number(scannedResult.wallet?.totalSpent || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Restriction Disclaimer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex items-start space-x-2.5 text-xs text-slate-600 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Read-Only Inspection Mode:</strong> Store Admin wallet access is strictly non-modifying. Product purchasing, wallet balance alterations, and debit deductions are restricted from this viewer.
              </p>
            </div>

            {/* Recent Transactions List */}
            {scannedResult.transactions?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center space-x-1">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recent Wallet Transactions</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last {scannedResult.transactions.length}
                  </span>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {scannedResult.transactions.map((tx: any) => (
                    <div key={tx.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-[9.5px] text-slate-400 font-mono">
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })} • Ref: {tx.reference}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold text-xs ${
                            tx.type === 'EARNING' || tx.type === 'TRANSFER_RECEIVED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tx.type === 'EARNING' || tx.type === 'TRANSFER_RECEIVED' ? '+' : '-'}₹
                          {Number(tx.amount).toFixed(2)}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono">Bal: ₹{Number(tx.balanceAfter).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Scan Next Student */}
            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetForNextScan}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Another Student</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
             STATE 2: SCANNER CAMERA & MANUAL INPUT TABS
             ========================================================================= */
          <div className="space-y-4">
            {/* Tab switch */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('CAMERA');
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'CAMERA'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('MANUAL');
                  stopScanner();
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                  activeTab === 'MANUAL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Manual SPR ID Search</span>
              </button>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-200 font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Loading Indicator */}
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Verifying student credential &amp; loading wallet...
                </p>
              </div>
            )}

            {/* Tab 1: Live Camera Scanner */}
            {!loading && activeTab === 'CAMERA' && (
              <div className="space-y-3">
                <div className="relative rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 aspect-[4/3] flex items-center justify-center">
                  <div id={scannerContainerId} className="w-full h-full" />

                  {cameraError && (
                    <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-950/90 text-white space-y-3 z-20">
                      <AlertCircle className="w-8 h-8 text-rose-400" />
                      <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
                      <button
                        type="button"
                        onClick={startScanner}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                      >
                        Retry Camera
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 text-center">
                  Point camera at student&apos;s Digital ID Card QR code. Scanning starts automatically.
                </p>
              </div>
            )}

            {/* Tab 2: Manual SPR ID Search */}
            {!loading && activeTab === 'MANUAL' && (
              <form onSubmit={handleManualSubmit} className="space-y-3.5 py-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Enter Student SPR ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={manualSprId}
                      onChange={(e) => setManualSprId(e.target.value.toUpperCase())}
                      placeholder="e.g. SPR0095"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  </div>
                  <span className="text-[10.5px] text-slate-400 mt-1 block">
                    Type exact permanent SPR ID (e.g. SPR0001 - SPR0205)
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={!manualSprId.trim() || loading}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Search &amp; View Wallet</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
