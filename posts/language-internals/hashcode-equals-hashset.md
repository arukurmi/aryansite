---
title: "What Is a hashCode, Really? (And Why My HashSet Let Duplicates In)"
excerpt: "Buckets, linked lists, treeification, and the equals/hashCode contract — explained with the interview question I got wrong."
tags: ["java", "collections", "hashmap", "hashset", "interviews"]
date: "2026-07-28"
author: "Aryansh Kurmi"
---

Two questions from the same interview:

1. *"What does `hashCode()` actually mean?"*
2. *"Create a `Product` class. Now make sure a `HashSet` of products can't contain two products with the same name."*

I fumbled the first and completely failed the second — I passed a comparator to a `HashSet`, which does absolutely nothing. Here's the full picture.

---

## Part 1: What a hash code is

### The problem it solves

You have a million products and want to find "iPhone 15."

Scanning a list means checking up to a million entries. **O(n)** — slow.

What if instead you could **compute** where it is?

```
"iPhone 15" ──[some function]──> 4  ──> look directly in slot 4
```

One step. **O(1)**. No searching.

That function is the **hash function**, and its output is the **hash code**.

### So what is it?

> **A hash code is an integer computed from an object's contents, used to decide which storage slot the object belongs in.**

In Java, every object has `int hashCode()`. It returns a 32-bit signed integer.

That's the whole idea. It's a **fingerprint that tells you where to look**.

### My interview answer, corrected

I said the hash code was "the address of that particular integer block in memory." Close, but wrong in a way that matters:

- A hash code is **not** a memory address. It's derived from the object's **data**.
- It **is** used to compute an index into an array — which is address-like, but that's a consequence, not a definition.

Why the distinction matters: two `String` objects at different memory addresses with the same text have **the same hash code**, because it's computed from the characters:

```java
String a = new String("hello");
String b = new String("hello");

System.out.println(a == b);              // false — different objects in memory
System.out.println(a.hashCode());        // 99162322
System.out.println(b.hashCode());        // 99162322  — same, computed from content
```

If it were a memory address, these would differ and `HashMap` would be useless.

### How String's hash code is computed

It's not magic — it's a small loop, and it's specified in the JDK:

```java
public int hashCode() {
    int h = 0;
    for (int i = 0; i < value.length; i++) {
        h = 31 * h + value[i];
    }
    return h;
}
```

For `"abc"`:

```
h = 0
h = 31*0   + 'a'(97)  = 97
h = 31*97  + 'b'(98)  = 3105
h = 31*3105+ 'c'(99)  = 96354
```

**Why 31?** Two reasons. It's an odd prime, which spreads values out well and avoids information loss from repeated multiplication. And `31 * h` compiles to `(h << 5) - h` — a bit shift and a subtraction, faster than a multiply on older hardware.

### The contract (memorise this)

```
1. If a.equals(b) is true, then a.hashCode() == b.hashCode().   ← MANDATORY
2. If a.hashCode() == b.hashCode(), a.equals(b) may still be false. ← collisions are legal
3. hashCode() must return the same value every time,
   as long as the object doesn't change.
```

Rule 1 is the one that breaks things when violated. Rule 2 is why buckets need to hold more than one item.

**Different objects can share a hash code.** Only ~4 billion possible values exist, and infinitely many possible objects. That's a **collision**, and it's normal.

Famous example:

```java
"Aa".hashCode();   // 2112
"BB".hashCode();   // 2112  — same!
```

---

## Part 2: How HashMap actually works inside

`HashSet` is just a `HashMap` where every value is a dummy object, so understanding one gives you both.

### The core structure

A `HashMap` is **an array of buckets**. Each bucket holds either nothing, a **linked list**, or (past a threshold) a **balanced tree**.

```
index:   0      1      2      3      4      5      6      7
       ┌────┬──────┬────┬──────┬────┬────┬──────┬────┐
       │null│ node │null│ node │null│null│ node │null│
       └────┴──┬───┴────┴──┬───┴────┴────┴──┬───┴────┘
               │           │                │
               ▼           ▼                ▼
            "apple"     "cat"            "zebra"
               │
               ▼
            "melon"     ← collided into the same bucket
```

