'use client';

import React, { useState, useEffect } from 'react';
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
  Scissors,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Store,
  ShoppingCart,
  QrCode,
} from 'lucide-react';
import CustomSelect from '@/components/ui/CustomSelect';
import { getAcademicMasterData } from '@/lib/academic-client';

interface OfficialPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: any[];
  categories?: any[];
  initialTab?: 'LEADERBOARD' | 'DOSSIERS' | 'ID_CARDS';
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

  // Tab 3: ID Card Filters
  const [idCardClassId, setIdCardClassId] = useState<string>('ALL');
  const [idCardSortBy, setIdCardSortBy] = useState<string>('CLASS_THEN_NAME');
  const [idCardAcademicYear, setIdCardAcademicYear] = useState<string>('2026-27');

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

  const [idCardReportData, setIdCardReportData] = useState<{
    cards: any[];
    count: number;
    className: string;
    sortBy: string;
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
    setActiveTab(initialTab);
  }, [initialTab]);

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
  // Tab 3 Execution: Download All Student 2-Sided ID Cards (Printable Sheets)
  // --------------------------------------------------------------------------
  const handleDownloadIdCards = async () => {
    setIsGenerating(true);
    setProgressPercent(10);
    setProgressStatus('Connecting to institutional ID card generation engine...');

    try {
      const isAllClasses = !idCardClassId || idCardClassId === 'ALL';
      const targetClass = isAllClasses ? null : localClasses.find((c) => c.id === idCardClassId);
      const targetClassName = isAllClasses
        ? 'All Classes (Grouped by Cohort)'
        : targetClass
        ? targetClass.name
        : 'Selected Cohort';

      setProgressPercent(25);
      setProgressStatus(`Fetching students in ${targetClassName}...`);

      const params = new URLSearchParams();
      if (idCardClassId) params.set('classId', idCardClassId);
      if (idCardSortBy) params.set('sortBy', idCardSortBy);

      const res = await fetch(`/api/admin/student-id-cards?${params.toString()}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to retrieve student ID cards.');
      }

      const data = await res.json();
      const cards = data.cards || [];
      if (cards.length === 0) {
        throw new Error(`No active student ID cards found in ${targetClassName}.`);
      }

      setProgressPercent(75);
      setProgressStatus(`Formatting ${cards.length} 2-sided printable sheets...`);
      await new Promise((r) => setTimeout(r, 250));

      setIdCardReportData({
        cards,
        count: cards.length,
        className: targetClassName,
        sortBy: idCardSortBy,
        generatedAt:
          data.generatedAt ||
          new Date().toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }),
      });

      setGeneratedDocType('ID_CARDS');
      setProgressPercent(100);
      setProgressStatus('All 2-sided sheets compiled! Opening print & download dialog...');

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
          }, 200);
        }
      }, 400);
    } catch (err: any) {
      alert(err.message || 'Error compiling student ID cards.');
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
              /* TAB 3: STUDENT ID CARDS (2-SIDED PRINTABLE SHEETS) */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-slate-800/50 border border-sky-200/80 dark:border-slate-700 text-xs text-sky-950 dark:text-sky-300 flex items-start space-x-2.5">
                  <CreditCard className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Batch 2-Sided Student ID Cards (Printable Sheets):</span> Generates high-resolution 2-sided institutional ID card sheets (Front Card, Cut &amp; Fold Guide Line, and Back Card with store credentials). Sorted and grouped by class cohorts, ready to print on card stock or save as a single multi-page PDF.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
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
                      Each sheet includes Front Card, Cut-line guide, &amp; Navy Back Card with high-density QR code.
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2-Sided Sheet Layout &amp; Multi-Page PDF Compilation</span>
                  </div>
                  <p>
                    Each student card pair is formatted on its own page with standard cut-and-fold guide lines, ready for card pouches, lamination, or institutional card printers. Live progress tracking is displayed during generation.
                  </p>
                </div>
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
              disabled={isGenerating}
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
                      : 'Download Student ID Cards (2-Sided PDF)'}
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

          {/* Tab 3: Batch Student ID Cards (2-Sided Printable Sheets) */}
          {generatedDocType === 'ID_CARDS' && idCardReportData && (
            <div className="font-sans text-slate-900">
              {idCardReportData.cards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="id-card-sheet-page"
                  style={{
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                    pageBreakAfter: idx === idCardReportData.cards.length - 1 ? 'auto' : 'always',
                    breakAfter: idx === idCardReportData.cards.length - 1 ? 'auto' : 'page',
                  }}
                >
                  {/* Subtle Page Sequence Indicator */}
                  <div className="w-full max-w-[580px] pb-1 flex items-center justify-between text-[8px] font-mono text-slate-400">
                    <span>Official Student ID Card • Sheet #{idx + 1} of {idCardReportData.count}</span>
                    <span className="font-bold text-slate-600">Cohort: {card.className}</span>
                  </div>

                  {/* =========================================================================
                      FRONT CARD (EXACT REPLICA OF REQUESTED PIXEL-PERFECT SPECIFICATION)
                      ========================================================================= */}
                  <div
                    className="relative w-full max-w-[580px] aspect-[1.586/1] bg-white rounded-2xl shadow-sm border border-sky-200 overflow-hidden text-slate-900 select-none flex flex-col justify-between"
                    style={{
                      background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 50%, #E0F2FE 100%)',
                    }}
                  >
                    {/* Top-Right Decorative Waves */}
                    <div className="absolute top-0 right-0 w-[48%] h-[40%] pointer-events-none overflow-hidden">
                      <svg viewBox="0 0 200 100" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M40 0 C100 0 120 70 200 60 L200 0 Z" fill="#0284C7" opacity="0.9" />
                        <path d="M80 0 C130 0 150 55 200 45 L200 0 Z" fill="#0F172A" />
                      </svg>
                    </div>

                    {/* Bottom Cyan & Navy Curves */}
                    <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none overflow-hidden">
                      <svg viewBox="0 0 600 40" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0 16 C200 -10 400 30 600 12 L600 40 L0 40 Z" fill="#06B6D4" opacity="0.95" />
                        <path d="M0 24 L600 24 L600 40 L0 40 Z" fill="#0A2540" />
                      </svg>
                    </div>

                    {/* Front Header */}
                    <div className="relative z-10 px-5 pt-3 pb-1.5 border-b border-sky-200/60 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-white shadow-2xs border border-sky-200 p-1 flex items-center justify-center shrink-0">
                          <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                          <h3 className="text-xs font-black tracking-tight text-slate-900 leading-tight uppercase font-sans">
                            STUDENT PERFORMANCE RATE
                          </h3>
                          <p className="text-[9px] font-bold text-sky-700 tracking-wide uppercase">
                            {card.schoolName || "GBHSS MALAPPURAM"}
                          </p>
                        </div>
                      </div>

                      {/* Academic Session Badge - 2026-27 */}
                      <div className="text-right shrink-0 pr-3">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-mono font-black text-white bg-slate-900 shadow-2xs">
                          2026-27
                        </span>
                      </div>
                    </div>

                    {/* Front Body */}
                    <div className="relative z-10 px-5 py-1.5 flex items-start gap-4 flex-1 min-h-0">
                      {/* Left Column: Photograph + Strong 8-Digit ID Pill */}
                      <div className="flex flex-col items-center shrink-0 w-[27%]">
                        <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-slate-100 border-2 border-sky-400 shadow-sm relative">
                          {card.photoUrl ? (
                            <img
                              src={card.photoUrl}
                              alt={card.fullName}
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black">
                              <span className="text-lg">
                                {card.fullName
                                  .split(' ')
                                  .slice(0, 2)
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase() || 'ST'}
                              </span>
                              <span className="text-[8px] opacity-75 font-mono">SPR ID</span>
                            </div>
                          )}
                        </div>

                        {/* Strong 8-Digit ID Pill */}
                        <div className="mt-1.5 w-full py-0.5 px-1 rounded-lg bg-slate-900 text-center shadow-xs border border-slate-800">
                          <div className="text-sky-300 font-mono font-black text-xs tracking-wider">
                            {card.eightDigitSprId}
                          </div>
                          <div className="text-[8px] text-slate-400 font-mono font-bold leading-none">
                            SPR ID: {card.sprId}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Info & Positioned Details directly below Class */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                        <div>
                          <h2 className="text-sm font-black text-slate-900 tracking-tight leading-snug truncate uppercase font-sans">
                            {card.fullName}
                          </h2>

                          <div className="mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md bg-sky-100/80 border border-sky-300/80 text-[10px] font-black text-sky-900">
                            <span>Class: {card.className}</span>
                            {card.division && <span className="ml-1">({card.division})</span>}
                          </div>

                          {/* Details Positioned Directly Under Class Badge */}
                          <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-700 font-medium leading-tight">
                            <div className="flex items-center space-x-1.5 truncate">
                              <MapPin className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                              <span className="text-slate-400 text-[8.5px] uppercase font-bold shrink-0">Place:</span>
                              <span className="font-bold text-slate-800 truncate">{card.location || card.place || '—'}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 truncate">
                              <Phone className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                              <span className="text-slate-400 text-[8.5px] uppercase font-bold shrink-0">Phone:</span>
                              <span className="font-bold text-slate-800 font-mono truncate">{card.phone || '—'}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 truncate">
                              <Mail className="w-2.5 h-2.5 text-sky-600 shrink-0" />
                              <span className="text-slate-400 text-[8.5px] uppercase font-bold shrink-0">Email:</span>
                              <span className="font-bold text-slate-800 font-mono truncate">{card.email || '—'}</span>
                            </div>

                            {card.fatherName && card.fatherName !== '—' && (
                              <div className="flex items-center space-x-1.5 truncate">
                                <span className="w-2.5 h-2.5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[7.5px] font-black shrink-0">
                                  P
                                </span>
                                <span className="text-slate-400 text-[8.5px] uppercase font-bold shrink-0">Guardian:</span>
                                <span className="font-bold text-slate-800 truncate">{card.fatherName}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Verified Identity & Large QR Code */}
                        <div className="flex items-end justify-between pt-1 mt-0.5 border-t border-sky-100">
                          <div className="text-[8px] text-slate-500 font-semibold space-y-0.5">
                            <div className="flex items-center space-x-1 text-sky-700 font-bold">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified SPR Identity</span>
                            </div>
                            <p className="font-mono text-[7.5px] text-slate-400">
                              AUTH-REF: {card.qrToken?.substring(0, 16) || 'SECURE-TOKEN'}
                            </p>
                          </div>

                          {/* Enlarged QR Code Frame */}
                          <div className="p-1 rounded-xl bg-white border-2 border-sky-300 shadow-xs shrink-0 flex flex-col items-center">
                            <img
                              src={card.qrDataUrl}
                              alt="Student QR Code"
                              className="w-18 h-18 object-contain"
                            />
                            <span className="text-[7px] font-black text-sky-900 tracking-tighter mt-0.5 uppercase">
                              Scan for Wallet
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Front Footer */}
                    <div className="relative z-10 px-5 py-1 text-white flex items-center justify-between text-[7.5px] font-mono tracking-wider uppercase">
                      <span>OFFICIAL INSTITUTIONAL DIGITAL CREDENTIAL</span>
                      <span className="font-bold text-cyan-300">MADIN SCHOOL OF EXCELLENCE</span>
                    </div>
                  </div>

                  {/* =========================================================================
                      PROFESSIONAL CUT & FOLD GUIDE LINE
                      ========================================================================= */}
                  <div className="w-full max-w-[580px] my-2 py-1 flex items-center justify-between text-slate-400 text-[9px] font-mono">
                    <div className="flex-1 border-b-2 border-dashed border-slate-300" />
                    <div className="px-3 flex items-center space-x-1.5 font-bold uppercase tracking-wider text-slate-500">
                      <Scissors className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cut along dashed line • Fold back-to-back for card pouch</span>
                    </div>
                    <div className="flex-1 border-b-2 border-dashed border-slate-300" />
                  </div>

                  {/* =========================================================================
                      BACK CARD (DEEP NAVY THEME #0A192F WITH STORE USAGE CREDENTIAL)
                      ========================================================================= */}
                  <div
                    className="relative w-full max-w-[580px] aspect-[1.586/1] text-white rounded-2xl shadow-sm border border-sky-900 overflow-hidden select-none flex flex-col justify-between"
                    style={{
                      backgroundColor: '#0A192F',
                      background: '#0A192F',
                      color: '#FFFFFF',
                    }}
                  >
                    {/* Bottom-Left Curved Wave Accents */}
                    <div className="absolute bottom-0 left-0 w-[55%] h-[60%] pointer-events-none overflow-hidden">
                      <svg viewBox="0 0 300 200" className="w-full h-full" preserveAspectRatio="none">
                        <path d="M0 60 C80 120 180 160 300 200 L0 200 Z" fill="#0284C7" opacity="0.6" />
                        <path d="M0 110 C90 140 160 170 250 200 L0 200 Z" fill="#00C9E8" opacity="0.95" />
                      </svg>
                    </div>

                    {/* Back Header */}
                    <div className="relative z-10 px-5 pt-3 flex items-center justify-end">
                      <div className="flex items-center space-x-2 text-right">
                        <div className="leading-tight">
                          <span className="block text-xs font-black text-white">Student</span>
                          <span className="block text-[11px] font-black text-sky-400">
                            Performance Rate
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-sky-950/90 border border-sky-400/50 p-1 flex items-center justify-center">
                          <img src="/logo.png" alt="SPR Logo" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    </div>

                    {/* Back Body: Store graphic + Steps + Important notice */}
                    <div className="relative z-10 px-5 py-1 flex items-center gap-3 flex-1 min-h-0">
                      {/* Store Icon Column */}
                      <div className="flex flex-col items-center justify-center w-[22%] shrink-0 text-center">
                        <div className="w-15 h-15 rounded-xl bg-[#0F274E] border-2 border-sky-400/60 flex flex-col items-center justify-center p-2 shadow-sm">
                          <Store className="w-6 h-6 text-sky-400" />
                          <ShoppingCart className="w-3 h-3 text-white mt-0.5" />
                        </div>
                        <span className="text-[8.5px] font-black text-sky-300 uppercase tracking-wider mt-1">
                          SPR Store
                        </span>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-0.5 self-stretch bg-sky-600/50 my-1 shrink-0" />

                      {/* Right Column: Instructions */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center space-y-1">
                        <div className="inline-flex items-center self-start px-2.5 py-0.5 rounded-full bg-sky-100 text-slate-900 text-[9.5px] font-black uppercase tracking-tight shadow-xs">
                          HOW TO USE AT THE STORE
                        </div>

                        <div className="space-y-0.5 text-[9.5px] text-slate-200">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded-full bg-sky-400 text-slate-950 text-[8.5px] font-black flex items-center justify-center shrink-0">
                              1
                            </span>
                            <span className="truncate">Present your SPR ID Card at the store.</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded-full bg-sky-400 text-slate-950 text-[8.5px] font-black flex items-center justify-center shrink-0">
                              2
                            </span>
                            <span className="truncate">Allow the Store Admin to scan your QR Code.</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded-full bg-sky-400 text-slate-950 text-[8.5px] font-black flex items-center justify-center shrink-0">
                              3
                            </span>
                            <span className="truncate">Your student profile will be displayed automatically.</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="w-3 h-3 rounded-full bg-sky-400 text-slate-950 text-[8.5px] font-black flex items-center justify-center shrink-0">
                              4
                            </span>
                            <span className="truncate">Your available wallet balance is viewed instantly.</span>
                          </div>
                        </div>

                        <div className="p-1.5 rounded-lg bg-[#0F274E]/80 border border-sky-400/50 flex items-start space-x-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-[8.5px] font-black text-sky-300 uppercase">
                              IMPORTANT
                            </div>
                            <p className="text-[8px] text-slate-300 leading-tight">
                              Keep your ID Card safe. Your QR Code provides secure access to your student wallet information at authorized SPR stores.
                            </p>
                          </div>
                        </div>

                        <div className="text-center text-[8.5px] font-bold text-sky-400 tracking-wider">
                          ── ONE CARD • ONE STUDENT • ONE WALLET ──
                        </div>
                      </div>
                    </div>

                    {/* Back Footer */}
                    <div className="relative z-10 px-5 py-2 flex items-center justify-between">
                      <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-lg bg-slate-950/80 border border-sky-400/30">
                        <span className="text-[11px] font-bold text-slate-200">SPR ID :</span>
                        <span className="text-xs font-black text-sky-300 font-mono">
                          {card.sprId}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-sky-400">({card.eightDigitSprId})</span>
                      </div>

                      <div className="text-[8px] font-mono text-slate-400">
                        AUTHORIZED SPR STORE CREDENTIAL
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
