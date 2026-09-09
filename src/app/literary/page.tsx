'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  Feather,
  Plus,
  Search,
  Filter,
  Medal,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Award,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Trophy,
  Sparkles,
  Upload,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import { getAcademicMasterData } from '@/lib/academic-client';


interface DynamicEvent {
  id: string;
  name: string;
  maxScore: number;
}

export default function LiteraryProgramsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [levels, setLevels] = useState<any[]>([]);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Bulk selection & deletion state
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const handleToggleSelectAll = () => {
    const allSelected = recentRecords.length > 0 && recentRecords.every((r) => selectedRecordIds.includes(r.id));
    if (allSelected) {
      const recordIdSet = new Set(recentRecords.map((r) => r.id));
      setSelectedRecordIds((prev) => prev.filter((id) => !recordIdSet.has(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...recentRecords.map((r) => r.id)])));
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
    try {
      const res = await fetch('/api/scores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRecordIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete scores.');

      const count = selectedRecordIds.length;
      setSelectedRecordIds([]);
      setConfirmBulkDeleteOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} literary score record(s).` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting records.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Score Entry Modal (Single Entry)
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    festivalName: 'Sahityotsav 2026',
    competitionName: 'Malayalam Essay Writing',
    levelId: '',
    score: '90',
    position: '1st',
    grade: 'A+',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    obtainedScore: 0,
    maxScore: 100,
    position: '1st',
    grade: 'A+',
    remarks: '',
    levelId: '',
  });

  // --- MULTI-EVENT BULK UPLOAD MODAL STATES ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFestivalName, setBulkFestivalName] = useState('Sahityotsav 2026');
  const [bulkLevelId, setBulkLevelId] = useState<string>('');
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkEvents, setBulkEvents] = useState<DynamicEvent[]>([
    { id: '1', name: 'Malayalam Essay Writing', maxScore: 100 },
    { id: '2', name: 'English Elocution & Speech', maxScore: 100 },
    { id: '3', name: 'Qira\'at & Quran Tajweed', maxScore: 100 },
    { id: '4', name: 'Poem Recitation', maxScore: 100 },
    { id: '5', name: 'Arabic Calligraphy', maxScore: 100 },
  ]);
  const [newEventInput, setNewEventInput] = useState('');
  const [newEventMax, setNewEventMax] = useState(100);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  const festivals = ['Sahityotsav 2026', 'Kerala School Kalotsavam 2026', 'Jamia Mahrajan 2026', 'M-Lit Fest 2026'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataMaster, resStudents, resScores] = await Promise.all([
        getAcademicMasterData(),
        fetch('/api/students?all=true'),
        fetch('/api/scores'),
      ]);

      const dataStudents = await resStudents.json();
      const dataScores = await resScores.json();

      if (dataMaster.levels) {
        setLevels(dataMaster.levels);
        if (dataMaster.levels.length > 0) {
          if (!formData.levelId) setFormData((prev) => ({ ...prev, levelId: dataMaster.levels[0].id }));
          if (!bulkLevelId) setBulkLevelId(dataMaster.levels[0].id);
        }
      }
      if (dataMaster.classes) {
        setClasses(dataMaster.classes);
        if (dataMaster.classes.length > 0 && !bulkClassId) {
          setBulkClassId(dataMaster.classes[0].id);
        }
      }
      if (dataStudents.students) {
        setStudents(dataStudents.students);
        if (dataStudents.students.length > 0 && !formData.studentId) {
          setFormData((prev) => ({ ...prev, studentId: dataStudents.students[0].id }));
        }
      }
      if (dataScores.records) {
        const litRecords = dataScores.records.filter((r: any) => r.category?.code === 'LITERARY');
        setRecentRecords(litRecords);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Preset switch for festival events in Bulk Modal
  const handleBulkFestPreset = (fName: string) => {
    setBulkFestivalName(fName);
    if (fName.includes('Sahityotsav')) {
      setBulkEvents([
        { id: '1', name: 'Malayalam Essay Writing', maxScore: 50 },
        { id: '2', name: 'Urdu Ghazal & Songs', maxScore: 50 },
        { id: '3', name: 'Arabic Story Writing', maxScore: 50 },
        { id: '4', name: 'Qira\'at & Quran Tajweed', maxScore: 100 },
      ]);
    } else if (fName.includes('Kalotsav')) {
      setBulkEvents([
        { id: '1', name: 'Malayalam Elocution', maxScore: 50 },
        { id: '2', name: 'Classical Music / Vocal', maxScore: 100 },
        { id: '3', name: 'Pencil Drawing & Painting', maxScore: 50 },
        { id: '4', name: 'Poem Recitation (English)', maxScore: 50 },
      ]);
    } else if (fName.includes('M-Lit')) {
      setBulkEvents([
        { id: '1', name: 'Creative Literature Article', maxScore: 50 },
        { id: '2', name: 'Campus Book Review Debate', maxScore: 50 },
        { id: '3', name: 'Editorial Writing', maxScore: 50 },
      ]);
    } else {
      setBulkEvents([
        { id: '1', name: 'National Debate Competition', maxScore: 100 },
        { id: '2', name: 'Arabic Speech Championship', maxScore: 100 },
        { id: '3', name: 'Islamic Quiz Tournament', maxScore: 100 },
      ]);
    }
  };

  // Add Dynamic Event on-the-fly to Bulk List
  const handleAddBulkEvent = () => {
    if (!newEventInput.trim()) return;
    const newEv: DynamicEvent = {
      id: Date.now().toString(),
      name: newEventInput.trim(),
      maxScore: Number(newEventMax) || 50,
    };
    setBulkEvents((prev) => [...prev, newEv]);
    setNewEventInput('');
    setNewEventMax(50);
  };

  const handleRemoveBulkEvent = (id: string) => {
    setBulkEvents((prev) => prev.filter((e) => e.id !== id));
  };

  // Generate and Download Multi-Event Excel Template
  const handleGenerateAndDownloadTemplate = async () => {
    if (bulkEvents.length === 0) {
      alert('Please add at least one competition event before generating the bulk template.');
      return;
    }

    let batchStudents = students;
    if (bulkClassId) {
      const res = await fetch(`/api/students?classId=${bulkClassId}&limit=100`);
      const data = await res.json();
      if (data.students && data.students.length > 0) batchStudents = data.students;
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
      bulkEvents.forEach((ev) => {
        const colHeader = `${ev.name} (Max: ${ev.maxScore})`;
        row[colHeader] = '';
      });
      row['Remarks'] = '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Festival_Awards');

    const colWidths = [{ wch: 14 }, { wch: 25 }, { wch: 12 }];
    bulkEvents.forEach(() => colWidths.push({ wch: 28 }));
    colWidths.push({ wch: 20 });
    ws['!cols'] = colWidths;

    const festClean = bulkFestivalName.replace(/[^A-Za-z0-9]/g, '_');
    const classNameClean = classes.find((c) => c.id === bulkClassId)?.name?.replace(/\s+/g, '_') || 'All_Students';
    const filename = `SPR_Fest_Bulk_Template_${festClean}_${classNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Parse and Upload Excel with Multiple Event Columns
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

      const resMaster = await fetch('/api/academic');
      const dataMaster = await resMaster.json();
      const litCat = dataMaster.categories.find((c: any) => c.code === 'LITERARY');
      if (!litCat) throw new Error('Literary category missing in system.');

      const firstRow = parsedJson[0];
      const keys = Object.keys(firstRow);
      const eventCols = keys.filter((k) => {
        const lower = k.toLowerCase().trim();
        return !['student id', 'studentid', 'full name', 'fullname', 'name', 'student name', 'class', 'remarks'].includes(lower);
      });

      if (eventCols.length === 0) {
        throw new Error('No competition event score columns detected in the Excel header.');
      }

      const uploadRecords = parsedJson.map((row) => {
        const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
        const programmeScores = eventCols.map((colName) => {
          const maxMatch = colName.match(/\(max:\s*(\d+)\)/i);
          const maxScoreVal = maxMatch ? parseInt(maxMatch[1], 10) : 50;
          const cleanEventName = colName.replace(/\(max:\s*\d+\)/i, '').trim();

          return {
            competitionName: cleanEventName,
            festivalName: bulkFestivalName,
            obtainedScore: row[colName] !== undefined && row[colName] !== '' ? Number(row[colName]) : undefined,
            maxScore: maxScoreVal,
            remarks: row['Remarks'] || '',
          };
        }).filter((ev) => ev.obtainedScore !== undefined && !isNaN(ev.obtainedScore));

        return {
          studentId,
          programmeScores,
          remarks: row['Remarks'] || '',
        };
      }).filter((r) => r.programmeScores.length > 0);

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: litCat.id,
          levelId: bulkLevelId,
          records: uploadRecords,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk event processing failed.');

      setStatusMsg({
        type: 'success',
        text: `Bulk upload successful: ${json.successCount} festival results recorded seamlessly!`,
      });
      setBulkModalOpen(false);
      setBulkFile(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error processing bulk upload file.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Helper: Get available levels for specific festivals
  const getAvailableLevelsForFestival = (fName: string) => {
    const lower = (fName || '').toLowerCase();
    if (lower.includes('sahityotsav')) {
      return levels.filter((l) =>
        ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'].includes(l.name.toUpperCase()) ||
        ['DIVISION', 'DISTRICT', 'STATE', 'NATIONAL'].includes(l.code.toUpperCase())
      );
    } else if (lower.includes('kalotsav')) {
      return levels.filter((l) =>
        ['SUB-DISTRICT', 'SUB_DISTRICT', 'DISTRICT', 'STATE'].includes(l.name.toUpperCase()) ||
        ['SUB-DISTRICT', 'SUB_DISTRICT', 'DISTRICT', 'STATE'].includes(l.code.toUpperCase())
      );
    } else if (lower.includes('mahrajan') || lower.includes('maharjan') || lower.includes('jamia')) {
      return levels.filter((l) =>
        ['KULLIYA', 'DAAERA', 'JAMIA'].includes(l.name.toUpperCase()) ||
        ['KULLIYA', 'DAAERA', 'JAMIA'].includes(l.code.toUpperCase())
      );
    } else if (lower.includes('m-lit') || lower.includes('mlit')) {
      return []; // No competition level for M-lit
    }
    return levels;
  };

  // Single Score Entry
  const handleSaveScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const resMaster = await fetch('/api/academic');
      const dataMaster = await resMaster.json();
      const litCat = dataMaster.categories.find((c: any) => c.code === 'LITERARY');

      const scoreVal = Number(formData.score) || 0;
      const remarksText = `${formData.festivalName} - ${formData.competitionName}. ${
        formData.position ? formData.position + ' Position. ' : ''
      }${formData.grade ? formData.grade + ' Grade. ' : ''}${formData.remarks || ''}`.trim();

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: litCat?.id,
          levelId: formData.levelId || null,
          competitionName: formData.competitionName,
          records: [
            {
              studentId: formData.studentId,
              score: scoreVal,
              maxScore: 100,
              position: formData.position || null,
              grade: formData.grade || null,
              remarks: remarksText,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save score.');

      setStatusMsg({ type: 'success', text: 'Literary competition result saved successfully!' });
      setModalOpen(false);
      fetchData();
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
      position: rec.position || '',
      grade: rec.grade || '',
      remarks: rec.remarks || '',
      levelId: rec.levelId || levels[0]?.id || '',
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

      setStatusMsg({ type: 'success', text: 'Literary score updated successfully.' });
      setEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating score');
    }
  };

  const handleDeleteRecord = async (rec: any) => {
    if (!confirm(`Delete literary score for ${rec.student?.fullName}?`)) return;

    try {
      const res = await fetch(`/api/scores?id=${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: 'Literary score deleted.' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting score');
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                Literary Festivals & Arts Fest Module
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Feather className="w-5 h-5 text-rose-700" />
              <span>Literary Festivals & Cultural Competitions</span>
            </h2>
            <p className="text-xs text-slate-500">
              Record, edit, bulk upload multiple events on-the-fly, and evaluate student awards in Sahityotsav, Kalotsav, M-Lit, and Jamia Mahrajan.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Multi-Event Bulk Upload</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>Record Single Award</span>
            </button>
          </div>
        </div>

        {/* 4 Literary Festival Subcategories Boxes (Sahityotsav, Kalotsav, M-Lit, Jamia Mahrajan) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Festival Subcategories & Dedicated Standings</span>
              </h3>
              <p className="text-xs text-slate-500">
                Click any festival subcategory box to open its dedicated leaderboard with percentage calculation breakdown.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. SAHITYOTSAV (2nd image logo) */}
            <Link
              href="/leaderboard?fest=SAHITYOTSAV"
              className="group p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-rose-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-12 rounded-xl bg-rose-50 border border-rose-200 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Image
                    src="/sahityotsav.png"
                    alt="Sahityotsav Logo"
                    width={56}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                  Subcategory
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-rose-700 transition">
                  SAHITYOTSAV
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Malayalam, Arabic, English & Urdu literature competitions.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-rose-700">
                <span>Open Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* 2. KALOTSAV (3rd image logo) */}
            <Link
              href="/leaderboard?fest=KALOTSAV"
              className="group p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-12 rounded-xl bg-blue-50 border border-blue-200 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Image
                    src="/kalotsav.png"
                    alt="Kalotsav Logo"
                    width={56}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                  Subcategory
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-700 transition">
                  KALOTSAV
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  School youth arts festival, stage acts & cultural arts.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                <span>Open Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* 3. M-LIT (4th image logo) */}
            <Link
              href="/leaderboard?fest=M_LIT"
              className="group p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-emerald-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-12 rounded-xl bg-emerald-50 border border-emerald-200 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Image
                    src="/m-lit.png"
                    alt="M-Lit Fest Logo"
                    width={56}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Subcategory
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition">
                  M-LIT FEST
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Ma'din campus festival, literature & creative talents.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
                <span>Open Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            {/* 4. JAMIA MAHRAJAN (5th image logo) */}
            <Link
              href="/leaderboard?fest=JAMIA_MAHRAJAN"
              className="group p-4 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:shadow-lg transition-all duration-300 flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="w-16 h-12 rounded-xl bg-amber-50 border border-amber-200 p-1 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                  <Image
                    src="/jamia-mahrajan.png"
                    alt="Jamia Mahrajan Logo"
                    width={56}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                  Subcategory
                </span>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition">
                  JAMIA MAHRAJAN
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  National academic & cultural fest stage competitions.
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700">
                <span>Open Leaderboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
              </div>
            </Link>
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

        {/* Level Hierarchy Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {levels.map((lvl) => (
            <div key={lvl.id} className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-subtle">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level {lvl.displayOrder}</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">{lvl.name}</div>
              <div className="text-[10px] text-rose-700 font-semibold mt-1">×{lvl.weightMultiplier} Mult</div>
            </div>
          ))}
        </div>

        {/* Bulk Action Toolbar */}
        {selectedRecordIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedRecordIds.length} festival score record(s) selected
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

        {/* Literary Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Recorded Festival Results</span>
            <span className="text-xs text-slate-500">{recentRecords.length} entries</span>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-500 uppercase tracking-wider font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={recentRecords.length > 0 && recentRecords.every((r) => selectedRecordIds.includes(r.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class & School</th>
                  <th className="py-2.5 px-4">Festival / Competition</th>
                  <th className="py-2.5 px-4">Level</th>
                  <th className="py-2.5 px-4 text-right">Percentage</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading literary records..." subtext="Accessing arts and cultural results" />
                    </td>
                  </tr>
                ) : recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No literary results logged yet.
                    </td>
                  </tr>
                ) : (
                  recentRecords.map((r: any) => {
                    const isSelected = selectedRecordIds.includes(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.student?.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.student?.class?.name} • {r.student?.school?.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {r.literaryCompetition?.name || r.remarks || 'Sahityotsav'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {r.level?.name || 'Campus'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-extrabold text-madin-900">
                          {r.percentage}%
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1 text-slate-400 hover:text-blue-600 rounded"
                              title="Edit Score"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(r)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
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

      {/* MULTI-EVENT DYNAMIC BULK UPLOAD MODAL */}
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-900 border border-rose-300">
                Festival Multi-Event Bulk Upload
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Literary Festival Multi-Event Bulk Score Entry
              </h3>
              <p className="text-xs text-slate-500">
                Type festival details and add multiple events/competitions on-the-fly to generate a tailored bulk Excel template.
              </p>
            </div>

            {/* Step 1: Festival & Batch Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Festival & Level Configuration
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Festival Name (Select or Type Ontime)
                  </label>
                  <input
                    type="text"
                    value={bulkFestivalName}
                    onChange={(e) => setBulkFestivalName(e.target.value)}
                    placeholder="e.g. Sahityotsav 2026"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Competition Level</label>
                  <select
                    value={bulkLevelId}
                    onChange={(e) => setBulkLevelId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.weightMultiplier}x)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Class / Batch</label>
                  <select
                    value={bulkClassId}
                    onChange={(e) => setBulkClassId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    <option value="">All Students (Campus-wide)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Festival Quick Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleBulkFestPreset('Sahityotsav 2026')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition flex items-center justify-center space-x-1.5 ${
                        bulkFestivalName.includes('Sahityotsav')
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                        <Image src="/sahityotsav.png" alt="S" width={14} height={14} className="w-full h-full object-contain" />
                      </div>
                      <span className="truncate">Sahityotsav</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkFestPreset('Kerala School Kalotsavam 2026')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition flex items-center justify-center space-x-1.5 ${
                        bulkFestivalName.includes('Kalotsav')
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                        <Image src="/kalotsav.png" alt="K" width={14} height={14} className="w-full h-full object-contain" />
                      </div>
                      <span className="truncate">Kalotsavam</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkFestPreset('M-Lit Fest 2026')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition flex items-center justify-center space-x-1.5 ${
                        bulkFestivalName.includes('M-Lit')
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                        <Image src="/m-lit.png" alt="M" width={14} height={14} className="w-full h-full object-contain" />
                      </div>
                      <span className="truncate">M-Lit Fest</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkFestPreset('Jamia Mahrajan 2026')}
                      className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition flex items-center justify-center space-x-1.5 ${
                        bulkFestivalName.includes('Mahrajan')
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                        <Image src="/jamia-mahrajan.png" alt="J" width={14} height={14} className="w-full h-full object-contain" />
                      </div>
                      <span className="truncate">Mahrajan</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Dynamic Multi-Event List (Ontime Typing) */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. Dynamic Events / Items for Template ({bulkEvents.length})
                </span>
                <span className="text-[11px] text-slate-400">Add or edit events to include in Excel file</span>
              </div>

              {/* Event Chips */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {bulkEvents.map((ev, idx) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{ev.name}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                        Max Score: {ev.maxScore}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBulkEvent(ev.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Remove Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Ontime Add Event Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <input
                  type="text"
                  value={newEventInput}
                  onChange={(e) => setNewEventInput(e.target.value)}
                  placeholder="Type new event on-the-fly (e.g. Mime)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-rose-600"
                />
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={newEventMax}
                  onChange={(e) => setNewEventMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none focus:ring-2 focus:ring-rose-600"
                />
                <button
                  type="button"
                  onClick={handleAddBulkEvent}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Step 3: Template Download Button */}
            <div className="flex items-center justify-between p-3.5 bg-rose-50 rounded-2xl border border-rose-200">
              <div>
                <div className="text-xs font-bold text-rose-950">
                  Ready to generate multi-event Excel spreadsheet?
                </div>
                <div className="text-[10px] text-rose-800">
                  Template includes columns for all {bulkEvents.length} events for this batch.
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateAndDownloadTemplate}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition"
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
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-600 file:text-white hover:file:bg-rose-700 cursor-pointer"
                />
                {bulkFile && (
                  <div className="mt-2 text-xs font-bold text-rose-700">
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
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow transition disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkUploading ? 'Uploading & Processing...' : 'Upload & Record All Results'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Award Modal (Single Entry with Ontime Typing) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Literary Festival Result</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveScore} className="mt-4 space-y-3.5">
              {/* Searchable Student Selector */}
              <SearchableStudentSelect
                students={students}
                value={formData.studentId}
                onChange={(id) => setFormData({ ...formData, studentId: id })}
                label="Select Student"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Festival Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.festivalName}
                    onChange={(e) => setFormData({ ...formData, festivalName: e.target.value })}
                    placeholder="Type festival ontime..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {festivals.map((fest) => (
                      <button
                        key={fest}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, festivalName: fest });
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded-md border font-semibold transition ${
                          formData.festivalName === fest
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {fest.replace(' 2026', '')}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Competition / Item *</label>
                  <input
                    type="text"
                    required
                    value={formData.competitionName}
                    onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                    placeholder="e.g. Malayalam Essay / Urdu Ghazal"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              {/* Dynamic Levels for Festival */}
              {(() => {
                const availableLevels = getAvailableLevelsForFestival(formData.festivalName);
                if (availableLevels.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Competition Level *
                    </label>
                    <select
                      value={formData.levelId}
                      onChange={(e) => setFormData({ ...formData, levelId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                    >
                      <option value="">Select Level ({availableLevels.map((l) => l.name).join(', ')})</option>
                      {availableLevels.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} (Weight Multiplier: {l.weightMultiplier}x)
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}

              {/* Position & Grade Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position Awarded *
                  </label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    <option value="1st">1st Position (Winner)</option>
                    <option value="2nd">2nd Position (Runner Up)</option>
                    <option value="3rd">3rd Position (Third)</option>
                    <option value="Participated">Participated / Qualified</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grade <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                  >
                    <option value="">None / Optional</option>
                    <option value="A+">A+ Grade</option>
                    <option value="A">A Grade</option>
                    <option value="B+">B+ Grade</option>
                    <option value="B">B Grade</option>
                    <option value="C">C Grade</option>
                  </select>
                </div>
              </div>

              {/* Direct Score Awarded */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Score Awarded (0-100) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="1000"
                  required
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  placeholder="e.g. 90"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Special jury distinction..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>{saving ? 'Recording...' : 'Record Festival Award'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Award Record</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student</label>
                <div className="text-xs font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {editingRecord?.student?.fullName}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Obtained Score</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editFormData.obtainedScore}
                    onChange={(e) => setEditFormData({ ...editFormData, obtainedScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editFormData.maxScore}
                    onChange={(e) => setEditFormData({ ...editFormData, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
                <select
                  value={editFormData.levelId}
                  onChange={(e) => setEditFormData({ ...editFormData, levelId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.weightMultiplier}x)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 shadow"
                >
                  Update Result
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

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedRecordIds.length}</strong> selected literary / arts festival score record(s)? Student aggregate leaderboards and 360° dossiers will update automatically.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDeleteOpen(false)}
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
