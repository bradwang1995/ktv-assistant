export interface VideoSearchResult {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
  score: number;
  reasons: string[];
}

export interface SearchResponse {
  query: string;
  normalizedQuery: string;
  cached: boolean;
  results: VideoSearchResult[];
}

