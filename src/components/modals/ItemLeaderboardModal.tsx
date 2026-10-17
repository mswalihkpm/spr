'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  X,
  Search,
  Filter,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Users,
  TrendingUp,
  Flame,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';

export interface ItemLeaderboardItem {
  id?: string;
  name: string;
  parentName?: string;
  categoryName?: string;
  categoryCode?: string;
  type?: string;
  totalParticipants?: number;
  topScore?: number;
  avgScore?: number;
}

export interface ItemLeaderboardEntry {
  recordId: string;
  studentId: string;
  sprStudentId: string;
  fullName: string;
  photoUrl: string | null;
  className: string;
  numericGrade: number;
  division: string | null;
  schoolName: string | null;
  position: string | null;
  grade: string | null;
  baseScore: number;
  maxScore: number;
  levelName: string | null;
  levelMultiplier: number;
  prizeMultiplier: number;
  sprPoints: number;
  remarks: string | null;
  date: string | null;
  rank: number;
}

interface ItemLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ItemLeaderboardItem | null;
  onSelectStudent?: (studentId: string) => void;
}

export default function ItemLeaderboardModal({
  isOpen,
  onClose,
  item,
  onSelectStudent,
}: ItemLeaderboardModalProps) {
  const [loading, setLoading] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<{
    item: ItemLeaderboardItem;
    leaderboard: ItemLeaderboardEntry[];
    totalStudents: number;
  } | null>(null);

  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [searchStudent, setSearchStudent] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !item) {
      setLeaderboardData(null);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams();
    if (item.id) params.append('id', item.id);
    if ((item as any).ids && Array.isArray((item as any).ids)) {
      params.append('ids', (item as any).ids.join(','));
    }
    if (item.name) params.append('name', item.name);
    if (item.type) params.append('type', item.type);
    if (filterClass !== 'ALL') params.append('classId', filterClass);

    fetch(`/api/public/item-leaderboard?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.leaderboard) {
          setLeaderboardData(data);
        }
      })
      .catch((err) => console.error('Error fetching item leaderboard:', err))
      .finally(() => setLoading(false));
  }, [isOpen, item]);

  // Extract unique classes for class filter
  const availableClasses = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    const classSet = new Set<string>();
    leaderboardData.leaderboard.forEach((e) => {
      if (e.className) classSet.add(e.className);
    });
    return Array.from(classSet).sort();
  }, [leaderboardData]);

  // Filter leaderboard by selected class and search term
  const filteredLeaderboard = useMemo(() => {
    if (!leaderboardData?.leaderboard) return [];
    let list = leaderboardData.leaderboard;

    if (filterClass !== 'ALL') {
      list = list.filter((e) => e.className === filterClass);
    }

    if (searchStudent.trim()) {
      const q = searchStudent.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.sprStudentId.toLowerCase().includes(q) ||
          (e.division && e.division.toLowerCase().includes(q))
      );
    }

    return list;
  }, [leaderboardData, filterClass, searchStudent]);

  if (!isOpen || !item) return null;

  const currentItem = leaderboardData?.item || item;
  const topThree = filteredLeaderboard.slice(0, 3);

  const getPositionBadge = (pos: string | null) => {
    if (!pos) return null;
    const lower = pos.toLowerCase();
    if (lower.startsWith('1') || lower.includes('first')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs shadow-2xs">
          <span>🥇</span>
          <span>1st Position</span>
        </span>
      );
    }
    if (lower.startsWith('2') || lower.includes('second')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-500/15 border border-slate-400 text-slate-700 dark:text-slate-300 font-bold text-xs shadow-2xs">
          <span>🥈</span>
          <span>2nd Position</span>
        </span>
      );
    }
    if (lower.startsWith('3') || lower.includes('third')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-700 dark:text-orange-300 font-bold text-xs shadow-2xs">
          <span>🥉</span>
          <span>3rd Position</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px] border border-blue-200 dark:border-blue-800">
        {pos}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
        {/* Modal Header */}
        <div className="relative px-5 py-5 sm:px-8 sm:py-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-start justify-between border-b border-indigo-950">
          <div className="space-y-1.5 min-w-0 pr-4">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{currentItem.categoryName || 'Item Standings'}</span>
              {currentItem.parentName && (
                <>
                  <span>•</span>
                  <span>{currentItem.parentName}</span>
                </>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">
              {currentItem.name}
            </h2>

            <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
              Official Student Performance Rate (SPR) Standings & Results
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-2xl bg-white/10 hover:bg-white/20 transition-all shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Highlights Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-center">
          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-center space-x-1">
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Participants</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1">
              {filteredLeaderboard.length}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center justify-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Top SPR Points</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {currentItem.topScore !== undefined ? `${currentItem.topScore} pts` : '—'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider flex items-center justify-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Avg Score</span>
            </div>
            <div className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {currentItem.avgScore !== undefined ? `${currentItem.avgScore} pts` : '—'}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar within Modal */}
        <div className="px-5 py-3.5 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search student or ID..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchStudent && (
              <button
                onClick={() => setSearchStudent('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {availableClasses.length > 0 && (
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center space-x-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Class:</span>
              </span>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="ALL">All Classes ({leaderboardData?.leaderboard.length || 0})</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <VideoLoader size="md" text="Loading leaderboard standings..." subtext={currentItem.name} />
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                No participant records found
              </div>
              <p className="text-xs text-slate-400">
                {filterClass !== 'ALL'
                  ? `No students from ${filterClass} scored in this item.`
                  : 'Scores have not been recorded for this item yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Podium Highlight (Top 3 ranks) if multiple participants */}
              {topThree.length >= 2 && !searchStudent && filterClass === 'ALL' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 pb-4">
                  {topThree.map((st) => {
                    const isRank1 = st.rank === 1;
                    const isRank2 = st.rank === 2;
                    const isRank3 = st.rank === 3;

                    const cardBg = isRank1
                      ? 'bg-gradient-to-b from-amber-500/10 to-amber-500/5 border-amber-300 dark:border-amber-600/40'
                      : isRank2
                      ? 'bg-gradient-to-b from-slate-200/50 to-slate-200/10 border-slate-300 dark:border-slate-700'
                      : isRank3
                      ? 'bg-gradient-to-b from-orange-400/10 to-orange-400/5 border-orange-300 dark:border-orange-600/40'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

                    const rankIcon = isRank1 ? '🥇 1st Rank' : isRank2 ? '🥈 2nd Rank' : isRank3 ? '🥉 3rd Rank' : `🎖️ #${st.rank} Rank`;

                    const rankBadgeBg = isRank1
                      ? 'bg-amber-500 text-white'
                      : isRank2
                      ? 'bg-slate-500 text-white'
                      : isRank3
                      ? 'bg-amber-700 text-white'
                      : 'bg-blue-600 text-white';

                    return (
                      <div
                        key={st.recordId}
                        onClick={() => onSelectStudent && onSelectStudent(st.studentId)}
                        className={`p-4 rounded-2xl border ${cardBg} shadow-sm relative flex flex-col items-center text-center transition-transform hover:scale-[1.02] cursor-pointer group`}
                      >
                        <div className="absolute top-2.5 right-2.5 text-[11px] font-black tracking-wide text-slate-600 dark:text-slate-300">
                          {rankIcon}
                        </div>

                        <div className="mt-2 mb-2 relative">
                          <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="md" />
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${rankBadgeBg} flex items-center justify-center font-black text-[10px] shadow-sm`}>
                            #{st.rank}
                          </div>
                        </div>

                        <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate max-w-[90%] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {st.fullName}
                        </div>

                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {st.className} {st.division ? `(${st.division})` : ''}
                        </div>

                        <div className="mt-2.5 flex items-center space-x-1.5">
                          {getPositionBadge(st.position)}
                        </div>

                        <div className="mt-3 w-full pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-500">SPR Points</span>
                          <span className="font-mono font-black text-sm text-blue-700 dark:text-blue-300">
                            {st.sprPoints} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full Standings Table / List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-3 pb-1">
                  <span>Student Leaderboard Standings ({filteredLeaderboard.length})</span>
                  <span>Evaluated Points</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  {filteredLeaderboard.map((entry) => {
                    const isTopThree = entry.rank <= 3;
                    return (
                      <div
                        key={entry.recordId}
                        onClick={() => onSelectStudent && onSelectStudent(entry.studentId)}
                        className={`p-3 sm:p-4 flex items-center justify-between transition-colors hover:bg-blue-50/70 dark:hover:bg-slate-800/70 cursor-pointer group ${
                          entry.rank === 1 ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 pr-3">
                          {/* Rank indicator */}
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                              entry.rank === 1
                                ? 'bg-amber-400 text-amber-950 shadow-2xs font-bold'
                                : entry.rank === 2
                                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white'
                                : entry.rank === 3
                                ? 'bg-orange-300 dark:bg-orange-800 text-orange-950 dark:text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            #{entry.rank}
                          </div>

                          {/* Student Avatar */}
                          <StudentAvatar photoUrl={entry.photoUrl} name={entry.fullName} size="sm" />

                          {/* Student Details */}
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {entry.fullName}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center flex-wrap gap-1.5 mt-0.5">
                              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-800 text-[9.5px]">
                                {entry.sprStudentId}
                              </span>
                              <span>• {entry.className}</span>
                              {entry.division && <span>({entry.division})</span>}
                              {entry.levelName && (
                                <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded text-[9.5px]">
                                  {entry.levelName} ({entry.levelMultiplier}x)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Point calculation breakdown and final SPR points */}
                        <div className="flex items-center space-x-3 sm:space-x-5 shrink-0 text-right">
                          <div className="hidden sm:flex flex-col items-end">
                            {getPositionBadge(entry.position)}
                            <div className="text-[10px] text-slate-400 font-mono mt-1">
                              Base: {entry.baseScore} pts
                              {entry.levelMultiplier > 1 && ` × ${entry.levelMultiplier}`}
                              {entry.prizeMultiplier > 1 && ` × ${entry.prizeMultiplier}`}
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="font-mono font-black text-sm sm:text-base text-blue-700 dark:text-blue-300">
                              {entry.sprPoints} pts
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                              SPR Score
                            </span>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Click any student to view their complete analytical dossier</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
