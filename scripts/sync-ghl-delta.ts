#!/usr/bin/env npx tsx
/**
 * GHL Delta Sync Script
 * Pulls contacts and opportunities updated since last sync from GHL,
 * upserts them into Supabase, and logs a summary.
 *
 * Run:
 *   npx tsx scripts/sync-ghl-delta.ts
 *
 * GHL API does not support server-side date filtering for contacts/opportunities,
 * so we paginate through all records and filter client-side by dateUpdated >= last_synced_at.
 * For ~500-600 records this completes in seconds.
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve } from "path"

// ── Load env files ─────────────────────────────────────────────────────────
function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1)
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* file not found — fine */ }
}

loadEnvFile(resolve(process.cwd(), ".env.local"))
loadEnvFile(resolve(process.cwd(), "../credentials/sophie-data.env"))
loadEnvFile(resolve(process.cwd(), "../.env.supabase"))

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const GHL_API_KEY = process.env.GHL_PRIMARY_API_KEY ?? ""
const GHL_LOCATION_ID = process.env.GHL_PRIMARY_LOCATION_ID ?? ""
const GHL_BASE = "https://services.leadconnectorhq.com"
const GHL_VERSION = "2021-07-28"

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Missing Supabase creds"); process.exit(1) }
if (!GHL_API_KEY || !GHL_LOCATION_ID) { console.error("❌ Missing GHL creds"); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ghlHeaders = {
  Authorization: `Bearer ${GHL_API_KEY}`,
  "Content-Type": "application/json",
  Version: GHL_VERSION,
}

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function ghlGet(path: string, params: Record<string, string> = {}, retries = 3): Promise<unknown> {
  const url = new URL(`${GHL_BASE}${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url.toString(), { headers: ghlHeaders })
    if (res.status === 429 && attempt < retries) {
      const wait = Math.pow(2, attempt + 1) * 1000 // 2s, 4s, 8s
      log(`  ⏳ Rate limited, waiting ${wait / 1000}s (attempt ${attempt + 1}/${retries})...`)
      await new Promise(r => setTimeout(r, wait))
      continue
    }
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`GHL ${path} → ${res.status}: ${text.slice(0, 300)}`)
    }
    return res.json()
  }
  throw new Error(`GHL ${path} → exhausted retries`)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log("🔄 GHL Delta Sync started")

  // 1. Get account + last_synced_at from meta
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id, display_name, meta")
    .eq("account_key", "reclutas_digitales")
    .single()

  if (accErr || !account) {
    console.error("❌ Could not find reclutas_digitales account:", accErr?.message)
    process.exit(1)
  }

  const account_id = account.id
  const meta = (account.meta ?? {}) as Record<string, unknown>
  const lastSyncedAt = meta.last_synced_at
    ? new Date(meta.last_synced_at as string)
    : new Date(Date.now() - 24 * 60 * 60 * 1000) // default: 24h ago

  log(`📍 Account: ${account.display_name} (${account_id})`)
  log(`📅 Last synced: ${lastSyncedAt.toISOString()}`)

  const stats = { contacts: 0, opportunities: 0 }

  // 2. Pull ALL contacts and filter client-side by dateUpdated >= lastSyncedAt
  // GHL contacts API has no server-side date filter — must paginate all records
  try {
    log("📥 Fetching contacts...")
    let hasMore = true
    let cursorTs: string | null = null
    let cursorId: string | null = null
    const PAGE_SIZE = 100
    const updatedContacts: Record<string, unknown>[] = []

    while (hasMore) {
      const params: Record<string, string> = {
        locationId: GHL_LOCATION_ID,
        limit: String(PAGE_SIZE),
      }
      if (cursorTs) params.startAfter = cursorTs
      if (cursorId) params.startAfterId = cursorId

      const pageData = (await ghlGet("/contacts/", params)) as Record<string, unknown>
      const contacts = (pageData.contacts ?? []) as Record<string, unknown>[]

      if (contacts.length === 0) { hasMore = false; break }

      // Filter by dateUpdated >= lastSyncedAt
      for (const c of contacts) {
        const du = c.dateUpdated as string | undefined
        if (du && new Date(du) >= lastSyncedAt) {
          updatedContacts.push(c)
        }
      }

      // Advance cursor
      const last = contacts[contacts.length - 1]
      const cursor = last.startAfter as [number, string] | undefined
      if (cursor && Array.isArray(cursor) && cursor.length === 2) {
        cursorTs = String(cursor[0])
        cursorId = String(cursor[1])
      } else {
        hasMore = false
      }

      if (contacts.length < PAGE_SIZE) hasMore = false
      await new Promise(r => setTimeout(r, 300))
    }

    log(`  Found ${updatedContacts.length} contacts updated since last sync`)

    // Upsert updated contacts
    const BATCH = 50
    for (let i = 0; i < updatedContacts.length; i += BATCH) {
      const slice = updatedContacts.slice(i, i + BATCH)
      const rows = slice.map((c: Record<string, unknown>) => ({
        account_id,
        ghl_contact_id: c.id as string,
        name: ((c.contactName ?? c.name ?? c.fullName ?? null) as string | null),
        email: (c.email ?? null) as string | null,
        phone: (c.phone ?? null) as string | null,
        tags: (c.tags ?? []) as string[],
        stage: (c.stage ?? c.status ?? c.type ?? null) as string | null,
        source: (c.source ?? null) as string | null,
        assigned_user: (c.assignedTo ?? c.assignedUser ?? null) as string | null,
        created_at_ghl: (c.dateAdded ?? c.createdAt ?? null) as string | null,
        updated_at_ghl: (c.dateUpdated ?? c.updatedAt ?? null) as string | null,
        meta: c,
      }))
      const { error } = await supabase
        .from("ghl_contacts")
        .upsert(rows, { onConflict: "account_id,ghl_contact_id" })
      if (error) {
        console.error(`  ❌ Contact upsert error:`, error.message)
      } else {
        stats.contacts += slice.length
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log(`⚠️ Contact sync failed: ${msg}`)
    await supabase.from("data_quality_log").insert({
      account_id,
      source: "ghl",
      check_type: "sync_lag",
      severity: "warning",
      message: `Delta sync contacts failed: ${msg}`,
    })
  }

  // 3. Pull ALL opportunities and filter client-side by updatedAt >= lastSyncedAt
  try {
    log("📥 Fetching opportunities...")
    let hasMore = true
    let cursorTs: string | null = null
    let cursorId: string | null = null
    const PAGE_SIZE = 100
    const updatedOpps: Record<string, unknown>[] = []

    while (hasMore) {
      const params: Record<string, string> = {
        location_id: GHL_LOCATION_ID,
        limit: String(PAGE_SIZE),
      }
      if (cursorTs) params.startAfter = cursorTs
      if (cursorId) params.startAfterId = cursorId

      const pageData = (await ghlGet("/opportunities/search", params)) as Record<string, unknown>
      const opps = (pageData.opportunities ?? []) as Record<string, unknown>[]
      const pageMeta = pageData.meta as Record<string, unknown> | undefined

      if (opps.length === 0) { hasMore = false; break }

      // Filter by updatedAt >= lastSyncedAt
      for (const o of opps) {
        const du = (o.updatedAt ?? o.dateUpdated) as string | undefined
        if (du && new Date(du) >= lastSyncedAt) {
          updatedOpps.push(o)
        }
      }

      // Advance cursor from meta
      if (pageMeta?.startAfter && pageMeta?.startAfterId) {
        cursorTs = String(pageMeta.startAfter)
        cursorId = String(pageMeta.startAfterId)
      } else {
        hasMore = false
      }

      if (opps.length < PAGE_SIZE) hasMore = false
      await new Promise(r => setTimeout(r, 300))
    }

    log(`  Found ${updatedOpps.length} opportunities updated since last sync`)

    // Upsert updated opportunities
    const BATCH = 50
    for (let i = 0; i < updatedOpps.length; i += BATCH) {
      const slice = updatedOpps.slice(i, i + BATCH)
      const rows = slice.map((o: Record<string, unknown>) => ({
        account_id,
        ghl_opportunity_id: o.id as string,
        ghl_contact_id: (o.contactId ?? null) as string | null,
        name: (o.name ?? null) as string | null,
        stage_id: (o.pipelineStageId ?? o.stageId ?? null) as string | null,
        stage_name: (o.pipelineStageName ?? o.stageName ?? null) as string | null,
        status: (o.status ?? null) as string | null,
        value: (o.monetaryValue ?? o.value ?? 0) as number,
        pipeline_id: (o.pipelineId ?? null) as string | null,
        pipeline_name: (o.pipelineName ?? null) as string | null,
        assigned_user: (o.assignedTo ?? o.assignedUser ?? null) as string | null,
        created_at_ghl: (o.dateAdded ?? o.createdAt ?? null) as string | null,
        updated_at_ghl: (o.dateUpdated ?? o.updatedAt ?? null) as string | null,
        meta: o,
      }))
      const { error } = await supabase
        .from("ghl_opportunities")
        .upsert(rows, { onConflict: "account_id,ghl_opportunity_id" })
      if (error) {
        console.error(`  ❌ Opportunity upsert error:`, error.message)
      } else {
        stats.opportunities += slice.length
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log(`⚠️ Opportunity sync failed: ${msg}`)
    await supabase.from("data_quality_log").insert({
      account_id,
      source: "ghl",
      check_type: "sync_lag",
      severity: "warning",
      message: `Delta sync opportunities failed: ${msg}`,
    })
  }

  // 4. Update last_synced_at in meta
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({ meta: { ...meta, last_synced_at: now } })
    .eq("id", account_id)

  if (updateErr) {
    log(`⚠️ Failed to update last_synced_at: ${updateErr.message}`)
  } else {
    log(`✅ Updated last_synced_at to ${now}`)
  }

  // 5. Log summary to data_quality_log
  await supabase.from("data_quality_log").insert({
    account_id,
    source: "ghl",
    check_type: "sync_lag",
    severity: "info",
    message: `Delta sync complete: ${stats.contacts} contacts, ${stats.opportunities} opportunities`,
    affected_table: "ghl_contacts,ghl_opportunities",
    affected_count: stats.contacts + stats.opportunities,
  })

  log(`🎉 Delta sync complete: ${stats.contacts} contacts, ${stats.opportunities} opportunities`)
}

main().catch(async (err) => {
  console.error("💥 Fatal error:", err)
  // Try to log even on fatal
  try {
    await supabase.from("data_quality_log").insert({
      source: "ghl",
      check_type: "sync_lag",
      severity: "warning",
      message: `Delta sync fatal: ${err instanceof Error ? err.message : String(err)}`,
    })
  } catch { /* best effort */ }
  process.exit(1)
})
