'use client';

import React, { useState, useEffect } from 'react';
import { ExternalLink, Globe, Play, Image as ImageIcon } from 'lucide-react';

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
    url.includes('res.cloudinary.com')
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
 * Single Rich Link or Media Card
 */
export function SingleLinkPreview({ url }: { url: string }) {
  const [og, setOg] = useState<OgData | null>(clientOgCache.get(url) || null);
  const [loading, setLoading] = useState<boolean>(!clientOgCache.has(url));
  const [hasError, setHasError] = useState(false);
  const [imgError, setImgError] = useState(false);

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

  // CASE 3: Direct Image
  if (isImage) {
    if (imgError) return null;
    return (
      <div
        className="rounded-2xl overflow-hidden border border-slate-200/90 bg-slate-50 my-2 max-w-2xl group shadow-xs hover:border-purple-300 transition-all cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        <img
          src={url}
          alt="Cast media"
          onError={() => setImgError(true)}
          className="w-full max-h-96 object-contain bg-slate-950/5 group-hover:scale-[1.01] transition-transform duration-200"
          loading="lazy"
        />
      </div>
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

  return (
    <div className="space-y-2 pt-1">
      {allUrls.slice(0, 4).map((url) => (
        <SingleLinkPreview key={url} url={url} />
      ))}
    </div>
  );
}

/**
 * Text renderer that highlights URLs and @mentions into clickable elements
 */
export function FormattedCastText({
  text,
  onUserClick,
}: {
  text: string;
  onUserClick?: (username: string) => void;
}) {
  if (!text) return null;

  // Split text by URLs and mentions
  const tokenRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|@[a-zA-Z0-9_\.-]+)/gi;
  const parts = text.split(tokenRegex);

  return (
    <span className="select-text whitespace-pre-wrap leading-relaxed">
      {parts.map((part, i) => {
        if (!part) return null;

        // URL match
        if (/^https?:\/\//i.test(part)) {
          let display = part;
          try {
            const parsed = new URL(part);
            display = parsed.hostname + (parsed.pathname.length > 15 ? parsed.pathname.slice(0, 15) + '...' : parsed.pathname);
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
              className="text-purple-700 hover:text-purple-900 font-bold hover:underline inline p-0 m-0 bg-transparent border-0"
            >
              {part}
            </button>
          );
        }

        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
