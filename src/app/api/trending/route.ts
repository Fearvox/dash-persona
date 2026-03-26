import { NextRequest, NextResponse } from 'next/server';
import { collectTrending, checkCdpReady } from '@/lib/collectors/trending-collector';
import { cleanupExpired, getStorageStats } from '@/lib/collectors/tmp-manager';

const TIMEOUT_MS = 120_000; // 2 minutes — trending scans multiple pages

// ---------------------------------------------------------------------------
// GET /api/trending — health check, storage stats, or cleanup
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action');

  if (action === 'cleanup') {
    const result = cleanupExpired();
    return NextResponse.json({ ...result, cleanedAt: new Date().toISOString() });
  }

  if (action === 'stats') {
    const stats = getStorageStats();
    return NextResponse.json(stats);
  }

  // Default: check CDP readiness
  const ready = await checkCdpReady();
  return NextResponse.json({ ready });
}

// ---------------------------------------------------------------------------
// POST /api/trending — collect trending data for a platform + keywords
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: { platform: 'xhs' | 'tiktok'; keywords: string[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'PARSE_ERROR' },
      { status: 400 },
    );
  }

  const { platform, keywords } = body;

  if (!platform || !keywords?.length) {
    return NextResponse.json(
      { error: 'Missing required fields: platform, keywords[]', code: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  if (!['xhs', 'tiktok'].includes(platform)) {
    return NextResponse.json(
      { error: `Unsupported platform: ${platform}`, code: 'UNSUPPORTED_PLATFORM' },
      { status: 400 },
    );
  }

  const ready = await checkCdpReady();
  if (!ready) {
    return NextResponse.json(
      { error: 'CDP proxy is not running. Start the proxy first.', code: 'PROXY_NOT_RUNNING' },
      { status: 503 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const collection = await Promise.race([
      collectTrending(platform, keywords),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new Error(`Trending collection timed out after ${TIMEOUT_MS / 1000}s`));
        });
      }),
    ]);

    clearTimeout(timeout);

    return NextResponse.json({
      collection,
      summary: {
        platform,
        keywords,
        postsCollected: collection.posts.length,
        topicsCollected: collection.topics.length,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const isTimeout = message.includes('timed out');
    return NextResponse.json(
      { error: message, code: isTimeout ? 'TIMEOUT' : 'COLLECTION_FAILED' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
