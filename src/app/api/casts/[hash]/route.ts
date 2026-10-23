import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';
import { isPostgresAvailable } from '@/lib/db/pool';
import { CastRepository } from '@/lib/db/repositories';
import { DeltaSyncService } from '@/lib/sync/delta-sync';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { hash: string } }
) {
  try {
    const { hash } = params;
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');
    const fid = fidParam ? parseInt(fidParam, 10) : undefined;
    const viewerFidParam = searchParams.get('viewerFid');
    const viewerFid = viewerFidParam ? parseInt(viewerFidParam, 10) : undefined;
    const nodeUrl =
      searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const hasDb = await isPostgresAvailable();

    if (hasDb) {
      const dbCast = await CastRepository.getCastByHash(hash, viewerFid);
      if (dbCast) {
        // Trigger live stats refresh in background
        DeltaSyncService.syncCastStats(dbCast.hash, dbCast.fid, nodeUrl).catch(() => {});

        // Fetch parent cast if this is a reply
        let parent = null;
        if (dbCast.parentCastId?.hash) {
          parent = await CastRepository.getCastByHash(dbCast.parentCastId.hash, viewerFid);
        }

        // Fetch thread replies
        const replies = await CastRepository.getRepliesByParent(dbCast.hash, viewerFid);

        return NextResponse.json({
          status: 'ok',
          cast: dbCast,
          parent,
          replies,
          repliesCount: Math.max(dbCast.repliesCount || 0, replies.length),
          storage: 'postgres',
        });
      }
    }

    // Fallback: Query node thread via feedStore
    const thread = await feedStore.getCastThread(hash, nodeUrl, fid);

    if (!thread.cast) {
      return NextResponse.json(
        { status: 'error', error: 'Cast not found' },
        { status: 404 }
      );
    }

    // Also enrich with live reactions from node
    if (thread.cast.fid) {
      defaultNodeStats(thread.cast, nodeUrl).catch(() => {});
    }

    // Persist to Postgres if DB available
    if (hasDb && thread.cast) {
      CastRepository.upsertCast(thread.cast).catch(() => {});
      for (const r of thread.replies) {
        CastRepository.upsertCast(r).catch(() => {});
      }
    }

    return NextResponse.json({
      status: 'ok',
      cast: thread.cast,
      parent: thread.parent,
      replies: thread.replies,
      repliesCount: thread.replies.length,
      storage: 'node_fallback',
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to retrieve cast thread' },
      { status: 500 }
    );
  }
}

async function defaultNodeStats(cast: any, nodeUrl: string) {
  try {
    const { defaultNodeClient } = await import('@/lib/farcaster/node-client');
    const reactions = await defaultNodeClient.getReactionsByCast(cast.fid, cast.hash, 100, nodeUrl);
    if (!cast.reactions) cast.reactions = {};
    cast.reactions.likesCount = reactions.likesCount;
    cast.reactions.recastsCount = reactions.recastsCount;
  } catch {
    // ignore
  }
}
