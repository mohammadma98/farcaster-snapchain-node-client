import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { FarcasterCast, isReplyCast, isRootCast } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

function paginateCasts(
  allCasts: FarcasterCast[],
  limit: number,
  cursorParam?: string | null,
  cursorTimestamp?: number
): { casts: FarcasterCast[]; hasMore: boolean; nextCursor?: number | string } {
  let filtered = allCasts;
  if (cursorParam) {
    const idx = allCasts.findIndex(
      (c) => c.hash === cursorParam || String(c.timestamp) === cursorParam
    );
    if (idx !== -1) {
      filtered = allCasts.slice(idx + 1);
    } else if (cursorTimestamp && !isNaN(cursorTimestamp)) {
      filtered = allCasts.filter((c) => c.timestamp < cursorTimestamp);
    }
  }
  const casts = filtered.slice(0, limit);
  const hasMore = filtered.length > limit;
  const nextCursor = casts.length > 0 ? casts[casts.length - 1]?.timestamp : undefined;
  return { casts, hasMore, nextCursor };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '6', 10);
    const cursorParam = searchParams.get('cursor');
    const cursorTimestamp = cursorParam ? parseInt(cursorParam, 10) : undefined;
    const tab = searchParams.get('tab') || 'casts'; // 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes'
    const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const user = await feedStore.getUser(id, nodeUrl);
    if (!user) {
      return NextResponse.json(
        { status: 'error', error: 'User not found' },
        { status: 404 }
      );
    }

    const viewerFid = searchParams.get('viewerFid') ? parseInt(searchParams.get('viewerFid')!, 10) : undefined;
    let resultCasts: FarcasterCast[] = [];
    let hasMore = false;
    let nextCursor: string | number | undefined = undefined;

    // Check PostgreSQL
    let hasDb = false;
    try {
      const { isPostgresAvailable } = await import('@/lib/db/pool');
      hasDb = await isPostgresAvailable();
    } catch {
      hasDb = false;
    }

    if (tab === 'casts' && hasDb) {
      const { CastRepository } = await import('@/lib/db/repositories');
      const { DeltaSyncService } = await import('@/lib/sync/delta-sync');
      
      const dbCasts = await CastRepository.getFeedCasts({
        fid: user.fid,
        viewerFid,
        limit,
        cursorTimestamp: !isNaN(cursorTimestamp as number) ? cursorTimestamp : undefined,
      });

      if (dbCasts.length > 0 || cursorTimestamp) {
        for (const c of dbCasts) {
          DeltaSyncService.syncCastStats(c.hash, c.fid, nodeUrl).catch(() => {});
        }
        return NextResponse.json({
          status: 'ok',
          fid: user.fid,
          username: user.username,
          tab,
          casts: dbCasts,
          count: dbCasts.length,
          hasMore: dbCasts.length >= limit,
          nextCursor: dbCasts.length > 0 ? dbCasts[dbCasts.length - 1]?.timestamp : undefined,
          storage: 'postgres',
        });
      }
    }

    if (tab === 'likes' || tab === 'recasts') {
      const reactionType = tab === 'likes' ? 'like' : 'recast';
      const allReactionCasts = await feedStore.getUserReactionCasts(user.fid, reactionType, 100, nodeUrl, viewerFid);
      const paginated = paginateCasts(allReactionCasts, limit, cursorParam, cursorTimestamp);
      resultCasts = paginated.casts;
      hasMore = paginated.hasMore;
      nextCursor = paginated.nextCursor;
    } else if (tab === 'quotes') {
      // User's casts that quote another cast
      const allUserCasts = await defaultNodeClient.getCastsByFid(user.fid, 100, nodeUrl);
      const localCasts = feedStore.getCastsByFid(user.fid);
      const combined = [...localCasts, ...allUserCasts];
      
      let quotes = combined.filter(
        (c) => Array.isArray(c.embeds) && c.embeds.some((e) => e.castId)
      );

      // If no quotes found yet, check feedStore quote records
      if (quotes.length === 0) {
        quotes = feedStore.getUserQuoteCasts(user.fid);
      }

      const map = new Map<string, FarcasterCast>();
      for (const c of quotes) {
        if (!c.author) {
          c.author = {
            fid: user.fid,
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
          };
        }
        map.set(c.hash, c);
      }

      const allQuotes = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      const paginated = paginateCasts(allQuotes, limit, cursorParam, cursorTimestamp);
      resultCasts = paginated.casts;
      hasMore = paginated.hasMore;
      nextCursor = paginated.nextCursor;
    } else if (tab === 'replies') {
      // User's replies to other casts ONLY
      const allNodeCasts = await defaultNodeClient.getCastsByFid(user.fid, 100, nodeUrl);
      const localReplies = feedStore.getReplyCastsByFid(user.fid);
      const map = new Map<string, FarcasterCast>();

      for (const c of [...localReplies, ...allNodeCasts]) {
        if (isReplyCast(c)) {
          if (!c.author) {
            c.author = {
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              pfpUrl: user.pfpUrl,
            };
          }
          map.set(c.hash, c);
        }
      }

      const allReplies = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      const paginated = paginateCasts(allReplies, limit, cursorParam, cursorTimestamp);
      resultCasts = paginated.casts;
      hasMore = paginated.hasMore;
      nextCursor = paginated.nextCursor;

      // Resolve parent authors asynchronously for replies if available
      await Promise.allSettled(
        resultCasts.map(async (c) => {
          if (!c.parentAuthor && c.parentCastId?.fid) {
            try {
              const pUser = await feedStore.getUser(c.parentCastId.fid, nodeUrl);
              if (pUser) {
                c.parentAuthor = {
                  fid: pUser.fid,
                  username: pUser.username,
                  displayName: pUser.displayName,
                };
              }
            } catch {
              // ignore
            }
          }
        })
      );
    } else {
      // Default ('casts'): User's original root casts ONLY (strictly exclude replies)
      const allNodeCasts = await defaultNodeClient.getCastsByFid(user.fid, 100, nodeUrl);
      const localCasts = feedStore.getCastsByFid(user.fid);
      const map = new Map<string, FarcasterCast>();

      for (const c of [...localCasts, ...allNodeCasts]) {
        if (isRootCast(c)) {
          if (!c.author) {
            c.author = {
              fid: user.fid,
              username: user.username,
              displayName: user.displayName,
              pfpUrl: user.pfpUrl,
            };
          }
          map.set(c.hash, c);
        }
      }

      const allCasts = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      const paginated = paginateCasts(allCasts, limit, cursorParam, cursorTimestamp);
      resultCasts = paginated.casts;
      hasMore = paginated.hasMore;
      nextCursor = paginated.nextCursor;
    }

    return NextResponse.json({
      status: 'ok',
      fid: user.fid,
      username: user.username,
      tab,
      casts: resultCasts,
      count: resultCasts.length,
      hasMore,
      nextCursor,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch user casts' },
      { status: 500 }
    );
  }
}
