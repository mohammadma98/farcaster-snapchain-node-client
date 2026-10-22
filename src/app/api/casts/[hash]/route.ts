import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';

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
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const thread = await feedStore.getCastThread(hash, nodeUrl, fid);

    if (!thread.cast) {
      return NextResponse.json(
        { status: 'error', error: 'Cast not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      cast: thread.cast,
      parent: thread.parent,
      replies: thread.replies,
      repliesCount: thread.replies.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to retrieve cast thread' },
      { status: 500 }
    );
  }
}
