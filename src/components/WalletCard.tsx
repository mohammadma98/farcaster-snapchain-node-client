'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Eye,
  EyeOff,
  QrCode,
  ArrowDownLeft,
  Sparkles,
  Layers,
  Lock,
  X,
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
  onOpenAuthModal?: () => void;
}

export function WalletCard({ session, onOpenAuthModal }: WalletCardProps) {
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [totalUsd, setTotalUsd] = useState<number>(0);
  const [baseUsd, setBaseUsd] = useState<number>(0);
  const [ethUsd, setEthUsd] = useState<number>(0);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [addressSource, setAddressSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isMasked, setIsMasked] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'base' | 'eth'>('all');
  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);

  // Restore privacy mask preference from localStorage
  useEffect(() => {
    try {
      const savedPrivacy = localStorage.getItem('farcaster_wallet_masked');
      if (savedPrivacy !== null) {
        setIsMasked(savedPrivacy === 'true');
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const toggleMask = () => {
    setIsMasked((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('farcaster_wallet_masked', String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const fetchWalletData = useCallback(async () => {
    if (!session?.fid) {
      setTokens([]);
      setTotalUsd(0);
      setResolvedAddress(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set('fid', String(session.fid));
      if (session.custodyAddress) {
        queryParams.set('fallbackAddress', session.custodyAddress);
      }

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
        setError('No primary EVM address found for this account.');
      } else {
        setError(data.message || 'Unable to load wallet balances.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching wallet data.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.fid, session?.custodyAddress]);

  useEffect(() => {
    if (session?.fid) {
      fetchWalletData();
    } else {
      setTokens([]);
      setTotalUsd(0);
      setResolvedAddress(null);
      setError(null);
    }
  }, [session?.fid, fetchWalletData]);

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
    if (isMasked) return '$••••••';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    if (activeFilter === 'base') return tokens.filter((t) => t.networkId === 'base');
    if (activeFilter === 'eth') return tokens.filter((t) => t.networkId === 'eth');
    return tokens;
  }, [tokens, activeFilter]);

  const baseCount = useMemo(() => tokens.filter((t) => t.networkId === 'base').length, [tokens]);
  const ethCount = useMemo(() => tokens.filter((t) => t.networkId === 'eth').length, [tokens]);

  const basePercentage = useMemo(() => {
    if (totalUsd <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((baseUsd / totalUsd) * 100)));
  }, [baseUsd, totalUsd]);

  const ethPercentage = useMemo(() => {
    if (totalUsd <= 0) return 0;
    return 100 - basePercentage;
  }, [basePercentage, totalUsd]);

  // Top 3 tokens for compact preview stack
  const previewTokens = useMemo(() => tokens.slice(0, 3), [tokens]);

  // 1. Unauthenticated / Guest View
  if (!session) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/80 p-4 shadow-xl text-white">
        {/* Subtle background ambient lights */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-600/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-600/15 blur-2xl" />

        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Web3 Vault
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700/60">
              <Lock className="h-2.5 w-2.5 text-slate-400" />
              Locked
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/60 p-3.5 text-center space-y-2.5">
            <p className="text-xs text-slate-400 leading-relaxed">
              Connect your Farcaster account to inspect your Base &amp; Ethereum holdings in real-time.
            </p>
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 px-3 text-xs shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Connect Identity</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 shadow-xl text-white space-y-3.5 transition-all">
      {/* Specular top sheen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
      {/* Background ambient glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-purple-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-12 -bottom-12 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />

      {/* HEADER SECTION */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-800/30 text-purple-300 ring-1 ring-purple-400/25 shadow-inner">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Web3 Vault
              </h3>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Privacy Eye */}
          <button
            onClick={toggleMask}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            title={isMasked ? 'Reveal balances' : 'Hide balances'}
          >
            {isMasked ? (
              <EyeOff className="h-3.5 w-3.5 text-purple-400" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Receive QR Toggle */}
          {resolvedAddress && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800/80 transition-colors"
              title="Receive assets & QR code"
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Refresh balance */}
          <button
            onClick={() => fetchWalletData()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800/80 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* SKELETON LOADING STATE */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-800/60" />
          <div className="h-9 rounded-xl bg-slate-800/40" />
          <div className="h-14 rounded-xl bg-slate-800/40" />
        </div>
      )}

      {/* ERROR STATE */}
      {!isLoading && error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-center space-y-1.5">
          <p className="text-xs text-amber-300 font-medium">{error}</p>
          <button
            onClick={() => fetchWalletData()}
            className="text-[11px] text-amber-400 underline font-semibold hover:text-amber-300"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* MAIN CONTENT (Loaded) */}
      {!isLoading && !error && resolvedAddress && (
        <div className="relative space-y-3">
          {/* NET WORTH CARD */}
          <div className="rounded-xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/40 p-3.5 space-y-2.5 shadow-inner">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium tracking-wide">Net Portfolio Value</span>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/25">
                Base + Mainnet
              </span>
            </div>

            {/* Total Balance Amount */}
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight text-white font-mono">
                {formatUsd(totalUsd)}
              </div>
            </div>

            {/* Chain Allocation Bar */}
            {totalUsd > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${basePercentage}%` }}
                    className="bg-blue-500 h-full transition-all duration-500"
                    title={`Base: ${basePercentage}%`}
                  />
                  <div
                    style={{ width: `${ethPercentage}%` }}
                    className="bg-purple-500 h-full transition-all duration-500"
                    title={`Ethereum: ${ethPercentage}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span>
                      Base <strong className="text-slate-200 font-mono">{formatUsd(baseUsd)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    <span>
                      ETH <strong className="text-slate-200 font-mono">{formatUsd(ethUsd)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ADDRESS STRIP */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>{formatShortAddress(resolvedAddress)}</span>
              {addressSource === 'primary' && (
                <span className="rounded bg-purple-500/20 px-1 py-0.2 text-[9px] font-semibold text-purple-300 border border-purple-500/30">
                  Primary
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyAddress}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copy full EVM address"
              >
                {hasCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <a
                href={`https://basescan.org/address/${resolvedAddress}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="View on BaseScan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* ASSETS ACCORDION & LIST */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Coins className="h-3.5 w-3.5 text-purple-400" />
                <span>Tokens</span>
                <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] font-mono text-purple-300 border border-slate-700">
                  {tokens.length}
                </span>
              </div>

              {tokens.length > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  <span>{isExpanded ? 'Collapse' : 'Details'}</span>
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>

            {/* Collapsed Compact State: Shows overlapping token avatars */}
            {!isExpanded && tokens.length > 0 && (
              <div
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/40 p-2 hover:bg-slate-800/40 cursor-pointer transition-all group"
              >
                <div className="flex items-center">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {previewTokens.map((token) => (
                      <div
                        key={token.id}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-slate-900 bg-slate-800 overflow-hidden shrink-0"
                      >
                        {token.logoUrl ? (
                          <img
                            src={token.logoUrl}
                            alt={token.symbol}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-slate-300">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="pl-2.5 text-[11px] font-medium text-slate-300 group-hover:text-purple-300 transition-colors">
                    {tokens.length} {tokens.length === 1 ? 'asset' : 'assets'} detected
                  </span>
                </div>
                <span className="text-[10px] font-medium text-purple-400 group-hover:underline">
                  View breakdown →
                </span>
              </div>
            )}

            {/* Zero Assets State */}
            {tokens.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-3 text-center space-y-1">
                <p className="text-xs text-slate-400">No assets &gt; $1.00 found</p>
                <p className="text-[10px] text-slate-500">
                  Transfer Base ETH or ERC-20 to this address to monitor here.
                </p>
              </div>
            )}

            {/* Expanded Asset List with Network Filter */}
            {isExpanded && tokens.length > 0 && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[10px] font-medium">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'all'
                        ? 'bg-purple-600 text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({tokens.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('base')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'base'
                        ? 'bg-blue-600 text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Base ({baseCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('eth')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'eth'
                        ? 'bg-purple-700 text-white shadow-xs font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ETH ({ethCount})
                  </button>
                </div>

                {/* Token Items Scrollable List */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/60">
                  {filteredTokens.map((token) => (
                    <div
                      key={`${token.networkId}-${token.id}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Token Logo with Chain Indicator Badge */}
                        <div className="relative shrink-0">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl}
                              alt={token.symbol}
                              className="h-7 w-7 rounded-full bg-slate-800 object-cover border border-slate-700/80"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 border border-slate-700/80">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-950 ${
                              token.network === 'Base' ? 'bg-blue-400' : 'bg-purple-400'
                            }`}
                            title={token.network}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {token.symbol}
                            </span>
                            <span
                              className={`text-[8px] font-semibold px-1 py-0.2 rounded border ${
                                token.network === 'Base'
                                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                  : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                              }`}
                            >
                              {token.network}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {formatAmount(token.amount)}
                          </div>
                        </div>
                      </div>

                      {/* Token Value */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-slate-100 font-mono">
                          {formatUsd(token.usdValue)}
                        </div>
                        {token.price > 0 && !isMasked && (
                          <div className="text-[9px] text-slate-400 font-mono">
                            ${token.price < 0.01 ? token.price.toExponential(2) : token.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredTokens.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">
                      No assets found for the selected network filter.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIVE ASSETS POPUP MODAL */}
      {showReceiveModal && resolvedAddress && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-white space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Receive Assets</h4>
                  <p className="text-[11px] text-slate-400">Base &amp; Ethereum (EVM)</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code Frame */}
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    resolvedAddress
                  )}&bgcolor=ffffff&color=0f172a&margin=4`}
                  alt="Wallet QR Code"
                  className="h-40 w-40 object-contain"
                />
              </div>
              <span className="text-[11px] text-slate-400">
                Scan with any Web3 wallet (Rainbow, Coinbase, Metamask)
              </span>
            </div>

            {/* Address Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Your Primary EVM Address
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/80 p-2.5">
                <span className="font-mono text-xs text-purple-300 break-all select-all pr-2">
                  {resolvedAddress}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors shrink-0"
                  title="Copy address"
                >
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Note & Close button */}
            <div className="pt-1">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-slate-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
