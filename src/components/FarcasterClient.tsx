'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Search,
  User,
  Activity,
  Send,
  Heart,
  Repeat,
  MessageSquare,
  Quote,
  Share2,
  Check,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  SlidersHorizontal,
  ExternalLink,
  ShieldAlert,
  Key,
  LogOut,
  X,
  Lock,
  Layers,
  UserPlus,
  UserCheck,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { FarcasterCast, FarcasterUser, UserSession } from '@/lib/farcaster/types';
import { LoginPage } from './LoginPage';

const DEFAULT_SUGGESTED_USERS: FarcasterUser[] = [
  {
    fid: 37,
    username: 'balajis',
    displayName: 'balajis',
    pfpUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/16e9ecaa-0837-4243-4316-ceeb9db19600/original',
    bio: 'Founder of Network School, author of The Network State, former CTO of Coinbase.',
  },
  {
    fid: 432209,
    username: 'mohammad98',
    displayName: 'Mohammad 🎩',
    pfpUrl: 'https://i.imgur.com/soNnpxz.jpg',
    bio: 'Full-stack Web3 & Sovereign Protocol Engineer',
  },
];

function getClientBadgeColor(source?: string) {
  switch (source) {
    case 'Direct Snapchain':
      return 'text-cyan-700 bg-cyan-50 border-cyan-200';
    case 'Supercast':
      return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'Phaver':
      return 'text-pink-700 bg-pink-50 border-pink-200';
    case 'Paragraph':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'Bountycaster':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'Herocast':
      return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'Jam':
      return 'text-violet-700 bg-violet-50 border-violet-200';
    case 'Warpcast':
    default:
      return 'text-purple-700 bg-purple-50 border-purple-200';
  }
}

function getClientDotColor(source?: string) {
  switch (source) {
    case 'Direct Snapchain':
      return 'bg-cyan-500';
    case 'Supercast':
      return 'bg-indigo-500';
    case 'Phaver':
      return 'bg-pink-500';
    case 'Paragraph':
      return 'bg-emerald-500';
    case 'Bountycaster':
      return 'bg-amber-500';
    case 'Herocast':
      return 'bg-orange-500';
    case 'Jam':
      return 'bg-violet-500';
    case 'Warpcast':
    default:
      return 'bg-purple-500';
  }
}

