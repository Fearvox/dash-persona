/**
 * Simple Map-based memoization cache for deterministic engine functions.
 *
 * Uses a content hash of the input as the cache key. The cache has a
 * configurable max size and uses LRU-style eviction (oldest entry removed
 * when full).
 *
 * @module utils/memo-cache
 */

const DEFAULT_MAX_SIZE = 64;

/**
 * Create a content hash from any JSON-serializable input.
 * Uses a fast FNV-1a-inspired string hash for speed.
 */
export function contentHash(input: unknown): string {
  const str = JSON.stringify(input);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Wrap a pure function with Map-based memoization.
 *
 * @param fn  The pure function to memoize.
 * @param maxSize  Maximum number of cached results (default 64).
 * @returns A memoized version of the function with a `.cache` property
 *          for inspection and a `.clear()` method for manual invalidation.
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  maxSize = DEFAULT_MAX_SIZE,
): ((...args: TArgs) => TResult) & { cache: Map<string, TResult>; clear: () => void } {
  const cache = new Map<string, TResult>();

  const memoized = (...args: TArgs): TResult => {
    const key = contentHash(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    // Evict oldest entry if at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      if (firstKey !== undefined) {
        cache.delete(firstKey);
      }
    }

    cache.set(key, result);
    return result;
  };

  memoized.cache = cache;
  memoized.clear = () => cache.clear();

  return memoized;
}
