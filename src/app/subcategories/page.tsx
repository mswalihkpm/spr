'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Trophy,
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Sliders,
  Sparkles,
  ArrowRight,
  Upload,
  Calendar,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import { getAcademicMasterData } from '@/lib/academic-client';

export default function OtherSubcategoriesPage() {
  const [activeTab, setActiveTab] = useState<'RECORD' | 'BUILDER'>('RECORD');
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selected subcategory for recording
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string>('');

  // Record Score Form State
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    levelId: '',
    score: '100',
    maxScore: '100',
    position: '1st',
    grade: 'A+',
    remarks: '',
  });
  const [savingScore, setSavingScore] = useState(false);

  // Builder Modal State
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    categoryId: '',
    logoUrl: '',
    hasLevels: false,
    hasMaxScore: true,
    maxScore: 100,
    weight: 1.0,
    active: true,
  });
  const [savingBuilder, setSavingBuilder] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataMaster, resSubs, resStudents, resScores] = await Promise.all([
        getAcademicMasterData(),
        fetch('/api/subcategories'),
        fetch('/api/students?limit=100'),
        fetch('/api/scores'),
      ]);

      const dataSubs = await resSubs.json();
      const dataStudents = await resStudents.json();
      const dataScores = await resScores.json();

      if (dataMaster.categories) {
        setCategories(dataMaster.categories);
      }
      if (dataMaster.levels) {
        setLevels(dataMaster.levels);
        if (dataMaster.levels.length > 0 && !recordForm.levelId) {
          setRecordForm((prev) => ({ ...prev, levelId: dataMaster.levels[0].id }));
        }
      }
      if (dataStudents.students) {
        setStudents(dataStudents.students);
        if (dataStudents.students.length > 0 && !recordForm.studentId) {
          setRecordForm((prev) => ({ ...prev, studentId: dataStudents.students[0].id }));
        }
      }
      if (dataSubs.subcategories) {
        setSubcategories(dataSubs.subcategories);
        if (dataSubs.subcategories.length > 0 && !selectedSubcategoryId) {
          setSelectedSubcategoryId(dataSubs.subcategories[0].id);
        }
      }
      if (dataScores.records) {
        const subRecords = dataScores.records.filter((r: any) => r.subcategoryId);
        setRecentRecords(subRecords);
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

  const activeSubcategory = subcategories.find((s) => s.id === selectedSubcategoryId) || subcategories[0];

  // Save Score for Subcategory
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubcategory) return;
    setStatusMsg(null);
    setSavingScore(true);

    try {
      const scoreVal = parseFloat(recordForm.score) || 0;
      const maxScoreVal = activeSubcategory.hasMaxScore ? (parseFloat(recordForm.maxScore) || 100) : 100;
      const percentage = maxScoreVal > 0 ? (scoreVal / maxScoreVal) * 100 : scoreVal;

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: recordForm.studentId,
          categoryId: activeSubcategory.categoryId,
          subcategoryId: activeSubcategory.id,
          levelId: activeSubcategory.hasLevels ? recordForm.levelId : null,
          obtainedScore: scoreVal,
          maxScore: maxScoreVal,
          percentage: Math.min(percentage, 100),
          position: recordForm.position || null,
          grade: recordForm.grade || null,
          remarks: recordForm.remarks ? `${activeSubcategory.name} - ${recordForm.remarks}` : activeSubcategory.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save score.');

      setStatusMsg({ type: 'success', text: `Score recorded for ${activeSubcategory.name} successfully!` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSavingScore(false);
    }
  };

  // Open Builder Modal
  const handleOpenAddSub = () => {
    setEditingSubId(null);
    const qualCat = categories.find((c) => c.code === 'QUALIFICATION') || categories[0];
    setBuilderForm({
      name: '',
      categoryId: qualCat?.id || '',
      logoUrl: '',
      hasLevels: false,
      hasMaxScore: true,
      maxScore: 100,
      weight: 1.0,
      active: true,
    });
    setBuilderModalOpen(true);
  };

  const handleOpenEditSub = (sub: any) => {
    setEditingSubId(sub.id);
    setBuilderForm({
      name: sub.name,
      categoryId: sub.categoryId,
      logoUrl: sub.logoUrl || '',
      hasLevels: Boolean(sub.hasLevels),
      hasMaxScore: sub.hasMaxScore !== false,
      maxScore: sub.maxScore || 100,
      weight: sub.weight || 1.0,
      active: sub.active !== false,
    });
    setBuilderModalOpen(true);
  };

  // Save Subcategory in Builder
  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSavingBuilder(true);

    try {
      const method = editingSubId ? 'PUT' : 'POST';
      const body = editingSubId ? { id: editingSubId, ...builderForm } : builderForm;

      const res = await fetch('/api/subcategories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save subcategory.');

      setStatusMsg({
        type: 'success',
        text: `Subcategory ${editingSubId ? 'updated' : 'created'} successfully!`,
      });
      setBuilderModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSavingBuilder(false);
    }
  };

  // Delete Subcategory
  const handleDeleteSubcategory = async (sub: any) => {
    if (!confirm(`Are you sure you want to delete subcategory "${sub.name}"? All associated scores will also be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subcategories?id=${sub.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete subcategory.');

      setStatusMsg({ type: 'success', text: `Subcategory "${sub.name}" deleted.` });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting subcategory');
    }
  };

  const handleDeleteRecord = async (rec: any) => {
    if (!confirm(`Delete score record for ${rec.student?.fullName}?`)) return;
    try {
      const res = await fetch(`/api/scores?id=${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatusMsg({ type: 'success', text: 'Score record deleted.' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting score');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300">
                Custom Categories & Multi-Wing Registry
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-700" />
              <span>Other Subcategories & Qualification Builder</span>
            </h2>
            <p className="text-xs text-slate-500">
              Build custom subcategories with logos, level multipliers, and dedicated scoring leaderboards.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('RECORD')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'RECORD'
                  ? 'bg-madin-900 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Record Scores
            </button>
            <button
              onClick={() => setActiveTab('BUILDER')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'BUILDER'
                  ? 'bg-madin-900 text-white shadow'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Subcategory Builder ({subcategories.length})
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

        {/* Subcategories Badged Cards Carousel / Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Created Subcategories & Dedicated Standings</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any subcategory to record scores or view its dedicated leaderboard.
              </p>
            </div>
            <button
              onClick={handleOpenAddSub}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Build Subcategory</span>
            </button>
          </div>

          {subcategories.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No custom subcategories built yet. Click &quot;+ Build Subcategory&quot; to create Qualification, Hifz, Sports, etc.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {subcategories.map((sub) => {
                const isSelected = sub.id === selectedSubcategoryId;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubcategoryId(sub.id)}
                    className={`group p-4 bg-white rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {sub.logoUrl ? (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <Image src={sub.logoUrl} alt={sub.name} width={44} height={44} className="w-full h-full object-contain" unoptimized />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 font-black text-sm">
                          {sub.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-800">
                        {sub.category?.name || 'Qualification'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition">
                        {sub.name}
                      </h4>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                        <span>Weight: {sub.weight || 1.0}x</span>
                        <span>•</span>
                        <span>{sub.hasLevels ? 'Multi-Level' : 'Direct'}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                      <Link
                        href={`/leaderboard?subcategoryId=${sub.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline flex items-center space-x-1"
                      >
                        <span>Leaderboard</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSub(sub);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TAB 1: RECORD SCORES */}
        {activeTab === 'RECORD' && activeSubcategory && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Recording Box */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                  Active Subcategory
                </span>
                <h3 className="text-base font-black text-slate-900 mt-0.5">
                  Record Score: {activeSubcategory.name}
                </h3>
              </div>

              <form onSubmit={handleSaveScore} className="space-y-3.5">
                {/* Searchable Student Selector */}
                <SearchableStudentSelect
                  students={students}
                  value={recordForm.studentId}
                  onChange={(id) => setRecordForm({ ...recordForm, studentId: id })}
                  label="Select Student"
                  required
                />

                {/* Level selection (if enabled) */}
                {activeSubcategory.hasLevels && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Competition Level *
                    </label>
                    <select
                      value={recordForm.levelId}
                      onChange={(e) => setRecordForm({ ...recordForm, levelId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      {levels.map((lvl) => (
                        <option key={lvl.id} value={lvl.id}>
                          {lvl.name} (Multiplier: {lvl.weightMultiplier}x)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Position Dropbox (1st, 2nd, 3rd, Participated) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Position Awarded
                    </label>
                    <select
                      value={recordForm.position}
                      onChange={(e) => setRecordForm({ ...recordForm, position: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="1st">1st Position (Winner)</option>
                      <option value="2nd">2nd Position (Runner Up)</option>
                      <option value="3rd">3rd Position (Third)</option>
                      <option value="Participated">Participated / Qualified</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grade <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <select
                      value={recordForm.grade}
                      onChange={(e) => setRecordForm({ ...recordForm, grade: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      <option value="">None (Optional)</option>
                      <option value="A+">A+ Grade</option>
                      <option value="A">A Grade</option>
                      <option value="B+">B+ Grade</option>
                      <option value="B">B Grade</option>
                      <option value="C">C Grade</option>
                    </select>
                  </div>
                </div>

                {/* Score Input */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Score Awarded *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="1000"
                      value={recordForm.score}
                      onChange={(e) => setRecordForm({ ...recordForm, score: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  {activeSubcategory.hasMaxScore ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Max Score
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        value={recordForm.maxScore}
                        onChange={(e) => setRecordForm({ ...recordForm, maxScore: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Weight Multiplier
                      </label>
                      <div className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700">
                        {activeSubcategory.weight}x
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Remarks / Details <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={recordForm.remarks}
                    onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                    placeholder="e.g. State championship award..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingScore}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>{savingScore ? 'Recording...' : 'Record Subcategory Score'}</span>
                </button>
              </form>
            </div>

            {/* Recent Recorded Scores Table */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Recorded Scores for {activeSubcategory.name} ({recentRecords.filter((r) => r.subcategoryId === activeSubcategory.id).length})
                  </span>
                  <Link
                    href={`/leaderboard?subcategoryId=${activeSubcategory.id}`}
                    className="text-xs font-bold text-indigo-700 hover:underline flex items-center space-x-1"
                  >
                    <span>View Dedicated Standings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                  {recentRecords
                    .filter((r) => r.subcategoryId === activeSubcategory.id)
                    .map((rec) => (
                      <div key={rec.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">
                            {rec.student?.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                            <span>{rec.student?.class?.name}</span>
                            {rec.position && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[10px]">
                                {rec.position}
                              </span>
                            )}
                            {rec.grade && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px]">
                                {rec.grade}
                              </span>
                            )}
                            {rec.level && (
                              <span className="text-slate-400 font-medium">({rec.level.name})</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 shrink-0">
                          <div className="text-right">
                            <span className="font-mono font-bold text-indigo-700 text-sm">
                              {rec.obtainedScore}
                            </span>
                            <span className="text-slate-400 text-[10px]">/{rec.maxScore}</span>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ({rec.percentage?.toFixed(1)}%)
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteRecord(rec)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete score"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  {recentRecords.filter((r) => r.subcategoryId === activeSubcategory.id).length === 0 && (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No scores recorded yet for {activeSubcategory.name}. Use the form on the left to add one.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BUILDER TAB */}
        {activeTab === 'BUILDER' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Custom Subcategory Builder</h3>
                <p className="text-xs text-slate-500">Create, customize features, configure logos, and manage weightage.</p>
              </div>
              <button
                onClick={handleOpenAddSub}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow"
              >
                <Plus className="w-4 h-4 text-gold-400" />
                <span>+ Create Subcategory</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {subcategories.map((sub) => (
                <div key={sub.id} className="py-4 first:pt-0 flex items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    {sub.logoUrl ? (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 p-1 shrink-0 overflow-hidden border border-slate-200">
                        <Image src={sub.logoUrl} alt={sub.name} width={44} height={44} className="w-full h-full object-contain" unoptimized />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0 font-black">
                        {sub.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                        <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {sub.category?.name || 'Qualification'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                        <span>Levels: {sub.hasLevels ? 'Enabled' : 'Disabled'}</span>
                        <span>•</span>
                        <span>Max Score: {sub.hasMaxScore ? sub.maxScore : 'Direct'}</span>
                        <span>•</span>
                        <span>Weight: {sub.weight || 1.0}x</span>
                        <span>•</span>
                        <span>{sub._count?.performanceRecords || 0} scores recorded</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => handleOpenEditSub(sub)}
                      className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                      title="Edit Features"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubcategory(sub)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100"
                      title="Delete Subcategory"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Builder Modal */}
        {builderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>{editingSubId ? 'Edit Subcategory Features' : 'Build New Subcategory'}</span>
                </h3>
                <button onClick={() => setBuilderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSubcategory} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subcategory Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={builderForm.name}
                    onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                    placeholder="e.g. Hifz Al-Quran, Sports Championship, Language..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Category *
                  </label>
                  <select
                    value={builderForm.categoryId}
                    onChange={(e) => setBuilderForm({ ...builderForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Logo URL / Preset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subcategory Logo / Icon URL <span className="text-slate-400 font-normal">(for Badging)</span>
                  </label>
                  <input
                    type="text"
                    value={builderForm.logoUrl}
                    onChange={(e) => setBuilderForm({ ...builderForm, logoUrl: e.target.value })}
                    placeholder="e.g. /sahityotsav.png, /kalotsav.png or web URL"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {/* Feature Toggles */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Scoring & Level Configuration
                  </div>

                  <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={builderForm.hasLevels}
                      onChange={(e) => setBuilderForm({ ...builderForm, hasLevels: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Enable Multi-Level Multipliers (District, State, National...)</span>
                  </label>

                  <label className="flex items-center space-x-2.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={builderForm.hasMaxScore}
                      onChange={(e) => setBuilderForm({ ...builderForm, hasMaxScore: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>Include Maximum Score & Percentage Calculation</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Weight Multiplier
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={builderForm.weight}
                      onChange={(e) => setBuilderForm({ ...builderForm, weight: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Max Score
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={builderForm.maxScore}
                      onChange={(e) => setBuilderForm({ ...builderForm, maxScore: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setBuilderModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBuilder}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-gold-400" />
                    <span>{savingBuilder ? 'Saving...' : editingSubId ? 'Update Subcategory' : 'Save Subcategory'}</span>
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
