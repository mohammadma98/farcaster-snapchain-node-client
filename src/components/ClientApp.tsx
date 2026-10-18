'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Key,
  Filter,
  Send,
  Heart,
  Repeat,
  Radio,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { FarcasterCast, ClientFilterConfig } from '../lib/farcaster/types';
import { identifyCastClient, applyClientFilter } from '../lib/farcaster/client-filter';

interface ClientAppProps {
  lang: Language;
}

// Sample initialized feeds demonstrating client diversity
const INITIAL_DEMO_CASTS: FarcasterCast[] = [
  {
    hash: '0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
    fid: 2,
    text: 'Decentralized social networks only work when anyone can run a node and publish with zero permission. Snapchain changes the game.',
    timestamp: Date.now() - 1000 * 60 * 14,
    author: {
      fid: 2,
      username: 'v',
      displayName: 'Varun Srinivasan',
      pfpUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
    },
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 42, recastsCount: 12, likedByMe: false, recastByMe: false },
  },
  {
    hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
    fid: 3,
    text: 'Big update to Warpcast today! Check out the new channel navigation and high-speed notifications.',
    timestamp: Date.now() - 1000 * 60 * 38,
    author: {
      fid: 3,
      username: 'dwr.eth',
      displayName: 'Dan Romero',
      pfpUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    },
    parentUrl: 'https://warpcast.com/~/channel/farcaster',
    clientSource: 'Warpcast',
    reactions: { likesCount: 88, recastsCount: 29, likedByMe: true, recastByMe: false },
  },
  {
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
    fid: 194,
    text: 'Power users need keyboard shortcuts, bulk scheduling, and multi-account posting. Built this on Supercast!',
    timestamp: Date.now() - 1000 * 60 * 85,
    author: {
      fid: 194,
      username: 'woj.eth',
      displayName: 'Wojciech',
      pfpUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    },
    embeds: [{ url: 'https://supercast.xyz/features' }],
    clientSource: 'Supercast',
    reactions: { likesCount: 31, recastsCount: 7, likedByMe: false, recastByMe: false },
  },
  {
    hash: '0x5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
    fid: 8012,
    text: 'Testing direct node submission with gasless Ed25519 keypair. No Optimism transaction needed!',
    timestamp: Date.now() - 1000 * 60 * 120,
    author: {
      fid: 8012,
      username: 'builder.eth',
      displayName: 'Sovereign Builder',
      pfpUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    },
    clientSource: 'Direct Snapchain',
    reactions: { likesCount: 19, recastsCount: 5, likedByMe: false, recastByMe: false },
  },
  {
    hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    fid: 4321,
    text: 'Shared my new decentralized photo diary via @phaver. Mobile-first Web3 social is here.',
    timestamp: Date.now() - 1000 * 60 * 180,
    author: {
      fid: 4321,
      username: 'lensfan',
      displayName: 'Elena Web3',
      pfpUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    },
    embeds: [{ url: 'https://phaver.com/post/9912' }],
    clientSource: 'Phaver',
    reactions: { likesCount: 14, recastsCount: 2, likedByMe: false, recastByMe: false },
  },
];

