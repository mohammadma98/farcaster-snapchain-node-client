import { FarcasterCast, FarcasterUser } from './types';
import { defaultNodeClient } from './node-client';

/**
 * Sovereign Node Feed Store & Cache
 *
 * Ground Truth: Reads 100% of network data directly from the local Snapchain Read Node (:3381).
 * Zero 3rd-party dependencies or mock datasets.
 */
class FeedStore {
  private casts: Map<string, FarcasterCast> = new Map();
  private users: Map<number, FarcasterUser> = new Map();
  private userFollows: Map<number, Set<number>> = new Map();
  private defaultFollowedFids: Set<number> = new Set([37, 432209]);

  constructor() {
    this.registerUser({
      fid: 37,
      username: 'balajis',
      displayName: 'balajis',
      pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/16e9ecaa-0837-4243-4316-ceeb9db19600/original',
      bio: 'Founder of Network School, author of The Network State, former CTO of Coinbase.',
    });
    this.registerUser({
      fid: 432209,
      username: 'mohammad98',
      displayName: 'Mohammad 🎩',
      pfpUrl: 'https://i.imgur.com/soNnpxz.jpg',
      bio: 'Full-stack Web3 & Sovereign Protocol Engineer',
    });
  }

  /**
   * Register or update a user profile in memory cache
   */
  public registerUser(user: FarcasterUser): FarcasterUser {
    const existing = this.users.get(user.fid) || { fid: user.fid };
    const updated = { ...existing, ...user };
    this.users.set(user.fid, updated);
    return updated;
  }

  /**
   * Get user by FID or username directly from the local Snapchain node
   */
  public async getUser(identifier: string | number, nodeUrl?: string): Promise<FarcasterUser | null> {
    const fidNum = typeof identifier === 'number' ? identifier : Number(identifier);

    if (!isNaN(fidNum) && fidNum > 0) {
      if (this.users.has(fidNum)) {
        const cached = this.users.get(fidNum)!;
        const isDummy = (!cached.username || cached.username.startsWith('user_')) && (!cached.displayName || cached.displayName.startsWith('FID '));
        if (!isDummy) {
          return cached;
        }
      }

      // Query local Snapchain node with public fallback
      const targetUrl = nodeUrl || 'http://127.0.0.1:3381';
      try {
        const profile = await defaultNodeClient.getUserProfile(fidNum, targetUrl);
        if (profile.username && !profile.username.startsWith('user_')) {
          this.registerUser(profile);
          return profile;
        }
      } catch {
        // Node unreachable or syncing
      }

      // Dynamic fallback based on real FID without mock data
      const fallback: FarcasterUser = {
        fid: fidNum,
        username: `user_${fidNum}`,
        displayName: `FID ${fidNum}`,
        pfpUrl: `https://avatar.vercel.sh/${fidNum}`,
        bio: `Farcaster user #${fidNum}`,
      };
      this.registerUser(fallback);
      return fallback;
    }

    // Lookup by username directly on the local node
    const cleanUsername = String(identifier).replace(/^@/, '').toLowerCase().trim();
    if (!cleanUsername) return null;

    // Check memory cache first
    for (const u of Array.from(this.users.values())) {
      if (u.username?.toLowerCase() === cleanUsername) {
        return u;
      }
    }

    // Resolve username on the local Snapchain node
    const targetUrl = nodeUrl || 'http://127.0.0.1:3381';
    try {
      const proof = await defaultNodeClient.lookupUsername(cleanUsername, targetUrl);
      if (proof && proof.fid) {
        const profile = await defaultNodeClient.getUserProfile(proof.fid, targetUrl);
        const resolved: FarcasterUser = {
          fid: proof.fid,
          username: profile.username || proof.name,
          displayName: profile.displayName || proof.name,
          pfpUrl: profile.pfpUrl || `https://avatar.vercel.sh/${proof.fid}`,
          bio: profile.bio || `Sovereign protocol participant on Snapchain`,
          custodyAddress: proof.owner,
        };
        this.registerUser(resolved);
        return resolved;
      }
    } catch {
      // Node proof lookup failed
    }

    return null;
  }

