'use client';

import { useState, useEffect, useRef } from 'react';

export interface AnimatedLeaderboardItem {
  id?: string;
  rank: number;
  originalRank?: number;
  spr?: number;
  overallScore?: number;
  targetSpr?: number;
  displayPercentage?: string;
  averagePercentage?: number;
  [key: string]: any;
}

/**
 * Three-Second Dynamic Leaderboard Animation Hook.
 * Triggers dynamically for ALL leaderboard openings:
 * - Fresh application launches and page navigations to /leaderboard or /
 * - Category, wing, fest, and class ranking switches
 * - Modal leaderboard openings (ItemLeaderboardModal)
 * 
 * Animation Stages:
 * - 0–1s: Visual numerical points counting up from 0 towards actual totals.
 * - 1–2s: Dynamic ranking transitions towards final positions.
 * - 2–3s: Settle smoothly into final Top 3 podium and ranks.
 * 
 * Safety & Performance:
 * - When not animating, returns `entries` directly (0ms latency, zero loop risk, zero blank states).
 * - Never calls setState in render loops.
 * - Bypasses immediately if user prefers reduced motion (accessibility).
 */
export function useLeaderboardAnimation<T extends Record<string, any>>(
  entries: T[],
  isClassRanking: boolean = false,
  triggerKey?: string | number
): {
  animatedEntries: T[];
  isAnimating: boolean;
  phase: 'COUNTING' | 'RANKING' | 'SETTLED';
} {
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<'COUNTING' | 'RANKING' | 'SETTLED'>('SETTLED');
  const [animItems, setAnimItems] = useState<T[] | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const prevTriggerRef = useRef<string | number | undefined>(undefined);
  const hasAnimatedForTriggerRef = useRef<boolean>(false);

  useEffect(() => {
    // If no entries to animate, keep settled
    if (!entries || entries.length === 0) {
      if (isAnimating) {
        setIsAnimating(false);
        setPhase('SETTLED');
        setAnimItems(null);
      }
      return;
    }

    // Check if trigger changed
    const triggerChanged = triggerKey !== undefined && triggerKey !== prevTriggerRef.current;
    if (triggerChanged) {
      prevTriggerRef.current = triggerKey;
      hasAnimatedForTriggerRef.current = false;
    }

    // If already animated for this trigger, keep settled
    if (hasAnimatedForTriggerRef.current) {
      return;
    }

    // Accessibility check: bypass animation if user prefers reduced motion
    if (typeof window !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        hasAnimatedForTriggerRef.current = true;
        setIsAnimating(false);
        setPhase('SETTLED');
        setAnimItems(null);
        return;
      }
    }

    // Cancel any existing animation frame before starting fresh
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    hasAnimatedForTriggerRef.current = true;
    setIsAnimating(true);
    setPhase('COUNTING');

    const totalDuration = 3000; // Exact 3 seconds
    const startTime = performance.now();

    // Map initial items with starting score of 0
    const baseItems = entries.map((item, index) => {
      const targetScore = typeof item.spr === 'number'
        ? item.spr
        : typeof item.averagePercentage === 'number'
        ? item.averagePercentage
        : typeof item.overallScore === 'number'
        ? item.overallScore
        : typeof item.sprPoints === 'number'
        ? item.sprPoints
        : typeof item.score === 'number'
        ? item.score
        : 0;

      return {
        ...item,
        _animTargetScore: targetScore,
        _animInitialRank: index + 1,
      };
    });

    const updateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed >= totalDuration) {
        // Animation finished: cleanly settle back to original entries
        setAnimItems(null);
        setIsAnimating(false);
        setPhase('SETTLED');
        return;
      }

      if (elapsed < 1000) {
        // Phase 1 (0–1s): Points counting from 0 towards ~65% of target totals
        setPhase('COUNTING');
        const p = elapsed / 1000;
        const eased = p * (2 - p);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * eased * 0.65).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            sprPoints: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        setAnimItems(updated as unknown as T[]);
      } else if (elapsed < 2000) {
        // Phase 2 (1–2s): Dynamic re-ranking transitions as points progress to ~95%
        setPhase('RANKING');
        const p = (elapsed - 1000) / 1000;
        const currentProgress = 0.65 + (p * 0.30);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * currentProgress).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            sprPoints: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        // Dynamically rank based on live interpolated points
        updated.sort((a, b) => b.spr - a.spr);
        for (let i = 0; i < updated.length; i++) {
          (updated[i] as any).rank = i + 1;
        }

        setAnimItems(updated as unknown as T[]);
      } else {
        // Phase 3 (2–3s): Settle all entries into final positions and complete counting
        setPhase('SETTLED');
        const p = (elapsed - 2000) / 1000;
        const eased = 1 - Math.pow(1 - p, 3);
        const currentProgress = 0.95 + (eased * 0.05);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * currentProgress).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            sprPoints: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        // Sort by final ranking order
        updated.sort((a, b) => b._animTargetScore - a._animTargetScore);
        for (let i = 0; i < updated.length; i++) {
          (updated[i] as any).rank = i + 1;
        }

        setAnimItems(updated as unknown as T[]);
      }

      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animationFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [triggerKey, entries.length > 0]);

  // While animating, return animItems (if available).
  // When not animating, return `entries` directly so data is always 100% visible!
  const animatedEntries = isAnimating && animItems && animItems.length > 0 ? animItems : entries;

  return { animatedEntries, isAnimating, phase };
}
