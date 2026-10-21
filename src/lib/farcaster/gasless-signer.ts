import {
  makeKeyAddBody,
  makeKeyAdd,
  ViemLocalEip712Signer,
  NobleEd25519Signer,
  FarcasterNetwork,
  getFarcasterTime,
  ADMISSIBLE_KEY_ADD_SCOPES,
  Message,
} from '@farcaster/core';
import { toAccount } from 'viem/accounts';
import { deriveCustodyFromMnemonic, getCustodyFromPrivateKey, generateEd25519KeyPair } from './crypto';
import { ActiveSigner, GaslessSignerConfig } from './types';

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
  static async issueGaslessSigner(config: GaslessSignerConfig): Promise<{
    signer: ActiveSigner;
    keyAddMessage: Message;
    encodedBytes: Uint8Array;
  }> {
    const { fid, custodyPrivateKey, scopes = ADMISSIBLE_KEY_ADD_SCOPES, ttlSeconds = 30 * 24 * 3600, nodeUrl } = config;

    // 1. Setup Custody Account
    const custodyAccount = custodyPrivateKey.startsWith('0x')
      ? getCustodyFromPrivateKey(custodyPrivateKey as `0x${string}`)
      : deriveCustodyFromMnemonic(custodyPrivateKey);

    // 2. Generate new Ed25519 App Key
    const keyPair = generateEd25519KeyPair();
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
   * Submit the encoded KEY_ADD message directly to the Snapchain Read Node
   */
  static async submitKeyAddToNode(
    nodeUrl: string,
    encodedBytes: Uint8Array
  ): Promise<{ success: boolean; hash?: string; error?: string }> {
    try {
      const cleanUrl = nodeUrl.replace(/\/$/, '');
      const bufferPayload = Buffer.from(
        encodedBytes.buffer,
        encodedBytes.byteOffset,
        encodedBytes.byteLength
      );

      const response = await fetch(`${cleanUrl}/v1/submitMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(bufferPayload.length),
        },
        body: bufferPayload as any,
        signal: AbortSignal.timeout(25000), // 25s timeout
      });

      if (!response.ok) {
        const text = await response.text();
        return { success: false, error: `Node rejected KEY_ADD (${response.status}): ${text}` };
      }

      const result = await response.json().catch(() => ({}));
      return { success: true, hash: result.hash };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        return {
          success: false,
          error: `Signer submission timed out after 25s. Is your Snapchain node reachable on port 3381?`,
        };
      }
      return { success: false, error: err.message || 'Network error submitting KEY_ADD to node' };
    }
  }
}
