import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';
import { isPostgresAvailable } from '@/lib/db/pool';
import { ViewerInteractionsRepository } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, signerPrivateKey, targetFid, targetHash, type, isRemove } = body;

    if (!targetHash || !type) {
      return NextResponse.json(
        { status: 'error', error: 'Missing required parameters: targetHash and type' },
        { status: 400 }
      );
    }

    if (!fid || !signerPrivateKey || !targetFid) {
      return NextResponse.json(
        {
          status: 'error',
          error: 'Authentication required: missing fid, signerPrivateKey, or targetFid. Please log in with your account.',
        },
        { status: 401 }
      );
    }

    const targetNodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Submit to Snapchain node mempool
    const nodeResult = await defaultNodeClient.publishReaction(
      fid,
      signerPrivateKey,
      targetFid,
      targetHash,
      type,
      !!isRemove,
      targetNodeUrl
    );

    if (!nodeResult.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: nodeResult.error || 'Snapchain node rejected the reaction submission.',
          nodeResult,
        },
        { status: 400 }
      );
    }

    // 2. Update local in-memory state
    const reactionState = feedStore.toggleReaction(targetHash, type, fid);

    // 3. Update PostgreSQL persistent state if available
    const hasDb = await isPostgresAvailable();
    if (hasDb) {
      ViewerInteractionsRepository.recordInteraction(fid, targetHash, type, !!isRemove).catch(() => {});
    }

    return NextResponse.json({
      status: 'ok',
      success: true,
      reactionState,
      nodeResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Reaction submission failed' },
      { status: 500 }
    );
  }
}
