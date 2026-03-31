/**
 * GET /api/run-log
 *
 * Returns collection run history from ~/.dashpersona/run-log.json.
 * Returns { entries: [] } when the file does not exist (Collector not yet used).
 *
 * Supports optional query parameters:
 *   platform=tiktok|douyin|xhs  — filter by platform
 *   status=success|failed|captcha|skipped  — filter by status
 *   limit=N  — return at most N entries (default: all)
 *
 * Matches the access pattern used by /api/profiles for consistency.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

interface RunLogEntry {
  id: string;
  timestamp: string;
  creatorUniqueId: string;
  platform: string;
  status: 'success' | 'failed' | 'captcha' | 'skipped';
  durationMs: number;
  snapshotFile?: string;
  error?: {
    code: string;
    message: string;
    remediation: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const runLogPath = join(homedir(), '.dashpersona', 'run-log.json');

  let allEntries: RunLogEntry[] = [];

  // Retry logic for concurrent rename windows (Review #10: atomicWriteJSON
  // in the Collector uses tmp + rename, which can cause a brief ENOENT or
  // partial read in the web app). Max 2 attempts with 50ms delay.
  const MAX_RETRIES = 2;
  const RETRY_DELAY_MS = 50;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await readFile(runLogPath, 'utf-8');
      allEntries = JSON.parse(raw) as RunLogEntry[];
      break; // success
    } catch {
      if (attempt === MAX_RETRIES) {
        // File does not exist or is not valid JSON after retries — return empty array
        return NextResponse.json({ entries: [] });
      }
      // Wait briefly before retry (concurrent rename may be in progress)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // Apply optional filters from query params
  const { searchParams } = request.nextUrl;
  const platformFilter = searchParams.get('platform');
  const statusFilter = searchParams.get('status');
  const limitParam = searchParams.get('limit');

  let filtered = allEntries;

  if (platformFilter) {
    filtered = filtered.filter((e) => e.platform === platformFilter);
  }

  if (statusFilter) {
    filtered = filtered.filter((e) => e.status === statusFilter);
  }

  // Sort: newest first (ISO timestamps sort lexicographically)
  filtered = [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (limitParam) {
    const limit = parseInt(limitParam, 10);
    if (!isNaN(limit) && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
  }

  return NextResponse.json({
    entries: filtered,
    total: allEntries.length,
  });
}
