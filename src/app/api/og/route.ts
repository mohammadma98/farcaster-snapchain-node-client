import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory server cache for parsed OpenGraph previews
const ogCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 2; // 2 hours

function isDirectImageUrl(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.svg') ||
    clean.endsWith('.avif') ||
    url.includes('imagedelivery.net') ||
    url.includes('i.imgur.com') ||
    url.includes('res.cloudinary.com')
  );
}

function isDirectVideoUrl(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.ogg')
  );
}

function extractMetaTag(html: string, property: string): string | null {
  // Regex match for property="xyz" content="..." or name="xyz" content="..."
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ];

  for (const regex of patterns) {
    const match = html.match(regex);
    if (match && match[1]) {
      return decodeHtmlEntities(match[1].trim());
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match && match[1] ? decodeHtmlEntities(match[1].trim()) : null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return NextResponse.json(
        { status: 'error', error: 'Valid URL is required' },
        { status: 400 }
      );
    }

    // Check memory cache
    const cached = ogCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ status: 'ok', ...cached.data });
    }

    // Direct Image fast-path
    if (isDirectImageUrl(targetUrl)) {
      const parsedUrl = new URL(targetUrl);
      const data = {
        url: targetUrl,
        mediaType: 'image',
        image: targetUrl,
        domain: parsedUrl.hostname,
        siteName: parsedUrl.hostname,
      };
      ogCache.set(targetUrl, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ status: 'ok', ...data });
    }

    // Direct Video fast-path
    if (isDirectVideoUrl(targetUrl)) {
      const parsedUrl = new URL(targetUrl);
      const data = {
        url: targetUrl,
        mediaType: 'video',
        video: targetUrl,
        domain: parsedUrl.hostname,
        siteName: parsedUrl.hostname,
      };
      ogCache.set(targetUrl, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return NextResponse.json({ status: 'ok', ...data });
    }

    // Fetch Webpage HTML
    let html = '';
    const headers = {
      'User-Agent': 'Twitterbot/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };

    try {
      const res = await fetch(targetUrl, {
        headers,
        signal: AbortSignal.timeout(5000),
        redirect: 'follow',
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch {
      // Fallback with standard browser agent
      try {
        const fallbackRes = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,*/*',
          },
          signal: AbortSignal.timeout(4000),
          redirect: 'follow',
        });
        if (fallbackRes.ok) {
          html = await fallbackRes.text();
        }
      } catch {
        // unreachable
      }
    }

    const parsedUrl = new URL(targetUrl);
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    const title =
      extractMetaTag(html, 'og:title') ||
      extractMetaTag(html, 'twitter:title') ||
      extractTitle(html) ||
      domain;

    const description =
      extractMetaTag(html, 'og:description') ||
      extractMetaTag(html, 'twitter:description') ||
      extractMetaTag(html, 'description');

    let image =
      extractMetaTag(html, 'og:image') ||
      extractMetaTag(html, 'twitter:image') ||
      extractMetaTag(html, 'og:image:url');

    // Resolve relative image URLs
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, targetUrl).toString();
      } catch {
        image = null;
      }
    }

    const siteName =
      extractMetaTag(html, 'og:site_name') ||
      extractMetaTag(html, 'twitter:site') ||
      domain;

    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    const data = {
      url: targetUrl,
      mediaType: 'website',
      title,
      description: description ? description.slice(0, 220) : null,
      image,
      siteName,
      domain,
      favicon,
    };

    ogCache.set(targetUrl, { data, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json({
      status: 'ok',
      ...data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: 'error', error: err.message || 'Failed to parse metadata' },
      { status: 500 }
    );
  }
}
