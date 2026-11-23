'use client';

import React, { useRef, useState } from 'react';
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
} from 'lucide-react';

export interface IdCardData {
  sprId: string;
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayLocation =
    data.location && data.location !== '—'
      ? data.location
      : [data.place, data.district].filter((x) => x && x !== '—').join(', ') || 'Kerala, India';

  const displayPhone = data.phone && data.phone !== '—' ? data.phone : 'Not provided';
  const displayEmail = data.email && data.email !== '—' ? data.email : 'Not provided';

  // High-Resolution 300DPI Canvas PNG Generator
  const handleDownloadPng = async () => {
    try {
      setDownloading(true);

      const canvas = document.createElement('canvas');
      // High resolution: 1200 x 756 px (exact 1.587 ID-1 ratio)
      const width = 1200;
      const height = 756;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Crisp White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 2. Light Blue / Cyan Gradient Wash
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#F0F9FF'); // sky-50
      bgGrad.addColorStop(0.5, '#FFFFFF');
      bgGrad.addColorStop(1, '#E0F2FE'); // sky-100
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3. Top-Right Cyan & Navy Geometric Curves
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(width * 0.45, 0);
      ctx.bezierCurveTo(width * 0.65, 0, width * 0.7, 130, width, 110);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fillStyle = '#0284C7'; // Cyan/sky-600
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width * 0.55, 0);
      ctx.bezierCurveTo(width * 0.75, 0, width * 0.8, 110, width, 90);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fillStyle = '#0F172A'; // Dark Navy
      ctx.fill();
      ctx.restore();

      // 4. Bottom Decorative Ribbons
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height - 44);
      ctx.bezierCurveTo(width * 0.35, height - 70, width * 0.65, height - 20, width, height - 44);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = '#06B6D4'; // Cyan
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, height - 28);
      ctx.lineTo(width, height - 28);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = '#0A2540'; // Deep Navy
      ctx.fill();
      ctx.restore();

      // 5. Header: Logo & Branding
      ctx.fillStyle = '#0A2540';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText("MA'DIN SCHOOL OF EXCELLENCE", 60, 68);

      ctx.fillStyle = '#0284C7';
      ctx.font = '600 20px sans-serif';
      ctx.fillText('STUDENT PERFORMANCE RATING (SPR) SYSTEM', 60, 98);

      // Academic Year Badge (Top Right)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`SESSION: ${data.academicYear}`, width - 60, 52);
      ctx.textAlign = 'left';

      // 6. Header Divider Line
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, 122);
      ctx.lineTo(width - 60, 122);
      ctx.stroke();

      // 7. Student Photo (Left Column: x = 60, y = 145, w = 240, h = 300)
      const photoX = 60;
      const photoY = 150;
      const photoW = 240;
      const photoH = 300;

      // Photo frame shadow & border
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(photoX - 4, photoY - 4, photoW + 8, photoH + 8);
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(photoX - 2, photoY - 2, photoW + 4, photoH + 4);

      if (data.photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = data.photoUrl!;
          });
          if (img.width > 0) {
            ctx.drawImage(img, photoX, photoY, photoW, photoH);
          } else {
            drawFallbackAvatar(ctx, photoX, photoY, photoW, photoH, data.fullName);
          }
        } catch {
          drawFallbackAvatar(ctx, photoX, photoY, photoW, photoH, data.fullName);
        }
      } else {
        drawFallbackAvatar(ctx, photoX, photoY, photoW, photoH, data.fullName);
      }

      // SPR ID Pill under Photo
      ctx.fillStyle = '#0A2540';
      ctx.beginPath();
      ctx.roundRect(photoX, photoY + photoH + 16, photoW, 52, 12);
      ctx.fill();

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(data.sprId, photoX + photoW / 2, photoY + photoH + 51);
      ctx.textAlign = 'left';

      // 8. Student Information (Right Column: x = 340)
      const infoX = 340;

      // Student Full Name
      ctx.fillStyle = '#0F172A';
      ctx.font = '900 42px sans-serif';
      const truncatedName =
        data.fullName.length > 26 ? data.fullName.substring(0, 24) + '...' : data.fullName;
      ctx.fillText(truncatedName, infoX, 195);

      // Class & Division Pill
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.roundRect(infoX, 215, 260, 36, 8);
      ctx.fill();
      ctx.strokeStyle = '#7DD3FC';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#0369A1';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`CLASS: ${data.className} ${data.division ? `(${data.division})` : ''}`, infoX + 16, 240);

      // Key-Value rows
      let rowY = 290;
      const drawInfoRow = (label: string, value: string) => {
        ctx.fillStyle = '#64748B';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText(label.toUpperCase(), infoX, rowY);

        ctx.fillStyle = '#0F172A';
        ctx.font = '600 20px sans-serif';
        const displayVal = value.length > 32 ? value.substring(0, 30) + '...' : value;
        ctx.fillText(displayVal, infoX + 170, rowY);
        rowY += 36;
      };

      drawInfoRow('Place / Locality', displayLocation);
      drawInfoRow('Phone Number', displayPhone);
      drawInfoRow('Email Address', displayEmail);
      if (data.fatherName && data.fatherName !== '—') {
        drawInfoRow("Father's Name", data.fatherName);
      }

      // 9. QR Code (Bottom-Right: x = 940, y = 430, w = 190, h = 190)
      const qrX = width - 250;
      const qrY = 410;
      const qrSize = 190;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 46, 16);
      ctx.fill();
      ctx.strokeStyle = '#BAE6FD';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (data.qrDataUrl) {
        const qrImg = new Image();
        await new Promise((resolve) => {
          qrImg.onload = resolve;
          qrImg.onerror = resolve;
          qrImg.src = data.qrDataUrl;
        });
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }

      ctx.fillStyle = '#0369A1';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN FOR WALLET', qrX + qrSize / 2, qrY + qrSize + 22);
      ctx.textAlign = 'left';

      // 10. Footer Security Notice
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(
        `OFFICIAL INSTITUTIONAL SMART ID • ISSUED: ${data.issueDate || '2026-27'} • SPR DIGITAL CREDENTIAL`,
        60,
        height - 10
      );

      // Trigger automatic PNG download
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `SPR_ID_CARD_${data.sprId || 'STUDENT'}.png`;
      link.href = pngUrl;
      link.click();
    } catch (err) {
      console.error('PNG download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const drawFallbackAvatar = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    name: string
  ) => {
    ctx.fillStyle = '#0284C7';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    const initials = name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
    ctx.fillText(initials || 'SPR', x + w / 2, y + h / 2 + 24);
    ctx.textAlign = 'left';
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySprId = () => {
    navigator.clipboard.writeText(data.sprId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------------
          ACTION TOOLBAR
          --------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 dark:text-white block">
              Digital Institutional ID Card
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              SPR Permanent ID: <strong className="text-blue-600">{data.sprId}</strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={downloading}
            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
            title="Download high-resolution 300DPI PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Rendering...' : 'Download PNG'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

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
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              title="Refresh ID Card Details"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          HORIZONTAL SMART ID CARD CANVAS (PRIMARY REFERENCE DESIGN)
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

        <div
          id="student-id-card-print-target"
          ref={cardRef}
          className="relative w-full max-w-[620px] aspect-[1.586/1] bg-white rounded-3xl shadow-2xl border border-sky-200/90 overflow-hidden text-slate-900 select-none flex flex-col justify-between print:m-0 print:shadow-none print:border-none print:w-[85.6mm] print:h-[53.98mm] print:rounded-none"
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

          {/* -----------------------------------------------------------------
              CARD HEADER
              ----------------------------------------------------------------- */}
          <div className="relative z-10 px-5 sm:px-6 pt-4 pb-2 border-b border-sky-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white shadow-xs border border-sky-200 p-1 flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 leading-tight uppercase font-sans">
                  {data.schoolName || "Ma'din School of Excellence"}
                </h3>
                <p className="text-[9.5px] sm:text-[10px] font-bold text-sky-700 tracking-wide">
                  STUDENT PERFORMANCE RATING (SPR) SYSTEM
                </p>
              </div>
            </div>

            {/* Academic Session Badge */}
            <div className="text-right shrink-0 pr-3 sm:pr-4">
              <span className="inline-block px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono font-black text-white bg-slate-900/90 shadow-2xs">
                {data.academicYear}
              </span>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              CARD BODY: PHOTO + DETAILS + QR CODE
              ----------------------------------------------------------------- */}
          <div className="relative z-10 px-5 sm:px-6 py-2 sm:py-3 flex items-start gap-4 sm:gap-5 flex-1 min-h-0">
            {/* Left Column: Photograph + SPR ID Pill */}
            <div className="flex flex-col items-center shrink-0 w-[28%] sm:w-[26%]">
              <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden bg-slate-100 border-2 border-sky-400 shadow-md relative">
                {data.photoUrl ? (
                  <img src={data.photoUrl} alt={data.fullName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black text-xl sm:text-2xl">
                    {data.fullName
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase() || 'SPR'}
                  </div>
                )}
              </div>

              {/* SPR ID Badge */}
              <div className="mt-2 w-full py-1 px-1.5 rounded-xl bg-slate-900 text-sky-300 font-mono font-black text-[11px] sm:text-xs text-center shadow-xs border border-slate-800 truncate">
                {data.sprId}
              </div>
            </div>

            {/* Right Column: Student Info & Bottom-Right QR */}
            <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
              <div>
                <h2 className="text-sm sm:text-base lg:text-lg font-black text-slate-900 tracking-tight leading-snug truncate uppercase font-sans">
                  {data.fullName}
                </h2>

                <div className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md bg-sky-100/80 border border-sky-300/80 text-[10px] sm:text-[10.5px] font-black text-sky-900">
                  <span>Class: {data.className}</span>
                  {data.division && <span className="ml-1">({data.division})</span>}
                </div>

                {/* Metadata Fields */}
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

              {/* Bottom Row: Verification Watermark & QR Code */}
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

                {/* QR Code Frame */}
                <div className="p-1 rounded-xl bg-white border border-sky-200 shadow-sm shrink-0 flex flex-col items-center">
                  <img
                    src={data.qrDataUrl}
                    alt="Student QR Code"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                  />
                  <span className="text-[7px] font-black text-sky-800 tracking-tighter mt-0.5 uppercase">
                    Scan for Wallet
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* -----------------------------------------------------------------
              CARD FOOTER SECURITY STRIP
              ----------------------------------------------------------------- */}
          <div className="relative z-10 px-5 sm:px-6 py-1 bg-slate-900 text-slate-300 text-[7.5px] sm:text-[8.5px] font-semibold flex items-center justify-between tracking-wide">
            <span>OFFICIAL INSTITUTIONAL DIGITAL CREDENTIAL</span>
            <span className="font-mono text-sky-300">MADIN SCHOOL OF EXCELLENCE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
