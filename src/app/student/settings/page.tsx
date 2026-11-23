'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  KeyRound,
  ShieldCheck,
  Lock,
  User,
  Users,
  Home,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  Eye,
  EyeOff,
  LogOut,
  FileCheck,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import VideoLoader from '@/components/ui/VideoLoader';
import StudentAvatar from '@/components/ui/StudentAvatar';
import NotificationPreferencesCard from '@/components/student/NotificationPreferencesCard';
import DigitalStudentIdCard, { IdCardData } from '@/components/id-card/DigitalStudentIdCard';
import { clearClientCache, getCachedStudentDashboard, setCachedStudentDashboard } from '@/lib/client-cache';

export default function StudentSettingsPage() {
  const router = useRouter();
  const cachedInitial = getCachedStudentDashboard();
  const initialStudent = cachedInitial?.student || cachedInitial;
  const hasInitialData = Boolean(initialStudent?.fullName);
  const [student, setStudent] = useState<any>(hasInitialData ? initialStudent : null);
  const [familyPersonalDetails, setFamilyPersonalDetails] = useState<any>(null);
  const [loading, setLoading] = useState(!hasInitialData);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Digital ID Card State
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [idCardData, setIdCardData] = useState<IdCardData | null>(null);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [idCardError, setIdCardError] = useState<string | null>(null);

  const handleOpenIdCardModal = async () => {
    setIdCardModalOpen(true);
    if (!idCardData) {
      try {
        setIdCardLoading(true);
        setIdCardError(null);
        const res = await fetch('/api/student/id-card');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load ID card');
        setIdCardData(json.idCard);
      } catch (err: any) {
        setIdCardError(err.message || 'Error generating Digital ID Card');
      } finally {
        setIdCardLoading(false);
      }
    }
  };

  // Logout State
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('spr_fcm_token') : null;
      const res = await fetch('/api/student/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: token || undefined }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const failMessage =
          errorData.message ||
          'Unable to safely complete logout at this time. Please retry to ensure private notifications are disconnected.';
        setLogoutError(failMessage);
        setLoggingOut(false);
        return;
      }

      // Revert device token type to ANONYMOUS so it continues to receive general circulars
      if (typeof window !== 'undefined' && token) {
        localStorage.setItem('spr_subscription_type', 'ANONYMOUS');
      }
      clearClientCache();
      router.push('/student/login');
    } catch (err: any) {
      console.warn('Logout network error:', err);
      setLogoutError('Network connection failed during logout. Please check your connection and retry.');
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    const cached = getCachedStudentDashboard();
    const resolvedCached = cached?.student || cached;
    if (resolvedCached?.fullName) {
      setStudent(resolvedCached);
      setLoading(false);
    }

    // Fast lite profile fetch (< 15ms)
    fetch('/api/student/auth/me?lite=1')
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            router.push('/student/login');
          }
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.student) {
          setStudent(data.student);
          setCachedStudentDashboard(data.student);
        }
        if (data?.familyPersonalDetails) {
          setFamilyPersonalDetails(data.familyPersonalDetails);
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

  if (loading && !student) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <VideoLoader
          size="md"
          text="Loading Student Account Settings..."
          subtext="Accessing Student Security & Identity Configuration"
          showProgress={false}
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
            <span className="text-slate-400 font-semibold block uppercase text-[10px]">Academic Year</span>
            <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{student?.academicYear || 'Current Session'}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MY ID CARD — DIGITAL STUDENT ID CARD ACCESS
          ========================================================================= */}
      <div className="bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-indigo-500/10 dark:from-sky-950/40 dark:via-blue-950/40 dark:to-indigo-950/40 rounded-3xl border border-sky-200 dark:border-sky-800/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                My Digital Student ID Card
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                Smart QR
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
              Automatic horizontal institutional ID card with student photograph, SPR ID, and secure QR code for store wallet access.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenIdCardModal}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>My ID Card</span>
          </button>
          <Link
            href="/student/id-card"
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            title="Open Dedicated Full Page"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Official Family & Personal Profile Card */}
      {(() => {
        const isFamilyCompleted = Boolean(
          familyPersonalDetails?.completed ||
          familyPersonalDetails?.fatherName ||
          familyPersonalDetails?.motherName ||
          familyPersonalDetails?.place ||
          student?.fatherName ||
          student?.motherName
        );

        if (isFamilyCompleted) {
          return (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Family &amp; Personal Profile</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Information submitted via Questionnaire 1 (Personal &amp; Family Profile).
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href="/student/activities/PERSONAL_FAMILY"
                    className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs"
                  >
                    <span>Edit / Update</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Father&apos;s Name</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.fatherName || student?.fatherName || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Mother&apos;s Name</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.motherName || student?.motherName || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">House / Permanent Address</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.houseName || student?.houseName || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Place / Locality</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.place || student?.place || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">District</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.district || student?.district || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Guardian Contact</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400 mt-0.5 block truncate">
                    {familyPersonalDetails?.guardianPhone || student?.guardianPhone || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Student Contact</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {familyPersonalDetails?.studentPhone || student?.studentPhone || 'Not provided'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Student Email</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                    {familyPersonalDetails?.studentEmail || student?.studentEmail || 'Not provided'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Residential Status</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.residentialStatus || student?.residentialStatus || '—'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Preferred Contact</span>
                  <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {familyPersonalDetails?.preferredContact || student?.preferredContact || '—'}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-amber-300 dark:border-amber-700/60 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Family &amp; Personal Questionnaire Pending
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  Complete your Personal &amp; Family Information questionnaire in the Activities portal to view your details here.
                </p>
              </div>
            </div>
            <Link
              href="/student/activities/PERSONAL_FAMILY"
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition flex items-center justify-center space-x-1.5 shrink-0 shadow-xs"
            >
              <span>Fill Questionnaire</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        );
      })()}

      {/* Push Notification Preferences & Device Registration Card */}
      <NotificationPreferencesCard />

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

      {/* Account Session & Sign Out Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/80 dark:border-rose-900/40 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Session &amp; Account Sign Out</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sign out of your active student portal session on this device. Private push notifications will be disconnected and reverted to institutional bulletin mode.
            </p>
          </div>
        </div>

        {logoutError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{logoutError}</span>
            </div>
            <button
              onClick={() => setLogoutError(null)}
              className="text-rose-400 hover:text-rose-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{loggingOut ? 'Signing Out...' : 'Sign Out of Account'}</span>
          </button>
        </div>
      </div>

      {/* Modal: Digital ID Card Preview */}
      {idCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Digital Student ID Card
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Official credential with verified institutional QR code
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIdCardModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {idCardLoading ? (
              <div className="py-16 flex items-center justify-center">
                <VideoLoader
                  size="lg"
                  text="Generating Digital ID Card..."
                  subtext="Encoding secure QR identity"
                />
              </div>
            ) : idCardError ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-bold flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{idCardError}</span>
              </div>
            ) : idCardData ? (
              <DigitalStudentIdCard
                data={idCardData}
                onRefresh={async () => {
                  setIdCardData(null);
                  handleOpenIdCardModal();
                }}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
