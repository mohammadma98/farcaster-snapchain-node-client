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
        setError('Primary wallet address not detected. Please try again later.');
      } else {
        setError(data.message || 'Primary wallet address not detected. Please try again later.');
      }
    } catch (err: any) {
      setError('Primary wallet address not detected. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [session?.fid]);

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

  // 1. Unauthenticated / Guest View (Light Theme)
  if (!session) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-slate-800 space-y-3 transition-all">
        {/* Subtle background ambient lights */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-50/80 blur-2xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-50/60 blur-2xl" />

        <div className="relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-500/10 shadow-xs">
                <Wallet className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Web3 Vault
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
              <Lock className="h-2.5 w-2.5 text-slate-500" />
              Locked
            </span>
          </div>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-3.5 text-center space-y-2.5">
            <p className="text-xs text-slate-500 leading-relaxed">
              Connect your Farcaster account to inspect your Base &amp; Ethereum holdings in real-time.
            </p>
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold py-2 px-3 text-xs shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

  // 2. Authenticated View (Light Theme)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-slate-800 space-y-3.5 transition-all duration-200 hover:shadow-sm">
      {/* Subtle ambient light glows */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-purple-50/80 blur-2xl" />
      <div className="pointer-events-none absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-blue-50/60 blur-2xl" />

      {/* HEADER SECTION */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-500/10 shadow-xs">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Web3 Vault
              </h3>
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Privacy Eye Toggle */}
          <button
            onClick={toggleMask}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors"
            title={isMasked ? 'Reveal balances' : 'Hide balances'}
          >
            {isMasked ? (
              <EyeOff className="h-3.5 w-3.5 text-purple-700" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Receive QR Toggle */}
          {resolvedAddress && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors"
              title="Receive assets & QR code"
            >
              <QrCode className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Refresh balance */}
          <button
            onClick={() => fetchWalletData()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-purple-700' : ''}`} />
          </button>
        </div>
      </div>

      {/* SKELETON LOADING STATE */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-xl bg-slate-100" />
          <div className="h-9 rounded-xl bg-slate-100" />
          <div className="h-14 rounded-xl bg-slate-100" />
        </div>
      )}

      {/* PRIMARY WALLET NOT DETECTED / ERROR STATE */}
      {!isLoading && (!resolvedAddress || error) && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-center space-y-2">
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Primary wallet address not detected. Please try again later.
          </p>
          <button
            onClick={() => fetchWalletData()}
            className="inline-flex items-center gap-1.5 text-xs text-purple-700 font-semibold hover:text-purple-800 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* MAIN CONTENT (Loaded) */}
      {!isLoading && !error && resolvedAddress && (
        <div className="relative space-y-3">
          {/* NET WORTH CARD (Light Luxe Fintech) */}
          <div className="rounded-xl border border-purple-100/90 bg-gradient-to-br from-purple-50/60 via-white to-slate-50/80 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="font-semibold tracking-wide">Net Portfolio Value</span>
              <span className="rounded-full bg-purple-100/80 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200/70">
                Base + Mainnet
              </span>
            </div>

            {/* Total Balance Amount */}
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black tracking-tight text-slate-900 font-mono">
                {formatUsd(totalUsd)}
              </div>
            </div>

            {/* Chain Allocation Bar */}
            {totalUsd > 0 && (
              <div className="space-y-1.5 pt-0.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${basePercentage}%` }}
                    className="bg-blue-500 h-full transition-all duration-500"
                    title={`Base: ${basePercentage}%`}
                  />
                  <div
                    style={{ width: `${ethPercentage}%` }}
                    className="bg-purple-600 h-full transition-all duration-500"
                    title={`Ethereum: ${ethPercentage}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>
                      Base <strong className="text-slate-800 font-mono">{formatUsd(baseUsd)}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                    <span>
                      ETH <strong className="text-slate-800 font-mono">{formatUsd(ethUsd)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ADDRESS STRIP */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/80 px-2.5 py-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-600 shrink-0" />
              <span>{formatShortAddress(resolvedAddress)}</span>
              {addressSource === 'primary' && (
                <span className="rounded bg-purple-100 px-1 py-0.2 text-[9px] font-semibold text-purple-700 border border-purple-200/70 font-sans">
                  Primary
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyAddress}
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                title="Copy full EVM address"
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
                className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                title="View on BaseScan"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* ASSETS ACCORDION & LIST */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <Coins className="h-3.5 w-3.5 text-purple-700" />
                <span>Tokens</span>
                <span className="rounded-full bg-purple-50 px-1.5 py-0.2 text-[10px] font-mono font-semibold text-purple-700 border border-purple-200/60">
                  {tokens.length}
                </span>
              </div>

              {tokens.length > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
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
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/70 p-2 hover:bg-purple-50/40 hover:border-purple-200/60 cursor-pointer transition-all group"
              >
                <div className="flex items-center">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {previewTokens.map((token) => (
                      <div
                        key={token.id}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60"
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
                          <div className="h-full w-full flex items-center justify-center text-[9px] font-bold text-slate-700">
                            {token.symbol.slice(0, 2)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="pl-2.5 text-[11px] font-medium text-slate-700 group-hover:text-purple-700 transition-colors">
                    {tokens.length} {tokens.length === 1 ? 'asset' : 'assets'} detected
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-purple-700 group-hover:underline">
                  View breakdown →
                </span>
              </div>
            )}

            {/* Zero Assets State */}
            {tokens.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5 text-center">
                <p className="text-xs text-slate-500 font-medium">No assets &gt; $1.00 found</p>
              </div>
            )}

            {/* Expanded Asset List with Network Filter */}
            {isExpanded && tokens.length > 0 && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                {/* Filter Pills */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100/90 border border-slate-200/80 text-[10px] font-medium">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'all'
                        ? 'bg-white text-purple-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    All ({tokens.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('base')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'base'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Base ({baseCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('eth')}
                    className={`flex-1 py-1 rounded-md transition-all ${
                      activeFilter === 'eth'
                        ? 'bg-white text-purple-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    ETH ({ethCount})
                  </button>
                </div>

                {/* Token Items Scrollable List */}
                <div className="max-h-56 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-100">
                  {filteredTokens.map((token) => (
                    <div
                      key={`${token.networkId}-${token.id}`}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50/90 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Token Logo with Chain Indicator Badge */}
                        <div className="relative shrink-0">
                          {token.logoUrl ? (
                            <img
                              src={token.logoUrl}
                              alt={token.symbol}
                              className="h-7 w-7 rounded-full bg-slate-100 object-cover border border-slate-200/80"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200/80">
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                              token.network === 'Base' ? 'bg-blue-500' : 'bg-purple-600'
                            }`}
                            title={token.network}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {token.symbol}
                            </span>
                            <span
                              className={`text-[8px] font-semibold px-1 py-0.2 rounded border ${
                                token.network === 'Base'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                                  : 'bg-purple-50 text-purple-700 border-purple-200/60'
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
                        <div className="text-xs font-bold text-slate-900 font-mono">
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
                    <div className="py-4 text-center text-xs text-slate-400 font-medium">
                      No assets &gt; $1.00 found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIVE ASSETS POPUP MODAL (Light Theme) */}
      {showReceiveModal && resolvedAddress && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl text-slate-900 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 shadow-2xs">
                  <ArrowDownLeft className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Receive Assets</h4>
                  <p className="text-[11px] text-slate-500">Base &amp; Ethereum (EVM)</p>
                </div>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* QR Code Frame */}
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-2xs">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    resolvedAddress
                  )}&bgcolor=ffffff&color=0f172a&margin=4`}
                  alt="Wallet QR Code"
                  className="h-40 w-40 object-contain"
                />
              </div>
              <span className="text-[11px] text-slate-500 text-center">
                Scan with any Web3 wallet (Rainbow, Coinbase, Metamask)
              </span>
            </div>

            {/* Address Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Your Primary EVM Address
              </label>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <span className="font-mono text-xs text-purple-800 break-all select-all pr-2">
                  {resolvedAddress}
                </span>
                <button
                  onClick={handleCopyAddress}
                  className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shrink-0 shadow-2xs"
                  title="Copy address"
                >
                  {hasCopied ? (
                    <Check className="h-4 w-4 text-emerald-600" />
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
                className="w-full rounded-xl bg-purple-700 hover:bg-purple-800 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors"
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
