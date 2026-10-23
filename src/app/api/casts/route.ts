import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, signerPrivateKey, text, parentCastId, embeds } = body;

    if (!fid || !signerPrivateKey || !text?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Missing required fields: fid, signerPrivateKey, or text' },
        { status: 400 }
      );
    }

    const targetNodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Submit to Snapchain Read Node mempool
    const nodeResult = await defaultNodeClient.publishCast(
      fid,
      signerPrivateKey,
      text.trim(),
      {
        parentCastId,
        embeds,
      },
      targetNodeUrl
    );

    if (!nodeResult.success) {
      return NextResponse.json(
        {
          status: 'error',
          error: nodeResult.error || 'Snapchain node rejected the cast submission.',
          nodeResult,
        },
        { status: 400 }
      );
    }

    const hash = nodeResult.hash || '0x...';

    // Note: Cast is strictly NOT stored directly into feedStore cache or PostgreSQL here.
    // Persistence is handled exclusively by the background FeedWorker upon receiving
    // the canonical on-chain merge event from the internal node's event stream.
    return NextResponse.json({
      status: 'ok',
      success: true,
      hash,
      nodeGossipStatus: 'ACCEPTED_MEMPOOL',
      message: 'Cast accepted by internal node mempool. It will be indexed into PostgreSQL via the event worker once confirmed on-chain.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Cast publishing failed' },
      { status: 500 }
    );
  }
}
