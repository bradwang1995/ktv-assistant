import { describe, expect, it } from "vitest";
import type { SearchResponse, VideoSearchResult } from "../src/types/youtube";
import { buildSearchQueryFamily } from "./searchFamily";
import { searchVideos } from "./searchService";
import { writeSearchCache } from "./kvCache";

class MemoryKv {
  values = new Map<string, string>();

  async get<T>(key: string, options: { type: "json" }): Promise<T | null>;
  async get(key: string): Promise<string | null>;
  async get<T>(key: string, options?: { type: "json" }) {
    const value = this.values.get(key);

    if (!value) {
      return null;
    }

    return options?.type === "json" ? (JSON.parse(value) as T) : value;
  }

  async put(key: string, value: string) {
    this.values.set(key, value);
  }

  async list(options: { prefix?: string } = {}) {
    return {
      keys: [...this.values.keys()]
        .filter((key) => !options.prefix || key.startsWith(options.prefix))
        .map((name) => ({ name })),
      list_complete: true,
    };
  }
}

describe("search service cache reuse", () => {
  it("reuses one stable song history across karaoke and original-vocal searches", async () => {
    const kv = new MemoryKv();
    const karaokeFamily = buildSearchQueryFamily("年少有为");
    const originalFamily = buildSearchQueryFamily("年少有为", undefined, {
      includeOriginalVocal: true,
    });

    await writeSearchCache(
      kv,
      karaokeFamily,
      buildResponse("年少有为", karaokeFamily.normalizedQuery, [
        buildResult("karaoke", "年少有为 KTV 伴奏版"),
        buildResult("unrelated-karaoke", "另一首歌 KTV 伴奏版"),
      ]),
    );
    await writeSearchCache(
      kv,
      originalFamily,
      buildResponse("年少有为", originalFamily.normalizedQuery, [
        buildResult("original", "年少有为 official MV 原唱 歌词"),
        buildResult("unrelated-original", "完全无关 official MV lyrics"),
      ]),
    );

    const env = {
      SEARCH_CACHE: kv,
      YOUTUBE_SEARCH_DAILY_LIMIT: "100",
    };
    const karaoke = await searchVideos({
      query: "年少有为",
      searchType: "song",
      includeOriginalVocal: false,
      limit: 50,
      env,
    });
    const original = await searchVideos({
      query: "年少有为",
      searchType: "song",
      includeOriginalVocal: true,
      limit: 50,
      env,
    });

    expect(karaoke.cached).toBe(true);
    expect(original.cached).toBe(true);
    expect(karaoke.results.map((result) => result.videoId)).toEqual([
      "karaoke",
      "original",
    ]);
    expect(original.results.map((result) => result.videoId)).toEqual([
      "original",
      "karaoke",
    ]);
  });
});

function buildResponse(
  query: string,
  normalizedQuery: string,
  results: VideoSearchResult[],
): SearchResponse {
  return {
    query,
    normalizedQuery,
    cached: false,
    results,
    cacheMeta: {
      sourceQueryCount: 1,
      cachedResultCount: results.length,
      servedFromExpandedCache: false,
      videosListCalls: 1,
      sourceQueries: [query],
    },
  };
}

function buildResult(videoId: string, title: string): VideoSearchResult {
  return {
    videoId,
    title,
    channelTitle: "Test Channel",
    durationSeconds: 280,
    score: 0,
    reasons: [],
  };
}
