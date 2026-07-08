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

## Datadog: Husky and the exactly-once trick

Datadog has publicly documented three generations of its event store, and the current one — **Husky** — is the most instructive architecture in this whole space.

The first generation was per-customer ElasticSearch-style clusters. It worked until multi-tenancy killed it: one noisy customer could degrade a whole cluster, and rebalancing tenants across clusters became a full-time operational nightmare. The second generation improved isolation but still coupled compute and storage — to store more you had to buy more query capacity, and vice versa.

Husky, the third generation, makes the move that defines modern data infrastructure: **it separates storage from compute completely**. The design has three independent planes:

```
                     ┌────────────────────────┐
        Kafka ──────▶│  Writers (ingestion)   │──┐
                     └────────────────────────┘  │ write immutable
                                                 │ columnar fragments
                     ┌────────────────────────┐  ▼
                     │  Compactors            │ ┌──────────────────┐
                     │  (merge small files    │◀│  Blob storage    │
                     │   into big ones)       │▶│  (S3-style)      │
                     └────────────────────────┘ └──────────────────┘
                                                 ▲
                     ┌────────────────────────┐  │ read fragments
                     │  Readers (query)       │──┘
                     └────────────────────────┘
                              │
                     all three coordinate through
                     ┌────────────────────────┐
                     │  FoundationDB          │
                     │  (transactional        │
                     │   metadata store)      │
                     └────────────────────────┘
```

**Writers** consume from Kafka and write small immutable columnar files to cheap blob storage. **Compactors** continuously merge those small files into larger, better-compressed, better-sorted ones (the same LSM-tree idea that powers RocksDB and Cassandra, but with S3 as the disk). **Readers** serve queries by fetching only the column fragments a query needs. Each plane scales independently: an ingest spike scales writers without touching query capacity; a heavy dashboard day scales readers without touching ingest.

The glue is **FoundationDB**, a strictly-serializable transactional key-value store, which holds the *metadata*: which files exist, what time range and tenant each covers, which files replaced which after compaction. The actual data — the trillions of events — lives in blob storage, dumb and cheap. The metadata — small but requiring real transactions — lives in FoundationDB. This split (transactional brain, object-store body) is quietly becoming the standard shape of every modern data platform; you can see the same idea in Snowflake and in Apache Iceberg.

FoundationDB also enables Husky's neatest trick: **exactly-once ingestion without stateful writers**. Events are routed deterministically — a given event's tenant ID and timestamp always land on the same Kafka partition — and the file-commit into FoundationDB is transactional. If a writer crashes and its work is retried, the second attempt's commit is deduplicated at the metadata layer. Customers never see duplicate log lines, yet no writer holds fragile local state. When an interviewer asks "how would you achieve exactly-once delivery?", *deterministic routing plus idempotent transactional commit* is the grown-up answer, and Husky is the reference implementation.

The result, per Datadog's engineering blog: a query engine with real-time access to something on the order of **100 trillion events**.

## New Relic: NRDB and the cellular architecture

New Relic's answer is **NRDB** — a single, purpose-built, multi-tenant database that stores *all* telemetry types (metrics, events, logs, traces) in one unified schema, queried through **NRQL**, a SQL dialect built for time-series questions.

The headline numbers are worth memorizing because they calibrate your intuition about what "at scale" means: **billions of data points ingested per minute**, more than **180,000 accounts** on the same shared platform, query workers that can scan **tens of billions of events per second**, and a **median query latency around 45 milliseconds**.

Two ideas make NRDB interesting.

**Massively parallel scatter-gather queries.** When you run a NRQL query, a router decomposes it and fans it out to *hundreds or thousands* of query workers, each of which scans its slice of the data in parallel; partial results are merged on the way back up. This is the same scatter-gather pattern as ElasticSearch or Google's original Dremel paper, tuned for one workload. NRDB deliberately indexes very little — instead of maintaining expensive inverted indexes on every field at write time (the ElasticSearch approach, which makes writes costly), it bets on *brute-force parallel scans over columnar data* being fast enough. For write-heavy workloads that bet usually wins: you pay almost nothing at ingest, and you pay at query time only for the queries someone actually runs — remember, almost all data is never queried.

**Cells: the blast-radius weapon.** Instead of one gigantic shared platform, New Relic partitions its entire stack into **cells** — self-contained copies of the platform, each with its own ingest, storage, and query capacity, each hosting a subset of customers. Cells are stamped out from automated profiles: extra-large cells with the beefiest hardware for the heaviest customers, hardened cells for FedRAMP/HIPAA-regulated customers. When something goes catastrophically wrong — a bad deploy, a poison-pill payload, a hardware failure — the blast radius is one cell, not the whole company's customer base. Cross-cell communication happens through controlled "enclaves" built on Kafka. Cellular architecture is having a moment across the industry (AWS has championed it for years), and "how do you limit blast radius in a multi-tenant system?" is exactly the kind of question where answering "cells, like NRDB" earns you a follow-up smile.

The trade-off, and it's a real one: multi-tenancy is a *fairness* problem. One tenant's monster query, or one tenant's 50x ingest spike, must not starve neighbors. NRDB handles this with per-tenant quotas, admission control on queries, and the cell boundaries themselves as the ultimate isolation. Every multi-tenant system design eventually becomes a scheduling-and-fairness design; the storage part is comparatively easy.
