'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ModalLoadingBarProps {
  loading: boolean;
  text?: string;
  color?: 'blue' | 'indigo' | 'amber' | 'emerald' | 'rose' | 'slate';
  className?: string;
}

export default function ModalLoadingBar({
  loading,
  text,
  color = 'blue',
  className = '',
}: ModalLoadingBarProps) {
  if (!loading) return null;

  const colorClasses = {
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-600',
    amber: 'bg-amber-600',
    emerald: 'bg-emerald-600',
    rose: 'bg-rose-600',
    slate: 'bg-slate-900',
  };

  const bgClasses = {
    blue: 'bg-blue-100',
    indigo: 'bg-indigo-100',
    amber: 'bg-amber-100',
    emerald: 'bg-emerald-100',
    rose: 'bg-rose-100',
    slate: 'bg-slate-100',
  };

  const textClasses = {
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
    rose: 'text-rose-700',
    slate: 'text-slate-700',
  };

  return (
    <div className={`w-full my-2 space-y-1.5 animate-fade-in ${className}`}>
      <div className={`w-full h-1.5 ${bgClasses[color]} overflow-hidden relative rounded-full shadow-inner`}>
        <div className={`h-full ${colorClasses[color]} animate-progress-indeterminate rounded-full shadow-sm`} />
      </div>
      {text && (
        <div className={`flex items-center justify-center space-x-1.5 text-[11px] font-bold ${textClasses[color]} animate-pulse text-center`}>
          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
          <span>{text}</span>
        </div>
      )}
    </div>
  );
}
