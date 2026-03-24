#!/usr/bin/env npx tsx

import Database from 'better-sqlite3';

const db = new Database('mission-control.db');

const insuranceSignals = [
  'life insurance',
  'term life',
  'whole life',
  'permanent life',
  'final expense',
  'mortgage protection',
  'annuity',
  'seguro de vida',
  'gastos finales',
  'protección hipotecaria',
  'anualidad',
];

const blockedSignals = [
  'immigration',
  'law, pllc',
  'pocket fm',
  'vampire',
  'metastatus.com',
  'ads-transparency',
  'contestando preguntas',
  'disabled for not following',
];

function includesAny(haystack: string, needles: string[]) {
  const text = haystack.toLowerCase();
  return needles.some((needle) => text.includes(needle));
}

function extractBestDestination(rawPayload: string | null): string | null {
  if (!rawPayload) return null;
  try {
    const parsed = JSON.parse(rawPayload);
    const links: string[] = parsed.links || [];
    const preferred = links.find((link) => {
      const lower = link.toLowerCase();
      return !lower.includes('facebook.com') && !lower.includes('metastatus.com') && !lower.includes('ads/about') && !lower.includes('instagram.com');
    });
    return preferred || null;
  } catch {
    return null;
  }
}

const rows = db.prepare(`select * from insurance_ad_intel where id like 'real-%'`).all() as any[];
let kept = 0;
let removed = 0;

const updateStmt = db.prepare(`update insurance_ad_intel set destination_url = ?, page_name = ?, ad_copy = ?, updated_at = datetime('now') where id = ?`);
const deleteStmt = db.prepare(`delete from insurance_ad_intel where id = ?`);

for (const row of rows) {
  const text = `${row.page_name || ''} ${row.ad_copy || ''}`.replace(/\s+/g, ' ').trim();
  const isRelevant = includesAny(text, insuranceSignals);
  const isBlocked = includesAny(text, blockedSignals);

  if (!isRelevant || isBlocked) {
    deleteStmt.run(row.id);
    removed++;
    continue;
  }

  const cleanPageName = String(row.page_name || '')
    .replace(/^Active$/i, '')
    .replace(/^Inactive$/i, '')
    .trim() || 'Unknown advertiser';

  const cleanCopy = String(row.ad_copy || '')
    .replace(/Library ID:[\s\S]*?Sponsored/i, 'Sponsored')
    .replace(/Open Dropdown/gi, '')
    .replace(/See ad details/gi, '')
    .replace(/Platforms/gi, '')
    .replace(/Categories/gi, '')
    .replace(/This ad has multiple versions/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  const destinationUrl = extractBestDestination(row.raw_payload) || row.destination_url || row.ad_snapshot_url;
  updateStmt.run(destinationUrl, cleanPageName, cleanCopy, row.id);
  kept++;
}

console.log(JSON.stringify({ kept, removed }, null, 2));
