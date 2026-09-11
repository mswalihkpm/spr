'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Layers,
  Trophy,
  Sparkles,
  BookOpen,
  GraduationCap,
  Award,
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
  X,
  Zap,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { formatPoints } from '@/lib/spr-engine';

export default function WeightsPage() {
  const [weights, setWeights] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [creativeForms, setCreativeForms] = useState<any[]>([]);
  const [publishedMedia, setPublishedMedia] = useState<any[]>([]);
  const [missingDataRule, setMissingDataRule] = useState<string>('IGNORE_NORMALIZE');

  // Prize Base Scores & Creative Base Settings
  const [prizeScore1st, setPrizeScore1st] = useState<number>(100);
  const [prizeScore2nd, setPrizeScore2nd] = useState<number>(75);
  const [prizeScore3rd, setPrizeScore3rd] = useState<number>(50);
  const [creativeBaseArticle, setCreativeBaseArticle] = useState<number>(50);
  const [creativeBaseResearch, setCreativeBaseResearch] = useState<number>(100);
  const [creativeBaseStory, setCreativeBaseStory] = useState<number>(75);
  const [creativeBasePoem, setCreativeBasePoem] = useState<number>(50);
  const [creativeBaseResponse, setCreativeBaseResponse] = useState<number>(40);
  const [creativeBaseLetter, setCreativeBaseLetter] = useState<number>(30);
  const [creativeBaseReview, setCreativeBaseReview] = useState<number>(50);
  const [creativeBaseOthers, setCreativeBaseOthers] = useState<number>(30);

  // New Level Modal
  const [newLevelModalOpen, setNewLevelModalOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState('');
  const [newLevelCode, setNewLevelCode] = useState('');
  const [newLevelMultiplier, setNewLevelMultiplier] = useState<number>(1.0);

  // Interactive Scoring Calculator Sandbox State
  const [calcBasePoints, setCalcBasePoints] = useState<number>(100);
  const [calcMultiplier1, setCalcMultiplier1] = useState<number>(2.5);
  const [calcMultiplier2, setCalcMultiplier2] = useState<number>(1.0);
  const [calcSelectedPrize, setCalcSelectedPrize] = useState<number>(100);
  const [calcSelectedLevelMult, setCalcSelectedLevelMult] = useState<number>(2.5);

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
        throw new Error(data.error || 'Failed to fetch scoring configuration.');
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
        if (data.settings.creativeBaseArticle) setCreativeBaseArticle(parseFloat(data.settings.creativeBaseArticle) || 50);
        if (data.settings.creativeBaseResearch) setCreativeBaseResearch(parseFloat(data.settings.creativeBaseResearch) || 100);
        if (data.settings.creativeBaseStory) setCreativeBaseStory(parseFloat(data.settings.creativeBaseStory) || 75);
        if (data.settings.creativeBasePoem) setCreativeBasePoem(parseFloat(data.settings.creativeBasePoem) || 50);
        if (data.settings.creativeBaseResponse) setCreativeBaseResponse(parseFloat(data.settings.creativeBaseResponse) || 40);
        if (data.settings.creativeBaseLetter) setCreativeBaseLetter(parseFloat(data.settings.creativeBaseLetter) || 30);
        if (data.settings.creativeBaseReview) setCreativeBaseReview(parseFloat(data.settings.creativeBaseReview) || 50);
        if (data.settings.creativeBaseOthers) setCreativeBaseOthers(parseFloat(data.settings.creativeBaseOthers) || 30);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load scoring configuration' });
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

  const handleCategoryMultiplierChange = (categoryId: string, val: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, weight: Math.max(0.1, val) } : w))
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

  const handleCreativeFormMultiplierChange = (formId: string, val: number) => {
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

  const handleMediaMultiplierChange = (mediaId: string, val: number) => {
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
          creativeBaseArticle,
          creativeBaseResearch,
          creativeBaseStory,
          creativeBasePoem,
          creativeBaseResponse,
          creativeBaseLetter,
          creativeBaseReview,
          creativeBaseOthers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update scoring settings.');
      }

      setStatusMsg({
        type: 'success',
        text: 'All SPR Numerical Scoring Rules, Base Points, Multipliers, and Level settings saved successfully!',
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

  const calcDirectPoints = Number((calcBasePoints * calcMultiplier1 * calcMultiplier2).toFixed(2));
  const calcCompetitionPoints = Number((calcSelectedPrize * calcSelectedLevelMult).toFixed(2));

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-24 flex items-center justify-center">
          <VideoLoader size="xl" text="Loading scoring configuration..." subtext="Accessing SPR numerical scoring engine" />
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
                SPR Numerical Scoring System
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                Pure Unlimited Points
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-madin-900" />
              <span>SPR Scoring Settings &amp; Points Matrix</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure Category Base Points, Level Multipliers, Prize Points, and Custom X Multipliers without editing code.
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

        {/* Core Formula & Architecture Banner */}
        <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-md space-y-2">
          <div className="flex items-center space-x-2 text-gold-400 font-black text-xs uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Pure Numerical Scoring Architecture</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[10px] font-bold">CORE SCORING FORMULA</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                Points = Base × Mult₁ × Mult₂
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[10px] font-bold">OVERALL SPR TOTAL</span>
              <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                Overall SPR = Σ Earned Points
              </span>
            </div>
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10">
              <span className="text-slate-300 block text-[10px] font-bold">RANKING PRINCIPLE</span>
              <span className="text-sm font-mono font-bold text-gold-300 mt-0.5 block">
                Highest Points = Rank #1
              </span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE SCORING CALCULATOR / PREVIEW TOOL */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Calculator className="w-5 h-5 text-indigo-700" />
            <div>
              <h3 className="text-base font-black text-slate-900">Interactive Admin Scoring Preview &amp; Calculator</h3>
              <p className="text-xs text-slate-500">Test how base points and custom multipliers calculate numerical SPR points in real-time</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Formula Sandbox */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Multi-Multiplier Sandbox</span>
                <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Base × Mult₁ × Mult₂
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Base Points</label>
                  <input
                    type="number"
                    min="1"
                    value={calcBasePoints}
                    onChange={(e) => setCalcBasePoints(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Multiplier 1</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={calcMultiplier1}
                    onChange={(e) => setCalcMultiplier1(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Multiplier 2</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={calcMultiplier2}
                    onChange={(e) => setCalcMultiplier2(parseFloat(e.target.value) || 1)}
                    className="w-full px-2.5 py-1.5 text-center font-mono font-bold text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-200 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-950">
                  {calcBasePoints} × {calcMultiplier1}× {calcMultiplier2 !== 1 ? `× ${calcMultiplier2}×` : ''}
                </span>
                <span className="text-sm font-mono font-black text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-300 shadow-2xs">
                  = {formatPoints(calcDirectPoints)} SPR Points
                </span>
              </div>
            </div>

            {/* Competition Prize + Level Sandbox */}
            <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-3">
              <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                <span>Competition Prize &amp; Level Calculator</span>
                <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                  Prize Base × Level Mult
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Prize Base</label>
                  <select
                    value={calcSelectedPrize}
                    onChange={(e) => setCalcSelectedPrize(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 font-mono text-xs bg-white border border-amber-300 rounded-xl font-bold"
                  >
                    <option value={prizeScore1st}>🥇 1st Prize ({prizeScore1st} pts)</option>
                    <option value={prizeScore2nd}>🥈 2nd Prize ({prizeScore2nd} pts)</option>
                    <option value={prizeScore3rd}>🥉 3rd Prize ({prizeScore3rd} pts)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Level Multiplier</label>
                  <select
                    value={calcSelectedLevelMult}
                    onChange={(e) => setCalcSelectedLevelMult(parseFloat(e.target.value))}
                    className="w-full px-2 py-1.5 font-mono text-xs bg-white border border-amber-300 rounded-xl font-bold"
                  >
                    {levels.map((l) => (
                      <option key={l.id || l.code} value={l.weightMultiplier}>
                        {l.name} ({l.weightMultiplier}×)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-amber-300 flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-950">
                  {calcSelectedPrize} × {calcSelectedLevelMult}×
                </span>
                <span className="text-sm font-mono font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                  = {formatPoints(calcCompetitionPoints)} SPR Points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. TOP-LEVEL SPR CATEGORIES */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-black text-slate-900">Main SPR Categories (7 Core Domains)</h3>
                <p className="text-xs text-slate-500">
                  All points earned in these categories add directly to Total SPR Points. Priority order determines reporting sequence.
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950 self-end sm:self-auto">
              Scoring Mode: <span className="font-mono font-black">Unlimited Points</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {weights.map((w, index) => {
              const multNum = parseFloat(w.weight) || 1.0;
              return (
                <div
                  key={w.categoryId || w.code}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-100/70 transition"
                >
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
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-mono">
                          + Earned Points
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {w.code === 'ISLAMIC' && 'Islamic Studies assessments contribute numerical points directly to Overall SPR.'}
                        {w.code === 'SCHOOL' && 'School subject marks contribute numerical points directly to Overall SPR.'}
                        {w.code === 'QUALIFICATION' && 'Certificates, degrees, and qualification milestones earn configured base points.'}
                        {w.code === 'CREATIVE_HUB' && 'Articles, stories, research papers earn base points × subcategory multipliers.'}
                        {w.code === 'LIBRARY' && 'Reading points accumulate directly without caps or normalization.'}
                        {w.code === 'LITERARY' && 'Literary competitions calculate Prize Base Points × Festival Level Multiplier.'}
                        {w.code === 'PROGRAMS' && 'Competitions calculate Prize Base Points × Festival Level Multiplier.'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 ml-10 md:ml-0">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="text-[11px] font-bold text-slate-500">Category Multiplier:</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.05"
                        value={w.weight}
                        onChange={(e) => handleCategoryMultiplierChange(w.categoryId, parseFloat(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center font-mono font-black text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs font-bold text-slate-600">×</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. PRIZE BASE POINTS & CREATIVE HUB BASE POINTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Prize Base Points */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Trophy className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Competition Prize Base Points</h3>
                <p className="text-[11px] text-slate-500">Base points for 1st, 2nd, and 3rd prize achievements</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🥇</span>
                  <span className="text-xs font-bold text-slate-900">1st Prize Base Points</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
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
                  <span className="text-xs font-bold text-slate-900">2nd Prize Base Points</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    value={prizeScore2nd}
                    onChange={(e) => setPrizeScore2nd(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-xl"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/30 rounded-2xl border border-amber-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-base">🥉</span>
                  <span className="text-xs font-bold text-slate-900">3rd Prize Base Points</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min="1"
                    value={prizeScore3rd}
                    onChange={(e) => setPrizeScore3rd(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2.5 py-1 text-center font-mono font-black text-xs bg-white border border-amber-300 rounded-xl"
                  />
                  <span className="text-[11px] font-semibold text-slate-500">pts</span>
                </div>
              </div>
            </div>
          </div>

          {/* Creative Hub Base Points */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Creative Hub Base Points</h3>
                <p className="text-[11px] text-slate-500">Points awarded per creative submission type</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Article</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBaseArticle}
                    onChange={(e) => setCreativeBaseArticle(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Research Paper</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBaseResearch}
                    onChange={(e) => setCreativeBaseResearch(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Story</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBaseStory}
                    onChange={(e) => setCreativeBaseStory(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Poem</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBasePoem}
                    onChange={(e) => setCreativeBasePoem(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Book Review</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBaseReview}
                    onChange={(e) => setCreativeBaseReview(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
              </div>

              <div className="p-2.5 bg-purple-50/40 rounded-xl border border-purple-200 flex items-center justify-between">
                <span className="font-bold text-slate-900">Response</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    value={creativeBaseResponse}
                    onChange={(e) => setCreativeBaseResponse(parseFloat(e.target.value) || 0)}
                    className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                  />
                  <span className="text-[10px] text-slate-500">pts</span>
                </div>
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
                <h3 className="text-base font-black text-slate-900">Competition &amp; Festival Level Multipliers</h3>
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
                    max="10.0"
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

        {/* 4. CREATIVE HUB WINGS & PUBLISHED MEDIA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creative Forms */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Creative Hub Multipliers</h3>
                <p className="text-[11px] text-slate-500">Multipliers applied to creative submissions</p>
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

                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="0.1"
                        step="0.05"
                        value={cf.weight}
                        onChange={(e) => handleCreativeFormMultiplierChange(cf.id, parseFloat(e.target.value) || 1)}
                        className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-purple-300 rounded-lg"
                      />
                      <span className="text-xs font-bold text-slate-500">×</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Published Media */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Feather className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Published Media Multipliers</h3>
                <p className="text-[11px] text-slate-500">Special event multiplier for published literary media</p>
              </div>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {publishedMedia.map((pm) => (
                <div
                  key={pm.id || pm.name}
                  className="p-2.5 bg-rose-50/40 rounded-2xl border border-rose-200 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-900">{pm.name}</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="number"
                      min="0.1"
                      step="0.05"
                      value={pm.weight}
                      onChange={(e) => handleMediaMultiplierChange(pm.id, parseFloat(e.target.value) || 1)}
                      className="w-14 px-1.5 py-0.5 text-center font-mono font-bold text-xs bg-white border border-rose-300 rounded-lg"
                    />
                    <span className="text-xs font-bold text-slate-500">×</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. LIVE STUDENT SPR PROFILE PREVIEW */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center space-x-2">
              <Eye className="w-5 h-5 text-madin-900" />
              <div>
                <h3 className="text-base font-black text-slate-900">Live Student Performance Dossier Preview</h3>
                <p className="text-xs text-slate-500">Inspect real student SPR Points breakdown calculated live from database records</p>
              </div>
            </div>

            {/* Student Search & Select */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={previewSearch}
                  onChange={(e) => setPreviewSearch(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-xl bg-slate-50 w-44 focus:bg-white"
                />
              </div>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1 text-xs font-bold bg-white border border-slate-300 rounded-xl max-w-xs"
              >
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sprStudentId || s.studentId} — {s.fullName} ({s.class?.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingPreview ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading student calculation...</div>
          ) : studentPreviewData ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold text-gold-400 uppercase tracking-wider">
                    {studentPreviewData.student?.sprStudentId || studentPreviewData.student?.studentId}
                  </div>
                  <h4 className="text-base font-black text-white">{studentPreviewData.student?.fullName}</h4>
                  <p className="text-xs text-slate-400">
                    {studentPreviewData.student?.class?.name} • {studentPreviewData.student?.school?.name}
                  </p>
                </div>
                <div className="text-right sm:text-right">
                  <div className="text-[10px] font-bold text-slate-400">TOTAL SPR POINTS</div>
                  <div className="text-2xl font-black font-mono text-gold-400">
                    {formatPoints(studentPreviewData.overallScore ?? studentPreviewData.overallSPR)} PTS
                  </div>
                </div>
              </div>

              {/* Category Points Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(studentPreviewData.categoryBreakdown || studentPreviewData.categoryScores || []).map((cs: any) => (
                  <div key={cs.categoryId || cs.categoryCode} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{cs.categoryName}</span>
                      <span className="text-xs font-black font-mono text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        +{formatPoints(cs.earnedPoints || 0)} pts
                      </span>
                    </div>
                    <div className="text-[10.5px] text-slate-500 font-mono">{cs.formula || `${cs.recordsCount} record(s)`}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">No preview data available</div>
          )}
        </div>

        {/* Add Level Modal */}
        {newLevelModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Add Competition Level</h3>
                <button
                  type="button"
                  onClick={() => setNewLevelModalOpen(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Level Name</label>
                  <input
                    type="text"
                    placeholder="e.g. International, Zone, Da'eera"
                    value={newLevelName}
                    onChange={(e) => setNewLevelName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Level Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. INTL, ZONE"
                    value={newLevelCode}
                    onChange={(e) => setNewLevelCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Level Multiplier (X)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    value={newLevelMultiplier}
                    onChange={(e) => setNewLevelMultiplier(parseFloat(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewLevelModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateLevel}
                  className="px-5 py-2 text-xs font-bold text-white bg-madin-900 hover:bg-madin-950 rounded-xl shadow cursor-pointer"
                >
                  Create Level
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </AdminLayout>
  );
}
