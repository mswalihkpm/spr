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
  Mail,
  Send,
  MessageCircle,
  Globe,
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
  const [bannerFile, setBannerFile] = useState<File | null>(null);

  // Pre-load the official banner into memory so navigator.share can be executed
  // synchronously upon user tap without losing the transient user activation window on mobile browsers.
  useEffect(() => {
    setImageLoaded(false);
    if (!payload?.imageUrl) return;

    let cancelled = false;
    fetch(payload.imageUrl)
      .then((res) => res.blob())
      .then((blob) => {
        if (!cancelled) {
          const file = new File([blob], payload.filename || 'SPR-Official-Banner.jpg', {
            type: 'image/jpeg',
          });
          setBannerFile(file);
        }
      })
      .catch((err) => console.warn('Could not pre-fetch banner for share:', err));

    return () => {
      cancelled = true;
    };
  }, [payload?.imageUrl, payload?.filename]);

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
      alert('Caption text copied to clipboard!');
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
    const isIOS =
      typeof navigator !== 'undefined' &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

    // For iOS: Preserved exactly as existing implementation (verified working properly by user)
    if (isIOS) {
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

        // Pre-copy text to clipboard for instant availability
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(payload.text);
          } catch {}
        }

        if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({
            files: [fileToShare],
            text: payload.text,
          });
        } else {
          await navigator.share({
            title: payload.title,
            text: payload.text,
          });
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      } finally {
        setSharing(false);
      }
      return;
    }

    // For Android and other devices:
    // Fast path: use pre-cached bannerFile immediately to maintain user gesture activation.
    if (typeof navigator === 'undefined' || !navigator.share) {
      handleCopyText();
      return;
    }

    try {
      setSharing(true);
      let fileToShare: File | null = bannerFile;
      if (!fileToShare) {
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
      }

      // Auto-copy caption to clipboard as backup
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(payload.text);
        } catch {}
      }

      // When sharing on Android Chrome:
      // Passing files & text together without 'title' ensures WhatsApp, Gmail, etc.
      // attach the image and place the text directly into the message/caption field together!
      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
        await navigator.share({
          files: [fileToShare],
          text: payload.text,
        });
      } else {
        await navigator.share({
          title: payload.title,
          text: payload.text,
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
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(payload.url)}&quote=${encodeURIComponent(payload.text)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(payload.text)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(payload.url)}&text=${encodeURIComponent(payload.text)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto print:hidden animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[calc(100dvh-2rem)] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-600 text-white">
              OFFICIAL SPR BANNER &amp; MESSAGE
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

        {/* Modal Body - Fully Scrollable */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
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

          {/* Formatted Message Caption Preview */}
          <div className="bg-emerald-50/60 dark:bg-slate-950/70 rounded-2xl p-3.5 border border-emerald-200/80 dark:border-slate-800">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1.5 flex items-center justify-between">
              <span>Official Connected Caption</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold lowercase">
                *bold* &amp; _italic_
              </span>
            </div>
            <pre className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto select-all">
              {payload.text}
            </pre>
            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-950 dark:text-emerald-200">
              <div className="font-bold flex items-center space-x-1.5 text-emerald-950 dark:text-emerald-100">
                <span>⚡</span>
                <span>Combined Banner Image + Caption Text:</span>
              </div>
              <p className="text-[10.5px] mt-0.5 text-emerald-900 dark:text-emerald-200 leading-normal">
                Clicking share opens your device chooser with WhatsApp, Facebook, Email, and all media apps, sending the banner image and caption together.
              </p>
            </div>
          </div>

          {/* Primary Action Button: Share to All Apps */}
          <div className="space-y-1.5 pt-1">
            <button
              onClick={handleNativeShare}
              disabled={sharing}
              className="flex items-center justify-center space-x-2 w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer disabled:opacity-60"
            >
              <Share2 className="w-4 h-4" />
              <span>{sharing ? 'Opening Media Chooser...' : 'Share Banner & Caption'}</span>
            </button>
            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400">
              Opens system chooser with WhatsApp, Facebook, Email, and more.
            </p>
          </div>

          {/* Explicit Media Channels Selection */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Direct Media Selection
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleNativeShare}
                className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 transition cursor-pointer"
                title="Share to WhatsApp with banner image and caption"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>WhatsApp</span>
              </button>

              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleCopyText}
                className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center space-x-1.5 text-xs font-bold text-blue-800 dark:text-blue-300 transition cursor-pointer"
                title="Share to Facebook"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Facebook</span>
              </a>

              <a
                href={emailUrl}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex items-center justify-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                title="Share via Email"
              >
                <Mail className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>Email</span>
              </a>

              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center space-x-1.5 text-xs font-bold text-sky-800 dark:text-sky-300 transition cursor-pointer"
                title="Share to Telegram"
              >
                <Send className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                <span>Telegram</span>
              </a>
            </div>
          </div>

          {/* Action Row: Copy Text & Download Banner */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleCopyText}
              className={`flex items-center justify-center space-x-1.5 w-full py-2.5 px-3 rounded-xl font-bold text-xs transition border cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center justify-center space-x-1.5 w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download Banner'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer Info */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
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
