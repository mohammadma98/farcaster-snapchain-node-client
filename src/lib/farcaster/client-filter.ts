import { FarcasterCast, ClientFilterConfig } from './types';

export interface ClientAttribution {
  clientName: string;
  badgeColor: string;
  confidence: 'high' | 'medium' | 'inferred';
  indicator: string;
}

/**
 * Detect client source of a cast using protocol embeds, parentUrls, and signatures
 */
export function identifyCastClient(cast: {
  text?: string;
  parentUrl?: string;
  embeds?: Array<{ url?: string; castId?: any }>;
  hash?: string;
  clientSource?: string;
  isLocal?: boolean;
}): ClientAttribution {
  const text = cast.text || '';
  const parentUrl = cast.parentUrl || '';
  const embeds = cast.embeds || [];
  const embedUrls = embeds.map(e => e.url || '').filter(Boolean);

  // 1. Direct local client submissions / Self-registered keys
  if (cast.isLocal || cast.clientSource === 'Self-registered' || (cast.clientSource === 'Direct Snapchain' && (cast.hash?.startsWith('0xlocal') || !cast.parentUrl?.includes('warpcast.com')))) {
    return {
      clientName: 'Self-registered',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      confidence: 'high',
      indicator: 'Self-registered personal key submission',
    };
  }

  // 2. Supercast detection
  if (
    embedUrls.some(u => u.includes('supercast.xyz') || u.includes('supercast.mypinata.cloud')) ||
    text.includes('via @supercast') ||
    text.includes('supercast.xyz')
  ) {
    return {
      clientName: 'Supercast',
      badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200',
      confidence: 'high',
      indicator: 'Supercast App Key / embed',
    };
  }

  // 3. Phaver detection
  if (
    embedUrls.some(u => u.includes('phaver.com')) ||
    text.includes('phaver.com') ||
    text.includes('Shared via @phaver') ||
    text.includes('via Phaver')
  ) {
    return {
      clientName: 'Phaver',
      badgeColor: 'text-pink-700 bg-pink-50 border-pink-200',
      confidence: 'high',
      indicator: 'Phaver protocol signature',
    };
  }

  // 4. Paragraph detection
  if (
    embedUrls.some(u => u.includes('paragraph.xyz')) ||
    text.includes('paragraph.xyz')
  ) {
    return {
      clientName: 'Paragraph',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      confidence: 'high',
      indicator: 'Paragraph article publication',
    };
  }

  // 5. Bountycaster detection
  if (
    embedUrls.some(u => u.includes('bountycaster.xyz')) ||
    text.toLowerCase().includes('bountycaster')
  ) {
    return {
      clientName: 'Bountycaster',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
      confidence: 'high',
      indicator: 'Bountycaster bounty publication',
    };
  }

  // 6. Herocast detection
  if (
    embedUrls.some(u => u.includes('herocast.xyz')) ||
    text.includes('via @herocast')
  ) {
    return {
      clientName: 'Herocast',
      badgeColor: 'text-orange-700 bg-orange-50 border-orange-200',
      confidence: 'high',
      indicator: 'Herocast signature',
    };
  }

  // 7. Jam detection
  if (embedUrls.some(u => u.includes('jam.so'))) {
    return {
      clientName: 'Jam',
      badgeColor: 'text-violet-700 bg-violet-50 border-violet-200',
      confidence: 'high',
      indicator: 'Jam audio cast',
    };
  }

  // 8. Explicit local client source / Self-registered
  if (cast.clientSource === 'Self-registered' || cast.clientSource === 'Direct Snapchain') {
    return {
      clientName: 'Self-registered',
      badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      confidence: 'high',
      indicator: 'Self-registered personal key submission',
    };
  }

  // 9. Warpcast detection & standard network casts
  // Warpcast is the primary default client of the Farcaster network.
  // Casts with imagedelivery.net (Cloudflare / Warpcast images), channel links (chain:// or warpcast.com/~/channel),
  // or standard network broadcasts originate from Warpcast.
  return {
    clientName: 'Warpcast',
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
    confidence: 'high',
    indicator: 'Warpcast client broadcast',
  };
}

/**
 * Filter casts according to client filter rules:
 * - 'all': Show all casts
 * - 'include': Show ONLY casts originating from selectedClients
 * - 'exclude': Show all EXCEPT casts originating from selectedClients
 * - keywordFilters: Remove casts matching blocked phrases
 */
export function applyClientFilter(
  casts: FarcasterCast[],
  config: ClientFilterConfig
): {
  filtered: FarcasterCast[];
  stats: {
    total: number;
    shown: number;
    hidden: number;
    byClient: Record<string, number>;
  };
} {
  const stats = {
    total: casts.length,
    shown: 0,
    hidden: 0,
    byClient: {} as Record<string, number>,
  };

  const filtered = casts.filter(cast => {
    const client = cast.clientSource || identifyCastClient(cast).clientName;
    stats.byClient[client] = (stats.byClient[client] || 0) + 1;

    // Keyword filtering
    if (config.keywordFilters && config.keywordFilters.length > 0) {
      const lowerText = (cast.text || '').toLowerCase();
      const matchesKeyword = config.keywordFilters.some(
        kw => kw.trim() && lowerText.includes(kw.trim().toLowerCase())
      );
      if (matchesKeyword) {
        stats.hidden++;
        return false;
      }
    }

    // Client mode filtering
    if (config.mode === 'include') {
      const match = config.selectedClients.includes(client);
      if (!match) stats.hidden++;
      else stats.shown++;
      return match;
    } else if (config.mode === 'exclude') {
      const match = config.selectedClients.includes(client);
      if (match) {
        stats.hidden++;
        return false;
      } else {
        stats.shown++;
        return true;
      }
    }

    // 'all'
    stats.shown++;
    return true;
  });

  return { filtered, stats };
}
