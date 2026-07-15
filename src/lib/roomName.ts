const MAX_ROOM_DISPLAY_NAME_LENGTH = 40;
const DEFAULT_ROOM_DISPLAY_NAME = "K歌房";

export function createRoomDisplayName() {
  return DEFAULT_ROOM_DISPLAY_NAME;
}

export function normalizeRoomDisplayName(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return fallback;
  }

  return Array.from(normalized).slice(0, MAX_ROOM_DISPLAY_NAME_LENGTH).join("");
}

export function visibleRoomDisplayName(displayName: string | undefined, roomId: string) {
  const legacyDisplayName = `K歌房 ${roomId}`;
  const normalized = normalizeRoomDisplayName(displayName, DEFAULT_ROOM_DISPLAY_NAME);
  const deviceGeneratedName = /^这台 .+的 K 歌房$/;

  if (
    normalized === legacyDisplayName ||
    normalized === "我的 K 歌房" ||
    normalized === "朋友的 K 歌房" ||
    deviceGeneratedName.test(normalized)
  ) {
    return DEFAULT_ROOM_DISPLAY_NAME;
  }

  return normalized;
}
