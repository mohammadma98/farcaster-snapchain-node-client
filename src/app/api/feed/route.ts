import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';
import { isPostgresAvailable } from '@/lib/db/pool';
import { initDatabaseSchema } from '@/lib/db/schema';
import { CastRepository, FollowRepository } from '@/lib/db/repositories';
import { DeltaSyncService } from '@/lib/sync/delta-sync';
import { FeedWorker } from '@/lib/sync/feed-worker';

export const dynamic = 'force-dynamic';

const ACTIVE_NETWORK_CREATORS = [3, 2, 37, 99, 5650, 12, 557, 680];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const cursorParam = searchParams.get('cursor');
    const cursorTimestamp = cursorParam ? parseInt(cursorParam, 10) : undefined;
    const sourceFilter = searchParams.get('source') || undefined;
    const clientType = searchParams.get('client_type') || undefined;
    const clientFidsParam = searchParams.get('client_fids');
    const clientFids = clientFidsParam
      ? clientFidsParam.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n))
      : undefined;
    const excludeClientFidsParam = searchParams.get('exclude_client_fids');
    const excludeClientFids = excludeClientFidsParam
      ? excludeClientFidsParam.split(',').map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n))
      : undefined;
    const onlySelfRegistered = searchParams.get('only_self_registered') === 'true';
    const fidParam = searchParams.get('fid');
    const fid = fidParam ? parseInt(fidParam, 10) : undefined;
    const viewerFidParam = searchParams.get('viewerFid');
    const viewerFid = viewerFidParam ? parseInt(viewerFidParam, 10) : undefined;
    const mode = (searchParams.get('mode') as 'following' | 'global') || undefined;
    const nodeUrl =
      searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Check PostgreSQL Availability & Auto-Initialize Schema
    const hasDb = await isPostgresAvailable();
    if (hasDb) {
      await initDatabaseSchema().catch(() => {});

      // SWR: Ensure Feed Worker is indexing live events (advisory lock prevents duplicate runners)
      new FeedWorker({ nodeUrl }).start().catch(() => {});

      // SWR: Queue background sync for followings
      if (viewerFid && mode !== 'global') {
        DeltaSyncService.syncFollows(viewerFid, nodeUrl).catch(() => {});
        FollowRepository.getFollowedFids(viewerFid)
          .then((fids) => {
            const syncFids = Array.from(new Set([viewerFid, ...fids]));
            DeltaSyncService.syncNewestCasts(syncFids, nodeUrl, 5).catch(() => {});
          })
          .catch(() => {});
      }

      // Query optimized PostgreSQL index
      const dbCasts = await CastRepository.getFeedCasts({
        viewerFid: mode === 'global' ? undefined : viewerFid,
        fid,
        limit,
        cursorTimestamp,
        sourceFilter,
        clientType,
        clientFids,
        excludeClientFids,
        onlySelfRegistered,
      });

      if (dbCasts.length > 0) {
        // Trigger background stats sync for visible casts to refresh reaction numbers
        for (const c of dbCasts) {
          DeltaSyncService.syncCastStats(c.hash, c.fid, nodeUrl).catch(() => {});
        }

        const nextCursor = dbCasts[dbCasts.length - 1]?.timestamp;
        return NextResponse.json({
          status: 'ok',
          casts: dbCasts,
          count: dbCasts.length,
          hasMore: dbCasts.length >= limit,
          nextCursor,
          mode: mode || (viewerFid ? 'following' : 'global'),
          viewerFid,
          nodeUrl,
          storage: 'postgres',
          clientFilters: {
            clientType,
            clientFids,
            excludeClientFids,
            onlySelfRegistered,
          },
        });
      }
    }

    // 2. FALLBACK MECHANISM: Direct node ingestion via feedStore
    const fallbackCasts = await feedStore.getFeed({
      limit: Math.max(limit, 5),
      sourceFilter,
      fid,
      viewerFid,
      mode,
      nodeUrl,
    });

    // If DB is available, opportunistically seed the returned casts into PostgreSQL for next requests
    if (hasDb && fallbackCasts.length > 0) {
      Promise.allSettled(
        fallbackCasts.map((c) => {
          CastRepository.upsertCast(c).catch(() => {});
          DeltaSyncService.syncCastStats(c.hash, c.fid, nodeUrl).catch(() => {});
        })
      ).catch(() => {});
    }

    const nextCursor = fallbackCasts[fallbackCasts.length - 1]?.timestamp;
    return NextResponse.json({
      status: 'ok',
      casts: fallbackCasts,
      count: fallbackCasts.length,
      hasMore: fallbackCasts.length >= limit,
      nextCursor,
      mode: mode || (viewerFid ? 'following' : 'global'),
      viewerFid,
      nodeUrl,
      storage: hasDb ? 'postgres_seed' : 'node_fallback',
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
