import type { SearchResponse, VideoSearchResult } from "../types/youtube";
import { normalizeQuery } from "./queryNormalize";
import { youtubeThumbnailUrl } from "./youtube";

const MOCK_VIDEO_IDS = [
  "dQw4w9WgXcQ",
  "kJQP7kiw5Fk",
  "JGwWNGJdvx8",
  "OPf0YbXqDm0",
  "RgKAFK5djSk",
  "09R8_2nJtjg",
  "YQHsXMglC9A",
  "60ItHLz5WEA",
];

const TITLE_PATTERNS = [
  "{query} KTV 伴奏版",
  "{query} 卡拉OK 字幕版",
  "{query} 高清 KTV",
  "{query} karaoke 练唱版",
  "{query} 原版伴奏",
  "{query} KTV 女声版",
  "{query} KTV 男声版",
  "{query} instrumental karaoke",
];

export async function searchMockVideos(
  query: string,
  limit = 8,
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
        channelTitle: [
          "KTV 点唱频道",
          "华语伴奏精选",
          "朋友练歌房",
          "Karaoke Studio",
          "经典练唱库",
          "中文伴奏台",
          "KTV Remix",
          "Instrumental Studio",
        ][index],
        thumbnailUrl: youtubeThumbnailUrl(videoId),
        durationSeconds: [265, 241, 304, 278, 252, 299, 286, 270][index],
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
