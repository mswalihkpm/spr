'use client';

import React, { useRef, useState, useMemo } from 'react';
import {
  Download,
  Printer,
  Maximize2,
  Minimize2,
  RefreshCw,
  QrCode,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  ExternalLink,
  Check,
  RotateCw,
  ShoppingCart,
  Store,
  Layers,
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { extractGoogleDriveFileId } from '@/lib/google-drive';

export interface IdCardData {
  sprId: string;
  eightDigitSprId?: string;
  studentCode?: string;
  fullName: string;
  className: string;
  division?: string;
  academicYear: string;
  schoolName: string;
  photoUrl?: string | null;
  fatherName?: string;
  place?: string;
  district?: string;
  location?: string;
  phone?: string;
  email?: string;
  qrToken?: string;
  qrPayload?: string;
  qrDataUrl: string;
  issueDate?: string;
}

interface DigitalStudentIdCardProps {
  data: IdCardData;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function DigitalStudentIdCard({
  data,
  onRefresh,
  refreshing = false,
}: DigitalStudentIdCardProps) {
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  // Hidden print & composite container refs
  const printFrontRef = useRef<HTMLDivElement>(null);
  const printBackRef = useRef<HTMLDivElement>(null);

  const [activeSide, setActiveSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgressText, setDownloadProgressText] = useState<string>('');
  const [imgLoadFailed, setImgLoadFailed] = useState(false);
  const [imgCandidateIndex, setImgCandidateIndex] = useState(0);

  // Deterministic strong 8-digit code
  const strong8DigitCode = useMemo(() => {
    if (data.eightDigitSprId && /^\d{8}$/.test(data.eightDigitSprId)) {
      return data.eightDigitSprId;
    }
    let hash = 0;
    const str = `${data.sprId || 'SPR'}:${data.studentCode || 'MSOE'}:2026`;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const positiveNum = Math.abs(hash);
    return String(10000000 + (positiveNum % 90000000));
  }, [data.eightDigitSprId, data.sprId, data.studentCode]);

  const displayLocation =
    data.location && data.location !== '—'
      ? data.location
      : [data.place, data.district].filter((x) => x && x !== '—').join(', ') || 'Kerala, India';

  const displayPhone = data.phone && data.phone !== '—' ? data.phone : 'Not provided';
  const displayEmail = data.email && data.email !== '—' ? data.email : 'Not provided';

  // Build candidate photo URLs for Google Drive and edge CDNs
  const photoCandidates = useMemo(() => {
    if (!data.photoUrl) return [];
    const trimmed = data.photoUrl.trim();
    if (!trimmed) return [];

    const driveId = extractGoogleDriveFileId(trimmed);
    if (driveId) {
      return [
        `https://lh3.googleusercontent.com/d/${driveId}=s400`,
        `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`,
        `https://drive.google.com/uc?export=view&id=${driveId}`,
        `/api/avatar/${driveId}?proxy=true`,
      ];
    }
    return [trimmed];
  }, [data.photoUrl]);

  const currentPhotoSrc = photoCandidates[imgCandidateIndex] || null;

  const handleImageError = () => {
    if (imgCandidateIndex < photoCandidates.length - 1) {
      setImgCandidateIndex((prev) => prev + 1);
    } else {
      setImgLoadFailed(true);
    }
  };

  // Trigger file download helper
  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Capture exact rendered card element at 300DPI (pixelRatio 3) with exact theme colors
  const captureCardElement = async (
    node: HTMLElement,
    side: 'FRONT' | 'BACK' = 'FRONT'
  ): Promise<string> => {
    return toPng(node, {
      quality: 1.0,
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: side === 'BACK' ? '#0A192F' : '#FFFFFF',
      style: {
        backgroundColor: side === 'BACK' ? '#0A192F' : '#FFFFFF',
        color: side === 'BACK' ? '#FFFFFF' : '#0F172A',
      },
    });
  };

  // Single Side PNG Download (FRONT or BACK)
  const handleDownloadSingleSide = async (side: 'FRONT' | 'BACK') => {
    try {
      setDownloading(true);
      setDownloadProgressText(`Capturing ${side} Side...`);

      const targetRef = side === 'FRONT' ? printFrontRef.current : printBackRef.current;
      if (!targetRef) throw new Error('Target card element not available');

      const dataUrl = await captureCardElement(targetRef, side);
      triggerDownload(dataUrl, `SPR_ID_CARD_${side}_${data.sprId || 'STUDENT'}.png`);
    } catch (err) {
      console.error(`Error downloading ${side} PNG:`, err);
    } finally {
      setDownloading(false);
      setDownloadProgressText('');
    }
  };

  // Both Sides Bulky Download (Creates composite print-sheet + downloads both)
  const handleDownloadBothSides = async () => {
    try {
      setDownloading(true);
      setDownloadProgressText('Rendering Both Sides...');

      const frontNode = printFrontRef.current;
      const backNode = printBackRef.current;
      if (!frontNode || !backNode) throw new Error('Card elements not available');

      // 1. Capture high-res PNGs of both sides with exact theme preservation
      const [frontPng, backPng] = await Promise.all([
        captureCardElement(frontNode, 'FRONT'),
        captureCardElement(backNode, 'BACK'),
      ]);

      // 2. Download individual front and back PNGs
      triggerDownload(frontPng, `SPR_ID_CARD_FRONT_${data.sprId || 'STUDENT'}.png`);
      await new Promise((r) => setTimeout(r, 400));
      triggerDownload(backPng, `SPR_ID_CARD_BACK_${data.sprId || 'STUDENT'}.png`);

      // 3. Create a combined 300DPI dual-card print sheet canvas
      const canvas = document.createElement('canvas');
      const cardW = 1200;
      const cardH = 756;
      const margin = 80;
      const gap = 60;
      const headerH = 140;

      canvas.width = cardW + margin * 2;
      canvas.height = headerH + cardH * 2 + gap + margin * 2;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Clean white background for overall print sheet
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Branding
        ctx.fillStyle = '#0F172A';
        ctx.font = '900 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('STUDENT PERFORMANCE RATING (SPR) SYSTEM', canvas.width / 2, 70);

        ctx.fillStyle = '#0284C7';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(
          `OFFICIAL SMART ID CARD (FRONT & BACK) • SPR ID: ${data.sprId} • CODE: ${strong8DigitCode}`,
          canvas.width / 2,
          108
        );

        // Load front & back images onto composite canvas
        const [frontImg, backImg] = await Promise.all([
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = frontPng;
          }),
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = backPng;
          }),
        ]);

        // Draw Front Card
        const frontY = headerH + margin;
        ctx.drawImage(frontImg, margin, frontY, cardW, cardH);

        // Cutting Guideline
        const cutY = frontY + cardH + gap / 2;
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(margin, cutY);
        ctx.lineTo(margin + cardW, cutY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ CUT HERE ─ ─ ─ ─ ─ ─ ─ ─ ─ ✂', canvas.width / 2, cutY + 6);

        // Draw Back Card (PRESERVE DEEP NAVY #0A192F THEME)
        const backY = frontY + cardH + gap;
        ctx.fillStyle = '#0A192F';
        ctx.beginPath();
        ctx.roundRect(margin, backY, cardW, cardH, 24);
        ctx.fill();
        ctx.drawImage(backImg, margin, backY, cardW, cardH);

        // Trigger Combined Both Sides PNG Download
        const bothSidesPng = canvas.toDataURL('image/png');
        await new Promise((r) => setTimeout(r, 400));
        triggerDownload(bothSidesPng, `SPR_ID_CARD_BOTH_SIDES_${data.sprId || 'STUDENT'}.png`);
      }
    } catch (err) {
      console.error('Error generating both-side bulky download:', err);
    } finally {
      setDownloading(false);
      setDownloadProgressText('');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Reusable Front Card JSX Node (With components in exact requested position)
  const renderFrontCard = (isPrintClone = false) => (
    <div
      ref={isPrintClone ? printFrontRef : frontCardRef}
      className={`relative w-full aspect-[1.586/1] bg-white rounded-3xl shadow-2xl border border-sky-200/90 overflow-hidden text-slate-900 select-none flex flex-col justify-between ${
        isPrintClone ? 'print-card-box max-w-[620px]' : 'max-w-[620px]'
      }`}
      style={{
        background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 50%, #E0F2FE 100%)',
      }}
    >
      {/* Top-Right Decorative Waves */}
      <div className="absolute top-0 right-0 w-[48%] h-[40%] pointer-events-none overflow-hidden">
        <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
          <path d="M40 0 C100 0 120 70 200 60 L200 0 Z" fill="#0284C7" opacity="0.9" />
          <path d="M80 0 C130 0 150 55 200 45 L200 0 Z" fill="#0F172A" />
        </svg>
      </div>

      {/* Bottom Cyan & Navy Curves */}
      <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none overflow-hidden">
        <svg viewBox="0 0 600 40" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0 16 C200 -10 400 30 600 12 L600 40 L0 40 Z" fill="#06B6D4" opacity="0.95" />
          <path d="M0 24 L600 24 L600 40 L0 40 Z" fill="#0A2540" />
        </svg>
      </div>

      {/* -------------------------------------------------------------
          CARD HEADER (APP NAME TOP, SCHOOL NAME SUBTITLE)
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 pt-3 sm:pt-4 pb-2 border-b border-sky-200/60 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white shadow-xs border border-sky-200 p-1 flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight uppercase font-sans">
              STUDENT PERFORMANCE RATE
            </h3>
            <p className="text-[9.5px] sm:text-[10px] font-bold text-sky-700 tracking-wide uppercase">
              {data.schoolName || "Ma'din School of Excellence"}
            </p>
          </div>
        </div>

        {/* Academic Session Badge - 2026-27 */}
        <div className="text-right shrink-0 pr-3 sm:pr-4">
          <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-black text-white bg-slate-900/90 shadow-2xs">
            2026-27
          </span>
        </div>
      </div>

      {/* -------------------------------------------------------------
          CARD BODY: PHOTO + DETAILS + QR
          (DETAILS POSITIONED DIRECTLY UNDER CLASS AS MARKED BY USER)
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 py-2 sm:py-3 flex items-start gap-4 sm:gap-5 flex-1 min-h-0">
        {/* Left Column: Photograph + STRONG 8-DIGIT NUMBER ID PILL */}
        <div className="flex flex-col items-center shrink-0 w-[28%] sm:w-[26%]">
          <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 border-2 border-sky-400 shadow-md relative">
            {currentPhotoSrc && !imgLoadFailed ? (
              <img
                src={currentPhotoSrc}
                alt={data.fullName}
                referrerPolicy="no-referrer-when-downgrade"
                crossOrigin="anonymous"
                onError={handleImageError}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black">
                <span className="text-xl sm:text-2xl">
                  {data.fullName
                    .split(' ')
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'ST'}
                </span>
                <span className="text-[9px] opacity-75 font-mono">SPR ID</span>
              </div>
            )}
          </div>

          {/* STRONG 8-DIGIT NUMBER ID PILL */}
          <div className="mt-2 w-full py-1 px-1 rounded-xl bg-slate-900 text-center shadow-xs border border-slate-800">
            <div className="text-sky-300 font-mono font-black text-xs sm:text-sm tracking-wider">
              {strong8DigitCode}
            </div>
            <div className="text-[8.5px] sm:text-[9px] text-slate-400 font-mono font-bold leading-none">
              SPR ID: {data.sprId}
            </div>
          </div>
        </div>

        {/* Right Column: Student Info & Positioned Details (EXACTLY AS MARKED) */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
          <div>
            <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight leading-snug truncate uppercase font-sans">
              {data.fullName}
            </h2>

            <div className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md bg-sky-100/80 border border-sky-300/80 text-[10px] sm:text-[10.5px] font-black text-sky-900">
              <span>Class: {data.className}</span>
              {data.division && <span className="ml-1">({data.division})</span>}
            </div>

            {/* POSITIONED HERE DIRECTLY BELOW CLASS (EXACTLY AS MARKED BY RED ARROW) */}
            <div className="mt-2 space-y-1 text-[10px] sm:text-[11.5px] text-slate-700 font-medium leading-tight">
              <div className="flex items-center space-x-1.5 truncate">
                <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="text-slate-400 text-[9.5px] uppercase font-bold shrink-0">Place:</span>
                <span className="font-bold text-slate-800 truncate">{displayLocation}</span>
              </div>

              <div className="flex items-center space-x-1.5 truncate">
                <Phone className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="text-slate-400 text-[9.5px] uppercase font-bold shrink-0">Phone:</span>
                <span className="font-bold text-slate-800 font-mono truncate">{displayPhone}</span>
              </div>

              <div className="flex items-center space-x-1.5 truncate">
                <Mail className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="text-slate-400 text-[9.5px] uppercase font-bold shrink-0">Email:</span>
                <span className="font-bold text-slate-800 font-mono truncate">{displayEmail}</span>
              </div>

              {data.fatherName && data.fatherName !== '—' && (
                <div className="flex items-center space-x-1.5 truncate">
                  <span className="w-3 h-3 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[8px] font-black shrink-0">
                    P
                  </span>
                  <span className="text-slate-400 text-[9.5px] uppercase font-bold shrink-0">Guardian:</span>
                  <span className="font-bold text-slate-800 truncate">{data.fatherName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Left has Verified Identity Status, Right has the Enlarged QR Code */}
          <div className="flex items-end justify-between pt-1 mt-1 border-t border-sky-100">
            <div className="text-[8.5px] sm:text-[9.5px] text-slate-500 font-semibold space-y-0.5">
              <div className="flex items-center space-x-1 text-sky-700 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>Verified SPR Identity</span>
              </div>
              <p className="font-mono text-[8px] text-slate-400">
                AUTH-REF: {data.qrToken?.substring(0, 16) || 'SECURE-TOKEN'}
              </p>
            </div>

            {/* ENLARGED FULL SPACE QR CODE FRAME */}
            <div className="p-1 rounded-xl bg-white border-2 border-sky-300 shadow-md shrink-0 flex flex-col items-center">
              <img
                src={data.qrDataUrl}
                alt="Student QR Code"
                className="w-18 h-18 sm:w-22 sm:h-22 md:w-24 md:h-24 object-contain"
              />
              <span className="text-[7px] sm:text-[7.5px] font-black text-sky-900 tracking-tighter mt-0.5 uppercase">
                Scan for Wallet
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          CARD FOOTER SECURITY STRIP
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 py-1 bg-slate-900 text-slate-300 text-[7.5px] sm:text-[8.5px] font-semibold flex items-center justify-between tracking-wide">
        <span>OFFICIAL INSTITUTIONAL DIGITAL CREDENTIAL</span>
        <span className="font-mono text-sky-300">MADIN SCHOOL OF EXCELLENCE</span>
      </div>
    </div>
  );

  // Reusable Back Card JSX Node (FIXED THEME: EXPLICIT #0A192F COLOR + NO HIDDEN ELEMENTS)
  const renderBackCard = (isPrintClone = false) => (
    <div
      ref={isPrintClone ? printBackRef : backCardRef}
      className={`relative w-full aspect-[1.586/1] text-white rounded-3xl shadow-2xl border border-sky-900 overflow-hidden select-none flex flex-col justify-between ${
        isPrintClone ? 'print-card-box max-w-[620px]' : 'max-w-[620px]'
      }`}
      style={{
        backgroundColor: '#0A192F',
        background: '#0A192F',
        color: '#FFFFFF',
      }}
    >
      {/* Bottom-Left Curved Wave Accents */}
      <div className="absolute bottom-0 left-0 w-[55%] h-[60%] pointer-events-none overflow-hidden">
        <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
          <path d="M0 60 C80 120 180 160 300 200 L0 200 Z" fill="#0284C7" opacity="0.6" />
          <path d="M0 110 C90 140 160 170 250 200 L0 200 Z" fill="#00C9E8" opacity="0.95" />
        </svg>
      </div>

      {/* -------------------------------------------------------------
          BACK HEADER: BRANDING LOGO (TOP RIGHT)
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 pt-3 sm:pt-4 flex items-center justify-end">
        <div className="flex items-center space-x-2 text-right">
          <div className="leading-tight">
            <span className="block text-xs sm:text-sm font-black text-white">Student</span>
            <span className="block text-[11px] sm:text-xs font-black text-sky-400">
              Performance Rate
            </span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-sky-950/90 border border-sky-400/50 p-1 flex items-center justify-center">
            <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          BACK BODY: STORE FRONT ICON + HOW TO USE GUIDE + IMPORTANT
          (NO HIDDEN CLASSES - ALWAYS VISIBLE IN DOWNLOADS & SCREEN)
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 py-1 flex items-center gap-3 sm:gap-5 flex-1 min-h-0">
        {/* Left Column: Store Graphic (Always Visible) */}
        <div className="flex flex-col items-center justify-center w-[22%] sm:w-[24%] shrink-0 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#0F274E] border-2 border-sky-400/60 flex flex-col items-center justify-center p-2 shadow-lg">
            <Store className="w-7 h-7 sm:w-9 sm:h-9 text-sky-400" />
            <ShoppingCart className="w-3.5 h-3.5 text-white mt-1" />
          </div>
          <span className="text-[9px] sm:text-[10px] font-black text-sky-300 uppercase tracking-wider mt-1.5">
            SPR Store
          </span>
        </div>

        {/* Vertical Divider */}
        <div className="w-0.5 self-stretch bg-sky-600/50 my-1 shrink-0" />

        {/* Right Column: How To Use Instructions */}
        <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1.5">
          {/* How to use badge */}
          <div className="inline-flex items-center self-start px-3 py-0.5 rounded-full bg-sky-100 text-slate-900 text-[10px] sm:text-[11px] font-black uppercase tracking-tight shadow-xs">
            HOW TO USE AT THE STORE
          </div>

          {/* 4 Steps */}
          <div className="space-y-0.5 text-[9.5px] sm:text-[11px] text-slate-200">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 text-slate-950 text-[9.5px] font-black flex items-center justify-center shrink-0">
                1
              </span>
              <span className="truncate">Present your SPR ID Card at the store.</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 text-slate-950 text-[9.5px] font-black flex items-center justify-center shrink-0">
                2
              </span>
              <span className="truncate">Allow the Store Admin to scan your QR Code.</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 text-slate-950 text-[9.5px] font-black flex items-center justify-center shrink-0">
                3
              </span>
              <span className="truncate">Your student profile will be displayed automatically.</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-3.5 rounded-full bg-sky-400 text-slate-950 text-[9.5px] font-black flex items-center justify-center shrink-0">
                4
              </span>
              <span className="truncate">
                Your available wallet balance and transaction history can be viewed instantly.
              </span>
            </div>
          </div>

          {/* Important notice box */}
          <div className="p-2 rounded-xl bg-[#0F274E]/80 border border-sky-400/50 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-[9.5px] sm:text-[10px] font-black text-sky-300 uppercase">
                IMPORTANT
              </div>
              <p className="text-[8.5px] sm:text-[9.5px] text-slate-300 leading-tight">
                Keep your ID Card safe. Your QR Code provides secure access to your student wallet
                information at authorized SPR stores.
              </p>
            </div>
          </div>

          {/* Slogan Ribbon */}
          <div className="text-center text-[9px] sm:text-[10px] font-bold text-sky-400 tracking-wider">
            ── ONE CARD • ONE STUDENT • ONE WALLET ──
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          BACK FOOTER: SPR ID & STRONG 8-DIGIT CODE (BOTTOM LEFT)
          ------------------------------------------------------------- */}
      <div className="relative z-10 px-5 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-950/80 border border-sky-400/30">
          <span className="text-xs sm:text-sm font-bold text-slate-200">SPR ID :</span>
          <span className="text-sm sm:text-base font-black text-sky-300 font-mono">
            {data.sprId}
          </span>
          <span className="text-xs font-mono font-bold text-sky-400">({strong8DigitCode})</span>
        </div>

        <div className="text-[8.5px] font-mono text-slate-400">
          AUTHORIZED SPR STORE CREDENTIAL
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------------
          ACTION TOOLBAR (FRONT / BACK / BULKY DOWNLOAD BOTH SIDES)
          --------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Title & Strong 8-Digit Code */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                Digital Student ID Card
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-blue-600 text-white tracking-wider">
                {strong8DigitCode}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              SPR ID: <strong className="text-blue-600">{data.sprId}</strong> • Academic Session:{' '}
              <strong className="text-slate-800 dark:text-slate-200">2026-27</strong>
            </span>
          </div>
        </div>

        {/* Center: Front / Back Side Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveSide('FRONT')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeSide === 'FRONT'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Front Side
          </button>
          <button
            onClick={() => setActiveSide('BACK')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
              activeSide === 'BACK'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span>Back Side</span>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </button>
          <button
            onClick={() => setActiveSide(activeSide === 'FRONT' ? 'BACK' : 'FRONT')}
            className="p-1 text-slate-500 hover:text-blue-600 transition ml-1 cursor-pointer"
            title="Flip Card"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions (Single PNG, Both Sides Bulky PNG, Print PDF) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Side PNG Download */}
          <button
            onClick={() => handleDownloadSingleSide(activeSide)}
            disabled={downloading}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
            title={`Download high-resolution exact ${activeSide} PNG`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>
              {downloading && downloadProgressText.includes(activeSide)
                ? 'Capturing...'
                : `Download ${activeSide} PNG`}
            </span>
          </button>

          {/* BULKY DOWNLOAD: BOTH SIDES PNG */}
          <button
            onClick={handleDownloadBothSides}
            disabled={downloading}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
            title="Download both Front & Back PNGs plus a combined print sheet"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>
              {downloading && downloadProgressText.includes('Both')
                ? 'Rendering...'
                : 'Download Both Sides (PNG)'}
            </span>
          </button>

          {/* Print / PDF */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer"
            title="Print or Save as PDF (includes Front and Back sides)"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          {/* Full Screen Preview */}
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer"
            title="Toggle full screen preview"
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isFullScreen ? 'Exit Full' : 'Full Screen'}</span>
          </button>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Refresh ID Card Details"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          VISIBLE INTERACTIVE SCREEN CARD (FRONT OR BACK VIEW)
          --------------------------------------------------------------------- */}
      <div
        className={`w-full flex justify-center ${
          isFullScreen
            ? 'fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4 sm:p-8 flex items-center justify-center overflow-auto'
            : ''
        }`}
      >
        {isFullScreen && (
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-4 right-4 p-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition z-50 cursor-pointer"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Display Current Active Side (Front or Back) */}
        {activeSide === 'FRONT' ? renderFrontCard(false) : renderBackCard(false)}
      </div>

      {/* Flip helper pill below the card */}
      <div className="flex justify-center">
        <button
          onClick={() => setActiveSide(activeSide === 'FRONT' ? 'BACK' : 'FRONT')}
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Click to view {activeSide === 'FRONT' ? 'Back of Card' : 'Front of Card'}</span>
        </button>
      </div>

      {/* ---------------------------------------------------------------------
          HIDDEN OFFSCREEN DOM CLONES FOR EXACT 300DPI CAPTURE & BOTH-SIDE PRINT
          --------------------------------------------------------------------- */}
      <div
        className="print-id-card-sheet"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        {/* Front Side Clone */}
        {renderFrontCard(true)}

        {/* Back Side Clone */}
        {renderBackCard(true)}
      </div>
    </div>
  );
}
