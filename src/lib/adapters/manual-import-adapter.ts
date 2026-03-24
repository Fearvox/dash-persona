/**
 * Manual import adapter — accepts raw JSON and validates it against
 * the CreatorProfile schema.
 *
 * This adapter is the primary ingestion path for users who export
 * data from platform dashboards or other tools and paste / upload
 * the JSON directly.
 *
 * @module adapters/manual-import-adapter
 */

import type { CreatorProfile } from '../schema/creator-data';
import { validateCreatorProfile } from '../schema/validate';
import type { DataAdapter } from './types';

export class ManualImportAdapter implements DataAdapter {
  readonly name = 'manual_import';
  readonly description = 'Import creator data from a JSON string with schema validation';

  async collect(input: string): Promise<CreatorProfile | null> {
    if (!input || input.trim().length === 0) {
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ManualImportError('PARSE_ERROR', `Invalid JSON: ${message}`);
    }

    const result = validateCreatorProfile(parsed);
    if (!result.valid) {
      throw new ManualImportError(
        'VALIDATION_ERROR',
        `Schema validation failed:\n  - ${result.errors.join('\n  - ')}`,
      );
    }

    // Ensure the source field is set
    const profile = parsed as CreatorProfile;
    if (!profile.source) {
      (profile as unknown as Record<string, unknown>).source = 'manual_import';
    }

    return profile;
  }
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type ManualImportErrorCode = 'PARSE_ERROR' | 'VALIDATION_ERROR';

export class ManualImportError extends Error {
  readonly code: ManualImportErrorCode;

  constructor(code: ManualImportErrorCode, message: string) {
    super(message);
    this.name = 'ManualImportError';
    this.code = code;
  }
}
