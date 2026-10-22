import {
  makeKeyAddBody,
  makeKeyAdd,
  ViemLocalEip712Signer,
  NobleEd25519Signer,
  FarcasterNetwork,
  getFarcasterTime,
  Message,
} from '@farcaster/core';
import { toAccount } from 'viem/accounts';
import {
  deriveCustodyFromMnemonic,
  getCustodyFromPrivateKey,
  generateEd25519KeyPair,
  deriveDeterministicEd25519KeyPair,
  getEd25519KeyPairFromPrivateKey,
} from './crypto';
import { ActiveSigner, GaslessSignerConfig } from './types';

// Canonical 12 message scopes accepted across Snapchain consensus nodes
export const STANDARD_SNAPCHAIN_KEY_SCOPES = [
  1,  // MESSAGE_TYPE_CAST_ADD
  2,  // MESSAGE_TYPE_CAST_REMOVE
  3,  // MESSAGE_TYPE_REACTION_ADD
  4,  // MESSAGE_TYPE_REACTION_REMOVE
  5,  // MESSAGE_TYPE_LINK_ADD
  6,  // MESSAGE_TYPE_LINK_REMOVE
  7,  // MESSAGE_TYPE_VERIFICATION_ADD_ETH_ADDRESS
  8,  // MESSAGE_TYPE_VERIFICATION_REMOVE
  11, // MESSAGE_TYPE_USER_DATA_ADD
  12, // MESSAGE_TYPE_USERNAME_PROOF
  13, // MESSAGE_TYPE_FRAME_ACTION
  14, // MESSAGE_TYPE_LINK_COMPACT_STATE
];

/**
 * Manage Gasless Signer / App Key registration
 *
 * Ground Truth (Cast 3): Since Engine V16, Snapchain supports gasless signers.
 * The signer is registered by submitting a KEY_ADD message to a node,
 * authorized by an EIP-712 signature from the FID's custody address.
 * Zero Optimism ETH or onchain transactions are required!
 */
export class GaslessSignerManager {
  /**
   * Fetch current user nonce from Snapchain node
   */
  static async getCurrentUserNonce(nodeUrl: string, fid: number): Promise<number> {
    try {
      const cleanUrl = nodeUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/v1/signersByFid?fid=${fid}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return 0;
      }

      const data = await response.json();
      return typeof data.currentUserNonce === 'number' ? data.currentUserNonce : 0;
    } catch (err) {
      console.warn('Could not read nonce from node, defaulting to 0:', err);
      return 0;
    }
  }

  /**
   * Issue a gasless app key from a mnemonic seed phrase or private key
   */
  static async issueGaslessSigner(config: GaslessSignerConfig & { explicitSignerPrivateKey?: string }): Promise<{
    signer: ActiveSigner;
    keyAddMessage: Message;
    encodedBytes: Uint8Array;
  }> {
    const {
      fid,
      custodyPrivateKey,
      scopes = STANDARD_SNAPCHAIN_KEY_SCOPES,
      ttlSeconds = 7776000, // 90 days default matching fc key-add standard
      nodeUrl,
      explicitSignerPrivateKey,
    } = config;

    // 1. Setup Custody Account
    const custodyAccount = custodyPrivateKey.startsWith('0x')
      ? getCustodyFromPrivateKey(custodyPrivateKey as `0x${string}`)
      : deriveCustodyFromMnemonic(custodyPrivateKey);

    // 2. Obtain Ed25519 App Key: explicit, deterministic from mnemonic, or fresh
    const keyPair = explicitSignerPrivateKey
      ? getEd25519KeyPairFromPrivateKey(explicitSignerPrivateKey)
      : !custodyPrivateKey.startsWith('0x')
      ? deriveDeterministicEd25519KeyPair(custodyPrivateKey)
      : generateEd25519KeyPair();

    const edSigner = new NobleEd25519Signer(keyPair.privateKey);

    // 3. Get current nonce from local node
    const currentNonce = await this.getCurrentUserNonce(nodeUrl, fid);
    const nextNonce = currentNonce + 1;

    // 4. Calculate Farcaster deadline (1 hour from now)
    const farcasterNow = getFarcasterTime()._unsafeUnwrap();
    const deadline = farcasterNow + 3600;

    // 5. Construct KeyAddBody with EIP-712 custody authorization
    const bodyResult = await makeKeyAddBody(
      {
        fid: BigInt(fid),
        key: keyPair.publicKey,
        scopes: [...scopes] as any,
        ttl: ttlSeconds,
        nonce: nextNonce,
        deadline,
      },
      new ViemLocalEip712Signer(toAccount(custodyAccount))
    );

    if (bodyResult.isErr()) {
      throw new Error(`Failed to generate KeyAdd body: ${bodyResult.error.message}`);
    }

    // 6. Sign the envelope with the new Ed25519 key (Proof of Possession)
    const messageResult = await makeKeyAdd(
      bodyResult.value,
      { fid, network: FarcasterNetwork.MAINNET },
      edSigner
    );

    if (messageResult.isErr()) {
      throw new Error(`Failed to generate signed KEY_ADD message: ${messageResult.error.message}`);
    }

    const keyAddMessage = messageResult.value;
    const encodedBytes = Message.encode(keyAddMessage).finish();

    const signer: ActiveSigner = {
      fid,
      publicKeyHex: keyPair.publicKeyHex,
      privateKeyHex: keyPair.privateKeyHex,
      createdAt: farcasterNow,
      expiresAt: farcasterNow + ttlSeconds,
      nonce: nextNonce,
      isGasless: true,
    };

    return {
      signer,
      keyAddMessage,
      encodedBytes,
    };
  }

  /**
   * Submit the encoded KEY_ADD message to the local node with resilient
   * network coordinator broadcast to guarantee validator mempool ingestion.
   */
  static async submitKeyAddToNode(
    nodeUrl: string,
    encodedBytes: Uint8Array
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    const bufferPayload = Buffer.from(
      encodedBytes.buffer,
      encodedBytes.byteOffset,
      encodedBytes.byteLength
    );

    const targetUrls = [
      nodeUrl.replace(/\/$/, ''),
      'https://iris.farcaster.xyz:3381',
    ];

    let lastError = '';
    let successHash: string | undefined;

    for (const url of targetUrls) {
      try {
        const response = await fetch(`${url}/v1/submitMessage`, {
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
          successHash = result.hash || successHash;
          // Successfully ingested into mempool
        } else {
          const text = await response.text();
          lastError = `Node ${url} rejected KEY_ADD (${response.status}): ${text}`;
        }
      } catch (err: any) {
        lastError = err.message || `Failed to submit KEY_ADD to ${url}`;
      }
    }

    if (successHash) {
      return { success: true, hash: successHash };
    }

    return {
      success: false,
      error: lastError || 'Failed to broadcast KEY_ADD to network validators',
    };
  }
}
