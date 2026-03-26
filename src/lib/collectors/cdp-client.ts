/**
 * Shared CDP proxy HTTP client for dash-persona collectors.
 *
 * Provides a thin typed wrapper around the HTTP API exposed by the locally-
 * running Chrome DevTools Protocol proxy at localhost:3458. All helper
 * functions use `AbortSignal.timeout` to enforce a hard per-request deadline
 * and surface a human-readable error when the proxy is unreachable.
 *
 * This module is intentionally free of any domain logic so that it can be
 * imported by cdp-adapter, trending-collector, and any future collectors
 * without introducing circular dependencies.
 *
 * @module collectors/cdp-client
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CDP_BASE = 'http://127.0.0.1:3458';

/** Hard deadline for every individual HTTP call to the proxy. */
export const REQUEST_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

/**
 * Core fetch wrapper.  Translates connection-refused errors into a clear
 * message, and non-OK HTTP responses into thrown errors.  All successful
 * responses are parsed as JSON and returned as `unknown`.
 */
async function cdpFetch(path: string, init?: RequestInit): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${CDP_BASE}${path}`, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch failed') ||
      msg.includes('Failed to fetch') ||
      msg.includes('ENOTFOUND')
    ) {
      throw new Error('CDP proxy not running at localhost:3458');
    }
    throw new Error(`CDP proxy unreachable: ${msg}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `CDP proxy returned HTTP ${res.status} for ${path}: ${body.slice(0, 200)}`,
    );
  }

  try {
    return await res.json();
  } catch {
    throw new Error(`CDP proxy response was not valid JSON at ${path}`);
  }
}

// ---------------------------------------------------------------------------
// Exported CDP helpers
// ---------------------------------------------------------------------------

/**
 * Ping the proxy health endpoint.
 * Returns `true` when the proxy responds with `{ status: "ok" }`.
 * Never throws — returns `false` on any error.
 */
export async function cdpHealth(): Promise<boolean> {
  try {
    const data = await cdpFetch('/health') as { status?: string };
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Open a new background Chrome tab and navigate it to `url`.
 * Returns the opaque `targetId` string that must be passed to all
 * subsequent operations on that tab.
 */
export async function cdpNew(url: string): Promise<string> {
  const data = await cdpFetch(
    `/new?url=${encodeURIComponent(url)}`,
  ) as { targetId?: string };

  if (!data.targetId) {
    throw new Error(`CDP /new did not return targetId for URL: ${url}`);
  }
  return data.targetId;
}

/**
 * Evaluate arbitrary JavaScript in the context of a tab.
 * Returns whatever the expression evaluates to (serialised through JSON).
 *
 * @param target  The `targetId` returned by `cdpNew`.
 * @param js      JavaScript source to evaluate (expression or IIFE).
 */
export async function cdpEval(target: string, js: string): Promise<unknown> {
  const data = await cdpFetch(
    `/eval?target=${encodeURIComponent(target)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: js,
    },
  ) as { value?: unknown };
  return data.value;
}

/**
 * Click the first element matching `selector` in the given tab.
 *
 * @param target    The `targetId` returned by `cdpNew`.
 * @param selector  CSS selector or `:contains()` selector string.
 */
export async function cdpClick(target: string, selector: string): Promise<void> {
  await cdpFetch(`/click?target=${encodeURIComponent(target)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: selector,
  });
}

/**
 * Scroll the page inside a tab.
 *
 * @param target     The `targetId` returned by `cdpNew`.
 * @param direction  `"bottom"` (default), `"top"`, `"down"`, or `"up"`.
 */
export async function cdpScroll(
  target: string,
  direction: string = 'bottom',
): Promise<void> {
  await cdpFetch(
    `/scroll?target=${encodeURIComponent(target)}&direction=${encodeURIComponent(direction)}`,
  );
}

/**
 * Close the background tab identified by `target`.
 * Best-effort: does not throw on failure.
 */
export async function cdpClose(target: string): Promise<void> {
  await cdpFetch(`/close?target=${encodeURIComponent(target)}`);
}

/**
 * Navigate an already-open tab to a new URL and wait for the proxy to
 * acknowledge the navigation.
 *
 * @param target  The `targetId` returned by `cdpNew`.
 * @param url     The URL to navigate to.
 */
export async function cdpNavigate(target: string, url: string): Promise<void> {
  await cdpFetch(
    `/navigate?target=${encodeURIComponent(target)}&url=${encodeURIComponent(url)}`,
  );
}

/**
 * Capture a PNG screenshot of the visible viewport in a tab and save it to
 * disk at `filePath`.  The proxy handles the file write; the caller only
 * needs to supply the absolute destination path.
 *
 * @param target    The `targetId` returned by `cdpNew`.
 * @param filePath  Absolute path where the PNG should be saved on disk.
 */
export async function cdpScreenshot(target: string, filePath: string): Promise<void> {
  await cdpFetch(
    `/screenshot?target=${encodeURIComponent(target)}&file=${encodeURIComponent(filePath)}`,
  );
}

// ---------------------------------------------------------------------------
// Shared utility helpers
// ---------------------------------------------------------------------------

/**
 * Parse Chinese number suffixes used by XHS and Douyin.
 *
 * Examples:
 *   "6.08万"  → 60_800
 *   "1.28亿"  → 128_000_000
 *   "12,300"  → 12_300
 *   "0"       → 0
 *   "-"       → 0
 */
export function parseChineseNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  if (cleaned.endsWith('亿')) {
    const n = parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 100_000_000) : 0;
  }
  if (cleaned.endsWith('万')) {
    const n = parseFloat(cleaned.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 10_000) : 0;
  }

  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Parse TikTok K/M/B suffixes and fall back to Chinese suffixes for
 * mixed-locale content in TikTok's Chinese UI.
 *
 * Examples:
 *   "21K"   → 21_000
 *   "1.5M"  → 1_500_000
 *   "2.3B"  → 2_300_000_000
 *   "139M"  → 139_000_000
 *   "6.08万" → 60_800  (Chinese fallback)
 */
export function parseTiktokNumber(str: string): number {
  if (!str) return 0;
  const cleaned = str.replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '--') return 0;

  const upper = cleaned.toUpperCase();
  if (upper.endsWith('B')) {
    const n = parseFloat(upper.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000_000_000) : 0;
  }
  if (upper.endsWith('M')) {
    const n = parseFloat(upper.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000_000) : 0;
  }
  if (upper.endsWith('K')) {
    const n = parseFloat(upper.slice(0, -1));
    return Number.isFinite(n) ? Math.round(n * 1_000) : 0;
  }

  // Delegate to the Chinese parser for 万/亿 suffixes or plain numbers.
  return parseChineseNumber(cleaned);
}

/**
 * Pause execution for `ms` milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
