'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import {
  Layers,
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  Sliders,
  Check,
  Search,
  Zap,
  Save,
  Calendar,
  Globe,
  Star,
  Users,
  Lock,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import PublicFooter from '@/components/layout/PublicFooter';
import { getCategoryIcon, getCategoryColor } from '@/lib/category-utils';
import { invalidateClientAcademicCache } from '@/lib/academic-client';

const LEVEL_PRESETS = [
  {
    id: 'ALL',
    label: 'All Standard Levels',
    description: 'Includes all 11 competition levels (Campus up to International)',
    levelCodes: ['CAMPUS', 'SCHOOL', 'KULLIYA', 'DAAERA', 'DIVISION', 'SUB_DISTRICT', 'DISTRICT', 'JAMIA', 'STATE', 'NATIONAL', 'INTERNATIONAL'],
    badge: 'All 11 Levels',
  },
  {
    id: 'MAHARJAN',
    label: 'Maharjan Levels',
    description: 'Kulliya (1x) → Daaera (1x) → Jamia (1.5x)',
    levelCodes: ['KULLIYA', 'DAAERA', 'JAMIA'],
    badge: 'Maharjan (3 Levels)',
  },
  {
    id: 'SAHITYOTSAV',
    label: 'Sahityotsav Levels',
    description: 'Division (1x) → District (1.25x) → State (1.5x) → National (2x)',
    levelCodes: ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'],
    badge: 'Sahityotsav (4 Levels)',
  },
  {
    id: 'KALOTSAV',
    label: 'Kalotsav Levels',
    description: 'Sub-district (1x) → District (1.25x) → State (1.5x)',
    levelCodes: ['SUB_DISTRICT', 'DISTRICT', 'STATE'],
    badge: 'Kalotsav (3 Levels)',
  },
];

const PRESET_LOGOS = [
  { label: "Thahadi-Al-Qira'a", icon: '📖' },
  { label: 'Hifz Al-Quran', icon: '🕌' },
  { label: 'Sports & Athletics', icon: '⚽' },
  { label: 'Creative Writing & Arts', icon: '🎨' },
  { label: 'Science & Quiz', icon: '🔬' },
  { label: 'Leadership & Moral', icon: '🌟' },
  { label: 'Language Proficiency', icon: '🗣️' },
  { label: 'Gold Trophy Award', icon: '🏆' },
];

