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
  ShoppingCart,
  Send,
  Zap,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import StudentAvatar from '@/components/ui/StudentAvatar';
import {
  CAMERA_CHOICE_STORAGE_KEY,
  CAMERA_PERMISSION_EVENT,
  CAMERA_SESSION_DENIED_KEY,
} from '@/components/admin/AdminCameraPermissionManager';

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

  // Scanned student & wallet state
  const [scannedResult, setScannedResult] = useState<{
    student: any;
    wallet: any;
    transactions: any[];
    scannedAt?: string;
  } | null>(null);

  // Instant Purchase / Cash Deduction state
  const [deductAmount, setDeductAmount] = useState<string>('');
  const [deductItem, setDeductItem] = useState<string>('Campus Store Purchase');
  const [deductNotes, setDeductNotes] = useState<string>('');
  const [deducting, setDeducting] = useState<boolean>(false);
  const [deductSuccessMsg, setDeductSuccessMsg] = useState<string | null>(null);
  const [deductErrorMsg, setDeductErrorMsg] = useState<string | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'spr-store-qr-reader';
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Stop camera scanner safely
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Scanner stop warning (ignored):', err);
      }
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  };

  // Start Camera Scanner with multi-constraint fallback & permission request
  const startScanner = async (bypassSavedDeny = false) => {
    await stopScanner();
    setCameraError(null);
    setErrorMsg(null);

    if (!bypassSavedDeny && typeof window !== 'undefined') {
      const savedChoice = localStorage.getItem(CAMERA_CHOICE_STORAGE_KEY);
      if (savedChoice === 'denied') {
        setCameraError(
          'Camera access is currently set to Deny. Click "Allow Camera Permission & Retry" below to allow camera scanning.'
        );
        return;
      }
    }

    setTimeout(async () => {
      const container = document.getElementById(scannerContainerId);
      if (!container) return;

      try {
        // Test and prompt user media permission
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: 'environment' } },
            });
            // Stop test stream immediately
            stream.getTracks().forEach((track) => track.stop());
          } catch (permErr: any) {
            console.warn('Direct getUserMedia prompt error:', permErr);
          }
        }

        const qrScanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = qrScanner;

        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        // Try environment camera first, then fallback to any camera
        try {
          await qrScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
              handleScanSuccess(decodedText);
            },
            () => {}
          );
        } catch (envErr) {
          console.warn('Environment camera failed, falling back to default camera:', envErr);
          const cameras = await Html5Qrcode.getCameras().catch(() => []);
          const cameraId = cameras && cameras.length > 0 ? cameras[0].id : undefined;

          if (cameraId) {
            await qrScanner.start(
              cameraId,
              config,
              (decodedText) => {
                handleScanSuccess(decodedText);
              },
              () => {}
            );
          } else {
            await qrScanner.start(
              { facingMode: 'user' },
              config,
              (decodedText) => {
                handleScanSuccess(decodedText);
              },
              () => {}
            );
          }
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(CAMERA_CHOICE_STORAGE_KEY, 'allowed');
          sessionStorage.removeItem(CAMERA_SESSION_DENIED_KEY);
          window.dispatchEvent(
            new CustomEvent(CAMERA_PERMISSION_EVENT, { detail: { status: 'granted' } })
          );
        }

        setScanning(true);
      } catch (err: any) {
        console.error('Camera start error:', err);
        setCameraError(
          err.message ||
            'Camera permission is required to scan student QR codes. Please allow camera access in your browser or Android app settings.'
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

  useEffect(() => {
    if (activeTab === 'MANUAL' && isOpen && !scannedResult) {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  }, [activeTab, isOpen, scannedResult]);

  // Handle scanned QR payload
  const handleScanSuccess = async (decodedText: string) => {
    await stopScanner();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch {}
    }
    fetchStudentAndWallet({ qrToken: decodedText });
  };

  // Handle manual 8-digit SPR ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSprId.trim()) return;
    fetchStudentAndWallet({ sprStudentId: manualSprId.trim() });
  };

  // Server verification
  const fetchStudentAndWallet = async (payload: { qrToken?: string; sprStudentId?: string }) => {
    setLoading(true);
    setErrorMsg(null);
    setDeductSuccessMsg(null);
    setDeductErrorMsg(null);
    setDeductAmount('');
    try {
      const res = await fetch('/api/store/qr/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to verify student QR code or ID.');
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

  // Instant Store Cash Deduction Action
  const handleInstantDeduct = async (amountToDeduct: number) => {
    if (!scannedResult?.student?.id) return;
    if (amountToDeduct <= 0) {
      setDeductErrorMsg('Please enter a valid deduction amount greater than ₹0.');
      return;
    }

    const availableBal = Number(scannedResult.wallet?.availableBalance || 0);
    if (amountToDeduct > availableBal) {
      setDeductErrorMsg(
        `Insufficient balance. Available: ₹${availableBal.toFixed(2)}, Requested: ₹${amountToDeduct.toFixed(2)}.`
      );
      return;
    }

    setDeducting(true);
    setDeductErrorMsg(null);
    setDeductSuccessMsg(null);

    try {
      const res = await fetch('/api/store/wallet/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: scannedResult.student.id,
          amount: amountToDeduct,
          item: deductItem,
          remarks: deductNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Deduction failed.');
      }

      // Haptic confirmation
      if (navigator.vibrate) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {}
      }

      setDeductSuccessMsg(
        `₹${amountToDeduct.toFixed(2)} recorded & deducted instantly! New Balance: ₹${Number(json.data.newBalance).toFixed(2)}`
      );

      // Update wallet balance live in modal
      setScannedResult((prev) => {
        if (!prev) return null;
        const updatedTransactions = [json.data.transaction, ...(prev.transactions || [])];
        return {
          ...prev,
          wallet: {
            ...prev.wallet,
            availableBalance: json.data.newBalance,
            totalSpent: (prev.wallet.totalSpent || 0) + amountToDeduct,
          },
          transactions: updatedTransactions,
        };
      });

      setDeductAmount('');
      setDeductNotes('');
    } catch (err: any) {
      console.error('Deduction error:', err);
      setDeductErrorMsg(err.message || 'Failed to record store cash deduction.');
    } finally {
      setDeducting(false);
    }
  };

  // Scan Next Student immediately
  const handleResetForNext = () => {
    setScannedResult(null);
    setErrorMsg(null);
    setDeductSuccessMsg(null);
    setDeductErrorMsg(null);
    setManualSprId('');
    setDeductAmount('');
    if (activeTab === 'CAMERA') {
      startScanner();
    } else {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                Store QR Scanner &amp; Wallet Activity
              </h2>
              <p className="text-xs text-slate-500">
                Instant student verification and cash wallet recording
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            STATE 1: STUDENT & WALLET RESULT + INSTANT DEDUCTION FORM
            ========================================================================= */}
        {scannedResult ? (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Student Profile Card */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800/80 dark:to-blue-950/40 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <StudentAvatar
                  photoUrl={scannedResult.student.photoUrl}
                  name={scannedResult.student.fullName}
                  size="lg"
                  studentId={scannedResult.student.sprStudentId}
                  className="w-13 h-13 ring-3 ring-sky-500/30 shadow-md shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-slate-900 text-sky-300">
                      {scannedResult.student.sprStudentId}
                    </span>
                    {scannedResult.student.eightDigitSprId && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-blue-600 text-white">
                        {scannedResult.student.eightDigitSprId}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate mt-0.5">
                    {scannedResult.student.fullName}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Class: <strong>{scannedResult.student.className}</strong> ({scannedResult.student.division})
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetForNext}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center space-x-1 shrink-0 cursor-pointer shadow-xs"
              >
                <span>Scan Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Authoritative Wallet Balance Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-1.5 text-xs font-bold text-sky-200 uppercase tracking-wider">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Available Wallet Balance</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-emerald-300 font-mono tracking-tight mt-1">
                  ₹{Number(scannedResult.wallet?.availableBalance || 0).toFixed(2)}
                </div>
              </div>

              <div className="text-right text-xs space-y-1">
                <div className="text-slate-400">
                  Spent: <strong className="text-rose-300 font-mono">₹{Number(scannedResult.wallet?.totalSpent || 0).toFixed(2)}</strong>
                </div>
                <div className="text-slate-400">
                  Earned: <strong className="text-emerald-300 font-mono">₹{Number(scannedResult.wallet?.totalCredited || 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>

            {/* =============================================================
                INSTANT STORE CASH PURCHASE / RECORDING SECTION
                ============================================================= */}
            <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-300/80 dark:border-emerald-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    Instant Store Activity &amp; Cash Deduction
                  </span>
                </div>
                <span className="text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400">
                  Superfast POS Mode
                </span>
              </div>

              {/* Success Notification */}
              {deductSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 text-emerald-900 dark:text-emerald-100 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300 shrink-0" />
                  <span>{deductSuccessMsg}</span>
                </div>
              )}

              {/* Error Notification */}
              {deductErrorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 text-rose-900 dark:text-rose-100 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-300 shrink-0" />
                  <span>{deductErrorMsg}</span>
                </div>
              )}

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[5, 10, 20, 30, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDeductAmount(String(preset))}
                    className={`px-3 py-1 rounded-xl text-xs font-black font-mono transition cursor-pointer ${
                      deductAmount === String(preset)
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>

              {/* Custom Input Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono font-black text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={deductAmount}
                    onChange={(e) => setDeductAmount(e.target.value)}
                    placeholder="Amount"
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-mono font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <select
                    value={deductItem}
                    onChange={(e) => setDeductItem(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Campus Store Purchase">Store Purchase</option>
                    <option value="Stationery & Notebooks">Stationery &amp; Notes</option>
                    <option value="Snacks & Canteen">Snacks / Canteen</option>
                    <option value="Books & Study Kit">Books / Study Kit</option>
                    <option value="Uniform & Accessories">Uniform &amp; Badges</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => handleInstantDeduct(Number(deductAmount))}
                  disabled={deducting || !deductAmount || Number(deductAmount) <= 0}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {deducting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Deduct ₹{deductAmount || '0'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Recent Transactions List */}
            {scannedResult.transactions?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center space-x-1">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    <span>Recent Transactions</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Last {scannedResult.transactions.length}
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {scannedResult.transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                          {tx.description || tx.type}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`font-mono font-bold text-xs ${
                            tx.type === 'EARNING' || tx.type === 'TRANSFER_RECEIVED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {tx.type === 'EARNING' || tx.type === 'TRANSFER_RECEIVED' ? '+' : '-'}₹
                          {Number(tx.amount).toFixed(2)}
                        </span>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Bal: ₹{Number(tx.balanceAfter).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =========================================================================
              STATE 2: SCANNER & MANUAL SEARCH TABS
              ========================================================================= */
          <div className="space-y-4">
            {/* Nav Tabs */}
            <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
              <button
                onClick={() => setActiveTab('CAMERA')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'CAMERA'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Camera Scanner</span>
              </button>

              <button
                onClick={() => setActiveTab('MANUAL')}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center space-x-2 cursor-pointer ${
                  activeTab === 'MANUAL'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>8-Digit Security Code</span>
              </button>
            </div>

            {/* Tab 1: Camera Scanner */}
            {activeTab === 'CAMERA' && (
              <div className="space-y-3">
                <div className="relative aspect-square max-w-[320px] mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-dashed border-sky-400/80 flex items-center justify-center shadow-inner">
                  <div id={scannerContainerId} className="w-full h-full" />

                  {cameraError && (
                    <div className="absolute inset-0 p-5 bg-slate-950/95 flex flex-col items-center justify-center text-center space-y-3 z-20">
                      <AlertCircle className="w-10 h-10 text-amber-400 animate-pulse" />
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {cameraError}
                      </p>
                      <button
                        onClick={() => startScanner(true)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition cursor-pointer"
                      >
                        Allow Camera Permission &amp; Retry
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-center text-xs text-slate-500">
                  Point camera at the QR code on the student&apos;s physical or digital ID card.
                </p>
              </div>
            )}

            {/* Tab 2: Manual 8-Digit Security Code Search */}
            {activeTab === 'MANUAL' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-amber-900 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>8-Digit Security Code Access Only</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-tight">
                    For student safety, wallet details <strong>cannot</strong> be opened using public SPR IDs (e.g. SPR0122). Please enter the student&apos;s unique <strong>8-digit number</strong> printed on their card.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    ref={manualInputRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={8}
                    value={manualSprId}
                    onChange={(e) => setManualSprId(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="Enter 8-digit number (e.g. 57249153)..."
                    className="w-full pl-10 pr-28 py-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tracking-wider"
                  />
                  <button
                    type="submit"
                    disabled={loading || manualSprId.length !== 8}
                    className="absolute right-2 top-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition disabled:opacity-40 cursor-pointer"
                  >
                    {loading ? 'Verifying...' : `Unlock (${manualSprId.length}/8)`}
                  </button>
                </div>
              </form>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
