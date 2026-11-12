'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import VideoLoader from '@/components/ui/VideoLoader';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Search,
  BookOpen,
  GraduationCap,
  Sparkles,
  RefreshCw,
  Filter,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  Clock,
  ChevronRight,
  TrendingUp,
  Percent,
  Calculator,
  X,
  Layers,
} from 'lucide-react';

const ENGLISH_MONTHS = [
  { id: 1, name: 'January', short: 'Jan' },
  { id: 2, name: 'February', short: 'Feb' },
  { id: 3, name: 'March', short: 'Mar' },
  { id: 4, name: 'April', short: 'Apr' },
  { id: 5, name: 'May', short: 'May' },
  { id: 6, name: 'June', short: 'Jun' },
  { id: 7, name: 'July', short: 'Jul' },
  { id: 8, name: 'August', short: 'Aug' },
  { id: 9, name: 'September', short: 'Sep' },
  { id: 10, name: 'October', short: 'Oct' },
  { id: 11, name: 'November', short: 'Nov' },
  { id: 12, name: 'December', short: 'Dec' },
];

const HIJRI_MONTHS = [
  { id: 1, name: 'Muharram', short: 'Muh' },
  { id: 2, name: 'Safar', short: 'Saf' },
  { id: 3, name: "Rabi' al-Awwal", short: 'Rab I' },
  { id: 4, name: "Rabi' al-Thani", short: 'Rab II' },
  { id: 5, name: 'Jumada al-Ula', short: 'Jum I' },
  { id: 6, name: 'Jumada al-Akhirah', short: 'Jum II' },
  { id: 7, name: 'Rajab', short: 'Raj' },
  { id: 8, name: "Sha'ban", short: 'Sha' },
  { id: 9, name: 'Ramadan', short: 'Ram' },
  { id: 10, name: 'Shawwal', short: 'Shaw' },
  { id: 11, name: "Dhu al-Qi'dah", short: 'Dhu Q' },
  { id: 12, name: 'Dhu al-Hijjah', short: 'Dhu H' },
];

interface StudentAttendanceItem {
  id: string;
  studentId: string;
  sprStudentId: string | null;
  fullName: string;
  division: string;
  photoUrl: string | null;
  class: { id: string; name: string };
  attendance: {
    id: string;
    percentage: number;
    points: number;
    month: number;
    monthName: string;
    year: number;
    calendarType: string;
    categoryCode: string;
    updatedAt: string;
  } | null;
}

