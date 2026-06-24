const ROOM_ID_PATTERN = /^[a-z0-9]{8}$/;

export function createRoomId() {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8)
    .padEnd(8, "0");
}

export function isValidRoomId(roomId: string) {
  return ROOM_ID_PATTERN.test(roomId);
}

