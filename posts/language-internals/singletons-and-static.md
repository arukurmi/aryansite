---
title: "Singletons, `static`, and the Question I Failed"
excerpt: "Write me a database singleton that can never be null. I couldn't. Here's the answer, and everything about the static keyword that makes it work."
tags: ["java", "design-patterns", "jvm", "interviews"]
date: "2026-07-28"
author: "Aryansh Kurmi"
---

An interviewer asked me: *"Write a singleton database class. When my server starts, there must be exactly one instance. The very first request must never find it null."*

I offered double-checked locking. He wasn't happy. He asked again. I still didn't get there.

The frustrating part is that the answer is **shorter** than what I tried to write.

---

## What a singleton is (and why we want one)

A **singleton** is a class where exactly one instance exists for the whole application, and everyone shares it.

You don't want a singleton for a `User` or an `Order` — you want thousands of those. You want a singleton for things that are **expensive to create and safe to share**:

- A database connection pool (opening connections costs milliseconds each)
- A Kafka producer (it batches internally — creating one per request destroys batching)
- A Redis client
- A config object read from disk at startup
- A metrics registry
- A thread pool

The common thread: *one expensive resource, shared by everything.*

---

## The four ways to do it in Java

### Way 1: Eager static initialisation — **this is the answer he wanted**

```java
public final class Database {

    private static final Database INSTANCE = new Database();

    private final HikariDataSource dataSource;

    private Database() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        config.setMaximumPoolSize(20);
        this.dataSource = new HikariDataSource(config);
    }

    public static Database getInstance() {
        return INSTANCE;
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}
```

That's it. Four things make it work:

1. **`private` constructor** — nobody outside the class can call `new Database()`.
2. **`static`** — the field belongs to the class, not to any instance. One copy.
3. **`final`** — it can only be assigned once, and never reassigned.
4. **Initialised at the declaration** — so it's created when the class is loaded, before anyone can call `getInstance()`.

No `synchronized`. No `volatile`. No null check. **And `getInstance()` can never, ever return null** — which was exactly his requirement.

To understand *why* it's safe, we need to look at what `static` actually does.

---

## What the JVM does with `static` (this is the interesting part)

### Every class has a hidden method called `<clinit>`

When you write this:

```java
public class Config {
    static int retries = 3;
    static String region;

    static {                          // "static initializer block"
        region = System.getenv("AWS_REGION");
        System.out.println("Config loaded!");
    }
}
```

The compiler gathers **all static field assignments and all static blocks**, in source order, into a single hidden method called **`<clinit>`** — short for "class initialiser." You never write it and can't call it. The JVM calls it.

### When does `<clinit>` run?

**Lazily** — not when your program starts, but the first time the class is *actively used*:

- Someone does `new Database()`
- Someone reads or writes a static field
- Someone calls a static method
- The class is loaded reflectively
- A subclass is initialised

Simply *mentioning* the type (e.g. declaring a variable of it) does **not** trigger it.

### The guarantee that makes singletons work

Here's the crucial bit, straight from the JVM specification (§5.5):

> **The JVM takes a lock on the class while running `<clinit>`, and runs it exactly once.**

So if ten threads hit `Database.getInstance()` simultaneously on a cold JVM:

1. All ten discover the class isn't initialised yet.
2. **One** wins the JVM's internal class-initialisation lock and runs `<clinit>`.
3. The other **nine block** — not in your code, in the JVM itself.
4. When `<clinit>` finishes, all nine wake up and see a fully constructed object.

And there's a **happens-before** edge between the initialisation and every subsequent read. In plain terms: no thread can ever observe a half-built `Database`.

> **The thread-safety is provided by the language.** You don't have to write any of it. This is why the correct answer is four lines and my answer was twenty.

### Where do static fields actually live?

A common misconception: "statics live in Metaspace."

Close, but not quite. Since Java 8:

- **Class metadata** (method bytecode, field descriptors, the constant pool) lives in **Metaspace**, which is native memory outside the heap.
- **Static field values** live on the **`java.lang.Class` object**, which is on the **heap**.

So `Database.INSTANCE` is a normal heap reference, hanging off the `Class` mirror for `Database`.

### "One copy" is per class **per classloader**

This trips people up in application servers.

