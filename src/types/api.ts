import type { RoomId, RoomSnapshot } from "./room";

export interface CreateRoomResponse {
  roomId: RoomId;
  displayUrl: string;
  mobileUrl: string;
  snapshot?: RoomSnapshot;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