The array is called the **table**. Default size **16**.

Your instinct here was right, and it's the correct mental model: **it's not a plain array — it's an array of linked lists.** The hash code picks the array index; the linked list handles collisions in that slot.

### Finding the bucket

Two steps.

**Step 1: spread the bits.**

```java
static final int hash(Object key) {
    int h = key.hashCode();
    return h ^ (h >>> 16);     // XOR the high 16 bits into the low 16
}
```

Why? Because of step 2. The index is computed with a bitmask that **only looks at the low bits**. If two keys differ only in their high bits, they'd collide constantly. XORing the top half down mixes that information in. This is called the **spread** or **perturbation** function.

**Step 2: mask to an index.**

```java
index = (table.length - 1) & hash;
```

For a table of 16, `table.length - 1` is `15` = binary `1111`, so this keeps the bottom 4 bits — a number from 0 to 15.

This is why **HashMap's capacity is always a power of two**: it lets the modulo be a single bitwise AND, far faster than `%`.

### Putting an entry

```
put(key, value):
  1. compute hash, find the bucket index
  2. bucket empty?          -> place the node. done.
  3. bucket occupied?       -> walk the chain:
       for each node:
         if node.hash == hash AND (node.key == key || node.key.equals(key))
              -> DUPLICATE. overwrite the value. done.
       reached the end      -> append a new node
  4. size > capacity * 0.75 -> resize
```

Note the order in step 3: it compares **hash first**, then `equals`. Comparing an int is cheap; calling `equals` might not be. This is an optimisation with a huge consequence, coming up shortly.

### Treeification — the part you already knew about

If a single bucket's chain grows to **8 nodes**, and the table has at least **64** slots, that chain converts into a **red-black tree** (a self-balancing binary search tree).

```
Before (8 collisions):     After treeification:

bucket[3] -> A -> B -> C          bucket[3] -> ( D )
             -> D -> E -> F                    /     \
             -> G -> H                      (B)     (F)
                                            / \     /  \
  lookup: O(n)                            (A) (C) (E)  (G-H)

                                          lookup: O(log n)
```

Why bother? Because of **hash flooding** — a denial-of-service attack where someone deliberately sends keys that all collide, turning your O(1) map into an O(n) list. With a tree, worst case degrades to O(log n) instead of O(n). Java 8 added this specifically as a security fix.

It converts back to a list if the bin shrinks below **6** (not 8 — the gap prevents flapping back and forth at the boundary).

For the tree to work, keys must be orderable — `HashMap` uses `Comparable` if the keys implement it, otherwise falls back to comparing class names and identity hash codes.

### Resizing

When `size > capacity × loadFactor` (default 0.75), the table **doubles** and every entry is redistributed.

Why 0.75? A trade-off. Lower means more empty slots (wasted memory) but fewer collisions. Higher means less memory but longer chains. 0.75 is the empirical sweet spot.

Resizing is **expensive** — O(n), touching every entry. So if you know roughly how many entries you'll have:

```java
Map<String, Product> map = new HashMap<>(1000);   // avoids several resizes
```

A nice Java 8 detail: when the table doubles, an entry's new index is either **the same** or **the old index + old capacity** — because you've added exactly one bit to the mask. So the split is cheap and requires no rehashing.

---

## Part 3: The question I failed

> *"Create a `Product` class with name, amount and product ID. Now make a `HashSet` that ensures no two products have the same name."*

### My answer, and why it did nothing

```java
Set<Product> products = new HashSet<>();
// then I tried to pass a comparator: (a, b) -> a.id != b.id
```

**`HashSet` does not accept a comparator. It has no constructor that takes one. It never calls one.**

Comparators are used by `TreeSet`, `TreeMap`, `Collections.sort`, and `Stream.sorted`. `HashSet` uses **`hashCode()` and `equals()`, and nothing else.**

