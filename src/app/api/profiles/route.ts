/**
 * GET /api/profiles
 *
 * Returns all collected creator snapshots from ~/.dashpersona/data/.
 * When no real profiles exist, returns demo data with an explicit reason
 * so the UI can surface the distinction to the user (per D-02, D-03).
 *
 * This route reads the filesystem directly (per D-01) — it does NOT proxy
 * through the Collector HTTP API. The web app can run independently of the
 * Collector process.
 *
 * Response shape:
 *   { source: 'real', profiles: CreatorSnapshot[] }                   — real data
 *   { source: 'demo', reason: string, profiles: CreatorProfile[] }    — demo fallback
 *   { source: 'error', reason: string, code: string, profiles: [] }   — unrecoverable error
 *
 * @module api/profiles
 */

import { NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { isCreatorSnapshot, validateCreatorSnapshot } from '@/lib/schema/snapshot';
import type { CreatorSnapshot } from '@/lib/schema/snapshot';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { CreatorProfile } from '@/lib/schema/creator-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Absolute path to the snapshot data directory. */
function getDataDir(): string {
  return join(homedir(), '.dashpersona', 'data');
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

type ProfilesResponse =
  | { source: 'real'; profiles: CreatorSnapshot[] }
  | { source: 'demo'; reason: string; profiles: CreatorProfile[] }
  | { source: 'error'; reason: string; code: string; profiles: [] };

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(): Promise<NextResponse<ProfilesResponse>> {
  const dataDir = getDataDir();

  // ── 1. List files in data directory ─────────────────────────

  let entries: string[];
  try {
    entries = await readdir(dataDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;

    if (code === 'ENOENT') {
      // Directory does not exist — Collector has never run
      return NextResponse.json(buildDemoFallback(
        'No data directory found at ~/.dashpersona/data/. ' +
        'Open the DashPersona Collector app and collect a creator to see real data here. ' +
        'Showing demo data in the meantime.',
      ));
    }

    if (code === 'EACCES' || code === 'EPERM') {
      return NextResponse.json(
        {
          source: 'error',
          reason:
            'Permission denied reading ~/.dashpersona/data/. ' +
            'Check that the directory is readable by your user (chmod 755 ~/.dashpersona/data).',
          code: 'READ_PERMISSION_DENIED',
          profiles: [],
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        source: 'error',
        reason: `Unexpected error reading data directory: ${(err as Error).message}. ` +
          'Please file a GitHub issue with this error message.',
        code: 'READ_DIR_ERROR',
        profiles: [],
      },
      { status: 500 },
    );
  }

  // ── 2. Filter to .json files, skip .tmp- files ───────────────

  const jsonFiles = entries.filter(
    (f) => f.endsWith('.json') && !f.startsWith('.tmp-'),
  );

  if (jsonFiles.length === 0) {
    return NextResponse.json(buildDemoFallback(
      'No collected profiles found in ~/.dashpersona/data/. ' +
      'Open the DashPersona Collector app and collect a creator to see real data here. ' +
      'Showing demo data in the meantime.',
    ));
  }

  // ── 3. Read and validate each snapshot file ──────────────────

  const validSnapshots: CreatorSnapshot[] = [];
  const parseErrors: { file: string; errors: string[] }[] = [];

  await Promise.all(
    jsonFiles.map(async (filename) => {
      const filePath = join(dataDir, filename);
      let raw: string;
      try {
        raw = await readFile(filePath, 'utf-8');
      } catch (err) {
        parseErrors.push({
          file: filename,
          errors: [`Could not read file: ${(err as Error).message}`],
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parseErrors.push({
          file: filename,
          errors: ['File contains invalid JSON — it may be corrupted'],
        });
        return;
      }

      const validation = validateCreatorSnapshot(parsed);
      if (!validation.valid) {
        parseErrors.push({ file: filename, errors: validation.errors });
        return;
      }

      if (isCreatorSnapshot(parsed)) {
        validSnapshots.push(parsed);
      }
    }),
  );

  // ── 4. Return results ────────────────────────────────────────

  if (validSnapshots.length === 0) {
    // Files exist but none passed validation — report errors, fall back to demo
    const errorSummary = parseErrors
      .map((e) => `${e.file}: ${e.errors.join('; ')}`)
      .join(' | ');

    return NextResponse.json(buildDemoFallback(
      `Found ${jsonFiles.length} snapshot file(s) but none passed validation. ` +
      `Errors: ${errorSummary}. ` +
      'Showing demo data. You may need to re-collect this creator.',
    ));
  }

  // Sort snapshots: newest collectedAt first
  validSnapshots.sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );

  return NextResponse.json({ source: 'real', profiles: validSnapshots });
}

// ---------------------------------------------------------------------------
// Demo fallback builder
// ---------------------------------------------------------------------------

/**
 * Build a demo fallback response with explicit reason.
 * Returns all three demo persona types across all platforms.
 */
function buildDemoFallback(reason: string): Extract<ProfilesResponse, { source: 'demo' }> {
  const tutorialProfiles = getDemoProfile('tutorial');
  const entertainmentProfiles = getDemoProfile('entertainment');
  const lifestyleProfiles = getDemoProfile('lifestyle');

  const profiles = [
    ...Object.values(tutorialProfiles),
    ...Object.values(entertainmentProfiles),
    ...Object.values(lifestyleProfiles),
  ];

  return { source: 'demo', reason, profiles };
}
