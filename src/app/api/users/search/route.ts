import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';

    const results = feedStore.searchUsers(q);

    // Annotate whether user is followed
    const enriched = results.map(u => ({
      ...u,
      isFollowing: feedStore.isFollowing(u.fid),
    }));

    return NextResponse.json({
      status: 'ok',
      query: q,
      results: enriched,
      count: enriched.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Search failed' },
      { status: 500 }
    );
  }
}
