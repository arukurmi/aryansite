---
title: "How Datadog, New Relic and Sentry Ingest Trillions of Logs Without Falling Over"
excerpt: "Every observability platform is secretly the same machine: an agent, a queue, a columnar store, and a query engine. A deep dive into how Datadog's Husky, New Relic's NRDB, and Sentry's Snuba actually work — push vs pull, consistency trade-offs, storage tiers, and the numbers that make interviewers nod."
date: "2026-06-04"
category: "system-design"
tags: ["system-design", "observability", "logging", "datadog", "new-relic", "sentry", "kafka", "columnar-databases"]
author: "Aryansh Kurmi"
---

# How Datadog, New Relic and Sentry Ingest Trillions of Logs Without Falling Over

Here is a number that should make you pause: Datadog ingests **hundreds of trillions of observability events per day**. New Relic takes in **billions of data points every minute** across 180,000+ accounts, and still answers the median query in about **45 milliseconds**. Sentry processes error events from millions of applications and lets you search a stack trace seconds after it happened.

These are write throughputs that would melt a normal database. And yet all three platforms feel instant. You tail a log, it appears. You query a week of data, the dashboard fills in before you finish reaching for your coffee.

I wanted to understand *how* — not at the marketing level, but at the level where you could sketch the architecture on a whiteboard and defend every box. So I went through Datadog's engineering blog on Husky, New Relic's NRDB design papers, and Sentry's open-source Snuba and Relay codebases. This post is everything I learned, written the way I wish someone had explained it to me.

By the end you should be able to answer, in an interview or in a design review: what does the write path of a log platform look like, why is everything columnar, why does everyone use Kafka, what consistency model do these systems actually promise, and where does the money go.
