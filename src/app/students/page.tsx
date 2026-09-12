'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Building,
  GraduationCap,
  X,
  Loader2,
  Camera,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import StudentAvatar from '@/components/ui/StudentAvatar';
import VideoLoader from '@/components/ui/VideoLoader';
import { compressImageClientSide } from '@/lib/image-utils';
import { getAcademicMasterData } from '@/lib/academic-client';
import CustomSelect from '@/components/ui/CustomSelect';

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Master options
  const [classes, setClasses] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);

  // Add/Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // Bulk selection & deletion state
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [modalDeleteError, setModalDeleteError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    studentId: '',
    sprStudentId: '',
    fullName: '',
    classId: '',
    schoolId: '',
    division: 'A',
    status: 'ACTIVE',
    notes: '',
    photoUrl: '',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const [isSearching, setIsSearching] = useState(false);
  const activeReqRef = React.useRef(0);

  // Fetch reference master data with instant client cache
  useEffect(() => {
    getAcademicMasterData()
      .then((data) => {
        if (data.classes) setClasses(data.classes);
        if (data.schools) setSchools(data.schools);
      })
      .catch((err) => console.error('Error fetching academic masters:', err));
  }, []);

  const fetchStudents = async (targetPage = page, targetLimit = limit, signal?: AbortSignal, reqId?: number) => {
    try {
      if (!signal) setLoading(true);
      else setIsSearching(true);

      const params = new URLSearchParams();
      params.append('page', String(targetPage));
      params.append('limit', String(targetLimit));
      if (search.trim()) params.append('search', search.trim());
      if (classFilter) params.append('classId', classFilter);
      if (schoolFilter) params.append('schoolId', schoolFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/students?${params.toString()}`, { signal });
      const data = await res.json();
      
      // Only apply if this is still the active request
      if (reqId === undefined || reqId === activeReqRef.current) {
        if (data.students) {
          setStudents(data.students);
        }
        if (data.pagination) {
          setTotalStudents(data.pagination.total || 0);
          setTotalPages(data.pagination.totalPages || 1);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch students:', err);
      }
    } finally {
      if (reqId === undefined || reqId === activeReqRef.current) {
        setLoading(false);
        setIsSearching(false);
      }
    }
  };

  // Reset to page 1 whenever filters or search query changes
  useEffect(() => {
    setPage(1);
  }, [search, classFilter, schoolFilter, statusFilter, limit]);

  useEffect(() => {
    const controller = new AbortController();
    const reqId = ++activeReqRef.current;

    // Use a small 200ms debounce for search text changes, instant for dropdown filters
    const delay = search ? 200 : 0;
    if (search) setIsSearching(true);

    const timer = setTimeout(() => {
      fetchStudents(page, limit, controller.signal, reqId);
    }, delay);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search, classFilter, schoolFilter, statusFilter, page, limit]);

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormData({
      studentId: '',
      sprStudentId: '',
      fullName: '',
      classId: classes[0]?.id || '',
      schoolId: schools[0]?.id || '',
      division: 'A',
      status: 'ACTIVE',
      notes: '',
      photoUrl: '',
    });
    setFormError('');
    setIsDraggingPhoto(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (st: any) => {
    setEditingStudent(st);
    setFormData({
      studentId: st.studentId,
      sprStudentId: st.sprStudentId || '',
      fullName: st.fullName,
      classId: st.classId,
      schoolId: st.schoolId,
      division: st.division,
      status: st.status,
      notes: st.notes || '',
      photoUrl: st.photoUrl || '',
    });
    setFormError('');
    setIsDraggingPhoto(false);
    setModalOpen(true);
  };

  const processPhotoFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select or drop a valid image file (JPEG, PNG, WebP).');
      return;
    }

    try {
      setUploadingPhoto(true);

      // Fast client-side resize & compression for instant preview and lightweight payload (<30KB)
      const compressedDataUrl = await compressImageClientSide(file, 360, 0.85);

      // Instantly show preview in avatar
      setFormData((prev) => ({ ...prev, photoUrl: compressedDataUrl }));

      // Send to upload API
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressedDataUrl }),
      });

      const json = await res.json();
      if (res.ok && json.url) {
        setFormData((prev) => ({ ...prev, photoUrl: json.url }));
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processPhotoFile(file);
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
      await processPhotoFile(droppedFile);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const payload = {
        ...formData,
        studentId: formData.studentId || `MSOE-${Date.now().toString(36).toUpperCase()}`,
      };

      if (editingStudent) {
        // Update
        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update student');
      } else {
        // Create
        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to create student');
      }

      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allSelected = students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id));
    if (allSelected) {
      const studentIdSet = new Set(students.map((s) => s.id));
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIdSet.has(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...students.map((s) => s.id)])));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteSubmit = async () => {
    if (selectedStudentIds.length === 0) return;
    setBulkDeleting(true);
    setModalDeleteError(null);
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudentIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete students.');

      setSelectedStudentIds([]);
      setConfirmBulkDeleteOpen(false);
      setModalDeleteError(null);
      fetchStudents();
    } catch (err: any) {
      setModalDeleteError(err.message || 'Error bulk deleting students.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (st: any) => {
    if (!confirm(`Are you sure you want to delete student "${st.fullName}"?`)) return;

    try {
      const res = await fetch(`/api/students/${st.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedStudentIds((prev) => prev.filter((id) => id !== st.id));
        fetchStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete student.');
      }
    } catch (err) {
      alert('Error deleting student.');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span>Student Performance Registry</span>
            </h2>
            <p className="text-xs text-slate-500">
              Manage student profiles, profile photos, class enrollments, and institutional schools.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/students/bulk-import')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all hover:scale-105 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Excel Import</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SPR ID (e.g. SPR0001)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
            {isSearching ? (
              <div className="absolute right-2.5 top-2.5">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
              </div>
            ) : search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {/* Class Filter */}
          <div>
            <CustomSelect
              value={classFilter}
              onChange={(val) => setClassFilter(val)}
              placeholder="All Classes (8, 9, 10, +1, +2)"
              options={[
                { value: '', label: 'All Classes (8, 9, 10, +1, +2)' },
                ...classes.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          </div>

          {/* School Filter */}
          <div>
            <CustomSelect
              value={schoolFilter}
              onChange={(val) => setSchoolFilter(val)}
              placeholder="All Institutional Schools"
              options={[
                { value: '', label: 'All Institutional Schools' },
                ...schools.map((s) => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              placeholder="All Statuses"
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active Students' },
                { value: 'INACTIVE', label: 'Inactive Students' },
                { value: 'ALUMNI', label: 'Alumni' },
              ]}
            />
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedStudentIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedStudentIds.length} student(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedStudentIds([])}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-100 rounded-xl transition"
              >
                Deselect All
              </button>
              <button
                type="button"
                onClick={() => setConfirmBulkDeleteOpen(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition hover:scale-105 active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && students.every((s) => selectedStudentIds.includes(s.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                      title="Select All Students"
                    />
                  </th>
                  <th className="py-3.5 px-4">Student & SPR ID</th>
                  <th className="py-3.5 px-4">Class & Division</th>
                  <th className="py-3.5 px-4">School</th>
                  <th className="py-3.5 px-4">Academic Year</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading student directory..." subtext="Accessing SPR Institutional Registry" />
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No students found matching your filters.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => {
                    const isSelected = selectedStudentIds.includes(st.id);
                    return (
                      <tr key={st.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectStudent(st.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <StudentAvatar photoUrl={st.photoUrl} name={st.fullName} size="md" />
                            <div>
                              <div
                                onClick={() => router.push(`/students/${st.id}`)}
                                className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                              >
                                {st.fullName}
                              </div>
                              <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {st.sprStudentId || 'SPR ID'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">SPR Student ID</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-900">{st.class?.name}</span>
                          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            Div {st.division}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{st.school?.name}</td>
                        <td className="py-3 px-4 text-slate-500">{st.academicYear?.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              st.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => router.push(`/students/${st.id}`)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="View 360° Performance Dossier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(st)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Edit Student Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(st)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <span>
                Showing{' '}
                <strong className="text-slate-900 font-bold">
                  {totalStudents === 0 ? 0 : (page - 1) * limit + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900 font-bold">
                  {Math.min(page * limit, totalStudents)}
                </strong>{' '}
                of <strong className="text-slate-900 font-bold">{totalStudents}</strong> student(s)
              </span>
              <span className="text-slate-300">|</span>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500">Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                <div className="flex items-center space-x-1 px-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = page;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (page <= 3) pageNum = i + 1;
                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = page - 2 + i;

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        disabled={loading}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                          page === pageNum
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1"
                  title="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingStudent ? 'Edit Student Profile' : 'Add New Student to SPR'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-3.5">
              {/* Profile Photo Drag & Drop Upload Section */}
              <div
                onDragOver={handlePhotoDragOver}
                onDragEnter={handlePhotoDragOver}
                onDragLeave={handlePhotoDragLeave}
                onDrop={handlePhotoDrop}
                className={`p-4 rounded-2xl border-2 transition-all duration-200 relative ${
                  isDraggingPhoto
                    ? 'border-blue-500 bg-blue-50/90 ring-4 ring-blue-100 scale-[1.01]'
                    : formData.photoUrl
                    ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                    : 'border-dashed border-slate-300 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Avatar Preview with Drop Overlay */}
                  <div className="shrink-0 relative group">
                    <StudentAvatar
                      photoUrl={formData.photoUrl}
                      name={formData.fullName || 'Student'}
                      size="xl"
                      className="shadow-sm ring-2 ring-white"
                    />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white backdrop-blur-2xs">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    )}
                    {isDraggingPhoto && !uploadingPhoto && (
                      <div className="absolute inset-0 bg-blue-600/80 rounded-full flex items-center justify-center text-white animate-pulse">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Drop Info and Action Buttons */}
                  <div className="flex-1 text-center sm:text-left space-y-1">
                    <div className="flex items-center justify-center sm:justify-start space-x-2">
                      <label className="text-xs font-bold text-slate-800">Student Profile Photo</label>
                      {formData.photoUrl && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          Photo Attached
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {isDraggingPhoto
                        ? '✨ Drop the image file here to upload!'
                        : 'Drag & drop photo here, or browse from device (JPEG, PNG, WebP).'}
                    </p>

                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1.5">
                      <label
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs transition-all inline-flex items-center space-x-1.5 ${
                          uploadingPhoto
                            ? 'bg-blue-400 text-white cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                        }`}
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>{formData.photoUrl ? 'Change / Drop New' : 'Browse / Drop Photo'}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handlePhotoUpload}
                          disabled={uploadingPhoto}
                          className="hidden"
                        />
                      </label>

                      {formData.photoUrl && !uploadingPhoto && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200/80 transition inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {isDraggingPhoto && (
                  <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-2xl pointer-events-none flex items-center justify-center">
                    <div className="bg-white px-4 py-2 rounded-xl shadow-lg border border-blue-200 text-blue-700 text-xs font-bold flex items-center space-x-2 animate-bounce">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span>Drop image to attach photo</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SPR Student ID (Permanent)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={formData.sprStudentId || 'Auto-generated on save (e.g. Next available SPR ID)'}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono font-bold outline-none cursor-default"
                  />
                  <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    Permanent
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Permanent unique identifier for SPR and future Madin School Library integration.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Muhammed Rayan K"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class *
                  </label>
                  <CustomSelect
                    value={formData.classId}
                    onChange={(val) => setFormData({ ...formData, classId: val })}
                    placeholder="Select class..."
                    options={classes.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Division / Batch
                  </label>
                  <input
                    type="text"
                    value={formData.division}
                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                    placeholder="A / B / C"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    School *
                  </label>
                  <CustomSelect
                    value={formData.schoolId}
                    onChange={(val) => setFormData({ ...formData, schoolId: val })}
                    placeholder="Select school..."
                    options={schools.map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <CustomSelect
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                      { value: 'ALUMNI', label: 'Alumni' },
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading || uploadingPhoto}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 shadow transition"
                >
                  {formLoading ? 'Saving...' : editingStudent ? 'Update Profile' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Delete Confirmation Modal */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-100 rounded-full">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Bulk Deletion</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            {modalDeleteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{modalDeleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedStudentIds.length}</strong> selected student record(s)? All associated performance records, scores, creative hub entries, and dossiers will also be removed permanently.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={() => setConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleting}
                onClick={handleBulkDeleteSubmit}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedStudentIds.length} Student(s)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
