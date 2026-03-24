'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ExternalLink, Filter, Globe2, Languages, PlayCircle, Search, X } from 'lucide-react';

type KeywordRow = { keyword: string; keyword_language: string; region: string; count: number };

type AdItem = {
  id: string;
  keyword: string;
  keyword_language: 'en' | 'es';
  region: 'US' | 'PR';
  page_name: string;
  ad_snapshot_url?: string | null;
  ad_library_url?: string | null;
  destination_url?: string | null;
  media_url?: string | null;
  media_type: 'image' | 'video' | 'carousel' | 'unknown';
  ad_copy?: string | null;
  headline?: string | null;
  cta?: string | null;
  platforms?: string[];
  is_active: boolean;
  score: number;
  score_breakdown: Record<string, number>;
  tags: string[];
  updated_at: string;
};

type ApiResponse = {
  items: AdItem[];
  keywords: KeywordRow[];
  summary: { total: number; active: number; avgScore: number };
};

export function InsuranceAdIntelDashboard() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [region, setRegion] = useState('all');
  const [keywordLanguage, setKeywordLanguage] = useState('all');
  const [mediaType, setMediaType] = useState('all');
  const [isActive, setIsActive] = useState('all');
  const [minScore, setMinScore] = useState(0);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (region !== 'all') params.set('region', region);
    if (keywordLanguage !== 'all') params.set('keywordLanguage', keywordLanguage);
    if (mediaType !== 'all') params.set('mediaType', mediaType);
    if (isActive !== 'all') params.set('isActive', isActive);
    if (minScore > 0) params.set('minScore', String(minScore));
    params.set('limit', '120');

    setLoading(true);
    fetch(`/api/insurance-ad-intel?${params.toString()}`)
      .then((res) => res.json())
      .then(setData)
      .catch((error) => console.error('Failed to load insurance ad intel', error))
      .finally(() => setLoading(false));
  }, [keyword, region, keywordLanguage, mediaType, isActive, minScore]);

  const topKeywords = useMemo(() => data?.keywords.slice(0, 20) || [], [data]);
  const regionBreakdown = useMemo(() => {
    const items = data?.items || [];
    return {
      US: items.filter((item) => item.region === 'US').length,
      PR: items.filter((item) => item.region === 'PR').length,
    };
  }, [data]);

  const toggleExpanded = (id: string) => {
    setExpandedCards((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <>
      <div className="min-h-screen bg-mc-bg text-mc-text">
        <div className="border-b border-mc-border bg-[radial-gradient(circle_at_top_left,rgba(88,166,255,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(57,211,83,0.12),transparent_30%),linear-gradient(180deg,#111827_0%,#0d1117_100%)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-mc-accent mb-2">Insurance Ad Intel</div>
                <h1 className="text-3xl sm:text-4xl font-bold">Meta ads intelligence dashboard</h1>
                <p className="text-mc-text-secondary mt-2 max-w-3xl">
                  Click any creative to open an in-dashboard ad viewer instead of only seeing extracted text.
                </p>
              </div>
              <div className="grid grid-cols-5 gap-3 min-w-[320px]">
                <StatCard label="Ads" value={data?.summary.total ?? 0} />
                <StatCard label="Active" value={data?.summary.active ?? 0} />
                <StatCard label="Avg score" value={data?.summary.avgScore ?? 0} />
                <StatCard label="US" value={regionBreakdown.US} />
                <StatCard label="PR" value={regionBreakdown.PR} />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
          <div className="bg-mc-bg-secondary border border-mc-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 text-sm text-mc-text-secondary mb-4">
              <Filter className="w-4 h-4" /> Filters
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <label className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3 flex items-center gap-3 xl:col-span-2">
                <Search className="w-4 h-4 text-mc-text-secondary" />
                <select className="bg-transparent w-full outline-none" value={keyword} onChange={(e) => setKeyword(e.target.value)}>
                  <option value="">All keywords</option>
                  {topKeywords.map((row) => (
                    <option key={`${row.keyword}-${row.keyword_language}-${row.region}`} value={row.keyword}>
                      {row.keyword} · {row.keyword_language.toUpperCase()} · {row.region}
                    </option>
                  ))}
                </select>
              </label>
              <label className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3 flex items-center gap-3">
                <Globe2 className="w-4 h-4 text-mc-text-secondary" />
                <select className="bg-transparent w-full outline-none" value={region} onChange={(e) => setRegion(e.target.value)}>
                  <option value="all">All regions</option>
                  <option value="US">US</option>
                  <option value="PR">Puerto Rico</option>
                </select>
              </label>
              <label className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3 flex items-center gap-3">
                <Languages className="w-4 h-4 text-mc-text-secondary" />
                <select className="bg-transparent w-full outline-none" value={keywordLanguage} onChange={(e) => setKeywordLanguage(e.target.value)}>
                  <option value="all">All languages</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                </select>
              </label>
              <select className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3" value={mediaType} onChange={(e) => setMediaType(e.target.value)}>
                <option value="all">All media</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
              </select>
              <select className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="mt-3 max-w-md">
              <label className="bg-mc-bg rounded-xl border border-mc-border px-4 py-3 flex items-center gap-3">
                <BarChart3 className="w-4 h-4 text-mc-text-secondary" />
                <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-full" />
                <span className="text-sm text-mc-text-secondary min-w-8 text-right">{minScore}</span>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-mc-text-secondary">Loading ad intel...</div>
          ) : (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 items-start">
              {data?.items.map((ad) => (
                <AdCard
                  key={ad.id}
                  ad={ad}
                  expanded={Boolean(expandedCards[ad.id])}
                  onToggle={() => toggleExpanded(ad.id)}
                  onOpenPreview={() => setSelectedAd(ad)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAd && <AdPreviewModal ad={selectedAd} onClose={() => setSelectedAd(null)} />}
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-mc-border bg-mc-bg-secondary/80 p-4">
      <div className="text-xs uppercase tracking-widest text-mc-text-secondary">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function AdCard({ ad, expanded, onToggle, onOpenPreview }: { ad: AdItem; expanded: boolean; onToggle: () => void; onOpenPreview: () => void }) {
  const previewUrl = ad.media_url || ad.ad_snapshot_url || null;
  const directAdUrl = ad.ad_library_url || ad.ad_snapshot_url || undefined;
  const displayCopy = ad.ad_copy || 'No copy extracted yet.';
  const truncatedCopy = !expanded && displayCopy.length > 220 ? `${displayCopy.slice(0, 220)}…` : displayCopy;

  return (
    <div className="overflow-hidden rounded-3xl border border-mc-border bg-mc-bg-secondary shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="grid lg:grid-cols-[260px_1fr]">
        <button type="button" onClick={onOpenPreview} className="relative min-h-[240px] bg-mc-bg-tertiary text-left group">
          {previewUrl ? (
            ad.media_type === 'video' ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white">
                <PlayCircle className="w-16 h-16 opacity-90 group-hover:scale-105 transition-transform" />
              </div>
            ) : (
              <img src={previewUrl} alt={ad.headline || ad.page_name || ad.keyword} className="absolute inset-0 h-full w-full object-cover" />
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-mc-text-secondary text-sm px-6 text-center">Click to open ad viewer</div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 text-white">
            <div className="text-xs uppercase tracking-widest opacity-80">Preview</div>
            <div className="text-sm font-medium">Click to open full ad viewer</div>
          </div>
          <div className="absolute top-3 left-3 right-3 flex gap-2 flex-wrap">
            <Badge>{ad.keyword}</Badge>
            <Badge tone={ad.region === 'PR' ? 'purple' : 'blue'}>{ad.region === 'PR' ? 'Puerto Rico' : 'US'}</Badge>
            <Badge tone={ad.is_active ? 'green' : 'red'}>{ad.is_active ? 'Active' : 'Inactive'}</Badge>
            <Badge tone="default">{ad.keyword_language.toUpperCase()}</Badge>
          </div>
        </button>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-sm text-mc-text-secondary truncate">{ad.page_name || 'Unknown advertiser'}</div>
              <h3 className="text-lg font-semibold mt-1 leading-snug line-clamp-2">{ad.headline || ad.page_name || ad.keyword}</h3>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs uppercase tracking-widest text-mc-text-secondary">Score</div>
              <div className="text-3xl font-bold text-mc-accent">{Math.round(ad.score)}</div>
            </div>
          </div>

          <p className="text-sm leading-6 text-mc-text-secondary">{truncatedCopy}</p>
          {displayCopy.length > 220 && (
            <button type="button" onClick={onToggle} className="text-sm text-mc-accent hover:underline">
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-sm">
            <InfoRow compact label="CTA" value={ad.cta || '—'} />
            <InfoRow compact label="Platforms" value={(ad.platforms || []).join(', ') || '—'} />
            <InfoRow compact label="Updated" value={new Date(ad.updated_at).toLocaleDateString()} />
            <InfoRow compact label="Tags" value={ad.tags.slice(0, 3).join(', ') || '—'} />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={onOpenPreview} className="inline-flex items-center gap-2 rounded-xl border border-mc-border bg-mc-bg px-4 py-2 text-sm hover:border-mc-accent/50">
              View ad in dashboard
            </button>
            {directAdUrl && (
              <a href={directAdUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-mc-border bg-mc-bg px-4 py-2 text-sm hover:border-mc-accent/50">
                Open actual ad <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {ad.destination_url && (
              <a href={ad.destination_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-mc-accent px-4 py-2 text-sm text-mc-bg font-medium hover:opacity-90">
                Open destination <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdPreviewModal({ ad, onClose }: { ad: AdItem; onClose: () => void }) {
  const previewUrl = ad.media_url || null;
  const directAdUrl = ad.ad_library_url || ad.ad_snapshot_url || undefined;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 md:p-8 overflow-y-auto" onClick={onClose}>
      <div className="max-w-6xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-3xl border border-mc-border bg-mc-bg-secondary shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between border-b border-mc-border px-5 py-4">
            <div>
              <div className="text-sm text-mc-text-secondary">{ad.page_name || 'Unknown advertiser'}</div>
              <h2 className="text-xl font-semibold">{ad.headline || ad.page_name || ad.keyword}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-mc-border p-2 hover:border-mc-accent/50">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid xl:grid-cols-[1.2fr_0.8fr] gap-0">
            <div className="bg-black min-h-[420px] flex items-center justify-center">
              {previewUrl ? (
                ad.media_type === 'video' ? (
                  <video src={previewUrl} controls autoPlay className="w-full h-full max-h-[720px] object-contain" preload="metadata" />
                ) : (
                  <img src={previewUrl} alt={ad.headline || ad.page_name || ad.keyword} className="w-full h-full max-h-[720px] object-contain" />
                )
              ) : directAdUrl ? (
                <iframe src={directAdUrl} className="w-full min-h-[720px] bg-white" title={ad.page_name || ad.keyword} />
              ) : (
                <div className="text-center text-mc-text-secondary px-8">
                  No embeddable media was captured for this ad yet.
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge>{ad.keyword}</Badge>
                <Badge tone={ad.region === 'PR' ? 'purple' : 'blue'}>{ad.region === 'PR' ? 'Puerto Rico' : 'US'}</Badge>
                <Badge tone={ad.is_active ? 'green' : 'red'}>{ad.is_active ? 'Active' : 'Inactive'}</Badge>
                <Badge tone="default">{ad.keyword_language.toUpperCase()}</Badge>
              </div>

              <div className="rounded-2xl border border-mc-border bg-mc-bg p-4">
                <div className="text-xs uppercase tracking-widest text-mc-text-secondary mb-2">Ad copy</div>
                <div className="text-sm leading-6 text-mc-text-secondary whitespace-pre-wrap">{ad.ad_copy || 'No copy extracted yet.'}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="CTA" value={ad.cta || '—'} />
                <InfoRow label="Platforms" value={(ad.platforms || []).join(', ') || '—'} />
                <InfoRow label="Updated" value={new Date(ad.updated_at).toLocaleString()} />
                <InfoRow label="Tags" value={ad.tags.join(', ') || '—'} />
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-mc-text-secondary mb-2">Score breakdown</div>
                <div className="space-y-2">
                  {Object.entries(ad.score_breakdown || {}).map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-mc-text-secondary mb-1">
                        <span>{label.replace(/_/g, ' ')}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-mc-bg overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-mc-accent to-mc-accent-cyan" style={{ width: `${Math.min(Number(value) * 3.5, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {directAdUrl && (
                  <a href={directAdUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-mc-border bg-mc-bg px-4 py-2 text-sm hover:border-mc-accent/50">
                    Open actual ad <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                {ad.destination_url && (
                  <a href={ad.destination_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-mc-accent px-4 py-2 text-sm text-mc-bg font-medium hover:opacity-90">
                    Open destination <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl bg-mc-bg border border-mc-border ${compact ? 'px-3 py-2' : 'px-3 py-3'}`}>
      <div className="text-[10px] uppercase tracking-widest text-mc-text-secondary mb-1">{label}</div>
      <div className="text-sm break-words line-clamp-2">{value}</div>
    </div>
  );
}

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'green' | 'red' | 'blue' | 'purple' }) {
  const toneClass =
    tone === 'green'
      ? 'bg-mc-accent-green/90 text-black'
      : tone === 'red'
      ? 'bg-mc-accent-red/90 text-white'
      : tone === 'blue'
      ? 'bg-mc-accent/90 text-mc-bg'
      : tone === 'purple'
      ? 'bg-mc-accent-purple/90 text-white'
      : 'bg-black/65 text-white';
  return <span className={`rounded-full px-3 py-1 text-xs font-medium backdrop-blur ${toneClass}`}>{children}</span>;
}