export function FarcasterClient() {
  // Navigation / Views
  const [activeTab, setActiveTab] = useState<'feed' | 'thread' | 'profile' | 'diagnostics'>('feed');
  const [threadHash, setThreadHash] = useState<string | null>(null);
  const [profileFid, setProfileFid] = useState<number | null>(null);

  // Authentication
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Node Connectivity
  const [nodeUrl, setNodeUrl] = useState('http://127.0.0.1:3381');
  const [nodeHealth, setNodeHealth] = useState<{
    isOnline: boolean;
    latencyMs: number;
    peerCount?: number;
    numMessages?: number;
    version?: string;
  }>({ isOnline: false, latencyMs: 0 });
  const [isPinging, setIsPinging] = useState(false);

  // Feed State
  const [casts, setCasts] = useState<FarcasterCast[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [feedMode, setFeedMode] = useState<'following' | 'global'>('global');

  // Composer State
  const [composeText, setComposeText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [quoteCast, setQuoteCast] = useState<FarcasterCast | null>(null);
  const [replyParent, setReplyParent] = useState<FarcasterCast | null>(null);
  const [publishSuccessMessage, setPublishSuccessMessage] = useState<string | null>(null);

  // Thread View State
  const [currentThreadCast, setCurrentThreadCast] = useState<FarcasterCast | null>(null);
  const [threadParent, setThreadParent] = useState<FarcasterCast | null>(null);
  const [threadReplies, setThreadReplies] = useState<FarcasterCast[]>([]);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isPublishingReply, setIsPublishingReply] = useState(false);

  // Profile View State
  const [currentProfile, setCurrentProfile] = useState<FarcasterUser | null>(null);
  const [profileCasts, setProfileCasts] = useState<FarcasterCast[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isFollowingCurrentProfile, setIsFollowingCurrentProfile] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FarcasterUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Suggested Follows (balajis first, mohammad98 second)
  const [suggestedUsers, setSuggestedUsers] = useState<FarcasterUser[]>(DEFAULT_SUGGESTED_USERS);
  const [followedFids, setFollowedFids] = useState<Set<number>>(new Set([37, 432209]));

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const updateNodeUrl = (newUrl: string) => {
    const clean = newUrl.trim();
    setNodeUrl(clean);
    try {
      localStorage.setItem('farcaster_node_url', clean);
    } catch {
      // ignore
    }
  };

  // Fetch accounts followed by user
  const fetchFollows = useCallback(async (fid: number, targetNode = nodeUrl) => {
    try {
      const res = await fetch(`/api/links?fid=${fid}&nodeUrl=${encodeURIComponent(targetNode)}`);
      const data = await res.json();
      if (Array.isArray(data.following)) {
        setFollowedFids(new Set(data.following));
      }
    } catch {
      // ignore
    }
  }, [nodeUrl]);

  // 3. Fetch Feed (Following feed if logged in, Global real-time network feed if not logged in)
  const fetchFeed = useCallback(
    async (
      filter = sourceFilter,
      mode = feedMode,
      explicitViewerFid = session?.fid
    ) => {
      setIsLoadingFeed(true);
      try {
        const effectiveMode = explicitViewerFid ? mode : 'global';
        const viewerParam =
          explicitViewerFid && effectiveMode === 'following'
            ? `&viewerFid=${explicitViewerFid}`
            : '';
        const modeParam = `&mode=${effectiveMode}`;
        const url = `/api/feed?source=${encodeURIComponent(filter)}${viewerParam}${modeParam}&nodeUrl=${encodeURIComponent(nodeUrl)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.casts) {
          setCasts(data.casts);
        }
      } catch (err) {
        console.error('Error fetching feed:', err);
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [nodeUrl, sourceFilter, session?.fid, feedMode]
  );

  // 1. Initial Load & Restore Session
  useEffect(() => {
    let initialViewerFid: number | undefined;
    try {
      const saved = localStorage.getItem('farcaster_session');
      const savedNode = localStorage.getItem('farcaster_node_url');
      if (savedNode) {
        setNodeUrl(savedNode);
      }
      if (saved) {
        const parsed: UserSession = JSON.parse(saved);
        setSession(parsed);
        setFeedMode('following');
        initialViewerFid = parsed.fid;
        fetchFollows(parsed.fid, savedNode || nodeUrl);

        // Refresh session profile in background
        fetch(`/api/users/${parsed.fid}?nodeUrl=${encodeURIComponent(savedNode || nodeUrl)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.user) {
              const updatedSession: UserSession = {
                ...parsed,
                username: data.user.username || parsed.username,
                displayName: data.user.displayName || parsed.displayName,
                pfpUrl: data.user.pfpUrl || parsed.pfpUrl,
                bio: data.user.bio || parsed.bio,
              };
              setSession(updatedSession);
              localStorage.setItem('farcaster_session', JSON.stringify(updatedSession));
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }

    pingNode();
    fetchFeed(
      sourceFilter,
      initialViewerFid ? 'following' : 'global',
      initialViewerFid
    );
    fetchSuggestedUsers();
  }, []);

  // Save session when updated
  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    setFeedMode('following');
    setIsAuthModalOpen(false);
    try {
      localStorage.setItem('farcaster_session', JSON.stringify(userSession));
    } catch {
      // ignore
    }
    showToast(`Logged in as @${userSession.username} (FID ${userSession.fid})`);
    fetchFollows(userSession.fid);
    fetchFeed(sourceFilter, 'following', userSession.fid);
  };

  const handleLogout = () => {
    setSession(null);
    setFeedMode('global');
    try {
      localStorage.removeItem('farcaster_session');
    } catch {
      // ignore
    }
    showToast('Logged out of client');
    fetchFeed(sourceFilter, 'global', undefined);
  };

  // 2. Node Health Check
  const pingNode = async () => {
    setIsPinging(true);
    try {
      const res = await fetch(`/api/node/status?nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.health) {
        setNodeHealth(data.health);
      }
    } catch {
      setNodeHealth({ isOnline: false, latencyMs: 0 });
    } finally {
      setIsPinging(false);
    }
  };

  // 4. Fetch Suggested Users (Strictly balajis and mohammad98)
  const fetchSuggestedUsers = async () => {
    try {
      const res = await fetch(`/api/users/search?q=&nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const balajiUser =
          data.results.find(
            (u: FarcasterUser) => u.fid === 37 || u.username?.toLowerCase() === 'balajis'
          ) || DEFAULT_SUGGESTED_USERS[0];
        const mohammadUser =
          data.results.find(
            (u: FarcasterUser) => u.fid === 432209 || u.username?.toLowerCase() === 'mohammad98'
          ) || DEFAULT_SUGGESTED_USERS[1];
        setSuggestedUsers([balajiUser, mohammadUser]);
      } else {
        setSuggestedUsers(DEFAULT_SUGGESTED_USERS);
      }
    } catch {
      setSuggestedUsers(DEFAULT_SUGGESTED_USERS);
    }
  };

  // 5. Open Thread / Cast Detail
  const handleOpenThread = async (hash: string) => {
    setThreadHash(hash);
    setActiveTab('thread');
    setIsLoadingThread(true);
    try {
      const res = await fetch(`/api/casts/${hash}?nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.cast) {
        setCurrentThreadCast(data.cast);
        setThreadParent(data.parent || null);
        setThreadReplies(data.replies || []);
      }
    } catch (err) {
      console.error('Error loading thread:', err);
    } finally {
      setIsLoadingThread(false);
    }
  };

  // 6. Open User Profile
  const handleOpenProfile = async (fidOrUsername: number | string) => {
    setActiveTab('profile');
    setIsLoadingProfile(true);
    try {
      const res = await fetch(`/api/users/${fidOrUsername}?nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.user) {
        setCurrentProfile(data.user);
        setProfileFid(data.user.fid);
        setIsFollowingCurrentProfile(!!data.isFollowing);

        // Keep session updated if viewing logged-in profile
        if (session && session.fid === data.user.fid) {
          const updated: UserSession = {
            ...session,
            username: data.user.username || session.username,
            displayName: data.user.displayName || session.displayName,
            pfpUrl: data.user.pfpUrl || session.pfpUrl,
            bio: data.user.bio || session.bio,
          };
          setSession(updated);
          localStorage.setItem('farcaster_session', JSON.stringify(updated));
        }

        // Fetch their casts
        const castsRes = await fetch(`/api/users/${data.user.fid}/casts?nodeUrl=${encodeURIComponent(nodeUrl)}`);
        const castsData = await castsRes.json();
        if (castsData.casts) {
          setProfileCasts(castsData.casts);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // 7. Search Users
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}&nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.results) {
        setSearchResults(data.results);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 8. Publish New Cast or Quote
  const handlePublishCast = async () => {
    if (!composeText.trim()) return;

    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsPublishing(true);
    setPublishSuccessMessage(null);

    try {
      const embeds = quoteCast
        ? [{ castId: { fid: quoteCast.fid, hash: quoteCast.hash } }]
        : undefined;

      const res = await fetch('/api/casts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session.fid,
          signerPrivateKey: session.signerPrivateKey,
          text: composeText.trim(),
          embeds,
          nodeUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to publish cast');
      }

      setComposeText('');
      setQuoteCast(null);
      showToast('Cast published to Snapchain mempool!');

      // Add to feed immediately
      if (data.cast) {
        setCasts((prev) => [data.cast, ...prev]);
      }
    } catch (err: any) {
      showToast(`Publication notice: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  // 9. Publish Reply in Thread View
  const handlePublishReply = async () => {
    if (!replyText.trim() || !currentThreadCast) return;

    if (!session) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsPublishingReply(true);
    try {
      const res = await fetch('/api/casts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session.fid,
          signerPrivateKey: session.signerPrivateKey,
          text: replyText.trim(),
          parentCastId: {
            fid: currentThreadCast.fid,
            hash: currentThreadCast.hash,
          },
          nodeUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to post reply');
      }

      setReplyText('');
      showToast('Reply published to thread!');

      if (data.cast) {
        setThreadReplies((prev) => [...prev, data.cast]);
      }
    } catch (err: any) {
      showToast(`Reply notice: ${err.message}`);
    } finally {
      setIsPublishingReply(false);
    }
  };

  // 10. Toggle Like or Recast
  const handleToggleReaction = async (castHash: string, type: 'like' | 'recast', targetFid: number) => {
    // Optimistic UI update
    const updateReactionInList = (list: FarcasterCast[]) =>
      list.map((c) => {
        if (c.hash !== castHash) return c;
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
      });

    setCasts(updateReactionInList);
    if (currentThreadCast?.hash === castHash) {
      setCurrentThreadCast((prev) => (prev ? updateReactionInList([prev])[0] : null));
    }
    setThreadReplies(updateReactionInList);

    // Backend call
    try {
      await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session?.fid || 99281,
          signerPrivateKey: session?.signerPrivateKey,
          targetFid,
          targetHash: castHash,
          type,
          nodeUrl,
        }),
      });
    } catch {
      // Optimistic already updated
    }
  };

  // 11. Toggle Follow / Unfollow
  const handleToggleFollow = async (targetFid: number) => {
    const isCurrentlyFollowed = followedFids.has(targetFid);
    const updated = new Set(followedFids);
    if (isCurrentlyFollowed) {
      updated.delete(targetFid);
    } else {
      updated.add(targetFid);
    }
    setFollowedFids(updated);

    if (currentProfile?.fid === targetFid) {
      setIsFollowingCurrentProfile(!isCurrentlyFollowed);
    }

    showToast(isCurrentlyFollowed ? 'Unfollowed user' : 'Following user on Snapchain');

    try {
      await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session?.fid || 99281,
          signerPrivateKey: session?.signerPrivateKey,
          targetFid,
          type: 'follow',
          isRemove: isCurrentlyFollowed,
          nodeUrl,
        }),
      });

      if (feedMode === 'following' && session?.fid) {
        fetchFeed(sourceFilter, 'following', session.fid);
      }
    } catch {
      // optimistic
    }
  };

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label}`);
  };

  // Format timestamp (e.g. 15m, 2h, 3d)
  const formatTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `${Math.max(1, diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium py-2.5 px-4 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-purple-600/20">
              🟣
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-slate-900 block leading-none">
                Farcaster
              </span>
              <span className="text-[10px] text-purple-700 font-semibold tracking-wide">
                SNAPCHAIN CLIENT
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Live Node Status Pill */}
            <button
              onClick={pingNode}
              disabled={isPinging}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                nodeHealth.isOnline
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Click to re-ping node (:3381)"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="hidden sm:inline">Node:</span>
              <span className="font-mono font-semibold">
                {nodeHealth.isOnline ? `${nodeHealth.latencyMs}ms` : 'localhost:3381'}
              </span>
              <RefreshCw className={`h-3 w-3 ml-0.5 ${isPinging ? 'animate-spin' : ''}`} />
            </button>

            {/* Auth Button */}
            {session ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenProfile(session.fid)}
                  className="flex items-center gap-2 rounded-xl p-1 pr-2.5 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  <img
                    src={session.pfpUrl}
                    alt={session.username}
                    className="h-7 w-7 rounded-full object-cover border border-purple-200"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span className="text-xs font-semibold text-slate-800 hidden sm:inline">
                    @{session.username}
                  </span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-all"
              >
                <Key className="h-3.5 w-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container: 3 Columns */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR (Desktop) */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 sticky top-20">
              {/* Navigation Items */}
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('feed');
                    fetchFeed();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'feed'
                      ? 'bg-purple-50 text-purple-700 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Home className="h-5 w-5" />
                  <span>Feed / Home</span>
                </button>

                <button
                  onClick={() => setActiveTab('diagnostics')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    activeTab === 'diagnostics'
                      ? 'bg-purple-50 text-purple-700 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Activity className="h-5 w-5" />
                  <span>Node Diagnostics</span>
                </button>

                {session && (
                  <button
                    onClick={() => handleOpenProfile(session.fid)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeTab === 'profile' && profileFid === session.fid
                        ? 'bg-purple-50 text-purple-700 shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    <span>My Profile</span>
                  </button>
                )}
              </nav>

              <hr className="border-slate-100 my-2" />

              {/* Compose Quick Button */}
              <button
                onClick={() => {
                  setActiveTab('feed');
                  if (!session) {
                    setIsAuthModalOpen(true);
                  } else {
                    const el = document.getElementById('composer-textarea');
                    el?.focus();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-4 text-sm shadow-md shadow-purple-600/20 transition-all"
              >
                <Send className="h-4 w-4" />
                <span>New Cast</span>
              </button>

              {/* User Session Pill in Sidebar */}
              {session ? (
                <div className="pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={session.pfpUrl}
                        alt={session.username}
                        className="h-9 w-9 rounded-full object-cover border border-purple-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="overflow-hidden">
                        <span className="font-bold text-xs text-slate-900 block truncate">
                          {session.displayName}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate">
                          @{session.username} • FID {session.fid}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate" title={session.custodyAddress}>
                      Custody: {session.custodyAddress.slice(0, 10)}...{session.custodyAddress.slice(-4)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-2">
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full rounded-xl border border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 p-3 text-center text-xs font-semibold text-purple-800 transition-all"
                  >
                    + Log In with Mnemonic
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* CENTER COLUMN (Main Feed / Thread / Profile) */}
          <main className="lg:col-span-6 space-y-4">
            {/* VIEW 1: HOME FEED */}
            {activeTab === 'feed' && (
              <div className="space-y-4">
                {/* Feed Mode Switcher Header */}
                {session ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => {
                          setFeedMode('following');
                          fetchFeed(sourceFilter, 'following', session.fid);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          feedMode === 'following'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Following ({followedFids.size})</span>
                      </button>
                      <button
                        onClick={() => {
                          setFeedMode('global');
                          fetchFeed(sourceFilter, 'global', session.fid);
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                          feedMode === 'global'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Global Network</span>
                      </button>
                    </div>

                    <button
                      onClick={() => fetchFeed(sourceFilter, feedMode, session.fid)}
                      title="Refresh Feed"
                      className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors shrink-0"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isLoadingFeed ? 'animate-spin text-purple-600' : ''}`}
                      />
                    </button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider">
                            Latest Network Casts
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            Live Stream
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">
                          Real-time global posts across the decentralized Farcaster network
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setIsAuthModalOpen(true)}
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        <Key className="h-3.5 w-3.5" />
                        <span>Log In for Following Feed</span>
                      </button>
                      <button
                        onClick={() => fetchFeed(sourceFilter, 'global', undefined)}
                        title="Refresh Global Feed"
                        className="p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isLoadingFeed ? 'animate-spin text-purple-600' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Client Source Filters */}
                <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-2 overflow-x-auto scrollbar-none">
                  <span className="text-xs font-bold text-slate-400 pl-1 uppercase tracking-wider">Source:</span>
                  {[
                    { id: 'all', label: 'All Clients' },
                    { id: 'Direct Snapchain', label: 'Direct Snapchain' },
                    { id: 'Warpcast', label: 'Warpcast' },
                    { id: 'Supercast', label: 'Supercast' },
                    { id: 'Phaver', label: 'Phaver' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setSourceFilter(f.id);
                        fetchFeed(f.id, feedMode, session?.fid);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        sourceFilter === f.id
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Inline Cast Composer */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={
                        session?.pfpUrl ||
                        (session ? `https://avatar.vercel.sh/${session.fid}` : 'https://avatar.vercel.sh/guest')
                      }
                      alt="Avatar"
                      className="h-10 w-10 rounded-full object-cover border border-purple-200 shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <textarea
                        id="composer-textarea"
                        value={composeText}
                        onChange={(e) => setComposeText(e.target.value)}
                        placeholder={
                          session
                            ? `What's happening on Farcaster, @${session.username}?`
                            : "Cast to Snapchain (Click to log in)..."
                        }
                        rows={3}
                        maxLength={320}
                        className="w-full text-sm text-slate-900 placeholder:text-slate-400 border-none outline-none resize-none bg-transparent"
                      />

                      {/* Quoted Cast Preview Box */}
                      {quoteCast && (
                        <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 relative text-xs space-y-1">
                          <button
                            onClick={() => setQuoteCast(null)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                            <Quote className="h-3 w-3 text-purple-600" />
                            <span>Quoting @{quoteCast.author?.username || quoteCast.fid}</span>
                          </div>
                          <p className="text-slate-700 line-clamp-2">{quoteCast.text}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] font-mono ${
                              composeText.length > 300 ? 'text-amber-600 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {composeText.length}/320
                          </span>
                        </div>

                        <button
                          onClick={handlePublishCast}
                          disabled={isPublishing || !composeText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
                        >
                          <Send className="h-3 w-3" />
                          <span>{isPublishing ? 'Publishing...' : 'Cast'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Casts Stream */}
                {isLoadingFeed ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                    <RefreshCw className="h-6 w-6 text-purple-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium">
                      {feedMode === 'following' && session
                        ? 'Fetching latest casts from creators you follow...'
                        : 'Syncing latest network casts from Snapchain...'}
                    </p>
                  </div>
                ) : casts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-1">
                      {feedMode === 'following' && session ? (
                        <UserPlus className="h-6 w-6" />
                      ) : (
                        <Layers className="h-6 w-6" />
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">
                      {feedMode === 'following' && session
                        ? 'No Posts in Your Following Feed Yet'
                        : 'No Casts Found'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      {feedMode === 'following' && session
                        ? followedFids.size === 0
                          ? "You are not following anyone yet. Discover and follow active builders from the 'Who to Follow' section, or switch to the Global Network Feed!"
                          : "The creators you follow have not posted recently or their posts are still syncing. Switch to the Global Network Feed to see what's happening right now."
                        : `Connected to Snapchain Read Node at ${nodeUrl}. If your node is syncing initial blocks, posts will stream in automatically.`}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      {feedMode === 'following' && session && (
                        <button
                          onClick={() => {
                            setFeedMode('global');
                            fetchFeed(sourceFilter, 'global', session.fid);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-xs"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>View Global Network Feed</span>
                        </button>
                      )}
                      <button
                        onClick={() => fetchFeed(sourceFilter, feedMode, session?.fid)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Refresh Feed</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {casts.map((cast) => (
                      <article
                        key={cast.hash}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-purple-300 transition-all space-y-3"
                      >
                        {/* Author Header */}
                        <div className="flex items-start justify-between">
                          <div
                            onClick={() => handleOpenProfile(cast.author?.fid || cast.fid)}
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <img
                              src={
                                cast.author?.pfpUrl ||
                                `https://avatar.vercel.sh/${cast.fid}`
                              }
                              alt={cast.author?.username || String(cast.fid)}
                              className="h-10 w-10 rounded-full object-cover border border-purple-100 group-hover:border-purple-400 transition-all"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                                  {cast.author?.displayName || `FID ${cast.fid}`}
                                </span>
                                <span className="text-xs text-slate-400 font-normal">
                                  @{cast.author?.username || cast.fid}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatTimeAgo(cast.timestamp)} ago
                              </span>
                            </div>
                          </div>

                          {/* Client Attribution Badge */}
                          {cast.clientSource && (
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getClientBadgeColor(
                                cast.clientSource
                              )}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(cast.clientSource)}`} />
                              {cast.clientSource}
                            </span>
                          )}
                        </div>

                        {/* Cast Text (Clickable to open thread) */}
                        <div
                          onClick={() => handleOpenThread(cast.hash)}
                          className="cursor-pointer text-sm text-slate-800 leading-relaxed whitespace-pre-wrap select-text hover:text-slate-950"
                        >
                          {cast.text}
                        </div>

                        {/* Quoted Cast Embed if any */}
                        {cast.embeds?.some((e) => e.castId) && (
                          <div
                            onClick={() => {
                              const q = cast.embeds?.find((e) => e.castId)?.castId;
                              if (q?.hash) handleOpenThread(q.hash);
                            }}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1 cursor-pointer hover:bg-slate-100 transition-all"
                          >
                            <span className="font-semibold text-purple-900 flex items-center gap-1">
                              <Quote className="h-3 w-3" />
                              Quoted Cast
                            </span>
                            <p className="text-slate-600 font-mono text-[11px] truncate">
                              Protocol Hash: {cast.embeds.find((e) => e.castId)?.castId?.hash}
                            </p>
                          </div>
                        )}

                        {/* Interaction Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500">
                          {/* Reply */}
                          <button
                            onClick={() => handleOpenThread(cast.hash)}
                            className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors p-1"
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>{cast.repliesCount || 0}</span>
                          </button>

                          {/* Recast */}
                          <button
                            onClick={() => handleToggleReaction(cast.hash, 'recast', cast.fid)}
                            className={`flex items-center gap-1.5 text-xs transition-colors p-1 ${
                              cast.reactions?.recastByMe ? 'text-emerald-600 font-bold' : 'hover:text-emerald-600'
                            }`}
                          >
                            <Repeat className="h-4 w-4" />
                            <span>{cast.reactions?.recastsCount || 0}</span>
                          </button>

                          {/* Like */}
                          <button
                            onClick={() => handleToggleReaction(cast.hash, 'like', cast.fid)}
                            className={`flex items-center gap-1.5 text-xs transition-colors p-1 ${
                              cast.reactions?.likedByMe ? 'text-rose-600 font-bold' : 'hover:text-rose-600'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${cast.reactions?.likedByMe ? 'fill-rose-600' : ''}`} />
                            <span>{cast.reactions?.likesCount || 0}</span>
                          </button>

                          {/* Quote */}
                          <button
                            onClick={() => {
                              setQuoteCast(cast);
                              const el = document.getElementById('composer-textarea');
                              el?.focus();
                            }}
                            className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors p-1"
                            title="Quote this cast"
                          >
                            <Quote className="h-4 w-4" />
                          </button>

                          {/* Copy Hash */}
                          <button
                            onClick={() => handleCopy(cast.hash, 'Cast Hash')}
                            className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors p-1"
                            title="Copy protocol hash"
                          >
                            <Share2 className="h-4 w-4" />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: THREAD & COMMENTS */}
            {activeTab === 'thread' && (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveTab('feed')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Feed</span>
                </button>

                {isLoadingThread ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <RefreshCw className="h-6 w-6 text-purple-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium mt-2">Loading conversation thread...</p>
                  </div>
                ) : currentThreadCast ? (
                  <div className="space-y-3">
                    {/* Parent Cast if this is a reply */}
                    {threadParent && (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 opacity-90">
                        <div className="flex items-center gap-2">
                          <img
                            src={threadParent.author?.pfpUrl || `https://avatar.vercel.sh/${threadParent.fid}`}
                            alt="Parent"
                            className="h-7 w-7 rounded-full object-cover"
                          />
                          <span className="font-semibold text-xs text-slate-900">
                            @{threadParent.author?.username || threadParent.fid}
                          </span>
                          <span className="text-[10px] text-slate-400">Replying to</span>
                        </div>
                        <p className="text-xs text-slate-700">{threadParent.text}</p>
                      </div>
                    )}

                    {/* Main Focused Cast */}
                    <div className="bg-white rounded-2xl border border-purple-200 p-5 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => handleOpenProfile(currentThreadCast.author?.fid || currentThreadCast.fid)}
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <img
                            src={
                              currentThreadCast.author?.pfpUrl ||
                              `https://avatar.vercel.sh/${currentThreadCast.fid}`
                            }
                            alt="Author"
                            className="h-12 w-12 rounded-full object-cover border border-purple-300"
                          />
                          <div>
                            <span className="font-bold text-base text-slate-900 block">
                              {currentThreadCast.author?.displayName || `FID ${currentThreadCast.fid}`}
                            </span>
                            <span className="text-xs text-slate-500">
                              @{currentThreadCast.author?.username || currentThreadCast.fid}
                            </span>
                          </div>
                        </div>

                        {currentThreadCast.clientSource && (
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getClientBadgeColor(
                              currentThreadCast.clientSource
                            )}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(currentThreadCast.clientSource)}`} />
                            {currentThreadCast.clientSource}
                          </span>
                        )}
                      </div>

                      <p className="text-base text-slate-900 leading-relaxed whitespace-pre-wrap select-text">
                        {currentThreadCast.text}
                      </p>

                      <div className="text-xs text-slate-400 font-mono pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span>{new Date(currentThreadCast.timestamp).toLocaleString()}</span>
                        <span title={currentThreadCast.hash}>
                          Hash: {currentThreadCast.hash.slice(0, 10)}...{currentThreadCast.hash.slice(-6)}
                        </span>
                      </div>

                      {/* Reactions stats row */}
                      <div className="flex items-center gap-6 py-2 border-y border-slate-100 text-xs text-slate-600 font-medium">
                        <span>
                          <strong className="text-slate-900 font-bold">{currentThreadCast.reactions?.likesCount || 0}</strong>{' '}
                          Likes
                        </span>
                        <span>
                          <strong className="text-slate-900 font-bold">{currentThreadCast.reactions?.recastsCount || 0}</strong>{' '}
                          Recasts
                        </span>
                        <span>
                          <strong className="text-slate-900 font-bold">{threadReplies.length}</strong> Replies
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-around text-slate-500 pt-1">
                        <button
                          onClick={() =>
                            handleToggleReaction(currentThreadCast.hash, 'recast', currentThreadCast.fid)
                          }
                          className={`flex items-center gap-1.5 text-xs p-2 rounded-xl hover:bg-emerald-50 ${
                            currentThreadCast.reactions?.recastByMe ? 'text-emerald-600 font-bold' : ''
                          }`}
                        >
                          <Repeat className="h-4 w-4" />
                          <span>Recast</span>
                        </button>
                        <button
                          onClick={() =>
                            handleToggleReaction(currentThreadCast.hash, 'like', currentThreadCast.fid)
                          }
                          className={`flex items-center gap-1.5 text-xs p-2 rounded-xl hover:bg-rose-50 ${
                            currentThreadCast.reactions?.likedByMe ? 'text-rose-600 font-bold' : ''
                          }`}
                        >
                          <Heart
                            className={`h-4 w-4 ${currentThreadCast.reactions?.likedByMe ? 'fill-rose-600' : ''}`}
                          />
                          <span>Like</span>
                        </button>
                        <button
                          onClick={() => handleCopy(currentThreadCast.hash, 'Cast Hash')}
                          className="flex items-center gap-1.5 text-xs p-2 rounded-xl hover:bg-purple-50"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Reply Composer */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                        <MessageSquare className="h-4 w-4 text-purple-600" />
                        <span>Reply to @{currentThreadCast.author?.username || currentThreadCast.fid}</span>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Write your protocol comment / reply..."
                        rows={2}
                        className="w-full text-xs text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-purple-500 bg-slate-50 focus:bg-white resize-none"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={handlePublishReply}
                          disabled={isPublishingReply || !replyText.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40"
                        >
                          <Send className="h-3 w-3" />
                          <span>{isPublishingReply ? 'Posting...' : 'Reply'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Replies List */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Replies ({threadReplies.length})
                      </h4>
                      {threadReplies.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
                          No replies yet. Be the first to join the conversation!
                        </div>
                      ) : (
                        threadReplies.map((r) => (
                          <div
                            key={r.hash}
                            className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div
                                onClick={() => handleOpenProfile(r.author?.fid || r.fid)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <img
                                  src={r.author?.pfpUrl || `https://avatar.vercel.sh/${r.fid}`}
                                  alt="Author"
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                                <div>
                                  <span className="font-bold text-xs text-slate-900 block">
                                    {r.author?.displayName || `FID ${r.fid}`}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    @{r.author?.username || r.fid} • {formatTimeAgo(r.timestamp)} ago
                                  </span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-slate-800 whitespace-pre-wrap">{r.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* VIEW 3: USER PROFILE */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <button
                  onClick={() => setActiveTab('feed')}
                  className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition-all"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Feed</span>
                </button>

                {isLoadingProfile ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                    <RefreshCw className="h-6 w-6 text-purple-600 animate-spin mx-auto" />
                    <p className="text-xs text-slate-500 font-medium mt-2">Loading profile...</p>
                  </div>
                ) : currentProfile ? (
                  <div className="space-y-4">
                    {/* Profile Header Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                      {/* Banner */}
                      <div className="h-28 bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800" />
                      <div className="px-6 pb-6 pt-0 relative space-y-4">
                        <div className="flex items-end justify-between -mt-12">
                          <img
                            src={currentProfile.pfpUrl || `https://avatar.vercel.sh/${currentProfile.fid}`}
                            alt={currentProfile.username}
                            className="h-20 w-20 rounded-full border-4 border-white shadow-md object-cover bg-white"
                          />
                          <button
                            onClick={() => handleToggleFollow(currentProfile.fid)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              isFollowingCurrentProfile
                                ? 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-purple-700 hover:bg-purple-800 text-white shadow-sm'
                            }`}
                          >
                            {isFollowingCurrentProfile ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Following</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5" />
                                <span>Follow</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div>
                          <h2 className="text-lg font-extrabold text-slate-900">
                            {currentProfile.displayName || `FID ${currentProfile.fid}`}
                          </h2>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">
                              @{currentProfile.username || currentProfile.fid}
                            </span>
                            <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              FID #{currentProfile.fid}
                            </span>
                          </div>
                        </div>

                        {currentProfile.bio && (
                          <p className="text-xs text-slate-700 leading-relaxed">{currentProfile.bio}</p>
                        )}

                        {currentProfile.custodyAddress && (
                          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-50 p-2 rounded-xl">
                            <span>Custody:</span>
                            <span className="text-slate-700 truncate">{currentProfile.custodyAddress}</span>
                            <button
                              onClick={() => handleCopy(currentProfile.custodyAddress!, 'Custody Address')}
                              className="text-purple-600 hover:text-purple-800 ml-auto"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* User's Casts */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
                        Casts ({profileCasts.length})
                      </h4>
                      {profileCasts.map((cast) => (
                        <div
                          key={cast.hash}
                          onClick={() => handleOpenThread(cast.hash)}
                          className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2 cursor-pointer hover:border-purple-300 transition-all"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{formatTimeAgo(cast.timestamp)} ago</span>
                            {cast.clientSource && (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getClientBadgeColor(
                                  cast.clientSource
                                )}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(cast.clientSource)}`} />
                                {cast.clientSource}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 whitespace-pre-wrap">{cast.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* VIEW 4: DIAGNOSTICS */}
            {activeTab === 'diagnostics' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Snapchain Node Diagnostics</h3>
                      <p className="text-xs text-slate-500">Live metrics from your standalone read node</p>
                    </div>
                  </div>
                  <button
                    onClick={pingNode}
                    disabled={isPinging}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-700"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                    <span>Ping</span>
                  </button>
                </div>

                {/* Endpoint Configuration Input */}
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200/80 space-y-2.5">
                  <label className="text-xs font-bold text-purple-950 block">
                    Snapchain Read Node URL (:3381)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={nodeUrl}
                      onChange={(e) => updateNodeUrl(e.target.value)}
                      placeholder="http://127.0.0.1:3381"
                      className="flex-1 px-3.5 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 text-slate-900"
                    />
                    <button
                      onClick={() => {
                        pingNode();
                        fetchFeed();
                        fetchSuggestedUsers();
                        showToast('Connected and updated node URL');
                      }}
                      className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs shrink-0 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isPinging ? 'animate-spin' : ''}`} />
                      <span>Connect & Ping</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-purple-900/70">
                    All client reads and <code className="font-mono font-semibold">:3381/v1/submitMessage</code> writes connect directly to this node.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 block text-[11px]">HTTP Endpoint</span>
                    <span className="font-mono font-bold text-slate-800 break-all">{nodeUrl}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Node Status</span>
                    <span
                      className={`font-bold inline-flex items-center gap-1.5 ${
                        nodeHealth.isOnline ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          nodeHealth.isOnline ? 'bg-emerald-500' : 'bg-amber-400'
                        }`}
                      />
                      {nodeHealth.isOnline ? 'ONLINE & SYNCED' : 'OFFLINE / STANDBY'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Network Latency</span>
                    <span className="font-mono font-bold text-slate-800">
                      {nodeHealth.isOnline ? `${nodeHealth.latencyMs} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <span className="text-slate-400 block text-[11px]">Engine Protocol</span>
                    <span className="font-bold text-slate-800">Snapchain Engine V16</span>
                  </div>
                </div>

                <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 text-xs space-y-2 text-purple-950">
                  <span className="font-bold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    Direct Read-Node Write Architecture
                  </span>
                  <p className="leading-relaxed text-purple-900/80">
                    Snapchain read nodes accept writes at <code className="font-mono font-bold">:3381/v1/submitMessage</code>.
                    Any message signed by your gasless Ed25519 signer is verified locally and gossiped to the validator mempool.
                  </p>
                </div>
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR (Search, Node Status, Suggested Follows) */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Search Box Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search user proof (@username or FID)..."
                  className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
                />
                {isSearching && (
                  <RefreshCw className="h-3.5 w-3.5 text-purple-600 animate-spin absolute right-3 top-2.5" />
                )}
              </div>

              {/* Empty / Searching Feedback */}
              {!isSearching && searchQuery.trim() && searchResults.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  No account proof found on node for "{searchQuery}"
                </div>
              )}

              {/* Search Results List */}
              {searchResults.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Node Results ({searchResults.length})
                  </span>
                  {searchResults.map((u) => (
                    <div
                      key={u.fid}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-all"
                    >
                      <div
                        onClick={() => handleOpenProfile(u.fid)}
                        className="flex items-center gap-2 cursor-pointer overflow-hidden"
                      >
                        <img
                          src={u.pfpUrl || `https://avatar.vercel.sh/${u.fid}`}
                          alt={u.username}
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${u.fid}`;
                          }}
                        />
                        <div className="truncate">
                          <span className="font-semibold text-xs text-slate-900 block truncate">
                            {u.displayName || `@${u.username}`}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">@{u.username} • FID {u.fid}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleFollow(u.fid)}
                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
                          followedFids.has(u.fid)
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-purple-700 text-white'
                        }`}
                      >
                        {followedFids.has(u.fid) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Who To Follow Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Who to Follow</h3>
              <div className="space-y-2.5">
                {suggestedUsers.slice(0, 2).map((u) => (
                  <div key={u.fid} className="flex items-center justify-between">
                    <div
                      onClick={() => handleOpenProfile(u.fid)}
                      className="flex items-center gap-2.5 cursor-pointer group overflow-hidden"
                    >
                      <img
                        src={u.pfpUrl || `https://avatar.vercel.sh/${u.fid}`}
                        alt={u.username}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200 group-hover:border-purple-400 transition-colors"
                      />
                      <div className="truncate">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-purple-700 transition-colors block truncate">
                          {u.displayName}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">@{u.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleFollow(u.fid)}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-xl transition-all ${
                        followedFids.has(u.fid)
                          ? 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          : 'bg-purple-700 hover:bg-purple-800 text-white shadow-xs'
                      }`}
                    >
                      {followedFids.has(u.fid) ? 'Following' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sovereign Protocol Badge */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2 text-center">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                Sovereign Infrastructure
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Running directly against local Snapchain read node. Zero third-party indexing dependency.
              </p>
              <div className="text-[11px] text-slate-400 font-mono pt-1">
                MIT License • mohammadma98
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Login Modal (Responsive & Scrollable for all screen heights) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
          <div className="relative w-full max-w-lg my-auto py-2">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="hidden sm:flex absolute -top-3 -right-3 z-20 p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-md hover:scale-105 transition-all"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
            <LoginPage
              nodeUrl={nodeUrl}
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
