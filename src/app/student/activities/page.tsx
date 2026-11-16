'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  BookOpen,
  GraduationCap,
  Compass,
  Trophy,
  Languages,
  Activity,
  HeartHandshake,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';

export default function StudentActivitiesPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isProfileLocked, setIsProfileLocked] = useState(false);

  const fetchActivities = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const res = await fetch('/api/student/activities');
      if (res.status === 401 || res.status === 403) {
        router.push('/student/login');
        return;
      }
      const json = await res.json();
      if (res.ok && json.activities) {
        setActivities(json.activities);
        setIsProfileLocked(json.isProfileLocked ?? false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getQuestionnaireIcon = (code: string) => {
    switch (code) {
      case 'PERSONAL_FAMILY':
        return ShieldCheck;
      case 'ISLAMIC_PROFILE':
        return BookOpen;
      case 'SCHOOL_ACADEMIC':
        return GraduationCap;
      case 'LEARNING_HABITS':
        return Clock;
      case 'READING_LIBRARY':
        return BookOpen;
      case 'ENTRANCE_EXAMS':
        return Compass;
      case 'AMBITIONS_GOALS':
        return Trophy;
      case 'SKILLS_TALENTS':
        return Sparkles;
      case 'LANGUAGE_COMMUNICATION':
        return Languages;
      case 'EXTRACURRICULAR':
        return Activity;
      case 'PERSONAL_DEVELOPMENT':
        return HeartHandshake;
      case 'INSTITUTIONAL_FEEDBACK':
        return MessageSquare;
      default:
        return Sparkles;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return {
          label: 'Submitted',
          class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
          icon: CheckCircle2,
        };
      case 'LOCKED':
        return {
          label: 'Locked (Official)',
          class: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
          icon: Lock,
        };
      case 'READY_FOR_REVIEW':
        return {
          label: 'Ready for Review',
          class: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
          icon: Clock,
        };
      case 'IN_PROGRESS':
        return {
          label: 'In Progress',
          class: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
          icon: Clock,
        };
      default:
        return {
          label: 'Not Started',
          class: 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400 border-slate-200',
          icon: AlertCircle,
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6">
        <VideoLoader
          size="xl"
          text="Loading Student Questionnaires & Activities..."
          subtext="Accessing SPR Institutional Collection Framework"
          showProgress={true}
        />
      </div>
    );
  }

  const completedCount = activities.filter((a) => a.status === 'SUBMITTED' || a.status === 'LOCKED').length;
  const overallCompletionRate = activities.length > 0 ? Math.round((completedCount / activities.length) * 100) : 0;

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-6xl w-full max-w-full overflow-x-hidden min-w-0 mx-auto space-y-5 sm:space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
              Student Intelligence
            </span>
            <span className="text-xs text-blue-200 font-medium">12 Integrated Modules</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-2">
            Additional Activities &amp; Questionnaires
          </h1>
          <p className="text-xs text-blue-100 max-w-xl mt-1 leading-relaxed">
            Provide comprehensive information about your academic profile, future career ambitions, extracurricular talents, and reading habits.
          </p>
        </div>

        {/* Global Progress Dial */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[140px]">
          <div className="text-[10px] uppercase font-bold text-blue-200">Total Completion</div>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono mt-0.5">
            {overallCompletionRate}%
          </div>
          <div className="text-[10px] text-blue-200 mt-0.5">
            {completedCount} of {activities.length} Completed
          </div>
        </div>
      </div>

      {/* Grid of 12 Questionnaire Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activities.map((act) => {
          const Icon = getQuestionnaireIcon(act.code);
          const badge = getStatusBadge(act.status);
          const BadgeIcon = badge.icon;

          return (
            <div
              key={act.code}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.class}`}
                  >
                    <BadgeIcon className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                <div className="mt-3">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {act.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    <span>Progress</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{act.progressPercentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        act.progressPercentage === 100
                          ? 'bg-emerald-500'
                          : act.progressPercentage > 0
                          ? 'bg-blue-600'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${act.progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Open Button */}
                <Link
                  href={`/student/activities/${act.code.toLowerCase()}`}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-2xs cursor-pointer group-hover:bg-blue-600 group-hover:text-white"
                >
                  <span>
                    {act.status === 'SUBMITTED' || act.status === 'LOCKED'
                      ? 'View Responses'
                      : act.status === 'IN_PROGRESS'
                      ? 'Continue Questionnaire'
                      : 'Start Questionnaire'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
