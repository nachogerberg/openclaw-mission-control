#!/usr/bin/env npx tsx

import Database from 'better-sqlite3';

const db = new Database('mission-control.db');

type Row = {
  id: string;
  keyword: string;
  keyword_language: string;
  region: string;
  page_name: string | null;
  ad_copy: string | null;
  destination_url: string | null;
  media_url: string | null;
  score: number;
};

const noisyPageNames = new Set(['', 'Active', 'Inactive', 'Unknown advertiser']);
const blockedTerms = [
  'metastatus.com',
  'ads-transparency',
  'disabled for not following',
  'library id:',
  'open dropdown',
  'see ad details',
  'this ad has multiple versions',
  'categories',
  'platforms',
  'policybazaar', // off-market geography noise for this use-case
];

const positiveTerms = [
  'insurance', 'life', 'term', 'whole', 'permanent', 'iul', 'indexed universal',
  'annuity', 'retirement', 'medicare', 'final expense', 'burial', 'mortgage protection',
  'seguro', 'anualidad', 'gastos finales', 'funeral', 'protección hipotecaria', 'dental'
];

function cleanText(value: string | null | undefined) {
  return String(value || '')
    .replace(/Library ID:[\s\S]*?Sponsored/i, 'Sponsored')
    .replace(/Open Dropdown/gi, '')
    .replace(/See ad details/gi, '')
    .replace(/This ad has multiple versions/gi, '')
    .replace(/Platforms/gi, '')
    .replace(/Categories/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function norm(value: string | null | undefined) {
  return cleanText(value).toLowerCase();
}

function hasPositiveSignal(text: string) {
  return positiveTerms.some((term) => text.includes(term));
}

function hasBlockedSignal(text: string) {
  return blockedTerms.some((term) => text.includes(term));
}

const rows = db.prepare(`select id, keyword, keyword_language, region, page_name, ad_copy, destination_url, media_url, score from insurance_ad_intel where id like 'real-%'`).all() as Row[];

const deleteStmt = db.prepare(`delete from insurance_ad_intel where id = ?`);
const updateStmt = db.prepare(`update insurance_ad_intel set page_name = ?, ad_copy = ?, updated_at = datetime('now') where id = ?`);

let removedNoise = 0;
let updated = 0;

for (const row of rows) {
  const cleanCopy = cleanText(row.ad_copy);
  const cleanPage = cleanText(row.page_name);
  const combined = `${cleanPage} ${cleanCopy} ${row.keyword}`.toLowerCase();

  if (!hasPositiveSignal(combined) || hasBlockedSignal(combined)) {
    deleteStmt.run(row.id);
    removedNoise++;
    continue;
  }

  const finalPage = noisyPageNames.has(cleanPage) ? '' : cleanPage;
  updateStmt.run(finalPage, cleanCopy, row.id);
  updated++;
}

// Dedupe by normalized advertiser + normalized copy, keeping highest score
const remaining = db.prepare(`select id, page_name, ad_copy, score from insurance_ad_intel where id like 'real-%' order by score desc, updated_at desc`).all() as Array<{id:string,page_name:string|null,ad_copy:string|null,score:number}>;
const seen = new Set<string>();
let deduped = 0;

for (const row of remaining) {
  const key = `${norm(row.page_name)}|${norm(row.ad_copy).slice(0,260)}`;
  if (!key.replace('|','').trim()) continue;
  if (seen.has(key)) {
    deleteStmt.run(row.id);
    deduped++;
    continue;
  }
  seen.add(key);
}

const summary = db.prepare(`select region, keyword_language, count(*) c from insurance_ad_intel where id like 'real-%' group by region, keyword_language order by region, keyword_language`).all();
console.log(JSON.stringify({ removedNoise, updated, deduped, summary }, null, 2));
