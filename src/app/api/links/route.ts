import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, signerPrivateKey, targetFid, type = 'follow', isRemove, nodeUrl } = body;

    if (!targetFid) {
      return NextResponse.json(
        { status: 'error', error: 'Missing targetFid' },
        { status: 400 }
      );
    }

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Submit LinkAdd or LinkRemove to Snapchain node
    let nodeResult: { success: boolean; hash?: string; error?: string } = { success: false };
    if (fid && signerPrivateKey) {
      nodeResult = await defaultNodeClient.publishFollow(
        fid,
        signerPrivateKey,
        targetFid,
        !!isRemove,
        targetNodeUrl
      );
    }

    // 2. Update local state
    const isNowFollowing = feedStore.toggleFollow(targetFid, !!isRemove);

    return NextResponse.json({
      status: 'ok',
      success: true,
      targetFid,
      isFollowing: isNowFollowing,
      nodeResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Follow operation failed' },
      { status: 500 }
    );
  }
}
