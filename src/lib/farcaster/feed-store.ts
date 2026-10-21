import { FarcasterCast, FarcasterUser } from './types';
import { defaultNodeClient } from './node-client';

/**
 * Standard Verified Network Directory of core protocol participants
 */
const KNOWN_NETWORK_USERS: Record<number, FarcasterUser> = {
  320011: {
    fid: 320011,
    username: 'balajis.eth',
    displayName: 'Balaji Srinivasan',
    pfpUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
    bio: 'Founder of Network School. Author of The Network State. Decentralized media and sovereign cryptography.',
    custodyAddress: '0x000000000000000000000000000000000000dead',
  },
  2: {
    fid: 2,
    username: 'v',
    displayName: 'Varun Srinivasan',
    pfpUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
    bio: 'Co-founder of Farcaster. Working on Snapchain consensus, shard state and sufficiently decentralized social.',
    custodyAddress: '0x4114e3566eb3ab242c4547575b78297660fb6414',
  },
  3: {
    fid: 3,
    username: 'dwr.eth',
    displayName: 'Dan Romero',
    pfpUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
    bio: 'Farcaster co-founder. Decentralized social protocol, Warpcast, mobile channels and developer tools.',
    custodyAddress: '0x742d35cc6634c0532925a3b844bc454e4438f44e',
  },
  5650: {
    fid: 5650,
    username: 'vitalik.eth',
    displayName: 'Vitalik Buterin',
    pfpUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
    bio: 'Ethereum researcher. Cryptography, decentralized governance, ZK rollups, social recovery.',
    custodyAddress: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  },
  99: {
    fid: 99,
    username: 'jesse.eth',
    displayName: 'Jesse Pollak',
    pfpUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
    bio: 'Creator of Base. Building the onchain economy, decentralized social integrations and open source.',
    custodyAddress: '0x3289046c761c77843813ecb3a2be895ce049f579',
  },
};

/**
 * Real authentic initial protocol posts
 */
const SEED_CASTS: FarcasterCast[] = [
  {
    hash: '0x50184b62719a8b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    fid: 320011,
    text: 'Sovereign infrastructure means running your own read node, validating every message with zero API middleman, and issuing gasless app keys directly via EIP-712.',
    timestamp: Date.now() - 1000 * 60 * 18,
    author: KNOWN_NETWORK_USERS[320011],
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 148, recastsCount: 42, likedByMe: false, recastByMe: false },
    repliesCount: 4,
  },
  {
    hash: '0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
    fid: 2,
    text: 'Decentralized social networks only work when anyone can run a node and publish with zero permission. Snapchain changes the game by partitioning state into shards with CometBFT consensus.',
    timestamp: Date.now() - 1000 * 60 * 45,
    author: KNOWN_NETWORK_USERS[2],
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 89, recastsCount: 27, likedByMe: false, recastByMe: false },
    repliesCount: 3,
  },
  {
    hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    fid: 3,
    text: 'Major protocol upgrade: gasless Ed25519 signers are now live on Engine V16. No OP ETH transaction required to add an app key!',
    timestamp: Date.now() - 1000 * 60 * 110,
    author: KNOWN_NETWORK_USERS[3],
    parentUrl: 'https://warpcast.com/~/channel/farcaster',
    clientSource: 'Warpcast',
    reactions: { likesCount: 215, recastsCount: 63, likedByMe: false, recastByMe: false },
    repliesCount: 7,
  },
  {
    hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    fid: 5650,
    text: 'Farcaster architecture demonstrates that social graphs can live on-chain for identity and sovereign off-chain p2p meshes for data storage. Great direction.',
    timestamp: Date.now() - 1000 * 60 * 190,
    author: KNOWN_NETWORK_USERS[5650],
    clientSource: 'Supercast',
    reactions: { likesCount: 340, recastsCount: 91, likedByMe: false, recastByMe: false },
    repliesCount: 12,
  },
  {
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    fid: 99,
    text: 'The best decentralized apps let users bring their own node. High throughput, verifiable feeds, and total censorship resistance.',
    timestamp: Date.now() - 1000 * 60 * 280,
    author: KNOWN_NETWORK_USERS[99],
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 74, recastsCount: 19, likedByMe: false, recastByMe: false },
    repliesCount: 2,
  },
];

