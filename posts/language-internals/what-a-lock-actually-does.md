---
title: "What Does `lock.lock()` Actually Do? (All the Way Down to the CPU)"
excerpt: "An interviewer asked what the lock function compiles into — 'ultimately, what zeros and ones?' I had no answer. Here's the whole chain: ReentrantLock, AQS, CAS, cache coherence, and futexes."
tags: ["java", "concurrency", "jvm", "cpu", "interviews"]
date: "2026-07-16"
author: "Aryansh Kurmi"
---

The question that ended one of my interviews:

> *"You said lock. We call `lock.lock()`, then `lock.unlock()` in a finally block. What does that function **do**? Ultimately, what is it getting compiled into — what zeros and ones?"*

I mumbled something about mutexes and `malloc`. (`malloc` is memory allocation. It has nothing to do with locking. That was a bad moment.)

Here is the actual answer, built from the top down. By the end you'll be able to trace `lock()` from Java source to a single CPU instruction.

---

## Layer 0: Why locks exist at all

Two threads run this:

```java
counter++;
```

Looks like one operation. It's three:

```
1. READ  counter from memory into a CPU register
2. ADD   1 to the register
3. WRITE the register back to memory
```

Two threads can interleave:

```
Thread A: READ counter (0)
Thread B: READ counter (0)          <- both see 0
Thread A: ADD -> 1
Thread B: ADD -> 1
Thread A: WRITE 1
Thread B: WRITE 1                   <- one increment vanished
```

Two increments, final value 1. This is a **race condition** — the result depends on timing.

A **lock** makes a block of code **mutually exclusive**: only one thread inside at a time.

```java
private final ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    counter++;
} finally {
    lock.unlock();      // ALWAYS in finally, or an exception leaks the lock forever
}
```

Now, the chain.

---

## Layer 1: `ReentrantLock` is a thin shell

Open the JDK source for `ReentrantLock` and it barely does anything. All the work lives in an inner class extending **`AbstractQueuedSynchronizer`** — **AQS**.

AQS is the engine behind almost all of `java.util.concurrent`: `ReentrantLock`, `ReadWriteLock`, `Semaphore`, `CountDownLatch`, `FutureTask`. Learn AQS once, understand all of them.

AQS holds exactly two things that matter:

```java
private volatile int state;              // 0 = free, N = held with N reentries
private transient Thread exclusiveOwnerThread;   // who holds it
```

**That's the lock.** A lock is not a magic object. It is **an integer, plus a thread reference, plus rules about how you're allowed to change that integer.**

### What "reentrant" means

If a thread already holding the lock tries to acquire it again, it succeeds and bumps a counter:

```java
lock.lock();        // state: 0 -> 1
doSomething();      // which internally calls...
    lock.lock();    // state: 1 -> 2   (same thread — allowed!)
    // ...
    lock.unlock();  // state: 2 -> 1
lock.unlock();      // state: 1 -> 0   NOW it's actually released
```

Without reentrancy, a synchronised method calling another synchronised method on the same object would **deadlock against itself**. The counter is why it doesn't.

---

## Layer 2: The fast path is a compare-and-swap

When you call `lock()`, the first thing tried is:

```java
compareAndSetState(0, 1)
```

Read as: *"If `state` is currently 0, atomically set it to 1, and tell me whether I won."*

This is **CAS — Compare-And-Swap**. It's the fundamental primitive of all lock-free programming.

```
CAS(memory_location, expected_value, new_value):
    atomically:
        if (*memory_location == expected_value):
            *memory_location = new_value
            return true
        else:
            return false
```

The word **atomically** is doing all the work. No other core can observe or interfere with the halfway point. It's indivisible.

If CAS succeeds → this thread owns the lock, sets `exclusiveOwnerThread = currentThread`, and returns. Done.

> **An uncontended lock never enters the operating system and costs roughly 20 nanoseconds.** People assume locks are always expensive. Uncontended, they're nearly free.

