import type { VideoSearchResult } from "../src/types/youtube";

const POSITIVE_SIGNALS = [
  { text: "ktv", score: 10, reason: "title contains KTV" },
  { text: "卡拉ok", score: 10, reason: "title contains 卡拉OK" },
  { text: "伴奏", score: 8, reason: "title contains 伴奏" },
  { text: "字幕", score: 5, reason: "title contains 字幕" },
  { text: "karaoke", score: 5, reason: "title contains karaoke" },
];

const NEGATIVE_SIGNALS = [
  { text: "live", score: -8, reason: "title contains live" },
  { text: "现场", score: -8, reason: "title contains 现场" },
  { text: "reaction", score: -8, reason: "title contains reaction" },
  { text: "cover", score: -6, reason: "title contains cover" },
  { text: "教学", score: -5, reason: "title contains 教学" },
];

export function scoreSearchResult(
  result: Omit<VideoSearchResult, "score" | "reasons">,
  originalQuery: string,
): VideoSearchResult {
  const haystack = `${result.title} ${result.channelTitle ?? ""}`.toLowerCase();
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

  if (originalQuery && haystack.includes(originalQuery.toLowerCase())) {
    score += 8;
    reasons.push("title contains query");
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

