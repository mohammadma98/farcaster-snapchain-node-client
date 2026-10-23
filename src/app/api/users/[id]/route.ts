import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const user = await feedStore.getUser(id, nodeUrl);

    if (!user) {
      return NextResponse.json(
        { status: 'error', error: `User '${id}' not found` },
        { status: 404 }
      );
    }

    const isFollowing = feedStore.isFollowing(user.fid);

    return NextResponse.json({
      status: 'ok',
      user,
      isFollowing,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
