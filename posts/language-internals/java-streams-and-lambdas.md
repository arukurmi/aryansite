---
title: "Java Streams and Lambdas, From Zero"
excerpt: "What a lambda actually is, what a Stream actually is (it's not a collection), and the CSV question I fumbled in an interview — with all the code."
tags: ["java", "streams", "lambda", "functional", "interviews"]
date: "2026-07-10"
author: "Aryansh Kurmi"
---

In an interview I was asked: *"You have a CSV with student name, subject and marks. Calculate the average marks."*

I couldn't write it cleanly. It's a five-line problem. I'd used streams for two years and never actually understood what they were.

This post fixes that, from the ground up.

---

## Part 1: Lambdas

### The problem lambdas solve

Before Java 8, passing *behaviour* into a method meant writing an entire class:

```java
List<String> names = Arrays.asList("Zara", "Aryansh", "Meera");

Collections.sort(names, new Comparator<String>() {
    @Override
    public int compare(String a, String b) {
        return a.length() - b.length();
    }
});
```

Seven lines to express one idea: *"compare by length."* Everything else is ceremony.

With a lambda:

```java
Collections.sort(names, (a, b) -> a.length() - b.length());
```

Same behaviour. One line.

### What a lambda actually is

> **A lambda is a compact way to write an implementation of an interface that has exactly one abstract method.**

That kind of interface has a name: a **functional interface**, or a **SAM type** (**S**ingle **A**bstract **M**ethod).

`Comparator` has one abstract method, `compare`. So when the compiler sees a lambda where a `Comparator` is expected, it knows: *the two parameters are `compare`'s parameters, and the body is `compare`'s body.*

You can write your own:

```java
@FunctionalInterface          // optional, but the compiler will enforce "exactly one method"
interface Validator {
    boolean validate(String input);
}

Validator notEmpty = s -> s != null && !s.isBlank();

System.out.println(notEmpty.validate("hello"));   // true
System.out.println(notEmpty.validate("   "));     // false
```

### Syntax variations

```java
// no parameters
Runnable r = () -> System.out.println("running");

// one parameter — parentheses optional
Function<String, Integer> len = s -> s.length();

// multiple parameters
BinaryOperator<Integer> add = (a, b) -> a + b;

// explicit types (rarely needed — usually inferred)
BinaryOperator<Integer> add2 = (Integer a, Integer b) -> a + b;

// multi-line body needs braces AND an explicit return
Function<String, String> shout = s -> {
    String trimmed = s.trim();
    return trimmed.toUpperCase() + "!";
};
```

### The built-in functional interfaces

You rarely define your own. `java.util.function` covers the common shapes:

| Interface | Method | Meaning | Example |
|---|---|---|---|
| `Function<T,R>` | `R apply(T)` | takes one thing, returns another | `s -> s.length()` |
| `Predicate<T>` | `boolean test(T)` | takes one thing, returns a yes/no | `s -> s.isEmpty()` |
| `Consumer<T>` | `void accept(T)` | takes one thing, returns nothing | `s -> System.out.println(s)` |
| `Supplier<T>` | `T get()` | takes nothing, produces something | `() -> new ArrayList<>()` |
| `BiFunction<T,U,R>` | `R apply(T,U)` | takes two, returns one | `(a, b) -> a + b` |
| `UnaryOperator<T>` | `T apply(T)` | `Function` where in and out match | `s -> s.trim()` |
| `BinaryOperator<T>` | `T apply(T,T)` | `BiFunction` where all three match | `(a, b) -> a * b` |

Memory aid: **Function** transforms, **Predicate** decides, **Consumer** swallows, **Supplier** produces.

### Method references — the shorthand

When a lambda does nothing but call an existing method, replace it with `::`:

```java
s -> s.length()                  →   String::length
s -> System.out.println(s)       →   System.out::println
s -> new Product(s)              →   Product::new
(a, b) -> a.compareTo(b)         →   String::compareTo
```

Four kinds:

```java
Product::getName        // instance method of the parameter
System.out::println     // instance method of a specific object
Integer::parseInt       // static method
Product::new            // constructor
```

### `Comparator` deserves its own section

Comparators are where lambdas earn their keep. All of these do the same thing, increasingly readably:

