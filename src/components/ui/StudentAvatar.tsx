'use client';

import React, { useState } from 'react';

interface StudentAvatarProps {
  photoUrl?: string | null;
  name?: string;
  fullName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-xl font-bold',
  '2xl': 'w-24 h-24 text-2xl font-black',
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
}: StudentAvatarProps) {
  const displayName = fullName || name || 'ST';
  const [imageError, setImageError] = useState(false);

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

  const hasValidPhoto = photoUrl && typeof photoUrl === 'string' && photoUrl.trim().length > 0 && !imageError;

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 overflow-hidden font-bold select-none shadow-xs transition-transform duration-200 hover:scale-105 ${
        sizeClasses[size]
      } ${!hasValidPhoto ? `bg-gradient-to-br ${gradientClass}` : 'bg-slate-100'} ${className}`}
    >
      {hasValidPhoto ? (
        <img
          src={photoUrl}
          alt={name}
          loading="lazy"
          decoding="async"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

export default StudentAvatar;
