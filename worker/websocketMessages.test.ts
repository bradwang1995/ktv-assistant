import { describe, expect, it } from "vitest";
import { decodeClientMessage, encodeServerMessage } from "./websocketMessages";

describe("websocket messages", () => {
  it("decodes JOIN_ROOM messages", () => {
    const message = decodeClientMessage(
      JSON.stringify({
        type: "JOIN_ROOM",
        role: "mobile",
        clientId: "client-1",
      }),
    );

    expect(message).toEqual({
      type: "JOIN_ROOM",
      role: "mobile",
      clientId: "client-1",
    });
  });

  it("decodes PING messages", () => {
    expect(decodeClientMessage(JSON.stringify({ type: "PING" }))).toEqual({
      type: "PING",
    });
  });

  it("decodes restart-current-item messages", () => {
    expect(
      decodeClientMessage(
        JSON.stringify({
          type: "RESTART_CURRENT_ITEM",
          payload: {
            queueItemId: "item-1",
            videoId: "video-1",
          },
        }),
      ),
    ).toEqual({
      type: "RESTART_CURRENT_ITEM",
      payload: {
        queueItemId: "item-1",
        videoId: "video-1",
      },
    });
  });

  it("rejects malformed messages", () => {
    expect(() => decodeClientMessage(JSON.stringify({ type: "JOIN_ROOM" }))).toThrow(
      "Invalid WebSocket message.",
    );
  });

  it("encodes server messages", () => {
    expect(encodeServerMessage({ type: "PONG" })).toBe('{"type":"PONG"}');
  });
});
