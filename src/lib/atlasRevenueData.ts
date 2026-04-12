export type AgentTier = "Tier 1 Direct Revenue" | "Tier 2 Revenue Enablement" | "Tier 3 Support" | "Restricted Research";

export type AgentSnapshot = {
  key: string;
  name: string;
  tier: AgentTier;
  purpose: string;
  lane: string;
  kpis: string[];
  taskCounts: {
    open: number;
    inProgress: number;
    blocked: number;
    done: number;
  };
  statusNote: string;
  revenueActivities: string[];
  directivePath: string;
};

export const atlasAuditTimestamp = '2026-04-12 05:47:25 EDT';

export const fleetFlags = [
  'Revenue charters are now live for all 7 agents.',
  'Governance gap fixed: TASK_INBOX created for Julian, Marcus, Ryker, and canonical Sophie workspace.',
  'Sophie still has a canonical-vs-secondary workspace split that needs unification.',
  'Marcus remains research-only under Atlas guardrails: no live trading APIs, no edits under bamc-trading/execution/.',
  'Repeated blocker patterns remain in Drake and Sophie session histories and should be treated as reliability work.'
];

export const agents: AgentSnapshot[] = [
  {
    key: 'soren',
    name: 'Soren',
    tier: 'Tier 2 Revenue Enablement',
    purpose: 'Portfolio allocator and unblocker for BAMC revenue systems.',
    lane: 'Turn ambiguous priorities into ranked, delegated, revenue-critical work.',
    kpis: ['Revenue-critical tasks ranked', 'Blockers cleared or parked', 'Specialist directives issued', 'Founder-dependency reductions shipped'],
    taskCounts: { open: 1, inProgress: 4, blocked: 0, done: 15 },
    statusNote: 'Active across Scout, Aurora, and Reclutas docs; best used as allocator, not specialist.',
    revenueActivities: ['Maintain one ranked revenue board', 'Route work to Drake/Sophie/Vanta', 'Kill low-leverage tasks', 'Escalate exact blockers once'],
    directivePath: '~/.openclaw/workspace/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'drake',
    name: 'Drake Montero',
    tier: 'Tier 1 Direct Revenue',
    purpose: 'Lead monetization owner.',
    lane: 'Improve follow-up speed, contact rates, pipeline hygiene, and close-rate feedback loops.',
    kpis: ['Lead response time', 'Contact rate', 'Appointment-set rate', 'Show rate', 'Close rate', 'Pipeline leakage by stage'],
    taskCounts: { open: 2, inProgress: 5, blocked: 1, done: 45 },
    statusNote: 'Already clustered around CRM, GHL, pipeline health, and sales-context delivery.',
    revenueActivities: ['Rescue stale leads', 'Reduce untouched-opportunity leakage', 'Harden sales-call intelligence loop', 'Prove CRM post reliability'],
    directivePath: '~/.openclaw/workspace-agents/drake-montero/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'julian',
    name: 'Julian Mercer',
    tier: 'Tier 3 Support',
    purpose: 'Compliance and claim-risk research counsel for BAMC offers and funnels.',
    lane: 'Prevent revenue-killing compliance mistakes before launch.',
    kpis: ['Reviews completed', 'Risky claims flagged before launch', 'Cited memos delivered', 'TASK_INBOX hygiene maintained'],
    taskCounts: { open: 3, inProgress: 0, blocked: 0, done: 0 },
    statusNote: 'Repurposed from criminal-defense identity into BAMC-side risk review; governance now in place.',
    revenueActivities: ['Ad copy review', 'Funnel disclaimer checklist', 'Consent-gap review', 'Offer-language risk scans'],
    directivePath: '~/.openclaw/workspace-agents/julian-mercer/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'marcus',
    name: 'Marcus Reid',
    tier: 'Restricted Research',
    purpose: 'Trading research and risk architecture only.',
    lane: 'Design and validate a research-first multi-asset trading system before any live deployment.',
    kpis: ['Strategy memos completed', 'Paper-trade frameworks defined', 'Risk controls documented', 'Market-regime reviews produced'],
    taskCounts: { open: 3, inProgress: 0, blocked: 0, done: 0 },
    statusNote: 'Research-only under Atlas guardrails. No live trading, no execution-code edits.',
    revenueActivities: ['Strategy-map design', 'Validation-framework design', 'Risk architecture memo', 'Market-regime matrix'],
    directivePath: '~/.openclaw/workspace-agents/marcus/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'ryker',
    name: 'Ryker Stone',
    tier: 'Tier 3 Support',
    purpose: 'Founder performance systems operator.',
    lane: 'Increase output quality and consistency while reducing burnout and decision drag.',
    kpis: ['Deep-work protections defined', 'Low-friction protocols created', 'Adherence review delivered if data exists', 'Unnecessary admin avoided'],
    taskCounts: { open: 3, inProgress: 0, blocked: 0, done: 0 },
    statusNote: 'Repurposed from personal coaching into founder-throughput support; governance now in place.',
    revenueActivities: ['Protect high-value work windows', 'Define recovery vs push-day protocols', 'Reduce decision fatigue', 'Keep performance system low-friction'],
    directivePath: '~/.openclaw/workspace-agents/ryker-stone/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'sophie',
    name: 'Sophie Voss',
    tier: 'Tier 1 Direct Revenue',
    purpose: 'Revenue truth layer and data-intelligence owner.',
    lane: 'Turn clean data into acquisition insight while surfacing broken automations early.',
    kpis: ['Sync success rate', 'Data freshness lag', 'Missing field rate', 'Attribution confidence', 'Acquisition insight memos delivered'],
    taskCounts: { open: 4, inProgress: 10, blocked: 2, done: 17 },
    statusNote: 'Active inbox is concentrated in Paperclip wake loops, ClickUp/GHL sync, and insurance ad intel. Workspace split still unresolved.',
    revenueActivities: ['Fix sync reliability', 'Turn ad intel into operator actions', 'Build data-quality board', 'Isolate recurring Paperclip blockers'],
    directivePath: '~/.openclaw/workspace-agents/sophie-voss/directives/2026-04-12-atlas-revenue-charter.md'
  },
  {
    key: 'vanta',
    name: 'Vanta',
    tier: 'Tier 1 Direct Revenue',
    purpose: 'Growth, offer, and launch engine.',
    lane: 'Generate ranked offers, creative tests, and launch systems that can produce new cashflow.',
    kpis: ['Qualified offers ranked', 'Launch briefs produced', 'Creative tests shipped', 'Demand hypotheses generated', 'Cross-business growth calendar maintained'],
    taskCounts: { open: 10, inProgress: 3, blocked: 0, done: 1 },
    statusNote: 'Already focused on BAMC digital products incubator, SOPs, execution channel, and idea generation.',
    revenueActivities: ['Rank new offers', 'Build launch briefs', 'Turn intel into growth hypotheses', 'Push fast-to-cash tests'],
    directivePath: '~/.openclaw/workspace-vanta/directives/2026-04-12-atlas-revenue-charter.md'
  }
];

