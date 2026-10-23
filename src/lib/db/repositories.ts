import { getDatabasePool } from './pool';
import { FarcasterCast, FarcasterUser } from '../farcaster/types';

export class UserRepository {
  static async upsertUser(user: FarcasterUser): Promise<void> {
    if (!user.fid) return;
    const pool = getDatabasePool();
    await pool.query(
      `
      INSERT INTO users (fid, username, display_name, pfp_url, bio, custody_address, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (fid) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, users.username),
        display_name = COALESCE(EXCLUDED.display_name, users.display_name),
        pfp_url = COALESCE(EXCLUDED.pfp_url, users.pfp_url),
        bio = COALESCE(EXCLUDED.bio, users.bio),
        custody_address = COALESCE(EXCLUDED.custody_address, users.custody_address),
        updated_at = NOW()
    `,
      [
        user.fid,
        user.username || null,
        user.displayName || null,
        user.pfpUrl || null,
        user.bio || null,
        user.custodyAddress || null,
      ]
    );
  }

  static async getUserByFid(fid: number): Promise<FarcasterUser | null> {
    const pool = getDatabasePool();
    const res = await pool.query('SELECT * FROM users WHERE fid = $1', [fid]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      fid: row.fid,
      username: row.username,
      displayName: row.display_name,
      pfpUrl: row.pfp_url,
      bio: row.bio,
      custodyAddress: row.custody_address,
    };
  }

  static async getUserByUsername(username: string): Promise<FarcasterUser | null> {
    const clean = username.replace(/^@/, '').toLowerCase();
    const pool = getDatabasePool();
    const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = $1', [clean]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      fid: row.fid,
      username: row.username,
      displayName: row.display_name,
      pfpUrl: row.pfp_url,
      bio: row.bio,
      custodyAddress: row.custody_address,
    };
  }
}

export class FollowRepository {
  static async getFollowedFids(fid: number): Promise<number[]> {
    const pool = getDatabasePool();
    const res = await pool.query(
      'SELECT target_fid FROM user_follows WHERE fid = $1 ORDER BY timestamp DESC',
      [fid]
    );
    return res.rows.map((r) => r.target_fid);
  }

