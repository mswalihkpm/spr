'use client';

import { useState, useEffect, useRef } from 'react';

export interface AnimatedLeaderboardItem {
  id: string;
  rank: number;
  originalRank: number;
  spr: number;
  targetSpr: number;
  displayPercentage?: string;
  [key: string]: any;
}

/**
 * Three-Second Dynamic Leaderboard Animation Hook.
 * - 0–1s: Visual numerical points counting from 0 towards actual totals.
 * - 1–2s: Dynamic ranking transitions towards final positions.
 * - 2–3s: Settle smoothly into final Top 3 podium and ranks.
 * 
 * Safeguards:
 * - Plays ONCE per fresh application launch via sessionStorage ('spr_leaderboard_animation_played').
 * - Will not replay on homepage revisits or ordinary navigation.
 * - Strictly respects reduced-motion accessibility settings.
 * - Purely visual presentation layer; does not mutate database or calculation engine.
 */
export function useLeaderboardAnimation<T extends Record<string, any>>(
  entries: T[],
  isClassRanking: boolean = false
): {
  animatedEntries: T[];
  isAnimating: boolean;
  phase: 'COUNTING' | 'RANKING' | 'SETTLED';
} {
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<'COUNTING' | 'RANKING' | 'SETTLED'>('SETTLED');
  const [animatedEntries, setAnimatedEntries] = useState<T[]>(entries);
  const animationFrameRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (!entries || entries.length === 0) {
      setAnimatedEntries([]);
      return;
    }

    // Check if animation has already played in this application session
    if (typeof window !== 'undefined') {
      const alreadyPlayed = sessionStorage.getItem('spr_leaderboard_animation_played');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (alreadyPlayed || prefersReducedMotion || hasTriggeredRef.current) {
        setAnimatedEntries(entries);
        setIsAnimating(false);
        setPhase('SETTLED');
        return;
      }

      // Mark played for this session to prevent re-triggering on revisits/navigation
      sessionStorage.setItem('spr_leaderboard_animation_played', 'true');
      hasTriggeredRef.current = true;
    }

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
        : 0;

      return {
        ...item,
        _animTargetScore: targetScore,
        _animCurrentScore: 0,
        _animInitialRank: index + 1,
      };
    });

    const updateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed >= totalDuration) {
        // Animation finished: settle cleanly into exact target scores and positions
        setAnimatedEntries(entries);
        setIsAnimating(false);
        setPhase('SETTLED');
        return;
      }

      if (elapsed < 1000) {
        // Phase 1 (0–1s): Points counting from 0 towards ~65% of target totals
        setPhase('COUNTING');
        const p = elapsed / 1000;
        // Ease-out quadratic curve for snappy counting start
        const eased = p * (2 - p);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * eased * 0.65).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        setAnimatedEntries(updated as unknown as T[]);
      } else if (elapsed < 2000) {
        // Phase 2 (1–2s): Dynamic re-ranking transitions as points progress to ~95%
        setPhase('RANKING');
        const p = (elapsed - 1000) / 1000;
        // Smooth linear progression for ranking shuffle
        const currentProgress = 0.65 + (p * 0.30);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * currentProgress).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        // Dynamically rank based on live interpolated points
        updated.sort((a, b) => b.spr - a.spr);
        for (let i = 0; i < updated.length; i++) {
          (updated[i] as any).rank = i + 1;
        }

        setAnimatedEntries(updated as unknown as T[]);
      } else {
        // Phase 3 (2–3s): Settle all entries into final positions and complete counting
        setPhase('SETTLED');
        const p = (elapsed - 2000) / 1000;
        const eased = 1 - Math.pow(1 - p, 3); // Dynamic cubic ease-out
        const currentProgress = 0.95 + (eased * 0.05);

        const updated = baseItems.map((item) => {
          const currentVal = Number((item._animTargetScore * currentProgress).toFixed(2));
          return {
            ...item,
            spr: currentVal,
            overallScore: currentVal,
            averagePercentage: currentVal,
            displayPercentage: isClassRanking ? `${currentVal.toFixed(2)}%` : item.displayPercentage,
          };
        });

        // Sort by final ranking order
        updated.sort((a, b) => b._animTargetScore - a._animTargetScore);
        for (let i = 0; i < updated.length; i++) {
          (updated[i] as any).rank = i + 1;
        }

        setAnimatedEntries(updated as unknown as T[]);
      }

      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    animationFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [entries, isClassRanking]);

  return { animatedEntries, isAnimating, phase };
}