```java
// anonymous class — 2013
products.sort(new Comparator<Product>() {
    public int compare(Product a, Product b) {
        return a.getPrice().compareTo(b.getPrice());
    }
});

// lambda
products.sort((a, b) -> a.getPrice().compareTo(b.getPrice()));

// comparator factory + method reference — best
products.sort(Comparator.comparing(Product::getPrice));
```

And chaining is where it gets genuinely nice:

```java
products.sort(
    Comparator.comparing(Product::getCategory)          // by category
              .thenComparing(Product::getPrice,         // then price
                             Comparator.reverseOrder()) // descending
              .thenComparing(Product::getName)          // then name as tiebreak
);
```

Reading that aloud is a plain-English sort specification. That's the point of functional style.

### The rule: captured variables must be effectively final

```java
int count = 0;
list.forEach(item -> count++);       // ✗ COMPILE ERROR
```

A lambda may only use local variables that are **effectively final** — assigned once and never changed.

Why? Because the lambda might outlive the method that created it (stored in a field, run on another thread later). Local variables live on the stack and vanish when the method returns, so the lambda **copies** the value. If the original could change, the copy would silently disagree with it.

The workaround, when you genuinely need mutation:

```java
AtomicInteger count = new AtomicInteger();
list.forEach(item -> count.incrementAndGet());   // ✓ the reference is final; the object mutates
```

Though usually the better answer is to use a stream operation instead of mutating from a loop.

### Lambda vs anonymous class — the real differences

```java
class Demo {
    void run() {
        Runnable anon = new Runnable() {
            public void run() {
                System.out.println(this);   // "this" = the anonymous Runnable
            }
        };

        Runnable lambda = () -> System.out.println(this);   // "this" = the Demo instance
    }
}
```

| | Anonymous class | Lambda |
|---|---|---|
| `this` | The anonymous object | The enclosing instance |
| Class files | Generates `Demo$1.class` | No extra class file |
| How it's implemented | A normal object | `invokedynamic` — the JVM builds it at first use |
| Can have fields/state | Yes | No |
| Can implement multi-method interfaces | Yes | No — SAM only |

The `invokedynamic` detail is a nice one to have: lambdas aren't just syntax sugar for anonymous classes. The compiler emits an instruction that the JVM resolves at runtime, letting it choose the most efficient representation. Fewer classes to load, faster startup.

---

## Part 2: Streams

### What a Stream is NOT

**A Stream is not a data structure.** It stores nothing. You cannot ask it for element 5. This confuses everyone at first.

### What a Stream is

> **A Stream is a pipeline of operations that gets applied to a source of data.**

Analogy: a **factory conveyor belt**.

- The **source** (a `List`, a file, a generator) is the pile of raw material at one end.
- **Intermediate operations** (`map`, `filter`, `sorted`) are the machines along the belt.
- The **terminal operation** (`collect`, `count`, `forEach`) is the box at the far end.

Nothing moves until you put a box at the end.

### The three-part structure

```java
List<String> result = products.stream()              // 1. SOURCE
    .filter(p -> p.getPrice() > 100)                 // 2. INTERMEDIATE
    .map(Product::getName)                           // 2. INTERMEDIATE
    .sorted()                                        // 2. INTERMEDIATE
    .collect(Collectors.toList());                   // 3. TERMINAL
```

Intermediate operations return another `Stream` (so you can keep chaining). Terminal operations return something else — and **end** the stream.

### Property 1: Laziness

This prints **nothing**:

```java
Stream<String> s = products.stream()
    .filter(p -> { System.out.println("filtering " + p); return true; })
    .map(Product::getName);
// no output. no work done.
```

Add a terminal operation and it all runs:

```java
List<String> names = s.collect(Collectors.toList());   // NOW it prints
```

Why laziness matters — it enables short-circuiting:

```java
Optional<Product> first = hugeList.stream()
    .filter(p -> p.getPrice() > 1000)
    .findFirst();
```

This does **not** filter a million products and then take the first. It processes elements one at a time and stops the instant it finds a match. Possibly one element examined.

Even better with an infinite stream:

```java
Stream.iterate(1, n -> n * 2)      // infinite: 1, 2, 4, 8, 16, ...
      .limit(10)
      .forEach(System.out::println);
```

