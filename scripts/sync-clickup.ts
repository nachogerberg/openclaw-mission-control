#!/usr/bin/env npx tsx
/**
 * ClickUp Sync Script — Sophie Voss (Prism)
 * Ingests spaces → folders → lists → tasks from all ClickUp teams into Supabase.
 *
 * Run: npx tsx scripts/sync-clickup.ts
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

function loadEnv(path: string) {
  try {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq < 0) continue
      const key = t.slice(0, eq).trim()
      let val = t.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* ok */ }
}
loadEnv(resolve(process.cwd(), ".env.local"))
loadEnv(resolve(process.cwd(), "../credentials/sophie-data.env"))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const CU_KEY       = process.env.CLICKUP_API_KEY ?? ""
const CU_BASE      = "https://api.clickup.com/api/v2"

// BAMC ClickUp teams
const TEAMS = [
  { id: "10599026",    name: "BAMC's Workspace" },
  { id: "9014299590",  name: "BAMC CLIENTS | 2024" },
]

if (!SUPABASE_URL || !SUPABASE_KEY || !CU_KEY) {
  console.error("❌ Missing env vars"); process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const cuHeaders = { Authorization: CU_KEY, "Content-Type": "application/json" }

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function cuGet(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${CU_BASE}${path}`, { headers: cuHeaders })
  if (!res.ok) throw new Error(`ClickUp ${path} → ${res.status}: ${await res.text().then(t => t.slice(0, 200))}`)
  return res.json() as Promise<Record<string, unknown>>
}

async function logQuality(accountId: string | null, severity: "info" | "warning" | "critical", message: string) {
  await supabase.from("data_quality_log").insert({
    account_id: accountId,
    source: "clickup",
    check_type: "sync_lag",
    severity,
    message,
    affected_table: "clickup_spaces,clickup_lists,clickup_tasks",
  })
}

// ── Priority normalization ─────────────────────────────────────────────────
function normalizePriority(p: unknown): string | null {
  if (!p) return null
  if (typeof p === "object" && p !== null) {
    const obj = p as Record<string, unknown>
    return (obj.priority ?? obj.id ?? String(p)) as string
  }
  return String(p)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log("🔄 ClickUp sync started")

  // Get account_id (ClickUp is org-wide, link to reclutas as default)
  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("account_key", "reclutas_digitales")
    .single()
  const accountId = account?.id as string | null

  const stats = { spaces: 0, lists: 0, tasks: 0, errors: 0 }

  for (const team of TEAMS) {
    log(`📦 Team: ${team.name} (${team.id})`)

    // 1. Get spaces
    let spacesData: Record<string, unknown>
    try {
      spacesData = await cuGet(`/team/${team.id}/space?archived=false`)
    } catch (err) {
      log(`  ⚠️ Could not fetch spaces: ${err}`)
      await logQuality(accountId, "warning", `ClickUp spaces fetch failed for team ${team.id}: ${err}`)
      continue
    }

    const spaces = (spacesData.spaces ?? []) as Record<string, unknown>[]

    for (const space of spaces) {
      const spaceId = space.id as string
      const spaceName = space.name as string
      log(`  📁 Space: ${spaceName} (${spaceId})`)

      // Upsert space
      const { error: spaceErr } = await supabase.from("clickup_spaces").upsert({
        account_id: accountId,
        clickup_space_id: spaceId,
        name: spaceName,
        status: "active",
        meta: { team_id: team.id, team_name: team.name, raw: space },
        ingested_at: new Date().toISOString(),
      }, { onConflict: "clickup_space_id" })

      if (spaceErr) { log(`    ❌ Space upsert: ${spaceErr.message}`); stats.errors++; continue }
      stats.spaces++

      // Get space row id for FK
      const { data: spaceRow } = await supabase
        .from("clickup_spaces")
        .select("id")
        .eq("clickup_space_id", spaceId)
        .single()
      const spaceRowId = spaceRow?.id as string | undefined

      // 2. Get lists directly in the space (space-level lists, no folder)
      try {
        const listsData = await cuGet(`/space/${spaceId}/list?archived=false`)
        const lists = (listsData.lists ?? []) as Record<string, unknown>[]
        for (const list of lists) {
          await upsertList(list, spaceId, spaceRowId ?? null, accountId, stats)
        }
      } catch (err) {
        log(`    ⚠️ Space lists failed: ${err}`)
      }

      // 3. Get folders → lists
      try {
        const foldersData = await cuGet(`/space/${spaceId}/folder?archived=false`)
        const folders = (foldersData.folders ?? []) as Record<string, unknown>[]
        for (const folder of folders) {
          const folderId = folder.id as string
          const folderName = folder.name as string
          log(`    📂 Folder: ${folderName}`)
          try {
            const flData = await cuGet(`/folder/${folderId}/list?archived=false`)
            const flLists = (flData.lists ?? []) as Record<string, unknown>[]
            for (const list of flLists) {
              await upsertList(list, spaceId, spaceRowId ?? null, accountId, stats)
            }
          } catch (err) {
            log(`      ⚠️ Folder lists failed: ${err}`)
          }
          await sleep(100)
        }
      } catch (err) {
        log(`    ⚠️ Folders fetch failed: ${err}`)
      }

      await sleep(200)
    }
  }

  await logQuality(accountId, "info",
    `ClickUp sync complete. Spaces: ${stats.spaces}, Lists: ${stats.lists}, Tasks: ${stats.tasks}, Errors: ${stats.errors}.`)
  log(`🎉 Done | spaces: ${stats.spaces} | lists: ${stats.lists} | tasks: ${stats.tasks} | errors: ${stats.errors}`)
}

async function upsertList(
  list: Record<string, unknown>,
  spaceId: string,
  spaceRowId: string | null,
  accountId: string | null,
  stats: Record<string, number>
) {
  const listId   = list.id as string
  const listName = list.name as string
  log(`      📋 List: ${listName} (${listId})`)

  const { error: listErr } = await supabase.from("clickup_lists").upsert({
    account_id: accountId,
    space_id: spaceRowId,
    clickup_list_id: listId,
    name: listName,
    status: "active",
    meta: { space_id: spaceId, raw: list },
    ingested_at: new Date().toISOString(),
  }, { onConflict: "clickup_list_id" })

  if (listErr) { log(`        ❌ List upsert: ${listErr.message}`); stats.errors++; return }
  stats.lists++

  const { data: listRow } = await supabase
    .from("clickup_lists")
    .select("id")
    .eq("clickup_list_id", listId)
    .single()
  const listRowId = listRow?.id as string | undefined

  // Get tasks for this list (paginated)
  let page = 0
  let hasMore = true
  while (hasMore) {
    let tasksData: Record<string, unknown>
    try {
      tasksData = await cuGet(
        `/list/${listId}/task?archived=false&include_closed=true&page=${page}&subtasks=true`
      )
    } catch (err) {
      log(`        ⚠️ Tasks page ${page} failed: ${err}`)
      break
    }

    const tasks = (tasksData.tasks ?? []) as Record<string, unknown>[]
    if (tasks.length === 0) { hasMore = false; break }

    const rows = tasks.map((t) => ({
      account_id: accountId,
      clickup_task_id: t.id as string,
      list_id: listRowId ?? null,
      title: (t.name ?? null) as string | null,
      description: (t.description ?? t.text_content ?? null) as string | null,
      status: ((t.status as Record<string, unknown> | null)?.status ?? t.status ?? null) as string | null,
      priority: normalizePriority(t.priority),
      assignees: ((t.assignees ?? []) as Record<string, unknown>[]).map(a => a.username ?? a.email ?? String(a.id)),
      due_date: t.due_date ? new Date(Number(t.due_date)).toISOString() : null,
      completed_at: t.date_closed ? new Date(Number(t.date_closed)).toISOString() : null,
      created_at_clickup: t.date_created ? new Date(Number(t.date_created)).toISOString() : null,
      updated_at_clickup: t.date_updated ? new Date(Number(t.date_updated)).toISOString() : null,
      ingested_at: new Date().toISOString(),
      meta: t,
    }))

    const { error: taskErr } = await supabase
      .from("clickup_tasks")
      .upsert(rows, { onConflict: "clickup_task_id" })

    if (taskErr) { log(`        ❌ Tasks batch error: ${taskErr.message}`); stats.errors += tasks.length }
    else stats.tasks += tasks.length

    // ClickUp returns up to 100 per page; last_page flag signals end
    hasMore = !(tasksData.last_page as boolean) && tasks.length === 100
    page++
    await sleep(150)
  }
  await sleep(150)
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

main().catch(async (err) => {
  console.error("💥 Fatal:", err)
  try {
    await supabase.from("data_quality_log").insert({
      source: "clickup", check_type: "sync_lag", severity: "critical",
      message: `ClickUp sync crashed: ${err}`, affected_table: "clickup_tasks",
    })
  } catch { /* best effort */ }
  process.exit(1)
})
