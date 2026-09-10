'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
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
  ChevronRight,
  Compass,
  Star,
  ExternalLink,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

// Helper icon resolver for categories
export function getCategoryIcon(code: string, iconName?: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC' || c.includes('ISLAM')) return BookOpen;
  if (c === 'SCHOOL' || c.includes('ACADEMIC')) return GraduationCap;
  if (c === 'PROGRAMS' || c.includes('COMPETITION') || c.includes('SPORT')) return Trophy;
  if (c === 'CREATIVE_HUB' || c.includes('CREATIVE') || c.includes('ART')) return Sparkles;
  if (c === 'LITERARY' || c.includes('LIT') || c.includes('POEM')) return Feather;
  if (c === 'LIBRARY' || c.includes('READ')) return Library;
  if (c === 'QUALIFICATION' || c.includes('HIFZ') || c.includes('CERT')) return Award;

  if (iconName === 'BookOpen') return BookOpen;
  if (iconName === 'GraduationCap') return GraduationCap;
  if (iconName === 'Trophy') return Trophy;
  if (iconName === 'Sparkles') return Sparkles;
  if (iconName === 'Feather') return Feather;
  if (iconName === 'Library') return Library;
  if (iconName === 'Award') return Award;
  return Layers;
}

// Category theme colors
export function getCategoryColor(code: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC') return { bg: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-900 border-emerald-200', text: 'text-emerald-700', border: 'hover:border-emerald-500' };
  if (c === 'SCHOOL') return { bg: 'bg-indigo-600', light: 'bg-indigo-50 text-indigo-900 border-indigo-200', text: 'text-indigo-700', border: 'hover:border-indigo-500' };
  if (c === 'PROGRAMS') return { bg: 'bg-amber-500', light: 'bg-amber-50 text-amber-900 border-amber-200', text: 'text-amber-700', border: 'hover:border-amber-500' };
  if (c === 'CREATIVE_HUB') return { bg: 'bg-purple-600', light: 'bg-purple-50 text-purple-900 border-purple-200', text: 'text-purple-700', border: 'hover:border-purple-500' };
  if (c === 'LITERARY') return { bg: 'bg-rose-500', light: 'bg-rose-50 text-rose-900 border-rose-200', text: 'text-rose-700', border: 'hover:border-rose-500' };
  if (c === 'LIBRARY') return { bg: 'bg-teal-600', light: 'bg-teal-50 text-teal-900 border-teal-200', text: 'text-teal-700', border: 'hover:border-teal-500' };
  if (c === 'QUALIFICATION') return { bg: 'bg-blue-600', light: 'bg-blue-50 text-blue-900 border-blue-200', text: 'text-blue-700', border: 'hover:border-blue-500' };
  return { bg: 'bg-madin-900', light: 'bg-slate-100 text-slate-900 border-slate-200', text: 'text-slate-800', border: 'hover:border-madin-800' };
}

// Category direct module link resolver (if applicable)
export function getCategoryModulePath(code: string) {
  const c = code?.toUpperCase() || '';
  if (c === 'ISLAMIC') return '/academics/islamic';
  if (c === 'SCHOOL') return '/academics/school';
  if (c === 'PROGRAMS') return '/programs';
  if (c === 'CREATIVE_HUB') return '/creative-hub';
  if (c === 'LITERARY') return '/literary';
  if (c === 'LIBRARY') return '/library';
  return null;
}

