'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AppIntroProps {
  duration?: number; // Duration in milliseconds before fading out (default: 2300ms = 2.3s)
  onComplete?: () => void;
}

export default function AppIntro({
  duration = 2300,
  onComplete,
}: AppIntroProps) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [footerText, setFooterText] = useState('2026 version 0.1');
  const videoRef = useRef<HTMLVideoElement | null>(null);

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

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const playVideo = () => {
        if (video.paused) {
          video.play().catch(() => {
            // Handled via muted & playsInline
          });
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

  useEffect(() => {
    // Start fade-out at exactly 2.3 seconds (or specified duration)
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration);

    // Completely unmount after fade transition completes (500ms transition)
    const unmountTimer = setTimeout(() => {
      setShow(false);
      if (onComplete) {
        onComplete();
      }
    }, duration + 500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, [duration, onComplete]);

  if (!show) return null;

  return (
    <div
      id="spr-app-intro"
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-between bg-white select-none transition-all duration-500 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none scale-[1.02]' : 'opacity-100'
      }`}
      style={{
        backgroundColor: '#ffffff',
      }}
    >
      {/* Top spacer to ensure perfect optical vertical centering */}
      <div className="w-full h-12 sm:h-16 shrink-0" />

      {/* Centered Video Container with White Background Removal */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
        <div
          className="relative flex items-center justify-center shrink-0 overflow-hidden w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] md:w-[180px] md:h-[180px] lg:w-[200px] lg:h-[200px] max-w-[65vw] max-h-[35vh]"
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
