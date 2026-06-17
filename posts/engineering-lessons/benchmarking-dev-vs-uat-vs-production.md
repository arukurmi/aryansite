---
title: "You Can't Benchmark a Dev Server: Dev vs UAT vs Production"
excerpt: "A 700ms local page load sent me down a rabbit hole — and the real lesson had nothing to do with the page. Why dev, sandbox, and UAT environments are structurally incomparable to production, how to actually benchmark and load-test on AWS/Azure, and what a senior engineer looks for before trusting a single latency number."
date: "2025-12-09"
category: "engineering-lessons"
tags: ["performance", "benchmarking", "load-testing", "aws", "azure", "production", "observability"]
author: "Aryansh Kurmi"
---

# You Can't Benchmark a Dev Server: Dev vs UAT vs Production

It started with a number that looked alarming: a dead-simple blog page on my Next.js site was taking **~700ms** locally. For a static-ish content page that should be tens of milliseconds, that felt wrong. So I did what the panic instinct says to do — I started optimizing.

The optimizations turned out to be real and worth doing (I cover them in a [separate writeup](/blog/how-i-used-claude-code-to-fix-latency)). But the **most important** thing I learned had nothing to do with the code: I was benchmarking the one environment whose numbers mean almost nothing — the **dev server**. This post is about why that's a trap, and how to benchmark like a senior engineer instead.

## The core mistake: treating dev latency as a signal

When I looked closely at the logs, the truth was obvious:

```
○ Compiling /blog/[slug] ...
✓ Compiled /blog/[slug] in 1774ms (363 modules)
GET /blog/rakuten-java-interview 200 in 1756ms   ← first hit (compile)
GET /blog/rakuten-java-interview 200 in 286ms    ← second hit (warm)
```

A dev server (`next dev`, `vite`, `webpack serve`, `nodemon`, Rails in development mode, Spring Boot devtools, etc.) is **optimized for iteration speed, not runtime speed**. It does things production never does:

- **On-demand compilation.** Routes/modules are built the first time they're hit. That first request pays the entire compile cost.
- **No production build optimizations.** No minification, no tree-shaking, no dead-code elimination, no bundle splitting tuned for delivery.
- **Re-running data fetching every request.** Frameworks re-execute server data functions on each request in dev to reflect edits live, even when production would compute them once at build.
- **Source maps, HMR sockets, file watchers** all running in-process, competing for CPU.
- **No CDN, no edge cache, no warmed connection pools.**

> **The rule:** A dev server measures *developer ergonomics*, never *user-perceived performance*. A 700ms cold compile and a 3ms warm static serve are the *same code* — the difference is entirely the environment.

The same logic disqualifies a few other environments people wrongly benchmark:

- **Local Docker / sandbox** on your laptop: shares your machine's CPU, disk, and a battery throttling governor. Useful for correctness, useless for latency numbers.
- **A coding-sandbox / preview env** running an unoptimized build: same problem as dev.

## The hierarchy of environments — and what each is *for*

| Environment | Built for | Valid to benchmark? |
| :--- | :--- | :--- |
| **Dev / local** | Fast iteration, hot reload | ❌ Never — compile-on-demand, unoptimized |
| **Sandbox / preview** | Quick functional checks | ❌ Not for latency; build & infra differ |
| **UAT / Staging** | Acceptance, integration, *approximate* load | ⚠️ Only if it mirrors prod topology — and read the caveats below |
| **Production** | Real traffic | ✅ The only source of truth, via canary + observability |

## Why UAT benchmarks lie (even when UAT is "production-like")

This is the part that separates juniors from seniors. UAT is the closest thing to production you can hammer freely — but its numbers are systematically optimistic or pessimistic unless you account for the differences:

1. **Instance sizing.** UAT is usually smaller (cost control). A `t3.medium` in UAT vs an `m6i.2xlarge` in prod gives you completely different CPU-steal and burst-credit behavior.
2. **Data volume.** UAT has a toy dataset. That `SELECT ... WHERE user_id = ?` is instant on 10k rows and a tablescan disaster on 80M. **Query plans change with cardinality.** This is the single most common production-only surprise.
3. **Cache state.** UAT caches are cold or tiny; prod has warm Redis/CDN hit-ratios of 95%+. Benchmarking a cold cache tells you about the 5%, not the 95%.
4. **Network topology.** Prod has real cross-AZ hops, a load balancer, WAF, API gateway, service mesh sidecars — each adding latency UAT often skips.
5. **Concurrency & noisy neighbors.** Prod runs N services on shared nodes; connection pools saturate, GC pauses cluster, thread pools queue. A single-user UAT test never sees this.
6. **Third-party rate limits & quotas.** Sandbox API keys behave differently from prod keys (throttling, regional endpoints).

