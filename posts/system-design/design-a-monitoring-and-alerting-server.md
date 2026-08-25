---
title: "Design a Monitoring & Alerting Server — Low Level Design"
excerpt: "An 18-line Java skeleton with one TODO: poll every server every interval and store its stats. It looks like a loop and a sleep. It is actually a question about drift, head-of-line blocking, failure isolation and unbounded hangs — and on Java 21, about whether you still need a thread pool at all. The full design, then how it scales to a million targets."
date: "2026-08-20"
tags: ["system-design", "low-level-design", "concurrency", "java", "monitoring", "observability", "interview", "scheduling"]
author: "Aryansh Kurmi"
---

# Design a Monitoring & Alerting Server — Low Level Design

The prompt is eighteen lines of Java and a single `// TODO: implement me!`. That's the whole question.

```java
public interface Server {
    Stats getStats();
}

public interface StatsDatabase {
    void write(Server server, Stats stat);
}

public class MonitoringServer {
    List<Server> servers;
    StatsDatabase database;
    long pollIntervalSec;
    // anything else you want

    public void monitor() {
        // TODO: implement me!
    }
}
```

You're building the thing that watches everything else: a fleet of URIs, database clients, EC2 instances, load balancer endpoints — anything with a heartbeat. Every `pollIntervalSec`, ask each one for its stats and write them down.

It reads like a `for` loop and a `Thread.sleep`. It isn't. `// anything else you want` is the interviewer telling you the fields you've been handed are deliberately not enough, and the entire round is about what you add.

Here's the full design — what to say, what to write, and where the follow-ups go.

---

## 📋 Pin the requirements first

Don't start typing. Two minutes writing requirements buys you the whole rest of the round, because every one of these becomes a design decision you get credit for later.

**Functional requirements**

- Poll every `Server` in `servers`, every `pollIntervalSec`
- Each poll: call `getStats()`, then `database.write(server, stats)`
- **Cadence must not drift** over time
- One slow or hung server must **not delay or block** the others
- A failing `getStats()` must **not kill the loop**
- **No overlapping polls** of the same server
- `monitor()` starts it; something must be able to stop it

That fourth and sixth bullet are the ones candidates miss, and they're the ones the follow-ups live in.

---

## 🎯 State your assumptions out loud

The interfaces are opaque on purpose — `Stats` has no methods shown, `getStats()` has no contract. Don't ask four questions about it. State what you're assuming and move; if an assumption is wrong the interviewer will stop you, and that costs three seconds.

> **Say this:** "The interfaces are opaque, so let me state my assumptions rather than ask — stop me if any are wrong."

- `getStats()` is a **blocking network call**. It can be slow, and it can hang.
- `database.write()` can **also block** — it's a network hop too.
- **N may be large.** Hundreds now, and the design should survive thousands.
- `Stats` is an **opaque value object**. I don't need to look inside it.

The first assumption is the load-bearing one. Everything interesting in this problem follows from "the call can hang."

---

## 🧱 The shape before the code

Sketch the class before you implement anything. You're adding three fields to that `// anything else you want` comment:

```
class MonitoringServer
  - List<Server> servers            // given
  - StatsDatabase database          // given
  - long pollIntervalSec            // given

  - ScheduledExecutorService scheduler   // fires the tick
  - ExecutorService workers              // does the blocking calls
  - Set<Server> inFlight                 // guards against overlap

  + monitor()
  + stop()
  - pollAll()
  - pollOne(Server)
```

Three additions, one job each: **something that keeps time**, **something that does work**, and **something that remembers what's already running**. Say that sentence out loud — it's the design in one line, and the rest is just filling it in.

---

## 🐌 Write the naive version on purpose

Put the obvious answer on the board before the good one. It costs thirty seconds and it frames everything after it as an improvement rather than a first draft.

```java
// NAIVE — do not ship
public void monitor() throws InterruptedException {
    while (true) {
        for (Server s : servers) {
            Stats st = s.getStats();
            database.write(s, st);
        }
        Thread.sleep(pollIntervalSec * 1000);
    }
}
```

