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
}): ClientAttribution {
  // If already tagged by signer or upstream metadata, return it
  if (cast.clientSource) {
    if (cast.clientSource === 'Warpcast') {
      return { clientName: 'Warpcast', badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20', confidence: 'high', indicator: 'Signer metadata / Channel origin' };
    }
    if (cast.clientSource === 'Supercast') {
      return { clientName: 'Supercast', badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', confidence: 'high', indicator: 'Supercast App Key / embed' };
    }
    if (cast.clientSource === 'Phaver') {
      return { clientName: 'Phaver', badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20', confidence: 'high', indicator: 'Phaver protocol signature' };
    }
    if (cast.clientSource === 'Direct Snapchain') {
      return { clientName: 'Direct Snapchain', badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', confidence: 'high', indicator: 'Native node submission' };
    }
  }

  const text = cast.text || '';
  const parentUrl = cast.parentUrl || '';
  const embeds = cast.embeds || [];
  const embedUrls = embeds.map(e => e.url || '').filter(Boolean);

  // 1. Supercast detection
  if (
    embedUrls.some(u => u.includes('supercast.xyz')) ||
    text.includes('via @supercast') ||
    text.includes('supercast.xyz')
  ) {
    return {
      clientName: 'Supercast',
      badgeColor: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      confidence: 'high',
      indicator: 'Supercast embed / signature',
    };
  }

  // 2. Warpcast detection
  if (
    parentUrl.includes('warpcast.com') ||
    embedUrls.some(u => u.includes('warpcast.com')) ||
    embedUrls.some(u => u.includes('client.warpcast.com'))
  ) {
    return {
      clientName: 'Warpcast',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      confidence: 'high',
      indicator: 'Warpcast channel / embed',
    };
  }

  // 3. Phaver detection
  if (
    embedUrls.some(u => u.includes('phaver.com')) ||
    text.includes('phaver.com') ||
    text.includes('Shared via @phaver')
  ) {
    return {
      clientName: 'Phaver',
      badgeColor: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      confidence: 'high',
      indicator: 'Phaver embed',
    };
  }

  // 4. Herocast detection
  if (
    embedUrls.some(u => u.includes('herocast.xyz')) ||
    text.includes('via @herocast')
  ) {
    return {
      clientName: 'Herocast',
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      confidence: 'high',
      indicator: 'Herocast signature',
    };
  }

  // 5. Paragraph / Paragraph.xyz blog cast
  if (embedUrls.some(u => u.includes('paragraph.xyz'))) {
    return {
      clientName: 'Paragraph',
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      confidence: 'medium',
      indicator: 'Paragraph article publication',
    };
  }

  // 6. Direct Snapchain / Custom Native Client (No intermediary branding)
  return {
    clientName: 'Direct Snapchain',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    confidence: 'inferred',
    indicator: 'Raw protocol message',
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
