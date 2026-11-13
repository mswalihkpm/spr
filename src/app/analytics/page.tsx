'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  BarChart3,
  Coins,
  Wallet,
  ShoppingBag,
  Receipt,
  Search,
  Filter,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Eye,
  X,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
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
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import VideoLoader from '@/components/ui/VideoLoader';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'ACADEMIC' | 'FUNDS'>('ACADEMIC');

  // Academic Analytics State
  const [academicData, setAcademicData] = useState<any>(null);
  const [loadingAcademic, setLoadingAcademic] = useState(true);

  // Student Funds Analytics State
  const [fundData, setFundData] = useState<any>(null);
  const [loadingFunds, setLoadingFunds] = useState(true);

  // Fund List Controls (Arranged more cash to less by default)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'OFFERED_DESC' | 'OFFERED_ASC' | 'BALANCE_DESC' | 'STORE_DESC' | 'NAME_ASC'>('OFFERED_DESC');

  // Selected Student for Detailed Fund Breakdown Modal
  const [selectedStudentForBreakdown, setSelectedStudentForBreakdown] = useState<any | null>(null);

  // Sync tab from URL query param if present (?tab=funds)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'funds' || tabParam === 'fund' || tabParam === 'cash') {
        setActiveTab('FUNDS');
      }
    }
  }, []);

  // Fetch Academic Analytics
  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => setAcademicData(json))
      .catch((err) => console.error('Academic analytics fetch error:', err))
      .finally(() => setLoadingAcademic(false));
  }, []);

  // Fetch Fund Analytics
  const fetchFundData = () => {
    setLoadingFunds(true);
    fetch('/api/analytics/funds')
      .then((res) => res.json())
      .then((json) => setFundData(json))
      .catch((err) => console.error('Fund analytics fetch error:', err))
      .finally(() => setLoadingFunds(false));
  };

  useEffect(() => {
    fetchFundData();
  }, []);

  // Filter and Sort Student Fund List
  const filteredAndSortedStudents = useMemo(() => {
    if (!fundData?.students || !Array.isArray(fundData.students)) return [];

    let list = fundData.students.filter((s: any) => {
      // Class Filter
      if (selectedClassId !== 'ALL' && s.classId !== selectedClassId) {
        return false;
      }
      // Search Filter (Name, SPR ID, Student ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = s.fullName?.toLowerCase().includes(q);
        const sprMatch = s.sprStudentId?.toLowerCase().includes(q);
        const codeMatch = s.studentId?.toLowerCase().includes(q);
        if (!nameMatch && !sprMatch && !codeMatch) return false;
      }
      return true;
    });

    // Sorting: default is arrangement with more cash to less
    list.sort((a: any, b: any) => {
      if (sortBy === 'OFFERED_DESC') {
        if (b.totalCashOffered !== a.totalCashOffered) return b.totalCashOffered - a.totalCashOffered;
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'OFFERED_ASC') {
        if (a.totalCashOffered !== b.totalCashOffered) return a.totalCashOffered - b.totalCashOffered;
        return a.fullName.localeCompare(b.fullName);
      }
      if (sortBy === 'BALANCE_DESC') {
        if (b.currentWalletBalance !== a.currentWalletBalance) return b.currentWalletBalance - a.currentWalletBalance;
        return b.totalCashOffered - a.totalCashOffered;
      }
      if (sortBy === 'STORE_DESC') {
        if (b.cashToStore !== a.cashToStore) return b.cashToStore - a.cashToStore;
        return b.totalCashOffered - a.totalCashOffered;
      }
      if (sortBy === 'NAME_ASC') {
        return a.fullName.localeCompare(b.fullName);
      }
      return 0;
    });

    return list;
  }, [fundData, searchQuery, selectedClassId, sortBy]);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header & Section Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
                Institutional Analytics &amp; Fund Auditing
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              {activeTab === 'FUNDS' ? (
                <>
                  <Coins className="w-5 h-5 text-emerald-600" />
                  <span>Student Fund &amp; Cash Analysis</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5 text-madin-900" />
                  <span>Multi-Dimensional Performance Analytics</span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {activeTab === 'FUNDS'
                ? 'Detailed cash offered, personal wallet holdings, and store fund contributions for each student.'
                : 'Comparative insights across cohorts, syllabus wings, and institutional schools.'}
            </p>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ACADEMIC')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-2 ${
                activeTab === 'ACADEMIC'
                  ? 'bg-madin-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Academic Analytics</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FUNDS')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-2 ${
                activeTab === 'FUNDS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-300" />
              <span>Student Fund Analysis</span>
              <span className="ml-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/30 text-white">
                Live
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TAB 1: ACADEMIC & SPR PERFORMANCE ANALYTICS                    */}
        {/* ============================================================== */}
        {activeTab === 'ACADEMIC' && (
          <>
            {loadingAcademic ? (
              <div className="py-24 flex items-center justify-center">
                <VideoLoader
                  size="xl"
                  text="Loading Analytics & Performance Metrics..."
                  subtext="Aggregating multi-dimensional student performance analytics and cohort trends"
                  showProgress={true}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Top Summary Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Institutional Average</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{academicData?.kpi?.overallAverageSPR}%</div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Across all cohorts</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled Cohort</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{academicData?.kpi?.totalStudents}</div>
                    <span className="text-[10px] text-slate-500 font-medium">5 Classes in Campus</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Evaluated Records</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{academicData?.kpi?.totalPerformanceRecords}</div>
                    <span className="text-[10px] text-amber-600 font-semibold">Exams, Attendances &amp; Drives</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Published Works</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{academicData?.kpi?.totalCreativeWorks}</div>
                    <span className="text-[10px] text-purple-600 font-semibold">Creative Hub Submissions</span>
                  </div>
                </div>

                {/* 2-Column Comparative Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Class-wise Comparison */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Class-wise Performance Average</h3>
                      <p className="text-xs text-slate-500">Benchmark comparison from Class 8 to Class +2</p>
                    </div>

                    <div className="h-64 w-full">
                      {academicData?.classPerformance ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={academicData.classPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                            <Tooltip
                              formatter={(val: any) => [`${val}%`, 'Average SPR']}
                              contentStyle={{ backgroundColor: '#0A2540', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                            />
                            <Bar dataKey="averageSPR" fill="#0A2540" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <VideoLoader size="md" text="Loading class comparison..." subtext="Analyzing academic cohorts" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* School-wise Comparison */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">School-wise Performance Comparison</h3>
                      <p className="text-xs text-slate-500">Comparing average SPR ratings across schools</p>
                    </div>

                    <div className="h-64 w-full">
                      {academicData?.schoolPerformance ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={academicData.schoolPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: '#64748B' }} unit="%" />
                            <Tooltip
                              formatter={(val: any) => [`${val}%`, 'School Average SPR']}
                              contentStyle={{ backgroundColor: '#0A2540', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                            />
                            <Bar dataKey="averageSPR" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <VideoLoader size="md" text="Loading school comparison..." subtext="Analyzing participating schools" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Radar / Breakdown */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Category Percentage Distribution</h3>
                    <p className="text-xs text-slate-500">Average scores across Islamic, School, Programs, Creative, Literary, and Reading</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
                    {academicData?.categoryPerformance?.map((cat: any) => (
                      <div key={cat.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 truncate">{cat.name}</div>
                        <div className="text-xl font-black text-slate-900">{cat.averagePercentage}%</div>
                        <div className="text-[10px] font-semibold text-gold-700 bg-gold-50 py-0.5 rounded">
                          {cat.defaultWeight}% Weight
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DETAILED STUDENT FUND & CASH ANALYSIS                  */}
        {/* ============================================================== */}
        {activeTab === 'FUNDS' && (
          <>
            {loadingFunds ? (
              <div className="py-24 flex items-center justify-center">
                <VideoLoader
                  size="xl"
                  text="Loading Student Fund Analysis & Ledgers..."
                  subtext="Calculating cash offered, personal wallet balances, and store contributions"
                  showProgress={true}
                />
              </div>
            ) : (
              <div className="space-y-6">
                {/* 4 Primary Institutional Fund KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Cash Offered (Total Lifetime Earnings) */}
                  <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 text-white p-5 rounded-2xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Total Cash Offered</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {fundData?.kpi?.studentsWithEarnings || 0} Students
                      </span>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white mt-2">
                      ₹{Number(fundData?.kpi?.totalCashOffered || 0).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-emerald-200/80 mt-1 font-medium">
                      Lifetime earnings credited from all records on/after Nov 1
                    </p>
                  </div>

                  {/* 2. Total Cash to Store */}
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-5 rounded-2xl border border-indigo-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300 flex items-center space-x-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Cash Contributed to Store</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Campus Store
                      </span>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white mt-2">
                      ₹{Number(fundData?.kpi?.totalCashToStore || 0).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-indigo-200/80 mt-1 font-medium">
                      Student funds transferred for institutional store purchases
                    </p>
                  </div>

                  {/* 3. Current Wallet Balance */}
                  <div className="bg-gradient-to-br from-blue-950 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-blue-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-blue-300 flex items-center space-x-1.5">
                        <Wallet className="w-3.5 h-3.5 text-blue-400" />
                        <span>Current Wallet Balance</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Liquid
                      </span>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white mt-2">
                      ₹{Number(fundData?.kpi?.totalWalletBalance || 0).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-blue-200/80 mt-1 font-medium">
                      Active available balance held in student personal wallets
                    </p>
                  </div>

                  {/* 4. Available Store Fund */}
                  <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-slate-900 text-white p-5 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-300 flex items-center space-x-1.5">
                        <Receipt className="w-3.5 h-3.5 text-amber-400" />
                        <span>Available Store Fund</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Redeemable
                      </span>
                    </div>
                    <div className="text-3xl font-black tracking-tight text-white mt-2">
                      ₹{Number(fundData?.kpi?.totalAvailableStoreFund || 0).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-amber-200/80 mt-1 font-medium">
                      ₹{Number(fundData?.kpi?.totalStoreFundUsed || 0).toFixed(2)} redeemed at campus store
                    </p>
                  </div>
                </div>

                {/* Secondary Visual Charts: Class Fund Comparison & Category Distribution */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Class-wise Cash Offered Breakdown Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                          <BarChart3 className="w-4 h-4 text-emerald-600" />
                          <span>Class-wise Cash Offered &amp; Wallet Holdings</span>
                        </h3>
                        <p className="text-xs text-slate-500">Aggregate funds credited across Class 8, 9, 10, +1, +2</p>
                      </div>
                      <button
                        type="button"
                        onClick={fetchFundData}
                        title="Refresh data"
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="h-64 w-full">
                      {fundData?.classFunds ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={fundData.classFunds} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#64748B' }} unit="₹" />
                            <Tooltip
                              formatter={(val: any, name: any) => [
                                `₹${Number(val).toFixed(2)}`,
                                name === 'totalCashOffered' ? 'Total Cash Offered' : 'Wallet Balance',
                              ]}
                              contentStyle={{ backgroundColor: '#0A2540', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                            />
                            <Bar dataKey="totalCashOffered" name="Cash Offered" fill="#059669" radius={[6, 6, 0, 0]} />
                            <Bar dataKey="totalWalletBalance" name="Wallet Balance" fill="#2563EB" radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <VideoLoader size="md" text="Loading class fund statistics..." />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category-wise Cash Generation */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-subtle space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        <span>Cash by Category</span>
                      </h3>
                      <p className="text-xs text-slate-500">Distribution of cash earned per domain</p>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {fundData?.categoryDistribution?.filter((c: any) => c.amount > 0).length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400">
                          No category earnings recorded yet.
                        </div>
                      ) : (
                        fundData?.categoryDistribution
                          ?.filter((c: any) => c.amount > 0)
                          .sort((a: any, b: any) => b.amount - a.amount)
                          .map((cat: any) => (
                            <div
                              key={cat.code}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition flex items-center justify-between"
                            >
                              <div className="min-w-0 pr-2">
                                <div className="text-xs font-bold text-slate-900 truncate">{cat.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  {Number(cat.points).toFixed(1)} pts
                                </div>
                              </div>
                              <span className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 whitespace-nowrap">
                                ₹{Number(cat.amount).toFixed(2)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* RANKED STUDENT FUND LIST (MORE CASH TO LESS)                  */}
                {/* ============================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
                  {/* Header & Controls Bar */}
                  <div className="p-5 border-b border-slate-100 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                          <Coins className="w-5 h-5 text-emerald-600" />
                          <span>Student Fund Registry &amp; Wallet Breakdown</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Arrangement of students with <strong className="text-emerald-700">more cash to less</strong>. Click any student for detailed activity ledger.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {filteredAndSortedStudents.length} Students Listed
                        </span>
                      </div>
                    </div>

                    {/* Filter & Sort Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                      {/* Search Bar */}
                      <div className="sm:col-span-5 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search student by name, SPR ID (e.g. SPR0102)..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Class Filter Dropdown */}
                      <div className="sm:col-span-3">
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="ALL">All Classes (8 to +2)</option>
                          {fundData?.classes?.map((cls: any) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort Selector */}
                      <div className="sm:col-span-4">
                        <select
                          value={sortBy}
                          onChange={(e: any) => setSortBy(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                        >
                          <option value="OFFERED_DESC">More Cash Offered to Less (Default)</option>
                          <option value="OFFERED_ASC">Less Cash Offered to More</option>
                          <option value="BALANCE_DESC">Highest Current Wallet Balance</option>
                          <option value="STORE_DESC">Highest Cash to Store</option>
                          <option value="NAME_ASC">Student Name (A to Z)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* List of Students */}
                  {filteredAndSortedStudents.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                      <div className="text-sm font-bold text-slate-700">No students matched the filter</div>
                      <div className="text-xs text-slate-400">Try clearing the search query or class filter.</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <th className="py-3 px-4 w-12 text-center">Rank</th>
                            <th className="py-3 px-4">Student</th>
                            <th className="py-3 px-4 text-right">Cash Offered (Total)</th>
                            <th className="py-3 px-4 text-right">Wallet Balance</th>
                            <th className="py-3 px-4 text-right">Cash to Store</th>
                            <th className="py-3 px-4 text-right">Store Available</th>
                            <th className="py-3 px-4 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAndSortedStudents.map((s: any, idx: number) => {
                            const isTop1 = idx === 0 && sortBy === 'OFFERED_DESC';
                            const isTop2 = idx === 1 && sortBy === 'OFFERED_DESC';
                            const isTop3 = idx === 2 && sortBy === 'OFFERED_DESC';

                            return (
                              <tr
                                key={s.id}
                                className={`hover:bg-emerald-50/40 transition group cursor-pointer ${
                                  isTop1 ? 'bg-amber-50/20' : ''
                                }`}
                                onClick={() => setSelectedStudentForBreakdown(s)}
                              >
                                {/* Rank */}
                                <td className="py-3.5 px-4 text-center">
                                  {isTop1 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-xs shadow-sm">
                                      1
                                    </span>
                                  ) : isTop2 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs">
                                      2
                                    </span>
                                  ) : isTop3 ? (
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/70 text-white font-black text-xs">
                                      3
                                    </span>
                                  ) : (
                                    <span className="font-mono font-bold text-slate-400 text-xs">
                                      #{idx + 1}
                                    </span>
                                  )}
                                </td>

                                {/* Student Info */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                                      {s.photoUrl ? (
                                        <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center font-black text-slate-600 text-xs">
                                          {s.fullName?.[0] || 'S'}
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition truncate text-xs sm:text-sm">
                                        {s.fullName}
                                      </div>
                                      <div className="text-[10px] text-slate-500 flex items-center space-x-1.5 font-mono">
                                        <span className="font-bold text-slate-700">{s.sprStudentId}</span>
                                        <span>•</span>
                                        <span>{s.className}</span>
                                        {s.division && <span>({s.division})</span>}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Cash Offered (Total Earnings) */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono font-black text-sm text-emerald-700">
                                    ₹{s.totalCashOffered.toFixed(2)}
                                  </div>
                                  <span className="text-[9.5px] font-semibold text-slate-400">
                                    {s.categoryBreakdown?.length || 0} categories
                                  </span>
                                </td>

                                {/* Wallet Balance */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono font-bold text-xs text-blue-700">
                                    ₹{s.currentWalletBalance.toFixed(2)}
                                  </div>
                                  <span className="text-[9.5px] text-slate-400">Liquid</span>
                                </td>

                                {/* Cash to Store */}
                                <td className="py-3.5 px-4 text-right">
                                  <span
                                    className={`px-2 py-0.5 rounded font-mono font-bold text-xs inline-block ${
                                      s.cashToStore > 0
                                        ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    ₹{s.cashToStore.toFixed(2)}
                                  </span>
                                </td>

                                {/* Available Store Fund */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="font-mono font-semibold text-xs text-slate-700">
                                    ₹{s.availableStoreFund.toFixed(2)}
                                  </div>
                                  {s.storeFundUsed > 0 && (
                                    <span className="text-[9px] text-amber-600 font-mono block">
                                      Used: ₹{s.storeFundUsed.toFixed(2)}
                                    </span>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedStudentForBreakdown(s);
                                    }}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center space-x-1 mx-auto"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Details</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* DETAILED STUDENT FUND BREAKDOWN MODAL                          */}
        {/* ============================================================== */}
        {selectedStudentForBreakdown && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-zoom-up p-6 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-emerald-500 shadow-sm">
                    {selectedStudentForBreakdown.photoUrl ? (
                      <img
                        src={selectedStudentForBreakdown.photoUrl}
                        alt={selectedStudentForBreakdown.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-slate-600 text-sm">
                        {selectedStudentForBreakdown.fullName?.[0] || 'S'}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {selectedStudentForBreakdown.fullName}
                    </h3>
                    <div className="text-xs text-slate-500 flex items-center space-x-2 font-mono mt-0.5">
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {selectedStudentForBreakdown.sprStudentId}
                      </span>
                      <span>•</span>
                      <span>{selectedStudentForBreakdown.className}</span>
                      {selectedStudentForBreakdown.division && (
                        <span>({selectedStudentForBreakdown.division})</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudentForBreakdown(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 4 Quick Stat Summary Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Cash Offered</span>
                  <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                    ₹{selectedStudentForBreakdown.totalCashOffered.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-blue-800">Wallet Balance</span>
                  <div className="text-lg font-black text-blue-700 font-mono mt-0.5">
                    ₹{selectedStudentForBreakdown.currentWalletBalance.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-800">Cash to Store</span>
                  <div className="text-lg font-black text-indigo-700 font-mono mt-0.5">
                    ₹{selectedStudentForBreakdown.cashToStore.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Store Available</span>
                  <div className="text-lg font-black text-amber-700 font-mono mt-0.5">
                    ₹{selectedStudentForBreakdown.availableStoreFund.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Category-by-Category Earnings Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Category-wise Earnings Contribution</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedStudentForBreakdown.categoryBreakdown?.length === 0 ? (
                    <div className="col-span-2 py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      No category earnings recorded.
                    </div>
                  ) : (
                    selectedStudentForBreakdown.categoryBreakdown?.map((cat: any) => (
                      <div
                        key={cat.categoryId}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{cat.categoryName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {cat.points} pts accumulated
                          </div>
                        </div>
                        <div className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          ₹{Number(cat.amount).toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Activity Ledgers & Records Audit */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recent Credited Records &amp; Activity Ledgers</span>
                </h4>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedStudentForBreakdown.recentLedgers?.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      No earning ledger entries available for this student.
                    </div>
                  ) : (
                    selectedStudentForBreakdown.recentLedgers?.map((ledger: any) => {
                      const d = new Date(ledger.activityDate);
                      const formattedDate = !isNaN(d.getTime())
                        ? d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '';
                      const title =
                        ledger.metadata?.title ||
                        ledger.metadata?.monthName
                          ? `${ledger.metadata.monthName} ${ledger.metadata.year || ''}`
                          : ledger.categoryName;

                      return (
                        <div
                          key={ledger.id}
                          className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">
                              {ledger.categoryName} {title && title !== ledger.categoryName ? `• ${title}` : ''}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-2 font-mono">
                              <span>{formattedDate}</span>
                              <span>•</span>
                              <span>
                                {ledger.points} pts × {ledger.multiplier}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400">{ledger.sourceType}</span>
                            </div>
                          </div>

                          <div className="font-mono font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                            +₹{Number(ledger.amount).toFixed(2)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForBreakdown(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