export const directivePreviews: Record<string, string[]> = {
  soren: [
    'Increase founder leverage and shorten time-to-revenue.',
    'Keep a live portfolio board of revenue-critical work only.',
    'Break revenue goals into specialist assignments for Drake, Sophie, and Vanta.'
  ],
  drake: [
    'Own lead monetization.',
    'Build a weekly money-left-on-the-table report.',
    'Convert sales-call observations into concrete follow-up and objection-handling changes.'
  ],
  julian: [
    'Reduce compliance drag and revenue-killing risk.',
    'Build an ad/compliance review checklist.',
    'Review offer and funnel language for missing disclaimers or consent gaps.'
  ],
  marcus: [
    'Operate as research and risk intelligence only.',
    'Define strategy families and regime filters by asset class.',
    'Produce a validation checklist before any safe live deployment is considered.'
  ],
  ryker: [
    'Protect founder output as a revenue multiplier.',
    'Create low-friction deep-work rules.',
    'Build high-output vs recovery protocols without adding admin.'
  ],
  sophie: [
    'Own the truth layer for revenue.',
    'Fix ClickUp and sync reliability.',
    'Turn insurance ad intel into weekly acquisition insight.'
  ],
  vanta: [
    'Create and validate demand.',
    'Produce weekly ranked offer boards.',
    'Pair each shortlisted offer with buyer, hook, and test plan.'
  ]
};
