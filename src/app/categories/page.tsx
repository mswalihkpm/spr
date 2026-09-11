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
import PublicFooter from '@/components/layout/PublicFooter';
import { getCategoryIcon, getCategoryColor, getCategoryLogo, getCategoryModulePath } from '@/lib/category-utils';

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState<any | null>(null);

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

  // Bulk selection & deletion state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const deletableCategories = categories.filter((c) => !c.isSystem);

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

  const handleToggleSelectAll = () => {
    const allSelected =
      deletableCategories.length > 0 &&
      deletableCategories.every((c) => selectedCategoryIds.includes(c.id));
    if (allSelected) {
      const catIdSet = new Set(deletableCategories.map((c) => c.id));
      setSelectedCategoryIds((prev) => prev.filter((id) => !catIdSet.has(id)));
    } else {
      setSelectedCategoryIds((prev) =>
        Array.from(new Set([...prev, ...deletableCategories.map((c) => c.id)]))
      );
    }
  };

  const handleToggleSelectCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedCategoryIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryIds: selectedCategoryIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete categories.');

      const count = selectedCategoryIds.length;
      setSelectedCategoryIds([]);
      setConfirmBulkDeleteOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} custom category(s).` });
      fetchCategories();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting categories.' });
    } finally {
      setBulkDeleting(false);
    }
  };

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
      fetchCategories();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (cat.isSystem) {
      alert('Core system categories cannot be deleted.');
      return;
    }

    if (!confirm(`Are you sure you want to delete custom category "${cat.name}"?`)) return;

    try {
      const res = await fetch(`/api/categories?id=${cat.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete category');

      setStatusMsg({ type: 'success', text: `Category "${cat.name}" deleted.` });
      fetchCategories();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Direct click on category opens its Leaderboard
  const handleCategoryCardClick = (cat: any) => {
    router.push(`/leaderboard?categoryId=${cat.id}`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Top Universal Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95"
              title="Return to Standings"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-0.5 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                <Image
                  src="/logo.png"
                  alt="Madin School of Excellence"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                  MADIN EXCELLENCE
                </h1>
                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                  SPR Assessment Wings
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/leaderboard"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Leaderboard</span>
            </Link>

            {isAdmin ? (
              <button
                onClick={handleOpenCreate}
                className="px-3.5 py-1.5 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>+ Add Category</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-bold flex items-center space-x-1 transition"
                title="Staff Login"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Staff</span>
              </Link>
            )}
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
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category wings..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredCategories.length} Categories
            </span>

            {isAdmin && deletableCategories.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                {deletableCategories.every((c) => selectedCategoryIds.includes(c.id))
                  ? 'Deselect All Custom'
                  : 'Select All Custom'}
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar (Admin Only) */}
        {isAdmin && selectedCategoryIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedCategoryIds.length} custom category(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedCategoryIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* CATEGORIES GRID: 2 IN ONE ROW ON MOBILE */}
        {loading ? (
          <div className="py-16 text-center">
            <VideoLoader size="md" text="Loading Categories..." subtext="Accessing SPR Assessment Wings" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 space-y-2">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No categories found</div>
            <p className="text-xs text-slate-400">Try adjusting your search filter or create a new custom category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((cat) => {
              const IconComponent = getCategoryIcon(cat.code, cat.icon);
              const catLogo = getCategoryLogo(cat.code, cat.icon);
              const theme = getCategoryColor(cat.code);
              const isSelected = selectedCategoryIds.includes(cat.id);
              const subCount = cat.subcategories?.length || cat._count?.subcategories || 0;

              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryCardClick(cat)}
                  className={`bg-white rounded-3xl p-5 border shadow-subtle hover:shadow-lg transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden active:scale-98 ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-300'
                      : `border-slate-200/90 ${theme.border}`
                  }`}
                >
                  {/* Decorative Background Glow */}
                  <div
                    className={`absolute -right-8 -bottom-8 w-28 h-28 rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${theme.bg}`}
                  ></div>

                  {/* Top Header inside Box */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      {/* Authentic Category Logo Avatar or Icon */}
                      <div
                        className="w-12 h-12 rounded-2xl bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden"
                      >
                        {catLogo ? (
                          <img
                            src={catLogo}
                            alt={cat.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-xl flex items-center justify-center text-white ${theme.bg}`}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Top Badges / Selection */}
                      <div className="flex items-center space-x-1.5">
                        {isAdmin && !cat.isSystem && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleSelectCategory(cat.id, e as any)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                          />
                        )}

                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                          {cat.defaultWeight}%
                        </span>
                      </div>
                    </div>

                    {/* Category Title & Description */}
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {cat.description || (cat.isSystem ? 'Core system assessment wing' : 'Custom assessment category')}
                      </p>
                    </div>

                    {/* Subcategories Logos & Badges rendered right on the main category box */}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pt-2.5 border-t border-slate-100 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          <span>Subcategories</span>
                          <Link
                            href={`/categories/${cat.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline flex items-center space-x-0.5 normal-case font-bold"
                          >
                            <span>Explore All</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.subcategories.map((sub: any) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/leaderboard?subcategoryId=${sub.id}&categoryId=${cat.id}`);
                              }}
                              title={`View ${sub.name} Leaderboard`}
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-blue-700 text-[11px] font-bold transition active:scale-95 shadow-2xs"
                            >
                              {sub.logoUrl ? (
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-white shrink-0 border border-slate-200/60 p-0.5">
                                  <img src={sub.logoUrl} alt={sub.name} className="w-full h-full object-contain" />
                                </div>
                              ) : (
                                <Award className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                              <span className="truncate max-w-[120px]">{sub.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer inside Box */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {subCount > 0 ? (
                      <Link
                        href={`/categories/${cat.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl border border-blue-200/80 transition"
                      >
                        <span>{subCount} Subcategories</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                        {cat.isSystem ? 'Direct Wing' : '0 Subcategories'}
                      </span>
                    )}

                    <div className="flex items-center space-x-2 text-blue-600 font-bold">
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
                  <select
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    <option value="Award">Award (Default)</option>
                    <option value="Trophy">Trophy / Sports</option>
                    <option value="Sparkles">Sparkles / Arts</option>
                    <option value="BookOpen">Book / Academic</option>
                    <option value="GraduationCap">Graduation Cap</option>
                    <option value="Feather">Feather / Literary</option>
                    <option value="Library">Library</option>
                  </select>
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

      {/* Confirm Bulk Delete Modal (Admin Only) */}
      {isAdmin && confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Confirm Bulk Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong className="text-rose-600">{selectedCategoryIds.length}</strong> custom categories and their subcategories?
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-sm"
              >
                {bulkDeleting ? 'Deleting...' : 'Delete Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
