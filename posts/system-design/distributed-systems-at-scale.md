---
title: "Everything That Breaks When You Scale (100M Transactions, 1M Queries a Second)"
excerpt: "Idempotency, retries, state machines, backpressure, queue-based load levelling, and the failure modes nobody warns you about — explained without jargon."
tags: ["distributed-systems", "scaling", "idempotency", "backpressure", "payments"]
date: "2026-07-28"
author: "Aryansh Kurmi"
---

I've been asked variations of *"how would you scale this?"* in three interviews now. Every time I improvised, and every time it came out as a list of buzzwords: add caching, add replicas, add a queue.

That's not an answer. An answer names **what breaks first, why, and what you trade away to fix it.**

This post is the structured version. It assumes you know what a server and a database are and nothing beyond that.

---

## Part 1: The one idea everything else follows from

In a single program, when you call a function, exactly two things can happen: it works, or it throws.

The moment you split that program across a network, a **third** possibility appears:

> **You don't know what happened.**

You sent a request. No reply came. Did the server never receive it? Did it process it perfectly and the reply got lost? Is it processing right now, slowly? **You cannot tell.** No amount of clever code makes this distinguishable.

This is called **partial failure**, and every distributed systems concept in this post exists to cope with it.

Think about what that means for a payment:

```
Your service          Payment provider
     |                       |
     |---- pay ₹5000 ------->|
     |                       |  money moves ✓
     |    X (reply lost)     |
     |                       |
   "did that work?"
```

If you retry, you might pay twice. If you don't, you might not pay at all. **Both are unacceptable.**

The answer to this dilemma is idempotency.

---

## Part 2: Idempotency (the most important word here)

### The definition

An operation is **idempotent** if doing it many times leaves the system in the same state as doing it once.

Everyday examples:

- **Idempotent:** pressing a lift's call button. Press it ten times — one lift comes.
- **Not idempotent:** withdrawing ₹500 from an ATM. Do it ten times, you're ₹5000 down.

Note carefully: idempotent doesn't mean *"the code refuses to run again."* It means **the end state is the same** whether it runs once or a hundred times.

### The rule this unlocks

> **If your operation is idempotent, you can retry it freely and never worry.**

That single property removes almost all the fear from distributed systems. Timeout? Retry. Crash mid-way? Re-drive it. Message delivered twice? Harmless.

### How to actually build it (five layers)

Not "we made it idempotent." Here's the mechanism.

#### Layer 1: A deterministic idempotency key

Every unit of work needs a key that is **the same every time you retry**.

```
GOOD:  payment_id + settlement_cycle_id     ← derived from the data
BAD:   UUID.randomUUID()                    ← a retry mints a NEW key
```

If the key changes on retry, you have no idempotency at all. This is the most common bug in the whole area.

#### Layer 2: Enforce uniqueness at the database

This is the actual guarantee. Everything else is optimisation.

```sql
CREATE TABLE settlements (
    id              BIGSERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL,
    merchant_id     TEXT NOT NULL,
    amount_paise    BIGINT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT uq_idem UNIQUE (idempotency_key)
);
```

```sql
INSERT INTO settlements (idempotency_key, merchant_id, amount_paise)
VALUES ($1, $2, $3)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING id;
```

Run it a thousand times, get one row. The database is the referee — not your application code, which can be running on fifty pods that know nothing about each other.

#### Layer 3: A state machine, not a boolean

Don't use `is_processed = true`. Use explicit states:

```
PENDING ──claim──> IN_PROGRESS ──success──> SETTLED
                        │
                        └────failure─────> FAILED ──retry──> PENDING
```

Every transition is a **conditional update**:

```sql
UPDATE settlements
   SET status = 'IN_PROGRESS',
       worker_id = $1,
       claimed_at = now()
 WHERE id = $2
   AND status = 'PENDING';     -- ← the guard
```

Then check **rows affected**:

- `1` → you own this row, proceed
- `0` → someone else got it first, skip

This is a **compare-and-swap in SQL**. It's atomic, it works across any number of workers, and it holds no lock across your network calls.

#### Layer 4: Pass the key downstream too

Every serious payment API accepts an idempotency key in a header:

```http
POST /v1/payouts
Idempotency-Key: settlement-8891-cycle-2026-07-28
```

Now *their* side dedupes as well. Neither system trusts the other. Two independent guards.

#### Layer 5: Reconciliation

There is one window you can never close in code: **crash after the money moved but before you recorded it.**

