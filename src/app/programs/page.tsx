'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Medal,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Building,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  Sparkles,
  Award,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import { getAcademicMasterData } from '@/lib/academic-client';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';

interface DynamicActivity {
  id: string;
  name: string;
  maxScore: number;
}

export default function ProgramsPage() {
  const [levels, setLevels] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Score Entry Modal (Single Entry)
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    studentId: '',
    programName: 'Madin Excellence Talent Olympiad 2026',
    competitionName: 'English Elocution & Public Speaking',
    position: '1st',
    grade: '',
    score: '90',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ obtainedScore: 0, maxScore: 50, remarks: '', levelId: '', position: '', grade: '' });

  // --- MULTI-ACTIVITY DYNAMIC BULK TEMPLATE & UPLOAD STATES ---
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkProgramName, setBulkProgramName] = useState('Madin Excellence Talent Olympiad 2026');
  const [bulkLevelId, setBulkLevelId] = useState<string>('');
  const [bulkClassId, setBulkClassId] = useState<string>('');
  const [bulkActivities, setBulkActivities] = useState<DynamicActivity[]>([
    { id: '1', name: 'English Elocution & Speech', maxScore: 50 },
    { id: '2', name: 'National Talent Search Olympiad', maxScore: 100 },
    { id: '3', name: 'Science Model & Innovation', maxScore: 50 },
    { id: '4', name: 'Social Leadership & Project Work', maxScore: 100 },
    { id: '5', name: 'IT & Coding Championship', maxScore: 100 },
  ]);
  const [newActivityInput, setNewActivityInput] = useState('');
  const [newActivityMax, setNewActivityMax] = useState(50);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Recent competition records
  const [recentRecords, setRecentRecords] = useState<any[]>([]);

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

  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);

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
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} score record(s).` });
      fetchData();
    } catch (err: any) {
      const msg = err.message || 'Error bulk deleting records.';
      setModalDeleteError(msg);
      setStatusMsg({ type: 'error', text: msg });
    } finally {
      setBulkDeleting(false);
    }
  };

  const programPresets = [
    'Madin Excellence Talent Olympiad 2026',
    'Campus Leadership & Innovation Expo',
    'Inter-School Science & Tech Fair',
    'Youth Cultural & Sports Meet 2026',
    'National Social Impact Challenge',
  ];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dataMaster, resScores, resStudents] = await Promise.all([
        getAcademicMasterData(),
        fetch('/api/scores?limit=1000'),
        fetch('/api/students?all=true'),
      ]);

      const dataScores = await resScores.json();
      const dataStudents = await resStudents.json();

      if (dataMaster.classes) {
        setClasses(dataMaster.classes);
        if (dataMaster.classes.length > 0) {
          if (!selectedBatch) setSelectedBatch(dataMaster.classes[0].id);
          if (!bulkClassId) setBulkClassId(dataMaster.classes[0].id);
        }
      }
      if (dataMaster.levels) {
        setLevels(dataMaster.levels);
        if (dataMaster.levels.length > 0) {
          if (!bulkLevelId) setBulkLevelId(dataMaster.levels[0].id);
        }
      }
      if (dataStudents.students) {
        setAllStudents(dataStudents.students);
        setStudents(dataStudents.students);
        if (dataStudents.students.length > 0 && !formData.studentId) {
          setFormData((prev) => ({ ...prev, studentId: dataStudents.students[0].id }));
        }
      }
      if (dataScores.records) {
        const progRecords = dataScores.records.filter((r: any) => r.category?.code === 'PROGRAMS');
        setRecentRecords(progRecords);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students for selected batch in Single Entry
  useEffect(() => {
    if (!selectedBatch) return;
    fetch(`/api/students?classId=${selectedBatch}&all=true`)
      .then((res) => res.json())
      .then((data) => {
        if (data.students && data.students.length > 0) {
          setStudents(data.students);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedBatch]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleProgramPreset = (pName: string) => {
    setBulkProgramName(pName);
    if (pName.includes('Talent Olympiad')) {
      setBulkActivities([
        { id: '1', name: 'English Elocution & Speech', maxScore: 50 },
        { id: '2', name: 'National Talent Search Olympiad', maxScore: 100 },
        { id: '3', name: 'General Knowledge & Current Affairs', maxScore: 50 },
        { id: '4', name: 'Analytical Reasoning Test', maxScore: 50 },
      ]);
    } else if (pName.includes('Science & Tech')) {
      setBulkActivities([
        { id: '1', name: 'Science Working Model Exhibition', maxScore: 100 },
        { id: '2', name: 'Coding & Algorithmic Challenge', maxScore: 100 },
        { id: '3', name: 'Robotics & Automation Demo', maxScore: 50 },
        { id: '4', name: 'Scientific Research Poster', maxScore: 50 },
      ]);
    } else if (pName.includes('Leadership')) {
      setBulkActivities([
        { id: '1', name: 'Public Speaking & Parliamentary Debate', maxScore: 100 },
        { id: '2', name: 'Community Social Impact Project', maxScore: 100 },
        { id: '3', name: 'Team Leadership & Initiative', maxScore: 50 },
      ]);
    } else {
      setBulkActivities([
        { id: '1', name: 'Athletic Track Event (100m)', maxScore: 50 },
        { id: '2', name: 'Campus Group Drill & Parade', maxScore: 50 },
        { id: '3', name: 'Table Tennis Tournament', maxScore: 50 },
      ]);
    }
  };

  const handleAddBulkActivity = () => {
    if (!newActivityInput.trim()) return;
    const newAct: DynamicActivity = {
      id: Date.now().toString(),
      name: newActivityInput.trim(),
      maxScore: Number(newActivityMax) || 50,
    };
    setBulkActivities((prev) => [...prev, newAct]);
    setNewActivityInput('');
    setNewActivityMax(50);
  };

  const handleRemoveBulkActivity = (id: string) => {
    setBulkActivities((prev) => prev.filter((a) => a.id !== id));
  };

  // Generate & Download Multi-Activity Excel Template
  const handleGenerateAndDownloadTemplate = async () => {
    if (bulkActivities.length === 0) {
      alert('Please add at least one program activity/competition before generating the bulk template.');
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
      bulkActivities.forEach((act) => {
        const colHeader = `${act.name} (Max: ${act.maxScore})`;
        row[colHeader] = '';
      });
      row['Remarks'] = '';
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program_Results');

    const colWidths = [{ wch: 14 }, { wch: 25 }, { wch: 12 }];
    bulkActivities.forEach(() => colWidths.push({ wch: 30 }));
    colWidths.push({ wch: 20 });
    ws['!cols'] = colWidths;

    const progClean = bulkProgramName.replace(/[^A-Za-z0-9]/g, '_');
    const classNameClean = classes.find((c) => c.id === bulkClassId)?.name?.replace(/\s+/g, '_') || 'Cohort';
    const filename = `SPR_Program_Bulk_Template_${progClean}_${classNameClean}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // Parse and Upload Multi-Activity Excel
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
      const progCat = dataMaster.categories.find((c: any) => c.code === 'PROGRAMS');
      if (!progCat) throw new Error('Programs category missing in system.');

      const firstRow = parsedJson[0];
      const keys = Object.keys(firstRow);
      const activityCols = keys.filter((k) => {
        const lower = k.toLowerCase().trim();
        return !['student id', 'studentid', 'full name', 'fullname', 'name', 'student name', 'class', 'remarks'].includes(lower);
      });

      if (activityCols.length === 0) {
        throw new Error('No activity/competition score columns detected in the Excel header.');
      }

      const uploadRecords = parsedJson.map((row) => {
        const studentId = row['Student ID'] || row['studentId'] || row['StudentID'] || row['Full Name'] || row['fullName'] || row['Name'];
        const programmeScores = activityCols.map((colName) => {
          const maxMatch = colName.match(/\(max:\s*(\d+)\)/i);
          const maxScoreVal = maxMatch ? parseInt(maxMatch[1], 10) : 50;
          const cleanActivityName = colName.replace(/\(max:\s*\d+\)/i, '').trim();

          return {
            competitionName: cleanActivityName,
            festivalName: bulkProgramName,
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
          categoryId: progCat.id,
          levelId: bulkLevelId,
          records: uploadRecords,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Bulk program processing failed.');

      setStatusMsg({
        type: 'success',
        text: `Bulk upload successful: ${json.successCount} program results recorded seamlessly!`,
      });
      setBulkModalOpen(false);
      setBulkFile(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to process bulk upload file.');
    } finally {
      setBulkUploading(false);
    }
  };

  const handleSaveSingleScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const resMaster = await fetch('/api/academic');
      const dataMaster = await resMaster.json();
      const progCat = dataMaster.categories.find((c: any) => c.code === 'PROGRAMS');

      const scoreVal = Number(formData.score) || 0;
      const remarksText = `${formData.programName} - ${formData.competitionName}. ${
        formData.position ? formData.position + ' Position. ' : ''
      }${formData.grade ? formData.grade + ' Grade. ' : ''}${formData.remarks || ''}`.trim();

      const res = await fetch('/api/scores/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: progCat?.id,
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

      setStatusMsg({ type: 'success', text: 'Program competition score saved successfully!' });
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

      setStatusMsg({ type: 'success', text: 'Score record updated successfully.' });
      setEditModalOpen(false);
      fetchData();
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
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/programs-logo.png"
                alt="Programs & Leadership"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                  Campus & Inter-School Events
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
                <span>Programs & Leadership Module</span>
              </h2>
              <p className="text-xs text-slate-500">
                Record ontime scores, generate multi-activity bulk Excel templates, and upload batches seamlessly with level multipliers.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all hover:shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Multi-Activity Bulk Upload</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>Record Single Result</span>
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

        {/* Level Hierarchy Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {levels.map((lvl) => (
            <div key={lvl.id} className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-subtle">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Level {lvl.displayOrder}</div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">{lvl.name}</div>
              <div className="text-[10px] text-amber-700 font-semibold mt-1">×{lvl.weightMultiplier} Mult</div>
            </div>
          ))}
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

        {/* Competition Records Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Recorded Competition Results</span>
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
                  <th className="py-2.5 px-4">Event / Details</th>
                  <th className="py-2.5 px-4">Level</th>
                  <th className="py-2.5 px-4 text-right">Percentage</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading program records..." subtext="Accessing competition data" />
                    </td>
                  </tr>
                ) : recentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No program results logged yet. Click "Record Single Result" or "Multi-Activity Bulk Upload".
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
                          {r.competition?.name || r.remarks || 'Talent Olympiad'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
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

      {/* Record Competition Modal (Single Entry with ontime typing) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Record Program / Competition Result</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSingleScore} className="mt-4 space-y-3.5">
              {/* Searchable Student Select */}
              <div>
                <SearchableStudentSelect
                  students={allStudents.length > 0 ? allStudents : students}
                  value={formData.studentId}
                  onChange={(stId) => setFormData((prev) => ({ ...prev, studentId: stId }))}
                  required
                  label="Select Student *"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Program / Event Name * (Ontime)</label>
                  <input
                    type="text"
                    required
                    value={formData.programName}
                    onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                    placeholder="e.g. Science Olympiad 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Activity / Competition * (Ontime)</label>
                  <input
                    type="text"
                    required
                    value={formData.competitionName}
                    onChange={(e) => setFormData({ ...formData, competitionName: e.target.value })}
                    placeholder="e.g. Elocution & Speech"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Position / Placement</label>
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Score Awarded (0-100) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="1000"
                  required
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                  placeholder="e.g. 90"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Accolades</label>
                <input
                  type="text"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="e.g. Gold Medal Winner / Distinction"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
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
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 disabled:opacity-50 shadow"
                >
                  {saving ? 'Saving...' : 'Save Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Score Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Edit Program Score</h3>
                <div className="text-xs text-slate-500">{editingRecord.student?.fullName}</div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Obtained Score *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={editFormData.obtainedScore}
                    onChange={(e) => setEditFormData({ ...editFormData, obtainedScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Score *</label>
                  <input
                    type="number"
                    required
                    value={editFormData.maxScore}
                    onChange={(e) => setEditFormData({ ...editFormData, maxScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Level Multiplier</label>
                <select
                  value={editFormData.levelId}
                  onChange={(e) => setEditFormData({ ...editFormData, levelId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.weightMultiplier}x)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Feedback</label>
                <input
                  type="text"
                  value={editFormData.remarks}
                  onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
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
                  Update Score
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC MULTI-ACTIVITY BULK UPLOAD MODAL */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Multi-Activity Bulk Template Generator</h3>
                  <p className="text-xs text-slate-500">Configure ontime activities, download Excel template, and bulk upload results</p>
                </div>
              </div>
              <button
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Program Name & Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Program / Event Name (Ontime Typing) *</label>
              <input
                type="text"
                required
                value={bulkProgramName}
                onChange={(e) => setBulkProgramName(e.target.value)}
                placeholder="e.g. Madin Excellence Talent Olympiad 2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
              />
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-semibold text-slate-400">Quick Presets:</span>
                {programPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleProgramPreset(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                      bulkProgramName === preset
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {preset.split(' ')[0]}...
                  </button>
                ))}
              </div>
            </div>

            {/* Target Cohort & Level */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Class / Batch *</label>
                <select
                  value={bulkClassId}
                  onChange={(e) => setBulkClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c._count?.students || 'Class'} Students)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Event Level Multiplier *</label>
                <select
                  value={bulkLevelId}
                  onChange={(e) => setBulkLevelId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} (Multiplier: {l.weightMultiplier}x)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Multi-Activity Builder */}
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Included Activities / Competitions ({bulkActivities.length})</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Each activity will generate a column in the downloaded bulk template</p>
                </div>
              </div>

              {/* Activity Chips List */}
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {bulkActivities.map((act) => (
                  <div
                    key={act.id}
                    className="inline-flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs text-xs"
                  >
                    <span className="font-bold text-slate-800">{act.name}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                      Max {act.maxScore}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBulkActivity(act.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {bulkActivities.length === 0 && (
                  <div className="text-xs text-slate-400 italic py-2">No activities added yet. Add at least one below.</div>
                )}
              </div>

              {/* Add ontime custom activity input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80">
                <input
                  type="text"
                  value={newActivityInput}
                  onChange={(e) => setNewActivityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBulkActivity();
                    }
                  }}
                  placeholder="Type new activity name on-the-fly..."
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-bold text-slate-500">Max:</span>
                  <input
                    type="number"
                    min={1}
                    value={newActivityMax}
                    onChange={(e) => setNewActivityMax(Number(e.target.value))}
                    className="w-16 px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddBulkActivity}
                  className="px-3.5 py-2 bg-madin-900 hover:bg-madin-950 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Activity</span>
                </button>
              </div>
            </div>

            {/* Template Download Button */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h5 className="text-xs font-bold text-emerald-950">Step 1: Download Pre-populated Excel</h5>
                <p className="text-[11px] text-emerald-800">
                  Includes student roster for selected class and headers for all {bulkActivities.length} activities with max marks.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAndDownloadTemplate}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow transition shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Template (.xlsx)</span>
              </button>
            </div>

            {/* Upload Section */}
            <form onSubmit={handleProcessBulkUpload} className="space-y-4 pt-1">
              <div>
                <h5 className="text-xs font-bold text-slate-900 mb-1">Step 2: Upload Completed Spreadsheet</h5>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    required
                    onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-madin-900 file:text-white hover:file:bg-madin-950 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-2">
                    Scores will be saved ontime, creating dynamic activities and recording student marks automatically.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkUploading || !bulkFile}
                  className="px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50 shadow flex items-center space-x-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>{bulkUploading ? 'Processing & Saving Scores...' : 'Upload & Record Multi-Activity Scores'}</span>
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
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedRecordIds.length}</strong> selected program performance score record(s)? Overall institutional standings and student dossiers will update automatically.
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
