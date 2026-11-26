'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getOptimizedImageSrc } from '@/lib/optimized-images';

export interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  priority?: boolean;
  onFallbackError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Interactive UI image component that serves verified /public/optimized/*.webp siblings
 * while retaining exact original PNG/JPG URLs as automatic runtime fallbacks.
 */
export default function OptimizedImage({
  src,
  alt,
  priority,
  decoding = 'async',
  loading,
  onError,
  onFallbackError,
  ...rest
}: OptimizedImageProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const optimizedSrc = getOptimizedImageSrc(src);
  const hasWebpVariant = Boolean(optimizedSrc && optimizedSrc !== src);
  const useFallback = !hasWebpVariant || failedSrc === src;
  const activeSrc = useFallback ? src : optimizedSrc;

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0 && !useFallback) {
      setFailedSrc(src);
    }
  }, [src, useFallback]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!useFallback && hasWebpVariant) {
      setFailedSrc(src);
      return;
    }
    if (onFallbackError) {
      onFallbackError(e);
    }
    if (onError) {
      onError(e);
    }
  };

  const priorityAttr = priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {};

  return (
    <img
      ref={imgRef}
      src={activeSrc}
      alt={alt}
      data-fallback-src={hasWebpVariant ? src : undefined}
      decoding={decoding}
      loading={loading ?? (priority ? 'eager' : undefined)}
      {...priorityAttr}
      onError={handleError}
      {...rest}
    />
  );
}
