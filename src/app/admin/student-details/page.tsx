'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Unlock,
  Edit,
  Download,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  X,
  History,
  Check,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import CustomSelect from '@/components/ui/CustomSelect';
import VideoLoader from '@/components/ui/VideoLoader';

export default function AdminStudentDetailsPage() {
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedLockFilter, setSelectedLockFilter] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Edit / Correct Modal
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');
  const [correctionFields, setCorrectionFields] = useState<Record<string, any>>({});
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState('');
  const [correctionError, setCorrectionError] = useState('');

  // Selected Student Drawer
  const [detailStudent, setDetailStudent] = useState<any | null>(null);

  const fetchStudents = async (silent = false) => {
    try {
      if (!silent && allStudents.length === 0) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/admin/student-details');
      if (res.ok) {
        const json = await res.json();
        setAllStudents(json.students || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/admin/student-details/groups');
      if (res.ok) {
        const json = await res.json();
        setGroups(json.groups || []);
      }
    } catch {}
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/academic?type=classes');
      if (res.ok) {
        const json = await res.json();
        setClasses(json.classes || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchClasses();
    fetchGroups();
    fetchStudents();
  }, []);

  const handleOpenEdit = (st: any) => {
    setEditingStudent(st);
    setCorrectionReason('');
    setCorrectionSuccess('');
    setCorrectionError('');
    setCorrectionFields({
      fatherName: st.fatherName || '',
      motherName: st.motherName || '',
      houseName: st.houseName || '',
      guardianPhone: st.guardianPhone || '',
      studentPhone: st.studentPhone || '',
      studentEmail: st.studentEmail || '',
      place: st.place || '',
      district: st.district || '',
      residentialStatus: st.residentialStatus || '',
      preferredContact: st.preferredContact || '',
      isProfileLocked: st.isProfileLocked ?? false,
    });
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingCorrection(true);
    setCorrectionError('');
    setCorrectionSuccess('');

    try {
      const res = await fetch('/api/admin/student-details/correct-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: editingStudent.id,
          updates: correctionFields,
          reason: correctionReason || 'Administrative update',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to apply profile correction');

      if (json.updatedFields) {
        setAllStudents((prev) =>
          prev.map((s) => (s.id === editingStudent.id ? { ...s, ...json.updatedFields } : s))
        );
        if (detailStudent && detailStudent.id === editingStudent.id) {
          setDetailStudent((prev: any) => ({ ...prev, ...json.updatedFields }));
        }
      }

      setCorrectionSuccess('Student profile updated and audit log recorded!');
      setTimeout(() => {
        setEditingStudent(null);
      }, 700);
    } catch (err: any) {
      setCorrectionError(err.message || 'Error updating profile');
    } finally {
      setSavingCorrection(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (displayStudents.length === 0) return;
    const headers = [
      'SPR ID',
      'Name',
      'Class',
      'Father Name',
      'Mother Name',
      'Guardian Phone',
      'Student Phone',
      'Student Email',
      'Place',
      'District',
      'Profile Locked',
      'Questionnaires Completed',
    ];

    const rows = displayStudents.map((s) => [
      `"${s.sprStudentId || ''}"`,
      `"${s.fullName || ''}"`,
      `"${s.className || ''}"`,
      `"${s.fatherName || ''}"`,
      `"${s.motherName || ''}"`,
      `"${s.guardianPhone || ''}"`,
      `"${s.studentPhone || ''}"`,
      `"${s.studentEmail || ''}"`,
      `"${s.place || ''}"`,
      `"${s.district || ''}"`,
      s.isProfileLocked ? 'Yes' : 'No',
      `${s.completedQuestionnairesCount} / ${s.totalQuestionnairesCount}`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Students_Intelligence_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Ultra-fast instant client-side filtering (0ms latency, replicates leaderboard responsiveness)
  const displayStudents = useMemo(() => {
    let list = allStudents;

    if (selectedClass) {
      list = list.filter((s) => s.classId === selectedClass);
    }

    if (selectedLockFilter === 'true') {
      list = list.filter((s) => s.isProfileLocked === true);
    } else if (selectedLockFilter === 'false') {
      list = list.filter((s) => s.isProfileLocked === false);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName?.toLowerCase().includes(q) ||
          s.sprStudentId?.toLowerCase().includes(q) ||
          s.studentPhone?.toLowerCase().includes(q) ||
          s.guardianPhone?.toLowerCase().includes(q) ||
          s.place?.toLowerCase().includes(q)
      );
    }

    if (activeGroup) {
      const grp = groups.find((g) => g.id === activeGroup);
      if (grp) {
        list = list.filter((s) => grp.students?.some((gs: any) => gs.id === s.id));
      }
    }

    return list;
  }, [allStudents, selectedClass, selectedLockFilter, search, activeGroup, groups]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Students Intelligence &amp; Details Management
              </h1>
              <p className="text-xs text-slate-500">
                Official personal profiles, questionnaire responses, dynamic groups, and administrative profile correction.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fetchStudents(true)}
              disabled={refreshing}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Refresh student list"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dynamic Answer-Based Groups Ribbon */}
        {groups.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Dynamic Answer-Based Student Groups ({groups.length})</span>
              </span>
              {activeGroup && (
                <button
                  onClick={() => setActiveGroup(null)}
                  className="text-[11px] text-blue-600 hover:underline"
                >
                  Clear Group Filter
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              {groups.slice(0, 10).map((grp) => {
                const isActive = activeGroup === grp.id;
                return (
                  <button
                    key={grp.id}
                    onClick={() => setActiveGroup(isActive ? null : grp.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{grp.name}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {grp.studentCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-subtle grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by student name, SPR ID, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
          </div>

          <div>
            <CustomSelect
              value={selectedClass}
              onChange={(val) => setSelectedClass(val)}
              placeholder="Filter by Class (All)"
              options={[
                { value: '', label: 'All Classes' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div>
            <CustomSelect
              value={selectedLockFilter}
              onChange={(val) => setSelectedLockFilter(val)}
              placeholder="Profile Status (All)"
              options={[
                { value: '', label: 'All Profile Statuses' },
                { value: 'true', label: '🔒 Locked & Verified' },
                { value: 'false', label: '🔓 Unlocked (Draft)' },
              ]}
            />
          </div>
        </div>

        {/* Main Students Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <VideoLoader size="lg" text="Loading student records..." subtext="Syncing profiles and questionnaires" />
            </div>
          ) : displayStudents.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500">
              No students found matching active criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3">Guardian / Phone</th>
                    <th className="py-3 px-3">Place &amp; District</th>
                    <th className="py-3 px-3 text-center">Profile Lock</th>
                    <th className="py-3 px-3 text-center">Activities Completed</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayStudents.map((st) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {st.photoUrl ? (
                              <Image src={st.photoUrl} alt={st.fullName} width={32} height={32} className="w-full h-full object-cover" />
                            ) : (
                              st.fullName?.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{st.fullName}</div>
                            <div className="text-[10.5px] font-mono text-blue-700 font-semibold">
                              {st.sprStudentId || st.studentId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-700">
                        {st.className}
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{st.fatherName || st.guardianPhone || '—'}</div>
                        {st.guardianPhone && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center space-x-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{st.guardianPhone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        {st.place || st.district ? (
                          <div>
                            <span className="font-semibold">{st.place}</span>
                            {st.district && <span className="text-slate-400">, {st.district}</span>}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {st.isProfileLocked ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Unlock className="w-2.5 h-2.5" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className="font-bold font-mono">
                            {st.completedQuestionnairesCount} / {st.totalQuestionnairesCount}
                          </span>
                          <span className="text-[10px] text-slate-400">({st.questionnaireCompletionRate}%)</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition flex items-center space-x-1 ml-auto"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Profile Correction Modal with Audit Logging */}
        {editingStudent && (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Edit className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      Administrative Profile Correction
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingStudent.fullName} ({editingStudent.sprStudentId})
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {correctionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {correctionError}
                </div>
              )}
              {correctionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {correctionSuccess}
                </div>
              )}

              <form onSubmit={handleSaveCorrection} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Father Name</label>
                    <input
                      type="text"
                      value={correctionFields.fatherName}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, fatherName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Mother Name</label>
                    <input
                      type="text"
                      value={correctionFields.motherName}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, motherName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Guardian Phone</label>
                    <input
                      type="text"
                      value={correctionFields.guardianPhone}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, guardianPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Student Phone</label>
                    <input
                      type="text"
                      value={correctionFields.studentPhone}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, studentPhone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Place / City</label>
                    <input
                      type="text"
                      value={correctionFields.place}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, place: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">District</label>
                    <input
                      type="text"
                      value={correctionFields.district}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, district: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={correctionFields.isProfileLocked}
                      onChange={(e) => setCorrectionFields({ ...correctionFields, isProfileLocked: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Profile Locked (Student cannot modify)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Reason for Correction <span className="text-rose-500">* (Logged in Audit History)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corrected father phone number upon parent request..."
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCorrection}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition disabled:opacity-50"
                  >
                    {savingCorrection ? 'Saving...' : 'Apply Correction & Log Audit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
