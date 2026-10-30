'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Home,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      if (data.mustChangePassword) {
        router.push('/auth/change-password');
      } else if (data.user?.role === 'STORE_ADMIN') {
        router.push('/store');
      } else if (data.user?.role === 'CREATIVE_HUB_ADMIN') {
        router.push('/creative-hub');
      } else if (data.user?.role === 'KUTHBKHANA_ADMIN') {
        router.push('/kuthbkhana');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-madin-950 via-madin-900 to-slate-900 flex flex-col justify-center py-8 sm:py-12 px-3.5 sm:px-6 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-madin-700/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Return to Home Button */}
      <div className="relative sm:absolute sm:top-6 sm:left-6 z-20 mb-4 sm:mb-0 flex items-center">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="inline-flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-white transition-all bg-white/10 hover:bg-white/20 px-3.5 py-2 min-h-touch rounded-xl border border-white/20 backdrop-blur-md shadow-md hover:scale-105 active:scale-95 cursor-pointer"
          title="Return to Public Homepage"
        >
          <ArrowLeft className="w-4 h-4 text-gold-400" />
          <span>Return to Home</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        {/* Brand Logo */}
        <div className="w-20 h-20 mx-auto rounded-2xl bg-white p-2.5 shadow-2xl flex items-center justify-center">
          <img src="/logo.png" alt="Madin SPR Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-black text-white tracking-tight">
          Madin School of Excellence
        </h2>
        <p className="mt-1 text-xs text-gold-400 font-bold uppercase tracking-widest">
          SPR Administrative & Evaluation Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 sm:px-8 shadow-2xl rounded-3xl border border-white/20">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Staff / Admin Email
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@madin.edu.in"
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900 focus:bg-white transition-all"
                />
              </div>
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-madin-900 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-madin-900 hover:bg-madin-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-madin-900 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 btn-interactive mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to SPR Portal</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Student Portal Switch */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2">Student accessing earnings, wallet, or store funds?</p>
            <button
              type="button"
              onClick={() => router.push('/student/login')}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gold-50 border border-gold-300 text-gold-950 text-xs font-bold hover:bg-gold-100 hover:shadow-xs transition-all"
            >
              <span>Go to Student Portal / Student Login</span>
              <ArrowRight className="w-3.5 h-3.5 text-gold-700" />
            </button>
          </div>

          {/* Quick Notice */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center space-x-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authorized Accounts Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}
