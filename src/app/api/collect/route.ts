import { NextRequest, NextResponse } from 'next/server';
import {
  parseTikTokProfile,
  isTikTokUrl,
} from '@/lib/adapters/html-parse-adapter';

// SSRF protection: only allow known social media domains
const ALLOWED_HOSTS = ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com'];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Block private IPs
    const host = parsed.hostname;
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    ) {
      return false;
    }
    return ALLOWED_HOSTS.some(
      (h) => parsed.hostname === h || parsed.hostname.endsWith('.' + h),
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body?.url;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid "url" field' },
        { status: 400 },
      );
    }

    if (!isAllowedUrl(url)) {
      return NextResponse.json(
        { error: 'URL not allowed. Only TikTok profile URLs are supported.' },
        { status: 403 },
      );
    }

    if (!isTikTokUrl(url)) {
      return NextResponse.json(
        { error: 'Only TikTok URLs are currently supported.' },
        { status: 400 },
      );
    }

    const profile = await parseTikTokProfile(url);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message.includes('aborted') || message.includes('abort')) {
      return NextResponse.json(
        { error: 'Request timed out. TikTok may be blocking this request.' },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: `Failed to fetch profile: ${message}` },
      { status: 502 },
    );
  }
}
