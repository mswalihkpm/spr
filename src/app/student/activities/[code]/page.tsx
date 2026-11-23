'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Lock,
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function QuestionnaireRunnerPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || '').toUpperCase();

  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLocked, setIsLocked] = useState(false);
  const [status, setStatus] = useState('NOT_STARTED');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [currentStep, setCurrentStep] = useState<'FORM' | 'REVIEW'>('FORM');

  const autosaveTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch questionnaire definition and existing responses
  useEffect(() => {
    setLoading(true);
    fetch(`/api/student/activities/${code}`)
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          router.push('/student/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success) {
          setQuestionnaire(data.questionnaire);
          setQuestions(data.questions);
          setAnswers(data.response?.answers || {});
          setIsLocked(false);
          setStatus(data.response?.status || 'NOT_STARTED');
          if (data.response?.lastSavedAt) {
            setLastSaved(new Date(data.response.lastSavedAt).toLocaleTimeString());
          }
        } else {
          setErrorMsg(data?.error || 'Failed to load questionnaire');
        }
      })
      .catch((err) => {
        console.error(err);
        setErrorMsg('Network error loading questionnaire');
      })
      .finally(() => setLoading(false));
  }, [code, router]);

  // Compute progress percentage
  const calculateProgress = useCallback(
    (currentAnswers: Record<string, any>) => {
      if (questions.length === 0) return 0;
      let answeredCount = 0;
      let totalEligible = 0;

      for (const q of questions) {
        // Check conditional visibility
        let isVisible = true;
        if (q.conditionalParentId && q.conditionalMatchValue) {
          const parentVal = currentAnswers[q.conditionalParentId];
          if (Array.isArray(parentVal)) {
            isVisible = parentVal.includes(q.conditionalMatchValue);
          } else {
            isVisible = parentVal === q.conditionalMatchValue;
          }
        }

        if (isVisible) {
          totalEligible++;
          const val = currentAnswers[q.questionId];
          if (val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0)) {
            answeredCount++;
          }
        }
      }

      if (totalEligible === 0) return 100;
      return Math.round((answeredCount / totalEligible) * 100);
    },
    [questions]
  );

  // Autosave handler (debounced)
  const triggerAutosave = (newAnswers: Record<string, any>) => {
    if (isLocked) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

    autosaveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const progressPercentage = calculateProgress(newAnswers);
        const res = await fetch(`/api/student/activities/${code}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: newAnswers, progressPercentage }),
        });
        if (res.ok) {
          setLastSaved(new Date().toLocaleTimeString());
        }
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setSaving(false);
      }
    }, 1500);
  };

  const handleFieldChange = (questionId: string, value: any) => {
    if (isLocked) return;
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    triggerAutosave(updated);
  };

  const handleManualSave = async () => {
    if (isLocked) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const progressPercentage = calculateProgress(answers);
      const res = await fetch(`/api/student/activities/${code}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, progressPercentage }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setLastSaved(new Date().toLocaleTimeString());
      setSuccessMsg('Draft saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (isLocked) return;
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/student/activities/${code}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');

      setStatus('SUBMITTED');
      setSuccessMsg('Questionnaire submitted successfully!');
      setCurrentStep('FORM');
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <VideoLoader size="lg" text="Loading Module Questions..." subtext="Connecting to Institutional Knowledgebase" />
      </div>
    );
  }

  if (!questionnaire) {
    return (
      <div className="flex-1 p-8 text-center space-y-4">
        <p className="text-sm text-rose-600 font-bold">{errorMsg || 'Questionnaire not found'}</p>
        <Link href="/student/activities" className="text-xs text-blue-600 underline font-bold">
          ← Return to Activities
        </Link>
      </div>
    );
  }

  const progress = calculateProgress(answers);

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
      {/* Top Breadcrumb & Autosave Status */}
      <div className="flex items-center justify-between">
        <Link
          href="/student/activities"
          className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Activities</span>
        </Link>

        <div className="flex items-center space-x-2 text-[11px] text-slate-500">
          {saving ? (
            <span className="flex items-center space-x-1 text-amber-600 font-semibold animate-pulse">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </span>
          ) : lastSaved ? (
            <span className="flex items-center space-x-1 text-emerald-600 font-medium">
              <Check className="w-3 h-3" />
              <span>Saved at {lastSaved}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Module Title Banner */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {questionnaire.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5">
              {questionnaire.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {questionnaire.description}
            </p>
          </div>

          {/* Progress dial */}
          <div className="text-right sm:text-center shrink-0">
            <span className="text-xs font-semibold text-slate-500 block">Completion</span>
            <span className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {progress}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Success / Error Banners */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------
          QUESTIONNAIRE QUESTIONS FORM
          --------------------------------------------------------------------- */}
      {currentStep === 'FORM' ? (
        <div className="space-y-4">
          {questions.map((q, idx) => {
            // Check conditional visibility
            if (q.conditionalParentId && q.conditionalMatchValue) {
              const parentVal = answers[q.conditionalParentId];
              const isMatch = Array.isArray(parentVal)
                ? parentVal.includes(q.conditionalMatchValue)
                : parentVal === q.conditionalMatchValue;
              if (!isMatch) return null;
            }

            const currentVal = answers[q.questionId];

            return (
              <div
                key={q.questionId}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                      <span className="font-mono text-slate-400 text-xs">{idx + 1}.</span>
                      <span>{q.title}</span>
                      {q.isRequired && <span className="text-rose-500 font-black">*</span>}
                    </label>
                    {q.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{q.description}</p>
                    )}
                  </div>
                </div>

                {/* Input Controls According to Question Type */}
                <div className="pt-1">
                  {(() => {
                    const rawType = (q.questionType || '').toUpperCase().trim();
                    const isPhone = rawType === 'PHONE' || rawType === 'TEL';
                    const isEmail = rawType === 'EMAIL';
                    const isLongText = rawType === 'LONG_TEXT' || rawType === 'TEXTAREA' || rawType === 'PARAGRAPH';
                    const isYesNo = rawType === 'YES_NO' || rawType === 'BOOLEAN';
                    const isSingleSelect =
                      rawType === 'SINGLE_SELECT' ||
                      rawType === 'SINGLE_SELECTION' ||
                      rawType === 'SINGLE_CHOICE' ||
                      rawType === 'SEARCHABLE_SINGLE' ||
                      rawType === 'RADIO';
                    const isMultiSelect =
                      rawType === 'MULTI_SELECT' ||
                      rawType === 'MULTI_SELECTION' ||
                      rawType === 'MULTIPLE_CHOICE' ||
                      rawType === 'SEARCHABLE_MULTI' ||
                      rawType === 'CHECKBOX';
                    const isRating =
                      rawType === 'RATING_1_5' || rawType === 'RATING_SCALE' || rawType === 'RATING';

                    // Parse options list reliably
                    const optionsList: string[] = Array.isArray(q.options)
                      ? q.options
                      : typeof q.options === 'string'
                      ? (() => {
                          try {
                            const parsed = JSON.parse(q.options);
                            return Array.isArray(parsed) ? parsed : [];
                          } catch {
                            return q.options.split(',').map((s: string) => s.trim()).filter(Boolean);
                          }
                        })()
                      : [];

                    // 1. PHONE INPUT
                    if (isPhone) {
                      return (
                        <input
                          type="tel"
                          disabled={isLocked}
                          value={currentVal || ''}
                          onChange={(e) => handleFieldChange(q.questionId, e.target.value)}
                          placeholder="e.g. +91 98765 43210"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition disabled:opacity-60 font-mono"
                        />
                      );
                    }

                    // 2. EMAIL INPUT
                    if (isEmail) {
                      return (
                        <input
                          type="email"
                          disabled={isLocked}
                          value={currentVal || ''}
                          onChange={(e) => handleFieldChange(q.questionId, e.target.value)}
                          placeholder="e.g. student@madin.edu"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition disabled:opacity-60"
                        />
                      );
                    }

                    // 3. LONG_TEXT
                    if (isLongText) {
                      return (
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={currentVal || ''}
                          onChange={(e) => handleFieldChange(q.questionId, e.target.value)}
                          placeholder="Type your detailed explanation or answer here..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition disabled:opacity-60"
                        />
                      );
                    }

                    // 4. YES_NO
                    if (isYesNo) {
                      return (
                        <div className="flex items-center space-x-3">
                          {['Yes', 'No'].map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleFieldChange(q.questionId, opt)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                                currentVal === opt
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      );
                    }

                    // 5. SINGLE SELECTION (including SEARCHABLE_SINGLE)
                    if (isSingleSelect && optionsList.length > 0) {
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {optionsList.map((opt: string) => (
                              <button
                                key={opt}
                                type="button"
                                disabled={isLocked}
                                onClick={() => handleFieldChange(q.questionId, opt)}
                                className={`p-3 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition cursor-pointer ${
                                  currentVal === opt
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-800 font-bold'
                                    : 'bg-slate-50/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white'
                                }`}
                              >
                                <span>{opt}</span>
                                {currentVal === opt && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // 6. MULTI SELECTION (including SEARCHABLE_MULTI)
                    if (isMultiSelect && optionsList.length > 0) {
                      const selectedList: string[] = Array.isArray(currentVal) ? currentVal : [];
                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                            {optionsList.map((opt: string) => {
                              const isSelected = selectedList.includes(opt);
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => {
                                    const updated = isSelected
                                      ? selectedList.filter((x) => x !== opt)
                                      : [...selectedList, opt];
                                    handleFieldChange(q.questionId, updated);
                                  }}
                                  className={`p-3 rounded-xl text-xs font-semibold text-left border flex items-center justify-between transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800 font-bold'
                                      : 'bg-slate-50/70 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-white'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // 7. RATING_SCALE / RATING_1_5
                    if (isRating) {
                      return (
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              disabled={isLocked}
                              onClick={() => handleFieldChange(q.questionId, val)}
                              className={`w-10 h-10 rounded-xl font-mono text-sm font-black border transition flex items-center justify-center cursor-pointer ${
                                currentVal === val
                                  ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-md scale-105'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              {val}★
                            </button>
                          ))}
                        </div>
                      );
                    }

                    // 8. DEFAULT FALLBACK: Standard text input so NO question is ever blank
                    return (
                      <input
                        type="text"
                        disabled={isLocked}
                        value={currentVal || ''}
                        onChange={(e) => handleFieldChange(q.questionId, e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600 outline-none transition disabled:opacity-60"
                      />
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={isLocked || saving}
              onClick={handleManualSave}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Draft</span>
            </button>

            {!isLocked && (
              <button
                type="button"
                onClick={() => setCurrentStep('REVIEW')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition flex items-center space-x-1.5"
              >
                <span>Review &amp; Submit</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------------------
            REVIEW & FINAL SUBMIT STEP
            --------------------------------------------------------------------- */
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Review Your Answers
            </h2>
            <p className="text-xs text-slate-500">
              Please inspect your submitted details carefully. For Personal &amp; Family information, final submission will lock student editing and synchronize your official profile.
            </p>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {questions.map((q, idx) => {
                const val = answers[q.questionId];
                if (val === undefined || val === null || val === '') return null;

                return (
                  <div key={q.questionId} className="py-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      {idx + 1}. {q.title}
                    </div>
                    <div className="font-mono text-blue-700 dark:text-blue-300 font-semibold">
                      {Array.isArray(val) ? val.join(', ') : String(val)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setCurrentStep('FORM')}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Edit</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={handleSubmitFinal}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-lg transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{saving ? 'Submitting...' : 'Confirm Final Submission'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
