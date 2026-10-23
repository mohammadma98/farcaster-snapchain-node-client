/**
 * Farcaster Snapchain Protocol Types
 * MIT License
 */

export interface SnapchainInfo {
  dbStats?: {
    numMessages: number;
    numFidRegistrations: number;
    approxSize: number;
  };
  numShards?: number;
  shardInfos?: Array<{
    shardId: number;
    maxHeight: number;
    numMessages: number;
    numFidRegistrations: number;
    approxSize: number;
  }>;
  version?: string;
  isSyncing?: boolean;
  blockDelay?: number;
}

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  custodyAddress?: string;
  primaryAddress?: string;
  hasStorage?: boolean;
  followerCount?: number;
  followingCount?: number;
}

export interface FarcasterCast {
  hash: string;
  fid: number;
  text: string;
  timestamp: number;
  author?: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  clientSource?: string; // Identified client: Warpcast, Supercast, Phaver, Self-registered, etc.
  signer?: string; // Ed25519 public key hex of the signer
  clientFid?: number; // requestFid from key registration
  clientType?: 'known' | 'personal' | 'other'; // Client category
  clientName?: string; // Display name of client: Warpcast, Supercast, Self-registered, @username, etc.
  clientUsername?: string; // Client account username
  embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>;
  mentions?: number[];
  parentCastId?: {
    fid: number;
    hash: string;
  };
  parentAuthor?: {
    fid: number;
    username?: string;
    displayName?: string;
  };
  parentUrl?: string;
  reactions?: {
    likesCount: number;
    recastsCount: number;
    likedByMe?: boolean;
    recastByMe?: boolean;
  };
  repliesCount?: number;
}

export interface UserSession {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress: string;
  activeSignerKey: string;
  signerPrivateKey: string;
  expiresAt: number;
  isSandbox?: boolean;
  bio?: string;
  followerCount?: number;
  followingCount?: number;
}

import { MessageType } from '@farcaster/core';

export interface GaslessSignerConfig {
  fid: number;
  custodyPrivateKey: string; // 0x-prefixed Ethereum private key derived from seed phrase
  scopes?: MessageType[] | readonly MessageType[]; // Message types permitted
  ttlSeconds?: number; // Sliding window TTL (max 90 days = 7776000s)
  nodeUrl: string; // Default: http://localhost:3381
}

export interface ActiveSigner {
  fid: number;
  publicKeyHex: string;
  privateKeyHex: string;
  createdAt: number;
  expiresAt: number;
  nonce: number;
  isGasless: boolean;
}

export type ClientFilterMode = 'all' | 'include' | 'exclude';

export type ClientCategory = 'known' | 'personal' | 'other';

export interface ClientAttributionDetails {
  signer: string;
  userFid: number;
  clientFid: number;
  clientType: ClientCategory;
  clientName: string;
  clientUsername?: string;
  badgeColor?: string;
}

export interface KnownClientEntry {
  fid: number;
  name: string;
  username: string;
  brandColor: string;
  iconUrl?: string;
}

export interface ClientFilterConfig {
  mode: ClientFilterMode;
  selectedClients: string[]; // e.g. ['Warpcast', 'Supercast', 'Phaver', 'Herocast']
  keywordFilters: string[];
}

/**
 * Check if a cast is a reply to another cast.
 * Top-level / root casts have no parent cast.
 */
export function isReplyCast(cast?: Partial<FarcasterCast> | null): boolean {
  if (!cast) return false;
  const rawParentHash = (cast as any).parent_hash || (cast as any).parentHash;
  if (rawParentHash && rawParentHash !== '0x' && String(rawParentHash).trim() !== '') {
    return true;
  }
  if (cast.parentCastId) {
    const h = cast.parentCastId.hash;
    const f = cast.parentCastId.fid;
    if (h && h !== '0x' && String(h).trim() !== '') return true;
    if (f && Number(f) > 0) return true;
  }
  const rawSnake = (cast as any).parent_cast_id;
  if (rawSnake) {
    const h = rawSnake.hash;
    const f = rawSnake.fid;
    if (h && h !== '0x' && String(h).trim() !== '') return true;
    if (f && Number(f) > 0) return true;
  }
  if (cast.parentUrl && (cast.parentUrl.startsWith('farcaster://casts/') || cast.parentUrl.includes('/0x'))) {
    return true;
  }
  return false;
}

/**
 * Check if a cast is a root / top-level cast (not a reply)
 */
export function isRootCast(cast?: Partial<FarcasterCast> | null): boolean {
  return !isReplyCast(cast);
}

