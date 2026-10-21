import { NextResponse } from 'next/server';
import { deriveCustodyFromMnemonic, validateMnemonic } from '@/lib/farcaster/crypto';
import { GaslessSignerManager } from '@/lib/farcaster/gasless-signer';
import { feedStore } from '@/lib/farcaster/feed-store';
import { UserSession } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mnemonic, fid, nodeUrl } = body;

    if (!mnemonic?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Mnemonic seed phrase is required' },
        { status: 400 }
      );
    }

    const cleanMnemonic = mnemonic.trim();
    const validation = validateMnemonic(cleanMnemonic);
    if (!validation.isValid) {
      return NextResponse.json(
        { status: 'error', error: validation.error || 'Invalid mnemonic' },
        { status: 400 }
      );
    }

    // 1. Derive Custody Account
    const custodyAccount = deriveCustodyFromMnemonic(cleanMnemonic);
    const custodyAddress = custodyAccount.address;

    // 2. Resolve FID (if user didn't enter one, derive a stable deterministic or test FID)
    let userFid = fid ? parseInt(fid, 10) : 0;
    if (!userFid || isNaN(userFid)) {
      // Deterministically derive a virtual FID from the address checksum
      const hexSub = custodyAddress.slice(2, 8);
      userFid = 100000 + (parseInt(hexSub, 16) % 899999);
    }

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 3. Issue Gasless Ed25519 Signer via EIP-712 from Custody Address
    const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
      fid: userFid,
      custodyPrivateKey: cleanMnemonic,
      nodeUrl: targetNodeUrl,
    });

    // 4. Submit signed KEY_ADD to Snapchain node mempool
    const nodeSubmission = await GaslessSignerManager.submitKeyAddToNode(targetNodeUrl, encodedBytes);

    // 5. Look up existing profile or construct profile
    let profile = await feedStore.getUser(userFid, targetNodeUrl);
    if (!profile) {
      profile = {
        fid: userFid,
        username: `user_${userFid}`,
        displayName: `FID ${userFid}`,
        custodyAddress,
        pfpUrl: `https://avatar.vercel.sh/${custodyAddress}`,
        bio: 'Sovereign Farcaster Client User',
      };
      feedStore.registerUser(profile);
    } else {
      profile.custodyAddress = custodyAddress;
    }

    const session: UserSession = {
      fid: userFid,
      username: profile.username || `user_${userFid}`,
      displayName: profile.displayName || `FID ${userFid}`,
      pfpUrl: profile.pfpUrl || `https://avatar.vercel.sh/${custodyAddress}`,
      custodyAddress,
      activeSignerKey: signer.publicKeyHex,
      signerPrivateKey: signer.privateKeyHex,
      expiresAt: signer.expiresAt,
      isSandbox: false,
    };

    return NextResponse.json({
      status: 'ok',
      success: true,
      user: session,
      signerHash: nodeSubmission.hash,
      nodeGossipStatus: nodeSubmission.success ? 'SUBMITTED_MEMPOOL' : 'OFFLINE_READY',
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Login failed' },
      { status: 500 }
    );
  }
}