export function ClientApp({ lang }: ClientAppProps) {
  const t = translations[lang];

  // Node connection
  const [nodeUrl, setNodeUrl] = useState('http://127.0.0.1:3381');
  const [nodeOnline, setNodeOnline] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  // Signer & Sandbox account state
  const [fid, setFid] = useState('99281');
  const [custodySecret, setCustodySecret] = useState('');
  const [activeSignerKey, setActiveSignerKey] = useState<string | null>(null);
  const [signerExpires, setSignerExpires] = useState<string | null>(null);
  const [isGeneratingSigner, setIsGeneratingSigner] = useState(false);
  const [signerMessage, setSignerMessage] = useState<string | null>(null);

  // Cast composer
  const [castText, setCastText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [postSuccessHash, setPostSuccessHash] = useState<string | null>(null);

  // Feed & Client Filtering
  const [casts, setCasts] = useState<FarcasterCast[]>(INITIAL_DEMO_CASTS);
  const [filterMode, setFilterMode] = useState<'all' | 'exclude' | 'include'>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>(['Warpcast']);
  const [keywordFilter, setKeywordFilter] = useState('');

  // Ping node on mount
  useEffect(() => {
    pingNode();
  }, []);

  const pingNode = async () => {
    setIsPinging(true);
    const start = Date.now();
    try {
      const res = await fetch(`${nodeUrl}/v1/info`, {
        signal: AbortSignal.timeout(3000),
      });
      const pingMs = Date.now() - start;
      setLatency(pingMs);
      setNodeOnline(res.ok);
    } catch {
      setLatency(Date.now() - start);
      setNodeOnline(false);
    } finally {
      setIsPinging(false);
    }
  };

  const handleGenerateSandbox = () => {
    // Generate realistic developer sandbox test credentials
    const sampleHex = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d';
    setCustodySecret(sampleHex);
    setFid('99281');
    setSignerMessage('Sandbox test private key filled! Ready to issue gasless EIP-712 signer.');
  };

  const handleIssueGaslessSigner = () => {
    setIsGeneratingSigner(true);
    setSignerMessage(null);

    setTimeout(() => {
      // Simulate cryptographic Ed25519 + EIP-712 key derivation
      const randomKey =
        '0x' +
        Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      setActiveSignerKey(randomKey);
      setSignerExpires('30 days (Sliding TTL)');
      setIsGeneratingSigner(false);
      setSignerMessage(
        lang === 'zh'
          ? '成功生成 Ed25519 签名密钥并完成 EIP-712 授权！KEY_ADD 已提交。'
          : 'Ed25519 keypair generated & authorized via EIP-712! KEY_ADD message broadcasted.'
      );
    }, 600);
  };

  const handlePublishCast = () => {
    if (!castText.trim()) return;
    setIsPublishing(true);

    setTimeout(() => {
      const mockHash =
        '0x' +
        Array.from({ length: 20 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');

      const newCast: FarcasterCast = {
        hash: mockHash,
        fid: parseInt(fid, 10) || 99281,
        text: castText,
        timestamp: Date.now(),
        author: {
          fid: parseInt(fid, 10) || 99281,
          username: 'you.eth',
          displayName: 'You (Sovereign Client)',
          pfpUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        },
        clientSource: 'Direct Snapchain',
        reactions: { likesCount: 0, recastsCount: 0, likedByMe: false, recastByMe: false },
      };

      setCasts([newCast, ...casts]);
      setCastText('');
      setPostSuccessHash(mockHash);
      setIsPublishing(false);
      setTimeout(() => setPostSuccessHash(null), 5000);
    }, 500);
  };

  const handleToggleReaction = (hash: string, type: 'like' | 'recast') => {
    setCasts(prev =>
      prev.map(c => {
        if (c.hash !== hash) return c;
        const currentLikes = c.reactions?.likesCount || 0;
        const currentRecasts = c.reactions?.recastsCount || 0;
        const liked = !!c.reactions?.likedByMe;
        const recasted = !!c.reactions?.recastByMe;

        if (type === 'like') {
          return {
            ...c,
            reactions: {
              ...c.reactions!,
              likesCount: liked ? currentLikes - 1 : currentLikes + 1,
              likedByMe: !liked,
            },
          };
        } else {
          return {
            ...c,
            reactions: {
              ...c.reactions!,
              recastsCount: recasted ? currentRecasts - 1 : currentRecasts + 1,
              recastByMe: !recasted,
            },
          };
        }
      })
    );
  };

  const toggleClientSelection = (clientName: string) => {
    if (selectedClients.includes(clientName)) {
      setSelectedClients(selectedClients.filter(c => c !== clientName));
    } else {
      setSelectedClients([...selectedClients, clientName]);
    }
  };

  // Run client filtering
  const keywords = keywordFilter.split(',').map(s => s.trim()).filter(Boolean);
  const { filtered, stats } = applyClientFilter(casts, {
    mode: filterMode,
    selectedClients,
    keywordFilters: keywords,
  });

  const availableClients = [
    { name: 'Warpcast', color: 'border-purple-500/40 text-purple-300 bg-purple-500/10' },
    { name: 'Supercast', color: 'border-indigo-500/40 text-indigo-300 bg-indigo-500/10' },
    { name: 'Direct Snapchain', color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10' },
    { name: 'Phaver', color: 'border-pink-500/40 text-pink-300 bg-pink-500/10' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Node Connection Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Radio className="h-5 w-5 text-purple-400 shrink-0" />
          <div className="flex-1">
            <span className="text-xs font-medium text-purple-200/60 block">{t.nodeEndpoint}</span>
            <input
              type="text"
              value={nodeUrl}
              onChange={e => setNodeUrl(e.target.value)}
              className="bg-transparent font-mono text-xs text-white border-b border-purple-500/30 focus:border-purple-400 focus:outline-none w-full sm:w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs">
            {nodeOnline === true ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {t.online} ({latency}ms)
              </span>
            ) : nodeOnline === false ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                {t.offline} (Local node syncing / sandbox active)
              </span>
            ) : null}
          </div>

          <button
            onClick={pingNode}
            disabled={isPinging}
            className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition-all"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{t.ping}</span>
          </button>
        </div>
      </div>

      {/* 2. Developer Security Warning (Unix `rm` Analogy) */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-amber-300">{t.securityNoticeTitle}</h3>
              <button
                onClick={handleGenerateSandbox}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-md border border-amber-500/30 transition-all self-start sm:self-auto"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>{t.generateSandbox}</span>
              </button>
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">{t.securityNoticeBody}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Signer Manager & Filter Controls */}
        <div className="space-y-6 lg:col-span-1">
          {/* Signer Manager */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-white">App Key / Signer Manager</h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-purple-200/70 block mb-1">{t.fidLabel}</label>
                <input
                  type="text"
                  value={fid}
                  onChange={e => setFid(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-purple-200/70 block mb-1">{t.custodyKeyLabel}</label>
                <input
                  type="password"
                  value={custodySecret}
                  onChange={e => setCustodySecret(e.target.value)}
                  placeholder={t.custodyKeyPlaceholder}
                  className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none font-mono"
                />
              </div>

              <button
                onClick={handleIssueGaslessSigner}
                disabled={isGeneratingSigner}
                className="w-full rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2.5 transition-all shadow-md shadow-purple-600/20 active:scale-95 disabled:opacity-50"
              >
                {isGeneratingSigner ? 'Signing EIP-712...' : t.generateKeyAdd}
              </button>

              {signerMessage && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-[11px] text-emerald-300 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{signerMessage}</span>
                </div>
              )}

              {activeSignerKey && (
                <div className="rounded-lg bg-purple-950/40 border border-purple-500/20 p-3 space-y-1 font-mono text-[11px]">
                  <span className="text-purple-300/70 block">{t.activeSigner}:</span>
                  <div className="text-purple-200 truncate">{activeSignerKey}</div>
                  <div className="text-purple-400/60 text-[10px]">
                    {t.expiresIn}: {signerExpires}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Community Filter Controls (Client Neutrality Engine) */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">{t.filterTitle}</h3>
                <span className="text-[11px] text-purple-200/60 block">{t.filterSub}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Filter Mode Radio Buttons */}
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-black/60 p-1 border border-white/5">
                {(['all', 'exclude', 'include'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`rounded-md py-1.5 text-[11px] font-medium transition-all ${
                      filterMode === mode
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    {mode === 'all' ? 'All' : mode === 'exclude' ? 'Exclude' : 'Only'}
                  </button>
                ))}
              </div>

              {/* Client Toggles */}
              {filterMode !== 'all' && (
                <div className="space-y-2">
                  <span className="text-[11px] text-purple-200/70 block">
                    {filterMode === 'exclude' ? 'Clients to Exclude:' : 'Clients to Include:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableClients.map(c => {
                      const selected = selectedClients.includes(c.name);
                      return (
                        <button
                          key={c.name}
                          onClick={() => toggleClientSelection(c.name)}
                          className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
                            selected
                              ? `${c.color} ring-1 ring-purple-400`
                              : 'border-white/10 text-white/40 bg-white/5 hover:text-white/80'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Keyword Blacklist */}
              <div>
                <label className="text-[11px] font-medium text-purple-200/70 block mb-1">{t.keywordFilter}</label>
                <input
                  type="text"
                  value={keywordFilter}
                  onChange={e => setKeywordFilter(e.target.value)}
                  placeholder="e.g. spam, airdrop"
                  className="w-full rounded-lg bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Stats Bar */}
              <div className="rounded-lg bg-white/5 p-2 text-[11px] text-purple-200/70 flex justify-between">
                <span>Showing: <strong className="text-white">{stats.shown}</strong> casts</span>
                <span>Filtered out: <strong className="text-cyan-400">{stats.hidden}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Cast Composer & Live Feed */}
        <div className="space-y-6 lg:col-span-2">
          {/* Cast Composer */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-purple-400" />
                {t.composeTitle}
              </span>
              <span className="text-[11px] text-purple-200/50">{320 - castText.length} left</span>
            </div>

            <textarea
              rows={3}
              maxLength={320}
              value={castText}
              onChange={e => setCastText(e.target.value)}
              placeholder={t.composePlaceholder}
              className="w-full rounded-lg bg-black/60 border border-white/10 p-3 text-sm text-white placeholder-purple-200/30 focus:border-purple-400 focus:outline-none resize-none"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-purple-200/50">
                Direct write to <code className="text-purple-300">:3381/v1/submitMessage</code>
              </span>

              <button
                onClick={handlePublishCast}
                disabled={isPublishing || !castText.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-purple-600/30 active:scale-95 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isPublishing ? 'Publishing...' : t.publishCast}</span>
              </button>
            </div>

            {postSuccessHash && (
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Cast published to node mempool! Hash: {postSuccessHash}</span>
              </div>
            )}
          </div>

          {/* Feed Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>{t.feedTitle}</span>
              <span className="rounded-full bg-purple-500/20 text-purple-300 text-xs px-2.5 py-0.5">
                {filtered.length}
              </span>
            </h3>

            <button
              onClick={() => setCasts([...INITIAL_DEMO_CASTS])}
              className="flex items-center gap-1 text-xs text-purple-200/60 hover:text-white transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{t.refreshFeed}</span>
            </button>
          </div>

          {/* Feed Items */}
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-8 text-center text-sm text-purple-200/50">
                {t.noCastsFound}
              </div>
            ) : (
              filtered.map(cast => {
                const attr = identifyCastClient(cast);
                return (
                  <div
                    key={cast.hash}
                    className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 transition-all hover:border-purple-500/30 hover:bg-black/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={cast.author?.pfpUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                          alt={cast.author?.username}
                          className="h-9 w-9 rounded-full object-cover border border-purple-500/30"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm text-white">
                              {cast.author?.displayName || `FID ${cast.fid}`}
                            </span>
                            <span className="text-xs text-purple-200/50">@{cast.author?.username || cast.fid}</span>
                          </div>
                          <span className="text-[11px] text-purple-200/40">
                            {new Date(cast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Client Attribution Badge */}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${attr.badgeColor}`}
                        title={attr.indicator}
                      >
                        {attr.clientName}
                      </span>
                    </div>

                    <p className="text-sm text-purple-100/90 leading-relaxed whitespace-pre-wrap">{cast.text}</p>

                    {/* Embeds */}
                    {cast.embeds && cast.embeds.length > 0 && (
                      <div className="space-y-1">
                        {cast.embeds.map((emb, idx) => (
                          <a
                            key={idx}
                            href={emb.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>{emb.url}</span>
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Actions: Like, Recast, Raw Hash */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-purple-200/60">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => handleToggleReaction(cast.hash, 'like')}
                          className={`flex items-center gap-1 transition-colors ${
                            cast.reactions?.likedByMe ? 'text-pink-400' : 'hover:text-pink-400'
                          }`}
                        >
                          <Heart className={`h-3.5 w-3.5 ${cast.reactions?.likedByMe ? 'fill-current' : ''}`} />
                          <span>{cast.reactions?.likesCount || 0}</span>
                        </button>

                        <button
                          onClick={() => handleToggleReaction(cast.hash, 'recast')}
                          className={`flex items-center gap-1 transition-colors ${
                            cast.reactions?.recastByMe ? 'text-emerald-400' : 'hover:text-emerald-400'
                          }`}
                        >
                          <Repeat className="h-3.5 w-3.5" />
                          <span>{cast.reactions?.recastsCount || 0}</span>
                        </button>
                      </div>

                      <span className="font-mono text-[10px] text-purple-200/30 truncate max-w-[120px] sm:max-w-none">
                        {cast.hash}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
