---
title: "De Shaw Interview — Java Autoboxing & Unboxing"
excerpt: "A De Shaw round where I was handed a deliberately tricky Integer vs int snippet. Here's the snippet, the answer I gave, and the full theory of why Java's autoboxing and unboxing make each line behave the way it does — including the Integer cache landmine."
date: "2026-03-03"
category: "interview-experiences"
tags: ["interview", "de-shaw", "java", "autoboxing", "unboxing", "integer-cache"]
author: "Aryansh Kurmi"
---

# De Shaw Interview — Java Autoboxing & Unboxing

One of the sharper questions in my De Shaw round was a small Java snippet built entirely to test whether you really understand **autoboxing** and **unboxing** — and the difference between `==` and `.equals()` on wrapper types. The comments in the snippet were deliberately wrong; the task was to read through Java's boxing/unboxing rules and give the correct output for each line.

Here's the snippet exactly as it was handed to me, with the (intentionally misleading) comments:

```java
Integer i1 = 123;
int i2 = 123;
Integer i3 = new Integer(123);
Integer i4 = 123;

boolean a = (i1 == i2);       // claimed: false
boolean c = (i2 == i3);       // claimed: false
boolean c = (i1 == i3);       // claimed: true
boolean e = (i2 == i4);       // claimed: false
boolean b = (i2.equals(i3));  // claimed: Compilation error
boolean d = (i2.equals(i1));  // claimed: Compilation error
```

Almost every commented output above is wrong. Java is running a little boxing/unboxing puppet show here 🎭 — and once you track which values are primitives and which are objects, the real answers fall out cleanly. This is the corrected version I walked the interviewer through:

```java
Integer i1 = 123;
int i2 = 123;
Integer i3 = new Integer(123);
Integer i4 = 123;

boolean a = (i1 == i2);       // true
boolean b = (i2 == i3);       // true
boolean c = (i1 == i3);       // false
boolean e = (i2 == i4);       // true

// boolean x = i2.equals(i3); // Compilation error
// boolean y = i2.equals(i1); // Compilation error
```

## The theory: autoboxing and unboxing

Java has two parallel worlds for integers:

- **Primitives** — `int`, the raw 32-bit value. Lives on the stack, has no methods, compared by value.
- **Wrappers** — `Integer`, a full object that *wraps* an `int`. Lives on the heap, has methods like `.equals()`, and with `==` is compared by **reference** (identity), like any object.

**Autoboxing** is Java automatically converting a primitive into its wrapper when an object is expected:

```java
Integer i1 = 123;        // autoboxing: compiler rewrites this as
Integer i1 = Integer.valueOf(123);
```

**Unboxing** is the reverse — automatically pulling the primitive `int` back out of an `Integer` when a primitive is expected:

```java
int x = i1;              // unboxing: compiler rewrites this as
int x = i1.intValue();
```

**Why does Java do this at all?** Before Java 5 you had to convert by hand (`new Integer(x)`, `obj.intValue()`) every time you moved between primitives and collections like `List<Integer>` (collections can't hold primitives). It was noisy and error-prone. Autoboxing/unboxing was introduced so primitives and their wrappers can be used interchangeably, letting you write `list.add(5)` or `int total = list.get(0)` without manual conversions — the compiler inserts them for you. The convenience is real, but it hides exactly the kind of `==` subtlety this question is built around.

The single most important rule to internalize:

> When `==` involves **one primitive and one wrapper**, Java **unboxes the wrapper** and does a **value** comparison.
> When `==` involves **two wrappers**, there is no unboxing — it's a **reference** comparison.

## Line by line

**`i1 == i2` → `true`**
`i1` is an `Integer`, `i2` is an `int`. Because one side is a primitive, Java unboxes `i1` to an `int`, so the comparison becomes `123 == 123`. Value comparison ⇒ `true`.

**`i2 == i3` → `true`**
Same situation: `i2` is a primitive `int`, so the wrapper `i3` is unboxed to `int`. Again `123 == 123` ⇒ `true`. (Note: it does **not** matter that `i3` was created with `new` here — unboxing reads its underlying value regardless of how the object was built.)

**`i1 == i3` → `false`**
Both sides are `Integer` objects, so **no unboxing happens** — `==` compares references. `i1` came from autoboxing, which routes through `Integer.valueOf(123)` and returns a **cached** shared object. `i3 = new Integer(123)` is forced to allocate a **brand-new** object on the heap. Two different references ⇒ `false`.

**`i2 == i4` → `true`**
`i2` is a primitive, so `i4` is unboxed to `int`. `123 == 123` ⇒ `true`.

**`i2.equals(i3)` and `i2.equals(i1)` → Compilation error**
`i2` is a primitive `int`. Primitives are not objects and have **no methods**, so you cannot call `.equals()` (or anything else) on them. This fails at **compile time**, before the program ever runs.

## The flip side: calling `.equals()` on the wrappers

If instead you call `.equals()` on the **wrapper** objects, it compiles fine and compares the *values inside* the objects — never references:

```java
i1.equals(i3)   // true  — both wrap the value 123
i4.equals(i1)   // true  — both wrap the value 123
```

This is the key contrast with `==`: `Integer.equals()` is overridden to compare the boxed numeric values, so it sidesteps the whole identity-vs-value trap that `==` falls into.

## The Integer cache landmine

The reason `i1 == i3` is `false` but autoboxed values can sometimes be `==` to each other comes down to the **Integer cache**. `Integer.valueOf()` caches and reuses `Integer` objects for values in the range **−128 to 127**. So:

```java
Integer x = 127;
Integer y = 127;
x == y;          // true  — both point to the SAME cached object

Integer p = 128;
Integer q = 128;
p == q;          // false — 128 is outside the cache, so two new objects
```

Both pairs are equal in *value*, but `==` only agrees for the cached range. This is exactly why relying on `==` for wrapper equality is dangerous, and why `i1 == i3` is `false` — `new Integer(123)` deliberately bypasses the cache and forces a fresh allocation even though `123` is within the cached range.

## The rules worth memorizing

- `==` with **two wrappers** → **reference** comparison (identity).
- `==` with **wrapper + primitive** → wrapper is **unboxed**, then **value** comparison.
- `.equals()` works only on **objects**, not primitives — calling it on an `int` is a compile error.
- `Integer.valueOf()` (and therefore autoboxing) **caches −128 to 127**; `new Integer(...)` always allocates a fresh object.
- For comparing wrapper values, always prefer `.equals()` (or unbox to primitives explicitly) — never `==`.

| Expression | Result | Why |
|---|---|---|
| `i1 == i2` | `true` | wrapper unboxed → `123 == 123` |
| `i2 == i3` | `true` | wrapper unboxed → `123 == 123` |
| `i1 == i3` | `false` | two objects; cached vs `new` ⇒ different refs |
| `i2 == i4` | `true` | wrapper unboxed → `123 == 123` |
| `i2.equals(i3)` | compile error | `i2` is a primitive `int`, no methods |
| `i2.equals(i1)` | compile error | `i2` is a primitive `int`, no methods |
| `i1.equals(i3)` | `true` | wrapper `.equals()` compares values |
