'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  Trophy,
  Search,
  Key,
  LogOut,
  Calendar,
  Save,
  User,
  Sparkles,
  CheckSquare,
  Square,
  Layers,
  Filter,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import PublicFooter from '@/components/layout/PublicFooter';

const MUTHALA_SUGGESTIONS = [
  'Fathul Mueen (فتح المعين)',
  'Safinathun-Naja (سفينة النجا)',
  'Ihya Uloomiddin (إحياء علوم الدين)',
  'Minhajut-Thalibeen (منهاج الطالبين)',
  'Tafseer Al-Jalalayn (تفسير الجلالين)',
  'Riyadus-Saliheen (رياض الصالحين)',
  'Bulughul Maram (بلوغ المرام)',
  'Al-Arbaeen An-Nawawiyyah (الأربعين النووية)',
  'Tuhfatul Muhtaj (تحفة المحتاج)',
  'Qatrul Nada (قطر الندى)',
];

const POINT_PICKING_SUGGESTIONS = [
  'Library Reference Reading',
  'Scholarly Research Notes',
  'Point Picking Session',
  'Classical Book Review',
  'Library Thesis Analysis',
  'Scholarly Debate Preparation',
];

function parseRemarks(remarks: string = '') {
  if (/^\[Point [pP]icking\]/i.test(remarks)) {
    return {
      type: 'Point picking' as 'Muthala' | 'Point picking',
      title: remarks.replace(/^\[Point [pP]icking\]\s*/i, ''),
    };
  }
  if (/^\[Muthala\]/i.test(remarks)) {
    return {
      type: 'Muthala' as 'Muthala' | 'Point picking',
      title: remarks.replace(/^\[Muthala\]\s*/i, ''),
    };
  }
  return {
    type: 'Muthala' as 'Muthala' | 'Point picking',
    title: remarks,
  };
}

