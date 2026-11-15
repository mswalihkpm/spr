'use client';

import React from 'react';
import { Trophy } from 'lucide-react';

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
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!entries || entries.length === 0) return null;

  // De-duplicate by className to ensure each class appears exactly once with valid data
  const classMap = new Map<string, ClassEntry>();
  for (const item of entries) {
    if (!item.className || item.totalStudents <= 0) continue;
    const key = item.className.trim().toLowerCase();
    const existing = classMap.get(key);
    const itemScore = item.averagePercentage ?? item.spr ?? 0;
    const existingScore = existing ? (existing.averagePercentage ?? existing.spr ?? 0) : -1;

    if (!existing || item.totalStudents > existing.totalStudents || itemScore > existingScore) {
      classMap.set(key, item);
    }
  }

  const uniqueClasses = Array.from(classMap.values());
  const sortedClasses = uniqueClasses
    .sort((a, b) => {
      const scoreA = a.averagePercentage ?? a.spr ?? 0;
      const scoreB = b.averagePercentage ?? b.spr ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (a.rank ?? 999) - (b.rank ?? 999);
    })
    .map((cls, idx) => ({
      ...cls,
      rank: idx + 1,
    }));

  // Clean styles per rank
  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          barGradient: 'from-amber-400 via-amber-500 to-yellow-400 shadow-sm ring-1 ring-amber-300',
          badgeBg: 'bg-amber-400 text-amber-950 font-black ring-2 ring-amber-300',
          textColor: 'text-amber-800 dark:text-amber-300',
          borderHighlight: 'border-amber-300/80 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10',
        };
      case 2:
        return {
          barGradient: 'from-slate-300 via-slate-400 to-slate-200 shadow-xs ring-1 ring-slate-300',
          badgeBg: 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold',
          textColor: 'text-slate-800 dark:text-slate-200',
          borderHighlight: 'border-slate-200 dark:border-slate-800',
        };
      case 3:
        return {
          barGradient: 'from-amber-600 via-amber-700 to-amber-500 shadow-xs ring-1 ring-amber-600',
          badgeBg: 'bg-amber-200 dark:bg-amber-800 text-amber-950 dark:text-amber-100 font-bold',
          textColor: 'text-amber-900 dark:text-amber-300',
          borderHighlight: 'border-amber-200/60 dark:border-amber-900/40',
        };
      case 4:
        return {
          barGradient: 'from-indigo-500 via-indigo-600 to-blue-500 shadow-2xs',
          badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold',
          textColor: 'text-indigo-700 dark:text-indigo-300',
          borderHighlight: 'border-slate-200 dark:border-slate-800',
        };
      default:
        return {
          barGradient: 'from-purple-500 via-violet-600 to-fuchsia-500 shadow-2xs',
          badgeBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold',
          textColor: 'text-purple-700 dark:text-purple-300',
          borderHighlight: 'border-slate-200 dark:border-slate-800',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-xs animate-slide-up">
      {/* Header */}
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Class Champions Leaderboard
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Average SPR Percentage calculated across all evaluated eligible students in each academic cohort.
          </p>
        </div>
      </div>

      {/* Graphical Bar Representation: Displaying ONLY the 4 Key Statuses per Class */}
      <div className="pt-4 space-y-3 sm:space-y-3.5">
        {sortedClasses.map((cls) => {
          const rank = cls.rank;
          const score = cls.averagePercentage ?? cls.spr ?? 0;
          const displayPct = cls.displayPercentage || `${score.toFixed(2)}%`;
          const style = getRankStyle(rank);
          const barWidth = Math.min(100, Math.max(0, score));

          return (
            <div
              key={cls.classId || cls.className}
              className={`p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-850 border ${style.borderHighlight} hover:shadow-xs transition-all duration-300 group`}
            >
              {/* Top Row: ONLY 4 STATUSES: Rank, Class Name, Total Evaluated Students, Average SPR % */}
              <div className="flex items-center justify-between gap-2 mb-2 text-xs">
                {/* Status 1 (Rank) & Status 2 (Class Name) & Status 3 (Total Evaluated Students) */}
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-xs shrink-0 shadow-2xs ${style.badgeBg}`}
                  >
                    {rank}
                  </span>
                  <div className="flex items-center space-x-2 truncate">
                    <span className="font-black text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                      {cls.className}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                      {cls.totalStudents} Students
                    </span>
                  </div>
                </div>

                {/* Status 4: Average SPR % */}
                <div className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-black text-xs sm:text-sm">
                  <span className={style.textColor}>{displayPct}</span>
                </div>
              </div>

              {/* Bar Graph */}
              <div className="relative w-full h-3 sm:h-3.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${style.barGradient} transition-all duration-1000 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
