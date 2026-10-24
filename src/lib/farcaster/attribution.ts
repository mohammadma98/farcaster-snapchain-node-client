import { decodeAbiParameters, bytesToHex, type Hex } from 'viem';
import { ClientAttributionDetails, ClientCategory, KnownClientEntry } from './types';

function getDbModule() {
  if (typeof window !== 'undefined') return null;
  try {
    // Dynamic node require prevents webpack from bundling pg into client bundles
    const req = eval('require');
    return req('../db/pool');
  } catch {
    return null;
  }
}

async function getPoolSafe() {
  const db = getDbModule();
  return db ? db.getDatabasePool() : null;
}

async function isPostgresAvailableSafe(): Promise<boolean> {
  const db = getDbModule();
  return db ? db.isPostgresAvailable() : false;
}

/**
 * Standard ABI tuple for EIP-712 SignedKeyRequest metadata
 */
const METADATA_ABI = [
  {
    type: 'tuple',
    components: [
      { name: 'requestFid', type: 'uint256' },
      { name: 'requestSigner', type: 'address' },
      { name: 'signature', type: 'bytes' },
      { name: 'deadline', type: 'uint256' },
    ],
  },
] as const;

/**
 * Registry of official / well-known Farcaster clients
 */
export const KNOWN_CLIENTS: Record<number, KnownClientEntry> = {
  9152: { fid: 9152, name: 'Warpcast', username: 'warpcast', brandColor: '#7C65C1' },
  16823: { fid: 16823, name: 'Firefly', username: 'fireflyapp', brandColor: '#3B82F6' },
  194: { fid: 194, name: 'Supercast', username: 'supercast', brandColor: '#6366F1' },
  21544: { fid: 21544, name: 'Paragraph', username: 'paragraph', brandColor: '#10B981' },
  1325: { fid: 1325, name: 'Phaver', username: 'phaver', brandColor: '#EC4899' },
  13111: { fid: 13111, name: 'Herocast', username: 'herocast', brandColor: '#F59E0B' },
  1287: { fid: 1287, name: 'Bountycaster', username: 'bountycaster', brandColor: '#D97706' },
};

export function normalizeHex(key: string): string {
  if (!key) return '';
  const clean = key.trim().toLowerCase();
  return clean.startsWith('0x') ? clean : `0x${clean}`;
}

/**
 * Decodes EIP-712 metadata ABI and extracts the requestFid
 */
export function extractRequestFid(metadata: string): number | undefined {
  if (!metadata) return undefined;
  try {
    let hex: Hex;
    if (metadata.startsWith('0x')) {
      hex = metadata as Hex;
    } else {
      const buffer = Buffer.from(metadata, 'base64');
      hex = bytesToHex(buffer);
    }
    const decoded = decodeAbiParameters(METADATA_ABI, hex);
    const rawFid = decoded[0]?.requestFid;
    if (rawFid !== undefined) {
      const fid = Number(rawFid);
      if (Number.isSafeInteger(fid) && fid > 0) {
        return fid;
      }
    }
  } catch {
    // Decoding failed or non-standard metadata
  }
  return undefined;
}

export class SignerAttributionService {
  // L1 In-Memory LRU Cache: signerKey (lowercase hex) -> ClientAttributionDetails
  private static l1Cache = new Map<string, { details: ClientAttributionDetails; expiresAt: number }>();
  private static readonly L1_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Resolve client attribution for a specific signer key and author FID
   */
  static async resolveSigner(
    userFid: number,
    rawSignerKey: string,
    nodeUrl = 'http://127.0.0.1:3381'
  ): Promise<ClientAttributionDetails | null> {
    const signerKey = normalizeHex(rawSignerKey);
    if (!signerKey || signerKey.length !== 66) return null;

    // 1. Check L1 Memory Cache
    const cached = this.l1Cache.get(signerKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.details;
    }

    // 2. Check L2 PostgreSQL Cache
    const isDb = await isPostgresAvailableSafe();
    if (isDb) {
      try {
        const pool = await getPoolSafe();
        if (pool) {
          const res = await pool.query('SELECT * FROM signers WHERE key = $1', [signerKey]);
          if (res.rows.length > 0) {
            const row = res.rows[0];
            const details: ClientAttributionDetails = {
              signer: row.key,
              userFid: row.fid,
              clientFid: row.request_fid,
              clientType: row.client_type as ClientCategory,
              clientName: row.client_name,
              clientUsername: row.client_username || undefined,
              badgeColor: KNOWN_CLIENTS[row.request_fid]?.brandColor || '#64748B',
            };
            this.setL1Cache(signerKey, details);
            return details;
          }
        }
      } catch (err: any) {
        console.warn('[Attribution] L2 cache lookup error:', err.message);
      }
    }

    // 3. Query Snapchain / Hub Node for key registration events
    const signersMap = await this.fetchUserSignersFromNode(userFid, nodeUrl);
    const resolved = signersMap.get(signerKey);
    if (resolved) {
      this.setL1Cache(signerKey, resolved);
      if (isDb) {
        await this.persistSignerToDb(resolved);
      }
      return resolved;
    }

    return null;
  }

