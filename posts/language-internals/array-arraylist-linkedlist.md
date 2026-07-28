---
title: "Array vs ArrayList vs LinkedList (And What `List` Actually Is)"
excerpt: "The interviewer asked twice about LinkedList's advantage, because the standard answer is incomplete. Here's the full one, including why ArrayList wins even when Big-O says it shouldn't."
tags: ["java", "collections", "data-structures", "interviews"]
date: "2026-07-28"
author: "Aryansh Kurmi"
---

In an interview I was asked the difference between `ArrayList` and `LinkedList`. I gave the textbook answer. She asked again. I repeated myself with more words. She moved on, unsatisfied.

The reason: **the textbook answer is incomplete, and the incomplete part is the whole point.**

---

## Part 0: `List` is an interface, not a thing

Let's clear this up first, because it's a real source of confusion.

```java
List<String> names = new ArrayList<>();
```

- **`List`** is an **interface** — a contract. It says "whatever I am, I support `add`, `get`, `remove`, `size`, and I keep elements in order and allow duplicates." It contains **no code that does anything**.
- **`ArrayList`** is a **class** — an actual implementation, using an array underneath.
- **`LinkedList`** is a different class implementing the same contract, using linked nodes.

The relationship:

```
              Iterable  (interface)
                 │
             Collection  (interface)
                 │
                List  (interface)   ← "ordered, indexed, duplicates allowed"
               ╱     ╲
       ArrayList     LinkedList     ← classes: actual implementations
```

### Why declare the variable as `List` rather than `ArrayList`?

```java
List<String> names = new ArrayList<>();       // ✓ preferred
ArrayList<String> names2 = new ArrayList<>(); // ✗ over-specified
```

Because it lets you swap the implementation without touching any other code. Your method signature says "give me any List" and it doesn't care which one arrives:

```java
public double average(List<Integer> numbers) { ... }   // accepts either
```

This is **programming to an interface**, and it's the Dependency Inversion principle in practice.

### Sibling interfaces worth knowing

| Interface | Contract |
|---|---|
| `List` | Ordered, indexed, duplicates allowed |
| `Set` | No duplicates, usually unordered |
| `Queue` | FIFO — add at one end, remove from the other |
| `Deque` | Double-ended — add/remove at **both** ends |
| `Map` | Key → value pairs (not a `Collection`) |

---

## Part 1: The plain array

The most primitive option:

```java
int[] numbers = new int[5];
numbers[0] = 10;
System.out.println(numbers[2]);
System.out.println(numbers.length);   // a field, not a method
```

### What it is in memory

**A single contiguous block.** Five ints, 4 bytes each, side by side:

```
address:  1000  1004  1008  1012  1016
         ┌─────┬─────┬─────┬─────┬─────┐
         │ 10  │  0  │  0  │  0  │  0  │
         └─────┴─────┴─────┴─────┴─────┘
```

### Why `get(i)` is instant

Because it's arithmetic, not searching:

```
address of element i = base_address + (i × element_size)
element 3            = 1000 + (3 × 4) = 1012
```

The CPU computes an address and reads it. **One operation, regardless of array size.** An array of ten and an array of ten million take exactly the same time.

That's what **O(1)** means here — not "fast," but "the time doesn't depend on n."

### Array limitations

```java
int[] a = new int[5];
a[5] = 1;                    // ✗ ArrayIndexOutOfBoundsException — fixed size, forever
```

- **Size is fixed at creation.** Want a sixth element? Allocate a new array and copy.
- **No helper methods.** No `add`, `remove`, `contains`. Just indexing.
- **Can hold primitives** (`int[]`, `double[]`) — which is a genuine advantage, covered below.

---

## Part 2: ArrayList

An `ArrayList` is **an array plus automatic resizing plus convenience methods**.

Inside, it really is just an array:

```java
public class ArrayList<E> {
    transient Object[] elementData;   // the actual storage
    private int size;                 // how many slots are USED
}
```

