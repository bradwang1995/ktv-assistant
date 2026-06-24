import type { SearchResponse, VideoSearchResult } from "../src/types/youtube";
import { normalizeQuery, normalizeSearchQuery } from "../src/lib/queryNormalize";

const MOCK_VIDEO_IDS = [
  "dQw4w9WgXcQ",
  "kJQP7kiw5Fk",
  "JGwWNGJdvx8",
  "OPf0YbXqDm0",
  "RgKAFK5djSk",
  "09R8_2nJtjg",
];

const TITLE_PATTERNS = [
  "{query} KTV 伴奏版",
  "{query} 卡拉OK 字幕版",
  "{query} 高清 KTV",
  "{query} karaoke 练唱版",
];

export function searchMockVideos(query: string, limit = 4): SearchResponse {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      query,
      normalizedQuery,
      cached: false,
      results: [],
    };
  }

  const results: VideoSearchResult[] = TITLE_PATTERNS.slice(0, limit).map(
    (pattern, index) => {
      const videoId = MOCK_VIDEO_IDS[index % MOCK_VIDEO_IDS.length];
      return {
        videoId,
        title: pattern.replace("{query}", query.trim()),
        channelTitle: ["KTV 点唱频道", "华语伴奏精选", "朋友练歌房", "Karaoke Studio"][
          index
        ],
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationSeconds: [265, 241, 304, 278][index],
        publishedAt: "2026-01-01T00:00:00Z",
        score: 32 - index * 3,
        reasons: ["mock result", "title contains KTV", "starts near 30 seconds"],
      };
    },
  );

  return {
    query,
    normalizedQuery: normalizeSearchQuery(query),
    cached: false,
    results,
  };
}

