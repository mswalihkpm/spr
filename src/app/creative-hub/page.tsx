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
  Settings2,
  Newspaper,
  Layers,
  Save,
} from 'lucide-react';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';

export default function CreativeHubPage() {
  const [activeTab, setActiveTab] = useState<'submissions' | 'masterSettings'>('submissions');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [publishedMediaList, setPublishedMediaList] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMedia, setSelectedMedia] = useState('');

  // Submit modal (simplified: Student, Creative Wing / Form, Published Media, Date, Link)
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    categoryId: '',
    publishedMediaId: '',
    publicationLink: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master Settings Modal / Form States
  const [newMediaModalOpen, setNewMediaModalOpen] = useState(false);
  const [mediaFormData, setMediaFormData] = useState({ id: '', name: '', weight: 1.0 });

  const [newFormModalOpen, setNewFormModalOpen] = useState(false);
  const [formCategoryData, setFormCategoryData] = useState({ id: '', name: '', weight: 1.0, description: '' });

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
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} creative work record(s).` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting records.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (selectedMedia) params.append('mediaId', selectedMedia);

      const [resWorks, resStudents] = await Promise.all([
        fetch(`/api/creative-hub?${params.toString()}`),
        fetch('/api/students?all=true'),
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
      if (dataWorks.publishedMedia) {
        setPublishedMediaList(dataWorks.publishedMedia);
        if (dataWorks.publishedMedia.length > 0 && !formData.publishedMediaId) {
          setFormData((prev) => ({ ...prev, publishedMediaId: dataWorks.publishedMedia[0].id }));
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
  }, [selectedCategory, selectedMedia]);

  const handleOpenCreate = () => {
    setFormData({
      studentId: students[0]?.id || '',
      categoryId: categories[0]?.id || '',
      publishedMediaId: publishedMediaList[0]?.id || '',
      publicationLink: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  // Submit creative report
  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const res = await fetch('/api/creative-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit report');

      setStatusMsg({
        type: 'success',
        text: 'Creative report successfully registered and accredited!',
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
    if (!confirm(`Delete publication record for ${work.student?.fullName}?`)) return;

    try {
      const res = await fetch(`/api/creative-hub?id=${work.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete record');

      setStatusMsg({ type: 'success', text: 'Creative publication record deleted.' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting record');
    }
  };

  // Published Media Management
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!mediaFormData.id;
      const res = await fetch('/api/creative-hub/master', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'MEDIA',
          id: mediaFormData.id,
          name: mediaFormData.name,
          weight: Number(mediaFormData.weight) || 1.0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save media');

      setStatusMsg({ type: 'success', text: `Published media ${isEdit ? 'updated' : 'added'} successfully!` });
      setNewMediaModalOpen(false);
      setMediaFormData({ id: '', name: '', weight: 1.0 });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteMedia = async (mediaId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from published media list?`)) return;
    try {
      const res = await fetch(`/api/creative-hub/master?type=MEDIA&id=${mediaId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setStatusMsg({ type: 'success', text: `Removed "${name}" from published media.` });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Creative Form Management
  const handleSaveFormCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!formCategoryData.id;
      const res = await fetch('/api/creative-hub/master', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'FORM',
          id: formCategoryData.id,
          name: formCategoryData.name,
          weight: Number(formCategoryData.weight) || 1.0,
          description: formCategoryData.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save creative form');

      setStatusMsg({ type: 'success', text: `Creative Wing / Form ${isEdit ? 'updated' : 'added'} successfully!` });
      setNewFormModalOpen(false);
      setFormCategoryData({ id: '', name: '', weight: 1.0, description: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteFormCategory = async (catId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove Creative Form "${name}"?`)) return;
    try {
      const res = await fetch(`/api/creative-hub/master?type=FORM&id=${catId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      setStatusMsg({ type: 'success', text: `Removed "${name}" from creative wings.` });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                Literary & Innovation Registry
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <span>Creative Hub & Publications Registry</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Record published student works across media and manage Creative Wing / Form weightage settings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab(activeTab === 'submissions' ? 'masterSettings' : 'submissions')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition border ${
                activeTab === 'masterSettings'
                  ? 'bg-purple-50 border-purple-300 text-purple-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Settings2 className="w-4 h-4 text-purple-700" />
              <span>{activeTab === 'masterSettings' ? 'View Submissions' : 'Admin Settings & Weightage'}</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-2xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>Add Creative Report</span>
            </button>
          </div>
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

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">
            {/* Filters bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  <option value="">All Creative Wings / Forms</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.weight}x Weight)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedMedia}
                  onChange={(e) => setSelectedMedia(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  <option value="">All Published Media</option>
                  {publishedMediaList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.weight}x Weight)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                >
                  {submissions.length > 0 && selectedSubmissionIds.length === submissions.length
                    ? 'Deselect All'
                    : 'Select All Publications'}
                </button>
              </div>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedSubmissionIds.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-rose-950">
                    {selectedSubmissionIds.length} publication record(s) selected
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
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading publications...</div>
            ) : submissions.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-700">No creative publications registered yet.</p>
                <p className="text-xs text-slate-400">Click &ldquo;Add Creative Report&rdquo; to record a student&apos;s published work.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {submissions.map((sub) => {
                  const isSelected = selectedSubmissionIds.includes(sub.id);
                  return (
                    <div
                      key={sub.id}
                      className={`bg-white rounded-3xl p-5 border shadow-sm flex flex-col justify-between space-y-4 transition-all group ${
                        isSelected ? 'border-rose-400 bg-rose-50/30' : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectSubmission(sub.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                            />
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-900 border border-purple-200">
                              {sub.category?.name || 'Creative Work'}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                            <Newspaper className="w-3 h-3 text-emerald-600" />
                            <span>{sub.publishedMediaName || 'Published Media'}</span>
                          </span>
                        </div>

                        <div>
                          <div className="font-black text-slate-900 text-sm">{sub.student?.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {sub.student?.class?.name} • SPR ID: <span className="font-mono text-slate-700">{sub.student?.studentId}</span>
                          </div>
                        </div>

                        {sub.publicationLink && (
                          <a
                            href={sub.publicationLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:underline pt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View Online Publication</span>
                          </a>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-medium text-slate-400">
                          {new Date(sub.date).toLocaleDateString()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                            {sub.percentage}% Points
                          </span>
                          <button
                            onClick={() => handleDeleteWork(sub)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete Publication"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* MASTER SETTINGS TAB */}
        {activeTab === 'masterSettings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            {/* Published Media Master Settings */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Newspaper className="w-5 h-5 text-emerald-700" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Published Media Channels</h3>
                    <p className="text-[11px] text-slate-500">Add, edit, or delete media and adjust weightage</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMediaFormData({ id: '', name: '', weight: 1.0 });
                    setNewMediaModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Media</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {publishedMediaList.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Code: {m.code}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        {m.weight}x Weight
                      </span>
                      <button
                        onClick={() => {
                          setMediaFormData({ id: m.id, name: m.name, weight: m.weight });
                          setNewMediaModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMedia(m.id, m.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creative Wings / Forms Master Settings */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-purple-700" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Creative Wings / Forms</h3>
                    <p className="text-[11px] text-slate-500">Manage literary forms (Article, Poem, etc.) and weight</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFormCategoryData({ id: '', name: '', weight: 1.0, description: '' });
                    setNewFormModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Wing / Form</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Code: {c.code}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs font-extrabold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                        {c.weight}x Weight
                      </span>
                      <button
                        onClick={() => {
                          setFormCategoryData({ id: c.id, name: c.name, weight: c.weight, description: c.description || '' });
                          setNewFormModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteFormCategory(c.id, c.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUBMIT REPORT MODAL (Clean, simplified as requested) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <h3 className="text-sm font-bold text-slate-900">Add Creative Publication Report</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="mt-4 space-y-4">
              {/* Searchable Student Selection */}
              <div>
                <SearchableStudentSelect
                  students={students}
                  value={formData.studentId}
                  onChange={(stId) => setFormData((prev) => ({ ...prev, studentId: stId }))}
                  required
                  label="Author / Student *"
                />
              </div>

              {/* Creative Wing / Form Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Creative Wing / Form *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.weight}x)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Published Media *</label>
                  <select
                    required
                    value={formData.publishedMediaId}
                    onChange={(e) => setFormData({ ...formData, publishedMediaId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    {publishedMediaList.map((media) => (
                      <option key={media.id} value={media.id}>
                        {media.name} ({media.weight}x)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Publication Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Publication Link <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formData.publicationLink}
                    onChange={(e) => setFormData({ ...formData, publicationLink: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                  />
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
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-purple-200" />
                  <span>{saving ? 'Recording...' : 'Register Publication'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MEDIA CREATE/EDIT MODAL */}
      {newMediaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {mediaFormData.id ? 'Edit Published Media' : 'Add New Published Media'}
              </h3>
              <button
                onClick={() => setNewMediaModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMedia} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Media / Newspaper Name *</label>
                <input
                  type="text"
                  required
                  value={mediaFormData.name}
                  onChange={(e) => setMediaFormData({ ...mediaFormData, name: e.target.value })}
                  placeholder="e.g. Suprabhaatham Daily, Siraj Daily"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10"
                  required
                  value={mediaFormData.weight}
                  onChange={(e) => setMediaFormData({ ...mediaFormData, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewMediaModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow"
                >
                  Save Media
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATIVE FORM CREATE/EDIT MODAL */}
      {newFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {formCategoryData.id ? 'Edit Creative Wing / Form' : 'Add Creative Wing / Form'}
              </h3>
              <button
                onClick={() => setNewFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFormCategory} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Form Name *</label>
                <input
                  type="text"
                  required
                  value={formCategoryData.name}
                  onChange={(e) => setFormCategoryData({ ...formCategoryData, name: e.target.value })}
                  placeholder="e.g. Feature Article, Research Essay"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weightage Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="10"
                  required
                  value={formCategoryData.weight}
                  onChange={(e) => setFormCategoryData({ ...formCategoryData, weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 shadow"
                >
                  Save Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
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
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedSubmissionIds.length}</strong> selected creative publication records?
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete {selectedSubmissionIds.length} Record(s)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
