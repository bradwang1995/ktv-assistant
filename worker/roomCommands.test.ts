import { describe, expect, it } from "vitest";
import { getCurrentItem, getQueuedItems } from "../src/lib/roomReducer";
import { createInitialSnapshot } from "../src/lib/roomReducer";
import { applyRoomCommand } from "./roomCommands";

describe("room commands", () => {
  it("adds a queue item and starts it when the room is idle", () => {
    const snapshot = createInitialSnapshot("roomtest");
    const updated = applyRoomCommand(snapshot, {
      type: "ADD_QUEUE_ITEM",
      payload: {
        videoId: "video-1",
        title: "第一首 KTV",
      },
    });

    expect(getCurrentItem(updated)?.videoId).toBe("video-1");
  });

  it("promotes queued songs without changing the current song", () => {
    const withFirst = applyRoomCommand(createInitialSnapshot("roomtest"), {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "first", title: "第一首" },
    });
    const withSecond = applyRoomCommand(withFirst, {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "second", title: "第二首" },
    });
    const withThird = applyRoomCommand(withSecond, {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "third", title: "第三首" },
    });
    const third = getQueuedItems(withThird).find((item) => item.videoId === "third")!;

    const updated = applyRoomCommand(withThird, {
      type: "PROMOTE_QUEUE_ITEM",
      payload: { queueItemId: third.id },
    });

    expect(getCurrentItem(updated)?.videoId).toBe("first");
    expect(getQueuedItems(updated).map((item) => item.videoId)).toEqual(["third", "second"]);
  });

  it("advances playback when the current song ends", () => {
    const withFirst = applyRoomCommand(createInitialSnapshot("roomtest"), {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "first", title: "第一首" },
    });
    const withSecond = applyRoomCommand(withFirst, {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "second", title: "第二首" },
    });
    const current = getCurrentItem(withSecond)!;

    const updated = applyRoomCommand(withSecond, {
      type: "PLAYER_ENDED",
      payload: { queueItemId: current.id, videoId: current.videoId },
    });

    expect(getCurrentItem(updated)?.videoId).toBe("second");
  });

  it("restarts the current item without advancing the queue", () => {
    const withFirst = applyRoomCommand(createInitialSnapshot("roomtest"), {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "first", title: "第一首" },
    });
    const withSecond = applyRoomCommand(withFirst, {
      type: "ADD_QUEUE_ITEM",
      payload: { videoId: "second", title: "第二首" },
    });
    const current = getCurrentItem(withSecond)!;

    const updated = applyRoomCommand(withSecond, {
      type: "RESTART_CURRENT_ITEM",
      payload: { queueItemId: current.id, videoId: current.videoId },
    });

    expect(getCurrentItem(updated)?.videoId).toBe("first");
    expect(getQueuedItems(updated).map((item) => item.videoId)).toEqual(["second"]);
    expect(updated.playback.playerState).toBe("loading");
  });
});
