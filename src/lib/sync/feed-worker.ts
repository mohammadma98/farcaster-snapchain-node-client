import { getDatabasePool, isPostgresAvailable } from '../db/pool';
import { initDatabaseSchema } from '../db/schema';
import { CastRepository, UserRepository, CheckpointRepository } from '../db/repositories';
import { FarcasterCast, FarcasterUser } from '../farcaster/types';
import { identifyCastClient } from '../farcaster/client-filter';
import { SignerAttributionService } from '../farcaster/attribution';
import { extractSignerHex } from '../farcaster/node-client';

const FARCASTER_EPOCH = 1609459200000;
const ADVISORY_LOCK_ID = 424242;

export interface FeedWorkerOptions {
  nodeUrl?: string;
  maxCasts?: number;
  pollIntervalMs?: number;
}

export class FeedWorker {
  private nodeUrl: string;
  private maxCasts: number;
  private pollIntervalMs: number;
  private isRunning = false;
  private isStopped = false;
  private userCache = new Map<number, FarcasterUser>();
  private lockClient: any = null;
  private shardIds: number[] = [1, 2];

  constructor(options?: FeedWorkerOptions) {
    this.nodeUrl = (options?.nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381').replace(/\/$/, '');
    this.maxCasts = options?.maxCasts || parseInt(process.env.MAX_FEED_CASTS || '25000', 10);
    this.pollIntervalMs = options?.pollIntervalMs || 2500;
  }

  /**
   * Start the Sovereign Feed Worker Daemon
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    const dbReady = await isPostgresAvailable();
    if (!dbReady) {
      console.warn('[FeedWorker] PostgreSQL is not reachable, retrying in 5 seconds...');
      setTimeout(() => this.start(), 5000);
      return;
    }

    await initDatabaseSchema().catch(() => {});

    // Acquire PostgreSQL advisory lock to ensure only 1 worker instance runs across containers
    const pool = getDatabasePool();
    this.lockClient = await pool.connect();
    const lockRes = await this.lockClient.query(
      'SELECT pg_try_advisory_lock(hashtext($1), $2) AS locked',
      ['farcaster_feed_worker', ADVISORY_LOCK_ID]
    );

    if (!lockRes.rows[0]?.locked) {
      console.log('[FeedWorker] Another worker instance is already active. Standing by...');
      this.lockClient.release();
      this.lockClient = null;
      return;
    }

    this.isRunning = true;
    this.isStopped = false;
    console.log(`[FeedWorker] Started. Ingesting live events from ${this.nodeUrl} (Max: ${this.maxCasts} casts, FIFO time-based)...`);

    this.runLoop().catch((err) => {
      console.error('[FeedWorker] Loop crash:', err);
      this.stop();
    });
  }

  /**
   * Gracefully stop the worker
   */
  public async stop(): Promise<void> {
    this.isStopped = true;
    this.isRunning = false;
    if (this.lockClient) {
      try {
        await this.lockClient.query(
          'SELECT pg_advisory_unlock(hashtext($1), $2)',
          ['farcaster_feed_worker', ADVISORY_LOCK_ID]
        );
      } catch {}
      this.lockClient.release();
      this.lockClient = null;
    }
    console.log('[FeedWorker] Stopped cleanly.');
  }

  /**
   * Main Event Consumption Loop (Multi-Shard Aware)
   */
  private async runLoop(): Promise<void> {
    // 1. Detect active shards from node info (defaults to [1, 2])
    try {
      const infoRes = await fetch(`${this.nodeUrl}/v1/info`, { signal: AbortSignal.timeout(3000) });
      if (infoRes.ok) {
        const info = await infoRes.json();
        const activeShards = (info.shardInfos || [])
          .map((s: any) => s.shardId)
          .filter((id: number) => id > 0);
        if (activeShards.length > 0) {
          this.shardIds = activeShards;
        }
      }
    } catch {}

    console.log(`[FeedWorker] Multi-shard indexer tracking shards: [${this.shardIds.join(', ')}]`);

    // 2. Initialize per-shard checkpoints
    const shardCheckpoints = new Map<number, string | null>();

    for (const shardId of this.shardIds) {
      const checkpointKey = `snapchain_live_events_shard_${shardId}`;
      const cp = await CheckpointRepository.getEventCheckpoint(checkpointKey);
      let lastEventId = cp?.lastEventId || null;

      if (!lastEventId) {
        console.log(`[FeedWorker] Seeding live tip for shard ${shardId}...`);
        lastEventId = await this.seedShardTip(shardId);
        if (lastEventId) {
          await CheckpointRepository.updateEventCheckpoint(checkpointKey, lastEventId);
        }
      }

      shardCheckpoints.set(shardId, lastEventId);
    }

    let loopCount = 0;

    while (!this.isStopped) {
      try {
        loopCount++;
        let totalNewCasts = 0;

        for (const shardId of this.shardIds) {
          const checkpointKey = `snapchain_live_events_shard_${shardId}`;
          let lastEventId = shardCheckpoints.get(shardId) || null;

          if (!lastEventId) {
            lastEventId = await this.seedShardTip(shardId);
            if (lastEventId) {
              shardCheckpoints.set(shardId, lastEventId);
              await CheckpointRepository.updateEventCheckpoint(checkpointKey, lastEventId);
            }
            continue;
          }

          let batchCount = 0;
          let hasMore = true;

          while (hasMore && batchCount < 5 && !this.isStopped) {
            batchCount++;
            const url = `${this.nodeUrl}/v1/events?shard_index=${shardId}&from_event_id=${lastEventId}&pageSize=100`;

            const res = await fetch(url, {
              headers: { Accept: 'application/json' },
              signal: AbortSignal.timeout(5000),
            });

            if (!res.ok) {
              hasMore = false;
              break;
            }

            const data = await res.json();
            const events: any[] = data.events || [];

            if (events.length <= 1) {
              hasMore = false;
            }

            let newestEventId: string | null = lastEventId;
            let shardNewCasts = 0;

            for (const ev of events) {
              const evIdStr = ev.id ? String(ev.id) : null;
              // Skip the boundary event if it matches lastEventId
              if (lastEventId && evIdStr === lastEventId) {
                continue;
              }

              if (evIdStr) {
                newestEventId = evIdStr;
              }

              try {
                const processed = await this.processEvent(ev);
                if (processed) {
                  shardNewCasts++;
                  totalNewCasts++;
                }
              } catch (err: any) {
                console.warn(`[FeedWorker] Failed to process event ${ev.id} on shard ${shardId}:`, err.message);
              }
            }

            if (newestEventId && newestEventId !== lastEventId) {
              lastEventId = newestEventId;
              shardCheckpoints.set(shardId, lastEventId);
              await CheckpointRepository.updateEventCheckpoint(checkpointKey, lastEventId);
            } else {
              hasMore = false;
            }
          }
        }

        // Prune excess casts beyond max capacity (strictly FIFO oldest first)
        if (totalNewCasts > 0 || loopCount % 20 === 0) {
          await CastRepository.pruneFeed(this.maxCasts);
        }
      } catch (err: any) {
        if (err.name !== 'TimeoutError' && !err.message?.includes('aborted')) {
          console.warn('[FeedWorker] Event poll warning:', err.message);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  /**
   * Seed a specific shard with newest live events from its tip
   */
  private async seedShardTip(shardId: number): Promise<string | null> {
    try {
      const res = await fetch(`${this.nodeUrl}/v1/events?shard_index=${shardId}&reverse=true&pageSize=100`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;

      const data = await res.json();
      const events: any[] = data.events || [];
      if (events.length === 0) return null;

      const newestEventId = String(events[0].id);

      // Process historical tip in chronological order (oldest to newest)
      const forwardEvents = [...events].reverse();
      for (const ev of forwardEvents) {
        try {
          await this.processEvent(ev);
        } catch {}
      }

      await CastRepository.pruneFeed(this.maxCasts);
      return newestEventId;
    } catch {
      return null;
    }
  }

  /**
   * Process a single Snapchain event
   */
  private async processEvent(ev: any): Promise<boolean> {
    const msg = ev.mergeMessageBody?.message || ev.merge_message_body?.message;
    if (!msg || !msg.data) return false;

    const msgType = msg.data.type;

    // 1. New Cast Add Event
    if (msg.data.castAddBody || msgType === 'MESSAGE_TYPE_CAST_ADD' || msgType === 1) {
      const castBody = msg.data.castAddBody || msg.data.cast_add_body;
      if (!castBody) return false;

      const hashHex = typeof msg.hash === 'string' ? msg.hash : '0x';
      const farcasterTime = msg.data.timestamp || 0;
      const timestamp = FARCASTER_EPOCH + farcasterTime * 1000;

      // Filter out time-travel / future corrupted timestamps
      if (timestamp > Date.now() + 60000) {
        return false;
      }

      // Resolve author profile
      const fid = msg.data.fid;
      const author = await this.resolveAuthor(fid);
      const signerHex = extractSignerHex(msg.signer);

      const cast: FarcasterCast = {
        hash: hashHex,
        fid,
        text: castBody.text || '',
        timestamp,
        author,
        signer: signerHex,
        parentCastId: castBody.parentCastId
          ? { fid: castBody.parentCastId.fid, hash: castBody.parentCastId.hash }
          : undefined,
        embeds: (castBody.embeds || []).map((e: any) => ({
          url: e.url,
          castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
        })),
        parentUrl: castBody.parentUrl,
        mentions: castBody.mentions,
      };

      if (signerHex) {
        try {
          const details = await SignerAttributionService.resolveSigner(fid, signerHex, this.nodeUrl);
          if (details) {
            cast.clientFid = details.clientFid;
            cast.clientType = details.clientType;
            cast.clientName = details.clientName;
            cast.clientUsername = details.clientUsername;
            cast.clientSource = details.clientName;
          }
        } catch {
          // Fallback to heuristic
        }
      }

      if (!cast.clientSource) {
        const attribution = identifyCastClient(cast);
        cast.clientSource = attribution.clientName;
      }

      await CastRepository.upsertCast(cast);
      return true;
    }

    // 2. Cast Remove Event
    if (msg.data.castRemoveBody || msgType === 'MESSAGE_TYPE_CAST_REMOVE' || msgType === 2) {
      const body = msg.data.castRemoveBody || msg.data.cast_remove_body;
      const targetHash = body?.targetHash || body?.target_hash;
      if (targetHash) {
        await CastRepository.deleteCast(targetHash);
      }
      return false;
    }

    // 3. User Data Event
    if (msg.data.userDataBody || msgType === 'MESSAGE_TYPE_USER_DATA_ADD' || msgType === 6) {
      const body = msg.data.userDataBody || msg.data.user_data_body;
      const fid = msg.data.fid;
      if (body && fid) {
        await this.updateUserField(fid, body.type, body.value);
      }
      return false;
    }

    // 4. Reaction Event
    if (msg.data.reactionBody || msgType === 'MESSAGE_TYPE_REACTION_ADD' || msgType === 3) {
      const body = msg.data.reactionBody || msg.data.reaction_body;
      const targetHash = body?.targetCastId?.hash || body?.target_cast_id?.hash;
      const targetFid = body?.targetCastId?.fid || body?.target_cast_id?.fid;
      if (targetHash && targetFid) {
        const pool = getDatabasePool();
        const isLike = body.type === 1 || body.type === 'REACTION_TYPE_LIKE';
        const isRecast = body.type === 2 || body.type === 'REACTION_TYPE_RECAST';
        await pool.query(
          `
          INSERT INTO cast_stats (cast_hash, target_fid, likes_count, recasts_count, last_sync)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT (cast_hash) DO UPDATE SET
            likes_count = cast_stats.likes_count + EXCLUDED.likes_count,
            recasts_count = cast_stats.recasts_count + EXCLUDED.recasts_count,
            last_sync = NOW()
          `,
          [targetHash, targetFid, isLike ? 1 : 0, isRecast ? 1 : 0]
        ).catch(() => {});
      }
      return false;
    }

    return false;
  }

  /**
   * Resolve and cache user author profile
   */
  private async resolveAuthor(fid: number): Promise<FarcasterUser> {
    if (this.userCache.has(fid)) {
      return this.userCache.get(fid)!;
    }

    const pool = getDatabasePool();
    try {
      const existing = await pool.query(
        'SELECT fid, username, display_name, pfp_url, bio FROM users WHERE fid = $1',
        [fid]
      );

      if (existing.rows.length > 0) {
        const u: FarcasterUser = {
          fid: existing.rows[0].fid,
          username: existing.rows[0].username,
          displayName: existing.rows[0].display_name,
          pfpUrl: existing.rows[0].pfp_url,
          bio: existing.rows[0].bio,
        };
        this.userCache.set(fid, u);
        return u;
      }
    } catch {}

    // Fetch user profile from node
    try {
      const res = await fetch(`${this.nodeUrl}/v1/userDataByFid?fid=${fid}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      });

      if (res.ok) {
        const data = await res.json();
        const profile: FarcasterUser = { fid };

        for (const m of data.messages || []) {
          const body = m.data?.userDataBody || m.data?.user_data_body;
          if (!body) continue;
          const t = String(body.type || '').toUpperCase();
          if (t === '1' || t === 'USER_DATA_TYPE_PFP' || t === 'PFP') profile.pfpUrl = body.value;
          if (t === '2' || t === 'USER_DATA_TYPE_DISPLAY' || t === 'DISPLAY') profile.displayName = body.value;
          if (t === '3' || t === 'USER_DATA_TYPE_BIO' || t === 'BIO') profile.bio = body.value;
          if (t === '6' || t === 'USER_DATA_TYPE_USERNAME' || t === 'USERNAME') profile.username = body.value;
        }

        profile.displayName = profile.displayName || profile.username || `FID ${fid}`;
        profile.pfpUrl = profile.pfpUrl || `https://avatar.vercel.sh/${fid}`;

        await UserRepository.upsertUser(profile).catch(() => {});
        this.userCache.set(fid, profile);
        return profile;
      }
    } catch {}

    const fallback: FarcasterUser = {
      fid,
      username: `user_${fid}`,
      displayName: `FID ${fid}`,
      pfpUrl: `https://avatar.vercel.sh/${fid}`,
    };
    this.userCache.set(fid, fallback);
    return fallback;
  }

  /**
   * Update individual user profile metadata fields
   */
  private async updateUserField(fid: number, type: any, value: string): Promise<void> {
    const t = String(type || '').toUpperCase();
    const pool = getDatabasePool();
    if (t === '1' || t === 'USER_DATA_TYPE_PFP' || t === 'PFP') {
      await pool.query('UPDATE users SET pfp_url = $1 WHERE fid = $2', [value, fid]).catch(() => {});
      if (this.userCache.has(fid)) this.userCache.get(fid)!.pfpUrl = value;
    } else if (t === '2' || t === 'USER_DATA_TYPE_DISPLAY' || t === 'DISPLAY') {
      await pool.query('UPDATE users SET display_name = $1 WHERE fid = $2', [value, fid]).catch(() => {});
      if (this.userCache.has(fid)) this.userCache.get(fid)!.displayName = value;
    } else if (t === '6' || t === 'USER_DATA_TYPE_USERNAME' || t === 'USERNAME') {
      await pool.query('UPDATE users SET username = $1 WHERE fid = $2', [value, fid]).catch(() => {});
      if (this.userCache.has(fid)) this.userCache.get(fid)!.username = value;
    }
  }
}
