'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import {
  Download,
  FileText,
  CheckCircle2,
  Printer,
  Filter,
  Layers,
  Users,
  Award,
  X,
  Loader2,
  Sparkles,
  Calendar,
  Building,
  GraduationCap,
  Trophy,
  BookOpen,
  CreditCard,
  QrCode,
  ExternalLink,
  CheckSquare,
  Search,
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import { getAcademicMasterData } from '@/lib/academic-client';

interface OfficialPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: any[];
  categories?: any[];
  initialTab?: 'LEADERBOARD' | 'DOSSIERS' | 'ID_CARDS';
  selectedStudentIds?: string[];
  selectedStudentLabel?: string;
}

function formatClassNumber(className?: string): string {
  if (!className) return '';
  return className.replace(/^class\s*/i, '').trim();
}

export default function OfficialPdfExportModal({
  isOpen,
  onClose,
  classes = [],
  categories = [],
  initialTab = 'LEADERBOARD',
  selectedStudentIds,
  selectedStudentLabel,
}: OfficialPdfExportModalProps) {
  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'DOSSIERS' | 'ID_CARDS'>(initialTab);
  const [localClasses, setLocalClasses] = useState<any[]>(classes);
  const [localCategories, setLocalCategories] = useState<any[]>(categories);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Tab 1: Leaderboard Filters
  const [lbType, setLbType] = useState<string>('OVERALL');
  const [lbClassId, setLbClassId] = useState<string>('');
  const [lbCategoryId, setLbCategoryId] = useState<string>('');
  const [lbAcademicYear, setLbAcademicYear] = useState<string>('2025-2026');

  // Tab 2: Dossier Filters
  const [dossierClassId, setDossierClassId] = useState<string>(classes[0]?.id || '');
  const [dossierAcademicYear, setDossierAcademicYear] = useState<string>('2025-2026');

  // Tab 3: ID Card Filters, Multi-Student Selection & Generated A4 PDF State
  const [idCardClassId, setIdCardClassId] = useState<string>('ALL');
  const [idCardSortBy, setIdCardSortBy] = useState<string>('CLASS_THEN_NAME');
  const [idCardAcademicYear, setIdCardAcademicYear] = useState<string>('2026-27');
  const [idCardSelectionMode, setIdCardSelectionMode] = useState<'CLASS' | 'STUDENTS'>(
    selectedStudentIds && selectedStudentIds.length > 0 ? 'STUDENTS' : 'CLASS'
  );
  const [manualStudentIds, setManualStudentIds] = useState<string[]>(
    selectedStudentIds || []
  );
  const [pickerStudents, setPickerStudents] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerClassFilter, setPickerClassFilter] = useState<string>('ALL');
  const [idCardPdfUrl, setIdCardPdfUrl] = useState<string | null>(null);
  const [idCardPdfFilename, setIdCardPdfFilename] = useState<string>('');
  const [idCardPdfSummary, setIdCardPdfSummary] = useState<{
    studentCount: number;
    pageCount: number;
    batchLabel: string;
  } | null>(null);

  // Generation & Progress States
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [generatedDocType, setGeneratedDocType] = useState<'LEADERBOARD' | 'DOSSIERS' | 'ID_CARDS' | null>(null);

  // Rendered Data
  const [leaderboardReportData, setLeaderboardReportData] = useState<{
    entries: any[];
    title: string;
    filterSubtitle: string;
    generatedAt: string;
    isClassRanking: boolean;
  } | null>(null);

  const [dossierReportData, setDossierReportData] = useState<{
    students: any[];
    className: string;
    generatedAt: string;
  } | null>(null);

  useEffect(() => {
    if (classes.length > 0) {
      setLocalClasses(classes);
      if (!dossierClassId) setDossierClassId(classes[0].id);
    }
  }, [classes, dossierClassId]);

  useEffect(() => {
    if (categories.length > 0) {
      setLocalCategories(categories);
    }
  }, [categories]);

  useEffect(() => {
    if (isOpen && (localClasses.length === 0 || localCategories.length === 0)) {
      getAcademicMasterData()
        .then((data) => {
          if (data.classes && localClasses.length === 0) {
            setLocalClasses(data.classes);
            if (!dossierClassId && data.classes.length > 0) {
              setDossierClassId(data.classes[0].id);
            }
          }
          if (data.categories && localCategories.length === 0) {
            setLocalCategories(data.categories);
          }
        })
        .catch((err) => console.error('Failed to load academic master data for PDF export modal:', err));
    }
  }, [isOpen, localClasses.length, localCategories.length, dossierClassId]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (selectedStudentIds && selectedStudentIds.length > 0) {
        setManualStudentIds(selectedStudentIds);
        setIdCardSelectionMode('STUDENTS');
      } else {
        setIdCardSelectionMode('CLASS');
      }
    }
  }, [initialTab, selectedStudentIds, isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      activeTab === 'ID_CARDS' &&
      idCardSelectionMode === 'STUDENTS' &&
      pickerStudents.length === 0 &&
      !pickerLoading
    ) {
      let cancelled = false;
      setPickerLoading(true);
      setPickerError(null);
      fetch('/api/students?all=true&minimal=true&status=ACTIVE')
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || 'Failed to load student directory.');
          if (!cancelled) {
            setPickerStudents(Array.isArray(data.students) ? data.students : []);
          }
        })
        .catch((err: any) => {
          if (!cancelled) {
            setPickerError(err.message || 'Could not load students for selection.');
          }
        })
        .finally(() => {
          if (!cancelled) setPickerLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
  }, [isOpen, activeTab, idCardSelectionMode, pickerStudents.length, pickerLoading]);

  const manualSelectedSet = useMemo(() => new Set(manualStudentIds), [manualStudentIds]);

  const filteredPickerStudents = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return pickerStudents.filter((st) => {
      if (pickerClassFilter !== 'ALL' && st.classId !== pickerClassFilter) {
        return false;
      }
      if (!q) return true;
      const hay = [
        st.fullName,
        st.sprStudentId,
        st.studentId,
        st.class?.name,
        st.division,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [pickerStudents, pickerClassFilter, pickerSearch]);

  const handleTogglePickerStudent = (id: string) => {
    setManualStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFilteredPicker = () => {
    const filteredIds = filteredPickerStudents.map((s) => s.id).filter(Boolean);
    setManualStudentIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const handleReloadPickerStudents = () => {
    setPickerStudents([]);
    setPickerError(null);
  };

  useEffect(() => {
    return () => {
      if (idCardPdfUrl) {
        URL.revokeObjectURL(idCardPdfUrl);
      }
    };
  }, [idCardPdfUrl]);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // Tab 1 Execution: Download Tabulated Leaderboard PDF
  // --------------------------------------------------------------------------
  const handleDownloadLeaderboard = async () => {
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus('Initializing filters and preparing request...');

    try {
      await new Promise((r) => setTimeout(r, 200));
      setProgressPercent(20);
      setProgressStatus('Querying SPR database for verified standings...');

      const params = new URLSearchParams();
      if (lbType === 'CLASS') {
        params.set('type', 'class');
      } else if (lbCategoryId) {
        params.set('categoryId', lbCategoryId);
      }
      if (lbClassId && lbType !== 'CLASS') {
        params.set('classId', lbClassId);
      }
      params.set('fresh', 'true');

      const res = await fetch(`/api/leaderboard?${params.toString()}`);
      setProgressPercent(55);
      setProgressStatus('Processing official ranks and tie-breaking...');

      if (!res.ok) throw new Error('Failed to retrieve leaderboard records.');
      const data = await res.json();
      const rawEntries = data.leaderboard || [];

      await new Promise((r) => setTimeout(r, 250));
      setProgressPercent(80);
      setProgressStatus('Formatting official tabulated A4 layout...');

      const isClassRanking = lbType === 'CLASS' || data.type === 'CLASS_RANKING';
      const targetClass = localClasses.find((c) => c.id === lbClassId);
      const targetCat = localCategories.find((c) => c.id === lbCategoryId);

      let title = 'Official Tabulated Student Performance Rate (SPR) Standings';
      if (isClassRanking) {
        title = 'Official Inter-Class Championship Standings';
      } else if (targetCat) {
        title = `Official SPR Standings: ${targetCat.name}`;
      }

      let subtitle = 'All Competing Students across Categories';
      if (isClassRanking) {
        subtitle = 'Five Competing Academic Cohorts • Evaluated by Arithmetic Mean';
      } else if (targetClass && targetCat) {
        subtitle = `Class: ${targetClass.name} • Assessment: ${targetCat.name}`;
      } else if (targetClass) {
        subtitle = `Class Cohort: ${targetClass.name}`;
      } else if (targetCat) {
        subtitle = `Evaluation Wing: ${targetCat.name}`;
      }

      setLeaderboardReportData({
        entries: rawEntries,
        title,
        filterSubtitle: subtitle,
        generatedAt: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        isClassRanking,
      });

      setGeneratedDocType('LEADERBOARD');
      setProgressPercent(100);
      setProgressStatus('Document ready! Opening print & download dialog...');

      setTimeout(() => {
        setIsGenerating(false);
        if (typeof document !== 'undefined') {
          document.body.classList.add('spr-printing-official-doc');
          setTimeout(() => {
            window.print();
            const cleanup = () => {
              document.body.classList.remove('spr-printing-official-doc');
              window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(cleanup, 4000);
          }, 150);
        }
      }, 400);
    } catch (err: any) {
      alert(err.message || 'Error compiling leaderboard PDF.');
      setIsGenerating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 2 Execution: Download Class Students Dossiers PDF (Sorted A-Z)
  // --------------------------------------------------------------------------
  const handleDownloadDossiers = async () => {
    setIsGenerating(true);
    setProgressPercent(5);
    setProgressStatus('Fetching enrolled students across selected cohort...');

    try {
      const isAllCohorts = !dossierClassId || dossierClassId === 'ALL';
      const targetClass = isAllCohorts ? null : localClasses.find((c) => c.id === dossierClassId);
      const targetClassName = isAllCohorts ? 'All Students (School-Wide A-Z)' : (targetClass ? targetClass.name : 'Selected Cohort');

      // 1. Fetch active students in class or all
      const url = isAllCohorts
        ? `/api/students?status=ACTIVE&all=true`
        : `/api/students?classId=${dossierClassId}&status=ACTIVE&all=true`;

      const stRes = await fetch(url);
      if (!stRes.ok) throw new Error('Failed to retrieve students in selected cohort.');
      const stData = await stRes.json();
      let enrolled = stData.students || [];

      if (enrolled.length === 0) {
        throw new Error(`No active students found in ${targetClassName}.`);
      }

      // CRITICAL RULE: Sort students strictly alphabetically by fullName A-Z
      enrolled.sort((a: any, b: any) =>
        (a.fullName || '').localeCompare(b.fullName || '', undefined, { sensitivity: 'base' })
      );

      const totalCount = enrolled.length;
      setProgressPercent(15);
      setProgressStatus(`Found ${totalCount} students. Fetching advanced detailed dossiers (Sorted A-Z)...`);

      // 2. Fetch full dossier profiles concurrently in batches of 8 for ultra-fast compilation
      const detailedProfiles: any[] = [];
      const batchSize = 8;
      for (let i = 0; i < enrolled.length; i += batchSize) {
        const chunk = enrolled.slice(i, i + batchSize);
        const results = await Promise.all(
          chunk.map(async (student: any) => {
            try {
              const profRes = await fetch(`/api/public/student/${student.id}`);
              if (profRes.ok) {
                const profData = await profRes.json();
                return {
                  student,
                  profile: profData.profile || null,
                  creativeWorks: profData.creativeWorks || [],
                  libraryRecords: profData.libraryRecords || [],
                };
              }
            } catch {
              // fallback
            }
            return { student, profile: null };
          })
        );
        detailedProfiles.push(...results);
        const currentPct = Math.round(15 + (detailedProfiles.length / totalCount) * 80);
        setProgressPercent(currentPct);
        setProgressStatus(
          `Compiled ${detailedProfiles.length} of ${totalCount} advanced dossiers (${currentPct}%)...`
        );
      }

      setProgressPercent(95);
      setProgressStatus('Compiling multi-page detailed dossier booklet with certified institutional seals...');
      await new Promise((r) => setTimeout(r, 200));

      setDossierReportData({
        students: detailedProfiles,
        className: targetClassName,
        generatedAt: new Date().toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });

      setGeneratedDocType('DOSSIERS');
      setProgressPercent(100);
      setProgressStatus('All advanced dossiers compiled successfully! Opening print dialog...');

      setTimeout(() => {
        setIsGenerating(false);
        if (typeof document !== 'undefined') {
          document.body.classList.add('spr-printing-official-doc');
          setTimeout(() => {
            window.print();
            const cleanup = () => {
              document.body.classList.remove('spr-printing-official-doc');
              window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(cleanup, 4000);
          }, 150);
        }
      }, 400);
    } catch (err: any) {
      alert(err.message || 'Error generating student dossiers.');
      setIsGenerating(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 3 Execution: Download Print-Ready A4 Vector ID Card PDF (5 Students/Page)
  // --------------------------------------------------------------------------
  const handleDownloadIdCards = async () => {
    const usingSelection = idCardSelectionMode === 'STUDENTS';
    if (usingSelection && manualStudentIds.length === 0) {
      alert('Please select at least one student to download ID cards.');
      return;
    }

    setIsGenerating(true);
    setProgressPercent(12);
    setProgressStatus('Preparing print-ready A4 vector ID card generator...');

    try {
      const isAllClasses = !idCardClassId || idCardClassId === 'ALL';
      const targetClass = isAllClasses ? null : localClasses.find((c) => c.id === idCardClassId);
      const targetBatchLabel = usingSelection
        ? selectedStudentLabel && selectedStudentIds?.length === manualStudentIds.length
          ? selectedStudentLabel
          : `${manualStudentIds.length} SELECTED`
        : isAllClasses
        ? 'ALL CLASSES'
        : targetClass
        ? targetClass.name.toUpperCase()
        : 'SELECTED COHORT';

      setProgressPercent(35);
      setProgressStatus(
        usingSelection
          ? `Compiling exact 83.8 x 52.8 mm ID cards for ${manualStudentIds.length} selected student(s)...`
          : `Compiling exact 83.8 x 52.8 mm ID cards for ${targetBatchLabel}...`
      );

      const res = await fetch('/api/admin/student-id-cards/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: usingSelection ? manualStudentIds : undefined,
          classId: usingSelection ? undefined : idCardClassId,
          sortBy: idCardSortBy,
          academicYear: idCardAcademicYear,
          batchLabel: targetBatchLabel,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to generate bulk A4 ID cards PDF.');
      }

      setProgressPercent(82);
      setProgressStatus('Downloading calibrated 210 x 297 mm A4 PDF...');

      const blob = await res.blob();
      const totalStudents = parseInt(res.headers.get('X-Total-Students') || '0', 10) || 1;
      const totalPages =
        parseInt(res.headers.get('X-Total-Pages') || '0', 10) ||
        Math.ceil(totalStudents / 5);

      const disp = res.headers.get('Content-Disposition') || '';
      const fnMatch = disp.match(/filename="?([^"]+)"?/i);
      const filename =
        fnMatch?.[1] ||
        `SPR_Bulk_ID_Cards_A4_${totalStudents}_Students_${new Date().toISOString().slice(0, 10)}.pdf`;

      if (idCardPdfUrl) {
        URL.revokeObjectURL(idCardPdfUrl);
      }
      const nextUrl = URL.createObjectURL(blob);
      setIdCardPdfUrl(nextUrl);
      setIdCardPdfFilename(filename);
      setIdCardPdfSummary({
        studentCount: totalStudents,
        pageCount: totalPages,
        batchLabel: targetBatchLabel,
      });

      const a = document.createElement('a');
      a.href = nextUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      setGeneratedDocType('ID_CARDS');
      setProgressPercent(100);
      setProgressStatus(
        `A4 PDF ready! Downloaded ${totalStudents} student(s) across ${totalPages} A4 page(s).`
      );
      setTimeout(() => {
        setIsGenerating(false);
      }, 300);
    } catch (err: any) {
      alert(err.message || 'Error compiling bulk A4 student ID cards PDF.');
      setIsGenerating(false);
    }
  };

  return (
    <>
      {/* Strict Print Studio Styling for Clean A4 Vector PDF Generation Without Background Dashboard Artifacts */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 8mm 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* Strictly hide all background dashboard content, navbar, footers, and modals */
          body.spr-printing-official-doc > *:not(#spr-official-print-root),
          body.spr-printing-official-doc nav,
          body.spr-printing-official-doc header,
          body.spr-printing-official-doc footer,
          body.spr-printing-official-doc aside,
          body.spr-printing-official-doc .export-modal-overlay {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            max-height: 0 !important;
            overflow: hidden !important;
            position: absolute !important;
            top: -99999px !important;
            left: -99999px !important;
          }
          #spr-official-print-root {
            display: block !important;
            visibility: visible !important;
            position: relative !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          #spr-official-print-root * {
            visibility: visible !important;
          }
          .export-modal-overlay {
            display: none !important;
          }
          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }
          .page-break-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .dossier-card-page {
            min-height: 265mm !important;
            max-height: 275mm !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            page-break-after: always !important;
            overflow: hidden !important;
          }
          .dossier-card-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
          .id-card-sheet-page {
            min-height: 270mm !important;
            max-height: 285mm !important;
            box-sizing: border-box !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            break-after: page !important;
            page-break-after: always !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            padding: 4mm 6mm !important;
            background: white !important;
          }
          .id-card-sheet-page:last-child {
            break-after: auto !important;
            page-break-after: auto !important;
          }
          .print-id-card-qr-img {
            width: 154px !important;
            height: 154px !important;
            max-width: 154px !important;
            max-height: 154px !important;
            object-fit: contain !important;
          }
          .print-id-card-qr-box {
            width: 174px !important;
            min-width: 174px !important;
            max-width: 174px !important;
            box-sizing: border-box !important;
          }
          table {
            display: table !important;
            width: 100% !important;
          }
          thead {
            display: table-header-group !important;
          }
          tbody {
            display: table-row-group !important;
          }
          tr {
            display: table-row !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          th, td {
            display: table-cell !important;
          }
        }
      `}</style>

      {/* Interactive Modal UI */}
      <div className="fixed inset-0 z-[150] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in export-modal-overlay">
        <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-scale-in">
          {/* Modal Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-xs">
                <Printer className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Official Records &amp; PDF Download Center
                </h3>
                <p className="text-xs text-blue-200 font-medium">
                  High-fidelity A4 tabulated standings &amp; comprehensive student dossiers
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="p-1.5 text-white/80 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented Mode Selector */}
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Tabulated Standings (PDF)</span>
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setActiveTab('DOSSIERS')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === 'DOSSIERS'
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Class Student Dossiers (PDF)</span>
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setActiveTab('ID_CARDS')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
                activeTab === 'ID_CARDS'
                  ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-4 h-4 text-sky-600" />
              <span>Student ID Cards (2-Sided)</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            {activeTab === 'LEADERBOARD' ? (
              /* TAB 1: TABULATED LEADERBOARD */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-slate-800/50 border border-blue-200/80 dark:border-slate-700 text-xs text-blue-900 dark:text-blue-300 flex items-start space-x-2.5">
                  <Filter className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tabulated Leaderboard PDF Report:</span> Generates a certified, official A4 table matching your exact filter selection. Includes ranks, student identifiers, class cohorts, and category breakdowns.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Standings Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Standings View
                    </label>
                    <CustomSelect
                      value={lbType}
                      onChange={(val) => setLbType(val)}
                      options={[
                        { value: 'OVERALL', label: 'Overall Student Leaderboard' },
                        { value: 'CLASS', label: 'Class Champions Inter-Class' },
                        { value: 'CATEGORY', label: 'Specific Category Wing' },
                      ]}
                    />
                  </div>

                  {/* Academic Year */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Academic Year
                    </label>
                    <CustomSelect
                      value={lbAcademicYear}
                      onChange={(val) => setLbAcademicYear(val)}
                      options={[
                        { value: '2025-2026', label: 'Academic Year 2025-2026 (Current)' },
                        { value: 'ALL', label: 'All Recorded Years' },
                      ]}
                    />
                  </div>

                  {/* Class Filter */}
                  {lbType !== 'CLASS' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Filter by Class
                      </label>
                      <CustomSelect
                        value={lbClassId}
                        onChange={(val) => setLbClassId(val)}
                        options={[
                          { value: '', label: 'All Competing Classes' },
                          ...localClasses.map((c) => ({
                            value: c.id,
                            label: c.name,
                          })),
                        ]}
                      />
                    </div>
                  )}

                  {/* Category Filter */}
                  {lbType === 'CATEGORY' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Evaluation Category Wing
                      </label>
                      <CustomSelect
                        value={lbCategoryId}
                        onChange={(val) => setLbCategoryId(val)}
                        options={[
                          { value: '', label: 'Select Category Wing...' },
                          ...localCategories.map((c) => ({
                            value: c.id,
                            label: c.name,
                          })),
                        ]}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : activeTab === 'DOSSIERS' ? (
              /* TAB 2: CLASS STUDENT DOSSIERS */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-slate-800/50 border border-indigo-200/80 dark:border-slate-700 text-xs text-indigo-900 dark:text-indigo-300 flex items-start space-x-2.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Batch Student Dossiers (Sorted A-Z):</span> Downloads the complete official scorecard dossiers for all students in the selected class cohort. Every student receives a full official dossier page sorted strictly in alphabetical order from A to Z.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Target Class Cohort
                    </label>
                    <CustomSelect
                      value={dossierClassId}
                      onChange={(val) => setDossierClassId(val)}
                      options={[
                        { value: 'ALL', label: 'All Students Across School (A-Z Overall)' },
                        ...localClasses.map((c) => ({
                          value: c.id,
                          label: `${c.name} (${c.numericGrade ? `Grade ${c.numericGrade}` : 'Cohort'})`,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Academic Year
                    </label>
                    <CustomSelect
                      value={dossierAcademicYear}
                      onChange={(val) => setDossierAcademicYear(val)}
                      options={[
                        { value: '2025-2026', label: 'Academic Year 2025-2026' },
                      ]}
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Automated A-Z Sorting &amp; Real-Time Tracking</span>
                  </div>
                  <p>
                    All students are automatically arranged alphabetically by full name (A to Z). Live fetching percentage progress will be displayed continuously until all dossiers are fully generated.
                  </p>
                </div>
              </div>
            ) : (
              /* TAB 3: A4 BULK STUDENT ID CARDS (5 STUDENTS PER A4 PAGE • EXACT 83.8 x 52.8 MM) */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/50 border border-sky-200/80 dark:border-slate-700 text-xs text-sky-950 dark:text-sky-300 flex items-start space-x-2.5">
                  <CreditCard className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Print-Ready A4 Bulk ID Card PDF (5 Students / Page):</span> Generates a millimeter-calibrated vector A4 Portrait PDF (210 x 297 mm). Each sheet places <strong className="font-bold">5 Front Cards (Left Column)</strong> aligned horizontally with their matched <strong className="font-bold">5 Back Cards (Right Column)</strong> at an exact card dimension of <strong className="font-bold">83.8 x 52.8 mm</strong>.
                  </div>
                </div>

                {/* Scope Mode Switcher: By Class Cohort vs Select Multiple Students */}
                <div className="p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setIdCardSelectionMode('CLASS')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      idCardSelectionMode === 'CLASS'
                        ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>By Class Cohort (All / Single)</span>
                  </button>
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setIdCardSelectionMode('STUDENTS')}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer ${
                      idCardSelectionMode === 'STUDENTS'
                        ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>
                      Select Multiple Students
                      {manualStudentIds.length > 0 ? ` (${manualStudentIds.length})` : ''}
                    </span>
                  </button>
                </div>

                {idCardSelectionMode === 'STUDENTS' && (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Search by student name, SPR ID, class..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                      </div>

                      <div className="w-44">
                        <CustomSelect
                          value={pickerClassFilter}
                          onChange={(val) => setPickerClassFilter(val)}
                          options={[
                            { value: 'ALL', label: 'All Classes' },
                            ...localClasses.map((c) => ({
                              value: c.id,
                              label: c.name,
                            })),
                          ]}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {manualStudentIds.length} student(s) selected
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 font-semibold">
                          {Math.ceil(manualStudentIds.length / 5)} A4 page{Math.ceil(manualStudentIds.length / 5) === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          disabled={pickerLoading || filteredPickerStudents.length === 0}
                          onClick={handleSelectAllFilteredPicker}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sky-700 dark:text-sky-300 font-bold hover:bg-sky-50 transition disabled:opacity-50 cursor-pointer"
                        >
                          Select Filtered ({filteredPickerStudents.length})
                        </button>
                        {manualStudentIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setManualStudentIds([])}
                            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 transition cursor-pointer"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>

                    {pickerError ? (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                        <span>{pickerError}</span>
                        <button
                          type="button"
                          onClick={handleReloadPickerStudents}
                          className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 font-bold"
                        >
                          Retry
                        </button>
                      </div>
                    ) : pickerLoading ? (
                      <div className="py-6 flex items-center justify-center space-x-2 text-xs text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                        <span>Loading active students...</span>
                      </div>
                    ) : filteredPickerStudents.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-500">
                        No students matched your search/class filter.
                      </div>
                    ) : (
                      <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPickerStudents.map((st) => {
                          const checked = manualSelectedSet.has(st.id);
                          return (
                            <label
                              key={st.id}
                              className={`px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition ${
                                checked
                                  ? 'bg-sky-50/90 dark:bg-sky-950/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleTogglePickerStudent(st.id)}
                                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 dark:text-white truncate">
                                    {st.fullName}
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 flex items-center space-x-2">
                                    <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                                      {st.sprStudentId || st.studentId || 'SPR ID'}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {st.class?.name || 'Class'} ({st.division || 'A'})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {checked && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white shrink-0">
                                  Selected
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className={idCardSelectionMode === 'STUDENTS' ? 'opacity-50 pointer-events-none' : ''}>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Target Class Cohort
                    </label>
                    <CustomSelect
                      value={idCardClassId}
                      onChange={(val) => setIdCardClassId(val)}
                      options={[
                        { value: 'ALL', label: 'All Classes (Grouped by Class Cohorts)' },
                        ...localClasses.map((c) => ({
                          value: c.id,
                          label: `${c.name} (${c.numericGrade ? `Grade ${c.numericGrade}` : 'Cohort'})`,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Class Sorting &amp; Ordering
                    </label>
                    <CustomSelect
                      value={idCardSortBy}
                      onChange={(val) => setIdCardSortBy(val)}
                      options={[
                        { value: 'CLASS_THEN_NAME', label: 'Class Sequence (+2 to 8) • Student Name (A–Z)' },
                        { value: 'CLASS_THEN_SPR', label: 'Class Sequence (+2 to 8) • SPR ID Number' },
                        { value: 'NAME_ASC', label: 'School-Wide Alphabetical (A–Z Overall)' },
                        { value: 'SPR_ASC', label: 'School-Wide SPR ID Number (Ascending)' },
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Academic Session
                    </label>
                    <CustomSelect
                      value={idCardAcademicYear}
                      onChange={(val) => setIdCardAcademicYear(val)}
                      options={[
                        { value: '2026-27', label: 'Academic Session 2026-27 (Current)' },
                      ]}
                    />
                  </div>

                  <div className="p-3 bg-sky-50/60 dark:bg-slate-800/40 rounded-xl border border-sky-200/80 dark:border-slate-700 text-[11px] text-sky-900 dark:text-sky-300 flex items-center space-x-2">
                    <QrCode className="w-4 h-4 text-sky-600 shrink-0" />
                    <span className="font-semibold">
                      True Vector QR codes, high-res 4:5 photos, Official Seal, &amp; corner cut marks.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Calibrated 5-Per-Page A4 Layout (Print at 100% / Actual Size)</span>
                  </div>
                  <p>
                    Downloads directly as a single multi-page PDF file with zero browser scaling distortion. 5 students fit cleanly on every A4 sheet (Front left, Back right, same horizontal row) with Print Scaling disabled.
                  </p>
                </div>

                {idCardPdfUrl && idCardPdfSummary && (
                  <div className="p-3 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-emerald-900 dark:text-emerald-300">
                      <div className="font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>
                          Downloaded: {idCardPdfSummary.studentCount} student(s) on {idCardPdfSummary.pageCount} A4 page(s)
                        </span>
                      </div>
                      <div className="text-[10.5px] font-mono opacity-80 truncate max-w-[360px]">
                        {idCardPdfFilename}
                      </div>
                    </div>
                    <a
                      href={idCardPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] flex items-center space-x-1.5 hover:bg-emerald-100/70 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open / Print PDF</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Live Progress Bar Container */}
            {isGenerating && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-700 dark:text-blue-400 flex items-center space-x-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{progressStatus}</span>
                  </span>
                  <span className="text-slate-900 dark:text-white font-mono text-sm">
                    {progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                isGenerating ||
                (activeTab === 'ID_CARDS' &&
                  idCardSelectionMode === 'STUDENTS' &&
                  manualStudentIds.length === 0)
              }
              onClick={
                activeTab === 'LEADERBOARD'
                  ? handleDownloadLeaderboard
                  : activeTab === 'DOSSIERS'
                  ? handleDownloadDossiers
                  : handleDownloadIdCards
              }
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow flex items-center space-x-2 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating ({progressPercent}%)...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>
                    {activeTab === 'LEADERBOARD'
                      ? 'Download Tabulated Standings PDF'
                      : activeTab === 'DOSSIERS'
                      ? 'Download Class Dossiers (A-Z) PDF'
                      : idCardSelectionMode === 'STUDENTS'
                      ? `Download ${manualStudentIds.length} Selected ID Card${manualStudentIds.length === 1 ? '' : 's'} (A4 PDF)`
                      : 'Download Bulk ID Cards (A4 PDF)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PRINT DOCUMENT RENDERING CANVAS (Mounted directly to document.body via Portal)
          ========================================================================= */}
      {isMounted && typeof document !== 'undefined' && createPortal(
        <div id="spr-official-print-root" className="hidden print:block print:w-full print:m-0 print:p-0 print:bg-white">
          {generatedDocType === 'LEADERBOARD' && leaderboardReportData && (
            <div className="p-0 font-sans text-slate-900 space-y-4">
              {/* Document Header Banner */}
              <div className="border-b-2 border-slate-800 pb-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 flex items-center justify-center">
                    <Image src="/logo.png" alt="Madin Logo" width={48} height={48} className="object-contain" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      Madin School of Excellence
                    </div>
                    <h1 className="text-base font-black text-slate-950 uppercase tracking-tight">
                      {leaderboardReportData.title}
                    </h1>
                    <div className="text-xs text-slate-600 font-medium">
                      {leaderboardReportData.filterSubtitle} • Academic Year: 2025-2026
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-bold text-emerald-700 uppercase">Certified Official Report</div>
                  <div>Generated: {leaderboardReportData.generatedAt}</div>
                  <div>Total Ranked: {leaderboardReportData.entries.length} Cohorts/Students</div>
                </div>
              </div>

              {/* Tabulated Table */}
              <table className="w-full table-fixed text-left text-[11px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 bg-slate-100 text-slate-800 font-black">
                    <th className="py-2 px-2 w-12 text-center">Rank</th>
                    {leaderboardReportData.isClassRanking ? (
                      <>
                        <th className="py-2 px-3">Class Cohort</th>
                        <th className="py-2 px-3 w-40 text-center">Evaluated Students</th>
                        <th className="py-2 px-3 w-32 text-right">Average SPR %</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 px-2 w-20">SPR ID</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-2 w-20 text-center">Class</th>
                        <th className="py-2 px-3 w-32 text-right">Total SPR Points</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {leaderboardReportData.entries.map((entry, idx) => (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                      <td className="py-2 px-2 text-center font-bold">
                        {entry.rank === 1 ? '🥇 1' : entry.rank === 2 ? '🥈 2' : entry.rank === 3 ? '🥉 3' : entry.rank}
                      </td>
                      {leaderboardReportData.isClassRanking ? (
                        <>
                          <td className="py-2 px-3 font-black text-slate-950">
                            {entry.className}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-700">
                            {entry.totalStudents} Eligible Students (100% evaluated)
                          </td>
                          <td className="py-2 px-3 text-right font-black font-mono text-slate-950">
                            {entry.displayPercentage || `${(entry.averagePercentage ?? entry.spr ?? 0).toFixed(2)}%`}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-2 font-mono text-slate-600 font-semibold text-[10px]">
                            {entry.sprStudentId || entry.studentCode || '—'}
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-950 truncate">
                            {entry.name || entry.studentName}
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-slate-700">
                            {formatClassNumber(entry.className)}
                          </td>
                          <td className="py-2 px-3 text-right font-black font-mono text-slate-950">
                            {entry.spr ?? entry.overallScore} pts
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Official Certification Footer */}
              <div className="pt-6 border-t border-slate-300 flex items-end justify-between text-[10px] text-slate-500 page-break-avoid">
                <div>
                  <div>Madin School of Excellence • Student Performance Rate (SPR) System</div>
                  <div>Automated cryptographic verification and weighted evaluation engine</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="w-32 border-b border-slate-800"></div>
                  <div className="font-bold text-slate-800">Authorized Signatory</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Batch Student Dossiers (Sorted A-Z) - ADVANCED DETAILED DOSSIERS */}
          {generatedDocType === 'DOSSIERS' && dossierReportData && (
            <div className="font-sans text-slate-900">
              {dossierReportData.students.map(({ student, profile, libraryRecords, creativeWorks }, idx) => {
                const numericScore = profile ? (profile.overallScore ?? profile.overallSPR ?? 0) : 0;
                const cats = profile?.categoryBreakdown || profile?.categoryScores || [];
                const subjects = profile?.subjectWiseRecords || [];
                const attendances = profile?.monthlyAttendances || [];
                const corrections = profile?.pointCorrections;

                return (
                  <div key={student.id || idx} className="dossier-card-page p-2 space-y-2.5 flex flex-col justify-between">
                    {/* Top Dossier Header */}
                    <div className="space-y-2.5">
                      <div className="rounded-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-3 flex items-center justify-between page-break-avoid">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
                            <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
                          </div>
                          <div>
                            <div className="text-[8px] font-black uppercase tracking-widest text-amber-300">
                              Madin School of Excellence
                            </div>
                            <h2 className="text-xs font-black text-white leading-tight">
                              Official Student Performance Rate (SPR) Advanced Detailed Dossier
                            </h2>
                            <div className="text-[8px] text-blue-100">
                              Comprehensive 360° Academic &amp; Co-Curricular Evaluation Ledger
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-[8px] text-blue-100">
                          <div className="font-bold text-emerald-300">Certified Official Record</div>
                          <div>Academic Year: 2025-2026</div>
                          <div>Student #{idx + 1} of {dossierReportData.students.length} (Alphabetical A-Z)</div>
                        </div>
                      </div>

                      {/* Student Profile Card */}
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between page-break-avoid">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[9px] font-bold">
                              {student.sprStudentId || 'SPR ID'}
                            </span>
                            {student.studentId && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 text-[9px] font-semibold">
                                ADM: {student.studentId}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-black text-slate-900">{student.fullName}</h3>
                          <div className="text-[10px] text-slate-600 font-medium">
                            Class: <span className="font-bold text-slate-900">{formatClassNumber(student.class?.name || dossierReportData.className)}</span> • Roll No: <span className="font-bold text-slate-900">{student.rollNo || 'N/A'}</span> • School: <span className="font-bold text-slate-900">{student.school?.name || 'Main Campus'}</span>
                          </div>
                        </div>

                        {/* Total Score & Point Corrections */}
                        <div className="text-right bg-blue-600 text-white px-3 py-1.5 rounded-xl min-w-[95px]">
                          <div className="text-[7.5px] uppercase font-bold text-blue-100">Official SPR</div>
                          <div className="text-sm font-black font-mono leading-tight">
                            {profile?.sprPercentage !== undefined && profile?.sprPercentage !== null
                              ? Number(profile.sprPercentage).toFixed(2) + '%'
                              : `${numericScore}%`}
                          </div>
                          <div className="text-[7.5px] text-blue-200 font-mono">
                            Points: {numericScore}
                            {corrections?.added > 0 && ` (+${corrections.added})`}
                            {corrections?.reduced > 0 && ` (-${corrections.reduced})`}
                          </div>
                        </div>
                      </div>

                      {/* Rankings Grid */}
                      {profile && (
                        <div className="grid grid-cols-3 gap-2 text-center page-break-avoid">
                          <div className="p-1 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-[8px] text-slate-500 font-semibold">Class Rank</div>
                            <div className="text-xs font-black text-slate-900">
                              #{profile.classRank || 1} <span className="text-[7.5px] text-slate-400 font-normal">/ {profile.totalStudentsInClass || 1}</span>
                            </div>
                          </div>
                          <div className="p-1 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-[8px] text-slate-500 font-semibold">School Rank</div>
                            <div className="text-xs font-black text-slate-900">
                              #{profile.schoolRank || 1} <span className="text-[7.5px] text-slate-400 font-normal">/ {profile.totalStudentsInSchool || 1}</span>
                            </div>
                          </div>
                          <div className="p-1 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="text-[8px] text-slate-500 font-semibold">Overall Standing</div>
                            <div className="text-xs font-black text-blue-700">
                              #{profile.overallRank ?? profile.rank ?? 1} <span className="text-[7.5px] text-slate-400 font-normal">/ {profile.totalStudentsOverall || 1}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Cumulative Category Breakdown Table */}
                      {cats.length > 0 && (
                        <div className="space-y-1 page-break-avoid">
                          <div className="text-[9.5px] font-black text-slate-900 uppercase tracking-wider">
                            1. Cumulative Category Performance Summary
                          </div>
                          <table className="w-full table-fixed text-left text-[9px] border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                              <tr>
                                <th className="py-0.5 px-2">Category Wing</th>
                                <th className="py-0.5 px-2 w-24 text-center">Records</th>
                                <th className="py-0.5 px-2 w-24 text-center">Weight %</th>
                                <th className="py-0.5 px-2 w-24 text-right">Earned Points</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {cats.map((cat: any, cIdx: number) => (
                                <tr key={cIdx} className={cIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                                  <td className="py-0.5 px-2 font-bold text-slate-900">{cat.categoryName}</td>
                                  <td className="py-0.5 px-2 text-center text-slate-600">{cat.recordsCount || 0} items</td>
                                  <td className="py-0.5 px-2 text-center font-mono text-slate-500">{cat.weight || cat.defaultWeight || '—'}%</td>
                                  <td className="py-0.5 px-2 text-right font-black font-mono text-slate-950">
                                    {cat.earnedPoints || 0} pts
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Detailed Ledger Section 2: Evaluated Academic Subject Scores */}
                      {subjects.length > 0 && (
                        <div className="space-y-1 page-break-avoid">
                          <div className="text-[9.5px] font-black text-slate-900 uppercase tracking-wider">
                            2. Itemized Academic Exam &amp; Subject Evaluations
                          </div>
                          <table className="w-full text-left text-[8.5px] border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 font-bold text-slate-700">
                              <tr>
                                <th className="py-0.5 px-2">Subject Name</th>
                                <th className="py-0.5 px-2">Exam / Assessment</th>
                                <th className="py-0.5 px-2 w-20 text-center">Score</th>
                                <th className="py-0.5 px-2 w-20 text-right">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {subjects.slice(0, 10).map((sub: any, sIdx: number) => (
                                <tr key={sIdx} className={sIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                                  <td className="py-0.5 px-2 font-bold text-slate-900">{sub.subjectName}</td>
                                  <td className="py-0.5 px-2 text-slate-600 truncate max-w-[200px]">{sub.examName || sub.termName || 'Exam'}</td>
                                  <td className="py-0.5 px-2 text-center font-mono text-slate-900 font-bold">{sub.obtainedScore} / {sub.maxScore}</td>
                                  <td className="py-0.5 px-2 text-right font-mono font-bold text-blue-700">{sub.percentage}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Detailed Ledger Section 3: Monthly Attendance & Reading */}
                      {(attendances.length > 0 || (libraryRecords && libraryRecords.length > 0)) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 page-break-avoid">
                          {/* Attendance */}
                          {attendances.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black text-slate-900 uppercase tracking-wider">
                                3. Monthly Attendance Audit
                              </div>
                              <table className="w-full text-left text-[8.5px] border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 font-bold text-slate-700">
                                  <tr>
                                    <th className="py-0.5 px-1.5">Period</th>
                                    <th className="py-0.5 px-1.5 text-center">Rate</th>
                                    <th className="py-0.5 px-1.5 text-right">Points</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {attendances.slice(0, 4).map((att: any, aIdx: number) => (
                                    <tr key={aIdx}>
                                      <td className="py-0.5 px-1.5 text-slate-800">{att.monthName || `Month ${att.month}`} {att.year}</td>
                                      <td className="py-0.5 px-1.5 text-center font-mono font-bold text-slate-900">{att.percentage}%</td>
                                      <td className="py-0.5 px-1.5 text-right font-mono font-bold text-emerald-700">+{att.points} pts</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Library Reading */}
                          {libraryRecords && libraryRecords.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-black text-slate-900 uppercase tracking-wider">
                                4. Library Book Reading
                              </div>
                              <table className="w-full text-left text-[8.5px] border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 font-bold text-slate-700">
                                  <tr>
                                    <th className="py-0.5 px-1.5">Period</th>
                                    <th className="py-0.5 px-1.5 text-center">Books</th>
                                    <th className="py-0.5 px-1.5 text-right">Score</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {libraryRecords.slice(0, 4).map((lib: any, lIdx: number) => (
                                    <tr key={lIdx}>
                                      <td className="py-0.5 px-1.5 text-slate-800">{lib.readingPeriod || 'General'}</td>
                                      <td className="py-0.5 px-1.5 text-center font-mono text-slate-900">{lib.booksRead || 0}</td>
                                      <td className="py-0.5 px-1.5 text-right font-mono font-bold text-teal-700">{lib.readingScore || 0} pts</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Certified Footer */}
                    <div className="pt-2 border-t border-slate-300 flex items-end justify-between text-[8px] text-slate-500 page-break-avoid">
                      <div>
                        <div>Madin School of Excellence • Student Performance Rate (SPR) System</div>
                        <div>Official Verified Document: {dossierReportData.generatedAt}</div>
                      </div>
                      <div className="text-center space-y-0.5">
                        <div className="w-24 border-b border-slate-700"></div>
                        <div className="font-bold text-slate-800">Official Stamp &amp; Signature</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