export default function CategorySubcategoriesPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;

  const [category, setCategory] = useState<any | null>(null);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Score Recording Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedSubcategoryForScore, setSelectedSubcategoryForScore] = useState<any | null>(null);
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    levelId: '',
    score: '100',
    maxScore: '100',
    position: '1st',
    academicYear: '2025-2026',
    remarks: '',
  });
  const [recordingScore, setRecordingScore] = useState(false);

  // Subcategory Create/Edit Modal State
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<any | null>(null);
  const [subFormData, setSubFormData] = useState({
    name: '',
    code: '',
    description: '',
    maxScore: 100,
    weight: 10,
    presetId: 'ALL',
    levelIds: [] as string[],
    selectedLevels: {} as Record<string, { multiplier: number; rankPositions: string[] }>,
  });
  const [savingSub, setSavingSub] = useState(false);

  // Auth check silently
  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Load category details, subcategories, levels & students
  const loadData = async () => {
    try {
      setLoading(true);

      const [catRes, subRes, levelsRes, studentsRes] = await Promise.all([
        fetch(`/api/categories?id=${categoryId}`),
        fetch(`/api/subcategories?categoryId=${categoryId}`),
        fetch('/api/levels'),
        fetch('/api/students?all=true'),
      ]);

      const catData = await catRes.json();
      const subData = await subRes.json();
      const levelsData = await levelsRes.json();
      const studentsData = await studentsRes.json();

      if (catData.category) {
        setCategory(catData.category);
      } else if (catData.categories && catData.categories.length > 0) {
        const found = catData.categories.find((c: any) => c.id === categoryId);
        if (found) setCategory(found);
      }

      if (subData.subcategories) {
        setSubcategories(subData.subcategories);
      }

      if (levelsData.levels) {
        setLevels(levelsData.levels);
      }

      if (studentsData.students) {
        setStudents(studentsData.students);
      }
    } catch (err) {
      console.error('Error loading category subcategories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categoryId) {
      loadData();
    }
  }, [categoryId]);

  const filteredSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    const q = searchQuery.toLowerCase().trim();
    return subcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    );
  }, [subcategories, searchQuery]);

  // Open Score Recording Modal
  const handleOpenScoreModal = (sub: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSubcategoryForScore(sub);
    setRecordForm({
      studentId: '',
      levelId: levels.length > 0 ? levels[0].id : '',
      score: String(sub.maxScore || 100),
      maxScore: String(sub.maxScore || 100),
      position: '1st',
      academicYear: '2025-2026',
      remarks: '',
    });
    setRecordModalOpen(true);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.studentId || !selectedSubcategoryForScore) {
      alert('Please select a student.');
      return;
    }

    setRecordingScore(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/performance-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: recordForm.studentId,
          categoryId: category?.id,
          subcategoryId: selectedSubcategoryForScore.id,
          levelId: recordForm.levelId || undefined,
          score: parseFloat(recordForm.score) || 0,
          maxScore: parseFloat(recordForm.maxScore) || 100,
          position: recordForm.position,
          academicYear: recordForm.academicYear,
          remarks: recordForm.remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record performance score.');

      invalidateClientAcademicCache();
      setStatusMsg({
        type: 'success',
        text: `Score recorded successfully for student in ${selectedSubcategoryForScore.name}!`,
      });
      setRecordModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setRecordingScore(false);
    }
  };

  // Open Subcategory Create/Edit Modal
  const handleOpenCreateSub = () => {
    setEditingSubcategory(null);
    setSubFormData({
      name: '',
      code: '',
      description: '',
      maxScore: 100,
      weight: 10,
      presetId: 'ALL',
      levelIds: levels.map((l) => l.id),
      selectedLevels: {},
    });
    setSubModalOpen(true);
  };

  const handleOpenEditSub = (sub: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSubcategory(sub);
    setSubFormData({
      name: sub.name,
      code: sub.code || '',
      description: sub.description || '',
      maxScore: sub.maxScore || 100,
      weight: sub.weight || 10,
      presetId: 'ALL',
      levelIds: sub.levels ? sub.levels.map((l: any) => l.id || l.levelId) : [],
      selectedLevels: {},
    });
    setSubModalOpen(true);
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSub(true);
    setStatusMsg(null);

    try {
      const method = editingSubcategory ? 'PUT' : 'POST';
      const payload = {
        ...(editingSubcategory ? { id: editingSubcategory.id } : {}),
        categoryId: category?.id,
        name: subFormData.name,
        code: subFormData.code || subFormData.name.toUpperCase().replace(/[^A-Z0-9]/g, '_'),
        description: subFormData.description,
        maxScore: subFormData.maxScore,
        weight: subFormData.weight,
        levelIds: subFormData.levelIds,
      };

      const res = await fetch('/api/subcategories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save subcategory.');

      setStatusMsg({
        type: 'success',
        text: `Subcategory "${subFormData.name}" ${editingSubcategory ? 'updated' : 'created'} successfully!`,
      });
      setSubModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSavingSub(false);
    }
  };

  const handleDeleteSubcategory = async (sub: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete subcategory "${sub.name}" and all linked scores?`)) return;

    try {
      const res = await fetch(`/api/subcategories?id=${sub.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete subcategory.');

      setStatusMsg({ type: 'success', text: `Subcategory "${sub.name}" deleted.` });
      loadData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const IconComponent = category ? getCategoryIcon(category.code, category.icon) : Layers;
  const theme = category ? getCategoryColor(category.code) : { bg: 'bg-madin-900', light: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* Universal Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/categories"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition active:scale-95 flex items-center space-x-1.5"
              title="Return to Categories"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">All Categories</span>
            </Link>
            <div className="flex items-center space-x-2.5">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${theme.bg}`}>
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight leading-none uppercase">
                  {category?.name || 'Category Subcategories'}
                </h1>
                <div className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mt-0.5">
                  Subcategory Standings & Scoring
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href={`/leaderboard?cat=${category?.id || categoryId}`}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Wing Leaderboard</span>
            </Link>

            {isAdmin && (
              <button
                onClick={handleOpenCreateSub}
                className="px-3.5 py-1.5 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>+ Add Subcategory</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5">
        {/* Category Banner Card */}
        {category && (
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-madin-950 text-white p-5 sm:p-7 shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gold-400/20 text-gold-300 border border-gold-400/30">
                    Category: {category.code}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/20">
                    SPR Weight: {category.defaultWeight}%
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30">
                    {subcategories.length} Subcategories
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {category.name}
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
                  {category.description || 'Specialized subcategories, evaluation levels, and student scoring criteria.'}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  href="/categories"
                  className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1.5 border border-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Categories</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center justify-between shadow-xs animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-2.5">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-semibold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Search & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subcategory disciplines..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
              {filteredSubcategories.length} Subcategories
            </span>
          </div>
        </div>

        {/* SUBCATEGORIES GRID: 2 IN ONE ROW ON MOBILE */}
        {loading ? (
          <div className="py-16 text-center">
            <VideoLoader size="md" text="Loading Subcategories..." subtext="Accessing Assessment Wings" />
          </div>
        ) : filteredSubcategories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 space-y-3">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No subcategories found</div>
            <p className="text-xs text-slate-400">
              {isAdmin
                ? 'Create a subcategory to organize marks, competition levels, and student scoring.'
                : 'No subcategories are currently registered under this category.'}
            </p>
            {isAdmin && (
              <button
                onClick={handleOpenCreateSub}
                className="mt-2 px-4 py-2 rounded-2xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold inline-flex items-center space-x-1.5 shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Create First Subcategory</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
            {filteredSubcategories.map((sub) => {
              const recordCount = sub._count?.performanceRecords || 0;

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    if (isAdmin) {
                      handleOpenScoreModal(sub);
                    } else {
                      router.push(`/leaderboard?cat=${category?.id || categoryId}&sub=${sub.id}`);
                    }
                  }}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-subtle hover:shadow-md transition-all cursor-pointer group relative flex flex-col justify-between overflow-hidden active:scale-98 hover:border-blue-500"
                >
                  {/* Decorative Background Glow */}
                  <div
                    className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full opacity-5 group-hover:opacity-15 transition-opacity ${theme.bg}`}
                  ></div>

                  {/* Top Header inside Box */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-1.5">
                      {/* Icon Badge */}
                      <div
                        className={`w-9 h-9 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 ${theme.bg}`}
                      >
                        <Award className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>

                      {/* Weight Badge */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80">
                        Max {sub.maxScore || 100}
                      </span>
                    </div>

                    {/* Subcategory Title & Description */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                        {sub.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description || 'Specialized assessment criteria'}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Footer inside Box */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="inline-flex items-center font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {recordCount} Records
                    </span>

                    <div className="flex items-center space-x-1 text-slate-400 group-hover:text-blue-600 transition-colors">
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditSub(sub, e)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                            title="Edit Subcategory"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSubcategory(sub, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete Subcategory"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Public Footer & Mobile Bottom Navigation */}
      <PublicFooter />

      {/* Admin Record Score Modal */}
      {isAdmin && recordModalOpen && selectedSubcategoryForScore && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center text-white">
                  <Zap className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">Record Performance Score</h3>
                  <p className="text-[10px] text-blue-600 font-bold">{selectedSubcategoryForScore.name}</p>
                </div>
              </div>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="space-y-3.5 pt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Student *</label>
                <SearchableStudentSelect
                  students={students}
                  value={recordForm.studentId}
                  onChange={(id) => setRecordForm({ ...recordForm, studentId: id })}
                  placeholder="Search student by name or code..."
                />
              </div>

              {levels.length > 0 && (
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Level</label>
                  <select
                    value={recordForm.levelId}
                    onChange={(e) => setRecordForm({ ...recordForm, levelId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name} ({lvl.code}) — {lvl.multiplier}x Multiplier
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Score Awarded *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={recordForm.score}
                    onChange={(e) => setRecordForm({ ...recordForm, score: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-madin-900 text-blue-600 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max Score</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={recordForm.maxScore}
                    onChange={(e) => setRecordForm({ ...recordForm, maxScore: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900 text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Position / Award</label>
                  <select
                    value={recordForm.position}
                    onChange={(e) => setRecordForm({ ...recordForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  >
                    <option value="1st">1st Position / Gold (100%)</option>
                    <option value="2nd">2nd Position / Silver (80%)</option>
                    <option value="3rd">3rd Position / Bronze (60%)</option>
                    <option value="Special">Special Recognition</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Participated">Participation Only</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Academic Year</label>
                  <input
                    type="text"
                    value={recordForm.academicYear}
                    onChange={(e) => setRecordForm({ ...recordForm, academicYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingScore}
                  className="px-5 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white font-bold transition active:scale-95 disabled:opacity-50"
                >
                  {recordingScore ? 'Recording...' : 'Record Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Add/Edit Subcategory Modal */}
      {isAdmin && subModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center text-white">
                  <Award className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    {editingSubcategory ? 'Edit Subcategory' : 'Add New Subcategory'}
                  </h3>
                  <p className="text-[10px] text-blue-600 font-bold">Category: {category?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-3.5 pt-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subcategory Name *</label>
                <input
                  type="text"
                  required
                  value={subFormData.name}
                  onChange={(e) => setSubFormData({ ...subFormData, name: e.target.value })}
                  placeholder="e.g., Thahadi-Al-Qira'a"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={subFormData.description}
                  onChange={(e) => setSubFormData({ ...subFormData, description: e.target.value })}
                  placeholder="Brief description of this assessment..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={subFormData.maxScore}
                    onChange={(e) => setSubFormData({ ...subFormData, maxScore: parseFloat(e.target.value) || 100 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weight (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={subFormData.weight}
                    onChange={(e) => setSubFormData({ ...subFormData, weight: parseFloat(e.target.value) || 10 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSub}
                  className="px-5 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white font-bold transition active:scale-95 disabled:opacity-50"
                >
                  {savingSub ? 'Saving...' : editingSubcategory ? 'Update Subcategory' : 'Create Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
