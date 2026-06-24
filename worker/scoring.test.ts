import { describe, expect, it } from "vitest";
import { scoreSearchResult } from "./scoring";

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
    expect(result.reasons).toContain("title contains query");
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
  });
});

