import { describe, expect, it } from "vitest";
import {
  getAvailableYouTubeSearchCalls,
  getYouTubeSearchQuotaStatus,
  recordYouTubeSearchCalls,
  youtubeSearchQuotaKey,
} from "./youtubeQuota";

class MemoryKv {
  private store = new Map<string, string>();

  async get<T>(key: string, options: { type: "json" }): Promise<T | null> {
    if (options.type !== "json") {
      return null;
    }

    const value = this.store.get(key);
    return value ? (JSON.parse(value) as T) : null;
  }

  async put(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
}

describe("youtube quota tracking", () => {
  it("uses the Pacific Time quota day and reset boundary", async () => {
    const kv = new MemoryKv();
    const beforePacificMidnight = new Date("2026-07-03T06:59:00.000Z");
    const afterPacificMidnight = new Date("2026-07-03T07:01:00.000Z");

    await recordYouTubeSearchCalls(kv, 2, 50, beforePacificMidnight);

    const beforeStatus = await getYouTubeSearchQuotaStatus(kv, 50, beforePacificMidnight);
    expect(beforeStatus.used).toBe(2);
    expect(beforeStatus.remaining).toBe(48);
    expect(beforeStatus.resetAt).toBe("2026-07-03T07:00:00.000Z");
    expect(youtubeSearchQuotaKey("2026-07-02")).toBe("yt-search-quota:v1:2026-07-02");

    await expect(getAvailableYouTubeSearchCalls(kv, 50, afterPacificMidnight)).resolves.toBe(50);
  });

  it("reports a default status when KV is unavailable", async () => {
    const status = await getYouTubeSearchQuotaStatus(
      undefined,
      50,
      new Date("2026-01-15T12:00:00.000Z"),
    );

    expect(status).toMatchObject({
      dailyLimit: 50,
      used: 0,
      remaining: 50,
      exhausted: false,
      resetTimeZone: "America/Los_Angeles",
    });
  });

  it("returns the just-recorded status without waiting for a KV read to converge", async () => {
    const kv = new MemoryKv();
    const now = new Date("2026-07-20T18:00:00.000Z");
    const status = await recordYouTubeSearchCalls(kv, 1, 100, now);

    expect(status).toMatchObject({
      dailyLimit: 100,
      used: 1,
      remaining: 99,
      exhausted: false,
      updatedAt: now.toISOString(),
    });
  });
});
