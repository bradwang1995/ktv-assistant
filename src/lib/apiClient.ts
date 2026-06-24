import type { ApiErrorResponse, CreateRoomResponse } from "../types/api";
import type { RoomSnapshot } from "../types/room";

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
  }
}

export async function createRoomViaApi() {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      accept: "application/json",
    },
  });

  return parseJsonResponse<CreateRoomResponse>(response);
}

export async function fetchRoomSnapshot(roomId: string) {
  const response = await fetch(`/api/rooms/${roomId}/snapshot`, {
    headers: {
      accept: "application/json",
    },
  });

  return parseJsonResponse<RoomSnapshot>(response);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new ApiClientError(
      response.status,
      "NON_JSON_RESPONSE",
      "API did not return JSON.",
    );
  }

  const body = (await response.json()) as T | ApiErrorResponse;

  if (!response.ok) {
    const errorBody = body as ApiErrorResponse;
    throw new ApiClientError(
      response.status,
      errorBody.error?.code ?? "API_ERROR",
      errorBody.error?.message ?? "API request failed.",
    );
  }

  return body as T;
}

