#!/usr/bin/env npx tsx
/**
 * GHL Import Script - Scraped Leads
 * Imports scraped leads from Supabase into GHL as contacts.
 * 
 * Run:
 *   npx tsx scripts/import-to-ghl.ts
 * 
 * Reports:
 *   - contacts created
 *   - skipped (duplicates)  
 *   - failed
 *   - remaining leads
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

async function ghlPost(path: string, body: Record<string, unknown>, retries = 3): Promise<unknown> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GHL_BASE}${path}`, {
      method: "POST",
      headers: ghlHeaders,
      body: JSON.stringify(body),
    })
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

async function checkExistingContact(phone: string, email: string | null): Promise<string | null> {
  // Try to find existing contact by phone or email
  try {
    const params: Record<string, string> = {
      locationId: GHL_LOCATION_ID,
      limit: "50",
    }
    const data = (await ghlGet("/contacts/", params)) as Record<string, unknown>
    const contacts = (data.contacts ?? []) as Record<string, unknown>[]
    
    for (const c of contacts) {
      if (phone && c.phone === phone) return c.id as string
      if (email && c.email === email) return c.id as string
    }
  } catch (err) {
    log(`  ⚠️ Error checking existing contact: ${err}`)
  }
  return null
}

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
  log("🚀 GHL Import - Scraped Leads started")

  // 1. Fetch pending leads (not imported to GHL - both conditions must be true)
  const { data: pendingLeads, error: fetchError } = await supabase
    .from("scraped_leads")
    .select("*")
    .is("ghl_contact_id", null)
    .eq("imported_to_ghl", false)
    .limit(100) // Process in batches of 100
    .order("scraped_at", { ascending: true })

  if (fetchError) {
    console.error("❌ Failed to fetch pending leads:", fetchError.message)
    process.exit(1)
  }

  if (!pendingLeads || pendingLeads.length === 0) {
    log("✅ No pending leads to import")
    await logSummary(0, 0, 0, 0)
    return
  }

  log(`📋 Found ${pendingLeads.length} pending leads to process`)

  const stats = {
    created: 0,
    skipped: 0,
    failed: 0,
    remaining: pendingLeads.length,
  }

  // 2. Process each lead
  for (const lead of pendingLeads) {
    try {
      // Check for existing contact in GHL
      const existingId = await checkExistingContact(lead.phone, lead.email)
      
      if (existingId) {
        // Already exists - mark as imported with existing ID
        await supabase
          .from("scraped_leads")
          .update({ 
            ghl_contact_id: existingId, 
            imported_to_ghl: true,
            import_note: "duplicate - existing contact found"
          })
          .eq("id", lead.id)
        
        stats.skipped++
        stats.remaining--
        log(`  ⏭️  Skipped (duplicate): ${lead.full_name || lead.phone}`)
        continue
      }

      // Create new contact in GHL
      const contactData: Record<string, unknown> = {
        locationId: GHL_LOCATION_ID,
        name: lead.full_name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || "Unknown",
        phone: lead.phone || "",
      }

      if (lead.email) contactData.email = lead.email
      if (lead.company_name) contactData.companyName = lead.company_name
      if (lead.job_title) contactData.jobTitle = lead.job_title

      // Add source as tag
      contactData.tags = [lead.source || "scraped"]

      // Skip custom fields - GHL API requires array format with field IDs
      // Address can be set via the address field
      if (lead.address) {
        contactData.address = lead.address
      }

      const result = (await ghlPost("/contacts/", contactData)) as Record<string, unknown>
      const contact = (result.contact ?? null) as { id?: string } | null
      const ghlContactId = contact?.id

      if (!ghlContactId) {
        throw new Error("No contact ID returned from GHL")
      }

      // Update local record
      await supabase
        .from("scraped_leads")
        .update({ 
          ghl_contact_id: ghlContactId, 
          imported_to_ghl: true,
          import_note: "successfully imported"
        })
        .eq("id", lead.id)

      stats.created++
      stats.remaining--
      log(`  ✅ Created: ${lead.full_name || lead.phone} (${ghlContactId})`)

      // Rate limit delay
      await new Promise(r => setTimeout(r, 500))

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      
      // Check if it's a duplicate contact error with existing ID
      const duplicateMatch = msg.match(/"contactId":"([^"]+)"/)
      if (duplicateMatch && msg.includes("does not allow duplicated contacts")) {
        // Already exists - update with existing ID
        const existingGhlId = duplicateMatch[1]
        await supabase
          .from("scraped_leads")
          .update({ 
            ghl_contact_id: existingGhlId, 
            imported_to_ghl: true,
            import_note: "duplicate - existing contact found in GHL"
          })
          .eq("id", lead.id)
        
        stats.skipped++
        stats.remaining--
        log(`  ⏭️  Skipped (duplicate): ${lead.full_name || lead.phone} (existing: ${existingGhlId})`)
      } else {
        // Mark as failed but don't block other imports
        await supabase
          .from("scraped_leads")
          .update({ 
            import_note: `import failed: ${msg}`
          })
          .eq("id", lead.id)

        stats.failed++
        stats.remaining--
        log(`  ❌ Failed: ${lead.full_name || lead.phone} - ${msg}`)
      }
    }
  }

  // 3. Log summary
  await logSummary(stats.created, stats.skipped, stats.failed, stats.remaining)
  
  log(`\n📊 Import Summary:`)
  log(`   ✅ Created: ${stats.created}`)
  log(`   ⏭️  Skipped (duplicates): ${stats.skipped}`)
  log(`   ❌ Failed: ${stats.failed}`)
  log(`   📋 Remaining: ${stats.remaining}`)

  // Exit with error if all failed
  if (stats.created === 0 && stats.failed > 0) {
    process.exit(1)
  }
}

async function logSummary(created: number, skipped: number, failed: number, remaining: number) {
  try {
    await supabase.from("data_quality_log").insert({
      source: "ghl_import",
      check_type: "import_leads",
      severity: "info",
      message: `Import complete: ${created} created, ${skipped} skipped, ${failed} failed, ${remaining} remaining`,
      affected_table: "scraped_leads",
      affected_count: created + skipped + failed,
    })
  } catch (err) {
    log(`⚠️ Failed to log summary: ${err}`)
  }
}

main().catch(async (err) => {
  console.error("💥 Fatal error:", err)
  try {
    await supabase.from("data_quality_log").insert({
      source: "ghl_import",
      check_type: "import_leads",
      severity: "warning",
      message: `Import fatal: ${err instanceof Error ? err.message : String(err)}`,
    })
  } catch { /* best effort */ }
  process.exit(1)
})
