import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, signerPrivateKey, targetFid, targetHash, type, isRemove, nodeUrl } = body;

    if (!targetHash || !type) {
      return NextResponse.json(
        { status: 'error', error: 'Missing required parameters: targetHash and type' },
        { status: 400 }
      );
    }

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Submit to Snapchain node if private key provided
    let nodeResult: { success: boolean; hash?: string; error?: string } = { success: false };
    if (fid && signerPrivateKey && targetFid) {
      nodeResult = await defaultNodeClient.publishReaction(
        fid,
        signerPrivateKey,
        targetFid,
        targetHash,
        type,
        !!isRemove,
        targetNodeUrl
      );
    }

    // 2. Update local state
    const reactionState = feedStore.toggleReaction(targetHash, type, fid);

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
