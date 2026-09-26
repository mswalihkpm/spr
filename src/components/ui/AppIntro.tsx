'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppBootstrap } from '@/context/AppBootstrapContext';

interface AppIntroProps {
  maxDuration?: number; // Maximum fallback duration in ms before forcing completion (default: 2400ms)
  onComplete?: () => void;
}

export default function AppIntro({
  maxDuration = 2400,
  onComplete,
}: AppIntroProps) {
  const { isBootstrapped, bootstrapProgress, bootstrapStatus, displayConfig } = useAppBootstrap();

  const [show, setShow] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const seen = sessionStorage.getItem('spr_intro_seen');
        if (seen === 'true') return false;
      } catch {}
    }
    return true;
  });
  const [fadeOut, setFadeOut] = useState(false);
  const [footerText, setFooterText] = useState('2026 version 0.1');
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const completedRef = useRef<boolean>(false);

  // Sync footer text from bootstrap display config or local cache
  useEffect(() => {
    if (displayConfig?.introFooter) {
      setFooterText(displayConfig.introFooter);
      try {
        if (typeof window !== 'undefined') localStorage.setItem('spr_intro_footer', displayConfig.introFooter);
      } catch {}
      return;
    }

    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('spr_intro_footer') : null;
      if (cached) setFooterText(cached);
    } catch {}
  }, [displayConfig]);

  // Ensure video playback starts promptly
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const playVideo = () => {
        if (video.paused) {
          video.play().catch(() => {});
        }
      };

      playVideo();
      video.addEventListener('loadeddata', playVideo);
      video.addEventListener('canplay', playVideo);

      return () => {
        video.removeEventListener('loadeddata', playVideo);
        video.removeEventListener('canplay', playVideo);
      };
    }
  }, []);

  // Smooth progress animation loop directly driven by genuine bootstrap state
  useEffect(() => {
    if (!show) return;

    startTimeRef.current = performance.now();

    // Safety fallback timer to prevent getting stuck
    const fallbackTimer = setTimeout(() => {
      completedRef.current = true;
    }, maxDuration);

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      // Real target progress derived from actual parallel bootstrap progress
      let targetProgress = 0;
      if (isBootstrapped || completedRef.current) {
        // Guarantee minimum 450ms intro animation for pristine visual feel before hitting 100%
        if (elapsed >= 450) {
          targetProgress = 100;
        } else {
          targetProgress = Math.min(Math.round((elapsed / 450) * 100), 100);
        }
      } else {
        // Track genuine bootstrapProgress while smoothing
        targetProgress = Math.min(Math.max(bootstrapProgress, Math.round(15 + Math.min(elapsed / 25, 75))), 95);
      }

      // Smooth interpolation towards target
      const current = progressRef.current;
      const speed = targetProgress >= 100 ? 0.16 : 0.09;
      const nextProgress = current + (targetProgress - current) * speed;

      if (Math.abs(nextProgress - current) > 0.05 || (targetProgress >= 100 && nextProgress < 99.8)) {
        progressRef.current = nextProgress;
        setProgress(Math.min(Math.round(nextProgress), 100));
        animFrameRef.current = requestAnimationFrame(step);
      } else if ((isBootstrapped || completedRef.current || targetProgress >= 100) && !fadeOut) {
        progressRef.current = 100;
        setProgress(100);

        // Brief 120ms pause at 100% for crisp feedback, then smooth fade-out
        setTimeout(() => {
          setFadeOut(true);
          setTimeout(() => {
            setShow(false);
            try {
              if (typeof window !== 'undefined') sessionStorage.setItem('spr_intro_seen', 'true');
            } catch {}
            if (onComplete) {
              onComplete();
            }
          }, 450);
        }, 120);
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [show, isBootstrapped, bootstrapProgress, maxDuration, onComplete, fadeOut]);

  if (!show) return null;

  return (
    <div
      id="spr-app-intro"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-white select-none transition-all duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none scale-[1.01]' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      {/* Top optical spacer */}
      <div className="w-full h-12 sm:h-16 shrink-0" />

      {/* Centered Video Container + Smooth Progress Bar */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 space-y-4 sm:space-y-5">
        {/* Seamless Video Container */}
        <div
          className="relative flex items-center justify-center shrink-0 overflow-hidden bg-transparent w-[85px] h-[85px] sm:w-[100px] sm:h-[100px] md:w-[115px] md:h-[115px] max-w-[50vw] max-h-[25vh]"
          style={{
            backgroundColor: 'transparent',
            maskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
          }}
        >
          <video
            ref={videoRef}
            src="/ploo.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            className="w-full h-full object-contain pointer-events-none mix-blend-multiply bg-transparent"
            style={{
              filter: 'contrast(1.22) brightness(1.06)',
              backgroundColor: 'transparent',
            }}
          />
        </div>

        {/* Modern 0–100% Progress Bar Directly Underneath Video */}
        <div className="w-full max-w-[190px] sm:max-w-[220px] md:max-w-[240px] flex flex-col items-center space-y-2">
          {/* Progress Track */}
          <div className="w-full bg-slate-200/90 h-2 sm:h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <div
              className="h-full bg-slate-950 dark:bg-white rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${Math.min(Math.max(progress, progress > 0 ? 3 : 0), 100)}%`,
                minWidth: progress > 0 ? '4px' : '0px',
              }}
            />
          </div>

          {/* Status Label & Percentage Indicator */}
          <div className="flex items-center justify-between w-full px-0.5">
            <span className="text-[10px] sm:text-[11px] font-medium tracking-wider text-slate-400 uppercase">
              {progress >= 100 ? 'Ready' : 'Initializing SPR'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-700 tabular-nums tracking-tight">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Colourless Subdued Footer */}
      <div className="w-full pb-6 sm:pb-8 text-center px-4 shrink-0">
        <p className="text-[11px] sm:text-xs text-slate-400 font-normal tracking-widest select-none">
          {footerText}
        </p>
      </div>
    </div>
  );
}

