import {
  makeCastAdd,
  makeReactionAdd,
  makeReactionRemove,
  makeLinkAdd,
  makeLinkRemove,
  NobleEd25519Signer,
  FarcasterNetwork,
  ReactionType,
  Message,
  hexStringToBytes,
  bytesToHexString,
  fromFarcasterTime,
  CastType,
} from '@farcaster/core';
import { createPublicClient, http } from 'viem';
import { optimism } from 'viem/chains';
import { FarcasterCast, FarcasterUser, SnapchainInfo } from './types';
import { identifyCastClient } from './client-filter';
import { SignerAttributionService, normalizeHex } from './attribution';

export function extractSignerHex(rawSigner: any): string | undefined {
  if (!rawSigner) return undefined;
  if (typeof rawSigner === 'string') {
    if (rawSigner.startsWith('0x')) return rawSigner.toLowerCase();
    try {
      return `0x${Buffer.from(rawSigner, 'base64').toString('hex')}`.toLowerCase();
    } catch {
      return undefined;
    }
  }
  if (rawSigner instanceof Uint8Array || Buffer.isBuffer(rawSigner)) {
    return `0x${Buffer.from(rawSigner).toString('hex')}`.toLowerCase();
  }
  return undefined;
}

export function parseParentCastId(castBody: any): { fid: number; hash: string } | undefined {
  if (!castBody) return undefined;
  const p = castBody.parentCastId || castBody.parent_cast_id;
  if (!p) return undefined;
  const fid = typeof p.fid === 'number' ? p.fid : Number(p.fid);
  const hash = typeof p.hash === 'string' ? p.hash : undefined;
  if ((fid && fid > 0) || (hash && hash !== '0x' && hash.trim() !== '')) {
    return {
      fid: fid || 0,
      hash: hash || '0x',
    };
  }
  return undefined;
}

