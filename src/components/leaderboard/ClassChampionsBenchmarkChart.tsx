'use client';

import React from 'react';
import { Trophy, TrendingUp, Users, Award, BarChart3, Sparkles } from 'lucide-react';

interface ClassEntry {
  classId?: string;
  className: string;
  rank: number;
  averagePercentage?: number;
  spr?: number;
  displayPercentage?: string;
  totalStudents: number;
  _isOvertaking?: boolean;
}

interface ClassChampionsBenchmarkChartProps {
  entries: ClassEntry[];
  loading?: boolean;
}

export default function ClassChampionsBenchmarkChart({
  entries,
  loading = false,
}: ClassChampionsBenchmarkChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs mb-5 animate-pulse">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-800 rounded-lg mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) return null;

  // Sort classes by rank
  const sortedClasses = [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
  const topClass = sortedClasses[0];
  const lowestClass = sortedClasses[sortedClasses.length - 1];

  const topPct = topClass?.averagePercentage ?? topClass?.spr ?? 0;
  const lowestPct = lowestClass?.averagePercentage ?? lowestClass?.spr ?? 0;
  const spread = (topPct - lowestPct).toFixed(2);
  const totalStudentsEvaluated = sortedClasses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);

  // Gradient styles per rank
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          barGradient: 'from-amber-400 via-amber-500 to-yellow-400 shadow-md shadow-amber-500/20 ring-1 ring-amber-300',
          badgeBg: 'bg-amber-400 text-amber-950 ring-2 ring-amber-300',
          textColor: 'text-amber-800 dark:text-amber-300',
          borderHighlight: 'border-amber-300 dark:border-amber-600/40',
        };
      case 2:
        return {
          barGradient: 'from-slate-300 via-slate-400 to-slate-200 shadow-sm ring-1 ring-slate-300',
          badgeBg: 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 ring-1 ring-slate-400',
          textColor: 'text-slate-800 dark:text-slate-200',
          borderHighlight: 'border-slate-300 dark:border-slate-700',
        };
      case 3:
        return {
          barGradient: 'from-amber-600 via-amber-700 to-amber-500 shadow-sm ring-1 ring-amber-600',
          badgeBg: 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 ring-1 ring-amber-500/40',
          textColor: 'text-amber-900 dark:text-amber-300',
          borderHighlight: 'border-amber-200 dark:border-amber-800',
        };
      case 4:
        return {
          barGradient: 'from-indigo-500 via-indigo-600 to-blue-500 shadow-2xs',
          badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400/30',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          borderHighlight: 'border-indigo-100 dark:border-indigo-900/40',
        };
      default:
        return {
          barGradient: 'from-purple-500 via-violet-600 to-fuchsia-500 shadow-2xs',
          badgeBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 ring-1 ring-purple-400/30',
          textColor: 'text-purple-700 dark:text-purple-300',
          borderHighlight: 'border-purple-100 dark:border-purple-900/40',
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/20 to-slate-50 dark:from-slate-900 dark:via-indigo-950/10 dark:to-slate-900 rounded-2xl sm:rounded-3xl border border-indigo-100 dark:border-indigo-950/60 p-4 sm:p-6 shadow-xs mb-6 animate-slide-up">
      {/* Header & Benchmark Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start sm:items-center space-x-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Official Comparative Analytics
              </span>
              <span className="text-xs text-slate-400 hidden sm:inline">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                5 Academic Cohorts
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              Class Champions Benchmark Graph
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comparative average Final SPR % calculated across all eligible students in each academic class.
            </p>
          </div>
        </div>

        {/* Quick KPI Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Leader:</span>
            <span className="font-black text-amber-700 dark:text-amber-300">
              {topClass?.className} ({topClass?.displayPercentage || `${topPct.toFixed(2)}%`})
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Evaluated:</span>
            <span className="font-black text-slate-900 dark:text-slate-100">{totalStudentsEvaluated} Students</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center space-x-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-slate-600 dark:text-slate-300 font-medium">Spread:</span>
            <span className="font-black text-indigo-700 dark:text-indigo-300">{spread}%</span>
          </div>
        </div>
      </div>

      {/* Graphical Benchmark Progress Bars */}
      <div className="pt-5 space-y-4">
        {sortedClasses.map((cls) => {
          const rank = cls.rank;
          const score = cls.averagePercentage ?? cls.spr ?? 0;
          const displayPct = cls.displayPercentage || `${score.toFixed(2)}%`;
          const style = getRankStyle(rank);
          const diffFromTop = topPct - score;

          // Bar width percentage relative to max scale (out of 100%)
          const barWidth = Math.min(100, Math.max(0, score));

          return (
            <div
              key={cls.classId || cls.className}
              className={`p-3 sm:p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/70 border ${style.borderHighlight} hover:shadow-sm transition-all duration-300 group`}
            >
              {/* Top Row: Rank, Class Name, Cohort Size, Score, and Lead Margin */}
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full font-black text-xs shrink-0 shadow-2xs ${style.badgeBg}`}
                  >
                    {rank === 1 ? '1' : rank === 2 ? '2' : rank === 3 ? '3' : rank}
                  </span>
                  <div className="truncate">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {cls.className}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {cls.totalStudents} Students
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                  {rank === 1 ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                      <span>👑</span>
                      <span>Leader</span>
                    </span>
                  ) : (
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">
                      -{diffFromTop.toFixed(2)}% margin
                    </span>
                  )}

                  <div className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs sm:text-sm">
                    <span className={style.textColor}>{displayPct}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar Track & Fill */}
              <div className="relative w-full h-3 sm:h-3.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                {/* Benchmark Tick Lines (25%, 50%, 75%) */}
                <div className="absolute inset-0 flex justify-between px-[25%] pointer-events-none opacity-30">
                  <div className="w-px h-full bg-slate-300 dark:bg-slate-600" />
                  <div className="w-px h-full bg-slate-300 dark:bg-slate-600" />
                </div>

                <div
                  className={`h-full rounded-full bg-gradient-to-r ${style.barGradient} transition-all duration-1000 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Calculation Formula Verification Pill */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-1.5">
        <span className="flex items-center space-x-1 text-center sm:text-left">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 inline" />
          <span>
            <strong>Formula:</strong> Class Average SPR = Total Final SPR % of All Eligible Students ÷ Total Eligible Students
          </span>
        </span>
        <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
          Equal Academic Weighting
        </span>
      </div>
    </div>
  );
}
