---
title: "What Is a 'Connection', Really? (Postgres, Kafka and Redis)"
excerpt: "An interviewer asked me three times what a database connection actually is. I couldn't answer. Here's the real answer — sockets, file descriptors, backend processes — plus how pooling works and why Kafka and Redis are completely different."
tags: ["databases", "kafka", "redis", "networking", "connection-pool"]
date: "2026-07-22"
author: "Aryansh Kurmi"
---

In an interview a director asked me: *"You said connection pooling. What **is** a connection?"*

I said something about a two-way handshake and an auth token. He asked again. I said something about data packets on a frequency. He asked a third time.

I never got it. Here's the answer.

---

## The trap in the question

The reason this question is hard isn't that it's obscure. It's that we use the word "connection" as if it were a single thing, when it's actually **three things existing at once, in three different places**.

Let's build it up properly.

---

## Part 1: In the operating system — it's a socket

At the lowest level, a connection between two machines over a network is a **TCP socket**.

**TCP** = *Transmission Control Protocol*. It's the agreement that makes a network reliable: data arrives in order, nothing is lost, and if a packet goes missing it's re-sent. Without TCP you just have packets flying about with no guarantees.

A TCP connection is uniquely identified by **four numbers**, called the **4-tuple**:

```
(client IP, client port, server IP, server port)
```

Example:

```
(10.0.1.55, 51234, 10.0.9.12, 5432)
 your app   random    the DB    Postgres's
 server     port      server    standard port
```

Change any one of those four and it's a different connection. That's how your server can hold 500 connections to the same database — 500 different client-side port numbers.

### What the kernel actually keeps

For each socket, your operating system's kernel maintains:

- A **send buffer** and a **receive buffer** — small chunks of memory where outgoing and incoming bytes queue up.
- The **TCP state machine** — currently in state `ESTABLISHED`.
- **Sequence numbers** so both sides can detect loss and reordering.
- A **window size** — flow control, i.e. "don't send me more than this much until I catch up."

### And in your program, it's just a number

Here's the part that surprises people.

Inside your process, that socket is a **file descriptor** — literally an integer. Your process has a table of open things (files, sockets, pipes), and the file descriptor is an index into it.

```
fd 0  -> standard input
fd 1  -> standard output
fd 2  -> standard error
fd 7  -> socket to Postgres
fd 8  -> socket to Redis
fd 9  -> socket to Kafka broker 1
```

In Unix, **everything is a file**, including a network connection. When you write to a socket, you're writing to a file descriptor and the kernel takes care of turning that into packets.

> This is why a busy server crashes with **"Too many open files."** You've hit the per-process file descriptor limit (`ulimit -n`). Each connection consumes one. Now the error message makes sense.

Two other real limits worth knowing:

- **Ephemeral ports.** The client side picks a random port for each outgoing connection, from a pool of roughly 28,000 by default on Linux. Open more than that to a single destination and you run out.
- **TIME_WAIT.** After you close a connection, its 4-tuple stays reserved for a couple of minutes so late-arriving packets don't confuse a new connection reusing the same tuple. Churn connections fast enough and you'll pile up tens of thousands of sockets in `TIME_WAIT`.

---

## Part 2: On the database server — it's an actual process

This is the piece that answers the question, and it's the piece I didn't know.

**In Postgres, every connection gets its own operating system process.**

The main Postgres process is called the **postmaster**. Its job is to sit and listen on port 5432. When a client connects, the postmaster **forks** — it creates a whole new OS process, called a **backend**, dedicated to that one client for its entire life.

That backend process has its own memory: work memory for sorting, temporary buffers, cached catalogue lookups. Realistically **5–10 MB each**.

Now several things suddenly make sense:

- **Why Postgres connections are expensive.** You're not opening a lightweight channel; you're making the server fork a process and allocate megabytes.
- **Why 10,000 connections will kill a Postgres box.** That's 10,000 processes for the OS scheduler to juggle and 50–100 GB of memory.
- **Why connection poolers like PgBouncer and RDS Proxy exist.** They sit in front and let thousands of clients share a few hundred real backends.
- **Why Lambda + RDS is a known trap.** 1,000 concurrent Lambda invocations each opening a connection means asking Postgres to fork 1,000 processes in a few seconds.

**MySQL does it differently** — a *thread* per connection rather than a process. Threads are cheaper, which is why MySQL tolerates higher connection counts. If you're asked to compare the two, this is a great answer.

---

## Part 3: The session — the state that lives in between

The third piece is **session state**: things that exist for as long as the connection does, on the server side.

- The authenticated identity (who you logged in as)
- The current transaction state (are you mid-transaction?)
- **Prepared statements** you've created
- **Temporary tables**
- Session settings (timezone, `search_path`, isolation level)
- Open cursors and advisory locks

