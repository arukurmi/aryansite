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
