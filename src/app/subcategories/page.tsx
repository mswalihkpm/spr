'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Globe,
  BookOpen,
  Palette,
  Check,
  Zap,
  Info,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import { getAcademicMasterData } from '@/lib/academic-client';

const LEVEL_PRESETS = [
  {
    id: 'ALL',
    label: 'All Standard Levels',
    description: 'Includes all 11 competition levels (Campus up to International)',
    levelCodes: ['CAMPUS', 'SCHOOL', 'KULLIYA', 'DAAERA', 'DIVISION', 'SUB_DISTRICT', 'DISTRICT', 'JAMIA', 'STATE', 'NATIONAL', 'INTERNATIONAL'],
    badge: 'All 11 Levels',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-900',
  },
  {
    id: 'MAHARJAN',
    label: 'Maharjan Levels',
    description: 'Kulliya (1x) → Daaera (1x) → Jamia (1.5x)',
    levelCodes: ['KULLIYA', 'DAAERA', 'JAMIA'],
    badge: 'Maharjan (3 Levels)',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  },
  {
    id: 'SAHITYOTSAV',
    label: 'Sahityotsav Levels',
    description: 'Division (1x) → District (1.25x) → State (1.5x) → National (2x)',
    levelCodes: ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'],
    badge: 'Sahityotsav (4 Levels)',
    color: 'bg-amber-50 border-amber-200 text-amber-900',
  },
  {
    id: 'KALOTSAV',
    label: 'Kalotsav Levels',
    description: 'Sub-district (1x) → District (1.25x) → State (1.5x)',
    levelCodes: ['SUB_DISTRICT', 'DISTRICT', 'STATE'],
    badge: 'Kalotsav (3 Levels)',
    color: 'bg-rose-50 border-rose-200 text-rose-900',
  },
  {
    id: 'CUSTOM',
    label: 'Custom Level Selection',
    description: 'Handpick specific competition levels for this subcategory',
    levelCodes: [],
    badge: 'Custom Levels',
    color: 'bg-purple-50 border-purple-200 text-purple-900',
  },
];

