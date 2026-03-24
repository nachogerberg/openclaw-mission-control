BEGIN TRANSACTION;

INSERT OR IGNORE INTO businesses (id, name, description) VALUES
  ('bamc','BAMC','BAMC operations hub'),
  ('engage','Engage Media','Creative + performance operations'),
  ('reclutas','Reclutas Digitales','Insurance recruiting + sales ops'),
  ('insurex','InsureX','Insurance agency operations'),
  ('manta','Manta Fund','Trading + investment operations');

UPDATE workspaces
SET name='BAMC Ops', slug='bamc-ops', description='Central operating workspace for Nacho''s multi-agent HQ across BAMC, Engage, Reclutas, InsureX, and Manta.', icon='🧠', updated_at=datetime('now')
WHERE id='default';

INSERT OR IGNORE INTO workspaces (id, name, slug, description, icon) VALUES
  ('engage','Engage Media','engage','Creative, media buying, content, and client performance operations.','🎯'),
  ('reclutas','Reclutas Digitales','reclutas','Insurance recruiting, GHL revenue ops, and growth execution.','📈'),
  ('insurex','InsureX','insurex','Agency buildout, recruitment engine, and operating blueprint.','🛡️'),
  ('manta','Manta Fund','manta','Trading, portfolio, and risk operations.','📊');

INSERT OR IGNORE INTO workflow_templates (id, workspace_id, name, description, stages, fail_targets, is_default, created_at, updated_at)
SELECT 'strict-engage','engage', name, description, stages, fail_targets, is_default, datetime('now'), datetime('now') FROM workflow_templates WHERE workspace_id='default' LIMIT 1;
INSERT OR IGNORE INTO workflow_templates (id, workspace_id, name, description, stages, fail_targets, is_default, created_at, updated_at)
SELECT 'strict-reclutas','reclutas', name, description, stages, fail_targets, is_default, datetime('now'), datetime('now') FROM workflow_templates WHERE workspace_id='default' LIMIT 1;
INSERT OR IGNORE INTO workflow_templates (id, workspace_id, name, description, stages, fail_targets, is_default, created_at, updated_at)
SELECT 'strict-insurex','insurex', name, description, stages, fail_targets, is_default, datetime('now'), datetime('now') FROM workflow_templates WHERE workspace_id='default' LIMIT 1;
INSERT OR IGNORE INTO workflow_templates (id, workspace_id, name, description, stages, fail_targets, is_default, created_at, updated_at)
SELECT 'strict-manta','manta', name, description, stages, fail_targets, is_default, datetime('now'), datetime('now') FROM workflow_templates WHERE workspace_id='default' LIMIT 1;

DELETE FROM agents WHERE workspace_id='default' AND name IN ('Builder Agent','Tester Agent','Reviewer Agent','Learner Agent');

INSERT OR REPLACE INTO agents (id,name,role,description,avatar_emoji,status,is_master,workspace_id,model,source,session_key_prefix,created_at,updated_at) VALUES
  ('agent-soren','Soren Ashford','chief_of_staff','Main coordinator across BAMC. Handles Nacho comms, briefs, heartbeat, and orchestration.','🧠','standby',1,'default','Claude Sonnet 4.6','local','main',datetime('now'),datetime('now')),
  ('agent-sophie','Sophie Voss','data_intelligence','Chief Data Intelligence Officer. Syncs GHL, ClickUp, Notion, Fireflies, and powers reporting.','📊','standby',0,'default','Claude Sonnet 4.6','local','sophie',datetime('now'),datetime('now')),
  ('agent-drake','Drake Montero','revenue_ops','GHL revenue ops for Reclutas. Pipeline hygiene, lead routing, briefs, and sales monitoring.','💼','standby',0,'reclutas','Claude Sonnet 4.6','local','drake',datetime('now'),datetime('now')),
  ('agent-vanta','VANTA','portfolio_cmo','Portfolio brand/marketing operator. Creative and portfolio-level strategic oversight.','✨','standby',0,'engage','Claude Sonnet 4.6','local','vanta',datetime('now'),datetime('now')),
  ('agent-sienna','Sienna Vale','creative_performance','Creative performance lead for Engage. Angles, hooks, landing pages, and testing loops.','🎨','standby',0,'engage','Claude Sonnet 4.6','local','sienna',datetime('now'),datetime('now')),
  ('agent-mason','Mason Kade','revenue_operations','Engage revenue operations / pipeline commander.','⚙️','standby',0,'engage','Claude Sonnet 4.6','local','mason',datetime('now'),datetime('now')),
  ('agent-marcus','Marcus Reid','trading_ops','Chief Trading Officer for Manta Fund. Strategy orchestration, risk, and P&L review.','📉','standby',0,'manta','Claude Sonnet 4.6','local','marcus',datetime('now'),datetime('now')),
  ('agent-scout','Scout Vega','research','On-demand research agent for market scans, intel, and briefs.','🛰️','standby',0,'default','MiniMax M2.5','local','scout',datetime('now'),datetime('now')),
  ('agent-atlas','Atlas','mission_control_pm','Mission Control PM / systems architect. Planned operational PM role.','🗺️','offline',0,'default',NULL,'local','atlas',datetime('now'),datetime('now')),
  ('agent-aura','Aura','engage_primary','Primary Engage agent for media operations and execution.','🔥','standby',0,'engage','Claude Sonnet 4.6','local','aura',datetime('now'),datetime('now'));

