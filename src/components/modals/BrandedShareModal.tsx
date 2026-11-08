'use client';

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Copy,
  Check,
  Download,
  X,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { SharePayload } from '@/lib/share-utils';

interface BrandedShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  payload: SharePayload | null;
}

export default function BrandedShareModal({
  isOpen,
  onClose,
  payload,
}: BrandedShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [payload?.imageUrl]);

  // Handle ESC key and scroll locking
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !payload) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(payload.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('WhatsApp text copied to clipboard!');
    }
  };

  const handleDownloadImage = async () => {
    try {
      setDownloading(true);
      const res = await fetch(payload.imageUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = payload.filename || 'SPR-Official-Banner.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(payload.imageUrl, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleCopyText();
      return;
    }

    try {
      setSharing(true);
      let fileToShare: File | null = null;
      try {
        const res = await fetch(payload.imageUrl);
        if (res.ok) {
          const blob = await res.blob();
          fileToShare = new File([blob], payload.filename || 'SPR-Official-Banner.jpg', {
            type: 'image/jpeg',
          });
        }
      } catch (e) {
        console.warn('Could not load banner blob for share:', e);
      }

      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          files: [fileToShare],
        });
      } else {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
    } finally {
      setSharing(false);
    }
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(payload.text)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-600 text-white">
              OFFICIAL SPR BANNER & MESSAGE
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Base Official Banner Image Preview (1024x500 aspect ratio) */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-md aspect-[1024/500]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={payload.imageUrl}
              alt="Ma'din School of Excellence - SPR Official Banner"
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
            />
          </div>

          {/* Formatted WhatsApp Message Preview */}
          <div className="bg-emerald-50/60 dark:bg-slate-950/70 rounded-2xl p-3.5 border border-emerald-200/80 dark:border-slate-800">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1.5 flex items-center justify-between">
              <span>WhatsApp Connected Caption</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                *bold* &amp; _italic_
              </span>
            </div>
            <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-36 overflow-y-auto select-all">
              {payload.text}
            </pre>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleNativeShare}
              disabled={sharing}
              className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharing ? 'Opening Share...' : 'Share Banner + Text'}</span>
            </button>

            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-bold text-xs transition shadow-xs active:scale-95 cursor-pointer border ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Copied Caption!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy WhatsApp Text</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Actions: Download Base Banner & Direct Apps */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download Banner (JPG)'}</span>
            </button>

            {/* Social Shortcuts */}
            <div className="flex items-center space-x-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center space-x-1 shadow-xs"
              >
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-bold transition flex items-center space-x-1"
              >
                <span>Telegram</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span>Ma&apos;din School of Excellence</span>
          <span className="flex items-center space-x-1">
            <Smartphone className="w-3 h-3 text-blue-500" />
            <span>Official Banner Image</span>
          </span>
        </div>
      </div>
    </div>
  );
}
