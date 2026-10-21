import { NextResponse } from 'next/server';
import { deriveCustodyFromMnemonic, validateMnemonic } from '@/lib/farcaster/crypto';
import { GaslessSignerManager } from '@/lib/farcaster/gasless-signer';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';
import { UserSession } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mnemonic, usernameOrFid, fid, nodeUrl } = body;

    if (!mnemonic?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Mnemonic seed phrase (12 or 24 words) is required' },
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

    // 1. Derive Custody Account from seed phrase
    const custodyAccount = deriveCustodyFromMnemonic(cleanMnemonic);
    const custodyAddress = custodyAccount.address;

    const targetNodeUrl = nodeUrl || process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // 2. Resolve FID: Automatically from Custody Address, or via optional manual override
    let userFid = 0;
    let resolvedUsername = '';

    const identifierInput = (usernameOrFid || fid || '').trim();

    if (identifierInput) {
      const cleanInput = identifierInput.replace(/^@/, '');
      const parsedNum = parseInt(cleanInput, 10);

      if (!isNaN(parsedNum) && String(parsedNum) === cleanInput) {
        // Direct numeric FID provided
        userFid = parsedNum;
      } else {
        // Username provided - resolve via FName Registry on Snapchain node
        const proof = await defaultNodeClient.lookupUsername(cleanInput, targetNodeUrl);
        if (proof && proof.fid) {
          userFid = proof.fid;
          resolvedUsername = proof.name;
        } else {
          return NextResponse.json(
            {
              status: 'error',
              error: `Could not find Farcaster account for username '@${cleanInput}' on the Snapchain node. Please verify spelling or enter your numeric FID.`,
            },
            { status: 404 }
          );
        }
      }
    } else {
      // Automatic resolution from Custody Address (Warpcast standard flow)
      const detectedFid = await defaultNodeClient.resolveFidByCustodyAddress(custodyAddress, targetNodeUrl);
      if (detectedFid && detectedFid > 0) {
        userFid = detectedFid;
      } else {
        return NextResponse.json(
          {
            status: 'error',
            error: `No registered Farcaster account was found on the network for this custody address (${custodyAddress}). Make sure you are using your official 24-word Farcaster/Warpcast seed phrase, or create a Sandbox Dev Account for local testing.`,
          },
          { status: 404 }
        );
      }
    }

    // 3. Issue Gasless Ed25519 Signer via EIP-712 from Custody Address
    const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
      fid: userFid,
      custodyPrivateKey: cleanMnemonic,
      nodeUrl: targetNodeUrl,
    });

    // 4. Submit signed KEY_ADD to Snapchain node mempool
    const nodeSubmission = await GaslessSignerManager.submitKeyAddToNode(targetNodeUrl, encodedBytes);

    // 5. Fetch authentic user profile from the node
    const nodeProfile = await defaultNodeClient.getUserProfile(userFid, targetNodeUrl);
    const profile = {
      fid: userFid,
      username: nodeProfile.username || resolvedUsername || `user_${userFid}`,
      displayName: nodeProfile.displayName || resolvedUsername || `FID ${userFid}`,
      pfpUrl: nodeProfile.pfpUrl || `https://avatar.vercel.sh/${custodyAddress}`,
      bio: nodeProfile.bio || 'Farcaster user on Snapchain',
      custodyAddress,
    };

    feedStore.registerUser(profile);

    const session: UserSession = {
      fid: userFid,
      username: profile.username,
      displayName: profile.displayName,
      pfpUrl: profile.pfpUrl,
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
      nodeSubmissionError: nodeSubmission.error,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Login failed' },
      { status: 500 }
    );
  }
}