Note there are two different numbers: **capacity** (how big the array is) and **size** (how many elements you've added). `list.size()` returns the second.

### How growth works

```java
List<String> list = new ArrayList<>();   // capacity 10 on first add
```

When you add an 11th element:

```
1. allocate a new array of capacity 15   (old + old/2 — 1.5x growth)
2. System.arraycopy(old, 0, new, 0, 10)  (a fast native memory copy)
3. elementData = new
4. add the element
```

The old array becomes garbage.

### Amortised O(1) — the phrase to use

Adding to the end is *usually* O(1) — write to the next free slot, increment size. But *occasionally* it's O(n) because of the copy.

Average it out: adding n elements involves copies at 10, 15, 22, 33, 49... a geometric series that sums to less than 2n total copies. So the **average per-add cost is constant**.

That's **amortised O(1)**. Saying "amortised" in an interview signals you actually understand it.

**Practical tip:** if you know the size, say so:

```java
List<String> list = new ArrayList<>(10_000);   // one allocation, zero copies
```

### Inserting in the middle is the expensive part

```java
list.add(0, "new");    // insert at the front
```

Every existing element must shift one slot right:

```
before:  [A][B][C][D][ ]
                ↓ shift everything right
after:   [X][A][B][C][D]
```

**O(n)**. Adding 100,000 items to the front of an `ArrayList` is roughly 5 billion element moves.

### The API

```java
List<String> list = new ArrayList<>();
list.add("a");                  // append          O(1) amortised
list.add(0, "z");               // insert at index O(n)
list.get(1);                    // read            O(1)
list.set(1, "b");               // overwrite       O(1)
list.remove(0);                 // remove by index O(n)
list.remove("a");               // remove by value O(n) — must search first
list.contains("a");             // search          O(n)
list.indexOf("a");              // search          O(n)
list.size();                    //                 O(1)
```

---

## Part 3: LinkedList

A completely different shape. Instead of one contiguous block, each element is its **own object** holding pointers to its neighbours:

```java
private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;
}
```

Java's `LinkedList` is **doubly linked** — each node knows both neighbours.

```
head                                                    tail
 │                                                       │
 ▼                                                       ▼
┌──────┐ ⇄ ┌──────┐ ⇄ ┌──────┐ ⇄ ┌──────┐
│  A   │   │  B   │   │  C   │   │  D   │
└──────┘   └──────┘   └──────┘   └──────┘

Each box is a separate object, scattered anywhere in the heap.
```

### Why `get(i)` is slow

There's no arithmetic to do. To reach element 3, you must **walk**:

```
start at head → next → next → next
```

**O(n)**. (Java optimises slightly: if the index is past the halfway point it walks backwards from the tail. Still O(n).)

### Why insertion at the ends is fast

Adding to the front is just pointer surgery:

```
before:      head → [A] ⇄ [B] ⇄ [C]

new node:    [X]

after:       head → [X] ⇄ [A] ⇄ [B] ⇄ [C]
```

Set two pointers. **O(1)**. No shifting, no copying, no matter how many elements exist.

---

## Part 4: The answer she was actually looking for

Here's the standard answer everyone gives:

> *"ArrayList has O(1) access but O(n) insertion. LinkedList has O(n) access but O(1) insertion."*

**The second half is misleading, and that's why she asked again.**

### The correction: LinkedList insertion in the middle is ALSO O(n)

```java
linkedList.add(5000, "x");
```

To insert at index 5000, you must first **get to** index 5000. That's a 5,000-step walk. Only *then* is the pointer update O(1).

```
find the position:  O(n)   ← the expensive part
rewire pointers:    O(1)   ← the part everyone quotes
─────────────────────────
total:              O(n)
```

So for arbitrary insertion, **both are O(n)**. `ArrayList` pays for shifting; `LinkedList` pays for walking. The Big-O is identical.

### So what IS LinkedList's real advantage?

Two specific cases:

**1. Insert or remove at the ends.**

```java
linkedList.addFirst("x");     // O(1) — no walking needed, head is right there
linkedList.removeFirst();     // O(1)
linkedList.addLast("y");      // O(1)
linkedList.removeLast();      // O(1)
```

**2. Insert or remove at a position you're already holding** — via an iterator:

```java
Iterator<String> it = linkedList.iterator();
while (it.hasNext()) {
    if (it.next().startsWith("temp")) {
        it.remove();          // O(1) — the iterator already has the node
    }
}
```

Removing 10,000 items this way from a `LinkedList` is 10,000 pointer updates. From an `ArrayList` it's 10,000 array shifts.

### The sentence to say

> *"LinkedList's only genuine advantage is O(1) insert and remove at the ends, or at a position an iterator already holds. That makes it a **Deque**, not really a List. And `ArrayDeque` beats it at being a Deque too. In practice `ArrayList` is the default and `LinkedList` is almost never the right choice."*

---

## Part 5: Why ArrayList wins even when Big-O says it shouldn't

This is the part that separates a memorised answer from an understood one.

### Cache locality

Your CPU doesn't read memory one byte at a time. It reads **cache lines** — 64-byte chunks — into a small, extremely fast cache.

Accessing RAM is roughly **100× slower** than accessing L1 cache. So performance in practice is often decided by cache hit rate, not by operation count.

**ArrayList:** elements sit contiguously. Reading element 0 pulls elements 1 through 15 into cache for free. Iterating is nearly all cache hits.

```
one cache line = 64 bytes = 16 ints
[0][1][2][3][4][5][6][7][8][9][10][11][12][13][14][15]  ← one memory fetch
```

**LinkedList:** each node is a separate heap object, potentially anywhere. Following `next` is a **pointer chase** to an unpredictable address — likely a cache miss each time. The CPU's prefetcher can't help, because it can't guess where the next node is until it reads the current one.

```
[Node A] ... 4KB away ... [Node B] ... 12KB away ... [Node C]
   miss                       miss                      miss
```

### Memory overhead

Storing one `Integer` in a list of 1,000,000:

| | Per element | Total |
|---|---|---|
| `int[]` | 4 bytes | ~4 MB |
| `ArrayList<Integer>` | 4 (ref) + ~16 (Integer object) = 20 | ~20 MB |
| `LinkedList<Integer>` | ~16 (Integer) + ~24 (Node: item, next, prev + header) = 40 | ~40 MB |

`LinkedList` uses roughly **10× the memory of a primitive array** and **2× an ArrayList**. More memory means more cache misses and more GC pressure — a million extra objects for the collector to trace.

### The practical result

Benchmark almost anything and `ArrayList` wins — including cases where `LinkedList` "should" be faster by Big-O. Even iterate-and-remove-from-middle often favours `ArrayList`, because `System.arraycopy` is a highly optimised bulk memory move while pointer chasing is a series of cache misses.

> **Big-O counts operations. It doesn't know that some operations are 100× more expensive than others.**

That sentence is what a strong candidate says.

---

## Part 6: The decision table

| Operation | `ArrayList` | `LinkedList` | Winner in practice |
|---|---|---|---|
| `get(i)` | **O(1)** | O(n) | ArrayList, overwhelmingly |
| `add` at end | O(1) amortised | O(1) | ArrayList (locality) |
| `add`/`remove` at front | O(n) | **O(1)** | LinkedList |
| `add`/`remove` in middle | O(n) shift | O(n) walk | ArrayList (arraycopy is fast) |
| `remove` via iterator | O(n) | **O(1)** | LinkedList |
| `contains` | O(n) | O(n) | ArrayList (locality) |
| Iterate all | O(n) | O(n) | ArrayList, by a lot |
| Memory per element | Low | ~2× higher | ArrayList |

### When to actually use each

**Use `ArrayList`** — the default. Random access, iteration, appending, anything general. If you're unsure, this is the answer.

**Use `LinkedList`** — almost never. If you genuinely need a queue or a deque, use `ArrayDeque`, which is array-backed (so it has cache locality) and still O(1) at both ends.

**Use a plain array** — when you need primitives without boxing (`int[]` not `List<Integer>`), when the size is fixed and known, or in tight numeric loops where every byte and cycle matters.

```java
Deque<String> queue = new ArrayDeque<>();   // ✓ prefer this
Deque<String> queue2 = new LinkedList<>();  // ✗ works, but slower
```

---

## Part 7: Traps worth knowing

### `Arrays.asList` returns a fixed-size view

```java
List<String> list = Arrays.asList("a", "b", "c");
list.set(0, "z");     // ✓ allowed — writes through to the backing array
list.add("d");        // ✗ UnsupportedOperationException
```

It's a **view** over the array, not a copy. Fixed size. To get a real list:

```java
List<String> real = new ArrayList<>(Arrays.asList("a", "b", "c"));
```

### `List.of` is fully immutable (Java 9+)

```java
List<String> list = List.of("a", "b", "c");
list.set(0, "z");     // ✗ UnsupportedOperationException
list.add("d");        // ✗ UnsupportedOperationException
```

Also rejects nulls. Prefer it for constants.

### `ConcurrentModificationException`

```java
for (String s : list) {
    if (s.startsWith("temp")) {
        list.remove(s);        // ✗ ConcurrentModificationException
    }
}
```

The iterator keeps a `modCount`; changing the list behind its back invalidates it. This is **fail-fast** behaviour — deliberately throwing rather than silently skipping elements.

Three correct approaches:

```java
list.removeIf(s -> s.startsWith("temp"));               // ✓ cleanest

Iterator<String> it = list.iterator();                  // ✓ explicit
while (it.hasNext()) {
    if (it.next().startsWith("temp")) it.remove();
}

List<String> kept = list.stream()                       // ✓ new list
    .filter(s -> !s.startsWith("temp"))
    .toList();
```

### Removing by index vs by value

```java
List<Integer> nums = new ArrayList<>(List.of(10, 20, 30));
nums.remove(1);                        // removes INDEX 1 → the value 20
nums.remove(Integer.valueOf(10));      // removes the VALUE 10
```

`remove(int)` and `remove(Object)` are different overloads. With `List<Integer>` this is a genuine footgun.

### Autoboxing costs more than you think

```java
List<Integer> list = new ArrayList<>();
for (int i = 0; i < 1_000_000; i++) {
    list.add(i);          // each int becomes an Integer object
}
```

A million heap allocations, roughly 20 MB, and GC pressure. `int[]` would be 4 MB and zero allocations. (Integers from −128 to 127 are cached, which is also why `Integer a = 128, b = 128; a == b` is false while `127 == 127` is true.)

---

## The 30-second interview answer

> *"`List` is an interface — the contract for an ordered, indexed collection allowing duplicates. `ArrayList` and `LinkedList` are two implementations.*
>
> *`ArrayList` is a resizable array. `get(i)` is O(1) because the address is arithmetic. Appending is amortised O(1) — it grows 1.5× and copies, which averages to constant. Inserting in the middle is O(n) because of shifting.*
>
> *`LinkedList` is doubly-linked nodes. `get(i)` is O(n) because you have to walk. Insertion at the ends is O(1).*
>
> *But the important nuance: `LinkedList` insertion in the **middle** is also O(n), because finding the position costs the traversal. Its only real advantage is O(1) at the ends or at a held iterator position — which makes it a Deque, and `ArrayDeque` does that better.*
>
> *In practice `ArrayList` almost always wins, even where Big-O suggests otherwise, because contiguous memory gives cache locality and `LinkedList` pointer-chasing causes cache misses. Big-O counts operations; it doesn't know some operations are 100× more expensive than others."*

That last paragraph is the one that would have stopped the question being asked twice.
