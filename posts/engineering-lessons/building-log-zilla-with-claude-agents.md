---
title: "Log-zilla: I Studied How Datadog and Sentry Work, Then Built My Own With Claude Agents"
excerpt: "After deep-diving into Husky, NRDB, and Snuba, I shrank the same architecture down to something that runs on a laptop: a self-hosted log console that eats every localhost service's output. Here's the design, the trade-offs, and how a team of Claude agents wrote nearly all of it."
date: "2026-06-29"
category: "engineering-lessons"
tags: ["observability", "logging", "side-project", "claude-code", "agentic-engineering", "fluent-bit", "sqlite", "docker"]
author: "Aryansh Kurmi"
---

# Log-zilla: I Studied How Datadog and Sentry Work, Then Built My Own With Claude Agents

Earlier this month I wrote a [deep dive on how Datadog, New Relic, and Sentry ingest trillions of logs](/blog/how-observability-giants-ingest-trillions-of-logs). I ended that post with a claim: the architecture scales *down* — swap Kafka for a lightweight forwarder, ClickHouse for SQLite, the query fleet for one endpoint, and the same skeleton becomes something one person can build in a week.

This post is me cashing that claim. Meet **Log-zilla** — the kaiju that eats your localhost logs.

![Log-zilla console, dark theme](https://raw.githubusercontent.com/arukurmi/Log-zilla/main/screenshots/dashboard-dark.png)

Prefix any command with `logzilla` — or pipe anything into it — and every service on your machine streams into one searchable console at `localhost:5454`. Structured search, severity filters, a live activity graph, history that survives restarts. It is, deliberately, a Datadog-shaped machine at 1/1,000,000th the scale.

The other half of the story is *how* it got built: I wrote almost none of the code by hand. I acted as the architect and reviewer, and a team of Claude agents did the building. More on that below.

## The itch

My normal working state is four or five terminal tabs, each running a service — an API, a worker, a frontend dev server, maybe a database container chattering to itself. When something breaks, the evidence is *somewhere* in those tabs. Usually it scrolled past twenty minutes ago. Usually in the tab I wasn't watching. Terminal scrollback is the worst observability tool ever shipped, and every developer uses it daily.

The tools that fix this properly — Datadog, New Relic — are built for production fleets, priced for companies, and absurd overkill for `localhost`. The lightweight end of the spectrum (`docker logs`, `tail -f`, piping through `grep`) has no history, no structure, no cross-service view. There's a gap in the middle: **production-grade log ergonomics, laptop-grade footprint**. That gap is exactly the size of a side project.

And I had just spent weeks studying how the giants do it. The research post wasn't meant as homework for a build, but halfway through writing it I realized I had accidentally produced a spec. Every box in the "universal pipeline" diagram — agent, gateway, buffer, processor, columnar store, query engine — has a laptop-sized equivalent. The design work was already done; the giants had done it for me. I just had to choose the right small thing for each big thing.

## Shrinking the giants: the translation table

The whole design of Log-zilla fits in one table — each row is a concept from the big-platform post, translated to its laptop-scale equivalent:

| The giants | Log-zilla | Why this swap works at small scale |
|---|---|---|
| Datadog Agent / Sentry SDK (push) | **Fluent Bit** + a `logzilla` CLI wrapper | Same push model; Fluent Bit is the industry's ~1MB-footprint log forwarder |
| Intake gateway (auth, rate limit) | One HTTP intake endpoint | One tenant (me), one machine — auth and quotas dissolve |
| Kafka (durable buffer, fan-out) | Fluent Bit's built-in buffering | At ~10² events/sec, a distributed commit log is cosplay |
| Stream processors (parse, enrich) | Lua processors inside Fluent Bit | Parsing and severity/service tagging happen *before* the server ever sees the event |
| ClickHouse / Husky / NRDB | **SQLite**, indexed on time + source | One writer, append-only, time-ordered — SQLite's happy path |
| Scatter-gather query fleet | One query endpoint + a tiny query DSL | A B-tree index over a few million rows answers in milliseconds |
| Live tail infrastructure | **Socket.io** pushing to a React/Next.js console | The "seconds-to-queryable" guarantee, via one WebSocket |
| Cells, multi-tenant fairness | Docker container + volume | The blast radius is my laptop |

Two of these rows deserve a defense, because both look like sacrilege.

**SQLite instead of a columnar store.** The research post argues columnar is *the* idea — so why row-oriented SQLite? Because the property that makes columnar essential at Datadog's scale (compression and scan cost across trillions of rows) doesn't bind at a few million rows, while the properties SQLite gives me for free — zero operations, a single file I can back up with `cp`, history that survives restarts, real indexes — are exactly what localhost needs. The deeper lesson from the giants was never "use columnar"; it was **append-only, immutable, time-partitioned, indexed on what you filter by**. SQLite does all of that. Architecture is about knowing which constraint produced each decision, so you know which decisions to drop when the constraint disappears.

**Fluent Bit instead of a hand-rolled tailer.** I could have written a hundred-line script that reads stdout and POSTs it. But the agent is the part of the pipeline with the nastiest edge cases — partial lines, multiline stack traces, timestamp formats, backpressure when the server is down — and it's precisely the part the industry has already solved. Fluent Bit is what actual production fleets run at the edge. Using it meant the "agent" box in my diagram had production-grade batching, retry, and buffering on day one, for free — the same reason the giants' agents batch and buffer before pushing.
