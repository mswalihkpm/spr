'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppBootstrap } from '@/context/AppBootstrapContext';

interface AppIntroProps {
  minDuration?: number; // Minimum cinematic presentation time in ms (default: 1600ms)
  maxDuration?: number; // Maximum fallback duration in ms before forcing completion (default: 2600ms)
  onComplete?: () => void;
}

export default function AppIntro({
  minDuration = 1600,
  maxDuration = 2600,
  onComplete,
}: AppIntroProps) {
  const { isBootstrapped, bootstrapProgress, displayConfig } = useAppBootstrap();

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
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

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

  // Video playback initialization with safety handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isSubscribed = true;

    const tryPlay = () => {
      if (!isSubscribed || !video) return;
      if (video.paused) {
        video
          .play()
          .then(() => {
            if (isSubscribed) setIsVideoPlaying(true);
          })
          .catch(() => {
            // Autoplay was restricted by browser/device; fallback will smoothly display logo
          });
      }
    };

    tryPlay();
    const handlePlaying = () => {
      if (isSubscribed) setIsVideoPlaying(true);
    };

    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', tryPlay);
    video.addEventListener('loadeddata', tryPlay);

    return () => {
      isSubscribed = false;
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', tryPlay);
      video.removeEventListener('loadeddata', tryPlay);
    };
  }, []);

  // Smooth, non-jittery progress animation loop with guaranteed minimum presentation
  useEffect(() => {
    if (!show) return;

    startTimeRef.current = performance.now();

    // Fallback timer to prevent getting stuck
    const fallbackTimer = setTimeout(() => {
      completedRef.current = true;
    }, maxDuration);

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const timeRatio = Math.min(elapsed / minDuration, 1);

      // Target progress is based on time elapsed AND genuine bootstrap completion
      // This guarantees the intro does not flash or vanish in a jarring 150ms
      let targetProgress = 0;

      if (completedRef.current || (isBootstrapped && elapsed >= minDuration)) {
        targetProgress = 100;
      } else {
        // Curve smoothly towards 95% over minDuration, then wait for bootstrap if not ready
        const timeProgress = Math.round(95 * (1 - Math.pow(1 - timeRatio, 1.8)));
        const dataProgress = Math.round(bootstrapProgress || 0);
        targetProgress = Math.min(Math.max(timeProgress, dataProgress), 95);
      }

      // Smooth interpolation towards target
      const current = progressRef.current;
      const speed = targetProgress >= 100 ? 0.22 : 0.12;
      const nextProgress = current + (targetProgress - current) * speed;

      if (Math.abs(nextProgress - current) > 0.08 || (targetProgress >= 100 && nextProgress < 99.5)) {
        progressRef.current = nextProgress;
        setProgress(Math.min(Math.round(nextProgress), 100));
        animFrameRef.current = requestAnimationFrame(step);
      } else if (targetProgress >= 100 && !fadeOut) {
        progressRef.current = 100;
        setProgress(100);

        // Elegant fade-out transition
        setFadeOut(true);
        setTimeout(() => {
          setShow(false);
          try {
            if (typeof window !== 'undefined') sessionStorage.setItem('spr_intro_seen', 'true');
          } catch {}
          if (onComplete) {
            onComplete();
          }
        }, 320);
      } else {
        animFrameRef.current = requestAnimationFrame(step);
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      clearTimeout(fallbackTimer);
    };
  }, [show, isBootstrapped, bootstrapProgress, minDuration, maxDuration, onComplete, fadeOut]);

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

      {/* Centered Video / Logo Container + Smooth Progress Bar */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 space-y-5 sm:space-y-6">
        {/* Seamless Video / Logo Display Box */}
        <div className="relative flex items-center justify-center shrink-0 w-[95px] h-[95px] sm:w-[110px] sm:h-[110px]">
          {/* Institutional Brand Logo: Always visible from frame 0 so user NEVER sees an empty box or play icon */}
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
              isVideoPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-madin-900 p-2.5 flex items-center justify-center shadow-xl shadow-blue-900/10 border border-slate-100 animate-pulse">
              <Image
                src="/logo.png"
                alt="Madin SPR"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          {/* Intro Video: Fades in only once actively playing frames to eliminate the Android WebView play button */}
          <div
            className="w-full h-full relative flex items-center justify-center overflow-hidden bg-transparent"
            style={{
              backgroundColor: 'transparent',
              maskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
            }}
          >
            <video
              ref={videoRef}
              src="/maaax.webm"
              autoPlay
              muted
              loop
              playsInline
              webkit-playsinline="true"
              x5-playsinline="true"
              x5-video-player-type="h5"
              preload="auto"
              disablePictureInPicture
              disableRemotePlayback
              controls={false}
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"
              onPlaying={() => setIsVideoPlaying(true)}
              className={`w-full h-full object-contain pointer-events-none mix-blend-multiply bg-transparent transition-opacity duration-300 ${
                isVideoPlaying ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                filter: 'contrast(1.22) brightness(1.06)',
                backgroundColor: 'transparent',
              }}
            />
          </div>
        </div>

        {/* Institution Brand Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xs sm:text-sm font-black tracking-widest text-slate-900 uppercase">
            MADIN SCHOOL OF EXCELLENCE
          </h2>
          <div className="text-[10px] sm:text-[11px] font-bold text-blue-600 tracking-wider uppercase">
            Students Performance Rate
          </div>
        </div>

        {/* Modern 0–100% Progress Bar Directly Underneath */}
        <div className="w-full max-w-[200px] sm:max-w-[230px] flex flex-col items-center space-y-2 pt-1">
          {/* Progress Track */}
          <div className="w-full bg-slate-100 h-2 sm:h-2.5 rounded-full overflow-hidden relative shadow-inner border border-slate-200/60">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-100 ease-out"
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
