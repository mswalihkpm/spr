'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  ArrowLeft,
  Printer,
  Share2,
  CheckCircle2,
  Calendar,
  Building,
  Star,
  Layers,
  FileText,
  ChevronRight,
  Percent,
  Calculator,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';
import PublicFooter from '@/components/layout/PublicFooter';

function formatPoints(pts: number): string {
  if (pts === undefined || pts === null || isNaN(pts)) return '0';
  return Number.isInteger(pts) ? pts.toLocaleString() : pts.toFixed(2).replace(/\.?0+$/, '');
}

export default function PublicStudentScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [profile, setProfile] = useState<any | null>(null);
  const [creativeWorks, setCreativeWorks] = useState<any[]>([]);
  const [libraryRecords, setLibraryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [detailsModalCategory, setDetailsModalCategory] = useState<any | null>(null);
  const [collapsedAssessments, setCollapsedAssessments] = useState<Record<string, boolean>>({});

  const toggleAssessment = (key: string) => {
    setCollapsedAssessments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  useEffect(() => {
    if (!studentId) return;

    setLoading(true);
    fetch(`/api/public/student/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setProfile(data.profile);
          setCreativeWorks(data.creativeWorks || []);
          setLibraryRecords(data.libraryRecords || []);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch student record.');
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  // Set default category on profile load
  useEffect(() => {
    if (profile && !selectedCategoryId) {
      const cats = profile.categoryBreakdown || profile.categoryScores || [];
      const firstWithData = cats.find(
        (c: any) => (c.records && c.records.length > 0) || (c.recordsCount && c.recordsCount > 0) || c.percentage > 0
      );
      if (firstWithData) {
        setSelectedCategoryId(firstWithData.categoryId || firstWithData.categoryCode);
      } else if (cats.length > 0) {
        setSelectedCategoryId(cats[0].categoryId || cats[0].categoryCode);
      }
    }
  }, [profile, selectedCategoryId]);

  const getCategoryIcon = (code?: string) => {
    switch (code) {
      case 'ISLAMIC':
        return BookOpen;
      case 'SCHOOL':
        return GraduationCap;
      case 'QUALIFICATION':
        return Award;
      case 'CREATIVE_HUB':
        return Sparkles;
      case 'LIBRARY':
        return Library;
      case 'LITERARY':
        return Feather;
      case 'PROGRAMS':
        return Trophy;
      default:
        return Award;
    }
  };

  const getCategoryRecords = (cat: any) => {
    if (!cat) return [];
    if (cat.records && cat.records.length > 0) return cat.records;

    if (cat.categoryCode === 'ISLAMIC' || cat.categoryCode === 'SCHOOL') {
      const records = (profile?.subjectWiseRecords || []).filter(
        (r: any) => r.categoryCode === cat.categoryCode || r.categoryName === cat.categoryName
      );
      if (records.length > 0) return records;
    }

    if (cat.categoryCode === 'PROGRAMS' || cat.categoryCode === 'LITERARY') {
      const records = (profile?.programmeWiseRecords || []).filter(
        (r: any) => r.categoryCode === cat.categoryCode || r.categoryName === cat.categoryName
      );
      if (records.length > 0) return records;
    }

    if (cat.categoryCode === 'CREATIVE_HUB' && creativeWorks.length > 0) {
      return creativeWorks.map((w) => ({
        id: w.id,
        title: w.title,
        name: w.title,
        subCategoryName: w.category?.name || 'Creative Submission',
        type: 'CREATIVE',
        publicationStatus: w.publicationStatus,
        rating: w.rating,
        percentage: w.percentage,
        obtainedScore: w.rating ?? w.percentage,
        maxScore: 100,
        remarks: w.description || w.feedback,
        date: w.date,
      }));
    }

    if (cat.categoryCode === 'LIBRARY' && libraryRecords.length > 0) {
      return libraryRecords.map((lib) => ({
        id: lib.id,
        name: lib.readingPeriod || 'Reading Period Milestone',
        readingPeriod: lib.readingPeriod,
        booksRead: lib.booksRead,
        pagesRead: lib.pagesRead,
        type: 'LIBRARY',
        percentage: lib.readingScore,
        readingScore: lib.readingScore,
        obtainedScore: lib.booksRead,
        maxScore: 500,
        remarks: lib.remarks,
        date: lib.createdAt,
      }));
    }

    return [];
  };

  // Auto-launch print dialog if opened with ?print=true
  useEffect(() => {
    if (!loading && profile && typeof window !== 'undefined') {
      const isAutoPrint = new URLSearchParams(window.location.search).get('print') === 'true';
      if (isAutoPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [loading, profile]);

  const formatScore = (val: any) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatClassNumber = (val?: string) => {
    if (!val) return '';
    return val.replace(/^(class|std|standard|grade)\s*/i, '').trim();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <VideoLoader size="xl" text="Loading Student Performance Dossier..." subtext="Accessing SPR Academic Records" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-slate-200 shadow-xl animate-zoom-up">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h3 className="text-lg font-bold text-slate-900">Student Record Not Found</h3>
          <p className="text-xs text-slate-500">{error || 'The requested student record could not be located in the SPR database.'}</p>
          <Link
            href="/"
            className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow hover:bg-blue-700 transition"
          >
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const student = profile.student;
  const overallSprScore = formatScore(profile.overallScore ?? profile.overallSPR);
  const numericScore = parseFloat(overallSprScore);

  const categoriesList = profile.categoryBreakdown || profile.categoryScores || [];
  const activeCategory =
    categoriesList.find((c: any) => c.categoryId === selectedCategoryId || c.categoryCode === selectedCategoryId) ||
    categoriesList[0];
  const activeRecords = getCategoryRecords(activeCategory);
  const ActiveIcon = getCategoryIcon(activeCategory?.categoryCode);
  const activeEarned = activeCategory?.earnedPoints ?? 0;

  // Library category specific extraction for reading milestones table
  const libraryCategory = categoriesList.find((c: any) => c.categoryCode === 'LIBRARY');
  const libraryEarnedPoints = libraryCategory?.earnedPoints ?? (libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans py-6 px-4 sm:px-6 lg:px-8 print:p-0 print:bg-white">
      {/* Global CSS for Strict 1-Page A4 Print */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 5mm 6mm 5mm 6mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0f172a !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .scorecard-container {
            padding: 0 !important;
            margin: 0 auto !important;
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0 print:m-0 print:p-0">
        {/* Navigation & Action Bar (Hidden on print) */}
        <div className="flex items-center justify-between print:hidden animate-slide-down">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition hover:scale-105 active:scale-95 btn-interactive"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Standings</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${student?.fullName} - SPR Scorecard`,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Scorecard URL copied to clipboard!');
                }
              }}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition hover:scale-105 active:scale-95 btn-interactive cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition hover:scale-105 active:scale-95 btn-interactive cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Official Scorecard</span>
            </button>
          </div>
        </div>

        {/* Official Scorecard Paper Container */}
        <div className="scorecard-container bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-3 sm:p-8 space-y-2.5 sm:space-y-4 print:p-0 print:border-none print:shadow-none print:space-y-1.5 animate-zoom-up">
          {/* Top Header Banner Card */}
          <div className="relative rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white overflow-hidden p-2.5 sm:p-5 flex items-center justify-between shadow-md print:p-2.5 print:rounded-xl page-break-avoid">
            <div className="relative z-10 flex items-center space-x-2 sm:space-x-3 print:space-x-2.5">
              <div className="w-7 h-7 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow print:w-8 print:h-8 print:rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Madin School of Excellence"
                  width={38}
                  height={38}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-[7.5px] sm:text-[10px] font-black uppercase tracking-widest text-amber-300 print:text-[8px]">
                  Madin School of Excellence
                </div>
                <h1 className="text-[11px] sm:text-lg font-black text-white tracking-tight leading-tight print:text-xs">
                  STUDENTS PERFORMANCE RATE (SPR)
                </h1>
                <div className="text-[8px] sm:text-xs text-blue-100/90 font-medium print:text-[8.5px]">
                  Official Institutional Performance Dossier & Scorecard
                </div>
              </div>
            </div>

            <div className="relative z-10 text-right shrink-0">
              <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-[8px] sm:text-xs font-bold print:text-[8px] print:px-1.5 print:py-0">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-emerald-400 print:w-2.5 print:h-2.5" />
                <span>Verified</span>
              </div>
              <div className="text-[8px] sm:text-[10px] text-blue-200 mt-0.5 font-medium print:text-[8px]">
                Year {student?.academicYear?.name || '2025–2026'}
              </div>
            </div>

            {/* Subtle Watermark in Header Banner */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 sm:w-28 sm:h-28 opacity-10 pointer-events-none print:w-16 print:h-16">
              <Image src="/footer-logo.png" alt="Watermark" width={112} height={112} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Student Profile Overview Card */}
          <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-2.5 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4 print:p-2.5 print:rounded-xl print:space-x-3 page-break-avoid">
            <StudentAvatar
              photoUrl={student?.photoUrl}
              name={student?.fullName || 'Student'}
              size="lg"
              className="w-12 h-12 sm:w-20 sm:h-20 print:w-12 print:h-12 shrink-0"
            />

            <div className="flex-1 text-center sm:text-left space-y-0.5 min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1 pb-0.5">
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-950 border border-blue-300 text-[8.5px] sm:text-[10px] font-mono font-bold print:text-[8px] print:py-0 shadow-2xs">
                  SPR ID: {student?.sprStudentId || student?.studentId}
                </span>
                {student?.division && (
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200/70 text-slate-800 text-[8.5px] sm:text-[10px] font-semibold print:text-[8px] print:py-0">
                    Div {student?.division}
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-2xl font-black text-slate-900 print:text-sm leading-tight truncate">{student?.fullName}</h2>
              <div className="text-[10px] sm:text-xs text-slate-600 font-medium print:text-[9.5px]">
                Standard: <span className="font-bold text-slate-900">{formatClassNumber(student?.class?.name)}</span> {student?.division ? `(Div ${student?.division})` : ''}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-600 print:text-[9.5px]">
                School: <span className="font-semibold text-slate-800">{student?.school?.name}</span>
              </div>
            </div>

            {/* Overall SPR Score Points Badge */}
            <div className="w-full sm:w-auto text-center bg-blue-600 text-white px-3 py-1.5 sm:px-5 sm:py-3 rounded-lg sm:rounded-2xl shadow-md min-w-[100px] sm:min-w-[120px] print:py-1.5 print:px-3 print:rounded-xl print:min-w-[100px]">
              <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-blue-100 tracking-wider print:text-[7.5px]">TOTAL SPR POINTS</div>
              <div className="text-lg sm:text-3xl font-black text-white mt-0.5 print:text-base font-mono leading-tight">
                {formatPoints(profile.overallScore ?? profile.overallSPR)}
              </div>
              <div className="text-[7.5px] sm:text-[9.5px] text-blue-200 font-medium print:text-[8px]">
                Cumulative Points
              </div>
            </div>
          </div>

          {/* Ranking Statistics */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 text-center print:gap-1.5 page-break-avoid">
            <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium print:text-[9px]">Class Rank</div>
              <div className="text-xs sm:text-xl font-black text-slate-900 mt-0.5 print:text-xs">
                #{profile.classRank || 1}{' '}
                <span className="text-[8.5px] sm:text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsInClass || 1}</span>
              </div>
            </div>
            <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium print:text-[9px]">School Rank</div>
              <div className="text-xs sm:text-xl font-black text-slate-900 mt-0.5 print:text-xs">
                #{profile.schoolRank || 1}{' '}
                <span className="text-[8.5px] sm:text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsInSchool || 1}</span>
              </div>
            </div>
            <div className="p-1.5 sm:p-3 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[9px] sm:text-[11px] text-slate-500 font-medium print:text-[9px]">Overall Rank</div>
              <div className="text-xs sm:text-xl font-black text-blue-600 mt-0.5 print:text-xs">
                #{profile.rank || 1}{' '}
                <span className="text-[8.5px] sm:text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsOverall || 1}</span>
              </div>
            </div>
          </div>

          {/* SECTION 19 & 20: COMPLETE SPR POINTS BREAKDOWN TABLE */}
          <div className="space-y-2.5 print:space-y-1 page-break-avoid">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 print:text-[9.5px] flex items-center space-x-1.5">
                  <Calculator className="w-4 h-4 text-blue-700 print:w-3 print:h-3" />
                  <span>SPR Point Breakdown Matrix</span>
                </h3>
                <p className="text-[10px] text-slate-500 print:hidden font-medium">
                  Authoritative points breakdown across all 7 evaluation domains:
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 print:hidden">
                <span>Pure Unlimited Points</span>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 print:rounded-lg overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs print:text-[9.5px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 print:py-1 print:px-2">Category</th>
                    <th className="py-2.5 px-3 print:py-1 print:px-2">Assessment Records</th>
                    <th className="py-2.5 px-3 text-right print:py-1 print:px-2">Earned SPR Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoriesList.map((cat: any) => {
                    const earned = typeof cat.earnedPoints === 'number' ? cat.earnedPoints : 0;
                    const isSelected =
                      (selectedCategoryId && cat.categoryId === selectedCategoryId) ||
                      cat.categoryCode === selectedCategoryId ||
                      (!selectedCategoryId && activeCategory?.categoryId === cat.categoryId);
                    const IconComp = getCategoryIcon(cat.categoryCode);

                    return (
                      <tr
                        key={cat.categoryId || cat.categoryCode}
                        onClick={() => setSelectedCategoryId(cat.categoryId || cat.categoryCode)}
                        className={`cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? 'bg-blue-50/90 font-semibold text-blue-950 ring-1 ring-inset ring-blue-300'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                        title="Click to view assessment records below"
                      >
                        <td className="py-2.5 px-3 print:py-0.5 print:px-2">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 print:hidden ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-slate-900">{cat.categoryName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 print:py-0.5 print:px-2 font-medium text-slate-700 font-mono">
                          {cat.rawInput || `${cat.recordsCount || 0} record(s)`}
                        </td>
                        <td className="py-2.5 px-3 print:py-0.5 print:px-2 text-right font-black text-blue-800 font-mono text-xs">
                          +{formatPoints(earned)} pts
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-slate-900 font-black uppercase text-xs print:text-[9.5px]">
                      TOTAL CUMULATIVE SPR POINTS
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm text-blue-900 font-mono print:text-xs">
                      {formatPoints(profile.overallScore ?? profile.overallSPR)} PTS
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* SECTION 9: DEDICATED LIBRARY POINTS TABLE */}
          <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4 space-y-2 print:p-2 print:rounded-lg page-break-avoid">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Library className="w-4 h-4 text-teal-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-teal-950 print:text-[9px]">
                  Library &amp; Reading Milestones (Pure Points)
                </h4>
              </div>
              <span className="text-[10.5px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md font-mono print:text-[8px]">
                No Caps • Unlimited Points
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-teal-200 bg-white">
              <table className="w-full text-left text-xs print:text-[9px]">
                <thead className="bg-teal-50/80 border-b border-teal-200 text-teal-900 font-semibold">
                  <tr>
                    <th className="py-2 px-3">Reading Milestone Metric</th>
                    <th className="py-2 px-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-100">
                  <tr>
                    <td className="py-2 px-3 text-slate-700 font-medium">Logged Reading Records</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">{libraryRecords.length} milestones</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-slate-700 font-medium">Books Read Total</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                      {libraryRecords.reduce((acc, r) => acc + (r.booksRead || 0), 0)} Books
                    </td>
                  </tr>
                  <tr className="bg-teal-50/40">
                    <td className="py-2 px-3 font-bold text-teal-950">Accumulated Library SPR Points</td>
                    <td className="py-2 px-3 text-right font-black text-teal-900 font-mono">
                      +{formatPoints(libraryCategory?.earnedPoints ?? libraryRecords.reduce((acc, r) => acc + (r.readingScore || 0), 0))} PTS
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 22: SELECTED CATEGORY ITEMIZATION & VIEW DETAILS */}
          {activeCategory && (
            <div className="rounded-2xl border-2 border-blue-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in page-break-avoid">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <ActiveIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900">
                        {activeCategory.categoryName} Assessment Records
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 font-mono">
                        Points Scoring
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Itemized records evaluated under this category
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                    <div className="text-[9px] uppercase font-bold text-emerald-800">Earned Points</div>
                    <div className="text-base font-black text-emerald-700 font-mono leading-none mt-0.5">
                      +{formatPoints(activeEarned)} pts
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Records Summary Banner */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200/90 text-xs text-blue-950 flex items-center justify-between">
                <span className="font-bold text-blue-950">
                  {activeCategory.categoryName} Evaluated Records
                </span>
                <span className="text-[11px] font-bold text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-lg border border-blue-200">
                  {activeRecords.length} Record{activeRecords.length === 1 ? '' : 's'} Logged
                </span>
              </div>

              {/* Assessment / Context Grouped Box Accordions */}
              <div className="space-y-3">
                {activeRecords.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center mx-auto text-sm font-bold">
                      ℹ️
                    </div>
                    <div className="text-xs font-bold text-slate-700">
                      No assessment records logged yet for {activeCategory.categoryName}.
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Evaluated records for this category will appear here once published.
                    </p>
                  </div>
                ) : (
                  (() => {
                    const groups: { key: string; title: string; records: any[]; assessmentPct: number; totObt: number; totMax: number }[] = [];
                    const map = new Map<string, any[]>();

                    activeRecords.forEach((r: any) => {
                      const contextKey =
                        r.examName ||
                        r.termName ||
                        r.festName ||
                        r.programName ||
                        r.eventName ||
                        r.subCategoryName ||
                        r.categoryName ||
                        'General Assessment';
                      if (!map.has(contextKey)) map.set(contextKey, []);
                      map.get(contextKey)!.push(r);
                    });

                    map.forEach((recs, title) => {
                      const totObt = recs.reduce((acc, curr) => acc + (Number(curr.obtainedScore) || 0), 0);
                      const totMax = recs.reduce((acc, curr) => acc + (Number(curr.maxScore) || 100), 0);
                      const assessmentPct = totMax > 0 ? (totObt / totMax) * 100 : 0;
                      groups.push({ key: title, title, records: recs, assessmentPct, totObt, totMax });
                    });

                    return groups.map((group) => {
                      const isCollapsed = !!collapsedAssessments[group.key];
                      return (
                        <div
                          key={group.key}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs transition duration-200 hover:border-blue-300"
                        >
                          {/* Assessment Header Card (Click to expand/collapse) */}
                          <button
                            type="button"
                            onClick={() => toggleAssessment(group.key)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 via-blue-50/20 to-white hover:bg-blue-50/50 transition cursor-pointer text-left border-b border-slate-100"
                          >
                            <div className="flex items-center space-x-2.5">
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                              </div>
                              <div>
                                <div className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                                  {group.title}
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {group.records.length} {group.records.length === 1 ? 'Subject / Entry' : 'Subjects / Entries'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                  group.assessmentPct >= 85
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : group.assessmentPct >= 70
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {group.assessmentPct.toFixed(1)}%
                              </span>
                              <ChevronRight
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 print:hidden ${
                                  !isCollapsed ? 'rotate-90 text-blue-600' : ''
                                }`}
                              />
                            </div>
                          </button>

                          {/* Collapsible Subjects Table (Always expanded in print) */}
                          <div className={`${isCollapsed ? 'hidden print:block' : 'block'} animate-fade-in`}>
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50/60 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                                <tr>
                                  <th className="py-2 px-4">Subject / Record</th>
                                  <th className="py-2 px-4 text-right">Subject Percentage</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {group.records.map((r: any, rIdx: number) => {
                                  const recordPct = typeof r.percentage === 'number' ? r.percentage : parseFloat(r.percentage || '0');
                                  const displayName =
                                    r.subjectName ||
                                    r.competitionName ||
                                    r.literaryCompetitionName ||
                                    r.title ||
                                    r.readingPeriod ||
                                    r.name ||
                                    'Academic Subject';

                                  const extraDetail =
                                    r.institutionName ||
                                    (r.levelName ? `Level: ${r.levelName}` : null) ||
                                    (r.booksRead !== undefined ? `${r.booksRead} Books Read` : null) ||
                                    (r.publicationStatus ? `Status: ${r.publicationStatus}` : null);

                                  return (
                                    <tr key={r.id || rIdx} className="hover:bg-blue-50/30 transition">
                                      <td className="py-2.5 px-4">
                                        <div className="space-y-0.5">
                                          <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                            {displayName}
                                          </div>
                                          {(r.remarks || extraDetail) && (
                                            <div className="text-[10px] text-slate-500 font-medium">
                                              {r.remarks || extraDetail}
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      <td className="py-2.5 px-4 text-right">
                                        <span
                                          className={`px-2.5 py-1 rounded-md font-mono font-extrabold text-xs inline-block ${
                                            recordPct >= 85
                                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                              : recordPct >= 70
                                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                              : recordPct >= 50
                                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          {recordPct.toFixed(1)}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          )}

          {/* Official Verification Signatures & Stamp Block */}
          <div className="pt-4 border-t border-slate-200 space-y-3 print:pt-2 print:space-y-1.5 page-break-avoid">
            <div className="hidden print:grid grid-cols-3 gap-4 pt-4 pb-1 text-center">
              <div className="space-y-6">
                <div className="h-6"></div>
                <div className="border-t border-slate-400 pt-1 text-[8.5px] font-bold text-slate-800 uppercase tracking-wider">
                  Class Teacher
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-6"></div>
                <div className="border-t border-slate-400 pt-1 text-[8.5px] font-bold text-slate-800 uppercase tracking-wider">
                  Controller of Exams
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-6"></div>
                <div className="border-t border-slate-400 pt-1 text-[8.5px] font-bold text-slate-800 uppercase tracking-wider">
                  Principal & Seal
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 print:pt-1 print:gap-0 print:border-t print:mt-auto">
              <div>
                <div className="font-bold text-slate-800 text-xs print:text-[9px]">Students Performance Rate (SPR) System</div>
                <div className="text-[11px] print:text-[8px]">Madin School of Excellence • Malappuram, Kerala</div>
              </div>

              <div className="text-center sm:text-right text-[10px] text-slate-400 print:text-[8px]">
                <div>Official Certified Academic & Co-Curricular Dossier</div>
                <div>Printed Date: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
