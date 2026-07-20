import { describe, expect, it } from "vitest";
import { parseServerMessage } from "./useRoomSocket";

describe("room socket server messages", () => {
  it("accepts immediate YouTube quota updates", () => {
    const message = parseServerMessage(
      JSON.stringify({
        type: "YOUTUBE_QUOTA_UPDATED",
        payload: {
          dailyLimit: 100,
          used: 1,
          remaining: 99,
          exhausted: false,
          resetAt: "2026-07-21T07:00:00.000Z",
          resetTimeZone: "America/Los_Angeles",
          updatedAt: "2026-07-20T18:00:00.000Z",
        },
      }),
    );

    expect(message).toMatchObject({
      type: "YOUTUBE_QUOTA_UPDATED",
      payload: {
        dailyLimit: 100,
        remaining: 99,
      },
    });
  });
});