const PRESET_LOGOS = [
  { label: "Thahadi-Al-Qira'a", url: 'https://arabreadingchallenge.com/assets/frontend/dist/images/logo.svg', icon: '📖' },
  { label: 'Hifz Al-Quran', url: 'https://cdn-icons-png.flaticon.com/512/3074/3074769.png', icon: '🕌' },
  { label: 'Sports & Athletics', url: 'https://cdn-icons-png.flaticon.com/512/857/857418.png', icon: '⚽' },
  { label: 'Creative Writing & Arts', url: 'https://cdn-icons-png.flaticon.com/512/2997/2997322.png', icon: '🎨' },
  { label: 'Science & Quiz', url: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png', icon: '🔬' },
  { label: 'Leadership & Moral', url: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', icon: '🌟' },
  { label: 'Language Proficiency', url: 'https://cdn-icons-png.flaticon.com/512/3898/3898082.png', icon: '🗣️' },
  { label: 'Gold Trophy Award', url: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png', icon: '🏆' },
];

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
    levelGroup: 'ALL',
    allowedLevelIds: [] as string[],
    hasMaxScore: true,
    maxScore: 100,
    weight: 1.0,
    active: true,
  });
  const [savingBuilder, setSavingBuilder] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataMaster, resSubs, resStudents, resScores] = await Promise.all([
        getAcademicMasterData(),
        fetch('/api/subcategories'),
        fetch('/api/students?limit=200'),
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

  // Helper to get allowed levels for any subcategory
  const getSubcategoryLevels = (sub: any, allLevels: any[]) => {
    if (!sub || !sub.hasLevels) return [];
    const group = sub.levelGroup || 'ALL';
    if (group === 'CUSTOM') {
      let allowed: string[] = [];
      try {
        if (sub.allowedLevelIds) {
          allowed = Array.isArray(sub.allowedLevelIds) ? sub.allowedLevelIds : JSON.parse(sub.allowedLevelIds);
        }
      } catch {
        allowed = (sub.allowedLevelIds || '').split(',').map((s: string) => s.trim());
      }
      if (allowed.length > 0) {
        return allLevels.filter((lvl) => allowed.includes(lvl.id) || allowed.includes(lvl.code));
      }
    } else if (group === 'MAHARJAN') {
      return allLevels.filter((lvl) => ['KULLIYA', 'DAAERA', 'JAMIA'].includes(lvl.code));
    } else if (group === 'SAHITYOTSAV') {
      return allLevels.filter((lvl) => ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'].includes(lvl.code));
    } else if (group === 'KALOTSAV') {
      return allLevels.filter((lvl) => ['SUB_DISTRICT', 'DISTRICT', 'STATE'].includes(lvl.code));
    }
    return allLevels;
  };

  const currentAllowedLevels = activeSubcategory ? getSubcategoryLevels(activeSubcategory, levels) : [];

  // Update selected level when active subcategory changes
  useEffect(() => {
    if (activeSubcategory && activeSubcategory.hasLevels && currentAllowedLevels.length > 0) {
      const exists = currentAllowedLevels.some((l) => l.id === recordForm.levelId);
      if (!exists) {
        setRecordForm((prev) => ({ ...prev, levelId: currentAllowedLevels[0].id }));
      }
    }
  }, [selectedSubcategoryId, activeSubcategory, levels]);

  // Save Score for Subcategory
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubcategory) return;
    setStatusMsg(null);

    if (!recordForm.studentId) {
      setStatusMsg({ type: 'error', text: 'Please select a student first.' });
      return;
    }

    setSavingScore(true);

    try {
      const scoreVal = parseFloat(recordForm.score) || 0;
      const maxScoreVal = activeSubcategory.hasMaxScore ? (parseFloat(recordForm.maxScore) || 100) : 100;
      const percentage = maxScoreVal > 0 ? (scoreVal / maxScoreVal) * 100 : scoreVal;

      const targetLevelId = activeSubcategory.hasLevels
        ? recordForm.levelId || (currentAllowedLevels[0]?.id ?? null)
        : null;

      const targetCategoryId =
        activeSubcategory.categoryId ||
        categories.find((c) => c.code === 'QUALIFICATION')?.id ||
        categories[0]?.id;

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: targetCategoryId,
          subcategoryId: activeSubcategory.id,
          levelId: targetLevelId,
          entries: [
            {
              studentId: recordForm.studentId,
              obtainedScore: scoreVal,
              maxScore: maxScoreVal,
              percentage: Math.min(percentage, 100),
              position: recordForm.position || null,
              grade: recordForm.grade || null,
              remarks: recordForm.remarks ? `${activeSubcategory.name} - ${recordForm.remarks}` : activeSubcategory.name,
            },
          ],
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

  // Open Builder Modal for Create
  const handleOpenAddSub = () => {
    setEditingSubId(null);
    const qualCat = categories.find((c) => c.code === 'QUALIFICATION') || categories[0];
    setBuilderForm({
      name: '',
      categoryId: qualCat?.id || '',
      logoUrl: '',
      hasLevels: true,
      levelGroup: 'ALL',
      allowedLevelIds: levels.map((l) => l.id),
      hasMaxScore: true,
      maxScore: 100,
      weight: 1.0,
      active: true,
    });
    setBuilderModalOpen(true);
  };

  // Open Builder Modal for Edit
  const handleOpenEditSub = (sub: any) => {
    setEditingSubId(sub.id);
    let parsedAllowed: string[] = [];
    try {
      if (sub.allowedLevelIds) {
        parsedAllowed = Array.isArray(sub.allowedLevelIds) ? sub.allowedLevelIds : JSON.parse(sub.allowedLevelIds);
      }
    } catch {
      parsedAllowed = (sub.allowedLevelIds || '').split(',').map((s: string) => s.trim());
    }

    setBuilderForm({
      name: sub.name,
      categoryId: sub.categoryId,
      logoUrl: sub.logoUrl || '',
      hasLevels: Boolean(sub.hasLevels),
      levelGroup: sub.levelGroup || 'ALL',
      allowedLevelIds: parsedAllowed.length > 0 ? parsedAllowed : levels.map((l) => l.id),
      hasMaxScore: sub.hasMaxScore !== false,
      maxScore: sub.maxScore || 100,
      weight: sub.weight || 1.0,
      active: sub.active !== false,
    });
    setBuilderModalOpen(true);
  };

  // Handle Logo Upload from Local Device
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setBuilderForm((prev) => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  // Toggle Custom Level Selection
  const toggleCustomLevel = (levelId: string) => {
    setBuilderForm((prev) => {
      const exists = prev.allowedLevelIds.includes(levelId);
      const updated = exists
        ? prev.allowedLevelIds.filter((id) => id !== levelId)
        : [...prev.allowedLevelIds, levelId];
      return { ...prev, allowedLevelIds: updated };
    });
  };

  // Save Subcategory in Builder
  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSavingBuilder(true);

    try {
      const method = editingSubId ? 'PUT' : 'POST';
      const payload = {
        name: builderForm.name,
        categoryId: builderForm.categoryId,
        logoUrl: builderForm.logoUrl,
        hasLevels: builderForm.hasLevels,
        levelGroup: builderForm.levelGroup,
        allowedLevelIds: builderForm.allowedLevelIds,
        hasMaxScore: builderForm.hasMaxScore,
        maxScore: builderForm.maxScore,
        weight: builderForm.weight,
        active: builderForm.active,
      };

      const body = editingSubId ? { id: editingSubId, ...payload } : payload;

      const res = await fetch('/api/subcategories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save subcategory.');

      setStatusMsg({
        type: 'success',
        text: `Subcategory "${builderForm.name}" ${editingSubId ? 'updated' : 'created'} with customized features!`,
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

  const getLevelPresetName = (sub: any) => {
    if (!sub.hasLevels) return 'Direct / No Levels';
    const preset = LEVEL_PRESETS.find((p) => p.id === sub.levelGroup);
    return preset ? preset.badge : 'Multi-Level';
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-300">
                Custom Categories & Multi-Wing Feature Registry
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Layers className="w-5 h-5 text-indigo-700" />
              <span>Other Subcategories & Qualification Builder</span>
            </h2>
            <p className="text-xs text-slate-500">
              Build custom subcategories with configurable features: competition levels (Maharjan, Sahityotsav, Kalotsav, Custom), scoring mode, badging, and weight multipliers.
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

        {/* Subcategories Badged Cards Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Created Subcategories & Feature Configurations</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any subcategory card to record scores or view its dedicated standings.
              </p>
            </div>
            <button
              onClick={handleOpenAddSub}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>+ Build Subcategory</span>
            </button>
          </div>

          {subcategories.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No custom subcategories built yet. Click &quot;+ Build Subcategory&quot; to configure Qualification, Hifz, Sports, etc.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subcategories.map((sub) => {
                const isSelected = sub.id === selectedSubcategoryId;
                const levelText = getLevelPresetName(sub);
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
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <Image src={sub.logoUrl} alt={sub.name} width={44} height={44} className="w-full h-full object-contain" unoptimized />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-sm">
                          {sub.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col items-end space-y-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                          {sub.category?.name || 'Qualification'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          sub.hasLevels ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {levelText}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition flex items-center space-x-1.5">
                        <span>{sub.name}</span>
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">⚖️ Weight: {sub.weight || 1.0}x</span>
                        <span>•</span>
                        <span>{sub.hasMaxScore ? `📊 Max Score: ${sub.maxScore || 100}` : '⚡ Direct Score'}</span>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
                      <Link
                        href={`/leaderboard?subcategoryId=${sub.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:underline flex items-center space-x-1 text-slate-600 hover:text-indigo-700"
                      >
                        <span>Leaderboard</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSub(sub);
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg flex items-center space-x-1 transition text-[11px]"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Features</span>
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                    Active Subcategory
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900">
                    Weight: {activeSubcategory.weight || 1.0}x
                  </span>
                </div>
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
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        Competition Level <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {getLevelPresetName(activeSubcategory)}
                      </span>
                    </div>
                    <select
                      value={recordForm.levelId}
                      onChange={(e) => setRecordForm({ ...recordForm, levelId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    >
                      {currentAllowedLevels.map((lvl) => (
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
                      Score Awarded <span className="text-rose-500">*</span>
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
                        {activeSubcategory.weight}x Direct
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
                    placeholder="e.g. State championship award, special certificate..."
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
                              <span className="text-slate-500 font-medium">({rec.level.name})</span>
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
                <h3 className="text-base font-black text-slate-900">Custom Subcategory & Feature Builder</h3>
                <p className="text-xs text-slate-500">Create, customize competition levels, configure logos, scoring modes, and manage weightage.</p>
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
                        <span className="px-2 py-0.2 rounded-md bg-indigo-50 text-indigo-800 text-[10px] font-bold border border-indigo-200">
                          {getLevelPresetName(sub)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                        <span>Levels: {sub.hasLevels ? 'Enabled' : 'Disabled'}</span>
                        <span>•</span>
                        <span>Max Score: {sub.hasMaxScore ? sub.maxScore : 'Direct Points'}</span>
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

        {/* Builder Modal with Advanced Feature Management */}
        {builderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>{editingSubId ? 'Edit Subcategory Features & Rules' : 'Build New Subcategory & Features'}</span>
                </h3>
                <button onClick={() => setBuilderModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubcategory} className="mt-4 space-y-5">
                {/* 1. Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Subcategory Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={builderForm.name}
                      onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                      placeholder="e.g. Thahadi-Al-Qira'a, Hifz, Sports Championship..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Parent Category <span className="text-rose-500">*</span>
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
                </div>

                {/* 2. FEATURE: Competition Level Multipliers */}
                <div className="p-4.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Feature: Competition Levels & Multipliers</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enable level hierarchies like Maharjan, Sahityotsav, Kalotsav or handpicked custom levels.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={builderForm.hasLevels}
                        onChange={(e) => setBuilderForm({ ...builderForm, hasLevels: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {builderForm.hasLevels && (
                    <div className="pt-3 border-t border-slate-200/80 space-y-3">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Choose Level Preset or Selection
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {LEVEL_PRESETS.map((preset) => {
                          const isSelected = builderForm.levelGroup === preset.id;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => {
                                setBuilderForm({
                                  ...builderForm,
                                  levelGroup: preset.id,
                                  allowedLevelIds:
                                    preset.id === 'CUSTOM'
                                      ? builderForm.allowedLevelIds.length > 0
                                        ? builderForm.allowedLevelIds
                                        : levels.map((l) => l.id)
                                      : levels
                                          .filter((l) => preset.levelCodes.includes(l.code))
                                          .map((l) => l.id),
                                });
                              }}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start justify-between ${
                                isSelected
                                  ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-600/20'
                                  : 'border-slate-200 bg-white/60 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                                  <span>{preset.label}</span>
                                </div>
                                <div className="text-[10px] text-slate-500">{preset.description}</div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Custom Level Multi-Select Pills if CUSTOM is chosen */}
                      {builderForm.levelGroup === 'CUSTOM' && (
                        <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-2 mt-2">
                          <span className="text-[11px] font-bold text-purple-900 block">
                            Select Allowed Levels for this Subcategory:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {levels.map((lvl) => {
                              const isChecked = builderForm.allowedLevelIds.includes(lvl.id);
                              return (
                                <button
                                  type="button"
                                  key={lvl.id}
                                  onClick={() => toggleCustomLevel(lvl.id)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
                                    isChecked
                                      ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <span>{lvl.name} ({lvl.weightMultiplier}x)</span>
                                  {isChecked && <Check className="w-3 h-3" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Live Levels Preview */}
                      <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block mb-1">
                          Active Levels Preview:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {levels
                            .filter((lvl) => {
                              if (builderForm.levelGroup === 'MAHARJAN') {
                                return ['KULLIYA', 'DAAERA', 'JAMIA'].includes(lvl.code);
                              }
                              if (builderForm.levelGroup === 'SAHITYOTSAV') {
                                return ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'].includes(lvl.code);
                              }
                              if (builderForm.levelGroup === 'KALOTSAV') {
                                return ['SUB_DISTRICT', 'DISTRICT', 'STATE'].includes(lvl.code);
                              }
                              if (builderForm.levelGroup === 'CUSTOM') {
                                return builderForm.allowedLevelIds.includes(lvl.id);
                              }
                              return true;
                            })
                            .map((lvl) => (
                              <span
                                key={lvl.id}
                                className="px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-[10px] font-bold text-indigo-900 shadow-2xs"
                              >
                                {lvl.name} • {lvl.weightMultiplier}x
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. FEATURE: Scoring Mode & Normalization */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Feature: Max Score & Normalization Mode
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Enable percentage calculation against max score, or direct point scoring.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={builderForm.hasMaxScore}
                        onChange={(e) => setBuilderForm({ ...builderForm, hasMaxScore: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Subcategory Weight Multiplier
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={builderForm.weight}
                        onChange={(e) => setBuilderForm({ ...builderForm, weight: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    {builderForm.hasMaxScore && (
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
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. FEATURE: Logo & Visual Badging */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        Feature: Subcategory Logo & Visual Badging
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Pick a preset icon, upload a logo image from your PC, or paste an image URL.
                      </p>
                    </div>

                    {builderForm.logoUrl && (
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0.5 overflow-hidden shrink-0 flex items-center justify-center">
                        <Image src={builderForm.logoUrl} alt="Preview" width={28} height={28} className="w-full h-full object-contain" unoptimized />
                      </div>
                    )}
                  </div>

                  {/* Preset Logos */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                      Quick Preset Logos:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_LOGOS.map((preset) => (
                        <button
                          type="button"
                          key={preset.label}
                          onClick={() => setBuilderForm({ ...builderForm, logoUrl: preset.url })}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center space-x-1.5 ${
                            builderForm.logoUrl === preset.url
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* URL Input & File Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={builderForm.logoUrl}
                        onChange={(e) => setBuilderForm({ ...builderForm, logoUrl: e.target.value })}
                        placeholder="Image URL or choose preset above..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center space-x-1 transition"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Upload PC Logo</span>
                      </button>
                    </div>
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
                    <span>{savingBuilder ? 'Saving...' : editingSubId ? 'Update Subcategory Features' : 'Save Subcategory'}</span>
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