So my code compiled (as a lambda passed nowhere useful) and had precisely zero effect.

### Why both iPhones got in

```java
set.add(new Product(1, "iPhone"));
set.add(new Product(2, "iPhone"));
// both present. why?
```

Because `Product` didn't override `hashCode()`. The default `Object.hashCode()` is **identity-based** — derived from the object instance, not its contents. Two separately-constructed objects get different hash codes.

And remember the order of checks:

> **If the hash codes differ, `equals()` is never called.**

They land in different buckets. Java never even asks whether they're equal. Both go in.

### The correct answer

```java
import java.util.Objects;

public class Product {
    private final int id;
    private final String name;
    private final double amount;

    public Product(int id, String name, double amount) {
        this.id = id;
        this.name = name;
        this.amount = amount;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;                    // same reference — fast path
        if (!(o instanceof Product other)) return false;
        return Objects.equals(this.name, other.name);  // uniqueness is BY NAME
    }

    @Override
    public int hashCode() {
        return Objects.hash(name);                     // MUST use the same field as equals
    }

    // getters...
}
```

Now:

```java
Set<Product> set = new HashSet<>();
System.out.println(set.add(new Product(1, "iPhone", 79999)));   // true
System.out.println(set.add(new Product(2, "iPhone", 89999)));   // false — rejected ✓
System.out.println(set.size());                                  // 1
```

The rule in one line: **`equals` and `hashCode` must be computed from the same fields.**

If `equals` compares names but `hashCode` uses the id, you break contract rule 1 — two "equal" products land in different buckets, and the set holds both. Silently. This is the classic bug.

### The sharper follow-up: unique ID **and** unique name

He then asked how I'd guarantee both. Here's the honest answer:

> **A single `HashSet` enforces exactly one definition of equality. It cannot enforce two independent uniqueness constraints.**

Options:

**Two indexes:**

```java
class ProductRegistry {
    private final Map<Integer, Product> byId = new HashMap<>();
    private final Map<String, Product> byName = new HashMap<>();

    public boolean add(Product p) {
        if (byId.containsKey(p.getId()))   return false;
        if (byName.containsKey(p.getName())) return false;
        byId.put(p.getId(), p);
        byName.put(p.getName(), p);
        return true;
    }
}
```

**Or, the real-world answer:**

```sql
CREATE TABLE products (
    id     BIGINT PRIMARY KEY,
    name   TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    CONSTRAINT uq_product_name UNIQUE (name)
);
```

**Two UNIQUE constraints in the database.** In-memory sets don't survive a restart and don't exist across multiple server instances. If two pods each hold their own `HashSet`, neither knows about the other's products.

Saying this shows you understand where invariants actually belong — and it's the same lesson as "a lock doesn't give you idempotency."

**And if you did want comparator-based dedup:**

```java
Set<Product> byName = new TreeSet<>(Comparator.comparing(Product::getName));
byName.add(new Product(1, "iPhone", 79999));
byName.add(new Product(2, "iPhone", 89999));   // rejected
System.out.println(byName.size());              // 1
```

Here the **comparator defines equality** — `compare(a, b) == 0` means duplicate. `TreeSet` ignores `equals` and `hashCode` entirely. That's the actual home for the approach I was reaching for.

### Records give you both for free

```java
record Product(int id, String name, double amount) {}
```

The compiler generates `equals`, `hashCode` and `toString` over **all** components. Clean — but note that means uniqueness is on *all three fields together*, so it does **not** solve "unique by name." You'd still write a custom class, or use a `Map<String, Product>` keyed by name.

---

## Part 4: The mutation trap

The nastiest bug in this whole area:

```java
class Product {
    private String name;   // NOT final

    @Override public int hashCode() { return Objects.hash(name); }
    @Override public boolean equals(Object o) { /* compares name */ }

    public void setName(String name) { this.name = name; }
}
```

