'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Home,
  Search,
  User,
  Activity,
  Send,
  Heart,
  Repeat,
  MessageSquare,
  MessageCircle,
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
  ChevronDown,
  Server,
  Filter,
  Plus,
} from 'lucide-react';
import { FarcasterCast, FarcasterUser, UserSession } from '@/lib/farcaster/types';
import { LoginPage } from './LoginPage';
import { FarcasterAvatar } from './FarcasterAvatar';
import { QuoteCastCard } from './QuoteCastCard';
import { CastMediaPreviews, FormattedCastText } from './LinkPreview';

interface SnapchainNodePreset {
  id: string;
  name: string;
  url: string;
  badge: string;
  isPersonal?: boolean;
}

const PRESET_NODES: SnapchainNodePreset[] = [
  {
    id: 'personal',
    name: "Mohammad's Sovereign Node",
    url: 'http://162.35.98.172:3381',
    badge: '162.35.98.172',
    isPersonal: true,
  },
  {
    id: 'local',
    name: 'Local Snapchain Node',
    url: 'http://127.0.0.1:3381',
    badge: 'localhost:3381',
  },
];

const KNOWN_SOURCES = [
  { id: 'all', label: 'All Clients / Sources' },
  { id: 'Direct Snapchain', label: 'Direct Snapchain' },
  { id: 'Warpcast', label: 'Warpcast' },
  { id: 'Supercast', label: 'Supercast' },
  { id: 'Phaver', label: 'Phaver' },
  { id: 'Paragraph', label: 'Paragraph' },
  { id: 'Bountycaster', label: 'Bountycaster' },
  { id: 'Herocast', label: 'Herocast' },
  { id: 'Jam', label: 'Jam' },
];

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
    pfpUrl: '/images/mohammad98.jpg',
    bio: 'CEO of @based-karma\n💻 Developer ▶️ Web3 , Python , AI , PHP & More ...',
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

interface FarcasterClientProps {
  initialSlug?: string[];
}

