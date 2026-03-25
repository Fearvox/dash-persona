import { NextRequest, NextResponse } from 'next/server';
import { BrowserAdapter, BrowserAdapterError } from '@/lib/adapters/browser-adapter';

const TIMEOUT_MS = 60_000;

export async function POST(req: NextRequest) {
  let body: { platform: string; userId?: string; url?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'PARSE_ERROR' },
      { status: 400 },
    );
  }

  const { platform, userId, url } = body;

  if (!platform) {
    return NextResponse.json(
      { error: 'Missing required field: platform', code: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  const adapter = new BrowserAdapter();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const profile = await Promise.race([
      adapter.collect(JSON.stringify({ platform, userId, url })),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          reject(new BrowserAdapterError('TIMEOUT', `Collection timed out after ${TIMEOUT_MS / 1000}s`));
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
    if (err instanceof BrowserAdapterError) {
      const statusMap: Record<string, number> = {
        CLI_NOT_FOUND: 503,
        TIMEOUT: 504,
        UNSUPPORTED_PLATFORM: 400,
        NO_DATA: 404,
        COMMAND_FAILED: 502,
        PARSE_ERROR: 502,
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
