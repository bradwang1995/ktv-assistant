import { getRoomSnapshotFromD1 } from "./d1Repository";
import { apiError, jsonResponse } from "./json";
import { isValidRoomId } from "./roomIds";
import type { Env } from "./types";

export class RoomDurableObject {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    const route = matchRoomRoute(url.pathname);

    if (route?.name === "snapshot") {
      if (!isValidRoomId(route.roomId)) {
        return apiError(400, "INVALID_ROOM_ID", "Room id must be 8 lowercase letters or numbers.");
      }

      if (!this.env.DB) {
        return apiError(503, "D1_NOT_CONFIGURED", "D1 binding DB is not configured.");
      }

      const snapshot = await getRoomSnapshotFromD1(this.env.DB, route.roomId);

      if (!snapshot) {
        return apiError(404, "ROOM_NOT_FOUND", "Room not found.");
      }

      return jsonResponse(snapshot);
    }

    return new Response("Room Durable Object shell", { status: 200 });
  }
}

function matchRoomRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 3 && parts[0] === "rooms" && parts[2] === "snapshot") {
    return { name: "snapshot" as const, roomId: parts[1] };
  }

  return null;
}
