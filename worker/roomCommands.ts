import type { RoomSnapshot } from "../src/types/room";
import type { ClientToServerMessage } from "../src/types/websocket";
import {
  addQueueItem,
  markPlayerEnded,
  markPlayerStarted,
  promoteQueueItem,
  removeQueueItem,
} from "../src/lib/roomReducer";

export type RoomCommandMessage = Extract<
  ClientToServerMessage,
  | { type: "ADD_QUEUE_ITEM" }
  | { type: "PROMOTE_QUEUE_ITEM" }
  | { type: "REMOVE_QUEUE_ITEM" }
  | { type: "PLAYER_STARTED" }
  | { type: "PLAYER_ENDED" }
>;

export function applyRoomCommand(
  snapshot: RoomSnapshot,
  message: RoomCommandMessage,
): RoomSnapshot {
  switch (message.type) {
    case "ADD_QUEUE_ITEM":
      return addQueueItem(snapshot, message.payload);
    case "PROMOTE_QUEUE_ITEM":
      return promoteQueueItem(snapshot, message.payload.queueItemId);
    case "REMOVE_QUEUE_ITEM":
      return removeQueueItem(snapshot, message.payload.queueItemId);
    case "PLAYER_STARTED":
      return markPlayerStarted(
        snapshot,
        message.payload.queueItemId,
        message.payload.videoId,
      );
    case "PLAYER_ENDED":
      return markPlayerEnded(snapshot, message.payload.queueItemId, message.payload.videoId);
  }
}

