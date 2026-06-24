CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS queue_items (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT,
  thumbnail_url TEXT,
  requested_by TEXT,
  status TEXT NOT NULL,
  sort_key INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE INDEX IF NOT EXISTS idx_queue_items_room_sort
ON queue_items(room_id, sort_key);

CREATE INDEX IF NOT EXISTS idx_queue_items_room_status
ON queue_items(room_id, status);

CREATE TABLE IF NOT EXISTS playback_states (
  room_id TEXT PRIMARY KEY,
  current_queue_item_id TEXT,
  current_video_id TEXT,
  player_state TEXT NOT NULL,
  started_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE IF NOT EXISTS playback_events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  queue_item_id TEXT,
  video_id TEXT,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  payload_json TEXT,
  FOREIGN KEY (room_id) REFERENCES rooms(id)
);

