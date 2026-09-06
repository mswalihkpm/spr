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
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';

export default function PublicStudentScorecardPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [profile, setProfile] = useState<any | null>(null);
  const [creativeWorks, setCreativeWorks] = useState<any[]>([]);
  const [libraryRecords, setLibraryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    return isNaN(num) ? '0.0' : num.toFixed(1);
  };

  const formatClassNumber = (val?: string) => {
    if (!val) return '';
    return val.replace(/^(class|std|standard|grade)\s*/i, '').trim();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">Loading Student Performance Dossier...</div>
        </div>
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
            overflow: hidden !important;
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
            max-height: 285mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-4 print:space-y-0 print:m-0 print:p-0">
        {/* Navigation & Action Bar (Hidden on print, in SAME tab) */}
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
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:bg-slate-50 transition hover:scale-105 active:scale-95 btn-interactive"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition hover:scale-105 active:scale-95 btn-interactive"
            >
              <Printer className="w-3.5 h-3.5 text-amber-300" />
              <span>Print Official Scorecard</span>
            </button>
          </div>
        </div>

        {/* Official Scorecard Paper Container (Strictly 1-Page A4 Print Sized) */}
        <div className="scorecard-container bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-4 print:p-0 print:border-none print:shadow-none print:space-y-1.5 animate-zoom-up">
          {/* Top Decreased Header Banner Image Card (Sleek, Compact & Print-Optimized) */}
          <div className="relative rounded-2xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white overflow-hidden p-4 sm:p-5 flex items-center justify-between shadow-md print:p-2.5 print:rounded-xl page-break-avoid">
            <div className="relative z-10 flex items-center space-x-3 print:space-x-2.5">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow print:w-8 print:h-8 print:rounded-lg">
                <Image
                  src="/logo.png"
                  alt="Madin School of Excellence"
                  width={38}
                  height={38}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-300 print:text-[8px]">
                  Madin School of Excellence
                </div>
                <h1 className="text-sm sm:text-lg font-black text-white tracking-tight leading-tight print:text-xs">
                  STUDENTS PERFORMANCE RATE (SPR)
                </h1>
                <div className="text-[10px] sm:text-xs text-blue-100/90 font-medium print:text-[8.5px]">
                  Official Institutional Performance Dossier & Scorecard
                </div>
              </div>
            </div>

            <div className="relative z-10 text-right shrink-0">
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 text-[10px] sm:text-xs font-bold print:text-[8px] print:px-1.5 print:py-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 print:w-2.5 print:h-2.5" />
                <span>Verified Record</span>
              </div>
              <div className="text-[10px] text-blue-200 mt-0.5 font-medium print:text-[8px]">
                Academic Year {student?.academicYear?.name || '2025–2026'}
              </div>
            </div>

            {/* Subtle Watermark in Header Banner */}
            <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10 pointer-events-none print:w-16 print:h-16">
              <Image src="/footer-logo.png" alt="Watermark" width={112} height={112} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Student Profile Overview Card */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-5 print:p-2.5 print:rounded-xl print:space-x-3 page-break-avoid">
            <StudentAvatar
              photoUrl={student?.photoUrl}
              name={student?.fullName || 'Student'}
              size="xl"
              className="w-16 h-16 sm:w-20 sm:h-20 print:w-12 print:h-12"
            />

            <div className="flex-1 text-center sm:text-left space-y-0.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pb-0.5">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-950 border border-blue-300 text-[10px] font-mono font-bold print:text-[8px] print:py-0 shadow-2xs">
                  SPR ID: {student?.sprStudentId || student?.studentId}
                </span>
                {student?.division && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-800 text-[10px] font-semibold print:text-[8px] print:py-0">
                    Division {student?.division}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 print:text-sm leading-tight">{student?.fullName}</h2>
              <div className="text-xs text-slate-600 font-medium print:text-[9.5px]">
                Standard: <span className="font-bold text-slate-900">{formatClassNumber(student?.class?.name)}</span> {student?.division ? `(Division ${student?.division})` : ''}
              </div>
              <div className="text-xs text-slate-600 print:text-[9.5px]">
                School: <span className="font-semibold text-slate-800">{student?.school?.name}</span>
              </div>
            </div>

            {/* Overall Rating Badge */}
            <div className="text-center bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-md min-w-[130px] print:py-1.5 print:px-3 print:rounded-xl print:min-w-[100px]">
              <div className="text-[9px] uppercase font-bold text-blue-100 tracking-wider print:text-[7.5px]">Cumulative SPR</div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 print:text-base">
                {overallSprScore}%
              </div>
              <div className="text-[9px] text-blue-200 font-medium print:text-[8px]">
                Grade: {numericScore >= 90 ? 'A+ (Distinction)' : numericScore >= 80 ? 'A (Excellent)' : 'B+ (Good)'}
              </div>
            </div>
          </div>

          {/* Ranking Statistics */}
          <div className="grid grid-cols-3 gap-3 text-center print:gap-1.5 page-break-avoid">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[11px] text-slate-500 font-medium print:text-[9px]">Class Standing</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 print:text-xs">
                #{profile.classRank || 1}{' '}
                <span className="text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsInClass || 1}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[11px] text-slate-500 font-medium print:text-[9px]">Institutional School Rank</div>
              <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5 print:text-xs">
                #{profile.schoolRank || 1}{' '}
                <span className="text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsInSchool || 1}</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 print:p-1.5 print:rounded-lg">
              <div className="text-[11px] text-slate-500 font-medium print:text-[9px]">Overall Ranking</div>
              <div className="text-lg sm:text-xl font-black text-blue-600 mt-0.5 print:text-xs">
                #{profile.rank || 1}{' '}
                <span className="text-xs text-slate-400 font-normal print:text-[8.5px]">/ {profile.totalStudentsOverall || 1}</span>
              </div>
            </div>
          </div>

          {/* Multi-Wing Category Breakdown Table */}
          <div className="space-y-1.5 print:space-y-1 page-break-avoid">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 print:text-[9.5px]">
              Performance Wing Analysis
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 print:rounded-lg">
              <table className="w-full text-left text-xs print:text-[9.5px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3 print:py-1 print:px-2">Evaluation Wing</th>
                    <th className="py-2.5 px-3 text-center print:py-1 print:px-2">SPR Weight</th>
                    <th className="py-2.5 px-3 text-right print:py-1 print:px-2">Raw Benchmark %</th>
                    <th className="py-2.5 px-3 text-right print:py-1 print:px-2">Weighted Contribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(profile.categoryBreakdown || profile.categoryScores || []).map((cat: any) => {
                    const rawScore = parseFloat(formatScore(cat.score ?? cat.percentage));
                    const weightVal = cat.weight || 0;
                    const weightedContrib = ((rawScore * weightVal) / 100).toFixed(1);
                    return (
                      <tr key={cat.categoryId} className="hover:bg-slate-50">
                        <td className="py-2 px-3 print:py-0.5 print:px-2 font-bold text-slate-900">{cat.categoryName}</td>
                        <td className="py-2 px-3 print:py-0.5 print:px-2 text-center font-semibold text-slate-600">
                          {weightVal}%
                        </td>
                        <td className="py-2 px-3 print:py-0.5 print:px-2 text-right font-bold text-slate-800">
                          {rawScore.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 print:py-0.5 print:px-2 text-right font-extrabold text-blue-700">
                          {weightedContrib}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Published Creative Works & Library Achievements (if available) */}
          {(creativeWorks.length > 0 || libraryRecords.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 print:gap-1.5 page-break-avoid">
              {creativeWorks.length > 0 && (
                <div className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 space-y-1.5 print:p-1.5 print:rounded-lg print:space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-900 flex items-center space-x-1.5 print:text-[8px]">
                    <Sparkles className="w-3 h-3 text-purple-600 print:w-2.5 print:h-2.5" />
                    <span>Creative Hub Works ({creativeWorks.length})</span>
                  </div>
                  <div className="space-y-1 text-xs print:space-y-0.5 print:text-[8.5px]">
                    {creativeWorks.slice(0, 3).map((w) => (
                      <div key={w.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-purple-100 print:p-0.5">
                        <span className="font-bold text-slate-800 text-[11px] truncate print:text-[8.5px]">{w.title}</span>
                        <span className="text-[9px] text-purple-700 font-semibold shrink-0 ml-1 print:text-[8px]">{w.category?.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {libraryRecords.length > 0 && (
                <div className="p-3 rounded-xl bg-teal-50/40 border border-teal-100 space-y-1.5 print:p-1.5 print:rounded-lg print:space-y-0.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-900 flex items-center space-x-1.5 print:text-[8px]">
                    <Library className="w-3 h-3 text-teal-600 print:w-2.5 print:h-2.5" />
                    <span>Digital Library Milestones</span>
                  </div>
                  <div className="space-y-1 text-xs print:space-y-0.5 print:text-[8.5px]">
                    {libraryRecords.slice(0, 3).map((lib) => (
                      <div key={lib.id} className="flex items-center justify-between p-1.5 rounded-lg bg-white border border-teal-100 print:p-0.5">
                        <span className="font-bold text-slate-800 text-[11px] print:text-[8.5px]">{lib.readingPeriod || 'Recent Period'}</span>
                        <span className="text-teal-800 font-extrabold text-[11px] print:text-[8.5px]">{lib.booksRead} Books Read ({lib.readingScore ? `${lib.readingScore.toFixed(0)}%` : '100%'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Official Verification Seal & Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 print:pt-1.5 print:gap-0 print:border-t print:mt-auto page-break-avoid">
            <div>
              <div className="font-bold text-slate-800 text-xs print:text-[9px]">Controller of Examinations & Evaluation</div>
              <div className="text-[11px] print:text-[8px]">Madin School of Excellence</div>
            </div>

            <div className="text-center sm:text-right text-[10px] text-slate-400 print:text-[8px]">
              <div>Official SPR Certified Dossier Record</div>
              <div>Generated: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