export default function CategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
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

  // Navigate to category subcategory page or module
  const handleCategoryCardClick = (cat: any) => {
    const subCount = cat.subcategories?.length || cat._count?.subcategories || 0;
    const modulePath = getCategoryModulePath(cat.code);

    // If category has subcategories or is Qualification or a custom category, open its subcategories page
    if (subCount > 0 || !modulePath || cat.code === 'QUALIFICATION' || !cat.isSystem) {
      router.push(`/categories/${cat.id}`);
    } else if (modulePath) {
      router.push(modulePath);
    } else {
      router.push(`/categories/${cat.id}`);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                SPR Assessment Matrix
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">{categories.length} Total Categories</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <Layers className="w-6 h-6 text-madin-900" />
              <span>Assessment Categories & Wings</span>
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Tap any category box to explore its subcategories, record marks, and view dynamic SPR weighting.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-2xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>+ Create Category</span>
          </button>
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
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 transition"
            />
          </div>

          {deletableCategories.length > 0 && (
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition self-start sm:self-auto"
            >
              {deletableCategories.every((c) => selectedCategoryIds.includes(c.id))
                ? 'Deselect All Custom'
                : 'Select All Custom Categories'}
            </button>
          )}
        </div>

        {/* Bulk Action Toolbar */}
        {selectedCategoryIds.length > 0 && (
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
            {filteredCategories.map((cat) => {
              const IconComponent = getCategoryIcon(cat.code, cat.icon);
              const theme = getCategoryColor(cat.code);
              const isSelected = selectedCategoryIds.includes(cat.id);
              const subCount = cat.subcategories?.length || cat._count?.subcategories || 0;
              const modulePath = getCategoryModulePath(cat.code);

              return (
                <div
                  key={cat.id}
                  onClick={() => handleCategoryCardClick(cat)}
                  className={`bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border shadow-subtle hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden active:scale-98 ${
                    isSelected
                      ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-300'
                      : `border-slate-200/90 ${theme.border}`
                  }`}
                >
                  {/* Decorative Background Glow */}
                  <div
                    className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${theme.bg}`}
                  ></div>

                  {/* Top Header inside Box */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-1.5">
                      {/* Icon Avatar */}
                      <div
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105 ${theme.bg}`}
                      >
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>

                      {/* Top Badges / Selection */}
                      <div className="flex items-center space-x-1">
                        {!cat.isSystem && (
                          <div
                            onClick={(e) => handleToggleSelectCategory(cat.id, e)}
                            className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer pointer-events-none"
                            />
                          </div>
                        )}
                        <span className="text-[10px] sm:text-xs font-black font-mono text-madin-900 bg-gold-50 px-2 py-0.5 rounded-lg border border-gold-200/80">
                          {cat.defaultWeight}%
                        </span>
                      </div>
                    </div>

                    {/* Category Title & Info */}
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            cat.isSystem
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {cat.isSystem ? 'Core' : 'Custom'}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-madin-900 transition-colors line-clamp-2">
                        {cat.name}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {cat.description || 'Comprehensive evaluation assessment wing.'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer inside Box */}
                  <div className="pt-3 mt-3 border-t border-slate-100/90 flex items-center justify-between text-xs">
                    {/* Subcategories or Module Badge */}
                    <div className="flex items-center space-x-1">
                      {subCount > 0 ? (
                        <span className="text-[10px] sm:text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          {subCount} Subcategories
                        </span>
                      ) : modulePath ? (
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                          Direct Wing
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">
                          Explore Wing
                        </span>
                      )}
                    </div>

                    {/* Action Links / Chevron */}
                    <div className="flex items-center space-x-1 text-slate-400 group-hover:text-madin-900 transition-colors">
                      {!cat.isSystem && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(cat, e)}
                            className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit Category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCategory(cat, e)}
                            className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {editingCategory ? 'Edit Performance Category' : 'Create New Performance Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Public Speaking & Debate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Oratory skills, debates, and presentations"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SPR Weight (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.defaultWeight}
                    onChange={(e) => setFormData({ ...formData, defaultWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Include in SPR</label>
                  <select
                    value={formData.includeInSPR ? 'YES' : 'NO'}
                    onChange={(e) => setFormData({ ...formData, includeInSPR: e.target.value === 'YES' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    <option value="YES">Yes, Include in SPR</option>
                    <option value="NO">No, Standalone Only</option>
                  </select>
                </div>
              </div>

              {/* Subcategories */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Subcategories / Items</label>
                  <button
                    type="button"
                    onClick={handleAddSubcategoryRow}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {formData.subcategories.map((sub, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Subcategory Name (e.g. English Elocution)"
                        value={sub.name}
                        onChange={(e) => {
                          const updated = [...formData.subcategories];
                          updated[idx].name = e.target.value;
                          setFormData({ ...formData, subcategories: updated });
                        }}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={sub.maxScore}
                        onChange={(e) => {
                          const updated = [...formData.subcategories];
                          updated[idx].maxScore = Number(e.target.value);
                          setFormData({ ...formData, subcategories: updated });
                        }}
                        className="w-20 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center outline-none"
                      />
                      {formData.subcategories.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategoryRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Custom Categories Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-rose-600">{selectedCategoryIds.length}</strong> custom category(s)? Any associated subcategories and records will be purged.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {bulkDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedCategoryIds.length} Category(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
