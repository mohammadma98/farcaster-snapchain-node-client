import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');
    if (!fidParam) {
      return NextResponse.json(
        { status: 'error', error: 'Missing fid query parameter' },
        { status: 400 }
      );
    }

    const fid = parseInt(fidParam, 10);
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://162.35.98.172:3381';

    const queryType = searchParams.get('type') || searchParams.get('mode') || 'following';
    if (queryType === 'followers') {
      const { fids: followerFids, count } = await defaultNodeClient.getFollowersByFid(fid, nodeUrl);
      return NextResponse.json({
        status: 'ok',
        fid,
        type: 'followers',
        followers: followerFids,
        count,
      });
    }

    const { fids, users } = await defaultNodeClient.getFollowsByFid(fid, nodeUrl);
    const sessionFollows = feedStore.getFollowedFids(fid);
    const allFollowedFids = Array.from(new Set([...fids, ...sessionFollows]));

    return NextResponse.json({
      status: 'ok',
      fid,
      following: allFollowedFids,
      users,
      count: allFollowedFids.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch follows' },
      { status: 500 }
    );
  }
}

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

    if (!fid || !signerPrivateKey) {
      return NextResponse.json(
        { status: 'error', error: 'Authentication required: missing fid or signerPrivateKey' },
        { status: 401 }
      );
    }

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://162.35.98.172:3381';

    // 1. Submit LinkAdd or LinkRemove to Snapchain node
    const nodeResult = await defaultNodeClient.publishFollow(
      fid,
      signerPrivateKey,
      targetFid,
      !!isRemove,
      targetNodeUrl
    );

    if (!nodeResult.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: nodeResult.error || 'Snapchain node rejected the follow operation.',
          nodeResult,
        },
        { status: 400 }
      );
    }

    // 2. Update local state
    const isNowFollowing = feedStore.toggleFollow(targetFid, !!isRemove, fid);

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
