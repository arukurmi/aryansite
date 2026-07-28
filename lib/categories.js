// Single source of truth for blog categories.
//
// The post's category is derived from its folder name (see lib/blog.js).
// This config controls how each category is labelled, ordered, described and
// coloured across the site (blog index sidebar, cards, and post pages) so the
// UI never has to auto-title-case a slug or hard-code a colour.
//
// NOTE: Tailwind scans source for complete class strings, so every colour class
// below is written out in full — never build these dynamically.

export const CATEGORIES = [
  {
    slug: 'interview-experiences',
    label: 'Interview Experiences',
    blurb: 'Real rounds, real questions, the answers that worked.',
    icon: 'fa-solid fa-comments',
    // Card pill + sidebar accents
    pill: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    dot: 'bg-cyan-400',
    accentText: 'text-cyan-300',
    activeBg: 'bg-cyan-500/10',
    activeBorder: 'border-cyan-400',
  },
  {
    slug: 'system-design',
    label: 'System Design',
    blurb: 'How large systems are actually built — HLD, LLD and scale.',
    icon: 'fa-solid fa-sitemap',
    pill: 'bg-violet-500/15 text-violet-300 border border-violet-500/30',
    dot: 'bg-violet-400',
    accentText: 'text-violet-300',
    activeBg: 'bg-violet-500/10',
    activeBorder: 'border-violet-400',
  },
  {
    slug: 'language-internals',
    label: 'Language Internals',
    blurb: 'One layer down into Java and the JVM.',
    icon: 'fa-solid fa-microchip',
    pill: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    dot: 'bg-amber-400',
    accentText: 'text-amber-300',
    activeBg: 'bg-amber-500/10',
    activeBorder: 'border-amber-400',
  },
  {
    slug: 'databases-networking',
    label: 'Databases & Networking',
    blurb: 'What a query, a connection and a socket really do.',
    icon: 'fa-solid fa-database',
    pill: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
    dot: 'bg-emerald-400',
    accentText: 'text-emerald-300',
    activeBg: 'bg-emerald-500/10',
    activeBorder: 'border-emerald-400',
  },
  {
    slug: 'engineering-lessons',
    label: 'Engineering & Practice',
    blurb: 'Incidents, side projects, and lessons from the trenches.',
    icon: 'fa-solid fa-screwdriver-wrench',
    pill: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    dot: 'bg-rose-400',
    accentText: 'text-rose-300',
    activeBg: 'bg-rose-500/10',
    activeBorder: 'border-rose-400',
  },
]

const BY_SLUG = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c]))

// Fallback for any folder not (yet) described above: title-case the slug so the
// UI still renders sensibly instead of breaking.
function fallback(slug) {
  return {
    slug,
    label: slug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    blurb: '',
    icon: 'fa-solid fa-folder',
    pill: 'bg-primary-500/15 text-primary-300 border border-primary-500/30',
    dot: 'bg-primary-400',
    accentText: 'text-primary-300',
    activeBg: 'bg-primary-500/10',
    activeBorder: 'border-primary-400',
  }
}

export function getCategory(slug) {
  return BY_SLUG[slug] || fallback(slug)
}

export function categoryLabel(slug) {
  return getCategory(slug).label
}

// Deterministic ordering for anything that renders the full category list.
export function categoryOrder(slug) {
  const idx = CATEGORIES.findIndex((c) => c.slug === slug)
  return idx === -1 ? CATEGORIES.length : idx
}
