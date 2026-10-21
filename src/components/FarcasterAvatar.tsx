'use client';

import React, { useState, useEffect } from 'react';

interface FarcasterAvatarProps {
  src?: string | null;
  alt?: string;
  fid?: number;
  username?: string;
  className?: string;
  size?: number;
}

export function FarcasterAvatar({
  src,
  alt = 'Avatar',
  fid,
  username,
  className = 'h-8 w-8 rounded-full object-cover',
}: FarcasterAvatarProps) {
  // Determine if this is Mohammad's account
  const isMohammad =
    fid === 432209 ||
    username?.toLowerCase() === 'mohammad98' ||
    (typeof src === 'string' && src.includes('soNnpxz'));

  const getInitialUrl = (): string => {
    if (isMohammad) {
      return '/images/mohammad98.jpg';
    }
    if (src && src.trim()) {
      return src.trim();
    }
    if (fid) {
      return `https://avatar.vercel.sh/${fid}`;
    }
    if (username) {
      return `https://avatar.vercel.sh/${username}`;
    }
    return 'https://avatar.vercel.sh/fc';
  };

  const [currentSrc, setCurrentSrc] = useState<string>(getInitialUrl);
  const [retryStage, setRetryStage] = useState<number>(0);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    setCurrentSrc(getInitialUrl());
    setRetryStage(0);
    setHasError(false);
  }, [src, fid, username]);

  const handleError = () => {
    if (isMohammad && currentSrc !== '/images/mohammad98.jpg') {
      setCurrentSrc('/images/mohammad98.jpg');
      return;
    }

    if (retryStage === 0 && currentSrc.startsWith('http')) {
      // Stage 1: Try our server image proxy
      setRetryStage(1);
      setCurrentSrc(`/api/proxy-image?url=${encodeURIComponent(currentSrc)}`);
    } else if (retryStage <= 1) {
      // Stage 2: Try vercel avatar identicon
      setRetryStage(2);
      setCurrentSrc(`https://avatar.vercel.sh/${fid || username || 'anon'}`);
    } else {
      // Stage 3: Render SVG initials fallback
      setHasError(true);
    }
  };

  if (hasError) {
    const initial = (username || alt || 'F').trim().slice(0, 1).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center font-bold text-white bg-gradient-to-tr from-purple-700 to-indigo-600 select-none shrink-0 ${className}`}
        title={username ? `@${username}` : alt}
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
      loading="lazy"
    />
  );
}
