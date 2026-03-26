import { NextRequest, NextResponse } from 'next/server';
import { CDPAdapter, CDPAdapterError } from '@/lib/adapters/cdp-adapter';

const TIMEOUT_MS = 300_000; // 5 min — Douyin full scroll takes up to 3 min
const CDP_HEALTH_URL = 'http://127.0.0.1:3458/health';

export async function GET() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);

    const res = await fetch(CDP_HEALTH_URL, { signal: controller.signal });
    clearTimeout(timeout);

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function POST(req: NextRequest) {
  let body: { platform: 'douyin' | 'tiktok' | 'xhs'; input?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'PARSE_ERROR' },
      { status: 400 },
    );
  }

  const { platform, input } = body;

  if (!platform) {
    return NextResponse.json(
      { error: 'Missing required field: platform', code: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  const adapter = new CDPAdapter();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const profile = await Promise.race([
      adapter.collect(JSON.stringify({ platform, input })),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new CDPAdapterError('TIMEOUT', `Collection timed out after ${TIMEOUT_MS / 1000}s`));
        });
      }),
    ]);

    clearTimeout(timeout);

    if (!profile) {
      return NextResponse.json(
        { error: 'No data collected', code: 'NO_DATA' },
        { status: 404 },
      );
    }

    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof CDPAdapterError) {
      const statusMap: Record<string, number> = {
        PROXY_NOT_RUNNING: 503,
        NOT_LOGGED_IN: 401,
        TIMEOUT: 504,
        PARSE_ERROR: 502,
        NAVIGATION_FAILED: 502,
      };
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusMap[err.code] ?? 500 },
      );
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: message, code: 'UNKNOWN' },
      { status: 500 },
    );
  }
}
