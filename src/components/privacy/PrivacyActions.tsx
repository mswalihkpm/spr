'use client';

import React, { useState } from 'react';
import { Printer, Check, Copy, ArrowUp, Mail, ShieldCheck } from 'lucide-react';

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs border border-slate-200/80 dark:border-slate-700 active:scale-95 cursor-pointer"
      title="Print or Save Policy as PDF"
      aria-label="Print or Save Policy as PDF"
    >
      <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      <span>Print / PDF</span>
    </button>
  );
}

export function CopyContactButton({ email = 'excellence@madin.edu.in' }: { email?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all border border-blue-200 dark:border-blue-800 active:scale-95 cursor-pointer"
      title={`Copy ${email} to clipboard`}
      aria-label={`Copy official email ${email}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-300">Email Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Copy Email Address</span>
        </>
      )}
    </button>
  );
}

