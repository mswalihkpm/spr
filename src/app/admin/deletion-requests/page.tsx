'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  User,
  Building,
  ShieldAlert,
  FileText,
  Mail,
  Phone,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Info,
  SlidersHorizontal,
  X,
  AlertTriangle,
} from 'lucide-react';

interface DeletionRequest {
  id: string;
  reference: string;
  studentIdentifier: string;
  matchedStudentId: string | null;
  student: {
    id: string;
    fullName: string;
    sprStudentId: string | null;
    studentId: string;
    status: string;
    class?: { id: string; name: string };
    account?: {
      id: string;
      status: string;
      isActivated: boolean;
      lastLoginAt: string | null;
    };
  } | null;
  requesterType: 'STUDENT' | 'PARENT_GUARDIAN';
  requesterName: string;
  requesterContact: string;
  relationship: string | null;
  requestType: 'ACCOUNT_DELETION' | 'FULL_DELETION';
  reason: string | null;
  parentalConsent: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  rejectionReason: string | null;
  adminNotes: string | null;
  handledById: string | null;
  handledByName: string | null;
  handledBy?: { id: string; name: string; email: string };
  handledAt: string | null;
  completedAt: string | null;
  executionSummary: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDeletionRequestsPage() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [confirmExecuteOpen, setConfirmExecuteOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/admin/deletion-requests?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to load deletion requests.');
      }
      const data = await res.json();
      setRequests(data.requests || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error fetching requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  const openManageModal = (req: DeletionRequest) => {
    setSelectedRequest(req);
    setAdminNotesInput(req.adminNotes || '');
    setRejectionReasonInput(req.rejectionReason || '');
    setConfirmExecuteOpen(false);
    setModalOpen(true);
  };

  const handleAction = async (action: 'APPROVE' | 'REJECT' | 'EXECUTE_AND_COMPLETE') => {
    if (!selectedRequest) return;

    if (action === 'REJECT' && !rejectionReasonInput.trim()) {
      alert('Please enter a rejection reason to inform the requester why deletion cannot be performed.');
      return;
    }

    setActionInProgress(true);
    try {
      const res = await fetch('/api/admin/deletion-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action,
          rejectionReason: rejectionReasonInput.trim(),
          adminNotes: adminNotesInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Action failed.');
      }

      setStatusMsg({
        type: 'success',
        text: data.message || `Request ${selectedRequest.reference} successfully updated.`,
      });
      setModalOpen(false);
      setConfirmExecuteOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Error executing action.');
    } finally {
      setActionInProgress(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3" />
            <span>Pending Review</span>
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Approved</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
            <XCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" />
            <span>Completed</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Account & Data Deletion Requests
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Process public student and parent requests for account deactivation and data scrubbing in compliance with
              Google Play User Data policies, statutory academic retention laws, and institutional standards.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <a
              href="/delete-account"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-madin-900 hover:bg-madin-800 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
            >
              <span>Public Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center justify-between ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Pills & Summary Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'ALL', label: 'All Requests', count: counts.total, color: 'slate' },
            { id: 'PENDING', label: 'Pending Review', count: counts.pending, color: 'amber' },
            { id: 'APPROVED', label: 'Approved', count: counts.approved, color: 'blue' },
            { id: 'REJECTED', label: 'Rejected', count: counts.rejected, color: 'rose' },
            { id: 'COMPLETED', label: 'Completed', count: counts.completed, color: 'emerald' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">{tab.label}</span>
                <span className="text-xl font-black text-slate-900 dark:text-white mt-1">{tab.count}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by reference, student identifier, requester name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Requests Table / Cards */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span>Loading deletion requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="font-bold text-slate-800 dark:text-slate-200">No requests found</div>
              <p>There are no account deletion requests matching the current filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Reference / Date</th>
                    <th className="px-4 py-3">Student Target</th>
                    <th className="px-4 py-3">Requester Info</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Handled By</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white block">
                          {req.reference}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{req.studentIdentifier}</div>
                        {req.student ? (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center space-x-1 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>
                              Matched: {req.student.fullName} ({req.student.sprStudentId || req.student.studentId})
                              {req.student.class ? ` - ${req.student.class.name}` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center space-x-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>Unmatched / Manual Lookup Required</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-white">
                          {req.requesterName}{' '}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                            {req.requesterType === 'PARENT_GUARDIAN' ? `Guardian (${req.relationship || 'Parent'})` : 'Student'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{req.requesterContact}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-semibold">
                          {req.requestType === 'ACCOUNT_DELETION' ? 'Account Deactivation' : 'Full Data Scrub'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">{getStatusBadge(req.status)}</td>

                      <td className="px-4 py-3.5">
                        {req.handledByName ? (
                          <div>
                            <span className="font-medium text-slate-900 dark:text-white block">{req.handledByName}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                              {req.handledAt ? new Date(req.handledAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => openManageModal(req)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs transition cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal: Review & Manage Deletion Request */}
        {modalOpen && selectedRequest && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                      {selectedRequest.reference}
                    </span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    Manage Deletion Request
                  </h3>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Request Details Breakdown */}
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Target Student Identifier:</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {selectedRequest.studentIdentifier}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Database Record Linkage:</span>
                    {selectedRequest.student ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold block">
                        Linked: {selectedRequest.student.fullName} ({selectedRequest.student.sprStudentId || selectedRequest.student.studentId})
                        <span className="block text-[10px] text-slate-500">
                          Portal Account: {selectedRequest.student.account ? selectedRequest.student.account.status : 'None'}
                        </span>
                      </span>
                    ) : (
                      <span className="text-amber-700 dark:text-amber-400 font-bold block">
                        No direct database record auto-matched
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Requester:</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {selectedRequest.requesterName} ({selectedRequest.requesterType})
                    </span>
                    {selectedRequest.relationship && (
                      <span className="text-[11px] text-slate-500">Relationship: {selectedRequest.relationship}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Contact for Verification:</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {selectedRequest.requesterContact}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Requested Action:</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {selectedRequest.requestType === 'ACCOUNT_DELETION' ? 'Account Deactivation' : 'Full Data Scrubbing'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium block">Submission Date:</span>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {selectedRequest.reason && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 font-medium block mb-0.5">
                      Requester Stated Reason:
                    </span>
                    <p className="text-slate-800 dark:text-slate-200 italic">&ldquo;{selectedRequest.reason}&rdquo;</p>
                  </div>
                )}

                {/* Execution / Completion Logs */}
                {selectedRequest.executionSummary && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-1">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 block">
                      Execution & Retention Audit Summary:
                    </span>
                    <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                      {selectedRequest.executionSummary}
                    </p>
                    {selectedRequest.completedAt && (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-1">
                        Completed at: {new Date(selectedRequest.completedAt).toLocaleString()} by {selectedRequest.handledByName}
                      </span>
                    )}
                  </div>
                )}

                {/* Rejection Details if rejected */}
                {selectedRequest.status === 'REJECTED' && selectedRequest.rejectionReason && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-1">
                    <span className="font-bold text-rose-900 dark:text-rose-200 block">Rejection Reason:</span>
                    <p className="text-rose-800 dark:text-rose-300 text-[11px] leading-relaxed">
                      {selectedRequest.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Admin Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Administrative Notes / Audit Log Remarks:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter internal verification notes, parent identity confirmation details, etc."
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* If Rejecting is active, display Rejection Reason input */}
                {selectedRequest.status !== 'REJECTED' && selectedRequest.status !== 'COMPLETED' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Reason for Rejection (Required only if clicking Reject):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Identity could not be verified / Incomplete student records"
                      value={rejectionReasonInput}
                      onChange={(e) => setRejectionReasonInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}

                {/* Execution Confirmation Box */}
                {confirmExecuteOpen && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 space-y-3">
                    <div className="flex items-center space-x-2 font-bold text-sm text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Confirm Deletion & Account Deactivation Execution</span>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      Executing this will immediately:
                      <br />• Deactivate the student portal login (<code className="font-mono">StudentAccount</code>) and revoke password credentials.
                      <br />• Purge profile photos and personal notes.
                      <br />• Mark student status as INACTIVE.
                      <br />• <strong>Statutory Retention:</strong> Official term scores and historical grade transcripts will be preserved as legally required.
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => handleAction('EXECUTE_AND_COMPLETE')}
                        disabled={actionInProgress}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                      >
                        {actionInProgress ? 'Executing...' : 'Yes, Execute & Mark Completed'}
                      </button>
                      <button
                        onClick={() => setConfirmExecuteOpen(false)}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              {!confirmExecuteOpen && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                  >
                    Close
                  </button>

                  <div className="flex items-center space-x-2">
                    {/* If PENDING */}
                    {selectedRequest.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction('REJECT')}
                          disabled={actionInProgress}
                          className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold text-xs transition cursor-pointer"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleAction('APPROVE')}
                          disabled={actionInProgress}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          Approve Request
                        </button>
                        <button
                          onClick={() => setConfirmExecuteOpen(true)}
                          disabled={actionInProgress}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          Execute Deletion
                        </button>
                      </>
                    )}

                    {/* If APPROVED */}
                    {selectedRequest.status === 'APPROVED' && (
                      <>
                        <button
                          onClick={() => handleAction('REJECT')}
                          disabled={actionInProgress}
                          className="px-4 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 dark:text-rose-300 font-bold text-xs transition cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setConfirmExecuteOpen(true)}
                          disabled={actionInProgress}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                        >
                          Execute Deletion & Complete
                        </button>
                      </>
                    )}

                    {/* If COMPLETED or REJECTED */}
                    {(selectedRequest.status === 'COMPLETED' || selectedRequest.status === 'REJECTED') && (
                      <span className="text-xs text-slate-500 italic">This request is finalized and closed.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

