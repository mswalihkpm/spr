'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Lock,
  User,
  Mail,
  Phone,
  FileText,
  HelpCircle,
  Building,
  GraduationCap,
  Scale,
  Clock,
  ExternalLink,
  Info,
} from 'lucide-react';
import PublicFooter from '@/components/layout/PublicFooter';
import MobileHeaderMenu from '@/components/layout/MobileHeaderMenu';

export default function DeleteAccountPage() {
  const [formData, setFormData] = useState({
    studentIdentifier: '',
    requesterType: 'STUDENT',
    requesterName: '',
    requesterContact: '',
    relationship: '',
    requestType: 'ACCOUNT_DELETION',
    reason: '',
    parentalConsent: false,
    website: '', // Honeypot
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    reference: string;
    submittedAt: string;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.studentIdentifier.trim()) {
      setErrorMsg('Please provide the Student Name, SPR ID, or Student ID.');
      return;
    }

    if (!formData.requesterName.trim()) {
      setErrorMsg('Please enter the requester full name.');
      return;
    }

    if (!formData.requesterContact.trim()) {
      setErrorMsg('Please enter a valid email address or phone number for identity verification.');
      return;
    }

    if (formData.requesterType === 'PARENT_GUARDIAN' && !formData.relationship.trim()) {
      setErrorMsg('Please specify your relationship to the student (e.g. Father, Mother, Legal Guardian).');
      return;
    }

    if (!formData.parentalConsent) {
      setErrorMsg('Please acknowledge the consent and identity verification statement.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/public/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit deletion request.');
      }

      setSuccessResult({
        reference: data.reference,
        submittedAt: data.submittedAt || new Date().toISOString(),
        message: data.message,
      });
      // Clear form inputs
      setFormData({
        studentIdentifier: '',
        requesterType: 'STUDENT',
        requesterName: '',
        requesterContact: '',
        relationship: '',
        requestType: 'ACCOUNT_DELETION',
        reason: '',
        parentalConsent: false,
        website: '',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Return to Public Home"
              aria-label="Return to Public Home"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center shrink-0 border border-white/10 shadow-xs">
                <Image src="/logo.png" alt="SPR Logo" width={32} height={32} className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Students Performance Rate (SPR)
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Account & Student Data Deletion Portal
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/privacy-policy"
              className="hidden sm:flex text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline items-center space-x-1"
            >
              <span>Privacy Notice</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <MobileHeaderMenu />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Intro Hero Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-br from-madin-900 via-slate-900 to-slate-950 text-white shadow-xl border border-madin-800/80 space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold uppercase tracking-wider">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Google Play Policy & Institutional Compliance</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
            Request Student Account & Data Deletion
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed max-w-3xl">
            In compliance with Google Play Store User Data policies and student data protection standards, students and
            their parents or legal guardians can formally request the deactivation of their student portal credentials
            and the scrubbing of associated personal records.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
              <Lock className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white">No Login Required</span>
                <span className="text-slate-300 text-[11px]">Submit your request even if you cannot access your account.</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white">Verified Process</span>
                <span className="text-slate-300 text-[11px]">Administrative review within 7 days; completed in 30 days.</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start space-x-2.5">
              <Scale className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white">Statutory Retention</span>
                <span className="text-slate-300 text-[11px]">Official academic marks preserved per educational law.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Informational Guidance: What is Deleted vs Retained */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <Trash2 className="w-4 h-4" />
              <h3>What Will Be Deleted or Deactivated</h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Student Portal Account:</strong> Permanent deactivation of portal login credentials, password hash, and active session tokens.
              </li>
              <li>
                <strong>Access Revocation:</strong> Immediate termination of web and mobile app account access.
              </li>
              <li>
                <strong>Profile Photo:</strong> Avatar and uploaded profile media unlinked and purged from application storage.
              </li>
              <li>
                <strong>Non-Academic Notes:</strong> Administrative personal remarks and non-statutory metadata removed.
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
            <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
              <Building className="w-4 h-4" />
              <h3>What Records Are Retained & Why</h3>
            </div>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-5">
              <li>
                <strong>Statutory Academic Transcripts:</strong> Official term examination marks, grades, and board test results.
              </li>
              <li>
                <strong>Institutional Mandate:</strong> Educational records required by state education boards, CBSE/Kerala syllabus, and accreditation bodies cannot be destroyed upon request.
              </li>
              <li>
                <strong>Integrity & Audit:</strong> De-identified historical evaluation records remain in archival registers to preserve class rank integrity.
              </li>
            </ul>
          </div>
        </div>

        {/* Success Confirmation Card */}
        {successResult && (
          <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 shadow-lg space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-emerald-950 dark:text-emerald-100">
                  Request Successfully Submitted
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Your reference tracking identifier has been generated.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tracking Reference Number:</div>
              <div className="text-2xl font-mono font-black text-slate-900 dark:text-white tracking-wider">
                {successResult.reference}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Submitted on: {new Date(successResult.submittedAt).toLocaleString()}
              </div>
            </div>

            <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
              {successResult.message} Please save your reference number. You may also contact{' '}
              <a href="mailto:excellence@madin.edu.in" className="font-bold underline">
                excellence@madin.edu.in
              </a>{' '}
              with this reference for expedited verification.
            </p>

            <button
              onClick={() => setSuccessResult(null)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Submit Another Request
            </button>
          </div>
        )}

        {/* Deletion Request Form */}
        {!successResult && (
          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Deletion Request Form
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Please enter the required information so our administrative team can locate and verify the student record.
              </p>
            </div>

            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Anti-spam Honeypot (hidden from real users) */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              {/* Field 1: Requester Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  I am submitting this request as: <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, requesterType: 'STUDENT' })}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                      formData.requesterType === 'STUDENT'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div>The Student</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        Submitting for my own SPR portal account
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, requesterType: 'PARENT_GUARDIAN' })}
                    className={`p-3 rounded-2xl border text-left text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                      formData.requesterType === 'PARENT_GUARDIAN'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div>Parent or Legal Guardian</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        Submitting on behalf of a minor student
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Field 2: Student Identifier */}
              <div>
                <label htmlFor="studentIdentifier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Student Name, SPR ID, or Student ID <span className="text-rose-500">*</span>
                </label>
                <input
                  id="studentIdentifier"
                  type="text"
                  required
                  placeholder="e.g. SPR0123, MSOE-2026-001, or Full Registered Name"
                  value={formData.studentIdentifier}
                  onChange={(e) => setFormData({ ...formData, studentIdentifier: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Enter the student identifier known to you. School records will be matched against this information.
                </p>
              </div>

              {/* Field 3: Requester Name */}
              <div>
                <label htmlFor="requesterName" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="requesterName"
                  type="text"
                  required
                  placeholder="e.g. Mohammed Farhan / Parent Full Name"
                  value={formData.requesterName}
                  onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Field 4: Requester Contact */}
              <div>
                <label htmlFor="requesterContact" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Information (Email or Mobile Number) <span className="text-rose-500">*</span>
                </label>
                <input
                  id="requesterContact"
                  type="text"
                  required
                  placeholder="e.g. parent@example.com or +91 9876543210"
                  value={formData.requesterContact}
                  onChange={(e) => setFormData({ ...formData, requesterContact: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Used exclusively by the school administration to verify your identity before processing deletion.
                </p>
              </div>

              {/* Field 5: Relationship (Conditional if Parent/Guardian) */}
              {formData.requesterType === 'PARENT_GUARDIAN' && (
                <div>
                  <label htmlFor="relationship" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Relationship to Student <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="relationship"
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  >
                    <option value="">Select Relationship...</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Legal Guardian">Legal Guardian</option>
                    <option value="Other">Other Family Member</option>
                  </select>
                </div>
              )}

              {/* Field 6: Request Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Requested Action:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="requestType"
                      value="ACCOUNT_DELETION"
                      checked={formData.requestType === 'ACCOUNT_DELETION'}
                      onChange={() => setFormData({ ...formData, requestType: 'ACCOUNT_DELETION' })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Account Deactivation & Credential Revocation (Recommended)
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Immediately revokes all login credentials, removes password hashes, and invalidates active app sessions while preserving required academic exam history.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="requestType"
                      value="FULL_DELETION"
                      checked={formData.requestType === 'FULL_DELETION'}
                      onChange={() => setFormData({ ...formData, requestType: 'FULL_DELETION' })}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Full Data Scrubbing & Account Deletion Request
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5">
                        Disables account, purges profile photos, scrubs personal notes, and de-identifies records to the maximum extent permitted by institutional educational law.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Field 7: Reason (Optional) */}
              <div>
                <label htmlFor="reason" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Request (Optional)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  placeholder="e.g. Graduated / Transferred to another institution / Privacy preference"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
                />
              </div>

              {/* Field 8: Consent & Verification Acknowledgement */}
              <div className="pt-2">
                <label className="flex items-start space-x-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    required
                    checked={formData.parentalConsent}
                    onChange={(e) => setFormData({ ...formData, parentalConsent: e.target.checked })}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    <span className="font-bold block text-slate-900 dark:text-white">
                      Identity & Parental Verification Acknowledgement <span className="text-rose-500">*</span>
                    </span>
                    I confirm that I am the student named above or their legal parent/guardian. I understand that the
                    school administration will verify this request via the provided contact information before modifying
                    institutional records, and that statutory educational transcripts will be preserved in accordance with
                    regulatory standards.
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Never submit sensitive passwords or bank credentials through this form.
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Submit Deletion Request</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Alternate Contact Box */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-slate-900 dark:text-white">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4>Need Immediate Assistance?</h4>
          </div>
          <p>
            If you have questions regarding this deletion process or wish to speak directly with the data protection
            officer, you can email{' '}
            <a href="mailto:excellence@madin.edu.in" className="font-bold text-blue-600 dark:text-blue-400 underline">
              excellence@madin.edu.in
            </a>{' '}
            or visit the administrative office at Madin School of Excellence, Malappuram, Kerala, India.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

