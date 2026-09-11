'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  Percent,
  HelpCircle,
  RefreshCw,
  Layers,
  Scale,
  Trophy,
  Sparkles,
  BookOpen,
  GraduationCap,
  Award,
  Newspaper,
  Flame,
  Feather,
  Library,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Calculator,
  Search,
  Check,
  ChevronRight,
  Info,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function WeightsPage() {
  const [weights, setWeights] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [creativeForms, setCreativeForms] = useState<any[]>([]);
  const [publishedMedia, setPublishedMedia] = useState<any[]>([]);
  const [missingDataRule, setMissingDataRule] = useState<string>('IGNORE_NORMALIZE');

  // Prize Scores & Normalization References
  const [prizeScore1st, setPrizeScore1st] = useState<number>(100);
  const [prizeScore2nd, setPrizeScore2nd] = useState<number>(75);
  const [prizeScore3rd, setPrizeScore3rd] = useState<number>(50);
  const [libraryNormalizationRef, setLibraryNormalizationRef] = useState<number>(500);
  const [achievementNormalizationRef, setAchievementNormalizationRef] = useState<number>(500);

  // New Level Modal
  const [newLevelModalOpen, setNewLevelModalOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelCode, setNewLevelCode] = useState('');
  const [newLevelMultiplier, setNewLevelMultiplier] = useState<number>(1.0);

  // Live Student Preview State
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentPreviewData, setStudentPreviewData] = useState<any | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWeights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/weights');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch weights.');
      }

      if (data.weights) setWeights(data.weights);
      if (data.levels) setLevels(data.levels);
      if (data.subcategories) setSubcategories(data.subcategories);
      if (data.creativeForms) setCreativeForms(data.creativeForms);
      if (data.publishedMedia) setPublishedMedia(data.publishedMedia);
      if (data.missingDataRule) setMissingDataRule(data.missingDataRule);

      if (data.settings) {
        if (data.settings.prizeScore1st) setPrizeScore1st(parseFloat(data.settings.prizeScore1st) || 100);
        if (data.settings.prizeScore2nd) setPrizeScore2nd(parseFloat(data.settings.prizeScore2nd) || 75);
        if (data.settings.prizeScore3rd) setPrizeScore3rd(parseFloat(data.settings.prizeScore3rd) || 50);
        if (data.settings.libraryNormalizationRef)
          setLibraryNormalizationRef(parseFloat(data.settings.libraryNormalizationRef) || 500);
        if (data.settings.achievementNormalizationRef)
          setAchievementNormalizationRef(parseFloat(data.settings.achievementNormalizationRef) || 500);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load weights' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForPreview = async () => {
    try {
      const res = await fetch('/api/students?all=true');
      const data = await res.json();
      if (data.students && Array.isArray(data.students)) {
        setStudentsList(data.students);
        if (data.students.length > 0 && !selectedStudentId) {
          setSelectedStudentId(data.students[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  };

  useEffect(() => {
    fetchWeights();
    fetchStudentsForPreview();
  }, []);

  // Fetch Student Calculation Preview
  useEffect(() => {
    if (!selectedStudentId) return;
    setLoadingPreview(true);
    fetch(`/api/students/${selectedStudentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profile) {
          setStudentPreviewData(data.profile);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingPreview(false));
  }, [selectedStudentId]);

  const handleCategoryWeightChange = (categoryId: string, val: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, weight: Math.max(0, val) } : w))
    );
  };

  const moveCategoryPriority = (index: number, direction: 'UP' | 'DOWN') => {
    setWeights((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;

      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      return copy.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
        priority: idx + 1,
      }));
    });
  };

  const handleLevelMultiplierChange = (levelId: string, val: number) => {
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, weightMultiplier: Math.max(0.1, val) } : l))
    );
  };

  const handleToggleLevelActive = (levelId: string) => {
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, active: !l.active } : l))
    );
  };

  const moveLevelOrder = (index: number, direction: 'UP' | 'DOWN') => {
    setLevels((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;

      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      return copy.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }));
    });
  };

  const handleCreateLevel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLevelName.trim()) return;

    const code =
      newLevelCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_') ||
      newLevelName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

    const newLvl = {
      name: newLevelName.trim(),
      code,
      weightMultiplier: Number(newLevelMultiplier) || 1.0,
      displayOrder: levels.length + 1,
      active: true,
    };

    setLevels((prev) => [...prev, newLvl]);
    setNewLevelName('');
    setNewLevelCode('');
    setNewLevelMultiplier(1.0);
    setNewLevelModalOpen(false);
  };

  const handleSubcategoryWeightChange = (subId: string, val: number) => {
    setSubcategories((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, weight: Math.max(0.1, val) } : s))
    );
  };

  const moveSubcategoryOrder = (index: number, direction: 'UP' | 'DOWN') => {
    setSubcategories((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;

      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      return copy.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }));
    });
  };

  const handleCreativeFormWeightChange = (formId: string, val: number) => {
    setCreativeForms((prev) =>
      prev.map((cf) => (cf.id === formId ? { ...cf, weight: Math.max(0.1, val) } : cf))
    );
  };

  const moveCreativeFormOrder = (index: number, direction: 'UP' | 'DOWN') => {
    setCreativeForms((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'UP' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;

      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;

      return copy.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }));
    });
  };

  const handleMediaWeightChange = (mediaId: string, val: number) => {
    setPublishedMedia((prev) =>
      prev.map((pm) => (pm.id === mediaId ? { ...pm, weight: Math.max(0.1, val) } : pm))
    );
  };

  const renderCategoryIcon = (code?: string, iconName?: string) => {
    const key = (code || iconName || '').toUpperCase();
    if (key.includes('ISLAMIC') || key.includes('BOOK')) {
      return <BookOpen className="w-4 h-4 text-emerald-700" />;
    }
    if (key.includes('SCHOOL') || key.includes('GRADUATION')) {
      return <GraduationCap className="w-4 h-4 text-indigo-700" />;
    }
    if (key.includes('QUALIF') || key.includes('AWARD')) {
      return <Award className="w-4 h-4 text-blue-800" />;
    }
    if (key.includes('CREATIVE') || key.includes('SPARKLE')) {
      return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
    if (key.includes('LIBRARY') || key.includes('READING')) {
      return <Library className="w-4 h-4 text-teal-700" />;
    }
    if (key.includes('LITERARY') || key.includes('FEATHER')) {
      return <Feather className="w-4 h-4 text-rose-600" />;
    }
    if (key.includes('PROGRAM') || key.includes('TROPHY')) {
      return <Trophy className="w-4 h-4 text-amber-600" />;
    }
    return <Layers className="w-4 h-4 text-slate-700" />;
  };

  const totalIncludedWeight = weights
    .filter((w) => w.isIncludedInSPR && w.isActive)
    .reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const res = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          levels,
          subcategories,
          creativeForms,
          publishedMedia,
          missingDataRule,
          prizeScore1st,
          prizeScore2nd,
          prizeScore3rd,
          libraryNormalizationRef,
          achievementNormalizationRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update weight settings.');
      }

      setStatusMsg({
        type: 'success',
        text: 'All SPR category weights, priorities, prize rules, festival multipliers, and normalization parameters updated successfully!',
      });

      // Refresh calculation preview
      if (selectedStudentId) {
        fetch(`/api/students/${selectedStudentId}`)
          .then((r) => r.json())
          .then((d) => d.profile && setStudentPreviewData(d.profile));
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = studentsList.filter(
    (s) =>
      s.fullName?.toLowerCase().includes(previewSearch.toLowerCase()) ||
      s.studentId?.toLowerCase().includes(previewSearch.toLowerCase()) ||
      s.sprStudentId?.toLowerCase().includes(previewSearch.toLowerCase())
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 flex items-center justify-center">
          <VideoLoader size="xl" text="Loading weights configuration..." subtext="Accessing SPR normalization matrix" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <form onSubmit={handleSave} className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                SPR Engine Configuration
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                Normalized 0–100%
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-madin-900" />
              <span>SPR Weight Management & Scoring Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure Category Weights, Priority Order, Festival Level Multipliers, Prize Base Scores, and Normalization Benchmarks.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-2xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
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

        {/* 1. MAIN SPR CATEGORY WEIGHTS & PRIORITY */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-black text-slate-900">Main SPR Categories & Weight Configuration</h3>
                <p className="text-xs text-slate-500">
                  Configure contribution weights and reorder category priority (1 to 7)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900">
                Raw Weight Total: <span className="font-mono font-black">{totalIncludedWeight.toFixed(0)}</span>
              </div>
              <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-950">
                Final Result: <span className="font-mono font-black">0.00% – 100.00%</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-950 flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="font-bold">Normalization Principle:</strong> Every category first generates a Normalized Score (0–100%). The total raw weight ({totalIncludedWeight.toFixed(0)}) is used as the calculation denominator. The final SPR is always clamped and normalized to 0.00% – 100.00%.
            </p>
          </div>

          <div className="space-y-2.5">
            {weights.map((w, index) => (
              <div
                key={w.categoryId || w.code}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/70 transition"
              >
                {/* Priority & Category Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="flex flex-col items-center justify-center w-7 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveCategoryPriority(index, 'UP')}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                      title="Move Priority Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-black text-slate-700 font-mono">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveCategoryPriority(index, 'DOWN')}
                      disabled={index === weights.length - 1}
                      className="p-0.5 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                      title="Move Priority Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                    {renderCategoryIcon(w.code, w.icon)}
                  </div>

                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span>{w.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({w.code})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Priority Rank: Priority {index + 1}
                    </div>
                  </div>
                </div>

                {/* Weight Input & Slider */}
                <div className="flex items-center space-x-4 ml-10 md:ml-0">
                  <div className="flex items-center space-x-2 w-48 sm:w-64">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={w.weight}
                      onChange={(e) => handleCategoryWeightChange(w.categoryId, parseFloat(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={w.weight}
                      onChange={(e) => handleCategoryWeightChange(w.categoryId, parseFloat(e.target.value) || 0)}
                      className="w-16 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-500">Weight</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. PRIZE BASE SCORES & NORMALIZATION BENCHMARKS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prize Base Scores */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Trophy className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Prize Base Scores</h3>
                <p className="text-[11px] text-slate-500">Base points awarded for competition prizes (1st &gt; 2nd &gt; 3rd)</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🥇</span>
                  <span className="text-xs font-bold text-slate-900">1st Prize Base Score</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={prizeScore1st}
                    onChange={(e) => setPrizeScore1st(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-xl"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🥈</span>
                  <span className="text-xs font-bold text-slate-900">2nd Prize Base Score</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={prizeScore2nd}
                    onChange={(e) => setPrizeScore2nd(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-slate-300 rounded-xl"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/30 rounded-2xl border border-amber-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🥉</span>
                  <span className="text-xs font-bold text-slate-900">3rd Prize Base Score</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={prizeScore3rd}
                    onChange={(e) => setPrizeScore3rd(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-slate-300 rounded-xl"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Normalization References */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-teal-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Normalization References</h3>
                <p className="text-[11px] text-slate-500">Points reference used for 100% benchmark normalization</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-950">Library & Reading Normalization Reference</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min="50"
                      max="2000"
                      value={libraryNormalizationRef}
                      onChange={(e) => setLibraryNormalizationRef(parseFloat(e.target.value) || 500)}
                      className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-teal-300 rounded-xl"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">pts</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-500">Formula: MIN(Earned Points / {libraryNormalizationRef} × 100, 100)%</p>
              </div>

              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950">Achievement Normalization Reference (Literary / Competitions)</span>
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="number"
                      min="50"
                      max="2000"
                      value={achievementNormalizationRef}
                      onChange={(e) => setAchievementNormalizationRef(parseFloat(e.target.value) || 500)}
                      className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-indigo-300 rounded-xl"
                    />
                    <span className="text-[11px] font-semibold text-slate-500">pts</span>
                  </div>
                </div>
                <p className="text-[10.5px] text-slate-500">Formula: MIN(Earned Achievement Points / {achievementNormalizationRef} × 100, 100)%</p>
              </div>

              {/* Missing data rule */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Missing Data Strategy</div>
                  <div className="text-[10px] text-slate-500">How categories without records are normalized</div>
                </div>
                <select
                  value={missingDataRule}
                  onChange={(e) => setMissingDataRule(e.target.value)}
                  className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1"
                >
                  <option value="IGNORE_NORMALIZE">Ignore & Normalize (Fair)</option>
                  <option value="TREAT_AS_ZERO">Treat Missing as 0%</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 3. FESTIVAL & COMPETITION LEVEL MULTIPLIERS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-base font-black text-slate-900">Festival & Competition Level Multipliers</h3>
                <p className="text-xs text-slate-500">
                  Campus, School, Division, Sub-district, District, Kulliya, Da&apos;eera, State, Jamia, National, International
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNewLevelModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center space-x-1.5 self-end sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Level</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {levels.map((lvl, idx) => (
              <div
                key={lvl.id || lvl.code}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition ${
                  lvl.active ? 'bg-amber-50/40 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] font-mono font-bold text-slate-400">#{idx + 1}</span>
                    <span className="text-xs font-black text-slate-900">{lvl.name}</span>
                  </div>
                  <span className="text-xs font-black text-amber-950 bg-white px-2 py-0.5 rounded-lg border border-amber-300 font-mono">
                    {Number(lvl.weightMultiplier).toFixed(2)}×
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500">
                    <span>Multiplier</span>
                    <span className="font-mono">×{Number(lvl.weightMultiplier).toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.05"
                    value={lvl.weightMultiplier}
                    onChange={(e) => handleLevelMultiplierChange(lvl.id, parseFloat(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-amber-200/50">
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => moveLevelOrder(idx, 'UP')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-amber-100 rounded text-slate-600 disabled:opacity-20 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLevelOrder(idx, 'DOWN')}
                      disabled={idx === levels.length - 1}
                      className="p-1 hover:bg-amber-100 rounded text-slate-600 disabled:opacity-20 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleLevelActive(lvl.id)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md cursor-pointer ${
                      lvl.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {lvl.active ? 'Active' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. CREATIVE HUB PRIORITY & PUBLISHED MEDIA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creative Forms */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Creative Hub Priority & Wings</h3>
                <p className="text-[11px] text-slate-500">1. Article, 2. Research Paper, 3. Story, 4. Poem, 5. Response, etc.</p>
              </div>
            </div>

            <div className="space-y-2">
              {creativeForms.map((cf, idx) => (
                <div
                  key={cf.id || cf.code}
                  className="p-2.5 bg-purple-50/40 rounded-2xl border border-purple-200 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold text-slate-400 w-5">#{idx + 1}</span>
                    <span className="text-xs font-bold text-slate-900">{cf.name}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => moveCreativeFormOrder(idx, 'UP')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-purple-100 rounded text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveCreativeFormOrder(idx, 'DOWN')}
                        disabled={idx === creativeForms.length - 1}
                        className="p-1 hover:bg-purple-100 rounded text-slate-600 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={cf.weight || 1.0}
                      onChange={(e) => handleCreativeFormWeightChange(cf.id, parseFloat(e.target.value) || 1.0)}
                      className="w-14 px-1.5 py-0.5 text-center font-mono text-xs bg-white border border-purple-300 rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-purple-900">x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Published Media */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Newspaper className="w-5 h-5 text-emerald-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Published Media Multipliers</h3>
                <p className="text-[11px] text-slate-500">Risala, Siraj, Suprabhaatham, Daily Newspapers, etc.</p>
              </div>
            </div>

            <div className="space-y-2">
              {publishedMedia.map((pm) => (
                <div
                  key={pm.id}
                  className="p-2.5 bg-emerald-50/40 rounded-2xl border border-emerald-200 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-900">{pm.name}</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={pm.weight || 1.0}
                      onChange={(e) => handleMediaWeightChange(pm.id, parseFloat(e.target.value) || 1.0)}
                      className="w-14 px-1.5 py-0.5 text-center font-mono text-xs bg-white border border-emerald-300 rounded-lg"
                    />
                    <span className="text-[10px] font-bold text-emerald-900">x</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. ADMIN CALCULATION PREVIEW & TESTER (SECTION 23) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-blue-300/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-blue-100 gap-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-black text-slate-900">Admin Calculation Preview & Live Tester</h3>
                <p className="text-xs text-slate-500">Select any student to test and verify the complete SPR calculation matrix</p>
              </div>
            </div>

            {/* Student Search / Selector */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="text-xs font-bold bg-blue-50 border border-blue-300 rounded-xl px-3 py-1.5 max-w-xs focus:ring-2 focus:ring-blue-500"
              >
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentId} • {s.class?.name || 'Class'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingPreview ? (
            <div className="py-8 text-center text-xs text-slate-500">Computing SPR calculation preview...</div>
          ) : studentPreviewData ? (
            <div className="space-y-4">
              {/* Student Header */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {studentPreviewData.student?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    SPR ID: <span className="font-mono font-bold text-blue-900">{studentPreviewData.student?.sprStudentId || studentPreviewData.student?.studentId}</span> • Class: {studentPreviewData.student?.class?.name} • School: {studentPreviewData.student?.school?.name}
                  </div>
                </div>

                <div className="text-center sm:text-right bg-blue-600 text-white px-4 py-2 rounded-xl shadow-xs">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-blue-100">Final SPR Score</div>
                  <div className="text-xl font-black">{studentPreviewData.overallSPR}%</div>
                  <div className="text-[9px] text-blue-200 font-mono">{studentPreviewData.normalizedScore}</div>
                </div>
              </div>

              {/* Complete SPR Percentage Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Main Category</th>
                      <th className="py-2.5 px-3">Earned / Input</th>
                      <th className="py-2.5 px-3 text-right">Normalized %</th>
                      <th className="py-2.5 px-3 text-center">Category Weight</th>
                      <th className="py-2.5 px-3 text-right">Weighted Contribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {studentPreviewData.categoryScores?.map((cat: any) => {
                      const IconComp = renderCategoryIcon(cat.categoryCode);
                      return (
                        <tr key={cat.categoryId || cat.categoryCode} className="hover:bg-blue-50/30 transition">
                          <td className="py-2.5 px-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                                {IconComp}
                              </div>
                              <span className="font-bold text-slate-900">{cat.categoryName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {cat.rawInput || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800 font-mono">
                            {Number(cat.normalizedPercentage || cat.percentage || 0).toFixed(2)}%
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-slate-600 font-mono">
                            {cat.weight}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-blue-700 font-mono">
                            +{Number(cat.weightedContribution || 0).toFixed(2)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100/90 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="py-3 px-3 text-slate-900 font-black uppercase text-xs">
                        Final SPR Calculation Summary
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-700 text-xs">
                        Raw Sum: {studentPreviewData.rawWeightedTotal}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 text-xs">
                        Max Denom: {studentPreviewData.maxWeightedTotal}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-black text-sm text-blue-800">
                        {studentPreviewData.overallSPR}%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-400">No student selected for preview.</div>
          )}
        </div>

        {/* Add Level Modal */}
        {newLevelModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 border border-slate-200 shadow-2xl animate-zoom-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="text-sm font-black text-slate-900">Add Competition / Festival Level</h4>
                <button
                  type="button"
                  onClick={() => setNewLevelModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Level Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Regional Zone"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Level Code</label>
                  <input
                    type="text"
                    placeholder="e.g. REGIONAL_ZONE"
                    value={newLevelCode}
                    onChange={(e) => setNewLevelCode(e.target.value)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700">Multiplier (e.g. 2.50x)</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10.0"
                    step="0.05"
                    value={newLevelMultiplier}
                    onChange={(e) => setNewLevelMultiplier(parseFloat(e.target.value) || 1.0)}
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewLevelModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateLevel}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Add Level
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </AdminLayout>
  );
}
