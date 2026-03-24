/**
 * Postgres Schema for Mission Control (Vercel deployment)
 *
 * Translated from SQLite schema.ts — all tables use oc_ prefix
 * to avoid collisions with the BAMC HQ tables in the same Supabase project.
 */

export const pgSchema = `
-- Workspaces table
CREATE TABLE IF NOT EXISTS oc_workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT DEFAULT '📁',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS oc_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  avatar_emoji TEXT DEFAULT '🤖',
  status TEXT DEFAULT 'standby' CHECK (status IN ('standby', 'working', 'offline')),
  is_master INTEGER DEFAULT 0,
  workspace_id TEXT DEFAULT 'default' REFERENCES oc_workspaces(id),
  soul_md TEXT,
  user_md TEXT,
  agents_md TEXT,
  model TEXT,
  source TEXT DEFAULT 'local',
  gateway_agent_id TEXT,
  session_key_prefix TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow templates (must come before tasks due to FK)
CREATE TABLE IF NOT EXISTS oc_workflow_templates (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'default' REFERENCES oc_workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  stages TEXT NOT NULL,
  fail_targets TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks table (Mission Queue)
CREATE TABLE IF NOT EXISTS oc_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'inbox' CHECK (status IN ('pending_dispatch', 'planning', 'inbox', 'assigned', 'in_progress', 'testing', 'review', 'verification', 'done')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_agent_id TEXT REFERENCES oc_agents(id),
  created_by_agent_id TEXT REFERENCES oc_agents(id),
  workspace_id TEXT DEFAULT 'default' REFERENCES oc_workspaces(id),
  business_id TEXT DEFAULT 'default',
  due_date TEXT,
  workflow_template_id TEXT REFERENCES oc_workflow_templates(id),
  planning_session_key TEXT,
  planning_messages TEXT,
  planning_complete INTEGER DEFAULT 0,
  planning_spec TEXT,
  planning_agents TEXT,
  planning_dispatch_error TEXT,
  status_reason TEXT,
  images TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planning questions table
CREATE TABLE IF NOT EXISTS oc_planning_questions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES oc_tasks(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'text', 'yes_no')),
  options TEXT,
  answer TEXT,
  answered_at TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planning specs table
CREATE TABLE IF NOT EXISTS oc_planning_specs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE REFERENCES oc_tasks(id) ON DELETE CASCADE,
  spec_markdown TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  locked_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS oc_conversations (
  id TEXT PRIMARY KEY,
  title TEXT,
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group', 'task')),
  task_id TEXT REFERENCES oc_tasks(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants
CREATE TABLE IF NOT EXISTS oc_conversation_participants (
  conversation_id TEXT REFERENCES oc_conversations(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES oc_agents(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conversation_id, agent_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS oc_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES oc_conversations(id) ON DELETE CASCADE,
  sender_agent_id TEXT REFERENCES oc_agents(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'task_update', 'file')),
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (live feed)
CREATE TABLE IF NOT EXISTS oc_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  agent_id TEXT REFERENCES oc_agents(id),
  task_id TEXT REFERENCES oc_tasks(id),
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Businesses (legacy)
CREATE TABLE IF NOT EXISTS oc_businesses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OpenClaw session mapping
CREATE TABLE IF NOT EXISTS oc_openclaw_sessions (
  id TEXT PRIMARY KEY,
  agent_id TEXT REFERENCES oc_agents(id),
  openclaw_session_id TEXT NOT NULL,
  channel TEXT,
  status TEXT DEFAULT 'active',
  session_type TEXT DEFAULT 'persistent',
  task_id TEXT REFERENCES oc_tasks(id),
  ended_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task role assignments
CREATE TABLE IF NOT EXISTS oc_task_roles (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES oc_tasks(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  agent_id TEXT NOT NULL REFERENCES oc_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, role)
);

-- Knowledge entries
CREATE TABLE IF NOT EXISTS oc_knowledge_entries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'default' REFERENCES oc_workspaces(id),
  task_id TEXT REFERENCES oc_tasks(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,
  confidence REAL DEFAULT 0.5,
  created_by_agent_id TEXT REFERENCES oc_agents(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task activities
CREATE TABLE IF NOT EXISTS oc_task_activities (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES oc_tasks(id) ON DELETE CASCADE,
  agent_id TEXT REFERENCES oc_agents(id),
  activity_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task deliverables
CREATE TABLE IF NOT EXISTS oc_task_deliverables (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES oc_tasks(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  title TEXT NOT NULL,
  path TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insurance Ad Intel cache
CREATE TABLE IF NOT EXISTS oc_insurance_ad_intel (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  keyword_language TEXT DEFAULT 'en' CHECK (keyword_language IN ('en', 'es')),
  region TEXT DEFAULT 'US' CHECK (region IN ('US', 'PR')),
  page_name TEXT NOT NULL,
  page_id TEXT,
  ad_snapshot_url TEXT,
  destination_url TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'unknown' CHECK (media_type IN ('image', 'video', 'carousel', 'unknown')),
  ad_copy TEXT,
  headline TEXT,
  cta TEXT,
  platforms TEXT,
  first_seen_at TEXT,
  last_seen_at TEXT,
  is_active INTEGER DEFAULT 1,
  countries TEXT,
  score REAL DEFAULT 0,
  score_breakdown TEXT,
  tags TEXT,
  raw_payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source telemetry
CREATE TABLE IF NOT EXISTS oc_source_telemetry (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oc_tasks_status ON oc_tasks(status);
CREATE INDEX IF NOT EXISTS idx_oc_tasks_assigned ON oc_tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_oc_tasks_workspace ON oc_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_oc_agents_workspace ON oc_agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_oc_messages_conversation ON oc_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_oc_events_created ON oc_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oc_agents_status ON oc_agents(status);
CREATE INDEX IF NOT EXISTS idx_oc_activities_task ON oc_task_activities(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oc_deliverables_task ON oc_task_deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_oc_sessions_task ON oc_openclaw_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_oc_planning_q_task ON oc_planning_questions(task_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_oc_wf_templates_ws ON oc_workflow_templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_oc_task_roles_task ON oc_task_roles(task_id);
CREATE INDEX IF NOT EXISTS idx_oc_knowledge_ws ON oc_knowledge_entries(workspace_id, created_at DESC);
`;

/** Seed data: default workspace + BAMC agents */
export const pgSeedData = `
INSERT INTO oc_workspaces (id, name, slug, description, icon)
VALUES ('default', 'BAMC Operations', 'default', 'Main BAMC workspace', '🏢')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oc_agents (id, name, role, avatar_emoji, status, is_master, workspace_id, source) VALUES
  ('soren',  'Soren Ashford',    'Chief of Staff',        '🎯', 'standby', 1, 'default', 'local'),
  ('drake',  'Drake Montero',    'Revenue Operations',    '💰', 'standby', 0, 'default', 'local'),
  ('sophie', 'Sophie Voss',      'Data Intelligence',     '📊', 'standby', 0, 'default', 'local'),
  ('scout',  'Scout',            'Research & Intelligence','🔍', 'standby', 0, 'default', 'local'),
  ('vanta',  'Valentina Rojas',  'Portfolio CMO',         '🦂', 'standby', 0, 'default', 'local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO oc_workflow_templates (id, workspace_id, name, description, stages, is_default) VALUES
  ('default-pipeline', 'default', 'Standard Pipeline', 'Default task pipeline',
   '["inbox","assigned","in_progress","testing","review","done"]', 1)
ON CONFLICT (id) DO NOTHING;
`;
