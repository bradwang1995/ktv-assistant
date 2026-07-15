import { describe, expect, it } from "vitest";
import {
  createRoomDisplayName,
  normalizeRoomDisplayName,
  visibleRoomDisplayName,
} from "./roomName";

describe("room display names", () => {
  it("uses an honest neutral name without claiming access to the device identity", () => {
    expect(createRoomDisplayName()).toBe("K歌房");
  });

  it("normalizes and limits user-provided values", () => {
    expect(normalizeRoomDisplayName("  Brad   的房间  ", "fallback")).toBe("Brad 的房间");
    expect(normalizeRoomDisplayName("歌".repeat(50), "fallback")).toHaveLength(40);
  });

  it("replaces legacy id and guessed-device labels with the neutral name", () => {
    expect(visibleRoomDisplayName("K歌房 abc12345", "abc12345")).toBe("K歌房");
    expect(visibleRoomDisplayName("这台 Mac 的 K 歌房", "abc12345")).toBe("K歌房");
    expect(visibleRoomDisplayName("Brad 的房间", "abc12345")).toBe("Brad 的房间");
  });
});
