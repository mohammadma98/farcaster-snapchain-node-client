import { NextResponse } from 'next/server';
import { generateDevMnemonic, deriveCustodyFromMnemonic } from '@/lib/farcaster/crypto';
import { GaslessSignerManager } from '@/lib/farcaster/gasless-signer';
import { feedStore } from '@/lib/farcaster/feed-store';
import { UserSession } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeUrl = searchParams.get('nodeUrl') || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 1. Generate fresh BIP-39 mnemonic
    const devMnemonic = generateDevMnemonic();
    const custody = deriveCustodyFromMnemonic(devMnemonic);

    // 2. Assign unique test FID
    const testFid = 900000 + Math.floor(Math.random() * 99999);

    // 3. Issue gasless Ed25519 signer
    const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
      fid: testFid,
      custodyPrivateKey: devMnemonic,
      nodeUrl,
    });

    // 4. Submit KEY_ADD to node
    await GaslessSignerManager.submitKeyAddToNode(nodeUrl, encodedBytes);

    const devProfile = {
      fid: testFid,
      username: `dev_${testFid}`,
      displayName: `Dev Builder #${testFid}`,
      pfpUrl: `https://avatar.vercel.sh/${custody.address}`,
      bio: 'Sovereign developer test account running on local Snapchain node.',
      custodyAddress: custody.address,
    };

    feedStore.registerUser(devProfile);

    const session: UserSession = {
      fid: testFid,
      username: devProfile.username,
      displayName: devProfile.displayName,
      pfpUrl: devProfile.pfpUrl,
      custodyAddress: custody.address,
      activeSignerKey: signer.publicKeyHex,
      signerPrivateKey: signer.privateKeyHex,
      expiresAt: signer.expiresAt,
      isSandbox: true,
    };

    return NextResponse.json({
      status: 'ok',
      success: true,
      mnemonic: devMnemonic,
      user: session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to create sandbox account' },
      { status: 500 }
    );
  }
}
