'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Sliders,
  Check,
  Search,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Compass,
  Star,
  ExternalLink,
  Lock,
  Megaphone,
  ShieldAlert,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { getAcademicMasterData } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';
import PublicFooter from '@/components/layout/PublicFooter';
import { getCategoryIcon, getCategoryColor, getCategoryLogo, getCategoryDualLogos, getCategoryModulePath } from '@/lib/category-utils';
import { useAppBootstrap } from '@/context/AppBootstrapContext';

export default function CategoriesPage() {
  const router = useRouter();
  const { categories: bootstrapCategories, academicData: bootstrapAcademic, isBootstrapped } = useAppBootstrap();

  const [categories, setCategories] = useState<any[]>(() => {
    if (bootstrapCategories && bootstrapCategories.length > 0) return bootstrapCategories;
    if (bootstrapAcademic?.categories && bootstrapAcademic.categories.length > 0) return bootstrapAcademic.categories;
    return [];
  });
  const [loading, setLoading] = useState(() => (bootstrapCategories && bootstrapCategories.length > 0 ? false : true));
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Sync with bootstrap data
  useEffect(() => {
    if (bootstrapCategories && bootstrapCategories.length > 0) {
      setCategories(bootstrapCategories);
      setLoading(false);
    }
  }, [bootstrapCategories]);

  // Modal State for Admin Management
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Award',
    defaultWeight: 10,
    includeInSPR: true,
    subcategories: [{ id: '', name: 'General Assessment', maxScore: 100 }],
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check auth silently
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const fetchCategories = async (silent = false) => {
    try {
      if (!silent && categories.length === 0) setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(categories.length > 0);
  }, []);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      icon: 'Award',
      defaultWeight: 10,
      includeInSPR: true,
      subcategories: [{ id: '', name: 'General Assessment', maxScore: 100 }],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || 'Award',
      defaultWeight: cat.defaultWeight,
      includeInSPR: cat.includeInSPR,
      subcategories:
        cat.subcategories && cat.subcategories.length > 0
          ? cat.subcategories.map((s: any) => ({ id: s.id, name: s.name, maxScore: s.maxScore }))
          : [{ id: '', name: 'General Assessment', maxScore: 100 }],
    });
    setModalOpen(true);
  };

  const handleAddSubcategoryRow = () => {
    setFormData((prev) => ({
      ...prev,
      subcategories: [...prev.subcategories, { id: '', name: '', maxScore: 100 }],
    }));
  };

  const handleRemoveSubcategoryRow = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      subcategories: prev.subcategories.filter((_, i) => i !== index),
    }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const method = editingCategory ? 'PUT' : 'POST';
      const payload = editingCategory
        ? { id: editingCategory.id, ...formData }
        : formData;

      const res = await fetch('/api/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save category.');

      setStatusMsg({
        type: 'success',
        text: `Category "${formData.name}" ${editingCategory ? 'updated' : 'created'} successfully!`,
      });
      setModalOpen(false);
      fetchCategories(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Direct click on category opens its Subcategories Page if it has subcategories, or directly opens its leaderboard
  const handleCategoryCardClick = (cat: any) => {
    const subCount = cat.subcategories?.length || cat._count?.subcategories || 0;
    if (subCount > 0 && cat.code !== 'CREATIVE_HUB') {
      router.push(`/categories/${cat.id}`);
    } else {
      router.push(`/leaderboard?categoryId=${cat.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080e1e] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased transition-colors duration-300">
      {/* Top Universal Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/70 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95"
              title="Return to Standings"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-slate-900 p-0.5 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 shadow-xs">
                <Image
                  src="/logo.png"
                  alt="Madin School of Excellence"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                  EXCELLENCE
                </h1>
                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mt-0.5">
                  SPR Assessment Wings
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/leaderboard"
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Leaderboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {/* Hero Section */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-madin-950 text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5 text-gold-400" />
              <span>SPR Assessment Matrix</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Evaluation Categories & Wings
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Tap any category box below to open its dedicated leaderboard, or select a subcategory badge to view discipline standings.
            </p>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xs animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category wings..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
              {filteredCategories.length} Categories
            </span>
          </div>
        </div>


        {/* CATEGORIES GRID: 2 IN ONE ROW ON MOBILE */}
        {loading ? (
          <div className="py-16 text-center">
            <VideoLoader size="lg" text="Loading Categories & Wings..." subtext="Accessing SPR Assessment Wings and Scoring Weightages" showProgress={true} />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300">No categories found</div>
            <p className="text-xs text-slate-400 dark:text-slate-500">Try adjusting your search filter or create a new custom category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const IconComponent = getCategoryIcon(cat.code, cat.icon);
              const catLogo = getCategoryLogo(cat.code, cat.logoUrl);
              const theme = getCategoryColor(cat.code);
              const subCount = cat.subcategories?.length || cat._count?.subcategories || 0;

              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryCardClick(cat)}
                  className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border shadow-subtle hover:shadow-lg transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden active:scale-98 border-slate-200/90 dark:border-slate-800 ${theme.border}`}
                >
                  {/* Decorative Background Glow */}
                  <div
                    className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${theme.bg}`}
                  ></div>

                  {/* Top Header inside Box */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {/* Authentic Category Logo Avatar or Icon */}
                      {getCategoryDualLogos(cat.code) ? (
                        <div className="flex items-center space-x-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                          {getCategoryDualLogos(cat.code)!.map((logo, idx) => (
                            <div key={idx} className="w-9 h-9 rounded-xl overflow-hidden p-0.5 flex items-center justify-center bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                              <img
                                src={logo}
                                alt={`${cat.name} emblem ${idx + 1}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                        >
                          {catLogo ? (
                            <img
                              src={catLogo}
                              alt={cat.name}
                              className="w-full h-full object-contain p-0.5"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full rounded-xl flex items-center justify-center text-white ${theme.bg}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className={`w-full h-full rounded-xl flex items-center justify-center text-white ${theme.bg}`}>
                              <IconComponent className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {cat.defaultWeight}%
                        </span>
                      </div>
                    </div>

                    {/* Category Title & Description */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cat.description || (cat.isSystem ? 'Core system assessment wing' : 'Custom assessment category')}
                      </p>
                    </div>

                    {/* Subcategories Logos & Badges rendered right on the main category box (Except Creative Hub which is a direct wing) */}
                    {cat.code !== 'CREATIVE_HUB' && cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Subcategories</span>
                          <Link
                            href={`/categories/${cat.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-0.5 normal-case font-bold"
                          >
                            <span>Explore All</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subcategories.map((sub: any) => {
                            const subEmblem = getCategoryLogo(sub.code, sub.logoUrl);
                            return (
                              <button
                                key={sub.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/leaderboard?subcategoryId=${sub.id}&categoryId=${cat.id}`);
                                }}
                                title={`View ${sub.name} Leaderboard`}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 hover:border-blue-300 text-slate-800 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 text-[11px] font-bold transition active:scale-95 shadow-2xs"
                              >
                                {subEmblem ? (
                                  <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 border border-slate-200/60 p-0.5 flex items-center justify-center">
                                    <img src={subEmblem} alt={sub.name} className="w-full h-full object-contain" />
                                  </div>
                                ) : (
                                  <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                                <span className="truncate max-w-[130px]">{sub.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer inside Box */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    {cat.code !== 'CREATIVE_HUB' && subCount > 0 ? (
                      <Link
                        href={`/categories/${cat.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-xl border border-blue-200/80 dark:border-blue-800 transition"
                      >
                        <span>{subCount} Subcategories</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-100 dark:border-slate-750">
                        Direct Wing
                      </span>
                    )}

                    <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold">
                      <span className="text-[11px] group-hover:underline">Open Leaderboard</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Public Footer & Mobile Bottom Navigation */}
      <PublicFooter />

      {/* Admin Add/Edit Category Modal */}
      {isAdmin && modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {editingCategory ? 'Edit Category' : 'Create Custom Category'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">Configure Category details and subcategories</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Robotics & AI Club"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the assessment scope..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Default SPR Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.defaultWeight}
                    onChange={(e) => setFormData({ ...formData, defaultWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Icon</label>
                  <CustomSelect
                    value={formData.icon}
                    onChange={(val) => setFormData({ ...formData, icon: val })}
                    options={[
                      { value: 'Award', label: 'Award (Default)' },
                      { value: 'Trophy', label: 'Trophy / Sports' },
                      { value: 'Sparkles', label: 'Sparkles / Arts' },
                      { value: 'BookOpen', label: 'Book / Academic' },
                      { value: 'GraduationCap', label: 'Graduation Cap' },
                      { value: 'Feather', label: 'Feather / Literary' },
                      { value: 'Library', label: 'Library' },
                    ]}
                  />
                </div>
              </div>

              {/* Subcategories Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <span>Subcategories</span>
                    <span className="text-[10px] text-slate-400 font-normal">({formData.subcategories.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubcategoryRow}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Subcategory</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formData.subcategories.map((sub, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        required
                        placeholder="Subcategory Name"
                        value={sub.name}
                        onChange={(e) => {
                          const updated = [...formData.subcategories];
                          updated[idx].name = e.target.value;
                          setFormData({ ...formData, subcategories: updated });
                        }}
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-madin-900"
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="Max"
                        value={sub.maxScore}
                        onChange={(e) => {
                          const updated = [...formData.subcategories];
                          updated[idx].maxScore = parseFloat(e.target.value) || 100;
                          setFormData({ ...formData, subcategories: updated });
                        }}
                        className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none text-center"
                        title="Max Score"
                      />
                      {formData.subcategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Remove"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white font-bold transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
