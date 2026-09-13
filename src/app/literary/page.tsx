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
  Sparkles,
  Upload,
  Loader2,
  Trophy,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import ModalLoadingBar from '@/components/ui/ModalLoadingBar';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';
import { getAcademicMasterData } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';

const resolveLevelMultiplier = (lvl: any, levelsList: any[]): number => {
  if (!lvl) return 1.0;
  if (typeof lvl.weightMultiplier === 'number' && lvl.weightMultiplier > 0) {
    return lvl.weightMultiplier;
  }
  const lvlCode = (lvl.code || lvl.name || '').toUpperCase();
  const matched = levelsList.find(
    (l) => l.code?.toUpperCase() === lvlCode || l.name?.toUpperCase() === lvlCode || l.id === lvl.id
  );
  return matched?.weightMultiplier || 1.0;
};

const resolvePrizeMultiplier = (position: string | null | undefined): number => {
  const pos = (position || '').trim().toLowerCase();
  if (pos.startsWith('1') || pos.includes('first')) return 2.0;
  if (pos.startsWith('2') || pos.includes('second')) return 1.5;
  if (pos.startsWith('3') || pos.includes('third')) return 1.0;
  return 1.0;
};

const getFestivalBadgeStyle = (festName: string) => {
  const lower = (festName || '').toLowerCase();
  if (lower.includes('sahityotsav') || lower.includes('sahithyotsav')) {
    return {
      bg: 'bg-rose-100 text-rose-900 border-rose-300',
      dot: 'bg-rose-500',
      label: 'Sahityotsav',
    };
  }
  if (lower.includes('kalotsav')) {
    return {
      bg: 'bg-blue-100 text-blue-900 border-blue-300',
      dot: 'bg-blue-500',
      label: 'Kalotsavam',
    };
  }
  if (lower.includes('m-lit') || lower.includes('mlit')) {
    return {
      bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dot: 'bg-emerald-500',
      label: 'M-Lit Fest',
    };
  }
  if (lower.includes('mahrajan') || lower.includes('jamia')) {
    return {
      bg: 'bg-amber-100 text-amber-900 border-amber-300',
      dot: 'bg-amber-500',
      label: 'Jamia Mahrajan',
    };
  }
  return {
    bg: 'bg-purple-100 text-purple-900 border-purple-300',
    dot: 'bg-purple-500',
    label: festName || 'Festival',
  };
};

