'use client';

import React, { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  Edit2,
  Eye,
  Printer,
  Save,
  X,
  ChevronRight,
  Sparkles,
  User,
  CheckCircle2,
  AlertCircle,
  Layers,
  Search,
} from 'lucide-react';

export default function AdminBriefNotesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editor Modal
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [sections, setSections] = useState<any[]>([
    {
      title: 'Personal & Family Background',
      fields: [
        { label: "Father's Full Name", questionId: 'q1_father_name' },
        { label: 'Guardian Phone', questionId: 'q4_guardian_phone' },
        { label: 'Place & District', questionId: 'q8_district' },
      ],
    },
    {
      title: 'Academic & Career Ambitions',
      fields: [
        { label: 'Favourite Subject', questionId: 'q_fav_subject' },
        { label: 'Entrance Examination Interest', questionId: 'q_entrance_interest' },
        { label: 'Primary Career Goal', questionId: 'q_career_goals' },
      ],
    },
  ]);
  const [saving, setSaving] = useState(false);

  // Preview / Print Modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<'INDIVIDUAL' | 'ALL'>('INDIVIDUAL');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] = useState<any | null>(null);
  const [generatedNote, setGeneratedNote] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);

  // Master Table State ("All Over" view)
  const [masterReportData, setMasterReportData] = useState<any | null>(null);
  const [masterClassFilter, setMasterClassFilter] = useState('ALL');
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [loadingMaster, setLoadingMaster] = useState(false);

  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return students;
    const q = studentSearchQuery.toLowerCase();
    return students.filter(
      (s: any) =>
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.sprStudentId || '').toLowerCase().includes(q) ||
        (s.studentId || '').toLowerCase().includes(q) ||
        (s.class?.name || '').toLowerCase().includes(q)
    );
  }, [students, studentSearchQuery]);

  const fetchTemplatesData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/brief-notes');
      if (!res.ok) throw new Error('Failed to load templates');
      const json = await res.json();
      setTemplates(json.templates || []);
      setQuestionnaires(json.questionnaires || []);

      // Also fetch a few students for preview
      const stRes = await fetch('/api/admin/student-details?limit=50');
      if (stRes.ok) {
        const stJson = await stRes.json();
        setStudents(stJson.students || []);
        if (stJson.students?.length > 0) {
          setSelectedStudentId(stJson.students[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading templates' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplatesData();
  }, []);

  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDesc('');
    setSections([
      {
        title: 'Personal Overview',
        fields: [{ label: 'Father Name', questionId: 'q1_father_name' }],
      },
    ]);
    setEditorOpen(true);
  };

  const handleOpenEdit = (tpl: any) => {
    setEditingTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateDesc(tpl.description || '');
    setSections(Array.isArray(tpl.sections) ? tpl.sections : []);
    setEditorOpen(true);
  };

  const handleAddSection = () => {
    setSections([...sections, { title: 'New Section', fields: [] }]);
  };

  const handleRemoveSection = (sIdx: number) => {
    setSections(sections.filter((_, i) => i !== sIdx));
  };

  const handleAddField = (sIdx: number) => {
    const next = [...sections];
    next[sIdx].fields.push({ label: 'New Field', questionId: '' });
    setSections(next);
  };

  const handleRemoveField = (sIdx: number, fIdx: number) => {
    const next = [...sections];
    next[sIdx].fields = next[sIdx].fields.filter((_: any, i: number) => i !== fIdx);
    setSections(next);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setStatusMsg({ type: 'error', text: 'Template name is required' });
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/admin/brief-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.id,
          name: templateName.trim(),
          description: templateDesc.trim() || undefined,
          sections,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save template');

      setStatusMsg({ type: 'success', text: 'Template saved successfully!' });
      setEditorOpen(false);
      fetchTemplatesData();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      const res = await fetch(`/api/admin/brief-notes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      setStatusMsg({ type: 'success', text: 'Template deleted.' });
      fetchTemplatesData();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleOpenPreview = async (tpl: any) => {
    setSelectedTemplateForPreview(tpl);
    setPreviewOpen(true);
    if (previewMode === 'INDIVIDUAL') {
      if (selectedStudentId) {
        generateNoteForStudent(tpl.id, selectedStudentId);
      }
    } else {
      fetchMasterTableData(tpl.id, masterClassFilter);
    }
  };

  const fetchMasterTableData = async (templateId: string, classId = 'ALL') => {
    try {
      setLoadingMaster(true);
      const res = await fetch('/api/admin/brief-notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, mode: 'ALL', classId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch master table');
      setMasterReportData(json);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoadingMaster(false);
    }
  };

  const filteredMasterStudents = useMemo(() => {
    if (!masterReportData?.students) return [];
    let list = masterReportData.students;

    if (masterClassFilter !== 'ALL') {
      list = list.filter((s: any) => s.classId === masterClassFilter);
    }

    if (masterSearchQuery.trim()) {
      const q = masterSearchQuery.toLowerCase();
      list = list.filter((s: any) => {
        const nameMatch = (s.fullName || '').toLowerCase().includes(q);
        const sprMatch = (s.sprStudentId || '').toLowerCase().includes(q);
        const classMatch = (s.className || '').toLowerCase().includes(q);
        const valMatch = Object.values(s.fieldValues || {}).some((v: any) =>
          String(v).toLowerCase().includes(q)
        );
        return nameMatch || sprMatch || classMatch || valMatch;
      });
    }

    return list;
  }, [masterReportData, masterClassFilter, masterSearchQuery]);

  const generateNoteForStudent = async (templateId: string, studentId: string) => {
    try {
      setGenerating(true);
      const res = await fetch('/api/admin/brief-notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, studentId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to generate note');
      setGeneratedNote(json);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadExcel = () => {
    const templateClean = (selectedTemplateForPreview?.name || 'Brief_Note')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    const dateStr = new Date().toISOString().slice(0, 10);

    if (previewMode === 'ALL') {
      if (!masterReportData || filteredMasterStudents.length === 0) {
        setStatusMsg({ type: 'error', text: 'No student records available to export.' });
        return;
      }

      const fields = masterReportData.fields || [];
      const headers = ['#', 'SPR ID', 'Student Name', 'Class', ...fields.map((f: any) => f.label)];
      const rows = filteredMasterStudents.map((st: any, idx: number) => [
        idx + 1,
        st.sprStudentId || '',
        st.fullName || '',
        st.className || '',
        ...fields.map((f: any) => {
          const val = st.fieldValues?.[f.questionId];
          return val && val !== '—' ? val : '';
        }),
      ]);

      const aoa = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      // Compute clean column widths based on header & cell content lengths
      ws['!cols'] = headers.map((header: string, colIdx: number) => {
        let maxLen = String(header || '').length;
        for (const row of rows) {
          const cellLen = String(row[colIdx] ?? '').length;
          if (cellLen > maxLen) maxLen = cellLen;
        }
        return { wch: Math.min(48, Math.max(8, maxLen + 3)) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student_Data');

      const classNameRaw =
        masterClassFilter === 'ALL'
          ? 'All_Classes'
          : masterReportData.classes?.find((c: any) => c.id === masterClassFilter)?.name || 'Filtered_Class';
      const classClean = classNameRaw.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const filename = `SPR_${templateClean}_${classClean}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);
    } else {
      if (!generatedNote) {
        setStatusMsg({ type: 'error', text: 'No student brief note loaded to export.' });
        return;
      }

      const st = generatedNote.student || {};
      const aoa: any[][] = [
        ['Madin School of Excellence - Student Brief Note'],
        ['Template', selectedTemplateForPreview?.name || ''],
        ['Student Name', st.fullName || ''],
        ['SPR ID', st.sprStudentId || ''],
        ['Class', st.className || ''],
        [],
        ['Section', 'Field', 'Value'],
      ];

      (generatedNote.sections || []).forEach((sec: any) => {
        (sec.fields || []).forEach((f: any) => {
          aoa.push([sec.title || '', f.label || '', f.value === 'Not specified' ? '' : f.value || '']);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 28 }, { wch: 30 }, { wch: 45 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student_Brief_Note');

      const studentClean = (st.sprStudentId || st.fullName || 'Student').replace(/[^A-Za-z0-9]+/g, '_');
      XLSX.writeFile(wb, `SPR_${templateClean}_${studentClean}_${dateStr}.xlsx`);
    }
  };

  const allQuestionsFlat: any[] = [];
  questionnaires.forEach((qn) => {
    qn.questions?.forEach((q: any) => {
      allQuestionsFlat.push({
        ...q,
        sectionTitle: qn.title,
      });
    });
  });

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                Institutional Reporting
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <FileSpreadsheet className="w-6 h-6 text-blue-600" />
              <span>Student Brief Note Template Manager</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create deterministic templates that dynamically pull real questionnaire answers into concise, printable student profiles.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Template</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between shadow-2xs ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl) => {
            const secCount = Array.isArray(tpl.sections) ? tpl.sections.length : 0;
            const fieldCount = Array.isArray(tpl.sections)
              ? tpl.sections.reduce((acc: number, s: any) => acc + (s.fields?.length || 0), 0)
              : 0;

            return (
              <div
                key={tpl.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900">{tpl.name}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {secCount} sections
                    </span>
                  </div>
                  {tpl.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2 font-mono">
                    {fieldCount} mapped fields • Created by {tpl.createdBy?.name || 'Admin'}
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenPreview(tpl)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center justify-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Generate &amp; Preview</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(tpl)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition"
                    title="Edit template"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {templates.length === 0 && (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
              No brief note templates created yet. Click "Create New Template" above.
            </div>
          )}
        </div>

        {/* Modal: Template Editor */}
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-extrabold text-slate-900">
                  {editingTemplate ? 'Edit Brief Note Template' : 'Create Brief Note Template'}
                </h3>
                <button onClick={() => setEditorOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Template Name *</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Comprehensive Student Profile Brief"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description (Optional)</label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Short summary of this template's purpose..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                  />
                </div>

                {/* Sections & Mapped Fields */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-900 text-sm">Template Sections &amp; Mappings</h4>
                    <button
                      onClick={handleAddSection}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Section</span>
                    </button>
                  </div>

                  {sections.map((sec, sIdx) => (
                    <div key={sIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => {
                            const next = [...sections];
                            next[sIdx].title = e.target.value;
                            setSections(next);
                          }}
                          placeholder="Section Title"
                          className="font-extrabold text-xs text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 w-full max-w-xs"
                        />
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleAddField(sIdx)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition flex items-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Field</span>
                          </button>
                          <button
                            onClick={() => handleRemoveSection(sIdx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                            title="Remove section"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Fields inside section */}
                      <div className="space-y-2 pt-1">
                        {sec.fields?.map((f: any, fIdx: number) => (
                          <div key={fIdx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center bg-white p-2 rounded-xl border border-slate-200">
                            <input
                              type="text"
                              value={f.label}
                              onChange={(e) => {
                                const next = [...sections];
                                next[sIdx].fields[fIdx].label = e.target.value;
                                setSections(next);
                              }}
                              placeholder="Display Label"
                              className="sm:col-span-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                            />
                            <select
                              value={f.questionId}
                              onChange={(e) => {
                                const next = [...sections];
                                next[sIdx].fields[fIdx].questionId = e.target.value;
                                setSections(next);
                              }}
                              className="sm:col-span-2 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700"
                            >
                              <option value="">Select Mapped Question...</option>
                              {allQuestionsFlat.map((q) => (
                                <option key={q.id} value={q.questionId}>
                                  [{q.sectionTitle}] {q.title}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveField(sIdx, fIdx)}
                              className="text-rose-500 hover:text-rose-700 p-1 justify-self-end"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Template'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Preview & Print Generated Note */}
        {previewOpen && selectedTemplateForPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
            <div
              className={`bg-white rounded-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto transition-all ${
                previewMode === 'ALL' ? 'max-w-6xl' : 'max-w-3xl'
              }`}
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {previewMode === 'ALL' ? 'Master Table Analytics' : 'Individual Profile'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">• Template</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
                    {selectedTemplateForPreview.name}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewMode('INDIVIDUAL')}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        previewMode === 'INDIVIDUAL'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Individual View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewMode('ALL');
                        if (!masterReportData) {
                          fetchMasterTableData(selectedTemplateForPreview.id, masterClassFilter);
                        }
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                        previewMode === 'ALL'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Over Table View
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    disabled={
                      previewMode === 'ALL'
                        ? loadingMaster || filteredMasterStudents.length === 0
                        : generating || !generatedNote
                    }
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Excel (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Download / Print PDF</span>
                  </button>

                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* MODE 1: INDIVIDUAL STUDENT VIEW */}
              {previewMode === 'INDIVIDUAL' && (
                <div className="space-y-4">
                  {/* Select Student to Generate for with Search Option */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 shrink-0">Select Student:</span>
                    <div className="relative shrink-0 sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-xs focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        setSelectedStudentId(e.target.value);
                        generateNoteForStudent(selectedTemplateForPreview.id, e.target.value);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-medium cursor-pointer"
                    >
                      {filteredStudents.length === 0 ? (
                        <option value="">No matching students found</option>
                      ) : (
                        filteredStudents.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.fullName} ({s.sprStudentId || s.studentId}) • {s.class?.name || 'Class'}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Rendered Individual Note Sheet */}
                  {generating ? (
                    <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                      Generating brief note with actual student responses...
                    </div>
                  ) : generatedNote ? (
                    <div className="p-6 bg-white border border-slate-300 rounded-2xl space-y-5 text-slate-900 font-sans shadow-xs">
                      {/* Note Header */}
                      <div className="text-center pb-3 border-b-2 border-slate-800 space-y-1">
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                          Madin School of Excellence • Student Brief Note
                        </h2>
                        <p className="text-base font-black text-blue-900">{generatedNote.student?.fullName}</p>
                        <p className="text-xs font-mono text-slate-500">
                          SPR ID: {generatedNote.student?.sprStudentId} • Class {generatedNote.student?.className}
                        </p>
                      </div>

                      {/* Populated Sections */}
                      {generatedNote.sections?.map((sec: any, i: number) => (
                        <div key={i} className="space-y-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 pb-1 border-b border-slate-200">
                            {sec.title}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {sec.fields?.map((f: any, fi: number) => (
                              <div key={fi} className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                <span className="text-[10px] text-slate-400 block font-bold uppercase">{f.label}</span>
                                <span className="font-semibold text-slate-900 mt-0.5 block">{f.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="pt-3 border-t border-slate-200 flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>Generated on {new Date(generatedNote.generatedAt).toLocaleDateString()}</span>
                        <span>Official Institutional Document</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* MODE 2: ALL OVER MASTER TABLE VIEW (Class-Wise Filtering + Search + Printable Table) */}
              {previewMode === 'ALL' && (
                <div className="space-y-3.5">
                  {/* Controls: Class Filtering + Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">Filter Class:</span>
                      <select
                        value={masterClassFilter}
                        onChange={(e) => setMasterClassFilter(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none font-semibold cursor-pointer"
                      >
                        <option value="ALL">All Enrolled Classes</option>
                        {masterReportData?.classes?.map((cls: any) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                      </select>

                      <span className="text-slate-400 text-xs hidden sm:inline">•</span>
                      <span className="text-slate-500 font-medium">
                        Showing <strong className="text-slate-900">{filteredMasterStudents.length}</strong> of{' '}
                        {masterReportData?.totalStudents || 0} students
                      </span>
                    </div>

                    {/* Master Search Input */}
                    <div className="relative sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search in table (Name, SPR ID, etc.)..."
                        value={masterSearchQuery}
                        onChange={(e) => setMasterSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 outline-none text-xs focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  {/* Master Table */}
                  {loadingMaster ? (
                    <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
                      Compiling master brief note dataset across all enrolled students...
                    </div>
                  ) : filteredMasterStudents.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      No student records match the active class filter and search query.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-extrabold sticky top-0 z-20 border-b border-slate-200 shadow-2xs">
                            <tr>
                              <th className="py-2.5 px-3 w-12 text-center">#</th>
                              <th className="py-2.5 px-3 w-24">SPR ID</th>
                              <th className="py-2.5 px-3 min-w-[150px]">Student Name</th>
                              <th className="py-2.5 px-3 w-24">Class</th>
                              {masterReportData?.fields?.map((f: any, fIdx: number) => (
                                <th key={fIdx} className="py-2.5 px-3 min-w-[140px] whitespace-nowrap">
                                  {f.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredMasterStudents.map((st: any, idx: number) => (
                              <tr key={st.studentId} className={idx % 2 === 1 ? 'bg-slate-50/50 hover:bg-blue-50/50' : 'hover:bg-blue-50/50'}>
                                <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="py-2 px-3 font-mono font-bold text-blue-700 text-[11px]">{st.sprStudentId}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">{st.fullName}</td>
                                <td className="py-2 px-3 text-slate-600 font-medium">{st.className}</td>
                                {masterReportData?.fields?.map((f: any, fIdx: number) => (
                                  <td key={fIdx} className="py-2 px-3 text-slate-700 text-[11px]">
                                    {st.fieldValues[f.questionId] || '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
