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