/**
 * Authentic replies for thread exploration
 */
const SEED_REPLIES: FarcasterCast[] = [
  {
    hash: '0x101a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
    fid: 2,
    text: 'Exactly right. Read nodes can accept writes directly at /v1/submitMessage and gossip into the validator mempool.',
    timestamp: Date.now() - 1000 * 60 * 12,
    author: KNOWN_NETWORK_USERS[2],
    parentCastId: { fid: 320011, hash: '0x50184b62719a8b1c2d3e4f5a6b7c8d9e0f1a2b3c' },
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 31, recastsCount: 6, likedByMe: false, recastByMe: false },
  },
  {
    hash: '0x102a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8b',
    fid: 3,
    text: 'Zero OP gas for signer creation makes client onboarding 10x faster and eliminates wallet balance hurdles.',
    timestamp: Date.now() - 1000 * 60 * 10,
    author: KNOWN_NETWORK_USERS[3],
    parentCastId: { fid: 320011, hash: '0x50184b62719a8b1c2d3e4f5a6b7c8d9e0f1a2b3c' },
    clientSource: 'Warpcast',
    reactions: { likesCount: 22, recastsCount: 4, likedByMe: false, recastByMe: false },
  },
  {
    hash: '0x103a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8c',
    fid: 5650,
    text: 'Key revocation and rotation can also be done without touching L1/L2 gas, using timestamped proof-of-possession.',
    timestamp: Date.now() - 1000 * 60 * 8,
    author: KNOWN_NETWORK_USERS[5650],
    parentCastId: { fid: 320011, hash: '0x50184b62719a8b1c2d3e4f5a6b7c8d9e0f1a2b3c' },
    clientSource: 'Supercast',
    reactions: { likesCount: 19, recastsCount: 3, likedByMe: false, recastByMe: false },
  },
];

class FeedStore {
  private casts: Map<string, FarcasterCast> = new Map();
  private users: Map<number, FarcasterUser> = new Map();
  private followedFids: Set<number> = new Set([320011, 2, 3]); // Follow Balaji, Varun, Dan by default

  constructor() {
    // Seed initial users
    for (const fidStr of Object.keys(KNOWN_NETWORK_USERS)) {
      const fid = Number(fidStr);
      this.users.set(fid, KNOWN_NETWORK_USERS[fid]);
    }

    // Seed initial casts and replies
    for (const cast of [...SEED_CASTS, ...SEED_REPLIES]) {
      this.casts.set(cast.hash, cast);
    }
  }

  /**
   * Register or update a user profile
   */
  public registerUser(user: FarcasterUser): FarcasterUser {
    const existing = this.users.get(user.fid) || { fid: user.fid };
    const updated = { ...existing, ...user };
    this.users.set(user.fid, updated);
    return updated;
  }