  /**
   * Batch resolve attributions for multiple casts
   */
  static async resolveBatch(
    casts: Array<{ fid: number; signer?: string }>,
    nodeUrl = 'http://127.0.0.1:3381'
  ): Promise<Map<string, ClientAttributionDetails>> {
    const results = new Map<string, ClientAttributionDetails>();
    const missingFidKeys = new Map<number, Set<string>>();

    for (const cast of casts) {
      if (!cast.signer) continue;
      const key = normalizeHex(cast.signer);
      if (key.length !== 66) continue;

      const cached = this.l1Cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        results.set(key, cached.details);
      } else {
        if (!missingFidKeys.has(cast.fid)) {
          missingFidKeys.set(cast.fid, new Set());
        }
        missingFidKeys.get(cast.fid)!.add(key);
      }
    }

    // Check L2 DB for missing keys
    const isDb = await isPostgresAvailableSafe();
    const remainingMissingKeys = new Map<number, Set<string>>();

    if (isDb && missingFidKeys.size > 0) {
      const allKeys: string[] = [];
      for (const keys of missingFidKeys.values()) {
        allKeys.push(...keys);
      }

      try {
        const pool = await getPoolSafe();
        if (pool) {
          const res = await pool.query(
            'SELECT * FROM signers WHERE key = ANY($1::varchar[])',
            [allKeys]
          );
          const foundKeys = new Set<string>();
          for (const row of res.rows) {
          const details: ClientAttributionDetails = {
            signer: row.key,
            userFid: row.fid,
            clientFid: row.request_fid,
            clientType: row.client_type as ClientCategory,
            clientName: row.client_name,
            clientUsername: row.client_username || undefined,
            badgeColor: KNOWN_CLIENTS[row.request_fid]?.brandColor || '#64748B',
          };
          results.set(row.key, details);
          this.setL1Cache(row.key, details);
          foundKeys.add(row.key);
        }

        // Keep only keys that were not found in DB
        for (const [fid, keys] of missingFidKeys.entries()) {
          const stillMissing = new Set<string>();
          for (const k of keys) {
            if (!foundKeys.has(k)) stillMissing.add(k);
          }
          if (stillMissing.size > 0) {
            remainingMissingKeys.set(fid, stillMissing);
          }
        }
      }
    } catch (err: any) {
        console.warn('[Attribution] Batch L2 lookup error:', err.message);
      }
    } else {
      for (const [fid, keys] of missingFidKeys.entries()) {
        remainingMissingKeys.set(fid, keys);
      }
    }

    // For remaining missing keys, query node for each FID
    const fidsToQuery = [...remainingMissingKeys.keys()].slice(0, 10); // Batch up to 10 authors
    await Promise.allSettled(
      fidsToQuery.map(async (fid) => {
        try {
          const signersMap = await this.fetchUserSignersFromNode(fid, nodeUrl);
          for (const [key, details] of signersMap.entries()) {
            results.set(key, details);
            this.setL1Cache(key, details);
            if (isDb) {
              await this.persistSignerToDb(details).catch(() => {});
            }
          }
        } catch (err: any) {
          console.warn(`[Attribution] Node query error for FID ${fid}:`, err.message);
        }
      })
    );

