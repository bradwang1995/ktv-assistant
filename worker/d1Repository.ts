import type { QueueItem, Room, RoomSnapshot } from "../src/types/room";
import type { PlaybackStateRow, QueueItemRow, RoomRow } from "./types";

export async function createRoomInD1(
  db: D1Database,
  roomId: string,
  now = new Date().toISOString(),
) {
  await db
    .prepare(
      `
      INSERT INTO rooms (id, display_name, created_at, updated_at, is_active)
      VALUES (?, ?, ?, ?, 1)
      `,
    )
    .bind(roomId, `K歌房 ${roomId}`, now, now)
    .run();

  await db
    .prepare(
      `
      INSERT INTO playback_states (
        room_id,
        current_queue_item_id,
        current_video_id,
        player_state,
        started_at,
        updated_at
      )
      VALUES (?, NULL, NULL, 'idle', NULL, ?)
      `,
    )
    .bind(roomId, now)
    .run();

  return getRoomSnapshotFromD1(db, roomId);
}

export async function getRoomSnapshotFromD1(
  db: D1Database,
  roomId: string,
): Promise<RoomSnapshot | null> {
  const roomRow = await db
    .prepare(
      `
      SELECT id, display_name, created_at, updated_at, is_active
      FROM rooms
      WHERE id = ?
      `,
    )
    .bind(roomId)
    .first<RoomRow>();

  if (!roomRow) {
    return null;
  }

  const queueRows = await db
    .prepare(
      `
      SELECT
        id,
        room_id,
        video_id,
        title,
        channel_title,
        thumbnail_url,
        requested_by,
        status,
        sort_key,
        created_at,
        updated_at
      FROM queue_items
      WHERE room_id = ?
        AND status != 'removed'
      ORDER BY sort_key ASC
      `,
    )
    .bind(roomId)
    .all<QueueItemRow>();

  const playbackRow = await db
    .prepare(
      `
      SELECT
        room_id,
        current_queue_item_id,
        current_video_id,
        player_state,
        started_at,
        updated_at
      FROM playback_states
      WHERE room_id = ?
      `,
    )
    .bind(roomId)
    .first<PlaybackStateRow>();

  const now = new Date().toISOString();
  const room: Room = {
    id: roomRow.id,
    displayName: roomRow.display_name ?? undefined,
    createdAt: roomRow.created_at,
    updatedAt: roomRow.updated_at,
    isActive: roomRow.is_active === 1,
  };

  return {
    room,
    queue: (queueRows.results ?? []).map(toQueueItem),
    playback: {
      roomId,
      currentQueueItemId: playbackRow?.current_queue_item_id ?? null,
      currentVideoId: playbackRow?.current_video_id ?? null,
      playerState: toPlayerState(playbackRow?.player_state),
      startedAt: playbackRow?.started_at ?? undefined,
      updatedAt: playbackRow?.updated_at ?? now,
    },
    connectedClients: 0,
  };
}

function toQueueItem(row: QueueItemRow): QueueItem {
  return {
    id: row.id,
    roomId: row.room_id,
    videoId: row.video_id,
    title: row.title,
    channelTitle: row.channel_title ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    requestedBy: row.requested_by ?? undefined,
    status: toQueueItemStatus(row.status),
    sortKey: row.sort_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toQueueItemStatus(status: string): QueueItem["status"] {
  if (
    status === "queued" ||
    status === "playing" ||
    status === "completed" ||
    status === "removed"
  ) {
    return status;
  }

  return "queued";
}

function toPlayerState(
  state: string | null | undefined,
): RoomSnapshot["playback"]["playerState"] {
  if (
    state === "idle" ||
    state === "loading" ||
    state === "playing" ||
    state === "paused" ||
    state === "ended" ||
    state === "error"
  ) {
    return state;
  }

  return "idle";
}

