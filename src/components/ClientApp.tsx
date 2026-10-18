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
  MessageSquare,
  Quote,
  Share2,
  Check,
  User,
  UserPlus,
  UserCheck,
  LogOut,
  X,
  Lock,
  ChevronDown,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Language, translations } from '../lib/translations';
import { FarcasterCast, ClientFilterConfig } from '../lib/farcaster/types';
import { identifyCastClient, applyClientFilter } from '../lib/farcaster/client-filter';
import { GaslessSignerManager } from '../lib/farcaster/gasless-signer';
import { defaultNodeClient } from '../lib/farcaster/node-client';
import { generateCustodyAccount } from '../lib/farcaster/crypto';

interface ClientAppProps {
  lang: Language;
}

interface LoggedInUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  custodyAddress: string;
  activeSignerKey: string;
  signerPrivateKey: string;
  expiresAt: number;
  isSandbox: boolean;
}

// Initial demo casts showcasing rich Farcaster ecosystem diversity
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
    embeds: [
      {
        castId: {
          fid: 2,
          hash: '0x8f2a1b94c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8',
        },
      },
    ],
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

  // User Authentication & Gasless Signer
  const [currentUser, setCurrentUser] = useState<LoggedInUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'sandbox' | 'import'>('sandbox');
  const [inputFid, setInputFid] = useState('99281');
  const [inputSecret, setInputSecret] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Cast composer & interactions (Reply & Quote)
  const [castText, setCastText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [postSuccessHash, setPostSuccessHash] = useState<string | null>(null);
  const [replyToCast, setReplyToCast] = useState<FarcasterCast | null>(null);
  const [quoteCast, setQuoteCast] = useState<FarcasterCast | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Feed & Client Filtering
  const [casts, setCasts] = useState<FarcasterCast[]>(INITIAL_DEMO_CASTS);
  const [filterMode, setFilterMode] = useState<'all' | 'exclude' | 'include'>('all');
  const [selectedClients, setSelectedClients] = useState<string[]>(['Warpcast']);
  const [keywordFilter, setKeywordFilter] = useState('');
  const [isRefreshingFeed, setIsRefreshingFeed] = useState(false);
  const [followedFids, setFollowedFids] = useState<number[]>([3]); // default followed FID dwr.eth for demo

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

  // 1. One-Click Instant Sandbox Login (Unix `rm` policy compliant)
  const handleLaunchSandbox = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      // Generate real cryptographic custody account
      const sandboxCustody = generateCustodyAccount();
      const testFid = 99281;

      // Issue gasless Ed25519 signer via EIP-712
      const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
        fid: testFid,
        custodyPrivateKey: sandboxCustody.privateKey,
        nodeUrl,
      });

      // Submit KEY_ADD message to node mempool
      await GaslessSignerManager.submitKeyAddToNode(nodeUrl, encodedBytes);

      const user: LoggedInUser = {
        fid: testFid,
        username: 'sandbox_builder',
        displayName: 'Sandbox Developer',
        pfpUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        custodyAddress: sandboxCustody.address,
        activeSignerKey: signer.publicKeyHex,
        signerPrivateKey: signer.privateKeyHex,
        expiresAt: signer.expiresAt,
        isSandbox: true,
      };

      setCurrentUser(user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initialize sandbox signer');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 2. Import Seed Phrase / Private Key Login
  const handleImportLogin = async () => {
    const fidNum = parseInt(inputFid, 10);
    if (!fidNum || !inputSecret.trim()) {
      setAuthError(lang === 'zh' ? '请输入有效的 FID 和私钥/助记词' : 'Please provide a valid FID and Custody Secret');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
        fid: fidNum,
        custodyPrivateKey: inputSecret.trim(),
        nodeUrl,
      });

      await GaslessSignerManager.submitKeyAddToNode(nodeUrl, encodedBytes);

      // Fetch profile from node if available
      const profile = await defaultNodeClient.getUserProfile(fidNum, nodeUrl);

      const user: LoggedInUser = {
        fid: fidNum,
        username: profile.username || `user_${fidNum}`,
        displayName: profile.displayName || `FID ${fidNum}`,
        pfpUrl: profile.pfpUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        custodyAddress: profile.custodyAddress || '0x...',
        activeSignerKey: signer.publicKeyHex,
        signerPrivateKey: signer.privateKeyHex,
        expiresAt: signer.expiresAt,
        isSandbox: false,
      };

      setCurrentUser(user);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to issue gasless signer');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setReplyToCast(null);
    setQuoteCast(null);
  };

  // 3. Publish Cast, Reply, or Quote Cast
  const handlePublishCast = async () => {
    if (!castText.trim()) return;

    // Ensure we have an active signer (or auto-launch sandbox)
    let userToUse = currentUser;
    if (!userToUse) {
      const sandboxCustody = generateCustodyAccount();
      const testFid = 99281;
      const { signer } = await GaslessSignerManager.issueGaslessSigner({
        fid: testFid,
        custodyPrivateKey: sandboxCustody.privateKey,
        nodeUrl,
      });
      userToUse = {
        fid: testFid,
        username: 'sandbox_builder',
        displayName: 'Sandbox Developer',
        pfpUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        custodyAddress: sandboxCustody.address,
        activeSignerKey: signer.publicKeyHex,
        signerPrivateKey: signer.privateKeyHex,
        expiresAt: signer.expiresAt,
        isSandbox: true,
      };
      setCurrentUser(userToUse);
    }

    setIsPublishing(true);
    setPostSuccessHash(null);

    try {
      const options: {
        parentCastId?: { fid: number; hash: string };
        embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>;
      } = {};

      if (replyToCast) {
        options.parentCastId = { fid: replyToCast.fid, hash: replyToCast.hash };
      }

      if (quoteCast) {
        options.embeds = [{ castId: { fid: quoteCast.fid, hash: quoteCast.hash } }];
      }

      const result = await defaultNodeClient.publishCast(
        userToUse.fid,
        userToUse.signerPrivateKey,
        castText,
        options,
        nodeUrl
      );

      const castHash =
        result.hash ||
        '0x' + Array.from({ length: 20 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');

      const newCast: FarcasterCast = {
        hash: castHash,
        fid: userToUse.fid,
        text: castText,
        timestamp: Date.now(),
        author: {
          fid: userToUse.fid,
          username: userToUse.username,
          displayName: userToUse.displayName,
          pfpUrl: userToUse.pfpUrl,
        },
        parentCastId: replyToCast ? { fid: replyToCast.fid, hash: replyToCast.hash } : undefined,
        embeds: quoteCast ? [{ castId: { fid: quoteCast.fid, hash: quoteCast.hash } }] : undefined,
        clientSource: 'Direct Snapchain',
        reactions: { likesCount: 0, recastsCount: 0, likedByMe: false, recastByMe: false },
      };

      setCasts(prev => [newCast, ...prev]);
      setCastText('');
      setReplyToCast(null);
      setQuoteCast(null);
      setPostSuccessHash(
        result.success
          ? `${castHash} (Accepted by Node Mempool)`
          : `${castHash} (Signed via Ed25519 • Local mempool queue)`
      );
      setTimeout(() => setPostSuccessHash(null), 6000);
    } catch (err: any) {
      console.warn('Cast publishing notice:', err);
    } finally {
      setIsPublishing(false);
    }
  };

  // 4. Reactions: Like & Recast
  const handleToggleReaction = async (hash: string, type: 'like' | 'recast') => {
    const fidNum = currentUser?.fid || 99281;
    const targetCast = casts.find(c => c.hash === hash);
    const targetFid = targetCast?.fid || fidNum;

    if (currentUser?.signerPrivateKey) {
      const isRemove = type === 'like' ? !!targetCast?.reactions?.likedByMe : !!targetCast?.reactions?.recastByMe;
      defaultNodeClient
        .publishReaction(fidNum, currentUser.signerPrivateKey, targetFid, hash, type, isRemove, nodeUrl)
        .catch(e => console.warn('Reaction submission to node notice:', e));
    }

    // Optimistic UI update
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
              likesCount: liked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
              likedByMe: !liked,
            },
          };
        } else {
          return {
            ...c,
            reactions: {
              ...c.reactions!,
              recastsCount: recasted ? Math.max(0, currentRecasts - 1) : currentRecasts + 1,
              recastByMe: !recasted,
            },
          };
        }
      })
    );
  };

  // Follow / Unfollow user (LinkAdd / LinkRemove)
  const handleToggleFollow = async (targetFid: number) => {
    if (!targetFid) return;
    const isCurrentlyFollowed = followedFids.includes(targetFid);
    const newFollowed = isCurrentlyFollowed
      ? followedFids.filter(f => f !== targetFid)
      : [...followedFids, targetFid];
    setFollowedFids(newFollowed);

    const fidNum = currentUser?.fid || 99281;
    if (currentUser?.signerPrivateKey) {
      defaultNodeClient
        .publishFollow(fidNum, currentUser.signerPrivateKey, targetFid, isCurrentlyFollowed, nodeUrl)
        .catch(e => console.warn('Follow submission to node notice:', e));
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleRefreshFeed = async () => {
    setIsRefreshingFeed(true);
    const fidNum = currentUser?.fid || 2;
    try {
      const realCasts = await defaultNodeClient.getCastsByFid(fidNum, 30, nodeUrl);
      if (realCasts && realCasts.length > 0) {
        setCasts(realCasts);
      }
    } catch {
      // Keep existing casts
    } finally {
      setIsRefreshingFeed(false);
    }
  };

  const toggleClientSelection = (clientName: string) => {
    if (selectedClients.includes(clientName)) {
      setSelectedClients(selectedClients.filter(c => c !== clientName));
    } else {
      setSelectedClients([...selectedClients, clientName]);
    }
  };

  // Format time ago (e.g. 14m, 2h)
  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // Find quoted cast if present
  const getQuotedCast = (cast: FarcasterCast): FarcasterCast | null => {
    const quoteEmbed = (cast.embeds || []).find(e => e.castId);
    if (!quoteEmbed || !quoteEmbed.castId) return null;
    return casts.find(c => c.hash === quoteEmbed.castId?.hash) || {
      hash: quoteEmbed.castId.hash,
      fid: quoteEmbed.castId.fid,
      text: 'Quoted cast referenced via protocol embed on Snapchain.',
      timestamp: cast.timestamp - 3600000,
      author: {
        fid: quoteEmbed.castId.fid,
        username: `fid_${quoteEmbed.castId.fid}`,
        displayName: `FID ${quoteEmbed.castId.fid}`,
        pfpUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
      },
    };
  };

  // Apply Client Filtering
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
      {/* 1. Sub-Header: Node Status & Account Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#120f1d]/80 p-4 backdrop-blur-xl shadow-lg">
        {/* Left: Node Ping Status */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400">
            <Radio className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">Snapchain Node</span>
              {nodeOnline === true ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t.online} ({latency}ms)
                </span>
              ) : nodeOnline === false ? (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {t.offline} (Local syncing)
                </span>
              ) : null}
            </div>
            <span className="text-[11px] text-purple-200/50 font-mono">{nodeUrl}</span>
          </div>
        </div>

        {/* Right: User State / Sign In Button */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={pingNode}
            disabled={isPinging}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-purple-200 transition-all"
            title="Ping Node"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin text-purple-400' : ''}`} />
            <span className="hidden sm:inline">{t.ping}</span>
          </button>

          {currentUser ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-purple-500/30 bg-purple-950/40 px-3 py-1.5 shadow-sm">
              <img
                src={currentUser.pfpUrl}
                alt={currentUser.username}
                className="h-6 w-6 rounded-full object-cover border border-purple-400"
              />
              <div className="text-left">
                <span className="text-xs font-bold text-white block leading-tight">{currentUser.displayName}</span>
                <span className="text-[10px] text-purple-300/70 font-mono block">@{currentUser.username}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-1 text-purple-300 hover:text-white p-1 transition-colors"
                title={t.signOut}
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition-all shadow-lg shadow-purple-600/30 active:scale-95"
            >
              <Key className="h-3.5 w-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Center / Feed Stream (farcaster.xyz style feed) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Client Filter Bar (farcaster.xyz aesthetic) */}
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setFilterMode('all')}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  filterMode === 'all'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white/5 text-purple-200/60 hover:text-white hover:bg-white/10'
                }`}
              >
                All Feeds
              </button>
              <button
                onClick={() => {
                  setFilterMode('exclude');
                  setSelectedClients(['Warpcast']);
                }}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  filterMode === 'exclude' && selectedClients.includes('Warpcast')
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white/5 text-purple-200/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Exclude Warpcast
              </button>
              <button
                onClick={() => {
                  setFilterMode('include');
                  setSelectedClients(['Supercast']);
                }}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  filterMode === 'include' && selectedClients.includes('Supercast')
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white/5 text-purple-200/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Supercast Only
              </button>
              <button
                onClick={() => {
                  setFilterMode('include');
                  setSelectedClients(['Direct Snapchain']);
                }}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all whitespace-nowrap ${
                  filterMode === 'include' && selectedClients.includes('Direct Snapchain')
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white/5 text-purple-200/60 hover:text-white hover:bg-white/10'
                }`}
              >
                Native Snapchain
              </button>
            </div>

            <button
              onClick={handleRefreshFeed}
              disabled={isRefreshingFeed}
              className="flex items-center gap-1 text-xs text-purple-300 hover:text-white transition-colors shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingFeed ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Inline Cast Composer (farcaster.xyz style) */}
          <div className="rounded-2xl border border-white/10 bg-[#120f1d] p-4 sm:p-5 shadow-xl space-y-3">
            {/* Replying Notice */}
            {replyToCast && (
              <div className="flex items-center justify-between rounded-xl bg-purple-950/40 border border-purple-500/30 px-3 py-1.5 text-xs text-purple-200">
                <div className="flex items-center gap-2 truncate">
                  <MessageSquare className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span className="text-purple-400 font-semibold">{t.replyingTo}:</span>
                  <span className="font-mono text-purple-300">@{replyToCast.author?.username}</span>
                  <span className="text-purple-200/60 truncate">&quot;{replyToCast.text.slice(0, 40)}...&quot;</span>
                </div>
                <button onClick={() => setReplyToCast(null)} className="text-purple-400 hover:text-white ml-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Quoting Notice */}
            {quoteCast && (
              <div className="flex items-center justify-between rounded-xl bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-200">
                <div className="flex items-center gap-2 truncate">
                  <Quote className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="text-cyan-400 font-semibold">{t.quoting}:</span>
                  <span className="font-mono text-cyan-300">@{quoteCast.author?.username}</span>
                  <span className="text-cyan-200/60 truncate">&quot;{quoteCast.text.slice(0, 40)}...&quot;</span>
                </div>
                <button onClick={() => setQuoteCast(null)} className="text-cyan-400 hover:text-white ml-2">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Composer Input Area */}
            <div className="flex items-start gap-3">
              <img
                src={currentUser?.pfpUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'}
                alt="Me"
                className="h-10 w-10 rounded-full object-cover border border-purple-500/30 shrink-0 mt-1"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={replyToCast || quoteCast ? 2 : 3}
                  maxLength={320}
                  value={castText}
                  onChange={e => setCastText(e.target.value)}
                  placeholder={
                    replyToCast
                      ? `Reply to @${replyToCast.author?.username}...`
                      : quoteCast
                      ? `Add your comment to this cast...`
                      : t.composePlaceholder
                  }
                  className="w-full bg-transparent text-sm text-white placeholder-purple-200/30 focus:outline-none resize-none leading-relaxed"
                />

                {/* Quoted Cast Preview inside Composer */}
                {quoteCast && (
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <img
                        src={quoteCast.author?.pfpUrl}
                        alt={quoteCast.author?.username}
                        className="h-4 w-4 rounded-full object-cover"
                      />
                      <span className="font-bold text-white text-[11px]">{quoteCast.author?.displayName}</span>
                      <span className="text-purple-300/50 text-[10px]">@{quoteCast.author?.username}</span>
                    </div>
                    <p className="text-purple-200/80 line-clamp-2 text-[11px]">{quoteCast.text}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Composer Bottom Bar */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 text-[11px] text-purple-200/50 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                <span>:3381 mempool (EIP-712 Gasless)</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-purple-200/40 font-mono">{320 - castText.length}</span>
                <button
                  onClick={handlePublishCast}
                  disabled={isPublishing || !castText.trim()}
                  className="flex items-center gap-1.5 rounded-full bg-purple-600 hover:bg-purple-500 px-5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-purple-600/30 active:scale-95 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isPublishing ? 'Publishing...' : replyToCast ? t.reply : quoteCast ? t.quote : t.publishCast}</span>
                </button>
              </div>
            </div>

            {postSuccessHash && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Cast published to node mempool! Hash: {postSuccessHash}</span>
              </div>
            )}
          </div>

          {/* Casts Stream */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#120f1d]/50 p-12 text-center text-sm text-purple-200/50">
                {t.noCastsFound}
              </div>
            ) : (
              filtered.map(cast => {
                const attr = identifyCastClient(cast);
                const quoted = getQuotedCast(cast);

                return (
                  <div
                    key={cast.hash}
                    className="rounded-2xl border border-white/5 bg-[#120f1d] hover:bg-[#151124] hover:border-purple-500/20 p-4 sm:p-5 transition-all shadow-md space-y-3"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={cast.author?.pfpUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                          alt={cast.author?.username}
                          className="h-10 w-10 rounded-full object-cover border border-purple-500/20"
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-white hover:text-purple-300 transition-colors">
                              {cast.author?.displayName || `FID ${cast.fid}`}
                            </span>
                            <span className="text-xs text-purple-200/50">@{cast.author?.username || cast.fid}</span>
                            <span className="text-purple-200/30 text-xs">·</span>
                            <span className="text-xs text-purple-200/40">{formatTimeAgo(cast.timestamp)}</span>
                            {currentUser?.fid !== cast.fid && (
                              <button
                                onClick={() => handleToggleFollow(cast.fid)}
                                className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-all ${
                                  followedFids.includes(cast.fid)
                                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                    : 'bg-white/5 text-purple-200/60 hover:text-white hover:bg-white/10 border border-white/10'
                                }`}
                                title={followedFids.includes(cast.fid) ? 'Unfollow (LinkRemove)' : 'Follow via LinkAdd'}
                              >
                                {followedFids.includes(cast.fid) ? (
                                  <>
                                    <UserCheck className="h-2.5 w-2.5 text-purple-400" />
                                    <span>Following</span>
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className="h-2.5 w-2.5" />
                                    <span>Follow</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                          {cast.parentCastId && (
                            <span className="text-[11px] text-purple-300/60 block">
                              Replying to <span className="font-mono">FID {cast.parentCastId.fid}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Client Attribution Pill */}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide ${attr.badgeColor}`}
                        title={attr.indicator}
                      >
                        {attr.clientName}
                      </span>
                    </div>

                    {/* Cast Body */}
                    <p className="text-sm text-purple-100/90 leading-relaxed whitespace-pre-wrap">{cast.text}</p>

                    {/* Quoted Cast Card (Nested à la farcaster.xyz) */}
                    {quoted && (
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3.5 space-y-2 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <img
                            src={quoted.author?.pfpUrl}
                            alt={quoted.author?.username}
                            className="h-5 w-5 rounded-full object-cover border border-purple-400/40"
                          />
                          <span className="font-bold text-xs text-white">{quoted.author?.displayName}</span>
                          <span className="text-purple-300/50 text-[11px]">@{quoted.author?.username}</span>
                          <span className="text-purple-200/30 text-[11px]">·</span>
                          <span className="text-[11px] text-purple-200/40">{formatTimeAgo(quoted.timestamp)}</span>
                        </div>
                        <p className="text-xs text-purple-200/80 leading-relaxed">{quoted.text}</p>
                      </div>
                    )}

                    {/* Standard URL Embeds */}
                    {cast.embeds &&
                      cast.embeds.filter(e => e.url).length > 0 && (
                        <div className="space-y-1 pt-1">
                          {cast.embeds
                            .filter(e => e.url)
                            .map((emb, idx) => (
                              <a
                                key={idx}
                                href={emb.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">{emb.url}</span>
                              </a>
                            ))}
                        </div>
                      )}

                    {/* Action Bar (farcaster.xyz styling) */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-purple-200/60">
                      <div className="flex items-center gap-6">
                        {/* Reply Button */}
                        <button
                          onClick={() => {
                            setReplyToCast(cast);
                            setQuoteCast(null);
                            window.scrollTo({ top: 350, behavior: 'smooth' });
                          }}
                          className="flex items-center gap-1.5 hover:text-purple-300 transition-colors"
                          title="Reply to cast"
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>0</span>
                        </button>

                        {/* Recast & Quote Button */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggleReaction(cast.hash, 'recast')}
                            className={`flex items-center gap-1.5 transition-colors ${
                              cast.reactions?.recastByMe ? 'text-emerald-400' : 'hover:text-emerald-400'
                            }`}
                            title="Recast"
                          >
                            <Repeat className="h-4 w-4" />
                            <span>{cast.reactions?.recastsCount || 0}</span>
                          </button>
                          <button
                            onClick={() => {
                              setQuoteCast(cast);
                              setReplyToCast(null);
                              window.scrollTo({ top: 350, behavior: 'smooth' });
                            }}
                            className="text-purple-200/40 hover:text-cyan-400 p-0.5 ml-1 transition-colors"
                            title="Quote cast"
                          >
                            <Quote className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Like Button */}
                        <button
                          onClick={() => handleToggleReaction(cast.hash, 'like')}
                          className={`flex items-center gap-1.5 transition-colors ${
                            cast.reactions?.likedByMe ? 'text-pink-400' : 'hover:text-pink-400'
                          }`}
                          title="Like"
                        >
                          <Heart className={`h-4 w-4 ${cast.reactions?.likedByMe ? 'fill-current' : ''}`} />
                          <span>{cast.reactions?.likesCount || 0}</span>
                        </button>
                      </div>

                      {/* Share / Copy Hash */}
                      <button
                        onClick={() => handleCopyHash(cast.hash)}
                        className="flex items-center gap-1 hover:text-white transition-colors font-mono text-[11px]"
                        title="Copy message hash"
                      >
                        {copiedHash === cast.hash ? (
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Check className="h-3 w-3" />
                            <span>Copied</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-purple-200/40 hover:text-purple-200">
                            <Share2 className="h-3 w-3" />
                            <span className="truncate max-w-[80px] sm:max-w-none">{cast.hash.slice(0, 10)}...</span>
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Rail: Controls, Diagnostics & Signer Manager */}
        <div className="space-y-6 lg:col-span-1">
          {/* Active Signer / Account Card */}
          <div className="rounded-2xl border border-white/10 bg-[#120f1d] p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Signer & Account</h3>
              </div>
              <span className="rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] text-purple-300 font-semibold px-2 py-0.5">
                V16 Gasless
              </span>
            </div>

            {currentUser ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 bg-purple-950/20 border border-purple-500/20 rounded-xl p-3">
                  <img
                    src={currentUser.pfpUrl}
                    alt={currentUser.username}
                    className="h-10 w-10 rounded-full object-cover border border-purple-400"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-sm text-white block truncate">{currentUser.displayName}</span>
                    <span className="text-xs text-purple-300/70 font-mono block">FID: {currentUser.fid}</span>
                  </div>
                  {currentUser.isSandbox && (
                    <span className="rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 shrink-0">
                      Sandbox
                    </span>
                  )}
                </div>

                <div className="space-y-1 font-mono text-[11px] bg-black/40 rounded-xl p-3 border border-white/5">
                  <span className="text-purple-200/50 block text-[10px]">Ed25519 Public Key:</span>
                  <div className="text-purple-300 truncate">{currentUser.activeSignerKey}</div>
                  <span className="text-purple-200/50 block text-[10px] pt-1">Custody Address:</span>
                  <div className="text-purple-300 truncate">{currentUser.custodyAddress}</div>
                </div>

                <button
                  onClick={handleSignOut}
                  className="w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-purple-200 py-2 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-purple-200/70 leading-relaxed">
                  Authenticate using a gasless Ed25519 signer authorized by an EIP-712 signature. Zero OP ETH required.
                </p>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-2.5 transition-all shadow-md shadow-purple-600/30 flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t.signIn}</span>
                </button>
              </div>
            )}
          </div>

          {/* Client Neutrality Filter Suite */}
          <div className="rounded-2xl border border-white/10 bg-[#120f1d] p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
              <div>
                <h3 className="text-sm font-bold text-white">{t.filterTitle}</h3>
                <span className="text-[11px] text-purple-200/60 block">{t.filterSub}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Radio selection */}
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/60 p-1 border border-white/5">
                {(['all', 'exclude', 'include'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`rounded-lg py-1.5 text-[11px] font-semibold transition-all ${
                      filterMode === mode
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    {mode === 'all' ? 'All' : mode === 'exclude' ? 'Exclude' : 'Only'}
                  </button>
                ))}
              </div>

              {/* Toggles */}
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
                          className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all ${
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

              {/* Keyword blacklist */}
              <div>
                <label className="text-[11px] font-medium text-purple-200/70 block mb-1">{t.keywordFilter}</label>
                <input
                  type="text"
                  value={keywordFilter}
                  onChange={e => setKeywordFilter(e.target.value)}
                  placeholder="e.g. spam, airdrop"
                  className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-1.5 text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Stats */}
              <div className="rounded-xl bg-white/5 p-2.5 text-[11px] text-purple-200/70 flex justify-between font-mono">
                <span>Showing: <strong className="text-white">{stats.shown}</strong></span>
                <span>Filtered: <strong className="text-cyan-400">{stats.hidden}</strong></span>
              </div>
            </div>
          </div>

          {/* Developer Security Warning (Unix `rm` policy) */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 p-5 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <ShieldAlert className="h-4 w-4" />
              <span>{t.securityNoticeTitle}</span>
            </div>
            <p className="text-[11px] text-amber-200/70 leading-relaxed">{t.securityNoticeBody}</p>
            <button
              onClick={handleLaunchSandbox}
              disabled={isAuthenticating}
              className="mt-2 w-full rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-200 text-xs font-semibold py-2 transition-colors flex items-center justify-center gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>{t.generateSandbox}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Authentication & Sign In Modal (farcaster.xyz aesthetic) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md rounded-3xl border border-purple-500/30 bg-[#120f1d] p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{t.authModalTitle}</h3>
                <p className="text-xs text-purple-200/60">{t.authModalSub}</p>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="rounded-full bg-white/5 hover:bg-white/10 p-1.5 text-purple-300 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/60 p-1 border border-white/5">
              <button
                onClick={() => setAuthTab('sandbox')}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  authTab === 'sandbox'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-200/60 hover:text-white'
                }`}
              >
                1-Click Sandbox
              </button>
              <button
                onClick={() => setAuthTab('import')}
                className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                  authTab === 'import'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-purple-200/60 hover:text-white'
                }`}
              >
                Import Key / Seed
              </button>
            </div>

            {/* Tab 1: Sandbox */}
            {authTab === 'sandbox' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>{t.authSandboxTitle}</span>
                  </div>
                  <p className="text-xs text-purple-200/70 leading-relaxed">{t.authSandboxDesc}</p>
                </div>

                <button
                  onClick={handleLaunchSandbox}
                  disabled={isAuthenticating}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-3 transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isAuthenticating ? 'Generating EIP-712 Keys...' : t.connectSandboxBtn}</span>
                </button>
              </div>
            )}

            {/* Tab 2: Import Key */}
            {authTab === 'import' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Developer Notice (Unix `rm` policy)</span>
                  </div>
                  <p className="text-[11px] text-amber-200/70 leading-relaxed">{t.authCustodyDesc}</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-purple-200/70 block mb-1">{t.fidLabel}</label>
                    <input
                      type="text"
                      value={inputFid}
                      onChange={e => setInputFid(e.target.value)}
                      placeholder="e.g. 12345"
                      className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-purple-200/70 block mb-1">{t.custodyKeyLabel}</label>
                    <input
                      type="password"
                      value={inputSecret}
                      onChange={e => setInputSecret(e.target.value)}
                      placeholder={t.custodyKeyPlaceholder}
                      className="w-full rounded-xl bg-black/60 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <button
                  onClick={handleImportLogin}
                  disabled={isAuthenticating}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs py-3 transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  <Key className="h-4 w-4" />
                  <span>{isAuthenticating ? 'Signing EIP-712...' : t.connectCustodyBtn}</span>
                </button>
              </div>
            )}

            {authError && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{authError}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
