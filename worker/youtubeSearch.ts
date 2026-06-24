import type { SearchResponse, VideoSearchResult } from "../src/types/youtube";
import { normalizeSearchQuery } from "../src/lib/queryNormalize";
import { scoreSearchResult } from "./scoring";

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const REGION_CODE = "CA";
const RELEVANCE_LANGUAGE = "zh-Hans";
const SEARCH_MAX_RESULTS = 25;

interface YouTubeSearchListResponse {
  items?: Array<{
    id?: {
      videoId?: string;
    };
    snippet?: {
      title?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
}

interface YouTubeVideosListResponse {
  items?: Array<{
    id?: string;
    contentDetails?: {
      duration?: string;
    };
  }>;
}

export interface YouTubeSearchOptions {
  query: string;
  limit?: number;
  apiKey: string;
}

export async function searchYouTubeVideos({
  query,
  limit = 4,
  apiKey,
}: YouTubeSearchOptions): Promise<SearchResponse> {
  const normalizedQuery = normalizeSearchQuery(query);
  const searchParams = new URLSearchParams({
    part: "snippet",
    type: "video",
    q: normalizedQuery,
    maxResults: String(SEARCH_MAX_RESULTS),
    videoEmbeddable: "true",
    safeSearch: "moderate",
    regionCode: REGION_CODE,
    relevanceLanguage: RELEVANCE_LANGUAGE,
    key: apiKey,
  });

  const searchResponse = await fetch(`${YOUTUBE_SEARCH_URL}?${searchParams.toString()}`);

  if (!searchResponse.ok) {
    throw new Error(`YouTube search failed with status ${searchResponse.status}.`);
  }

  const searchBody = (await searchResponse.json()) as YouTubeSearchListResponse;
  const baseResults = (searchBody.items ?? [])
    .map((item) => toBaseResult(item))
    .filter((item): item is Omit<VideoSearchResult, "score" | "reasons"> => item !== null);

  const durations = await fetchVideoDurations(
    apiKey,
    baseResults.map((result) => result.videoId),
  );

  const results = baseResults
    .map((result) =>
      scoreSearchResult(
        {
          ...result,
          durationSeconds: durations.get(result.videoId),
        },
        query,
      ),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    query,
    normalizedQuery,
    cached: false,
    results,
  };
}

function toBaseResult(
  item: NonNullable<YouTubeSearchListResponse["items"]>[number],
): Omit<VideoSearchResult, "score" | "reasons"> | null {
  const videoId = item.id?.videoId;
  const title = item.snippet?.title;

  if (!videoId || !title) {
    return null;
  }

  const thumbnails = item.snippet?.thumbnails;

  return {
    videoId,
    title: decodeHtmlEntities(title),
    channelTitle: item.snippet?.channelTitle,
    thumbnailUrl: thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url,
    publishedAt: item.snippet?.publishedAt,
  };
}

async function fetchVideoDurations(apiKey: string, videoIds: string[]) {
  const durations = new Map<string, number>();

  if (videoIds.length === 0) {
    return durations;
  }

  const params = new URLSearchParams({
    part: "contentDetails",
    id: videoIds.join(","),
    key: apiKey,
  });

  const response = await fetch(`${YOUTUBE_VIDEOS_URL}?${params.toString()}`);

  if (!response.ok) {
    return durations;
  }

  const body = (await response.json()) as YouTubeVideosListResponse;

  for (const item of body.items ?? []) {
    if (item.id && item.contentDetails?.duration) {
      const durationSeconds = parseIso8601DurationSeconds(item.contentDetails.duration);

      if (typeof durationSeconds === "number") {
        durations.set(item.id, durationSeconds);
      }
    }
  }

  return durations;
}

export function parseIso8601DurationSeconds(duration: string) {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);

  if (!match) {
    return undefined;
  }

  const [, hours = "0", minutes = "0", seconds = "0"] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