An eager implementation would hang forever. Lazy evaluation makes infinite streams useful.

### Property 2: Single use

```java
Stream<Product> s = products.stream();
s.count();
s.count();     // ✗ IllegalStateException: stream has already been operated upon or closed
```

A conveyor belt runs once. Need it again? Build a new one from the source.

### Property 3: The source is never modified

```java
List<String> names = Arrays.asList("charlie", "alice", "bob");
List<String> sorted = names.stream().sorted().toList();

System.out.println(names);   // [charlie, alice, bob]  — unchanged
System.out.println(sorted);  // [alice, bob, charlie]
```

Streams produce new results. Compare with `Collections.sort(names)`, which mutates in place.

---

## Part 3: The operations, with examples

Setup for everything below:

```java
record Product(String name, String category, double price, int quantity) {}

List<Product> products = List.of(
    new Product("iPhone 15",   "Electronics", 79999, 5),
    new Product("MacBook Air", "Electronics", 99999, 2),
    new Product("Coffee Mug",  "Kitchen",       499, 50),
    new Product("Blender",     "Kitchen",      3499, 8),
    new Product("Notebook",    "Stationery",     99, 200),
    new Product("Pen Set",     "Stationery",     249, 100)
);
```

### filter — keep what matches

```java
List<Product> expensive = products.stream()
    .filter(p -> p.price() > 1000)
    .toList();
// [iPhone 15, MacBook Air, Blender]
```

### map — transform each element

```java
List<String> names = products.stream()
    .map(Product::name)
    .toList();
// [iPhone 15, MacBook Air, Coffee Mug, Blender, Notebook, Pen Set]

// map to a different shape
List<Double> withGst = products.stream()
    .map(p -> p.price() * 1.18)
    .toList();
```

### flatMap — flatten nested structures

The one people find hardest, so here's the clearest possible example.

```java
List<List<String>> nested = List.of(
    List.of("a", "b"),
    List.of("c", "d"),
    List.of("e")
);

// map gives you a Stream of Lists — not what you want
List<List<String>> stillNested = nested.stream().map(x -> x).toList();

// flatMap unpacks each inner list into the outer stream
List<String> flat = nested.stream()
    .flatMap(List::stream)
    .toList();
// [a, b, c, d, e]
```

Realistic version — every tag across every product:

```java
record Article(String title, List<String> tags) {}

List<String> allTags = articles.stream()
    .flatMap(a -> a.tags().stream())
    .distinct()
    .sorted()
    .toList();
```

**`map` is one-to-one. `flatMap` is one-to-many, then flattened.**

### sorted, distinct, limit, skip

```java
products.stream().sorted(Comparator.comparing(Product::price)).toList();
products.stream().map(Product::category).distinct().toList();
products.stream().sorted(Comparator.comparing(Product::price).reversed()).limit(3).toList();
products.stream().skip(2).limit(2).toList();          // pagination
```

### peek — debugging only

```java
products.stream()
    .peek(p -> System.out.println("before filter: " + p.name()))
    .filter(p -> p.price() > 1000)
    .peek(p -> System.out.println("after filter: " + p.name()))
    .toList();
```

Great for seeing what's flowing through. **Never use it for side effects in production** — with certain optimisations the JVM may skip it entirely.

### Terminal operations

```java
// collecting
List<String>  list = products.stream().map(Product::name).toList();
Set<String>   set  = products.stream().map(Product::category).collect(Collectors.toSet());
String        csv  = products.stream().map(Product::name).collect(Collectors.joining(", "));

// finding
Optional<Product> any    = products.stream().filter(p -> p.price() < 500).findFirst();
boolean           anyBig = products.stream().anyMatch(p -> p.price() > 50000);
boolean           allPos = products.stream().allMatch(p -> p.price() > 0);
boolean           noneFree = products.stream().noneMatch(p -> p.price() == 0);

// counting and aggregating
long   count = products.stream().filter(p -> p.quantity() > 10).count();
double total = products.stream().mapToDouble(Product::price).sum();
OptionalDouble avg = products.stream().mapToDouble(Product::price).average();
Optional<Product> priciest = products.stream().max(Comparator.comparing(Product::price));
```

### `Optional` — because "no result" is a real answer

