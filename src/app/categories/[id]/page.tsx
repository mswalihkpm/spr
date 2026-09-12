'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  Trophy,
  Search,
  Award,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';
import { getCategoryIcon, getCategoryColor, getCategoryLogo, getCategoryDualLogos } from '@/lib/category-utils';

export default function PublicCategorySubcategoriesPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;

  const [category, setCategory] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load category details and subcategories
  const loadData = async () => {
    if (!categoryId) return;
    try {
      setLoading(true);

      const [catRes, subRes] = await Promise.all([
        fetch(`/api/categories?id=${categoryId}`),
        fetch(`/api/subcategories?categoryId=${categoryId}`),
      ]);

      const catData = await catRes.json();
      const subData = await subRes.json();

      let resolvedCategory = null;
      if (catData.category) {
        resolvedCategory = catData.category;
      } else if (catData.categories && catData.categories.length > 0) {
        resolvedCategory = catData.categories.find(
          (c: any) => c.id === categoryId || c.code === categoryId.toUpperCase()
        );
      }
      setCategory(resolvedCategory);

      // If category is CREATIVE_HUB or direct wing with no subcategories, redirect directly to its leaderboard
      if (resolvedCategory?.code === 'CREATIVE_HUB' || categoryId?.toUpperCase() === 'CREATIVE_HUB') {
        router.replace(`/leaderboard?categoryId=${resolvedCategory?.id || categoryId}`);
        return;
      }

      let subsList: any[] = [];
      if (subData.subcategories && subData.subcategories.length > 0) {
        subsList = subData.subcategories;
      } else if (resolvedCategory?.subcategories && resolvedCategory.subcategories.length > 0) {
        subsList = resolvedCategory.subcategories;
      }

      setSubcategories(subsList);
    } catch (err) {
      console.error('Error loading category subcategories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const filteredSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    const q = searchQuery.toLowerCase().trim();
    return subcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subcategories, searchQuery]);

  const IconComponent = category ? getCategoryIcon(category.code, category.icon) : Layers;
  const theme = category ? getCategoryColor(category.code) : { bg: 'bg-madin-900', light: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };
  const dualLogos = category ? getCategoryDualLogos(category.code) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Universal Public Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/categories"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 flex items-center space-x-1.5"
              title="Return to Categories"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">All Categories</span>
            </Link>
            <div className="flex items-center space-x-2.5">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${theme.bg}`}>
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                  {category?.name || 'Category Subcategories'}
                </h1>
                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                  Subcategory Standings & Leaderboards
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/leaderboard?cat=${category?.id || categoryId}`}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-xs"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Wing Leaderboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {/* Category Banner Card */}
        {category && (
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-madin-950 text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-400/20 text-gold-300 border border-gold-400/30">
                    Category: {category.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                    SPR Weight: {category.defaultWeight}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {subcategories.length} Subcategories
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {category.name}
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  {category.description || 'Specialized subcategories, assessment criteria, and dedicated student leaderboards.'}
                </p>
              </div>

              {/* Dual Logo or Single Logo Header Preview */}
              {dualLogos && dualLogos.length >= 2 ? (
                <div className="flex items-center space-x-2 bg-white/10 p-2 rounded-2xl border border-white/10 shrink-0 self-start md:self-center">
                  <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                    <img src={dualLogos[0]} alt="Logo 1" className="w-full h-full object-contain" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden shadow-xs">
                    <img src={dualLogos[1]} alt="Logo 2" className="w-full h-full object-contain" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/categories"
                    className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5 border border-white/10"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Categories</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search & Counter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subcategories..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredSubcategories.length} Subcategories
            </span>
          </div>
        </div>

        {/* SUBCATEGORIES GRID (RESPONSIVE BOXES) */}
        {loading ? (
          <div className="py-16 text-center">
            <VideoLoader size="md" text="Loading Subcategories..." subtext="Accessing Assessment Wings" />
          </div>
        ) : filteredSubcategories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No subcategories found</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No specialized subcategories are registered under this category yet. You can still view overall wing standings.
            </p>
            <Link
              href={`/leaderboard?cat=${category?.id || categoryId}`}
              className="mt-3 inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow hover:bg-blue-700 transition"
            >
              <Trophy className="w-4 h-4 text-amber-300" />
              <span>View Category Leaderboard</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredSubcategories.map((sub) => {
              const subLogo = getCategoryLogo(sub.code, sub.logoUrl);

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    router.push(`/leaderboard?subcategoryId=${sub.id}&categoryId=${category?.id || categoryId}`);
                  }}
                  className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-lg hover:border-blue-500 transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden active:scale-98"
                >
                  {/* Decorative Background Glow */}
                  <div
                    className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${theme.bg}`}
                  ></div>

                  {/* Top Header inside Box */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {/* Logo Avatar Badge */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 p-1.5 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                        {subLogo ? (
                          <img
                            src={subLogo}
                            alt={sub.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-xl flex items-center justify-center text-white ${theme.bg}`}>
                            <Award className="w-5 h-5" />
                          </div>
                        )}
                      </div>

                      {/* Standings Pill */}
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200/80">
                        Leaderboard
                      </span>
                    </div>

                    {/* Subcategory Title & Description */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {sub.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description || 'Specialized assessment criteria and institutional standings.'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer inside Box */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                    <span className="text-[11px] font-bold text-slate-400">
                      Standings Registry
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/leaderboard?subcategoryId=${sub.id}&categoryId=${category?.id || categoryId}`);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-xs group-hover:translate-x-0.5"
                    >
                      <span>Open Leaderboard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
