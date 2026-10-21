import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // 1. Direct local fallback for Mohammad's avatar
  if (
    targetUrl.includes('soNnpxz') ||
    targetUrl.includes('mohammad98') ||
    targetUrl === '/images/mohammad98.jpg'
  ) {
    try {
      const localPath = path.join(process.cwd(), 'public', 'images', 'mohammad98.jpg');
      if (fs.existsSync(localPath)) {
        const buffer = fs.readFileSync(localPath);
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
    } catch {
      // Fall through to proxy or svg
    }
  }

  // 2. Fetch external image with robust headers
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await res.arrayBuffer();
      return new NextResponse(Buffer.from(arrayBuffer), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }
  } catch {
    // ignore fetch error and fall through to SVG fallback
  }

  // 3. Deterministic SVG Identicon Fallback (Zero Broken Images)
  const seed = encodeURIComponent(targetUrl).slice(-6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c3aed" />
        <stop offset="100%" stop-color="#4f46e5" />
      </linearGradient>
    </defs>
    <rect width="128" height="128" rx="64" fill="url(#g)" />
    <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" font-size="48">
      ${seed.slice(0, 1).toUpperCase() || 'F'}
    </text>
  </svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