> **Say this:** "That's the shape of the answer, and it's wrong in three specific ways. Let me go through them, because each one points at a piece of the real design."

---

## 💥 Why the naive version breaks

**1. It's sequential, so a cycle costs the sum of every latency.**

With 100 servers averaging 50ms, one full pass is 5 seconds. Your poll interval is 1 second. You have already lost, and you lose worse every time someone adds a server. The cycle time is `Σ latency(i)`, and it grows linearly with the fleet.

**2. One hung server freezes every server behind it.**

This is **head-of-line blocking**. `getStats()` on server #7 hangs for 30 seconds, and servers #8 through #100 simply don't get monitored for 30 seconds. The failure mode is the exact opposite of what a monitoring system is for: the one moment something is wrong is the moment you go blind.

**3. The sleep is after the work, so the period drifts.**

The real period is `pollIntervalSec + workTime`, not `pollIntervalSec`. Every cycle you fall a little further behind, and the drift accumulates forever. After an hour your "1-second" samples are landing wherever they land, which quietly wrecks any rate calculation done on top of them downstream.

> **The insight to state:** all three problems come from one mistake — the thing that keeps time is also the thing that does the work. Separate them and all three go away.

---

## ⏱️ Split the clock from the workers

So: a cheap **tick** that only dispatches, and a pool of threads that make the actual blocking calls.

```java
public void monitor() {
    scheduler = Executors.newSingleThreadScheduledExecutor();
    workers   = Executors.newFixedThreadPool(32);
    inFlight  = ConcurrentHashMap.newKeySet();

    scheduler.scheduleAtFixedRate(
        this::pollAll,
        0,                      // no initial delay
        pollIntervalSec,
        TimeUnit.SECONDS
    );
}
```

**The key trick:** `pollAll` never blocks. It submits one task per server and returns. The single scheduler thread finishes a tick in microseconds, so the cadence stays at exactly `pollIntervalSec` no matter how slow the servers are.

That's the whole design. Everything below is hardening.

---

## 📐 `scheduleAtFixedRate` vs `scheduleWithFixedDelay`

Expect to be asked why you picked one. Know the difference cold:

| | Measures from | Period |
|---|---|---|
| `scheduleAtFixedRate` | **start** of the previous run | Fixed — `t=0, 1, 2, 3…` regardless of how long the task takes |
| `scheduleWithFixedDelay` | **end** of the previous run | Drifts — `runtime + delay` each cycle |

`scheduleWithFixedDelay` is the naive `sleep` with better manners; it has the same drift bug. You want `scheduleAtFixedRate` because you want samples on a real timeline.

**The catch, and say it before they ask:** if a run of the task overruns the period, `scheduleAtFixedRate` doesn't run them concurrently — it queues the next one to start immediately after, and ticks pile up behind each other. That would be a real risk here, except it isn't, precisely *because* `pollAll` is non-blocking. Pointing out the hazard and then explaining why your design is immune to it is worth more than either half alone.

> **⚠️ The gotcha almost nobody mentions:** if the scheduled task throws an uncaught exception, `scheduleAtFixedRate` **silently cancels the schedule forever**. No error, no restart — your monitor just quietly stops monitoring. That is a catastrophic failure mode for this system specifically. `pollAll` must never let an exception escape.

---

## 📤 `pollAll` — dispatch and get out

```java
void pollAll() {
    try {
        for (Server s : servers) {
            // skip if a prior poll of this server is still running
            if (!inFlight.add(s)) {
                continue;
            }
            workers.submit(() -> pollOne(s));
        }
    } catch (Throwable t) {
        // MUST NOT escape — an uncaught throw here permanently
        // cancels the scheduled task and the monitor dies silently
        log.error("pollAll tick failed", t);
    }
}
```

The loop does no I/O. It touches a concurrent set and hands work to a pool. On a fleet of 10,000 servers this is still microseconds.

