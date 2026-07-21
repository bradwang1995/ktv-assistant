import { describe, expect, it } from "vitest";
import {
  getAvailableYouTubeSearchCalls,
  getYouTubeSearchQuotaStatus,
  recordYouTubeSearchCalls,
  reserveYouTubeSearchCallsForEnv,
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

  it("reserves a bounded call before dispatch and rejects calls beyond the limit", async () => {
    const kv = new MemoryKv();
    const now = new Date("2026-07-20T18:00:00.000Z");

    const first = await reserveYouTubeSearchCallsForEnv(
      { SEARCH_CACHE: kv },
      1,
      2,
      now,
    );
    const second = await reserveYouTubeSearchCallsForEnv(
      { SEARCH_CACHE: kv },
      1,
      2,
      now,
    );
    const rejected = await reserveYouTubeSearchCallsForEnv(
      { SEARCH_CACHE: kv },
      1,
      2,
      now,
    );

    expect(first).toMatchObject({ reserved: true, status: { used: 1, remaining: 1 } });
    expect(second).toMatchObject({ reserved: true, status: { used: 2, remaining: 0 } });
    expect(rejected).toMatchObject({ reserved: false, status: { used: 2, remaining: 0 } });
  });

  it("does not authorize an untracked outbound call when no durable ledger exists", async () => {
    const reservation = await reserveYouTubeSearchCallsForEnv(
      {},
      1,
      100,
      new Date("2026-07-20T18:00:00.000Z"),
    );

    expect(reservation.reserved).toBe(false);
    expect(reservation.status.remaining).toBe(100);
  });

  it("allows only one concurrent D1 reservation for the final available call", async () => {
    const db = new MemoryQuotaD1();
    const now = new Date("2026-07-20T18:00:00.000Z");
    const reservations = await Promise.all([
      reserveYouTubeSearchCallsForEnv({ DB: db.database }, 1, 1, now),
      reserveYouTubeSearchCallsForEnv({ DB: db.database }, 1, 1, now),
    ]);

    expect(reservations.map((reservation) => reservation.reserved).sort()).toEqual([
      false,
      true,
    ]);
    expect(reservations.every((reservation) => reservation.status.used === 1)).toBe(true);
  });
});

class MemoryQuotaD1 {
  used = 0;
  updatedAt = "";

  database = {
    withSession: () => ({
      prepare: (sql: string) => new MemoryQuotaStatement(this, sql),
    }),
  } as unknown as D1Database;
}

class MemoryQuotaStatement {
  private bindings: unknown[] = [];

  constructor(
    private db: MemoryQuotaD1,
    private sql: string,
  ) {}

  bind(...bindings: unknown[]) {
    this.bindings = bindings;
    return this;
  }

  async run() {
    const count = Number(this.bindings[1]);
    const limit = Number(this.bindings[2]);
    const allowed = this.sql.includes("INSERT INTO youtube_quota_daily") && this.db.used + count <= limit;

    if (allowed) {
      this.db.used += count;
      this.db.updatedAt = String(this.bindings[3]);
    }

    return {
      success: true,
      results: [],
      meta: { changes: allowed ? 1 : 0 },
    } as unknown as D1Result;
  }

  async first<T>() {
    return {
      used_search_calls: this.db.used,
      updated_at: this.db.updatedAt,
    } as T;
  }
}
