'use client';

import React, { useEffect, useRef } from 'react';

interface VideoLoaderProps {
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  text?: string;
  subtext?: string;
  className?: string;
  loop?: boolean;
}

export function VideoLoaderComponent({
  src = '/ploo.mp4',
  size = 'md',
  text,
  subtext,
  className = '',
  loop = true,
}: VideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Compute pixel dimensions
  let pixelSize = 84;
  if (typeof size === 'number') {
    pixelSize = size;
  } else if (size === 'xs') {
    pixelSize = 36;
  } else if (size === 'sm') {
    pixelSize = 56;
  } else if (size === 'md') {
    pixelSize = 84;
  } else if (size === 'lg') {
    pixelSize = 120;
  } else if (size === 'xl') {
    pixelSize = 160;
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
    </div>
  );
}

const VideoLoader = React.memo(VideoLoaderComponent);
export default VideoLoader;