DELETE FROM tasks;
DELETE FROM events;

INSERT INTO tasks (id,title,description,status,priority,assigned_agent_id,created_by_agent_id,workspace_id,business_id,workflow_template_id,status_reason,created_at,updated_at) VALUES
  ('task-insurance-intel-fix','Fix insurance-intel date parsing cron failure','Known failure since Mar 17. light-daily-apify.ts date parsing bug is blocking fresh insurance-intel ingestion; DB stuck around 141 records.','in_progress','urgent','agent-sophie','agent-soren','default','bamc',NULL,'Known failing cron; pending code fix + validation run.',datetime('now','-2 days'),datetime('now')),
  ('task-apify-decision','Decide Apify scope for insurance intelligence','Pending strategic decision on geo scope / source design before scaling insurance ad intelligence collection.','review','high','agent-soren','agent-soren','default','bamc',NULL,'Needs Nacho decision on scope before proceeding.',datetime('now','-12 days'),datetime('now')),
  ('task-insurex-blueprint','Finalize InsureX operating blueprint','Package recruitment engine, operating system, and implementation sequence for InsureX.','review','high','agent-soren','agent-soren','insurex','insurex',NULL,'Awaiting Nacho approval on blueprint direction.',datetime('now','-10 days'),datetime('now')),
  ('task-engage-agent-map','Map Engage roster into Mission Control','Normalize Engage agents/personas (Aura, Mason, Sienna, VANTA) into one operational dashboard and remove demo confusion.','done','high','agent-aura','agent-soren','engage','engage',NULL,'Completed initial roster load into dashboard.',datetime('now','-1 day'),datetime('now')),
  ('task-mission-control-real-data','Load Mission Control with real workspaces, agents, and live operating data','Replace empty demo state with BAMC/Engage/Reclutas/InsureX/Manta workspaces, real agents, and active tasks.','done','urgent','agent-soren','agent-soren','default','bamc',NULL,'Implemented local seed + production deploy.',datetime('now','-1 hour'),datetime('now')),
  ('task-reclutas-ghl-ops','Monitor Reclutas GHL pipeline, spam checks, and daily briefs','Ongoing revenue-ops cadence: 9AM brief, noon/5PM spam checks, 6PM EOD summary.','in_progress','high','agent-drake','agent-soren','reclutas','reclutas',NULL,'Standing operational responsibility.',datetime('now','-5 days'),datetime('now')),
  ('task-engage-creative-loop','Run creative testing loop for Engage','Angle planning, hook generation, asset shipping, and winner/loser evaluation for Engage clients.','in_progress','high','agent-sienna','agent-soren','engage','engage',NULL,'Recurring execution loop.',datetime('now','-3 days'),datetime('now')),
  ('task-manta-dashboard-review','Review Manta Fund dashboard + holdings visibility','Maintain dashboard organization, current holdings visibility, and risk/performance snapshot.','done','normal','agent-marcus','agent-soren','manta','manta',NULL,'Dashboard updated earlier this month.',datetime('now','-9 days'),datetime('now')),
  ('task-fireflies-monitor','Monitor Fireflies ingestion health and recovery','Fireflies had prior failures but is currently recovered. Keep watch for regressions only.','done','normal','agent-sophie','agent-soren','default','bamc',NULL,'Recovered; exception-based monitoring only.',datetime('now','-1 day'),datetime('now')),
  ('task-bamc-daily-brief','Deliver BAMC daily brief on Telegram + Discord','8AM EST daily brief with news, ops, and opportunities across businesses.','in_progress','high','agent-soren','agent-soren','default','bamc',NULL,'Recurring daily deliverable.',datetime('now','-20 days'),datetime('now'));

INSERT INTO events (id,type,agent_id,task_id,message,created_at) VALUES
  ('evt1','system','agent-soren','task-mission-control-real-data','Mission Control upgraded from demo seed to real BAMC operating snapshot',datetime('now')),
  ('evt2','agent_joined','agent-soren',NULL,'Soren Ashford added as BAMC Ops coordinator',datetime('now')),
  ('evt3','agent_joined','agent-sophie',NULL,'Sophie Voss added as data intelligence lead',datetime('now')),
  ('evt4','agent_joined','agent-drake',NULL,'Drake Montero added to Reclutas workspace',datetime('now')),
  ('evt5','agent_joined','agent-vanta',NULL,'VANTA added to Engage workspace',datetime('now')),
  ('evt6','agent_joined','agent-sienna',NULL,'Sienna Vale added to Engage workspace',datetime('now')),
  ('evt7','task_status_changed','agent-soren','task-insurance-intel-fix','insurance-intel remains failing; no state change since Mar 17',datetime('now')),
  ('evt8','task_created','agent-soren','task-apify-decision','Strategic Apify scope decision tracked in BAMC Ops',datetime('now')),
  ('evt9','task_created','agent-soren','task-insurex-blueprint','InsureX blueprint review task loaded into dashboard',datetime('now')),
  ('evt10','task_completed','agent-soren','task-mission-control-real-data','Real workspaces, agents, and tasks loaded successfully',datetime('now'));

COMMIT;