`findFirst`, `max`, `min` and `average` return `Optional` (or `OptionalDouble`) because the stream might be empty. That's Java forcing you to handle the empty case instead of returning null.

```java
double average = products.stream()
    .mapToDouble(Product::price)
    .average()
    .orElse(0.0);                    // supply a default

products.stream()
    .filter(p -> p.category().equals("Toys"))
    .findFirst()
    .ifPresentOrElse(
        p -> System.out.println("Found: " + p.name()),
        () -> System.out.println("No toys in stock")
    );
```

### reduce — fold everything into one value

```java
double total = products.stream()
    .map(Product::price)
    .reduce(0.0, Double::sum);       // identity, then combining function
```

Step by step: `0 + 79999 = 79999`, `79999 + 99999 = 179998`, and so on.

```java
Optional<Product> cheapest = products.stream()
    .reduce((a, b) -> a.price() < b.price() ? a : b);
```

In practice, `sum()`, `max()` and the `Collectors` cover most of what you'd hand-write with `reduce`.

### Primitive streams

`Stream<Integer>` boxes every element into an object — slow, and it has no `sum()`. Use the primitive variants:

```java
IntStream.rangeClosed(1, 100).sum();                     // 5050
products.stream().mapToInt(Product::quantity).max();     // OptionalInt

IntSummaryStatistics stats = products.stream()
    .mapToInt(Product::quantity)
    .summaryStatistics();

stats.getMin(); stats.getMax(); stats.getAverage(); stats.getSum(); stats.getCount();
```

`summaryStatistics()` in one pass is a genuinely useful trick.

---

## Part 4: Collectors — the powerful bit

### groupingBy

```java
Map<String, List<Product>> byCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category));

// {Electronics=[iPhone 15, MacBook Air], Kitchen=[...], Stationery=[...]}
```

### groupingBy with a downstream collector

This is the pattern worth memorising:

```java
// count per category
Map<String, Long> countByCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category, Collectors.counting()));
// {Electronics=2, Kitchen=2, Stationery=2}

// average price per category
Map<String, Double> avgByCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category,
             Collectors.averagingDouble(Product::price)));

// total inventory value per category
Map<String, Double> valueByCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category,
             Collectors.summingDouble(p -> p.price() * p.quantity())));

// just the names, grouped
Map<String, List<String>> namesByCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category,
             Collectors.mapping(Product::name, Collectors.toList())));

// most expensive per category
Map<String, Optional<Product>> priciestByCategory = products.stream()
    .collect(Collectors.groupingBy(Product::category,
             Collectors.maxBy(Comparator.comparing(Product::price))));
```

### partitioningBy — grouping into exactly two buckets

```java
Map<Boolean, List<Product>> split = products.stream()
    .collect(Collectors.partitioningBy(p -> p.price() > 1000));

split.get(true);    // expensive
split.get(false);   // cheap
```

### toMap

```java
Map<String, Double> priceByName = products.stream()
    .collect(Collectors.toMap(Product::name, Product::price));
```

**Watch out:** duplicate keys throw `IllegalStateException`. Supply a merge function:

```java
Map<String, Double> totalByCategory = products.stream()
    .collect(Collectors.toMap(
        Product::category,
        Product::price,
        (existing, replacement) -> existing + replacement    // how to merge collisions
    ));
```

---

## Part 5: The interview question, solved

> *"You have a CSV with three columns — student name, subject, marks. Calculate the average marks."*

