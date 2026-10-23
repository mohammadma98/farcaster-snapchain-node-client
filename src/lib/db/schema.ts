import { getDatabasePool, isPostgresAvailable } from './pool';

/**
 * PostgreSQL Database Schema & Auto-Migration
 * 
 * Automatically initializes all required tables and covering indexes on first start.
 * Executed safely using IF NOT EXISTS.
 */

let migrationExecuted = false;

export async function initDatabaseSchema(): Promise<boolean> {
  if (migrationExecuted) return true;

  const available = await isPostgresAvailable();
  if (!available) {
    return false;
  }

  const pool = getDatabasePool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Users metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        fid INTEGER PRIMARY KEY,
        username VARCHAR(64),
        display_name VARCHAR(128),
        pfp_url TEXT,
        bio TEXT,
        custody_address VARCHAR(42),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);

    // 2. Casts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS casts (
        hash VARCHAR(66) PRIMARY KEY,
        fid INTEGER NOT NULL,
        text TEXT NOT NULL,
        timestamp BIGINT NOT NULL,
        parent_hash VARCHAR(66),
        parent_fid INTEGER,
        embeds JSONB,
        client_source VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_casts_fid_timestamp ON casts(fid, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_casts_timestamp ON casts(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_casts_parent_hash ON casts(parent_hash) WHERE parent_hash IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_casts_root_timestamp_asc ON casts(timestamp ASC) WHERE parent_hash IS NULL;
      ALTER TABLE users ALTER COLUMN username TYPE TEXT;
      ALTER TABLE users ALTER COLUMN display_name TYPE TEXT;
      ALTER TABLE users ALTER COLUMN bio TYPE TEXT;
      ALTER TABLE casts ALTER COLUMN client_source TYPE TEXT;
    `);

    // 3. User Follows table (Normalized)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_follows (
        fid INTEGER NOT NULL,
        target_fid INTEGER NOT NULL,
        timestamp BIGINT NOT NULL,
        PRIMARY KEY (fid, target_fid)
      );
      CREATE INDEX IF NOT EXISTS idx_user_follows_fid ON user_follows(fid);
      CREATE INDEX IF NOT EXISTS idx_user_follows_target ON user_follows(target_fid);
    `);

    // 4. Cast Stats & Reaction Aggregations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cast_stats (
        cast_hash VARCHAR(66) PRIMARY KEY,
        target_fid INTEGER NOT NULL,
        likes_count INTEGER DEFAULT 0,
        recasts_count INTEGER DEFAULT 0,
        replies_count INTEGER DEFAULT 0,
        last_sync TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_reaction_timestamp BIGINT DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_cast_stats_last_sync ON cast_stats(last_sync);
    `);

    // 5. Viewer Interactions table (Instant likedByMe & recastByMe resolution)
    await client.query(`
      CREATE TABLE IF NOT EXISTS viewer_interactions (
        viewer_fid INTEGER NOT NULL,
        cast_hash VARCHAR(66) NOT NULL,
        reaction_type SMALLINT NOT NULL, -- 1: Like, 2: Recast
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (viewer_fid, cast_hash, reaction_type)
      );
      CREATE INDEX IF NOT EXISTS idx_viewer_interactions_fid ON viewer_interactions(viewer_fid);
    `);

    // 6. High-water mark Checkpoints for Incremental Delta Syncing
    await client.query(`
      CREATE TABLE IF NOT EXISTS sync_checkpoints (
        checkpoint_key VARCHAR(128) PRIMARY KEY,
        last_timestamp BIGINT NOT NULL DEFAULT 0,
        last_event_id VARCHAR(64),
        last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE sync_checkpoints ADD COLUMN IF NOT EXISTS last_event_id VARCHAR(64);
    `);

    // 7. Known official clients registry
    await client.query(`
      CREATE TABLE IF NOT EXISTS known_clients (
        fid INTEGER PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        username VARCHAR(64),
        brand_color VARCHAR(32),
        icon_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      INSERT INTO known_clients (fid, name, username, brand_color) VALUES
        (9152, 'Warpcast', 'warpcast', '#7C65C1'),
        (16823, 'Firefly', 'fireflyapp', '#3B82F6'),
        (194, 'Supercast', 'supercast', '#6366F1'),
        (21544, 'Paragraph', 'paragraph', '#10B981'),
        (1325, 'Phaver', 'phaver', '#EC4899')
      ON CONFLICT (fid) DO UPDATE SET
        name = EXCLUDED.name,
        username = EXCLUDED.username,
        brand_color = EXCLUDED.brand_color;
    `);

    // 8. Signer attribution L2 persistent cache
    await client.query(`
      CREATE TABLE IF NOT EXISTS signers (
        key VARCHAR(66) PRIMARY KEY,
        fid INTEGER NOT NULL,
        request_fid INTEGER NOT NULL,
        client_type VARCHAR(20) NOT NULL, -- 'known' | 'personal' | 'other'
        client_name VARCHAR(128) NOT NULL,
        client_username VARCHAR(64),
        source VARCHAR(20) DEFAULT 'offchain',
        expires_at BIGINT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_signers_fid ON signers(fid);
      CREATE INDEX IF NOT EXISTS idx_signers_request_fid ON signers(request_fid);
      CREATE INDEX IF NOT EXISTS idx_signers_client_type ON signers(client_type);
    `);

    // 9. Extend Casts table with client attribution columns and composite indexes
    await client.query(`
      ALTER TABLE casts ADD COLUMN IF NOT EXISTS signer VARCHAR(66);
      ALTER TABLE casts ADD COLUMN IF NOT EXISTS client_fid INTEGER;
      ALTER TABLE casts ADD COLUMN IF NOT EXISTS client_type VARCHAR(20) DEFAULT 'other';
      ALTER TABLE casts ADD COLUMN IF NOT EXISTS client_name VARCHAR(128);

      CREATE INDEX IF NOT EXISTS idx_casts_client_type_timestamp ON casts(client_type, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_casts_client_fid_timestamp ON casts(client_fid, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_casts_signer ON casts(signer);
    `);

    await client.query('COMMIT');
    migrationExecuted = true;
    return true;
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.warn('[Postgres Schema] Migration error, falling back to node mode:', err.message);
    return false;
  } finally {
    client.release();
  }
}
