'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  Building,
  GraduationCap,
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart as PieIcon,
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const COLORS = ['#0A2540', '#D4AF37', '#2563EB', '#7C3AED', '#059669', '#EA580C'];

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900 border border-blue-300">
                Institutional Analytics & Diagnostics
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-madin-900" />
              <span>Multi-Dimensional Performance Analytics</span>
            </h2>
            <p className="text-xs text-slate-500">
              Comparative insights across cohorts, syllabus wings, and institutional schools.
            </p>
          </div>
        </div>

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
            <span className="text-[10px] uppercase font-bold text-slate-400">Institutional Average</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{data?.kpi?.overallAverageSPR}%</div>
            <span className="text-[10px] text-emerald-600 font-semibold">Across all 5 classes</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled Cohort</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{data?.kpi?.totalStudents}</div>
            <span className="text-[10px] text-slate-500 font-medium">5 Schools in Malappuram</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
            <span className="text-[10px] uppercase font-bold text-slate-400">Evaluated Records</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{data?.kpi?.totalPerformanceRecords}</div>
            <span className="text-[10px] text-amber-600 font-semibold">Exams & Programs</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-subtle">
            <span className="text-[10px] uppercase font-bold text-slate-400">Published Works</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{data?.kpi?.totalCreativeWorks}</div>
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
              {data?.classPerformance ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.classPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              {data?.schoolPerformance ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.schoolPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          {loading || !data?.categoryPerformance ? (
            <div className="py-8 flex items-center justify-center">
              <VideoLoader size="md" text="Loading category distributions..." subtext="Computing evaluation weights" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
              {data?.categoryPerformance?.map((cat: any) => (
                <div key={cat.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center space-y-1">
                  <div className="text-[11px] font-bold text-slate-500 truncate">{cat.name}</div>
                  <div className="text-xl font-black text-slate-900">{cat.averagePercentage}%</div>
                  <div className="text-[10px] font-semibold text-gold-700 bg-gold-50 py-0.5 rounded">
                    {cat.defaultWeight}% Weight
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
