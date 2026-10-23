import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { isPostgresAvailable } from '@/lib/db/pool';
import { initDatabaseSchema } from '@/lib/db/schema';
import { UserRepository } from '@/lib/db/repositories';

export const dynamic = 'force-dynamic';

interface RabbyRawToken {
  id: string;
  chain: string;
  name: string;
  symbol: string;
  display_symbol?: string | null;
  optimized_symbol?: string;
  decimals: number;
  logo_url?: string | null;
  price: number;
  amount: number;
  is_verified?: boolean;
}

export interface WalletTokenItem {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl: string | null;
  amount: number;
  price: number;
  usdValue: number;
  network: 'Ethereum' | 'Base';
  networkId: 'eth' | 'base';
}

async function fetchTokensForChain(
  address: string,
  chainId: 'eth' | 'base'
): Promise<WalletTokenItem[]> {
  const url = `https://api.rabby.io/v1/user/token_list?id=${address}&chain_id=${chainId}&is_all=false`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn(`Rabby API returned ${res.status} for ${chainId}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const networkName = chainId === 'base' ? 'Base' : 'Ethereum';

    const items: WalletTokenItem[] = [];
    for (const t of data as RabbyRawToken[]) {
      const amount = Number(t.amount) || 0;
      const price = Number(t.price) || 0;
      const usdValue = amount * price;

      // Filter only tokens with balance >= $1.00 USD
      if (usdValue >= 1.0) {
        items.push({
          id: t.id,
          name: t.name || t.symbol || 'Token',
          symbol: t.display_symbol || t.optimized_symbol || t.symbol || '???',
          decimals: t.decimals ?? 18,
          logoUrl: t.logo_url || null,
          amount,
          price,
          usdValue,
          network: networkName,
          networkId: chainId,
        });
      }
    }

    return items;
  } catch (err: any) {
    console.warn(`Failed fetching tokens for ${chainId}:`, err.message);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let address = searchParams.get('address')?.trim();
  const fidParam = searchParams.get('fid');
  const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

  let addressSource: 'provided' | 'primary' | 'verification' | null = address ? 'provided' : null;

  // 1. Resolve Primary Address if FID is provided and address is missing
  if (!address && fidParam) {
    const fid = parseInt(fidParam, 10);
    if (!isNaN(fid) && fid > 0) {
      // Step A: Check intermediate PostgreSQL database first
      const hasDb = await isPostgresAvailable();
      if (hasDb) {
        try {
          await initDatabaseSchema();
          const dbUser = await UserRepository.getUserByFid(fid);
          if (dbUser?.primaryAddress && /^0x[a-fA-F0-9]{40}$/.test(dbUser.primaryAddress)) {
            address = dbUser.primaryAddress;
            addressSource = 'primary';
          }
        } catch (dbErr: any) {
          console.warn('[DB] Failed reading primary_address from users table:', dbErr.message);
        }
      }

      // Step B: If not in DB, query Farcaster protocol node and persist to PostgreSQL
      if (!address) {
        try {
          const walletInfo = await defaultNodeClient.getPrimaryWalletAddress(fid, nodeUrl);
          if (walletInfo.ethAddress) {
            address = walletInfo.ethAddress;
            addressSource = walletInfo.source;

            // Persist primary address into PostgreSQL users table
            if (hasDb && address) {
              try {
                await UserRepository.updatePrimaryAddress(fid, address);
              } catch (saveErr: any) {
                console.warn('[DB] Failed saving primary_address to users table:', saveErr.message);
              }
            }
          }
        } catch (e: any) {
          console.warn('Error resolving primary wallet from node:', e.message);
        }
      }
    }
  }

  // If no primary or verified wallet address found (strictly NO custody address fallback)
  if (!address) {
    return NextResponse.json(
      {
        status: 'no_address',
        message: 'Primary wallet address not detected. Please try again later.',
        tokens: [],
        totalUsd: 0,
      },
      { status: 200 }
    );
  }

  // Validate Ethereum hex address
  const cleanAddress = address.toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(cleanAddress)) {
    return NextResponse.json(
      {
        status: 'invalid_address',
        message: 'Provided address is not a valid 42-character Ethereum address.',
        tokens: [],
        totalUsd: 0,
      },
      { status: 400 }
    );
  }

  try {
    // 2. Fetch both Ethereum and Base concurrently
    const [ethTokens, baseTokens] = await Promise.all([
      fetchTokensForChain(cleanAddress, 'eth'),
      fetchTokensForChain(cleanAddress, 'base'),
    ]);

    const allTokens = [...ethTokens, ...baseTokens].sort((a, b) => b.usdValue - a.usdValue);

    const baseUsd = baseTokens.reduce((sum, t) => sum + t.usdValue, 0);
    const ethUsd = ethTokens.reduce((sum, t) => sum + t.usdValue, 0);
    const totalUsd = baseUsd + ethUsd;

    return NextResponse.json(
      {
        status: 'ok',
        address: cleanAddress,
        addressSource,
        totalUsd: Number(totalUsd.toFixed(2)),
        baseUsd: Number(baseUsd.toFixed(2)),
        ethUsd: Number(ethUsd.toFixed(2)),
        tokenCount: allTokens.length,
        tokens: allTokens,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'error',
        message: err.message || 'Failed to fetch wallet token balances',
        tokens: [],
        totalUsd: 0,
      },
      { status: 500 }
    );
  }
}
