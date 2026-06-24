import type { SearchResponse } from "../src/types/youtube";
import { normalizeSearchQuery } from "../src/lib/queryNormalize";
import { readSearchCache, searchCacheKey, writeSearchCache } from "./kvCache";
import { searchMockVideos } from "./mockSearchProvider";
import type { Env } from "./types";
import { searchYouTubeVideos } from "./youtubeSearch";

interface SearchVideosOptions {
  query: string;
  limit?: number;
  env: Env;
}

export async function searchVideos({
  query,
  limit = 4,
  env,
}: SearchVideosOptions): Promise<SearchResponse> {
  const normalizedQuery = normalizeSearchQuery(query);
  const cacheKey = searchCacheKey(normalizedQuery);
  const cached = await readSearchCache(env.SEARCH_CACHE, cacheKey);

  if (cached) {
    return {
      query,
      normalizedQuery: cached.normalizedQuery,
      cached: true,
      results: cached.results.slice(0, limit),
    };
  }

  const response = env.YOUTUBE_API_KEY
    ? await searchYouTubeVideos({
        query,
        limit,
        apiKey: env.YOUTUBE_API_KEY,
      })
    : searchMockVideos(query, limit);

  await writeSearchCache(env.SEARCH_CACHE, cacheKey, response);

  return response;
}

