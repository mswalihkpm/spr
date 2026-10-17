'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  User,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Medal,
  Award,
} from 'lucide-react';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import SearchableProgrammeSelect from '@/components/ui/SearchableProgrammeSelect';
import StudentAvatar from '@/components/ui/StudentAvatar';

interface ProgrammeRow {
  id: string;
  festivalName: string;
  subcategoryId?: string;
  programmeName: string;
  levelId: string;
  basePoint: number;
  position: string;
  grade: string;
  remarks: string;
}

interface MultiProgrammeRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryType: 'LITERARY' | 'PROGRAMS';
  categoryTitle: string;
  categoryId: string;
  levels: any[];
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

export default function MultiProgrammeRecordModal({
  isOpen,
  onClose,
  categoryType,
  categoryTitle,
  categoryId,
  levels,
  students,
  subcategories = [],
  onSuccess,
}: MultiProgrammeRecordModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [defaultFestival, setDefaultFestival] = useState(
    categoryType === 'LITERARY' ? 'Sahityotsav' : 'Madin Excellence Talent Olympiad 2026'
  );

  const defaultBasePoint = categoryType === 'LITERARY' ? 3.5 : 50;

  const [programmeRows, setProgrammeRows] = useState<ProgrammeRow[]>([
    {
      id: '1',
      festivalName: defaultFestival,
      subcategoryId: subcategories[0]?.id || '',
      programmeName: '',
      levelId: levels[0]?.id || '',
      basePoint: defaultBasePoint,
      position: '1st',
      grade: 'A+',
      remarks: '',
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Set default student if not set
  useEffect(() => {
    if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
    if (levels.length > 0 && programmeRows[0]?.levelId === '') {
      setProgrammeRows((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, levelId: levels[0].id } : r))
      );
    }
  }, [students, levels]);

  if (!isOpen) return null;

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleAddProgrammeRow = () => {
    setProgrammeRows((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        festivalName: defaultFestival,
        subcategoryId: subcategories[0]?.id || '',
        programmeName: '',
        levelId: levels[0]?.id || '',
        basePoint: defaultBasePoint,
        position: '1st',
        grade: '',
        remarks: '',
      },
    ]);
  };

  const handleRemoveProgrammeRow = (id: string) => {
    if (programmeRows.length <= 1) {
      alert('At least one programme row is required.');
      return;
    }
    setProgrammeRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateProgrammeRow = (id: string, field: keyof ProgrammeRow, value: any) => {
    setProgrammeRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleProgrammeSelectForRow = (
    rowId: string,
    name: string,
    histBasePoint?: number,
    histLevelId?: string,
    histEventName?: string
  ) => {
    setProgrammeRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, programmeName: name };
        if (typeof histBasePoint === 'number' && histBasePoint > 0) {
          updated.basePoint = histBasePoint;
        }
        if (histLevelId && levels.some((l) => l.id === histLevelId)) {
          updated.levelId = histLevelId;
        }
        if (histEventName && categoryType === 'LITERARY') {
          updated.festivalName = histEventName;
          const matchedSub = subcategories.find(
            (s) => s.name.toLowerCase() === histEventName.toLowerCase()
          );
          if (matchedSub) updated.subcategoryId = matchedSub.id;
        }
        return updated;
      })
    );
  };

  // Calculate total combined SPR points for this student
  const totalCombinedSPR = programmeRows.reduce((sum, r) => {
    const lvlMult = resolveLevelMultiplier(r.levelId, levels);
    const prizeMult = resolvePrizeMultiplier(r.position);
    const pts = (Number(r.basePoint) || 0) * lvlMult * prizeMult;
    return sum + pts;
  }, 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (!selectedStudentId) {
      setStatusMsg({ type: 'error', text: 'Please select a student.' });
      return;
    }

    const validRows = programmeRows.filter((r) => r.programmeName.trim());
    if (validRows.length === 0) {
      setStatusMsg({ type: 'error', text: 'Please enter at least one programme.' });
      return;
    }

    setSaving(true);
    try {
      const recordsToUpload = validRows.map((r) => {
        const prizeMult = resolvePrizeMultiplier(r.position);
        const fest = r.festivalName || defaultFestival;
        const remarksText = `${fest} - ${r.programmeName}. ${
          r.position ? r.position + ' Position. ' : ''
        }${r.grade ? r.grade + ' Grade. ' : ''}${r.remarks || ''}`.trim();

        return {
          studentId: selectedStudentId,
          score: Number(r.basePoint) || 0,
          maxScore: 100,
          position: r.position || null,
          grade: r.grade || null,
          levelId: r.levelId || null,
          subcategoryId: r.subcategoryId || null,
          competitionName: r.programmeName.trim(),
          festivalName: fest.trim(),
          remarks: remarksText,
        };
      });

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId,
          records: recordsToUpload,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save programme records.');

      setStatusMsg({
        type: 'success',
        text: `Successfully added ${validRows.length} programme records for ${selectedStudent?.fullName || 'student'}! (+${totalCombinedSPR.toFixed(1)} SPR pts)`,
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
        <div className="px-6 py-5 bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                Add Records: One Student → Multiple Programmes
              </h3>
              <p className="text-xs text-indigo-200 font-medium">
                {categoryTitle} • Select a student, then add multiple competitions & evaluate SPR points
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

          {/* Top Panel: Student Selector */}
          <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/60 dark:bg-slate-800/60 border border-purple-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-slate-700 pb-2">
              <span className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-wider flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>1. Select Student</span>
              </span>
              {selectedStudent && (
                <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold">
                  {selectedStudent.class?.name || 'Class'} {selectedStudent.division ? `(${selectedStudent.division})` : ''}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Search & Select Student
                </label>
                <SearchableStudentSelect
                  students={students}
                  value={selectedStudentId}
                  onChange={(sId) => setSelectedStudentId(sId)}
                  placeholder="Type student name, SPR code, or batch..."
                />
              </div>

              {selectedStudent && (
                <div className="sm:col-span-4 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800 flex items-center space-x-3">
                  <StudentAvatar photoUrl={selectedStudent.photoUrl} name={selectedStudent.fullName} size="sm" />
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                      {selectedStudent.fullName}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono font-bold">
                      {selectedStudent.sprStudentId || selectedStudent.studentId}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Panel: Multiple Programmes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>2. Add Competition Programmes ({programmeRows.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select programme with historical base points, set level & position, and review SPR points
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddProgrammeRow}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Programme</span>
              </button>
            </div>

            {/* Programme Rows */}
            <div className="space-y-3">
              {programmeRows.map((row, idx) => {
                const lvlMult = resolveLevelMultiplier(row.levelId, levels);
                const prizeMult = resolvePrizeMultiplier(row.position);
                const sprPointsPreview = Number(
                  ((Number(row.basePoint) || 0) * lvlMult * prizeMult).toFixed(2)
                );

                return (
                  <div
                    key={row.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 space-y-3"
                  >
                    {/* Top Row: Index + Programme Name (with search) + Delete */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Programme #{idx + 1}
                        </span>
                      </div>

                      {/* Live SPR Points Badge */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Earned:</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-mono font-black text-xs">
                          ✨ {sprPointsPreview} SPR pts
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProgrammeRow(row.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition ml-1"
                          title="Remove programme row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Programme Name Searchable Select (with historical valuation points) */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1 flex items-center justify-between">
                        <span>Programme Name</span>
                        <span className="text-[9.5px] text-blue-600 dark:text-blue-400 lowercase font-normal">
                          (shows previously valuated base points)
                        </span>
                      </label>
                      <SearchableProgrammeSelect
                        value={row.programmeName}
                        onChange={(name, histBase, histLvl, histEvent) =>
                          handleProgrammeSelectForRow(row.id, name, histBase, histLvl, histEvent)
                        }
                        onBasePointsChange={(pts) => handleUpdateProgrammeRow(row.id, 'basePoint', pts)}
                        categoryType={categoryType}
                        placeholder="Search programme (e.g. HS Essay Writing Malayalam, Elocution)..."
                        required
                      />
                    </div>

                    {/* Row Settings: Level, Base Point, Position */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Level */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Level
                        </label>
                        <select
                          value={row.levelId}
                          onChange={(e) => handleUpdateProgrammeRow(row.id, 'levelId', e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          {levels.map((lvl) => (
                            <option key={lvl.id} value={lvl.id}>
                              {lvl.name} ({lvl.weightMultiplier || 1.0}x)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Base Point */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Base Point (Unmultiplied)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          value={row.basePoint}
                          onChange={(e) =>
                            handleUpdateProgrammeRow(row.id, 'basePoint', parseFloat(e.target.value) || 0)
                          }
                          required
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-200"
                        />
                      </div>

                      {/* Position */}
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                          Position Got
                        </label>
                        <select
                          value={row.position}
                          onChange={(e) => handleUpdateProgrammeRow(row.id, 'position', e.target.value)}
                          className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
                        >
                          <option value="1st">🥇 1st Position (2.0x)</option>
                          <option value="2nd">🥈 2nd Position (1.5x)</option>
                          <option value="3rd">🥉 3rd Position (1.0x)</option>
                          <option value="Participated">Participated (1.0x)</option>
                          <option value="">None / General (1.0x)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddProgrammeRow}
              className="w-full py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center justify-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Another Competition Programme</span>
            </button>
          </div>

          {/* Total Accumulated SPR Card */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-black text-indigo-950 dark:text-indigo-300 uppercase">
              Total Combined Points for {selectedStudent?.fullName || 'Student'}:
            </span>
            <span className="text-base font-black font-mono text-indigo-700 dark:text-indigo-300">
              +{totalCombinedSPR.toFixed(2)} SPR Points
            </span>
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
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Programmes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Student Programmes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
