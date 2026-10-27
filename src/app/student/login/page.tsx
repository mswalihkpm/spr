'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  GraduationCap,
  UserCheck,
  UserPlus,
  KeyRound,
  CheckCircle2,
  Check,
  Search,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Sign In State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [unregisteredStudents, setUnregisteredStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  // Load unregistered students on register mode
  useEffect(() => {
    if (mode === 'REGISTER') {
      fetch('/api/student/auth/unregistered')
        .then((res) => res.json())
        .then((data) => {
          if (data.students) setUnregisteredStudents(data.students);
        })
        .catch(() => {});
    }
  }, [mode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/student/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      router.push('/student/dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!selectedStudentId) {
      setRegisterError('Please select your name from the student list.');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setRegisterError('Passwords do not match. Please verify and re-enter.');
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await fetch('/api/student/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          activationCode,
          password: registerPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      setRegisterSuccess('Account created successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/student/dashboard');
      }, 1200);
    } catch (err: any) {
      setRegisterError(err.message || 'Failed to create student account.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const filteredUnregistered = unregisteredStudents.filter((s) => {
    const query = studentSearch.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(query) ||
      (s.sprStudentId && s.sprStudentId.toLowerCase().includes(query)) ||
      (s.className && s.className.toLowerCase().includes(query))
    );
  });

  const selectedStudent = unregisteredStudents.find((s) => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-madin-950 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={() => router.push('/login')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Staff / Admin Portal</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center">
          <img src="/logo.png" alt="Madin SPR Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white tracking-tight">
          Student Portal
        </h2>
        <p className="mt-1 text-xs text-gold-400 font-bold uppercase tracking-widest flex items-center justify-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Earnings • Wallet • Transfers</span>
        </p>

        {/* Tab Switcher */}
        <div className="mt-6 inline-flex p-1 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setLoginError('');
            }}
            className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'LOGIN'
                ? 'bg-madin-900 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setRegisterError('');
            }}
            className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              mode === 'REGISTER'
                ? 'bg-madin-900 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Account</span>
          </button>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/20">
          {mode === 'LOGIN' ? (
            /* ================= SIGN IN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  SPR Student ID or Full Name
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. SPR0118 or Your Full Name"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900 focus:bg-white transition-all font-medium"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Tip: You can use your SPR ID (e.g. SPR0001) or permanent student ID.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-madin-900 hover:bg-madin-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-madin-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 btn-interactive mt-2"
              >
                {loginLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Student Dashboard</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  First time here?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('REGISTER');
                      setRegisterError('');
                    }}
                    className="text-madin-900 font-bold hover:underline"
                  >
                    Activate your Student Account
                  </button>
                </p>
              </div>
            </form>
          ) : (
            /* ================= CREATE ACCOUNT FORM ================= */
            <form onSubmit={handleRegister} className="space-y-4">
              {registerError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{registerError}</span>
                </div>
              )}

              {registerSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{registerSuccess}</span>
                </div>
              )}

              {/* Student Name Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Select Your Name</span>
                  {selectedStudent && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Selected</span>
                    </span>
                  )}
                </label>

                {selectedStudent ? (
                  <div className="p-3.5 bg-emerald-50/90 border-2 border-emerald-500 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-900 flex items-center space-x-2 truncate">
                          <span className="truncate">{selectedStudent.fullName}</span>
                          <span className="bg-emerald-700 text-white font-mono text-[10px] px-1.5 py-0.5 rounded shrink-0">
                            {selectedStudent.sprStudentId || 'No SPR ID'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Class: {selectedStudent.className} ({selectedStudent.division})
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId('');
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white bg-white/80 transition-colors shrink-0 ml-2 shadow-xs"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search your name or SPR ID (e.g. MT or SPR0122)..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-1.5 bg-slate-50/50">
                      {filteredUnregistered.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500">
                          No unactivated student records found{studentSearch ? ` matching "${studentSearch}"` : ''}.
                        </div>
                      ) : (
                        filteredUnregistered.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              if (s.sprStudentId) {
                                setActivationCode(s.sprStudentId);
                              }
                              setRegisterError('');
                            }}
                            className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-madin-900 hover:bg-madin-50/50 bg-white transition-all flex items-center justify-between group shadow-xs cursor-pointer"
                          >
                            <div className="pr-2">
                              <div className="text-xs font-bold text-slate-900 group-hover:text-madin-900 transition-colors">
                                {s.fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {s.className} ({s.division})
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                                {s.sprStudentId || 'No ID'}
                              </span>
                              <span className="text-[11px] font-bold text-madin-900 bg-madin-100 group-hover:bg-madin-900 group-hover:text-white px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1">
                                <span>Select</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  Only students without an activated account appear in this list.
                </p>
              </div>

              {/* Identity Verification Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Verification / Activation Code</span>
                  <span className="text-[10px] text-madin-900 font-bold lowercase">Required</span>
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Enter SPR ID or Admin Activation Code"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Enter your official SPR Student ID (e.g. SPR0118) or Admin-issued activation code.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Set Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-madin-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-madin-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-madin-900 hover:bg-madin-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-madin-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 btn-interactive mt-2"
              >
                {registerLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Activate & Create Account</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500">
                  Already activated?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('LOGIN');
                      setLoginError('');
                    }}
                    className="text-madin-900 font-bold hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Institutional Security Notice */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Madin School of Excellence — SPR Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