---

## Layer 3: What CAS compiles into — the zeros and ones

Follow the call chain down:

```
lock.lock()
  -> Sync.acquire(1)                     [AQS]
  -> compareAndSetState(0, 1)            [AQS]
  -> STATE.compareAndSet(this, 0, 1)     [VarHandle; older JDKs: Unsafe.compareAndSwapInt]
  -> ...JIT compiler replaces this with an INTRINSIC...
  -> ONE CPU INSTRUCTION
```

An **intrinsic** is a method the JIT compiler recognises by name and replaces with hand-written machine code instead of compiling the Java body. `Math.min`, `System.arraycopy`, and CAS are all intrinsics.

The instruction it becomes:

**On x86-64 (Intel/AMD):**

```asm
lock cmpxchg %ecx, (%rdi)
```

- `cmpxchg` = **compare and exchange**
- `lock` = a **prefix** making it atomic across all cores

**On ARM64 (Apple Silicon, Graviton):**

```asm
retry:
    ldaxr  w0, [x1]        ; Load-Acquire eXclusive Register
    cmp    w0, w2          ; does it match what we expected?
    b.ne   fail
    stlxr  w3, w4, [x1]    ; STore-reLease eXclusive Register
    cbnz   w3, retry       ; if the store failed, someone else touched it — retry
```

ARM uses a load-exclusive / store-exclusive pair: mark the address as watched, and if anyone else touched it before your store, the store fails and you loop. (ARMv8.1 added a single `CASAL` instruction.)

> **This is the answer to his question.** There is no lock "function" doing the work in the fast path. The primitive is **one atomic machine instruction**. Everything above it is bookkeeping for when that instruction fails.

---

## Layer 4: How the hardware makes it atomic

Follow-up worth being ready for: *"But how can one instruction be atomic across eight cores?"*

The old answer was "it locks the memory bus." That was true in the 1990s and would be catastrophic today.

Modern CPUs use the **cache coherence protocol**, usually **MESI**. Every cache line (a 64-byte chunk of memory) sits in one of four states on each core:

| State | Meaning |
|---|---|
| **M**odified | I have it, I've changed it, nobody else has a copy |
| **E**xclusive | I have it, unchanged, nobody else has a copy |
| **S**hared | I have it, others may too, nobody has changed it |
| **I**nvalid | My copy is stale, don't use it |

To execute `lock cmpxchg`, the core must first get that cache line into **Exclusive** or **Modified** state — which means **sending invalidation messages to every other core** and waiting for acknowledgements. Only then does it perform the read-modify-write, holding the line for those few nanoseconds.

Any other core trying the same address must first re-acquire the line, which it can't do until the first core lets go. That's the atomicity — enforced by cache coherence traffic, not by locking a bus.

(The full bus lock only happens in one rare case: when the operand straddles two cache lines.)

### Why this explains false sharing

Coherence works on **whole 64-byte lines**, not individual variables. So:

```java
class Counters {
    volatile long a;    // thread 1 writes only this
    volatile long b;    // thread 2 writes only this
}
```

`a` and `b` are 8 bytes each and almost certainly share one cache line. Even though the threads touch different variables, **every write by thread 1 invalidates thread 2's cache line**, and vice versa. The cores ping-pong the line back and forth.

This is **false sharing**. It can slow code by 10x with no visible contention anywhere in your source. The fix is padding — `@Contended`, or dummy fields — so each hot variable owns its own line.

---

## Layer 5: The contended path — when CAS fails

If another thread already holds the lock, the CAS fails. Now what?

Spinning forever wastes CPU. So AQS does something smarter:

### Step 1: join the queue

The thread creates a node for itself and appends it to AQS's **CLH queue** — a FIFO (first-in-first-out) linked list of waiting threads. (Appending is itself done with a CAS on the tail pointer — lock-free.)

### Step 2: spin briefly

If your node is next in line, spin a few times. The lock might free up in nanoseconds, and spinning beats a context switch.

