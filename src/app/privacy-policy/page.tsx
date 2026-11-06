import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  Eye,
  Database,
  Server,
  UserCheck,
  FileText,
  Mail,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Clock,
  Globe,
  Layers,
  GraduationCap,
  Award,
  KeyRound,
  Fingerprint,
  Cookie,
  UserX,
  Building,
  Smartphone,
  Scale,
  Info,
} from 'lucide-react';
import PublicFooter from '@/components/layout/PublicFooter';
import ScrollToTopHUD from '@/components/leaderboard/ScrollToTopHUD';
import { PrintButton, CopyContactButton } from '@/components/privacy/PrivacyActions';

export const metadata: Metadata = {
  title: 'Privacy Policy | Students Performance Rate (SPR)',
  description:
    'Institutional Privacy & Student Data Protection Notice for the Students Performance Rate (SPR) web platform and Android application (in.madin.spr) operated by Madin School of Excellence.',
  alternates: {
    canonical: 'https://msoerate.vercel.app/privacy-policy',
  },
  openGraph: {
    title: 'Privacy Policy | Students Performance Rate (SPR)',
    description:
      'Institutional Privacy & Student Data Protection Notice for the Students Performance Rate (SPR) web platform and Android application (in.madin.spr).',
    url: 'https://msoerate.vercel.app/privacy-policy',
    siteName: 'Students Performance Rate (SPR)',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = 'November 5, 2026';
  const officialContactEmail = 'excellence@madin.edu.in';
  const packageName = 'in.madin.spr';
  const officialWebsite = 'https://msoerate.vercel.app';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080e1e] text-slate-800 dark:text-slate-200 font-sans transition-colors duration-300">
      {/* ========================================================================= */}
      {/* Sticky Top Header Navigation                                              */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-subtle print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
              title="Return to Public Homepage"
              aria-label="Return to Public Homepage"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-madin-900 p-1 flex items-center justify-center shrink-0 shadow-xs border border-white/10">
                <Image
                  src="/logo.png"
                  alt="Madin SPR Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Students Performance Rate (SPR)
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                  Institutional Privacy & Student Data Protection Notice
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <PrintButton />
            <Link
              href="/"
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-xl bg-madin-900 text-white text-xs font-bold shadow hover:bg-madin-950 transition-colors"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Container                                                            */}
      {/* ========================================================================= */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        {/* Hero Title & Identity Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-madin-950 via-madin-900 to-slate-900 text-white p-6 sm:p-10 shadow-premium border border-white/10">
          <div className="relative z-10 space-y-4 max-w-3xl">
            {/* Corrected: Replaced unverified compliance guarantee with accurate notice badge */}
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/30 text-blue-300 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Privacy & Student Data Protection Notice</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Privacy Policy & Student Data Notice
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              This policy describes the data collection, processing, storage, and access practices of the{' '}
              <strong className="text-white font-semibold">Students Performance Rate (SPR)</strong> evaluation platform
              and its Android client application (<code className="font-mono text-gold-300 bg-white/10 px-1.5 py-0.5 rounded">{packageName}</code>). Operated by{' '}
              <strong className="text-white font-semibold">Madin School of Excellence, Ma&apos;din Academy</strong>, this notice outlines institutional transparency, student data safeguards, and user rights.
            </p>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Effective / Updated</span>
                <span className="font-semibold text-white">{lastUpdated}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Application ID</span>
                <span className="font-mono font-semibold text-gold-300">{packageName}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Primary Web Host</span>
                <a href={officialWebsite} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-300 hover:underline">
                  msoerate.vercel.app
                </a>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Privacy Desk</span>
                <a href={`mailto:${officialContactEmail}`} className="font-mono font-semibold text-emerald-300 hover:underline truncate block">
                  {officialContactEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Decorative background glow */}
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Quick Jump Table of Contents */}
        <nav aria-label="Table of Contents" className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Table of Contents</span>
            </h2>
            <span className="text-[11px] text-slate-400">12 Technical & Institutional Sections</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            <a href="#section-1" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
              <span className="truncate">Architecture, Scope & App Identity</span>
            </a>
            <a href="#section-2" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
              <span className="truncate">Data Fiduciary & Institutional Contact</span>
            </a>
            <a href="#section-3" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
              <span className="truncate">Personal & Academic Data Collected</span>
            </a>
            <a href="#section-4" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">4</span>
              <span className="truncate">Information Not Collected</span>
            </a>
            <a href="#section-5" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">5</span>
              <span className="truncate">Educational Purpose & Legal Context</span>
            </a>
            <a href="#section-6" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">6</span>
              <span className="truncate">Public Leaderboard Visibility & Consent</span>
            </a>
            <a href="#section-7" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">7</span>
              <span className="truncate">Third-Party Infrastructure Processors</span>
            </a>
            <a href="#section-8" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">8</span>
              <span className="truncate">Cookies & Authentication Tokens</span>
            </a>
            <a href="#section-9" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">9</span>
              <span className="truncate">Minor Students & Parental Arrangements</span>
            </a>
            <a href="#section-10" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">10</span>
              <span className="truncate font-bold text-rose-600 dark:text-rose-400">Account Deletion & Data Retention</span>
            </a>
            <a href="#section-11" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">11</span>
              <span className="truncate">Security Measures & Access Control</span>
            </a>
            <a href="#section-12" className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition flex items-center space-x-2">
              <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center font-bold text-[10px] shrink-0">12</span>
              <span className="truncate">Grievance Desk & Institutional Review</span>
            </a>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* Policy Content Sections                                                   */}
        {/* ========================================================================= */}
        <article className="space-y-10 leading-relaxed text-sm">

          {/* Section 1: Architecture, Scope & Institutional Identity */}
          <section id="section-1" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                1
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Architecture, Scope & App Identity
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                The <strong>Students Performance Rate (SPR)</strong> platform is an internal educational evaluation and merit tracking system operated by <strong>Madin School of Excellence</strong>, an educational institution under <strong>Ma&apos;din Academy</strong>, located in Malappuram, Kerala, India.
              </p>
              <p>
                This policy applies to:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
                <li>
                  <strong>The Web Application:</strong> Deployed at <a href={officialWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline font-medium">{officialWebsite}</a>.
                </li>
                <li>
                  {/* Corrected: Accurate architectural description of Android app */}
                  <strong>The Android Application (<code className="font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-bold">{packageName}</code>):</strong> Distributed on the Google Play Store. The application functions as an Android client wrapper (utilizing WebView or web container technology with Android Digital Asset Links verification at <code className="font-mono text-xs">/.well-known/assetlinks.json</code>) that renders and interacts with the SPR web platform.
                </li>
                <li>
                  <strong>Authenticated Portals:</strong> Internal student dossiers, co-curricular submissions, library reading records, and faculty grading interfaces.
                </li>
              </ul>
              <p>
                SPR is designed strictly for academic evaluation, student record-keeping, and institutional merit recognition. It is not an open social network, public forum, or commercial marketplace.
              </p>
            </div>
          </section>

          {/* Section 2: Data Fiduciary & Contact */}
          <section id="section-2" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                2
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Data Fiduciary & Institutional Contact
              </h2>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              The institutional entity responsible for determining the purposes and means of processing student and user data is:
            </p>

            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Madin School of Excellence</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ma&apos;din Academy Campus</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Swalat Nagar, Melmuri PO, Malappuram, Kerala, India — PIN 676519</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Official Institutional Privacy Desk</span>
                  <a href={`mailto:${officialContactEmail}`} className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                    {officialContactEmail}
                  </a>
                </div>
                <CopyContactButton email={officialContactEmail} />
              </div>
            </div>
          </section>

          {/* Section 3: Information We Collect */}
          <section id="section-3" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                3
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Categories of Information We Collect and Process
              </h2>
            </div>

            <p className="text-slate-600 dark:text-slate-300">
              In accordance with data minimization principles, SPR processes only records necessary for academic performance tracking and institutional administration:
            </p>

            <div className="space-y-4 pt-1">
              {/* Category A */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3>A. Student Enrollment & Academic Identity Records</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Student profiles are established through verified school registration files:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <li><strong>Full Name:</strong> Institutional enrollment name.</li>
                  <li><strong>Institutional Identifiers:</strong> Unique SPR Student ID (e.g., <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">SPR0122</code>) and Admission Number (e.g., <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">MSOE-2026-001</code>).</li>
                  <li><strong>Class Placement:</strong> Academic Class, Division (e.g., A, B), and Academic Year.</li>
                  <li><strong>Portrait / Avatar URL:</strong> Student portrait stored via Supabase Storage (<code className="font-mono text-xs">student-photos</code> bucket) or external URL (such as authorized Google Drive thumbnails).</li>
                  <li><strong>Enrollment Status:</strong> Active, Inactive, or Alumni.</li>
                </ul>
              </div>

              {/* Category B */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <Award className="w-4 h-4 text-gold-500" />
                  <h3>B. Academic & Co-Curricular Evaluation Records</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Evaluation records (<code className="font-mono text-xs">PerformanceRecord</code>) entered by authorized teachers, examiners, and mentors:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <li><strong>Islamic Studies:</strong> Curricular marks, memorization assessments, and jurisprudence benchmarks.</li>
                  <li><strong>School Studies:</strong> Regular school examination scores, term tests, and subject assessments.</li>
                  <li><strong>Programs & Competitions:</strong> Participation entries, positions, and merit points across campus, district, and state events.</li>
                  <li><strong>Creative Hub Submissions:</strong> Student poems, essays, articles, publication links, and review scores.</li>
                  <li><strong>Literary Festivals:</strong> Sahityotsav, Jamia Maharjan, and M-Lit fest results and ranks.</li>
                  <li><strong>Library Reading Index:</strong> Reading logs and reading index points synchronized from the institutional library portal (<code className="font-mono text-xs">msoelibrary.vercel.app</code>).</li>
                  <li><strong>SPR Aggregate Score & Rankings:</strong> Normalized weighted score computed according to category weights configured by school administration.</li>
                </ul>
              </div>

              {/* Category C */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h3>C. Account Credentials & Session Records</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Authentication attributes for student and faculty access:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <li><strong>Password Hashes:</strong> Passwords are transformed into salted one-way hashes using Bcrypt (<code className="font-mono text-xs">bcryptjs</code>, salt factor 10). Plain-text passwords are never stored in the database.</li>
                  <li><strong>Activation Codes:</strong> One-time activation tokens generated by administrators for initial student account setup.</li>
                  <li><strong>Session Tokens:</strong> Signed JSON Web Tokens (JWT) stored in HTTP-only cookies, along with last login timestamps.</li>
                </ul>
              </div>

              {/* Category D */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3>D. Institutional Merit Incentives & Campus Store Ledgers</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Internal incentive ledger records:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <li><strong>Virtual Incentive Balance:</strong> Merit-based point conversions for campus store stationery credits.</li>
                  <li><strong>Transaction Ledgers:</strong> Internal reference records of credited incentives and store disbursements.</li>
                  <li><strong>Important Clarification:</strong> This ledger is strictly an internal, non-monetary school incentive system. SPR does not collect, process, or store credit card, debit card, UPI, or bank account information.</li>
                </ul>
              </div>

              {/* Category E */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                  <Server className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h3>E. Operational Telemetry & Administrative Audit Logs</h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  To safeguard data integrity and audit academic changes:
                </p>
                <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <li><strong>Audit Logs:</strong> Administrative actions record the acting user ID, entity modified, action type, timestamp, IP address, and browser User-Agent header.</li>
                  <li><strong>Sanitization:</strong> Sensitive authentication fields (passwords, hashes, tokens) are redacted before storage in audit logs.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 4: What We DO NOT Collect */}
          <section id="section-4" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center shrink-0">
                4
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Information Not Collected by SPR
              </h2>
            </div>

            {/* Corrected: Removed unverified "zero surveillance" claim */}
            <p className="text-slate-600 dark:text-slate-300">
              In accordance with data minimization, SPR does not employ commercial tracking, advertising tools, or unnecessary device access:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                <UserX className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block">No Geolocation Coordinates</strong>
                  <span className="text-slate-500 dark:text-slate-400">The application does not request, track, or record GPS or real-time location data.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                <Smartphone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block">No Advertising Identifiers</strong>
                  <span className="text-slate-500 dark:text-slate-400">SPR does not read Google Advertising IDs (AAID/GAID), IDFA, or device hardware IDs.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block">No Financial Banking Credentials</strong>
                  <span className="text-slate-500 dark:text-slate-400">We do not collect credit cards, debit cards, bank account numbers, or payment credentials.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-start space-x-2.5">
                <Fingerprint className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block">No Biometric Data</strong>
                  <span className="text-slate-500 dark:text-slate-400">We do not scan, collect, or process fingerprints, facial recognition scans, or voiceprints.</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Educational Purpose */}
          <section id="section-5" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                5
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Educational Purpose & Legal Context
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                Student personal data is processed solely for institutional educational purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Academic Merit Computation:</strong> Calculating real-time composite Students Performance Rates (SPR) to evaluate academic, ethical, and co-curricular development.
                </li>
                <li>
                  <strong>Academic Guidance & Mentorship:</strong> Enabling class teachers, mentors, and administrators to track student progress and provide timely educational support.
                </li>
                <li>
                  <strong>Student Access:</strong> Permitting students to log in securely, view their scores, review submissions, and check store incentive balances.
                </li>
                <li>
                  <strong>Institutional Record-Keeping:</strong> Maintaining accurate, verifiable academic records for school evaluation and accreditation.
                </li>
              </ul>
              {/* Corrected: Qualified legal context regarding DPDP Act */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                <div className="flex items-center space-x-1.5 font-bold text-slate-900 dark:text-white">
                  <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Applicable Legal Framework & DPDP Act Alignment</span>
                </div>
                <p>
                  Data processing is undertaken for legitimate educational administration under institutional enrollment and school governance rules. Madin School of Excellence is committed to aligning its data handling practices with the principles of the <em>Digital Personal Data Protection Act, 2023 (DPDP Act)</em>, including purpose limitation, data accuracy, and reasonable security safeguards. Legal interpretations and institutional policies remain subject to qualified school and legal counsel review as government rules are implemented.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6: Public Leaderboard vs Confidential Data & Consent */}
          <section id="section-6" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                6
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Public Leaderboard Visibility & Consent Arrangements
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              {/* Corrected: Clearly explain actual public visibility and flag need for school approval / guardian arrangements */}
              <p>
                To celebrate student effort and encourage academic growth, the SPR system features a public leaderboard accessible on the open web at <code className="font-mono text-xs">/leaderboard</code> and <code className="font-mono text-xs">/</code> without login:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 dark:text-amber-300 font-bold">
                    <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h3>Publicly Accessible Data</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Visible to any website visitor without authentication:
                  </p>
                  <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <li>Student Full Name</li>
                    <li>Student Portrait / Profile Avatar</li>
                    <li>Academic Class and Division</li>
                    <li>Aggregate SPR Score and Rank</li>
                    <li>Published Creative Hub submissions</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold">
                    <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <h3>Confidential & Access-Restricted Data</h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Restricted strictly to authenticated students and faculty:
                  </p>
                  <ul className="list-disc pl-4 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <li>Account password hashes and activation tokens</li>
                    <li>Student Wallet and Campus Store ledger balances</li>
                    <li>Audit log entries (IP addresses and user agents)</li>
                    <li>Internal teacher notes and discrepancy reports</li>
                  </ul>
                </div>
              </div>

              {/* Crucial Institutional Notice on Consent */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-200 space-y-2">
                <div className="flex items-center space-x-2 font-bold text-sm">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>School Approval & Parent/Guardian Notice for Minors</span>
                </div>
                <p>
                  Because enrolled students are minors, the public display of student names, class divisions, and portraits on school leaderboards is administered under institutional guidelines and requires appropriate school approval and parental/guardian notification upon enrollment.
                </p>
                <p>
                  Parents or legal guardians who wish to request that their student&apos;s photo or public name be omitted, restricted, or displayed anonymously on public-facing leaderboards may submit a request to the school administration at <a href={`mailto:${officialContactEmail}`} className="font-mono font-bold underline">{officialContactEmail}</a>.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7: Third-Party Infrastructure */}
          <section id="section-7" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                7
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Third-Party Infrastructure Processors
              </h2>
            </div>

            {/* Corrected: Removed "certified enterprise cloud infrastructure" buzzword */}
            <p className="text-slate-600 dark:text-slate-300">
              SPR relies on third-party cloud infrastructure and service providers solely to host, compute, and deliver the application. These entities act as data processors supporting system operations:
            </p>

            <div className="space-y-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Supabase Inc.</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Provides managed PostgreSQL database hosting and cloud storage for student avatar images (<code className="font-mono text-[11px]">student-photos</code> bucket).
                  </p>
                  {/* Corrected: Factual description of database connection endpoint without unverified formal residency certification */}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Database connection: Configured using Supabase Asia-Pacific pooler endpoint (<code className="font-mono text-[11px]">aws-0-ap-south-1.pooler.supabase.com</code>). Formal residency guarantees remain governed by Supabase service agreements.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold text-[10px] uppercase">
                  Database & Storage
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Vercel Inc.</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Provides serverless application hosting, edge CDN caching, and automated HTTPS certificate delivery for the web platform and APIs.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase">
                  Hosting & CDN
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">MSOE Digital Library Portal</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Institutional reading portal (<code className="font-mono text-[11px]">msoelibrary.vercel.app</code>) providing reading count and page volume records synced to student profiles.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-gold-100 dark:bg-gold-950/60 text-gold-900 dark:text-gold-200 font-bold text-[10px] uppercase">
                  Institutional Sync
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Google Drive CDN (Avatar Delivery)</h3>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Serves read-only student portrait thumbnails via Google user-content CDN links (<code className="font-mono text-[11px]">lh3.googleusercontent.com</code>) without granting Google Drive access to student accounts.
                  </p>
                </div>
                <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold text-[10px] uppercase">
                  Media CDN
                </span>
              </div>
            </div>

            {/* Clear distinction: Service provider processing vs commercial advertising */}
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
              <strong className="block text-sm font-bold text-slate-900 dark:text-white mb-1">Commercial Data Sharing Disclaimer:</strong>
              These service providers process data strictly to support SPR functionality. We do not sell, rent, monetize, or share student personal information or examination results with any commercial advertising brokers, data aggregators, or marketing networks.
            </div>
          </section>

          {/* Section 8: Cookies & Local Storage */}
          <section id="section-8" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                8
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Cookies, Local Storage & Authentication Tokens
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                SPR does not deploy advertising or tracking cookies. The application uses strictly necessary authentication cookies and client-side preference storage:
              </p>

              <div className="overflow-x-auto pt-1">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold">
                      <th className="py-2.5 px-3">Cookie / Storage Key</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Lifespan</th>
                      <th className="py-2.5 px-3">Verified Configuration & Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">spr_auth_token</td>
                      <td className="py-2.5 px-3">Strictly Necessary</td>
                      <td className="py-2.5 px-3 font-mono">7 Days</td>
                      <td className="py-2.5 px-3">
                        Signed JWT cookie for faculty/admin sessions. Configured in code with <code className="font-mono text-[11px]">httpOnly: true</code>, <code className="font-mono text-[11px]">sameSite: &apos;lax&apos;</code>, and <code className="font-mono text-[11px]">secure: production</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">spr_student_token</td>
                      <td className="py-2.5 px-3">Strictly Necessary</td>
                      <td className="py-2.5 px-3 font-mono">7 Days</td>
                      <td className="py-2.5 px-3">
                        Signed JWT cookie for authenticated student portal sessions. Configured with <code className="font-mono text-[11px]">httpOnly: true</code>, <code className="font-mono text-[11px]">sameSite: &apos;lax&apos;</code>, and <code className="font-mono text-[11px]">secure: production</code>.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">spr_theme</td>
                      <td className="py-2.5 px-3">Functional Preference</td>
                      <td className="py-2.5 px-3">Persistent</td>
                      <td className="py-2.5 px-3">
                        Browser LocalStorage key preserving user UI theme selection (<code className="font-mono text-[11px]">dark</code> or <code className="font-mono text-[11px]">light</code>).
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 9: Minor Students' Privacy Protections */}
          <section id="section-9" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                9
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Minor Students & Parental Arrangements
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                As an institution educating students in secondary and higher secondary grades, the student body consists primarily of minors:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Supervised Account Creation:</strong> Student accounts are established through institutional administration and authenticated via school-issued activation codes. Unverified self-registration by the general public is disabled.
                </li>
                <li>
                  <strong>No Behavioral Commercialization:</strong> We do not conduct commercial advertising, behavioral marketing, or algorithmic consumer profiling of students.
                </li>
                {/* Corrected: Replaced "absolute right" with appropriate institutional grievance process */}
                <li>
                  <strong>Parental Review & Communication:</strong> Parents and legal guardians have the right to review their child&apos;s academic records, request factual corrections to recorded marks, or request deactivation of student portal credentials through the school&apos;s administrative office.
                </li>
                <li>
                  <strong>Institutional Contact:</strong> Parents may direct privacy questions or requests to the Office of Academic Excellence at <a href={`mailto:${officialContactEmail}`} className="text-blue-600 dark:text-blue-400 font-mono font-bold hover:underline">{officialContactEmail}</a>.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 10: Account Deletion & Retention */}
          <section id="section-10" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border-2 border-slate-300 dark:border-slate-700 shadow-premium space-y-5">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-sm flex items-center justify-center shrink-0 shadow">
                10
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Account Deletion & Data Retention Policy
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Google Play Policy Disclosure & Administrative Procedure
                </span>
              </div>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                In accordance with Google Play Store User Data policy disclosures and institutional accountability standards, SPR provides an accessible path for students, parents, and alumni to request account deactivation or deletion:
              </p>

              {/* Action Box: Deletion Workflow */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 dark:text-white font-bold text-sm">
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <h3>How to Request Account Deactivation or Deletion</h3>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Because student accounts are managed through school administration, deletion requests are handled through verified administrative channels:
                </p>

                <div className="space-y-3 text-xs">
                  {/* Primary: Online Deletion Portal */}
                  <div className="p-4 bg-rose-50/60 dark:bg-rose-950/40 rounded-2xl border-2 border-rose-300 dark:border-rose-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                      <div>
                        <strong className="text-slate-900 dark:text-white text-sm block">
                          Online Account & Data Deletion Portal (No Login Required)
                        </strong>
                        <span className="text-slate-600 dark:text-slate-300 block mt-0.5">
                          Submit an instant deletion or deactivation request directly via our public web portal. Fully accessible to students, parents, and Google Play reviewers.
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1 font-mono">
                          Official URL: {officialWebsite}/delete-account
                        </span>
                      </div>
                    </div>
                    <Link
                      href="/delete-account"
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
                    >
                      <span>Open Deletion Form</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white block">Email Request Channel (Alternate)</strong>
                      <span className="text-slate-600 dark:text-slate-300 block mt-0.5">
                        Submit a written request to{' '}
                        <a href={`mailto:${officialContactEmail}?subject=SPR%20Account%20and%20Data%20Deletion%20Request`} className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          {officialContactEmail}
                        </a>{' '}
                        with subject <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">SPR Account and Data Deletion Request</code>.
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                        Please specify: Student Full Name, SPR Student ID, Admission Number, Class, and reason for the request.
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
                    <Building className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white block">In-Person Institutional Channel</strong>
                      <span className="text-slate-600 dark:text-slate-300 block mt-0.5">
                        Students or guardians may submit a written deactivation request in person at the Madin School of Excellence Administrative Office.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corrected: Realistic operational workflow, record distinctions, and timeline */}
              <div className="space-y-2 text-xs">
                <h4 className="font-bold text-slate-900 dark:text-white">Operational Workflow & What Records Are Deleted vs. Retained:</h4>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-300">
                  <li>
                    <strong>Verification Procedure:</strong> The school administration verifies the identity of the student or legal guardian before modifying database records.
                  </li>
                  <li>
                    <strong>Account Credential Deletion:</strong> Upon approval, the student portal login account (<code className="font-mono text-[11px]">StudentAccount</code>) is deactivated or deleted. Active session tokens are invalidated and the password hash is permanently removed, preventing further portal access.
                  </li>
                  <li>
                    <strong>Profile Media:</strong> Stored avatar photos associated with the profile can be unlinked and purged from storage upon request.
                  </li>
                  <li>
                    <strong>Statutory Academic Retention:</strong> Official term scores, board exam records, and permanent historical grade transcripts are retained in institutional school registers as mandated by educational board rules and accreditation standards.
                  </li>
                  <li>
                    <strong>Processing Timeline:</strong> Verified deactivation requests are typically processed by administration within <strong>30 calendar days</strong>.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 11: Security Architecture */}
          <section id="section-11" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                11
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Security Measures & Access Control
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                We implement technical safeguards in the codebase and infrastructure to protect stored records:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                {/* Corrected: Removed unverified HSTS claim; accurately state TLS via edge hosting */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-600" />
                    <span>HTTPS & TLS Transport Encryption</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Communications between browsers/apps and the server are encrypted in transit over HTTPS using SSL/TLS managed at the edge hosting layer.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Bcrypt Password Hashing</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Stored passwords are encrypted using salted one-way Bcrypt hashes. Plain-text passwords are never stored in the database.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span>Role-Based Access Control (RBAC)</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Server-side authorization checks (<code className="font-mono">hasPermission</code>) verify user roles before granting administrative, grading, or editing privileges.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                    <Cookie className="w-3.5 h-3.5 text-amber-600" />
                    <span>HttpOnly Session Cookies</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">
                    Authentication JWTs are stored in cookies with <code className="font-mono text-[11px]">httpOnly: true</code>, preventing client-side script access.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 12: User Rights & Grievance Contact */}
          <section id="section-12" className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0">
                12
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Grievance Redressal & Policy Updates
              </h2>
            </div>

            <div className="text-slate-600 dark:text-slate-300 space-y-4">
              {/* Corrected: Replaced assertion of "absolute rights" with institutional grievance processes */}
              <p>
                Students, alumni, and parents/guardians may submit inquiries regarding their recorded data through our institutional grievance channels:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block font-bold mb-1">1. Inquiries & Record Review</strong>
                  <span>Request an overview of recorded personal data and performance metrics.</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block font-bold mb-1">2. Correction of Inaccuracies</strong>
                  <span>Submit evidence to correct misspelled names, incorrect grades, or outdated class placement.</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block font-bold mb-1">3. Deactivation & Restriction</strong>
                  <span>Request deactivation of student portal credentials or restricted leaderboard visibility.</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <strong className="text-slate-900 dark:text-white block font-bold mb-1">4. Grievance Review</strong>
                  <span>Address data protection concerns to the designated school office for timely review.</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <h4 className="font-bold text-slate-900 dark:text-white">Notice of Revisions</h4>
                <p className="text-xs">
                  This policy is reviewed periodically to reflect changes in school regulations, technological updates, and applicable Indian data protection laws. Revisions will be published directly at this URL with an updated effective date.
                </p>
              </div>

              {/* Grievance Desk Box */}
              <div className="p-5 rounded-2xl bg-madin-900 text-white space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                  <h3 className="font-bold text-sm">Institutional Grievance Officer Contact</h3>
                </div>
                <p className="text-xs text-slate-300">
                  For privacy inquiries, data rectification, or deactivation requests, please contact:
                </p>
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="block font-bold text-white">Office of Academic Excellence & Student Affairs</span>
                    <span className="text-slate-400">Madin School of Excellence, Ma&apos;din Academy, Malappuram, Kerala, India</span>
                    <span className="block font-mono text-emerald-300 font-bold mt-0.5">{officialContactEmail}</span>
                  </div>
                  <CopyContactButton email={officialContactEmail} />
                </div>
              </div>
            </div>
          </section>

        </article>
      </main>

      {/* Floating Scroll to Top HUD */}
      <ScrollToTopHUD />

      {/* Permanent Public Footer */}
      <PublicFooter />
    </div>
  );
}
