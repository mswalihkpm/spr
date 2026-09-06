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
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function WeightsPage() {
  const [weights, setWeights] = useState<any[]>([]);
  const [missingDataRule, setMissingDataRule] = useState<string>('IGNORE_NORMALIZE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchWeights = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/weights');
      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || `Server response error (${res.status})` };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch weights.');
      }

      if (data.weights) setWeights(data.weights);
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

  const handleWeightChange = (categoryId: string, val: number) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, weight: Math.max(0, val) } : w))
    );
  };

  const handleIncludeToggle = (categoryId: string) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, isIncludedInSPR: !w.isIncludedInSPR } : w))
    );
  };

  const handleActiveToggle = (categoryId: string) => {
    setWeights((prev) =>
      prev.map((w) => (w.categoryId === categoryId ? { ...w, isActive: !w.isActive } : w))
    );
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
          missingDataRule,
        }),
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: text || `Server error (${res.status})` };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update weight settings.');
      }

      setStatusMsg({
        type: 'success',
        text: 'SPR Weight & Normalization rules updated and active across system.',
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
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-900 border border-gold-300">
                Universal Scoring Configuration
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-madin-900" />
              <span>Weight Management & Normalization Rules</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure how category percentages combine to form the overall SPR rating.
            </p>
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

        {/* Weight Total Health Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Active Included Weight
            </span>
            <div className="text-3xl font-black text-slate-900 flex items-baseline space-x-2">
              <span className={totalIncludedWeight === 100 ? 'text-emerald-700' : 'text-amber-700'}>
                {totalIncludedWeight}%
              </span>
              <span className="text-xs text-slate-400 font-normal">
                {totalIncludedWeight === 100
                  ? '(Perfect 100% distribution)'
                  : `(Active sum: ${totalIncludedWeight}% - automatically normalized by engine)`}
              </span>
            </div>
          </div>

          <div className="w-full md:w-64 bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalIncludedWeight === 100
                  ? 'bg-emerald-600'
                  : totalIncludedWeight > 100
                  ? 'bg-rose-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(totalIncludedWeight, 100)}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Categories Weight Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Category Weight Allocation</span>
              <span className="text-xs text-slate-500">Sliders update values in real-time</span>
            </div>

            <div className="divide-y divide-slate-100 p-4 space-y-4">
              {weights.map((cat) => (
                <div key={cat.categoryId} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="w-full sm:w-64">
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span>{cat.name}</span>
                      {!cat.isIncludedInSPR && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                          Excluded
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cat.code}</div>
                  </div>

                  {/* Slider & Input */}
                  <div className="flex-1 flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      disabled={!cat.isIncludedInSPR || !cat.isActive}
                      value={cat.weight}
                      onChange={(e) => handleWeightChange(cat.categoryId, Number(e.target.value))}
                      className="w-full accent-madin-900 disabled:opacity-30 cursor-pointer"
                    />
                    <div className="flex items-center space-x-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        disabled={!cat.isIncludedInSPR || !cat.isActive}
                        value={cat.weight}
                        onChange={(e) => handleWeightChange(cat.categoryId, Number(e.target.value))}
                        className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-madin-900 disabled:opacity-30"
                      />
                      <span className="text-xs font-bold text-slate-500">%</span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleIncludeToggle(cat.categoryId)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                        cat.isIncludedInSPR
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {cat.isIncludedInSPR ? 'Included in SPR' : 'Excluded'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Data Rule Selector */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Missing Data Calculation Strategy</h3>
              <p className="text-xs text-slate-500">
                Specify how the scoring engine treats unattempted categories for a student.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Strategy 1 */}
              <div
                onClick={() => setMissingDataRule('IGNORE_NORMALIZE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  missingDataRule === 'IGNORE_NORMALIZE'
                    ? 'border-madin-900 bg-madin-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">Ignore & Normalize</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Normalizes active attempted category weights to 100%. Missing categories do not unfairly penalize students.
                </p>
              </div>

              {/* Strategy 2 */}
              <div
                onClick={() => setMissingDataRule('TREAT_AS_ZERO')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  missingDataRule === 'TREAT_AS_ZERO'
                    ? 'border-madin-900 bg-madin-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">Treat as Zero</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Missing categories count as 0.0% with full weight penalty.
                </p>
              </div>

              {/* Strategy 3 */}
              <div
                onClick={() => setMissingDataRule('REQUIRE_COMPLETE')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  missingDataRule === 'REQUIRE_COMPLETE'
                    ? 'border-madin-900 bg-madin-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-900">Require Complete Data</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Flags incomplete profiles and excludes from champion leaderboards until all items are entered.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>Save Weights & Normalization Engine</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
