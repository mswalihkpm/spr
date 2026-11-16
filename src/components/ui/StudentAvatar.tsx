'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { formatGoogleDriveDirectUrl, extractGoogleDriveFileId } from '@/lib/google-drive';

export interface StudentAvatarProps {
  photoUrl?: string | null;
  name?: string;
  fullName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  studentId?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-xl font-bold',
  '2xl': 'w-24 h-24 text-2xl font-black',
};

const pixelSizes = {
  xs: 48,
  sm: 64,
  md: 80,
  lg: 120,
  xl: 180,
  '2xl': 240,
};

const gradientStyles = [
  'from-blue-600 to-indigo-700 text-white',
  'from-emerald-600 to-teal-700 text-white',
  'from-violet-600 to-purple-700 text-white',
  'from-amber-600 to-orange-700 text-white',
  'from-sky-600 to-blue-800 text-white',
];

export function StudentAvatar({
  photoUrl,
  name,
  fullName,
  size = 'md',
  className = '',
  studentId,
}: StudentAvatarProps) {
  const displayName = fullName || name || 'ST';
  const cleanPhotoUrl = typeof photoUrl === 'string' && photoUrl.trim().length > 0 ? photoUrl.trim() : null;
  const targetPixelSize = pixelSizes[size] || 80;

  // Build ordered list of candidate image URLs to attempt
  const candidateUrls = useMemo(() => {
    if (!cleanPhotoUrl) return [];

    const driveFileId = extractGoogleDriveFileId(cleanPhotoUrl);
    if (driveFileId) {
      return [
        // 1. Google Edge CDN (fastest, pre-sized)
        `https://lh3.googleusercontent.com/d/${driveFileId}=s${targetPixelSize}`,
        // 2. Google Drive Thumbnail API
        `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w${targetPixelSize}`,
        // 3. Direct Google Drive View Export
        `https://drive.google.com/uc?export=view&id=${driveFileId}`,
        // 4. Same-origin proxied fallback (bypasses any ISP or ad-blocker restrictions)
        `/api/avatar/${driveFileId}?proxy=true`,
      ];
    }

    // Direct HTTP/HTTPS or Data URL
    const list = [cleanPhotoUrl];
    if (studentId) {
      list.push(`/api/avatar/${encodeURIComponent(studentId)}?proxy=true`);
    }
    return list;
  }, [cleanPhotoUrl, targetPixelSize, studentId]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  // Reset fallback state when photoUrl or student changes
  useEffect(() => {
    setCandidateIndex(0);
    setHasFailedAll(false);
  }, [cleanPhotoUrl]);

  // Generate consistent gradient based on student name
  const nameHash = displayName
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradientClass = gradientStyles[nameHash % gradientStyles.length];

  // Get 2-letter clean initials (e.g. "Muhammad Swalih" -> "MS")
  const words = displayName.trim().split(/\s+/);
  let initials = 'ST';
  if (words.length >= 2) {
    initials = `${words[0][0]}${words[1][0]}`.toUpperCase();
  } else if (words.length === 1 && words[0].length > 0) {
    initials = words[0].slice(0, 2).toUpperCase();
  }

  const currentUrl = candidateUrls[candidateIndex];
  const hasValidPhoto = Boolean(currentUrl && !hasFailedAll);

  const handleImageError = () => {
    if (candidateIndex < candidateUrls.length - 1) {
      // Step to next candidate delivery channel
      setCandidateIndex((prev) => prev + 1);
    } else {
      // All candidate URLs failed; fallback to colored initials
      setHasFailedAll(true);
    }
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold select-none shadow-xs transition-transform duration-200 hover:scale-105 ${
        sizeClasses[size]
      } ${!hasValidPhoto ? `bg-gradient-to-br ${gradientClass}` : 'bg-slate-100'} ${className}`}
    >
      {hasValidPhoto ? (
        <img
          key={currentUrl}
          src={currentUrl}
          alt={displayName}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer-when-downgrade"
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default StudentAvatar;
