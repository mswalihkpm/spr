'use client';

import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

interface ScrollToTopHUDProps {
  threshold?: number;
  totalStudents?: number;
}

export default function ScrollToTopHUD({
  threshold = 280,
}: ScrollToTopHUDProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      setVisible(scrollY > threshold);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <div
      className={`fixed z-30 transition-all duration-300 print:hidden ${
        visible
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-75 pointer-events-none'
      } bottom-[calc(max(env(safe-area-inset-bottom,0px),0.6rem)+4.25rem)] sm:bottom-6 right-3.5 sm:right-6`}
    >
      <button
        onClick={scrollToTop}
        type="button"
        title="Scroll to top"
        aria-label="Scroll back to top"
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900/90 hover:bg-blue-600 dark:bg-slate-800 dark:hover:bg-blue-600 text-white shadow-lg border border-white/20 flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-110 cursor-pointer backdrop-blur-xs"
      >
        <ArrowUp className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
      </button>
    </div>
  );
}
