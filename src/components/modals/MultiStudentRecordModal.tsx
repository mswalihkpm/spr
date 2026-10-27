'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Trophy,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Medal,
} from 'lucide-react';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import SearchableProgrammeSelect from '@/components/ui/SearchableProgrammeSelect';
import CustomSelect from '@/components/ui/CustomSelect';

interface StudentRow {
  id: string;
  studentId: string;
  position: string;
  grade: string;
  remarks: string;
}

interface MultiStudentRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryType: 'LITERARY' | 'PROGRAMS';
  categoryTitle: string;
  categoryId: string;
  levels: any[];
  classes: any[];
  students: any[];
  subcategories?: any[];
  onSuccess: () => void;
}

const resolvePrizeMultiplier = (position: string | null | undefined): number => {
  const pos = (position || '').trim().toLowerCase();
  if (pos.startsWith('1') || pos.includes('first')) return 2.0;
  if (pos.startsWith('2') || pos.includes('second')) return 1.5;
  if (pos.startsWith('3') || pos.includes('third')) return 1.0;
  return 1.0;
};

const resolveLevelMultiplier = (lvlId: string, levelsList: any[]): number => {
  const matched = levelsList.find((l) => l.id === lvlId);
  if (matched && typeof matched.weightMultiplier === 'number') {
    return matched.weightMultiplier;
  }
  return 1.0;
};

