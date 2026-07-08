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

## The shape of the problem

Before any architecture makes sense, you have to internalize how *weird* the observability workload is compared to a normal application database:

**1. It is absurdly write-heavy.** A typical OLTP system might see a 50:50 or 80:20 read/write ratio. An observability platform sees something closer to **1,000,000:1 writes to reads**. Every one of your customers' servers is emitting logs, metrics, and traces every second of every day — but a human only *looks* at that data when something breaks, or when a dashboard refreshes. The overwhelming majority of ingested data is written once and **never read by anyone, ever**.

**2. The data is immutable.** A log line, once written, never changes. There are no UPDATEs. There are no transactions spanning rows. This single property unlocks almost every optimization these platforms use: append-only files, aggressive compression, immutable storage segments, and caching without invalidation headaches.

**3. Recency is everything.** 95%+ of queries touch the last 15 minutes to 24 hours of data. Data from last month is queried during incident retrospectives and compliance audits — rarely otherwise. This is why every serious platform tiers its storage by age.

**4. Ingest lag is a product failure.** If a customer is debugging a live incident and their logs are five minutes behind, your product is useless at the exact moment it matters most. End-to-end latency from "log emitted on customer's server" to "queryable in the UI" needs to be **seconds, not minutes**.

**5. You cannot say no.** A normal service can rate-limit or shed load during a traffic spike. But an observability platform's traffic spikes *when the customer is having an incident* — which is precisely when they need you. Ingestion has to absorb 10x bursts gracefully, because the burst *is* the signal.

Put these together and you get the design brief every one of these companies converged on independently: **decouple ingestion from storage from query, buffer everything through a durable log, store it in a columnar format, and never make the write path wait for the read path.**

## The universal pipeline

Strip away the branding and Datadog, New Relic, and Sentry are the same machine. Every one of them is a variation of this:

```
 CUSTOMER'S INFRASTRUCTURE          │         PLATFORM'S CLOUD
                                    │
┌──────────┐                        │
│ App /    │   ┌───────────┐        │   ┌──────────┐   ┌───────────────┐
│ Server / │──▶│  Agent /  │──HTTPS─┼──▶│  Intake  │──▶│  Kafka        │
│ Container│   │  SDK      │ (batch,│   │  Gateway │   │  (durable     │
└──────────┘   └───────────┘  gzip) │   └──────────┘   │   buffer)     │
                                    │        │         └───────┬───────┘
   buffers, batches, retries        │   auth, rate-            │
   compresses, pre-aggregates       │   limit, sample          ▼
                                    │                  ┌───────────────┐
                                    │                  │  Stream       │
┌──────────┐        ┌───────────┐   │                  │  processors   │
│ Engineer │───────▶│  Query    │   │                  │  (parse,      │
│ (UI/API) │◀───────│  Engine   │   │                  │   enrich,     │
└──────────┘        └─────┬─────┘   │                  │   index)      │
                          │         │                  └───────┬───────┘
                          ▼         │                          ▼
                    ┌──────────────────────────────────────────────────┐
                    │  Columnar storage: hot (SSD) → warm → cold (S3)  │
                    └──────────────────────────────────────────────────┘
```

Walk through it left to right:

**The agent (push, not pull).** Almost everything in modern SaaS observability is **push-based**: an agent or SDK on the customer's machine collects data and pushes it out over HTTPS. Compare this with Prometheus, which is **pull-based** — the server scrapes `/metrics` endpoints on a schedule. Pull is lovely inside your own network (service discovery tells you what to scrape, and a dead target is instantly visible as a failed scrape), but it's a non-starter for SaaS: vendors can't open inbound connections into customer VPCs, NAT and firewalls are in the way, and short-lived containers and lambdas would vanish between scrapes. So Datadog's agent, New Relic's agents, and Sentry's SDKs all *push*. The agent is also your first line of defense: it batches events, compresses them (gzip/zstd routinely gets 10:1 on logs, which are wildly repetitive), retries with backoff, and buffers to local disk when the network flaps — so a brief outage on the vendor side loses nothing.

**The intake gateway.** A fleet of stateless HTTP endpoints whose only jobs are: authenticate the API key, enforce rate limits and quotas per tenant, do the cheapest possible validation, and get the payload onto a queue. The golden rule: **do almost nothing synchronously**. The gateway acks the agent with a 202 the moment the bytes are durably in Kafka. Everything expensive — parsing, indexing, enrichment — happens later, asynchronously. This is why intake can absorb enormous bursts: accepting bytes into a log is fast; understanding them can wait.

**Kafka, the shock absorber.** Every one of these platforms puts a distributed commit log between intake and storage, and it is the single most important box in the diagram. It does three jobs at once. *Durability:* once the event is in Kafka (replicated across three brokers), it will not be lost even if every downstream service crashes. *Decoupling:* the storage layer can fall over, get redeployed, or run slow, and ingestion keeps humming — consumers just catch up on the backlog afterwards. *Fan-out:* the same stream feeds the storage writers, the real-time alerting engine, the live-tail feature, and the usage-metering pipeline, each reading at its own pace. Datadog runs this at a scale that's hard to picture: hundreds of Kafka clusters, thousands of topics, millions of partitions, trillions of datapoints a day flowing through them.

**Stream processors.** Consumers pull batches off Kafka and do the real work: parse the raw log line, extract structured fields, enrich with metadata (which host, which service, which customer tier), apply the customer's pipelines and exclusion filters, and write to storage **in large batches** — because every storage engine in this space loves big sequential writes and hates tiny random ones.

**Columnar storage and the query engine.** Where the magic lives, and where the three platforms differ most. That's the next three sections.