This is why a connection is **stateful** and why you can't casually share one mid-transaction between two threads. If thread A is halfway through a transaction and thread B borrows the same connection and runs a query, B's query joins A's transaction. Chaos.

It's also why a connection pool must **reset** state before handing a connection to the next user.

---

## Putting it together: the one-paragraph answer

> **A database connection is a TCP socket — identified by a 4-tuple, held as a file descriptor in your process, with send/receive buffers in the kernel — plus, on the Postgres side, a dedicated forked backend process consuming 5–10 MB, plus the session state bound to both. It's not a token and it's not a channel; it's a socket and a process.**

---

## How expensive is it to open one?

Every step here is a network round trip or real CPU work:

```
1. TCP three-way handshake:   SYN  ->
                              <-  SYN-ACK
                              ACK  ->                  (1 round trip)

2. TLS handshake (if enabled): certificate exchange,
   asymmetric crypto                                   (1-2 round trips)

3. Postgres startup packet + authentication
   (SCRAM-SHA-256 is several messages)                 (2-3 round trips)

4. Server forks a backend process, warms catalogue caches

5. ReadyForQuery -> now you can finally send SQL
```

**Note:** it's a **three**-way handshake, not two. SYN, SYN-ACK, ACK. I said "two-way" in my interview and it's a small thing that signals you haven't looked closely.

Total cost: often **several milliseconds** — frequently longer than the query you wanted to run. Doing that per HTTP request would be absurd.

Which brings us to pooling.

---

## Connection pooling: what `close()` actually does

A **connection pool** opens N connections when your app starts and keeps them open forever. Your code borrows one, uses it, gives it back.

Here's the part that trips people up:

```java
try (Connection conn = dataSource.getConnection()) {   // "open"
    // ... run queries ...
}                                                       // "close"
```

**Neither of those lines touches the network.**

- `getConnection()` does **not** perform a TCP handshake. It hands you a connection that has been sitting open, possibly for hours.
- `close()` does **not** close the socket. The socket stays `ESTABLISHED` and the Postgres backend process stays alive.

### So what *is* the object you're given?

A **proxy** — a wrapper object around the real connection. In HikariCP (the standard Java pool) it's literally a class called `ProxyConnection`.

It implements the same `java.sql.Connection` interface, so your code can't tell the difference. But it **intercepts** `close()`. Instead of forwarding it to the driver, it:

1. Rolls back any transaction you left open
2. Resets session state — autocommit, isolation level, schema, read-only flag
3. Clears warnings
4. Puts the physical connection back in the pool's available set

So my instinct in the interview — *"the connection becomes free"* — was **right**. It doesn't get discarded; it goes back on the shelf.

Why reuse the word `close()` at all, if it doesn't close? Deliberate design: it keeps the standard JDBC contract, so try-with-resources and every existing library work unchanged.

### What else a pool does

- **Keep-alive** — pings idle connections so firewalls and NAT gateways don't silently kill them.
- **maxLifetime** — retires connections after e.g. 30 minutes and opens fresh ones, so you don't get surprised by a server-side timeout.
- **Validation on borrow** — checks the connection is still alive before handing it out.

---

## The exhaustion question: 1,000 requests, 100 connections

I was asked: *1,000 requests arrive. The pool has 100 connections. What happens to the other 900?*

I said they wait in the service layer and some might time out. Roughly right, but it misses the important part.

### Where they actually wait

Inside `getConnection()`, in the pool. HikariCP parks them with a **connectionTimeout** (default 30 seconds), after which it throws `SQLTransientConnectionException`. They are not queued fairly by default — it's roughly whoever grabs it first.

### Why this is a genuine outage, not just slowness

The threads that are blocking are your **HTTP request-handling threads** (Tomcat ships with 200).

```
1,000 requests -> 200 Tomcat threads pick up work
              -> 100 get DB connections
              -> 100 block in getConnection() for up to 30s
              -> new requests find no free Tomcat thread
              -> the whole app stops responding
              -> including /health
              -> the load balancer marks the instance dead
              -> traffic shifts to the other instances
              -> which now get overloaded too
              -> cascading failure
```

> **The sentence to say:** *"Connection pool exhaustion doesn't show up as slow queries — it shows up as a total outage, because blocked request threads take the whole service down with them."*

### The arithmetic: Little's Law

**Little's Law** is one formula worth carrying around:

```
throughput = concurrency / latency
```

100 connections, each query taking 10 ms:

```
100 / 0.010 s = 10,000 queries per second, maximum
```

If you need 20,000 QPS you must either halve latency or double connections. Doing this out loud turns a hand-wave into engineering.

### More connections is not the fix

Counterintuitive but true: past a certain point, **adding connections reduces throughput**. The database starts context-switching between processes and contending on its own internal locks. A rough starting formula:

```
pool size ≈ (CPU cores × 2) + number of disks
```