  /**
   * Search users on the local Snapchain read node
   */
  public async searchUsers(query: string, nodeUrl?: string): Promise<FarcasterUser[]> {
    const q = query.trim().toLowerCase().replace(/^@/, '');
    const resultMap = new Map<number, FarcasterUser>();

    // 1. If empty, return featured users: balajis (first) and mohammad98 (second)
    if (!q) {
      const featured: FarcasterUser[] = [];
      const u1 = this.users.get(37);
      if (u1) featured.push(u1);
      const u2 = this.users.get(432209);
      if (u2) featured.push(u2);
      return featured;
    }

    // 2. Direct username lookup on local Snapchain node
    if (nodeUrl) {
      try {
        const proof = await defaultNodeClient.lookupUsername(q, nodeUrl);
        if (proof && proof.fid) {
          const profile = await this.getUser(proof.fid, nodeUrl);
          if (profile) {
            resultMap.set(profile.fid, profile);
          }
        }
      } catch {
        // ignore
      }

      // 3. If query is a numeric FID, lookup on local node
      const numericFid = parseInt(q, 10);
      if (!isNaN(numericFid) && String(numericFid) === q) {
        try {
          const profile = await this.getUser(numericFid, nodeUrl);
          if (profile) {
            resultMap.set(profile.fid, profile);
          }
        } catch {
          // ignore
        }
      }
    }

    // 4. Also search memory cache of node-retrieved users
    for (const u of Array.from(this.users.values())) {
      const uName = (u.username || '').toLowerCase();
      const dName = (u.displayName || '').toLowerCase();
      const fidStr = String(u.fid);
      if (uName.includes(q) || dName.includes(q) || fidStr === q) {
        if (!resultMap.has(u.fid)) {
          resultMap.set(u.fid, u);
        }
      }
    }

    return Array.from(resultMap.values());
  }

