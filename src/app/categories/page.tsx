'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

export default function CustomCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const deletableCategories = categories.filter((c) => !c.isSystem);

  const handleToggleSelectAll = () => {
    const allSelected = deletableCategories.length > 0 && deletableCategories.every((c) => selectedCategoryIds.includes(c.id));
    if (allSelected) {
      const catIdSet = new Set(deletableCategories.map((c) => c.id));
      setSelectedCategoryIds((prev) => prev.filter((id) => !catIdSet.has(id)));
    } else {
      setSelectedCategoryIds((prev) => Array.from(new Set([...prev, ...deletableCategories.map((c) => c.id)])));
    }
  };

  const handleToggleSelectCategory = (id: string) => {
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

  const handleOpenEdit = (cat: any) => {
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

  const handleDeleteCategory = async (cat: any) => {
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

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                Dynamic Architecture
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-madin-900" />
              <span>Custom Categories & Scoring Engine</span>
            </h2>
            <p className="text-xs text-slate-500">
              Create and manage performance wings (e.g. Public Speaking, Community Service, Projects) with dynamic SPR weighting.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Create New Category</span>
          </button>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}

        {/* Header buttons & Select All */}
        {deletableCategories.length > 0 && (
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">
              {deletableCategories.length} Custom Category(s) Available
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              {deletableCategories.every((c) => selectedCategoryIds.includes(c.id))
                ? 'Deselect All Custom'
                : 'Select All Custom Categories'}
            </button>
          </div>
        )}

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

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            return (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl p-5 border shadow-subtle flex flex-col justify-between space-y-4 transition-all group ${
                  isSelected ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 hover:border-madin-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {!cat.isSystem && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCategory(cat.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                        />
                      )}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cat.isSystem
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {cat.isSystem ? 'Core System' : 'Custom Category'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-madin-900 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                      {cat.defaultWeight}% SPR Weight
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 mt-2">{cat.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{cat.description || 'No description provided.'}</p>
                </div>

                {cat.subcategories && cat.subcategories.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Subcategories</div>
                    <div className="flex flex-wrap gap-1">
                      {cat.subcategories.map((sub: any) => (
                        <span key={sub.id} className="text-[11px] px-2 py-0.5 bg-white rounded border text-slate-700 font-medium">
                          {sub.name} (Max {sub.maxScore})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[10px]">{cat.code}</span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!cat.isSystem && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Performance Category' : 'Create New Performance Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Public Speaking & Debate"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Oratory skills, debates, and presentations"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SPR Weight (%) *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Include in Overall SPR</label>
                  <select
                    value={formData.includeInSPR ? 'YES' : 'NO'}
                    onChange={(e) => setFormData({ ...formData, includeInSPR: e.target.value === 'YES' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
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
                    className="text-xs font-bold text-madin-700 hover:text-madin-900"
                  >
                    + Add Item
                  </button>
                </div>

                {formData.subcategories.map((sub, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      placeholder="Subcategory Name"
                      value={sub.name}
                      onChange={(e) => {
                        const next = [...formData.subcategories];
                        next[idx].name = e.target.value;
                        setFormData({ ...formData, subcategories: next });
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:ring-1 focus:ring-madin-900"
                    />
                    <input
                      type="number"
                      placeholder="Max Score"
                      value={sub.maxScore}
                      onChange={(e) => {
                        const next = [...formData.subcategories];
                        next[idx].maxScore = Number(e.target.value);
                        setFormData({ ...formData, subcategories: next });
                      }}
                      className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-center outline-none focus:ring-1 focus:ring-madin-900"
                    />
                    {formData.subcategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSubcategoryRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 disabled:opacity-50 shadow"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create & Register Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedCategoryIds.length}</strong> selected custom category(s)? All attached subcategories and recorded performance entries will also be permanently removed.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
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