```
1. claim row -> IN_PROGRESS        ✓ committed
2. call payout API                 ✓ money moved
3. mark SETTLED                    ✗ process died here
```

The row sits in `IN_PROGRESS` forever. So you run a **sweeper**: any row stuck past a lease timeout gets re-checked against the provider's records and resolved.

Reconciliation is what *proves* your idempotency worked. In money systems it isn't optional.

### Exactly-once delivery does not exist

Worth saying plainly, because it sounds like a solvable engineering problem and it isn't.

You cannot atomically write to your database **and** publish to a queue. They're two systems; there's no shared transaction. Whichever you do second might fail.

What you can build is **effectively-once**:

```
at-least-once delivery  +  idempotent consumer  +  reconciliation
                        =  effectively-once
```

Saying *"exactly-once delivery is impossible, so we build effectively-once"* is one of the highest-signal sentences in a systems interview.

### The outbox pattern

The standard fix for "write to DB and publish to queue atomically":

```sql
BEGIN;
  UPDATE settlements SET status = 'SETTLED' WHERE id = 8891;
  INSERT INTO outbox (topic, payload) VALUES ('settlements', '{"id":8891,...}');
COMMIT;                       -- both, or neither. One database, one transaction.
```

A separate relay process reads the outbox and publishes to Kafka, marking rows sent. If it crashes, it re-publishes — which is fine, because the consumer is idempotent.

You've converted a two-system problem into a one-database problem.

---

## Part 3: Retries — and how they cause outages

Retrying seems obviously good. Done naively, it's one of the fastest ways to turn a small problem into a full outage.

### The naive version

```java
for (int i = 0; i < 5; i++) {
    try { return callPaymentApi(request); }
    catch (Exception e) { Thread.sleep(1000); }
}
```

What happens when the payment API has a two-second wobble and you're doing 1,000 requests/second?

```
t=0s    1,000 requests fail
t=1s    those 1,000 retry + 1,000 new = 2,000 requests
t=2s    2,000 retry + 1,000 new = 3,000 requests
```

The API was recovering. You just tripled its load. It falls over properly this time.

This is a **retry storm**, and it has caused real outages at real companies.

### Fix 1: Exponential backoff

Double the wait each time:

```
attempt 1 -> wait 100ms
attempt 2 -> wait 200ms
attempt 3 -> wait 400ms
attempt 4 -> wait 800ms
```

Better. Still broken.

### Fix 2: Jitter (the part everyone forgets)

With pure exponential backoff, **all 1,000 failed requests retry at exactly the same instant**, because they all failed at the same instant. You've turned a flood into a series of synchronised waves.

This is the **thundering herd**.

Add randomness:

```java
// "Full jitter" — AWS's recommended strategy
long base = 100;
long cap  = 30_000;
long delay = ThreadLocalRandom.current()
        .nextLong(0, Math.min(cap, base * (1L << attempt)));
Thread.sleep(delay);
```

Now retries spread smoothly across the window instead of arriving in a spike.

### Fix 3: Only retry the right things

```java
boolean shouldRetry(Exception e) {
    if (e instanceof SocketTimeoutException) return true;    // transient
    if (e instanceof HttpException http) {
        int code = http.status();
        if (code == 429) return true;                        // rate limited
        if (code >= 500) return true;                        // server error
        if (code >= 400 && code < 500) return false;         // OUR bug — retrying won't help
    }
    return false;
}
```

Retrying a `400 Bad Request` five times is five guaranteed failures and five times the load.

**And critically:** only retry if the operation is idempotent. Otherwise you're not retrying, you're double-paying.

### Fix 4: Retry budgets

Retries multiply through a call chain. Service A retries 3× into B, which retries 3× into C, which retries 3× into D:

```
3 × 3 × 3 = 27 requests hit D for one original request
```

Cap total retry traffic — e.g. "retries may not exceed 10% of normal traffic" — and stop retrying past that.

### Fix 5: Circuit breakers

If a dependency is clearly down, stop calling it entirely for a while.

```
CLOSED  ── failures exceed threshold ──>  OPEN
                                            │
                                     (wait 30 seconds)
                                            ▼
                                        HALF_OPEN
                                       │          │
                            success ───┘          └─── failure
                                ▼                        ▼
                             CLOSED                    OPEN
```

- **CLOSED** — normal, requests flow through
- **OPEN** — fail instantly without calling. This protects *both* sides: the dependency gets breathing room, and your threads don't pile up waiting.
- **HALF_OPEN** — let one request through to test the water

