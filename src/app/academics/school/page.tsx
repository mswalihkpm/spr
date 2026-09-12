'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Building,
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  X,
  Plus,
  ArrowRight,
  Upload,
  Search,
  RefreshCw,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { getAcademicMasterData, invalidateClientAcademicCache } from '@/lib/academic-client';

interface DynamicSubject {
  id: string;
  name: string;
  maxScore: number;
}

export default function SchoolStudiesPage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'ENTRY' | 'EXAMS' | 'HISTORY'>('ENTRY');

  // Master Data
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [boards, setBoards] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [schoolCategory, setSchoolCategory] = useState<any | null>(null);

  // Manual Single-Entry States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [customSubjectName, setCustomSubjectName] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [customExamName, setCustomExamName] = useState<string>('');
  const [maxScore, setMaxScore] = useState<number>(100);

  const [students, setStudents] = useState<any[]>([]);
  const [scores, setScores] = useState<Record<string, { obtained: string; remarks: string }>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Score History & CRUD
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Bulk selection & deletion state
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);

  // Filter & Search states for History
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [historyExamFilter, setHistoryExamFilter] = useState<string>('ALL');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('ALL');
  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number | 'ALL'>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Exam Management Modals (Delete Exam / Clear Exam)
  const [examToDelete, setExamToDelete] = useState<any | null>(null);
  const [examToClear, setExamToClear] = useState<any | null>(null);
  const [examActionLoading, setExamActionLoading] = useState(false);
  const [examActionError, setExamActionError] = useState<string | null>(null);

  // Delete All Filtered Records Modal
  const [confirmDeleteFilteredOpen, setConfirmDeleteFilteredOpen] = useState(false);

  // Edit Single Score Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ obtainedScore: 0, maxScore: 100, remarks: '' });

  // --- MULTI-SUBJECT BULK UPLOAD MODAL STATES ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkExamName, setBulkExamName] = useState('Annual School Board Examination 2026');
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkSubjects, setBulkSubjects] = useState<DynamicSubject[]>([
    { id: '1', name: 'Mathematics', maxScore: 100 },
    { id: '2', name: 'Science & Physics', maxScore: 100 },
    { id: '3', name: 'Social Sciences', maxScore: 100 },
    { id: '4', name: 'English Language', maxScore: 100 },
    { id: '5', name: 'Malayalam / Mother Tongue', maxScore: 100 },
    { id: '6', name: 'Hindi Language', maxScore: 50 },
    { id: '7', name: 'Computer Science & AI', maxScore: 100 },
  ]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newSubjectMax, setNewSubjectMax] = useState(100);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Load master data with optional cache busting
  const loadMasterData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        invalidateClientAcademicCache();
      }
      const data = await getAcademicMasterData(forceRefresh);
      if (data.classes) {
        setClasses(data.classes);
        if (data.classes.length > 0) {
          if (!selectedClass) setSelectedClass(data.classes[0].id);
          if (!bulkClassId) setBulkClassId(data.classes[0].id);
        }
      }
      if (data.subjects) {
        const schoolSubs = data.subjects.filter((s: any) => s.category?.code === 'SCHOOL');
        setSubjects(schoolSubs);
        if (schoolSubs.length > 0 && !selectedSubject) setSelectedSubject(schoolSubs[0].id);
      }
      if (data.exams) {
        const schoolExams = data.exams.filter((e: any) => e.category?.code === 'SCHOOL');
        setExams(schoolExams);
        if (schoolExams.length > 0 && !selectedExam) setSelectedExam(schoolExams[0].id);
      }
      if (data.boards) setBoards(data.boards);
      if (data.categories) {
        setCategories(data.categories);
        const sc = data.categories.find((c: any) => c.code === 'SCHOOL');
        setSchoolCategory(sc || null);
      }
    } catch (err) {
      console.error('Failed to load master data:', err);
    }
  };

  const fetchScoreHistory = async (categoryIdParam?: string) => {
    try {
      setLoadingHistory(true);
      const catId = categoryIdParam || schoolCategory?.id;

      let effectiveCatId = catId;
      if (!effectiveCatId) {
        const dataMaster = await getAcademicMasterData();
        const sc = dataMaster.categories?.find((c: any) => c.code === 'SCHOOL');
        effectiveCatId = sc?.id;
      }

      if (effectiveCatId) {
        const res = await fetch(`/api/scores?categoryId=${effectiveCatId}&limit=5000`);
        const data = await res.json();
        if (data.records) setHistoryRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch score history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAllData = async (forceRefresh = true) => {
    setRefreshing(true);
    try {
      await loadMasterData(forceRefresh);
      await fetchScoreHistory();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMasterData().then(() => {
      fetchScoreHistory();
    });
  }, []);

  // Fetch students for selected class
  useEffect(() => {
    if (!selectedClass) return;

    setLoadingStudents(true);
    fetch(`/api/students?classId=${selectedClass}&all=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.students) {
          setStudents(data.students);
          const initialScores: Record<string, { obtained: string; remarks: string }> = {};
          data.students.forEach((st: any) => {
            initialScores[st.id] = { obtained: '', remarks: '' };
          });
          setScores(initialScores);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass]);

  // Reset selected records when filters or search change to avoid deleting unseen records
  useEffect(() => {
    setCurrentPage(1);
  }, [historyExamFilter, historyClassFilter, historySubjectFilter, searchQuery]);

  // Compute Filtered History Records
  const filteredHistoryRecords = useMemo(() => {
    return historyRecords.filter((r) => {
      if (historyExamFilter !== 'ALL' && r.examId !== historyExamFilter) return false;
      if (historyClassFilter !== 'ALL' && r.student?.classId !== historyClassFilter) return false;
      if (historySubjectFilter !== 'ALL' && r.subjectId !== historySubjectFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = r.student?.fullName?.toLowerCase() || '';
        const studentId = r.student?.studentId?.toLowerCase() || '';
        const subjectName = r.subject?.name?.toLowerCase() || '';
        const examName = r.exam?.name?.toLowerCase() || '';
        if (!studentName.includes(q) && !studentId.includes(q) && !subjectName.includes(q) && !examName.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [historyRecords, historyExamFilter, historyClassFilter, historySubjectFilter, searchQuery]);

  // Paginated records for table view
  const paginatedRecords = useMemo(() => {
    if (pageSize === 'ALL') return filteredHistoryRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredHistoryRecords.slice(start, start + pageSize);
  }, [filteredHistoryRecords, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredHistoryRecords.length / pageSize) || 1;

  // Selection handlers
  const handleToggleSelectAll = () => {
    const visibleIds = paginatedRecords.map((r) => r.id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedRecordIds.includes(id));

    if (allVisibleSelected) {
      setSelectedRecordIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredHistoryRecords.map((r) => r.id);
    setSelectedRecordIds(allFilteredIds);
  };

  const handleClearSelection = () => {
    setSelectedRecordIds([]);
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Delete Selected Records (Checkbox selection)
  const handleBulkDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    setBulkDeleting(true);
    setModalDeleteError(null);
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRecordIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete scores.');

      const count = data.count || data.deletedCount || selectedRecordIds.length;
      setSelectedRecordIds([]);
      setConfirmBulkDeleteOpen(false);
      setModalDeleteError(null);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} exam score record(s).` });
      await refreshAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Error bulk deleting records.';
      setModalDeleteError(msg);
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Bulk Delete All Filtered Records
  const handleDeleteAllFiltered = async () => {
    if (filteredHistoryRecords.length === 0) return;
    setBulkDeleting(true);
    setModalDeleteError(null);
    try {
      const idsToDelete = filteredHistoryRecords.map((r) => r.id);
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete filtered scores.');

      const count = data.count || data.deletedCount || idsToDelete.length;
      setSelectedRecordIds([]);
      setConfirmDeleteFilteredOpen(false);
      setModalDeleteError(null);
      setStatusMsg({ type: 'success', text: `Successfully wiped ${count} filtered score record(s).` });
      await refreshAllData(true);
    } catch (err: any) {
      const msg = err.message || 'Error deleting filtered records.';
      setModalDeleteError(msg);
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Delete Exam Session & All its Records
  const handleExecuteDeleteExam = async () => {
    if (!examToDelete) return;
    setExamActionLoading(true);
    setExamActionError(null);
    try {
      const res = await fetch(`/api/exams?id=${examToDelete.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete exam session.');

      setStatusMsg({
        type: 'success',
        text: `Successfully deleted exam "${examToDelete.name}" and all associated score records.`,
      });
      setExamToDelete(null);
      await refreshAllData(true);
    } catch (err: any) {
      setExamActionError(err.message || 'Error deleting exam.');
    } finally {
      setExamActionLoading(false);
    }
  };

  // Clear All Scores for an Exam (keeping exam definition)
  const handleExecuteClearExamScores = async () => {
    if (!examToClear) return;
    setExamActionLoading(true);
    setExamActionError(null);
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId: examToClear.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to clear exam scores.');

      setStatusMsg({
        type: 'success',
        text: `Cleared ${data.count || 'all'} scores for exam "${examToClear.name}".`,
      });
      setExamToClear(null);
      await refreshAllData(true);
    } catch (err: any) {
      setExamActionError(err.message || 'Error clearing exam scores.');
    } finally {
      setExamActionLoading(false);
    }
  };

  // Add Dynamic Subject on-the-fly to Bulk List
  const handleAddBulkSubject = () => {
    if (!newSubjectInput.trim()) return;
    const newSub: DynamicSubject = {
      id: Date.now().toString(),
      name: newSubjectInput.trim(),
      maxScore: Number(newSubjectMax) || 100,
    };
    setBulkSubjects((prev) => [...prev, newSub]);
    setNewSubjectInput('');
    setNewSubjectMax(100);
  };

  const handleRemoveBulkSubject = (id: string) => {
    setBulkSubjects((prev) => prev.filter((s) => s.id !== id));
  };

  // Generate and Download Multi-Subject Excel Template
  const handleGenerateAndDownloadTemplate = async () => {
    if (bulkSubjects.length === 0) {
      alert('Please add at least one subject before generating the bulk template.');
      return;
    }

    let batchStudents = students;
    if (bulkClassId && bulkClassId !== selectedClass) {
      const res = await fetch(`/api/students?classId=${bulkClassId}&all=true`);
      const data = await res.json();
      if (data.students) batchStudents = data.students;
    }

    if (batchStudents.length === 0) {
      alert('No students found in the selected batch. Please select a valid class.');
      return;
    }

    const templateRows = batchStudents.map((st) => {
      const row: any = {
        'Student ID': st.studentId,
        'Full Name': st.fullName,
        'Class': st.class?.name || '',
      };
      bulkSubjects.forEach((sub) => {
        const colHeader = `${sub.name} (Max: ${sub.maxScore})`;
        row[colHeader] = '';
      });
      row['Remarks'] = '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'School_Exam_Scores');

    const colWidths = [{ wch: 16 }, { wch: 28 }, { wch: 14 }];
    bulkSubjects.forEach(() => colWidths.push({ wch: 28 }));
    colWidths.push({ wch: 20 });
    ws['!cols'] = colWidths;

    const classNameClean = classes.find((c) => c.id === bulkClassId)?.name?.replace(/\s+/g, '_') || 'Batch';
    const filename = `SPR_School_Bulk_Template_${classNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Parse and Upload Excel with Multiple Subject Columns
  const handleProcessBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) {
      alert('Please choose a completed Excel file to upload.');
      return;
    }

    try {
      setBulkUploading(true);
      const dataBuffer = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const parsedJson: any[] = XLSX.utils.sheet_to_json(sheet);

      if (parsedJson.length === 0) {
        throw new Error('The uploaded Excel file contains no data rows.');
      }

      const schoolCat = schoolCategory || categories.find((c) => c.code === 'SCHOOL');
      if (!schoolCat) throw new Error('School Education category missing.');

      const firstRow = parsedJson[0];
      const keys = Object.keys(firstRow);
      const subjectCols = keys.filter((k) => {
        const lower = k.toLowerCase().trim();
        return !['student id', 'studentid', 'full name', 'fullname', 'name', 'student name', 'class', 'remarks'].includes(lower);
      });

      if (subjectCols.length === 0) {
        throw new Error('No subject score columns detected in the Excel header.');
      }

      const uploadRecords = parsedJson.map((row) => {
        const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
        const subjectScores = subjectCols.map((colName) => {
          const maxMatch = colName.match(/\(max:\s*(\d+)\)/i);
          const maxScoreVal = maxMatch ? parseInt(maxMatch[1], 10) : 100;
          const cleanSubjectName = colName.replace(/\(max:\s*\d+\)/i, '').trim();

          return {
            subjectName: cleanSubjectName,
            obtainedScore: row[colName] !== undefined && row[colName] !== '' ? Number(row[colName]) : undefined,
            maxScore: maxScoreVal,
            remarks: row['Remarks'] || '',
          };
        }).filter((sub) => sub.obtainedScore !== undefined && !isNaN(sub.obtainedScore));

        return {
          studentId,
          subjectScores,
          remarks: row['Remarks'] || '',
        };
      }).filter((r) => r.subjectScores.length > 0);

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: schoolCat.id,
          examName: bulkExamName,
          records: uploadRecords,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk score processing failed.');

      setStatusMsg({
        type: 'success',
        text: `Bulk upload successful: ${json.successCount} school subject scores recorded seamlessly!`,
      });
      setBulkModalOpen(false);
      setBulkFile(null);
      await refreshAllData(true);
    } catch (err: any) {
      alert(err.message || 'Error processing bulk upload file.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Manual Score Recording
  const handleSaveManualScores = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const schoolCat = schoolCategory || categories.find((c) => c.code === 'SCHOOL');
      const activeSubjectName = customSubjectName.trim() || subjects.find((s) => s.id === selectedSubject)?.name || 'General Subject';
      const activeExamName = customExamName.trim() || exams.find((e) => e.id === selectedExam)?.name || 'Term Exam';

      const validEntries = Object.entries(scores)
        .filter(([_, data]) => data.obtained !== '')
        .map(([studentId, data]) => ({
          studentId,
          obtainedScore: Number(data.obtained),
          maxScore: Number(maxScore),
          remarks: data.remarks || '',
        }));

      if (validEntries.length === 0) {
        throw new Error('Please enter a score for at least one student.');
      }

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: schoolCat?.id,
          subjectName: activeSubjectName,
          examName: activeExamName,
          records: validEntries.map((v) => ({
            studentId: v.studentId,
            score: v.obtainedScore,
            maxScore: v.maxScore,
            remarks: v.remarks,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save scores.');

      setStatusMsg({
        type: 'success',
        text: `Scores saved successfully for ${json.successCount} students in ${activeSubjectName}!`,
      });
      await refreshAllData(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec);
    setEditFormData({
      obtainedScore: rec.obtainedScore,
      maxScore: rec.maxScore,
      remarks: rec.remarks || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRecord.id,
          ...editFormData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: 'Score record updated successfully.' });
      setEditModalOpen(false);
      await refreshAllData(true);
    } catch (err: any) {
      alert(err.message || 'Error updating score');
    }
  };

  const handleDeleteRecord = async (rec: any) => {
    if (!confirm(`Delete score record for ${rec.student?.fullName}?`)) return;
    try {
      const res = await fetch(`/api/scores?id=${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: 'Score record deleted.' });
      await refreshAllData(true);
    } catch (err: any) {
      alert(err.message || 'Error deleting score');
    }
  };

  // Quick action: switch to history tab and filter by specific exam
  const handleInspectExamInHistory = (examId: string) => {
    setHistoryExamFilter(examId);
    setHistoryClassFilter('ALL');
    setHistorySubjectFilter('ALL');
    setSearchQuery('');
    setActiveTab('HISTORY');
  };

  // Exam stats calculations
  const schoolExamsWithStats = useMemo(() => {
    return exams.map((ex) => {
      const examScores = historyRecords.filter((r) => r.examId === ex.id);
      const uniqueStudentIds = new Set(examScores.map((r) => r.studentId));
      const uniqueSubjectIds = new Set(examScores.map((r) => r.subjectId));
      return {
        ...ex,
        scoreCount: examScores.length || ex._count?.performanceRecords || 0,
        studentCount: uniqueStudentIds.size,
        subjectCount: uniqueSubjectIds.size,
      };
    });
  }, [exams, historyRecords]);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 shadow-subtle">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/school-studies-logo.png"
                alt="School Studies SCERT"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/60 flex items-center space-x-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Kerala State / NCERT Academic Curriculum</span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium">|</span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  {historyRecords.length} Total Score Records
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
                <span>School Studies Examination & Scoring Hub</span>
              </h2>
              <p className="text-xs text-slate-500 max-w-2xl">
                Manage ontime dynamic subject additions, Excel bulk score uploads, exam session management, and 130-scale converted scores.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => refreshAllData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition active:scale-95 disabled:opacity-50"
              title="Refresh All Academic Data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-2 shadow-sm transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Multi-Subject Bulk Upload</span>
            </button>
          </div>
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

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 w-full sm:w-max">
          <button
            type="button"
            onClick={() => setActiveTab('ENTRY')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'ENTRY'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>Score Entry & Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXAMS')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 relative ${
              activeTab === 'EXAMS'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Exam Sessions & Batch Delete</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-indigo-100 text-indigo-800">
              {exams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 relative ${
              activeTab === 'HISTORY'
                ? 'bg-white text-indigo-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Score History & Selective Delete</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black bg-indigo-100 text-indigo-800">
              {historyRecords.length}
            </span>
          </button>
        </div>

        {/* TAB 1: SCORE ENTRY & SINGLE ENTRY */}
        {activeTab === 'ENTRY' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Manual School Score Entry (With Ontime Subject Typing)
                </h3>
                <p className="text-xs text-slate-500">
                  Select a class cohort, choose or type an ontime subject & assessment, and record student marks directly.
                </p>
              </div>

              <div className="text-xs text-slate-500 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                Cohort: <span className="text-indigo-700 font-bold">{students.length} Students</span>
              </div>
            </div>

            <form onSubmit={handleSaveManualScores} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Class Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Class / Standard</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.school?.name || 'School'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ontime Subject Typing / Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Subject (Select or Type Ontime)
                  </label>
                  <input
                    type="text"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="Type subject ontime (e.g. Science)..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 mb-1 transition"
                  />
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      const sub = subjects.find((s) => s.id === e.target.value);
                      if (sub) {
                        setCustomSubjectName(sub.name);
                        setMaxScore(sub.maxScore || 100);
                      }
                    }}
                    className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 outline-none"
                  >
                    <option value="">Or pick existing subject...</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Max: {s.maxScore})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ontime Exam Typing / Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Exam / Assessment (Select or Type)
                  </label>
                  <input
                    type="text"
                    value={customExamName}
                    onChange={(e) => setCustomExamName(e.target.value)}
                    placeholder="Type exam ontime (e.g. Mid Term)..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 mb-1 transition"
                  />
                  <select
                    value={selectedExam}
                    onChange={(e) => {
                      setSelectedExam(e.target.value);
                      const ex = exams.find((x) => x.id === e.target.value);
                      if (ex) setCustomExamName(ex.name);
                    }}
                    className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[11px] text-slate-600 outline-none"
                  >
                    <option value="">Or pick existing assessment...</option>
                    {exams.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Max Score */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks (Cut off Marks)</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>

              {/* Students Score Grid */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">
                    Students in Selected Class ({students.length})
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Enter scores below. Blank rows will be skipped.
                  </span>
                </div>

                <div className="overflow-x-auto max-h-96 border border-slate-200 rounded-2xl shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-4">Student Name</th>
                        <th className="py-2.5 px-4 w-36 text-center">Marks (Out of {maxScore})</th>
                        <th className="py-2.5 px-4 w-28 text-center">% Rate</th>
                        <th className="py-2.5 px-4">Remarks / Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingStudents ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center">
                            <VideoLoader size="md" text="Loading student cohort..." subtext="Accessing academic registry" />
                          </td>
                        </tr>
                      ) : students.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-500">
                            No students enrolled in this class.
                          </td>
                        </tr>
                      ) : (
                        students.map((st) => {
                          const obtained = scores[st.id]?.obtained ?? '';
                          const numeric = parseFloat(obtained);
                          const pct = !isNaN(numeric) && maxScore > 0 ? ((numeric / maxScore) * 100).toFixed(1) : '-';

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="py-2 px-4">
                                <div className="font-bold text-slate-900">{st.fullName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">Roll: {st.studentId}</div>
                              </td>
                              <td className="py-2 px-4 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={maxScore}
                                  step="0.5"
                                  value={obtained}
                                  onChange={(e) =>
                                    setScores((prev) => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], obtained: e.target.value },
                                    }))
                                  }
                                  placeholder="Marks"
                                  className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600 transition"
                                />
                              </td>
                              <td className="py-2 px-4 text-center font-mono font-black text-indigo-700">
                                {pct !== '-' ? `${pct}%` : '-'}
                              </td>
                              <td className="py-2 px-4">
                                <input
                                  type="text"
                                  value={scores[st.id]?.remarks || ''}
                                  onChange={(e) =>
                                    setScores((prev) => ({
                                      ...prev,
                                      [st.id]: { ...prev[st.id], remarks: e.target.value },
                                    }))
                                  }
                                  placeholder="Optional remarks..."
                                  className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                                />
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    💡 Tip: For multiple subjects across an entire standard, use the <strong className="text-emerald-700">Multi-Subject Bulk Upload</strong> button.
                  </div>
                  <button
                    type="submit"
                    disabled={saving || students.length === 0}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition disabled:opacity-50 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving Scores...' : 'Save School Exam Scores'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: EXAM SESSIONS & BATCH MANAGEMENT */}
        {activeTab === 'EXAMS' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-indigo-700" />
                    <span>Imported School Exam Sessions ({schoolExamsWithStats.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Manage imported exam batches. You can delete entire exams, wipe all results for a session, or jump straight into score review.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setBulkModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Import New Exam Batch</span>
                </button>
              </div>

              {schoolExamsWithStats.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <GraduationCap className="w-10 h-10 text-slate-400 mx-auto" />
                  <div className="text-sm font-bold text-slate-700">No School Exam Sessions Found</div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Use the Multi-Subject Bulk Upload button to import your school board examination spreadsheet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schoolExamsWithStats.map((ex) => (
                    <div
                      key={ex.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            {ex.term?.name || 'Term 1'}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            {ex.academicYear?.name || '2025-2026'}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-900 leading-snug">
                          {ex.name}
                        </h4>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Scores</span>
                            <span className="text-base font-black text-indigo-700">{ex.scoreCount}</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">Students</span>
                            <span className="text-base font-black text-slate-800">{ex.studentCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => handleInspectExamInHistory(ex.id)}
                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                        >
                          <Search className="w-3.5 h-3.5 text-indigo-600" />
                          <span>View & Filter Scores ({ex.scoreCount})</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            disabled={ex.scoreCount === 0}
                            onClick={() => setExamToClear(ex)}
                            className="py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition disabled:opacity-40"
                            title="Clear all scores but keep exam container"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Clear Scores</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setExamToDelete(ex)}
                            className="py-1.5 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200/60 rounded-xl text-[11px] font-bold flex items-center justify-center space-x-1 transition"
                            title="Delete exam and all its scores"
                          >
                            <Trash2 className="w-3 h-3 text-rose-600" />
                            <span>Delete Exam</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SCORE HISTORY & SELECTIVE BULK DELETE */}
        {activeTab === 'HISTORY' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-subtle p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-indigo-700" />
                  <span>School Exam Score Records & Bulk Actions</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Showing <strong className="text-slate-900">{filteredHistoryRecords.length}</strong> matching records of <strong className="text-slate-900">{historyRecords.length}</strong> total
                </p>
              </div>

              {/* Quick Actions for Filtered Results */}
              <div className="flex items-center gap-2 flex-wrap">
                {filteredHistoryRecords.length > 0 && (historyExamFilter !== 'ALL' || historyClassFilter !== 'ALL' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteFilteredOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Filtered ({filteredHistoryRecords.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search student or subject..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Class Filter */}
              <div>
                <select
                  value={historyClassFilter}
                  onChange={(e) => setHistoryClassFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="ALL">All Classes / Standards</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Exam Filter */}
              <div>
                <select
                  value={historyExamFilter}
                  onChange={(e) => setHistoryExamFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 truncate"
                >
                  <option value="ALL">All Exam Sessions</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <select
                  value={historySubjectFilter}
                  onChange={(e) => setHistorySubjectFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600 truncate"
                >
                  <option value="ALL">All Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bulk Action Toolbar */}
            {selectedRecordIds.length > 0 && (
              <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-fade-in">
                <div className="flex items-center space-x-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
                  <div>
                    <span className="text-xs font-black text-rose-950">
                      {selectedRecordIds.length} score record(s) selected
                    </span>
                    <span className="text-[11px] text-rose-700 ml-2">
                      (out of {filteredHistoryRecords.length} filtered)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {selectedRecordIds.length < filteredHistoryRecords.length && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-xl transition"
                    >
                      Select All {filteredHistoryRecords.length} Filtered
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
                  >
                    Deselect All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedRecordIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Score History Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedRecords.length > 0 &&
                          paginatedRecords.every((r) => selectedRecordIds.includes(r.id))
                        }
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        title="Select All Visible"
                      />
                    </th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Assessment / Exam</th>
                    <th className="py-3 px-4 text-center">Marks</th>
                    <th className="py-3 px-4 text-right">Percentage</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center">
                        <VideoLoader size="md" text="Loading score logs..." subtext="Accessing academic historical scores" />
                      </td>
                    </tr>
                  ) : paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500">
                        No score records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r: any) => {
                      const isSelected = selectedRecordIds.includes(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-rose-50/60' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRecord(r.id)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900">{r.student?.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Roll: {r.student?.studentId} • {r.student?.class?.name}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">
                            {r.subject?.name || 'School Subject'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-700">
                              {r.exam?.name || 'Assessment'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-700">
                            {r.obtainedScore} / {r.maxScore}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-black text-right text-indigo-700">
                            {r.percentage.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenEdit(r)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Edit Score"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRecord(r)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Delete Score"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                    setPageSize(val as any);
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={250}>250</option>
                  <option value="ALL">All ({filteredHistoryRecords.length})</option>
                </select>
                <span>records per page</span>
              </div>

              {pageSize !== 'ALL' && totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 transition flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="text-xs font-bold text-slate-700 px-2">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 disabled:opacity-40 transition flex items-center space-x-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MULTI-SUBJECT DYNAMIC BULK UPLOAD MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative my-8 max-h-[90vh] overflow-y-auto animate-zoom-up space-y-5">
            <button
              onClick={() => setBulkModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-900 border border-indigo-300">
                School Multi-Subject Bulk Upload
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                School Curriculum Multi-Subject Bulk Score Entry
              </h3>
              <p className="text-xs text-slate-500">
                Type exam details and add multiple school subjects on-the-fly to generate a tailored bulk Excel template.
              </p>
            </div>

            {/* Step 1: Exam & Class Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Exam & Batch Configuration
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Exam / Assessment Name
                  </label>
                  <input
                    type="text"
                    value={bulkExamName}
                    onChange={(e) => setBulkExamName(e.target.value)}
                    placeholder="e.g. Annual School Board Exam 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Class / Batch</label>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Dynamic Multi-Subject List (Ontime Typing) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Dynamic Subjects for Template ({bulkSubjects.length})
                </span>
                <span className="text-[11px] text-slate-400">Add or edit subjects to include in the Excel file</span>
              </div>

              {/* Subject Chips */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {bulkSubjects.map((sub, idx) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{sub.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                        Max: {sub.maxScore} marks
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulkSubject(sub.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ontime Add Subject Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={newSubjectInput}
                  onChange={(e) => setNewSubjectInput(e.target.value)}
                  placeholder="Type new subject on-the-fly (e.g. Computer Science)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newSubjectMax}
                  onChange={(e) => setNewSubjectMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <button
                  type="button"
                  onClick={handleAddBulkSubject}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Step 3: Template Download Button */}
            <div className="flex items-center justify-between p-3.5 bg-indigo-50 rounded-2xl border border-indigo-200">
              <div>
                <div className="text-xs font-bold text-indigo-950">
                  Ready to generate multi-subject Excel spreadsheet?
                </div>
                <div className="text-[10px] text-indigo-800">
                  Template includes columns for all {bulkSubjects.length} subjects for this class.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateAndDownloadTemplate}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template (.xlsx)</span>
              </button>
            </div>

            {/* Step 4: Upload Completed Excel */}
            <form onSubmit={handleProcessBulkUpload} className="space-y-4 pt-2 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Upload Completed Spreadsheet
              </div>

              <div className="p-4 border-2 border-dashed border-slate-300 rounded-2xl text-center bg-slate-50/50 hover:bg-slate-50 transition cursor-pointer">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
                {bulkFile && (
                  <div className="mt-2 text-xs font-bold text-indigo-700">
                    Selected: {bulkFile.name} ({(bulkFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bulkFile || bulkUploading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition disabled:opacity-50 active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkUploading ? 'Uploading & Recording Scores...' : 'Upload & Record All Scores'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Single Score Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-zoom-up">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Edit Score Record</h3>
              <button onClick={() => setEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600">
              Student: <span className="font-bold text-slate-900">{editingRecord?.student?.fullName}</span>
              <br />
              Subject: <span className="font-bold text-slate-900">{editingRecord?.subject?.name}</span>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Obtained Score</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editFormData.obtainedScore}
                  onChange={(e) => setEditFormData({ ...editFormData, obtainedScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                <input
                  type="number"
                  required
                  value={editFormData.maxScore}
                  onChange={(e) => setEditFormData({ ...editFormData, maxScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition"
                >
                  Update Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Records Confirmation Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Bulk Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            {modalDeleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalDeleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600 font-bold">{selectedRecordIds.length}</strong> selected school examination score record(s)? Student academic aggregates and 360° dossiers will update automatically.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => {
                  setConfirmBulkDeleteOpen(false);
                  setModalDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {bulkDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedRecordIds.length} Score(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Filtered Records Confirmation Modal */}
      {confirmDeleteFilteredOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete All Filtered Records</h3>
                <p className="text-xs text-slate-500">Bulk delete matching filter criteria</p>
              </div>
            </div>

            {modalDeleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalDeleteError}</span>
              </div>
            )}

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 mb-5">
              <div className="font-bold text-slate-800">Target Records Summary:</div>
              <div className="text-slate-600">
                • Total Matching Scores: <strong className="text-rose-600 font-bold">{filteredHistoryRecords.length}</strong>
              </div>
              {historyExamFilter !== 'ALL' && (
                <div className="text-slate-600">
                  • Exam Session: <strong className="text-slate-800">{exams.find((e) => e.id === historyExamFilter)?.name}</strong>
                </div>
              )}
              {historyClassFilter !== 'ALL' && (
                <div className="text-slate-600">
                  • Class / Standard: <strong className="text-slate-800">{classes.find((c) => c.id === historyClassFilter)?.name}</strong>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              This will permanently delete all <strong className="text-rose-600">{filteredHistoryRecords.length}</strong> matching score records from the SPR registry.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => {
                  setConfirmDeleteFilteredOpen(false);
                  setModalDeleteError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleDeleteAllFiltered}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {bulkDeleting ? (
                  <span>Wiping Scores...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe All {filteredHistoryRecords.length} Records</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exam Session Confirmation Modal */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-2xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Entire Exam Session</h3>
                <p className="text-xs text-slate-500">Deletes the exam definition and all associated student scores</p>
              </div>
            </div>

            {examActionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{examActionError}</span>
              </div>
            )}

            <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 text-xs space-y-1.5 mb-5">
              <div className="font-bold text-rose-950">Exam: {examToDelete.name}</div>
              <div className="text-rose-800">
                • Term: <strong>{examToDelete.term?.name || 'Term 1'}</strong>
              </div>
              <div className="text-rose-800">
                • Total Scores Attached: <strong>{examToDelete.scoreCount || 0} scores</strong>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete this exam? All student performance scores associated with this exam will be wiped immediately.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={examActionLoading}
                onClick={() => {
                  setExamToDelete(null);
                  setExamActionError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={examActionLoading}
                onClick={handleExecuteDeleteExam}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {examActionLoading ? (
                  <span>Deleting Exam...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete Exam & Scores</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Exam Scores Confirmation Modal */}
      {examToClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-zoom-up">
            <div className="flex items-center space-x-3 text-amber-600 mb-4">
              <div className="p-3 bg-amber-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Clear All Exam Scores</h3>
                <p className="text-xs text-slate-500">Wipe results while keeping the exam setup</p>
              </div>
            </div>

            {examActionError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{examActionError}</span>
              </div>
            )}

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs space-y-1.5 mb-5">
              <div className="font-bold text-amber-950">Exam: {examToClear.name}</div>
              <div className="text-amber-800">
                • Total Scores to Clear: <strong>{examToClear.scoreCount || 0} scores</strong>
              </div>
              <div className="text-[11px] text-amber-700">
                Note: The exam will remain available for future scoring or re-importing.
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to clear all recorded marks for this exam?
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={examActionLoading}
                onClick={() => {
                  setExamToClear(null);
                  setExamActionError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={examActionLoading}
                onClick={handleExecuteClearExamScores}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-2"
              >
                {examActionLoading ? (
                  <span>Clearing Scores...</span>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Confirm Clear All Scores</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