A **classloader** is the thing that reads `.class` files and defines classes. A single JVM can have many. Two classloaders each loading `Database` produce **two different `Class` objects, and therefore two different `INSTANCE` values.**

So "singleton" really means "one per class per classloader." In a plain Spring Boot app with one classloader, that's genuinely one. In an old-school app server hosting five WARs, it's five.

This is also the classic **redeploy memory leak**: a static field in a shared library holds a reference to something in your app's classloader, so the old classloader can never be garbage collected, and every redeploy leaks the entire previous application.

---

## The other three approaches

### Way 2: The holder idiom (lazy, and still free)

Sometimes you don't want the object created at class-load time — maybe it's expensive and might never be used.

Naively you'd add a null check and a lock. Don't. Use **Bill Pugh's holder idiom** instead:

```java
public final class Database {

    private Database() { /* expensive setup */ }

    private static class Holder {
        static final Database INSTANCE = new Database();
    }

    public static Database getInstance() {
        return Holder.INSTANCE;
    }
}
```

Why this works: **`Holder` isn't initialised until it's first used** — which is the moment someone calls `getInstance()`. So you get laziness for free, still backed by the JVM's class-init lock, still with zero synchronisation cost on every subsequent call.

Best of both. And it's four lines longer than the eager version, not twenty.

### Way 3: Enum singleton (the safest)

```java
public enum Database {
    INSTANCE;

    private final HikariDataSource dataSource;

    Database() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        this.dataSource = new HikariDataSource(config);
    }

    public Connection getConnection() throws SQLException {
        return dataSource.getConnection();
    }
}
```

Usage: `Database.INSTANCE.getConnection()`.

Josh Bloch recommends this in *Effective Java* (Item 3) because it's the **only form immune to two sneaky attacks**:

- **Reflection.** With `setAccessible(true)` you can call a private constructor and build a second instance of a normal class. The JVM refuses to do this for enums.
- **Serialization.** Deserialising a normal singleton creates a fresh object — instantly two instances. Enums are serialised by name and always resolve back to the same constant.

The downside: an enum can't extend a class, and eager creation is forced.

### Way 4: Double-checked locking — the one I offered, and why it was wrong here

```java
public class Database {
    private static volatile Database instance;   // volatile is MANDATORY

    public static Database getInstance() {
        if (instance == null) {                  // check 1 - no lock, fast
            synchronized (Database.class) {
                if (instance == null) {          // check 2 - with lock
                    instance = new Database();
                }
            }
        }
        return instance;
    }
}
```

It's not *wrong* code — but it answers a **different question**. DCL is the answer to *"how do I initialise lazily without paying for a lock on every call?"* It is not the answer to *"guarantee non-null on first request."*

And it has a famous trap. **Without `volatile`, it is broken.** Here's why:

```java
instance = new Database();
```

looks like one step but is really three:

```
1. allocate memory for the object
2. run the constructor to fill in the fields
3. point `instance` at that memory
```

The JVM and CPU are allowed to **reorder 2 and 3** — there's no rule against it within a single thread, and the single thread can't tell the difference.

But another thread can. If the order becomes 1, 3, 2, then for a brief window `instance` is non-null while the constructor hasn't finished. Thread B's first null check passes, it skips the lock, and it starts using a **half-constructed object** with null fields.

`volatile` forbids that reordering and guarantees visibility. Which is exactly why the holder idiom is better: it gets the same result with no way to get it wrong.

---

## What about Spring? (the answer that shows judgement)

In real production Java you rarely hand-roll any of this:

```java
@Configuration
public class DatabaseConfig {

    @Bean                                    // singleton scope by default
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("DB_URL"));
        config.setMaximumPoolSize(20);
        return new HikariDataSource(config);
    }
}
```

Spring beans are singletons by default, created **eagerly during context refresh** — which happens *before* the web connector starts accepting traffic. Same guarantee the interviewer asked for, managed by the container.

And it fixes the real problem with static singletons: **they're global state that's hard to test.** A static `Database.getInstance()` can't be swapped for a mock, and state leaks between tests. An injected bean can be replaced trivially:

```java
@Service
public class PayoutService {
    private final DataSource dataSource;

    public PayoutService(DataSource dataSource) {   // inject it
        this.dataSource = dataSource;
    }
}
```

> **Naming a pattern's downside is what separates a senior answer from a memorised one.** "Here's the singleton, and here's why I wouldn't use a static one in production" is a better answer than the code alone.

