'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  ArrowUpDown,
  ListFilter,
} from 'lucide-react';

const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Single Choice (Radio)' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Selection (Checkbox)' },
  { value: 'SHORT_TEXT', label: 'Short Text' },
  { value: 'RATING_SCALE', label: 'Rating Scale (1-5)' },
  { value: 'PHONE', label: 'Phone Number' },
  { value: 'EMAIL', label: 'Email Address' },
];

export default function AdminQuestionnairesPage() {
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [selectedQId, setSelectedQId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Question Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questionType, setQuestionType] = useState('SINGLE_CHOICE');
  const [isRequired, setIsRequired] = useState(true);
  const [optionsText, setOptionsText] = useState('');
  const [conditionalParentId, setConditionalParentId] = useState('');
  const [conditionalMatchValue, setConditionalMatchValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Preview Mode
  const [previewOpen, setPreviewOpen] = useState(false);

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/questionnaires');
      if (!res.ok) throw new Error('Failed to load questionnaires');
      const json = await res.json();
      setQuestionnaires(json.questionnaires || []);
      if (json.questionnaires?.length > 0 && !selectedQId) {
        setSelectedQId(json.questionnaires[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error loading questionnaires' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestionnaires();
  }, []);

  const activeQuestionnaire = questionnaires.find((q) => q.id === selectedQId);

  const handleOpenAdd = () => {
    setEditingQuestion(null);
    setTitle('');
    setDescription('');
    setQuestionType('SINGLE_CHOICE');
    setIsRequired(true);
    setOptionsText('');
    setConditionalParentId('');
    setConditionalMatchValue('');
    setModalOpen(true);
  };

  const handleOpenEdit = (q: any) => {
    setEditingQuestion(q);
    setTitle(q.title);
    setDescription(q.description || '');
    setQuestionType(q.questionType);
    setIsRequired(q.isRequired);
    let opts = '';
    if (q.options) {
      try {
        const parsed = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        opts = Array.isArray(parsed) ? parsed.join('\n') : '';
      } catch {
        opts = '';
      }
    }
    setOptionsText(opts);
    setConditionalParentId(q.conditionalParentId || '');
    setConditionalMatchValue(q.conditionalMatchValue || '');
    setModalOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!title.trim()) {
      setStatusMsg({ type: 'error', text: 'Question title is required' });
      return;
    }

    const parsedOptions = optionsText
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    try {
      setSaving(true);
      const action = editingQuestion ? 'UPDATE_QUESTION' : 'ADD_QUESTION';
      const questionData = {
        id: editingQuestion?.id,
        title: title.trim(),
        description: description.trim() || undefined,
        questionType,
        isRequired,
        options: parsedOptions,
        conditionalParentId: conditionalParentId.trim() || undefined,
        conditionalMatchValue: conditionalMatchValue.trim() || undefined,
      };

      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          questionnaireId: selectedQId,
          questionData,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save question');

      setStatusMsg({ type: 'success', text: 'Question saved successfully!' });
      setModalOpen(false);
      fetchQuestionnaires();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving question' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to remove this question?')) return;
    try {
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_QUESTION',
          questionData: { id },
        }),
      });
      if (!res.ok) throw new Error('Failed to delete question');
      setStatusMsg({ type: 'success', text: 'Question removed.' });
      fetchQuestionnaires();
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                Data Collection Engine
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span>Questionnaire Management</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage the 12 institutional questionnaire sections, questions, answer types, and conditional logic.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Live Preview</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Question</span>
            </button>
          </div>
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

        {/* Main Grid: Left Questionnaire Selector & Right Question List */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section List (12 Sections) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="text-xs font-black uppercase tracking-wider text-slate-400 px-2 pb-2 border-b border-slate-100">
              12 Sections
            </div>
            <div className="space-y-1">
              {questionnaires.map((q) => {
                const isSelected = q.id === selectedQId;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedQId(q.id)}
                    className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between text-xs cursor-pointer ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md font-bold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate">{q.title}</div>
                      <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                        {q.questions?.length || 0} questions • {q._count?.responses || 0} submissions
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question List for Active Section */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            {activeQuestionnaire ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {activeQuestionnaire.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeQuestionnaire.description || 'Configured questions for this section.'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                      {activeQuestionnaire.questions?.length || 0} Questions
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                      {activeQuestionnaire._count?.responses || 0} Submissions
                    </span>
                  </div>
                </div>

                {/* Questions */}
                <div className="space-y-3">
                  {activeQuestionnaire.questions?.map((q: any, idx: number) => {
                    let opts: string[] = [];
                    if (q.options) {
                      try {
                        opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                      } catch {}
                    }
                    return (
                      <div
                        key={q.id}
                        className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-purple-200 transition group space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start space-x-2.5">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-800 text-xs font-black shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-extrabold text-xs text-slate-900 flex items-center space-x-2">
                                <span>{q.title}</span>
                                {q.isRequired && (
                                  <span className="text-rose-500 font-bold text-xs" title="Required">*</span>
                                )}
                              </div>
                              {q.description && (
                                <p className="text-[11px] text-slate-500 mt-0.5">{q.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-700 uppercase">
                                  {q.questionType.replace(/_/g, ' ')}
                                </span>
                                {q.dynamicSource && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700">
                                    Source: {q.dynamicSource}
                                  </span>
                                )}
                                {q.conditionalParentId && (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                                    Condition: If parent = "{q.conditionalMatchValue}"
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(q)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
                              title="Edit question"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Options preview */}
                        {opts.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-1">
                            {opts.slice(0, 8).map((opt, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10.5px] text-slate-600 font-medium"
                              >
                                {opt}
                              </span>
                            ))}
                            {opts.length > 8 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{opts.length - 8} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                Select a questionnaire section on the left to manage questions.
              </div>
            )}
          </div>
        </div>

        {/* Modal: Add / Edit Question */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingQuestion ? 'Edit Question' : 'Add New Question'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Question Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter question text..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Instructions</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional hints or guidelines..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Question Type</label>
                    <select
                      value={questionType}
                      onChange={(e) => setQuestionType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>Required question</span>
                    </label>
                  </div>
                </div>

                {/* Options (for choice types) */}
                {(questionType === 'SINGLE_CHOICE' || questionType === 'MULTIPLE_CHOICE') && (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      Answer Options (one per line)
                    </label>
                    <textarea
                      rows={5}
                      value={optionsText}
                      onChange={(e) => setOptionsText(e.target.value)}
                      placeholder="Option 1&#10;Option 2&#10;Option 3..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium font-sans"
                    />
                  </div>
                )}

                {/* Conditional Logic */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center space-x-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                    <span>Conditional Display (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={conditionalParentId}
                      onChange={(e) => setConditionalParentId(e.target.value)}
                      placeholder="Parent Question ID (e.g. q1)"
                      className="px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-slate-900 text-xs"
                    />
                    <input
                      type="text"
                      value={conditionalMatchValue}
                      onChange={(e) => setConditionalMatchValue(e.target.value)}
                      placeholder="Match Value (e.g. Yes)"
                      className="px-2.5 py-1.5 bg-white border border-amber-200 rounded-lg text-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuestion}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Question'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Preview Modal */}
        {previewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-600">Student View Preview</span>
                  <h3 className="text-base font-extrabold text-slate-900">{activeQuestionnaire?.title}</h3>
                </div>
                <button onClick={() => setPreviewOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {activeQuestionnaire?.questions?.map((q: any, i: number) => {
                  let opts: string[] = [];
                  if (q.options) {
                    try {
                      opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                    } catch {}
                  }
                  return (
                    <div key={q.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-xs text-slate-900">
                          {i + 1}. {q.title} {q.isRequired && <span className="text-rose-500">*</span>}
                        </p>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
                          {q.questionType}
                        </span>
                      </div>
                      {q.description && (
                        <p className="text-[11px] text-slate-500">{q.description}</p>
                      )}
                      {opts.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          {opts.map((opt, oi) => (
                            <label key={oi} className="flex items-center space-x-2 text-xs text-slate-700">
                              <input type={q.questionType === 'MULTIPLE_CHOICE' || q.questionType === 'MULTI_SELECT' ? 'checkbox' : 'radio'} disabled />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : q.questionType === 'TEXTAREA' || q.questionType === 'LONG_TEXT' ? (
                        <textarea rows={2} disabled placeholder="Type answer here..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white" />
                      ) : (
                        <input type="text" disabled placeholder="Type answer here..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white" />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
