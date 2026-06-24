import { describe, expect, it } from "vitest";
import { createRoomId, isValidRoomId } from "./roomIds";

describe("room ids", () => {
  it("creates valid 8-character room ids", () => {
    const roomId = createRoomId();

    expect(roomId).toHaveLength(8);
    expect(isValidRoomId(roomId)).toBe(true);
  });

  it("rejects unsafe room ids", () => {
    expect(isValidRoomId("abc123xy")).toBe(true);
    expect(isValidRoomId("ABC123XY")).toBe(false);
    expect(isValidRoomId("../bad")).toBe(false);
    expect(isValidRoomId("short")).toBe(false);
  });
});

