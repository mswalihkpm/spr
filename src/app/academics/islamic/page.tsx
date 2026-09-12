'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Building,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  X,
  Plus,
  ArrowRight,
  Upload,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { getAcademicMasterData, invalidateClientAcademicCache } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';


interface DynamicSubject {
  id: string;
  name: string;
  maxScore: number;
}

export default function IslamicStudiesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

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

  // Bulk selection & deletion state
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);

  // History Filter states
  const [historyExamFilter, setHistoryExamFilter] = useState<string>('ALL');
  const [historyClassFilter, setHistoryClassFilter] = useState<string>('ALL');

  const filteredHistoryRecords = historyRecords.filter((r) => {
    if (historyExamFilter !== 'ALL' && r.examId !== historyExamFilter) return false;
    if (historyClassFilter !== 'ALL' && r.student?.classId !== historyClassFilter) return false;
    return true;
  });

  const handleToggleSelectAll = () => {
    const allSelected = filteredHistoryRecords.length > 0 && filteredHistoryRecords.every((r) => selectedRecordIds.includes(r.id));
    if (allSelected) {
      const recordIdSet = new Set(filteredHistoryRecords.map((r) => r.id));
      setSelectedRecordIds((prev) => prev.filter((id) => !recordIdSet.has(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...filteredHistoryRecords.map((r) => r.id)])));
    }
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} Islamic exam score record(s).` });
      invalidateClientAcademicCache();
      fetchScoreHistory();
    } catch (err: any) {
      const msg = err.message || 'Error bulk deleting records.';
      setModalDeleteError(msg);
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ obtainedScore: 0, maxScore: 100, remarks: '' });

  // Subcategory Stream Filter
  const [selectedStream, setSelectedStream] = useState<'ALL' | 'JAMIATHUL_HIND' | 'MADIN_ACADEMY'>('ALL');

  // --- MULTI-SUBJECT BULK UPLOAD MODAL STATES ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkExamName, setBulkExamName] = useState('Annual Islamic Assessment 2026');
  const [bulkStream, setBulkStream] = useState<'JAMIATHUL_HIND' | 'MADIN_ACADEMY' | 'ALL'>('JAMIATHUL_HIND');
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkSubjects, setBulkSubjects] = useState<DynamicSubject[]>([
    { id: '1', name: 'Quran Recitation & Tajweed', maxScore: 100 },
    { id: '2', name: 'Hadith Memorization', maxScore: 100 },
    { id: '3', name: 'Fiqh Jurisprudence', maxScore: 50 },
    { id: '4', name: 'Nahw & Sarf Arabic Grammar', maxScore: 50 },
    { id: '5', name: 'Tareekh & Moral Education', maxScore: 50 },
  ]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  const [newSubjectMax, setNewSubjectMax] = useState(100);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkPreviewRows, setBulkPreviewRows] = useState<any[]>([]);

  // Load master data & recorded scores history with instant client cache
  const loadMasterData = async () => {
    try {
      const data = await getAcademicMasterData();
      if (data.classes) {
        setClasses(data.classes);
        if (data.classes.length > 0) {
          if (!selectedClass) setSelectedClass(data.classes[0].id);
          if (!bulkClassId) setBulkClassId(data.classes[0].id);
        }
      }
      if (data.subjects) {
        const islamicSubs = data.subjects.filter((s: any) => s.category?.code === 'ISLAMIC');
        setSubjects(islamicSubs);
        if (islamicSubs.length > 0 && !selectedSubject) setSelectedSubject(islamicSubs[0].id);
      }
      if (data.exams) {
        const islamicExams = data.exams.filter((e: any) => e.category?.code === 'ISLAMIC');
        setExams(islamicExams);
        if (islamicExams.length > 0 && !selectedExam) setSelectedExam(islamicExams[0].id);
      }
      if (data.terms) setTerms(data.terms);
      if (data.institutions) setInstitutions(data.institutions);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchScoreHistory = async () => {
    try {
      setLoadingHistory(true);
      const resMaster = await fetch('/api/academic');
      const dataMaster = await resMaster.json();
      const islamicCat = dataMaster.categories?.find((c: any) => c.code === 'ISLAMIC');

      if (islamicCat) {
        const res = await fetch(`/api/scores?categoryId=${islamicCat.id}&limit=1000`);
        const data = await res.json();
        if (data.records) setHistoryRecords(data.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadMasterData();
    fetchScoreHistory();
  }, []);

  // Filter subjects based on selected Islamic stream
  const filteredSubjects = subjects.filter((s) => {
    if (selectedStream === 'ALL') return true;
    const instCode = s.institution?.code?.toUpperCase() || '';
    const instName = s.institution?.name?.toUpperCase() || '';
    const sName = s.name?.toUpperCase() || '';
    if (selectedStream === 'JAMIATHUL_HIND') {
      return instCode.includes('JAMIATHUL') || instName.includes('JAMIATHUL') || sName.includes('QURAN') || sName.includes('HADITH') || sName.includes('FIQH');
    }
    if (selectedStream === 'MADIN_ACADEMY') {
      return instCode.includes('MADIN') || instName.includes('MADIN') || sName.includes('NAHW') || sName.includes('SARF') || sName.includes('TAREEKH');
    }
    return true;
  });

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

  // Handle stream presets in Bulk Modal
  const handleBulkStreamChange = (st: 'JAMIATHUL_HIND' | 'MADIN_ACADEMY' | 'ALL') => {
    setBulkStream(st);
    if (st === 'JAMIATHUL_HIND') {
      setBulkSubjects([
        { id: '1', name: 'Quran Recitation & Tajweed', maxScore: 100 },
        { id: '2', name: 'Hadith Memorization', maxScore: 100 },
        { id: '3', name: 'Fiqh Jurisprudence', maxScore: 50 },
      ]);
    } else if (st === 'MADIN_ACADEMY') {
      setBulkSubjects([
        { id: '1', name: 'Nahw & Sarf Arabic Grammar', maxScore: 50 },
        { id: '2', name: 'Tareekh & Moral Education', maxScore: 50 },
        { id: '3', name: 'Quranic Studies & Tafseer', maxScore: 100 },
      ]);
    } else {
      setBulkSubjects([
        { id: '1', name: 'Quran Recitation', maxScore: 100 },
        { id: '2', name: 'Hadith Memorization', maxScore: 100 },
        { id: '3', name: 'Fiqh Jurisprudence', maxScore: 50 },
        { id: '4', name: 'Arabic Grammar', maxScore: 50 },
        { id: '5', name: 'Tareekh / Islamic History', maxScore: 50 },
      ]);
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

    // Fetch students of the selected batch
    let batchStudents = students;
    if (bulkClassId && bulkClassId !== selectedClass) {
      const res = await fetch(`/api/students?classId=${bulkClassId}&limit=100`);
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
      // Add a column for each dynamically added subject
      bulkSubjects.forEach((sub) => {
        const colHeader = `${sub.name} (Max: ${sub.maxScore})`;
        row[colHeader] = '';
      });
      row['Remarks'] = '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Islamic_Exam_Scores');

    // Column widths
    const colWidths = [{ wch: 14 }, { wch: 25 }, { wch: 12 }];
    bulkSubjects.forEach(() => colWidths.push({ wch: 25 }));
    colWidths.push({ wch: 20 });
    ws['!cols'] = colWidths;

    const classNameClean = classes.find((c) => c.id === bulkClassId)?.name?.replace(/\s+/g, '_') || 'Batch';
    const streamClean = bulkStream === 'JAMIATHUL_HIND' ? 'Jamiathul_Hind' : bulkStream === 'MADIN_ACADEMY' ? 'Madin_Academy' : 'Islamic';
    const filename = `SPR_Bulk_Template_${streamClean}_${classNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

      const islamicCat = categories.find((c) => c.code === 'ISLAMIC');
      if (!islamicCat) throw new Error('Islamic Studies category missing.');

      // Extract subject columns from keys in first row
      const firstRow = parsedJson[0];
      const keys = Object.keys(firstRow);
      const subjectCols = keys.filter((k) => {
        const lower = k.toLowerCase().trim();
        return !['student id', 'studentid', 'full name', 'fullname', 'name', 'student name', 'class', 'remarks'].includes(lower);
      });

      if (subjectCols.length === 0) {
        throw new Error('No subject score columns detected in the Excel header.');
      }

      // Build structured payload
      const uploadRecords = parsedJson.map((row) => {
        const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
        const subjectScores = subjectCols.map((colName) => {
          // Parse max score from header like "Quran (Max: 100)"
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
          categoryId: islamicCat.id,
          examName: bulkExamName,
          stream: bulkStream,
          records: uploadRecords,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk score processing failed.');

      setStatusMsg({
        type: 'success',
        text: `Bulk upload successful: ${json.successCount} subject scores recorded seamlessly!`,
      });
      setBulkModalOpen(false);
      setBulkFile(null);
      fetchScoreHistory();
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
      const islamicCat = categories.find((c) => c.code === 'ISLAMIC');
      const activeSubjectName = customSubjectName.trim() || subjects.find((s) => s.id === selectedSubject)?.name || 'Islamic Studies';
      const activeExamName = customExamName.trim() || exams.find((e) => e.id === selectedExam)?.name || 'Assessment';

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
          categoryId: islamicCat?.id,
          subjectName: activeSubjectName,
          examName: activeExamName,
          stream: selectedStream !== 'ALL' ? selectedStream : undefined,
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
      fetchScoreHistory();
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
      fetchScoreHistory();
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
      fetchScoreHistory();
    } catch (err: any) {
      alert(err.message || 'Error deleting score');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Subcategories Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-200 flex items-center space-x-1">
                <BookOpen className="w-3 h-3 text-blue-700" />
                <span>Islamic Studies Assessment Hub</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-blue-800" />
              <span>Islamic Studies Examination & Score Entry</span>
            </h2>
            <p className="text-xs text-slate-500">
              On-the-fly dynamic multiple subject adding, bulk template generation, and student scoring.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Multi-Subject Bulk Upload</span>
            </button>
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

        {/* Main Manual Score Entry Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <span>Manual Score Entry (With Ontime Subject Typing)</span>
            </h3>

            {/* Stream Filter Toggle */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setSelectedStream('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  selectedStream === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedStream('JAMIATHUL_HIND')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedStream === 'JAMIATHUL_HIND' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded overflow-hidden shrink-0">
                  <Image src="/jamiathul-hind.png" alt="JH" width={14} height={14} className="w-full h-full object-contain" />
                </div>
                <span>Jamiathul Hind</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStream('MADIN_ACADEMY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedStream === 'MADIN_ACADEMY' ? 'bg-white text-teal-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="w-3.5 h-3.5 rounded overflow-hidden shrink-0">
                  <Image src="/madin-academy.png" alt="MA" width={14} height={14} className="w-full h-full object-contain" />
                </div>
                <span>Ma'din Academy</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveManualScores} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Class Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Class / Standard</label>
                <CustomSelect
                  value={selectedClass}
                  onChange={(val) => setSelectedClass(val)}
                  placeholder="Select Class / Standard..."
                  options={classes.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.school?.name || 'School'})`,
                  }))}
                />
              </div>

              {/* Ontime Subject Typing / Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject (Select or Type Ontime)
                </label>
                <input
                  type="text"
                  value={customSubjectName}
                  onChange={(e) => setCustomSubjectName(e.target.value)}
                  placeholder="Type subject ontime (e.g. Quran)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 mb-1"
                />
                <CustomSelect
                  size="sm"
                  value={selectedSubject}
                  onChange={(val) => {
                    setSelectedSubject(val);
                    const sub = subjects.find((s) => s.id === val);
                    if (sub) {
                      setCustomSubjectName(sub.name);
                      setMaxScore(sub.maxScore || 100);
                    }
                  }}
                  placeholder="Or pick existing subject..."
                  options={[
                    { value: '', label: 'Or pick existing subject...' },
                    ...filteredSubjects.map((s) => ({
                      value: s.id,
                      label: `${s.name} (Max: ${s.maxScore})`,
                    })),
                  ]}
                />
              </div>

              {/* Ontime Exam Typing / Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Exam / Assessment (Select or Type Ontime)
                </label>
                <input
                  type="text"
                  value={customExamName}
                  onChange={(e) => setCustomExamName(e.target.value)}
                  placeholder="Type exam ontime (e.g. Term 1)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 mb-1"
                />
                <CustomSelect
                  size="sm"
                  value={selectedExam}
                  onChange={(val) => {
                    setSelectedExam(val);
                    const ex = exams.find((x) => x.id === val);
                    if (ex) setCustomExamName(ex.name);
                  }}
                  placeholder="Or pick existing assessment..."
                  options={[
                    { value: '', label: 'Or pick existing assessment...' },
                    ...exams.map((e) => ({
                      value: e.id,
                      label: e.name,
                    })),
                  ]}
                />
              </div>

              {/* Max Score Benchmark */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Marks (Cut of Marks)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
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

              <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 w-32 text-center">Marks (Out of {maxScore})</th>
                      <th className="py-2.5 px-3 w-28 text-center">% Rate</th>
                      <th className="py-2.5 px-3">Remarks / Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingStudents ? (
                      <tr>
                        <td colSpan={4} className="py-10 text-center">
                          <VideoLoader size="md" text="Loading student cohort..." subtext="Accessing Islamic studies registry" />
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
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3">
                              <div className="font-bold text-slate-900">{st.fullName}</div>
                              <div className="text-[10px] text-slate-400">Roll: {st.studentId}</div>
                            </td>
                            <td className="py-2 px-3 text-center">
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
                                className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-center font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-600"
                              />
                            </td>
                            <td className="py-2 px-3 text-center font-mono font-extrabold text-blue-700">
                              {pct !== '-' ? `${pct}%` : '-'}
                            </td>
                            <td className="py-2 px-3">
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
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={saving || students.length === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving Scores...' : 'Save Assessment Scores'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedRecordIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedRecordIds.length} score record(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedRecordIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRecordIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Score History Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Islamic Exam Records</h3>
              <p className="text-[11px] text-slate-500">
                Showing {filteredHistoryRecords.length} of {historyRecords.length} recorded entries
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap min-w-[320px]">
              <div className="w-36">
                <CustomSelect
                  value={historyClassFilter}
                  onChange={(val) => setHistoryClassFilter(val)}
                  placeholder="All Classes"
                  options={[
                    { value: 'ALL', label: 'All Classes' },
                    ...classes.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                />
              </div>

              <div className="w-48">
                <CustomSelect
                  value={historyExamFilter}
                  onChange={(val) => setHistoryExamFilter(val)}
                  placeholder="All Exams"
                  options={[
                    { value: 'ALL', label: 'All Exams' },
                    ...exams.map((ex) => ({
                      value: ex.id,
                      label: ex.name,
                    })),
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredHistoryRecords.length > 0 && filteredHistoryRecords.every((r) => selectedRecordIds.includes(r.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Assessment / Exam</th>
                  <th className="py-2.5 px-3 text-right">Percentage</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading score logs..." subtext="Accessing Islamic studies historical scores" />
                    </td>
                  </tr>
                ) : filteredHistoryRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No score records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredHistoryRecords.map((r: any) => {
                    const isSelected = selectedRecordIds.includes(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{r.student?.fullName}</div>
                          <div className="text-[10px] text-slate-400">{r.student?.class?.name}</div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {r.subject?.name || 'Islamic Studies'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{r.exam?.name || 'Assessment'}</td>
                        <td className="py-2.5 px-3 font-mono font-extrabold text-right text-blue-700">
                          {r.percentage.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1 text-slate-400 hover:text-blue-600"
                              title="Edit Score"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r)}
                              className="p-1 text-slate-400 hover:text-rose-600"
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
        </div>
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                Multi-Subject Bulk Upload
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Islamic Studies Multi-Subject Bulk Score Entry
              </h3>
              <p className="text-xs text-slate-500">
                Type exam details and add multiple subjects on-the-fly to generate a tailored bulk Excel template.
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
                    placeholder="e.g. Annual Islamic Examination 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Class / Batch</label>
                  <CustomSelect
                    value={bulkClassId}
                    onChange={(val) => setBulkClassId(val)}
                    options={classes.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Islamic Stream Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkStreamChange('JAMIATHUL_HIND')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                      bulkStream === 'JAMIATHUL_HIND'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Jamiathul Hind
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStreamChange('MADIN_ACADEMY')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                      bulkStream === 'MADIN_ACADEMY'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ma'din Academy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkStreamChange('ALL')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition ${
                      bulkStream === 'ALL'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Combined Stream
                  </button>
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
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center">
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
                  placeholder="Type new subject on-the-fly (e.g. Tafseer)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newSubjectMax}
                  onChange={(e) => setNewSubjectMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddBulkSubject}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Step 3: Template Download Button */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div>
                <div className="text-xs font-bold text-emerald-950">
                  Ready to generate multi-subject Excel spreadsheet?
                </div>
                <div className="text-[10px] text-emerald-800">
                  Template includes columns for all {bulkSubjects.length} subjects for this class.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateAndDownloadTemplate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition"
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
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
                {bulkFile && (
                  <div className="mt-2 text-xs font-bold text-emerald-700">
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkUploading ? 'Uploading & Processing...' : 'Upload & Record All Scores'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Single Score Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                <input
                  type="number"
                  required
                  value={editFormData.maxScore}
                  onChange={(e) => setEditFormData({ ...editFormData, maxScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold"
                >
                  Update Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Deletion</h3>
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
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedRecordIds.length}</strong> selected Islamic studies examination score record(s)? Student Islamic academic aggregates and 360° dossiers will update automatically.
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
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
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
    </AdminLayout>
  );
}
