'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface HorizontalScrollRibbonProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  activeItemId?: string;
  showArrows?: boolean;
  maskEdges?: boolean;
  scrollStep?: number;
  ariaLabel?: string;
}

export default function HorizontalScrollRibbon({
  children,
  className = '',
  containerClassName = '',
  activeItemId,
  showArrows = true,
  maskEdges = true,
  scrollStep = 240,
  ariaLabel = 'Horizontal navigation ribbon',
}: HorizontalScrollRibbonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => checkScroll();
    el.addEventListener('scroll', onScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => checkScroll());
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', onScroll);
      resizeObserver.disconnect();
    };
  }, [checkScroll, children]);

  // Auto-scroll active item into view centered horizontally
  useEffect(() => {
    if (!activeItemId || !containerRef.current) return;
    const container = containerRef.current;

    // Small delay to allow layout calculation
    const timer = setTimeout(() => {
      const activeEl = container.querySelector(
        `[data-active="true"], [data-item-id="${activeItemId}"]`
      ) as HTMLElement | null;

      if (activeEl) {
        const containerWidth = container.clientWidth;
        const targetLeft =
          activeEl.offsetLeft - containerWidth / 2 + activeEl.offsetWidth / 2;

        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        });
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [activeItemId]);

  const scrollLeft = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: scrollStep, behavior: 'smooth' });
  };

  // Mouse Drag-to-Scroll support
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag with primary mouse button
    if (e.button !== 0 || !containerRef.current) return;
    dragInfo.current = {
      isDown: true,
      startX: e.pageX - containerRef.current.offsetLeft,
      scrollLeft: containerRef.current.scrollLeft,
      hasMoved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragInfo.current.isDown || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.4;
    if (Math.abs(walk) > 4) {
      if (!isDragging) setIsDragging(true);
      dragInfo.current.hasMoved = true;
    }
    containerRef.current.scrollLeft = dragInfo.current.scrollLeft - walk;
  };

  const handleMouseUpOrLeave = () => {
    dragInfo.current.isDown = false;
    if (isDragging) {
      setTimeout(() => setIsDragging(false), 50);
    }
  };

  // Prevent click triggering if user was dragging
  const handleCaptureClick = (e: React.MouseEvent) => {
    if (dragInfo.current.hasMoved) {
      e.stopPropagation();
      e.preventDefault();
      dragInfo.current.hasMoved = false;
    }
  };

  return (
    <div
      className={`relative group/ribbon ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        handleMouseUpOrLeave();
      }}
    >
      {/* Dynamic Left Gradient Fade Mask */}
      {maskEdges && canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 sm:w-10 z-10 bg-gradient-to-r from-slate-200/40 dark:from-slate-900/40 to-transparent transition-opacity duration-300 rounded-l-2xl"
        />
      )}

      {/* Dynamic Right Gradient Fade Mask */}
      {maskEdges && canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 sm:w-10 z-10 bg-gradient-to-l from-slate-200/40 dark:from-slate-900/40 to-transparent transition-opacity duration-300 rounded-r-2xl"
        />
      )}

      {/* Left Navigation Chevron Button */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all duration-200 backdrop-blur-md"
        >
          <ChevronLeft className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      )}

      {/* Right Navigation Chevron Button */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95 transition-all duration-200 backdrop-blur-md"
        >
          <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </button>
      )}

      {/* Horizontal Scroll Content */}
      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onClickCapture={handleCaptureClick}
        className={`horizontal-scroll-container ${
          isDragging ? 'is-dragging' : ''
        } ${containerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
