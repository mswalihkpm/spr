'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Upload,
  Eye,
  ExternalLink,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function AdminNewsManagementPage() {
  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk deletion state
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    body: '',
    imageUrl: '',
    publishedAt: new Date().toISOString().slice(0, 10),
    active: true,
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news?all=true');
      const data = await res.json();
      if (data.news) setNewsList(data.news);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to load news updates.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleToggleSelectNews = (id: string) => {
    setSelectedNewsIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = newsList.length > 0 && newsList.every((item) => selectedNewsIds.includes(item.id));
    if (allSelected) {
      setSelectedNewsIds([]);
    } else {
      setSelectedNewsIds(newsList.map((item) => item.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNewsIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/news', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedNewsIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete news announcements.');

      const count = selectedNewsIds.length;
      setSelectedNewsIds([]);
      setConfirmBulkDeleteOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} news announcement(s).` });
      fetchNews();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting news announcements.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      subtitle: '',
      body: '',
      imageUrl: '',
      publishedAt: new Date().toISOString().slice(0, 10),
      active: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      subtitle: item.subtitle || '',
      body: item.body || '',
      imageUrl: item.imageUrl || '',
      publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      active: item.active !== false,
    });
    setModalOpen(true);
  };

  // Upload image from PC
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional upload via API or convert to compressed base64 data URL
    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setFormData((prev) => ({ ...prev, imageUrl: data.url }));
          return;
        }
      }

      // Fallback to FileReader base64
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Image upload fallback to base64', err);
      const reader = new FileReader();
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch('/api/news', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save news.');

      setStatusMsg({
        type: 'success',
        text: `News update ${editingId ? 'updated' : 'published'} successfully!`,
      });
      setModalOpen(false);
      fetchNews();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete news announcement "${item.title}"?`)) return;

    try {
      const res = await fetch(`/api/news?id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete news.');

      setSelectedNewsIds((prev) => prev.filter((id) => id !== item.id));
      setStatusMsg({ type: 'success', text: 'Announcement deleted.' });
      fetchNews();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting announcement.' });
    }
  };


  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                Broadcast & Communications
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <span>News, Circulars & Announcements Management</span>
            </h2>
            <p className="text-xs text-slate-500">
              Publish news, upload photos from PC, and push bulletins to the public portal and mobile app.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href="/updates"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Eye className="w-4 h-4" />
              <span>View Public Updates</span>
            </a>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>+ Create News Update</span>
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

        {/* Bulk Action Toolbar */}
        {selectedNewsIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedNewsIds.length} announcement(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedNewsIds([])}
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
                <span>Delete Selected ({selectedNewsIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* News List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={newsList.length > 0 && newsList.every((item) => selectedNewsIds.includes(item.id))}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-madin-900 focus:ring-madin-900 cursor-pointer"
                title="Select All Announcements"
              />
              <span className="text-xs font-bold text-slate-800">
                Published News & Announcements ({newsList.length})
              </span>
            </div>
            <span className="text-xs text-slate-500">Top 3 latest display on Home Page</span>
          </div>

          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <VideoLoader size="lg" text="Loading announcements..." />
            </div>
          ) : newsList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No news announcements published yet. Click &quot;+ Create News Update&quot; above to add one.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {newsList.map((item, index) => {
                const isSelected = selectedNewsIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-slate-50/80 transition flex items-start justify-between gap-4 ${
                      isSelected ? 'bg-rose-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectNews(item.id)}
                        className="w-4 h-4 rounded text-madin-900 focus:ring-madin-900 cursor-pointer shrink-0 mt-1"
                      />
                      {item.imageUrl ? (
                        <div className="w-20 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200">
                          <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                          <Megaphone className="w-6 h-6" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {index < 3 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Home Featured #{index + 1}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(item.publishedAt).toLocaleDateString()}</span>
                          </span>
                          {!item.active && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600">
                              Draft / Hidden
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                        {item.subtitle && (
                          <h5 className="text-xs font-semibold text-blue-700 truncate">{item.subtitle}</h5>
                        )}
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed max-w-2xl">{item.body}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                        title="Edit Announcement"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-zoom-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <span>{editingId ? 'Edit News Announcement' : 'Create New News Update'}</span>
                </h3>
                <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    News Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Sahityotsav 2026 Grand Opening..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subtitle / Summary <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder="e.g. Division and State level selection rounds commence..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full News Body *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.body}
                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                    placeholder="Type the full announcement content here..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 resize-y"
                  />
                </div>

                {/* Photo Upload from PC */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Upload Photo from PC <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>

                  <div className="p-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-center hover:bg-slate-100/60 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-madin-900 file:text-white hover:file:bg-madin-950 cursor-pointer"
                    />
                    {uploadingImage && (
                      <p className="text-[11px] text-amber-600 mt-1 font-semibold">Processing image...</p>
                    )}
                  </div>

                  {formData.imageUrl && (
                    <div className="relative w-full h-36 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                      <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: '' })}
                        className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Publication Date
                    </label>
                    <input
                      type="date"
                      value={formData.publishedAt}
                      onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 rounded text-madin-900"
                      />
                      <span>Active & Visible</span>
                    </label>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
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
                    className="px-5 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-gold-400" />
                    <span>{saving ? 'Saving...' : editingId ? 'Update News' : 'Publish Announcement'}</span>
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
                Are you sure you want to permanently delete <strong className="text-rose-600">{selectedNewsIds.length}</strong> selected news announcement(s)? They will be permanently removed from the public portal and dashboards.
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
                      <span>Delete {selectedNewsIds.length} Announcement(s)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