> A senior engineer never reports a UAT latency number without the sentence: *"…and here's how UAT differs from prod, and which way that biases the result."*

## How to actually benchmark production (AWS / Azure)

You don't benchmark production by blasting it with load — you benchmark it with **real traffic + observability**, and you load-test a **production-equivalent** environment safely.

### 1. Measure real production with observability, not synthetic hits

Instrument and read **percentiles, never averages**. p50 hides everything; p95/p99 is where users actually feel pain.

- **AWS:** CloudWatch metrics + **X-Ray** (or ADOT/OpenTelemetry) for distributed traces. For an ALB/API Gateway, watch `TargetResponseTime` p99, `IntegrationLatency`, 5xx rates. Lambda: `Duration`, `InitDuration` (cold starts), `ConcurrentExecutions`, throttles.
- **Azure:** **Application Insights** (request duration percentiles, dependency latency, failures) + Azure Monitor. App Service / Front Door: backend latency, health-probe latency.
- **RUM** (Real User Monitoring) for the *actual* user-perceived number — TTFB, LCP, INP — segmented by region and device. Server p99 means nothing if the CDN or client is the bottleneck.

### 2. Load-test a production-equivalent stack (not prod itself, usually)

Stand up a stage that **mirrors prod topology and data scale** (same instance types, same DB tier, production-sized dataset snapshot, same cache config), then drive load:

- **Tools:** k6, Gatling, Locust, JMeter, or AWS **Distributed Load Testing** / Azure Load Testing (managed, multi-region generators).
- **Generate load from multiple regions** so you include real network latency, not loopback.
- **Model realistic traffic shapes:** ramp-up, steady state, spike, soak (multi-hour) to catch memory leaks and connection-pool exhaustion that only appear over time.
- **Define SLOs first**, then test against them: e.g. "p99 < 200ms at 2,000 RPS with < 0.1% errors." A benchmark without a target is just a number.

### 3. Test production directly only via safe patterns

- **Canary / blue-green:** route 1–5% of real traffic to the new version and compare p99 + error budgets before full rollout (AWS CodeDeploy canary, Azure App Service deployment slots / Front Door weighted routing).
- **Synthetic canaries:** CloudWatch Synthetics / Application Insights availability tests hit prod on a schedule from multiple regions to track latency trends continuously.
- **Shadow / mirror traffic** for read paths when you need real input distributions without user impact.

## The senior-engineer checklist before trusting any latency number

- [ ] **Which environment produced this?** If it's dev/sandbox, discard the absolute number.
- [ ] **Cold or warm?** First-hit compile/JIT/cold-start vs steady state — report both, separately.
- [ ] **Percentile, not average.** p50/p95/p99, with sample size.
- [ ] **Does the data scale match prod?** Same cardinality, or you're benchmarking a different query plan.
- [ ] **Cache state declared?** Cold vs warm changes the result by an order of magnitude.
- [ ] **Where's the time going?** App vs DB vs network vs client — a trace, not a guess.
- [ ] **Load shape realistic?** Single-user ≠ concurrent; include ramp, spike, and soak.
- [ ] **Generated from where?** Loopback hides the network; use multi-region generators.
- [ ] **Against an SLO?** A number without a target can't be "good" or "bad."

## The takeaway

My "700ms problem" was never a problem — it was a **measurement error**. The page served from production in **single-digit milliseconds**; the 700ms was a dev server compiling on demand. The real work was twofold: (1) recognizing the environment made the number meaningless, and (2) *still* finding the genuine wins (payload size, build-time data shaping) by measuring the **production build**, not the dev server.

Benchmarking maturity is mostly knowing **which number to ignore**. Dev tells you how fast you can build; only production — measured with percentiles, traces, and real traffic — tells you how fast your users actually go.

*For the hands-on side of this — how I drove an AI agent to diagnose and fix the genuine optimizations — see [How I Used Claude Code to Diagnose and Fix My Site's Latency](/blog/how-i-used-claude-code-to-fix-latency).*
