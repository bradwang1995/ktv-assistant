import type { SearchResponse, VideoSearchResult } from "../types/youtube";
import { youtubeThumbnailUrl } from "./youtube";

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

export function normalizeQuery(query: string) {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function searchMockVideos(
  query: string,
  limit = 4,
): Promise<SearchResponse> {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return {
      query,
      normalizedQuery,
      cached: true,
      results: [],
    };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 350));

  const results: VideoSearchResult[] = TITLE_PATTERNS.slice(0, limit).map(
    (pattern, index) => {
      const videoId = MOCK_VIDEO_IDS[index % MOCK_VIDEO_IDS.length];
      return {
        videoId,
        title: pattern.replace("{query}", query.trim()),
        channelTitle: ["KTV 点唱频道", "华语伴奏精选", "朋友练歌房", "Karaoke Studio"][
          index
        ],
        thumbnailUrl: youtubeThumbnailUrl(videoId),
        durationSeconds: [265, 241, 304, 278][index],
        score: 32 - index * 3,
        reasons: ["mock result", "title contains KTV", "starts near 30 seconds"],
      };
    },
  );

  return {
    query,
    normalizedQuery: `${normalizedQuery} ktv`,
    cached: true,
    results,
  };
}