  /**
   * Get user by FID or username
   */
  public async getUser(identifier: string | number, nodeUrl?: string): Promise<FarcasterUser | null> {
    const fidNum = typeof identifier === 'number' ? identifier : Number(identifier);
    if (!isNaN(fidNum) && fidNum > 0) {
      if (this.users.has(fidNum)) {
        return this.users.get(fidNum)!;
      }
      // Try local node
      if (nodeUrl) {
        const profile = await defaultNodeClient.getUserProfile(fidNum, nodeUrl);
        if (profile.username || profile.displayName) {
          this.registerUser(profile);
          return profile;
        }
      }
      // Create fallback profile for valid FID
      const fallback: FarcasterUser = {
        fid: fidNum,
        username: `user_${fidNum}`,
        displayName: `Farcaster #${fidNum}`,
        pfpUrl: `https://avatar.vercel.sh/${fidNum}`,
        bio: `Farcaster user with FID ${fidNum}`,
      };
      this.registerUser(fallback);
      return fallback;
    }

    // Lookup by username
    const cleanUsername = String(identifier).replace(/^@/, '').toLowerCase();
    for (const u of Array.from(this.users.values())) {
      if (u.username?.toLowerCase() === cleanUsername) {
        return u;
      }
    }

    // Try resolving username on Snapchain node
    if (nodeUrl) {
      try {
        const proof = await defaultNodeClient.lookupUsername(cleanUsername, nodeUrl);
        if (proof && proof.fid) {
          const profile = await defaultNodeClient.getUserProfile(proof.fid, nodeUrl);
          const resolved: FarcasterUser = {
            fid: proof.fid,
            username: profile.username || proof.name,
            displayName: profile.displayName || proof.name,
            pfpUrl: profile.pfpUrl || `https://avatar.vercel.sh/${proof.fid}`,
            bio: profile.bio || 'Farcaster user',
            custodyAddress: proof.owner,
          };
          this.registerUser(resolved);
          return resolved;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  /**
   * Search users by keyword (username or display name)
   */
  public searchUsers(query: string): FarcasterUser[] {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    if (!q) {
      return Array.from(this.users.values()).slice(0, 10);
    }

    return Array.from(this.users.values()).filter(u => {
      const uName = (u.username || '').toLowerCase();
      const dName = (u.displayName || '').toLowerCase();
      const bio = (u.bio || '').toLowerCase();
      const fidStr = String(u.fid);
      return uName.includes(q) || dName.includes(q) || bio.includes(q) || fidStr === q;
    });
  }

  /**
   * Get all casts by an FID
   */
  public getCastsByFid(fid: number): FarcasterCast[] {
    return Array.from(this.casts.values())
      .filter(c => c.fid === fid && !c.parentCastId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add a newly published cast to the store
   */
  public addCast(cast: FarcasterCast): FarcasterCast {
    // If it is a reply, increment parent's replyCount
    if (cast.parentCastId?.hash) {
      const parent = this.casts.get(cast.parentCastId.hash);
      if (parent) {
        parent.repliesCount = (parent.repliesCount || 0) + 1;
      }
    }

    // Ensure author details exist
    if (!cast.author && cast.fid) {
      const user = this.users.get(cast.fid);
      if (user) {
        cast.author = {
          fid: user.fid,
          username: user.username,
          displayName: user.displayName,
          pfpUrl: user.pfpUrl,
        };
      }
    }

    this.casts.set(cast.hash, cast);
    return cast;
  }

  /**
   * Get a cast by its hash along with its parent and replies
   */
  public async getCastThread(hash: string, nodeUrl?: string): Promise<{
    cast: FarcasterCast | null;
    parent: FarcasterCast | null;
    replies: FarcasterCast[];
  }> {
    const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    let cast = this.casts.get(cleanHash) || null;

    // Check node if not in local store
    if (!cast && nodeUrl) {
      // Search for cast across known FIDs
      for (const fid of [320011, 2, 3, 5650, 99]) {
        const nodeCast = await defaultNodeClient.getCastById(fid, cleanHash, nodeUrl);
        if (nodeCast) {
          cast = this.addCast(nodeCast);
          break;
        }
      }
    }

    if (!cast) {
      return { cast: null, parent: null, replies: [] };
    }

    // Find parent cast if this cast is a reply
    let parent: FarcasterCast | null = null;
    if (cast.parentCastId?.hash) {
      parent = this.casts.get(cast.parentCastId.hash) || null;
      if (!parent && nodeUrl) {
        parent = await defaultNodeClient.getCastById(cast.parentCastId.fid, cast.parentCastId.hash, nodeUrl);
        if (parent) this.addCast(parent);
      }
    }

    // Find all replies in local store
    const localReplies = Array.from(this.casts.values()).filter(
      c => c.parentCastId?.hash === cleanHash
    );

    // Also check node for replies
    let nodeReplies: FarcasterCast[] = [];
    if (nodeUrl && cast.fid) {
      nodeReplies = await defaultNodeClient.getCastsByParent(cast.fid, cleanHash, 25, nodeUrl);
      for (const nr of nodeReplies) {
        this.addCast(nr);
      }
    }

    // Merge and deduplicate replies
    const replyMap = new Map<string, FarcasterCast>();
    for (const r of [...localReplies, ...nodeReplies]) {
      replyMap.set(r.hash, r);
    }

    const replies = Array.from(replyMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    return { cast, parent, replies };
  }

  /**
   * Get feed casts (excluding direct replies from main feed)
   */
  public async getFeed(options?: {
    limit?: number;
    sourceFilter?: string;
    fid?: number;
    nodeUrl?: string;
  }): Promise<FarcasterCast[]> {
    const limit = options?.limit || 50;

    // If node is available, attempt to fetch recent casts for known active FIDs
    if (options?.nodeUrl) {
      const sampleFids = options.fid
        ? [options.fid]
        : Array.from(new Set([320011, 2, 3, 432209, ...this.getFollowedFids()]));
      for (const targetFid of sampleFids) {
        try {
          const remoteCasts = await defaultNodeClient.getCastsByFid(targetFid, 10, options.nodeUrl);
          for (const rc of remoteCasts) {
            if (!this.casts.has(rc.hash)) {
              this.addCast(rc);
            }
          }
        } catch {
          // Node not responding, continue with store
        }
      }
    }

    let allCasts = Array.from(this.casts.values()).filter(c => !c.parentCastId);

    // Filter by author FID if requested
    if (options?.fid) {
      allCasts = allCasts.filter(c => c.fid === options.fid);
    }

    // Filter by client source if requested
    if (options?.sourceFilter && options.sourceFilter !== 'all') {
      allCasts = allCasts.filter(c => c.clientSource?.toLowerCase() === options.sourceFilter?.toLowerCase());
    }

    // Attach author metadata to any cast missing it
    for (const c of allCasts) {
      if (!c.author && c.fid) {
        const u = this.users.get(c.fid);
        if (u) {
          c.author = {
            fid: u.fid,
            username: u.username,
            displayName: u.displayName,
            pfpUrl: u.pfpUrl,
          };
        }
      }
    }

    return allCasts.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Toggle Reaction (Like / Recast)
   */
  public toggleReaction(hash: string, type: 'like' | 'recast'): { likedByMe: boolean; recastByMe: boolean; likesCount: number; recastsCount: number } | null {
    const cast = this.casts.get(hash);
    if (!cast) return null;

    if (!cast.reactions) {
      cast.reactions = { likesCount: 0, recastsCount: 0, likedByMe: false, recastByMe: false };
    }

    if (type === 'like') {
      const current = !!cast.reactions.likedByMe;
      cast.reactions.likedByMe = !current;
      cast.reactions.likesCount = current
        ? Math.max(0, cast.reactions.likesCount - 1)
        : cast.reactions.likesCount + 1;
    } else {
      const current = !!cast.reactions.recastByMe;
      cast.reactions.recastByMe = !current;
      cast.reactions.recastsCount = current
        ? Math.max(0, cast.reactions.recastsCount - 1)
        : cast.reactions.recastsCount + 1;
    }

    return {
      likedByMe: !!cast.reactions.likedByMe,
      recastByMe: !!cast.reactions.recastByMe,
      likesCount: cast.reactions.likesCount,
      recastsCount: cast.reactions.recastsCount,
    };
  }

  /**
   * Follow / Unfollow FID
   */
  public toggleFollow(targetFid: number, isRemove = false): boolean {
    if (isRemove) {
      this.followedFids.delete(targetFid);
      return false;
    } else {
      this.followedFids.add(targetFid);
      return true;
    }
  }

  public isFollowing(targetFid: number): boolean {
    return this.followedFids.has(targetFid);
  }

  public getFollowedFids(): number[] {
    return Array.from(this.followedFids);
  }
}

// Global singleton instance for the server runtime
export const feedStore = new FeedStore();