export default function KuthbkhanaPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'Muthala' | 'Point picking'>('ALL');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Form State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'Muthala' as 'Muthala' | 'Point picking',
    kithabName: '',
    points: '10',
    date: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  // Load current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setCurrentUser(data.user);
          if (data.user.mustChangePassword) {
            router.push('/auth/change-password');
          }
        } else {
          router.push('/login');
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const isKuthbkhanaAdmin = currentUser?.role === 'KUTHBKHANA_ADMIN';
  const canDelete = isAdmin || isKuthbkhanaAdmin;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recRes, studRes] = await Promise.all([
        fetch('/api/kuthbkhana'),
        fetch('/api/students?all=true&minimal=true'),
      ]);

      const recData = await recRes.json();
      const studData = await studRes.json();

      if (recData.records) setRecords(recData.records);
      if (recData.subcategoryId) setSubcategoryId(recData.subcategoryId);
      if (studData.students) {
        setStudents(studData.students);
        if (studData.students.length > 0 && !formData.studentId) {
          setFormData((prev) => ({ ...prev, studentId: studData.students[0].id }));
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
  }, []);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      studentId: students[0]?.id || '',
      type: 'Muthala',
      kithabName: '',
      points: '10',
      date: '', // optional: left empty so user can leave as current or pick
      notes: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec);
    const parsed = parseRemarks(rec.remarks);
    setFormData({
      studentId: rec.studentId || rec.student?.id || '',
      type: parsed.type,
      kithabName: parsed.title || '',
      points: String(rec.obtainedScore || 10),
      date: rec.date ? new Date(rec.date).toISOString().slice(0, 10) : '',
      notes: '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const isEdit = !!editingRecord;
      const method = isEdit ? 'PUT' : 'POST';
      const payload = isEdit ? { id: editingRecord.id, ...formData } : formData;

      const res = await fetch('/api/kuthbkhana', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save Kuthbkhana record.');

      setStatusMsg({
        type: 'success',
        text: isEdit
          ? 'Kuthbkhana record updated successfully!'
          : `Successfully recorded ${formData.type} "${formData.kithabName}" (+${formData.points} pts)!`,
      });
      setModalOpen(false);
      setEditingRecord(null);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rec: any) => {
    if (!canDelete && rec.createdById !== currentUser?.id) {
      alert('You do not have permission to delete this record.');
      return;
    }

    const parsed = parseRemarks(rec.remarks);
    if (!confirm(`Are you sure you want to delete the ${parsed.type} record "${parsed.title}" for ${rec.student?.fullName}?`)) return;

    try {
      const res = await fetch(`/api/kuthbkhana?id=${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record.');

      setStatusMsg({ type: 'success', text: 'Record deleted successfully.' });
      setSelectedIds((prev) => prev.filter((id) => id !== rec.id));
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/kuthbkhana', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete selected records.');

      setStatusMsg({ type: 'success', text: `Successfully deleted ${selectedIds.length} records.` });
      setSelectedIds([]);
      setConfirmBulkDeleteOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map((r) => r.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const filteredRecords = useMemo(() => {
    let list = records;
    if (typeFilter !== 'ALL') {
      list = list.filter((r) => {
        const parsed = parseRemarks(r.remarks);
        return parsed.type === typeFilter;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (r) =>
        r.student?.fullName?.toLowerCase().includes(q) ||
        r.student?.studentId?.toLowerCase().includes(q) ||
        r.student?.class?.name?.toLowerCase().includes(q) ||
        r.remarks?.toLowerCase().includes(q)
    );
  }, [records, searchQuery, typeFilter]);

  const totalPointsAwarded = useMemo(() => {
    return records.reduce((sum, r) => sum + (r.obtainedScore || 0), 0);
  }, [records]);

  const muthalaCount = useMemo(() => {
    return records.filter((r) => parseRemarks(r.remarks).type === 'Muthala').length;
  }, [records]);

  const pointPickingCount = useMemo(() => {
    return records.filter((r) => parseRemarks(r.remarks).type === 'Point picking').length;
  }, [records]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200 shadow-xs">
                <img
                  src="/kuthbkhana-logo.png"
                  alt="Kuthbkhana Emblem"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                  KUTHBKHANA SESSION
                </h1>
                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                  Classical Reading & Scholarly Points
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/leaderboard?subcategoryId=${subcategoryId || 'cmtx_sub_kuthbkhana'}`}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center space-x-1.5 border border-blue-200"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Kuthbkhana Leaderboard</span>
            </Link>

            <Link
              href="/auth/change-password"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
              title="Change My Password"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Change Password</span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {/* Banner Card */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-950 text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-gold-400/20 text-gold-300 border border-gold-400/30 text-[11px] font-bold">
                <BookOpen className="w-3.5 h-3.5 text-gold-400" />
                <span>Kuthbkhana Session Portal</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Record Muthala & Point Picking Points
              </h2>
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                Log classical text reading (<span className="text-indigo-200 font-bold">Muthala</span>) or scholarly research milestones (<span className="text-amber-200 font-bold">Point picking</span>) and award numerical SPR points directly to student profiles.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-2xl bg-gold-400 hover:bg-gold-500 text-slate-950 text-xs font-black transition flex items-center space-x-2 shadow-md active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Record</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
            <div className="text-xl font-black text-slate-900">{records.length}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Muthala / Point Picking</span>
            <div className="text-sm font-black text-slate-800 flex items-center space-x-2 mt-1">
              <span className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-xs font-bold">{muthalaCount} Muthala</span>
              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md text-xs font-bold">{pointPickingCount} Picking</span>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Points Awarded</span>
            <div className="text-xl font-black text-blue-700">+{totalPointsAwarded} pts</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Session Admin</span>
            <div className="text-xs font-bold text-slate-900 truncate">{currentUser?.email || 'kithab@gmail.com'}</div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              {currentUser?.role === 'KUTHBKHANA_ADMIN' ? 'Kuthbkhana Session Admin' : currentUser?.role}
            </span>
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

        {/* Bulk Action Sticky / Floating Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-slate-900 text-white p-3 sm:px-4 sm:py-3 rounded-2xl flex items-center justify-between shadow-lg border border-slate-700 animate-slide-up">
            <div className="flex items-center space-x-3">
              <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-1 rounded-xl">
                {selectedIds.length} Selected
              </span>
              <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
                Kuthbkhana records selected for batch operation
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                Clear
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDeleteOpen(true)}
                  disabled={bulkDeleting}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center space-x-1.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, ID, or kithab..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Type Filter Pills */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl space-x-1 text-xs">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({records.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Muthala')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                  typeFilter === 'Muthala'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="w-3 h-3 text-indigo-600" />
                <span>Muthala ({muthalaCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Point picking')}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center space-x-1 ${
                  typeFilter === 'Point picking'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>Point picking ({pointPickingCount})</span>
              </button>
            </div>

            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredRecords.length} Shown
            </span>
          </div>
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-subtle overflow-hidden">
          {loading ? (
            <div className="py-16 text-center">
              <VideoLoader size="md" text="Loading Kuthbkhana Records..." subtext="Accessing reading session data" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No Kuthbkhana records found</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Start by adding your first reading record using the button above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer align-middle"
                        title="Select All"
                      />
                    </th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4">Category & Details</th>
                    <th className="py-3 px-4 text-right">Awarded Points</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.map((r) => {
                    const parsed = parseRemarks(r.remarks);
                    const isSelected = selectedIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className={`transition ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(r.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer align-middle"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{r.student?.fullName || 'Student'}</div>
                          <div className="text-[10px] text-slate-400">{r.student?.studentId}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {r.student?.class?.name || 'Class'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                parsed.type === 'Point picking'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {parsed.type === 'Point picking' ? (
                                <>
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Point picking</span>
                                </>
                              ) : (
                                <>
                                  <BookOpen className="w-2.5 h-2.5 text-indigo-600" />
                                  <span>Muthala</span>
                                </>
                              )}
                            </span>
                            <span className="font-bold text-slate-900">{parsed.title || 'Classical Kithab'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-xs font-mono">
                            +{r.obtainedScore} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {(isAdmin || isKuthbkhanaAdmin || r.createdById === currentUser?.id) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(r)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                title="Edit Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {(canDelete || r.createdById === currentUser?.id) && (
                              <button
                                type="button"
                                onClick={() => handleDelete(r)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <PublicFooter />

      {/* Record Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-900 p-1 flex items-center justify-center text-white">
                  <BookOpen className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {editingRecord ? 'Edit Kuthbkhana Record' : 'Record Kuthbkhana Milestone'}
                  </h3>
                  <p className="text-[10px] text-slate-500">Muthala or Point picking entry</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5">
              {/* Type Selection: Muthala vs Point picking */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Record Type / Activity *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Muthala' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      formData.type === 'Muthala'
                        ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Muthala</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'Point picking' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      formData.type === 'Point picking'
                        ? 'bg-white text-amber-700 shadow-xs border border-amber-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Point picking</span>
                  </button>
                </div>
              </div>

              {/* Student Select */}
              <div>
                <SearchableStudentSelect
                  students={students}
                  value={formData.studentId}
                  onChange={(id) => setFormData((prev) => ({ ...prev, studentId: id }))}
                  required
                  label="Student *"
                />
              </div>

              {/* Kithab Name / Topic with Suggestions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formData.type === 'Muthala' ? 'Kithab / Classical Text Name *' : 'Point Picking Details / Topic *'}
                </label>
                <input
                  type="text"
                  required
                  value={formData.kithabName}
                  onChange={(e) => setFormData({ ...formData, kithabName: e.target.value })}
                  placeholder={
                    formData.type === 'Muthala'
                      ? 'e.g. Fathul Mueen, Safinathun-Naja'
                      : 'e.g. Library Research, Scholarly Points Session'
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />

                {/* Suggestions Pills */}
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] font-bold text-slate-400">Quick suggestions:</span>
                  {(formData.type === 'Muthala' ? MUTHALA_SUGGESTIONS : POINT_PICKING_SUGGESTIONS)
                    .slice(0, 4)
                    .map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFormData({ ...formData, kithabName: item })}
                        className="text-[9px] font-semibold bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-1.5 py-0.5 rounded-md transition"
                      >
                        {item.split(' (')[0]}
                      </button>
                    ))}
                </div>
              </div>

              {/* Points (Numerical) & Date (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Awarded Points *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="500"
                    required
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Defaults to today if left blank
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4 text-blue-200" />
                  <span>{saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Save Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">Delete {selectedIds.length} Records?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to permanently remove these {selectedIds.length} Kuthbkhana records? Student SPR points will be recalculated immediately.
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-200" />
                <span>{bulkDeleting ? 'Deleting...' : `Confirm Delete (${selectedIds.length})`}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
