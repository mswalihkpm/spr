'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  Share2,
  X,
  Megaphone,
  Check,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

export interface NewsItem {
  id: string;
  title: string;
  subtitle?: string | null;
  body: string;
  imageUrl?: string | null;
  publishedAt: string | Date;
  active?: boolean;
}

interface NewsDetailModalProps {
  news: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsDetailModal({ news, isOpen, onClose }: NewsDetailModalProps) {
  const [copied, setCopied] = useState(false);

  // Close on Escape key and prevent background scrolling
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !news) return null;

  const formatDate = (dateStr: string | Date) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return String(dateStr);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: news.title,
      text: news.subtitle || news.title,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard if share was cancelled or failed
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-fade-in print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative my-6 animate-zoom-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* News Hero Image */}
        {news.imageUrl ? (
          <div className="relative w-full h-56 sm:h-80 bg-slate-900 shrink-0 overflow-hidden">
            <Image
              src={news.imageUrl}
              alt={news.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
            {/* Subtle Gradient Shadow on top for close button readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40 pointer-events-none" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/85 text-white backdrop-blur-md transition hover:scale-105 active:scale-95 shadow-md z-10"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Floating Date Badge on Image */}
            <div className="absolute bottom-4 left-4">
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/95 text-slate-900 backdrop-blur-md shadow-md flex items-center space-x-1.5 border border-white/50">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatDate(news.publishedAt)}</span>
              </span>
            </div>
          </div>
        ) : (
          /* Header when no image */
          <div className="p-6 pb-0 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center space-x-1.5">
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Official Circular</span>
              </span>
              <span className="text-xs text-slate-500 font-medium flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formatDate(news.publishedAt)}</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
              title="Close"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-5 flex-1">
          {/* Header Title & Subtitle */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {news.title}
            </h2>

            {news.subtitle && (
              <div className="p-3 rounded-2xl bg-blue-50/90 border border-blue-100">
                <p className="text-xs sm:text-sm font-bold text-blue-800 leading-relaxed">
                  {news.subtitle}
                </p>
              </div>
            )}
          </div>

          {/* Full News Body Text */}
          <div className="border-t border-slate-100 pt-4">
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium space-y-3">
              {news.body}
            </div>
          </div>

          {/* Action Bar Footer */}
          <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={handleShare}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition hover:scale-105 active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Share Circular</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
