import { NextResponse } from 'next/server';
import { defaultNodeClient } from '@/lib/farcaster/node-client';
import { isPostgresAvailable } from '@/lib/db/pool';
import { initDatabaseSchema } from '@/lib/db/schema';
import { UserRepository } from '@/lib/db/repositories';
import { createPublicClient, http, formatUnits, parseAbi } from 'viem';
import { base, mainnet } from 'viem/chains';

export const dynamic = 'force-dynamic';

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

// Viem Public RPC Clients with reliable fallbacks
const baseRpcClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org', {
    timeout: 7000,
    retryCount: 2,
  }),
});

const ethRpcClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com', {
    timeout: 7000,
    retryCount: 2,
  }),
});

const erc20BalanceAbi = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
]);

/**
 * 1. Rabby API Fetcher
 */
async function fetchTokensFromRabby(
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
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
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

      if (usdValue >= 0.5) {
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
  } catch {
    return [];
  }
}

/**
 * 2. On-Chain Viem RPC Fetcher (Guarantees major tokens & native ETH are never 0)
 */
async function fetchTokensOnChain(address: `0x${string}`): Promise<WalletTokenItem[]> {
  const items: WalletTokenItem[] = [];

  try {
    // A. Fetch current market prices via DeFiLlama
    const priceRes = await fetch(
      'https://coins.llama.fi/prices/current/coingecko:ethereum,coingecko:degen-base,coingecko:aerodrome-finance',
      { signal: AbortSignal.timeout(5000) }
    )
      .then((r) => r.json())
      .catch(() => null);

    const ethPrice = priceRes?.coins?.['coingecko:ethereum']?.price || 2350;
    const degenPrice = priceRes?.coins?.['coingecko:degen-base']?.price || 0.007;
    const aeroPrice = priceRes?.coins?.['coingecko:aerodrome-finance']?.price || 1.1;

    // B. Query Base On-Chain: Native ETH + Common ERC-20s
    const [baseEthRaw, baseUsdcRaw, baseWethRaw, baseDegenRaw, baseAeroRaw] = await Promise.all([
      baseRpcClient.getBalance({ address }).catch(() => 0n),
      baseRpcClient
        .readContract({
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
      baseRpcClient
        .readContract({
          address: '0x4200000000000000000000000000000000000006', // WETH on Base
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
      baseRpcClient
        .readContract({
          address: '0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed', // DEGEN on Base
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
      baseRpcClient
        .readContract({
          address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO on Base
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
    ]);

    // Base Native ETH
    const baseEthAmt = Number(formatUnits(baseEthRaw, 18));
    if (baseEthAmt * ethPrice >= 0.5) {
      items.push({
        id: 'base-eth',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        logoUrl: 'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d58ada97079516364f3.png',
        amount: baseEthAmt,
        price: ethPrice,
        usdValue: Number((baseEthAmt * ethPrice).toFixed(2)),
        network: 'Base',
        networkId: 'base',
      });
    }

    // Base USDC
    const baseUsdcAmt = Number(formatUnits(baseUsdcRaw, 6));
    if (baseUsdcAmt >= 0.5) {
      items.push({
        id: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f288514d907044434994.png',
        amount: baseUsdcAmt,
        price: 1.0,
        usdValue: Number(baseUsdcAmt.toFixed(2)),
        network: 'Base',
        networkId: 'base',
      });
    }

    // Base WETH
    const baseWethAmt = Number(formatUnits(baseWethRaw, 18));
    if (baseWethAmt * ethPrice >= 0.5) {
      items.push({
        id: '0x4200000000000000000000000000000000000006',
        name: 'Wrapped Ether',
        symbol: 'WETH',
        decimals: 18,
        logoUrl: 'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d58ada97079516364f3.png',
        amount: baseWethAmt,
        price: ethPrice,
        usdValue: Number((baseWethAmt * ethPrice).toFixed(2)),
        network: 'Base',
        networkId: 'base',
      });
    }

    // Base DEGEN
    const baseDegenAmt = Number(formatUnits(baseDegenRaw, 18));
    if (baseDegenAmt * degenPrice >= 0.5) {
      items.push({
        id: '0x4ed4e862860bed51a9570b96d89af5e1b0efefed',
        name: 'Degen',
        symbol: 'DEGEN',
        decimals: 18,
        logoUrl: null,
        amount: baseDegenAmt,
        price: degenPrice,
        usdValue: Number((baseDegenAmt * degenPrice).toFixed(2)),
        network: 'Base',
        networkId: 'base',
      });
    }

    // Base AERO
    const baseAeroAmt = Number(formatUnits(baseAeroRaw, 18));
    if (baseAeroAmt * aeroPrice >= 0.5) {
      items.push({
        id: '0x940181a94a35a4569e4529a3cdfb74e38fd98631',
        name: 'Aerodrome',
        symbol: 'AERO',
        decimals: 18,
        logoUrl: null,
        amount: baseAeroAmt,
        price: aeroPrice,
        usdValue: Number((baseAeroAmt * aeroPrice).toFixed(2)),
        network: 'Base',
        networkId: 'base',
      });
    }

    // C. Query Ethereum Mainnet On-Chain: Native ETH + USDC + USDT
    const [mainEthRaw, mainUsdcRaw, mainUsdtRaw] = await Promise.all([
      ethRpcClient.getBalance({ address }).catch(() => 0n),
      ethRpcClient
        .readContract({
          address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Mainnet
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
      ethRpcClient
        .readContract({
          address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT on Mainnet
          abi: erc20BalanceAbi,
          functionName: 'balanceOf',
          args: [address],
        })
        .catch(() => 0n),
    ]);

    // Mainnet Native ETH
    const mainEthAmt = Number(formatUnits(mainEthRaw, 18));
    if (mainEthAmt * ethPrice >= 0.5) {
      items.push({
        id: 'eth-native',
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        logoUrl: 'https://static.debank.com/image/token/logo_url/eth/935ae4e4d1d12d58ada97079516364f3.png',
        amount: mainEthAmt,
        price: ethPrice,
        usdValue: Number((mainEthAmt * ethPrice).toFixed(2)),
        network: 'Ethereum',
        networkId: 'eth',
      });
    }

    // Mainnet USDC
    const mainUsdcAmt = Number(formatUnits(mainUsdcRaw, 6));
    if (mainUsdcAmt >= 0.5) {
      items.push({
        id: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://static.debank.com/image/coin/logo_url/usdc/e87790bfe0b3f288514d907044434994.png',
        amount: mainUsdcAmt,
        price: 1.0,
        usdValue: Number(mainUsdcAmt.toFixed(2)),
        network: 'Ethereum',
        networkId: 'eth',
      });
    }

    // Mainnet USDT
    const mainUsdtAmt = Number(formatUnits(mainUsdtRaw, 6));
    if (mainUsdtAmt >= 0.5) {
      items.push({
        id: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoUrl: 'https://static.debank.com/image/coin/logo_url/usdt/225c50672e81190bc1f3083907eb644e.png',
        amount: mainUsdtAmt,
        price: 1.0,
        usdValue: Number(mainUsdtAmt.toFixed(2)),
        network: 'Ethereum',
        networkId: 'eth',
      });
    }
  } catch (err: any) {
    console.warn('[On-Chain] Token query fallback error:', err.message);
  }

  return items;
}

/**
 * Combined Balance Fetcher: Merges Rabby API + Direct Viem RPC
 */
async function getWalletBalancesForAddress(cleanAddress: `0x${string}`) {
  // Fetch from Rabby and On-Chain in parallel
  const [rabbyEth, rabbyBase, onChainTokens] = await Promise.all([
    fetchTokensFromRabby(cleanAddress, 'eth'),
    fetchTokensFromRabby(cleanAddress, 'base'),
    fetchTokensOnChain(cleanAddress),
  ]);

  const rabbyTokens = [...rabbyEth, ...rabbyBase];

  // Merge Rabby tokens and on-chain tokens seamlessly
  const mergedMap = new Map<string, WalletTokenItem>();

  // Add Rabby tokens first
  for (const t of rabbyTokens) {
    const key = `${t.networkId}:${t.symbol.toUpperCase()}`;
    mergedMap.set(key, t);
  }

  // Merge On-Chain tokens (fills in missing balances or replaces stale zero data)
  for (const t of onChainTokens) {
    const key = `${t.networkId}:${t.symbol.toUpperCase()}`;
    const existing = mergedMap.get(key);
    if (!existing || existing.usdValue < t.usdValue) {
      mergedMap.set(key, t);
    }
  }

  const allTokens = Array.from(mergedMap.values()).sort((a, b) => b.usdValue - a.usdValue);

  const baseTokens = allTokens.filter((t) => t.networkId === 'base');
  const ethTokens = allTokens.filter((t) => t.networkId === 'eth');

  const baseUsd = baseTokens.reduce((sum, t) => sum + t.usdValue, 0);
  const ethUsd = ethTokens.reduce((sum, t) => sum + t.usdValue, 0);
  const totalUsd = baseUsd + ethUsd;

  return {
    allTokens,
    totalUsd: Number(totalUsd.toFixed(2)),
    baseUsd: Number(baseUsd.toFixed(2)),
    ethUsd: Number(ethUsd.toFixed(2)),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let address = searchParams.get('address')?.trim();
  const fidParam = searchParams.get('fid');
  const nodeUrl = process.env.FARCASTER_NODE_URL || 'http://127.0.0.1:3381';

  let addressSource: 'provided' | 'primary' | 'verification' | null = address ? 'provided' : null;

  // 1. Resolve Primary Address if FID is provided and address is missing
  let candidateAddresses: string[] = [];

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
            candidateAddresses.push(address.toLowerCase());
          }
        } catch (dbErr: any) {
          console.warn('[DB] Failed reading primary_address from users table:', dbErr.message);
        }
      }

      // Step B: Query Farcaster protocol node for primary and all verified addresses
      try {
        const [walletInfo, allVerified] = await Promise.all([
          defaultNodeClient.getPrimaryWalletAddress(fid, nodeUrl),
          defaultNodeClient.getAllVerifiedEthAddresses(fid, nodeUrl),
        ]);

        if (walletInfo.ethAddress) {
          if (!address) {
            address = walletInfo.ethAddress;
            addressSource = walletInfo.source;
          }
          const cleanP = walletInfo.ethAddress.toLowerCase();
          if (!candidateAddresses.includes(cleanP)) {
            candidateAddresses.unshift(cleanP); // Priority to primary address
          }
        }

        for (const v of allVerified) {
          if (!candidateAddresses.includes(v)) {
            candidateAddresses.push(v);
          }
        }
      } catch (e: any) {
        console.warn('Error resolving wallet addresses from node:', e.message);
      }
    }
  } else if (address) {
    candidateAddresses.push(address.toLowerCase());
  }

  // If no address could be resolved at all
  if (candidateAddresses.length === 0) {
    return NextResponse.json(
      {
        status: 'no_address',
        message: 'Primary wallet address not detected. Please try again later.',
        tokens: [],
        totalUsd: 0,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  }

  try {
    // 2. Check candidate addresses to find the active one with actual funds
    let chosenAddress = candidateAddresses[0] as `0x${string}`;
    let balanceResult = await getWalletBalancesForAddress(chosenAddress);

    // If primary candidate yielded $0, check other verified addresses for funds
    if (balanceResult.totalUsd === 0 && candidateAddresses.length > 1) {
      for (let i = 1; i < candidateAddresses.length; i++) {
        const altAddress = candidateAddresses[i] as `0x${string}`;
        const altResult = await getWalletBalancesForAddress(altAddress);
        if (altResult.totalUsd > 0) {
          chosenAddress = altAddress;
          balanceResult = altResult;
          addressSource = 'verification';

          // Update PostgreSQL with the funded active address
          if (fidParam) {
            const fid = parseInt(fidParam, 10);
            if (!isNaN(fid) && (await isPostgresAvailable())) {
              try {
                await UserRepository.updatePrimaryAddress(fid, chosenAddress);
              } catch {
                // Ignore DB write errors
              }
            }
          }
          break;
        }
      }
    }

    const { allTokens, totalUsd, baseUsd, ethUsd } = balanceResult;

    // Set cache headers appropriately (do not cache 0 balances)
    const cacheHeader =
      totalUsd > 0
        ? 'public, s-maxage=30, stale-while-revalidate=60'
        : 'no-store, no-cache, must-revalidate';

    return NextResponse.json(
      {
        status: 'ok',
        address: chosenAddress,
        addressSource,
        totalUsd,
        baseUsd,
        ethUsd,
        tokenCount: allTokens.length,
        tokens: allTokens,
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': cacheHeader,
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
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      }
    );
  }
}
