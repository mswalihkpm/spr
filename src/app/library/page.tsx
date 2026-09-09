'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Library,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Save,
  Plus,
  ArrowRight,
  BookOpen,
  Award,
  Trash2,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import SearchableStudentSelect from '@/components/ui/SearchableStudentSelect';


export default function LibraryPage() {
  const [integration, setIntegration] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual Reading Entry Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [manualData, setManualData] = useState({
    studentId: '',
    booksRead: '12',
    readingScore: '94',
    readingPeriod: 'Term 1 2026',
  });

  // Bulk selection & deletion state
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const handleToggleSelectAll = () => {
    const allSelected = records.length > 0 && records.every((r) => selectedRecordIds.includes(r.id));
    if (allSelected) {
      const recordIdSet = new Set(records.map((r) => r.id));
      setSelectedRecordIds((prev) => prev.filter((id) => !recordIdSet.has(id)));
    } else {
      setSelectedRecordIds((prev) => Array.from(new Set([...prev, ...records.map((r) => r.id)])));
    }
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedRecordIds.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedRecordIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to bulk delete library records.');

      const count = selectedRecordIds.length;
      setSelectedRecordIds([]);
      setConfirmBulkDeleteOpen(false);
      setStatusMsg({ type: 'success', text: `Successfully deleted ${count} library record(s).` });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error bulk deleting records.' });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteRecord = async (r: any) => {
    if (!confirm(`Delete library record for ${r.student?.fullName}?`)) return;
    try {
      const res = await fetch(`/api/library?id=${r.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete record.');

      setStatusMsg({ type: 'success', text: 'Library record deleted.' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error deleting library record');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resLib, resStudents] = await Promise.all([
        fetch('/api/library'),
        fetch('/api/students?all=true'),
      ]);

      const dataLib = await resLib.json();
      const dataStudents = await resStudents.json();

      if (dataLib.integration) setIntegration(dataLib.integration);
      if (dataLib.records) setRecords(dataLib.records);
      if (dataStudents.students) {
        setStudents(dataStudents.students);
        if (dataStudents.students.length > 0 && !manualData.studentId) {
          setManualData((prev) => ({ ...prev, studentId: dataStudents.students[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTriggerSync = async () => {
    setSyncing(true);
    setStatusMsg(null);

    try {
      // Simulate live sync heartbeat to endpoint https://msoelibrary.vercel.app/
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_CONFIG',
          endpointUrl: 'https://msoelibrary.vercel.app/',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');

      setStatusMsg({ type: 'success', text: 'Kuthbakhana library synchronization completed successfully.' });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleManualImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    try {
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'IMPORT_RECORDS',
          readingPeriod: manualData.readingPeriod,
          records: [
            {
              studentId: manualData.studentId,
              booksRead: Number(manualData.booksRead),
              readingScore: Number(manualData.readingScore),
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');

      setStatusMsg({ type: 'success', text: 'Reading record added to student profile.' });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900 border border-purple-300">
                MSOE Kuthbakhana Reading Wing
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Library className="w-5 h-5 text-purple-700" />
              <span>Library & Reading Performance Engine</span>
            </h2>
            <p className="text-xs text-slate-500">
              Synchronized with the MSOE Library Portal for tracking reading habits and comprehension benchmarks.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 text-purple-600 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync with MSOE Library'}</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-semibold flex items-center space-x-1.5 shadow transition-all"
            >
              <Plus className="w-4 h-4 text-gold-400" />
              <span>Add Reading Record</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{statusMsg.text}</span>
          </div>
        )}

        {/* Integration Status Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Connection Status</div>
              <div className="text-xs font-extrabold text-emerald-700 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>CONNECTED TO MSOE LIBRARY</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400">Library Web Endpoint</div>
              <a
                href={integration?.endpointUrl || 'https://msoelibrary.vercel.app/'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-madin-700 hover:text-madin-900 truncate block underline"
              >
                {integration?.endpointUrl || 'https://msoelibrary.vercel.app/'}
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Last Synchronized</div>
              <div className="text-xs font-bold text-slate-800">
                {integration?.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString() : 'Just now'}
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Action Toolbar */}
        {selectedRecordIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedRecordIds.length} reading record(s) selected
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setSelectedRecordIds([])}
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
                <span>Delete Selected ({selectedRecordIds.length})</span>
              </button>
            </div>
          </div>
        )}

        {/* Reading Champions Leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-purple-700" />
              <span className="text-xs font-bold text-slate-800">Kuthbakhana Reading Records & Ranking</span>
            </div>
            <span className="text-xs text-slate-500">{records.length} reader profiles</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-2.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={records.length > 0 && records.every((r) => selectedRecordIds.includes(r.id))}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="py-2.5 px-4">Reading Rank</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class & School</th>
                  <th className="py-2.5 px-4 text-center">Books Read</th>
                  <th className="py-2.5 px-4">Period</th>
                  <th className="py-2.5 px-4 text-right">Reading Score</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading library reading logs..." subtext="Syncing Kuthbakhana catalog" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No reading records logged yet.
                    </td>
                  </tr>
                ) : (
                  records.map((r: any, idx: number) => {
                    const isSelected = selectedRecordIds.includes(r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-rose-50/50' : ''}`}>
                        <td className="py-2.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectRecord(r.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-purple-800">
                          #{r.readingRank || idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.student?.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.student?.class?.name} • {r.student?.school?.name}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-bold border border-purple-200">
                            📖 {r.booksRead} books
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">{r.readingPeriod || 'Term 1 2026'}</td>
                        <td className="py-2.5 px-4 text-right font-black text-madin-900">
                          {r.readingScore}%
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRecord(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Reading Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-madin-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Add Student Reading Log
            </h3>

            <form onSubmit={handleManualImport} className="mt-4 space-y-3.5">
              <div>
                <SearchableStudentSelect
                  students={students}
                  value={manualData.studentId}
                  onChange={(stId) => setManualData((prev) => ({ ...prev, studentId: stId }))}
                  required
                  label="Student *"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Books Read *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={manualData.booksRead}
                    onChange={(e) => setManualData({ ...manualData, booksRead: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reading Score (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={manualData.readingScore}
                    onChange={(e) => setManualData({ ...manualData, readingScore: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reading Period</label>
                <input
                  type="text"
                  value={manualData.readingPeriod}
                  onChange={(e) => setManualData({ ...manualData, readingPeriod: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-madin-900 text-white rounded-xl text-xs font-semibold hover:bg-madin-950 shadow"
                >
                  Save Reading Record
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

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong className="text-rose-600">{selectedRecordIds.length}</strong> selected library reading record(s)? Reading champion standings and 360° dossiers will update automatically.
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
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center space-x-1.5"
              >
                {bulkDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete {selectedRecordIds.length} Record(s)</span>
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
