import { mnemonicToAccount, privateKeyToAccount, generatePrivateKey, generateMnemonic, english } from 'viem/accounts';
import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { bytesToHex, hexToBytes, toHex } from 'viem';

// Ensure ed25519 uses sha512
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * Generate a standard 24-word BIP-39 mnemonic seed phrase (256 bits entropy)
 */
export function generateDevMnemonic(): string {
  return generateMnemonic(english, 256);
}

/**
 * Validate mnemonic seed phrase (24 words standard, 12 words accepted)
 */
export function validateMnemonic(mnemonic: string): { isValid: boolean; wordCount: number; error?: string } {
  const clean = mnemonic.trim();
  if (!clean) return { isValid: false, wordCount: 0, error: 'Mnemonic cannot be empty' };
  const words = clean.split(/\s+/);
  const wordCount = words.length;
  if (wordCount !== 24 && wordCount !== 12) {
    return {
      isValid: false,
      wordCount,
      error: `Detected ${wordCount} words. Farcaster recovery phrases require 24 words (standard) or 12 words.`,
    };
  }
  return { isValid: true, wordCount };
}

/**
 * Farcaster Epoch: January 1, 2021 00:00:00 UTC (1609459200 seconds)
 */
export const FARCASTER_EPOCH = 1609459200;

export function getFarcasterTime(): number {
  return Math.floor(Date.now() / 1000) - FARCASTER_EPOCH;
}

export function fromFarcasterTime(time: number): Date {
  return new Date((time + FARCASTER_EPOCH) * 1000);
}

/**
 * Derive Ethereum custody account from 12 or 24 word mnemonic seed phrase
 */
export function deriveCustodyFromMnemonic(mnemonic: string, accountIndex = 0) {
  const cleanMnemonic = mnemonic.trim();
  const words = cleanMnemonic.split(/\s+/);
  if (words.length !== 12 && words.length !== 24) {
    throw new Error(`Invalid mnemonic word count (${words.length}). Must be 12 or 24 words.`);
  }

  const account = mnemonicToAccount(cleanMnemonic, {
    accountIndex,
  });

  return account;
}

/**
 * Create custody account directly from an existing private key (0x-prefixed)
 */
export function getCustodyFromPrivateKey(privateKey: `0x${string}`) {
  return privateKeyToAccount(privateKey);
}

/**
 * Generate a new random Ethereum custody account (for testing and dev environments)
 */
export function generateCustodyAccount() {
  const privateKey = generatePrivateKey() as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    privateKey,
    address: account.address,
  };
}

export interface Ed25519KeyPair {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
  privateKeyHex: string;
  publicKeyHex: string;
}

/**
 * Generate a cryptographically secure Ed25519 keypair for Farcaster App Key
 */
export function generateEd25519KeyPair(): Ed25519KeyPair {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = ed.getPublicKey(privateKey);

  return {
    privateKey,
    publicKey,
    privateKeyHex: bytesToHex(privateKey),
    publicKeyHex: bytesToHex(publicKey),
  };
}

/**
 * Derive a deterministic Ed25519 App Key from a mnemonic seed phrase.
 * Consistent across user sessions without generating random ephemeral keys on every login.
 */
export function deriveDeterministicEd25519KeyPair(mnemonic: string, keyIndex = 0): Ed25519KeyPair {
  const clean = mnemonic.trim().toLowerCase();
  const seed = sha512(new TextEncoder().encode(`farcaster-snapchain-app-signer:${clean}:${keyIndex}`));
  const privateKey = seed.slice(0, 32);
  const publicKey = ed.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    privateKeyHex: bytesToHex(privateKey),
    publicKeyHex: bytesToHex(publicKey),
  };
}

/**
 * Restore an Ed25519 keypair from an existing private key hex string (0x-prefixed or bare hex)
 */
export function getEd25519KeyPairFromPrivateKey(privateKeyHex: string): Ed25519KeyPair {
  const cleanHex = privateKeyHex.trim().replace(/^0x/, '');
  const privateKey = hexToBytes(`0x${cleanHex}`);
  const publicKey = ed.getPublicKey(privateKey);
  return {
    privateKey,
    publicKey,
    privateKeyHex: `0x${cleanHex}`,
    publicKeyHex: bytesToHex(publicKey),
  };
}

/**
 * Sign arbitrary data with an Ed25519 private key
 */
export function signWithEd25519(messageBytes: Uint8Array, privateKey: Uint8Array): Uint8Array {
  return ed.sign(messageBytes, privateKey);
}

/**
 * Verify Ed25519 signature
 */
export function verifyEd25519(signature: Uint8Array, messageBytes: Uint8Array, publicKey: Uint8Array): boolean {
  return ed.verify(signature, messageBytes, publicKey);
}
