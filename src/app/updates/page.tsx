'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bell,
  ArrowLeft,
  Calendar,
  Sparkles,
  Share2,
  X,
  Search,
  ExternalLink,
  ChevronRight,
  Clock,
  Megaphone,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function UpdatesPublicPage() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNews, setSelectedNews] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        if (data.news) setNewsList(data.news);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredNews = newsList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.subtitle?.toLowerCase().includes(q) ||
      item.body?.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handleShare = (newsItem: any) => {
    if (navigator.share) {
      navigator.share({
        title: newsItem.title,
        text: newsItem.subtitle || newsItem.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Return to Standings"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center shrink-0 shadow">
                <Megaphone className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-tight">
                  News & Official Updates
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">Madin School of Excellence Broadcasts</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="px-3.5 py-1.5 rounded-xl bg-madin-900 text-white text-xs font-bold shadow hover:bg-madin-950 transition"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="relative rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-madin-950 text-white p-6 sm:p-8 overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-gold-400" />
              <span>Real-time Announcements</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              Latest Happenings, Festivals & Assessment Circulars
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Stay up-to-date with competitive festival schedules, term assessment scores, literary selections, and institutional excellence bulletins.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative z-10 mt-5 max-w-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search updates, announcements..."
                className="w-full pl-9 pr-4 py-2.5 bg-white text-slate-900 rounded-2xl text-xs font-medium shadow-md outline-none focus:ring-2 focus:ring-gold-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Updates Content Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="py-24 flex items-center justify-center">
            <VideoLoader size="xl" text="Fetching latest updates..." subtext="Accessing institutional broadcast network" />
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center max-w-md mx-auto border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Announcements Found</h3>
            <p className="text-xs text-slate-500">
              {searchQuery ? `No updates matched "${searchQuery}"` : 'There are currently no published announcements.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNews.map((item, idx) => (
              <article
                key={item.id}
                onClick={() => setSelectedNews(item)}
                className="group bg-white rounded-3xl border border-slate-200 hover:border-blue-500 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Photo thumbnail */}
                  {item.imageUrl ? (
                    <div className="relative w-full h-48 bg-slate-100 overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-500"
                        unoptimized
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/90 text-blue-900 backdrop-blur-md shadow-xs flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>{formatDate(item.publishedAt)}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 pb-0 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>{formatDate(item.publishedAt)}</span>
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">#UPDATE-{idx + 1}</span>
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition leading-snug">
                      {item.title}
                    </h3>
                    {item.subtitle && (
                      <h4 className="text-xs font-semibold text-blue-700/90 leading-relaxed">
                        {item.subtitle}
                      </h4>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                  <span className="group-hover:underline">Read Full Announcement</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Full News Reader Modal */}
      {selectedNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-zoom-up">
            {/* Modal Image Header */}
            {selectedNews.imageUrl && (
              <div className="relative w-full h-64 sm:h-80 bg-slate-100">
                <Image
                  src={selectedNews.imageUrl}
                  alt={selectedNews.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  onClick={() => setSelectedNews(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="p-6 sm:p-8 space-y-4">
              {!selectedNews.imageUrl && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>{formatDate(selectedNews.publishedAt)}</span>
                  </span>
                  <button
                    onClick={() => setSelectedNews(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {selectedNews.imageUrl && (
                <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Published on {formatDate(selectedNews.publishedAt)}</span>
                </div>
              )}

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {selectedNews.title}
                </h2>
                {selectedNews.subtitle && (
                  <h3 className="text-sm font-semibold text-blue-700 mt-1">
                    {selectedNews.subtitle}
                  </h3>
                )}
              </div>

              {/* Full Body */}
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4">
                {selectedNews.body}
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleShare(selectedNews)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Update</span>
                </button>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="px-5 py-2 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
