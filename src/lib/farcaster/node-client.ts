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
import { FarcasterCast, FarcasterUser, SnapchainInfo } from './types';
import { identifyCastClient } from './client-filter';

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

export class SnapchainNodeClient {
  private defaultNodeUrl: string;

  constructor(nodeUrl = 'http://127.0.0.1:3381') {
    this.defaultNodeUrl = nodeUrl.replace(/\/$/, '');
  }

  /**
   * Health check and diagnostics for any Snapchain Read Node or Hubble hub
   */
  async checkHealth(nodeUrl = this.defaultNodeUrl): Promise<NodeHealthResult> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      return {
        isOnline: false,
        latencyMs: Date.now() - startTime,
        url: cleanUrl,
        error: err.name === 'AbortError' ? 'Connection timed out (6s)' : (err.message || 'Node unreachable'),
      };
    }
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
          signal: AbortSignal.timeout(3000),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data && typeof data.fid === 'number') {
        return {
          fid: data.fid,
          owner: data.owner || '',
          name: data.name || cleanName,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch user metadata (Bio, Display Name, PFP, Username) from the local node
   */
  async getUserProfile(fid: number, nodeUrl = this.defaultNodeUrl): Promise<FarcasterUser> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');
    const profile: FarcasterUser = { fid };

    try {
      const response = await fetch(`${cleanUrl}/v1/userDataByFid?fid=${fid}`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) return profile;

      const data = await response.json();
      const messages = data.messages || [];

      for (const msg of messages) {
        const body = msg.data?.userDataBody;
        if (!body) continue;

        // USER_DATA_TYPE_PFP = 1, DISPLAY = 2, BIO = 3, USERNAME = 6
        if (body.type === 1 || body.type === 'USER_DATA_TYPE_PFP') profile.pfpUrl = body.value;
        if (body.type === 2 || body.type === 'USER_DATA_TYPE_DISPLAY') profile.displayName = body.value;
        if (body.type === 3 || body.type === 'USER_DATA_TYPE_BIO') profile.bio = body.value;
        if (body.type === 6 || body.type === 'USER_DATA_TYPE_USERNAME') profile.username = body.value;
      }
    } catch (err) {
      console.warn(`Could not load user profile for FID ${fid}:`, err);
    }

    return profile;
  }

  /**
   * Fetch casts published by an FID directly from the local node
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
          signal: AbortSignal.timeout(4000),
        }
      );

      if (!response.ok) return [];

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
          embeds: (castBody.embeds || []).map((e: any) => ({
            url: e.url,
            castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
          })),
          parentUrl: castBody.parentUrl,
          parentCastId: castBody.parentCastId,
          mentions: castBody.mentions,
        };

        // Annotate client attribution
        const attr = identifyCastClient(cast);
        cast.clientSource = attr.clientName;

        casts.push(cast);
      }

      return casts;
    } catch (err) {
      console.warn(`Could not load casts for FID ${fid}:`, err);
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

    try {
      const response = await fetch(
        `${cleanUrl}/v1/castById?fid=${fid}&hash=${cleanHash}`,
        {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(3000),
        }
      );

      if (!response.ok) return null;

      const msg = await response.json();
      const castBody = msg.data?.castAddBody;
      if (!castBody) return null;

      const farcasterTime = msg.data?.timestamp || 0;
      const unixTimeResult = fromFarcasterTime(farcasterTime);
      const timestamp = unixTimeResult.isOk() ? unixTimeResult.value : Date.now();

      const cast: FarcasterCast = {
        hash: cleanHash,
        fid: msg.data?.fid || fid,
        text: castBody.text || '',
        timestamp,
        embeds: (castBody.embeds || []).map((e: any) => ({
          url: e.url,
          castId: e.castId ? { fid: e.castId.fid, hash: e.castId.hash } : undefined,
        })),
        parentUrl: castBody.parentUrl,
        parentCastId: castBody.parentCastId,
        mentions: castBody.mentions,
      };

      const attr = identifyCastClient(cast);
      cast.clientSource = attr.clientName;
      return cast;
    } catch {
      return null;
    }
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
          signal: AbortSignal.timeout(3000),
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

      return replies;
    } catch {
      return [];
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
   * Submit raw protobuf bytes to the node's /v1/submitMessage
   */
  private async submitMessageProtobuf(
    encodedBytes: Uint8Array,
    nodeUrl: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    const cleanUrl = nodeUrl.replace(/\/$/, '');

    try {
      const response = await fetch(`${cleanUrl}/v1/submitMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encodedBytes as any,
        signal: AbortSignal.timeout(4000),
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Node rejected message (${response.status}): ${text}` };
      }

      const result = await response.json().catch(() => ({}));
      const hash = result.hash ? (typeof result.hash === 'string' ? result.hash : bytesToHexString(result.hash)._unsafeUnwrap()) : undefined;

      return { success: true, hash };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network submission error' };
    }
  }
}

export const defaultNodeClient = new SnapchainNodeClient();
