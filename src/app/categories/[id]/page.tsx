'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
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
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import { getCategoryIcon, getCategoryColor } from '../page';
import { getAcademicMasterData, invalidateClientAcademicCache } from '@/lib/academic-client';

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

  // Score Recording Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedSubcategoryForScore, setSelectedSubcategoryForScore] = useState<any | null>(null);
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    levelId: '',
    score: '100',
    maxScore: '100',
    position: '1st',
    grade: 'A+',
    remarks: '',
  });
  const [savingScore, setSavingScore] = useState(false);

  // Builder Modal State (Create / Edit Subcategory)
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [builderForm, setBuilderForm] = useState({
    name: '',
    logoUrl: '🏆',
    hasLevels: false,
    levelGroup: 'ALL',
    maxScore: 100,
    weight: 1.0,
    active: true,
  });
  const [savingBuilder, setSavingBuilder] = useState(false);

  // Delete Subcategory Modal State
  const [subToDelete, setSubToDelete] = useState<any | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  // Fetch Category Details & Subcategories
  const fetchCategoryData = async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      const [resCat, resSubs, masterData, resStudents] = await Promise.all([
        fetch(`/api/categories?id=${categoryId}`),
        fetch(`/api/subcategories?categoryId=${categoryId}`),
        getAcademicMasterData(),
        fetch('/api/students?all=true'),
      ]);

      const dataCat = await resCat.json();
      if (dataCat.category) {
        setCategory(dataCat.category);
      }

      const dataSubs = await resSubs.json();
      if (dataSubs.subcategories) {
        setSubcategories(dataSubs.subcategories);
      } else if (dataCat.category?.subcategories) {
        setSubcategories(dataCat.category.subcategories);
      }

      if (masterData.levels) setLevels(masterData.levels);

      const dataStudents = await resStudents.json();
      if (dataStudents.students) setStudents(dataStudents.students);
    } catch (err) {
      console.error('Failed to load category subcategories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();
  }, [categoryId]);

  const filteredSubcategories = useMemo(() => {
    if (!searchQuery.trim()) return subcategories;
    const q = searchQuery.toLowerCase().trim();
    return subcategories.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.code && s.code.toLowerCase().includes(q))
    );
  }, [subcategories, searchQuery]);

  // Handle Quick Record Score Click
  const handleOpenRecordScore = (sub: any) => {
    setSelectedSubcategoryForScore(sub);
    setRecordForm({
      studentId: '',
      levelId: levels.length > 0 ? levels[0].id : '',
      score: String(sub.maxScore || 100),
      maxScore: String(sub.maxScore || 100),
      position: '1st',
      grade: 'A+',
      remarks: '',
    });
    setRecordModalOpen(true);
  };

  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.studentId) {
      alert('Please select a student.');
      return;
    }

    setSavingScore(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: category?.id,
          subcategoryId: selectedSubcategoryForScore?.id,
          levelId: selectedSubcategoryForScore?.hasLevels ? recordForm.levelId : null,
          entries: [
            {
              studentId: recordForm.studentId,
              obtainedScore: Number(recordForm.score),
              maxScore: Number(recordForm.maxScore),
              position: recordForm.position,
              grade: recordForm.grade,
              remarks: recordForm.remarks,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record score.');

      setStatusMsg({
        type: 'success',
        text: `Score saved successfully for selected student in ${selectedSubcategoryForScore?.name}!`,
      });
      setRecordModalOpen(false);
      invalidateClientAcademicCache();
      fetchCategoryData();
    } catch (err: any) {
      alert(err.message || 'Error recording score.');
    } finally {
      setSavingScore(false);
    }
  };

  // Open Create Subcategory
  const handleOpenCreateSubcategory = () => {
    setEditingSubId(null);
    setBuilderForm({
      name: '',
      logoUrl: '🏆',
      hasLevels: false,
      levelGroup: 'ALL',
      maxScore: 100,
      weight: 1.0,
      active: true,
    });
    setBuilderModalOpen(true);
  };

  // Open Edit Subcategory
  const handleOpenEditSubcategory = (sub: any) => {
    setEditingSubId(sub.id);
    setBuilderForm({
      name: sub.name,
      logoUrl: sub.logoUrl || '🏆',
      hasLevels: Boolean(sub.hasLevels),
      levelGroup: sub.levelGroup || 'ALL',
      maxScore: sub.maxScore || 100,
      weight: sub.weight || 1.0,
      active: sub.active !== undefined ? sub.active : true,
    });
    setBuilderModalOpen(true);
  };

  // Save Subcategory
  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!builderForm.name.trim()) return;

    setSavingBuilder(true);
    try {
      const isEdit = Boolean(editingSubId);
      const url = '/api/subcategories';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEdit ? { id: editingSubId } : { categoryId: category?.id }),
          ...builderForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save subcategory.');

      setStatusMsg({
        type: 'success',
        text: `Subcategory "${builderForm.name}" ${isEdit ? 'updated' : 'created'} successfully!`,
      });
      setBuilderModalOpen(false);
      invalidateClientAcademicCache();
      fetchCategoryData();
    } catch (err: any) {
      alert(err.message || 'Error saving subcategory.');
    } finally {
      setSavingBuilder(false);
    }
  };

  // Delete Subcategory
  const handleDeleteSubcategory = async () => {
    if (!subToDelete) return;
    setDeletingSub(true);
    try {
      const res = await fetch(`/api/subcategories?id=${subToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete subcategory.');

      setStatusMsg({
        type: 'success',
        text: `Subcategory "${subToDelete.name}" deleted successfully.`,
      });
      setSubToDelete(null);
      invalidateClientAcademicCache();
      fetchCategoryData();
    } catch (err: any) {
      alert(err.message || 'Error deleting subcategory.');
    } finally {
      setDeletingSub(false);
    }
  };

  const IconComponent = category ? getCategoryIcon(category.code, category.icon) : Layers;
  const theme = category ? getCategoryColor(category.code) : { bg: 'bg-madin-900', light: 'bg-slate-100 text-slate-900 border-slate-200', text: 'text-slate-800', border: 'hover:border-madin-800' };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-5 pb-16">
        {/* Navigation & Header Banner */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/categories')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition text-xs font-bold shadow-xs active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Categories</span>
          </button>

          {category && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
              <div
                className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-10 ${theme.bg}`}
              ></div>

              <div className="flex items-start space-x-4">
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0 ${theme.bg}`}
                >
                  <IconComponent className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {category.isSystem ? 'Core Assessment Wing' : 'Custom Category Wing'}
                    </span>
                    <span className="text-xs font-mono font-black text-madin-900 bg-gold-50 px-2 py-0.5 rounded-lg border border-gold-200">
                      {category.defaultWeight}% SPR Weight
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {category.name}
                  </h2>
                  <p className="text-xs text-slate-500 max-w-xl">
                    {category.description || 'Comprehensive evaluation subcategories and performance items.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenCreateSubcategory}
                  className="px-4 py-2.5 rounded-2xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
                >
                  <Plus className="w-4 h-4 text-gold-400" />
                  <span>+ Add Subcategory</span>
                </button>
              </div>
            </div>
          )}
        </div>

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

        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search subcategories in ${category?.name || 'category'}...`}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900 transition"
            />
          </div>

          <div className="text-xs font-bold text-slate-500">
            {filteredSubcategories.length} Subcategories
          </div>
        </div>

        {/* SUBCATEGORIES GRID: 2 IN ONE ROW ON MOBILE */}
        {loading ? (
          <div className="py-16 text-center">
            <VideoLoader size="md" text="Loading Subcategories..." subtext="Accessing Category Items" />
          </div>
        ) : filteredSubcategories.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Subcategories Yet</div>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Add specific subcategories (e.g., Thahadi-Al-Qira&apos;a, Speech, Projects, Quiz) under {category?.name || 'this category'}.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateSubcategory}
              className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-bold shadow transition active:scale-95 inline-flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>Create First Subcategory</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4.5">
            {filteredSubcategories.map((sub) => {
              const recordsCount = sub._count?.performanceRecords || 0;

              return (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/90 shadow-subtle hover:shadow-md transition-all flex flex-col justify-between space-y-3 group relative overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Top Row inside Box: Icon & Max Score Badge */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        {sub.logoUrl || '🏆'}
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] sm:text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Max: {sub.maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Subcategory Title */}
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight group-hover:text-indigo-900 transition-colors line-clamp-2">
                        {sub.name}
                      </h3>

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sub.hasLevels ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            {sub.levelGroup || 'Levels'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            Direct Marks
                          </span>
                        )}

                        {recordsCount > 0 && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            {recordsCount} scores
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons inside Box */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => handleOpenRecordScore(sub)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 shadow-xs transition active:scale-95"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>Record Score</span>
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="text-[10px] font-mono text-slate-400 truncate max-w-[80px]">
                        {sub.code}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSubcategory(sub)}
                          className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Edit Subcategory"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubToDelete(sub)}
                          className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete Subcategory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUICK RECORD SCORE MODAL */}
      {recordModalOpen && selectedSubcategoryForScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                  {category?.name}
                </span>
                <h3 className="text-base font-black text-slate-900">
                  Record Score: {selectedSubcategoryForScore.name}
                </h3>
              </div>
              <button
                onClick={() => setRecordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScore} className="space-y-3.5">
              {/* Select Student */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Student *</label>
                <SearchableStudentSelect
                  students={students}
                  value={recordForm.studentId}
                  onChange={(id) => setRecordForm({ ...recordForm, studentId: id })}
                  placeholder="Search student by name or SPR ID..."
                  required
                />
              </div>

              {/* Competition Level if applicable */}
              {selectedSubcategoryForScore.hasLevels && levels.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Competition Level</label>
                  <select
                    value={recordForm.levelId}
                    onChange={(e) => setRecordForm({ ...recordForm, levelId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name} ({lvl.weightMultiplier}x Multiplier)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Marks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks Obtained *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={selectedSubcategoryForScore.maxScore || 100}
                    required
                    value={recordForm.score}
                    onChange={(e) => setRecordForm({ ...recordForm, score: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks</label>
                  <input
                    type="number"
                    readOnly
                    value={recordForm.maxScore}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Position & Grade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Position / Rank</label>
                  <select
                    value={recordForm.position}
                    onChange={(e) => setRecordForm({ ...recordForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="1st">1st Place</option>
                    <option value="2nd">2nd Place</option>
                    <option value="3rd">3rd Place</option>
                    <option value="Participated">Participated</option>
                    <option value="Grade Only">Grade Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grade</label>
                  <select
                    value={recordForm.grade}
                    onChange={(e) => setRecordForm({ ...recordForm, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  >
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="B+">B+</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks / Note</label>
                <input
                  type="text"
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm({ ...recordForm, remarks: e.target.value })}
                  placeholder="Optional remarks or feedback..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRecordModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingScore}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingScore ? 'Saving...' : 'Save & Record Score'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT SUBCATEGORY MODAL */}
      {builderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">
                {editingSubId ? 'Edit Subcategory' : `Add Subcategory to ${category?.name || 'Category'}`}
              </h3>
              <button
                onClick={() => setBuilderModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subcategory Title *</label>
                <input
                  type="text"
                  required
                  value={builderForm.name}
                  onChange={(e) => setBuilderForm({ ...builderForm, name: e.target.value })}
                  placeholder="e.g. Arabic Elocution, Science Fair..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              {/* Preset Icon / Emoji */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subcategory Icon</label>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl p-2 bg-slate-100 rounded-xl border border-slate-200">
                    {builderForm.logoUrl || '🏆'}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_LOGOS.map((item) => (
                      <button
                        key={item.icon}
                        type="button"
                        onClick={() => setBuilderForm({ ...builderForm, logoUrl: item.icon })}
                        className={`p-1.5 rounded-lg border text-base hover:scale-110 transition ${
                          builderForm.logoUrl === item.icon
                            ? 'bg-indigo-100 border-indigo-400'
                            : 'bg-white border-slate-200'
                        }`}
                        title={item.label}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks *</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={builderForm.maxScore}
                    onChange={(e) => setBuilderForm({ ...builderForm, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Weight Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5.0"
                    value={builderForm.weight}
                    onChange={(e) => setBuilderForm({ ...builderForm, weight: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
                  />
                </div>
              </div>

              {/* Level Group */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Enable Multi-Level Multipliers</label>
                  <input
                    type="checkbox"
                    checked={builderForm.hasLevels}
                    onChange={(e) => setBuilderForm({ ...builderForm, hasLevels: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                {builderForm.hasLevels && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Level Grouping</label>
                    <select
                      value={builderForm.levelGroup}
                      onChange={(e) => setBuilderForm({ ...builderForm, levelGroup: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                    >
                      {LEVEL_PRESETS.map((lp) => (
                        <option key={lp.id} value={lp.id}>
                          {lp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBuilderModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBuilder}
                  className="px-5 py-2.5 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50 active:scale-95"
                >
                  {savingBuilder ? 'Saving...' : editingSubId ? 'Update Subcategory' : 'Create Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE SUBCATEGORY MODAL */}
      {subToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Subcategory</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete subcategory <strong className="text-rose-600 font-bold">&quot;{subToDelete.name}&quot;</strong>?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={deletingSub}
                onClick={() => setSubToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingSub}
                onClick={handleDeleteSubcategory}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50"
              >
                {deletingSub ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
