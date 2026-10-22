'use client';

import React, { useState, useEffect } from 'react';
import { Quote, ExternalLink } from 'lucide-react';
import { FarcasterCast } from '@/lib/farcaster/types';
import { FarcasterAvatar } from './FarcasterAvatar';
import { FormattedCastText, CastMediaPreviews } from './LinkPreview';

// Client-side cache for fetched quote casts
const quoteCastCache = new Map<string, FarcasterCast>();

interface QuoteCastCardProps {
  castId: {
    fid: number;
    hash: string;
  };
  nodeUrl?: string;
  onOpenThread?: (hash: string, username?: string) => void;
  onOpenProfile?: (identifier: string | number) => void;
}

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export function QuoteCastCard({
  castId,
  nodeUrl,
  onOpenThread,
  onOpenProfile,
}: QuoteCastCardProps) {
  const cleanHash = castId.hash?.startsWith('0x') ? castId.hash : `0x${castId.hash}`;
  const [cast, setCast] = useState<FarcasterCast | null>(quoteCastCache.get(cleanHash) || null);
  const [loading, setLoading] = useState<boolean>(!quoteCastCache.has(cleanHash));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (quoteCastCache.has(cleanHash)) {
      setCast(quoteCastCache.get(cleanHash)!);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(false);

    const queryUrl = `/api/casts/${cleanHash}?fid=${castId.fid}&nodeUrl=${encodeURIComponent(nodeUrl || '')}`;

    fetch(queryUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Cast not found');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        if (data.status === 'ok' && data.cast) {
          quoteCastCache.set(cleanHash, data.cast);
          setCast(data.cast);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [cleanHash, castId.fid, nodeUrl]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="rounded-2xl border border-purple-100 bg-purple-50/30 p-3 my-2 animate-pulse space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-slate-200" />
          <div className="h-3 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-12 bg-slate-100 rounded ml-auto" />
        </div>
        <div className="space-y-1.5 pl-8">
          <div className="h-3 w-5/6 bg-slate-200 rounded" />
          <div className="h-3 w-1/2 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  // Fallback State if cast could not be retrieved
  if (error || !cast) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (onOpenThread) onOpenThread(cleanHash);
        }}
        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 my-2 cursor-pointer hover:bg-purple-50/50 hover:border-purple-300 transition-all flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 shrink-0">
            <Quote className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-slate-800 block">
              Quoted Cast (FID #{castId.fid})
            </span>
            <span className="text-[11px] font-mono text-slate-400 block truncate">
              {cleanHash.slice(0, 10)}...{cleanHash.slice(-6)}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-purple-700 group-hover:underline shrink-0">
          Open &rarr;
        </span>
      </div>
    );
  }

  // Render Rich Quoted Cast
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (onOpenThread) onOpenThread(cast.hash, cast.author?.username);
      }}
      className="rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-purple-50/30 hover:border-purple-300 transition-all p-3.5 my-2.5 cursor-pointer shadow-xs space-y-2 group"
    >
      {/* Author Bar */}
      <div className="flex items-center justify-between">
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onOpenProfile) {
              onOpenProfile(cast.author?.username || cast.author?.fid || cast.fid);
            }
          }}
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          <FarcasterAvatar
            src={cast.author?.pfpUrl}
            alt={cast.author?.username || String(cast.fid)}
            fid={cast.author?.fid || cast.fid}
            username={cast.author?.username}
            className="h-6 w-6 rounded-full object-cover border border-purple-200 shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-xs text-slate-900 truncate group-hover:text-purple-700 transition-colors">
              {cast.author?.displayName || `FID ${cast.fid}`}
            </span>
            <span className="text-[11px] text-slate-400 font-normal truncate">
              @{cast.author?.username || cast.fid}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
          <Quote className="h-3 w-3 text-purple-600" />
          <span>{formatTimeAgo(cast.timestamp)} ago</span>
        </div>
      </div>

      {/* Cast Text */}
      <div className="text-xs text-slate-800 leading-relaxed pl-1 line-clamp-4">
        <FormattedCastText text={cast.text} onUserClick={onOpenProfile} />
      </div>

      {/* Media inside Quoted Cast */}
      {cast.embeds && cast.embeds.length > 0 && (
        <div className="pt-1">
          <CastMediaPreviews
            embeds={cast.embeds.filter((e) => !e.castId)}
            text={cast.text}
          />
        </div>
      )}
    </div>
  );
}
