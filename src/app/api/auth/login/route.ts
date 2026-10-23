import { NextResponse } from 'next/server';
import { deriveCustodyFromMnemonic, validateMnemonic, getEd25519KeyPairFromPrivateKey } from '@/lib/farcaster/crypto';
import { GaslessSignerManager } from '@/lib/farcaster/gasless-signer';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { feedStore } from '@/lib/farcaster/feed-store';
import { UserSession } from '@/lib/farcaster/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mnemonic, signerPrivateKey, fid } = body;

    const targetNodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

    // Option A: Direct login with an already active / approved Ed25519 signer private key
    if (!mnemonic?.trim() && signerPrivateKey?.trim() && fid) {
      const cleanSignerKey = signerPrivateKey.trim();
      const userFid = Number(fid);
      const keyPair = getEd25519KeyPairFromPrivateKey(cleanSignerKey);

      const nodeProfile = await defaultNodeClient.getUserProfile(userFid, targetNodeUrl);
      const profile = {
        fid: userFid,
        username: nodeProfile.username || `user_${userFid}`,
        displayName: nodeProfile.displayName || `FID ${userFid}`,
        pfpUrl: nodeProfile.pfpUrl || `https://avatar.vercel.sh/${keyPair.publicKeyHex}`,
        bio: nodeProfile.bio || 'Farcaster user on Snapchain',
        custodyAddress: '0x',
        followerCount: nodeProfile.followerCount,
        followingCount: nodeProfile.followingCount,
      };

      feedStore.registerUser(profile);

      const session: UserSession = {
        fid: userFid,
        username: profile.username,
        displayName: profile.displayName,
        pfpUrl: profile.pfpUrl,
        custodyAddress: '0x',
        activeSignerKey: keyPair.publicKeyHex,
        signerPrivateKey: keyPair.privateKeyHex,
        expiresAt: Math.floor(Date.now() / 1000) + 7776000,
        isSandbox: false,
        bio: profile.bio,
        followerCount: profile.followerCount,
        followingCount: profile.followingCount,
      };

      return NextResponse.json({
        status: 'ok',
        success: true,
        user: session,
        nodeGossipStatus: 'SIGNER_READY',
      });
    }

    if (!mnemonic?.trim()) {
      return NextResponse.json(
        { status: 'error', error: 'Farcaster 24-word recovery phrase or existing active App Key is required.' },
        { status: 400 }
      );
    }

    const cleanMnemonic = mnemonic.trim();
    const validation = validateMnemonic(cleanMnemonic);
    if (!validation.isValid) {
      return NextResponse.json(
        { status: 'error', error: validation.error || 'Invalid recovery phrase.' },
        { status: 400 }
      );
    }

    // 1. Derive Custody Account from 24-word recovery phrase (m/44'/60'/0'/0/0)
    const custodyAccount = deriveCustodyFromMnemonic(cleanMnemonic);
    const custodyAddress = custodyAccount.address;

    // 2. Resolve FID accurately from the network (Node onChainIdRegistryEvent + Optimism IdRegistry contract)
    const userFid = await defaultNodeClient.resolveFidByCustodyAddress(custodyAddress, targetNodeUrl);

    if (!userFid || userFid <= 0) {
      return NextResponse.json(
        {
          status: 'error',
          error: `No registered Farcaster account was found on the network for custody address (${custodyAddress}). Please verify that you entered your authentic 24-word Farcaster recovery phrase.`,
        },
        { status: 404 }
      );
    }

    // 3. Issue Gasless Ed25519 Signer via EIP-712 from Custody Address
    const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
      fid: userFid,
      custodyPrivateKey: cleanMnemonic,
      nodeUrl: targetNodeUrl,
      explicitSignerPrivateKey: signerPrivateKey?.trim(),
    });

    // 4. Submit signed KEY_ADD to Snapchain node mempool + validator network
    const nodeSubmission = await GaslessSignerManager.submitKeyAddToNode(targetNodeUrl, encodedBytes);

    // 5. Fetch authentic user profile from the node
    const nodeProfile = await defaultNodeClient.getUserProfile(userFid, targetNodeUrl);
    const profile = {
      fid: userFid,
      username: nodeProfile.username || `user_${userFid}`,
      displayName: nodeProfile.displayName || `FID ${userFid}`,
      pfpUrl: nodeProfile.pfpUrl || `https://avatar.vercel.sh/${custodyAddress}`,
      bio: nodeProfile.bio || 'Farcaster user on Snapchain',
      custodyAddress,
      followerCount: nodeProfile.followerCount,
      followingCount: nodeProfile.followingCount,
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
      bio: profile.bio,
      followerCount: profile.followerCount,
      followingCount: profile.followingCount,
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
