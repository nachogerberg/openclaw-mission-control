-- Mission Control (BAMC) — Postgres schema aligned to ORCHESTRATION.md
-- This is intended for Supabase Postgres.

-- Enums
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM ('inbox','assigned','in_progress','testing','review','done');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('spawned','updated','completed','file_created','status_changed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE deliverable_type AS ENUM ('file','url','artifact');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'inbox',
  priority int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

-- Activities
CREATE TABLE IF NOT EXISTS task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  message text NOT NULL,
  agent_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at DESC);

-- Deliverables
CREATE TABLE IF NOT EXISTS task_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  deliverable_type deliverable_type NOT NULL,
  title text NOT NULL,
  path text,
  url text,
  description text,
  warning text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deliverable_path_or_url CHECK (
    (deliverable_type = 'file' AND path IS NOT NULL) OR
    (deliverable_type IN ('url','artifact'))
  )
);

CREATE INDEX IF NOT EXISTS idx_task_deliverables_task_id ON task_deliverables(task_id);

-- Subagents
CREATE TABLE IF NOT EXISTS task_subagents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  openclaw_session_id text NOT NULL,
  agent_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_subagents_task_id ON task_subagents(task_id);

-- OpenClaw sessions (optional: if you want to persist session state)
CREATE TABLE IF NOT EXISTS openclaw_sessions (
  id text PRIMARY KEY,
  agent_name text,
  status text,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger helper
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER set_openclaw_sessions_updated_at
  BEFORE UPDATE ON openclaw_sessions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
