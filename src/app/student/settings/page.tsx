'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  KeyRound,
  ShieldCheck,
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  Eye,
  EyeOff,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import StudentAvatar from '@/components/ui/StudentAvatar';

export default function StudentSettingsPage() {
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/student/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.push('/student/login');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.student) {
          setStudent(data.student);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    try {
      setPwdLoading(true);
      const res = await fetch('/api/student/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to change password.');

      setPwdMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <VideoLoader
          size="xl"
          text="Loading Student Account Settings..."
          subtext="Accessing Student Security & Identity Configuration"
          showProgress={true}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-4xl w-full max-w-full overflow-x-hidden min-w-0 mx-auto space-y-5 sm:space-y-6">
      <div className="flex items-center space-x-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Student Account Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Profile credentials, security configuration, and institutional privacy.
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>Student Official Identity</span>
        </h2>

        <div className="flex items-center space-x-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
          <StudentAvatar
            photoUrl={student?.photoUrl}
            name={student?.fullName}
            size="xl"
            studentId={student?.sprStudentId || student?.id}
            className="w-14 h-14 sm:w-16 sm:h-16 ring-4 ring-blue-500/20 shadow-md shrink-0"
          />
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate">{student?.fullName}</h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-bold">{student?.sprStudentId || 'SPR ID'}</p>
            <p className="text-xs text-slate-500 truncate">{student?.class?.name || 'Class Cohort'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Full Name</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{student?.fullName}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">SPR Student ID</span>
            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 block">{student?.sprStudentId}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Academic Class</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{student?.class?.name || 'Assigned Class'}</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Profile Lock Status</span>
            <span className="font-bold mt-0.5 flex items-center space-x-1.5">
              {student?.isProfileLocked ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked &amp; Verified</span>
                </span>
              ) : (
                <span className="text-amber-600 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Unlocked (Pending Questionnaire 1)</span>
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Password Change Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>Security &amp; Password</span>
        </h2>

        {pwdMsg && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center space-x-2 ${
              pwdMsg.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {pwdMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span className="font-semibold">{pwdMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              New Password (Min 6 Characters)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={pwdLoading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition disabled:opacity-50"
          >
            {pwdLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
