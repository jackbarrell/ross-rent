/**
 * Persistent file-based cache for API responses.
 * Stores JSON payloads under backend/.local/cache/ with configurable TTLs.
 * Survives server restarts — critical for rate-limited APIs like RentCast (50 req/month free).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.resolve(__dirname, "../../.local/cache");

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CacheEntry<T> {
  data: T;
  ts: number;    // epoch ms when cached
  ttl: number;   // TTL in ms
}

/** Sanitize a cache key into a safe filename */
function keyToFile(namespace: string, key: string): string {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
  return path.join(CACHE_DIR, `${namespace}__${safe}.json`);
}

/**
 * Get a cached value. Returns null if expired or missing.
 */
export function cacheGet<T>(namespace: string, key: string): T | null {
  const file = keyToFile(namespace, key);
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > entry.ttl) {
      // Expired — but keep the file for stale fallback
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Get a cached value even if expired (stale fallback for when API calls fail).
 */
export function cacheGetStale<T>(namespace: string, key: string): T | null {
  const file = keyToFile(namespace, key);
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, "utf-8");
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store a value in the persistent cache.
 */
export function cacheSet<T>(namespace: string, key: string, data: T, ttlMs: number): void {
  const file = keyToFile(namespace, key);
  const entry: CacheEntry<T> = { data, ts: Date.now(), ttl: ttlMs };
  try {
    fs.writeFileSync(file, JSON.stringify(entry), "utf-8");
  } catch (err) {
    console.warn(`[cache] Failed to write ${file}:`, err);
  }
}

/**
 * Convenience: fetch with cache. Tries cache first, calls fetcher on miss,
 * stores result. On fetcher failure, falls back to stale cache.
 */
export async function cachedFetch<T>(
  namespace: string,
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(namespace, key);
  if (cached !== null) return cached;

  try {
    const fresh = await fetcher();
    cacheSet(namespace, key, fresh, ttlMs);
    return fresh;
  } catch (err) {
    // API failed — try stale cache as fallback
    const stale = cacheGetStale<T>(namespace, key);
    if (stale !== null) {
      console.warn(`[cache] API failed for ${namespace}/${key}, using stale cache`);
      return stale;
    }
    throw err;
  }
}

// ─── Common TTL constants ─────────────────────────────────
export const TTL = {
  FRED:        24 * 60 * 60 * 1000,   // 24 hours — FRED data updates monthly/weekly
  CENSUS:      7 * 24 * 60 * 60 * 1000, // 7 days — Census data updates annually
  RENTCAST:    7 * 24 * 60 * 60 * 1000, // 7 days — conserve the 50 req/month limit
  WALKSCORE:   30 * 24 * 60 * 60 * 1000, // 30 days — walk scores rarely change
  MACRO:       24 * 60 * 60 * 1000,    // 24 hours — combined macro result
} as const;
