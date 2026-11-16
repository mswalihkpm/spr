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
  _liveScore?: number;
  _rankDiff?: number;
  _isOvertaking?: boolean;
  _isOvertaken?: boolean;
  [key: string]: any;
}

/**
 * Extracts the authoritative target score from any leaderboard item.
 */
function extractTargetScore(item: any, isClassRanking: boolean): number {
  if (isClassRanking) {
    if (typeof item.averagePercentage === 'number') return item.averagePercentage;
    if (typeof item.spr === 'number') return item.spr;
  }
  if (typeof item.spr === 'number' && item.spr > 0) return item.spr;
  if (typeof item.overallScore === 'number' && item.overallScore > 0) return item.overallScore;
  if (typeof item.averagePercentage === 'number' && item.averagePercentage > 0) return item.averagePercentage;
  if (typeof item.sprPoints === 'number' && item.sprPoints > 0) return item.sprPoints;
  if (typeof item.score === 'number' && item.score > 0) return item.score;
  // Fallbacks
  if (typeof item.spr === 'number') return item.spr;
  if (typeof item.overallScore === 'number') return item.overallScore;
  if (typeof item.averagePercentage === 'number') return item.averagePercentage;
  if (typeof item.sprPoints === 'number') return item.sprPoints;
  if (typeof item.score === 'number') return item.score;
  return 0;
}

