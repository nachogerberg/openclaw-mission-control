#!/usr/bin/env npx tsx
/**
 * Meta Ads Analysis Script
 * Analyzes extracted Meta Ads data, identifies trends and patterns,
 * and triggers alerts for competitive intelligence.
 *
 * Run:
 *   npx tsx scripts/meta-analysis.ts
 *
 * This script runs after meta-daily-insights.ts and analyzes the extracted data.
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
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL ?? ""

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("❌ Missing Supabase creds"); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function log(msg: string) { console.log(`[${new Date().toISOString()}] ${msg}`) }

// ── Analysis Functions ──────────────────────────────────────────────────────

interface AdInsight {
  ad_id: string | null
  ad_title: string | null
  ad_body: string | null
  search_query: string
  impressions: number
  clicks: number
  spend: number
  cpc: number
  ctr: number
  extracted_at: string
}

interface Alert {
  type: string
  severity: "info" | "warning" | "critical"
  message: string
  details: Record<string, unknown>
}

// Analyze top performing ads by query
function analyzeTopPerformers(ads: AdInsight[], topN = 10): AdInsight[] {
  // Sort by impressions * ctr to find high-performing ads
  return [...ads]
    .filter(ad => ad.impressions > 0)
    .sort((a, b) => (b.impressions * b.ctr) - (a.impressions * a.ctr))
    .slice(0, topN)
}

// Identify emerging trends (ads with high recent impressions)
function identifyTrends(ads: AdInsight[]): Alert[] {
  const alerts: Alert[] = []
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Group by query
  const queryGroups: Record<string, AdInsight[]> = {}
  for (const ad of ads) {
    if (!queryGroups[ad.search_query]) queryGroups[ad.search_query] = []
    queryGroups[ad.search_query].push(ad)
  }

  for (const [query, queryAds] of Object.entries(queryGroups)) {
    const totalImpressions = queryAds.reduce((sum, ad) => sum + ad.impressions, 0)
    const totalClicks = queryAds.reduce((sum, ad) => sum + ad.clicks, 0)
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

    // High volume alert
    if (totalImpressions > 100000) {
      alerts.push({
        type: "high_volume",
        severity: "info",
        message: `High impression volume for "${query}": ${totalImpressions.toLocaleString()} impressions`,
        details: { query, impressions: totalImpressions, avg_ctr: avgCTR.toFixed(2) }
      })
    }

    // High CTR alert (potential winning creative)
    if (avgCTR > 2.0) {
      alerts.push({
        type: "high_ctr",
        severity: "info",
        message: `High CTR for "${query}": ${avgCTR.toFixed(2)}% (above industry average)`,
        details: { query, avg_ctr: avgCTR.toFixed(2), ad_count: queryAds.length }
      })
    }
  }

  return alerts
}

// Analyze competitive positioning
function analyzeCompetitivePosition(ads: AdInsight[]): Alert[] {
  const alerts: Alert[] = []
  
  // Group by ad account
  const accountGroups: Record<string, AdInsight[]> = {}
  for (const ad of ads) {
    const accountId = ad.ad_id?.split("_")[0] ?? "unknown"
    if (!accountGroups[accountId]) accountGroups[accountId] = []
    accountGroups[accountId].push(ad)
  }

  for (const [accountId, accountAds] of Object.entries(accountGroups)) {
    const totalSpend = accountAds.reduce((sum, ad) => sum + ad.spend, 0)
    const totalImpressions = accountAds.reduce((sum, ad) => sum + ad.impressions, 0)
    
    if (totalSpend > 1000) {
      alerts.push({
        type: "high_spend",
        severity: "warning",
        message: `High ad spend detected for account ${accountId}: $${totalSpend.toFixed(2)}`,
        details: { account_id: accountId, spend: totalSpend, impressions: totalImpressions }
      })
    }
  }

  return alerts
}

// Detect anomalies
function detectAnomalies(ads: AdInsight[]): Alert[] {
  const alerts: Alert[] = []
  
  // Calculate average metrics
  const avgCTR = ads.reduce((sum, ad) => sum + ad.ctr, 0) / ads.length
  const avgCPC = ads.reduce((sum, ad) => sum + ad.cpc, 0) / ads.length

  // Flag ads with unusually high CPC (potential targeting issues)
  const highCPCAds = ads.filter(ad => ad.cpc > avgCPC * 2 && ad.cpc > 5)
  if (highCPCAds.length > 0) {
    alerts.push({
      type: "high_cpc",
      severity: "warning",
      message: `${highCPCAds.length} ads with unusually high CPC detected`,
      details: { ad_count: highCPCAds.length, avg_cpc: avgCPC.toFixed(2) }
    })
  }

  // Flag ads with 0 clicks but high impressions (creative issues)
  const zeroClickAds = ads.filter(ad => ad.impressions > 1000 && ad.clicks === 0)
  if (zeroClickAds.length > 0) {
    alerts.push({
      type: "zero_clicks",
      severity: "critical",
      message: `${zeroClickAds.length} ads with 1000+ impressions but 0 clicks - creative may be ineffective`,
      details: { ad_count: zeroClickAds.length }
    })
  }

  return alerts
}

// ── Discord Notification ───────────────────────────────────────────────────
async function sendDiscordNotification(alerts: Alert[]) {
  if (!DISCORD_WEBHOOK_URL) {
    log("⚠️ No Discord webhook URL configured, skipping notification")
    return
  }

  const embed = {
    title: "📊 Meta Ads Analysis Report",
    description: `Analyzed ${alerts.length} alerts`,
    color: alerts.some(a => a.severity === "critical") ? 16711680 : 65280,
    fields: alerts.map(alert => ({
      name: `${alert.severity === "critical" ? "🔴" : alert.severity === "warning" ? "🟡" : "🟢"} ${alert.type}`,
      value: alert.message.substring(0, 1024),
    })),
    timestamp: new Date().toISOString(),
  }

  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    })
    if (!res.ok) {
      log(`⚠️ Discord webhook failed: ${res.status}`)
    } else {
      log("✅ Discord notification sent")
    }
  } catch (err) {
    log(`⚠️ Discord notification error: ${err}`)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  log("🔄 Meta Ads Analysis started")

  // 1. Get BAMC account
  const { data: account, error: accErr } = await supabase
    .from("accounts")
    .select("id, display_name, meta")
    .eq("account_key", "bamc")
    .single()

  if (accErr || !account) {
    console.error("❌ Could not find BAMC account:", accErr?.message)
    process.exit(1)
  }

  const account_id = account.id
  log(`📍 Account: BAMC (${account_id})`)

  // 2. Fetch recent ads (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const { data: ads, error: adsErr } = await supabase
    .from("meta_ads_insights")
    .select("*")
    .eq("account_id", account_id)
    .gte("extracted_at", sevenDaysAgo)
    .order("extracted_at", { ascending: false })

  if (adsErr) {
    console.error("❌ Error fetching ads:", adsErr.message)
    process.exit(1)
  }

  log(`📊 Loaded ${ads?.length ?? 0} ads for analysis`)

  if (!ads || ads.length === 0) {
    log("⚠️ No ads to analyze")
    await supabase.from("data_quality_log").insert({
      account_id,
      source: "meta_ads",
      check_type: "analysis",
      severity: "warning",
      message: "No ads found for analysis - extraction may have failed",
    })
    process.exit(0)
  }

  const adInsights = ads as unknown as AdInsight[]
  const allAlerts: Alert[] = []

  // 3. Run analyses
  log("📈 Running trend analysis...")
  allAlerts.push(...identifyTrends(adInsights))

  log("🎯 Running competitive analysis...")
  allAlerts.push(...analyzeCompetitivePosition(adInsights))

  log("🔍 Running anomaly detection...")
  allAlerts.push(...detectAnomalies(adInsights))

  // 4. Get top performers
  const topPerformers = analyzeTopPerformers(adInsights, 10)
  log(`🏆 Top performer: ${topPerformers[0]?.ad_title ?? "N/A"}`)

  // 5. Store analysis results
  const analysisResult = {
    account_id,
    analysis_date: new Date().toISOString(),
    ads_analyzed: adInsights.length,
    alerts_triggered: allAlerts.length,
    critical_alerts: allAlerts.filter(a => a.severity === "critical").length,
    warning_alerts: allAlerts.filter(a => a.severity === "warning").length,
    top_performers: topPerformers.map(ad => ({
      ad_id: ad.ad_id,
      ad_title: ad.ad_title,
      search_query: ad.search_query,
      impressions: ad.impressions,
      ctr: ad.ctr,
    })),
    alerts: allAlerts,
  }

  const { error: insertErr } = await supabase
    .from("meta_ads_analysis")
    .insert(analysisResult)

  if (insertErr) {
    log(`⚠️ Failed to store analysis: ${insertErr.message}`)
  }

  // 6. Log alerts to data_quality_log
  for (const alert of allAlerts) {
    await supabase.from("data_quality_log").insert({
      account_id,
      source: "meta_ads",
      check_type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
    })
  }

  // 7. Send notifications
  await sendDiscordNotification(allAlerts)

  // 8. Output summary
  log(`🎉 Analysis complete: ${allAlerts.length} alerts (${analysisResult.critical_alerts} critical, ${analysisResult.warning_alerts} warning)`)
  console.log(`::set-output name=alerts_triggered::${allAlerts.length}`)
  console.log(`::set-output name=critical_alerts::${analysisResult.critical_alerts}`)
  console.log(`::set-output name=warning_alerts::${analysisResult.warning_alerts}`)
  console.log(`::set-output name=ads_analyzed::${adInsights.length}`)
}

main().catch(async (err) => {
  console.error("💥 Fatal error:", err)
  try {
    await supabase.from("data_quality_log").insert({
      source: "meta_ads",
      check_type: "analysis",
      severity: "error",
      message: `Fatal analysis error: ${err instanceof Error ? err.message : String(err)}`,
    })
  } catch { /* best effort */ }
  process.exit(1)
})