export type AdMediaType = 'image' | 'video' | 'carousel' | 'unknown';

export type InsuranceMarketRegion = 'US' | 'PR';

export interface InsuranceAdIntelRecord {
  id: string;
  keyword: string;
  keyword_language: 'en' | 'es';
  region: InsuranceMarketRegion;
  page_name: string;
  page_id?: string | null;
  ad_snapshot_url?: string | null;
  ad_library_url?: string | null;
  destination_url?: string | null;
  media_url?: string | null;
  media_type: AdMediaType;
  ad_copy?: string | null;
  headline?: string | null;
  cta?: string | null;
  platforms?: string[];
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  is_active: boolean;
  countries?: string[];
  score: number;
  score_breakdown: Record<string, number>;
  tags: string[];
  raw_payload?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceAdIntelFilters {
  keyword?: string;
  keywordLanguage?: 'en' | 'es' | 'all';
  region?: InsuranceMarketRegion | 'all';
  mediaType?: AdMediaType | 'all';
  isActive?: 'all' | 'active' | 'inactive';
  minScore?: number;
  sort?: 'score_desc' | 'recent_desc' | 'page_asc';
  limit?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function safeJsonParse<T>(value?: string | null, fallback: T = [] as T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function tokenize(text?: string | null): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function buildMetaAdLibraryUrl(input: {
  ad_snapshot_url?: string | null;
  keyword?: string | null;
  region?: string | null;
  page_id?: string | null;
  id?: string | null;
}) {
  const snapshot = input.ad_snapshot_url || '';
  const idMatch = snapshot.match(/[?&]id=(\d+)/i) || String(input.id || '').match(/(\d{6,})/);
  if (idMatch?.[1]) {
    return `https://www.facebook.com/ads/library/?id=${idMatch[1]}`;
  }

  const params = new URLSearchParams({
    active_status: 'all',
    ad_type: 'all',
    country: input.region === 'PR' ? 'US' : 'US',
    media_type: 'all',
    search_type: 'keyword_unordered',
    q: input.keyword || '',
  });

  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

export function scoreInsuranceAdIntel(input: {
  keyword: string;
  ad_copy?: string | null;
  headline?: string | null;
  destination_url?: string | null;
  media_type?: string | null;
  platforms?: string[];
  is_active?: boolean;
}): { score: number; breakdown: Record<string, number>; tags: string[] } {
  const copy = `${input.headline || ''} ${input.ad_copy || ''}`.trim();
  const tokens = tokenize(copy);
  const keywordTokens = tokenize(input.keyword);
  const destination = (input.destination_url || '').toLowerCase();

  const breakdown: Record<string, number> = {
    keyword_match: 0,
    insurance_intent: 0,
    creative_format: 0,
    destination_quality: 0,
    activity_bonus: 0,
  };

  const tags = new Set<string>();

  const keywordHits = keywordTokens.filter((token) => tokens.includes(token)).length;
  breakdown.keyword_match = clamp(keywordHits * 12, 0, 30);
  if (keywordHits > 0) tags.add('keyword-aligned');

  const insuranceLexicon = [
    'life', 'insurance', 'annuity', 'retirement', 'coverage', 'benefit', 'policy',
    'term', 'whole', 'final', 'expense', 'mortgage', 'income', 'burial', 'senior'
  ];
  const insuranceHits = insuranceLexicon.filter((token) => tokens.includes(token)).length;
  breakdown.insurance_intent = clamp(insuranceHits * 4, 0, 25);
  if (insuranceHits >= 3) tags.add('insurance-relevant');

  const mediaType = (input.media_type || 'unknown').toLowerCase();
  if (mediaType === 'video') {
    breakdown.creative_format = 18;
    tags.add('video');
  } else if (mediaType === 'image') {
    breakdown.creative_format = 12;
    tags.add('image');
  } else if (mediaType === 'carousel') {
    breakdown.creative_format = 15;
    tags.add('carousel');
  } else {
    breakdown.creative_format = 6;
  }

  if (destination) {
    breakdown.destination_quality += 10;
    try {
      const hostname = new URL(destination).hostname.replace(/^www\./, '');
      if (!hostname.includes('facebook.com') && !hostname.includes('instagram.com')) {
        breakdown.destination_quality += 10;
        tags.add('external-destination');
      }
      if (hostname.includes('quote') || hostname.includes('policy') || hostname.includes('insurance')) {
        breakdown.destination_quality += 5;
      }
    } catch {
      // ignore parse errors
    }
  }

  if (input.platforms?.length) {
    if (input.platforms.length >= 2) {
      breakdown.destination_quality += 5;
      tags.add('cross-platform');
    }
  }

  if (input.is_active) {
    breakdown.activity_bonus = 10;
    tags.add('active');
  }

  const score = clamp(Object.values(breakdown).reduce((sum, value) => sum + value, 0), 0, 100);
  return { score, breakdown, tags: Array.from(tags) };
}