export default function MultiStudentRecordModal({
  isOpen,
  onClose,
  categoryType,
  categoryTitle,
  categoryId,
  levels,
  classes,
  students,
  subcategories = [],
  onSuccess,
}: MultiStudentRecordModalProps) {
  const [festivalName, setFestivalName] = useState(
    categoryType === 'LITERARY' ? 'Sahityotsav' : 'Madin Excellence Talent Olympiad 2026'
  );
  const [subcategoryId, setSubcategoryId] = useState<string>('');
  const [programmeName, setProgrammeName] = useState('');
  const [levelId, setLevelId] = useState<string>('');
  const [basePoint, setBasePoint] = useState<number>(
    categoryType === 'LITERARY' ? 3.5 : 50
  );
  const [recordDate, setRecordDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  const [studentRows, setStudentRows] = useState<StudentRow[]>([
    { id: '1', studentId: '', position: '1st', grade: 'A+', remarks: '' },
    { id: '2', studentId: '', position: '2nd', grade: 'A', remarks: '' },
    { id: '3', studentId: '', position: '3rd', grade: 'B+', remarks: '' },
  ]);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Set default level and subcategory when opening
  useEffect(() => {
    if (levels.length > 0 && !levelId) {
      setLevelId(levels[0].id);
    }
    if (subcategories.length > 0 && !subcategoryId) {
      setSubcategoryId(subcategories[0].id);
      setFestivalName(subcategories[0].name);
    }
  }, [levels, subcategories]);

  if (!isOpen) return null;

  const currentLevelMult = resolveLevelMultiplier(levelId, levels);

  const handleAddStudentRow = () => {
    const nextPos =
      studentRows.length === 0
        ? '1st'
        : studentRows.length === 1
        ? '2nd'
        : studentRows.length === 2
        ? '3rd'
        : 'Participated';
    setStudentRows((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        studentId: '',
        position: nextPos,
        grade: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveStudentRow = (id: string) => {
    if (studentRows.length <= 1) {
      alert('At least one student row is required.');
      return;
    }
    setStudentRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateStudentRow = (id: string, field: keyof StudentRow, value: string) => {
    setStudentRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleProgrammeSelect = (name: string, histBasePoint?: number, histLevelId?: string, histEventName?: string) => {
    setProgrammeName(name);
    if (typeof histBasePoint === 'number' && histBasePoint > 0) {
      setBasePoint(histBasePoint);
    }
    if (histLevelId && levels.some((l) => l.id === histLevelId)) {
      setLevelId(histLevelId);
    }
    if (histEventName && categoryType === 'LITERARY') {
      const matchedSub = subcategories.find(
        (s) => s.name.toLowerCase() === histEventName.toLowerCase()
      );
      if (matchedSub) {
        setSubcategoryId(matchedSub.id);
        setFestivalName(matchedSub.name);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!programmeName.trim()) {
      setStatusMsg({ type: 'error', text: 'Please enter or select a programme name.' });
      return;
    }

    const validRows = studentRows.filter((r) => r.studentId);
    if (validRows.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please select at least one student.' });
      return;
    }

    setSaving(true);
    try {
      const recordsToUpload = validRows.map((r) => {
        const prizeMult = resolvePrizeMultiplier(r.position);
        const remarksText = `${festivalName} - ${programmeName}. ${
          r.position ? r.position + ' Position. ' : ''
        }${r.grade ? r.grade + ' Grade. ' : ''}${r.remarks || ''}`.trim();

        return {
          studentId: r.studentId,
          score: Number(basePoint) || 0,
          maxScore: 100,
          position: r.position || null,
          grade: r.grade || null,
          levelId: levelId || null,
          subcategoryId: subcategoryId || null,
          date: recordDate ? new Date(recordDate).toISOString() : new Date().toISOString(),
          remarks: remarksText,
        };
      });

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          subcategoryId: subcategoryId || null,
          levelId: levelId || null,
          date: recordDate ? new Date(recordDate).toISOString() : new Date().toISOString(),
          competitionName: programmeName.trim(),
          festivalName: festivalName.trim(),
          records: recordsToUpload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save programme records.');

      setStatusMsg({
        type: 'success',
        text: `Successfully added ${validRows.length} student record(s) for "${programmeName}"!`,
      });

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving records.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <Users className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Add Records: One Programme → Multiple Students
              </h3>
              <p className="text-xs text-blue-200 font-medium">
                {categoryTitle} • Select programme, level & base point, then add students with positions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
          {statusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center space-x-2.5 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Top Panel: Programme Details */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-200/60 dark:border-slate-700 pb-2">
              <span className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                <span>1. Programme Valuation & Setting</span>
              </span>
              <span className="text-[11px] text-blue-700 dark:text-blue-400 font-semibold">
                Applied to all students below
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Event / Festival */}
              {categoryType === 'LITERARY' && subcategories.length > 0 ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Festival / Event
                  </label>
                  <CustomSelect
                    value={subcategoryId}
                    onChange={(val) => {
                      setSubcategoryId(val);
                      const sub = subcategories.find((s) => s.id === val);
                      if (sub) setFestivalName(sub.name);
                    }}
                    options={subcategories.map((sub) => ({
                      value: sub.id,
                      label: sub.name,
                    }))}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Festival / Program Name
                  </label>
                  <input
                    type="text"
                    value={festivalName}
                    onChange={(e) => setFestivalName(e.target.value)}
                    required
                    placeholder="e.g. Madin Talent Olympiad 2026"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {/* Programme Name with Search & Previous Records Dropdown */}
              <div className="lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1 flex items-center justify-between">
                  <span>Programme Name</span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 lowercase font-normal">
                    (search with historical base points)
                  </span>
                </label>
                <SearchableProgrammeSelect
                  value={programmeName}
                  onChange={handleProgrammeSelect}
                  onBasePointsChange={(pts) => setBasePoint(pts)}
                  categoryType={categoryType}
                  placeholder="Select or search programme (e.g. Malayalam Essay Writing)..."
                  required
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Level
                </label>
                <CustomSelect
                  value={levelId}
                  onChange={(val) => setLevelId(val)}
                  options={levels.map((lvl) => ({
                    value: lvl.id,
                    label: `${lvl.name} (${lvl.weightMultiplier || 1.0}x)`,
                  }))}
                />
              </div>
            </div>

            {/* Base Point Input & Multiplier Info */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
                  Base Point (Unmultiplied):
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={basePoint}
                  onChange={(e) => setBasePoint(parseFloat(e.target.value) || 0)}
                  required
                  className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white text-center"
                />
                <span className="text-[11px] text-slate-500 font-medium">
                  pts
                </span>

                <div className="flex items-center space-x-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200 shrink-0">
                    Date:
                  </label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => setRecordDate(e.target.value)}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Level Mult: {currentLevelMult}x
                </span>
                <span>• Positions: 1st (2x), 2nd (1.5x), 3rd (1x)</span>
              </div>
            </div>
          </div>

          {/* Bottom Panel: Students List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>2. Add Participating Students ({studentRows.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select each student, assign their position, and check their calculated SPR points
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddStudentRow}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Student</span>
              </button>
            </div>

            {/* Students Table */}
            <div className="space-y-2.5">
              {studentRows.map((row, idx) => {
                const prizeMult = resolvePrizeMultiplier(row.position);
                const sprPointsPreview = Number(
                  (basePoint * currentLevelMult * prizeMult).toFixed(2)
                );

                return (
                  <div
                    key={row.id}
                    className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                  >
                    {/* Index badge */}
                    <div className="sm:col-span-1 flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                    </div>

                    {/* Student Selector */}
                    <div className="sm:col-span-5">
                      <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Student
                      </label>
                      <SearchableStudentSelect
                        students={students}
                        value={row.studentId}
                        onChange={(sId) => handleUpdateStudentRow(row.id, 'studentId', sId)}
                        placeholder="Select student by name or ID..."
                      />
                    </div>

                    {/* Position Selector */}
                    <div className="sm:col-span-3">
                      <label className="block sm:hidden text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Position
                      </label>
                      <select
                        value={row.position}
                        onChange={(e) => handleUpdateStudentRow(row.id, 'position', e.target.value)}
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                      >
                        <option value="1st">🥇 1st Position (2.0x)</option>
                        <option value="2nd">🥈 2nd Position (1.5x)</option>
                        <option value="3rd">🥉 3rd Position (1.0x)</option>
                        <option value="Participated">Participated (1.0x)</option>
                        <option value="">None / General (1.0x)</option>
                      </select>
                    </div>

                    {/* Live SPR Point Preview */}
                    <div className="sm:col-span-2 flex flex-col items-start sm:items-center justify-center">
                      <span className="text-[9.5px] uppercase font-bold text-slate-400">SPR Points</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs">
                        ✨ {sprPointsPreview} pts
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        ({basePoint}×{currentLevelMult}×{prizeMult})
                      </span>
                    </div>

                    {/* Remove button */}
                    <div className="sm:col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveStudentRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                        title="Remove student row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddStudentRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Student Row</span>
            </button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Records...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Student Records</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
