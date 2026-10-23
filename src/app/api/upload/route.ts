import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

/**
 * Validate image magic bytes to ensure file authenticity
 */
function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // GIF: GIF87a or GIF89a
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return true;
  }

  // WebP: RIFF....WEBP
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'No file provided or invalid format.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Image exceeds maximum limit of 10 MB.' },
        { status: 400 }
      );
    }

    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Only JPEG, PNG, GIF, and WebP images are supported.',
        },
        { status: 400 }
      );
    }

    // Read bytes for magic number validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isValidImageMagicBytes(buffer)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Corrupted image file or unrecognized header signature.',
        },
        { status: 400 }
      );
    }

    // Determine clean file extension
    let ext = 'png';
    if (mimeType === 'image/jpeg') ext = 'jpg';
    else if (mimeType === 'image/gif') ext = 'gif';
    else if (mimeType === 'image/webp') ext = 'webp';

    const fileName =
      (file as any).name?.replace(/[^a-zA-Z0-9._-]/g, '_') ||
      `farcaster-upload-${Date.now()}.${ext}`;

    // Prepare payload for Catbox API (No API Key Required)
    const catboxForm = new FormData();
    catboxForm.append('reqtype', 'fileupload');
    catboxForm.append('fileToUpload', new Blob([buffer], { type: mimeType }), fileName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const catboxResponse = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: catboxForm,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!catboxResponse.ok) {
      const errorText = await catboxResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: `Catbox storage failed: ${errorText || catboxResponse.statusText}`,
        },
        { status: 502 }
      );
    }

    const rawUrl = (await catboxResponse.text()).trim();

    // Validate that Catbox returned a valid HTTPS URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: `Invalid response URL from storage: ${rawUrl}` },
        { status: 502 }
      );
    }

    if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== 'files.catbox.moe') {
      return NextResponse.json(
        { success: false, error: 'Unexpected storage provider URL.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      url: parsedUrl.toString(),
      fileName,
      size: file.size,
      mimeType,
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Image upload timed out (25s).' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || 'Internal upload error.' },
      { status: 500 }
    );
  }
}
