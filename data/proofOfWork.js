// Single source of truth for the /proof-of-work page.
// Edit slides/metrics here — components render whatever this exports.
// approximate: true marks slides whose "before" baseline is an estimate,
// not a resume-backed figure.

export const companies = [
  {
    id: 'gokwik',
    name: 'GoKwik',
    role: 'Software Development Engineer · Core Payments',
    period: 'Aug 2024 – Present',
    icon: 'fas fa-credit-card',
    slides: [
      {
        id: 'gokwik-correctness',
        title: 'Settlement data correctness',
        metric: '99.99%',
        metricLabel: 'data correctness across all payouts',
        narrative:
          'Owned the settlements (payout) engine end-to-end. An idempotent, retry-safe ingestion pipeline with fault isolation took payout data correctness from a leaky ~80% to 99.99% — across 6M+ transactions.',
        approximate: true,
        chart: {
          type: 'area',
          unit: '%',
          data: [
            { label: 'W1', value: 80 },
            { label: 'W2', value: 84 },
            { label: 'W3', value: 90 },
            { label: 'W4', value: 95 },
            { label: 'W5', value: 98.5 },
            { label: 'W6', value: 99.99 },
          ],
        },
        stats: [
          { value: '6M+', label: 'transactions' },
          { value: '0', label: 'silent data drops' },
        ],
      },
      {
        id: 'gokwik-dev-effort',
        title: 'Dev effort per microservice',
        metric: '−70%',
        metricLabel: 'dev effort via internal agentic tooling',
        narrative:
          'Hardened 17 Node.js payment microservices with circuit-breaker and graceful-shutdown patterns. Internal agentic tooling cut the effort per service from ~10 days to ~3 days — with higher consistency, not less.',
        approximate: true,
        chart: {
          type: 'bars',
          unit: ' days',
          delta: '−70%',
          data: [
            { label: 'Manual rollout', value: 10 },
            { label: 'Agentic tooling', value: 3 },
          ],
        },
        stats: [
          { value: '17', label: 'services hardened' },
          { value: '0', label: 'cascading failures' },
        ],
      },
      {
        id: 'gokwik-bfcm',
        title: 'BFCM sale at scale',
        metric: '6M+',
        metricLabel: 'transactions at zero downtime',
        narrative:
          'Lead on-call for the BFCM sale: scaled payment microservices through a 3,000 QPS peak and 6M+ transactions across 10,000+ merchants — 3× the 2M baseline, at zero downtime.',
        chart: {
          type: 'growth',
          unit: 'M',
          data: [
            { label: 'Baseline', value: 2 },
            { label: 'Sale ramp', value: 3.5 },
            { label: 'BFCM peak', value: 6 },
          ],
        },
        stats: [
          { value: '3,000', label: 'QPS peak' },
          { value: '10,000+', label: 'merchants' },
          { value: '0', label: 'downtime' },
        ],
      },
      {
        id: 'gokwik-coverage',
        title: 'Test coverage & ops automation',
        metric: '20% → 100%',
        metricLabel: 'test coverage via test-gen agents',
        narrative:
          'Spearheaded team-wide agentic coding: test-gen agents lifted the owned microservice from 20% to 100% coverage in weeks. The async bulk-upload platform also erased 2,000 manual updates/month for BizOps.',
        chart: {
          type: 'progress',
          unit: '%',
          data: [
            { label: 'Before', value: 20 },
            { label: 'After', value: 100 },
          ],
        },
        stats: [
          { value: '2,000/mo', label: 'manual updates eliminated' },
          { value: '40+ hrs', label: 'BizOps saved weekly' },
          { value: '30d → <5d', label: 'receivables collection' },
        ],
      },
    ],
  },
  {
    id: 'coindcx',
    name: 'CoinDCX',
    role: 'Software Development Engineer · User Auth & Engagement',
    period: 'Jun 2022 – Dec 2023',
    icon: 'fas fa-shield-alt',
    slides: [
      {
        id: 'coindcx-kyc',
        title: 'KYC verification automation',
        metric: '250K+',
        metricLabel: 'international users auto-verified',
        narrative:
          'Integrated Onfido APIs into KYC workflows with async webhooks — turning a manual, hours-long verification queue into an automated flow for 250K+ international users.',
        approximate: true,
        chart: {
          type: 'bars',
          unit: ' hrs',
          delta: '−95%',
          data: [
            { label: 'Manual review', value: 24 },
            { label: 'Automated', value: 1 },
          ],
        },
        stats: [
          { value: '250K+', label: 'users onboarded' },
          { value: 'async', label: 'webhook-driven' },
        ],
      },
      {
        id: 'coindcx-comms',
        title: 'Email/SMS delivery at scale',
        metric: '800K+',
        metricLabel: 'users reached reliably',
        narrative:
          'Implemented Sidekiq async workers for Email/SMS to 800K+ users with retry mechanisms — pushing delivery reliability from best-effort to consistently near-perfect within weeks.',
        approximate: true,
        chart: {
          type: 'area',
          unit: '%',
          data: [
            { label: 'W1', value: 88 },
            { label: 'W2', value: 92 },
            { label: 'W3', value: 96 },
            { label: 'W4', value: 99 },
            { label: 'W5', value: 99.9 },
          ],
        },
        stats: [
          { value: '800K+', label: 'users' },
          { value: 'retries', label: 'built-in' },
        ],
      },
      {
        id: 'coindcx-migrations',
        title: 'Data migrations with integrity',
        metric: '100M+',
        metricLabel: 'records migrated, zero integrity loss',
        narrative:
          'Built Ruby/Python migration scripts for 100M+ records with rollback-safe bulk updates — full data integrity maintained across every batch.',
        chart: {
          type: 'progress',
          unit: '%',
          data: [
            { label: 'Records migrated', value: 100 },
          ],
        },
        stats: [
          { value: '100M+', label: 'records' },
          { value: 'rollback-safe', label: 'bulk updates' },
          { value: '1M+', label: 'records in AdminJS dashboard' },
        ],
      },
      {
        id: 'coindcx-tdd',
        title: 'Release stability via TDD',
        metric: '98%+',
        metricLabel: 'test coverage maintained',
        narrative:
          'Maintained 98%+ test coverage via TDD across auth and engagement services — steadily reducing regression-related production issues week over week.',
        approximate: true,
        chart: {
          type: 'area',
          unit: '%',
          data: [
            { label: 'W1', value: 85 },
            { label: 'W2', value: 90 },
            { label: 'W3', value: 94 },
            { label: 'W4', value: 96 },
            { label: 'W5', value: 98 },
          ],
        },
        stats: [
          { value: 'TDD', label: 'by default' },
          { value: 'fewer', label: 'regressions shipped' },
        ],
      },
    ],
  },
]

