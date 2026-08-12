// Single source of truth for blog categories.
//
// The post's category is derived from its folder name (see lib/blog.js).
// This config controls how each category is labelled, ordered, described and
// coloured across the site (blog index sidebar, cards, and post pages) so the
// UI never has to auto-title-case a slug or hard-code a colour.
//
// NOTE: Tailwind scans source for complete class strings, so every colour class
// below is written out in full — never build these dynamically.

// Every category shares the site's single blue accent so the page reads as one
// palette (navy + primary blue + white). Categories are told apart by their
// icon and label, not by colour. These classes all have light-mode overrides in
// globals.css, so they work in both themes.
const PILL = 'bg-primary-500/15 text-primary-300 border border-primary-500/25'
const DOT = 'bg-primary-500'
const ACCENT = 'text-primary-300'
const ACTIVE_BG = 'bg-primary-500/10'
const ACTIVE_BORDER = 'border-primary-500'

export const CATEGORIES = [
  {
    slug: 'interview-experiences',
    label: 'Interview Experiences',
    blurb: 'Real rounds, real questions, the answers that worked.',
    icon: 'fa-solid fa-comments',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
  },
  {
    slug: 'system-design',
    label: 'System Design',
    blurb: 'How large systems are actually built — HLD, LLD and scale.',
    icon: 'fa-solid fa-sitemap',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
  },
  {
    slug: 'language-internals',
    label: 'Language Internals',
    blurb: 'One layer down into Java and the JVM.',
    icon: 'fa-solid fa-microchip',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
  },
  {
    slug: 'algorithms',
    label: 'Algorithms & Problem Solving',
    blurb: 'Contest problems, taken apart until the trick is obvious.',
    icon: 'fa-solid fa-puzzle-piece',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
  },
  {
    slug: 'databases-networking',
    label: 'Databases & Networking',
    blurb: 'What a query, a connection and a socket really do.',
    icon: 'fa-solid fa-database',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
  },
  {
    slug: 'engineering-lessons',
    label: 'Engineering & Practice',
    blurb: 'Incidents, side projects, and lessons from the trenches.',
    icon: 'fa-solid fa-screwdriver-wrench',
    pill: PILL, dot: DOT, accentText: ACCENT, activeBg: ACTIVE_BG, activeBorder: ACTIVE_BORDER,
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
    pill: 'bg-primary-500/20 text-primary-200 border border-primary-400/40',
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