For a 4-core database server that's about 10 connections. Not 500.

> **The pool doesn't exist to make your app faster. It exists to protect the database from your app.**

### What actually helps

- **Fail fast** — a short `connectionTimeout` (1–2s) so requests die quickly instead of piling up
- **Backpressure** — reject excess load at the edge with `429`/`503` rather than queueing it
- **Bulkheads** — separate pools per workload so a batch job can't starve checkout traffic
- **Circuit breaker** — stop calling a dependency that's clearly down
- **Read replicas** for read-heavy traffic
- **Caching** so the query never reaches the DB
- **A proxy** (PgBouncer / RDS Proxy) in transaction mode, multiplexing many clients onto few backends

And a note for 2026: **virtual threads don't help here.** The bottleneck is connections, not threads. You just get more threads waiting.

---

## Now: Kafka and Redis are completely different

"Connection" means something different for each of these, and knowing the differences is genuinely useful.

### Redis: one socket, one queue, one thread

Redis is famously **single-threaded** for command execution. (Newer versions use threads for network I/O and background deletes, but commands still execute one at a time.)

That sounds like a weakness. It's actually the source of Redis's simplicity:

- **Every command is atomic** — nothing can interleave, because nothing runs concurrently
- No locks needed anywhere
- Operations are memory-speed, so a single thread manages millions of ops/sec

A Redis connection is a plain TCP socket speaking **RESP** (REdis Serialization Protocol) — a simple text protocol. `SET key value` is sent as a few lines of text.

Key differences from Postgres:

| | Postgres | Redis |
|---|---|---|
| Server-side cost | A forked process, 5–10 MB | A socket + small buffer, a few KB |
| Concurrency | Many backends in parallel | One command at a time |
| Connections you can hold | Hundreds | Tens of thousands |
| Session state | Heavy (transactions, temp tables, prepared statements) | Light (selected DB number, subscriptions) |

Because connections are cheap, Redis pools exist mainly to avoid handshake latency, not to protect the server.

Two Redis-specific gotchas:

- **Pipelining** — send many commands without waiting for each reply. Massive win, because you're paying one round trip instead of a hundred.
- **Blocking commands** (`BLPOP`, `SUBSCRIBE`) monopolise their connection. Never take those from a shared pool — give them a dedicated connection. Lettuce (the standard Java client) handles this by keeping pub/sub on separate connections.

### Kafka: not one connection, and not really pooled

Kafka breaks the model entirely.

A Kafka client doesn't hold "a connection." It holds **many connections — one per broker it needs to talk to** — and it manages them itself.

Here's roughly what happens when you create a `KafkaProducer`:

1. It connects to a **bootstrap server** just to ask "who's in this cluster?"
2. It gets back **metadata**: the list of brokers, the topics, the **partitions**, and which broker is the **leader** for each partition.
3. It then opens a connection to **each broker that leads a partition it writes to.**
4. It keeps those connections open and refreshes metadata periodically or when something moves.

Vocabulary:

- **Broker** — one Kafka server.
- **Topic** — a named stream of messages, e.g. `payments`.
- **Partition** — a topic is split into partitions for parallelism. Each partition is an ordered append-only log. Ordering is guaranteed *within* a partition, never across.
- **Leader** — the one broker responsible for reads and writes for a given partition. The others are followers replicating it.

**And crucially: you do not pool Kafka producers.**

`KafkaProducer` is thread-safe and designed to be shared. It has an internal **record accumulator** — it batches your messages in memory (`batch.size`, `linger.ms`) and a background I/O thread ships them out. Creating one producer per request destroys the batching and is a classic performance bug.

> **One producer per application. Share it across all threads. This is a singleton by design.**

Consumers are the opposite: **`KafkaConsumer` is NOT thread-safe.** One consumer per thread, and each consumer belongs to a **consumer group**, with partitions distributed among group members. Two threads sharing one consumer will throw `ConcurrentModificationException`.

---

## Singletons for all three

Since you only ever want one of these per application, here's how to actually do it. (There's a whole separate post on *why* this pattern works — this is the practical version.)

### Postgres / JDBC

```java
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.sql.SQLException;

public final class Database {

    // Created once, when the class is first loaded.
    // The JVM guarantees this happens exactly once, thread-safely.
    private static final Database INSTANCE = new Database();

    private final HikariDataSource dataSource;

    private Database() {                       // private -> nobody else can construct one
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        config.setUsername(System.getenv("DB_USER"));
        config.setPassword(System.getenv("DB_PASSWORD"));

        config.setMaximumPoolSize(20);         // remember: (cores * 2) + disks
        config.setMinimumIdle(5);
        config.setConnectionTimeout(2_000);    // fail fast, don't pile up
        config.setIdleTimeout(300_000);        // 5 min
        config.setMaxLifetime(1_800_000);      // 30 min - recycle before the server does
        config.setLeakDetectionThreshold(60_000); // warn if a connection is held > 60s

        this.dataSource = new HikariDataSource(config);

        Runtime.getRuntime().addShutdownHook(new Thread(dataSource::close));
    }

    public static Database getInstance() {
        return INSTANCE;                       // can never be null. see below.
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();     // borrow from the pool
    }
}
```

