/**
 * File-based import adapter — parses JSON, CSV, and XLSX files into
 * CreatorProfile objects. Used by the manual file upload flow as a
 * workaround for unstable browser extension collection.
 *
 * Unlike ManualImportAdapter (which accepts a single JSON string),
 * this module works with raw file content and supports multiple formats.
 *
 * @module adapters/file-import-adapter
 */

import type { CreatorProfile } from '../schema/creator-data';
import { validateCreatorProfile } from '../schema/validate';
import type { DataAdapter } from './types';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export type FileImportErrorCode = 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNSUPPORTED_FORMAT';

export class FileImportError extends Error {
  readonly code: FileImportErrorCode;
  readonly fileName: string;

  constructor(code: FileImportErrorCode, fileName: string, message: string) {
    super(`[${fileName}] ${message}`);
    this.name = 'FileImportError';
    this.code = code;
    this.fileName = fileName;
  }
}

// ---------------------------------------------------------------------------
// File extension detection
// ---------------------------------------------------------------------------

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

// ---------------------------------------------------------------------------
// JSON parsing
// ---------------------------------------------------------------------------

function ensureSource(profile: CreatorProfile): CreatorProfile {
  if (!profile.source) {
    return { ...profile, source: 'manual_import' };
  }
  return profile;
}

function parseJson(content: string, fileName: string): CreatorProfile[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new FileImportError('PARSE_ERROR', fileName, `Invalid JSON: ${msg}`);
  }

  const items = Array.isArray(parsed) ? parsed : [parsed];
  const results: CreatorProfile[] = [];

  for (let i = 0; i < items.length; i++) {
    const label = Array.isArray(parsed) ? `item[${i}]` : 'root';
    const item = items[i];

    // Inject source before validation if missing (validation requires it)
    if (typeof item === 'object' && item !== null && !('source' in item)) {
      (item as Record<string, unknown>).source = 'manual_import';
    }

    const validation = validateCreatorProfile(item);
    if (!validation.valid) {
      throw new FileImportError(
        'VALIDATION_ERROR',
        fileName,
        `Schema validation failed at ${label}:\n  - ${validation.errors.join('\n  - ')}`,
      );
    }
    results.push(item as CreatorProfile);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse raw file content into CreatorProfile array.
 * Dispatches to the correct parser based on file extension.
 *
 * @param content — For JSON/CSV: raw text string. For XLSX/XLS: base64-encoded string.
 * @param fileName — Original file name with extension (used for format detection and error messages).
 */
export async function parseFileContent(
  content: string,
  fileName: string,
): Promise<CreatorProfile[]> {
  const ext = getFileExtension(fileName);

  switch (ext) {
    case 'json':
      return parseJson(content, fileName);
    default:
      throw new FileImportError(
        'UNSUPPORTED_FORMAT',
        fileName,
        `Unsupported file format ".${ext}". Supported: .json, .csv, .xlsx`,
      );
  }
}

/**
 * DataAdapter interface implementation for the registry.
 * Accepts JSON string with format: { fileName: string, content: string }
 *
 * Note: The DataAdapter interface returns a single CreatorProfile, but
 * parseFileContent can return multiple (e.g., JSON array). This adapter
 * returns only the first profile. The actual file import flow in the
 * onboarding UI calls parseFileContent directly to handle multi-profile results.
 */
export class FileImportAdapter implements DataAdapter {
  readonly name = 'file_import';
  readonly description = 'Import creator data from uploaded files (JSON, CSV, XLSX)';

  async collect(input: string): Promise<CreatorProfile | null> {
    let payload: { fileName: string; content: string };
    try {
      payload = JSON.parse(input);
    } catch {
      return null;
    }
    if (!payload.fileName || !payload.content) return null;

    const profiles = await parseFileContent(payload.content, payload.fileName);
    return profiles[0] ?? null;
  }
}