```java
Product p = new Product(1, "iPhone", 79999);
Set<Product> set = new HashSet<>();
set.add(p);

System.out.println(set.contains(p));   // true

p.setName("iPad");                     // mutate a field used in hashCode

System.out.println(set.contains(p));   // FALSE — the object is in the set!
System.out.println(set.size());        // 1
set.remove(p);                          // does nothing
System.out.println(set.size());        // still 1 — permanently unreachable
```

What happened: the object was filed in the bucket for `hash("iPhone")`. After mutation, `contains` computes `hash("iPad")` and looks in a **different bucket**. The object is still sitting in the old one, invisible and unremovable.

> **Rule: fields used in `hashCode` must be immutable. Make them `final`.**

This is a major reason to prefer records and immutable value objects as map keys.

---

## Part 5: HashMap vs the alternatives

| | `HashMap` | `LinkedHashMap` | `TreeMap` | `ConcurrentHashMap` |
|---|---|---|---|---|
| Ordering | None (and it can change on resize) | Insertion order (or access order) | Sorted by key | None |
| get/put | O(1) average | O(1) average | O(log n) | O(1) average |
| Needs | `hashCode`/`equals` | `hashCode`/`equals` | `Comparable` or a `Comparator` | `hashCode`/`equals` |
| Null keys | One allowed | One allowed | Not allowed | Not allowed |
| Thread safe | No | No | No | **Yes** |

### `LinkedHashMap` has a great party trick — an LRU cache in five lines:

```java
Map<String, byte[]> lru = new LinkedHashMap<>(16, 0.75f, true) {  // true = access order
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
        return size() > 100;      // keep only the 100 most recently used
    }
};
```

### `ConcurrentHashMap` — how it's thread-safe now

A common outdated answer is "it uses 16 segments." That was Java 7. **Since Java 8** it uses:

- **CAS** for inserting into an empty bucket — completely lock-free
- **`synchronized` on the first node of a bucket** when there's a collision — so it locks *one bucket*, not the map
- Only threads hitting the *same* bucket ever contend

This is why it scales so well: with 16 buckets and 16 threads on different keys, there's zero contention.

Also useful:

```java
map.computeIfAbsent(key, k -> expensiveLoad(k));   // atomic — no double-load race
map.merge(key, 1, Integer::sum);                    // atomic counter increment
```

**Never** do `if (!map.containsKey(k)) map.put(k, v)` on a concurrent map — that's two operations with a gap between them.

---

## Cheat sheet

| Question | Answer |
|---|---|
| What is a hash code? | An integer computed from an object's contents, used to pick a bucket index |
| Is it a memory address? | No — it's derived from data. Two equal objects at different addresses share one. |
| Why 31 in `String.hashCode()`? | Odd prime, good distribution, and `31*h` compiles to `(h<<5)-h` |
| What's inside a `HashMap`? | An array of buckets; each bucket is a linked list, or a red-black tree past 8 entries |
| How is the index computed? | `(table.length - 1) & (h ^ (h >>> 16))` — mask the spread hash |
| Why is capacity a power of two? | So modulo becomes a single bitwise AND |
| When does treeification happen? | Bucket reaches 8 nodes **and** table ≥ 64. Reverts below 6. |
| Why treeify at all? | Caps worst case at O(log n); defends against hash-flooding DoS |
| When does it resize? | `size > capacity × 0.75`. Doubles, redistributes. |
| Does `HashSet` use a comparator? | **No. Never.** Only `hashCode` and `equals`. |
| Why did two "iPhone" products both get in? | No `hashCode` override → identity hashes differ → different buckets → `equals` never called |
| The contract? | Equal objects **must** have equal hash codes. The reverse isn't required. |
| Can one set enforce two unique constraints? | No. Use two maps, or two UNIQUE constraints in the DB. |
| What breaks if I mutate a key? | The entry becomes permanently unreachable. Use `final` fields. |
| Which set uses a comparator? | `TreeSet` — where `compare(a,b) == 0` means duplicate |

**The single sentence:** a hash code tells a `HashMap` *which bucket to look in*, and `equals` tells it *which entry within that bucket is the one you meant* — and if you override one without the other, everything silently breaks.
