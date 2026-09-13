'use client';

import React, { useState, useEffect, useRef } from 'react';

interface VideoLoaderProps {
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  text?: string;
  subtext?: string;
  className?: string;
  loop?: boolean;
  progress?: number | null;
  showProgress?: boolean;
}

export function VideoLoaderComponent({
  src = '/ploo.mp4',
  size = 'md',
  text,
  subtext,
  className = '',
  loop = true,
  progress: explicitProgress,
  showProgress = true,
}: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Compute pixel dimensions and bar width
  let pixelSize = 64;
  let barMaxWidth = 'max-w-[160px]';
  let barHeight = 'h-2';

  if (typeof size === 'number') {
    pixelSize = size;
    barMaxWidth = size < 50 ? 'max-w-[130px]' : size < 90 ? 'max-w-[180px]' : 'max-w-[220px]';
    barHeight = size < 50 ? 'h-1.5' : size < 90 ? 'h-2' : 'h-2.5';
  } else if (size === 'xs') {
    pixelSize = 30;
    barMaxWidth = 'max-w-[120px]';
    barHeight = 'h-1.5';
  } else if (size === 'sm') {
    pixelSize = 44;
    barMaxWidth = 'max-w-[140px]';
    barHeight = 'h-1.5';
  } else if (size === 'md') {
    pixelSize = 64;
    barMaxWidth = 'max-w-[170px]';
    barHeight = 'h-2';
  } else if (size === 'lg') {
    pixelSize = 90;
    barMaxWidth = 'max-w-[210px]';
    barHeight = 'h-2.5';
  } else if (size === 'xl') {
    pixelSize = 120;
    barMaxWidth = 'max-w-[240px]';
    barHeight = 'h-2.5';
  }

  // Smooth continuous progress tracking loop
  useEffect(() => {
    startTimeRef.current = performance.now();

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      let target = 0;
      if (typeof explicitProgress === 'number') {
        target = Math.min(Math.max(explicitProgress, 0), 100);
      } else {
        // Continuous, realistic loading progress curve based on component active lifespan
        if (elapsed < 300) {
          // Rapid initial request setup (0% -> 38%)
          const t = elapsed / 300;
          target = Math.round(38 * (1 - Math.pow(1 - t, 2)));
        } else if (elapsed < 1000) {
          // Data transfer & parsing phase (38% -> 78%)
          const t = (elapsed - 300) / 700;
          target = Math.round(38 + 40 * (1 - Math.pow(1 - t, 1.8)));
        } else if (elapsed < 2200) {
          // Data aggregation & calculations (78% -> 94%)
          const t = (elapsed - 1000) / 1200;
          target = Math.round(78 + 16 * (1 - Math.pow(1 - t, 1.5)));
        } else {
          // Asymptotically approach 98% if non-critical network is slow
          const t = Math.min((elapsed - 2200) / 3000, 1);
          target = Math.round(94 + 4 * (1 - Math.pow(1 - t, 1.2)));
        }
      }

      // Smooth interpolation
      const current = progressRef.current;
      const speed = typeof explicitProgress === 'number' ? 0.15 : 0.08;
      const nextProgress = current + (target - current) * speed;

      if (Math.abs(nextProgress - current) > 0.04) {
        progressRef.current = nextProgress;
        setDisplayProgress(Math.min(Math.max(Math.round(nextProgress), 0), 100));
      }

      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [explicitProgress]);

  // Video playback initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isSubscribed = true;

    const playVideo = () => {
      if (!isSubscribed || !video) return;
      if (video.paused) {
        video.play().catch(() => {});
      }
    };

    playVideo();
    video.addEventListener('loadeddata', playVideo);
    video.addEventListener('canplay', playVideo);

    return () => {
      isSubscribed = false;
      video.removeEventListener('loadeddata', playVideo);
      video.removeEventListener('canplay', playVideo);
    };
  }, [src]);

  return (
    <div className={`flex flex-col items-center justify-center p-3 space-y-3 select-none ${className}`}>
      {/* Seamless Video Container with Hardware Acceleration & Edge-Feather Masking */}
      <div
        className="relative flex items-center justify-center shrink-0 overflow-hidden bg-transparent transform-gpu will-change-transform"
        style={{
          width: pixelSize,
          height: pixelSize,
          backgroundColor: 'transparent',
          maskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 65%, black 85%, transparent 100%)',
        }}
      >
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop={loop}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-contain pointer-events-none mix-blend-multiply bg-transparent"
          style={{
            filter: 'contrast(1.22) brightness(1.06)',
            backgroundColor: 'transparent',
          }}
        />
      </div>

      {/* Informative Loading Text */}
      {text && (
        <div className="text-center space-y-0.5">
          <div className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">{text}</div>
          {subtext && <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{subtext}</div>}
        </div>
      )}

      {/* 0–100% Real Loading Progress Bar */}
      {showProgress && (
        <div className={`w-full ${barMaxWidth} flex flex-col items-center space-y-1.5 pt-0.5`}>
          {/* Progress Bar Track */}
          <div className={`w-full bg-slate-200/90 dark:bg-slate-700 ${barHeight} rounded-full overflow-hidden relative shadow-inner`}>
            <div
              className="h-full bg-slate-950 dark:bg-white rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${Math.min(Math.max(displayProgress, displayProgress > 0 ? 3 : 0), 100)}%`,
                minWidth: displayProgress > 0 ? '4px' : '0px',
              }}
            />
          </div>

          {/* Clean Percentage & Status Indicator */}
          <div className="flex items-center justify-between w-full px-0.5">
            <span className="text-[9px] sm:text-[10px] font-medium tracking-wider text-slate-400 uppercase">
              {displayProgress >= 100 ? 'Loaded' : 'Processing'}
            </span>
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-700 tabular-nums tracking-tight">
              {displayProgress}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const VideoLoader = React.memo(VideoLoaderComponent);
export default VideoLoader;