### Step 3: park

If the lock still isn't available, call:

```java
LockSupport.park(this);
```

Which goes:

```
LockSupport.park()
  -> Unsafe.park()
  -> JVM native code
  -> on Linux: futex(FUTEX_WAIT) syscall
  -> the KERNEL removes the thread from the run queue
```

**futex** = *Fast Userspace muTEX*. The clever part of its design: the fast path stays in userspace, and it only enters the kernel when it genuinely has to sleep.

A parked thread consumes **zero CPU**. The kernel scheduler simply won't schedule it until someone wakes it.

### The cost

| Path | Cost | Notes |
|---|---|---|
| Uncontended CAS | ~20 ns | Never leaves userspace |
| Park + unpark | ~1–2 µs | Two context switches, kernel involvement |

That's roughly **100x**. This is why lock contention destroys throughput — not because locking is expensive, but because *contended* locking is expensive.

It's also why the practical advice is always the same: **hold locks for as short a time as possible**, and never do I/O inside one.

---

## Layer 6: `unlock()` — and the half everyone forgets

```java
protected final boolean tryRelease(int releases) {
    int c = getState() - releases;
    if (c == 0) {
        setExclusiveOwnerThread(null);
        setState(0);              // <- a volatile write. This is the important line.
        return true;
    }
    setState(c);
    return false;
}
```

Then `unparkSuccessor()` → `LockSupport.unpark(nextThread)` → `futex(FUTEX_WAKE)` → the kernel makes that thread runnable again.

### The part almost nobody mentions

`state` is `volatile`. Writing to it is a **release barrier** — a memory fence.

On x86 that compiles to a plain `MOV` followed by a `lock`-prefixed dummy operation (typically `lock addl $0, (%rsp)`) whose only job is to **drain the store buffer**.

The **store buffer** is a small queue inside each CPU core. Writes go there first and drain to cache later, so the core doesn't stall. Great for speed — but it means a write by core 1 might not be visible to core 2 for a while.

So when you write inside a critical section:

```java
lock.lock();
try {
    sharedData.value = 42;      // might still be sitting in the store buffer
} finally {
    lock.unlock();              // <- the release barrier FORCES it out
}
```

The unlock guarantees that everything you wrote before it is visible to whoever acquires the lock next.

### The punchline

> **A lock is not just mutual exclusion. It is a memory visibility contract.**

- `lock()` is an **acquire barrier**: reads after it can't be moved before it.
- `unlock()` is a **release barrier**: writes before it can't be moved after it, and are flushed.
- Together they create a **happens-before** edge in the Java Memory Model.

Without that, you could have perfect mutual exclusion and *still* have broken code, because thread B keeps reading a stale cached value forever.

Say this in an interview and the question is over.

---

## Bonus: how `synchronized` differs

```java
synchronized (obj) { ... }
```

compiles to two bytecodes: `monitorenter` and `monitorexit`.

Instead of an AQS object, it uses the **mark word** — a header field present on **every** Java object (part of the 12–16 byte object header, alongside the class pointer):

```
Object layout:
  [ mark word (8 bytes) ][ class pointer (4-8) ][ fields... ][ padding ]
     ^-- lock state, hash code, GC age all packed in here
```

Under low contention the JVM uses a **thin lock**: CAS a pointer to a stack-allocated lock record into the mark word. Cheap.

Under real contention it **inflates** to a heavyweight `ObjectMonitor` in native memory, with wait queues. Expensive, and irreversible for that object.

(**Biased locking**, which optimised the single-threaded-repeat case, was deprecated in JDK 15 and removed in JDK 18 — it complicated the JVM more than it helped modern workloads.)

### Which should you use?

| | `synchronized` | `ReentrantLock` |
|---|---|---|
| Release | Automatic (even on exception) | You must call `unlock()` in `finally` |
| Try without blocking | No | `tryLock()`, `tryLock(timeout)` |
| Interruptible wait | No | `lockInterruptibly()` |
| Fairness option | No | `new ReentrantLock(true)` |
| Wait sets | One | Many, via `newCondition()` |
| Lock across methods | No | Yes |
| Readability | Better | Worse |

