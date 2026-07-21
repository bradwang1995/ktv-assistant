CREATE TABLE IF NOT EXISTS repository_cleanup_locks (
  lock_name TEXT PRIMARY KEY,
  lease_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
