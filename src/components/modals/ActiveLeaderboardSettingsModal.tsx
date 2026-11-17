'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Zap, CheckCircle2, AlertCircle, Loader2, Sparkles, Sliders } from 'lucide-react';
import { ActiveLeaderboardSettings } from '@/types';
import { invalidateClientCache } from '@/lib/client-cache';

interface ActiveLeaderboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ActiveLeaderboardSettings | null;
  onSaved?: (settings: ActiveLeaderboardSettings) => void;
}

const PRESET_DAYS = [7, 14, 30, 45, 60, 90];

export default function ActiveLeaderboardSettingsModal({
  isOpen,
  onClose,
  currentSettings,
  onSaved,
}: ActiveLeaderboardSettingsModalProps) {
  const [mode, setMode] = useState<'DAYS' | 'DATE'>('DAYS');
  const [days, setDays] = useState<number>(30);
  const [customDate, setCustomDate] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setMode(currentSettings.mode || 'DAYS');
      setDays(currentSettings.days || 30);
      if (currentSettings.customDate) {
        setCustomDate(currentSettings.customDate.slice(0, 10));
      } else {
        const d = new Date();
        d.setDate(d.getDate() - (currentSettings.days || 30));
        setCustomDate(d.toISOString().slice(0, 10));
      }
    } else {
      setMode('DAYS');
      setDays(30);
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setCustomDate(d.toISOString().slice(0, 10));
    }
    setError(null);
    setSuccess(false);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  // Calculate live preview cutoff date
  let calculatedPreviewDate: Date;
  if (mode === 'DATE' && customDate) {
    calculatedPreviewDate = new Date(`${customDate}T00:00:00.000Z`);
  } else {
    calculatedPreviewDate = new Date();
    calculatedPreviewDate.setDate(calculatedPreviewDate.getDate() - (Number(days) || 30));
    calculatedPreviewDate.setHours(0, 0, 0, 0);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: any = {
        mode,
        days: mode === 'DAYS' ? Math.max(1, Number(days) || 30) : undefined,
        customDate: mode === 'DATE' ? customDate : undefined,
      };

      const res = await fetch('/api/admin/active-leaderboard-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Admin authorization required. Please log in with an administrator account to save settings.');
        }
        throw new Error(data.error || 'Failed to update active leaderboard settings.');
      }

      setSuccess(true);
      invalidateClientCache('/api/leaderboard');
      if (onSaved && data.settings) {
        onSaved(data.settings);
      }
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Save active leaderboard settings error:', err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Zap className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Active Leaderboard Settings</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Customize activity calculation window for live standings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 font-semibold">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2 animate-scale-up">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">Active Leaderboard window saved successfully! Refreshing...</span>
            </div>
          )}

          {/* Mode Switch Tabs */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Window Evaluation Mode
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setMode('DAYS')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  mode === 'DAYS'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Rolling Days</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('DATE')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  mode === 'DATE'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Custom Start Date</span>
              </button>
            </div>
          </div>

          {/* Rolling Days Inputs */}
          {mode === 'DAYS' && (
            <div className="space-y-3 animate-fade-in">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Select Active Period Preset or Enter Custom Days
              </label>

              {/* Preset Buttons */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {PRESET_DAYS.map((d) => {
                  const isSelected = days === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDays(d)}
                      className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all text-center ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-102'
                          : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {d} Days
                    </button>
                  );
                })}
              </div>

              {/* Custom Number Input */}
              <div className="pt-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Custom Days:</span>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={days}
                    onChange={(e) => setDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none text-center"
                  />
                  <span className="text-xs text-slate-500 dark:text-slate-400">days prior to today</span>
                </div>
              </div>
            </div>
          )}

          {/* Custom Date Input */}
          {mode === 'DATE' && (
            <div className="space-y-2 animate-fade-in">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Starting Cutoff Date (Records On or After This Date)
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Only records created on or after 12:00 AM UTC of this date will be included in the active leaderboard.
              </p>
            </div>
          )}

          {/* Live Preview Info Box */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 space-y-1.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Live Cutoff Preview</span>
            </div>
            <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
              Records recorded on or after:{' '}
              <span className="font-bold text-amber-900 dark:text-amber-200">
                {calculatedPreviewDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Exams, tasks, attendance, library, creative works, and point adjustments recorded after this date will be computed.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 flex items-center space-x-1.5 transition disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Window...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Save & Apply Window</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
