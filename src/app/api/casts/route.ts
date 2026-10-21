import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';
import { FarcasterCast } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fid, signerPrivateKey, text, parentCastId, embeds, nodeUrl } = body;

    if (!fid || !signerPrivateKey || !text?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Missing required fields: fid, signerPrivateKey, or text' },
        { status: 400 }
      );
    }

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

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

    // Compute or format cast hash
    const hash =
      nodeResult.hash ||
      '0x' + Array.from({ length: 20 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');

    // 2. Fetch author profile
    const authorUser = await feedStore.getUser(fid, targetNodeUrl);

    // 3. Create Cast object
    const newCast: FarcasterCast = {
      hash,
      fid,
      text: text.trim(),
      timestamp: Date.now(),
      author: authorUser
        ? {
            fid: authorUser.fid,
            username: authorUser.username,
            displayName: authorUser.displayName,
            pfpUrl: authorUser.pfpUrl,
          }
        : {
            fid,
            username: `user_${fid}`,
            displayName: `FID ${fid}`,
          },
      parentCastId,
      embeds,
      clientSource: 'Direct Snapchain',
      reactions: {
        likesCount: 0,
        recastsCount: 0,
        likedByMe: false,
        recastByMe: false,
      },
      repliesCount: 0,
    };

    // 4. Store in local registry so it immediately appears in all feeds & threads
    feedStore.addCast(newCast);

    return NextResponse.json({
      status: 'ok',
      success: true,
      hash,
      cast: newCast,
      nodeGossipStatus: nodeResult.success ? 'ACCEPTED_MEMPOOL' : 'OFFLINE_LOCAL_QUEUE',
      error: nodeResult.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Cast publishing failed' },
      { status: 500 }
    );
  }
}
