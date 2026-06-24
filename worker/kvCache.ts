import type { SearchResponse } from "../src/types/youtube";

const SEARCH_CACHE_VERSION = "v1";
const DEFAULT_SEARCH_CACHE_TTL_SECONDS = 60 * 60 * 6;

interface SearchCacheEntry {
  query: string;
  normalizedQuery: string;
  createdAt: string;
  expiresAt: string;
  results: SearchResponse["results"];
}

export function searchCacheKey(normalizedQuery: string, regionCode = "CA", language = "zh-Hans") {
  return `yt-search:${SEARCH_CACHE_VERSION}:${normalizedQuery}:${regionCode}:${language}`;
}

export async function readSearchCache(
  namespace: KVNamespace | undefined,
  key: string,
): Promise<SearchCacheEntry | null> {
  if (!namespace) {
    return null;
  }

  const value = await namespace.get<SearchCacheEntry>(key, { type: "json" });

  if (!value || !Array.isArray(value.results)) {
    return null;
  }

  return value;
}

export async function writeSearchCache(
  namespace: KVNamespace | undefined,
  key: string,
  response: SearchResponse,
  ttlSeconds = DEFAULT_SEARCH_CACHE_TTL_SECONDS,
) {
  if (!namespace) {
    return;
  }

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + ttlSeconds * 1000);

  const entry: SearchCacheEntry = {
    query: response.query,
    normalizedQuery: response.normalizedQuery,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    results: response.results,
  };

  await namespace.put(key, JSON.stringify(entry), {
    expirationTtl: ttlSeconds,
  });
}

