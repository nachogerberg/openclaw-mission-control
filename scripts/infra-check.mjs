#!/usr/bin/env node
/**
 * infra-check.mjs
 * Weekly infrastructure health check script.
 * Run by OpenClaw cron every Saturday at 9AM EST.
 *
 * What it does:
 * 1. Reads infrastructure.json
 * 2. Counts nodes by status
 * 3. Flags if data is stale (>7 days without update)
 * 4. Logs summary + emits OpenClaw notification
 * 5. Exits 0 if healthy, 1 if issues found
 */

import { readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, "../src/data/infrastructure.json")

export async function checkInfra() {
  const results = {
    healthy: true,
    issues: [],
    stats: { live: 0, setup: 0, planned: 0, total: 0 },
    lastUpdated: null,
    version: null,
    staleDays: 0,
  }

  if (!existsSync(DATA_PATH)) {
    results.healthy = false
    results.issues.push("infrastructure.json not found at " + DATA_PATH)
    return results
  }

  let data
  try {
    data = JSON.parse(readFileSync(DATA_PATH, "utf-8"))
  } catch (e) {
    results.healthy = false
    results.issues.push("Failed to parse infrastructure.json: " + e.message)
    return results
  }

  results.lastUpdated = data.lastUpdated
  results.version = data.version

  const allNodes = (data.layers || []).flatMap((l) => l.nodes || [])
  results.stats.total = allNodes.length
  results.stats.live = allNodes.filter((n) => n.status === "live").length
  results.stats.setup = allNodes.filter((n) => n.status === "setup").length
  results.stats.planned = allNodes.filter((n) => n.status === "planned").length

  if (data.lastUpdated) {
    const daysSince = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    results.staleDays = Math.floor(daysSince)
    if (daysSince > 7) {
      results.issues.push(`Infrastructure data is ${Math.floor(daysSince)} days old, consider reviewing for changes.`)
    }
  }

  if (!data.layers || data.layers.length === 0) {
    results.healthy = false
    results.issues.push("No layers found in infrastructure.json")
  }

  if (!data.security || data.security.length === 0) {
    results.issues.push("Security section is empty, consider reviewing.")
  }

  const liveNodes = allNodes.filter((n) => n.status === "live")
  console.log(`\n[infra-check] Live nodes (${liveNodes.length}):`)
  liveNodes.forEach((n) => console.log(`  ✅ ${n.label}`))

  const setupNodes = allNodes.filter((n) => n.status === "setup")
  if (setupNodes.length > 0) {
    console.log(`\n[infra-check] In-setup nodes (${setupNodes.length}):`)
    setupNodes.forEach((n) => console.log(`  🔧 ${n.label}`))
  }

  return results
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1].split("/").pop())

if (isMain || process.argv[1]?.includes("infra-check")) {
  ;(async () => {
    console.log("\n════════════════════════════════════════")
    console.log("  BAMC INFRASTRUCTURE CHECK")
    console.log("  " + new Date().toISOString())
    console.log("════════════════════════════════════════\n")

    try {
      const results = await checkInfra()

      console.log(`\n[infra-check] Summary:`)
      console.log(`  Status:   ${results.healthy ? "✅ HEALTHY" : "❌ ISSUES FOUND"}`)
      console.log(`  Version:  v${results.version}`)
      console.log(`  Updated:  ${results.lastUpdated} (${results.staleDays}d ago)`)
      console.log(`  Nodes:    ${results.stats.total} total, ${results.stats.live} live, ${results.stats.setup} setup, ${results.stats.planned} planned`)

      if (results.issues.length > 0) {
        console.log(`\n[infra-check] Issues:`)
        results.issues.forEach((i) => console.log(`  ⚠️  ${i}`))
      }

      const statusText = results.healthy
        ? `Infra check OK: ${results.stats.live} live, ${results.stats.setup} setup, ${results.stats.planned} planned. v${results.version}`
        : `Infra check: ${results.issues.length} issue(s) found. ${results.stats.live} live, ${results.stats.planned} planned.`

      console.log(`\n[infra-check] Sending OpenClaw notification...`)

      try {
        const { execSync } = await import("child_process")
        execSync(`openclaw system event --text \"${statusText}\" --mode now`, { stdio: "inherit" })
      } catch (e) {
        console.error("[infra-check] Failed to emit OpenClaw event:", e.message)
      }

      console.log("\n════════════════════════════════════════\n")
      process.exit(results.healthy ? 0 : 1)
    } catch (e) {
      console.error("[infra-check] Fatal error:", e)
      process.exit(1)
    }
  })()
}
