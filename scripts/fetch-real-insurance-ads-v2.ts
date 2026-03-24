#!/usr/bin/env npx tsx

import Database from 'better-sqlite3';
import { chromium, type Page } from 'playwright';
import { scoreInsuranceAdIntel } from '../src/lib/insurance-ad-intel';

const db = new Database('mission-control.db');

type Lang = 'en' | 'es';

const keywordMatrix: Array<{ keyword: string; keyword_language: Lang; region: 'US'; countryParam: 'US' }> = [
  { keyword: 'life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'term life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'whole life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'permanent life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'universal life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'indexed universal life', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'iul insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'no exam life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'senior life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'burial insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'final expense insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'mortgage protection insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'fixed indexed annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'retirement income annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'medicare advantage', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'medicare supplement', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'Life Insurance with Living benefits', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida a término', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida entera', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida permanente', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de gastos finales', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro funeral', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'Seguros de vida con beneficios en vida', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de protección hipotecaria', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'anualidad', keyword_language: 'es', region: 'US', countryParam: 'US' },
];

function upsertAd(row: Record<string, unknown>) {
  const stmt = db.prepare(`
    INSERT INTO insurance_ad_intel (
      id, keyword, keyword_language, region, page_name, page_id, ad_snapshot_url, destination_url,
      media_url, media_type, ad_copy, headline, cta, platforms, first_seen_at, last_seen_at,
      is_active, countries, score, score_breakdown, tags, raw_payload, created_at, updated_at
    ) VALUES (
      @id, @keyword, @keyword_language, @region, @page_name, @page_id, @ad_snapshot_url, @destination_url,
      @media_url, @media_type, @ad_copy, @headline, @cta, @platforms, @first_seen_at, @last_seen_at,
      @is_active, @countries, @score, @score_breakdown, @tags, @raw_payload, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      page_name=excluded.page_name,
      ad_snapshot_url=excluded.ad_snapshot_url,
      destination_url=excluded.destination_url,
      media_url=excluded.media_url,
      media_type=excluded.media_type,
      ad_copy=excluded.ad_copy,
      headline=excluded.headline,
      cta=excluded.cta,
      score=excluded.score,
      score_breakdown=excluded.score_breakdown,
      tags=excluded.tags,
      raw_payload=excluded.raw_payload,
      updated_at=datetime('now')
  `);
  stmt.run(row);
}

async function collectAds(page: Page, item: { keyword: string; keyword_language: Lang; region: 'US'; countryParam: 'US' }) {
  const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${item.countryParam}&is_targeted_country=false&media_type=all&q=${encodeURIComponent(item.keyword)}&search_type=keyword_unordered&sort_data[mode]=relevancy_monthly_grouped&sort_data[direction]=desc`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  for (let i = 0; i < 10; i++) {
    await page.mouse.wheel(0, 2600);
    await page.waitForTimeout(1300);
  }

  const ads = await page.evaluate((input: { keyword: string; keyword_language: string; region: string }) => {
    const cards = Array.from(document.querySelectorAll('[role="button"], div'));
    const pageText = document.body.innerText;
    const lines = pageText.split('\n').map((line) => line.trim()).filter(Boolean);
    const results: any[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = line.match(/Library ID:\s*(\d{6,})/i);
      if (!idMatch) continue;

      const libraryId = idMatch[1];
      const nearby = lines.slice(Math.max(0, i - 3), Math.min(lines.length, i + 25));
      const joined = nearby.join(' ');

      const pageName = nearby.find((entry, idx) => idx > 0 && !/Library ID:|Started running|Platforms|Categories|Impressions|Open Dropdown|See ad details/i.test(entry) && entry.length < 80) || '';
      const adTextIndex = nearby.findIndex((entry) => /Sponsored/i.test(entry));
      const adCopy = adTextIndex >= 0 ? nearby.slice(adTextIndex, Math.min(nearby.length, adTextIndex + 8)).join(' ') : joined;

      results.push({
        libraryId,
        pageName,
        adCopy,
        adSnapshotUrl: `https://www.facebook.com/ads/library/?id=${libraryId}`,
        renderUrl: `https://www.facebook.com/ads/archive/render_ad/?id=${libraryId}`,
        keyword: input.keyword,
        keyword_language: input.keyword_language,
        region: input.region,
      });
    }

    return Array.from(new Map(results.map((item) => [item.libraryId, item])).values());
  }, item);

  return ads;
}

async function withBrowser<T>(fn: (page: Page) => Promise<T>) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 2200 },
    locale: 'en-US',
  });
  const page = await context.newPage();
  try {
    return await fn(page);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

async function main() {
  let inserted = 0;

  for (const item of keywordMatrix) {
    console.log(`Scraping ${item.keyword_language.toUpperCase()} / ${item.keyword}`);
    try {
      const ads = await withBrowser((page) => collectAds(page, item));
      for (const ad of ads.slice(0, 30)) {
        const score = scoreInsuranceAdIntel({
          keyword: item.keyword,
          ad_copy: ad.adCopy,
          headline: ad.pageName,
          destination_url: ad.renderUrl,
          media_type: 'image',
          platforms: ['facebook'],
          is_active: true,
        });

        upsertAd({
          id: `real-ad-${ad.libraryId}`,
          keyword: item.keyword,
          keyword_language: item.keyword_language,
          region: item.region,
          page_name: ad.pageName || 'Unknown advertiser',
          page_id: null,
          ad_snapshot_url: ad.adSnapshotUrl,
          destination_url: ad.renderUrl,
          media_url: ad.renderUrl,
          media_type: 'image',
          ad_copy: ad.adCopy,
          headline: ad.pageName || item.keyword,
          cta: null,
          platforms: JSON.stringify(['facebook']),
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          is_active: 1,
          countries: JSON.stringify(['US']),
          score: score.score,
          score_breakdown: JSON.stringify(score.breakdown),
          tags: JSON.stringify([...score.tags, 'render-captured']),
          raw_payload: JSON.stringify(ad),
        });
        inserted++;
      }
    } catch (error) {
      console.error(`Failed ${item.keyword}:`, error);
    }
  }

  console.log(`Inserted/updated ${inserted} ads with render URLs`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
