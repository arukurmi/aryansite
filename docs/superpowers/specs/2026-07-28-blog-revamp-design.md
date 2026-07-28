# Blog Revamp — Design Spec

Date: 2026-07-28

## Goal

1. Import 9 new deep-dive posts (currently in `~/Downloads/blog`) into the site.
2. Re-triage **all 28 posts** (19 existing + 9 new) into a clean category taxonomy from scratch.
3. Replace the blog page's horizontal filter-button row with a **sticky left navigation sidebar** (GeeksforGeeks / HelloInterview index feel), keeping search on top.
4. Significantly **improve the post cards** on the blog page.
5. Ship as a series of minimal, logical commits and push to production.

## Current architecture (unchanged mechanics)

- Posts live in `posts/<category>/<slug>.md`; the folder name is the category.
- `lib/blog.js` reads folders, derives categories, renders markdown to HTML.
- `pages/blog/index.js` = listing (search + filter buttons + card grid + newsletter).
- `pages/blog/[slug].js` = post page; renders `post.title` as `<h1>` and `post.excerpt` as subtitle.
- Category `displayName` is auto-derived by splitting the slug on `-` and title-casing.

**Gotcha:** `lib/blog.js` spreads frontmatter `...data` *after* the folder-derived `category`, so a `category:` field in frontmatter silently overrides the folder. To keep one source of truth, frontmatter `category` fields will be removed; the folder is authoritative.

## New taxonomy (28 posts → 5 categories)

A dedicated `lib/categories.js` config controls each category's slug, display label, short blurb, icon (Font Awesome class, already loaded), and sidebar order — so labels like "Databases & Networking" aren't mangled by auto title-casing.

| Order | Slug | Label | Count | Posts |
|---|---|---|---|---|
| 1 | `interview-experiences` | Interview Experiences | 7 | highlevel-sde3, hashmap-to-rag, lld-of-a-crypto-wallet, stripe-programming-round, deshaw-autoboxing, rippling-ai-coding, rakuten-java |
| 2 | `system-design` | System Design | 7 | design-url-shortener (from hld/), design-chat-system, dating-apps, observability-giants, **distributed-systems-at-scale** (new 05), **recommendation-systems** (new 09), design-parking-lot (from lld/) |
| 3 | `language-internals` | Language Internals | 5 | **singletons-and-static** (03), **what-a-lock-does** (04), **java-streams-and-lambdas** (06), **hashcode-equals-hashset** (07), **array-arraylist-linkedlist** (08) |
| 4 | `databases-networking` | Databases & Networking | 2 | **how-postgres-actually-works** (01), **what-is-a-connection** (02) |
| 5 | `engineering-lessons` | Engineering & Practice | 7 | production-incidents, claude-code-latency, benchmarking, agi-future, kanban-indexeddb, rate-the-date, log-zilla |

Bold = the 9 new posts. Total = 7+7+5+2+7 = 28.

Notes:
- HLD (`design-url-shortener`) and LLD (`design-parking-lot`) each have only one post, so they fold into **System Design** rather than becoming single-post categories. The `categories.js` config makes splitting them out trivial later once volume grows.
- Empty folders `hld/`, `lld/`, `personal/` are deleted after moves.
- `system-design` is currently a folder; it stays but its label becomes "System Design" and it gains 4 posts.

## New-post normalization

For each of the 9 imported files:
- Rename frontmatter `description:` → `excerpt:`.
- Add `author: "Aryansh Kurmi"`.
- Strip the leading `# Heading` line from the body (the post page already renders the title).
- Give each a clean kebab-case slug (filename), dropping the `01-`…`09-` numeric prefixes.
- Place in the target category folder.

## Left sidebar (blog listing page)

Layout becomes a two-column grid on `lg+`:
- **Left column (sticky):** an index nav. "All Posts (28)" at top, then each category as a row with icon, label, and count; active category highlighted (primary accent bar + tint). Purely client-side filter state (same `selectedCategory` mechanic).
- **Right column:** search bar on top, then the card grid, then newsletter.
- **Mobile (`< lg`):** sidebar collapses to a horizontal, scrollable chip row above the results (keeps everything reachable without a hamburger).

The page header (title + intro) shrinks / left-aligns to make room; search moves from centered to the top of the results column.

## Card redesign (blog listing page)

Keep the existing `Card` primitive and dark theme, but make cards feel intentional and scannable:
- Category pill (color-keyed per category via `categories.js`) + date on one row.
- Larger, tighter title with hover color shift.
- 3-line excerpt.
- Footer row: up to 3 tag chips on the left, `reading time` on the right.
- A subtle "Read →" affordance that slides on hover; existing lift + glow retained.
- Consistent min-height so ragged excerpts don't misalign the grid.

Cards remain real `<Link>` anchors (Cmd/Ctrl-click opens new tab — matches recent commits f0412c6/5a031d6). Homepage `BlogSection` cards are left as-is unless the shared visual reads inconsistent; scope is the blog page per the request.

## Files touched

- `lib/categories.js` — **new**: category config (slug, label, blurb, icon, order, color).
- `lib/blog.js` — use the config for labels/order; drop reliance on frontmatter `category`.
- `pages/blog/index.js` — sidebar layout, search reposition, redesigned cards.
- `posts/**` — moves, new files, frontmatter normalization; delete empty folders.
- Possibly `styles/` for any sidebar/card CSS not expressible in Tailwind utilities.

## Testing / verification

- `npm run build` succeeds (static generation of every slug + listing).
- Run `npm run dev`, load `/blog`, verify: 28 posts show under "All", each category count is correct, filtering works, search works, a moved post (e.g. `/blog/design-url-shortener`) still resolves, a new post (e.g. `/blog/how-postgres-actually-works`) renders with no duplicate title.
- Screenshot `/blog` (desktop + narrow) and one new post; share for review.

## Commit plan (minimal, logical)

1. Add `lib/categories.js` + wire `lib/blog.js` to it.
2. Re-triage existing 19 posts into new folders (moves + frontmatter `category` cleanup).
3. Import the 9 new posts (normalized).
4. Blog page: sticky left sidebar + search reposition.
5. Blog page: card redesign.

Then verify build + dev, screenshot, and push to production.
