import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await defaultNodeClient.checkHealth();
    return NextResponse.json({
      status: 'ok',
      health: {
        isOnline: health.isOnline,
        latencyMs: health.latencyMs,
        version: health.version,
        isSyncing: health.isSyncing,
        maxBlockDelay: health.maxBlockDelay,
        remainingBlocks: health.remainingBlocks,
        estimatedTimeFormatted: health.estimatedTimeFormatted,
        shardInfos: health.shardInfos,
        peerCount: health.peerCount,
        numMessages: health.numMessages,
        numFidRegistrations: health.numFidRegistrations,
        approxSize: health.approxSize,
        error: health.error,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: err.message || 'Failed to ping internal node',
        health: {
          isOnline: false,
          latencyMs: 0,
          error: err.message,
        },
        timestamp: Date.now(),
      },
      { status: 200 }
    );
  }
}
