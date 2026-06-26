import { describe, expect, it } from "vitest";
import { rankSearchResultsForQuery, scoreSearchResult } from "./scoring";

describe("search scoring", () => {
  it("rewards KTV-like results", () => {
    const result = scoreSearchResult(
      {
        videoId: "video-1",
        title: "后来 KTV 字幕版",
        channelTitle: "KTV Channel",
        durationSeconds: 280,
      },
      "后来",
    );

    expect(result.score).toBeGreaterThan(20);
    expect(result.reasons).toContain("title contains KTV");
    expect(result.reasons).toContain("title exactly matches song query");
  });

  it("penalizes likely non-karaoke results", () => {
    const result = scoreSearchResult(
      {
        videoId: "video-1",
        title: "后来 live cover",
        channelTitle: "Example",
        durationSeconds: 30,
      },
      "后来",
    );

    expect(result.score).toBeLessThan(0);
    expect(result.reasons).toContain("video too short");
    expect(result.reasons).toContain("title contains song query with low-priority marker");
  });

  it("keeps exact song-title matches ahead of related karaoke results", () => {
    const results = rankSearchResultsForQuery(
      [
        {
          videoId: "related",
          title: "刘若英 经典情歌 KTV 合集",
          channelTitle: "后来 Karaoke Channel",
          durationSeconds: 280,
        },
        {
          videoId: "exact",
          title: "后来 KTV 字幕版",
          channelTitle: "KTV Channel",
          durationSeconds: 280,
        },
      ],
      "后来",
    );

    expect(results[0].videoId).toBe("exact");
    expect(results[0].reasons).toContain("title exactly matches song query");
    expect(results[1].reasons).toContain("channel contains query");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
