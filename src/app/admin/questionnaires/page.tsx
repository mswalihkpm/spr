'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import {
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
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
  const router = useRouter();
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

  // Section Management State
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionCode, setSectionCode] = useState('');
  const [sectionCategory, setSectionCategory] = useState('GENERAL');
  const [sectionDescription, setSectionDescription] = useState('');
  const [sectionDisplayOrder, setSectionDisplayOrder] = useState<number>(1);
  const [sectionIsActive, setSectionIsActive] = useState<boolean>(true);
  const [sectionSaving, setSectionSaving] = useState(false);

  // Section Delete Confirmation State
  const [deleteSectionModalOpen, setDeleteSectionModalOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<any | null>(null);
  const [deletingSection, setDeletingSection] = useState(false);

  // Preview Mode
  const [previewOpen, setPreviewOpen] = useState(false);

  const [studentVisibility, setStudentVisibility] = useState<'VISIBLE' | 'HIDDEN'>('VISIBLE');
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/questionnaires');
      if (res.status === 401 || res.status === 403) {
        router.push('/login');
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load questionnaires');
      setQuestionnaires(json.questionnaires || []);
      if (json.studentVisibility) {
        setStudentVisibility(json.studentVisibility);
      }
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

  const handleToggleStudentVisibility = async () => {
    const newVisibility = studentVisibility === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    try {
      setTogglingVisibility(true);
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_STUDENT_VISIBILITY',
          visibility: newVisibility,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to toggle visibility');
      setStudentVisibility(newVisibility);
      setStatusMsg({
        type: 'success',
        text: `Student Questionnaires are now ${newVisibility === 'VISIBLE' ? 'VISIBLE' : 'HIDDEN'} to all students.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error updating questionnaire visibility' });
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleToggleQuestionnaireActive = async (qId: string, currentActive: boolean) => {
    try {
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_QUESTIONNAIRE',
          questionnaireData: {
            id: qId,
            isActive: !currentActive,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update questionnaire');
      setQuestionnaires((prev) =>
        prev.map((q) => (q.id === qId ? { ...q, isActive: !currentActive } : q))
      );
      setStatusMsg({
        type: 'success',
        text: `Questionnaire "${json.questionnaire?.title || 'Section'}" is now ${
          !currentActive ? 'VISIBLE' : 'HIDDEN'
        } for students.`,
      });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error updating questionnaire visibility' });
    }
  };

  const handleOpenAddSection = () => {
    setEditingSection(null);
    setSectionTitle('');
    setSectionCode('');
    setSectionCategory('GENERAL');
    setSectionDescription('');
    setSectionDisplayOrder(questionnaires.length + 1);
    setSectionIsActive(true);
    setSectionModalOpen(true);
  };

  const handleOpenEditSection = (sec: any) => {
    setEditingSection(sec);
    setSectionTitle(sec.title || '');
    setSectionCode(sec.code || '');
    setSectionCategory(sec.category || 'GENERAL');
    setSectionDescription(sec.description || '');
    setSectionDisplayOrder(sec.displayOrder ?? (questionnaires.length + 1));
    setSectionIsActive(sec.isActive !== false);
    setSectionModalOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionTitle.trim()) {
      setStatusMsg({ type: 'error', text: 'Section title is required.' });
      return;
    }

    try {
      setSectionSaving(true);
      const isEdit = Boolean(editingSection);
      const action = isEdit ? 'UPDATE_QUESTIONNAIRE' : 'CREATE_QUESTIONNAIRE';
      const questionnaireData = {
        id: editingSection?.id,
        title: sectionTitle.trim(),
        code: sectionCode.trim() || undefined,
        category: sectionCategory.trim() || 'GENERAL',
        description: sectionDescription.trim(),
        displayOrder: Number(sectionDisplayOrder) || 1,
        isActive: sectionIsActive,
      };

      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          questionnaireData,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save questionnaire section');

      setStatusMsg({
        type: 'success',
        text: json.message || `Questionnaire section ${isEdit ? 'updated' : 'created'} successfully!`,
      });
      setSectionModalOpen(false);
      await fetchQuestionnaires();
      if (json.questionnaire?.id) {
        setSelectedQId(json.questionnaire.id);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error saving questionnaire section' });
    } finally {
      setSectionSaving(false);
    }
  };

  const handleOpenDeleteSection = (sec: any) => {
    setSectionToDelete(sec);
    setDeleteSectionModalOpen(true);
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    try {
      setDeletingSection(true);
      const res = await fetch('/api/admin/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_QUESTIONNAIRE',
          questionnaireId: sectionToDelete.id,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete questionnaire section');

      setStatusMsg({
        type: 'success',
        text: json.message || `Section "${sectionToDelete.title}" deleted successfully.`,
      });
      setDeleteSectionModalOpen(false);

      const remaining = questionnaires.filter((q) => q.id !== sectionToDelete.id);
      setQuestionnaires(remaining);
      if (selectedQId === sectionToDelete.id) {
        setSelectedQId(remaining[0]?.id || '');
      }
      setSectionToDelete(null);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: 'error', text: err.message || 'Error deleting questionnaire section' });
    } finally {
      setDeletingSection(false);
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Student Visibility Toggle Switch */}
            <button
              disabled={togglingVisibility}
              onClick={handleToggleStudentVisibility}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border shadow-xs cursor-pointer ${
                studentVisibility === 'VISIBLE'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to toggle questionnaire visibility for students"
            >
              {studentVisibility === 'VISIBLE' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Student Visibility: Visible</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Student Visibility: Hidden</span>
                </>
              )}
            </button>

            <button
              onClick={() => setPreviewOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>Live Preview</span>
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md cursor-pointer"
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
          {/* Section List (Sections) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 px-1">
              <div className="text-xs font-black uppercase tracking-wider text-slate-400">
                Sections ({questionnaires.length})
              </div>
              <button
                type="button"
                onClick={handleOpenAddSection}
                className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer border border-purple-200 shadow-2xs"
                title="Create a new questionnaire section"
              >
                <Plus className="w-3 h-3" />
                <span>New Section</span>
              </button>
            </div>
            <div className="space-y-1">
              {questionnaires.map((q) => {
                const isSelected = q.id === selectedQId;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQId(q.id)}
                    className={`w-full text-left p-3 rounded-2xl transition flex items-center justify-between text-xs cursor-pointer group ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md font-bold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="truncate pr-2 min-w-0 flex-1">
                      <div className="truncate font-semibold">{q.title}</div>
                      <div className={`text-[10px] mt-1 flex items-center justify-between ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                        <span>{q.questions?.length || 0} Qs</span>
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleQuestionnaireActive(q.id, q.isActive !== false);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center space-x-0.5 transition cursor-pointer ${
                            q.isActive !== false
                              ? isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : isSelected ? 'bg-amber-400 text-amber-950' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title={`Click to ${q.isActive !== false ? 'hide from' : 'show to'} students`}
                        >
                          {q.isActive !== false ? (
                            <>
                              <Eye className="w-2.5 h-2.5" />
                              <span>Show</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-2.5 h-2.5" />
                              <span>Hide</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 ml-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditSection(q);
                        }}
                        className={`p-1 rounded-lg transition ${
                          isSelected
                            ? 'hover:bg-purple-700 text-purple-200 hover:text-white'
                            : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'
                        }`}
                        title="Edit Section Details"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDeleteSection(q);
                        }}
                        className={`p-1 rounded-lg transition ${
                          isSelected
                            ? 'hover:bg-rose-700 text-purple-200 hover:text-white'
                            : 'hover:bg-rose-100 text-slate-400 hover:text-rose-600'
                        }`}
                        title="Delete Section"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                    </div>
                  </div>
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
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h2 className="text-base font-extrabold text-slate-900">
                        {activeQuestionnaire.title}
                      </h2>
                      {activeQuestionnaire.code && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[10px] font-bold">
                          {activeQuestionnaire.code}
                        </span>
                      )}
                      {activeQuestionnaire.category && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[10px] font-bold">
                          {activeQuestionnaire.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {activeQuestionnaire.description || 'Configured questions for this section.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Edit Section Details */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection(activeQuestionnaire)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer transition shadow-2xs"
                      title="Edit Section title, description, code and category"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-purple-600" />
                      <span>Edit Section</span>
                    </button>

                    {/* Delete Section */}
                    <button
                      type="button"
                      onClick={() => handleOpenDeleteSection(activeQuestionnaire)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer transition shadow-2xs"
                      title="Delete this questionnaire section"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Section</span>
                    </button>

                    {/* Individual Questionnaire Visibility Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleQuestionnaireActive(activeQuestionnaire.id, activeQuestionnaire.isActive !== false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 border cursor-pointer transition ${
                        activeQuestionnaire.isActive !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                      }`}
                      title="Toggle student visibility for this specific questionnaire section"
                    >
                      {activeQuestionnaire.isActive !== false ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visible (Hide)</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          <span>Hidden (Show)</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center space-x-1.5 text-xs font-mono">
                      <span className="px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 font-bold">
                        {activeQuestionnaire.questions?.length || 0} Questions
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                        {activeQuestionnaire._count?.responses || 0} Submissions
                      </span>
                    </div>
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

        {/* Modal: Add / Edit Section */}
        {sectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {editingSection ? 'Edit Questionnaire Section' : 'Create New Questionnaire Section'}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {editingSection ? 'Update section metadata and student visibility' : 'Add a new questionnaire section for student evaluations'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSectionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Section Title *</label>
                  <input
                    type="text"
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    placeholder="e.g. Student Leadership & Talents"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">System Code (Unique)</label>
                    <input
                      type="text"
                      value={sectionCode}
                      onChange={(e) => setSectionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      placeholder="e.g. LEADERSHIP_2026"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-mono text-[11px] font-bold"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Leave blank to auto-generate</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Category</label>
                    <select
                      value={sectionCategory}
                      onChange={(e) => setSectionCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                    >
                      <option value="GENERAL">General</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="ISLAMIC">Islamic</option>
                      <option value="PERSONAL">Personal & Family</option>
                      <option value="HOSTEL">Hostel & Living</option>
                      <option value="SKILLS">Skills & Talents</option>
                      <option value="SURVEY">Feedback / Survey</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Description / Guidelines</label>
                  <textarea
                    rows={3}
                    value={sectionDescription}
                    onChange={(e) => setSectionDescription(e.target.value)}
                    placeholder="Provide guidance or instructions to students before they fill this section..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Display Order</label>
                    <input
                      type="number"
                      value={sectionDisplayOrder}
                      onChange={(e) => setSectionDisplayOrder(parseInt(e.target.value) || 1)}
                      min={1}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-purple-600 font-medium"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={sectionIsActive}
                        onChange={(e) => setSectionIsActive(e.target.checked)}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span>Active for Students</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSection}
                  disabled={sectionSaving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{sectionSaving ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Delete Section Confirmation */}
        {deleteSectionModalOpen && sectionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4">
              <div className="flex items-center space-x-3 pb-3 border-b border-rose-100">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">Delete Questionnaire Section</h3>
                  <p className="text-[11px] text-rose-600 font-semibold">Irreversible action</p>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  Are you sure you want to permanently delete the questionnaire section{' '}
                  <span className="font-extrabold text-slate-900">"{sectionToDelete.title}"</span>?
                </p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-[11px] text-rose-800">
                  <p className="font-bold">⚠️ Warning:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-rose-700">
                    <li>All {sectionToDelete.questions?.length || 0} questions inside will be deleted.</li>
                    <li>All {sectionToDelete._count?.responses || 0} student submissions will be permanently wiped.</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setDeleteSectionModalOpen(false);
                    setSectionToDelete(null);
                  }}
                  disabled={deletingSection}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteSection}
                  disabled={deletingSection}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deletingSection ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
