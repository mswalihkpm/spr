'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Users,
  Award,
  BookOpen,
  GraduationCap,
  Trophy,
  Sparkles,
  Feather,
  Library,
  ArrowLeft,
  Calendar,
  Building,
  Medal,
  Clock,
  ExternalLink,
  CheckCircle2,
  FileText,
  TrendingUp,
  Printer,
} from 'lucide-react';
import { StudentAvatar } from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [creativeWorks, setCreativeWorks] = useState<any[]>([]);
  const [libraryRecords, setLibraryRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetch(`/api/students/${studentId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Student not found');
        return res.json();
      })
      .then((data) => {
        setProfileData(data.profile);
        setCreativeWorks(data.creativeWorks || []);
        setLibraryRecords(data.libraryRecords || []);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="py-20 flex items-center justify-center">
          <VideoLoader size="xl" text="Loading Student Performance Dossier..." subtext="Accessing SPR Academic Records" />
        </div>
      </AdminLayout>
    );
  }

  if (!profileData) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <p className="text-sm text-slate-600">Student profile not found.</p>
          <button
            onClick={() => router.push('/students')}
            className="mt-4 px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold"
          >
            Back to Directory
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { student, overallSPR, rank, classRank, schoolRank, categoryScores, recentRecords } = profileData;

  const tabs = [
    { id: 'OVERVIEW', name: '360° Performance', icon: Award },
    { id: 'ISLAMIC', name: 'Islamic Studies', icon: BookOpen },
    { id: 'SCHOOL', name: 'School Studies', icon: GraduationCap },
    { id: 'PROGRAMS', name: 'Programs & Events', icon: Trophy },
    { id: 'CREATIVE', name: 'Creative Hub', icon: Sparkles },
    { id: 'LITERARY', name: 'Literary Fest', icon: Feather },
    { id: 'LIBRARY', name: 'Library & Reading', icon: Library },
  ];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/students')}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-slate-400">Student Profile Dossier</span>
          </div>

          <a
            href={`/student/${student.id}?print=true`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Print Official Scorecard</span>
          </a>
        </div>

        {/* Hero Dossier Card */}
        <div className="bg-gradient-to-br from-madin-900 via-madin-950 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-gold-500/20 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Student Info */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <StudentAvatar
                photoUrl={student.photoUrl}
                name={student.fullName}
                size="2xl"
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/25 text-blue-200 border border-blue-400/40 text-xs font-mono font-bold shadow-xs">
                    {student.sprStudentId || 'SPR ID'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-xs font-medium">
                    Division {student.division}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {student.fullName}
                </h1>
                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="font-semibold text-gold-300">{student.class?.name}</span>
                  <span>•</span>
                  <span>{student.school?.name}</span>
                  <span>•</span>
                  <span>AY {student.academicYear?.name}</span>
                </div>
              </div>
            </div>

            {/* Overall SPR Score & Ranks Badge */}
            <div className="flex items-center justify-around md:justify-end gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              {/* Overall SPR */}
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">Overall SPR</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                  {overallSPR}%
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold">Tier 1 Rating</div>
              </div>

              <div className="h-10 w-px bg-white/20" />

              {/* Institutional Rank */}
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Inst. Rank</div>
                <div className="text-xl sm:text-2xl font-black text-gold-400 mt-0.5">
                  #{rank}
                </div>
                <div className="text-[10px] text-slate-400">of {profileData.totalStudentsOverall}</div>
              </div>

              <div className="h-10 w-px bg-white/20" />

              {/* Class Rank */}
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-slate-300 tracking-wider">Class Rank</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  #{classRank}
                </div>
                <div className="text-[10px] text-slate-400">in {student.class?.name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto space-x-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-subtle">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-madin-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-gold-400' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            {/* Category Performance Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {categoryScores.map((cat: any) => (
                <div
                  key={cat.categoryId}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle text-center space-y-1"
                >
                  <div className="text-[11px] font-semibold text-slate-500 truncate">{cat.categoryName}</div>
                  <div className="text-xl font-black text-slate-900">{cat.percentage}%</div>
                  <div className="text-[10px] font-medium text-gold-700 bg-gold-50 py-0.5 rounded">
                    {cat.weight}% Weight
                  </div>
                  <div className="text-[10px] text-slate-400">{cat.recordsCount} records</div>
                </div>
              ))}
            </div>

            {/* Recent Score History Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Recent Performance Assessments</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Assessment / Subject</th>
                      <th className="py-2.5 px-3 text-right">Standardized %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRecords.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          No assessment records logged for this period.
                        </td>
                      </tr>
                    ) : (
                      recentRecords.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(r.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.categoryName}</td>
                          <td className="py-2.5 px-3 text-slate-700">{r.eventName}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-madin-900">{r.percentage}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'CREATIVE' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Creative Hub Literary Submissions</h3>
              <span className="text-xs text-slate-500">{creativeWorks.length} Published Works</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creativeWorks.length === 0 ? (
                <div className="col-span-2 py-8 text-center text-slate-400 text-xs">
                  No creative submissions logged yet.
                </div>
              ) : (
                creativeWorks.map((work) => (
                  <div
                    key={work.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-madin-700 transition-all space-y-2 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                        {work.category?.name || 'Creative'}
                      </span>
                      <span className="text-xs font-bold text-madin-900 bg-gold-50 px-2 py-0.5 rounded border border-gold-200">
                        Score: {work.score}/100 ({work.percentage}%)
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{work.title}</h4>
                    <p className="text-xs text-slate-600 italic line-clamp-2">
                      {work.content || 'Published in MSOE Literary Magazine.'}
                    </p>
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Reviewer: {work.reviewer || 'Editorial Board'}</span>
                      <span>{new Date(work.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'LIBRARY' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kuthbakhana Reading Registry</h3>
                <p className="text-xs text-slate-500">Connected with https://msoelibrary.vercel.app/</p>
              </div>
              <Library className="w-5 h-5 text-purple-600" />
            </div>

            <div className="space-y-3">
              {libraryRecords.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No reading logs synchronized for this student yet.
                </div>
              ) : (
                libraryRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{rec.readingPeriod || 'Term 1'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Total Books Read: <strong>{rec.booksRead}</strong> • Reading Rank: #{rec.readingRank || '—'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-madin-900">{rec.readingScore}%</div>
                      <div className="text-[10px] text-slate-400">Comprehension Score</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(activeTab === 'ISLAMIC' || activeTab === 'SCHOOL' || activeTab === 'PROGRAMS' || activeTab === 'LITERARY') && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {tabs.find((t) => t.id === activeTab)?.name} Subject & Assessment Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Assessment / Subject</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Percentage (100%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentRecords.filter((r: any) =>
                    activeTab === 'ISLAMIC'
                      ? r.categoryName.includes('Islamic')
                      : activeTab === 'SCHOOL'
                      ? r.categoryName.includes('School')
                      : activeTab === 'PROGRAMS'
                      ? r.categoryName.includes('Program')
                      : r.categoryName.includes('Literary')
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400">
                        No specific assessments found in this category.
                      </td>
                    </tr>
                  ) : (
                    recentRecords
                      .filter((r: any) =>
                        activeTab === 'ISLAMIC'
                          ? r.categoryName.includes('Islamic')
                          : activeTab === 'SCHOOL'
                          ? r.categoryName.includes('School')
                          : activeTab === 'PROGRAMS'
                          ? r.categoryName.includes('Program')
                          : r.categoryName.includes('Literary')
                      )
                      .map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{r.eventName}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(r.date).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-madin-900">{r.percentage}%</td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
