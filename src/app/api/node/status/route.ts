import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

  try {
    const health = await defaultNodeClient.checkHealth(nodeUrl);
    return NextResponse.json({
      status: 'ok',
      health,
      nodeUrl,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: err.message || 'Failed to ping node',
        health: {
          isOnline: false,
          latencyMs: 0,
          url: nodeUrl,
          error: err.message,
        },
      },
      { status: 200 }
    );
  }
}
