#!/usr/bin/env npx tsx

import Database from 'better-sqlite3';
import { chromium } from 'playwright';
import { scoreInsuranceAdIntel } from '../src/lib/insurance-ad-intel';

const db = new Database('mission-control.db');

type Lang = 'en' | 'es';

const keywordMatrix: Array<{ keyword: string; keyword_language: Lang; region: 'US'; countryParam: 'US' }> = [
  // English - life insurance
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
  { keyword: 'mortgage protection life insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  // English - retirement / annuity
  { keyword: 'annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'fixed indexed annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'retirement income annuity', keyword_language: 'en', region: 'US', countryParam: 'US' },
  // English - health adjacent insurance
  { keyword: 'medicare advantage', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'medicare supplement', keyword_language: 'en', region: 'US', countryParam: 'US' },
  { keyword: 'dental insurance', keyword_language: 'en', region: 'US', countryParam: 'US' },
  // Spanish - US Hispanic market
  { keyword: 'seguro de vida', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida a término', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida entera', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida permanente', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de vida sin examen médico', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de gastos finales', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro funeral', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro de protección hipotecaria', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'anualidad', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'anualidad fija indexada', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'medicare en español', keyword_language: 'es', region: 'US', countryParam: 'US' },
  { keyword: 'seguro dental', keyword_language: 'es', region: 'US', countryParam: 'US' },
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
      keyword=excluded.keyword,
      keyword_language=excluded.keyword_language,
      region=excluded.region,
      page_name=excluded.page_name,
      page_id=excluded.page_id,
      ad_snapshot_url=excluded.ad_snapshot_url,
      destination_url=excluded.destination_url,
      media_url=excluded.media_url,
      media_type=excluded.media_type,
      ad_copy=excluded.ad_copy,
      headline=excluded.headline,
      cta=excluded.cta,
      platforms=excluded.platforms,
      first_seen_at=excluded.first_seen_at,
      last_seen_at=excluded.last_seen_at,
      is_active=excluded.is_active,
      countries=excluded.countries,
      score=excluded.score,
      score_breakdown=excluded.score_breakdown,
      tags=excluded.tags,
      raw_payload=excluded.raw_payload,
      updated_at=datetime('now')
  `);
  stmt.run(row);
}

async function scrapeQuery(page: any, item: { keyword: string; keyword_language: Lang; region: 'US'; countryParam: 'US' }) {
  const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${item.countryParam}&is_targeted_country=false&media_type=all&q=${encodeURIComponent(item.keyword)}&search_type=keyword_unordered&sort_data[mode]=relevancy_monthly_grouped&sort_data[direction]=desc`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  for (let i = 0; i < 12; i++) {
    await page.mouse.wheel(0, 2800);
    await page.waitForTimeout(1200);
  }

  const result = await page.evaluate((input: { keyword: string; keyword_language: string; region: string }) => {
    const { keyword, keyword_language, region } = input;
    const text = document.body.innerText;
    const links = Array.from(document.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).href).filter(Boolean);
    const images = Array.from(document.querySelectorAll('img')).map((img) => (img as HTMLImageElement).src).filter(Boolean);
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);

    const candidates: any[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/Sponsored/i.test(lines[i]) || /Library ID/i.test(lines[i])) {
        const pageName = lines[i - 1] || lines[i + 1] || 'Unknown advertiser';
        const block = lines.slice(i, i + 28).join(' ');
        candidates.push({ pageName, block, index: i });
      }
    }

    return {
      keyword,
      keyword_language,
      region,
      url: location.href,
      links: links.slice(0, 1000),
      images: images.slice(0, 500),
      candidates: candidates.slice(0, 80),
    };
  }, item);

  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 2200 },
    locale: 'en-US',
  });
  const page = await context.newPage();

  let inserted = 0;

  for (const item of keywordMatrix) {
    console.log(`Scraping ${item.region} / ${item.keyword_language} / ${item.keyword}`);
    const scraped = await scrapeQuery(page, item);

    let candidateCount = 0;
    for (const candidate of scraped.candidates) {
      const score = scoreInsuranceAdIntel({
        keyword: item.keyword,
        ad_copy: candidate.block,
        headline: candidate.pageName,
        destination_url: scraped.links.find((link: string) => !link.includes('facebook.com')) || null,
        media_type: scraped.images.length ? 'image' : 'unknown',
        platforms: ['facebook'],
        is_active: true,
      });

      const id = `real-${item.region}-${item.keyword_language}-${item.keyword}-${candidate.index}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .slice(0, 180);

      upsertAd({
        id,
        keyword: item.keyword,
        keyword_language: item.keyword_language,
        region: item.region,
        page_name: candidate.pageName,
        page_id: null,
        ad_snapshot_url: scraped.url,
        destination_url: scraped.links.find((link: string) => !link.includes('facebook.com')) || null,
        media_url: scraped.images[candidateCount] || scraped.images[0] || null,
        media_type: scraped.images.length ? 'image' : 'unknown',
        ad_copy: candidate.block,
        headline: candidate.pageName,
        cta: null,
        platforms: JSON.stringify(['facebook']),
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_active: 1,
        countries: JSON.stringify(['US']),
        score: score.score,
        score_breakdown: JSON.stringify(score.breakdown),
        tags: JSON.stringify(score.tags),
        raw_payload: JSON.stringify(scraped),
      });
      inserted++;
      candidateCount++;
      if (candidateCount >= 20) break;
    }
  }

  await browser.close();
  console.log(`Inserted/updated ${inserted} records`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