**Default to `synchronized`.** Reach for `ReentrantLock` when you need `tryLock`, a timeout, interruptibility, fairness, or multiple conditions.

`tryLock` with a timeout is the most underrated of these — it turns a potential deadlock into a recoverable failure:

```java
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try { doWork(); } finally { lock.unlock(); }
} else {
    return Response.status(503).build();     // shed load instead of hanging
}
```

---

## `ReadWriteLock`: when one lock isn't enough

```java
ReadWriteLock rw = new ReentrantReadWriteLock();
rw.readLock().lock();     // MANY threads can hold this at once
rw.writeLock().lock();    // only ONE, and it excludes all readers
```

The rule: **N readers, OR 1 writer. Never both.**

Use it when reads massively outnumber writes and the critical section is long enough to be worth it — a config cache, a routing table, a rules map. Under a plain lock, readers queue for no reason.

Don't use it when the read/write ratio is balanced, or the section is very short: the extra bookkeeping costs more than the concurrency gains.

Two details that show depth:

- **Downgrading is legal, upgrading is not.** You may acquire write → acquire read → release write. Going read → write **deadlocks**: you're waiting for all readers to leave, and you are one of them.
- **Writer starvation.** In non-fair mode, continuous read traffic can starve a writer indefinitely. Use the fair constructor, or use `StampedLock` (Java 8), which supports *optimistic reads* that take no lock at all — you read, then validate the stamp, and only fall back to a real lock if a write intervened. Much faster for read-heavy work. Caveat: `StampedLock` is **not reentrant**.

---

## The critical correction: locks do NOT give you idempotency

I once claimed a `ReentrantLock` made a payment pipeline idempotent and retry-safe. That's wrong, and it's worth stating plainly:

> **A `ReentrantLock` protects a critical section inside one JVM process. That's all.**

- Run two pods? The lock in pod A means nothing to pod B. Both process the same payment.
- Process crashes mid-work? The lock dies with the process. The half-finished database state survives.
- Message redelivered an hour later? The lock has no memory of anything.

Idempotency is a **persistence-layer** property. It comes from:

- A **unique constraint** on an idempotency key in the database
- A **conditional update**: `UPDATE ... SET status='PROCESSING' WHERE id=? AND status='PENDING'` — if zero rows changed, someone else has it. That's a compare-and-swap in SQL.
- **`SELECT ... FOR UPDATE SKIP LOCKED`** to claim work across many workers
- A **distributed lock** (Redis with a fencing token, ZooKeeper) when the resource isn't in one database

**Locks reduce contention. Databases provide correctness.** Confusing the two is the most expensive mistake in this whole area.

---

## The chain, end to end

```
lock.lock()
  └─ AQS: compareAndSetState(0, 1)
       └─ VarHandle.compareAndSet  →  JIT intrinsic
            └─ CPU: `lock cmpxchg` (x86) / `ldaxr`+`stlxr` (ARM)
                 └─ MESI cache coherence acquires the line exclusively
                      ├─ SUCCESS → own the lock (~20 ns, never leaves userspace)
                      └─ FAIL    → append node to CLH FIFO queue
                                   → spin briefly
                                   → LockSupport.park()
                                        → futex(FUTEX_WAIT)
                                             → kernel deschedules the thread

lock.unlock()
  └─ state = 0  (volatile write = release barrier, drains store buffer)
       └─ LockSupport.unpark(next)
            └─ futex(FUTEX_WAKE)
                 └─ kernel makes the thread runnable
```

**And the sentence that ties it together:** *a lock is an integer guarded by an atomic CPU instruction, with a queue and a kernel sleep for when that instruction fails — and a memory barrier that makes your writes visible to whoever comes next.*
