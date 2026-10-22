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
  const [showPodium, setShowPodium] = useState<boolean>(true);

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
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] shadow-2xs">
          <span>🥇</span>
          <span>1st Position</span>
        </span>
      );
    }
    if (lower.startsWith('2') || lower.includes('second')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-500/15 border border-slate-400 text-slate-700 dark:text-slate-300 font-bold text-[11px] shadow-2xs">
          <span>🥈</span>
          <span>2nd Position</span>
        </span>
      );
    }
    if (lower.startsWith('3') || lower.includes('third')) {
      return (
        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-orange-500/15 border border-orange-500/40 text-orange-700 dark:text-orange-300 font-bold text-[11px] shadow-2xs">
          <span>🥉</span>
          <span>3rd Position</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[10px] border border-blue-200 dark:border-blue-800">
        {pos}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden flex flex-col h-[94vh] sm:h-[88vh] max-h-[94vh] animate-scale-in">
        {/* Modal Header */}
        <div className="relative px-4 py-2.5 sm:px-6 sm:py-3.5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between border-b border-indigo-950 shrink-0">
          <div className="min-w-0 pr-3 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-blue-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-none">{currentItem.categoryName || 'Item Standings'}</span>
                {currentItem.parentName && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[120px] sm:max-w-none">{currentItem.parentName}</span>
                  </>
                )}
              </div>
            </div>

            <h2
              className="text-sm sm:text-lg lg:text-xl font-black tracking-tight text-white leading-tight truncate"
              title={currentItem.name}
            >
              {currentItem.name}
            </h2>

            <p className="text-[10px] sm:text-xs text-blue-200/80 font-medium truncate mt-0.5 hidden xs:block">
              Official Student Performance Rate (SPR) Standings & Results
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition-all shrink-0 ml-2"
            title="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Quick Highlights Summary Cards - Compact Ribbon */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 px-3 py-1.5 sm:px-6 sm:py-2 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="py-1 px-2 sm:py-1.5 sm:px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex items-center justify-center space-x-1.5 sm:space-x-2">
            <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider truncate leading-none">
                Participants
              </div>
              <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight mt-0.5 truncate">
                {filteredLeaderboard.length}
              </div>
            </div>
          </div>

          <div className="py-1 px-2 sm:py-1.5 sm:px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex items-center justify-center space-x-1.5 sm:space-x-2">
            <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider truncate leading-none">
                Top Points
              </div>
              <div className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 leading-tight mt-0.5 truncate">
                {currentItem.topScore !== undefined ? `${currentItem.topScore} pts` : '—'}
              </div>
            </div>
          </div>

          <div className="py-1 px-2 sm:py-1.5 sm:px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex items-center justify-center space-x-1.5 sm:space-x-2">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <div className="text-left min-w-0">
              <div className="text-[9px] sm:text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider truncate leading-none">
                Avg Score
              </div>
              <div className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5 truncate">
                {currentItem.avgScore !== undefined ? `${currentItem.avgScore} pts` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar - Single Row */}
        <div className="px-3 py-1.5 sm:px-6 sm:py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              placeholder="Search student or ID..."
              className="w-full pl-8 pr-7 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
            {searchStudent && (
              <button
                onClick={() => setSearchStudent('')}
                className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {availableClasses.length > 0 && (
            <div className="flex items-center space-x-1.5 shrink-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600 max-w-[130px] sm:max-w-[180px] truncate"
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="py-16 flex items-center justify-center">
              <VideoLoader size="md" text="Loading leaderboard standings..." subtext={currentItem.name} />
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Trophy className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="text-sm font-bold text-slate-600 dark:text-slate-300">
                No evaluated records found
              </div>
              <p className="text-xs text-slate-400">
                {filterClass !== 'ALL'
                  ? `No evaluated students from ${filterClass} in this item.`
                  : 'No evaluated scores have been recorded for this item yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Podium Highlight (Top 3 ranks) - Compact 3-Column Grid */}
              {topThree.length >= 2 && !searchStudent && filterClass === 'ALL' && showPodium && (
                <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pb-1">
                  {topThree.map((st) => {
                    const isRank1 = st.rank === 1;
                    const isRank2 = st.rank === 2;
                    const isRank3 = st.rank === 3;

                    const cardBg = isRank1
                      ? 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-600/50 ring-1 ring-amber-400/30'
                      : isRank2
                      ? 'bg-gradient-to-b from-slate-200/50 via-slate-100/20 to-transparent border-slate-300 dark:border-slate-700'
                      : isRank3
                      ? 'bg-gradient-to-b from-orange-400/15 via-orange-400/5 to-transparent border-orange-300 dark:border-orange-600/40'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700';

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
                        className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border ${cardBg} shadow-2xs relative flex flex-col items-center text-center transition-all hover:scale-[1.02] cursor-pointer group`}
                      >
                        {/* Rank Badge */}
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs sm:text-sm">
                            {isRank1 ? '🥇' : isRank2 ? '🥈' : '🥉'}
                          </span>
                          <span
                            className={`text-[10px] sm:text-xs font-black ${
                              isRank1
                                ? 'text-amber-700 dark:text-amber-400'
                                : isRank2
                                ? 'text-slate-600 dark:text-slate-300'
                                : 'text-amber-800 dark:text-amber-500'
                            }`}
                          >
                            #{st.rank}
                          </span>
                        </div>

                        {/* Student Avatar */}
                        <div className="relative my-0.5">
                          <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="sm" />
                        </div>

                        {/* Student Name */}
                        <div className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white truncate w-full mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {st.fullName}
                        </div>

                        {/* Class */}
                        <div className="text-[9px] sm:text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate w-full">
                          {st.className} {st.division ? `(${st.division})` : ''}
                        </div>

                        {/* Position Badge (on larger screens) */}
                        <div className="hidden sm:block mt-1">
                          {getPositionBadge(st.position)}
                        </div>

                        {/* SPR Points */}
                        <div className="mt-1.5 pt-1 w-full border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-center">
                          <span className="font-mono font-black text-[11px] sm:text-xs text-blue-700 dark:text-blue-300">
                            {st.sprPoints} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full Standings Table / List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-2 pb-0.5">
                  <span className="truncate">Standings ({filteredLeaderboard.length})</span>
                  <div className="flex items-center space-x-3 shrink-0">
                    {topThree.length >= 2 && !searchStudent && filterClass === 'ALL' && (
                      <button
                        onClick={() => setShowPodium(!showPodium)}
                        className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {showPodium ? 'Hide Podium' : 'Show Podium'}
                      </button>
                    )}
                    <span className="text-[10px] sm:text-[11px] text-slate-400">Evaluated Points</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
                  {filteredLeaderboard.map((entry) => {
                    return (
                      <div
                        key={entry.recordId}
                        onClick={() => onSelectStudent && onSelectStudent(entry.studentId)}
                        className={`p-2 sm:p-3 flex items-center justify-between transition-colors hover:bg-blue-50/70 dark:hover:bg-slate-800/70 cursor-pointer group ${
                          entry.rank === 1 ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 pr-2">
                          {/* Rank indicator */}
                          <div
                            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 ${
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
                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center flex-wrap gap-1 mt-0.5">
                              <span className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/70 px-1 py-0.2 rounded border border-blue-200 dark:border-blue-800 text-[9px] sm:text-[9.5px]">
                                {entry.sprStudentId}
                              </span>
                              <span>• {entry.className}</span>
                              {entry.division && <span>({entry.division})</span>}
                              {entry.levelName && (
                                <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-1 py-0.2 rounded text-[9px] sm:text-[9.5px]">
                                  {entry.levelName} ({entry.levelMultiplier}x)
                                </span>
                              )}
                              {(entry as any).isExam && (entry as any).remarks && (
                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1 py-0.2 rounded text-[9px] sm:text-[9.5px]">
                                  {(entry as any).remarks}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Point calculation breakdown and final SPR points */}
                        <div className="flex items-center space-x-2 sm:space-x-4 shrink-0 text-right">
                          <div className="hidden sm:flex flex-col items-end">
                            {getPositionBadge(entry.position)}
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {(entry as any).isExam ? (
                                <span>
                                  {entry.baseScore}/{entry.maxScore} ({(entry as any).percentage}%)
                                </span>
                              ) : (
                                <>
                                  Base: {entry.baseScore} pts
                                  {entry.levelMultiplier > 1 && ` × ${entry.levelMultiplier}`}
                                  {entry.prizeMultiplier > 1 && ` × ${entry.prizeMultiplier}`}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="font-mono font-black text-xs sm:text-base text-blue-700 dark:text-blue-300">
                              {entry.sprPoints} pts
                            </span>
                            <span className="text-[8.5px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              SPR Score
                            </span>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
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
        <div className="px-4 py-2 sm:px-6 sm:py-2.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
          <span className="truncate mr-2">Click any student to view dossier</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 sm:px-4 sm:py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition font-bold text-xs shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