export function FarcasterClient({ initialSlug }: FarcasterClientProps = {}) {
  // Navigation / Views
  const [activeTab, setActiveTab] = useState<'feed' | 'thread' | 'profile' | 'diagnostics'>('feed');
  const [threadHash, setThreadHash] = useState<string | null>(null);
  const [profileFid, setProfileFid] = useState<number | null>(null);
  const [profileTab, setProfileTab] = useState<'casts' | 'replies' | 'quotes' | 'recasts' | 'likes'>('casts');
  const [isLoadingProfileCasts, setIsLoadingProfileCasts] = useState(false);

  // Authentication
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Node Connectivity
  const [nodeUrl, setNodeUrl] = useState('http://162.35.98.172:3381');
  const [isNodeDropdownOpen, setIsNodeDropdownOpen] = useState(false);
  const [customNodes, setCustomNodes] = useState<Array<{ name: string; url: string }>>([]);
  const [newCustomNodeUrl, setNewCustomNodeUrl] = useState('');
  const [isAddingCustomNode, setIsAddingCustomNode] = useState(false);

  // Client Source Filter Dropdown
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);

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

  // Stable refs for routing and session to prevent cascade re-render loops
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const nodeUrlRef = useRef(nodeUrl);
  nodeUrlRef.current = nodeUrl;
  const initialRouteCheckedRef = useRef(false);
  const lastAppliedSlugRef = useRef<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FarcasterUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Suggested Follows (balajis first, mohammad98 second)
  const [suggestedUsers, setSuggestedUsers] = useState<FarcasterUser[]>(DEFAULT_SUGGESTED_USERS);
  const [followedFids, setFollowedFids] = useState<Set<number>>(new Set());

  // Dynamic Client Sources Filter calculation
  const castSources = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of casts) {
      if (c.clientSource) {
        counts[c.clientSource] = (counts[c.clientSource] || 0) + 1;
      }
    }
    const allIds = Array.from(new Set([...KNOWN_SOURCES.map((k) => k.id), ...Object.keys(counts)]));
    return allIds.map((id) => {
      const known = KNOWN_SOURCES.find((k) => k.id === id);
      return {
        id,
        label: known ? known.label : id,
        count: id === 'all' ? casts.length : counts[id] || 0,
      };
    });
  }, [casts]);

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

  // Node switcher handlers
  const handleSelectNode = (url: string) => {
    updateNodeUrl(url);
    setIsNodeDropdownOpen(false);
    pingNode(url);
    fetchFeed(sourceFilter, feedMode, session?.fid, undefined, url);
    showToast(`Connected to node: ${url}`);
  };

  const handleAddCustomNode = () => {
    if (!newCustomNodeUrl.trim()) return;
    let url = newCustomNodeUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    try {
      const parsed = new URL(url);
      const name = `Custom (${parsed.hostname})`;
      const updated = [...customNodes.filter((n) => n.url !== url), { name, url }];
      setCustomNodes(updated);
      try {
        localStorage.setItem('farcaster_custom_nodes', JSON.stringify(updated));
      } catch {}
      setNewCustomNodeUrl('');
      setIsAddingCustomNode(false);
      handleSelectNode(url);
    } catch {
      showToast('Please enter a valid node URL');
    }
  };

  // Fetch accounts followed by user with localStorage caching
  const fetchFollows = useCallback(async (fid: number, targetNode = nodeUrl) => {
    try {
      const res = await fetch(`/api/links?fid=${fid}&nodeUrl=${encodeURIComponent(targetNode)}`);
      const data = await res.json();
      if (Array.isArray(data.following) && data.following.length > 0) {
        const nextSet = new Set<number>(data.following);
        setFollowedFids(nextSet);
        try {
          localStorage.setItem(
            `farcaster_following_${fid}`,
            JSON.stringify({
              fids: data.following,
              count: data.following.length,
              timestamp: Date.now(),
            })
          );
        } catch {
          // ignore
        }
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
      explicitViewerFid = session?.fid,
      overrideFollowedFids?: Set<number>,
      overrideNodeUrl?: string
    ) => {
      setIsLoadingFeed(true);
      try {
        const effectiveMode = explicitViewerFid ? mode : 'global';
        const activeFollows = overrideFollowedFids || followedFids;
        const viewerParam =
          explicitViewerFid && effectiveMode === 'following'
            ? `&viewerFid=${explicitViewerFid}`
            : '';
        const modeParam = `&mode=${effectiveMode}`;
        const followsParam =
          effectiveMode === 'following' && activeFollows.size > 0
            ? `&followedFids=${Array.from(activeFollows).join(',')}`
            : '';
        const targetNode = overrideNodeUrl || nodeUrl;
        const url = `/api/feed?source=${encodeURIComponent(filter)}${viewerParam}${modeParam}${followsParam}&nodeUrl=${encodeURIComponent(targetNode)}`;
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
    [nodeUrl, sourceFilter, session?.fid, feedMode, followedFids]
  );

  // 1. Initial Load & Restore Session
  useEffect(() => {
    let initialViewerFid: number | undefined;
    let initialFollowsSet: Set<number> | undefined;

    try {
      const saved = localStorage.getItem('farcaster_session');
      const savedNode = localStorage.getItem('farcaster_node_url');
      if (savedNode) {
        setNodeUrl(savedNode);
      }

      const savedCustom = localStorage.getItem('farcaster_custom_nodes');
      if (savedCustom) {
        try {
          setCustomNodes(JSON.parse(savedCustom));
        } catch {}
      }

      if (saved) {
        const parsed: UserSession = JSON.parse(saved);
        setSession(parsed);
        setFeedMode('following');
        initialViewerFid = parsed.fid;

        // Restore cached following list immediately from localStorage
        try {
          const cachedFollowsRaw = localStorage.getItem(`farcaster_following_${parsed.fid}`);
          if (cachedFollowsRaw) {
            const cachedFollows = JSON.parse(cachedFollowsRaw);
            if (Array.isArray(cachedFollows.fids) && cachedFollows.fids.length > 0) {
              const restoredSet = new Set<number>(cachedFollows.fids);
              setFollowedFids(restoredSet);
              initialFollowsSet = restoredSet;
            }
          }
        } catch {}

        fetchFollows(parsed.fid, savedNode || 'http://162.35.98.172:3381');

        // Refresh session profile in background
        fetch(`/api/users/${parsed.fid}?nodeUrl=${encodeURIComponent(savedNode || 'http://162.35.98.172:3381')}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.user) {
              const pfp =
                parsed.fid === 432209 || data.user.username?.toLowerCase() === 'mohammad98'
                  ? '/images/mohammad98.jpg'
                  : data.user.pfpUrl || parsed.pfpUrl;
              const hasChanged =
                (data.user.username && data.user.username !== parsed.username) ||
                (data.user.displayName && data.user.displayName !== parsed.displayName) ||
                (pfp && pfp !== parsed.pfpUrl) ||
                (data.user.bio && data.user.bio !== parsed.bio) ||
                (data.user.followerCount !== undefined && data.user.followerCount !== parsed.followerCount) ||
                (data.user.followingCount !== undefined && data.user.followingCount !== parsed.followingCount);

              if (hasChanged) {
                const updatedSession: UserSession = {
                  ...parsed,
                  username: data.user.username || parsed.username,
                  displayName: data.user.displayName || parsed.displayName,
                  pfpUrl: pfp,
                  bio: data.user.bio || parsed.bio,
                  followerCount: data.user.followerCount ?? parsed.followerCount,
                  followingCount: data.user.followingCount ?? parsed.followingCount,
                };
                setSession(updatedSession);
                localStorage.setItem('farcaster_session', JSON.stringify(updatedSession));
              }
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }

    pingNode(localStorage.getItem('farcaster_node_url') || 'http://162.35.98.172:3381');
    fetchFeed(
      sourceFilter,
      initialViewerFid ? 'following' : 'global',
      initialViewerFid,
      initialFollowsSet
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
  const pingNode = async (targetNode?: string) => {
    setIsPinging(true);
    try {
      const activeUrl = typeof targetNode === 'string' && targetNode ? targetNode : nodeUrl;
      const res = await fetch(`/api/node/status?nodeUrl=${encodeURIComponent(activeUrl)}`);
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

        if (mohammadUser && !mohammadUser.pfpUrl) {
          mohammadUser.pfpUrl = '/images/mohammad98.jpg';
        }
        setSuggestedUsers([balajiUser, mohammadUser]);
      } else {
        setSuggestedUsers(DEFAULT_SUGGESTED_USERS);
      }
    } catch {
      setSuggestedUsers(DEFAULT_SUGGESTED_USERS);
    }
  };

  // 5. Open Thread / Cast Detail
  const handleOpenThread = async (
    hash: string,
    authorUsername?: string,
    updateHistory = true
  ) => {
    setThreadHash(hash);
    setActiveTab('thread');
    setIsLoadingThread(true);

    if (updateHistory && typeof window !== 'undefined') {
      const cleanHash = hash.startsWith('0x') ? hash : `0x${hash}`;
      const path = authorUsername ? `/${authorUsername}/${cleanHash}` : `/cast/${cleanHash}`;
      window.history.pushState({ view: 'thread', hash: cleanHash }, '', path);
    }

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

  // 6. Fetch Profile Tab Items (Casts, Replies, Quotes, Recasts, Likes)
  const fetchProfileCasts = async (
    fidOrUsername: number | string,
    tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes' = 'casts',
    targetNode = nodeUrl
  ) => {
    setIsLoadingProfileCasts(true);
    try {
      const castsRes = await fetch(
        `/api/users/${fidOrUsername}/casts?tab=${tab}&nodeUrl=${encodeURIComponent(targetNode)}`
      );
      const castsData = await castsRes.json();
      if (Array.isArray(castsData.casts)) {
        setProfileCasts(castsData.casts);
      } else {
        setProfileCasts([]);
      }
    } catch (err) {
      console.error('Error loading profile casts:', err);
      setProfileCasts([]);
    } finally {
      setIsLoadingProfileCasts(false);
    }
  };

  // 7. Open User Profile
  const handleOpenProfile = async (
    fidOrUsername: number | string,
    tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes' = 'casts',
    updateHistory = true
  ) => {
    setActiveTab('profile');
    setProfileTab(tab);
    setIsLoadingProfile(true);

    try {
      const res = await fetch(`/api/users/${fidOrUsername}?nodeUrl=${encodeURIComponent(nodeUrl)}`);
      const data = await res.json();
      if (data.user) {
        setCurrentProfile(data.user);
        setProfileFid(data.user.fid);
        setIsFollowingCurrentProfile(!!data.isFollowing);

        if (updateHistory && typeof window !== 'undefined') {
          const u = data.user.username || data.user.fid;
          const query = tab !== 'casts' ? `?tab=${tab}` : '';
          window.history.pushState({ view: 'profile', fid: data.user.fid, tab }, '', `/${u}${query}`);
        }

        // Keep session updated if viewing logged-in profile
        const activeSession = sessionRef.current || session;
        if (activeSession && activeSession.fid === data.user.fid) {
          const pfp =
            activeSession.fid === 432209 || data.user.username?.toLowerCase() === 'mohammad98'
              ? '/images/mohammad98.jpg'
              : data.user.pfpUrl || activeSession.pfpUrl;

          const hasChanged =
            (data.user.username && data.user.username !== activeSession.username) ||
            (data.user.displayName && data.user.displayName !== activeSession.displayName) ||
            (pfp && pfp !== activeSession.pfpUrl) ||
            (data.user.bio && data.user.bio !== activeSession.bio) ||
            (data.user.followerCount !== undefined && data.user.followerCount !== activeSession.followerCount) ||
            (data.user.followingCount !== undefined && data.user.followingCount !== activeSession.followingCount);

          if (hasChanged) {
            const updated: UserSession = {
              ...activeSession,
              username: data.user.username || activeSession.username,
              displayName: data.user.displayName || activeSession.displayName,
              pfpUrl: pfp,
              bio: data.user.bio || activeSession.bio,
              followerCount: data.user.followerCount ?? activeSession.followerCount,
              followingCount: data.user.followingCount ?? activeSession.followingCount,
            };
            setSession(updated);
            try {
              localStorage.setItem('farcaster_session', JSON.stringify(updated));
            } catch {}
          }
        }

        // Fetch their casts for the active tab
        await fetchProfileCasts(data.user.fid, tab, nodeUrl);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSelectProfileTab = (tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes') => {
    setProfileTab(tab);
    if (currentProfile) {
      const u = currentProfile.username || currentProfile.fid;
      const query = tab !== 'casts' ? `?tab=${tab}` : '';
      if (typeof window !== 'undefined') {
        window.history.pushState({ view: 'profile', fid: currentProfile.fid, tab }, '', `/${u}${query}`);
      }
      fetchProfileCasts(currentProfile.fid, tab);
    }
  };

  const handleBackToFeed = (updateHistory = true) => {
    setActiveTab('feed');
    setThreadHash(null);
    setCurrentThreadCast(null);
    if (updateHistory && typeof window !== 'undefined') {
      window.history.pushState({ view: 'feed' }, '', '/');
    }
  };

  const handleOpenDiagnostics = (updateHistory = true) => {
    setActiveTab('diagnostics');
    if (updateHistory && typeof window !== 'undefined') {
      window.history.pushState({ view: 'diagnostics' }, '', '/diagnostics');
    }
  };

  const handleShareCast = (cast: FarcasterCast) => {
    const authorUname = cast.author?.username || cast.fid;
    const cleanHash = cast.hash.startsWith('0x') ? cast.hash : `0x${cast.hash}`;
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/${authorUname}/${cleanHash}`
      : `/${authorUname}/${cleanHash}`;
    handleCopy(url, 'Cast URL');
  };

  const applyRoute = useCallback(
    async (pathname: string, search: string, updateHistory = false) => {
      const cleanPath = pathname.replace(/\/$/, '') || '/';
      const searchParams = new URLSearchParams(search);
      const tabParam = (searchParams.get('tab') as 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes') || 'casts';

      if (cleanPath === '/' || cleanPath === '') {
        setActiveTab('feed');
        if (updateHistory && typeof window !== 'undefined') {
          window.history.pushState({ view: 'feed' }, '', '/');
        }
        return;
      }

      if (cleanPath === '/diagnostics') {
        setActiveTab('diagnostics');
        if (updateHistory && typeof window !== 'undefined') {
          window.history.pushState({ view: 'diagnostics' }, '', '/diagnostics');
        }
        return;
      }

      if (cleanPath === '/profile') {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('farcaster_session') : null;
        const parsedSession: UserSession | null = saved ? JSON.parse(saved) : (sessionRef.current || session);
        if (parsedSession?.username || parsedSession?.fid) {
          handleOpenProfile(parsedSession.username || parsedSession.fid, tabParam, updateHistory);
        } else {
          setActiveTab('feed');
          setIsAuthModalOpen(true);
        }
        return;
      }

      const parts = cleanPath.split('/').filter(Boolean);

      if (parts.length === 2) {
        const [firstPart, secondPart] = parts;
        if (secondPart.startsWith('0x') || secondPart.length >= 8) {
          handleOpenThread(secondPart, firstPart === 'cast' ? undefined : firstPart, updateHistory);
          return;
        }
      }

      if (parts.length === 1) {
        const firstPart = parts[0];
        if (firstPart.startsWith('0x')) {
          handleOpenThread(firstPart, undefined, updateHistory);
          return;
        }
        const fidMatch = firstPart.match(/^fid\/(\d+)$/);
        if (fidMatch) {
          handleOpenProfile(parseInt(fidMatch[1], 10), tabParam, updateHistory);
        } else {
          handleOpenProfile(firstPart, tabParam, updateHistory);
        }
        return;
      }
    },
    []
  );

  const applyRouteRef = useRef(applyRoute);
  applyRouteRef.current = applyRoute;

  // Listen for browser Back/Forward (popstate)
  useEffect(() => {
    const onPopState = () => {
      if (typeof window !== 'undefined') {
        applyRouteRef.current(window.location.pathname, window.location.search, false);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Initial Route Check on mount & when URL slug actually changes
  const slugKey = initialSlug && initialSlug.length > 0 ? initialSlug.join('/') : '';
  useEffect(() => {
    if (lastAppliedSlugRef.current === slugKey && initialRouteCheckedRef.current) {
      return;
    }
    lastAppliedSlugRef.current = slugKey;
    initialRouteCheckedRef.current = true;

    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path && path !== '/') {
        applyRouteRef.current(window.location.pathname, window.location.search, false);
      } else if (slugKey) {
        applyRouteRef.current('/' + slugKey, '', false);
      }
    }
  }, [slugKey]);

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
      if (err.message?.includes('invalid signer')) {
        showToast('Signer session expired or node restarted. Please log in again to renew your gasless key.');
        setIsAuthModalOpen(true);
      } else {
        showToast(`Publication notice: ${err.message}`);
      }
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
    if (!session || !session.signerPrivateKey) {
      setIsAuthModalOpen(true);
      showToast('Please log in with your Farcaster account to like or recast.');
      return;
    }

    // Find prior active status to determine add vs remove
    let wasActive = false;
    const targetCast =
      casts.find((c) => c.hash === castHash) ||
      (currentThreadCast?.hash === castHash ? currentThreadCast : null) ||
      threadReplies.find((c) => c.hash === castHash);

    if (targetCast) {
      wasActive = type === 'like' ? !!targetCast.reactions?.likedByMe : !!targetCast.reactions?.recastByMe;
    }

    // Optimistic UI update helper
    const updateReactionInList = (list: FarcasterCast[], activeState: boolean) =>
      list.map((c) => {
        if (c.hash !== castHash) return c;
        const currentLikes = c.reactions?.likesCount || 0;
        const currentRecasts = c.reactions?.recastsCount || 0;

        if (type === 'like') {
          return {
            ...c,
            reactions: {
              ...c.reactions!,
              likesCount: activeState ? currentLikes + 1 : Math.max(0, currentLikes - 1),
              likedByMe: activeState,
            },
          };
        } else {
          return {
            ...c,
            reactions: {
              ...c.reactions!,
              recastsCount: activeState ? currentRecasts + 1 : Math.max(0, currentRecasts - 1),
              recastByMe: activeState,
            },
          };
        }
      });

    // Apply optimistic state
    setCasts((prev) => updateReactionInList(prev, !wasActive));
    if (currentThreadCast?.hash === castHash) {
      setCurrentThreadCast((prev) => (prev ? updateReactionInList([prev], !wasActive)[0] : null));
    }
    setThreadReplies((prev) => updateReactionInList(prev, !wasActive));

    // Backend call
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session.fid,
          signerPrivateKey: session.signerPrivateKey,
          targetFid,
          targetHash: castHash,
          type,
          isRemove: wasActive,
          nodeUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        // Revert optimistic state upon rejection
        setCasts((prev) => updateReactionInList(prev, wasActive));
        if (currentThreadCast?.hash === castHash) {
          setCurrentThreadCast((prev) => (prev ? updateReactionInList([prev], wasActive)[0] : null));
        }
        setThreadReplies((prev) => updateReactionInList(prev, wasActive));

        const errMsg = data.error || data.nodeResult?.error || 'Reaction rejected by node';
        if (errMsg.includes('invalid signer')) {
          showToast('Signer not recognized by node (node may have restarted). Please log in again to renew your gasless key.');
        } else {
          showToast(`Reaction notice: ${errMsg}`);
        }
      }
    } catch (err: any) {
      // Revert optimistic state
      setCasts((prev) => updateReactionInList(prev, wasActive));
      if (currentThreadCast?.hash === castHash) {
        setCurrentThreadCast((prev) => (prev ? updateReactionInList([prev], wasActive)[0] : null));
      }
      setThreadReplies((prev) => updateReactionInList(prev, wasActive));
      showToast(`Network error: ${err.message}`);
    }
  };

  // 11. Toggle Follow / Unfollow
  const handleToggleFollow = async (targetFid: number) => {
    if (!session || !session.signerPrivateKey) {
      setIsAuthModalOpen(true);
      showToast('Please log in with your Farcaster account to follow or unfollow.');
      return;
    }

    const isCurrentlyFollowed = followedFids.has(targetFid);
    const updated = new Set(followedFids);
    if (isCurrentlyFollowed) {
      updated.delete(targetFid);
    } else {
      updated.add(targetFid);
    }
    setFollowedFids(updated);

    if (session?.fid) {
      try {
        localStorage.setItem(
          `farcaster_following_${session.fid}`,
          JSON.stringify({
            fids: Array.from(updated),
            count: updated.size,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }

    if (currentProfile?.fid === targetFid) {
      setIsFollowingCurrentProfile(!isCurrentlyFollowed);
    }

    try {
      const res = await fetch('/api/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session.fid,
          signerPrivateKey: session.signerPrivateKey,
          targetFid,
          type: 'follow',
          isRemove: isCurrentlyFollowed,
          nodeUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        // Revert follow state
        const reverted = new Set(followedFids);
        setFollowedFids(reverted);
        if (currentProfile?.fid === targetFid) {
          setIsFollowingCurrentProfile(isCurrentlyFollowed);
        }
        const errMsg = data.error || data.nodeResult?.error || 'Failed to update follow status';
        showToast(`Follow notice: ${errMsg}`);
      } else {
        showToast(isCurrentlyFollowed ? 'Unfollowed user' : 'Following user on Snapchain');
        if (feedMode === 'following' && session?.fid) {
          fetchFeed(sourceFilter, 'following', session.fid, updated);
        }
      }
    } catch (err: any) {
      const reverted = new Set(followedFids);
      setFollowedFids(reverted);
      if (currentProfile?.fid === targetFid) {
        setIsFollowingCurrentProfile(isCurrentlyFollowed);
      }
      showToast(`Network error: ${err.message}`);
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
          <div
            onClick={() => handleBackToFeed(true)}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
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
            {/* Snapchain Read Node Source Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNodeDropdownOpen(!isNodeDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  nodeHealth.isOnline
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100/60'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Select Snapchain Read Node Source"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <Server className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline font-semibold">
                  {nodeUrl.includes('162.35.98.172')
                    ? '162.35.98.172'
                    : nodeUrl.includes('127.0.0.1') || nodeUrl.includes('localhost')
                    ? 'localhost:3381'
                    : (() => {
                        try {
                          return new URL(nodeUrl).host;
                        } catch {
                          return 'Node';
                        }
                      })()}
                </span>
                <span className="font-mono text-[11px] opacity-80">
                  {nodeHealth.isOnline ? `${nodeHealth.latencyMs}ms` : 'offline'}
                </span>
                <ChevronDown className="h-3 w-3 ml-0.5 opacity-60" />
              </button>

              {/* Node Switcher Menu */}
              {isNodeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsNodeDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-2">
                    <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Snapchain Node Sources
                      </span>
                      <button
                        onClick={() => pingNode()}
                        className="text-[10px] text-purple-700 font-semibold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${isPinging ? 'animate-spin' : ''}`} />
                        Ping
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1">
                      {PRESET_NODES.map((preset) => {
                        const isActive = nodeUrl === preset.url;
                        return (
                          <button
                            key={preset.id}
                            onClick={() => handleSelectNode(preset.url)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                              isActive
                                ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isActive && nodeHealth.isOnline
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300'
                                  }`}
                                />
                                <span className="font-medium truncate">{preset.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 block pl-3.5 truncate">
                                {preset.badge}
                              </span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-purple-700 shrink-0" />}
                          </button>
                        );
                      })}

                      {/* Custom User Nodes */}
                      {customNodes.map((cn) => {
                        const isActive = nodeUrl === cn.url;
                        return (
                          <button
                            key={cn.url}
                            onClick={() => handleSelectNode(cn.url)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                              isActive
                                ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isActive && nodeHealth.isOnline
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300'
                                  }`}
                                />
                                <span className="font-medium truncate">{cn.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 block pl-3.5 truncate">
                                {cn.url}
                              </span>
                            </div>
                            {isActive && <Check className="h-4 w-4 text-purple-700 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Add Custom Node */}
                    <div className="pt-2 border-t border-slate-100">
                      {isAddingCustomNode ? (
                        <div className="space-y-1.5 p-1">
                          <input
                            type="text"
                            value={newCustomNodeUrl}
                            onChange={(e) => setNewCustomNodeUrl(e.target.value)}
                            placeholder="http://ip:3381"
                            className="w-full text-xs font-mono px-2.5 py-1.5 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-purple-600"
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setIsAddingCustomNode(false)}
                              className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleAddCustomNode}
                              className="px-2.5 py-1 text-[11px] bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800"
                            >
                              Connect & Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingCustomNode(true)}
                          className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Custom Node</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Auth Button */}
            {session ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenProfile(session.username || session.fid, 'casts', true)}
                  className="flex items-center gap-2 rounded-xl p-1 pr-2.5 hover:bg-slate-100 transition-all border border-slate-200"
                >
                  <FarcasterAvatar
                    src={session.pfpUrl}
                    alt={session.username}
                    fid={session.fid}
                    username={session.username}
                    className="h-7 w-7 rounded-full object-cover border border-purple-200 shrink-0"
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
                    handleBackToFeed(true);
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
                  onClick={() => handleOpenDiagnostics(true)}
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
                    onClick={() => handleOpenProfile(session.username || session.fid, 'casts', true)}
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

              {/* Compose Quick Button (Only for Logged-In Users) */}
              {session && (
                <button
                  onClick={() => {
                    handleBackToFeed(true);
                    const el = document.getElementById('composer-textarea');
                    el?.focus();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-4 text-sm shadow-md shadow-purple-600/20 transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>New Cast</span>
                </button>
              )}

              {/* User Session Pill in Sidebar */}
              {session ? (
                <div className="pt-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <FarcasterAvatar
                        src={session.pfpUrl}
                        alt={session.username}
                        fid={session.fid}
                        username={session.username}
                        className="h-9 w-9 rounded-full object-cover border border-purple-200 shrink-0"
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

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setIsNodeDropdownOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all"
                        title="Active Snapchain Node - Click to switch"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-slate-800 hidden sm:inline">
                          {nodeUrl.includes('162.35.98.172')
                            ? '162.35.98.172'
                            : nodeUrl.includes('127.0.0.1')
                            ? 'localhost'
                            : 'Custom Node'}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                      </button>
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
                        onClick={() => setIsNodeDropdownOpen(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-slate-600 hover:text-purple-700 bg-slate-50 hover:bg-purple-50 border border-slate-200 px-2.5 py-1.5 rounded-xl transition-all"
                        title="Active Snapchain Node - Click to switch"
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                          }`}
                        />
                        <span className="font-semibold text-slate-800 hidden sm:inline">
                          {nodeUrl.includes('162.35.98.172')
                            ? '162.35.98.172'
                            : nodeUrl.includes('127.0.0.1')
                            ? 'localhost'
                            : 'Custom Node'}
                        </span>
                        <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                      </button>
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

                {/* Inline Cast Composer (Only for Logged-In Users) */}
                {session && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex gap-3">
                      <FarcasterAvatar
                        src={session?.pfpUrl}
                        alt={session?.username || 'You'}
                        fid={session?.fid}
                        username={session?.username}
                        className="h-10 w-10 rounded-full object-cover border border-purple-200 shrink-0"
                      />
                      <div className="flex-1 space-y-2">
                        <textarea
                          id="composer-textarea"
                          value={composeText}
                          onChange={(e) => setComposeText(e.target.value)}
                          placeholder={`What's happening on Farcaster, @${session.username}?`}
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
                )}

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
                            onClick={() =>
                              handleOpenProfile(cast.author?.username || cast.author?.fid || cast.fid, 'casts', true)
                            }
                            className="flex items-center gap-2.5 cursor-pointer group"
                          >
                            <FarcasterAvatar
                              src={cast.author?.pfpUrl}
                              alt={cast.author?.username || String(cast.fid)}
                              fid={cast.author?.fid || cast.fid}
                              username={cast.author?.username}
                              className="h-10 w-10 rounded-full object-cover border border-purple-100 group-hover:border-purple-400 transition-all shrink-0"
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

                        {/* Cast Text with Link & Mention Highlighting */}
                        <div
                          onClick={() => handleOpenThread(cast.hash, cast.author?.username, true)}
                          className="cursor-pointer text-sm text-slate-800 leading-relaxed select-text hover:text-slate-950"
                        >
                          <FormattedCastText
                            text={cast.text}
                            onUserClick={(username) => handleOpenProfile(username, 'casts', true)}
                          />
                        </div>

                        {/* Link & Media Previews (Images, Videos, OpenGraph Website Cards) */}
                        <CastMediaPreviews
                          embeds={cast.embeds?.filter((e) => !e.castId)}
                          text={cast.text}
                        />

                        {/* Rich Quoted Cast Embed */}
                        {cast.embeds
                          ?.filter((e) => e.castId)
                          .map((e, idx) => (
                            <QuoteCastCard
                              key={idx}
                              castId={e.castId!}
                              nodeUrl={nodeUrl}
                              onOpenThread={(h, u) => handleOpenThread(h, u, true)}
                              onOpenProfile={(id) => handleOpenProfile(id, 'casts', true)}
                            />
                          ))}

                        {/* Interaction Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-slate-500">
                          {/* Reply */}
                          <button
                            onClick={() => handleOpenThread(cast.hash, cast.author?.username, true)}
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
                              if (!session) {
                                setIsAuthModalOpen(true);
                                return;
                              }
                              setQuoteCast(cast);
                              const el = document.getElementById('composer-textarea');
                              el?.focus();
                            }}
                            className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors p-1"
                            title="Quote this cast"
                          >
                            <Quote className="h-4 w-4" />
                          </button>

                          {/* Share URL */}
                          <button
                            onClick={() => handleShareCast(cast)}
                            className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors p-1"
                            title="Share cast URL"
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
                  onClick={() => handleBackToFeed(true)}
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
                          <FarcasterAvatar
                            src={threadParent.author?.pfpUrl}
                            alt="Parent"
                            fid={threadParent.author?.fid || threadParent.fid}
                            username={threadParent.author?.username}
                            className="h-7 w-7 rounded-full object-cover shrink-0"
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
                          onClick={() =>
                            handleOpenProfile(
                              currentThreadCast.author?.username || currentThreadCast.author?.fid || currentThreadCast.fid,
                              'casts',
                              true
                            )
                          }
                          className="flex items-center gap-3 cursor-pointer"
                        >
                          <FarcasterAvatar
                            src={currentThreadCast.author?.pfpUrl}
                            alt="Author"
                            fid={currentThreadCast.author?.fid || currentThreadCast.fid}
                            username={currentThreadCast.author?.username}
                            className="h-12 w-12 rounded-full object-cover border border-purple-300 shrink-0"
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

                      <div className="text-base text-slate-900 leading-relaxed select-text">
                        <FormattedCastText
                          text={currentThreadCast.text}
                          onUserClick={(username) => handleOpenProfile(username, 'casts', true)}
                        />
                      </div>

                      {/* Media & Link Previews */}
                      <CastMediaPreviews
                        embeds={currentThreadCast.embeds?.filter((e) => !e.castId)}
                        text={currentThreadCast.text}
                      />

                      {/* Quoted Casts in Thread */}
                      {currentThreadCast.embeds
                        ?.filter((e) => e.castId)
                        .map((e, idx) => (
                          <QuoteCastCard
                            key={idx}
                            castId={e.castId!}
                            nodeUrl={nodeUrl}
                            onOpenThread={(h, u) => handleOpenThread(h, u, true)}
                            onOpenProfile={(id) => handleOpenProfile(id, 'casts', true)}
                          />
                        ))}

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
                          onClick={() => {
                            if (!session) {
                              setIsAuthModalOpen(true);
                              return;
                            }
                            setQuoteCast(currentThreadCast);
                            setActiveTab('feed');
                            setTimeout(() => {
                              const el = document.getElementById('composer-textarea');
                              el?.focus();
                            }, 100);
                          }}
                          className="flex items-center gap-1.5 text-xs p-2 rounded-xl hover:bg-purple-50 text-slate-500 hover:text-purple-700"
                          title="Quote this cast"
                        >
                          <Quote className="h-4 w-4" />
                          <span>Quote</span>
                        </button>
                        <button
                          onClick={() => handleShareCast(currentThreadCast)}
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
                                onClick={() =>
                                  handleOpenProfile(r.author?.username || r.author?.fid || r.fid, 'casts', true)
                                }
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <FarcasterAvatar
                                  src={r.author?.pfpUrl}
                                  alt="Author"
                                  fid={r.author?.fid || r.fid}
                                  username={r.author?.username}
                                  className="h-8 w-8 rounded-full object-cover shrink-0"
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
                            <div className="text-xs text-slate-800 leading-relaxed">
                              <FormattedCastText
                                text={r.text}
                                onUserClick={(username) => handleOpenProfile(username, 'casts', true)}
                              />
                            </div>

                            <CastMediaPreviews
                              embeds={r.embeds?.filter((e) => !e.castId)}
                              text={r.text}
                            />

                            {r.embeds
                              ?.filter((e) => e.castId)
                              .map((e, idx) => (
                                <QuoteCastCard
                                  key={idx}
                                  castId={e.castId!}
                                  nodeUrl={nodeUrl}
                                  onOpenThread={(h, u) => handleOpenThread(h, u, true)}
                                  onOpenProfile={(id) => handleOpenProfile(id, 'casts', true)}
                                />
                              ))}
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
                  onClick={() => handleBackToFeed(true)}
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
                          <FarcasterAvatar
                            src={currentProfile.pfpUrl}
                            alt={currentProfile.username}
                            fid={currentProfile.fid}
                            username={currentProfile.username}
                            className="h-20 w-20 rounded-full border-4 border-white shadow-md object-cover bg-white shrink-0"
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
                          <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {currentProfile.bio}
                          </p>
                        )}

                        {/* Stats: Following & Followers (like farcaster.xyz) */}
                        <div className="flex items-center gap-6 pt-2 border-t border-slate-100 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">
                              {(currentProfile.followingCount ?? 0).toLocaleString()}
                            </span>
                            <span className="text-slate-500 font-medium text-xs">Following</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-900">
                              {(currentProfile.followerCount ?? 0).toLocaleString()}
                            </span>
                            <span className="text-slate-500 font-medium text-xs">Followers</span>
                          </div>
                        </div>

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

                    {/* Profile Navigation Tabs (like farcaster.xyz) */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto scrollbar-none">
                      {[
                        { key: 'casts', label: 'Casts', icon: MessageSquare },
                        { key: 'replies', label: 'Replies', icon: MessageCircle },
                        { key: 'quotes', label: 'Quotes', icon: Quote },
                        { key: 'recasts', label: 'Recasts', icon: Repeat },
                        { key: 'likes', label: 'Likes', icon: Heart },
                      ].map((tabItem) => {
                        const Icon = tabItem.icon;
                        const isActive = profileTab === tabItem.key;
                        return (
                          <button
                            key={tabItem.key}
                            onClick={() => handleSelectProfileTab(tabItem.key as any)}
                            className={`flex-1 min-w-[70px] flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shrink-0 ${
                              isActive
                                ? 'bg-purple-50 text-purple-700 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                            <span>{tabItem.label}</span>
                            {isActive && !isLoadingProfileCasts && (
                              <span className="text-[10px] bg-purple-200/80 text-purple-900 px-1.5 py-0.5 rounded-full font-semibold">
                                {profileCasts.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab Content List */}
                    <div className="space-y-3">
                      {isLoadingProfileCasts ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                          <RefreshCw className="h-5 w-5 text-purple-600 animate-spin mx-auto" />
                          <p className="text-xs text-slate-500 font-medium mt-2">Loading {profileTab}...</p>
                        </div>
                      ) : profileCasts.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2">
                          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mx-auto">
                            {profileTab === 'likes' && <Heart className="h-6 w-6" />}
                            {profileTab === 'recasts' && <Repeat className="h-6 w-6" />}
                            {profileTab === 'quotes' && <Quote className="h-6 w-6" />}
                            {profileTab === 'replies' && <MessageCircle className="h-6 w-6" />}
                            {profileTab === 'casts' && <MessageSquare className="h-6 w-6" />}
                          </div>
                          <h4 className="text-sm font-bold text-slate-800 capitalize">No {profileTab} yet</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            {profileTab === 'likes'
                              ? `@${currentProfile.username || currentProfile.fid} has not liked any casts yet.`
                              : profileTab === 'recasts'
                              ? `@${currentProfile.username || currentProfile.fid} has not recasted any posts yet.`
                              : profileTab === 'quotes'
                              ? `@${currentProfile.username || currentProfile.fid} has not published any quote casts yet.`
                              : profileTab === 'replies'
                              ? `@${currentProfile.username || currentProfile.fid} has not replied to any casts yet.`
                              : `@${currentProfile.username || currentProfile.fid} has not published any casts yet.`}
                          </p>
                        </div>
                      ) : (
                        profileCasts.map((cast) => (
                          <div
                            key={cast.hash}
                            className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 hover:border-purple-300 transition-all"
                          >
                            {/* Author Row */}
                            <div className="flex items-center justify-between">
                              <div
                                onClick={() =>
                                  handleOpenProfile(cast.author?.username || cast.author?.fid || cast.fid, 'casts', true)
                                }
                                className="flex items-center gap-2.5 cursor-pointer group"
                              >
                                <FarcasterAvatar
                                  src={cast.author?.pfpUrl}
                                  alt={cast.author?.username}
                                  fid={cast.author?.fid || cast.fid}
                                  username={cast.author?.username}
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200 group-hover:border-purple-400 transition-colors shrink-0"
                                />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                                    {cast.author?.displayName || `FID ${cast.fid}`}
                                  </span>
                                  <span className="text-[11px] text-slate-400 ml-1.5">
                                    @{cast.author?.username || cast.fid}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {cast.clientSource && (
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getClientBadgeColor(
                                      cast.clientSource
                                    )}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(cast.clientSource)}`}
                                    />
                                    {cast.clientSource}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400">{formatTimeAgo(cast.timestamp)}</span>
                              </div>
                            </div>

                            {/* Replying To Banner for reply casts */}
                            {cast.parentCastId && (
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-purple-50/70 border border-purple-100/80 px-2.5 py-1.5 rounded-xl w-fit">
                                <MessageCircle className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                <span>Replying to</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProfile(
                                      cast.parentAuthor?.username || cast.parentAuthor?.fid || cast.parentCastId!.fid,
                                      'casts',
                                      true
                                    );
                                  }}
                                  className="font-semibold text-purple-700 hover:text-purple-900 hover:underline"
                                >
                                  @{cast.parentAuthor?.username || (cast.parentCastId.fid ? `FID ${cast.parentCastId.fid}` : 'user')}
                                </button>
                                {cast.parentCastId.hash && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenThread(cast.parentCastId!.hash, cast.parentAuthor?.username, true);
                                    }}
                                    className="text-[10px] text-purple-500 hover:text-purple-800 ml-1 font-mono hover:underline"
                                    title="View parent thread"
                                  >
                                    view thread →
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Cast Body with Link & Mention Highlighting */}
                            <div
                              onClick={() => handleOpenThread(cast.hash, cast.author?.username, true)}
                              className="text-xs text-slate-800 leading-relaxed cursor-pointer hover:text-slate-950"
                            >
                              <FormattedCastText
                                text={cast.text}
                                onUserClick={(username) => handleOpenProfile(username, 'casts', true)}
                              />
                            </div>

                            {/* Media & Link Previews */}
                            <CastMediaPreviews
                              embeds={cast.embeds?.filter((e) => !e.castId)}
                              text={cast.text}
                            />

                            {/* Rich Quoted Cast Embed */}
                            {cast.embeds
                              ?.filter((e) => e.castId)
                              .map((e, idx) => (
                                <QuoteCastCard
                                  key={idx}
                                  castId={e.castId!}
                                  nodeUrl={nodeUrl}
                                  onOpenThread={(h, u) => handleOpenThread(h, u, true)}
                                  onOpenProfile={(id) => handleOpenProfile(id, 'casts', true)}
                                />
                              ))}

                            {/* Actions Footer */}
                            <div className="flex items-center gap-6 pt-1 text-slate-500 border-t border-slate-100">
                              <button
                                onClick={() => handleOpenThread(cast.hash, cast.author?.username, true)}
                                className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{cast.repliesCount || 0}</span>
                              </button>
                              <button
                                onClick={() => handleToggleReaction(cast.hash, 'recast', cast.fid)}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${
                                  cast.reactions?.recastByMe
                                    ? 'text-emerald-600 font-bold'
                                    : 'hover:text-emerald-600'
                                }`}
                              >
                                <Repeat className="h-3.5 w-3.5" />
                                <span>{cast.reactions?.recastsCount || 0}</span>
                              </button>
                              <button
                                onClick={() => handleToggleReaction(cast.hash, 'like', cast.fid)}
                                className={`flex items-center gap-1.5 text-xs transition-colors ${
                                  cast.reactions?.likedByMe ? 'text-pink-600 font-bold' : 'hover:text-pink-600'
                                }`}
                              >
                                <Heart
                                  className={`h-3.5 w-3.5 ${cast.reactions?.likedByMe ? 'fill-current' : ''}`}
                                />
                                <span>{cast.reactions?.likesCount || 0}</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (!session) {
                                    setIsAuthModalOpen(true);
                                    return;
                                  }
                                  setQuoteCast(cast);
                                  setActiveTab('feed');
                                  setTimeout(() => {
                                    const el = document.getElementById('composer-textarea');
                                    el?.focus();
                                  }, 100);
                                }}
                                className="flex items-center gap-1.5 text-xs hover:text-purple-700 transition-colors"
                                title="Quote this cast"
                              >
                                <Quote className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleShareCast(cast)}
                                className="flex items-center gap-1.5 text-xs hover:text-slate-800 transition-colors ml-auto"
                                title="Share cast URL"
                              >
                                <Share2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
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
                    onClick={() => pingNode()}
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
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-purple-900/70 font-semibold">Quick Switch:</span>
                    {PRESET_NODES.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectNode(preset.url)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                          nodeUrl === preset.url
                            ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                            : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
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
                        onClick={() => handleOpenProfile(u.username || u.fid, 'casts', true)}
                        className="flex items-center gap-2 cursor-pointer overflow-hidden"
                      >
                        <FarcasterAvatar
                          src={u.pfpUrl}
                          alt={u.username}
                          fid={u.fid}
                          username={u.username}
                          className="h-7 w-7 rounded-full object-cover shrink-0"
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

            {/* Client / Source Selection Dropdown Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Feed Source
                  </span>
                </div>
                {sourceFilter !== 'all' && (
                  <button
                    onClick={() => {
                      setSourceFilter('all');
                      setIsSourceDropdownOpen(false);
                      fetchFeed('all', feedMode, session?.fid);
                    }}
                    className="text-[11px] text-purple-700 hover:text-purple-800 font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Source Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    sourceFilter !== 'all'
                      ? 'bg-purple-50 text-purple-900 border-purple-200 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        sourceFilter === 'all'
                          ? 'bg-purple-600'
                          : getClientDotColor(sourceFilter)
                      }`}
                    />
                    <span className="truncate">
                      {castSources.find((s) => s.id === sourceFilter)?.label ||
                        (sourceFilter === 'all' ? 'All Clients / Sources' : sourceFilter)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {sourceFilter !== 'all' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200 text-purple-800 font-mono">
                        {castSources.find((s) => s.id === sourceFilter)?.count || 0}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isSourceDropdownOpen ? 'rotate-180 text-purple-600' : ''
                      }`}
                    />
                  </div>
                </button>

                {isSourceDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsSourceDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 mt-1.5 max-h-72 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl z-50 p-1.5 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Select Client / Protocol Source
                      </div>

                      {castSources.map((source) => {
                        const isSelected = sourceFilter === source.id;
                        return (
                          <button
                            key={source.id}
                            onClick={() => {
                              setSourceFilter(source.id);
                              setIsSourceDropdownOpen(false);
                              fetchFeed(source.id, feedMode, session?.fid);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors ${
                              isSelected
                                ? 'bg-purple-50 text-purple-900 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${
                                  source.id === 'all'
                                    ? 'bg-purple-600'
                                    : getClientDotColor(source.id)
                                }`}
                              />
                              <span className="truncate">{source.label}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 pl-2">
                              {source.count > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-mono">
                                  {source.count}
                                </span>
                              )}
                              {isSelected && (
                                <Check className="h-3.5 w-3.5 text-purple-700" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Who To Follow Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Who to Follow</h3>
              <div className="space-y-2.5">
                {suggestedUsers.slice(0, 2).map((u) => (
                  <div key={u.fid} className="flex items-center justify-between">
                    <div
                      onClick={() => handleOpenProfile(u.username || u.fid, 'casts', true)}
                      className="flex items-center gap-2.5 cursor-pointer group overflow-hidden"
                    >
                      <FarcasterAvatar
                        src={u.pfpUrl}
                        alt={u.username}
                        fid={u.fid}
                        username={u.username}
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