/**
 * Three-Second Dynamic Leaderboard Animation Hook with Live Competition Race Dynamics.
 * 
 * Features:
 * - Continuously counts up every student's score from 0.00 to their exact final score.
 * - Dynamic ranking transition: leaderboard positions continuously update on every frame based on changing scores.
 * - Natural, realistic competition feel: students overtake one another based strictly on calculated animated score values.
 * - Gold, Silver, Bronze podium and student cards transition smoothly as ranks update.
 * - Purely visual animation enhancement: zero database mutations.
 * - Clean settlement at 3 seconds: displays exact final scores and accurately sorted rankings matching database tie-breaking rules.
 * - Fully robust across Overall Rankings, Class Rankings, Category leaderboards, on mobile and desktop.
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
  const prevRankMapRef = useRef<Map<string, number>>(new Map());
  const lastRenderTimeRef = useRef<number>(0);

  useEffect(() => {
    // If no entries, remain settled
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
      prevRankMapRef.current.clear();
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
    lastRenderTimeRef.current = 0;

    const totalDuration = 3000; // Exact 3 seconds
    const startTime = performance.now();
    const N = entries.length;

    // Map base items with deterministic velocity profiles for realistic overtaking
    const baseItems = entries.map((item, index) => {
      const targetScore = extractTargetScore(item, isClassRanking);
      const originalRank = typeof item.rank === 'number' ? item.rank : index + 1;
      const itemId = String(item.studentId || item.id || item.classId || item.className || index);

      // Deterministic hash based on ID string
      let hash = 0;
      for (let c = 0; c < itemId.length; c++) {
        hash = ((hash << 5) - hash) + itemId.charCodeAt(c);
        hash |= 0;
      }
      const normalizedHash = Math.abs(hash % 100) / 100; // 0.00 to 0.99
      const rankNorm = N > 1 ? (originalRank - 1) / (N - 1) : 0;

      // Realistic race curves:
      // - Lower-ranked students experience early bursts (exponent ~ 0.75 to 0.95)
      // - Top-ranked students accelerate steadily through mid-to-late phase (exponent ~ 1.15 to 1.40)
      const baseExp = 0.88 + (1 - rankNorm) * 0.40;
      const expVariation = (normalizedHash - 0.5) * 0.24;
      const curveExp = Math.max(0.72, Math.min(1.42, baseExp + expVariation));

      return {
        ...item,
        _animItemId: itemId,
        _animTargetScore: targetScore,
        _animOriginalRank: originalRank,
        _animOriginalIndex: index,
        _animCurveExp: curveExp,
        _animLastScore: 0,
      };
    });

    const updateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;

      if (elapsed >= totalDuration) {
        // Animation complete: settle cleanly into original database entries
        setAnimItems(null);
        setIsAnimating(false);
        setPhase('SETTLED');
        prevRankMapRef.current.clear();
        return;
      }

      // Throttle state update to ~30ms (~33fps) so React re-renders smoothly without dropped frames
      if (currentTime - lastRenderTimeRef.current < 28 && elapsed < totalDuration - 50) {
        animationFrameRef.current = requestAnimationFrame(updateFrame);
        return;
      }
      lastRenderTimeRef.current = currentTime;

      const t = Math.min(1.0, Math.max(0, elapsed / totalDuration));

      // Phase update for UI styling
      if (t < 0.28) {
        setPhase('COUNTING');
      } else if (t < 0.80) {
        setPhase('RANKING');
      } else {
        setPhase('SETTLED');
      }

      // Smooth deceleration curve for overall race
      const tEased = 1 - Math.pow(1 - t, 2.2);

      // Compute live animated score for every item strictly using the velocity curve
      const liveItems = baseItems.map((item) => {
        const pRaw = Math.pow(tEased, item._animCurveExp);
        let progress = pRaw;

        // Smooth convergence in final stretch (t > 0.80) so all settle into exact database ranks
        if (t > 0.80) {
          const blend = (t - 0.80) / 0.20;
          const smoothBlend = blend * blend * (3 - 2 * blend);
          progress = (1 - smoothBlend) * pRaw + smoothBlend * 1.0;
        }
        progress = Math.min(1.0, Math.max(0, progress));

        // Strict monotonicity: scores only count upwards, never backwards
        const computedScore = Number((item._animTargetScore * progress).toFixed(2));
        const liveScore = Math.max(item._animLastScore, computedScore);
        item._animLastScore = liveScore;

        return {
          ...item,
          _liveScore: liveScore,
          spr: liveScore,
          overallScore: liveScore,
          sprPoints: liveScore,
          score: liveScore,
          averagePercentage: liveScore,
          displayPercentage: isClassRanking ? `${liveScore.toFixed(2)}%` : item.displayPercentage,
        };
      });

      // Dynamic sorting based strictly on live animated scores
      liveItems.sort((a, b) => {
        // 1. Live animated score (higher score moves above lower score)
        if (b._liveScore !== a._liveScore) {
          return b._liveScore - a._liveScore;
        }
        // 2. Target final score
        if (b._animTargetScore !== a._animTargetScore) {
          return b._animTargetScore - a._animTargetScore;
        }
        // 3. Database original rank / index (preserves tie-breaking rules)
        return a._animOriginalIndex - b._animOriginalIndex;
      });

      // Assign dynamic ranks and calculate overtake differences
      for (let i = 0; i < liveItems.length; i++) {
        const currentItem = liveItems[i];
        let currentRank: number;

        if (i > 0 && currentItem._liveScore === liveItems[i - 1]._liveScore) {
          currentRank = liveItems[i - 1].rank;
        } else {
          currentRank = i + 1;
        }
        (currentItem as any).rank = currentRank;

        // Track rank delta from previous frame
        const prevRank = prevRankMapRef.current.get(currentItem._animItemId) ?? currentRank;
        const rankDiff = prevRank - currentRank; // > 0 means moved UP (overtook)
        prevRankMapRef.current.set(currentItem._animItemId, currentRank);

        (currentItem as any)._rankDiff = rankDiff;
        (currentItem as any)._isOvertaking = rankDiff > 0;
        (currentItem as any)._isOvertaken = rankDiff < 0;
      }

      setAnimItems(liveItems as unknown as T[]);
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

  // While animating, return animItems (if populated).
  // When not animating, return `entries` directly for 0ms latency and guaranteed database fidelity.
  const animatedEntries = isAnimating && animItems && animItems.length > 0 ? animItems : entries;

  return { animatedEntries, isAnimating, phase };
}
