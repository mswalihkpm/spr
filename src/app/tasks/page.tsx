'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Award,
  Wallet,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
  Edit2,
  RefreshCw,
  FileText,
  Send,
  Check,
  ShieldCheck,
  Sparkles,
  UserPlus,
  CheckCheck,
  Percent,
  TrendingUp,
  Trash2,
} from 'lucide-react';

interface TaskSummary {
  id: string;
  taskId: string;
  title: string;
  description: string;
  maxPoints: number;
  maxFund: number;
  startDate: string;
  endDate: string;
  publicationStatus: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  dateStatus: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED';
  targetAudience: 'ALL' | 'SPECIFIC_CLASS' | 'SPECIFIC_STUDENTS';
  targetClassName: string | null;
  createdByName: string;
  createdAt: string;
  studentCount: number;
  pendingReviews: number;
  approvedCount: number;
  totalPointsAwarded: number;
  totalRewardsIssued: number;
}

interface StudentTaskRecordView {
  id: string;
  studentId: string;
  fullName?: string;
  studentName?: string;
  sprStudentId: string;
  studentCode?: string;
  className: string;
  division: string;
  status: 'AVAILABLE' | 'SUBMITTED' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'COMPLETED' | 'REJECTED';
  submissionNotes: string | null;
  submittedAt: string | null;
  approvedPercentage: number | null;
  awardedPoints: number;
  awardedAmount: number;
  approvedByName: string | null;
  approvedAt: string | null;
  adminRemarks: string | null;
}

interface TaskDetailView {
  id: string;
  taskId: string;
  title: string;
  description: string;
  maxPoints: number;
  maxFund: number;
  startDate: string;
  endDate: string;
  publicationStatus: string;
  dateStatus: string;
  targetAudience: string;
  targetClassId: string | null;
  targetClassName: string | null;
  createdByName: string;
  createdAt: string;
  studentRecords: StudentTaskRecordView[];
  rewardLedgers: Array<{
    id: string;
    studentName: string;
    sprStudentId: string;
    amount: number;
    transactionReference: string;
    approvedAt: string;
  }>;
}