    return results;
  }

  /**
   * Fetch signers for an FID from Snapchain / Hub Node (/v1/signersByFid & /v1/onChainSignersByFid)
   */
  private static async fetchUserSignersFromNode(
    userFid: number,
    nodeUrl: string
  ): Promise<Map<string, ClientAttributionDetails>> {
    const map = new Map<string, ClientAttributionDetails>();
    const cleanUrl = nodeUrl.replace(/\/$/, '');

    // 1. Query /v1/signersByFid (Snapchain unified signers: covers offchain V16 & indexed onchain)
    try {
      const resp = await fetch(`${cleanUrl}/v1/signersByFid?fid=${userFid}&pageSize=100`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const signers = data.signers || [];
        for (const s of signers) {
          const rawKey = s.key;
          if (!rawKey) continue;
          const key = normalizeHex(
            typeof rawKey === 'string' && rawKey.startsWith('0x')
              ? rawKey
              : Buffer.from(rawKey, 'base64').toString('hex')
          );
          if (key.length !== 66) continue;

          let requestFid: number | undefined;
          if (s.source === 2 || s.source === 'SIGNER_SOURCE_OFFCHAIN') {
            requestFid = s.requestFid ? Number(s.requestFid) : undefined;
          } else if (s.source === 1 || s.source === 'SIGNER_SOURCE_ONCHAIN') {
            const metadata = s.onChainEvent?.signerEventBody?.metadata;
            if (metadata) requestFid = extractRequestFid(metadata);
          }

          if (requestFid) {
            const details = this.classifyClient(key, userFid, requestFid);
            map.set(key, details);
          }
        }
      }
    } catch {
      // Endpoint error or timeout
    }

    // 2. Query /v1/onChainSignersByFid if no offchain signers found
    if (map.size === 0) {
      try {
        const resp = await fetch(`${cleanUrl}/v1/onChainSignersByFid?fid=${userFid}&pageSize=100`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });

        if (resp.ok) {
          const data = await resp.json();
          const events = data.events || [];
          for (const ev of events) {
            const body = ev.signerEventBody;
            if (!body?.key || !body.metadata) continue;
            const key = normalizeHex(body.key);
            if (key.length !== 66) continue;

            const requestFid = extractRequestFid(body.metadata);
            if (requestFid) {
              const details = this.classifyClient(key, userFid, requestFid);
              map.set(key, details);
            }
          }
        }
      } catch {
        // Endpoint error or timeout
      }
    }

    return map;
  }

  /**
   * Classify signer into Known, Personal, or Other
   */
  public static classifyClient(
    signerKey: string,
    userFid: number,
    requestFid: number
  ): ClientAttributionDetails {
    // 1. Personal (Self-registered: user requested their own key)
    if (requestFid === userFid) {
      return {
        signer: signerKey,
        userFid,
        clientFid: requestFid,
        clientType: 'personal',
        clientName: 'Self-registered',
        badgeColor: '#10B981', // Emerald green
      };
    }

    // 2. Known Official Client
    const known = KNOWN_CLIENTS[requestFid];
    if (known) {
      return {
        signer: signerKey,
        userFid,
        clientFid: requestFid,
        clientType: 'known',
        clientName: known.name,
        clientUsername: known.username,
        badgeColor: known.brandColor,
      };
    }

    // 3. Other third-party Client
    return {
      signer: signerKey,
      userFid,
      clientFid: requestFid,
      clientType: 'other',
      clientName: `FID ${requestFid}`,
      badgeColor: '#64748B', // Slate gray
    };
  }

  /**
   * Persist resolved signer into PostgreSQL L2 cache
   */
  private static async persistSignerToDb(details: ClientAttributionDetails): Promise<void> {
    try {
      const pool = await getPoolSafe();
      if (!pool) return;
      await pool.query(
        `
        INSERT INTO signers (
          key, fid, request_fid, client_type, client_name, client_username, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (key) DO UPDATE SET
          request_fid = EXCLUDED.request_fid,
          client_type = EXCLUDED.client_type,
          client_name = EXCLUDED.client_name,
          client_username = EXCLUDED.client_username,
          updated_at = NOW()
        `,
        [
          details.signer,
          details.userFid,
          details.clientFid,
          details.clientType,
          details.clientName,
          details.clientUsername || null,
        ]
      );
    } catch (err: any) {
      console.warn('[Attribution] DB persistence error:', err.message);
    }
  }

  private static setL1Cache(key: string, details: ClientAttributionDetails): void {
    if (this.l1Cache.size > 2000) {
      const oldestKey = this.l1Cache.keys().next().value;
      if (oldestKey) this.l1Cache.delete(oldestKey);
    }
    this.l1Cache.set(key, { details, expiresAt: Date.now() + this.L1_TTL_MS });
  }
}
