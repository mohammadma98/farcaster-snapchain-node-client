import { NextResponse } from 'next/server';
import { feedStore } from '@/lib/farcaster/feed-store';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { FarcasterUser } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    const cleanQ = q.trim().toLowerCase().replace(/^@/, '');

    if (!cleanQ) {
      const topUsers = feedStore.searchUsers('');
      return NextResponse.json({
        status: 'ok',
        query: '',
        results: topUsers.map(u => ({ ...u, isFollowing: feedStore.isFollowing(u.fid) })),
        count: topUsers.length,
      });
    }

    const resultMap = new Map<number, FarcasterUser>();

    // 1. Direct FName lookup on Snapchain node
    try {
      const proof = await defaultNodeClient.lookupUsername(cleanQ, nodeUrl);
      if (proof && proof.fid) {
        const profile = await defaultNodeClient.getUserProfile(proof.fid, nodeUrl);
        const resolvedUser: FarcasterUser = {
          fid: proof.fid,
          username: profile.username || proof.name,
          displayName: profile.displayName || proof.name,
          pfpUrl: profile.pfpUrl || `https://avatar.vercel.sh/${proof.fid}`,
          bio: profile.bio || 'Farcaster user',
          custodyAddress: proof.owner,
        };
        feedStore.registerUser(resolvedUser);
        resultMap.set(proof.fid, resolvedUser);
      }
    } catch {
      // ignore
    }

    // 2. If query is numeric FID, lookup directly on node
    const numericFid = parseInt(cleanQ, 10);
    if (!isNaN(numericFid) && String(numericFid) === cleanQ && !resultMap.has(numericFid)) {
      try {
        const numProfile = await defaultNodeClient.getUserProfile(numericFid, nodeUrl);
        if (numProfile.username || numProfile.displayName) {
          feedStore.registerUser(numProfile);
          resultMap.set(numericFid, numProfile);
        }
      } catch {
        // ignore
      }
    }

    // 3. Search local directory
    const localMatches = feedStore.searchUsers(cleanQ);
    for (const u of localMatches) {
      if (!resultMap.has(u.fid)) {
        resultMap.set(u.fid, u);
      }
    }

    const results = Array.from(resultMap.values()).map(u => ({
      ...u,
      isFollowing: feedStore.isFollowing(u.fid),
    }));

    return NextResponse.json({
      status: 'ok',
      query: q,
      results,
      count: results.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Search failed' },
      { status: 500 }
    );
  }
}
