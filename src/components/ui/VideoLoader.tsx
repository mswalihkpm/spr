'use client';

import React, { useEffect, useRef } from 'react';

interface VideoLoaderProps {
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  text?: string;
  subtext?: string;
  className?: string;
  loop?: boolean;
  progress?: number | null;
}

export function VideoLoaderComponent({
  src = '/ploo.mp4',
  size = 'md',
  text,
  subtext,
  className = '',
  loop = true,
  progress,
}: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Compute pixel dimensions
  let pixelSize = 64;
  if (typeof size === 'number') {
    pixelSize = size;
  } else if (size === 'xs') {
    pixelSize = 30;
  } else if (size === 'sm') {
    pixelSize = 44;
  } else if (size === 'md') {
    pixelSize = 64;
  } else if (size === 'lg') {
    pixelSize = 90;
  } else if (size === 'xl') {
    pixelSize = 120;
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isSubscribed = true;

    // Ensure immediate playback and continuous loop without browser stall
    const playVideo = () => {
      if (!isSubscribed || !video) return;
      if (video.paused) {
        video.play().catch(() => {
          // Autoplay policy handled via muted & playsInline
        });
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
    <div className={`flex flex-col items-center justify-center p-3 space-y-2.5 select-none ${className}`}>
      {/* Seamless Video Container with Hardware Acceleration */}
      <div
        className="relative flex items-center justify-center shrink-0 overflow-hidden transform-gpu will-change-transform"
        style={{ width: pixelSize, height: pixelSize }}
      >
        <video
          ref={videoRef}
          src={src}
          autoPlay
          loop={loop}
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-contain pointer-events-none mix-blend-multiply"
          style={{
            filter: 'contrast(1.06) brightness(1.02)',
          }}
        />
      </div>

      {/* Informative Loading Text */}
      {text && (
        <div className="text-center space-y-0.5 animate-pulse">
          <div className="text-xs sm:text-sm font-black text-slate-800 tracking-tight">{text}</div>
          {subtext && <div className="text-[10px] sm:text-xs text-slate-500 font-medium">{subtext}</div>}
        </div>
      )}

      {/* Optional In-Component Progress Bar */}
      {typeof progress === 'number' && (
        <div className="w-full max-w-[160px] flex flex-col items-center space-y-1 pt-0.5">
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-full transition-all duration-75 ease-out shadow-sm"
              style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-700 tabular-nums">
            {Math.min(Math.max(Math.round(progress), 0), 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

const VideoLoader = React.memo(VideoLoaderComponent);
export default VideoLoader;

