import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';
import { defaultNodeClient } from '@/lib/farcaster/node-client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const user = await feedStore.getUser(id, nodeUrl);
    if (!user) {
      return NextResponse.json(
        { status: 'error', error: 'User not found' },
        { status: 404 }
      );
    }

    // Try node for user's casts
    let casts = await defaultNodeClient.getCastsByFid(user.fid, limit, nodeUrl);

    // Merge with local store casts
    const localCasts = feedStore.getCastsByFid(user.fid);
    const map = new Map();
    for (const c of [...localCasts, ...casts]) {
      map.set(c.hash, c);
    }

    const merged = Array.from(map.values()).sort((a: any, b: any) => b.timestamp - a.timestamp);

    return NextResponse.json({
      status: 'ok',
      fid: user.fid,
      username: user.username,
      casts: merged,
      count: merged.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch user casts' },
      { status: 500 }
    );
  }
}
