import { defaultNodeClient } from '../farcaster/node-client';
import {
  UserRepository,
  FollowRepository,
  CastRepository,
  StatsRepository,
  CheckpointRepository,
} from '../db/repositories';
import { isPostgresAvailable } from '../db/pool';

/**
 * Incremental Delta Synchronization Engine
 * 
 * Implements SWR (Stale-While-Revalidate):
 * - Checks timestamps & checkpoints before querying the node to prevent redundant node traffic.
 * - Minimum 5-minute cooldown per entity (300,000ms).
 * - Runs asynchronously in background to ensure zero added latency for user requests.
 */

export class DeltaSyncService {
  /**
   * Sync user followings from local Snapchain node incrementally
   */
  static async syncFollows(viewerFid: number, nodeUrl: string): Promise<void> {
    const isDb = await isPostgresAvailable();
    if (!isDb || !viewerFid) return;

    const checkpointKey = `follows:${viewerFid}`;
    const isStale = await CheckpointRepository.isCheckpointStale(checkpointKey, 300000); // 5 min
    if (!isStale) return;

    try {
      const { fids, users } = await defaultNodeClient.getFollowsByFid(viewerFid, nodeUrl);
      if (fids.length > 0) {
        await FollowRepository.upsertFollows(viewerFid, fids, Date.now());
      }
      for (const u of users) {
        await UserRepository.upsertUser(u);
      }
      await CheckpointRepository.updateCheckpoint(checkpointKey, Date.now());
    } catch (err: any) {
      console.warn(`[DeltaSync] Failed to sync follows for FID ${viewerFid}:`, err.message);
    }
  }

  /**
   * Sync reaction stats (likes, recasts, replies) for a specific cast
   */
  static async syncCastStats(castHash: string, targetFid: number, nodeUrl: string): Promise<void> {
    const isDb = await isPostgresAvailable();
    if (!isDb || !castHash || !targetFid) return;

    const checkpointKey = `stats:${castHash}`;
    const isStale = await CheckpointRepository.isCheckpointStale(checkpointKey, 300000); // 5 min
    if (!isStale) return;

    try {
      const [reactions, repliesCount] = await Promise.all([
        defaultNodeClient.getReactionsByCast(targetFid, castHash, 100, nodeUrl),
        defaultNodeClient.getRepliesCountByCast(targetFid, castHash, nodeUrl),
      ]);

      await StatsRepository.upsertCastStats({
        castHash,
        targetFid,
        likesCount: reactions.likesCount,
        recastsCount: reactions.recastsCount,
        repliesCount,
        lastReactionTimestamp: reactions.latestTimestamp,
      });

      await CheckpointRepository.updateCheckpoint(checkpointKey, Date.now());
    } catch (err: any) {
      console.warn(`[DeltaSync] Failed to sync stats for cast ${castHash}:`, err.message);
    }
  }

  /**
   * Background ingest: fetch newest casts for accounts and persist to Postgres
   */
  static async syncNewestCasts(
    fids: number[],
    nodeUrl: string,
    limitPerUser = 5
  ): Promise<void> {
    const isDb = await isPostgresAvailable();
    if (!isDb || fids.length === 0) return;

    const targetFids = fids.slice(0, 10); // Batch up to 10 accounts concurrently
    await Promise.allSettled(
      targetFids.map(async (fid) => {
        try {
          const checkpointKey = `casts:${fid}`;
          const isStale = await CheckpointRepository.isCheckpointStale(checkpointKey, 180000); // 3 min
          if (!isStale) return;

          const casts = await defaultNodeClient.getCastsByFid(fid, limitPerUser, nodeUrl);
          for (const c of casts) {
            await CastRepository.upsertCast(c);
            // Opportunistically queue stats sync for root casts
            if (!c.parentCastId) {
              DeltaSyncService.syncCastStats(c.hash, c.fid, nodeUrl).catch(() => {});
            }
          }
          await CheckpointRepository.updateCheckpoint(checkpointKey, Date.now());
        } catch {
          // ignore
        }
      })
    );
  }
}