export const projects = [
  {
    id: 'log-zilla',
    name: 'Log Zilla',
    tagline: 'Self-hosted real-time log observability',
    proofPoints: [
      'Live Fluent Bit → SQLite → Socket.io → React pipeline with a custom query DSL (wildcard, negation, key-value).',
      'Auto-detects multiple service streams; fully containerized and agent-scaffolded end-to-end.',
    ],
    screenshots: [
      {
        src: 'https://raw.githubusercontent.com/arukurmi/Log-zilla/main/screenshots/dashboard-dark.png',
        alt: 'Log Zilla dashboard (dark theme)',
      },
      {
        src: 'https://raw.githubusercontent.com/arukurmi/Log-zilla/main/screenshots/dashboard-light.png',
        alt: 'Log Zilla dashboard (light theme)',
      },
      {
        src: 'https://raw.githubusercontent.com/arukurmi/Log-zilla/main/screenshots/log-details.png',
        alt: 'Log Zilla log details view',
      },
    ],
    links: {
      github: 'https://github.com/arukurmi/Log-zilla',
    },
  },
  {
    id: 'smart-triage-hub',
    name: 'Smart Triage Hub',
    tagline: 'AI issue-triage for open-source contributors',
    proofPoints: [
      'Live LLM difficulty-scoring of GitHub issues across 5 language ecosystems.',
      'Nightly cron ingests and scores issues via Gemini; merge webhooks award XP via atomic Supabase writes.',
    ],
    screenshots: [
      {
        src: '/proof/smart-triage-hub.png',
        alt: 'Smart Triage Hub sign-in',
      },
    ],
    links: {
      live: 'https://smart-triage-hub.vercel.app/',
      github: 'https://github.com/arukurmi/SmartTriageHub',
    },
  },
  {
    id: 'creator-nexus',
    name: 'Creator Nexus',
    tagline: 'AI influencer-marketing platform',
    proofPoints: [
      'Budget-capped greedy-knapsack engine allocates a brand’s spend into an optimal creator mix.',
      'Gemini-powered strategist turns a free-text brief into schema-validated creator picks; built via subagent-driven TDD (180+ tests).',
    ],
    screenshots: [
      {
        src: '/proof/creator-nexus.png',
        alt: 'Creator Nexus landing page',
      },
    ],
    links: {
      live: 'https://creator-nexus-virid.vercel.app/',
      github: 'https://github.com/arukurmi/CreatorNexus',
    },
  },
  {
    id: 'rate-the-date',
    name: 'Rate the Date',
    tagline: 'Couples-communication app',
    proofPoints: [
      'Turns partner ratings across the 5 love languages into a personalized, AI-written letter delivered by email.',
      'Gemini generates tone-conditioned letters from structured ratings; secured with JWT and field-level encryption.',
    ],
    screenshots: [
      {
        src: '/proof/rate-the-date.png',
        alt: 'Rate the Date landing page',
      },
    ],
    links: {
      live: 'https://superlative-hummingbird-bdc4f0.netlify.app/',
      github: 'https://github.com/arukurmi/ratethedate',
    },
  },
]
