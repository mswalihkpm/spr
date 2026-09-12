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
  Camera,
  UploadCloud,
  Trash2,
  Loader2,
  Info,
  X,
  ChevronRight,
} from 'lucide-react';
import { StudentAvatar } from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';
import { compressImageClientSide } from '@/lib/image-utils';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [creativeWorks, setCreativeWorks] = useState<any[]>([]);
  const [libraryRecords, setLibraryRecords] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [selectedCatDetails, setSelectedCatDetails] = useState<any | null>(null);

  const handlePhotoFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select or drop a valid image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      setUploadingPhoto(true);
      const compressedDataUrl = await compressImageClientSide(file, 360, 0.85);

      // Upload image
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedDataUrl }),
      });
      const json = await res.json();
      const finalUrl = json.url || compressedDataUrl;

      // Update student profile photo in DB
      const updateRes = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: finalUrl }),
      });
      const updateJson = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateJson.error || 'Failed to update photo');

      setProfileData((prev: any) => ({
        ...prev,
        student: {
          ...prev?.student,
          photoUrl: finalUrl,
        },
      }));
    } catch (err: any) {
      console.error('Photo update error:', err);
      alert(err.message || 'Error updating photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this profile photo?')) return;
    try {
      setUploadingPhoto(true);
      const updateRes = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: '' }),
      });
      if (!updateRes.ok) throw new Error('Failed to remove photo');

      setProfileData((prev: any) => ({
        ...prev,
        student: {
          ...prev?.student,
          photoUrl: null,
        },
      }));
    } catch (err: any) {
      alert(err.message || 'Error removing photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingPhoto) setIsDraggingPhoto(true);
  };

  const handlePhotoDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
  };

  const handlePhotoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPhoto(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await handlePhotoFile(droppedFile);
    }
  };

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
            {/* Student Info with Drag & Drop Avatar */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              <div
                onDragOver={handlePhotoDragOver}
                onDragEnter={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className="relative group shrink-0"
                title="Drag & drop a photo here to update, or click camera icon"
              >
                <StudentAvatar
                  photoUrl={student.photoUrl}
                  name={student.fullName}
                  size="2xl"
                  className={`ring-4 transition-all duration-200 ${
                    isDraggingPhoto
                      ? 'ring-blue-400 scale-105 shadow-lg shadow-blue-500/50'
                      : 'ring-white/20 group-hover:ring-blue-400/80'
                  }`}
                />

                {/* Uploading Overlay */}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white backdrop-blur-2xs">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <span className="text-[9px] font-bold mt-1">Saving...</span>
                  </div>
                )}

                {/* Dragging Active Overlay */}
                {isDraggingPhoto && !uploadingPhoto && (
                  <div className="absolute inset-0 bg-blue-600/90 rounded-full flex flex-col items-center justify-center text-white animate-pulse">
                    <UploadCloud className="w-8 h-8" />
                    <span className="text-[9px] font-extrabold mt-0.5">Drop Here</span>
                  </div>
                )}

                {/* Hover action overlay & buttons */}
                {!uploadingPhoto && !isDraggingPhoto && (
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                    <label
                      className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-lg transition active:scale-90"
                      title="Upload or Drop new photo"
                    >
                      <Camera className="w-4 h-4" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            e.target.value = '';
                            handlePhotoFile(file);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                    {student.photoUrl && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition active:scale-90"
                        title="Drop / Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
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
              {/* Overall SPR Points */}
              <div className="text-center px-2">
                <div className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">Total SPR Points</div>
                <div className="text-2xl sm:text-3xl font-black text-white mt-0.5 font-mono">
                  {typeof overallSPR === 'number' ? overallSPR.toLocaleString('en-US') : overallSPR}
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold">Points Scoring</div>
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
            {/* 1. Complete SPR Points Breakdown Matrix */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-madin-900" />
                    <span>Authoritative SPR Points Scoring Matrix</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    7 Main Categories • Base Points × Multipliers = Unlimited Cumulative SPR Points
                  </p>
                </div>
                <div className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  Scoring Engine: <strong className="text-slate-800">Pure Numerical Points</strong>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-center">Records / Entries</th>
                      <th className="py-3 px-4 text-right">Earned SPR Points</th>
                      <th className="py-3 px-4 text-center">Formula & Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categoryScores.map((cat: any, idx: number) => {
                      const pts = cat.earnedPoints ?? 0;
                      return (
                        <tr key={cat.categoryId || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">
                            {cat.priority || idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                              <span>{cat.categoryName}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {cat.recordsCount || 0} valid entries
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-600">
                            {cat.recordsCount || 0} assessment(s)
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-black text-indigo-900 text-sm">
                            +{pts.toLocaleString('en-US')} pts
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedCatDetails(cat)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:text-indigo-900 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 mx-auto"
                            >
                              <Info className="w-3 h-3" />
                              <span>View Itemized Points</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-slate-900 to-madin-950 text-white font-bold border-t-2 border-slate-900">
                    <tr>
                      <td colSpan={3} className="py-3.5 px-4 text-sm font-black text-gold-300">
                        TOTAL ACCUMULATED SPR POINTS (Direct Sum)
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-base font-black text-gold-400">
                        {typeof overallSPR === 'number' ? overallSPR.toLocaleString('en-US') : overallSPR} PTS
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-emerald-400 font-bold">
                        VERIFIED
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* 2. Detailed Library Reading Pure Points Registry */}
            {(() => {
              const libCat = categoryScores.find(
                (c: any) => c.categoryCode === 'LIBRARY' || c.categoryName?.includes('Library')
              );
              const earnedPts = libCat?.earnedPoints ?? 0;

              return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                        <Library className="w-4 h-4 text-teal-700" />
                        <span>Dedicated Library & Reading Points Registry</span>
                      </h4>
                      <p className="text-xs text-slate-500">
                        Pure numerical points with zero artificial caps or ceilings.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200">
                      Uncapped Points
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                      <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Library Metric</th>
                          <th className="py-2.5 px-3 text-right">Points / Value</th>
                          <th className="py-2.5 px-3">Scoring Rule & Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Earned Reading Points</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-teal-800">{earnedPts.toLocaleString('en-US')} pts</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">Total accumulated reading points added directly to overall SPR</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-3 font-semibold text-slate-800">Category Maximum</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-700">None (Unlimited)</td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">No 500-point ceiling or normalization applied</td>
                        </tr>
                        <tr className="bg-teal-50/60 font-bold">
                          <td className="py-2.5 px-3 text-teal-950">Net SPR Contribution</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-teal-900 text-sm">+{earnedPts.toLocaleString('en-US')} PTS</td>
                          <td className="py-2.5 px-3 text-teal-800 text-[11px]">100% direct sum contribution</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* 3. Final SPR Points Card */}
            <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-madin-950 to-indigo-950 p-6 text-white text-center shadow-lg border border-gold-400/30">
              <div className="text-xs uppercase font-black tracking-widest text-gold-400">
                AUTHORITATIVE FINAL SPR POINTS
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white mt-1 font-mono tracking-tight">
                {typeof overallSPR === 'number' ? overallSPR.toLocaleString('en-US') : overallSPR} PTS
              </div>
              <div className="text-xs text-slate-300 mt-2 flex items-center justify-center space-x-2">
                <span className="font-semibold">Direct Sum Scoring:</span>
                <span className="font-mono font-bold text-gold-300">Sum of 7 Categories</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">Rank #{rank} Overall</span>
              </div>
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
                      <th className="py-2.5 px-3 text-right">Academic Mark / %</th>
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
            
            {(() => {
              const tabRecords = recentRecords.filter((r: any) =>
                activeTab === 'ISLAMIC'
                  ? r.categoryName?.toLowerCase().includes('islamic') || r.categoryCode === 'ISLAMIC'
                  : activeTab === 'SCHOOL'
                  ? r.categoryName?.toLowerCase().includes('school') || r.categoryCode === 'SCHOOL'
                  : activeTab === 'PROGRAMS'
                  ? r.categoryName?.toLowerCase().includes('program') || r.categoryCode === 'PROGRAMS'
                  : r.categoryName?.toLowerCase().includes('literary') || r.categoryCode === 'LITERARY'
              );

              if (tabRecords.length === 0) {
                return (
                  <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-400">
                    No specific assessments found in this category.
                  </div>
                );
              }

              const groupsMap = new Map<string, any[]>();
              tabRecords.forEach((r: any) => {
                const groupName = r.examName || r.festName || r.competitionName || r.categoryName || 'General Assessment';
                if (!groupsMap.has(groupName)) groupsMap.set(groupName, []);
                groupsMap.get(groupName)!.push(r);
              });

              return (
                <div className="space-y-3">
                  {Array.from(groupsMap.entries()).map(([examTitle, recs]) => {
                    const totObt = recs.reduce((acc, curr) => acc + (Number(curr.obtainedScore) || 0), 0);
                    const totMax = recs.reduce((acc, curr) => acc + (Number(curr.maxScore) || 100), 0);
                    const assessmentPct = totMax > 0 ? (totObt / totMax) * 100 : 0;

                    return (
                      <div key={examTitle} className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between border-b border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span className="text-xs font-bold text-slate-900">{examTitle}</span>
                            <span className="text-[10px] text-slate-500 font-medium">({recs.length} subjects)</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-blue-50 text-blue-800 border border-blue-200">
                            {assessmentPct.toFixed(1)}%
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/50 text-slate-400 uppercase tracking-wider font-semibold text-[10px] border-b border-slate-100">
                              <tr>
                                <th className="py-2 px-4">Subject / Item</th>
                                <th className="py-2 px-4">Date</th>
                                <th className="py-2 px-4 text-right">Final Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {recs.map((r: any) => (
                                <tr key={r.id} className="hover:bg-blue-50/20">
                                  <td className="py-2.5 px-4 font-bold text-slate-900">{r.eventName}</td>
                                  <td className="py-2.5 px-4 text-slate-500">
                                    {new Date(r.date).toLocaleDateString()}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <span className="px-2 py-0.5 rounded font-mono font-black text-xs bg-emerald-50 text-emerald-900 border border-emerald-200">
                                      {typeof r.percentage === 'number' ? r.percentage.toFixed(1) : r.percentage}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Calculation Details Modal (Section 22) */}
        {selectedCatDetails && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-up space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-madin-900 text-white flex items-center justify-center">
                    <Info className="w-4 h-4 text-gold-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Points Breakdown: {selectedCatDetails.categoryName}
                    </h3>
                    <p className="text-[11px] text-slate-500">Numerical Points Scoring & Itemized Audit</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCatDetails(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pure Points Scoring Audit */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Category Point Total
                  </span>
                  <div className="font-mono font-black text-base text-slate-900">
                    +{Number(selectedCatDetails.earnedPoints ?? 0).toLocaleString('en-US')} SPR Points
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Summed from {selectedCatDetails.recordsCount || (selectedCatDetails.records?.length || 0)} assessment/submission record(s)
                  </p>
                </div>

                {selectedCatDetails.records && selectedCatDetails.records.length > 0 && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      3. Itemized Records & Applied Multipliers
                    </span>
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white overflow-hidden text-xs">
                      {selectedCatDetails.records.map((r: any, rIdx: number) => (
                        <div key={r.id || rIdx} className="p-2.5 flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-slate-900 truncate">
                              {r.name || r.title || r.subjectName || 'Entry'}
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center space-x-2">
                              {r.levelName && <span>Level: {r.levelName}</span>}
                              {r.multiplier && <span>Mult: {r.multiplier}×</span>}
                              {r.position && <span>Prize: {r.position}</span>}
                            </div>
                          </div>
                          <div className="text-right font-mono font-bold text-indigo-900 shrink-0">
                            +{Number(r.earnedPoints ?? r.obtainedScore ?? 0).toLocaleString('en-US')} pts
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-madin-900 text-white rounded-xl shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-gold-400 uppercase tracking-wider block">
                    Net SPR Point Contribution
                  </span>
                  <div className="font-mono font-black text-lg text-white">
                    +{Number(selectedCatDetails.earnedPoints ?? 0).toLocaleString('en-US')} PTS
                  </div>
                  <p className="text-[10px] text-slate-300">
                    Added directly to overall student ranking without percentage scaling or ceilings.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedCatDetails(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
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