const ID_REGISTRY_ADDRESS = '0x00000000fc6c5f01fc30151999387bb99a9f489b';
const ID_REGISTRY_ABI = [
  {
    name: 'idOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface NodeHealthResult {
  isOnline: boolean;
  latencyMs: number;
  url: string;
  version?: string;
  isSyncing?: boolean;
  peerCount?: number;
  numMessages?: number;
  numFidRegistrations?: number;
  approxSize?: number;
  error?: string;
}

export const DEFAULT_NODE_URL =
  process.env.FARCASTER_NODE_URL ||
  process.env.SNAPCHAIN_NODE_URL ||
  'http://127.0.0.1:3381';

export interface ReactionRecord {
  targetFid: number;
  targetHash: string;
  timestamp: number;
  type: 'like' | 'recast';
}

export class SnapchainNodeClient {
  private defaultNodeUrl: string;

  constructor(nodeUrl = DEFAULT_NODE_URL) {
    this.defaultNodeUrl = nodeUrl.replace(/\/$/, '');
  }

  /**
   * Health check and diagnostics for local Snapchain Read Node or Hubble hub
   */
  async checkHealth(nodeUrl = this.defaultNodeUrl): Promise<NodeHealthResult> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${cleanUrl}/v1/info?dbstats=1`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          isOnline: false,
          latencyMs,
          url: cleanUrl,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        isOnline: true,
        latencyMs,
        url: cleanUrl,
        version: data.version || data.hubVersion || 'Snapchain Read Node',
        isSyncing: data.isSyncing ?? false,
        peerCount: data.peerCount || data.numPeers || 0,
        numMessages: data.dbStats?.numMessages || 0,
        numFidRegistrations: data.dbStats?.numFidRegistrations || 0,
        approxSize: data.dbStats?.approxSize || 0,
      };
    } catch (err: any) {
      // Smart Docker Bridge / Host Gateway fallback probe:
      // If 127.0.0.1 or localhost fails with connection refused, check if host.docker.internal is reachable
      if (
        (cleanUrl.includes('127.0.0.1') || cleanUrl.includes('localhost')) &&
        !cleanUrl.includes('host.docker.internal')
      ) {
        try {
          const dockerHostUrl = cleanUrl
            .replace('127.0.0.1', 'host.docker.internal')
            .replace('localhost', 'host.docker.internal');
          const altRes = await fetch(`${dockerHostUrl}/v1/info?dbstats=1`, {
            signal: AbortSignal.timeout(2000),
            headers: { Accept: 'application/json' },
          });
          if (altRes.ok) {
            const data = await altRes.json();
            this.defaultNodeUrl = dockerHostUrl;
            return {
              isOnline: true,
              latencyMs: Date.now() - startTime,
              url: dockerHostUrl,
              version: data.version || data.hubVersion || 'Snapchain Read Node',
              isSyncing: data.isSyncing ?? false,
              peerCount: data.peerCount || data.numPeers || 0,
              numMessages: data.dbStats?.numMessages || 0,
              numFidRegistrations: data.dbStats?.numFidRegistrations || 0,
              approxSize: data.dbStats?.approxSize || 0,
            };
          }
        } catch {
          // fallback failed, continue to standard offline error
        }
      }

      return {
        isOnline: false,
        latencyMs: Date.now() - startTime,
        url: cleanUrl,
        error:
          err.name === 'AbortError'
            ? 'Connection timed out (10s)'
            : err.message || 'Node unreachable',
      };
    }
  }

  /**
   * Fetch known FIDs from the local Snapchain node
   */
  async getFids(nodeUrl = this.defaultNodeUrl, pageSize = 30): Promise<number[]> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    try {
      const response = await fetch(
        `${cleanUrl}/v1/fids?pageSize=${pageSize}&reverse=true`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!response.ok) return [];
      const data = await response.json();
      if (Array.isArray(data.fids)) {
        return data.fids.map((f: any) => Number(f)).filter((f: number) => !isNaN(f) && f > 0);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Automatically resolve FID from Ethereum Custody Address.
   * 1. Direct query to local Snapchain / Hubble node HTTP API (/v1/onChainIdRegistryEventByAddress)
   * 2. Decentralized on-chain fallback to Optimism IdRegistry contract (idOf)
   */
  async resolveFidByCustodyAddress(
    custodyAddress: string,
    nodeUrl = this.defaultNodeUrl
  ): Promise<number | null> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanAddress = (custodyAddress || '').trim().toLowerCase();
    if (!cleanAddress.startsWith('0x') || cleanAddress.length !== 42) {
      return null;
    }

    // 1. Try local Snapchain / Hubble node endpoint
    try {
      const response = await fetch(
        `${cleanUrl}/v1/onChainIdRegistryEventByAddress?address=${cleanAddress}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const fid = data?.fid || data?.idRegistryEvent?.fid;
        if (typeof fid === 'number' && fid > 0) {
          return fid;
        }
      }
    } catch {
      // Local node might be offline, syncing, or has no on-chain event cache yet
    }

    // 2. Query Optimism Mainnet IdRegistry contract directly via viem
    try {
      const client = createPublicClient({
        chain: optimism,
        transport: http('https://mainnet.optimism.io', { timeout: 6000 }),
      });

      const fidBigInt = await client.readContract({
        address: ID_REGISTRY_ADDRESS,
        abi: ID_REGISTRY_ABI,
        functionName: 'idOf',
        args: [cleanAddress as `0x${string}`],
      });

      const fid = Number(fidBigInt);
      if (fid > 0) {
        return fid;
      }
    } catch (onchainErr) {
      console.warn('Could not query Optimism IdRegistry contract for FID:', onchainErr);
    }

    return null;
  }

  /**
   * Lookup FName proof and FID for a username on the Snapchain node
   */
  async lookupUsername(
    name: string,
    nodeUrl = this.defaultNodeUrl
  ): Promise<{ fid: number; owner: string; name: string } | null> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanName = name.trim().toLowerCase().replace(/^@/, '');
    if (!cleanName) return null;

    try {
      const res = await fetch(
        `${cleanUrl}/v1/userNameProofByName?name=${encodeURIComponent(cleanName)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.fid === 'number') {
          return {
            fid: data.fid,
            owner: data.owner || '',
            name: data.name || cleanName,
          };
        }
      }
    } catch {
      // Local node lookup failed
    }

    // Fallback: Official decentralized FName registry
    try {
      const fnameRes = await fetch(
        `https://fnames.farcaster.xyz/transfers/current?name=${encodeURIComponent(cleanName)}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        }
      );
      if (fnameRes.ok) {
        const fnameData = await fnameRes.json();
        const transfer = fnameData?.transfer;
        if (transfer && typeof transfer.to === 'number') {
          return {
            fid: transfer.to,
            owner: transfer.owner || '',
            name: transfer.username || cleanName,
          };
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Fetch username proofs by FID from the Snapchain node
   */
  async getUserNameProofs(fid: number, nodeUrl = this.defaultNodeUrl): Promise<string | null> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/v1/userNameProofsByFid?fid=${fid}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.proofs) && data.proofs.length > 0) {
          const rawName = data.proofs[0].name;
          if (typeof rawName === 'string') {
            // In protobuf JSON, bytes fields can be base64-encoded
            try {
              const decoded = Buffer.from(rawName, 'base64').toString('utf8');
              if (decoded && /^[a-zA-Z0-9_-]+$/.test(decoded)) {
                return decoded;
              }
            } catch {
              // ignore
            }
            return rawName;
          }
        }
      }
    } catch {
      // Local node lookup failed
    }

    // Fallback: Official decentralized FName registry
    try {
      const fnameRes = await fetch(`https://fnames.farcaster.xyz/transfers/current?fid=${fid}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });
      if (fnameRes.ok) {
        const data = await fnameRes.json();
        if (data?.transfer?.username) {
          return data.transfer.username;
        }
      }
    } catch {
      // ignore
    }

    return null;
  }

  /**
   * Fetch user metadata (Bio, Display Name, PFP, Username, Following, Followers) from the local node
   */
  async getUserProfile(fid: number, nodeUrl = this.defaultNodeUrl): Promise<FarcasterUser> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const profile: FarcasterUser = { fid };

    // Run metadata, following count, and follower count concurrently for sovereign speed
    const [userDataPromise, followsPromise, followersPromise] = await Promise.allSettled([
      // 1. Query local Snapchain node user data
      (async () => {
        try {
          const response = await fetch(`${cleanUrl}/v1/userDataByFid?fid=${fid}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            const data = await response.json();
            const messages = data.messages || [];

            for (const msg of messages) {
              const body = msg.data?.userDataBody || msg.data?.user_data_body || msg.userDataBody;
              if (!body) continue;

              const typeStr = String(body.type || '').toUpperCase();
              if (typeStr === '1' || typeStr === 'USER_DATA_TYPE_PFP' || typeStr === 'PFP') {
                profile.pfpUrl = body.value;
              } else if (typeStr === '2' || typeStr === 'USER_DATA_TYPE_DISPLAY' || typeStr === 'DISPLAY') {
                profile.displayName = body.value;
              } else if (typeStr === '3' || typeStr === 'USER_DATA_TYPE_BIO' || typeStr === 'BIO') {
                profile.bio = body.value;
              } else if (typeStr === '6' || typeStr === 'USER_DATA_TYPE_USERNAME' || typeStr === 'USERNAME') {
                profile.username = body.value;
              }
            }
          }
        } catch (err) {
          console.warn(`Local node user profile lookup for FID ${fid} timed out or failed:`, err);
        }
      })(),

      // 2. Dynamically compute authentic following count directly from local node
      this.getFollowsByFid(fid, cleanUrl, 15),

      // 3. Dynamically compute authentic follower count directly from local node
      this.getFollowersByFid(fid, cleanUrl, 15),
    ]);

    if (followsPromise.status === 'fulfilled' && followsPromise.value) {
      profile.followingCount = followsPromise.value.fids.length;
    } else {
      profile.followingCount = profile.followingCount ?? 0;
    }

    if (followersPromise.status === 'fulfilled' && followersPromise.value) {
      profile.followerCount = followersPromise.value.count;
    } else {
      profile.followerCount = profile.followerCount ?? 0;
    }

    // 2. Check username proofs
    if (!profile.username) {
      const proofName = await this.getUserNameProofs(fid, cleanUrl);
      if (proofName) {
        profile.username = proofName;
        if (!profile.displayName) profile.displayName = proofName;
      }
    }

    // 3. Ensure username is populated via decentralized FName registry if still missing
    if (!profile.username) {
      try {
        const fnameRes = await fetch(`https://fnames.farcaster.xyz/transfers/current?fid=${fid}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
        if (fnameRes.ok) {
          const fnameData = await fnameRes.json();
          const uname = fnameData?.transfer?.username;
          if (uname) {
            profile.username = uname;
            if (!profile.displayName) profile.displayName = uname;
          }
        }
      } catch {
        // ignore
      }
    }

    return profile;
  }

  /**
   * Extract primary wallet address (Ethereum & Solana) directly from the Farcaster protocol:
   * 1. Protocol user data: USER_DATA_PRIMARY_ADDRESS_ETHEREUM (type 11) & USER_DATA_PRIMARY_ADDRESS_SOLANA (type 12)
   * 2. Fallback: First verified Ethereum address in verificationsByFid
   * 3. Fallback: On-chain custody address from onChainEventsByFid (EVENT_TYPE_ID_REGISTER)
   */
  async getPrimaryWalletAddress(
    fid: number,
    nodeUrl = this.defaultNodeUrl
  ): Promise<{
    ethAddress: string | null;
    solAddress: string | null;
    source: 'primary' | 'verification' | null;
  }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    let ethAddress: string | null = null;
    let solAddress: string | null = null;
    let source: 'primary' | 'verification' | null = null;

    try {
      const userRes = await fetch(`${cleanUrl}/v1/userDataByFid?fid=${fid}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (userRes.ok) {
        const data = await userRes.json();
        const messages = data.messages || [];
        for (const msg of messages) {
          const body = msg.data?.userDataBody || msg.data?.user_data_body;
          if (!body) continue;
          const typeStr = String(body.type || '').toUpperCase();
          if (typeStr === '11' || typeStr === 'USER_DATA_PRIMARY_ADDRESS_ETHEREUM') {
            if (body.value && typeof body.value === 'string' && body.value.startsWith('0x')) {
              ethAddress = body.value;
              source = 'primary';
            }
          } else if (typeStr === '12' || typeStr === 'USER_DATA_PRIMARY_ADDRESS_SOLANA') {
            if (body.value) {
              solAddress = body.value;
            }
          }
        }
      }
    } catch {
      // ignore
    }

    // Fallback: First verified Ethereum address
    if (!ethAddress) {
      try {
        const verifRes = await fetch(`${cleanUrl}/v1/verificationsByFid?fid=${fid}`, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        });
        if (verifRes.ok) {
          const data = await verifRes.json();
          const messages = data.messages || [];
          for (const msg of messages) {
            const body = msg.data?.verificationAddAddressBody || msg.data?.verification_add_address_body;
            if (body) {
              const proto = String(body.protocol || '').toUpperCase();
              if (proto === '0' || proto === 'PROTOCOL_ETHEREUM' || proto === 'ETHEREUM') {
                if (body.address && typeof body.address === 'string' && body.address.startsWith('0x')) {
                  ethAddress = body.address;
                  source = 'verification';
                  break;
                }
              }
            }
          }
        }
      } catch {
        // ignore
      }
    }

    return { ethAddress, solAddress, source };
  }

  /**
   * Fetch casts published by an FID directly from the local node,
   * with decentralized fallback to network directory if node returns 0 casts.
   */
  async getCastsByFid(
    fid: number,
    pageSize = 25,
    nodeUrl = this.defaultNodeUrl
  ): Promise<FarcasterCast[]> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');

    try {
      const response = await fetch(
        `${cleanUrl}/v1/castsByFid?fid=${fid}&pageSize=${pageSize}&reverse=true`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const messages = data.messages || [];
        const casts: FarcasterCast[] = [];

        for (const msg of messages) {
          const castBody = msg.data?.castAddBody;
          if (!castBody) continue;

          const hashHex = typeof msg.hash === 'string' ? msg.hash : '0x';
          const farcasterTime = msg.data?.timestamp || 0;
          const unixTimeResult = fromFarcasterTime(farcasterTime);
          const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

          const cast: FarcasterCast = {
            hash: hashHex,
            fid: msg.data.fid,
            text: castBody.text || '',
            timestamp,
            signer: extractSignerHex(msg.signer),
            embeds: (castBody.embeds || []).map((e: any) => ({
              url: e.url,
              castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
            })),
            parentUrl: castBody.parentUrl || castBody.parent_url,
            parentCastId: parseParentCastId(castBody),
            mentions: castBody.mentions,
            reactions: {
              likesCount: 0,
              recastsCount: 0,
              likedByMe: false,
              recastByMe: false,
            },
          };

          const attr = identifyCastClient(cast);
          cast.clientSource = attr.clientName;

          casts.push(cast);
        }

        // Batch resolve cryptographic signer attributions
        if (casts.length > 0) {
          try {
            const attributions = await SignerAttributionService.resolveBatch(casts, cleanUrl);
            for (const c of casts) {
              if (c.signer) {
                const attr = attributions.get(c.signer);
                if (attr) {
                  c.clientFid = attr.clientFid;
                  c.clientType = attr.clientType;
                  c.clientName = attr.clientName;
                  c.clientUsername = attr.clientUsername;
                  c.clientSource = attr.clientName;
                }
              }
            }
          } catch {
            // Keep heuristic clientSource if resolution times out
          }
        }

        return casts;
      }
    } catch {
      // Local node unavailable or query timed out
    }

    return [];
  }

  /**
   * Fetch followed accounts for an FID (links of type 'follow')
   * 100% sovereign: directly queries the local Snapchain node /v1/linksByFid with pageToken pagination.
   * Zero external API dependencies.
   */
  async getFollowsByFid(
    fid: number,
    nodeUrl = this.defaultNodeUrl,
    maxPages = 20
  ): Promise<{ fids: number[]; users: FarcasterUser[] }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const followedFidSet = new Set<number>();
    const userMap = new Map<number, FarcasterUser>();

    try {
      let pageToken: string | undefined = undefined;
      let pages = 0;

      while (pages < maxPages) {
        const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const fetchUrl = `${cleanUrl}/v1/linksByFid?fid=${fid}&link_type=follow&pageSize=100${tokenQuery}`;
        const res = await fetch(fetchUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) break;

        const resData: any = await res.json();
        const messages: any[] = resData.messages || [];
        if (messages.length === 0) break;

        for (const msg of messages) {
          const targetFid = msg.data?.linkBody?.targetFid || msg.data?.link_body?.target_fid;
          if (typeof targetFid === 'number' && targetFid > 0) {
            followedFidSet.add(targetFid);
          }
        }

        pageToken = resData.nextPageToken;
        pages++;
        if (!pageToken) break;
      }
    } catch (err) {
      console.warn(`Local node linksByFid lookup for FID ${fid} failed:`, err);
    }

    const fids = Array.from(followedFidSet);
    const users = Array.from(userMap.values());
    return { fids, users };
  }

  /**
   * Fetch followers for an FID (incoming links of type 'follow')
   * 100% sovereign: directly queries the local Snapchain node /v1/linksByTargetFid with pageToken pagination.
   * Zero external API dependencies.
   */
  async getFollowersByFid(
    targetFid: number,
    nodeUrl = this.defaultNodeUrl,
    maxPages = 20
  ): Promise<{ fids: number[]; count: number }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const followerFidSet = new Set<number>();

    try {
      let pageToken: string | undefined = undefined;
      let pages = 0;

      while (pages < maxPages) {
        const tokenQuery = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';
        const fetchUrl = `${cleanUrl}/v1/linksByTargetFid?target_fid=${targetFid}&link_type=follow&pageSize=100${tokenQuery}`;
        const res = await fetch(fetchUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) break;

        const resData: any = await res.json();
        const messages: any[] = resData.messages || [];
        if (messages.length === 0) break;

        for (const msg of messages) {
          const authorFid = msg.data?.fid;
          if (typeof authorFid === 'number' && authorFid > 0) {
            followerFidSet.add(authorFid);
          }
        }

        pageToken = resData.nextPageToken;
        pages++;
        if (!pageToken) break;
      }
    } catch (err) {
      console.warn(`Local node linksByTargetFid lookup for FID ${targetFid} failed:`, err);
    }

    const fids = Array.from(followerFidSet);
    return { fids, count: fids.length };
  }

  /**
   * Fetch reactions (Likes or Recasts) for an FID directly from the Snapchain Read Node
   */
  async getReactionsByFid(
    fid: number,
    type: 'like' | 'recast',
    pageSize = 30,
    nodeUrl = this.defaultNodeUrl
  ): Promise<ReactionRecord[]> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const snapchainVariant = type === 'like' ? 'Like' : 'Recast';
    const hubbleVariant = type === 'like' ? 1 : 2;

    const urlsToTry = [
      `${cleanUrl}/v1/reactionsByFid?fid=${fid}&reaction_type=${snapchainVariant}&pageSize=${pageSize}&reverse=true`,
      `${cleanUrl}/v1/reactionsByFid?fid=${fid}&reaction_type=${hubbleVariant}&pageSize=${pageSize}&reverse=true`,
    ];

    for (const url of urlsToTry) {
      try {
        const response = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });

        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          const records: ReactionRecord[] = [];
          const seen = new Set<string>();

          for (const msg of messages) {
            if (msg.data?.type && msg.data.type !== 'MESSAGE_TYPE_REACTION_ADD') continue;
            const target = msg.data?.reactionBody?.targetCastId;
            if (!target || !target.hash || !target.fid) continue;

            const cleanHash = target.hash.startsWith('0x') ? target.hash : `0x${target.hash}`;
            if (seen.has(cleanHash)) continue;
            seen.add(cleanHash);

            const farcasterTime = msg.data?.timestamp || 0;
            const unixTimeResult = fromFarcasterTime(farcasterTime);
            const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

            records.push({
              targetFid: Number(target.fid),
              targetHash: cleanHash,
              timestamp,
              type,
            });
          }

          return records;
        }
      } catch {
        // Fallback to next format if any
      }
    }

    return [];
  }

  /**
   * Fetch real-time casts merged into the Snapchain node via /v1/events
   */
  async getLiveEventsCasts(
    pageSize = 50,
    nodeUrl = this.defaultNodeUrl
  ): Promise<FarcasterCast[]> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    try {
      const response = await fetch(`${cleanUrl}/v1/events?reverse=true&pageSize=${pageSize}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return [];

      const data = await response.json();
      const events = data.events || [];
      const casts: FarcasterCast[] = [];

      for (const ev of events) {
        // Look for merged message events
        const msg = ev.mergeMessageBody?.message || ev.merge_message_body?.message;
        if (!msg) continue;

        const castBody = msg.data?.castAddBody || msg.data?.cast_add_body;
        if (!castBody) continue;

        const hashHex = typeof msg.hash === 'string' ? msg.hash : '0x';
        const farcasterTime = msg.data?.timestamp || 0;
        const unixTimeResult = fromFarcasterTime(farcasterTime);
        const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

        const cast: FarcasterCast = {
          hash: hashHex,
          fid: msg.data?.fid || 0,
          text: castBody.text || '',
          timestamp,
          signer: extractSignerHex(msg.signer),
          embeds: (castBody.embeds || []).map((e: any) => ({
            url: e.url,
            castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
          })),
          parentUrl: castBody.parentUrl || castBody.parent_url,
          parentCastId: parseParentCastId(castBody),
          mentions: castBody.mentions,
        };

        const attr = identifyCastClient(cast);
        cast.clientSource = attr.clientName;
        casts.push(cast);
      }

      if (casts.length > 0) {
        try {
          const attributions = await SignerAttributionService.resolveBatch(casts, cleanUrl);
          for (const c of casts) {
            if (c.signer) {
              const attr = attributions.get(c.signer);
              if (attr) {
                c.clientFid = attr.clientFid;
                c.clientType = attr.clientType;
                c.clientName = attr.clientName;
                c.clientUsername = attr.clientUsername;
                c.clientSource = attr.clientName;
              }
            }
          }
        } catch {
          // Keep heuristic
        }
      }

      return casts;
    } catch {
      return [];
    }
  }

  /**
   * Fetch a single cast by FID and Hash directly from the local node
   */
  async getCastById(
    fid: number,
    hashHex: string,
    nodeUrl = this.defaultNodeUrl
  ): Promise<FarcasterCast | null> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanHash = hashHex.startsWith('0x') ? hashHex : `0x${hashHex}`;

    let nodeCast: FarcasterCast | null = null;

    try {
      const response = await fetch(
        `${cleanUrl}/v1/castById?fid=${fid}&hash=${cleanHash}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (response.ok) {
        const msg = await response.json();
        const castBody = msg.data?.castAddBody;
        if (castBody) {
          const farcasterTime = msg.data?.timestamp || 0;
          const unixTimeResult = fromFarcasterTime(farcasterTime);
          const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

          const cast: FarcasterCast = {
            hash: cleanHash,
            fid: msg.data?.fid || fid,
            text: castBody.text || '',
            timestamp,
            signer: extractSignerHex(msg.signer),
            embeds: (castBody.embeds || []).map((e: any) => ({
              url: e.url,
              castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
            })),
            parentUrl: castBody.parentUrl || castBody.parent_url,
            parentCastId: parseParentCastId(castBody),
            mentions: castBody.mentions,
            reactions: {
              likesCount: 0,
              recastsCount: 0,
              likedByMe: false,
              recastByMe: false,
            },
          };

          const attr = identifyCastClient(cast);
          cast.clientSource = attr.clientName;

          if (cast.signer) {
            try {
              const details = await SignerAttributionService.resolveSigner(cast.fid, cast.signer, cleanUrl);
              if (details) {
                cast.clientFid = details.clientFid;
                cast.clientType = details.clientType;
                cast.clientName = details.clientName;
                cast.clientUsername = details.clientUsername;
                cast.clientSource = details.clientName;
              }
            } catch {
              // fallback
            }
          }

          nodeCast = cast;
        }
      }
    } catch {
      // Local node unavailable
    }

    if (nodeCast) return nodeCast;
    return null;
  }

  /**
   * Fetch replies to a cast by parent FID and parent Hash
   */
  async getCastsByParent(
    parentFid: number,
    parentHashHex: string,
    pageSize = 30,
    nodeUrl = this.defaultNodeUrl
  ): Promise<FarcasterCast[]> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanHash = parentHashHex.startsWith('0x') ? parentHashHex : `0x${parentHashHex}`;

    try {
      const response = await fetch(
        `${cleanUrl}/v1/castsByParent?fid=${parentFid}&hash=${cleanHash}&pageSize=${pageSize}&reverse=true`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (!response.ok) return [];

      const data = await response.json();
      const messages = data.messages || [];
      const replies: FarcasterCast[] = [];

      for (const msg of messages) {
        const castBody = msg.data?.castAddBody;
        if (!castBody) continue;

        const hash = typeof msg.hash === 'string' ? msg.hash : '0x';
        const farcasterTime = msg.data?.timestamp || 0;
        const unixTimeResult = fromFarcasterTime(farcasterTime);
        const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

        const replyCast: FarcasterCast = {
          hash,
          fid: msg.data?.fid || 0,
          text: castBody.text || '',
          timestamp,
          signer: extractSignerHex(msg.signer),
          embeds: (castBody.embeds || []).map((e: any) => ({
            url: e.url,
            castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
          })),
          parentCastId: { fid: parentFid, hash: cleanHash },
        };

        const attr = identifyCastClient(replyCast);
        replyCast.clientSource = attr.clientName;
        replies.push(replyCast);
      }

      if (replies.length > 0) {
        try {
          const attributions = await SignerAttributionService.resolveBatch(replies, cleanUrl);
          for (const r of replies) {
            if (r.signer) {
              const attr = attributions.get(r.signer);
              if (attr) {
                r.clientFid = attr.clientFid;
                r.clientType = attr.clientType;
                r.clientName = attr.clientName;
                r.clientUsername = attr.clientUsername;
                r.clientSource = attr.clientName;
              }
            }
          }
        } catch {
          // Keep heuristic
        }
      }

      return replies;
    } catch {
      return [];
    }
  }

  /**
   * Fetch reaction counts (Likes & Recasts) for a specific cast directly from the Snapchain node
   */
  async getReactionsByCast(
    targetFid: number,
    targetHashHex: string,
    pageSize = 100,
    nodeUrl = this.defaultNodeUrl
  ): Promise<{ likesCount: number; recastsCount: number; latestTimestamp: number }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanHash = targetHashHex.startsWith('0x') ? targetHashHex : `0x${targetHashHex}`;

    try {
      const response = await fetch(
        `${cleanUrl}/v1/reactionsByCast?target_fid=${targetFid}&target_hash=${cleanHash}&pageSize=${pageSize}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (!response.ok) {
        return { likesCount: 0, recastsCount: 0, latestTimestamp: 0 };
      }

      const data = await response.json();
      const messages = data.messages || [];
      let likesCount = 0;
      let recastsCount = 0;
      let latestTimestamp = 0;

      for (const msg of messages) {
        if (msg.data?.type && msg.data.type !== 'MESSAGE_TYPE_REACTION_ADD') continue;
        const rType = msg.data?.reactionBody?.type;
        const msgTime = Number(msg.data?.timestamp || 0);
        if (msgTime > latestTimestamp) {
          latestTimestamp = msgTime;
        }

        if (rType === 'REACTION_TYPE_LIKE' || rType === 1 || rType === 'Like') {
          likesCount++;
        } else if (rType === 'REACTION_TYPE_RECAST' || rType === 2 || rType === 'Recast') {
          recastsCount++;
        }
      }

      return { likesCount, recastsCount, latestTimestamp };
    } catch {
      return { likesCount: 0, recastsCount: 0, latestTimestamp: 0 };
    }
  }

  /**
   * Fetch reply count for a specific cast from the Snapchain node
   */
  async getRepliesCountByCast(
    parentFid: number,
    parentHashHex: string,
    nodeUrl = this.defaultNodeUrl
  ): Promise<number> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const cleanHash = parentHashHex.startsWith('0x') ? parentHashHex : `0x${parentHashHex}`;

    try {
      const response = await fetch(
        `${cleanUrl}/v1/castsByParent?fid=${parentFid}&hash=${cleanHash}&pageSize=100`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        }
      );

      if (!response.ok) return 0;
      const data = await response.json();
      return Array.isArray(data.messages) ? data.messages.length : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Publish a cast directly to the local node's mempool via protobuf
   * Supports normal casts, replies (parentCastId), and quote casts (embeds with castId)
   */
  async publishCast(
    fid: number,
    signerPrivateKeyHex: string,
    text: string,
    options?: {
      parentUrl?: string;
      parentCastId?: { fid: number; hash: string };
      embeds?: Array<string | { url?: string; castId?: { fid: number; hash: string } }>;
    },
    nodeUrl = this.defaultNodeUrl
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const privateKeyBytesResult = hexStringToBytes(signerPrivateKeyHex.replace(/^0x/, ''));
      if (privateKeyBytesResult.isErr()) {
        return { success: false, error: 'Invalid private key hex' };
      }

      const signer = new NobleEd25519Signer(privateKeyBytesResult.value);

      // Parse embeds (URLs or Quote Casts)
      const embeds: Array<{ url?: string; castId?: { fid: number; hash: Uint8Array } }> = [];
      for (const item of options?.embeds || []) {
        if (typeof item === 'string') {
          embeds.push({ url: item });
        } else if (item.url) {
          embeds.push({ url: item.url });
        } else if (item.castId) {
          const hashBytesRes = hexStringToBytes(item.castId.hash.replace(/^0x/, ''));
          if (hashBytesRes.isOk()) {
            embeds.push({ castId: { fid: item.castId.fid, hash: hashBytesRes.value } });
          }
        }
      }

      // Parse parentCastId (for replies)
      let parentCastId: { fid: number; hash: Uint8Array } | undefined;
      if (options?.parentCastId) {
        const parentHashRes = hexStringToBytes(options.parentCastId.hash.replace(/^0x/, ''));
        if (parentHashRes.isOk()) {
          parentCastId = { fid: options.parentCastId.fid, hash: parentHashRes.value };
        }
      }

      const castResult = await makeCastAdd(
        {
          text,
          embeds,
          embedsDeprecated: [],
          mentions: [],
          mentionsPositions: [],
          parentUrl: options?.parentUrl,
          parentCastId,
          type: CastType.CAST,
        },
        { fid, network: FarcasterNetwork.MAINNET },
        signer
      );

      if (castResult.isErr()) {
        return { success: false, error: `Failed to construct cast: ${castResult.error.message}` };
      }

      const encodedBytes = Message.encode(castResult.value).finish();
      return await this.submitMessageProtobuf(encodedBytes, nodeUrl);
    } catch (err: any) {
      return { success: false, error: err.message || 'Cast publication failed' };
    }
  }

  /**
   * React (Like or Recast) to a target cast
   */
  async publishReaction(
    fid: number,
    signerPrivateKeyHex: string,
    targetFid: number,
    targetHashHex: string,
    type: 'like' | 'recast',
    isRemove = false,
    nodeUrl = this.defaultNodeUrl
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const privateKeyBytesResult = hexStringToBytes(signerPrivateKeyHex.replace(/^0x/, ''));
      if (privateKeyBytesResult.isErr()) {
        return { success: false, error: 'Invalid private key hex' };
      }

      const signer = new NobleEd25519Signer(privateKeyBytesResult.value);
      const hashBytesResult = hexStringToBytes(targetHashHex.replace(/^0x/, ''));
      if (hashBytesResult.isErr()) {
        return { success: false, error: 'Invalid target hash hex' };
      }

      const reactionType = type === 'like' ? ReactionType.LIKE : ReactionType.RECAST;
      const targetCastId = { fid: targetFid, hash: hashBytesResult.value };

      const makeFn = isRemove ? makeReactionRemove : makeReactionAdd;
      const result = await makeFn(
        { type: reactionType, targetCastId },
        { fid, network: FarcasterNetwork.MAINNET },
        signer
      );

      if (result.isErr()) {
        return { success: false, error: `Reaction failed: ${result.error.message}` };
      }

      const encodedBytes = Message.encode(result.value).finish();
      return await this.submitMessageProtobuf(encodedBytes, nodeUrl);
    } catch (err: any) {
      return { success: false, error: err.message || 'Reaction submission failed' };
    }
  }

  /**
   * Follow or Unfollow a target FID (LinkAdd / LinkRemove with type 'follow')
   */
  async publishFollow(
    fid: number,
    signerPrivateKeyHex: string,
    targetFid: number,
    isRemove = false,
    nodeUrl = this.defaultNodeUrl
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const privateKeyBytesResult = hexStringToBytes(signerPrivateKeyHex.replace(/^0x/, ''));
      if (privateKeyBytesResult.isErr()) {
        return { success: false, error: 'Invalid private key hex' };
      }

      const signer = new NobleEd25519Signer(privateKeyBytesResult.value);
      const makeFn = isRemove ? makeLinkRemove : makeLinkAdd;

      const result = await makeFn(
        {
          type: 'follow',
          targetFid,
        },
        { fid, network: FarcasterNetwork.MAINNET },
        signer
      );

      if (result.isErr()) {
        return { success: false, error: `Follow operation failed: ${result.error.message}` };
      }

      const encodedBytes = Message.encode(result.value).finish();
      return await this.submitMessageProtobuf(encodedBytes, nodeUrl);
    } catch (err: any) {
      return { success: false, error: err.message || 'Follow submission failed' };
    }
  }

  /**
   * Submit raw protobuf bytes strictly to the internal node's /v1/submitMessage.
   * If the initial attempt fails, waits 5 seconds and retries ONCE to the internal node.
   * If it fails again, returns a detailed explanation of the issue (e.g. node sync lag or unreachable).
   */
  private async submitMessageProtobuf(
    encodedBytes: Uint8Array,
    nodeUrl: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const bufferPayload = Buffer.from(
      encodedBytes.buffer,
      encodedBytes.byteOffset,
      encodedBytes.byteLength
    );

    const executePost = async (): Promise<{ ok: boolean; status: number; text: string; hash?: string }> => {
      try {
        const response = await fetch(`${cleanUrl}/v1/submitMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(bufferPayload.length),
          },
          body: bufferPayload as any,
          signal: AbortSignal.timeout(15000),
        });

        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          const hash = result.hash
            ? typeof result.hash === 'string'
              ? result.hash
              : bytesToHexString(result.hash)._unsafeUnwrap()
            : undefined;

          return { ok: true, status: response.status, text: '', hash };
        }

        const text = await response.text();
        return { ok: false, status: response.status, text };
      } catch (err: any) {
        return { ok: false, status: 0, text: err.message || 'Network request failed' };
      }
    };

    // First attempt to internal node
    let attempt = await executePost();
    if (attempt.ok) {
      return { success: true, hash: attempt.hash };
    }

    // Initial failure: Wait 5 seconds and retry ONCE to internal node
    console.warn(`[NodeClient] Initial submitMessage to ${cleanUrl} failed (${attempt.status}: ${attempt.text}). Retrying in 5 seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    attempt = await executePost();
    if (attempt.ok) {
      return { success: true, hash: attempt.hash };
    }

    // Detailed error interpretation for client UI
    let userFriendlyError = '';
    const errText = attempt.text.toLowerCase();

    if (attempt.status === 0) {
      userFriendlyError = `Unable to connect to internal node (${cleanUrl}): Connection failed or timed out. (${attempt.text})`;
    } else if (errText.includes('invalid signer') || errText.includes('validation_failure')) {
      userFriendlyError = `Signer validation failure: Node may be syncing or has not processed key registration event (${attempt.text})`;
    } else if (attempt.status === 502 || attempt.status === 503) {
      userFriendlyError = `Node temporarily unavailable (HTTP ${attempt.status}). Node may be synchronizing blocks.`;
    } else {
      userFriendlyError = `Node rejected submission (${attempt.status}): ${attempt.text}`;
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}

export const defaultNodeClient = new SnapchainNodeClient();
