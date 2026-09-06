'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  TrendingUp,
  ArrowUpRight,
  PlusCircle,
  FileSpreadsheet,
  Sliders,
  Layers,
  CheckCircle2,
  Calendar,
  Building2,
  ChevronRight,
  Medal,
  RefreshCw,
  Flag,
  AlertCircle,
  Clock,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import VideoLoader from '@/components/ui/VideoLoader';


export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Student Inquiries / Reports
  const [reports, setReports] = useState<any[]>([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('ALL');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await fetch('/api/reports');
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports || []);
        setPendingReportsCount(json.pendingCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchReports();
  }, []);

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      setUpdatingReportId(reportId);
      const res = await fetch('/api/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });
      if (res.ok) {
        fetchReports();
      }
    } catch (err) {
      console.error('Error updating report status:', err);
    } finally {
      setUpdatingReportId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'PENDING') return r.status === 'PENDING';
    if (reportFilter === 'RESOLVED') return r.status === 'RESOLVED';
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Banner & Quick Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gold-100 text-gold-900 border border-gold-300">
                Academic Year 2025–2026
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Term 1 Active
              </span>
              {pendingReportsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1 animate-pulse">
                  <Flag className="w-3 h-3 text-rose-600" />
                  <span>{pendingReportsCount} New Inquiries</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              Institutional Performance Overview
            </h2>
            <p className="text-xs text-slate-500">
              Real-time normalized calculations across all academic, co-curricular, and reading wings.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                fetchAnalytics();
                fetchReports();
              }}
              className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-madin-700' : ''}`} />
            </button>
            <button
              onClick={() => router.push('/students/bulk-import')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Import</span>
            </button>
            <button
              onClick={() => router.push('/students')}
              className="px-3.5 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <PlusCircle className="w-4 h-4 text-gold-400" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Average SPR */}
          <div className="bg-gradient-to-br from-madin-900 to-madin-950 text-white p-5 rounded-2xl shadow-premium border border-gold-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="w-24 h-24" />
            </div>
            <div className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
              Overall Average SPR
            </div>
            <div className="text-3xl sm:text-4xl font-black mt-2 tracking-tight text-white flex items-baseline space-x-1">
              <span>{data?.kpi?.overallAverageSPR ?? '--'}</span>
              <span className="text-xl text-gold-400 font-semibold">%</span>
            </div>
            <div className="text-[11px] text-slate-300 mt-2 flex items-center space-x-1">
              <span className="text-emerald-400 font-medium">Weighted & Normalized</span>
              <span>• Across institution</span>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {data?.kpi?.totalStudents ?? '--'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Active in 5 classes across 5 schools
              </div>
            </div>
          </div>

          {/* Total Performance Records */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Scored Records</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {data?.kpi?.totalPerformanceRecords ?? '--'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Exams, programs, & competitions
              </div>
            </div>
          </div>

          {/* Books Read / Library */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Books Read</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <Library className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                {data?.kpi?.totalBooksRead ?? '--'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Kuthbakhana library integration
              </div>
            </div>
          </div>
        </div>

        {/* Live Student Inquiries & Discrepancy Reports Section */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <Flag className="w-4 h-4 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Student Inquiries & Leaderboard Reports
                </h3>
                {pendingReportsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                    {pendingReportsCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Inquiries and data verification requests submitted by students/users from leaderboard rows.
              </p>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setReportFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  reportFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({reports.length})
              </button>
              <button
                onClick={() => setReportFilter('PENDING')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  reportFilter === 'PENDING' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pending ({pendingReportsCount})
              </button>
              <button
                onClick={() => setReportFilter('RESOLVED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  reportFilter === 'RESOLVED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Resolved ({reports.filter((r) => r.status === 'RESOLVED').length})
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="py-8 flex items-center justify-center">
              <VideoLoader size="sm" text="Loading student inquiries..." subtext="Accessing leaderboard reports" />
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
              No inquiries found in this view. All student reports are up-to-date.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {filteredReports.map((rep) => {
                const isPending = rep.status === 'PENDING';
                const isResolved = rep.status === 'RESOLVED';
                return (
                  <div key={rep.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-slate-50/60 px-2 rounded-xl transition">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-slate-900">{rep.studentName}</span>
                        {rep.className && (
                          <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                            {rep.className}
                          </span>
                        )}
                        {rep.sprScore && (
                          <span className="text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            SPR: {rep.sprScore}%
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isResolved
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {rep.status}
                        </span>
                      </div>

                      <div className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                        "{rep.message}"
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                        <span>Reported by: <strong className="text-slate-600">{rep.reporterName}</strong></span>
                        <span>•</span>
                        <span>{new Date(rep.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {rep.studentId && (
                        <button
                          onClick={() => router.push(`/students/${rep.studentId}`)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition"
                          title="Open student dossier"
                        >
                          <span>Review Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      {isPending ? (
                        <button
                          disabled={updatingReportId === rep.id}
                          onClick={() => handleUpdateReportStatus(rep.id, 'RESOLVED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs transition"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Resolve</span>
                        </button>
                      ) : (
                        <button
                          disabled={updatingReportId === rep.id}
                          onClick={() => handleUpdateReportStatus(rep.id, 'PENDING')}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition"
                        >
                          Mark Pending
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Main 2-Column Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class Performance Comparison Chart (2 cols) */}
          <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Class-wise Performance Average</h3>
                <p className="text-xs text-slate-500">Benchmark comparison across Class 8 to +2</p>
              </div>
              <button
                onClick={() => router.push('/analytics')}
                className="text-xs font-semibold text-madin-700 hover:text-madin-900 flex items-center"
              >
                <span>Deep Analysis</span>
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              {data?.classPerformance && data.classPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.classPerformance} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 12, fill: '#64748B' }} unit="%" />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Average SPR']}
                      contentStyle={{ backgroundColor: '#0A2540', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="averageSPR" radius={[6, 6, 0, 0]}>
                      {data.classPerformance.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={index === data.classPerformance.length - 1 ? '#D4AF37' : '#0A2540'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <VideoLoader size="md" text="Loading performance charts..." subtext="Analyzing SPR benchmarks" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-5 gap-2 pt-2 border-t border-slate-100 text-center">
              {data?.classPerformance?.map((c: any) => (
                <div key={c.id} className="p-2 rounded-xl bg-slate-50">
                  <div className="text-[11px] font-medium text-slate-500 truncate">{c.name}</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900">{c.averageSPR}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Students Live Podium (1 col) */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Medal className="w-4 h-4 text-gold-500" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top Institutional Performers</h3>
                </div>
                <button
                  onClick={() => router.push('/leaderboard')}
                  className="text-xs font-semibold text-madin-700 hover:text-madin-900"
                >
                  All Ranks
                </button>
              </div>

              {loading || !data?.topStudents ? (
                <div className="py-8 flex items-center justify-center">
                  <VideoLoader size="sm" text="Loading top performers..." subtext="Accessing rankings" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data?.topStudents?.map((st: any, idx: number) => {
                    const medalColors = [
                      'bg-amber-100 text-amber-900 border-amber-300 font-bold',
                      'bg-slate-100 text-slate-800 border-slate-300 font-bold',
                      'bg-orange-100 text-orange-900 border-orange-300 font-bold',
                      'bg-slate-50 text-slate-600 border-slate-200',
                      'bg-slate-50 text-slate-600 border-slate-200',
                    ];
                    return (
                      <div
                        key={st.studentId}
                        onClick={() => router.push(`/students/${st.studentId}`)}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 ${
                              medalColors[idx] || 'bg-slate-50'
                            }`}
                          >
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 group-hover:text-blue-600 truncate">
                              {st.name}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {st.className} • {st.schoolName}
                            </div>
                          </div>
                        </div>
                        <div className="text-right pl-2">
                          <div className="text-xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {st.spr}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown & School Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Averages */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Category Averages & Weightings</h3>
                <p className="text-xs text-slate-500">Universal normalized scoring across 6 key modules</p>
              </div>
              <button
                onClick={() => router.push('/weights')}
                className="text-xs font-semibold text-madin-700 hover:text-madin-900 flex items-center"
              >
                <span>Edit Weights</span>
                <Sliders className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>

            {loading || !data?.categoryPerformance ? (
              <div className="py-8 flex items-center justify-center">
                <VideoLoader size="sm" text="Loading category averages..." subtext="Computing weight distributions" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data?.categoryPerformance?.map((cat: any) => (
                  <div
                    key={cat.id}
                    onClick={() => router.push(`/leaderboard?categoryId=${cat.id}`)}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-madin-700 bg-slate-50/50 hover:bg-white cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium truncate">{cat.name}</span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {cat.defaultWeight}% Wt
                      </span>
                    </div>
                    <div className="text-lg font-bold text-slate-900 mt-1.5 group-hover:text-madin-900">
                      {cat.averagePercentage}%
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-madin-900 h-full rounded-full group-hover:bg-gold-500 transition-all"
                        style={{ width: `${Math.min(cat.averagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* School Performance Comparison */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Institutional School Comparison</h3>
                <p className="text-xs text-slate-500">5 participating schools under Madin School of Excellence</p>
              </div>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-100">
              {data?.schoolPerformance?.map((sch: any) => (
                <div key={sch.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{sch.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {sch.studentCount} Students • Top: {sch.topStudent}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-madin-900">{sch.averageSPR}%</div>
                    <div className="text-[10px] text-slate-400">School Avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Matrix */}
        <div className="bg-gradient-to-r from-madin-900 via-madin-800 to-madin-950 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-bold text-white">Need to record scores or import new cohorts?</h3>
            <p className="text-xs text-slate-300">
              Use bulk score entry grids for rapid evaluation across any Islamic or State exam.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => router.push('/academics/islamic')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-colors"
            >
              Islamic Academics
            </button>
            <button
              onClick={() => router.push('/academics/school')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-colors"
            >
              School Academics
            </button>
            <button
              onClick={() => router.push('/creative-hub')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-colors"
            >
              Creative Hub
            </button>
            <button
              onClick={() => router.push('/categories')}
              className="px-3 py-2 rounded-xl bg-gold-500 hover:bg-gold-600 text-madin-950 font-bold text-xs shadow transition-colors"
            >
              + Custom Category
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
