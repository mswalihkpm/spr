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
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function WeightsPage() {
  const [weights, setWeights] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [creativeForms, setCreativeForms] = useState<any[]>([]);
  const [publishedMedia, setPublishedMedia] = useState<any[]>([]);
  const [missingDataRule, setMissingDataRule] = useState<string>('IGNORE_NORMALIZE');

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
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Failed to load weights' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeights();
  }, []);

  const handleCategoryWeightChange = (categoryId: string, val: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, weight: Math.max(0, val) } : w))
    );
  };

  const handleLevelMultiplierChange = (levelId: string, val: number) => {
    setLevels((prev) =>
      prev.map((l) => (l.id === levelId ? { ...l, weightMultiplier: Math.max(0.1, val) } : l))
    );
  };

  const handleSubcategoryWeightChange = (subId: string, val: number) => {
    setSubcategories((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, weight: Math.max(0.1, val) } : s))
    );
  };

  const handleCreativeFormWeightChange = (formId: string, val: number) => {
    setCreativeForms((prev) =>
      prev.map((cf) => (cf.id === formId ? { ...cf, weight: Math.max(0.1, val) } : cf))
    );
  };

  const handleMediaWeightChange = (mediaId: string, val: number) => {
    setPublishedMedia((prev) =>
      prev.map((pm) => (pm.id === mediaId ? { ...pm, weight: Math.max(0.1, val) } : pm))
    );
  };

  const renderCategoryIcon = (code?: string, iconName?: string) => {
    const key = (code || iconName || '').toUpperCase();
    if (key.includes('ISLAMIC') || key.includes('BOOK')) {
      return <BookOpen className="w-4 h-4 text-blue-700" />;
    }
    if (key.includes('SCHOOL') || key.includes('GRADUATION')) {
      return <GraduationCap className="w-4 h-4 text-indigo-700" />;
    }
    if (key.includes('PROGRAM') || key.includes('TROPHY')) {
      return <Trophy className="w-4 h-4 text-purple-600" />;
    }
    if (key.includes('CREATIVE') || key.includes('SPARKLE')) {
      return <Sparkles className="w-4 h-4 text-cyan-600" />;
    }
    if (key.includes('LITERARY') || key.includes('FEATHER')) {
      return <Feather className="w-4 h-4 text-rose-600" />;
    }
    if (key.includes('LIBRARY') || key.includes('READING')) {
      return <Library className="w-4 h-4 text-amber-700" />;
    }
    if (key.includes('QUALIF') || key.includes('AWARD')) {
      return <Award className="w-4 h-4 text-blue-800" />;
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
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update weight settings.');
      }

      setStatusMsg({
        type: 'success',
        text: 'All category weights, festival level multipliers, and subcategory coefficients updated successfully!',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Universal Scoring Matrix
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-madin-900" />
              <span>Weight Management & Normalization Rules</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit weightage for Main Categories, Festival Levels (Sahityotsav, Kalotsav, Maharjan: Kulliya, Daaera, Jamia), Subcategories, and Creative Hub.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-2xl text-xs font-bold shadow-md flex items-center space-x-1.5 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>{saving ? 'Saving...' : 'Save All Weights'}</span>
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

        {/* 1. MAIN CATEGORY WEIGHTS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-blue-700" />
              <div>
                <h3 className="text-base font-black text-slate-900">Main Category Weights (SPR Pillars)</h3>
                <p className="text-xs text-slate-500">Configure contribution percentages for the overall SPR index</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-xl text-xs font-extrabold text-blue-950">
              Total Weight: {totalIncludedWeight.toFixed(1)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weights.map((w) => (
              <div
                key={w.categoryId}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                      {renderCategoryIcon(w.code, w.icon)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{w.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">Code: {w.code}</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-900 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shrink-0 ml-2">
                    {Number(w.weight).toFixed(1)}x
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Weight Multiplier</span>
                    <span>{Number(w.weight).toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={w.weight}
                    onChange={(e) => handleCategoryWeightChange(w.categoryId, parseFloat(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. FESTIVAL & COMPETITION LEVEL MULTIPLIERS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Trophy className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">Festival & Competition Level Multipliers</h3>
              <p className="text-xs text-slate-500">
                Sahityotsav (Division, District, State, National), Kalotsav (Sub-district, District, State), Maharjan (Daaera, Jamia)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {levels.map((lvl) => (
              <div
                key={lvl.id}
                className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200 flex flex-col justify-between space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{lvl.name}</span>
                  <span className="text-xs font-black text-amber-900 bg-white px-2 py-0.5 rounded-lg border border-amber-300">
                    {Number(lvl.weightMultiplier).toFixed(2)}x
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                    <span>Multiplier</span>
                    <span>×{Number(lvl.weightMultiplier).toFixed(2)}</span>
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
              </div>
            ))}
          </div>
        </div>

        {/* 3. CUSTOM SUBCATEGORIES WEIGHTS */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Flame className="w-5 h-5 text-rose-600" />
            <div>
              <h3 className="text-base font-black text-slate-900">Custom Subcategories Weightage</h3>
              <p className="text-xs text-slate-500">Admin configured custom subcategories</p>
            </div>
          </div>

          {subcategories.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              No custom subcategories configured yet. Create one from &ldquo;Other Subcategories&rdquo; menu.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subcategories.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 bg-rose-50/40 rounded-2xl border border-rose-200 flex flex-col justify-between space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">{sub.name}</div>
                      <div className="text-[10px] text-slate-400">{sub.category?.name || 'Main'}</div>
                    </div>
                    <span className="text-xs font-black text-rose-900 bg-white px-2 py-0.5 rounded-lg border border-rose-300">
                      {Number(sub.weight || 1.0).toFixed(2)}x
                    </span>
                  </div>

                  <div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.05"
                      value={sub.weight || 1.0}
                      onChange={(e) => handleSubcategoryWeightChange(sub.id, parseFloat(e.target.value))}
                      className="w-full accent-rose-600 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. CREATIVE HUB: WINGS & PUBLISHED MEDIA WEIGHTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Creative Forms */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Sparkles className="w-5 h-5 text-purple-700" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Creative Wings / Forms Weightage</h3>
                <p className="text-[11px] text-slate-500">Poems, Articles, Short Stories, Essays, etc.</p>
              </div>
            </div>

            <div className="space-y-3">
              {creativeForms.map((cf) => (
                <div
                  key={cf.id}
                  className="p-3 bg-purple-50/40 rounded-2xl border border-purple-200 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-900">{cf.name}</span>
                  <div className="flex items-center space-x-3 w-40">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={cf.weight || 1.0}
                      onChange={(e) => handleCreativeFormWeightChange(cf.id, parseFloat(e.target.value))}
                      className="w-full accent-purple-600 cursor-pointer"
                    />
                    <span className="text-xs font-black text-purple-900 w-10 text-right">
                      {Number(cf.weight || 1.0).toFixed(2)}x
                    </span>
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
                <h3 className="text-sm font-black text-slate-900">Published Media Weightage</h3>
                <p className="text-[11px] text-slate-500">Suprabhaatham, Siraj, Manorama, Mathrubhumi, etc.</p>
              </div>
            </div>

            <div className="space-y-3">
              {publishedMedia.map((pm) => (
                <div
                  key={pm.id}
                  className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-200 flex items-center justify-between"
                >
                  <span className="text-xs font-bold text-slate-900">{pm.name}</span>
                  <div className="flex items-center space-x-3 w-40">
                    <input
                      type="range"
                      min="0.1"
                      max="3.0"
                      step="0.05"
                      value={pm.weight || 1.0}
                      onChange={(e) => handleMediaWeightChange(pm.id, parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-xs font-black text-emerald-900 w-10 text-right">
                      {Number(pm.weight || 1.0).toFixed(2)}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
