'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Library,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Plus,
  BookOpen,
  Award,
  Trash2,
  Trophy,
  Medal,
  Flame,
  Sparkles,
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
    booksRead: '5',
    readingScore: '140',
    readingRank: '1',
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
      const res = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SYNC' }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');

      setStatusMsg({
        type: 'success',
        text: json.message || 'Successfully synchronized Top Readers Leaderboard from MSOE Library.',
      });
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sync library leaderboard.' });
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
              readingRank: Number(manualData.readingRank),
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');

      setStatusMsg({ type: 'success', text: 'Reading record saved.' });
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  // Top 3 Podium
  const top1 = records.length > 0 ? records[0] : null;
  const top2 = records.length > 1 ? records[1] : null;
  const top3 = records.length > 2 ? records[2] : null;

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/library-logo.png"
                alt="Library & Reading"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-200 flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-rose-600" />
                  <span>Imthiyaaz Library • Leaderboard Sync</span>
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
                <span>Library Leaderboard & Top Readers</span>
              </h2>
              <p className="text-xs text-slate-500">
                Synchronized exclusively with the MSOE Library Leaderboard portal (
                <a
                  href="https://msoelibrary.vercel.app/leaderboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-madin-700 hover:underline font-semibold"
                >
                  msoelibrary.vercel.app/leaderboard
                </a>
                ) for official reader rankings and point standings.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTriggerSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-madin-900 hover:bg-madin-950 text-white text-xs font-bold flex items-center space-x-2 shadow transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing Leaderboard...' : 'Sync with MSOE Library'}</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-200"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center space-x-2.5 animate-fade-in ${
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

        {/* Notice & Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 p-5 rounded-2xl text-white shadow-md relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-4 h-4 text-gold-400" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                National Librarian&apos;s Day Special
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              - പുതിയ ലീഡർബോർഡ് ഓഗസ്റ്റ് 12 ന് സ്റ്റാർട്ട് ചെയ്യും. ആയതിനാൽ നിലവിലെ ടോപ് റീഡറിനെ ഓഗസ്റ്റ് 12 ന് തിരഞ്ഞെടുക്കും. വായിക്കുക....വളരുക...ഉയരുക...!
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Endpoint: <strong>msoelibrary.vercel.app/leaderboard</strong></span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Real-Time Sync Active</span>
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sync Telemetry</div>
              <div className="text-sm font-extrabold text-slate-800 mt-1 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                <span>{records.length} Scored Reader Profiles</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Only students with verified points on the library website leaderboard are imported.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Last Synced:</span>
              <span className="font-bold text-slate-700">
                {integration?.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* Top 3 Podium Cards */}
        {records.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Rank 2 */}
            <div className="bg-gradient-to-b from-slate-100 to-white border border-slate-200 p-5 rounded-2xl shadow-subtle flex flex-col items-center text-center relative hover:scale-[1.02] transition">
              <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm mb-2 shadow-inner">
                #2
              </div>
              <div className="text-sm font-bold text-slate-900 truncate max-w-full">
                {top2?.student?.fullName}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {top2?.student?.class?.name} • {top2?.student?.school?.name}
              </div>
              <div className="mt-3 px-3 py-1 bg-slate-200/70 text-slate-800 rounded-xl font-mono font-black text-xs">
                {top2?.readingScore} pts • {top2?.booksRead} books
              </div>
            </div>

            {/* Rank 1 */}
            <div className="bg-gradient-to-b from-amber-100 via-amber-50 to-white border-2 border-amber-300 p-6 rounded-2xl shadow-md flex flex-col items-center text-center relative -translate-y-2 hover:scale-[1.02] transition">
              <div className="absolute -top-3 px-3 py-0.5 bg-amber-500 text-white text-[10px] font-black uppercase rounded-full tracking-wider shadow">
                👑 Top Reader
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black text-base mb-2 shadow-md">
                #1
              </div>
              <div className="text-base font-extrabold text-slate-900 truncate max-w-full">
                {top1?.student?.fullName}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {top1?.student?.class?.name} • {top1?.student?.school?.name}
              </div>
              <div className="mt-3 px-4 py-1.5 bg-amber-400 text-amber-950 rounded-xl font-mono font-black text-sm shadow-sm">
                {top1?.readingScore} pts • {top1?.booksRead} books
              </div>
            </div>

            {/* Rank 3 */}
            <div className="bg-gradient-to-b from-orange-100/50 to-white border border-orange-200 p-5 rounded-2xl shadow-subtle flex flex-col items-center text-center relative hover:scale-[1.02] transition">
              <div className="w-10 h-10 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center font-black text-sm mb-2 shadow-inner">
                #3
              </div>
              <div className="text-sm font-bold text-slate-900 truncate max-w-full">
                {top3?.student?.fullName}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {top3?.student?.class?.name} • {top3?.student?.school?.name}
              </div>
              <div className="mt-3 px-3 py-1 bg-orange-100 text-orange-900 rounded-xl font-mono font-black text-xs">
                {top3?.readingScore} pts • {top3?.booksRead} books
              </div>
            </div>
          </div>
        )}

        {/* Bulk Action Toolbar */}
        {selectedRecordIds.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-xs font-bold text-rose-950">
                {selectedRecordIds.length} leaderboard record(s) selected
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

        {/* Reading Champions Leaderboard Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-rose-700" />
              <span className="text-xs font-bold text-slate-800">Library Leaderboard Standings</span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">{records.length} Scored Readers</span>
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
                  <th className="py-2.5 px-4">Rank</th>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Class & School</th>
                  <th className="py-2.5 px-4 text-center">Books Read</th>
                  <th className="py-2.5 px-4 text-right">Leaderboard Points</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center">
                      <VideoLoader size="md" text="Loading library leaderboard..." subtext="Connecting to Imthiyaaz Library" />
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <Trophy className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-semibold">No leaderboard records found.</p>
                      <button
                        onClick={handleTriggerSync}
                        className="mt-3 px-4 py-2 bg-madin-900 text-white rounded-xl font-bold text-xs shadow hover:bg-madin-950"
                      >
                        Sync Now from MSOE Library
                      </button>
                    </td>
                  </tr>
                ) : (
                  records.map((r: any, idx: number) => {
                    const isSelected = selectedRecordIds.includes(r.id);
                    const rankNum = r.readingRank || idx + 1;
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
                        <td className="py-2.5 px-4 font-mono font-bold">
                          {rankNum === 1 ? (
                            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 font-extrabold">
                              🥇 #1
                            </span>
                          ) : rankNum === 2 ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 border border-slate-300 font-extrabold">
                              🥈 #2
                            </span>
                          ) : rankNum === 3 ? (
                            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 border border-orange-300 font-extrabold">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="text-slate-600 font-bold">#{rankNum}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{r.student?.fullName}</td>
                        <td className="py-2.5 px-4 text-slate-600">
                          {r.student?.class?.name} • {r.student?.school?.name}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-900 font-bold border border-rose-200">
                            📖 {r.booksRead} books
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="px-3 py-1 bg-slate-900 text-gold-300 rounded-lg font-mono font-black text-xs shadow-xs">
                            {r.readingScore} pts
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRecord(r)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            title="Delete Record"
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rank *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualData.readingRank}
                    onChange={(e) => setManualData({ ...manualData, readingRank: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Books *</label>
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Points *</label>
                  <input
                    type="number"
                    min="0"
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
                    <Trash2 className="w-3.5 h-3.5" />
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
