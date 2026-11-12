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
  Eye,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Bell,
  Clock,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import ModalLoadingBar from '@/components/ui/ModalLoadingBar';

import { formatGoogleDriveDirectUrl, isGoogleDriveUrl } from '@/lib/google-drive';
import { invalidateClientCache } from '@/lib/client-cache';

export default function AdminNewsManagementPage() {
  // Navigation Tab State: 'NOTIFICATIONS' | 'NEWS'
  const [activeTab, setActiveTab] = useState<'NOTIFICATIONS' | 'NEWS'>('NOTIFICATIONS');

  // Homepage Text Notifications State
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [editingNotificationId, setEditingNotificationId] = useState<string | null>(null);
  const [notificationFormData, setNotificationFormData] = useState({
    title: '',
    text: '',
    active: true,
    duration: 5,
  });
  const [savingNotification, setSavingNotification] = useState(false);
  const [deletingNotificationId, setDeletingNotificationId] = useState<string | null>(null);
  const [togglingNotificationId, setTogglingNotificationId] = useState<string | null>(null);

  const [newsList, setNewsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk deletion state
  const [selectedNewsIds, setSelectedNewsIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);

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
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/news?all=true');
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Response was not JSON
      }

      if (!res.ok) {
        throw new Error(data.error || `Failed to load news updates (${res.status}).`);
      }

      if (data.news) setNewsList(data.news);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load news updates.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const res = await fetch('/api/notifications?all=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch text notifications.');
      if (data.notifications) setNotificationsList(data.notifications);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to fetch text notifications.' });
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNews();
    fetchNotifications();
  }, []);

  const handleOpenAddNotification = () => {
    setEditingNotificationId(null);
    setNotificationFormData({
      title: 'Announcement',
      text: '',
      active: true,
      duration: 5,
    });
    setNotificationModalOpen(true);
  };

  const handleOpenEditNotification = (item: any) => {
    setEditingNotificationId(item.id);
    setNotificationFormData({
      title: item.title || '',
      text: item.text || '',
      active: item.active !== false,
      duration: item.duration || 5,
    });
    setNotificationModalOpen(true);
  };

  const handleToggleNotification = async (item: any) => {
    setTogglingNotificationId(item.id);
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          active: !item.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update notification status.');
      setStatusMsg({
        type: 'success',
        text: `Notification status updated: now ${!item.active ? 'Shown on Homepage' : 'Hidden'}.`,
      });
      fetchNotifications();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error updating status.' });
    } finally {
      setTogglingNotificationId(null);
    }
  };

  const handleSaveNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationFormData.text.trim()) {
      setStatusMsg({ type: 'error', text: 'Notification text is required.' });
      return;
    }
    setSavingNotification(true);
    setStatusMsg(null);
    try {
      const method = editingNotificationId ? 'PUT' : 'POST';
      const body = editingNotificationId
        ? { id: editingNotificationId, ...notificationFormData }
        : notificationFormData;

      const res = await fetch('/api/notifications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notification.');

      setStatusMsg({
        type: 'success',
        text: `Notification ${editingNotificationId ? 'updated' : 'created'} successfully!`,
      });
      setNotificationModalOpen(false);
      fetchNotifications();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving notification.' });
    } finally {
      setSavingNotification(false);
    }
  };

  const handleDeleteNotification = async (item: any) => {
    if (!confirm('Are you sure you want to delete this text notification?')) return;
    setDeletingNotificationId(item.id);
    try {
      const res = await fetch(`/api/notifications?id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete notification.');
      setStatusMsg({ type: 'success', text: 'Notification deleted successfully.' });
      fetchNotifications();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting notification.' });
    } finally {
      setDeletingNotificationId(null);
    }
  };

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
    setModalDeleteError(null);
    try {
      const res = await fetch('/api/news', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedNewsIds }),
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok) throw new Error(data.error || `Failed to bulk delete news announcements (${res.status}).`);

      const count = selectedNewsIds.length;
      setSelectedNewsIds([]);
      setConfirmBulkDeleteOpen(false);
      setModalDeleteError(null);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} news announcement(s).` });
      invalidateClientCache('/api/news');
      fetchNews();
    } catch (err: any) {
      const errMsg = err.message || 'Error bulk deleting news announcements.';
      setModalDeleteError(errMsg);
      setStatusMsg({ type: 'error', text: errMsg });
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
    setDriveUrlInput('');
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
    setDriveUrlInput(item.imageUrl || '');
    setModalOpen(true);
  };

  // Handle Google Drive Photo URL input and automatic direct CDN conversion
  const handleDriveUrlChange = (val: string) => {
    setDriveUrlInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setFormData((prev) => ({ ...prev, imageUrl: '' }));
      return;
    }
    const directUrl = formatGoogleDriveDirectUrl(trimmed);
    setFormData((prev) => ({ ...prev, imageUrl: directUrl || trimmed }));
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

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Not a JSON response
      }

      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('The image or announcement payload is too large. Please select a smaller photo.');
        }
        throw new Error(data.error || `Failed to save news announcement (Server returned ${res.status}).`);
      }

      setStatusMsg({
        type: 'success',
        text: `News update ${editingId ? 'updated' : 'published'} successfully!`,
      });
      setModalOpen(false);
      invalidateClientCache('/api/news');
      fetchNews();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save news announcement.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Are you sure you want to delete news announcement "${item.title}"?`)) return;
    setDeletingId(item.id);

    try {
      const res = await fetch(`/api/news?id=${item.id}`, { method: 'DELETE' });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {}

      if (!res.ok) throw new Error(data.error || `Failed to delete news (${res.status}).`);

      setSelectedNewsIds((prev) => prev.filter((id) => id !== item.id));
      setStatusMsg({ type: 'success', text: 'Announcement deleted.' });
      invalidateClientCache('/api/news');
      fetchNews();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting announcement.' });
    } finally {
      setDeletingId(null);
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
                Broadcast &amp; Communications
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <span>News, Circulars &amp; Notifications Management</span>
            </h2>
            <p className="text-xs text-slate-500">
              Manage 5-second homepage text notifications, publish news, and broadcast announcements.
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
            {activeTab === 'NOTIFICATIONS' ? (
              <button
                type="button"
                onClick={handleOpenAddNotification}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-100" />
                <span>+ Add Text Notification</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 text-gold-400" />
                <span>+ Create News Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'NOTIFICATIONS'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>⚡ Homepage Text Notifications (5s Duration)</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'NOTIFICATIONS'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {notificationsList.filter((n) => n.active).length} Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('NEWS')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'NEWS'
                ? 'bg-madin-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Megaphone className="w-4 h-4" />
            <span>📰 Official News &amp; Circulars Articles</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'NEWS' ? 'bg-madin-950 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {newsList.length}
            </span>
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

        {/* ========================================================================= */}
        {/* TAB 1: HOMEPAGE TEXT NOTIFICATIONS (5s DURATION) */}
        {/* ========================================================================= */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="space-y-6">
            {/* Live Notification Preview & Information Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/60 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                    5-Second Homepage Display
                  </span>
                  <span className="text-xs text-amber-900 font-bold">Auto Date &amp; Time + Show/Hide Control</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                  Active notifications appear automatically in the designated sky area on the Homepage for 5 seconds duration with a progress bar and manual close button on every homepage opening.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddNotification}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition hover:scale-105 active:scale-95 flex items-center space-x-2 shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Text Notification</span>
              </button>
            </div>

            {/* Notifications Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Text Notifications Records ({notificationsList.length})
                  </span>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Latest active notification is broadcast on Homepage
                </span>
              </div>

              {loadingNotifications ? (
                <div className="p-12 flex items-center justify-center">
                  <VideoLoader size="lg" text="Loading notifications..." />
                </div>
              ) : notificationsList.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>No text notifications added yet.</div>
                  <button
                    type="button"
                    onClick={handleOpenAddNotification}
                    className="px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl shadow hover:bg-amber-600 transition cursor-pointer"
                  >
                    + Add Your First Notification
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notificationsList.map((item) => {
                    const d = new Date(item.createdAt);
                    const formattedDate = !isNaN(d.getTime())
                      ? `${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                      : 'N/A';
                    return (
                      <div
                        key={item.id}
                        className={`p-4 hover:bg-slate-50/80 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                          item.active ? 'bg-amber-50/20' : 'bg-slate-50/30'
                        }`}
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                item.active
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {item.title || 'Notification'}
                            </span>

                            <span className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formattedDate}</span>
                            </span>

                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              ⏱️ {item.duration || 5}s duration
                            </span>
                          </div>

                          <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                            {item.text}
                          </p>
                        </div>

                        {/* Status Toggle & Actions */}
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          {/* 1-Click Show / Hide Toggle Button */}
                          <button
                            type="button"
                            disabled={togglingNotificationId === item.id}
                            onClick={() => handleToggleNotification(item)}
                            title={item.active ? 'Click to Hide from Homepage' : 'Click to Show on Homepage'}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 cursor-pointer ${
                              item.active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {togglingNotificationId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.active ? (
                              <ToggleRight className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-slate-400" />
                            )}
                            <span>{item.active ? 'Shown on Homepage' : 'Hidden'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditNotification(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                            title="Edit Notification"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteNotification(item)}
                            disabled={deletingNotificationId === item.id}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition cursor-pointer"
                            title="Delete Notification"
                          >
                            {deletingNotificationId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: NEWS & CIRCULARS ARTICLES */}
        {/* ========================================================================= */}
        {activeTab === 'NEWS' && (
          <div className="space-y-6">
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
                    Published News &amp; Announcements ({newsList.length})
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
                            disabled={deletingId === item.id}
                            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition"
                            title="Delete Announcement"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}


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

              <ModalLoadingBar loading={saving} text="Saving announcement..." color="amber" />

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

                {/* Photo via Google Drive URL Only */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Google Drive Photo URL <span className="text-slate-400 font-normal">(Optional)</span></span>
                    </label>
                    {formData.imageUrl && isGoogleDriveUrl(driveUrlInput || formData.imageUrl) && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Drive Link Converted</span>
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type="url"
                      value={driveUrlInput}
                      onChange={(e) => handleDriveUrlChange(e.target.value)}
                      placeholder="https://drive.google.com/file/d/... or File ID"
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                    />
                    {driveUrlInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setDriveUrlInput('');
                          setFormData((prev) => ({ ...prev, imageUrl: '' }));
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        title="Clear URL"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Paste Google Drive sharing link or file ID. Ensure sharing is set to <strong className="text-slate-700">&quot;Anyone with the link can view&quot;</strong>. SPR converts it automatically for fast edge CDN delivery.
                  </p>

                  {formData.imageUrl && (
                    <div className="relative w-full h-36 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-inner group">
                      <Image src={formData.imageUrl} alt="Preview" fill className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2.5">
                        <span className="text-[10.5px] font-semibold text-white drop-shadow">
                          Google Drive Live Preview
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDriveUrlInput('');
                          setFormData((prev) => ({ ...prev, imageUrl: '' }));
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition cursor-pointer"
                        title="Remove Photo"
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
                    className="px-5 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50 transition active:scale-95"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-amber-300" />
                        <span>{editingId ? 'Update News' : 'Publish Announcement'}</span>
                      </>
                    )}
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

              {modalDeleteError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalDeleteError}</span>
                </div>
              )}

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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting {selectedNewsIds.length} Announcement(s)...</span>
                  </>
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

        {/* Homepage Text Notification Add/Edit Modal */}
        {notificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-amber-600" />
                  <span>
                    {editingNotificationId ? 'Edit Homepage Text Notification' : 'Add Homepage Text Notification'}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setNotificationModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNotification} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notification Text Message *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={notificationFormData.text}
                    onChange={(e) =>
                      setNotificationFormData({ ...notificationFormData, text: e.target.value })
                    }
                    placeholder="Enter notification text to be shown on Homepage for 5 seconds..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Label / Title <span className="text-slate-400 font-normal">(Optional, defaults to &apos;Announcement&apos;)</span>
                  </label>
                  <input
                    type="text"
                    value={notificationFormData.title}
                    onChange={(e) =>
                      setNotificationFormData({ ...notificationFormData, title: e.target.value })
                    }
                    placeholder="e.g. Announcement, Circular, Exam Alert"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Automatic Date and Time notice */}
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Automatic Date &amp; Time: </span>
                    <span>Saved automatically upon creation/update with current timestamp.</span>
                  </div>
                </div>

                {/* Duration Adjustment Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Display Duration (Seconds) *
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      required
                      value={notificationFormData.duration}
                      onChange={(e) =>
                        setNotificationFormData({
                          ...notificationFormData,
                          duration: Math.max(1, parseInt(e.target.value, 10) || 5),
                        })
                      }
                      className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">seconds</span>

                    {/* Quick duration presets */}
                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="text-[10px] text-slate-400 font-semibold mr-1">Presets:</span>
                      {[3, 5, 8, 10, 15, 20].map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setNotificationFormData({ ...notificationFormData, duration: sec })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                            notificationFormData.duration === sec
                              ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                              : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Notification will display on Homepage for {notificationFormData.duration}s with an animated countdown progress bar and close button.
                  </p>
                </div>

                {/* Show / Hide Toggle */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">Show on Homepage</div>
                    <div className="text-[10px] text-slate-500">Enable to display immediately on Homepage openings</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationFormData.active}
                      onChange={(e) =>
                        setNotificationFormData({
                          ...notificationFormData,
                          active: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setNotificationModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingNotification}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {savingNotification ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingNotificationId ? 'Update Notification' : 'Save Notification'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

