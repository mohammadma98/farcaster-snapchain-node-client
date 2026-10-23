'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Coins,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { UserSession } from '@/lib/farcaster/types';

export interface WalletToken {
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

interface WalletCardProps {
  session: UserSession | null;
  nodeUrl: string;
}

export function WalletCard({ session, nodeUrl }: WalletCardProps) {
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [baseUsd, setBaseUsd] = useState<number>(0);
  const [ethUsd, setEthUsd] = useState<number>(0);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [addressSource, setAddressSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Demo preview state when user is not logged in
  const [demoFid, setDemoFid] = useState<number | null>(null);

  const activeFid = session?.fid || demoFid;

  const fetchWalletData = useCallback(
    async (targetFid?: number | null, customAddress?: string | null) => {
      if (!targetFid && !customAddress) {
        setTokens([]);
        setTotalUsd(0);
        setResolvedAddress(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams();
        if (customAddress) {
          queryParams.set('address', customAddress);
        } else if (targetFid) {
          queryParams.set('fid', String(targetFid));
        }
        queryParams.set('nodeUrl', nodeUrl);

        const res = await fetch(`/api/wallet/tokens?${queryParams.toString()}`);
        const data = await res.json();

        if (data.status === 'ok') {
          setTokens(data.tokens || []);
          setTotalUsd(data.totalUsd || 0);
          setBaseUsd(data.baseUsd || 0);
          setEthUsd(data.ethUsd || 0);
          setResolvedAddress(data.address || null);
          setAddressSource(data.addressSource || null);
        } else if (data.status === 'no_address') {
          setTokens([]);
          setTotalUsd(0);
          setResolvedAddress(null);
          setError('No primary Ethereum address found for this account.');
        } else {
          setError(data.message || 'Unable to load wallet balances.');
        }
      } catch (err: any) {
        setError(err.message || 'Network error fetching wallet data.');
      } finally {
        setIsLoading(false);
      }
    },
    [nodeUrl]
  );

  useEffect(() => {
    if (session?.fid) {
      setDemoFid(null);
      fetchWalletData(session.fid);
    } else if (demoFid) {
      fetchWalletData(demoFid);
    } else {
      setTokens([]);
      setTotalUsd(0);
      setResolvedAddress(null);
    }
  }, [session?.fid, demoFid, fetchWalletData]);

  const handleCopyAddress = () => {
    if (!resolvedAddress) return;
    navigator.clipboard.writeText(resolvedAddress);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const formatShortAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatAmount = (num: number) => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
    if (num < 0.001) return '<0.001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatUsd = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3.5 transition-all duration-200 hover:shadow-sm">
      {/* 1. Header (Line 1: Your Wallet, Line 2: Read-only mode) */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-500/10 shadow-xs">
              <Wallet className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">Your Wallet</h3>
          </div>
          <div className="pl-9">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Read-only mode
            </span>
          </div>
        </div>

        {/* Action button */}
        {(activeFid || resolvedAddress) && (
          <button
            onClick={() => fetchWalletData(activeFid, resolvedAddress)}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-700' : ''}`} />
          </button>
        )}
      </div>

      {/* 2. Body State: Not Logged In & No Demo */}
      {!session && !demoFid && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3.5 text-center space-y-2.5">
          <p className="text-xs text-slate-600 leading-relaxed">
            Log in to automatically view your Farcaster <span className="font-semibold text-slate-800">Primary Wallet</span> balances on Base & Ethereum.
          </p>
          <div className="pt-1 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Or Instant Demo Preview:
            </span>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDemoFid(5650)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700 shadow-2xs transition-all"
              >
                @vitalik.eth
              </button>
              <button
                onClick={() => setDemoFid(3)}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-purple-300 hover:text-purple-700 shadow-2xs transition-all"
              >
                @dwr
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 rounded-xl bg-slate-100" />
          <div className="space-y-2">
            <div className="h-9 rounded-lg bg-slate-100" />
            <div className="h-9 rounded-lg bg-slate-100" />
          </div>
        </div>
      )}

      {/* 4. Error Message */}
      {!isLoading && error && (activeFid || resolvedAddress) && (
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-center space-y-1">
          <p className="text-xs text-amber-800 font-medium">{error}</p>
          {demoFid && (
            <button
              onClick={() => setDemoFid(null)}
              className="text-[11px] text-amber-700 underline font-semibold hover:text-amber-900"
            >
              Reset demo
            </button>
          )}
        </div>
      )}

      {/* 5. Wallet Content (Loaded) */}
      {!isLoading && resolvedAddress && (
        <div className="space-y-3">
          {/* Address Bar */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
              <span>{formatShortAddress(resolvedAddress)}</span>
              {addressSource === 'primary' && (
                <span className="text-[9px] bg-purple-100 text-purple-700 font-semibold px-1 rounded font-sans">
                  Primary
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyAddress}
                className="p-1 hover:bg-slate-200/80 rounded transition-colors text-slate-500 hover:text-slate-800"
                title="Copy address"
              >
                {hasCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <a
                href={`https://basescan.org/address/${resolvedAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:bg-slate-200/80 rounded transition-colors text-slate-500 hover:text-slate-800"
                title="View on BaseScan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Total Net Worth Banner */}
          <div className="rounded-xl bg-linear-to-br from-slate-900 via-slate-800 to-purple-950 p-3.5 text-white shadow-xs">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-medium tracking-wide">Total Balance</span>
              <span className="text-[10px] text-purple-300 font-mono bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-700/30">
                Base + ETH
              </span>
            </div>
            <div className="text-2xl font-black tracking-tight text-white pt-1">
              {formatUsd(totalUsd)}
            </div>

            {/* Network breakdown pills */}
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500 shadow-xs" />
                <span>Base: <strong className="text-white font-semibold">{formatUsd(baseUsd)}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-400 shadow-xs" />
                <span>ETH: <strong className="text-white font-semibold">{formatUsd(ethUsd)}</strong></span>
              </div>
            </div>
          </div>

          {/* Tokens List Header */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Coins className="h-3.5 w-3.5 text-purple-700" />
              <span>Assets &gt; $1.00</span>
              <span className="rounded-full bg-purple-50 px-1.5 py-0.2 text-[10px] font-semibold text-purple-700 border border-purple-200/60">
                {tokens.length}
              </span>
            </div>

            {tokens.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 font-medium transition-colors"
              >
                {isExpanded ? (
                  <>
                    <span>Collapse</span>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    <span>Expand</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tokens List */}
          {tokens.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center text-xs text-slate-500">
              No digital assets with balance over $1.00 found.
            </div>
          ) : isExpanded ? (
            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {tokens.map((token) => (
                <div
                  key={`${token.networkId}-${token.id}`}
                  className="flex items-center justify-between pt-1.5 first:pt-0 hover:bg-slate-50/80 p-1.5 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Token Logo */}
                    {token.logoUrl ? (
                      <img
                        src={token.logoUrl}
                        alt={token.symbol}
                        className="h-6 w-6 rounded-full bg-slate-100 object-cover shrink-0 border border-slate-200/70"
                        onError={(e) => {
                          // Fallback to initial letter
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200/70">
                        {token.symbol.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {token.symbol}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${
                            token.network === 'Base'
                              ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                              : 'bg-purple-50 text-purple-700 border-purple-200/60'
                          }`}
                        >
                          {token.network}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {formatAmount(token.amount)}
                      </div>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-900">
                      {formatUsd(token.usdValue)}
                    </div>
                    {token.price > 0 && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        ${token.price < 0.01 ? token.price.toExponential(2) : token.price.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Demo reset footer */}
          {demoFid && !session && (
            <div className="pt-1 text-center">
              <button
                onClick={() => setDemoFid(null)}
                className="text-[11px] text-purple-700 font-semibold hover:underline"
              >
                Close demo preview
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