The key insight: an open circuit **fails fast**. A slow dependency is more dangerous than a dead one, because slowness ties up your threads.

---

## Part 4: Backpressure (the concept that saves systems)

### What it is

**Backpressure** is a fast producer being told to slow down by a slow consumer.

Real-world analogy: a restaurant kitchen. Orders come in faster than the chefs can cook. Two options:

1. Keep accepting orders. The queue grows. Customers wait an hour. Food goes cold. Everyone is unhappy and the kitchen collapses.
2. Tell the front of house: *"we're full — stop seating people for ten minutes."*

Option 2 is backpressure. Option 1 is what most software does by default.

### Why unbounded queues are a trap

```java
ExecutorService pool = Executors.newFixedThreadPool(10);
// this uses an UNBOUNDED LinkedBlockingQueue internally
```

If tasks arrive faster than 10 threads can process them, the queue grows without limit. Memory fills. Latency climbs to minutes. Then `OutOfMemoryError`, and you lose **everything in the queue**.

> **An unbounded queue doesn't prevent overload. It converts a fast, visible failure into a slow, invisible, total one.**

### Bounded queue + a rejection policy

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    10, 10,
    0L, TimeUnit.MILLISECONDS,
    new ArrayBlockingQueue<>(100),                  // BOUNDED
    new ThreadPoolExecutor.AbortPolicy()            // reject when full
);

try {
    pool.submit(task);
} catch (RejectedExecutionException e) {
    return Response.status(503)
                   .header("Retry-After", "5")
                   .build();                        // shed load, honestly
}
```

Returning `503` in 1 ms is a **much** better outcome than accepting a request you'll answer in 90 seconds — or never.

### Where backpressure shows up

| Layer | Mechanism |
|---|---|
| TCP | The receive window — the kernel literally tells the sender to slow down |
| HTTP | `429 Too Many Requests` with `Retry-After` |
| Thread pools | Bounded queue + rejection policy |
| Kafka | Consumers pull at their own pace; lag is visible and measurable |
| Reactive Streams | `request(n)` — the subscriber states how much it can handle |
| DB pools | Short `connectionTimeout` so callers fail rather than pile up |

### Load shedding: choose what to drop

When overloaded, don't drop randomly. Drop by priority:

```java
if (systemLoad > 0.9) {
    if (request.priority() == LOW)    return reject();   // analytics, reports
    if (request.priority() == MEDIUM && systemLoad > 0.95) return reject();
    // HIGH (checkout, payments) always gets through
}
```

Serving 70% of traffic well beats serving 100% badly.

---

## Part 5: Queue-based load levelling

The other half of the answer, and the one with the nicest mental picture.

### The problem

Traffic isn't flat. It's spiky.

```
Normal:      100 requests/sec
Flash sale: 5,000 requests/sec for ten minutes
```

Provision for 5,000 and you waste 98% of your capacity all year. Provision for 100 and the sale kills you.

### The idea

Put a **queue** between the part that accepts work and the part that does work.

```
                                                   ┌──────────┐
                                              ┌───>│ Worker 1 │
[Clients] ──> [API] ──> [Queue] ──────────────┼───>│ Worker 2 │──> [Database]
   spiky      fast &     absorbs              └───>│ Worker 3 │      steady
              dumb       the spike                 └──────────┘
```

- The **API** does almost nothing: validate, write to the queue, return `202 Accepted`. It can absorb enormous spikes because it's cheap.
- The **queue** is a shock absorber. It grows during the spike.
- The **workers** consume at whatever rate the database can sustain. The queue drains after the spike passes.

**The load is levelled**: the spiky input becomes a steady stream at the database.

Analogy: a dam. The river floods, the reservoir absorbs it, and water leaves at a controlled rate.

### The honest trade-off

You've swapped **synchronous** for **eventual**. The user gets "your payout has been requested," not "your payout is complete." That means:

- Status endpoints so they can check
- Webhooks or notifications on completion
- UI that makes pending states feel intentional rather than broken

Sometimes that's unacceptable (a card authorisation at checkout must be synchronous). Sometimes it's obviously fine (settlements, reports, emails, exports). Knowing which is the design skill.

### What the queue gives you for free

- **Retries** — a failed message returns to the queue automatically
- **Dead letter queue (DLQ)** — after N failures the message is parked for a human, instead of blocking everything behind it
- **Independent scaling** — add workers without touching the API
- **Decoupling** — the database can go down for a minute and nothing is lost

### The critical setting nobody talks about: visibility timeout

In SQS (and similar), when a worker receives a message it becomes **invisible** for N seconds. If the worker doesn't delete it in time, it **becomes visible again and another worker picks it up**.

```
visibility timeout = 30s
processing time    = 45s

