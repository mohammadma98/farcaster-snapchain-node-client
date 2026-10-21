import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '40', 10);
    const sourceFilter = searchParams.get('source') || undefined;
    const fidParam = searchParams.get('fid');
    const fid = fidParam ? parseInt(fidParam, 10) : undefined;
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const casts = await feedStore.getFeed({
      limit,
      sourceFilter,
      fid,
      nodeUrl,
    });

    return NextResponse.json({
      status: 'ok',
      casts,
      count: casts.length,
      nodeUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