---

## 🔒 The overlap guard

`inFlight.add(s)` returning `false` is the guard against overlapping polls, and it's the detail that separates a working answer from a good one.

Without it: server #7 takes 4 seconds to respond, your interval is 1 second, so by second 4 you have **four concurrent polls in flight against the same struggling server**. You're now DDoSing the thing you're supposed to be monitoring, and you're burning four pool threads on one target. As more servers degrade, the pool saturates and healthy servers stop getting polled. That's a self-inflicted cascading failure.

With it: a slow server gets skipped this tick and becomes eligible again the moment its previous poll finishes. Load stays bounded at one outstanding call per server, and you get a free signal — a server that's frequently skipped is a server that's degrading.

`ConcurrentHashMap.newKeySet()` gives you the atomic test-and-set. `add` returning `false` means "someone's already got it" in a single operation, with no lock and no check-then-act race.

> **Note the identity assumption:** `Set<Server>` uses `equals`/`hashCode`. If `Server` implementations don't override them, this is identity-based — which is what you want here, and worth saying out loud so it's clearly a decision and not an accident.

---

## 🛡️ `pollOne` — isolate every failure

```java
void pollOne(Server s) {
    try {
        Stats st = s.getStats();
        database.write(s, st);
    } catch (Exception e) {
        // log + raise alert; do NOT rethrow
        alerting.raise(s, e);
    } finally {
        inFlight.remove(s);   // always, even on failure
    }
}
```

Two lines carry the weight:

- **The `catch`** means one bad server produces an alert instead of a dead monitor. Note that a server failing to respond isn't an error to swallow — in a monitoring system it's *the actual product*. A failed poll should raise an alert, not just log.
- **The `finally`** guarantees `inFlight` is cleared even when the call throws. Miss this and a server that errors once is never polled again — a permanent, silent blind spot that gets worse every time any server has a bad minute. This is the single easiest bug to write in this problem.

---

## ⏳ The question they always ask: what if `getStats()` never returns?

In the version above, that worker thread is stuck forever.

Be honest about the partial mitigation before you fix it: it's **self-limiting**, because `inFlight` stops you from re-polling that server — so one hung target costs you exactly one thread, not a thread per second. But it burns that thread permanently, and enough hung servers exhaust the pool and take down monitoring for everything.

**The clean answer:** a network client should carry its own connect and read timeout, so `getStats()` *cannot* hang unbounded. Fix it at the source.

**If you can't rely on that**, enforce the timeout yourself with a second pool:

```java
ExecutorService calls = Executors.newFixedThreadPool(32);
long timeoutMs = 500;

void pollOne(Server s) {
    Future<Stats> f = calls.submit(s::getStats);
    try {
        Stats st = f.get(timeoutMs, TimeUnit.MILLISECONDS);
        database.write(s, st);
    } catch (TimeoutException e) {
        f.cancel(true);
        alerting.raise(s, "unresponsive");
    } catch (Exception e) {
        alerting.raise(s, "poll failed");
    } finally {
        inFlight.remove(s);
    }
}
```

`pollOne` runs on `workers`, the actual `getStats()` runs on `calls`, and `f.get(timeout)` releases your worker after 500ms regardless of what the target is doing.

**Set the timeout below the interval.** With a 1-second poll interval, a 500ms timeout means a poll can never outlive its own tick. If your timeout exceeds your interval, you've reintroduced the overlap problem the long way around.

---

## 🚩 The caveat to volunteer

Say this before they catch it — volunteering the weakness in your own design is worth more than the design:

> `cancel(true)` interrupts the thread, but interruption is **cooperative**. If `getStats()` is blocked on a socket read that doesn't respond to interrupts, the underlying thread keeps sitting there. I've freed my *worker*, but the *call* thread can still leak.

Which is exactly why the client-side socket timeout is the better fix, and why this second-pool approach is a workaround rather than a solution. You've now traded "worker pool exhausts" for "call pool exhausts more slowly" — real progress, not a cure.
