import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const results = await feedStore.searchUsers(q, nodeUrl);

    const mapped = results.map((u) => ({
      ...u,
      isFollowing: feedStore.isFollowing(u.fid),
    }));

    return NextResponse.json({
      status: 'ok',
      query: q,
      results: mapped,
      count: mapped.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Search failed on Snapchain node' },
      { status: 500 }
    );
  }
}
