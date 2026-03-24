import { NextResponse } from 'next/server';
import { run } from '@/lib/db';
import { scoreInsuranceAdIntel } from '@/lib/insurance-ad-intel';

export const dynamic = 'force-dynamic';

const sampleAds = [
  {
    id: 'sample-us-life-en-1',
    keyword: 'life insurance',
    keyword_language: 'en',
    region: 'US',
    page_name: 'Secure Future Benefits',
    page_id: 'pg_1001',
    ad_snapshot_url: 'https://www.facebook.com/ads/library/?id=sample-us-life-en-1',
    destination_url: 'https://securefuturebenefits.com/life-insurance-quote',
    media_url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    ad_copy: 'Protect your family with affordable term life insurance. Compare rates in minutes and get covered fast.',
    headline: 'Affordable Term Life Coverage',
    cta: 'Learn More',
    platforms: ['facebook', 'instagram'],
    is_active: true,
    countries: ['US'],
  },
  {
    id: 'sample-us-annuity-en-1',
    keyword: 'annuity',
    keyword_language: 'en',
    region: 'US',
    page_name: 'RetireWell Advisors',
    page_id: 'pg_1002',
    ad_snapshot_url: 'https://www.facebook.com/ads/library/?id=sample-us-annuity-en-1',
    destination_url: 'https://retirewelladvisors.com/fixed-indexed-annuity',
    media_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80',
    media_type: 'video',
    ad_copy: 'See how a fixed indexed annuity can help generate retirement income without market panic.',
    headline: 'Retirement Income Without Guesswork',
    cta: 'Watch More',
    platforms: ['facebook'],
    is_active: true,
    countries: ['US'],
  },
  {
    id: 'sample-pr-life-es-1',
    keyword: 'seguro de vida',
    keyword_language: 'es',
    region: 'PR',
    page_name: 'Protección Boricua',
    page_id: 'pg_2001',
    ad_snapshot_url: 'https://www.facebook.com/ads/library/?id=sample-pr-life-es-1',
    destination_url: 'https://proteccionboricua.com/seguro-de-vida',
    media_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
    media_type: 'image',
    ad_copy: 'Protege a tu familia con opciones de seguro de vida accesibles en Puerto Rico. Cotiza hoy mismo.',
    headline: 'Seguro de vida para tu familia',
    cta: 'Cotizar',
    platforms: ['facebook', 'instagram'],
    is_active: true,
    countries: ['PR'],
  },
  {
    id: 'sample-pr-final-es-1',
    keyword: 'seguro de gastos finales',
    keyword_language: 'es',
    region: 'PR',
    page_name: 'Plan Senior PR',
    page_id: 'pg_2002',
    ad_snapshot_url: 'https://www.facebook.com/ads/library/?id=sample-pr-final-es-1',
    destination_url: 'https://planseniorpr.com/gastos-finales',
    media_url: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1200&q=80',
    media_type: 'video',
    ad_copy: 'Cobertura para gastos finales y tranquilidad para tu familia. Opciones simples para adultos mayores.',
    headline: 'Protección de gastos finales',
    cta: 'Ver más',
    platforms: ['facebook', 'messenger'],
    is_active: false,
    countries: ['PR'],
  },
];

export async function POST() {
  try {
    for (const ad of sampleAds) {
      const scored = scoreInsuranceAdIntel(ad);
      run(
        `INSERT OR REPLACE INTO insurance_ad_intel (
          id, keyword, keyword_language, region, page_name, page_id, ad_snapshot_url, destination_url, media_url, media_type,
          ad_copy, headline, cta, platforms, first_seen_at, last_seen_at, is_active, countries,
          score, score_breakdown, tags, raw_payload, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-7 day'), datetime('now'), ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          ad.id,
          ad.keyword,
          ad.keyword_language,
          ad.region,
          ad.page_name,
          ad.page_id,
          ad.ad_snapshot_url,
          ad.destination_url,
          ad.media_url,
          ad.media_type,
          ad.ad_copy,
          ad.headline,
          ad.cta,
          JSON.stringify(ad.platforms),
          ad.is_active ? 1 : 0,
          JSON.stringify(ad.countries),
          scored.score,
          JSON.stringify(scored.breakdown),
          JSON.stringify(scored.tags),
          JSON.stringify(ad),
        ]
      );
    }

    return NextResponse.json({ ok: true, inserted: sampleAds.length });
  } catch (error) {
    console.error('Failed to seed insurance ad intel:', error);
    return NextResponse.json({ error: 'Failed to seed insurance ad intel' }, { status: 500 });
  }
}
