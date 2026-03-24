import { NextRequest, NextResponse } from 'next/server';
import { queryAll } from '@/lib/db';
import { safeJsonParse, type InsuranceAdIntelRecord, buildMetaAdLibraryUrl } from '@/lib/insurance-ad-intel';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const keyword = params.get('keyword')?.trim();
    const mediaType = params.get('mediaType') || 'all';
    const keywordLanguage = params.get('keywordLanguage') || 'all';
    const region = params.get('region') || 'all';
    const isActive = params.get('isActive') || 'all';
    const minScore = Number(params.get('minScore') || '0');
    const limit = Math.min(Number(params.get('limit') || '100'), 500);
    const sort = params.get('sort') || 'score_desc';

    const where: string[] = ['1=1'];
    const values: unknown[] = [];

    if (keyword) {
      where.push('keyword = ?');
      values.push(keyword);
    }
    if (mediaType !== 'all') {
      where.push('media_type = ?');
      values.push(mediaType);
    }
    if (keywordLanguage !== 'all') {
      where.push('keyword_language = ?');
      values.push(keywordLanguage);
    }
    if (region !== 'all') {
      where.push('region = ?');
      values.push(region);
    }
    if (isActive === 'active') {
      where.push('is_active = 1');
    } else if (isActive === 'inactive') {
      where.push('is_active = 0');
    }
    if (!Number.isNaN(minScore) && minScore > 0) {
      where.push('score >= ?');
      values.push(minScore);
    }

    let orderBy = 'score DESC, updated_at DESC';
    if (sort === 'recent_desc') orderBy = 'updated_at DESC, score DESC';
    if (sort === 'page_asc') orderBy = 'page_name ASC, score DESC';

    values.push(limit);

    const rows = await queryAll<any>(
      `SELECT * FROM insurance_ad_intel WHERE ${where.join(' AND ')} ORDER BY CASE WHEN id LIKE 'real-%' THEN 0 ELSE 1 END, ${orderBy} LIMIT ?`,
      values
    );

    const items: InsuranceAdIntelRecord[] = rows.map((row) => ({
      ...row,
      keyword_language: row.keyword_language || 'en',
      region: row.region || 'US',
      is_active: Boolean(row.is_active),
      platforms: safeJsonParse<string[]>(row.platforms, []),
      countries: safeJsonParse<string[]>(row.countries, []),
      score_breakdown: safeJsonParse<Record<string, number>>(row.score_breakdown, {}),
      tags: safeJsonParse<string[]>(row.tags, []),
      ad_library_url: buildMetaAdLibraryUrl(row),
    }));

    const keywords = await queryAll<{ keyword: string; keyword_language: string; region: string; count: number }>(
      `SELECT keyword, keyword_language, region, COUNT(*) as count FROM insurance_ad_intel GROUP BY keyword, keyword_language, region ORDER BY count DESC, keyword ASC`
    );

    return NextResponse.json({
      items,
      keywords,
      summary: {
        total: items.length,
        active: items.filter((item) => item.is_active).length,
        avgScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch insurance ad intel:', error);
    return NextResponse.json({ error: 'Failed to fetch insurance ad intel' }, { status: 500 });
  }
}
