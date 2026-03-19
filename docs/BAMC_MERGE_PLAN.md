# BAMC Mission Control — Merge Plan (BAMC-owned, upstream-preserving)

This repo is a direct clone of the upstream `crshdn/mission-control` project.

## Goals
- Preserve upstream git history (and optionally keep an `upstream` remote).
- Add a real database-backed orchestration layer (Supabase Postgres recommended).
- Merge/port BAMC dashboard modules into this Mission Control UI, while keeping the upstream orchestration contract:
  - Tasks + status pipeline
  - Activities timeline
  - Deliverables registry
  - Sub-agent registration
  - Sessions + live updates

## Recommended architecture
- **Contract layer (API):** Keep/align to `ORCHESTRATION.md` endpoints.
- **DB:** Move persistence from local SQLite to Postgres (Supabase).
- **Realtime:** Use Supabase Realtime or keep SSE; either is acceptable.

## Phased implementation
### Phase 0 — Repo import
- Mirror upstream into BAMC GitHub (keeps history).
- Add `upstream` remote to pull changes.

### Phase 1 — DB foundation
- Add Postgres schema (tasks, activities, deliverables, subagents, sessions).
- Implement a DB adapter interface and switch API routes to Postgres.
- Keep SQLite adapter available for local dev.

### Phase 2 — UI merge
- Port BAMC sidebar + pages (Dashboard, Kanban, Tasks, Timeline, Ops Log, etc.).
- Wire UI to the orchestration endpoints.

### Phase 3 — BAMC-specific operational features
- Cron state-change alerts
- Heartbeat/open loops -> auto-task creation
- Audit trail linking to daily notes

## What cannot be automated without access
- Creating the BAMC GitHub repo (needs your GitHub org permissions / token).
- Deploying to Vercel and setting env vars (needs Vercel access).
- Connecting Supabase project (needs Supabase URL + anon/service role keys).
