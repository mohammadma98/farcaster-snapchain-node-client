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
  Github,
  Filter,
  Plus,
  Image as ImageIcon,
  BookOpen,
} from 'lucide-react';
import { FarcasterCast, FarcasterUser, UserSession, isRootCast } from '@/lib/farcaster/types';
import { LoginPage } from './LoginPage';
import { FarcasterAvatar } from './FarcasterAvatar';
import { QuoteCastCard } from './QuoteCastCard';
import { CastMediaPreviews, FormattedCastText } from './LinkPreview';
import { ComposeCastModal } from './ComposeCastModal';
import { WalletCard } from './WalletCard';

const KNOWN_SOURCES = [
  { id: 'all', label: 'All Clients / Sources' },
  { id: 'Self-registered', label: 'Self-registered (Personal)' },
  { id: 'Warpcast', label: 'Warpcast' },
  { id: 'Firefly', label: 'Firefly' },
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

function getClientBadgeColor(source?: string, clientType?: string) {
  if (clientType === 'personal' || source === 'Self-registered' || source === 'Direct Snapchain') {
    return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  }
  if (clientType === 'other' || source?.startsWith('FID ') || source?.startsWith('Client FID')) {
    return 'text-slate-700 bg-slate-50 border-slate-200';
  }
  switch (source) {
    case 'Firefly':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'Supercast':
      return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'Phaver':
      return 'text-pink-700 bg-pink-50 border-pink-200';
    case 'Paragraph':
      return 'text-teal-700 bg-teal-50 border-teal-200';
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

function getClientDotColor(source?: string, clientType?: string) {
  if (clientType === 'personal' || source === 'Self-registered' || source === 'Direct Snapchain') {
    return 'bg-emerald-500';
  }
  if (clientType === 'other' || source?.startsWith('FID ') || source?.startsWith('Client FID')) {
    return 'bg-slate-400';
  }
  switch (source) {
    case 'Firefly':
      return 'bg-blue-500';
    case 'Supercast':
      return 'bg-indigo-500';
    case 'Phaver':
      return 'bg-pink-500';
    case 'Paragraph':
      return 'bg-teal-500';
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
  const [activeTab, setActiveTab] = useState<'feed' | 'thread' | 'profile'>('feed');
  const [threadHash, setThreadHash] = useState<string | null>(null);
  const [profileFid, setProfileFid] = useState<number | null>(null);
  const [profileTab, setProfileTab] = useState<'casts' | 'replies' | 'quotes' | 'recasts' | 'likes'>('casts');
  const [isLoadingProfileCasts, setIsLoadingProfileCasts] = useState(false);

  // Authentication
  const [session, setSession] = useState<UserSession | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Client Source Filter Dropdown
  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);

  // Local Snapchain Node Connectivity & Health
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
  const [feedCursor, setFeedCursor] = useState<number | undefined>(undefined);
  const [hasMoreFeed, setHasMoreFeed] = useState<boolean>(true);
  const [isLoadingMoreFeed, setIsLoadingMoreFeed] = useState<boolean>(false);
  const feedObserverTarget = useRef<HTMLDivElement>(null);

  // Composer State
  const [composeText, setComposeText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
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
  const [hasMoreProfileCasts, setHasMoreProfileCasts] = useState<boolean>(true);
  const [isLoadingMoreProfileCasts, setIsLoadingMoreProfileCasts] = useState<boolean>(false);
  const [profileCursor, setProfileCursor] = useState<string | number | undefined>(undefined);
  const profileObserverTarget = useRef<HTMLDivElement>(null);

  // Stable refs for routing and session to prevent cascade re-render loops
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const initialRouteCheckedRef = useRef(false);
  const lastAppliedSlugRef = useRef<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FarcasterUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Suggested Follows (balajis first, mohammad98 second)
  const [suggestedUsers, setSuggestedUsers] = useState<FarcasterUser[]>(DEFAULT_SUGGESTED_USERS);
  const [followedFids, setFollowedFids] = useState<Set<number>>(new Set());

  // Dynamic Client Sources Filter calculation
  const castSources = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of casts) {
      const isPersonal =
        c.clientType === 'personal' ||
        c.clientName === 'Self-registered' ||
        c.clientSource === 'Direct Snapchain' ||
        c.clientSource === 'Self-registered';
      const src = isPersonal ? 'Self-registered' : (c.clientName || c.clientSource);
      if (src) {
        counts[src] = (counts[src] || 0) + 1;
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

  // Fetch accounts followed by user with localStorage caching
  const fetchFollows = useCallback(async (fid: number) => {
    try {
      const res = await fetch(`/api/links?fid=${fid}`);
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
  }, []);

  // 3. Fetch Feed (Following feed if logged in, Global real-time network feed if not logged in)
  const fetchFeed = useCallback(
    async (
      filter = sourceFilter,
      mode = feedMode,
      explicitViewerFid = session?.fid,
      overrideFollowedFids?: Set<number>
    ) => {
      setIsLoadingFeed(true);
      setFeedCursor(undefined);
      setHasMoreFeed(true);
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
        const url = `/api/feed?limit=5&source=${encodeURIComponent(filter)}${viewerParam}${modeParam}${followsParam}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.casts) {
          const rootCasts = (data.casts as FarcasterCast[]).filter(isRootCast);
          setCasts(rootCasts);
          setFeedCursor(data.nextCursor);
          setHasMoreFeed(Boolean(data.hasMore));
        }
      } catch (err) {
        console.error('Error fetching feed:', err);
      } finally {
        setIsLoadingFeed(false);
      }
    },
    [sourceFilter, session?.fid, feedMode, followedFids]
  );

  // 3b. Fetch Next Batch of 5 Casts (Infinite Scroll)
  const fetchMoreFeed = useCallback(async () => {
    if (isLoadingMoreFeed || !hasMoreFeed || !feedCursor) return;
    setIsLoadingMoreFeed(true);
    try {
      const effectiveMode = session?.fid ? feedMode : 'global';
      const viewerParam =
        session?.fid && effectiveMode === 'following'
          ? `&viewerFid=${session.fid}`
          : '';
      const modeParam = `&mode=${effectiveMode}`;
      const url = `/api/feed?limit=5&cursor=${feedCursor}&source=${encodeURIComponent(sourceFilter)}${viewerParam}${modeParam}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.casts) && data.casts.length > 0) {
        setCasts((prev) => {
          const seen = new Set(prev.map((c) => c.hash));
          const newUnique = (data.casts as FarcasterCast[])
            .filter(isRootCast)
            .filter((c) => !seen.has(c.hash));
          return [...prev, ...newUnique];
        });
        setFeedCursor(data.nextCursor);
        setHasMoreFeed(Boolean(data.hasMore));
      } else {
        setHasMoreFeed(false);
      }
    } catch (err) {
      console.warn('Error loading more casts:', err);
    } finally {
      setIsLoadingMoreFeed(false);
    }
  }, [isLoadingMoreFeed, hasMoreFeed, feedCursor, session?.fid, feedMode, sourceFilter]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!hasMoreFeed || isLoadingMoreFeed || isLoadingFeed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreFeed();
        }
      },
      { threshold: 0.1 }
    );
    const target = feedObserverTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [hasMoreFeed, isLoadingMoreFeed, isLoadingFeed, fetchMoreFeed]);

  // 1. Initial Load & Restore Session
  useEffect(() => {
    let initialViewerFid: number | undefined;
    let initialFollowsSet: Set<number> | undefined;

    try {
      const saved = localStorage.getItem('farcaster_session');

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

        fetchFollows(parsed.fid);

        // Refresh session profile in background
        fetch(`/api/users/${parsed.fid}`)
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

    pingNode();
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

  // 2. Node Health Check (Local Node Backend)
  const pingNode = async () => {
    setIsPinging(true);
    try {
      const res = await fetch('/api/node/status');
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
      const res = await fetch('/api/users/search?q=');
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
      const res = await fetch(`/api/casts/${hash}`);
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

  // 6. Fetch Profile Tab Items (Casts, Replies, Quotes, Recasts, Likes) - 6 items per batch
  const fetchProfileCasts = async (
    fidOrUsername: number | string,
    tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes' = 'casts'
  ) => {
    setIsLoadingProfileCasts(true);
    setProfileCursor(undefined);
    setHasMoreProfileCasts(true);
    try {
      const activeSession = sessionRef.current || session;
      const viewerParam = activeSession?.fid ? `&viewerFid=${activeSession.fid}` : '';
      const castsRes = await fetch(
        `/api/users/${fidOrUsername}/casts?tab=${tab}&limit=6${viewerParam}`
      );
      const castsData = await castsRes.json();
      if (Array.isArray(castsData.casts)) {
        setProfileCasts(castsData.casts);
        setProfileCursor(castsData.nextCursor);
        setHasMoreProfileCasts(Boolean(castsData.hasMore));
      } else {
        setProfileCasts([]);
        setProfileCursor(undefined);
        setHasMoreProfileCasts(false);
      }
    } catch (err) {
      console.error('Error loading profile casts:', err);
      setProfileCasts([]);
      setProfileCursor(undefined);
      setHasMoreProfileCasts(false);
    } finally {
      setIsLoadingProfileCasts(false);
    }
  };

  // 6b. Fetch Next Batch of 6 Profile Items (Infinite Scroll)
  const fetchMoreProfileCasts = useCallback(async () => {
    if (isLoadingMoreProfileCasts || !hasMoreProfileCasts || !profileCursor || !currentProfile) return;
    setIsLoadingMoreProfileCasts(true);
    try {
      const activeSession = sessionRef.current || session;
      const viewerParam = activeSession?.fid ? `&viewerFid=${activeSession.fid}` : '';
      const fidOrUsername = currentProfile.username || currentProfile.fid;
      const url = `/api/users/${fidOrUsername}/casts?tab=${profileTab}&limit=6&cursor=${encodeURIComponent(String(profileCursor))}${viewerParam}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data.casts) && data.casts.length > 0) {
        setProfileCasts((prev) => {
          const seen = new Set(prev.map((c) => c.hash));
          const newUnique = data.casts.filter((c: FarcasterCast) => !seen.has(c.hash));
          if (newUnique.length === 0) {
            setHasMoreProfileCasts(false);
            return prev;
          }
          return [...prev, ...newUnique];
        });
        setProfileCursor(data.nextCursor);
        setHasMoreProfileCasts(Boolean(data.hasMore));
      } else {
        setHasMoreProfileCasts(false);
      }
    } catch (err) {
      console.warn('Error loading more profile casts:', err);
    } finally {
      setIsLoadingMoreProfileCasts(false);
    }
  }, [isLoadingMoreProfileCasts, hasMoreProfileCasts, profileCursor, currentProfile, profileTab, session?.fid]);

  // Profile Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (activeTab !== 'profile' || !hasMoreProfileCasts || isLoadingMoreProfileCasts || isLoadingProfileCasts) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMoreProfileCasts();
        }
      },
      { threshold: 0.1 }
    );
    const target = profileObserverTarget.current;
    if (target) observer.observe(target);
    return () => {
      if (target) observer.unobserve(target);
    };
  }, [activeTab, hasMoreProfileCasts, isLoadingMoreProfileCasts, isLoadingProfileCasts, fetchMoreProfileCasts]);

  // 7. Open User Profile
  const handleOpenProfile = async (
    fidOrUsername: number | string,
    tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes' = 'casts',
    updateHistory = true
  ) => {
    setActiveTab('profile');
    setProfileTab(tab);
    setProfileCasts([]);
    setProfileCursor(undefined);
    setHasMoreProfileCasts(true);
    setIsLoadingProfile(true);

    try {
      const res = await fetch(`/api/users/${fidOrUsername}`);
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
        await fetchProfileCasts(data.user.fid, tab);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSelectProfileTab = (tab: 'casts' | 'replies' | 'quotes' | 'recasts' | 'likes') => {
    setProfileTab(tab);
    setProfileCasts([]);
    setProfileCursor(undefined);
    setHasMoreProfileCasts(true);
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
        setActiveTab('feed');
        if (typeof window !== 'undefined') {
          window.history.replaceState({ view: 'feed' }, '', '/');
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
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
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
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to publish cast');
      }

      setComposeText('');
      setQuoteCast(null);
      showToast('Cast submitted to node mempool. It will appear in feed once confirmed.');

      // Trigger feed refresh after 3.5s so the event indexed into PostgreSQL by the FeedWorker becomes visible
      setTimeout(() => {
        fetchFeed(sourceFilter, feedMode, session.fid);
      }, 3500);
    } catch (err: any) {
      const msg = err.message || 'Failed to publish cast to node';
      showToast(msg);
      if (msg.includes('invalid signer') && !msg.includes('lagging')) {
        setIsAuthModalOpen(true);
      }
    } finally {
      setIsPublishing(false);
    }
  };

  // 8.1 Publish Cast from ComposeCastModal (supporting multiple Catbox image embeds)
  const handleModalPublishCast = async (
    text: string,
    embeds?: Array<{ url?: string; castId?: { fid: number; hash: string } }>
  ): Promise<boolean> => {
    if (!text.trim() && (!embeds || embeds.length === 0)) return false;

    if (!session) {
      setIsAuthModalOpen(true);
      return false;
    }

    try {
      const res = await fetch('/api/casts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: session.fid,
          signerPrivateKey: session.signerPrivateKey,
          text: text.trim(),
          embeds,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to publish cast');
      }

      setQuoteCast(null);
      showToast('Cast submitted to node mempool. It will appear in feed once confirmed.');

      // Trigger feed refresh after 3.5s so the event indexed into PostgreSQL by the FeedWorker becomes visible
      setTimeout(() => {
        fetchFeed(sourceFilter, feedMode, session.fid);
      }, 3500);

      return true;
    } catch (err: any) {
      const msg = err.message || 'Failed to publish cast to node';
      showToast(msg);
      if (msg.includes('invalid signer') && !msg.includes('lagging')) {
        setIsAuthModalOpen(true);
      }
      throw err;
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
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        throw new Error(data.error || 'Failed to publish reply to node');
      }

      setReplyText('');
      showToast('Reply submitted to node mempool. It will appear in thread once confirmed.');

      // Trigger thread refresh after 3.5s
      setTimeout(() => {
        if (currentThreadCast) {
          handleOpenThread(currentThreadCast.hash, currentThreadCast.author?.username, false);
        }
      }, 3500);
    } catch (err: any) {
      showToast(err.message || 'Failed to publish reply');
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
    setProfileCasts((prev) => updateReactionInList(prev, !wasActive));

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
        setProfileCasts((prev) => updateReactionInList(prev, wasActive));

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
      setProfileCasts((prev) => updateReactionInList(prev, wasActive));
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
      setCurrentProfile((prev) =>
        prev
          ? {
              ...prev,
              followerCount: Math.max(0, (prev.followerCount ?? 0) + (isCurrentlyFollowed ? -1 : 1)),
            }
          : null
      );
    }

    setSession((prev) => {
      if (!prev) return null;
      const updatedSession: UserSession = {
        ...prev,
        followingCount: Math.max(0, (prev.followingCount ?? 0) + (isCurrentlyFollowed ? -1 : 1)),
      };
      try {
        localStorage.setItem('farcaster_session', JSON.stringify(updatedSession));
      } catch {}
      return updatedSession;
    });

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
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'ok') {
        // Revert follow state
        const reverted = new Set(followedFids);
        setFollowedFids(reverted);
        if (currentProfile?.fid === targetFid) {
          setIsFollowingCurrentProfile(isCurrentlyFollowed);
          setCurrentProfile((prev) =>
            prev
              ? {
                  ...prev,
                  followerCount: Math.max(0, (prev.followerCount ?? 0) + (isCurrentlyFollowed ? 1 : -1)),
                }
              : null
          );
        }
        setSession((prev) => {
          if (!prev) return null;
          const revertedSession: UserSession = {
            ...prev,
            followingCount: Math.max(0, (prev.followingCount ?? 0) + (isCurrentlyFollowed ? 1 : -1)),
          };
          try {
            localStorage.setItem('farcaster_session', JSON.stringify(revertedSession));
          } catch {}
          return revertedSession;
        });
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
        setCurrentProfile((prev) =>
          prev
            ? {
                ...prev,
                followerCount: Math.max(0, (prev.followerCount ?? 0) + (isCurrentlyFollowed ? 1 : -1)),
              }
            : null
        );
      }
      setSession((prev) => {
        if (!prev) return null;
        const revertedSession: UserSession = {
          ...prev,
          followingCount: Math.max(0, (prev.followingCount ?? 0) + (isCurrentlyFollowed ? 1 : -1)),
        };
        try {
          localStorage.setItem('farcaster_session', JSON.stringify(revertedSession));
        } catch {}
        return revertedSession;
      });
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
            <a
              href="/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all"
              title="Return to Quickstart & Tutorial Microsite"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Quickstart & Tutorial</span>
              <span className="sm:hidden">Guide</span>
            </a>
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsMobileSearchOpen((prev) => !prev)}
              title="Search users"
              className="lg:hidden p-1.5 text-slate-600 hover:text-purple-700 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Mobile Node Status Dot */}
            <div
              className="sm:hidden flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 border border-slate-200"
              title={nodeHealth.isOnline ? `Node Online (${nodeHealth.latencyMs}ms)` : 'Node Syncing'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </div>

            {/* Local Snapchain Network Status Pill */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                nodeHealth.isOnline
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
              title={nodeHealth.isOnline ? `Local Node Synced (${nodeHealth.latencyMs}ms)` : 'Connecting to local node...'}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  nodeHealth.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-[11px]">
                {nodeHealth.isOnline ? 'Node Online' : 'Syncing'}
              </span>
              {nodeHealth.isOnline && nodeHealth.latencyMs > 0 && (
                <span className="font-mono text-[10px] opacity-75">
                  {nodeHealth.latencyMs}ms
                </span>
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

      {/* Mobile Search Dropdown */}
      {isMobileSearchOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 p-3 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search Username"
              className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all"
            />
            {isSearching && (
              <RefreshCw className="h-3.5 w-3.5 text-purple-600 animate-spin absolute right-3 top-2.5" />
            )}
          </div>

          {/* Mobile Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {searchResults.map((u) => (
                <div
                  key={u.fid}
                  onClick={() => {
                    handleOpenProfile(u.username || u.fid, 'casts', true);
                    setIsMobileSearchOpen(false);
                  }}
                  className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FarcasterAvatar
                      src={u.pfpUrl}
                      alt={u.username}
                      fid={u.fid}
                      username={u.username}
                      className="h-7 w-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-slate-900 block truncate">
                        {u.displayName || `@${u.username}`}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">@{u.username} • FID {u.fid}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFollow(u.fid);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${
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
      )}

      {/* RESPONSIVE TOP FEED MODE SWITCHER (Following / Global) */}
      {activeTab === 'feed' && (
        <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between">
              {/* Following & Global Tabs */}
              <div className="flex items-center">
                <button
                  onClick={() => {
                    if (!session) {
                      setIsAuthModalOpen(true);
                      return;
                    }
                    setFeedMode('following');
                    fetchFeed(sourceFilter, 'following', session.fid);
                  }}
                  className={`relative py-3 px-4 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                    feedMode === 'following'
                      ? 'text-purple-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Following</span>
                  {feedMode === 'following' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setFeedMode('global');
                    fetchFeed(sourceFilter, 'global', session?.fid);
                  }}
                  className={`relative py-3 px-4 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 ${
                    feedMode === 'global'
                      ? 'text-purple-700'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Global</span>
                  {feedMode === 'global' && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-700 rounded-full" />
                  )}
                </button>
              </div>

              {/* Refresh Button */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchFeed(sourceFilter, feedMode, session?.fid)}
                  title="Refresh Feed"
                  className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoadingFeed ? 'animate-spin text-purple-600' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container: 3 Columns */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT SIDEBAR (Desktop Only) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-28 self-start lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto pr-0.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
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

                <a
                  href="/"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-all border border-transparent hover:border-purple-200"
                >
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  <span>Quickstart & Tutorial</span>
                </a>
              </nav>

              <hr className="border-slate-100 my-2" />

              {/* Compose Quick Button (Only for Logged-In Users) */}
              {session && (
                <button
                  onClick={() => {
                    setQuoteCast(null);
                    setIsComposeModalOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-4 text-sm shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

            {/* User Portfolio: Primary Wallet Card (Base & Ethereum) */}
            <WalletCard session={session} onOpenAuthModal={() => setIsAuthModalOpen(true)} />
          </aside>

          {/* CENTER COLUMN (Main Feed / Thread / Profile) */}
          <main className="col-span-1 lg:col-span-6 space-y-4 pb-24 lg:pb-8">
            {/* VIEW 1: HOME FEED */}
            {activeTab === 'feed' && (
              <div className="space-y-4">
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
                          ? "You are not following anyone yet. Discover and follow active builders across the protocol, or switch to the Global Network Feed!"
                          : "The creators you follow have not posted recently or their posts are still syncing. Switch to the Global Network Feed to see what's happening right now."
                        : 'Connected to local Snapchain node. If your node is syncing initial blocks, posts will stream in automatically.'}
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
                    {casts.filter(isRootCast).map((cast) => (
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
                          {(cast.clientName || cast.clientSource) && (
                            <span
                              title={
                                cast.signer
                                  ? `Cryptographic Signer: ${cast.signer}\nClient FID: ${cast.clientFid || 'N/A'}\nType: ${cast.clientType || 'other'}`
                                  : undefined
                              }
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getClientBadgeColor(
                                cast.clientName || cast.clientSource,
                                cast.clientType
                              )}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(
                                  cast.clientName || cast.clientSource,
                                  cast.clientType
                                )}`}
                              />
                              {cast.clientType === 'personal'
                                ? 'Self-registered'
                                : cast.clientName || cast.clientSource}
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
                              setIsComposeModalOpen(true);
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

                    {/* Infinite Scroll Sentinel / Load More */}
                    {hasMoreFeed && (
                      <div ref={feedObserverTarget} className="pt-4 pb-2 text-center">
                        <button
                          onClick={fetchMoreFeed}
                          disabled={isLoadingMoreFeed}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-all disabled:opacity-60"
                        >
                          {isLoadingMoreFeed ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-600" />
                              <span>Loading more casts...</span>
                            </>
                          ) : (
                            <span>Load More Casts (↓)</span>
                          )}
                        </button>
                      </div>
                    )}
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

                        {(currentThreadCast.clientName || currentThreadCast.clientSource) && (
                          <span
                            title={
                              currentThreadCast.signer
                                ? `Cryptographic Signer: ${currentThreadCast.signer}\nClient FID: ${currentThreadCast.clientFid || 'N/A'}\nType: ${currentThreadCast.clientType || 'other'}`
                                : undefined
                            }
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${getClientBadgeColor(
                              currentThreadCast.clientName || currentThreadCast.clientSource,
                              currentThreadCast.clientType
                            )}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(
                                currentThreadCast.clientName || currentThreadCast.clientSource,
                                currentThreadCast.clientType
                              )}`}
                            />
                            {currentThreadCast.clientType === 'personal'
                              ? 'Self-registered'
                              : currentThreadCast.clientName || currentThreadCast.clientSource}
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
                            setIsComposeModalOpen(true);
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

                    {/* Mobile Wallet Card (shown on mobile when viewing own profile) */}
                    {session && currentProfile.fid === session.fid && (
                      <div className="lg:hidden">
                        <WalletCard session={session} onOpenAuthModal={() => setIsAuthModalOpen(true)} />
                      </div>
                    )}

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
                        <>
                          {profileCasts.map((cast) => (
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
                                {(cast.clientName || cast.clientSource) && (
                                  <span
                                    title={
                                      cast.signer
                                        ? `Cryptographic Signer: ${cast.signer}\nClient FID: ${cast.clientFid || 'N/A'}\nType: ${cast.clientType || 'other'}`
                                        : undefined
                                    }
                                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getClientBadgeColor(
                                      cast.clientName || cast.clientSource,
                                      cast.clientType
                                    )}`}
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full ${getClientDotColor(
                                        cast.clientName || cast.clientSource,
                                        cast.clientType
                                      )}`}
                                    />
                                    {cast.clientType === 'personal'
                                      ? 'Self-registered'
                                      : cast.clientName || cast.clientSource}
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
                                  setIsComposeModalOpen(true);
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
                        ))}

                        {/* Infinite Scroll Sentinel / Load More for Profile */}
                        {hasMoreProfileCasts && (
                          <div ref={profileObserverTarget} className="pt-4 pb-2 text-center">
                            <button
                              onClick={fetchMoreProfileCasts}
                              disabled={isLoadingMoreProfileCasts}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-all disabled:opacity-60"
                            >
                              {isLoadingMoreProfileCasts ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-600" />
                                  <span>Loading more {profileTab}...</span>
                                </>
                              ) : (
                                <span>Load More (↓)</span>
                              )}
                            </button>
                          </div>
                        )}

                        {!hasMoreProfileCasts && profileCasts.length > 0 && (
                          <div className="text-center py-5 text-slate-400 text-xs">
                            <span className="inline-block px-3 py-1 bg-slate-100 rounded-full font-mono text-[11px]">
                              End of {profileTab}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR (Desktop Only: Search, Node Status, Suggested Follows) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-4 lg:sticky lg:top-28 self-start lg:max-h-[calc(100vh-7.5rem)] lg:overflow-y-auto pr-0.5">
            {/* Search Box Widget */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search Username"
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

            {/* Sovereign Snapchain Infrastructure Card */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3 transition-all hover:shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-50 text-purple-700 ring-1 ring-purple-500/10 shadow-xs">
                  <Server className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Sovereign Snapchain Node
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Autonomous Web Suite
                  </span>
                </div>
              </div>

              {/* Elegant & Professional Description */}
              <p className="text-xs text-slate-500 leading-relaxed">
                An open, self-hosted client connecting directly to the Snapchain network for decentralized feed curation, gasless key delegation, and sovereign identity ownership.
              </p>

              {/* Light-Themed GitHub Link Button */}
              <a
                href="https://github.com/mohammadma98/farcaster-snapchain-node-client"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 text-slate-800 hover:text-purple-900 px-3.5 py-2.5 transition-all text-xs font-semibold shadow-xs"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-slate-600 group-hover:text-purple-700 transition-colors" />
                  <span>View Source on GitHub</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-purple-600 font-mono transition-colors">
                  <span>MIT</span>
                  <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </div>
              </a>

              {/* Footer Attribution */}
              <div className="text-[10px] text-slate-400 text-center font-mono pt-0.5">
                mohammadma98 • Open Source
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Login Modal (Responsive & Scrollable for all screen heights) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 flex min-h-full items-center justify-center">
          <div className="relative w-full max-w-lg my-auto py-2">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="hidden sm:flex absolute -top-3 -right-3 z-20 p-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-md hover:scale-105 transition-all"
              title="Close modal"
            >
              <X className="h-4 w-4" />
            </button>
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onCancel={() => setIsAuthModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_25px_rgba(0,0,0,0.06)] pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 px-6 flex items-center justify-between lg:hidden select-none">
        {/* 1. Left: Home (Feed) */}
        <button
          onClick={() => {
            if (activeTab === 'feed') {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              fetchFeed(sourceFilter, feedMode, session?.fid);
            } else {
              handleBackToFeed(true);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 transition-all ${
            activeTab === 'feed'
              ? 'text-purple-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Home className={`h-5 w-5 ${activeTab === 'feed' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* 2. Center: Compose FAB */}
        <button
          onClick={() => {
            if (session) {
              setQuoteCast(null);
              setIsComposeModalOpen(true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          title="Create Cast"
          className="-mt-6 h-12 w-12 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white shadow-lg shadow-purple-600/35 border-4 border-white flex items-center justify-center transition-transform active:scale-90"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* 3. Right: Profile */}
        <button
          onClick={() => {
            if (session) {
              handleOpenProfile(session.username || session.fid, 'casts', true);
            } else {
              setIsAuthModalOpen(true);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 min-w-[64px] py-1 transition-all ${
            activeTab === 'profile' && profileFid === session?.fid
              ? 'text-purple-700 font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {session ? (
            <div
              className={`p-0.5 rounded-full border-2 transition-all ${
                activeTab === 'profile' && profileFid === session?.fid
                  ? 'border-purple-700'
                  : 'border-transparent'
              }`}
            >
              <FarcasterAvatar
                src={session.pfpUrl}
                alt={session.username}
                fid={session.fid}
                username={session.username}
                className="h-5 w-5 rounded-full object-cover"
              />
            </div>
          ) : (
            <User className={`h-5 w-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          )}
          <span className="text-[10px] tracking-tight">Profile</span>
        </button>
      </nav>

      {/* Professional Compose Cast Modal (Multi-Image Catbox Support) */}
      <ComposeCastModal
        isOpen={isComposeModalOpen}
        onClose={() => setIsComposeModalOpen(false)}
        session={session}
        onPublish={handleModalPublishCast}
        quoteCast={quoteCast}
        onClearQuote={() => setQuoteCast(null)}
      />
    </div>
  );
}
