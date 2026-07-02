import type { ClientToServerMessage, ServerToClientMessage } from "../src/types/websocket";

export function encodeServerMessage(message: ServerToClientMessage) {
  return JSON.stringify(message);
}

export function decodeClientMessage(data: string | ArrayBuffer): ClientToServerMessage {
  if (typeof data !== "string") {
    throw new Error("WebSocket messages must be JSON strings.");
  }

  const parsed = JSON.parse(data) as unknown;

  if (!isClientMessage(parsed)) {
    throw new Error("Invalid WebSocket message.");
  }

  return parsed;
}

function isClientMessage(value: unknown): value is ClientToServerMessage {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }

  const message = value as { type?: unknown; role?: unknown; clientId?: unknown; payload?: unknown };

  if (message.type === "PING") {
    return true;
  }

  if (message.type === "JOIN_ROOM") {
    return (
      (message.role === "display" || message.role === "mobile") &&
      typeof message.clientId === "string" &&
      message.clientId.length > 0
    );
  }

  if (message.type === "ADD_QUEUE_ITEM") {
    return isObject(message.payload) && hasString(message.payload, "videoId") && hasString(message.payload, "title");
  }

  if (message.type === "PROMOTE_QUEUE_ITEM" || message.type === "REMOVE_QUEUE_ITEM") {
    return isObject(message.payload) && hasString(message.payload, "queueItemId");
  }

  if (
    message.type === "PLAYER_STARTED" ||
    message.type === "PLAYER_ENDED" ||
    message.type === "RESTART_CURRENT_ITEM"
  ) {
    return (
      isObject(message.payload) &&
      hasString(message.payload, "queueItemId") &&
      hasString(message.payload, "videoId")
    );
  }

  return false;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" && value[key].length > 0;
}