const formatPoints = (val: number): string => (Number.isInteger(val) ? val.toString() : val.toFixed(2));

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
  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);

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
    setModalDeleteError(null);
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
      setModalDeleteError(null);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} literary score record(s).` });
      fetchData();
    } catch (err: any) {
      const errMsg = err.message || 'Error bulk deleting records.';
      setModalDeleteError(errMsg);
      setStatusMsg({ type: 'error', text: errMsg });
    } finally {
      setBulkDeleting(false);
    }
  };

  // Score Entry Modal (Single Entry)
  const [modalOpen, setModalOpen] = useState(false);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [litCategoryId, setLitCategoryId] = useState<string>('');
  const [formData, setFormData] = useState({
    studentId: '',
    subcategoryId: '',
    festivalName: 'Sahityotsav',
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
    subcategoryId: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- MULTI-EVENT BULK UPLOAD MODAL STATES ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<string>('');
  const [bulkFestivalName, setBulkFestivalName] = useState('Sahityotsav');
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

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const dataMaster = await getAcademicMasterData();
      const litCat = dataMaster.categories?.find((c: any) => c.code === 'LITERARY');
      if (litCat) setLitCategoryId(litCat.id);
      const scoreQuery = litCat ? `/api/scores?categoryId=${litCat.id}&limit=500` : '/api/scores?limit=500';

      const [resStudents, resScores, resSubs] = await Promise.all([
        fetch('/api/students?all=true&minimal=true'),
        fetch(scoreQuery),
        fetch('/api/subcategories'),
      ]);

      const dataStudents = await resStudents.json();
      const dataScores = await resScores.json();
      const dataSubs = await resSubs.json();

      if (dataSubs.subcategories) {
        const litSubs = dataSubs.subcategories.filter((s: any) => s.categoryId === litCat?.id);
        setSubcategories(litSubs);
        if (litSubs.length > 0) {
          setFormData((prev) => ({
            ...prev,
            subcategoryId: prev.subcategoryId || litSubs[0].id,
            festivalName: prev.festivalName || litSubs[0].name,
          }));
          setBulkSubcategoryId((prev) => prev || litSubs[0].id);
          setBulkFestivalName((prev) => prev || litSubs[0].name);
        }
      }

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
        setRecentRecords(dataScores.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
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

  // Generate and Download Inclusive Multi-Event Excel Template
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
        'Student ID': st.studentId || st.sprStudentId || st.id,
        'Full Name': st.fullName,
        'Class': st.class?.name || '',
      };
      bulkEvents.forEach((ev) => {
        row[`${ev.name} [Score (Max: ${ev.maxScore})]`] = '';
        row[`${ev.name} [Position (1st/2nd/3rd)]`] = '';
      });
      row['Remarks'] = '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Festival_Awards');

    const colWidths = [{ wch: 16 }, { wch: 26 }, { wch: 12 }];
    bulkEvents.forEach(() => {
      colWidths.push({ wch: 32 });
      colWidths.push({ wch: 30 });
    });
    colWidths.push({ wch: 22 });
    ws['!cols'] = colWidths;

    const festClean = bulkFestivalName.replace(/[^A-Za-z0-9]/g, '_');
    const classNameClean = classes.find((c) => c.id === bulkClassId)?.name?.replace(/\s+/g, '_') || 'All_Students';
    const filename = `SPR_Fest_Bulk_Template_${festClean}_${classNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Parse and Upload Excel with Multiple Event Columns & Positions
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

      const dataMaster = await getAcademicMasterData();
      const litCat = dataMaster.categories?.find((c: any) => c.code === 'LITERARY');
      if (!litCat) throw new Error('Literary category missing in system.');

      const firstRow = parsedJson[0];
      const keys = Object.keys(firstRow);

      // Check if format is Detailed Single-Item Rows (has Competition/Event column)
      const hasDetailedEventCol = keys.some((k) =>
        ['event', 'event name', 'competition', 'competition name', 'activity', 'activity name'].includes(k.toLowerCase().trim())
      );

      let uploadRecords: any[] = [];

      if (hasDetailedEventCol) {
        // Detailed Row Format
        uploadRecords = parsedJson.map((row) => {
          const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
          const compName =
            row['Event'] ||
            row['Event Name'] ||
            row['Competition'] ||
            row['Competition Name'] ||
            row['Activity'] ||
            row['Activity Name'] ||
            'Festival Event';
          const pos = row['Position'] || row['Prize'] || row['Place'] || '';
          const rawScore = row['Score'] ?? row['Obtained Score'] ?? row['Marks'] ?? row['Score Awarded'];
          const maxScore = Number(row['Max Score'] || row['Max Marks'] || 50);
          const remarks = row['Remarks'] || `${bulkFestivalName} - ${compName}`;
          const levelNameStr = row['Level'] || row['Event Level'];
          const matchedLevel = levelNameStr
            ? levels.find((l) => l.name.toLowerCase() === String(levelNameStr).toLowerCase().trim())
            : null;

          return {
            studentId,
            score: rawScore !== undefined && rawScore !== '' ? Number(rawScore) : undefined,
            maxScore,
            position: pos || null,
            competitionName: compName,
            festivalName: bulkFestivalName,
            levelId: matchedLevel?.id || bulkLevelId,
            remarks,
          };
        }).filter((r) => r.studentId && (r.score !== undefined || r.position));
      } else {
        // Matrix Format: Event score & position columns
        const nonEventCols = new Set([
          'student id', 'studentid', 'full name', 'fullname', 'name', 'student name', 'class', 'remarks',
        ]);

        const candidateCols = keys.filter((k) => !nonEventCols.has(k.toLowerCase().trim()));

        // Group headers by clean event base name
        const eventMap = new Map<string, { scoreCol?: string; posCol?: string; maxScore: number }>();

        candidateCols.forEach((col) => {
          const lower = col.toLowerCase();
          const isPosCol = lower.includes('[position') || lower.includes('position') || lower.includes('prize') || lower.includes('place');
          const cleanName = col
            .replace(/\[score.*?\]/i, '')
            .replace(/\[position.*?\]/i, '')
            .replace(/\(max:\s*\d+\)/i, '')
            .replace(/- score/i, '')
            .replace(/- position/i, '')
            .trim();

          if (!cleanName) return;

          const maxMatch = col.match(/max:\s*(\d+)/i);
          const maxScoreVal = maxMatch ? parseInt(maxMatch[1], 10) : 50;

          if (!eventMap.has(cleanName)) {
            eventMap.set(cleanName, { maxScore: maxScoreVal });
          }

          const entry = eventMap.get(cleanName)!;
          if (isPosCol) {
            entry.posCol = col;
          } else {
            entry.scoreCol = col;
            if (maxMatch) entry.maxScore = maxScoreVal;
          }
        });

        uploadRecords = parsedJson.map((row) => {
          const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
          const programmeScores: any[] = [];

          eventMap.forEach((meta, eventName) => {
            const scoreVal = meta.scoreCol ? row[meta.scoreCol] : undefined;
            const posVal = meta.posCol ? row[meta.posCol] : undefined;

            if ((scoreVal !== undefined && scoreVal !== '') || (posVal !== undefined && posVal !== '')) {
              programmeScores.push({
                competitionName: eventName,
                festivalName: bulkFestivalName,
                obtainedScore: scoreVal !== undefined && scoreVal !== '' ? Number(scoreVal) : undefined,
                maxScore: meta.maxScore,
                position: posVal ? String(posVal).trim() : undefined,
                levelId: bulkLevelId,
                remarks: row['Remarks'] || `${bulkFestivalName} - ${eventName}`,
              });
            }
          });

          return {
            studentId,
            programmeScores,
            remarks: row['Remarks'] || '',
          };
        }).filter((r) => r.programmeScores.length > 0);
      }

      const selectedSub = subcategories.find((s) => s.id === bulkSubcategoryId);
      const subName = selectedSub?.name || bulkFestivalName || 'Sahityotsav';

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: litCat.id,
          subcategoryId: bulkSubcategoryId || selectedSub?.id || null,
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
      fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Error processing bulk upload file.');
    } finally {
      setBulkUploading(false);
    }
  };

  // Helper: Get available levels for specific festivals / subcategories
  const getAvailableLevelsForFestival = (fNameOrSubId: string) => {
    const matchedSub = subcategories.find(
      (s) => s.id === fNameOrSubId || s.name === fNameOrSubId || s.code === fNameOrSubId
    );
    const lower = (matchedSub ? matchedSub.code + ' ' + matchedSub.name : fNameOrSubId || '').toLowerCase();
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
      const dataMaster = await getAcademicMasterData();
      const litCat = dataMaster.categories?.find((c: any) => c.code === 'LITERARY');

      const selectedSub = subcategories.find((s) => s.id === formData.subcategoryId);
      const subName = selectedSub?.name || formData.festivalName || 'Sahityotsav';

      const scoreVal = Number(formData.score) || 0;
      const remarksText = `${subName} - ${formData.competitionName}. ${
        formData.position ? formData.position + ' Position. ' : ''
      }${formData.grade ? formData.grade + ' Grade. ' : ''}${formData.remarks || ''}`.trim();

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: litCat?.id,
          subcategoryId: formData.subcategoryId || selectedSub?.id || null,
          levelId: formData.levelId || null,
          competitionName: formData.competitionName,
          festivalName: subName,
          records: [
            {
              studentId: formData.studentId,
              score: scoreVal,
              maxScore: 100,
              levelId: formData.levelId || null,
              subcategoryId: formData.subcategoryId || selectedSub?.id || null,
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
      fetchData(true);
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
      subcategoryId: rec.subcategoryId || '',
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
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
      fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Error updating score');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteRecord = async (rec: any) => {
    if (!confirm(`Delete literary score for ${rec.student?.fullName}?`)) return;
    setDeletingId(rec.id);

    try {
      const res = await fetch(`/api/scores?id=${rec.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStatusMsg({ type: 'success', text: 'Literary score deleted.' });
      fetchData(true);
    } catch (err: any) {
      alert(err.message || 'Error deleting score');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/literary-logo.png"
                alt="Literary Programmes"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                  Literary Festivals & Arts Fest Module
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
                <span>Literary Programmes & Festivals</span>
              </h2>
              <p className="text-xs text-slate-500">
                Record, edit, bulk upload multiple events on-the-fly, and evaluate student awards in Sahityotsav, Kalotsav, M-Lit, and Jamia Mahrajan.
              </p>
            </div>
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
                  <th className="py-2.5 px-4 text-right">Score & SPR Points</th>
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
                    const lvlMult = resolveLevelMultiplier(r.level, levels);
                    const prizeMult = resolvePrizeMultiplier(r.position);
                    const baseScore = typeof r.obtainedScore === 'number' ? r.obtainedScore : 0;
                    const earnedPts = Number((baseScore * prizeMult * lvlMult).toFixed(2));
                    
                    // Extract festival / subcategory name
                    const festRawName = r.subcategory?.name || r.literaryCompetition?.event?.name || (r.remarks && r.remarks.includes('-') ? r.remarks.split('-')[0].trim() : 'Sahityotsav 2026');
                    const festBadge = getFestivalBadgeStyle(festRawName);
                    const compDisplayName = r.literaryCompetition?.name || (r.remarks && r.remarks.includes('-') ? r.remarks.split('-')[1]?.split('.')[0]?.trim() : r.remarks) || 'Competition Event';

                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-bold text-slate-900">{r.student?.fullName}</div>
                          {r.student?.sprStudentId && (
                            <span className="text-[10px] font-mono text-slate-400">{r.student?.sprStudentId}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600">
                          <div>{r.student?.class?.name || 'Class'}</div>
                          <div className="text-[10px] text-slate-400">{r.student?.school?.name || ''}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border inline-flex items-center space-x-1 ${festBadge.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${festBadge.dot}`}></span>
                                <span>{festRawName}</span>
                              </span>
                              {r.position && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  {r.position} ({prizeMult}x)
                                </span>
                              )}
                              {r.grade && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  Grade {r.grade}
                                </span>
                              )}
                            </div>
                            <div className="font-bold text-slate-900 text-xs tracking-tight uppercase">
                              {compDisplayName}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            {r.level?.name || 'Campus'} ({lvlMult}x)
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="space-y-0.5">
                            <div className="font-mono font-black text-rose-900 text-xs sm:text-sm">
                              +{formatPoints(earnedPts)} pts
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Score: {r.obtainedScore || 0} ({r.percentage || 0}%)
                            </div>
                          </div>
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
                              disabled={deletingId === r.id}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded disabled:opacity-50 transition"
                              title="Delete Score"
                            >
                              {deletingId === r.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
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

            {/* Step 1: Subcategory & Batch Configuration */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Subcategory & Level Configuration
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Select Subcategory / Festival *
                  </label>
                  <CustomSelect
                    value={bulkSubcategoryId}
                    onChange={(val) => {
                      const sub = subcategories.find((s) => s.id === val);
                      setBulkSubcategoryId(val);
                      if (sub) {
                        setBulkFestivalName(sub.name);
                        handleBulkFestPreset(sub.name);
                      }
                    }}
                    placeholder="Select Subcategory"
                    options={subcategories.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Competition Level</label>
                  <CustomSelect
                    value={bulkLevelId}
                    onChange={(val) => setBulkLevelId(val)}
                    options={levels.map((l) => ({
                      value: l.id,
                      label: `${l.name} (${l.weightMultiplier}x)`,
                      badge: `${l.weightMultiplier}x`,
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Class / Batch</label>
                  <CustomSelect
                    value={bulkClassId}
                    onChange={(val) => setBulkClassId(val)}
                    placeholder="All Students (Campus-wide)"
                    options={[
                      { value: '', label: 'All Students (Campus-wide)' },
                      ...classes.map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subcategory Quick Presets</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {subcategories.map((sub) => {
                      const isSelected = bulkSubcategoryId === sub.id || bulkFestivalName.toLowerCase().includes(sub.name.toLowerCase());
                      const getSubIcon = (name: string) => {
                        const l = name.toLowerCase();
                        if (l.includes('sahityotsav')) return '/sahityotsav.png';
                        if (l.includes('kalotsav')) return '/kalotsav.png';
                        if (l.includes('m-lit') || l.includes('mlit')) return '/m-lit.png';
                        if (l.includes('mahr') || l.includes('jamia')) return '/jamia-mahrajan.png';
                        return '/logo.png';
                      };
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setBulkSubcategoryId(sub.id);
                            setBulkFestivalName(sub.name);
                            handleBulkFestPreset(sub.name);
                          }}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition flex items-center justify-center space-x-1.5 ${
                            isSelected
                              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <div className="w-3.5 h-3.5 shrink-0 rounded overflow-hidden">
                            <Image src={getSubIcon(sub.name)} alt={sub.name} width={14} height={14} className="w-full h-full object-contain" />
                          </div>
                          <span className="truncate">{sub.name}</span>
                        </button>
                      );
                    })}
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
            <ModalLoadingBar loading={saving} text="Recording literary score..." color="rose" />

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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory / Festival *</label>
                  <CustomSelect
                    value={formData.subcategoryId}
                    onChange={(val) => {
                      const sub = subcategories.find((s) => s.id === val);
                      setFormData((prev) => ({
                        ...prev,
                        subcategoryId: val,
                        festivalName: sub?.name || prev.festivalName,
                      }));
                    }}
                    placeholder="Select Subcategory"
                    options={subcategories.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            subcategoryId: sub.id,
                            festivalName: sub.name,
                          }));
                        }}
                        className={`text-[9px] px-2 py-0.5 rounded-md border font-semibold transition ${
                          formData.subcategoryId === sub.id
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sub.name}
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

              {/* Dynamic Levels for Festival / Subcategory */}
              {(() => {
                const availableLevels = getAvailableLevelsForFestival(formData.subcategoryId || formData.festivalName);
                if (availableLevels.length === 0) return null;
                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Competition Level *
                    </label>
                    <CustomSelect
                      value={formData.levelId}
                      onChange={(val) => setFormData({ ...formData, levelId: val })}
                      placeholder={`Select Level (${availableLevels.map((l) => l.name).join(', ')})`}
                      options={availableLevels.map((l) => ({
                        value: l.id,
                        label: `${l.name} (Weight Multiplier: ${l.weightMultiplier}x)`,
                        badge: `${l.weightMultiplier}x`,
                      }))}
                    />
                  </div>
                );
              })()}

              {/* Position & Grade Dropdowns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position Awarded *
                  </label>
                  <CustomSelect
                    value={formData.position}
                    onChange={(val) => setFormData({ ...formData, position: val })}
                    options={[
                      { value: '1st', label: '1st Position / Prize (2x)', badge: '2x' },
                      { value: '2nd', label: '2nd Position / Prize (1.5x)', badge: '1.5x' },
                      { value: '3rd', label: '3rd Position / Prize (1x)', badge: '1x' },
                      { value: 'Participated', label: 'Participated / Qualified' },
                      { value: 'None', label: 'None' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grade <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <CustomSelect
                    value={formData.grade}
                    onChange={(val) => setFormData({ ...formData, grade: val })}
                    placeholder="None / Optional"
                    options={[
                      { value: '', label: 'None / Optional' },
                      { value: 'A+', label: 'A+ Grade' },
                      { value: 'A', label: 'A Grade' },
                      { value: 'B+', label: 'B+ Grade' },
                      { value: 'B', label: 'B Grade' },
                      { value: 'C', label: 'C Grade' },
                    ]}
                  />
                </div>
              </div>

              {/* Direct Score Awarded & Live Calculation Preview */}
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
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              {/* Dynamic Live Points Calculation Preview Card */}
              {(() => {
                const singleScoreVal = Number(formData.score) || 0;
                const singleLevelObj = levels.find((l) => l.id === formData.levelId);
                const singleLevelMult = singleLevelObj ? (singleLevelObj.weightMultiplier || 1.0) : 1.0;
                const singlePrizeMult = formData.position?.startsWith('1') ? 2.0 : formData.position?.startsWith('2') ? 1.5 : formData.position?.startsWith('3') ? 1.0 : 1.0;
                const singleCalculatedFinalPoints = Number((singleScoreVal * singlePrizeMult * singleLevelMult).toFixed(2));

                return (
                  <div className="p-3 bg-gradient-to-r from-rose-50 via-rose-100/40 to-amber-50 rounded-xl border border-rose-200/90 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                        <span>Calculated SPR Score:</span>
                      </span>
                      <span className="text-xs font-black text-rose-700 font-mono">
                        +{formatPoints(singleCalculatedFinalPoints)} Points
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      Formula: <strong className="text-slate-900">{singleScoreVal}</strong> (Score) × <strong className="text-slate-900">{singlePrizeMult}x</strong> ({formData.position || 'Standard'}) {singleLevelObj ? `× ` : ''}{singleLevelObj ? <strong className="text-slate-900">{singleLevelMult}x ({singleLevelObj.name})</strong> : ''} = <strong className="text-rose-700 font-black">+{singleCalculatedFinalPoints} pts</strong>
                    </div>
                  </div>
                );
              })()}

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
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-1.5 disabled:opacity-50 transition active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Recording Award...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-amber-300" />
                      <span>Record Festival Award</span>
                    </>
                  )}
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">Competition Level</label>
                <CustomSelect
                  value={editFormData.levelId}
                  onChange={(val) => setEditFormData({ ...editFormData, levelId: val })}
                  options={levels.map((l) => ({
                    value: l.id,
                    label: `${l.name} (${l.weightMultiplier}x)`,
                    badge: `${l.weightMultiplier}x`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Position Awarded</label>
                  <CustomSelect
                    value={editFormData.position}
                    onChange={(val) => setEditFormData({ ...editFormData, position: val })}
                    options={[
                      { value: '1st', label: '1st Position (2x)', badge: '2x' },
                      { value: '2nd', label: '2nd Position (1.5x)', badge: '1.5x' },
                      { value: '3rd', label: '3rd Position (1x)', badge: '1x' },
                      { value: 'Participated', label: 'Participated' },
                      { value: 'None', label: 'None' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grade</label>
                  <CustomSelect
                    value={editFormData.grade}
                    onChange={(val) => setEditFormData({ ...editFormData, grade: val })}
                    placeholder="None"
                    options={[
                      { value: '', label: 'None' },
                      { value: 'A+', label: 'A+ Grade' },
                      { value: 'A', label: 'A Grade' },
                      { value: 'B+', label: 'B+ Grade' },
                      { value: 'B', label: 'B Grade' },
                      { value: 'C', label: 'C Grade' },
                    ]}
                  />
                </div>
              </div>

              {/* Dynamic Live Points Calculation Preview in Edit Modal */}
              {(() => {
                const editScoreVal = Number(editFormData.obtainedScore) || 0;
                const editLevelObj = levels.find((l) => l.id === editFormData.levelId);
                const editLevelMult = editLevelObj ? (editLevelObj.weightMultiplier || 1.0) : 1.0;
                const editPrizeMult = editFormData.position?.startsWith('1') ? 2.0 : editFormData.position?.startsWith('2') ? 1.5 : editFormData.position?.startsWith('3') ? 1.0 : 1.0;
                const editCalculatedFinalPoints = Number((editScoreVal * editPrizeMult * editLevelMult).toFixed(2));

                return (
                  <div className="p-2.5 bg-gradient-to-r from-rose-50 to-amber-50 rounded-xl border border-rose-200 text-[10px] space-y-0.5">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Calculated Result Preview:</span>
                      <span className="font-mono text-rose-700 font-black text-xs">+{formatPoints(editCalculatedFinalPoints)} pts</span>
                    </div>
                    <div className="text-slate-600">
                      {editScoreVal} × {editPrizeMult}x ({editFormData.position || 'Standard'}) {editLevelObj ? `× ${editLevelMult}x (${editLevelObj.name})` : ''} = <strong className="text-rose-700 font-bold">{editCalculatedFinalPoints} pts</strong>
                    </div>
                  </div>
                );
              })()}

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

            {modalDeleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalDeleteError}</span>
              </div>
            )}

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
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting {selectedRecordIds.length} Score(s)...</span>
                  </>
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
