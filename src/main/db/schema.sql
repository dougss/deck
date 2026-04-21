PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE workspaces (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  accent_color  TEXT NOT NULL,
  path          TEXT NOT NULL,
  needs_setup   INTEGER NOT NULL DEFAULT 0,
  ordinal       INTEGER NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_workspaces_ordinal ON workspaces(ordinal);

CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  cwd             TEXT NOT NULL,
  command         TEXT NOT NULL,
  sub_text        TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'idle',
  created_at      INTEGER NOT NULL,
  last_active_at  INTEGER NOT NULL
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_id);
CREATE INDEX idx_sessions_last_active ON sessions(last_active_at DESC);
