'use client';

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Calendar, Sparkles } from 'lucide-react';

export interface WeeklyTimelinePoint {
  week: string; // e.g. "W1", "W2"
  weekName: string; // e.g. "Week 1"
  dateRange: string; // e.g. "Jul 1 - Jul 8"
  weeklyPoints: number;
  cumulativePoints: number;
  activityCount: number;
  sprPercentage: number;
}

interface WeeklyPerformanceChartProps {
  timeline: WeeklyTimelinePoint[];
  currentSprPct: number;
  totalPoints: number;
  classRank?: number | string;
}

export default function WeeklyPerformanceChart({
  timeline = [],
  currentSprPct,
  totalPoints,
  classRank,
}: WeeklyPerformanceChartProps) {
  const [viewMode, setViewMode] = useState<'ALL' | 'RECENT'>('ALL');

  // Filter dataset based on view mode (RECENT shows last 10 weeks, ALL shows full academic timeline)
  const displayData = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    if (viewMode === 'RECENT' && timeline.length > 10) {
      return timeline.slice(-10);
    }
    return timeline;
  }, [timeline, viewMode]);

  // Dynamic Y-axis scale to cleanly fit scores exceeding 100% (e.g. 123.88%)
  const yDomainMax = useMemo(() => {
    if (!timeline || timeline.length === 0) return 100;
    const maxVal = Math.max(...timeline.map((d) => d.sprPercentage || 0), currentSprPct, 100);
    return Math.ceil((maxVal + 10) / 10) * 10;
  }, [timeline, currentSprPct]);

  // Dynamic minimum chart width for mobile horizontal scrolling when viewing all weeks
  const dynamicMinWidth = useMemo(() => {
    if (viewMode === 'ALL' && displayData.length > 12) {
      return Math.max(620, displayData.length * 42);
    }
    return '100%';
  }, [viewMode, displayData.length]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload as WeeklyTimelinePoint;
      return (
        <div className="bg-slate-900/95 text-white p-3 sm:p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs backdrop-blur-md space-y-1.5 min-w-[200px] z-50">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
            <span className="font-black text-blue-400 uppercase tracking-wider text-[11px]">
              {p.weekName}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{p.dateRange}</span>
          </div>

          <div className="pt-0.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Cumulative SPR %</div>
            <div className="text-base sm:text-lg font-black text-amber-300 font-mono leading-tight">
              {p.sprPercentage}%
            </div>
          </div>

          <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-300">Weekly Performance:</span>
            <span
              className={`font-mono font-bold ${
                p.weeklyPoints > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {p.weeklyPoints > 0 ? `+${p.weeklyPoints}` : '0.0'} pts
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>Evaluated Activities:</span>
            <span className="font-semibold text-white">{p.activityCount} record(s)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-7 shadow-xs space-y-4 sm:space-y-5">
      {/* Chart Header & Statistical Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
              Weekly Student Performance Graph
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time SPR percentage trajectory evaluated weekly from July 2026 to present.
          </p>
        </div>

        {/* View Mode & Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Recent vs All Weeks Toggle */}
          {timeline.length > 10 && (
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('RECENT')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  viewMode === 'RECENT'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Recent Weeks
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  viewMode === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All Weeks ({timeline.length})
              </button>
            </div>
          )}

          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block">Class Standing</span>
            <span className="font-black text-blue-600 dark:text-blue-400 font-mono text-xs sm:text-sm">
              {classRank ? `#${classRank}` : '—'}
            </span>
          </div>

          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block">Current SPR</span>
            <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-xs sm:text-sm">
              {currentSprPct}%
            </span>
          </div>

          <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold block">Total Weighted Points</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs sm:text-sm">
              {totalPoints} pts
            </span>
          </div>
        </div>
      </div>

      {/* Responsive Graph Container */}
      <div className="w-full overflow-x-auto pb-2 scrollbar-thin">
        <div style={{ minWidth: typeof dynamicMinWidth === 'number' ? `${dynamicMinWidth}px` : dynamicMinWidth }} className="h-64 sm:h-72">
          {displayData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayData} margin={{ top: 12, right: 16, left: -16, bottom: 4 }}>
                <defs>
                  <linearGradient id="weeklySprGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  interval={0}
                />
                <YAxis
                  domain={[0, yDomainMax]}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="sprPercentage"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#weeklySprGradient)"
                  connectNulls={true}
                  dot={{ r: 3.5, fill: '#2563eb', stroke: '#ffffff', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#ffffff', strokeWidth: 2.5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Compiling real weekly performance progression...
            </div>
          )}
        </div>
      </div>

      {/* Mobile scroll hint */}
      {viewMode === 'ALL' && displayData.length > 12 && (
        <div className="sm:hidden text-[10px] text-slate-400 text-center flex items-center justify-center space-x-1">
          <span>← Swipe horizontally to inspect full historical weekly progression →</span>
        </div>
      )}
    </div>
  );
}
