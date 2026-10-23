import { Pool, PoolConfig } from 'pg';

/**
 * PostgreSQL Connection Pool & Availability Manager
 * 
 * Zero-Config: Defaults automatically to the internal Docker container settings
 * (postgresql://farcaster:farcaster_secret@127.0.0.1:5432/snapchain_client).
 * 
 * Resilient Fallback: If PostgreSQL is offline or unreachable, isPostgresAvailable
 * gracefully evaluates to false so the client falls back to direct Snapchain node queries without error.
 */

const DEFAULT_DATABASE_URL = 'postgresql://farcaster:farcaster_secret@127.0.0.1:5432/snapchain_client';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
  max: 20, // Keep connection count conservative for 512MB RAM target
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, // Fast fail (2s) to prevent blocking user requests
};

let globalPool: Pool | null = null;
let isDbHealthy: boolean | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // Check DB health at most once every 30 seconds

export function getDatabasePool(): Pool {
  if (!globalPool) {
    globalPool = new Pool(poolConfig);

    globalPool.on('error', (err) => {
      console.warn('[Postgres] Pool client error (fallback to node mode active):', err.message);
      isDbHealthy = false;
    });
  }
  return globalPool;
}

/**
 * Test if PostgreSQL is available and responsive within 1.5 seconds.
 */
export async function isPostgresAvailable(): Promise<boolean> {
  const now = Date.now();
  if (isDbHealthy !== null && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return isDbHealthy;
  }

  const pool = getDatabasePool();
  try {
    const client = await Promise.race([
      pool.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PostgreSQL connection timeout (1.5s)')), 1500)
      ),
    ]);

    await client.query('SELECT 1');
    client.release();

    isDbHealthy = true;
    lastHealthCheck = now;
    return true;
  } catch {
    isDbHealthy = false;
    lastHealthCheck = now;
    return false;
  }
}
