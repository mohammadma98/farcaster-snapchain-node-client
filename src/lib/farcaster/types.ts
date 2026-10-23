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
