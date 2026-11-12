'use client';

import React, { useState, useEffect } from 'react';
import { Megaphone, X, Clock, Bell } from 'lucide-react';

export interface TextNotificationData {
  id: string;
  text: string;
  title?: string | null;
  active: boolean;
  duration?: number;
  createdAt: string | Date;
}

interface HomepageTextNotificationProps {
  notification: TextNotificationData | null;
  onClose?: () => void;
}

export default function HomepageTextNotification({
  notification,
  onClose,
}: HomepageTextNotificationProps) {
  const [visible, setVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progressWidth, setProgressWidth] = useState('100%');

  useEffect(() => {
    if (!notification) {
      setVisible(false);
      return;
    }

    setVisible(true);
    setIsExiting(false);
    setProgressWidth('100%');

    // Trigger CSS progress bar shrink
    const progressTimer = setTimeout(() => {
      setProgressWidth('0%');
    }, 50);

    const durationSeconds = notification.duration && notification.duration > 0 ? notification.duration : 5;
    const durationMs = durationSeconds * 1000;

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, durationMs);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, 350);
  };

  if (!notification || !visible) return null;

  // Format automatic date and time
  const formattedDateTime = (() => {
    try {
      const d = new Date(notification.createdAt);
      if (isNaN(d.getTime())) return '';
      const datePart = d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} • ${timePart}`;
    } catch {
      return '';
    }
  })();

  const durationSeconds = notification.duration && notification.duration > 0 ? notification.duration : 5;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`transition-all duration-300 ease-out select-none ${
        isExiting
          ? 'opacity-0 -translate-x-6 scale-95 pointer-events-none'
          : 'opacity-100 translate-x-0 scale-100'
      }`}
    >
      <div className="relative rounded-2xl bg-slate-900/90 dark:bg-slate-950/95 text-white border border-amber-400/50 shadow-2xl shadow-black/50 backdrop-blur-md overflow-hidden p-3.5 sm:p-4">
        {/* Subtle glowing ambient gradient behind badge */}
        <div className="absolute top-0 left-0 w-32 h-16 bg-amber-500/15 rounded-full blur-xl pointer-events-none" />

        {/* Top Header Row: Icon + Badge + Auto Date/Time + Close Button */}
        <div className="flex items-center justify-between gap-2 pb-2 relative z-10 border-b border-white/10">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>

            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 shrink-0">
              <Bell className="w-2.5 h-2.5 text-amber-300" />
              <span>{notification.title || 'Notification'}</span>
            </span>

            {formattedDateTime && (
              <span className="text-[10px] text-slate-300 font-mono font-medium truncate flex items-center space-x-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{formattedDateTime}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            title="Close notification"
            aria-label="Close notification"
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/15 transition active:scale-90 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification Text Body */}
        <div className="pt-2.5 pb-2 relative z-10">
          <p className="text-xs sm:text-sm font-bold text-white/95 leading-relaxed tracking-tight whitespace-pre-wrap break-words">
            {notification.text}
          </p>
        </div>

        {/* 5-Second Animated Progress Bar Indicator */}
        <div className="w-full bg-white/15 h-1 rounded-full overflow-hidden mt-1">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 rounded-full"
            style={{
              width: progressWidth,
              transition: `width ${durationSeconds}s linear`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
