import { afterEach, describe, expect, it, vi } from "vitest";
import { parseIso8601DurationSeconds, searchYouTubeVideos } from "./youtubeSearch";

describe("youtube search helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fills a cache pool with one 50-result search page", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));

      if (url.pathname.endsWith("/search")) {
        return jsonResponse({
          items: buildSearchItems(0, 50),
        });
      }

      if (url.pathname.endsWith("/videos")) {
        const ids = url.searchParams.get("id")?.split(",") ?? [];

        return jsonResponse({
          items: ids.map((id) => ({
            id,
            contentDetails: { duration: "PT4M" },
          })),
        });
      }

      throw new Error(`Unexpected URL: ${url.toString()}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await searchYouTubeVideos({
      query: "Later",
      apiKey: "test-key",
      maxSearchCalls: 1,
      targetResultCount: 50,
    });
    const searchCalls = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/search"));
    const videosCalls = fetchMock.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/videos"));

    expect(response.results).toHaveLength(50);
    expect(response.cacheMeta?.sourceQueryCount).toBe(1);
    expect(response.cacheMeta?.cachedResultCount).toBe(50);
    expect(response.cacheMeta?.videosListCalls).toBe(1);
    expect(searchCalls).toHaveLength(1);
    expect(videosCalls).toHaveLength(1);
    expect(searchCalls[0].searchParams.get("maxResults")).toBe("50");
    expect(searchCalls[0].searchParams.get("q")).toBe("later");
    expect(searchCalls[0].searchParams.has("pageToken")).toBe(false);
  });

  it("parses ISO 8601 YouTube durations", () => {
    expect(parseIso8601DurationSeconds("PT4M32S")).toBe(272);
    expect(parseIso8601DurationSeconds("PT1H2M3S")).toBe(3723);
    expect(parseIso8601DurationSeconds("PT58S")).toBe(58);
  });

  it("returns undefined for unsupported durations", () => {
    expect(parseIso8601DurationSeconds("P1D")).toBeUndefined();
  });
});

function buildSearchItems(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const id = `video-${start + index}`;

    return {
      id: { videoId: id },
      snippet: {
        title: `Later KTV ${start + index}`,
        channelTitle: "Karaoke Studio",
        publishedAt: "2026-01-01T00:00:00Z",
        thumbnails: {
          high: { url: `https://img.youtube.com/vi/${id}/hqdefault.jpg` },
        },
      },
    };
  });
}

function jsonResponse(value: unknown) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