interface AcademicClassItem {
  id: string;
  name: string;
  numericGrade?: number;
}

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [classes, setClasses] = useState<AcademicClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'DRAFT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    maxPoints: '',
    maxFund: '',
    startDate: '',
    endDate: '',
    targetAudience: 'ALL',
    targetClassId: '',
    status: 'PUBLISHED',
  });

  // Edit Task Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskSummary | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<TaskSummary | TaskDetailView | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    maxPoints: '',
    maxFund: '',
    startDate: '',
    endDate: '',
    targetAudience: 'ALL',
    targetClassId: '',
    status: 'PUBLISHED',
  });

  // Task Detail / Student Management Modal
  const [manageTaskModalOpen, setManageTaskModalOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [candidateStudents, setCandidateStudents] = useState<any[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  // Bulk Operations State
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [recordsFilterQuery, setRecordsFilterQuery] = useState('');

  // Custom % Approval Modal
  const [customPctModalOpen, setCustomPctModalOpen] = useState(false);
  const [customPctTarget, setCustomPctTarget] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [targetRecord, setTargetRecord] = useState<StudentTaskRecordView | null>(null);
  const [customPercentageInput, setCustomPercentageInput] = useState<string>('100');
  const [adminRemarksInput, setAdminRemarksInput] = useState('');

  const fetchTasks = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/tasks?filter=${statusFilter}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch tasks.');
      setTasks(data.tasks || []);
      if (data.classes) setClasses(data.classes);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading tasks.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [statusFilter]);

  const loadTaskDetail = async (taskId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load task details.');
      setSelectedTaskDetail(data.task);
      setSelectedRecordIds([]);
      setStudentSearchQuery('');
      setRecordsFilterQuery('');
      setCandidateStudents([]);
      setManageTaskModalOpen(true);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to open task details.' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Search candidate students to add
  useEffect(() => {
    if (!manageTaskModalOpen || !selectedTaskDetail) return;
    const q = studentSearchQuery.trim();
    if (q.length < 1) {
      setCandidateStudents([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCandidates(true);
      try {
        const res = await fetch(
          `/api/tasks/${selectedTaskDetail.id}/students?q=${encodeURIComponent(q)}`
        );
        const data = await res.json();
        if (res.ok) {
          setCandidateStudents(data.candidates || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingCandidates(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [studentSearchQuery, manageTaskModalOpen, selectedTaskDetail]);

  // Filter associated student records in table
  const filteredAssociatedRecords = useMemo(() => {
    if (!selectedTaskDetail) return [];
    if (!recordsFilterQuery.trim()) return selectedTaskDetail.studentRecords;
    const q = recordsFilterQuery.toLowerCase();
    return selectedTaskDetail.studentRecords.filter((r) => {
      const name = (r.fullName || r.studentName || '').toLowerCase();
      const spr = (r.sprStudentId || '').toLowerCase();
      const cls = (r.className || '').toLowerCase();
      const div = (r.division || '').toLowerCase();
      const notes = (r.submissionNotes || '').toLowerCase();
      const st = (r.status || '').toLowerCase();
      return (
        name.includes(q) ||
        spr.includes(q) ||
        cls.includes(q) ||
        div.includes(q) ||
        notes.includes(q) ||
        st.includes(q)
      );
    });
  }, [selectedTaskDetail, recordsFilterQuery]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTask(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create task.');
      setStatusMsg({ type: 'success', text: data.message || 'Task created successfully!' });
      setCreateModalOpen(false);
      setFormData({
        title: '',
        description: '',
        maxPoints: '',
        maxFund: '',
        startDate: '',
        endDate: '',
        targetAudience: 'ALL',
        targetClassId: '',
        status: 'PUBLISHED',
      });
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create task.' });
    } finally {
      setSavingTask(false);
    }
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setSavingTask(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/tasks/${editingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update task.');
      setStatusMsg({ type: 'success', text: 'Task updated successfully.' });
      setEditModalOpen(false);
      setEditingTask(null);
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to update task.' });
    } finally {
      setSavingTask(false);
    }
  };

  const openEditModal = (t: TaskSummary) => {
    setEditingTask(t);
    setEditFormData({
      title: t.title,
      description: t.description,
      maxPoints: t.maxPoints.toString(),
      maxFund: t.maxFund.toString(),
      startDate: t.startDate.slice(0, 10),
      endDate: t.endDate.slice(0, 10),
      targetAudience: t.targetAudience,
      targetClassId: '',
      status: t.publicationStatus,
    });
    setEditModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setDeletingTask(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/tasks/${taskToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task.');

      setStatusMsg({ type: 'success', text: `Task "${taskToDelete.title}" deleted successfully.` });
      setTaskToDelete(null);
      if (manageTaskModalOpen && selectedTaskDetail?.id === taskToDelete.id) {
        setManageTaskModalOpen(false);
        setSelectedTaskDetail(null);
      }
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete task.' });
    } finally {
      setDeletingTask(false);
    }
  };

  const handleAddStudentToTask = async (studentId: string) => {
    if (!selectedTaskDetail) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskDetail.id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add student to task.');
      setStatusMsg({ type: 'success', text: 'Student added to task successfully.' });
      setStudentSearchQuery('');
      setCandidateStudents([]);
      await loadTaskDetail(selectedTaskDetail.id);
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to add student.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveSingle = async (
    record: StudentTaskRecordView,
    percentage: number,
    remarks?: string
  ) => {
    if (!selectedTaskDetail) return;
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskDetail.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.studentId,
          studentTaskRecordId: record.id,
          percentage,
          approvedPercentage: percentage,
          adminRemarks: remarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve task completion.');
      const displayName = record.fullName || record.studentName || record.sprStudentId;
      setStatusMsg({
        type: 'success',
        text: `Approved for ${displayName}: +${data.awardedPoints ?? data.record?.awardedPoints ?? 0} pts, +₹${(
          data.awardedReward ?? data.record?.awardedAmount ?? 0
        ).toFixed(2)} credited.`,
      });
      setCustomPctModalOpen(false);
      await loadTaskDetail(selectedTaskDetail.id);
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to approve task completion.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSingle = async (record: StudentTaskRecordView) => {
    if (!selectedTaskDetail) return;
    const displayName = record.fullName || record.studentName || record.sprStudentId;
    const confirmReject = confirm(`Are you sure you want to reject completion for ${displayName}?`);
    if (!confirmReject) return;
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/tasks/${selectedTaskDetail.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.studentId,
          studentTaskRecordId: record.id,
          remarks: 'Task completion report rejected by administrator.',
          adminRemarks: 'Task completion report rejected by administrator.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reject task report.');
      setStatusMsg({ type: 'success', text: `Rejected completion report for ${displayName}.` });
      await loadTaskDetail(selectedTaskDetail.id);
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to reject task.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async (percentage: number) => {
    if (!selectedTaskDetail || selectedRecordIds.length === 0) return;
    setActionLoading(true);
    setStatusMsg(null);
    try {
      const selectedRecords = selectedTaskDetail.studentRecords.filter((r) =>
        selectedRecordIds.includes(r.id)
      );
      const res = await fetch(`/api/tasks/${selectedTaskDetail.id}/bulk-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentTaskRecordIds: selectedRecordIds,
          approvals: selectedRecords.map((r) => r.studentId),
          percentage,
          approvedPercentage: percentage,
          adminRemarks: `Bulk approved at ${percentage}%`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk approval failed.');
      setStatusMsg({
        type: data.failureCount > 0 ? 'error' : 'success',
        text: `Bulk completed: ${data.successCount} approved, ${data.failureCount} failed.`,
      });
      setSelectedRecordIds([]);
      setCustomPctModalOpen(false);
      await loadTaskDetail(selectedTaskDetail.id);
      await fetchTasks();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed bulk approval.' });
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectRecord = (recordId: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  const toggleSelectAll = () => {
    if (!selectedTaskDetail) return;
    const currentTargetIds = filteredAssociatedRecords.map((r) => r.id);
    if (selectedRecordIds.length === currentTargetIds.length && currentTargetIds.length > 0) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(currentTargetIds);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return isoString;
    }
  };

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.taskId.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }, [tasks, searchQuery]);

  // Metrics totals
  const totalTasksCount = tasks.length;
  const activeTasksCount = tasks.filter((t) => t.dateStatus === 'ACTIVE').length;
  const pendingReviewsCount = tasks.reduce((sum, t) => sum + (t.pendingReviews || 0), 0);
  const totalPointsAwardedOverall = tasks.reduce((sum, t) => sum + (t.totalPointsAwarded || 0), 0);
  const totalRewardsIssuedOverall = tasks.reduce((sum, t) => sum + (t.totalRewardsIssued || 0), 0);

  // Live calculation for custom % modal
  const livePctNum = Math.max(0, Math.min(100, parseFloat(customPercentageInput) || 0));
  const liveMaxPoints = selectedTaskDetail?.maxPoints || 0;
  const liveMaxFund = selectedTaskDetail?.maxFund || 0;
  const liveCalculatedPoints = Math.round(((liveMaxPoints * livePctNum) / 100) * 100) / 100;
  const liveCalculatedAmount = Math.round(((liveMaxFund * livePctNum) / 100) * 100) / 100;

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center space-x-2.5">
              <CheckSquare className="w-7 h-7 text-emerald-600" />
              <span>Task Management</span>
              <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Points & Wallet Rewards
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Create student tasks, verify completion reports, approve points & monetary rewards, and manage post-expiry
              records.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => fetchTasks(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-all"
              title="Refresh Tasks"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between shadow-md transition-all ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-sm font-semibold">{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="p-1 hover:bg-black/5 rounded-lg text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Tasks</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{totalTasksCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Active Tasks</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">{activeTasksCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Reviews</p>
            <h3 className="text-2xl font-black text-amber-700 mt-0.5">{pendingReviewsCount}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Points Awarded</p>
            <h3 className="text-2xl font-black text-indigo-700 mt-0.5">+{totalPointsAwardedOverall}</h3>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Cash Issued</p>
            <h3 className="text-2xl font-black text-emerald-700 mt-0.5">₹{totalRewardsIssuedOverall.toFixed(2)}</h3>
          </div>
        </div>

        {/* Controls Bar: Filters & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
            {(['ALL', 'ACTIVE', 'SCHEDULED', 'EXPIRED', 'DRAFT'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === filter
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {filter === 'ALL'
                  ? 'All Tasks'
                  : filter === 'ACTIVE'
                  ? 'Active'
                  : filter === 'SCHEDULED'
                  ? 'Scheduled'
                  : filter === 'EXPIRED'
                  ? 'Expired'
                  : 'Drafts'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, ID, or keywords..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>

        {/* Task Cards List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <p className="text-sm text-slate-500">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-white border border-slate-200 p-8 shadow-sm">
            <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Tasks Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No tasks match your selected filter or search query. Click &quot;Add Task&quot; above to create a new task.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {filteredTasks.map((t) => {
              const isExpired = t.dateStatus === 'EXPIRED';
              const isActive = t.dateStatus === 'ACTIVE';
              const isScheduled = t.dateStatus === 'SCHEDULED';
              const isDraft = t.publicationStatus === 'DRAFT';

              return (
                <div
                  key={t.id}
                  className="rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                          {t.taskId}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                            isDraft
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isScheduled
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isDraft ? 'Draft' : isActive ? 'Active' : isScheduled ? 'Scheduled' : 'Expired'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setTaskToDelete(t)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{t.title}</h3>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                        {t.description}
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-2">
                        <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Max Points</p>
                          <p className="text-sm font-extrabold text-slate-900">{t.maxPoints} pts</p>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-2">
                        <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Max Reward</p>
                          <p className="text-sm font-extrabold text-emerald-700">₹{t.maxFund.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Date Details & Audience */}
                    <div className="space-y-1 text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Valid:{' '}
                          <strong className="text-slate-700">
                            {formatDate(t.startDate)} – {formatDate(t.endDate)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          Audience:{' '}
                          <strong className="text-slate-700">
                            {t.targetAudience === 'ALL'
                              ? 'All Students'
                              : t.targetAudience === 'SPECIFIC_CLASS'
                              ? `Class: ${t.targetClassName || 'Assigned Class'}`
                              : 'Specific Students'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Activity Counters Bar */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500">Students: </span>
                        <strong className="text-slate-800 font-bold">{t.studentCount}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Pending: </span>
                        <span
                          className={`font-black px-1.5 py-0.5 rounded-full text-[10px] ${
                            t.pendingReviews > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-700'
                          }`}
                        >
                          {t.pendingReviews}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Approved: </span>
                        <strong className="text-emerald-700 font-bold">{t.approvedCount}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Manage Button */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">By {t.createdByName}</span>
                    <button
                      onClick={() => loadTaskDetail(t.id)}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-all"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Manage Records & Rewards</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Task Detail & Student Management Modal */}
        {manageTaskModalOpen && selectedTaskDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-200 text-slate-800">
                      {selectedTaskDetail.taskId}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                        selectedTaskDetail.dateStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : selectedTaskDetail.dateStatus === 'SCHEDULED'
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      {selectedTaskDetail.dateStatus}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
                    {selectedTaskDetail.title}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Max: {selectedTaskDetail.maxPoints} pts • ₹{selectedTaskDetail.maxFund.toFixed(2)} | Valid:{' '}
                    {formatDate(selectedTaskDetail.startDate)} – {formatDate(selectedTaskDetail.endDate)}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setTaskToDelete(selectedTaskDetail)}
                    className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Task"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setManageTaskModalOpen(false)}
                    className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Expired Task Banner (Highlights Phase 4.4 Rule) */}
              {selectedTaskDetail.dateStatus === 'EXPIRED' && (
                <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center space-x-2 text-xs text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Task is Expired for students.</strong> Administrative management remains open: you can add
                    students, verify completion, approve custom percentages, award points, and issue rewards.
                  </span>
                </div>
              )}

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Add Student Record Manually Section */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      <span>Add Student Record Manually</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">Search by student name or SPR ID</span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="Search unassigned students by name or SPR ID (e.g. Majid or SPR0092)..."
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    />
                    {studentSearchQuery && (
                      <button
                        onClick={() => {
                          setStudentSearchQuery('');
                          setCandidateStudents([]);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {searchingCandidates && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-8 top-1/2 -translate-y-1/2 text-emerald-600" />
                    )}
                  </div>

                  {studentSearchQuery.trim().length >= 1 && !searchingCandidates && candidateStudents.length === 0 && (
                    <div className="p-3 text-center text-xs text-slate-500 rounded-xl bg-slate-100/70 border border-slate-200">
                      No unassigned students match &ldquo;{studentSearchQuery}&rdquo;.
                    </div>
                  )}

                  {candidateStudents.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 max-h-52 overflow-y-auto shadow-md">
                      <div className="p-2 px-3 bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                        <span>Found {candidateStudents.length} candidate students</span>
                        <span>Click to add</span>
                      </div>
                      {candidateStudents.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 px-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-900">{c.fullName}</p>
                            <p className="text-[10px] text-slate-500">
                              {c.sprStudentId} • {c.className} ({c.division})
                            </p>
                          </div>
                          <button
                            onClick={() => handleAddStudentToTask(c.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                          >
                            Add to Task
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bulk Actions Bar */}
                {selectedRecordIds.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fade-in">
                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px]">
                        {selectedRecordIds.length}
                      </span>
                      <span>Students Selected</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleBulkApprove(100)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs transition-all"
                      >
                        Bulk Complete (100%)
                      </button>
                      <button
                        onClick={() => {
                          setCustomPctTarget('BULK');
                          setCustomPercentageInput('100');
                          setCustomPctModalOpen(true);
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all"
                      >
                        Bulk Custom %
                      </button>
                      <button
                        onClick={() => setSelectedRecordIds([])}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Student Records Table */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>
                        Associated Student Records ({filteredAssociatedRecords.length}
                        {filteredAssociatedRecords.length !== selectedTaskDetail.studentRecords.length
                          ? ` of ${selectedTaskDetail.studentRecords.length}`
                          : ''}
                        )
                      </span>
                    </h4>
                    <div className="flex items-center space-x-2">
                      <div className="relative w-48 sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={recordsFilterQuery}
                          onChange={(e) => setRecordsFilterQuery(e.target.value)}
                          placeholder="Filter records (name, SPR ID)..."
                          className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                        />
                        {recordsFilterQuery && (
                          <button
                            onClick={() => setRecordsFilterQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {selectedTaskDetail.studentRecords.length > 0 && (
                        <button
                          onClick={toggleSelectAll}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 whitespace-nowrap px-2 py-1 rounded-lg hover:bg-emerald-50"
                        >
                          {selectedRecordIds.length === filteredAssociatedRecords.length &&
                          filteredAssociatedRecords.length > 0
                            ? 'Deselect All'
                            : 'Select All'}
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredAssociatedRecords.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl bg-slate-50 border border-slate-200 p-6">
                      <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {recordsFilterQuery
                          ? `No associated students match "${recordsFilterQuery}"`
                          : 'No student records attached to this task yet.'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {recordsFilterQuery
                          ? 'Try a different search term or clear the filter.'
                          : 'Students can submit reports, or you can add them manually above.'}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="py-3 px-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedRecordIds.length > 0 &&
                                    selectedRecordIds.length === filteredAssociatedRecords.length
                                  }
                                  onChange={toggleSelectAll}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </th>
                              <th className="py-3 px-4">Student</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Submission / Notes</th>
                              <th className="py-3 px-4 text-center">Approved %</th>
                              <th className="py-3 px-4 text-right">Points</th>
                              <th className="py-3 px-4 text-right">Cash Reward</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredAssociatedRecords.map((r) => {
                              const isApproved = r.status === 'APPROVED' || r.status === 'COMPLETED';
                              const isRejected = r.status === 'REJECTED';
                              const isSubmitted =
                                r.status === 'SUBMITTED' ||
                                r.status === 'PENDING_REVIEW' ||
                                (r.status as string) === 'UNDER_REVIEW';
                              const isChecked = selectedRecordIds.includes(r.id);

                              return (
                                <tr key={r.id} className={`hover:bg-slate-50/70 ${isChecked ? 'bg-emerald-50/40' : ''}`}>
                                  <td className="py-3.5 px-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectRecord(r.id)}
                                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-slate-900">
                                    <div className="text-sm font-extrabold text-slate-900">
                                      {r.fullName || r.studentName || 'Student Name'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-normal">
                                      {r.sprStudentId} • {r.className} ({r.division})
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                        isApproved
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                          : isRejected
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : isSubmitted
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}
                                    >
                                      {(r.status as string) === 'UNDER_REVIEW' ? 'Under Review' : r.status}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                                    {r.submissionNotes ? (
                                      <p className="line-clamp-2 text-[11px] italic">&quot;{r.submissionNotes}&quot;</p>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">—</span>
                                    )}
                                    {r.submittedAt && (
                                      <p className="text-[9px] text-slate-400 mt-0.5">
                                        Submitted: {formatDate(r.submittedAt)}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-extrabold text-slate-700">
                                    {r.approvedPercentage !== null ? `${r.approvedPercentage}%` : '—'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-extrabold text-indigo-600">
                                    {r.awardedPoints > 0 ? `+${r.awardedPoints} pts` : '0'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-black text-emerald-700">
                                    {r.awardedAmount > 0 ? `+₹${r.awardedAmount.toFixed(2)}` : '₹0.00'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                                    <button
                                      onClick={() => handleApproveSingle(r, 100)}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                                      title="Approve 100% completion"
                                    >
                                      100%
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCustomPctTarget('SINGLE');
                                        setTargetRecord(r);
                                        setCustomPercentageInput(
                                          r.approvedPercentage !== null ? r.approvedPercentage.toString() : '100'
                                        );
                                        setAdminRemarksInput(r.adminRemarks || '');
                                        setCustomPctModalOpen(true);
                                      }}
                                      disabled={actionLoading}
                                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 transition-all"
                                      title="Enter custom completion percentage"
                                    >
                                      Custom %
                                    </button>
                                    {!isRejected && (
                                      <button
                                        onClick={() => handleRejectSingle(r)}
                                        disabled={actionLoading}
                                        className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200 transition-all"
                                        title="Reject report"
                                      >
                                        Reject
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Reward Transactions Ledger */}
                {selectedTaskDetail.rewardLedgers.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Issued Reward Transactions ({selectedTaskDetail.rewardLedgers.length})</span>
                    </h4>
                    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                          <tr>
                            <th className="py-2.5 px-3">Student</th>
                            <th className="py-2.5 px-3">Amount</th>
                            <th className="py-2.5 px-3">Transaction Reference</th>
                            <th className="py-2.5 px-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedTaskDetail.rewardLedgers.map((l) => (
                            <tr key={l.id}>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {l.studentName} ({l.sprStudentId})
                              </td>
                              <td className="py-2 px-3 font-black text-emerald-700">+₹{l.amount.toFixed(2)}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[10px]">
                                {l.transactionReference}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-500">{formatDate(l.approvedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Custom Percentage Modal */}
        {customPctModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    %
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {customPctTarget === 'BULK' ? 'Bulk Percentage Approval' : 'Approve Custom Percentage'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {customPctTarget === 'BULK'
                        ? `${selectedRecordIds.length} students selected`
                        : targetRecord?.fullName || targetRecord?.studentName || targetRecord?.sprStudentId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCustomPctModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Completion Percentage (0 – 100%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={customPercentageInput}
                    onChange={(e) => setCustomPercentageInput(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-300 text-base font-black text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              {/* Live Preview */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                  Calculated Reward Preview ({livePctNum}%):
                </p>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Points Awarded:</span>
                  <span className="font-black text-indigo-700">+{liveCalculatedPoints} pts</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                  <span>Monetary Reward:</span>
                  <span className="font-black text-emerald-800">+₹{liveCalculatedAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Admin Remarks <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={adminRemarksInput}
                  onChange={(e) => setAdminRemarksInput(e.target.value)}
                  placeholder="e.g. Excellent research report, verified by teacher"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomPctModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (customPctTarget === 'BULK') {
                      handleBulkApprove(livePctNum);
                    } else if (targetRecord) {
                      handleApproveSingle(targetRecord, livePctNum, adminRemarksInput);
                    }
                  }}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center space-x-1"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Approve & Credit Reward</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Task Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-emerald-600" />
                  <span>Create New Task</span>
                </h3>
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Task Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Science Fair Project Submission 2026"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Task Description / Body <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide full task details, requirements, submission instructions, and deliverables..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Maximum Points <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={formData.maxPoints}
                      onChange={(e) => setFormData({ ...formData, maxPoints: e.target.value })}
                      placeholder="e.g. 20"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Maximum Fund / Reward (INR ₹) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.maxFund}
                      onChange={(e) => setFormData({ ...formData, maxFund: e.target.value })}
                      placeholder="e.g. 10.00"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      Start Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Interpreted in Asia/Kolkata timezone</p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">
                      End Date (Inclusive) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Valid until 23:59:59 IST of this date</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Target Audience</label>
                    <select
                      value={formData.targetAudience}
                      onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="ALL">All Eligible Students</option>
                      <option value="SPECIFIC_CLASS">Specific Academic Class</option>
                      <option value="SPECIFIC_STUDENTS">Selected Students</option>
                    </select>
                  </div>

                  {formData.targetAudience === 'SPECIFIC_CLASS' ? (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Select Class</label>
                      <select
                        value={formData.targetClassId}
                        onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Choose Class...</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-800">Publication Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="PUBLISHED">Published</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTask}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center space-x-1.5"
                  >
                    {savingTask ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Task...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Create & Save Task</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Task Modal */}
        {editModalOpen && editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <Edit2 className="w-5 h-5 text-emerald-600" />
                  <span>Edit Task: {editingTask.taskId}</span>
                </h3>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditTask} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Task Title</label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Task Description</label>
                  <textarea
                    required
                    rows={4}
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Start Date</label>
                    <input
                      type="date"
                      required
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">End Date (Inclusive)</label>
                    <input
                      type="date"
                      required
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Publication Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTask}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center space-x-1.5"
                  >
                    {savingTask ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Update Task</span>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Task Confirmation Modal */}
        {taskToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-rose-600">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Delete Task</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-slate-900">&quot;{taskToDelete.title}&quot;</span> ({taskToDelete.taskId})? This will permanently remove the task, its assignments, submitted records, and associated ledgers.
              </p>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskToDelete(null)}
                  disabled={deletingTask}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={deletingTask}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shadow-rose-600/30 disabled:opacity-50"
                >
                  {deletingTask ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Task</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
