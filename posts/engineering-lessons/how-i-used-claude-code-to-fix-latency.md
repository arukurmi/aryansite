---
title: "How I Used Claude Code to Diagnose and Fix My Site's Latency"
excerpt: "A case study in agentic engineering: instead of guessing at a 700ms page load, I drove an AI coding agent like a senior pair — anchoring it with constraints, demanding proof before any change, and forcing production verification. Here are the exact prompts I used, the agentic workflow, and the real optimizations that shipped."
date: "2025-12-16"
category: "engineering-lessons"
tags: ["ai", "agentic-engineering", "prompt-engineering", "claude-code", "performance", "nextjs"]
author: "Aryansh Kurmi"
---

# How I Used Claude Code to Diagnose and Fix My Site's Latency

I noticed my blog pages loading in ~700ms locally and wanted it gone. I could have spent an afternoon spelunking through Next.js internals. Instead I ran the whole investigation as an **agentic engineering loop** with Claude Code — and the interesting part isn't the fix, it's *how I directed the agent*. Used well, an AI agent isn't a code-autocomplete; it's a tireless senior pair that you steer with precise constraints and hold to a standard of proof.

This is the playbook I used, the prompts I wrote, and what shipped. (For the deeper theory on *why* the 700ms was a measurement artifact, see [You Can't Benchmark a Dev Server](/blog/benchmarking-dev-vs-uat-vs-production).)

## My prompting philosophy: diagnose before you mutate

The biggest mistake people make with AI agents is asking them to *fix* before asking them to *understand*. A model that's told "make this faster" will happily generate plausible optimizations for a problem you don't have. So my first prompt deliberately **withheld permission to change anything** and demanded a root-cause analysis instead:

> **Prompt 1 — diagnose, don't touch:**
> *"Analyze why `/blog/rippling-ai-coding-round` is taking ~700ms. I'll paste the logs. These APIs shouldn't take more than 50–100ms. Don't change code yet — tell me where the latency actually comes from."*

This framing matters. By separating **diagnosis** from **remediation**, I forced the agent to inspect the data-fetching path (`getStaticProps`, `getStaticPaths`, the markdown pipeline) and form a hypothesis before reaching for the keyboard. The agent came back with the correct call: this was a **dev-server artifact** — on-demand compilation plus per-request data fetching — not a real production problem.

## Demand proof, not assertions

An assertion from an AI ("it's just dev mode, prod is fast") is a hypothesis, not a result. So my next move was to make the agent **prove it empirically**:

> **Prompt 2 — make it measurable:**
> *"Don't just claim production is faster — prove it. Build the production bundle, serve it, and time the actual requests. Show me the numbers for dev vs production, cold vs warm."*

The agent ran `next build`, confirmed the pages were tagged `● (SSG) prerendered as static HTML`, then served the production build and benchmarked it:

| Environment | `/blog/rippling-ai-coding-round` |
| :--- | :--- |
| Dev server (`next dev`) | ~700 ms |
| **Production, cold** | **24 ms** |
| **Production, warm** | **3 ms** |

That table ended the panic. The "problem" was me benchmarking the wrong environment. But I didn't stop there — because the production *build* surfaced something real.

## Mine the signal the agent surfaces

While proving the point, the build emitted a warning worth its weight:

```
Warning: data for page "/blog" is 269 kB which exceeds the threshold of 128 kB
```

This is where agentic engineering shines: the agent had already loaded the whole data layer into context, so I pivoted it from "diagnose" to "now find and fix the *genuine* inefficiencies you can see":

> **Prompt 3 — scope the real work, with guardrails:**
> *"Now find the genuine inefficiencies. I want only safe, behavior-preserving changes: keep the rendered output identical, don't break live-editing in dev, and verify with a rebuild that the payload warnings are gone and pages still return 200. Walk me through what you'll change before you change it."*

Two constraints in that prompt did the heavy lifting:
- **"behavior-preserving / identical output"** kept the agent from over-engineering or silently changing UX.
- **"don't break live-editing in dev"** is a subtle one — it stopped the agent from naively memoizing everything (which would have made authored posts stop refreshing). The agent instead scoped the cache to production only. That's the kind of nuance I expect from a senior pair, surfaced because I *asked for the constraint up front*.

## What actually shipped

The agent identified an **O(N²) markdown-parsing pattern** and a **payload-bloat** issue, then implemented:

1. **Lightweight list payloads.** The blog index and related-post cards were shipping every post's full HTML *and* raw markdown just to render titles and excerpts. I had it strip `content`/`rawContent` for list views via a `toSummary()` projection — the **269 kB payload warning vanished**.
2. **Precomputed reading time.** Reading time was being recomputed from full HTML on every card. Now it's computed once at build (`readingTime`) and carried as a small field, so lists never need the heavy content.
3. **Single-file post reads.** `getPostBySlug()` was calling `getAllPosts()` — parsing *every* post — just to return one. Rewrote it to read and parse only the one matching file.
4. **Production-only memoization.** `getAllPosts()` now caches within a production build (data is immutable at build time) but stays live in dev so my edits show on refresh.

Every change was verified the way I insisted: rebuild → no payload warnings → serve → all pages HTTP 200 → reading times render on both the main post and related cards.

## And the dev experience itself

Separately, I had the agent clean up the local loop so day-to-day iteration *feels* fast even though dev latency is inherently compile-bound:

- Replaced a redundant `nodemon` wrapper that was **double-restarting** the server on every config change with plain `next dev` — restoring clean **Fast Refresh / HMR** (hot-module updates without full reloads).
- Added a `predev` step to free the port so re-running `npm run dev` reclaims `:3000` instead of drifting to `:3001`.
- Killed a stale invalid-config warning that was firing on every boot.

### Making dev *feel* faster (without faking benchmarks)

Dev latency can't be optimized away — compile-on-demand is the cost of live editing — but you can reduce the sting:

- **Warm the routes you're working on** (hit them once after start so the compile cost is paid before you're testing).
- **Turbopack** (`next dev --turbo`) for dramatically faster cold compiles on large module graphs.
- **Trim the module graph** on hot paths (fewer heavy imports = fewer modules to compile per route).
- **Keep data-fetching cheap in dev** — the same lightweight-summary work that helps prod also means dev re-runs do less parsing per request.

## The meta-lesson: agents amplify engineering judgment, not replace it

What made this fast wasn't that the AI "knew the answer." It's that I ran it like an engineering process:

1. **Separate diagnosis from remediation** — understand before you mutate.
2. **Demand empirical proof** — make the agent benchmark, not assert.
3. **Encode constraints as guardrails** — "behavior-preserving," "don't break dev live-edit" — so the agent's nuance matches a senior's.
4. **Verify every change against a target** — rebuild, re-measure, confirm.

The agent typed the code; the **judgment about what to measure, what to ignore, and what constraints to impose** was the engineering. That's the shape of leverage I'm building my workflow around — treating AI agents as force-multipliers I architect *around* a problem, with prompts that carry the same rigor I'd bring to a design review.