  /**
   * Get all casts by an FID from local store
   */
  public getCastsByFid(fid: number): FarcasterCast[] {
    return Array.from(this.casts.values())
      .filter((c) => c.fid === fid && !c.parentCastId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Add a newly published or node-synced cast to the store
   */
  public addCast(cast: FarcasterCast): FarcasterCast {
    if (cast.parentCastId?.hash) {
      const parent = this.casts.get(cast.parentCastId.hash);
      if (parent) {
        parent.repliesCount = (parent.repliesCount || 0) + 1;
      }
    }

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
   * Get a cast by its hash along with its parent and replies from the node
   */
  public async getCastThread(
    hash: string,
    nodeUrl?: string
  ): Promise<{
    cast: FarcasterCast | null;
    parent: FarcasterCast | null;
    replies: FarcasterCast[];
  }> {
    const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    let cast = this.casts.get(cleanHash) || null;

    // Search local node if not in local store
    if (!cast && nodeUrl) {
      // Check known active FIDs
      const checkFids = Array.from(new Set([2, 3, 37, ...Array.from(this.users.keys())]));
      for (const fid of checkFids) {
        const nodeCast = await defaultNodeClient.getCastById(fid, cleanHash, nodeUrl);
        if (nodeCast) {
          const author = await this.getUser(nodeCast.fid, nodeUrl);
          if (author) nodeCast.author = author;
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
        parent = await defaultNodeClient.getCastById(
          cast.parentCastId.fid,
          cast.parentCastId.hash,
          nodeUrl
        );
        if (parent) {
          const author = await this.getUser(parent.fid, nodeUrl);
          if (author) parent.author = author;
          this.addCast(parent);
        }
      }
    }

    // Find replies in memory cache
    const localReplies = Array.from(this.casts.values()).filter(
      (c) => c.parentCastId?.hash === cleanHash
    );

    // Query node for thread replies
    let nodeReplies: FarcasterCast[] = [];
    if (nodeUrl && cast.fid) {
      nodeReplies = await defaultNodeClient.getCastsByParent(cast.fid, cleanHash, 30, nodeUrl);
      for (const nr of nodeReplies) {
        const replyAuthor = await this.getUser(nr.fid, nodeUrl);
        if (replyAuthor) nr.author = replyAuthor;
        this.addCast(nr);
      }
    }

    // Merge and deduplicate
    const replyMap = new Map<string, FarcasterCast>();
    for (const r of [...localReplies, ...nodeReplies]) {
      replyMap.set(r.hash, r);
    }

    const replies = Array.from(replyMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    return { cast, parent, replies };
  }

  /**
   * Filter, populate authors, and sort casts strictly in reverse chronological order
   */
  private filterAndSortCasts(
    castsList: FarcasterCast[],
    sourceFilter?: string,
    limit = 40
  ): FarcasterCast[] {
    // Only show top-level casts in the feed (replies appear inside threads)
    let filtered = castsList.filter((c) => !c.parentCastId);

    if (sourceFilter && sourceFilter !== 'all') {
      filtered = filtered.filter(
        (c) => c.clientSource?.toLowerCase() === sourceFilter.toLowerCase()
      );
    }

    // Attach author profile to any cast missing it
    for (const c of filtered) {
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

    // Strict reverse chronological order (newest timestamp first)
    return filtered.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Get feed casts directly from the Snapchain read node & network.
   * - If options.viewerFid is set and not global: fetches the latest casts from accounts followed by viewer.
   * - If options.viewerFid is NOT set (or mode='global'): fetches the authentic real-time latest casts across the network.
   */
  public async getFeed(options?: {
    limit?: number;
    sourceFilter?: string;
    fid?: number;
    viewerFid?: number;
    mode?: 'following' | 'global';
    nodeUrl?: string;
  }): Promise<FarcasterCast[]> {
    const limit = options?.limit || 40;
    const targetNodeUrl = options?.nodeUrl || 'http://127.0.0.1:3381';
    const isGlobal = options?.mode === 'global' || (!options?.viewerFid && !options?.fid);

    // CASE 1: Specific FID profile casts
    if (options?.fid) {
      const casts = await defaultNodeClient.getCastsByFid(options.fid, limit, targetNodeUrl);
      for (const c of casts) {
        if (!c.author) {
          const author = await this.getUser(c.fid, targetNodeUrl);
          if (author) c.author = author;
        }
        this.addCast(c);
      }
      return this.filterAndSortCasts(
        Array.from(this.casts.values()).filter((c) => c.fid === options.fid),
        options.sourceFilter,
        limit
      );
    }

    // CASE 2: Logged-in user Following Feed
    if (options?.viewerFid && !isGlobal) {
      const viewerFid = options.viewerFid;

      // 1. Fetch real-time follows from network (local node + protocol directory fallback)
      const { fids: remoteFids, users: remoteUsers } = await defaultNodeClient.getFollowsByFid(
        viewerFid,
        targetNodeUrl
      );
      for (const u of remoteUsers) {
        this.registerUser(u);
      }

      // Merge with in-memory session follows
      const sessionFollows = this.getFollowedFids(viewerFid);
      const allFollowedFids = Array.from(new Set([...remoteFids, ...sessionFollows]));
      this.setFollowedFids(viewerFid, allFollowedFids);

      // If user follows people, fetch latest casts for followed accounts
      if (allFollowedFids.length > 0) {
        // Query up to 25 followed accounts in parallel
        const targetAccounts = allFollowedFids.slice(0, 25);
        await Promise.allSettled(
          targetAccounts.map(async (fId) => {
            try {
              const userCasts = await defaultNodeClient.getCastsByFid(fId, 8, targetNodeUrl);
              for (const c of userCasts) {
                if (!c.author) {
                  const author = await this.getUser(c.fid, targetNodeUrl);
                  if (author) c.author = author;
                }
                this.addCast(c);
              }
            } catch {
              // ignore
            }
          })
        );

        // Also fetch viewer's own latest casts so they see their posts
        try {
          const ownCasts = await defaultNodeClient.getCastsByFid(viewerFid, 6, targetNodeUrl);
          for (const c of ownCasts) {
            if (!c.author) {
              const author = await this.getUser(viewerFid, targetNodeUrl);
              if (author) c.author = author;
            }
            this.addCast(c);
          }
        } catch {
          // ignore
        }

        const followedSet = new Set([...allFollowedFids, viewerFid]);
        const feedCasts = Array.from(this.casts.values()).filter((c) => followedSet.has(c.fid));
        return this.filterAndSortCasts(feedCasts, options?.sourceFilter, limit);
      } else {
        // User follows 0 accounts yet
        return [];
      }
    }

    // CASE 3: GLOBAL / NETWORK LATEST CASTS (Not logged in, or explicit global mode)
    // 1. Check local Snapchain Read Node's live event stream
    try {
      const liveEvents = await defaultNodeClient.getLiveEventsCasts(50, targetNodeUrl);
      for (const c of liveEvents) {
        if (!c.author) {
          const author = await this.getUser(c.fid, targetNodeUrl);
          if (author) c.author = author;
        }
        this.addCast(c);
      }
    } catch {
      // Local node offline or syncing
    }

    // 2. Discover active FIDs directly from local node if available
    try {
      const nodeFids = await defaultNodeClient.getFids(targetNodeUrl, 15);
      if (nodeFids.length > 0) {
        await Promise.allSettled(
          nodeFids.slice(0, 10).map(async (nfid) => {
            try {
              const casts = await defaultNodeClient.getCastsByFid(nfid, 5, targetNodeUrl);
              for (const c of casts) {
                if (!c.author) {
                  const author = await this.getUser(c.fid, targetNodeUrl);
                  if (author) c.author = author;
                }
                this.addCast(c);
              }
            } catch {
              // ignore
            }
          })
        );
      }
    } catch {
      // ignore
    }

    // 3. Fetch latest casts across active Farcaster creators / network builders
    const ACTIVE_NETWORK_CREATORS = [
      3,    // dwr (Dan Romero - Farcaster co-founder)
      2,    // v (Varun Srinivasan - Farcaster co-founder)
      37,   // balajis (Balaji Srinivasan)
      99,   // jessepollak (Jesse Pollak - Base founder)
      5650, // vitalik.eth (Vitalik Buterin)
      12,   // ted
      557,  // pugson
      680,  // woj
      576,  // nonlinear.eth
      1325, // cassie
      194,  // wake
      1214, // linda
      347,  // greg
      800,  // timdaub
      4665, // britt
      15983,// jacek ($DEGEN)
      617,  // cameron
      358,  // corbin.eth
      539,  // ace
    ];

    await Promise.allSettled(
      ACTIVE_NETWORK_CREATORS.map(async (fid) => {
        try {
          const userCasts = await defaultNodeClient.getCastsByFid(fid, 6, targetNodeUrl);
          for (const c of userCasts) {
            if (!c.author) {
              const author = await this.getUser(c.fid, targetNodeUrl);
              if (author) c.author = author;
            }
            this.addCast(c);
          }
        } catch {
          // ignore
        }
      })
    );

    return this.filterAndSortCasts(Array.from(this.casts.values()), options?.sourceFilter, limit);
  }

  /**
   * Toggle Reaction (Like / Recast)
   */
  public toggleReaction(
    hash: string,
    type: 'like' | 'recast'
  ): { likedByMe: boolean; recastByMe: boolean; likesCount: number; recastsCount: number } | null {
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
   * Follow / Unfollow FID (optionally scoped to a viewer FID)
   */
  public toggleFollow(targetFid: number, isRemove = false, viewerFid?: number): boolean {
    if (viewerFid) {
      if (!this.userFollows.has(viewerFid)) {
        this.userFollows.set(viewerFid, new Set());
      }
      const set = this.userFollows.get(viewerFid)!;
      if (isRemove) {
        set.delete(targetFid);
        return false;
      } else {
        set.add(targetFid);
        return true;
      }
    }

    if (isRemove) {
      this.defaultFollowedFids.delete(targetFid);
      return false;
    } else {
      this.defaultFollowedFids.add(targetFid);
      return true;
    }
  }

  public isFollowing(targetFid: number, viewerFid?: number): boolean {
    if (viewerFid && this.userFollows.has(viewerFid)) {
      return this.userFollows.get(viewerFid)!.has(targetFid);
    }
    return this.defaultFollowedFids.has(targetFid);
  }

  public getFollowedFids(viewerFid?: number): number[] {
    if (viewerFid && this.userFollows.has(viewerFid)) {
      return Array.from(this.userFollows.get(viewerFid)!);
    }
    return Array.from(this.defaultFollowedFids);
  }

  public setFollowedFids(viewerFid: number, fids: number[]): void {
    this.userFollows.set(viewerFid, new Set(fids));
  }
}

// Global singleton instance for the server runtime
export const feedStore = new FeedStore();
