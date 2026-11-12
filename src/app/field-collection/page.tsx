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
  Percent,
  X,
  SlidersHorizontal,
  ChevronDown,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';

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
  // 1. Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<StudentFieldCollectionItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);

  // 2. Class & Search Filters
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Advanced Search & Sorting
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'RECORDED' | 'MISSING' | 'MODIFIED'>('ALL');
  const [presetRange, setPresetRange] = useState<string>('ALL'); // ALL, 100+, 50-100, <50, 0
  const [customMin, setCustomMin] = useState<string>('');
  const [customMax, setCustomMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('CLASS_ASC');

  // 4. In-Memory Edit Buffer: studentId -> string point value
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
  const [remarksBuffer, setRemarksBuffer] = useState<Record<string, string>>({});
  const [defaultDriveName, setDefaultDriveName] = useState<string>('Field Collection Drive');
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 5. Bulk Operations
  const [bulkInputValue, setBulkInputValue] = useState<string>('50');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState<boolean>(false);

  // Fetch Data from Backend
  const fetchData = useCallback(async () => {
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

      const res = await fetch(`/api/field-collection?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load field collection data.');
      }

      setStudents(data.students || []);
      setClasses(data.classes || []);
      setStats(data.stats || null);
      setCategory(data.category || null);
      setEditBuffer({});
      setRemarksBuffer({});
    } catch (err: any) {
      console.error('Field collection fetch error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading field collection data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if student is modified in buffer
  const isStudentModified = (s: StudentFieldCollectionItem) => {
    if (s.id in editBuffer) {
      const currentVal = s.totalPoints > 0 ? s.totalPoints.toString() : '';
      if (editBuffer[s.id] !== currentVal) return true;
    }
    if (s.id in remarksBuffer) {
      const curRem = s.latestRecord?.remarks || '';
      if (remarksBuffer[s.id] !== curRem) return true;
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
  }, [students, editBuffer, remarksBuffer]);

  // Dynamically discover all unique divisions
  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.division) set.add(s.division);
    });
    return Array.from(set).sort();
  }, [students]);

  // Count active advanced filters
  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (selectedDivision !== 'ALL') count++;
    if (selectedStatus !== 'ALL') count++;
    if (presetRange !== 'ALL' || customMin !== '' || customMax !== '') count++;
    if (sortBy !== 'CLASS_ASC') count++;
    return count;
  }, [selectedDivision, selectedStatus, presetRange, customMin, customMax, sortBy]);

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setSelectedDivision('ALL');
    setSelectedStatus('ALL');
    setPresetRange('ALL');
    setCustomMin('');
    setCustomMax('');
    setSortBy('CLASS_ASC');
  };

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
        // Default: CLASS_ASC
        return 0;
      });
  }, [students, selectedDivision, selectedStatus, presetRange, customMin, customMax, sortBy, editBuffer, remarksBuffer]);

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
      text: `Applied ${val} points to ${processedStudents.length} visible student(s). Click "Save All Changes" to persist.`,
    });
  };

  // Bulk Apply only to students with 0 points
  const handleApplyBulkToEmpty = () => {
    const val = parseFloat(bulkInputValue);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid positive point value.');
      return;
    }
    const newBuffer: Record<string, string> = { ...editBuffer };
    let appliedCount = 0;
    processedStudents.forEach((s) => {
      if (s.totalPoints === 0 && !(s.id in editBuffer)) {
        newBuffer[s.id] = val.toString();
        appliedCount++;
      }
    });
    setEditBuffer(newBuffer);
    setStatusMsg({
      type: 'success',
      text: `Applied ${val} points to ${appliedCount} unrecorded student(s). Click "Save All Changes" to persist.`,
    });
  };

  // Revert all unsaved edits
  const handleRevertChanges = () => {
    setEditBuffer({});
    setRemarksBuffer({});
    setStatusMsg({ type: 'success', text: 'All unsaved point changes were reverted.' });
  };

  // Single Student Save
  const handleSaveSingleStudent = async (studentId: string) => {
    const rawVal = editBuffer[studentId];
    const rawRemark = remarksBuffer[studentId] || defaultDriveName;
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
          driveName: rawRemark,
          entries: [{ studentId, points: num, remarks: rawRemark }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save student points.');

      setStatusMsg({ type: 'success', text: `Points saved successfully. SPR rankings updated.` });
      await fetchData();
    } catch (err: any) {
      console.error('Error saving single student:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving student points.' });
    } finally {
      setSaving(false);
    }
  };

  // Bulk Save all modified students
  const handleSaveAll = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const entriesToSave: Array<{ studentId: string; points: number; remarks?: string }> = [];

      for (const s of students) {
        if (s.id in editBuffer || s.id in remarksBuffer) {
          const raw = editBuffer[s.id] !== undefined ? editBuffer[s.id].trim() : s.totalPoints.toString();
          const num = parseFloat(raw);
          if (isNaN(num) || num < 0) {
            throw new Error(`Invalid points value "${raw}" for student ${s.fullName}. Must be >= 0.`);
          }
          const rem = remarksBuffer[s.id]?.trim() || defaultDriveName;
          entriesToSave.push({ studentId: s.id, points: num, remarks: rem });
        }
      }

      if (entriesToSave.length === 0) {
        throw new Error('No modified student points to save.');
      }

      const res = await fetch('/api/field-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveName: defaultDriveName,
          entries: entriesToSave,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save field collection points.');

      setStatusMsg({
        type: 'success',
        text: `Successfully saved points for ${entriesToSave.length} student(s). SPR engine and leaderboards refreshed.`,
      });
      await fetchData();
    } catch (err: any) {
      console.error('Save points error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving points.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
        {/* Header Banner */}
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
                    Direct Points Allocation
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
                  Field Collection Management
                </h1>
                <p className="text-xs sm:text-sm text-emerald-100/90 max-w-2xl mt-1 leading-relaxed">
                  Record and assign collection points directly to students, filter and sort by classes, and manage campaign performance for SPR calculations.
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 shrink-0">
              <div className="text-center px-2">
                <div className="text-[10px] font-bold uppercase text-emerald-200">Total Points</div>
                <div className="text-lg font-black text-white font-mono mt-0.5">
                  {stats ? stats.totalPointsCollected.toFixed(1) : '0.0'}
                </div>
              </div>
              <div className="text-center px-2 border-l border-white/10">
                <div className="text-[10px] font-bold uppercase text-emerald-200">Awarded</div>
                <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                  {stats ? `${stats.recordedCount}/${stats.totalStudentsCount}` : '0/0'}
                </div>
              </div>
              <div className="text-center px-2 border-l border-white/10">
                <div className="text-[10px] font-bold uppercase text-emerald-200">Average Pts</div>
                <div className="text-lg font-black text-white font-mono mt-0.5">
                  {stats ? stats.averagePoints.toFixed(1) : '0.0'}
                </div>
              </div>
              <div className="text-center px-2 border-l border-white/10">
                <div className="text-[10px] font-bold uppercase text-emerald-200">Top Points</div>
                <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                  {stats ? stats.highestPoints.toFixed(1) : '0.0'}
                </div>
              </div>
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
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Control Box: Class Filter & Search */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Class Filter Tabs */}
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

            {/* Student Search & Advanced Search Toggle */}
            <div className="flex items-center space-x-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or SPR ID..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-800 text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                  isAdvancedOpen || activeAdvancedCount > 0
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Toggle Advanced Search & Sorting Options"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                <span>Advanced</span>
                {activeAdvancedCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {activeAdvancedCount}
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Advanced Search & Filtering Options Panel */}
          {isAdvancedOpen && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/80 text-xs space-y-3 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                <div className="flex items-center space-x-1.5 text-emerald-950 font-bold">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span>Advanced Search, Multi-Filter &amp; Custom Sorting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-600">
                    Showing <span className="text-emerald-700 font-black">{processedStudents.length}</span> of {students.length} students
                  </span>
                  {activeAdvancedCount > 0 && (
                    <button
                      type="button"
                      onClick={resetAdvancedFilters}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Division Filter */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Division
                  </label>
                  <select
                    value={selectedDivision}
                    onChange={(e) => setSelectedDivision(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="ALL">All Divisions ({availableDivisions.length})</option>
                    {availableDivisions.map((div) => (
                      <option key={div} value={div}>
                        Division {div}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Collection Status */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Collection Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="RECORDED">Points Awarded Only</option>
                    <option value="MISSING">Unrecorded / 0 Points Only</option>
                    <option value="MODIFIED">Edited (Unsaved)</option>
                  </select>
                </div>

                {/* 3. Points Preset Benchmark */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Points Preset Benchmark
                  </label>
                  <select
                    value={presetRange}
                    onChange={(e) => {
                      setPresetRange(e.target.value);
                      setCustomMin('');
                      setCustomMax('');
                    }}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="ALL">All Point Ranges</option>
                    <option value="100+">≥ 100 Points</option>
                    <option value="50-100">50 - 99 Points</option>
                    <option value="<50">1 - 49 Points</option>
                    <option value="0">0 Points</option>
                  </select>
                </div>

                {/* 4. Sort Roster By */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Sort Roster By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  >
                    <option value="CLASS_ASC">Class &amp; Division (Default)</option>
                    <option value="NAME_ASC">Student Name (A → Z)</option>
                    <option value="NAME_DESC">Student Name (Z → A)</option>
                    <option value="SPR_ASC">SPR ID (Lowest First)</option>
                    <option value="SPR_DESC">SPR ID (Highest First)</option>
                    <option value="POINTS_DESC">Points (Highest First)</option>
                    <option value="POINTS_ASC">Points (Lowest First)</option>
                  </select>
                </div>
              </div>

              {/* Custom Min / Max Range Controls */}
              <div className="pt-2 border-t border-emerald-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-[11px] font-medium text-slate-700">
                  <span>Custom Points Range:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Min Pts"
                    value={customMin}
                    onChange={(e) => {
                      setCustomMin(e.target.value);
                      setPresetRange('ALL');
                    }}
                    className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Max Pts"
                    value={customMax}
                    onChange={(e) => {
                      setCustomMax(e.target.value);
                      setPresetRange('ALL');
                    }}
                    className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                  />
                  <span>pts</span>
                </div>

                <div className="text-[11px] text-slate-500 font-medium">
                  Live filtering across all active student records.
                </div>
              </div>
            </div>
          )}

          {/* Campaign / Drive Title Setup & Bulk Toolbar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 -mx-5 -mb-5 p-4 rounded-b-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Coins className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bulk Set Points:</span>
              </span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={bulkInputValue}
                onChange={(e) => setBulkInputValue(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <span className="text-xs font-bold text-slate-500">pts</span>

              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Apply to Visible ({processedStudents.length})
              </button>

              <button
                type="button"
                onClick={handleApplyBulkToEmpty}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Apply to 0 Pts Only
              </button>
            </div>

            {/* Campaign Drive Title & Save All Action */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Campaign:</span>
                <input
                  type="text"
                  value={defaultDriveName}
                  onChange={(e) => setDefaultDriveName(e.target.value)}
                  placeholder="Campaign / Drive Title"
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 w-44"
                />
              </div>

              {modifiedCount > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                    {modifiedCount} unsaved edit(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleRevertChanges}
                    className="p-1 text-slate-400 hover:text-slate-600 text-xs font-semibold flex items-center space-x-1"
                    title="Revert all changes"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving || modifiedCount === 0}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition cursor-pointer shadow-sm ${
                  modifiedCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : `Save All Changes (${modifiedCount})`}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <span>Student Points Roster</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                  {processedStudents.length} Students
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter point values for each student. Points directly contribute to Field Collection and Overall SPR.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition self-end sm:self-center"
              title="Refresh roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <VideoLoader
                size="md"
                text="Loading Student Roster & Collection Points..."
                subtext="Querying Field Collection records and class lists"
              />
            </div>
          ) : processedStudents.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-800">No students match current filters</div>
              <p className="text-xs text-slate-500">
                No active students found matching the selected class, search query, or advanced filter options.
              </p>
              {activeAdvancedCount > 0 && (
                <button
                  type="button"
                  onClick={resetAdvancedFilters}
                  className="mt-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                >
                  Clear Advanced Filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-12">#</th>
                    <th className="py-3 px-3.5">Student Details</th>
                    <th className="py-3 px-3.5">Class / Div</th>
                    <th className="py-3 px-3.5 text-center">Collection Status</th>
                    <th className="py-3 px-3.5 text-center w-40">Points Value</th>
                    <th className="py-3 px-3.5 text-left w-56">Campaign / Drive Title</th>
                    <th className="py-3 px-3.5 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {processedStudents.map((s, idx) => {
                    const isMod = isStudentModified(s);
                    const effectivePoints = getEffectivePoints(s);

                    const inputValue =
                      s.id in editBuffer
                        ? editBuffer[s.id]
                        : s.totalPoints > 0
                        ? s.totalPoints.toString()
                        : '';

                    const remarkValue =
                      s.id in remarksBuffer
                        ? remarksBuffer[s.id]
                        : s.latestRecord?.remarks || defaultDriveName;

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isMod ? 'bg-amber-50/40' : s.totalPoints > 0 ? 'bg-white' : 'bg-slate-50/30'
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
                                  ></span>
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
                              Awarded ({s.totalPoints} pts)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              0 Points
                            </span>
                          )}
                        </td>

                        {/* Input Box for Points */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
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
                        </td>

                        {/* Campaign Title / Remarks Input */}
                        <td className="py-3 px-3.5">
                          <input
                            type="text"
                            value={remarkValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              setRemarksBuffer((prev) => ({ ...prev, [s.id]: val }));
                            }}
                            placeholder="Drive or Campaign Title"
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 font-medium"
                          />
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          {isMod && (
                            <button
                              type="button"
                              onClick={() => handleSaveSingleStudent(s.id)}
                              disabled={saving}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs"
                              title="Save this student's points"
                            >
                              Save
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Confirmation Modal for Bulk Apply */}
        {bulkConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
              <div className="flex items-center space-x-3 text-emerald-800">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <Coins className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-base">Confirm Bulk Points Apply</h4>
                  <p className="text-xs text-slate-500">Field Collection Points Assignment</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to set <strong className="text-slate-900 font-mono">{bulkInputValue} points</strong> for all <strong className="text-slate-900">{processedStudents.length} visible student(s)</strong>?
              </p>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Note:</strong> Changes will be staged in the edit buffer. You must click <strong>"Save All Changes"</strong> to persist them to the database.
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
      </div>
    </AdminLayout>
  );
}