t=0    Worker A picks up message. Invisible until t=30.
t=30   Message reappears. Worker B picks it up. ← BOTH ARE NOW PAYING
t=45   Worker A finishes, pays out, deletes.
t=75   Worker B finishes, pays out again.
```

**You just paid twice**, and no code was buggy. The config was.

Rule: **visibility timeout ≥ 6× your worst-case processing time.** And of course — make the consumer idempotent, because at-least-once delivery guarantees this will eventually happen anyway.

---

## Part 6: Scaling — the structured answer

When asked "how do you scale this?", never improvise a list. Walk these eight steps.

### 1. Measure first. Name the bottleneck.

*"Before scaling anything, I'd find what's actually saturated — CPU, memory, DB connections, an external API, lock contention, or disk I/O. Each has a completely different fix, and adding servers helps only one of them."*

This one sentence beats a page of solutions.

### 2. Make it stateless

If a server holds session state in memory, request 2 must reach the same server. Horizontal scaling becomes impossible.

Push state out — to Redis, to the database, to a signed token in the client. **Any request must be servable by any instance.**

### 3. Scale up before scaling out

**Vertical** (bigger machine) is simpler: no distribution, no consistency problems. It buys you time and it's cheap in engineering hours. **Horizontal** (more machines) is unbounded but brings coordination costs.

Do vertical first, honestly. Many "we need microservices" problems are "we need a bigger box" problems.

### 4. Partition the work

Sharding by a key means workers touch disjoint data and don't contend:

```
merchant_id hash % 16  ->  partition 0..15
worker 1 handles partitions 0-3
worker 2 handles partitions 4-7
...
```

**Watch for hot partitions.** If one merchant is 40% of your volume, hashing on `merchant_id` puts 40% of the load on one shard. You may need to split hot keys further (e.g. `merchant_id + hour`).

### 5. Add a queue (see Part 5)

### 6. Protect the database — it's usually the real ceiling

- **Read replicas** for read-heavy traffic (accepting replication lag — a user might not see their own write immediately; route reads-after-write to the primary)
- **Connection pool sizing** — remember, `(cores × 2) + disks`, not "as many as possible"
- **Caching** so the query never happens at all
- **Batch writes** instead of row-by-row
- **Indexes** — but note each index makes writes slower, so they're not free

### 7. Add isolation so failures don't cascade

- **Bulkheads** — separate resource pools per workload, so a batch job can't starve checkout. (Named after ship compartments: one floods, the ship stays afloat.)
- **Circuit breakers** — stop calling dead dependencies
- **Timeouts everywhere** — a call with no timeout is an outage waiting for a slow day
- **Rate limits** per client

### 8. Name the new bottleneck you created

This is what separates a senior answer:

*"Adding read replicas fixes read load but introduces replication lag, so reads-after-write need routing to the primary. Adding a queue smooths spikes but makes the operation asynchronous, so we need status endpoints. Sharding scales writes but makes cross-shard queries and transactions much harder."*

**Every fix has a cost. Naming it proves you've done this for real.**

---

## Part 7: The failure modes to be able to name

| Failure | What it is | Defence |
|---|---|---|
| **Partial failure** | You don't know if the request landed | Idempotency + retries |
| **Network partition** | Two halves of the system can't talk but both are alive | Decide C or A explicitly (see below) |
| **Split brain** | Both halves think they're the leader; both accept writes | Quorum, fencing tokens |
| **Cascading failure** | One service dies, its callers pile up, they die too | Circuit breakers, bulkheads, timeouts |
| **Thundering herd** | Everyone retries or refills a cache at the same instant | Jitter, request coalescing |
| **Retry storm** | Retries amplify load on a struggling service | Backoff, budgets, circuit breakers |
| **Hot partition** | One shard gets most of the traffic | Better shard key, split hot keys |
| **Clock skew** | Two servers disagree about the time by seconds | Never order events by wall clock — use logical clocks |
| **Slow dependency** | Worse than a dead one; ties up all your threads | Aggressive timeouts, circuit breakers |
| **Cache stampede** | A hot key expires and 10,000 requests hit the DB at once | Lock-on-miss, stale-while-revalidate, jittered TTLs |
| **Poison message** | One bad message blocks a whole queue forever | DLQ after N attempts |
| **Unbounded queue** | Overload becomes OOM instead of rejection | Bounded queues, backpressure |

### On clock skew, briefly

Never do this:

```java
if (eventA.timestamp < eventB.timestamp) { /* A happened first */ }
```

Two servers' clocks differ by milliseconds even with NTP. Under load, more. You will get the order wrong.

Use **logical clocks** — a monotonic sequence number, a Lamport clock, or a vector clock — anything where ordering is derived from causality rather than from a wall clock.

---

## Part 8: Consistency — what CAP actually says

CAP is the most-quoted and most-misunderstood idea in the field.

**CAP: Consistency, Availability, Partition tolerance — pick two.**

That framing is misleading, because in a real distributed system **partitions are not optional**. Networks fail. You don't get to "choose" P.

The honest statement:

> **When a network partition happens, you must choose between Consistency and Availability. The rest of the time you get both.**

Concretely: two data centres lose contact. A write arrives at DC1.

- **Choose C** — refuse the write, because you can't confirm DC2 agrees. Correct, but unavailable.
- **Choose A** — accept the write locally, reconcile later. Available, but DC2 now serves stale data.

For a bank balance, choose C. For a "likes" counter, choose A.

### PACELC — the more useful model

CAP only describes the partition case, which is rare. **PACELC** covers the other 99.9% of the time:

> **If Partitioned: choose A or C. Else: choose Latency or Consistency.**

That `ELSE` is the part that matters daily. Even with a healthy network, waiting for every replica to acknowledge a write is *slow*. So you trade:

- **Strong consistency** — every read sees the latest write. Slower.
- **Eventual consistency** — reads may be briefly stale. Faster.

### The consistency levels worth knowing

| Level | Guarantee | Typical use |
|---|---|---|
| **Strong / Linearizable** | Everyone sees the latest write immediately | Account balances, inventory |
| **Read-your-writes** | *You* see your own writes; others may lag | Profile edits, post creation |
| **Monotonic reads** | You never see time go backwards | Feeds, timelines |
| **Eventual** | All replicas converge... eventually | Like counts, view counts, analytics |

**Read-your-writes** is the one that quietly ruins user experience when you get it wrong: a user updates their profile, gets routed to a replica, sees the old value, and assumes your app is broken. Fix: route reads to the primary for a short window after a write, or pin them by session.

### How money systems get consistency without global transactions

You might think payments need distributed transactions everywhere. They mostly don't. The recipe:

1. **Strong consistency inside one database** — a single Postgres transaction is ACID, and most correctness lives there
2. **Idempotency across service boundaries** — so retries are safe
3. **Sagas instead of two-phase commit** across services — a sequence of local transactions, each with a **compensating** transaction to undo it if a later step fails
4. **Reconciliation** as the final backstop — compare your ledger against the provider's and the bank's, daily
5. **Immutable ledger** — never update a balance; append entries and sum them. Auditable, and much easier to reason about.

Why not two-phase commit (2PC)? Because it **blocks**. If the coordinator dies after "prepare" but before "commit," every participant sits holding locks, waiting, indefinitely. It doesn't scale and it makes availability worse.

---

## The 90-second answer to "how would you scale this?"

> *"First I'd measure to find the actual bottleneck — CPU, connections, an external dependency, or lock contention — because each has a different fix.*
>
> *Assuming it's throughput: make instances stateless so we can scale horizontally, then put a queue between ingestion and processing so spikes get absorbed rather than passed to the database. Partition work by merchant ID so workers don't contend, and watch for hot partitions from large merchants.*
>
> *Protect the database with right-sized pools — more connections actually reduce throughput past `(cores × 2)` — plus read replicas and caching. Add bulkheads so batch jobs can't starve checkout, circuit breakers so a dead dependency doesn't cascade, and bounded queues with load shedding so overload returns 503s instead of OOMing.*
>
> *Everything must be idempotent, because at-least-once delivery means duplicates are guaranteed, not hypothetical.*
>
> *The trade-offs: the queue makes the operation asynchronous, so we need status endpoints and webhooks. Replicas introduce lag, so reads-after-write route to the primary. And sharding makes cross-shard queries hard.*
>
> *At 100M transactions we'd also need reconciliation as a standing process, because at that volume the rare failure windows happen every single day."*

That last line is the truest thing in this post. **At scale, the one-in-a-million case happens a hundred times a day.** Every window you think is too small to matter — the crash between the API call and the database write, the duplicate delivery, the clock skew — is a daily event. Design as if it's already happening, because it is.
