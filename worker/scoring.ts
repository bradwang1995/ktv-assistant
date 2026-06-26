import type { VideoSearchResult } from "../src/types/youtube";
import { normalizeQuery } from "../src/lib/queryNormalize";
import { normalizeSearchFamilyQuery } from "./searchFamily";

const EXACT_TITLE_MATCH_SCORE = 60;
const TITLE_PREFIX_MATCH_SCORE = 48;
const TITLE_CONTAINS_QUERY_SCORE = 40;
const TITLE_TOKEN_MATCH_SCORE = 24;
const CHANNEL_ONLY_QUERY_SCORE = 2;
const TITLE_MISS_PENALTY = -24;

const POSITIVE_SIGNALS = [
  { text: "ktv", score: 10, reason: "title contains KTV" },
  { text: "\u5361\u62c9ok", score: 10, reason: "title contains karaoke marker" },
  { text: "\u4f34\u594f", score: 8, reason: "title contains instrumental marker" },
  { text: "\u5b57\u5e55", score: 5, reason: "title contains subtitles marker" },
  { text: "卡拉ok", score: 10, reason: "title contains 卡拉OK" },
  { text: "伴奏", score: 8, reason: "title contains 伴奏" },
  { text: "字幕", score: 5, reason: "title contains 字幕" },
  { text: "karaoke", score: 5, reason: "title contains karaoke" },
  { text: "instrumental", score: 4, reason: "title contains instrumental" },
  { text: "pinyin", score: 3, reason: "title contains pinyin" },
];

const NEGATIVE_SIGNALS = [
  { text: "live", score: -8, reason: "title contains live" },
  { text: "\u73b0\u573a", score: -8, reason: "title contains live marker" },
  { text: "现场", score: -8, reason: "title contains 现场" },
  { text: "reaction", score: -8, reason: "title contains reaction" },
  { text: "cover", score: -6, reason: "title contains cover" },
  { text: "tutorial", score: -5, reason: "title contains tutorial" },
  { text: "\u6559\u5b66", score: -5, reason: "title contains tutorial marker" },
  { text: "shorts", score: -5, reason: "title contains shorts" },
  { text: "lyrics", score: -4, reason: "title contains lyrics" },
  { text: "教学", score: -5, reason: "title contains 教学" },
];

export function scoreSearchResult(
  result: Omit<VideoSearchResult, "score" | "reasons">,
  originalQuery: string,
): VideoSearchResult {
  const haystack = `${result.title} ${result.channelTitle ?? ""}`.toLowerCase();
  const title = normalizeQuery(result.title);
  const channelTitle = normalizeQuery(result.channelTitle ?? "");
  const reasons: string[] = [];
  let score = 0;

  for (const signal of POSITIVE_SIGNALS) {
    if (haystack.includes(signal.text)) {
      score += signal.score;
      reasons.push(signal.reason);
    }
  }

  for (const signal of NEGATIVE_SIGNALS) {
    if (haystack.includes(signal.text)) {
      score += signal.score;
      reasons.push(signal.reason);
    }
  }

  const queryMatch = scoreTitleQueryMatch(title, channelTitle, originalQuery);

  if (queryMatch.score !== 0) {
    score += queryMatch.score;
    reasons.push(queryMatch.reason);
  }

  if (typeof result.durationSeconds === "number") {
    if (result.durationSeconds < 60) {
      score -= 10;
      reasons.push("video too short");
    }
    if (result.durationSeconds > 900) {
      score -= 5;
      reasons.push("video too long");
    }
  }

  return { ...result, score, reasons };
}

export function rankSearchResultsForQuery(
  results: Array<Omit<VideoSearchResult, "score" | "reasons"> | VideoSearchResult>,
  originalQuery: string,
): VideoSearchResult[] {
  return results
    .map((result, index) => ({
      result: scoreSearchResult(result, originalQuery),
      index,
    }))
    .sort((a, b) => b.result.score - a.result.score || a.index - b.index)
    .map(({ result }) => result);
}

function scoreTitleQueryMatch(title: string, channelTitle: string, originalQuery: string) {
  const canonicalQuery = normalizeSearchFamilyQuery(originalQuery);

  if (!canonicalQuery) {
    return { score: 0, reason: "" };
  }

  const comparableTitle = normalizeSongComparableText(title);
  const comparableQuery = normalizeSongComparableText(canonicalQuery);
  const hasLowPriorityMarker = hasLowPriorityTitleMarker(title);

  if (!comparableQuery) {
    return { score: 0, reason: "" };
  }

  if (title === canonicalQuery || comparableTitle === comparableQuery) {
    if (hasLowPriorityMarker) {
      return {
        score: 10,
        reason: "title contains song query with low-priority marker",
      };
    }

    return {
      score: EXACT_TITLE_MATCH_SCORE,
      reason: "title exactly matches song query",
    };
  }

  if (titleStartsWithQuery(title, canonicalQuery) || titleStartsWithQuery(comparableTitle, comparableQuery)) {
    if (hasLowPriorityMarker) {
      return {
        score: 10,
        reason: "title contains song query with low-priority marker",
      };
    }

    return {
      score: TITLE_PREFIX_MATCH_SCORE,
      reason: "title starts with song query",
    };
  }

  if (title.includes(canonicalQuery) || comparableTitle.includes(comparableQuery)) {
    if (hasLowPriorityMarker) {
      return {
        score: 10,
        reason: "title contains song query with low-priority marker",
      };
    }

    return {
      score: TITLE_CONTAINS_QUERY_SCORE,
      reason: "title contains song query",
    };
  }

  const queryTokens = canonicalQuery.split(" ").filter((token) => token.length > 1);

  if (queryTokens.length > 1 && queryTokens.every((token) => title.includes(token))) {
    return {
      score: TITLE_TOKEN_MATCH_SCORE,
      reason: "title contains query tokens",
    };
  }

  if (channelTitle.includes(canonicalQuery)) {
    return {
      score: CHANNEL_ONLY_QUERY_SCORE,
      reason: "channel contains query",
    };
  }

  return {
    score: TITLE_MISS_PENALTY,
    reason: "title does not match query",
  };
}

function titleStartsWithQuery(title: string, query: string) {
  return title === query || title.startsWith(`${query} `) || title.startsWith(query);
}

function normalizeSongComparableText(value: string) {
  return normalizeQuery(value)
    .replace(/&amp;/g, "&")
    .replace(/[()[\]{}<>]/g, " ")
    .replace(/[\u300a\u300b\u3008\u3009\u3010\u3011\uff08\uff09]/gu, " ")
    .replace(/[|/_-]+/g, " ")
    .replace(/\b(official|mv|hd|hq|ktv|karaoke|version|instrumental|pinyin|lyrics|lyric|cover|live|audio)\b/gi, " ")
    .replace(/\u5361\u62c9\s*ok/giu, " ")
    .replace(/(\u4f34\u594f|\u5b57\u5e55|\u9ad8\u6e05|\u5b8c\u6574|\u5b98\u65b9|\u7eaf\u97f3\u4e50|\u7248)/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasLowPriorityTitleMarker(title: string) {
  return /\b(live|cover|reaction|tutorial|shorts)\b/i.test(title);
}
