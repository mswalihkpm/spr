'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import VideoLoader from '@/components/ui/VideoLoader';
import {
  Coins,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Search,
  Filter,
  RotateCcw,
  X,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
  Share2,
  ArrowLeft,
  Calendar,
  Trash2,
  Edit2,
  FolderPlus,
  Layers,
  Check,
  FolderOpen,
} from 'lucide-react';
import BrandedShareModal from '@/components/modals/BrandedShareModal';
import { executeBrandedShare, SharePayload } from '@/lib/share-utils';

interface CollectionSummary {
  name: string;
  recordCount: number;
  totalPoints: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentFieldCollectionItem {
  id: string;
  studentId: string;
  sprStudentId: string | null;
  fullName: string;
  division: string;
  photoUrl: string | null;
  class: { id: string; name: string; numericGrade: number };
  totalPoints: number;
  records: Array<{
    id: string;
    obtainedScore: number;
    maxScore: number;
    percentage: number;
    remarks: string | null;
    date: string;
    updatedAt: string;
  }>;
  latestRecord: {
    id: string;
    obtainedScore: number;
    maxScore: number;
    percentage: number;
    remarks: string | null;
    date: string;
    updatedAt: string;
  } | null;
}

export default function FieldCollectionPage() {
  // 1. View Mode & Collections State
  const [viewMode, setViewMode] = useState<'COLLECTIONS_LIST' | 'COLLECTION_EDITOR'>('COLLECTIONS_LIST');
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [collectionSearch, setCollectionSearch] = useState<string>('');
  const [activeCollectionName, setActiveCollectionName] = useState<string>('');
  const [previousCollectionName, setPreviousCollectionName] = useState<string | null>(null);
  const [collectionDate, setCollectionDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // 2. Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<StudentFieldCollectionItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);

  // 3. Class & Search Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 4. Advanced Search & Sorting
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'RECORDED' | 'MISSING' | 'MODIFIED'>('ALL');
  const [presetRange, setPresetRange] = useState<string>('ALL'); // ALL, 100+, 50-100, <50, 0
  const [customMin, setCustomMin] = useState<string>('');
  const [customMax, setCustomMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('CLASS_ASC');

  // 5. In-Memory Edit Buffer: studentId -> string point value
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 6. Bulk Operations
  const [bulkInputValue, setBulkInputValue] = useState<string>('50');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState<boolean>(false);

  // 7. Modals: Deletion & Receipts
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'COLLECTION' | 'RECORD';
    collectionName?: string;
    recordId?: string;
    studentName?: string;
    count?: number;
  }>({ isOpen: false, type: 'COLLECTION' });

  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Fetch Data from Backend
  const fetchData = useCallback(async (drive?: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const params = new URLSearchParams();
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.append('classId', selectedClassId);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (drive !== undefined) {
        if (drive.trim()) params.append('driveName', drive.trim());
      } else if (activeCollectionName.trim() && viewMode === 'COLLECTION_EDITOR') {
        params.append('driveName', activeCollectionName.trim());
      }

      const res = await fetch(`/api/field-collection?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load field collection data.');
      }

      setStudents(data.students || []);
      setClasses(data.classes || []);
      setStats(data.stats || null);
      setCategory(data.category || null);
      if (Array.isArray(data.collections)) {
        setCollections(data.collections);
      }
    } catch (err: any) {
      console.error('Field collection fetch error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading field collection data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, searchQuery, activeCollectionName, viewMode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Switch to "Add New Collection"
  const handleOpenNewCollection = () => {
    setViewMode('COLLECTION_EDITOR');
    setActiveCollectionName('');
    setPreviousCollectionName(null);
    setCollectionDate(new Date().toISOString().slice(0, 10));
    setEditBuffer({});
    setStatusMsg(null);
    // Fetch all active students with empty records for this new collection
    fetchData('');
  };

  // Handle Switch to "Edit Existing Collection"
  const handleOpenEditCollection = (col: CollectionSummary) => {
    setViewMode('COLLECTION_EDITOR');
    setActiveCollectionName(col.name);
    setPreviousCollectionName(col.name);
    setCollectionDate(col.date ? col.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditBuffer({});
    setStatusMsg(null);
    fetchData(col.name);
  };

  // Back to Collections Overview
  const handleBackToOverview = () => {
    const hasUnsaved = Object.keys(editBuffer).length > 0;
    if (hasUnsaved) {
      if (!confirm('You have unsaved changes in this collection. Are you sure you want to go back?')) {
        return;
      }
    }
    setViewMode('COLLECTIONS_LIST');
    setActiveCollectionName('');
    setPreviousCollectionName(null);
    setEditBuffer({});
    fetchData('');
  };

  // Check if student is modified in buffer
  const isStudentModified = (s: StudentFieldCollectionItem) => {
    if (s.id in editBuffer) {
      const currentVal = s.totalPoints > 0 ? s.totalPoints.toString() : '';
      if (editBuffer[s.id] !== currentVal) return true;
    }
    return false;
  };

  // Get effective points for calculation/preview
  const getEffectivePoints = (s: StudentFieldCollectionItem): number => {
    if (s.id in editBuffer) {
      const parsed = parseFloat(editBuffer[s.id]);
      return isNaN(parsed) ? 0 : parsed;
    }
    return s.totalPoints || 0;
  };

  // Count modified students
  const modifiedCount = useMemo(() => {
    return students.filter((s) => isStudentModified(s)).length;
  }, [students, editBuffer]);

  // Dynamically discover all unique divisions
  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.division) set.add(s.division);
    });
    return Array.from(set).sort();
  }, [students]);

  // Filtered Collections on Overview page
  const filteredCollections = useMemo(() => {
    if (!collectionSearch.trim()) return collections;
    const q = collectionSearch.toLowerCase().trim();
    return collections.filter((c) => c.name.toLowerCase().includes(q));
  }, [collections, collectionSearch]);

  // Filtered and Sorted students
  const processedStudents = useMemo(() => {
    return students
      .filter((s) => {
        // Division filter
        if (selectedDivision !== 'ALL' && s.division !== selectedDivision) {
          return false;
        }

        // Status filter
        const isMod = isStudentModified(s);
        const pts = getEffectivePoints(s);
        if (selectedStatus === 'RECORDED') {
          if (pts <= 0) return false;
        } else if (selectedStatus === 'MISSING') {
          if (pts > 0 && !isMod) return false;
        } else if (selectedStatus === 'MODIFIED') {
          if (!isMod) return false;
        }

        // Point Range preset
        if (presetRange === '100+') {
          if (pts < 100) return false;
        } else if (presetRange === '50-100') {
          if (pts < 50 || pts >= 100) return false;
        } else if (presetRange === '<50') {
          if (pts >= 50 || pts <= 0) return false;
        } else if (presetRange === '0') {
          if (pts > 0) return false;
        }

        if (customMin !== '') {
          const minVal = parseFloat(customMin);
          if (!isNaN(minVal) && pts < minVal) return false;
        }
        if (customMax !== '') {
          const maxVal = parseFloat(customMax);
          if (!isNaN(maxVal) && pts > maxVal) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'NAME_ASC') {
          return a.fullName.localeCompare(b.fullName);
        }
        if (sortBy === 'NAME_DESC') {
          return b.fullName.localeCompare(a.fullName);
        }
        if (sortBy === 'SPR_ASC') {
          return (a.sprStudentId || a.studentId).localeCompare(b.sprStudentId || b.studentId);
        }
        if (sortBy === 'SPR_DESC') {
          return (b.sprStudentId || b.studentId).localeCompare(a.sprStudentId || a.studentId);
        }
        if (sortBy === 'POINTS_DESC') {
          return getEffectivePoints(b) - getEffectivePoints(a);
        }
        if (sortBy === 'POINTS_ASC') {
          return getEffectivePoints(a) - getEffectivePoints(b);
        }
        return 0;
      });
  }, [students, selectedDivision, selectedStatus, presetRange, customMin, customMax, sortBy, editBuffer]);

  // Bulk Apply to All Visible
  const handleApplyBulk = () => {
    const val = parseFloat(bulkInputValue);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid positive point value.');
      return;
    }
    const newBuffer: Record<string, string> = { ...editBuffer };
    processedStudents.forEach((s) => {
      newBuffer[s.id] = val.toString();
    });
    setEditBuffer(newBuffer);
    setBulkConfirmOpen(false);
    setStatusMsg({
      type: 'success',
      text: `Applied ${val} points to ${processedStudents.length} visible student(s). Click "Save All Records" to persist.`,
    });
  };

  // Revert all unsaved edits
  const handleRevertChanges = () => {
    setEditBuffer({});
    setStatusMsg({ type: 'success', text: 'All unsaved point changes were reverted.' });
  };

  // Save All Collection Records
  const handleSaveAll = async () => {
    const colName = activeCollectionName.trim();
    if (!colName) {
      setStatusMsg({ type: 'error', text: 'Please enter a common title/name for this collection.' });
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const entriesToSave: Array<{ studentId: string; points: number; recordId?: string; remarks?: string }> = [];

      for (const s of students) {
        if (s.id in editBuffer) {
          const raw = editBuffer[s.id].trim();
          const num = raw === '' ? 0 : parseFloat(raw);
          if (isNaN(num) || num < 0) {
            throw new Error(`Invalid points value "${raw}" for student ${s.fullName}. Must be >= 0.`);
          }
          entriesToSave.push({
            studentId: s.id,
            points: num,
            recordId: s.latestRecord?.id,
            remarks: colName,
          });
        }
      }

      if (entriesToSave.length === 0 && !previousCollectionName) {
        throw new Error('Please enter point values for at least one student before saving a new collection.');
      }

      const res = await fetch('/api/field-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveName: colName,
          previousDriveName: previousCollectionName,
          date: collectionDate,
          entries: entriesToSave,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save field collection points.');

      setStatusMsg({
        type: 'success',
        text: `Successfully saved collection "${colName}". All points and category cash wallets updated.`,
      });
      setEditBuffer({});
      setPreviousCollectionName(colName);
      await fetchData(colName);
    } catch (err: any) {
      console.error('Save points error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving collection points.' });
    } finally {
      setSaving(false);
    }
  };

  // Single Student Quick Save
  const handleSaveSingleStudent = async (student: StudentFieldCollectionItem) => {
    const colName = activeCollectionName.trim() || 'Field Collection Drive';
    const rawVal = editBuffer[student.id];
    const num = parseFloat(rawVal || '0');

    if (isNaN(num) || num < 0) {
      alert('Please enter a valid positive point value.');
      return;
    }

    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/field-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveName: colName,
          previousDriveName: previousCollectionName,
          date: collectionDate,
          entries: [{ studentId: student.id, points: num, recordId: student.latestRecord?.id, remarks: colName }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student points.');

      setStatusMsg({ type: 'success', text: `Saved points for ${student.fullName}.` });
      const nextBuf = { ...editBuffer };
      delete nextBuf[student.id];
      setEditBuffer(nextBuf);
      await fetchData(colName);
    } catch (err: any) {
      console.error('Error saving single student:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving student points.' });
    } finally {
      setSaving(false);
    }
  };

  // Confirm Deletion Execution
  const executeConfirmedDelete = async () => {
    const { type, collectionName, recordId } = deleteModal;
    setDeleteModal({ isOpen: false, type: 'COLLECTION' });
    setSaving(true);
    setStatusMsg(null);

    try {
      if (type === 'COLLECTION' && collectionName) {
        const res = await fetch(`/api/field-collection?collectionName=${encodeURIComponent(collectionName)}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete collection.');

        setStatusMsg({ type: 'success', text: `Collection "${collectionName}" and all associated records deleted.` });
        if (viewMode === 'COLLECTION_EDITOR' && activeCollectionName === collectionName) {
          setViewMode('COLLECTIONS_LIST');
          setActiveCollectionName('');
          setPreviousCollectionName(null);
        }
        await fetchData('');
      } else if (type === 'RECORD' && recordId) {
        const res = await fetch(`/api/field-collection?id=${recordId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to delete record.');

        setStatusMsg({ type: 'success', text: 'Student record deleted successfully.' });
        await fetchData(activeCollectionName);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting.' });
    } finally {
      setSaving(false);
    }
  };

  const handleShareReceipt = async (student: StudentFieldCollectionItem) => {
    const points = getEffectivePoints(student);
    const campaignName = activeCollectionName.trim() || student.latestRecord?.remarks || 'Field Collection Drive';
    const amountVal = points > 0 ? points : 100;

    await executeBrandedShare(
      {
        template: 'receipt',
        contributorName: student.fullName,
        amount: amountVal,
        campaignName,
        studentName: student.fullName,
        sprId: student.sprStudentId || student.studentId,
        receiptUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}/student/${student.id}`
            : undefined,
      },
      {
        onFallbackModal: (p) => {
          setSharePayload(p);
          setIsShareModalOpen(true);
        },
      }
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
        {/* Main Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-emerald-800/40">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4 sm:space-x-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-2 shadow-lg flex items-center justify-center shrink-0 border-2 border-emerald-400/40">
                <Image
                  src="/field-collection-logo.png"
                  alt="Field Collection Logo"
                  width={72}
                  height={72}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                    SPR Assessment Wing
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-emerald-100">
                    Direct Points &amp; Category Cash
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                  Field Collection Management
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
                  Organize collections by common title, record student contributions, edit historical campaigns, and manage points for SPR rankings.
                </p>
              </div>
            </div>

            {/* Banner Right Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              {viewMode === 'COLLECTIONS_LIST' ? (
                <button
                  type="button"
                  onClick={handleOpenNewCollection}
                  className="px-5 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-950" />
                  <span>+ Add New Collection</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBackToOverview}
                  className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center justify-center space-x-2 backdrop-blur-md transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>All Collections ({collections.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Message Alert */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold transition shadow-xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                : 'bg-rose-50 text-rose-900 border border-rose-300'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 1: PREVIOUS COLLECTIONS OVERVIEW
            ------------------------------------------------------------- */}
        {viewMode === 'COLLECTIONS_LIST' && (
          <div className="space-y-6">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Collections
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">
                    {collections.length}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Points Collected
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-0.5 font-mono">
                    +{stats ? stats.totalPointsCollected.toFixed(1) : '0.0'} pts
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Participating Students
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5 font-mono">
                    {stats ? `${stats.recordedCount} Students` : '0 Students'}
                  </div>
                </div>
              </div>
            </div>

            {/* Collections List Header & Search */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Layers className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Created Previous Collections</h2>
                    <p className="text-xs text-slate-500">
                      Manage previous collection campaigns, edit common names, and update student contribution records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search collections by name..."
                      value={collectionSearch}
                      onChange={(e) => setCollectionSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenNewCollection}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Collection</span>
                  </button>
                </div>
              </div>

              {/* Collections Cards Grid */}
              {loading && collections.length === 0 ? (
                <div className="py-16 text-center">
                  <VideoLoader size="lg" text="Loading created collections..." />
                </div>
              ) : filteredCollections.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <FolderPlus className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">No Collections Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {collectionSearch
                      ? `No previous collection matched "${collectionSearch}". Try searching for another name.`
                      : 'No field collection campaigns have been created yet. Click "+ Add New Collection" to get started.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewCollection}
                    className="px-4 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Collection</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCollections.map((col, idx) => {
                    const formattedDate = (() => {
                      try {
                        const d = new Date(col.date);
                        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                      } catch {
                        return '';
                      }
                    })();

                    return (
                      <div
                        key={col.name + idx}
                        className="p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                <Coins className="w-4 h-4 text-emerald-700" />
                              </div>
                              <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-800 transition line-clamp-2">
                                {col.name}
                              </h3>
                            </div>
                            {formattedDate && (
                              <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200 shrink-0">
                                {formattedDate}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                            <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Total Points</div>
                              <div className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                                +{col.totalPoints.toFixed(1)} pts
                              </div>
                            </div>
                            <div className="p-2 rounded-xl bg-white border border-slate-200/60">
                              <div className="text-[10px] font-bold uppercase text-slate-400">Students</div>
                              <div className="text-sm font-black text-slate-800 font-mono mt-0.5">
                                {col.recordCount} Recorded
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleOpenEditCollection(col)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer active:scale-95"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Collection</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                type: 'COLLECTION',
                                collectionName: col.name,
                                count: col.recordCount,
                              })
                            }
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title={`Delete collection "${col.name}"`}
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
          </div>
        )}

        {/* -------------------------------------------------------------
            VIEW 2: COLLECTION EDITOR (ADD / EDIT COLLECTION)
            ------------------------------------------------------------- */}
        {viewMode === 'COLLECTION_EDITOR' && (
          <div className="space-y-6">
            {/* Top Navigation & Collection Title Bar */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToOverview}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                    title="Return to Collections Overview"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <div className="flex-1 min-w-[240px] sm:min-w-[360px]">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Collection Common Name / Title
                    </label>
                    <input
                      type="text"
                      value={activeCollectionName}
                      onChange={(e) => setActiveCollectionName(e.target.value)}
                      placeholder="e.g. Ramadan Social Service Drive 2026"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="w-full sm:w-auto">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Collection Date
                    </label>
                    <input
                      type="date"
                      value={collectionDate}
                      onChange={(e) => setCollectionDate(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRevertChanges}
                    disabled={modifiedCount === 0 || saving}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    Revert
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center space-x-2 shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : 'Save Collection Records'}</span>
                  </button>
                </div>
              </div>

              {previousCollectionName && (
                <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-emerald-700">Editing Collection:</span>
                  <span className="font-mono">{previousCollectionName}</span>
                  {activeCollectionName.trim() !== previousCollectionName && (
                    <span className="text-amber-600 font-bold">
                      (Will rename to: &ldquo;{activeCollectionName.trim()}&rdquo;)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Filter Control Box */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Class Tabs */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                  <span className="text-xs font-bold text-slate-500 mr-1 flex items-center space-x-1 shrink-0">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <span>Class:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassId('ALL');
                      setEditBuffer({});
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                      selectedClassId === 'ALL'
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    All Classes
                  </button>
                  {classes.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setEditBuffer({});
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative w-full lg:w-72 shrink-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name or SPR ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium"
                  />
                </div>
              </div>

              {/* Bulk Operations Bar */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-500">Bulk Fill:</span>
                  <div className="flex items-center space-x-1">
                    {['25', '50', '100', '150'].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setBulkInputValue(val);
                          setBulkConfirmOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer transition"
                      >
                        +{val} pts
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Showing <strong>{processedStudents.length}</strong> of {students.length} students
                  {modifiedCount > 0 && (
                    <span className="ml-2 text-amber-600 font-bold">
                      ({modifiedCount} modified in editor)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-20 text-center">
                  <VideoLoader size="lg" text="Loading collection students..." />
                </div>
              ) : processedStudents.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-500 space-y-2">
                  <Users className="w-8 h-8 mx-auto text-slate-400" />
                  <p>No students match the current filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-3.5 text-center w-12">#</th>
                        <th className="py-3 px-3.5 min-w-[200px]">Student Name</th>
                        <th className="py-3 px-3.5 min-w-[120px]">Class &amp; Division</th>
                        <th className="py-3 px-3.5 text-center min-w-[110px]">Current Status</th>
                        <th className="py-3 px-3.5 text-center min-w-[180px]">Points in this Collection</th>
                        <th className="py-3 px-3.5 text-right min-w-[140px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {processedStudents.map((s, idx) => {
                        const isMod = isStudentModified(s);
                        const effectivePoints = getEffectivePoints(s);
                        const inputValue =
                          s.id in editBuffer
                            ? editBuffer[s.id]
                            : s.totalPoints > 0
                            ? s.totalPoints.toString()
                            : '';

                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-slate-50/80 transition ${
                              isMod ? 'bg-amber-50/40' : s.totalPoints > 0 ? 'bg-white' : 'bg-slate-50/20'
                            }`}
                          >
                            <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-medium">
                              {idx + 1}
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-900/10 text-emerald-900 flex items-center justify-center font-bold text-xs shrink-0">
                                  {s.fullName.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                    <span>{s.fullName}</span>
                                    {isMod && (
                                      <span
                                        className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"
                                        title="Unsaved modification"
                                      />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    {s.sprStudentId || s.studentId}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3.5">
                              <div className="font-semibold text-slate-800">{s.class?.name}</div>
                              <div className="text-[10px] text-slate-400">Div {s.division}</div>
                            </td>

                            <td className="py-3 px-3.5 text-center">
                              {isMod ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Modified
                                </span>
                              ) : s.totalPoints > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Recorded ({s.totalPoints} pts)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                                  0 Points
                                </span>
                              )}
                            </td>

                            {/* Input for points */}
                            <td className="py-3 px-3.5">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="0"
                                    value={inputValue}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setEditBuffer((prev) => ({ ...prev, [s.id]: val }));
                                    }}
                                    className={`w-24 px-2 py-1 text-center rounded-lg text-xs font-bold border transition focus:outline-none focus:ring-1 ${
                                      isMod
                                        ? 'bg-amber-50 border-amber-400 text-amber-900 focus:ring-amber-500'
                                        : s.totalPoints > 0
                                        ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900 focus:ring-emerald-500'
                                        : 'bg-white border-slate-200 text-slate-900 focus:ring-emerald-800'
                                    }`}
                                  />
                                  <span className="text-xs font-bold text-slate-400">pts</span>
                                </div>

                                {/* Quick chips */}
                                <div className="hidden sm:flex items-center space-x-1">
                                  {['50', '100'].map((chip) => (
                                    <button
                                      key={chip}
                                      type="button"
                                      onClick={() => {
                                        setEditBuffer((prev) => ({ ...prev, [s.id]: chip }));
                                      }}
                                      className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 transition cursor-pointer"
                                    >
                                      +{chip}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3.5 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {effectivePoints > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleShareReceipt(s)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-2xs cursor-pointer"
                                    title="Share Receipt"
                                  >
                                    <Share2 className="w-3 h-3 text-emerald-700" />
                                    <span className="hidden sm:inline">Receipt</span>
                                  </button>
                                )}

                                {isMod && (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveSingleStudent(s)}
                                    disabled={saving}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                                    title="Save this student"
                                  >
                                    Save
                                  </button>
                                )}

                                {s.latestRecord && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteModal({
                                        isOpen: true,
                                        type: 'RECORD',
                                        recordId: s.latestRecord?.id,
                                        studentName: s.fullName,
                                      })
                                    }
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Delete this record"
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
          </div>
        )}

        {/* Bulk Confirmation Modal */}
        {bulkConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-3 text-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Confirm Bulk Points Apply</h4>
                  <p className="text-xs text-slate-500">Collection: {activeCollectionName || 'Current Collection'}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Set <strong className="text-slate-900 font-mono">{bulkInputValue} points</strong> for all{' '}
                <strong className="text-slate-900">{processedStudents.length} visible student(s)</strong>?
              </p>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Note:</strong> Changes will be staged in the editor. Click{' '}
                <strong>&ldquo;Save Collection Records&rdquo;</strong> to persist and credit student wallets.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-sm"
                >
                  Confirm &amp; Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Collection or Record) */}
        {deleteModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">
                    {deleteModal.type === 'COLLECTION' ? 'Delete Collection?' : 'Delete Student Record?'}
                  </h4>
                  <p className="text-xs text-slate-500">Confirmation Required</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {deleteModal.type === 'COLLECTION' ? (
                  <>
                    Are you sure you want to permanently delete collection{' '}
                    <strong className="text-slate-900">&ldquo;{deleteModal.collectionName}&rdquo;</strong>?
                    <br />
                    This will delete all <strong>{deleteModal.count || 0} student record(s)</strong> in this collection and automatically recalculate their SPR and cash standings.
                  </>
                ) : (
                  <>
                    Are you sure you want to delete the collection record for student{' '}
                    <strong className="text-slate-900">{deleteModal.studentName}</strong>?
                  </>
                )}
              </p>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
                <strong>Warning:</strong> This action is irreversible. Deleted records will be removed from student dossiers.
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, type: 'COLLECTION' })}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedDelete}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Confirm & Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branded WhatsApp Receipt Share Modal */}
        <BrandedShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          payload={sharePayload}
        />
      </div>
    </AdminLayout>
  );
}
