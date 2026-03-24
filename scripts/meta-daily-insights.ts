#!/usr/bin/env npx tsx
/**
 * Meta Ads Daily Insights Extraction
 * Pulls daily ad insights from Meta Ads Library via Apify,
 * stores raw data in Supabase, and logs extraction summary.
 *
 * Run:
 *   npx tsx scripts/meta-daily-insights.ts
 *
 * Uses Apify Meta Ads Library scraper to extract ad metadata and performance.
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
loadEnvFile(resolve(process.cwd(), "../credentials/apify.env"))
loadEnvFile(resolve(process.cwd(), "../credentials/bamc-supabase.env"))
loadEnvFile(resolve(process.cwd(), "../.env.supabase"))

// ── Config ─────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const APIFY_API_KEY = process.env.APIFY_API_KEY ?? process.env.APIFY_TOKEN ?? ""
const META_AD_ACCOUNT_1 = process.env.META_AD_ACCOUNT_ID_1 ?? "act_585829113695842"
const META_AD_ACCOUNT_2 = process.env.META_AD_ACCOUNT_ID_2 ?? "act_557323674973377"

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Missing Supabase creds"); process.exit(1) }
if (!APIFY_API_KEY) { console.error("❌ Missing Apify API key"); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`) }

// ── Apify Meta Ads Library Actor ───────────────────────────────────────────
const APIFY_BASE = "https://api.apify.com"
const ACTOR_ID = "clockworks/meta-ads-library" // Example actor for Meta Ads Library

async function runApifyActor(searchQuery: string, adAccountId: string): Promise<unknown[]> {
  const url = `${APIFY_BASE}/v2/acts/clockworks~meta-ads-library/runs?token=${APIFY_API_KEY}`
  
  const input = {
    query: searchQuery,
    adAccountId: adAccountId,
    maxItems: 100,
    includeDetails: true,
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Apify API → ${res.status}: ${text.slice(0, 300)}`)
  }

  const runData = await res.json() as { id: string }
  log(`  📡 Apify run started: ${runData.id}`)

  // Poll for completion
  let status = "RUNNING"
  let datasetId: string | null = null
  
  while (status === "RUNNING" || status === "READY") {
    await new Promise(r => setTimeout(r, 2000))
    const statusRes = await fetch(`${APIFY_BASE}/v2/actor-runs/${runData.id}?token=${APIFY_API_KEY}`)
    const statusData = await statusRes.json() as { status: string; datasetId?: string }
    status = statusData.status
    if (statusData.datasetId) datasetId = statusData.datasetId
    log(`  ⏳ Status: ${status}`)
  }

  if (!datasetId) {
    throw new Error("No dataset ID returned from Apify run")
  }

  // Fetch dataset items
  const datasetRes = await fetch(`${APIFY_BASE}/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}`)
  const items = await datasetRes.json() as unknown[]
  log(`  📦 Retrieved ${items.length} items from dataset`)
  
  return items
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log("🔄 Meta Ads Daily Insights extraction started")

  // 1. Get or create BAMC account
  const { data: existingAccount, error: accErr } = await supabase
    .from("accounts")
    .select("id, display_name, meta")
    .eq("account_key", "bamc")
    .single()

  let account = existingAccount

  if (accErr || !account) {
    const { data: newAccount, error: newAccErr } = await supabase
      .from("accounts")
      .insert({ account_key: "bamc", display_name: "BAMC", meta: {} })
      .select("id, display_name, meta")
      .single()

    if (newAccErr || !newAccount) {
      console.error("❌ Could not find or create BAMC account:", newAccErr?.message)
      process.exit(1)
    }
    account = newAccount
  }

  const account_id = account.id
  log(`📍 Account: BAMC (${account_id})`)

  const stats = { records_extracted: 0, ad_accounts: 0 }

  // 2. Define search queries for life insurance and annuities
  const searchQueries = [
    "life insurance",
    "annuity",
    "term life",
    "whole life insurance",
    "permanent life insurance",
  ]

  const adAccounts = [META_AD_ACCOUNT_1, META_AD_ACCOUNT_2]

  // 3. Extract ads for each account and query
  for (const adAccount of adAccounts) {
    log(`📥 Processing ad account: ${adAccount}`)
    
    for (const query of searchQueries) {
      try {
        log(`  🔍 Query: "${query}"`)
        const ads = await runApifyActor(query, adAccount) as Record<string, unknown>[]
        
        if (ads.length === 0) {
          log(`  ⚠️ No ads found for query: ${query}`)
          continue
        }

        // Transform and upsert ads
        const rows = ads.map((ad: Record<string, unknown>) => ({
          account_id,
          ad_account_id: adAccount,
          ad_id: ad.ad_id ?? ad.id ?? null,
          ad_title: ad.ad_title ?? ad.title ?? null,
          ad_body: ad.ad_body ?? ad.body ?? ad.text ?? null,
          creative_url: ad.creative_url ?? ad.image_url ?? null,
          landing_page_url: ad.landing_page_url ?? ad.link ?? null,
          impressions: ad.impressions ?? 0,
          clicks: ad.clicks ?? 0,
          spend: ad.spend ?? 0,
          reach: ad.reach ?? 0,
          cpc: ad.cpc ?? 0,
          ctr: ad.ctr ?? 0,
          search_query: query,
          meta: ad,
          extracted_at: new Date().toISOString(),
        }))

        const { error: insertErr } = await supabase
          .from("meta_ads_insights")
          .upsert(rows, { onConflict: "account_id,ad_account_id,ad_id,extracted_at" })

        if (insertErr) {
          console.error(`  ❌ Insert error:`, insertErr.message)
        } else {
          stats.records_extracted += rows.length
          log(`  ✅ Inserted ${rows.length} ads`)
        }

        // Rate limiting between queries
        await new Promise(r => setTimeout(r, 1000))

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        log(`  ⚠️ Failed for query "${query}": ${msg}`)
        
        // Log error to data_quality_log
        await supabase.from("data_quality_log").insert({
          account_id,
          source: "meta_ads",
          check_type: "extraction",
          severity: "warning",
          message: `Extraction failed for query "${query}" on ${adAccount}: ${msg}`,
        })
      }
    }
    
    stats.ad_accounts++
  }

  // 4. Update last_extracted_at in meta
  const meta = (account.meta ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({ meta: { ...meta, last_meta_extracted_at: now } })
    .eq("id", account_id)

  if (updateErr) {
    log(`⚠️ Failed to update last_extracted_at: ${updateErr.message}`)
  }

  // 5. Log summary
  await supabase.from("data_quality_log").insert({
    account_id,
    source: "meta_ads",
    check_type: "extraction",
    severity: "info",
    message: `Daily extraction complete: ${stats.records_extracted} records from ${stats.ad_accounts} accounts`,
    affected_table: "meta_ads_insights",
    affected_count: stats.records_extracted,
  })

  log(`🎉 Extraction complete: ${stats.records_extracted} records from ${stats.ad_accounts} accounts`)
  console.log(`::set-output name=records_extracted::${stats.records_extracted}`)
  console.log(`::set-output name=ad_accounts::${stats.ad_accounts}`)
}

main().catch(async (err) => {
  console.error("💥 Fatal error:", err)
  try {
    await supabase.from("data_quality_log").insert({
      source: "meta_ads",
      check_type: "extraction",
      severity: "error",
      message: `Fatal extraction error: ${err instanceof Error ? err.message : String(err)}`,
    })
  } catch { /* best effort */ }
  process.exit(1)
})