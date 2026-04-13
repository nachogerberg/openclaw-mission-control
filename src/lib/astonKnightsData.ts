export const akMeta = {
  title: 'Aston Knights',
  subtitle: 'Premium fantasy IP strategy, product ladder, and mobile game architecture',
  updatedAt: '2026-04-13',
  liveUrlPath: '/aston-knights',
};

export const akSections = [
  {
    id: 'master-strategy',
    title: 'Master Strategy 2026–2027',
    bullets: [
      'Rebuild Aston Knights as a premium fantasy IP + identity brand + digital product ecosystem.',
      'Lead with Initiation, Elemental Alignment, Houses, Aston Shards, and Castle Aston — not DAO/token-first rhetoric.',
      'Use story, identity, clothing, digital products, and a mobile game as the main business stack.',
      'Keep blockchain optional and invisible to mainstream users; use it only for premium provenance and collector rails.',
      'Use AI everywhere it improves the product experience, not only behind the scenes.'
    ]
  },
  {
    id: 'business-model',
    title: 'Business Model',
    bullets: [
      'Immediate cash flow: premium clothing, digital products, founder memberships, limited drops.',
      'Canon engine: chapter-zero, comic/graphic narrative, motion-comic and animated proofs.',
      'Scale engine: mobile game first, then deeper game expansion after validation.',
      'Interactive front door: v0-built Initiation + Alignment experience with email capture and product routing.',
      'AI-powered personalization: oaths, house dossiers, codex summaries, mentor guidance, product recommendations.'
    ]
  },
  {
    id: 'clothing',
    title: 'Premium Clothing Brand',
    bullets: [
      'Build a real dark-fantasy premium streetwear label for fantasy, rock, alt, and gaming fans — not generic merch.',
      'Use Houses, sigils, shard marks, oaths, relic symbols, and subtle story language instead of lazy logo slaps.',
      'Launch with heavyweight tees, premium hoodies, hats, pins/patches, then hero pieces like varsity jackets and jewelry.',
      'Drop strategy: Initiates -> Houses -> Founders.',
      'Primary success metrics: sell-through, reorder rate, AOV, UGC rate, and conversion from Initiation to purchase.'
    ]
  },
  {
    id: 'ai-blockchain',
    title: 'AI + Blockchain Innovation Stack',
    bullets: [
      'AI in-product means AI chat, AI voice, AI mentors, AI codex recaps, and AI-personalized identity experiences.',
      'In-game AI should assist players through mentors, adaptive narrative flavor, run recaps, and lore-safe chat.',
      'Blockchain stays as optional infrastructure for founder credentials, premium provenance, and tradable collectibles.',
      'Mainstream players should never need wallets or crypto knowledge to play or shop.',
      'Innovation must feel premium and useful, not gimmicky or speculative.'
    ]
  },
  {
    id: 'game-pilot',
    title: 'Mobile Game Pilot in Days',
    bullets: [
      'Pilot goal: prove premium onboarding, compelling alignment, one repeatable dungeon/run loop, codex progression, and AI mentor utility.',
      'Recommended format: mobile-first action RPG-lite / dungeon-run vertical slice.',
      'Core loop: Castle Aston -> Initiation -> Alignment -> Short Run -> Reward -> Codex/Mentor -> Replay.',
      'Ship in days by scoping to one environment, one mentor, one run loop, and one reward/meta system.',
      'Use v0 for front-end initiation, founder flows, and codex companion UI while engine development focuses on gameplay.'
    ]
  }
];

export const akDocLinks = [
  {
    title: 'Master Strategy 2026–2027',
    path: '~/.hermes/atlas/workspace/aston-knights/00-aston-knights-master-strategy-2026-2027.md'
  },
  {
    title: 'Brand Positioning and Product Ladder',
    path: '~/.hermes/atlas/workspace/aston-knights/01-brand-positioning-and-product-ladder.md'
  },
  {
    title: 'Revenue Model: Merch + Digital + Story + Game',
    path: '~/.hermes/atlas/workspace/aston-knights/02-revenue-model-merch-digital-story-game.md'
  },
  {
    title: 'Mobile Game Pilot in Days Plan',
    path: '~/.hermes/atlas/workspace/aston-knights/03-mobile-game-pilot-in-days-plan.md'
  },
  {
    title: 'Comic and Animation Strategy',
    path: '~/.hermes/atlas/workspace/aston-knights/04-comic-and-animation-strategy.md'
  },
  {
    title: 'Next 30 Days Execution Plan',
    path: '~/.hermes/atlas/workspace/aston-knights/05-next-30-days-execution-plan.md'
  },
  {
    title: 'AI and Blockchain Innovation Stack',
    path: '~/.hermes/atlas/workspace/aston-knights/06-ai-and-blockchain-innovation-stack.md'
  },
  {
    title: 'Premium Clothing Brand Strategy',
    path: '~/.hermes/atlas/workspace/aston-knights/07-premium-clothing-brand-strategy.md'
  },
  {
    title: 'v0 Initiation Experience Spec',
    path: '~/.hermes/atlas/workspace/aston-knights/08-v0-initiation-experience-spec.md'
  },
  {
    title: 'Mobile Game Architecture Plan for Claude Code',
    path: '~/.hermes/atlas/workspace/aston-knights/09-aston-knights-game-architecture-plan-for-claude-code.md'
  },
  {
    title: 'v0 Initiation Master Prompt',
    path: '~/.hermes/atlas/workspace/aston-knights/10-v0-initiation-master-prompt.md'
  },
  {
    title: 'Claude Code Implementation Plan',
    path: '~/.hermes/atlas/workspace/aston-knights/11-claude-code-implementation-plan.md'
  }
];

export const akClaudeCodeArchitecture = {
  vision: 'A premium mobile-first fantasy action RPG-lite / dungeon-run game built around Initiation, Elemental Alignment, Aston Shards, codex progression, and AI-enhanced in-world guidance.',
  stack: [
    'Unity mobile client for gameplay',
    'v0 / Next.js for initiation, codex, founder, and commerce front-end experiences',
    'Supabase/Postgres or equivalent for progression, analytics, and profile state',
    'AI services for oaths, mentor dialogue, codex summaries, and run recaps',
    'Optional blockchain rail only for founder/provenance features, never for core gameplay'
  ],
  systems: [
    'Presentation layer: onboarding, alignment reveal, castle hub, run screen, results, codex, cosmetics/store',
    'Gameplay layer: combat controller, alignment modifiers, enemy wave system, reward system, run-state manager',
    'Narrative layer: initiation script manager, codex unlocks, AI mentor adapter, run recap generator',
    'Data layer: profile, progression, telemetry, cosmetics, founder flags'
  ],
  loop: [
    'Enter Castle Aston',
    'Complete Initiation',
    'Receive Alignment',
    'Play short dungeon run',
    'Earn shard fragment / codex unlock / cosmetic progress',
    'Return to AI mentor and codex',
    'Replay'
  ],
  aiFeatures: [
    'AI mentor chat in the castle hub and initiation flow',
    'AI-generated but lore-constrained initiation oath',
    'AI run recap and codex summaries',
    'Optional AI voice narration later'
  ],
  pilotRule: 'Ship the vertical slice before expanding scope.'
};
