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
