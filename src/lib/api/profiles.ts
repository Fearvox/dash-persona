/**
 * Shared data-fetching logic for creator profiles.
 * Used by both:
 *   - GET /api/profiles   (the HTTP API route)
 *   - Server-component Dashboard page (direct import, no HTTP overhead)
 *
 * Reads collector snapshots from ~/.dashpersona/data/ and falls back to
 * demo data when the directory is empty or all files are invalid.
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { isCreatorSnapshot, validateCreatorSnapshot } from '@/lib/schema/snapshot';
import { getDemoProfile } from '@/lib/adapters/demo-adapter';
import type { CreatorSnapshot } from '@/lib/schema/snapshot';
import type { CreatorProfile } from '@/lib/schema/creator-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfilesResult =
  | { source: 'real'; profiles: CreatorSnapshot[] }
  | { source: 'demo'; reason: string; profiles: CreatorProfile[] }
  | { source: 'error'; reason: string; code: string; profiles: [] };

// ---------------------------------------------------------------------------
// Data directory
// ---------------------------------------------------------------------------

function getDataDir(): string {
  return join(homedir(), '.dashpersona', 'data');
}

// ---------------------------------------------------------------------------
// Demo fallback builder
// ---------------------------------------------------------------------------

function buildDemoFallback(reason: string): Extract<ProfilesResult, { source: 'demo' }> {
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

// ---------------------------------------------------------------------------
// Main fetcher
// ---------------------------------------------------------------------------

export async function getProfiles(): Promise<ProfilesResult> {
  const dataDir = getDataDir();

  let entries: string[];
  try {
    entries = await readdir(dataDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      return buildDemoFallback(
        'No data directory found at ~/.dashpersona/data/. ' +
        'Open the DashPersona Collector app and collect a creator to see real data here. ' +
        'Showing demo data in the meantime.',
      );
    }
    if (code === 'EACCES' || code === 'EPERM') {
      return {
        source: 'error',
        reason: 'Permission denied reading ~/.dashpersona/data/.',
        code: 'READ_PERMISSION_DENIED',
        profiles: [],
      };
    }
    return {
      source: 'error',
      reason: `Unexpected error reading data directory: ${(err as Error).message}.`,
      code: 'READ_DIR_ERROR',
      profiles: [],
    };
  }

  const jsonFiles = entries.filter(
    (f) => f.endsWith('.json') && !f.startsWith('.tmp-'),
  );

  if (jsonFiles.length === 0) {
    return buildDemoFallback(
      'No collected profiles found in ~/.dashpersona/data/. ' +
      'Open the DashPersona Collector app and collect a creator to see real data here. ' +
      'Showing demo data in the meantime.',
    );
  }

  const validSnapshots: CreatorSnapshot[] = [];
  const parseErrors: { file: string; errors: string[] }[] = [];

  await Promise.all(
    jsonFiles.map(async (filename) => {
      const filePath = join(dataDir, filename);
      let raw: string;
      try {
        raw = await readFile(filePath, 'utf-8');
      } catch (err) {
        parseErrors.push({ file: filename, errors: [`Could not read: ${(err as Error).message}`] });
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parseErrors.push({ file: filename, errors: ['Invalid JSON'] });
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

  if (validSnapshots.length === 0) {
    const errorSummary = parseErrors.map((e) => `${e.file}: ${e.errors.join('; ')}`).join(' | ');
    return buildDemoFallback(
      `Found ${jsonFiles.length} snapshot file(s) but none passed validation. ` +
      `Errors: ${errorSummary}. Showing demo data.`,
    );
  }

  validSnapshots.sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );

  return { source: 'real', profiles: validSnapshots };
}