export default function AttendancePage() {
  // 1. Category Switcher: ISLAMIC vs SCHOOL
  const [categoryCode, setCategoryCode] = useState<'ISLAMIC' | 'SCHOOL'>('ISLAMIC');

  // 2. Calendar Mode: ENGLISH vs HIJRI
  const [calendarType, setCalendarType] = useState<'ENGLISH' | 'HIJRI'>('ENGLISH');
  const [selectedMonth, setSelectedMonth] = useState<number>(9); // Default September
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  // 3. Class & Search Filters
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 4. Student & Attendance Data
  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<StudentAttendanceItem[]>([]);
  const [stats, setStats] = useState<any>(null);

  // 5. In-Memory Edit Buffer: studentId -> string percentage value
  const [editBuffer, setEditBuffer] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 6. Bulk Action States
  const [bulkInputValue, setBulkInputValue] = useState<string>('100');
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState<boolean>(false);

  // When calendar type changes, adjust default year and month if needed
  const handleCalendarChange = (newType: 'ENGLISH' | 'HIJRI') => {
    setCalendarType(newType);
    if (newType === 'HIJRI') {
      setSelectedYear(1448);
      setSelectedMonth(9); // Ramadan
    } else {
      setSelectedYear(2026);
      setSelectedMonth(9); // September
    }
    setEditBuffer({});
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const params = new URLSearchParams({
        categoryCode,
        calendarType,
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.append('classId', selectedClassId);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch attendance records.');
      }

      setStudents(data.students || []);
      setClasses(data.classes || []);
      setStats(data.stats || null);
      setEditBuffer({});
    } catch (err: any) {
      console.error('Attendance fetch error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading attendance data.' });
    } finally {
      setLoading(false);
    }
  }, [categoryCode, calendarType, selectedMonth, selectedYear, selectedClassId, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Months list for currently selected calendar
  const currentMonthsList = calendarType === 'HIJRI' ? HIJRI_MONTHS : ENGLISH_MONTHS;
  const currentMonthObj = currentMonthsList.find((m) => m.id === selectedMonth) || currentMonthsList[0];

  // Handle single student input change
  const handlePercentageChange = (studentId: string, val: string) => {
    setEditBuffer((prev) => ({
      ...prev,
      [studentId]: val,
    }));
  };

  // Check if student is modified
  const isStudentModified = (s: StudentAttendanceItem) => {
    if (!(s.id in editBuffer)) return false;
    const currentVal = s.attendance ? s.attendance.percentage.toString() : '';
    return editBuffer[s.id] !== currentVal;
  };

  // Get effective percentage for calculation preview
  const getEffectivePercentage = (s: StudentAttendanceItem): number | null => {
    if (s.id in editBuffer) {
      const parsed = parseFloat(editBuffer[s.id]);
      return isNaN(parsed) ? null : parsed;
    }
    return s.attendance ? s.attendance.percentage : null;
  };

  // Count modified items
  const modifiedCount = useMemo(() => {
    return students.filter((s) => isStudentModified(s)).length;
  }, [students, editBuffer]);

  // Bulk Apply to All Visible
  const handleApplyBulk = () => {
    const val = parseFloat(bulkInputValue);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Please enter a valid percentage between 0 and 100.');
      return;
    }
    const newBuffer: Record<string, string> = { ...editBuffer };
    students.forEach((s) => {
      newBuffer[s.id] = val.toString();
    });
    setEditBuffer(newBuffer);
    setBulkConfirmOpen(false);
    setStatusMsg({
      type: 'success',
      text: `Applied ${val}% to all ${students.length} visible students. Remember to click "Save All Changes" to persist.`,
    });
  };

  // Bulk Apply only to students with missing attendance
  const handleApplyBulkToEmpty = () => {
    const val = parseFloat(bulkInputValue);
    if (isNaN(val) || val < 0 || val > 100) {
      alert('Please enter a valid percentage between 0 and 100.');
      return;
    }
    const newBuffer: Record<string, string> = { ...editBuffer };
    let appliedCount = 0;
    students.forEach((s) => {
      if (!s.attendance && !(s.id in editBuffer)) {
        newBuffer[s.id] = val.toString();
        appliedCount++;
      }
    });
    setEditBuffer(newBuffer);
    setStatusMsg({
      type: 'success',
      text: `Applied ${val}% to ${appliedCount} students who were missing attendance. Click "Save All Changes" to persist.`,
    });
  };

  // Revert all unsaved changes
  const handleRevertChanges = () => {
    setEditBuffer({});
    setStatusMsg({ type: 'success', text: 'All unsaved input changes were reverted.' });
  };

  // Save changes to backend
  const handleSaveAttendance = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      // Collect entries to save
      const entriesToSave: Array<{ studentId: string; percentage: number }> = [];

      for (const s of students) {
        if (s.id in editBuffer) {
          const raw = editBuffer[s.id].trim();
          if (raw === '') continue; // Skip blank inputs
          const num = parseFloat(raw);
          if (isNaN(num) || num < 0 || num > 100) {
            throw new Error(`Invalid percentage "${raw}" for student ${s.fullName}. Must be between 0 and 100.`);
          }
          entriesToSave.push({ studentId: s.id, percentage: num });
        }
      }

      if (entriesToSave.length === 0) {
        throw new Error('No modified attendance entries to save.');
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode,
          calendarType,
          month: selectedMonth,
          monthName: currentMonthObj.name,
          year: selectedYear,
          entries: entriesToSave,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to save attendance.');
      }

      setStatusMsg({
        type: 'success',
        text: `Successfully saved attendance for ${entriesToSave.length} student(s) in ${categoryCode === 'ISLAMIC' ? 'Islamic Studies' : 'School Studies'} (${currentMonthObj.name} ${selectedYear}). SPR scoring updated.`,
      });

      await fetchData();
    } catch (err: any) {
      console.error('Save attendance error:', err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving attendance.' });
    } finally {
      setSaving(false);
    }
  };

  // Save single student
  const handleSaveSingleStudent = async (studentId: string) => {
    if (!(studentId in editBuffer)) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const raw = editBuffer[studentId].trim();
      const num = parseFloat(raw);
      if (isNaN(num) || num < 0 || num > 100) {
        throw new Error(`Percentage must be between 0 and 100.`);
      }

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryCode,
          calendarType,
          month: selectedMonth,
          monthName: currentMonthObj.name,
          year: selectedYear,
          entries: [{ studentId, percentage: num }],
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to save.');

      setStatusMsg({
        type: 'success',
        text: `Attendance saved successfully.`,
      });

      await fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-20">
        {/* Header & Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Attendance Management Module</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                SPR Engine Point Weight: 20 Pts Max
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-madin-900" />
              <span>Monthly Student Attendance</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter monthly attendance percentages (0% - 100%). Points are automatically computed via <span className="font-mono font-semibold">(Percentage / 100) × 20</span> and integrated into category SPR calculations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 cursor-pointer"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Section 1: Study Category Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setCategoryCode('ISLAMIC');
              setEditBuffer({});
            }}
            className={`p-4 rounded-2xl border-2 text-left transition flex items-center space-x-3.5 cursor-pointer shadow-subtle ${
              categoryCode === 'ISLAMIC'
                ? 'bg-gradient-to-r from-emerald-900 to-emerald-800 text-white border-emerald-700 shadow-md ring-2 ring-emerald-500/30'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                categoryCode === 'ISLAMIC' ? 'bg-white/10 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base">Islamic Studies Attendance</span>
                {categoryCode === 'ISLAMIC' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-white font-bold uppercase">
                    Active
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  categoryCode === 'ISLAMIC' ? 'text-emerald-200/90' : 'text-slate-500'
                }`}
              >
                Independent attendance records contributing to Islamic Studies (20% SPR Weight).
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setCategoryCode('SCHOOL');
              setEditBuffer({});
            }}
            className={`p-4 rounded-2xl border-2 text-left transition flex items-center space-x-3.5 cursor-pointer shadow-subtle ${
              categoryCode === 'SCHOOL'
                ? 'bg-gradient-to-r from-blue-900 to-blue-800 text-white border-blue-700 shadow-md ring-2 ring-blue-500/30'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                categoryCode === 'SCHOOL' ? 'bg-white/10 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}
            >
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-sm sm:text-base">School Studies Attendance</span>
                {categoryCode === 'SCHOOL' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-500 text-white font-bold uppercase">
                    Active
                  </span>
                )}
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  categoryCode === 'SCHOOL' ? 'text-blue-200/90' : 'text-slate-500'
                }`}
              >
                Independent attendance records contributing to School Studies (13.33% SPR Weight).
              </p>
            </div>
          </button>
        </div>

        {/* Section 2: Calendar & Month Selection Interface */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <CalendarDays className="w-4 h-4 text-madin-900" />
                <span>Calendar & Period Selector</span>
              </h2>
              <p className="text-xs text-slate-500">
                Choose between English and Arabic / Hijri calendars to manage monthly attendance.
              </p>
            </div>

            {/* Calendar Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto border border-slate-200">
              <button
                type="button"
                onClick={() => handleCalendarChange('ENGLISH')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  calendarType === 'ENGLISH'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>English Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => handleCalendarChange('HIJRI')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  calendarType === 'HIJRI'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Arabic / Hijri Calendar</span>
              </button>
            </div>
          </div>

          {/* Year and Month Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                <span>Select {calendarType === 'HIJRI' ? 'Hijri' : 'English'} Month:</span>
                <span className="text-madin-900 font-extrabold underline decoration-gold-500 decoration-2">
                  {currentMonthObj.name} {selectedYear} {calendarType === 'HIJRI' ? 'AH' : ''}
                </span>
              </div>

              {/* Year Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-semibold text-slate-500">Year:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                    setEditBuffer({});
                  }}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-madin-900 cursor-pointer"
                >
                  {calendarType === 'HIJRI' ? (
                    <>
                      <option value={1446}>1446 AH</option>
                      <option value={1447}>1447 AH</option>
                      <option value={1448}>1448 AH</option>
                      <option value={1449}>1449 AH</option>
                      <option value={1450}>1450 AH</option>
                    </>
                  ) : (
                    <>
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                      <option value={2028}>2028</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {currentMonthsList.map((m) => {
                const isSelected = m.id === selectedMonth;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedMonth(m.id);
                      setEditBuffer({});
                    }}
                    className={`py-2 px-2.5 rounded-xl border text-center transition cursor-pointer text-xs font-bold flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-madin-900 text-white border-madin-900 shadow-sm ring-2 ring-gold-400'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="truncate w-full">{m.name}</span>
                    <span
                      className={`text-[10px] font-mono mt-0.5 ${
                        isSelected ? 'text-gold-300' : 'text-slate-400'
                      }`}
                    >
                      Month {m.id}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 3: Summary Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                Total Students
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {stats.totalStudents}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Active enrolled roster</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">
                Attendance Recorded
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                {stats.recordedCount}{' '}
                <span className="text-xs font-semibold text-slate-400">
                  / {stats.totalStudents}
                </span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">
                {stats.totalStudents > 0
                  ? `${Math.round((stats.recordedCount / stats.totalStudents) * 100)}% complete`
                  : '—'}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">
                Pending / Missing
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
                {stats.missingCount}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5 font-medium">
                Needs attendance entry
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
              <div className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                Class Average
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
                {stats.avgPercentage}%
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5 font-mono font-bold">
                +{stats.avgPoints.toFixed(2)} / 20.00 pts
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Filtering & Bulk Actions Toolbar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Class Filter Pills */}
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
                    ? 'bg-madin-900 text-white shadow-xs'
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
                        ? 'bg-madin-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cls.name}
                  </button>
                );
              })}
            </div>

            {/* Student Search Box */}
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or SPR ID..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-madin-900 text-slate-900 placeholder:text-slate-400"
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
          </div>

          {/* Bulk Operations Toolbar */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 -mx-4 -mb-4 p-4 rounded-b-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <Percent className="w-3.5 h-3.5 text-blue-600" />
                <span>Bulk Set %:</span>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={bulkInputValue}
                onChange={(e) => setBulkInputValue(e.target.value)}
                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-xs font-bold text-slate-500">%</span>

              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Apply to All ({students.length})
              </button>

              <button
                type="button"
                onClick={handleApplyBulkToEmpty}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Apply to Missing Only
              </button>
            </div>

            {/* Quick Unsaved Changes Indicator */}
            {modifiedCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                  {modifiedCount} unsaved change(s)
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
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Monthly Attendance Roster Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <span>Roster & Percentage Entry</span>
                <span className="text-xs font-normal text-slate-500">
                  ({students.length} student{students.length !== 1 ? 's' : ''})
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Formula: <span className="font-mono font-semibold">Attendance Points = (Percentage / 100) × 20</span>
              </p>
            </div>

            <div className="text-xs text-slate-500 flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Saved</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span>
              <span>Edited (Unsaved)</span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 ml-2"></span>
              <span>Not Recorded</span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <VideoLoader
                size="md"
                text="Loading Student Roster & Attendance..."
                subtext={`Querying ${categoryCode === 'ISLAMIC' ? 'Islamic' : 'School'} Studies for ${currentMonthObj.name} ${selectedYear}`}
              />
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-800">No students found</div>
              <p className="text-xs text-slate-500">
                No active students found matching the selected class or search filter.
              </p>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3.5 text-center w-12">#</th>
                    <th className="py-3 px-3.5">Student Details</th>
                    <th className="py-3 px-3.5">Class / Div</th>
                    <th className="py-3 px-3.5 text-center">Saved Status</th>
                    <th className="py-3 px-3.5 text-center w-36">Attendance % (0-100)</th>
                    <th className="py-3 px-3.5 text-center w-36">SPR Points (/20)</th>
                    <th className="py-3 px-3.5 text-right w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {students.map((s, idx) => {
                    const isMod = isStudentModified(s);
                    const effectivePct = getEffectivePercentage(s);
                    const calculatedPoints =
                      effectivePct !== null ? Number(((effectivePct / 100) * 20).toFixed(2)) : null;

                    const inputValue =
                      s.id in editBuffer
                        ? editBuffer[s.id]
                        : s.attendance
                        ? s.attendance.percentage.toString()
                        : '';

                    return (
                      <tr
                        key={s.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isMod ? 'bg-amber-50/40' : s.attendance ? 'bg-white' : 'bg-slate-50/30'
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-medium">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-full bg-madin-900/10 text-madin-900 flex items-center justify-center font-bold text-xs shrink-0">
                              {s.fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <span>{s.fullName}</span>
                                {isMod && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved modification"></span>
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
                          ) : s.attendance ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Saved ({s.attendance.percentage}%)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                              Missing
                            </span>
                          )}
                        </td>

                        {/* Input Box for Percentage */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0-100"
                              value={inputValue}
                              onChange={(e) => handlePercentageChange(s.id, e.target.value)}
                              className={`w-24 px-2 py-1 text-center rounded-lg text-xs font-bold border transition focus:outline-none focus:ring-1 ${
                                isMod
                                  ? 'bg-amber-50 border-amber-400 text-amber-900 focus:ring-amber-500'
                                  : s.attendance
                                  ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900 focus:ring-emerald-500'
                                  : 'bg-white border-slate-200 text-slate-900 focus:ring-madin-900'
                              }`}
                            />
                            <span className="text-xs font-bold text-slate-400">%</span>
                          </div>
                        </td>

                        {/* Real-time Calculated Points Display */}
                        <td className="py-3 px-3.5 text-center">
                          {calculatedPoints !== null ? (
                            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 font-mono">
                              <Calculator className="w-3 h-3 text-blue-600" />
                              <span className="font-extrabold text-blue-900 text-xs">
                                {calculatedPoints.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-blue-600">/ 20</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs font-mono">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          {isMod && (
                            <button
                              type="button"
                              onClick={() => handleSaveSingleStudent(s.id)}
                              disabled={saving}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
                              title="Save this student's attendance"
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

        {/* Floating Bottom Bar When Modifications Exist */}
        {modifiedCount > 0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-madin-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-madin-700 flex items-center space-x-4 animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
              <span className="text-xs font-bold">
                {modifiedCount} student attendance change{modifiedCount > 1 ? 's' : ''} ready to save
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleRevertChanges}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Revert
              </button>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="px-4 py-1.5 bg-gold-500 hover:bg-gold-600 text-madin-950 rounded-xl text-xs font-black transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-md"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bulk Confirmation Modal */}
        {bulkConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-fade-in">
              <div className="flex items-center space-x-3 text-amber-600">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">Confirm Bulk Attendance Entry</h4>
                  <p className="text-xs text-slate-500">Apply to all visible students</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <div>
                  You are setting <span className="font-extrabold text-blue-700">{bulkInputValue}%</span> (
                  <span className="font-mono font-bold">
                    {((parseFloat(bulkInputValue) / 100) * 20).toFixed(2)} pts
                  </span>
                  ) for:
                </div>
                <div className="font-bold text-slate-900">
                  • {students.length} students in {selectedClassId === 'ALL' ? 'all classes' : 'selected class'}
                </div>
                <div className="font-bold text-slate-900">
                  • {categoryCode === 'ISLAMIC' ? 'Islamic Studies' : 'School Studies'} Attendance
                </div>
                <div className="font-bold text-slate-900">
                  • Period: {currentMonthObj.name} {selectedYear} ({calendarType} Calendar)
                </div>
              </div>

              <p className="text-xs text-slate-500">
                This will update the input fields. You can review all rows before saving.
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyBulk}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
                >
                  Apply {bulkInputValue}% to All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
