'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AppIntroProps {
  maxDuration?: number; // Maximum fallback duration in ms before forcing completion (default: 2200ms)
  onComplete?: () => void;
}

export default function AppIntro({
  maxDuration = 2200,
  onComplete,
}: AppIntroProps) {
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
  const isReadyRef = useRef(false);
  const progressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch footer text from API or localStorage
  useEffect(() => {
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('spr_intro_footer') : null;
      if (cached) setFooterText(cached);
    } catch {}

    fetch('/api/display')
      .then((res) => res.json())
      .then((data) => {
        if (data.introFooter) {
          setFooterText(data.introFooter);
          try {
            if (typeof window !== 'undefined') localStorage.setItem('spr_intro_footer', data.introFooter);
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

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

  // Application readiness & smooth 0% -> 100% progress animation loop
  useEffect(() => {
    if (!show) return;

    startTimeRef.current = performance.now();

    // Check application readiness
    const checkReadiness = () => {
      if (typeof document !== 'undefined') {
        if (document.readyState === 'complete') {
          // Allow minimum 500ms of smooth animation before completing
          const elapsed = performance.now() - startTimeRef.current;
          if (elapsed >= 500) {
            isReadyRef.current = true;
          } else {
            setTimeout(() => {
              isReadyRef.current = true;
            }, 500 - elapsed);
          }
        }
      }
    };

    if (typeof window !== 'undefined') {
      if (document.readyState === 'complete') {
        checkReadiness();
      } else {
        window.addEventListener('load', checkReadiness);
        document.addEventListener('readystatechange', checkReadiness);
      }
    }

    // Safety fallback timeout to prevent getting stuck
    const fallbackTimer = setTimeout(() => {
      isReadyRef.current = true;
    }, maxDuration);

    let completed = false;

    // Smooth continuous animation frame step
    const step = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      // Determine target progress based on state and elapsed time
      let targetProgress = 0;
      if (isReadyRef.current) {
        targetProgress = 100;
      } else {
        // Asymptotically approach 90% while application is loading
        const t = Math.min(elapsed / 1600, 1);
        targetProgress = Math.min(Math.round(15 + 75 * (1 - Math.pow(1 - t, 2.5))), 90);
      }

      // Smoothly interpolate current progress towards target
      const current = progressRef.current;
      const speed = isReadyRef.current ? 0.14 : 0.08;
      const nextProgress = current + (targetProgress - current) * speed;

      if (Math.abs(nextProgress - current) > 0.05 || (isReadyRef.current && nextProgress < 99.9)) {
        progressRef.current = nextProgress;
        setProgress(Math.min(Math.round(nextProgress), 100));
        animFrameRef.current = requestAnimationFrame(step);
      } else if (isReadyRef.current && !completed) {
        completed = true;
        progressRef.current = 100;
        setProgress(100);

        // Brief 120ms pause at 100% for crisp visual feedback, then smooth fade-out
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
      if (typeof window !== 'undefined') {
        window.removeEventListener('load', checkReadiness);
        document.removeEventListener('readystatechange', checkReadiness);
      }
    };
  }, [show, maxDuration, onComplete]);

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
          className="relative flex items-center justify-center shrink-0 overflow-hidden w-[85px] h-[85px] sm:w-[100px] sm:h-[100px] md:w-[115px] md:h-[115px] max-w-[50vw] max-h-[25vh]"
          style={{
            backgroundColor: '#ffffff',
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
            className="w-full h-full object-contain pointer-events-none mix-blend-multiply"
            style={{
              filter: 'contrast(1.08) brightness(1.02)',
            }}
          />
        </div>

        {/* Modern 0–100% Progress Bar Directly Underneath Video */}
        <div className="w-full max-w-[190px] sm:max-w-[220px] md:max-w-[240px] flex flex-col items-center space-y-2">
          {/* Progress Track */}
          <div className="w-full bg-slate-100 h-1.5 sm:h-2 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-full transition-all duration-75 ease-out shadow-sm"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
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

