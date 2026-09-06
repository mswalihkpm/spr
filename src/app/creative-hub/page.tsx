'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sparkles,
  Plus,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Star,
  Award,
  Edit2,
  Trash2,
} from 'lucide-react';

export default function CreativeHubPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Submit/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    categoryId: '',
    title: '',
    content: '',
    score: '90',
    maxScore: '100',
    reviewer: 'Chief Editor, MSOE Creative Wing',
    remarks: '',
    publicationStatus: 'PUBLISHED',
    publicationLink: '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk selection & deletion state
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const handleToggleSelectAll = () => {
    if (selectedSubmissionIds.length === submissions.length) {
      setSelectedSubmissionIds([]);
    } else {
      setSelectedSubmissionIds(submissions.map((s) => s.id));
    }
  };

  const handleToggleSelectSubmission = (id: string) => {
    setSelectedSubmissionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissionIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/creative-hub', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedSubmissionIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete submissions.');

      const count = selectedSubmissionIds.length;
      setSelectedSubmissionIds([]);
      setConfirmBulkDeleteOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} creative work submission(s).` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting submissions.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedStatus) params.append('status', selectedStatus);

      const [resWorks, resStudents] = await Promise.all([
        fetch(`/api/creative-hub?${params.toString()}`),
        fetch('/api/students?limit=100'),
      ]);

      const dataWorks = await resWorks.json();
      const dataStudents = await resStudents.json();

      if (dataWorks.submissions) setSubmissions(dataWorks.submissions);
      if (dataWorks.categories) {
        setCategories(dataWorks.categories);
        if (dataWorks.categories.length > 0 && !formData.categoryId) {
          setFormData((prev) => ({ ...prev, categoryId: dataWorks.categories[0].id }));
        }
      }
      if (dataStudents.students) {
        setStudents(dataStudents.students);
        if (dataStudents.students.length > 0 && !formData.studentId) {
          setFormData((prev) => ({ ...prev, studentId: dataStudents.students[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingWork(null);
    setFormData({
      studentId: students[0]?.id || '',
      categoryId: categories[0]?.id || '',
      title: '',
      content: '',
      score: '90',
      maxScore: '100',
      reviewer: 'Chief Editor, MSOE Creative Wing',
      remarks: '',
      publicationStatus: 'PUBLISHED',
      publicationLink: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (work: any) => {
    setEditingWork(work);
    setFormData({
      studentId: work.studentId,
      categoryId: work.categoryId,
      title: work.title,
      content: work.content || '',
      score: String(work.score),
      maxScore: String(work.maxScore),
      reviewer: work.reviewer || 'Chief Editor, MSOE Creative Wing',
      remarks: work.remarks || '',
      publicationStatus: work.publicationStatus || 'PUBLISHED',
      publicationLink: work.publicationLink || '',
    });
    setModalOpen(true);
  };

  const handleSaveWork = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const method = editingWork ? 'PUT' : 'POST';
      const body = editingWork ? { id: editingWork.id, ...formData } : formData;

      const res = await fetch('/api/creative-hub', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save work');

      setStatusMsg({
        type: 'success',
        text: `Creative work ${editingWork ? 'updated' : 'submitted and scored'} successfully!`,
      });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = async (work: any) => {
    if (!confirm(`Delete submission "${work.title}" by ${work.student?.fullName}?`)) return;

    try {
      const res = await fetch(`/api/creative-hub?id=${work.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete submission');

      setStatusMsg({ type: 'success', text: 'Creative work deleted.' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting work');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300">
                Literary & Innovation Registry
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <span>Creative Hub Submissions & Accreditations</span>
            </h2>
            <p className="text-xs text-slate-500">
              Submit, review, score, publish, and edit poems, stories, articles, letters, and research projects.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
          >
            <Plus className="w-4 h-4 text-gold-400" />
            <span>Submit Creative Work</span>
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

        {/* Filters bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-madin-900"
            >
              <option value="">All Creative Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-madin-900"
            >
              <option value="">All Publication Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="FEATURED">Featured in Magazine</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition text-center"
            >
              {submissions.length > 0 && selectedSubmissionIds.length === submissions.length
                ? 'Deselect All'
                : 'Select All Works'}
            </button>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-400">
            <span>Showing {submissions.length} submissions</span>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedSubmissionIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedSubmissionIds.length} creative work(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedSubmissionIds([])}
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
                <span>Delete Selected ({selectedSubmissionIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Submissions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {submissions.map((sub) => {
            const isSelected = selectedSubmissionIds.includes(sub.id);
            return (
              <div
                key={sub.id}
                className={`bg-white rounded-2xl p-5 border shadow-subtle flex flex-col justify-between space-y-4 transition-all group ${
                  isSelected ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectSubmission(sub.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                      />
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        {sub.category?.name || 'Creative'}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        sub.publicationStatus === 'FEATURED'
                          ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                          : sub.publicationStatus === 'PUBLISHED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sub.publicationStatus}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 line-clamp-1">{sub.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{sub.content || 'No text snippet provided.'}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{sub.student?.fullName}</div>
                      <div className="text-[10px] text-slate-400">{sub.student?.class?.name}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-purple-900">
                        {sub.maxScore > 0 ? ((sub.score / sub.maxScore) * 100).toFixed(1) : Number(sub.score || 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
                    <span className="text-[10px]">{new Date(sub.date).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                        title="Edit Submission"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWork(sub)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingWork ? 'Edit Creative Work' : 'Submit & Score Creative Work'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveWork} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Author / Student *</label>
                <select
                  required
                  disabled={!!editingWork}
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 disabled:opacity-60"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName} — {st.class?.name} (Div {st.division || 'A'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Creative Wing / Form *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Status</label>
                  <select
                    value={formData.publicationStatus}
                    onChange={(e) => setFormData({ ...formData, publicationStatus: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="FEATURED">Featured in Magazine</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Work Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Whispers of the River / Al-Ameen Research"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Excerpt / Content Summary</label>
                <textarea
                  rows={3}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Brief extract, poem stanza, or review summary..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Score *</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.maxScore}
                    required
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maximum Score</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.maxScore}
                    onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Editorial Remarks</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Exceptional imagery and vocabulary"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
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
                  {saving ? 'Saving...' : editingWork ? 'Save Changes' : 'Submit & Accredit Work'}
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
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedSubmissionIds.length}</strong> selected creative work submission(s)? Student aggregate points and showcase portfolio dossiers will update automatically.
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
                    <span>Delete {selectedSubmissionIds.length} Submission(s)</span>
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