---

## The rest of `static`, properly

Since the same interviewer finished by asking *"what does `static` mean?"*, here's everything worth knowing.

### static methods are bound at compile time

```java
class Parent {
    static void greet() { System.out.println("Parent"); }
}

class Child extends Parent {
    static void greet() { System.out.println("Child"); }
}

Parent p = new Child();
p.greet();          // prints "Parent" — NOT "Child"
```

Static methods compile to the **`invokestatic`** bytecode, which resolves by the *declared type* at compile time. Instance methods use `invokevirtual`, which looks up the *actual* type at runtime.

So a static method in a subclass **hides** the parent's; it does not **override** it. **There is no polymorphism with static methods.** This catches people constantly.

### `static final` primitives get inlined — and this causes a real bug

```java
// In library.jar
public class Constants {
    public static final int MAX_RETRIES = 3;
}

// In your app
int r = Constants.MAX_RETRIES;
```

For `static final` primitives and `String` literals, the compiler performs **constant folding** — it copies the literal `3` directly into your class file. Your compiled code never reads `Constants` at runtime.

So if the library ships a new version with `MAX_RETRIES = 5` and you only replace the jar, **your app still uses 3.** You have to recompile.

The fix, if you need the value to be swappable:

```java
public static final int MAX_RETRIES = Integer.parseInt("3");  // not a compile-time constant
```

Now it's computed at class-init time and read at runtime.

### static fields are effectively GC roots

Garbage collection starts from a set of **GC roots** — things known to be alive — and collects everything unreachable from them.

Static fields are reachable from the `Class` object, which is reachable from its classloader, which is usually alive for the whole application. So:

```java
public class Cache {
    private static final Map<String, byte[]> CACHE = new HashMap<>();

    public static void put(String key, byte[] value) {
        CACHE.put(key, value);     // nothing ever removes anything
    }
}
```

This map **never** gets collected. It grows until `OutOfMemoryError`. Static collections are the single most common cause of Java memory leaks.

Fixes: bound the size (Caffeine, Guava cache), use `WeakHashMap` where appropriate, or set a TTL.

### static nested classes vs inner classes

```java
class Outer {
    private int value = 42;

    class Inner {                    // NON-static: holds a hidden Outer.this reference
        void show() { System.out.println(value); }   // can reach outer fields
    }

    static class StaticNested {      // static: NO reference to any Outer instance
        void show() { System.out.println("no outer access"); }
    }
}
```

A non-static inner class secretly holds a reference to its enclosing instance. If you stash an `Inner` somewhere long-lived, you're keeping the entire `Outer` object alive too — a memory leak that's invisible in the source.

**Rule of thumb: make nested classes `static` unless they genuinely need the outer instance.** This is why `Holder` in the idiom above is static.

### static and threads

Static mutable state is shared by **every thread in the JVM**. There's no protection. This is fine:

```java
private static final Logger LOG = LoggerFactory.getLogger(Foo.class);  // immutable, thread-safe
```

This is a bug waiting to happen:

```java
private static int counter = 0;      // shared across all threads, unsynchronised
public static void increment() { counter++; }   // race condition
```

Use `AtomicInteger`, or a lock, or don't share it.

---

## Cheat sheet

| Question | Answer |
|---|---|
| Best singleton for "must never be null"? | Eager `private static final` field, initialised at declaration |
| Best lazy singleton? | Bill Pugh holder idiom |
| Safest against reflection/serialization? | Enum singleton |
| Why doesn't the eager version need `synchronized`? | The JVM locks the class while running `<clinit>`, exactly once |
| Why does DCL need `volatile`? | To stop reordering that would publish a half-constructed object |
| Where do static fields live? | On the heap, attached to the `java.lang.Class` object; metadata in Metaspace |
| Is "one instance" truly global? | One per class **per classloader** |
| Can static methods be overridden? | No — they're hidden. `invokestatic` binds at compile time. |
| Why are static collections dangerous? | They're effectively GC roots and never get collected |
| What would you use in production? | A Spring `@Bean` — same guarantee, testable, injectable |

The lesson I took from failing this one: when an interviewer keeps repeating a requirement (*"it must never be null on the first request"*), that repetition **is the hint**. He was pointing straight at class initialisation. I was busy writing locks.