```java
import java.nio.file.*;
import java.util.*;
import java.util.stream.*;

record Student(String name, String subject, double marks) {}

public class AverageMarks {
    public static void main(String[] args) throws Exception {

        // 1. Read the CSV into objects
        List<Student> students;
        try (Stream<String> lines = Files.lines(Path.of("students.csv"))) {
            students = lines
                .skip(1)                                       // drop the header row
                .filter(line -> !line.isBlank())
                .map(line -> line.split(","))
                .map(p -> new Student(p[0].trim(),
                                      p[1].trim(),
                                      Double.parseDouble(p[2].trim())))
                .toList();
        }

        // 2. Overall average
        double overall = students.stream()
            .mapToDouble(Student::marks)
            .average()
            .orElse(0.0);
        System.out.printf("Overall average: %.2f%n", overall);

        // 3. Average per student
        Map<String, Double> avgByStudent = students.stream()
            .collect(Collectors.groupingBy(Student::name,
                     Collectors.averagingDouble(Student::marks)));
        avgByStudent.forEach((name, avg) -> System.out.printf("%s: %.2f%n", name, avg));

        // 4. Average per subject
        Map<String, Double> avgBySubject = students.stream()
            .collect(Collectors.groupingBy(Student::subject,
                     Collectors.averagingDouble(Student::marks)));

        // 5. Topper per subject
        Map<String, Optional<Student>> topperBySubject = students.stream()
            .collect(Collectors.groupingBy(Student::subject,
                     Collectors.maxBy(Comparator.comparing(Student::marks))));

        // 6. Full stats in one pass
        DoubleSummaryStatistics stats = students.stream()
            .mapToDouble(Student::marks)
            .summaryStatistics();
        System.out.println("min=" + stats.getMin()
                         + " max=" + stats.getMax()
                         + " avg=" + stats.getAverage());
    }
}
```

**Note `try-with-resources` around `Files.lines`.** A file stream holds an OS file handle. Unlike a collection stream, it must be closed. Forget this and you leak file descriptors — the exact problem from the connections post.

The three things to have at your fingertips:

```java
Collectors.groupingBy(classifier, Collectors.averagingDouble(...))
stream.mapToDouble(...).average().orElse(0.0)
try (Stream<String> lines = Files.lines(path)) { ... }
```

---

## Part 6: Parallel streams — mostly, don't

```java
double total = products.parallelStream()
    .mapToDouble(Product::price)
    .sum();
```

One word, and the work is split across a thread pool. Tempting. Usually wrong.

Use parallel streams **only** when all of these hold:

- The data set is genuinely large (tens of thousands of elements minimum)
- The work per element is **CPU-bound** — real computation, not I/O
- The operations are **stateless** and **side-effect free**
- The source splits cheaply (`ArrayList` and arrays do; `LinkedList` doesn't)
- You've measured and it's actually faster

Why it usually isn't:

**1. It uses the common ForkJoinPool — a single shared, JVM-wide pool.** One slow parallel stream can starve every other one, including ones inside library code.

**2. Blocking calls are catastrophic.** This is a genuine production incident:

```java
urls.parallelStream()
    .map(url -> httpClient.get(url))   // ✗ blocks common pool threads
    .toList();
```

You've just tied up the shared pool waiting on network I/O. Use `CompletableFuture` with your own executor instead.

**3. Side effects break.**

```java
List<String> results = new ArrayList<>();
products.parallelStream().forEach(p -> results.add(p.name()));   // ✗ ArrayList isn't thread-safe
```

Use `.collect()`, which is designed for concurrent accumulation.

**4. The splitting and merging overhead can exceed the gain** for small collections. Parallelising 100 elements is almost always slower.

---

## Quick reference

| Want to... | Use |
|---|---|
| Keep matching elements | `.filter(predicate)` |
| Transform each element | `.map(function)` |
| Flatten nested collections | `.flatMap(x -> x.stream())` |
| Remove duplicates | `.distinct()` |
| Sort | `.sorted(Comparator.comparing(...))` |
| Take the first N | `.limit(n)` |
| Skip the first N | `.skip(n)` |
| Collect into a list | `.toList()` |
| Join into a string | `.collect(Collectors.joining(", "))` |
| Group by a field | `.collect(Collectors.groupingBy(...))` |
| Group and aggregate | `.collect(groupingBy(f, counting()))` |
| Split into two buckets | `.collect(Collectors.partitioningBy(...))` |
| Sum / average | `.mapToDouble(...).sum()` / `.average()` |
| Min / max | `.max(Comparator.comparing(...))` |
| All stats at once | `.mapToInt(...).summaryStatistics()` |
| Check any/all/none | `.anyMatch` / `.allMatch` / `.noneMatch` |
| Find one | `.findFirst()` / `.findAny()` |
| Read a file lazily | `Files.lines(path)` in try-with-resources |

**The one-sentence summary:** a lambda is an inline implementation of a single-method interface, and a Stream is a lazy pipeline over a source that does nothing until a terminal operation pulls the data through.