  static async upsertFollows(fid: number, targetFids: number[], timestamp: number): Promise<void> {
    if (targetFids.length === 0) return;
    const pool = getDatabasePool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const targetFid of targetFids) {
        await client.query(
          `
          INSERT INTO user_follows (fid, target_fid, timestamp)
          VALUES ($1, $2, $3)
          ON CONFLICT (fid, target_fid) DO UPDATE SET timestamp = EXCLUDED.timestamp
        `,
          [fid, targetFid, timestamp]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  static async removeFollow(fid: number, targetFid: number): Promise<void> {
    const pool = getDatabasePool();
    await pool.query('DELETE FROM user_follows WHERE fid = $1 AND target_fid = $2', [fid, targetFid]);
  }
}

export class CastRepository {
  static async upsertCast(cast: FarcasterCast): Promise<void> {
    if (!cast.hash || !cast.fid) return;
    const pool = getDatabasePool();
    const parentHash = cast.parentCastId?.hash || null;
    const parentFid = cast.parentCastId?.fid || null;

    await pool.query(
      `
      INSERT INTO casts (hash, fid, text, timestamp, parent_hash, parent_fid, embeds, client_source, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (hash) DO UPDATE SET
        text = EXCLUDED.text,
        embeds = COALESCE(EXCLUDED.embeds, casts.embeds),
        client_source = COALESCE(EXCLUDED.client_source, casts.client_source)
    `,
      [
        cast.hash,
        cast.fid,
        cast.text || '',
        cast.timestamp,
        parentHash,
        parentFid,
        JSON.stringify(cast.embeds || []),
        cast.clientSource || null,
      ]
    );

    // If author metadata provided, also upsert author profile
    if (cast.author) {
      await UserRepository.upsertUser(cast.author);
    }
  }

  static async getFeedCasts(options: {
    viewerFid?: number;
    fid?: number;
    limit?: number;
    cursorTimestamp?: number;
    sourceFilter?: string;
  }): Promise<FarcasterCast[]> {
    const pool = getDatabasePool();
    const limit = Math.max(1, Math.min(options.limit || 5, 50));
    const params: any[] = [];
    let idx = 1;

    let query = `
      SELECT 
        c.hash,
        c.fid,
        c.text,
        c.timestamp,
        c.parent_hash,
        c.parent_fid,
        c.embeds,
        c.client_source,
        u.username,
        u.display_name,
        u.pfp_url,
        COALESCE(cs.likes_count, 0) AS likes_count,
        COALESCE(cs.recasts_count, 0) AS recasts_count,
        COALESCE(cs.replies_count, 0) AS replies_count
    `;

    if (options.viewerFid) {
      query += `,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $${idx} AND vi.reaction_type = 1) AS liked_by_me,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $${idx} AND vi.reaction_type = 2) AS recast_by_me
      `;
      params.push(options.viewerFid);
      idx++;
    } else {
      query += `,
        false AS liked_by_me,
        false AS recast_by_me
      `;
    }

    query += `
      FROM casts c
      LEFT JOIN users u ON u.fid = c.fid
      LEFT JOIN cast_stats cs ON cs.cast_hash = c.hash
    `;

    const whereClauses: string[] = ['c.parent_hash IS NULL'];

    if (options.fid) {
      whereClauses.push(`c.fid = $${idx}`);
      params.push(options.fid);
      idx++;
    } else if (options.viewerFid) {
      // Following feed: casts from followed accounts OR the viewer themselves
      whereClauses.push(`(
        c.fid = $${idx} OR 
        c.fid IN (SELECT target_fid FROM user_follows WHERE fid = $${idx})
      )`);
      params.push(options.viewerFid);
      idx++;
    }

    if (options.cursorTimestamp) {
      whereClauses.push(`c.timestamp < $${idx}`);
      params.push(options.cursorTimestamp);
      idx++;
    }

    if (options.sourceFilter && options.sourceFilter !== 'all') {
      whereClauses.push(`LOWER(c.client_source) = LOWER($${idx})`);
      params.push(options.sourceFilter);
      idx++;
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    query += ` ORDER BY c.timestamp DESC LIMIT $${idx}`;
    params.push(limit);

    const res = await pool.query(query, params);
    return res.rows.map(mapRowToCast);
  }

  static async getCastByHash(hash: string, viewerFid?: number): Promise<FarcasterCast | null> {
    const pool = getDatabasePool();
    const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
    const params: any[] = [cleanHash];

    let query = `
      SELECT 
        c.hash,
        c.fid,
        c.text,
        c.timestamp,
        c.parent_hash,
        c.parent_fid,
        c.embeds,
        c.client_source,
        u.username,
        u.display_name,
        u.pfp_url,
        COALESCE(cs.likes_count, 0) AS likes_count,
        COALESCE(cs.recasts_count, 0) AS recasts_count,
        COALESCE(cs.replies_count, 0) AS replies_count
    `;

    if (viewerFid) {
      query += `,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $2 AND vi.reaction_type = 1) AS liked_by_me,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $2 AND vi.reaction_type = 2) AS recast_by_me
      `;
      params.push(viewerFid);
    } else {
      query += `, false AS liked_by_me, false AS recast_by_me`;
    }

    query += `
      FROM casts c
      LEFT JOIN users u ON u.fid = c.fid
      LEFT JOIN cast_stats cs ON cs.cast_hash = c.hash
      WHERE c.hash = $1
    `;

    const res = await pool.query(query, params);
    if (res.rows.length === 0) return null;
    return mapRowToCast(res.rows[0]);
  }

  static async getRepliesByParent(parentHash: string, viewerFid?: number): Promise<FarcasterCast[]> {
    const pool = getDatabasePool();
    const cleanHash = parentHash.startsWith('0x') ? parentHash : `0x${parentHash}`;
    const params: any[] = [cleanHash];

    let query = `
      SELECT 
        c.hash,
        c.fid,
        c.text,
        c.timestamp,
        c.parent_hash,
        c.parent_fid,
        c.embeds,
        c.client_source,
        u.username,
        u.display_name,
        u.pfp_url,
        COALESCE(cs.likes_count, 0) AS likes_count,
        COALESCE(cs.recasts_count, 0) AS recasts_count,
        COALESCE(cs.replies_count, 0) AS replies_count
    `;

    if (viewerFid) {
      query += `,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $2 AND vi.reaction_type = 1) AS liked_by_me,
        EXISTS(SELECT 1 FROM viewer_interactions vi WHERE vi.cast_hash = c.hash AND vi.viewer_fid = $2 AND vi.reaction_type = 2) AS recast_by_me
      `;
      params.push(viewerFid);
    } else {
      query += `, false AS liked_by_me, false AS recast_by_me`;
    }

    query += `
      FROM casts c
      LEFT JOIN users u ON u.fid = c.fid
      LEFT JOIN cast_stats cs ON cs.cast_hash = c.hash
      WHERE c.parent_hash = $1
      ORDER BY c.timestamp ASC
      LIMIT 100
    `;

    const res = await pool.query(query, params);
    return res.rows.map(mapRowToCast);
  }
}

export class StatsRepository {
  static async upsertCastStats(stats: {
    castHash: string;
    targetFid: number;
    likesCount: number;
    recastsCount: number;
    repliesCount: number;
    lastReactionTimestamp?: number;
  }): Promise<void> {
    const pool = getDatabasePool();
    await pool.query(
      `
      INSERT INTO cast_stats (cast_hash, target_fid, likes_count, recasts_count, replies_count, last_sync, last_reaction_timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (cast_hash) DO UPDATE SET
        likes_count = EXCLUDED.likes_count,
        recasts_count = EXCLUDED.recasts_count,
        replies_count = EXCLUDED.replies_count,
        last_sync = NOW(),
        last_reaction_timestamp = GREATEST(cast_stats.last_reaction_timestamp, EXCLUDED.last_reaction_timestamp)
    `,
      [
        stats.castHash,
        stats.targetFid,
        stats.likesCount,
        stats.recastsCount,
        stats.repliesCount,
        stats.lastReactionTimestamp || 0,
      ]
    );
  }
}

export class ViewerInteractionsRepository {
  static async recordInteraction(
    viewerFid: number,
    castHash: string,
    type: 'like' | 'recast',
    isRemove = false
  ): Promise<void> {
    const pool = getDatabasePool();
    const reactionType = type === 'like' ? 1 : 2;
    if (isRemove) {
      await pool.query(
        'DELETE FROM viewer_interactions WHERE viewer_fid = $1 AND cast_hash = $2 AND reaction_type = $3',
        [viewerFid, castHash, reactionType]
      );
    } else {
      await pool.query(
        `
        INSERT INTO viewer_interactions (viewer_fid, cast_hash, reaction_type, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (viewer_fid, cast_hash, reaction_type) DO NOTHING
      `,
        [viewerFid, castHash, reactionType]
      );
    }
  }
}

export class CheckpointRepository {
  static async isCheckpointStale(key: string, maxAgeMs = 300000): Promise<boolean> {
    const pool = getDatabasePool();
    const res = await pool.query(
      'SELECT last_checked_at FROM sync_checkpoints WHERE checkpoint_key = $1',
      [key]
    );
    if (res.rows.length === 0) return true;
    const lastChecked = new Date(res.rows[0].last_checked_at).getTime();
    return Date.now() - lastChecked > maxAgeMs;
  }

  static async updateCheckpoint(key: string, lastTimestamp: number): Promise<void> {
    const pool = getDatabasePool();
    await pool.query(
      `
      INSERT INTO sync_checkpoints (checkpoint_key, last_timestamp, last_checked_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (checkpoint_key) DO UPDATE SET
        last_timestamp = GREATEST(sync_checkpoints.last_timestamp, EXCLUDED.last_timestamp),
        last_checked_at = NOW()
    `,
      [key, lastTimestamp]
    );
  }

  static async getLastTimestamp(key: string): Promise<number> {
    const pool = getDatabasePool();
    const res = await pool.query(
      'SELECT last_timestamp FROM sync_checkpoints WHERE checkpoint_key = $1',
      [key]
    );
    if (res.rows.length === 0) return 0;
    return Number(res.rows[0].last_timestamp || 0);
  }
}

function mapRowToCast(row: any): FarcasterCast {
  let embeds: any[] = [];
  try {
    embeds = typeof row.embeds === 'string' ? JSON.parse(row.embeds) : row.embeds || [];
  } catch {
    embeds = [];
  }

  return {
    hash: row.hash,
    fid: row.fid,
    text: row.text,
    timestamp: Number(row.timestamp),
    clientSource: row.client_source || 'Direct Snapchain',
    embeds,
    parentCastId: row.parent_hash ? { fid: row.parent_fid || 0, hash: row.parent_hash } : undefined,
    author: row.username
      ? {
          fid: row.fid,
          username: row.username,
          displayName: row.display_name || row.username,
          pfpUrl: row.pfp_url || `https://avatar.vercel.sh/${row.fid}`,
        }
      : undefined,
    reactions: {
      likesCount: Number(row.likes_count || 0),
      recastsCount: Number(row.recasts_count || 0),
      likedByMe: Boolean(row.liked_by_me),
      recastByMe: Boolean(row.recast_by_me),
    },
    repliesCount: Number(row.replies_count || 0),
  };
}
