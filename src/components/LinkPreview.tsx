'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ExternalLink,
  Globe,
  Play,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface OgData {
  url: string;
  mediaType: 'image' | 'video' | 'website';
  title?: string;
  description?: string;
  image?: string;
  video?: string;
  siteName?: string;
  domain?: string;
  favicon?: string;
}

// Client-side in-memory cache for OpenGraph results
const clientOgCache = new Map<string, OgData>();

export function isDirectImageUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.svg') ||
    clean.endsWith('.avif') ||
    url.includes('imagedelivery.net') ||
    url.includes('i.imgur.com') ||
    url.includes('imgur.com') ||
    url.includes('res.cloudinary.com') ||
    url.includes('files.catbox.moe') ||
    url.includes('i.ibb.co') ||
    url.includes('postimg.cc') ||
    url.includes('pbs.twimg.com')
  );
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.ogg')
  );
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Fullscreen Interactive Lightbox Modal for Cast Images
 */
export function ImageLightboxModal({
  images,
  initialIndex = 0,
  onClose,
}: {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = origOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [images.length, onClose]);

  if (!mounted || typeof document === 'undefined' || images.length === 0) return null;

  const currentUrl = images[currentIndex] || images[0];

  const content = (
    <div
      className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
        {/* Counter */}
        <div className="pointer-events-auto">
          {images.length > 1 && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/10 shadow-lg">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all backdrop-blur-md border border-white/10"
            title="Open original image in new tab"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white transition-all backdrop-blur-md border border-white/10 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows for multi-image gallery */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            }}
            className="absolute left-3 sm:left-6 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }}
            className="absolute right-3 sm:right-6 z-20 p-2.5 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/10 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Main Image View */}
      <div
        className="relative max-w-[95vw] sm:max-w-[90vw] max-h-[85vh] sm:max-h-[88vh] flex items-center justify-center overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentUrl}
          alt={`Full view ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] sm:max-h-[88vh] w-auto h-auto object-contain rounded-xl shadow-2xl transition-transform duration-200"
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/**
 * Single Rich Link or Media Card
 */
export function SingleLinkPreview({
  url,
  onImageClick,
}: {
  url: string;
  onImageClick?: (url: string) => void;
}) {
  const [og, setOg] = useState<OgData | null>(clientOgCache.get(url) || null);
  const [loading, setLoading] = useState<boolean>(!clientOgCache.has(url));
  const [hasError, setHasError] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isSelfLightboxOpen, setIsSelfLightboxOpen] = useState(false);

  const youtubeId = extractYouTubeId(url);
  const isImage = isDirectImageUrl(url);
  const isVideo = isDirectVideoUrl(url);

  useEffect(() => {
    if (isImage || isVideo || youtubeId) {
      setLoading(false);
      return;
    }

    if (clientOgCache.has(url)) {
      setOg(clientOgCache.get(url)!);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (data && data.status === 'ok') {
          clientOgCache.set(url, data);
          setOg(data);
        } else {
          setHasError(true);
        }
      })
      .catch(() => {
        if (active) setHasError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, isImage, isVideo, youtubeId]);

  // CASE 1: YouTube video embed
  if (youtubeId) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xs my-2 aspect-video w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  // CASE 2: Direct Video
  if (isVideo) {
    return (
      <div
        className="rounded-2xl overflow-hidden border border-slate-200 bg-black my-2 max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <video
          src={url}
          controls
          playsInline
          preload="metadata"
          className="w-full max-h-96 object-contain"
        />
      </div>
    );
  }

  // CASE 3: Direct Image (Click opens fullscreen lightbox)
  if (isImage) {
    if (imgError) return null;
    return (
      <>
        <div
          className="rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 my-2 max-w-2xl group shadow-xs hover:border-purple-300 transition-all cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            if (onImageClick) {
              onImageClick(url);
            } else {
              setIsSelfLightboxOpen(true);
            }
          }}
          title="Click to view full image"
        >
          <img
            src={url}
            alt="Cast media"
            onError={() => setImgError(true)}
            className="w-full max-h-96 object-contain bg-slate-950/5 group-hover:scale-[1.01] transition-transform duration-200"
            loading="lazy"
          />
        </div>
        {isSelfLightboxOpen && !onImageClick && (
          <ImageLightboxModal
            images={[url]}
            initialIndex={0}
            onClose={() => setIsSelfLightboxOpen(false)}
          />
        )}
      </>
    );
  }

  // CASE 4: Loading Skeleton
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 my-2 animate-pulse flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 w-1/3 bg-slate-200 rounded" />
          <div className="h-3 w-3/4 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  // CASE 5: Error or minimal fallback
  if (hasError || !og) {
    const domain = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 bg-purple-50/70 hover:bg-purple-100/70 border border-purple-200/80 px-2.5 py-1.5 rounded-xl transition-all my-1.5 max-w-full"
      >
        <Globe className="h-3.5 w-3.5 text-purple-600 shrink-0" />
        <span className="truncate font-medium">{domain}</span>
        <ExternalLink className="h-3 w-3 text-purple-400 shrink-0 ml-0.5" />
      </a>
    );
  }

  // CASE 6: Rich OpenGraph Website Card
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block rounded-2xl border border-slate-200 bg-white hover:border-purple-300 hover:shadow-xs transition-all overflow-hidden my-2 max-w-2xl group"
    >
      {og.image && !imgError && (
        <div className="w-full h-44 sm:h-52 bg-slate-100 overflow-hidden relative border-b border-slate-100">
          <img
            src={og.image}
            alt={og.title || 'OpenGraph preview'}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-3.5 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          {og.favicon ? (
            <img src={og.favicon} alt="" className="h-3.5 w-3.5 rounded-xs shrink-0" />
          ) : (
            <Globe className="h-3 w-3 text-slate-400 shrink-0" />
          )}
          <span className="truncate">{og.siteName || og.domain}</span>
          <ExternalLink className="h-3 w-3 text-slate-400 ml-auto group-hover:text-purple-600 transition-colors" />
        </div>

        {og.title && (
          <h5 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-purple-700 transition-colors">
            {og.title}
          </h5>
        )}

        {og.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {og.description}
          </p>
        )}
      </div>
    </a>
  );
}

/**
 * Helper component that renders all media/url previews for a cast
 */
export function CastMediaPreviews({
  embeds,
  text,
}: {
  embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>;
  text?: string;
}) {
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: string[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  const handleOpenLightbox = (images: string[], index: number) => {
    setLightboxState({
      isOpen: true,
      images,
      initialIndex: index,
    });
  };

  const handleCloseLightbox = () => {
    setLightboxState((prev) => ({ ...prev, isOpen: false }));
  };

  // Extract URLs from embeds
  const embedUrls = (embeds || [])
    .map((e) => e.url)
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u));

  // Extract URLs from text
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
  const textUrls = text ? (text.match(urlRegex) || []) : [];

  // Deduplicate URLs
  const allUrls = Array.from(new Set([...embedUrls, ...textUrls]));

  if (allUrls.length === 0) return null;

  // Separate direct image URLs from regular link URLs
  const directImageUrls = allUrls.filter((u) => isDirectImageUrl(u));
  const otherUrls = allUrls.filter((u) => !isDirectImageUrl(u));

  return (
    <div className="space-y-2 pt-1">
      {/* Multi-Image Gallery Grid for 2 or 3 images */}
      {directImageUrls.length > 1 ? (
        <div
          className={`grid gap-2 my-2 max-w-2xl overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50 p-1 ${
            directImageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {directImageUrls.slice(0, 3).map((imgUrl, idx) => (
            <div
              key={idx}
              className="relative aspect-4/3 cursor-zoom-in group overflow-hidden rounded-xl bg-slate-100"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenLightbox(directImageUrls, idx);
              }}
              title="Click to view full image"
            >
              <img
                src={imgUrl}
                alt={`Cast media ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ) : directImageUrls.length === 1 ? (
        <SingleLinkPreview
          url={directImageUrls[0]}
          onImageClick={(imgUrl) => handleOpenLightbox([imgUrl], 0)}
        />
      ) : null}

      {/* Lightbox Modal for Gallery or Single Image */}
      {lightboxState.isOpen && (
        <ImageLightboxModal
          images={lightboxState.images}
          initialIndex={lightboxState.initialIndex}
          onClose={handleCloseLightbox}
        />
      )}

      {/* Other URLs (Websites, YouTube, Videos) */}
      {otherUrls.slice(0, 4 - directImageUrls.length).map((url) => (
        <SingleLinkPreview key={url} url={url} />
      ))}
    </div>
  );
}

export interface FormattedCastTextProps {
  text: string;
  onUserClick?: (username: string) => void;
  maxLength?: number;
  readMoreText?: string;
  showLessText?: string;
  readMoreClassName?: string;
}

/**
 * Text renderer that highlights URLs and @mentions into clickable elements
 * Supports truncating casts longer than 768 characters with an interactive 'Read more' toggle.
 */
export function FormattedCastText({
  text,
  onUserClick,
  maxLength = 768,
  readMoreText = 'Read more',
  showLessText = 'Show less',
  readMoreClassName,
}: FormattedCastTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  const isLong = text.length > maxLength;

  // When not expanded and text is over the 768-char limit, truncate smoothly
  let displayText = text;
  if (isLong && !isExpanded) {
    let cutoff = maxLength;
    const lastSpace = text.lastIndexOf(' ', maxLength);
    // Snap to word boundary if space exists within the last 40 chars
    if (lastSpace > maxLength - 40) {
      cutoff = lastSpace;
    }
    displayText = text.slice(0, cutoff).trimEnd();
  }

  // Split text by URLs and mentions
  const tokenRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|@[a-zA-Z0-9_\.-]+)/gi;
  const parts = displayText.split(tokenRegex);

  const defaultBtnClass =
    'inline-flex items-center text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline select-none cursor-pointer focus:outline-hidden transition-colors';
  const btnStyle = readMoreClassName || defaultBtnClass;

  return (
    <span className="select-text whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        if (!part) return null;

        // URL match
        if (/^https?:\/\//i.test(part)) {
          let display = part;
          try {
            const parsed = new URL(part);
            display =
              parsed.hostname +
              (parsed.pathname.length > 15 ? parsed.pathname.slice(0, 15) + '...' : parsed.pathname);
          } catch {
            display = part.length > 30 ? part.slice(0, 30) + '...' : part;
          }

          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-purple-600 hover:text-purple-800 hover:underline font-medium inline-flex items-center gap-0.5 break-all"
            >
              <span>{display}</span>
              <ExternalLink className="h-2.5 w-2.5 inline-block opacity-70" />
            </a>
          );
        }

        // Mention match
        if (/^@[a-zA-Z0-9_\.-]+$/.test(part)) {
          const username = part.slice(1);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onUserClick) onUserClick(username);
              }}
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline inline p-0 m-0 bg-transparent border-0 cursor-pointer"
            >
              {part}
            </button>
          );
        }

        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}

      {/* Truncation & Interactive Read more / Show less buttons */}
      {isLong && !isExpanded && (
        <>
          <span className="text-slate-400 select-none">... </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className={btnStyle}
          >
            {readMoreText}
          </button>
        </>
      )}

      {isLong && isExpanded && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsExpanded(false);
          }}
          className={`${btnStyle} ml-2`}
        >
          {showLessText}
        </button>
      )}
    </span>
  );
}
