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
  hasStorage?: boolean;
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
  clientSource?: string; // Identified client: Warpcast, Supercast, Phaver, Direct Snapchain, etc.
  embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>;
  mentions?: number[];
  parentCastId?: {
    fid: number;
    hash: string;
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

export interface ClientFilterConfig {
  mode: ClientFilterMode;
  selectedClients: string[]; // e.g. ['Warpcast', 'Supercast', 'Phaver', 'Herocast']
  keywordFilters: string[];
}