Usage:

```java
try (Connection conn = Database.getInstance().getConnection();
     PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE id = ?")) {
    ps.setLong(1, 42);
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            System.out.println(rs.getString("name"));
        }
    }
}
// close() here returns the connection to the pool. The socket stays open.
```

### Redis (Lettuce)

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;

public final class RedisManager {

    private static final RedisManager INSTANCE = new RedisManager();

    private final RedisClient client;
    private final StatefulRedisConnection<String, String> connection;

    private RedisManager() {
        RedisURI uri = RedisURI.builder()
                .withHost(System.getenv("REDIS_HOST"))
                .withPort(6379)
                .withPassword(System.getenv("REDIS_PASSWORD").toCharArray())
                .withTimeout(java.time.Duration.ofSeconds(2))
                .build();

        this.client = RedisClient.create(uri);

        // Lettuce connections ARE thread-safe (built on Netty).
        // A single connection multiplexes commands from many threads.
        // This is why Redis usually needs no pool at all.
        this.connection = client.connect();

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            connection.close();
            client.shutdown();
        }));
    }

    public static RedisManager getInstance() {
        return INSTANCE;
    }

    public RedisCommands<String, String> sync() {
        return connection.sync();
    }
}
```

Usage:

```java
RedisCommands<String, String> redis = RedisManager.getInstance().sync();

redis.setex("user:42:profile", 300, jsonPayload);   // cache for 5 minutes
String cached = redis.get("user:42:profile");
```

> **Note the difference from JDBC:** with Lettuce you don't borrow and return. One connection is shared by every thread, because Netty multiplexes them. Postgres can't do that — its connections are stateful and single-threaded per backend.

### Kafka producer

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import java.util.Properties;

public final class KafkaProducerManager {

    private static final KafkaProducerManager INSTANCE = new KafkaProducerManager();

    private final KafkaProducer<String, String> producer;

    private KafkaProducerManager() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, System.getenv("KAFKA_BROKERS"));
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        // "all" = wait for every in-sync replica. Slower, but no data loss.
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        // The producer will not write the same record twice on retry.
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);

        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

        // Batching: wait up to 10ms to fill a 32KB batch. This is the whole
        // reason you must NOT create a producer per request.
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32 * 1024);
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "snappy");

        this.producer = new KafkaProducer<>(props);

        // flush() waits for buffered records to actually be sent.
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            producer.flush();
            producer.close();
        }));
    }

    public static KafkaProducerManager getInstance() {
        return INSTANCE;
    }

    public void send(String topic, String key, String value) {
        // key determines the partition -> same key always same partition
        // -> ordering guaranteed per key
        producer.send(new ProducerRecord<>(topic, key, value), (metadata, ex) -> {
            if (ex != null) {
                System.err.println("Kafka send failed: " + ex.getMessage());
            }
        });
    }
}
```

Usage:

```java
// merchantId as key -> all events for one merchant land in one partition,
// so they stay in order relative to each other
KafkaProducerManager.getInstance()
    .send("settlements", merchantId, settlementEventJson);
```

### And in Node.js, you don't need any of this

If you're on Node/Express, the module system already gives you a singleton. `import`/`require` caches the resolved module, so this file returns the same object every time:

```javascript
// db.js
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DB_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

export default pool;   // one instance per process, guaranteed by the module cache
```

```javascript
// anywhere.js
import pool from './db.js';
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [42]);
```

No pattern needed. Knowing *why* is better than porting Java idioms across.

---

## Summary

| Question | Answer |
|---|---|
| What is a connection? | A TCP socket (4-tuple, file descriptor, kernel buffers) + a server-side process/thread + session state |
| Why pool them? | Opening one costs several milliseconds and, in Postgres, a forked process |
| What does `close()` do in a pool? | Rolls back, resets session state, returns it to the pool. The socket stays open. |
| What if the pool runs out? | Threads block in `getConnection()`, HTTP threads exhaust, the whole service goes down |
| Should I raise the pool size? | Usually no. Beyond `(cores × 2) + disks` you make things worse. |
| Redis connections? | Cheap, single-threaded server, one shared multiplexed connection is fine |
| Kafka connections? | One per broker, managed by the client. One shared producer per app. Consumers are one per thread. |

The habit worth building: for every word you say in an interview, be ready with **what the layer beneath it is doing**. "Connection" is a great example — everyone says it, almost nobody can open it up.
