---
title: "Array Replacement: The Difference-Array Trick, Explained From Scratch"
excerpt: "A Codeforces Div. 2 D that looks brutal — replace a[i] with a[i-1] - a[i] + a[i+1] whenever its two neighbours share parity — turns out to be nothing but sorting. Here is the whole thought process: how the difference array collapses that formula into a single adjacent swap, why the parity gate becomes 'same parity', and why sorting each run ascending is provably optimal."
date: "2026-08-12"
tags: ["competitive-programming", "codeforces", "algorithms", "difference-array", "prefix-sums", "greedy", "cpp", "java"]
author: "Aryansh Kurmi"
---

*A beginner-friendly walkthrough of how a scary-looking operation turns out to be a simple sort in disguise.*

## The problem

You're given an array `a` of length `n`. You may repeat this operation as many times as you like (including zero times):

> Pick an index `i` strictly inside the array (`2 ≤ i ≤ n-1`) such that its two neighbours `a[i-1]` and `a[i+1]` have the **same parity** (both even, or both odd). Then replace `a[i]` with `a[i-1] - a[i] + a[i+1]`.

Your goal: produce the **lexicographically smallest** array you can.

(Lexicographically smallest just means: compare the arrays position by position from the left; at the first spot where they differ, the smaller one wins. It's "dictionary order" for numbers.)

The constraints that matter: `n` runs up to about `2·10⁵` per test, values up to `10⁹` in magnitude, and many test cases per file. So the intended solution is roughly `O(n log n)` — and, as we'll see at the end, those numbers are exactly why one line of the final code needs 64-bit integers.

At first glance this is intimidating. The operation mixes three elements together with a weird formula, there's a parity gate on when you're even allowed to do it, and "any number of times" means the search space is enormous. Trying to brute-force it is hopeless.

So we're not going to brute-force it. We're going to **understand** it. This post is about the thought process, step by step, that turns this into a ten-line solution.

---

## Step 0: When you see a "local, linear" operation, look at the differences

Here's a habit worth building early. Whenever an operation is:

- **local** — it only touches an element and its immediate neighbours, and
- **linear** — the new value is just additions and subtractions of nearby values,

...then two tools almost always simplify it: **prefix sums** and **difference arrays**. One of them usually turns the mess into something clean.

Our operation is both local and linear, so let's try the difference array and see what happens.

**The difference array.** For an array `a` of length `n`, define its *gaps between neighbours*:

```
d[k] = a[k+1] - a[k]      for k = 1, 2, ..., n-1
```

So `d` has length `n-1`. For example, if `a = [10, 10, 8, 4]`, then `d[1] = 10 - 10 = 0`, `d[2] = 8 - 10 = -2`, and `d[3] = 4 - 8 = -4`:

<figure class="bc-fig"><div class="bc-fig-title">The difference array — gaps between neighbours</div><div class="bc-scroll"><div class="bc-row"><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even">0</span><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even">−2</span><span class="bc-cell bc-neutral">8</span><span class="bc-cell bc-gap bc-even">−4</span><span class="bc-cell bc-neutral">4</span></div></div><div class="bc-legend"><span><span class="bc-swatch" style="background:rgba(148,163,184,.45)"></span>array value <code>a[k]</code></span><span><span class="bc-swatch" style="background:rgba(59,130,246,.6)"></span>gap <code>d[k] = a[k+1] − a[k]</code></span></div><figcaption>Four values, three gaps. Notice the gaps are drawn <em>between</em> the values, because that's exactly what they are — the step you take to get from one element to the next.</figcaption></figure>

Two things to keep in mind about difference arrays, because we'll use both:

1. **`a[1]` plus the differences rebuilds the whole array.** Since `a[k] = a[1] + d[1] + d[2] + ... + d[k-1]`, if you know `a[1]` and you know `d`, you can reconstruct every element.
2. **Rearranging `d` rearranges `a` in a controlled way.** Changing the order of the gaps changes the running total at each step — which is exactly the kind of control we want.

Now the key question: **what does one operation do to the difference array?**

---

## Step 1: The operation is secretly just a swap

Let's compute it. We operate at index `i`, so `a[i]` becomes `a[i-1] - a[i] + a[i+1]`. The only gaps that can change are the two touching position `i`, namely `d[i-1] = a[i] - a[i-1]` and `d[i] = a[i+1] - a[i]`. Let's find their new values.

Call the new middle value `a[i]' = a[i-1] - a[i] + a[i+1]`.

**New `d[i-1]`:**
```
d[i-1]' = a[i]' - a[i-1]
        = (a[i-1] - a[i] + a[i+1]) - a[i-1]
        = a[i+1] - a[i]
        = old d[i]        ← this was the OTHER gap!
```

**New `d[i]`:**
```
d[i]' = a[i+1] - a[i]'
      = a[i+1] - (a[i-1] - a[i] + a[i+1])
      = a[i] - a[i-1]
      = old d[i-1]        ← and this is the FIRST gap!
```

Look at what happened: the new `d[i-1]` is the old `d[i]`, and the new `d[i]` is the old `d[i-1]`. **The operation simply swaps two adjacent differences.** That's the entire "aha" of this problem. A bewildering three-term formula is nothing more than swapping two neighbouring gaps.

Don't take my word for it — watch it happen on the array from above. Take `a = [10, 10, 8, 4]` and operate at `i = 3`. Its neighbours are `a[2] = 10` and `a[4] = 4`, both even, so we're allowed. The new middle value is `10 - 8 + 4 = 6`:

<figure class="bc-fig"><div class="bc-fig-title">One operation, watched from both sides</div><div class="bc-step">before</div><div class="bc-scroll"><div class="bc-row"><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even">0</span><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even bc-hl">−2</span><span class="bc-cell bc-neutral bc-hl">8</span><span class="bc-cell bc-gap bc-even bc-hl">−4</span><span class="bc-cell bc-neutral">4</span></div></div><div class="bc-step">↓ &nbsp; operate at i = 3 &nbsp;·&nbsp; a[3] ← a[2] − a[3] + a[4] = 10 − 8 + 4 = 6</div><div class="bc-scroll"><div class="bc-row"><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even">0</span><span class="bc-cell bc-neutral">10</span><span class="bc-cell bc-gap bc-even bc-hl">−4</span><span class="bc-cell bc-neutral bc-hl">6</span><span class="bc-cell bc-gap bc-even bc-hl">−2</span><span class="bc-cell bc-neutral">4</span></div></div><div class="bc-step">after</div><figcaption>The array changed in a way that looks arbitrary — <code>8</code> became <code>6</code>. But look at the ringed gaps: <code>−2</code> and <code>−4</code> just traded places. Every other gap, and both end values, are untouched.</figcaption></figure>

As the index `i` ranges over all the legal interior positions `2, 3, ..., n-1`, the pairs we can swap are `(d[1],d[2]), (d[2],d[3]), ..., (d[n-2],d[n-1])` — that is, **every adjacent pair of differences**.

---

## Step 2: The parity gate becomes "same parity of the gaps"

But we can't swap *any* two adjacent gaps whenever we please — the operation is only allowed when `a[i-1]` and `a[i+1]` share parity. Let's translate that condition into the language of `d`.

"`a[i-1]` and `a[i+1]` have the same parity" is the same as saying their difference is even:

```
a[i+1] - a[i-1] is even
```

And notice:

```
a[i+1] - a[i-1] = (a[i+1] - a[i]) + (a[i] - a[i-1]) = d[i] + d[i-1]
```

A sum of two integers is even **exactly when the two integers have the same parity**. So the gate simplifies beautifully:

> You may swap two adjacent differences `d[i-1]` and `d[i]` **if and only if they have the same parity.**

We've now fully rewritten the problem. Forget the original formula. The real game is:

> You have a list of numbers `d`. You may swap two neighbours whenever they have the same parity, as often as you like. Then rebuild `a` from `a[1]` and the rearranged `d`. Make `a` lexicographically smallest.

---

## Step 3: Two consequences of "swap only same-parity neighbours"

**Consequence 1 — the parity pattern is frozen forever.** When you swap two values of the same parity, every position of `d` keeps whatever parity it had (an even stays even, an odd stays odd). So the *sequence of parities* of `d` never changes. It's a permanent fingerprint.

**Consequence 2 — inside a block of same-parity gaps, you can sort freely.** Break `d` into **maximal runs** where consecutive gaps share parity. Every element inside such a run has the same parity, so every neighbouring pair is a legal swap — and adjacent swaps are enough to reach *any* order you want (that's just bubble sort). So within a run, you can arrange the values however you like. But you can **never** move a value across a run boundary, because that boundary is exactly where two different parities meet and swapping is forbidden.

Here's what that looks like on the big example we'll solve in full later:

<figure class="bc-fig"><div class="bc-fig-title">Runs are sealed boxes — walls are where the parity flips</div><div class="bc-scroll"><div class="bc-row"><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">8</span><span class="bc-cell bc-even">6</span><span class="bc-cell bc-even">4</span><span class="bc-cell bc-even">2</span></div><div class="bc-run-label">run 1 · even</div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-odd">−115</span></div><div class="bc-run-label">run 2 · odd</div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">2</span><span class="bc-cell bc-even">12</span><span class="bc-cell bc-even">−6</span><span class="bc-cell bc-even">−2</span></div><div class="bc-run-label">run 3 · even</div></div></div></div><div class="bc-legend"><span><span class="bc-swatch" style="background:rgba(59,130,246,.6)"></span>even gap</span><span><span class="bc-swatch" style="background:rgba(245,158,11,.7)"></span>odd gap</span><span><span class="bc-swatch bc-swatch-wall"></span>wall — nothing crosses it</span></div><figcaption>One stray odd number chops the list into three independent boxes. You may shuffle freely inside a box; you may never move a value from one box to another. A run of size one, like <code>−115</code>, is frozen in place forever.</figcaption></figure>

---

## Step 4: Lexicographically smallest ⇒ sort each run ascending

Now we optimise. Remember `a[k] = a[1] + (d[1] + d[2] + ... + d[k-1])`. The first element `a[1]` never changes. To make `a` lexicographically smallest:

- minimise `a[2]` first ⇒ make `d[1]` as small as possible,
- then minimise `a[3]` ⇒ make `d[2]` as small as possible,
- and so on.

Within a run, putting the values in **ascending order** makes every running total (every prefix sum) as small as it can be, all at once. So we simply **sort each run in increasing order** and rebuild.

<figure class="bc-fig"><div class="bc-fig-title">Sort inside each box — the walls hold</div><div class="bc-scroll"><div class="bc-row"><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">8</span><span class="bc-cell bc-even">6</span><span class="bc-cell bc-even">4</span><span class="bc-cell bc-even">2</span></div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-odd">−115</span></div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">2</span><span class="bc-cell bc-even">12</span><span class="bc-cell bc-even">−6</span><span class="bc-cell bc-even">−2</span></div></div></div></div><div class="bc-step">↓ &nbsp; sort each run ascending</div><div class="bc-scroll"><div class="bc-row"><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even bc-hl">2</span><span class="bc-cell bc-even bc-hl">4</span><span class="bc-cell bc-even bc-hl">6</span><span class="bc-cell bc-even bc-hl">8</span></div><div class="bc-run-label">sorted</div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-odd">−115</span></div><div class="bc-run-label">size 1 · unchanged</div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even bc-hl">−6</span><span class="bc-cell bc-even bc-hl">−2</span><span class="bc-cell bc-even bc-hl">2</span><span class="bc-cell bc-even bc-hl">12</span></div><div class="bc-run-label">sorted</div></div></div></div><figcaption>Each box is sorted on its own. The odd gap never moves, and no even gap hops the wall to join the other side.</figcaption></figure>

Why are the runs safe to optimise independently? Because the **sum of a run never changes** — you're only reordering its elements — so the value of `a` where the *next* run begins is fixed no matter how you arrange the current run. Each box can be solved on its own.

**A tempting wrong turn.** Why not just sort the *entire* difference array ascending and be done? Because that ignores the walls. In the example above, a global sort would drag `−115` to the front and give `a[2] = 100 - 115 = -15`, which is indeed smaller than the `102` we'll end up with. It's just not reachable — no sequence of legal operations can move that odd gap past an even one. Lexicographically smallest means smallest *among the arrays you can actually produce*, and the run structure is precisely the list of what you can produce.

That's the whole algorithm:

1. Build the difference array `d`.
2. Split `d` into maximal same-parity runs.
3. Sort each run ascending.
4. Rebuild the array from `a[1]` and the new `d`.

---

## Two invariants worth noticing (nice sanity checks)

Before we dry-run examples, here are two facts that fall out for free and are great for catching bugs:

- **`a[1]` never changes.** No operation touches the first element, and we rebuild from it.
- **`a[n]` never changes either.** The last element equals `a[1] + (sum of all differences)`. Reordering differences doesn't change their total, so `a[n]` is fixed. In every example below, watch how the first and last numbers stay put.

---

## Worked examples (dry runs)

Let's run the algorithm by hand on six deliberately different arrays. Notice the first and last elements never move.

### Example 1 — all even gaps (the gentle warm-up)

```
a = [10, 10, 8, 4]
```

Differences:

| gap | computation | value | parity |
|-----|-------------|-------|--------|
| d[1] | 10 − 10 | 0  | even |
| d[2] | 8 − 10  | −2 | even |
| d[3] | 4 − 8   | −4 | even |

All three gaps are even (and yes, **0 is even**), so there's a single run `[0, −2, −4]`. Sort it ascending: `[−4, −2, 0]`. Rebuild from `a[1] = 10`:

```
10
10 + (−4) = 6
 6 + (−2) = 4
 4 +   0  = 4
```

**Result: `[10, 6, 4, 4]`.** Much smaller than the original at position 2 (`6 < 10`).

### Example 2 — all odd gaps

```
a = [4, 7, 8, 15]
```

| gap | computation | value | parity |
|-----|-------------|-------|--------|
| d[1] | 7 − 4  | 3 | odd |
| d[2] | 8 − 7  | 1 | odd |
| d[3] | 15 − 8 | 7 | odd |

All odd ⇒ one run `[3, 1, 7]`. Sort ascending ⇒ `[1, 3, 7]`. Rebuild from `4`:

```
4
4 + 1 = 5
5 + 3 = 8
8 + 7 = 15
```

**Result: `[4, 5, 8, 15]`.** Smaller at position 2 (`5 < 7`). Odd runs sort exactly the same way even runs do — parity only decides *who can move*, not *how* we sort.

### Example 3 — an even run full of zeros and negatives

```
a = [3, 3, 5, 5, 3]
```

| gap | computation | value | parity |
|-----|-------------|-------|--------|
| d[1] | 3 − 3 | 0  | even |
| d[2] | 5 − 3 | 2  | even |
| d[3] | 5 − 5 | 0  | even |
| d[4] | 3 − 5 | −2 | even |

One even run `[0, 2, 0, −2]`. Sort ascending ⇒ `[−2, 0, 0, 2]`. Rebuild from `3`:

```
3
3 + (−2) = 1
1 +   0  = 1
1 +   0  = 1
1 +   2  = 3
```

**Result: `[3, 1, 1, 1, 3]`.** This example shows zeros and negatives mingling happily inside one run, and again the ends (`3 ... 3`) stay fixed.

### Example 4 — all elements equal (only-zero gaps)

```
a = [7, 7, 7, 7]
```

Every gap is `0`, so `d = [0, 0, 0]`, all even, one run. Sorting `[0, 0, 0]` does nothing.

**Result: `[7, 7, 7, 7]`** — unchanged. When all differences are zero, there's simply nothing to rearrange; the array is already minimal.

### Example 5 — alternating parity (totally locked)

```
a = [1, 3, 6, 8, 11]
```

| gap | computation | value | parity |
|-----|-------------|-------|--------|
| d[1] | 3 − 1  | 2 | even |
| d[2] | 6 − 3  | 3 | odd  |
| d[3] | 8 − 6  | 2 | even |
| d[4] | 11 − 8 | 3 | odd  |

The parities alternate `E, O, E, O`, so **no two neighbours ever share parity**. Every run has size 1, and a run of size 1 has nothing to sort.

<figure class="bc-fig"><div class="bc-fig-title">Every run has size 1 — nothing can move</div><div class="bc-scroll"><div class="bc-row"><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">2</span></div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-odd">3</span></div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-even">2</span></div></div><div class="bc-wall"></div><div class="bc-run"><div class="bc-run-cells"><span class="bc-cell bc-odd">3</span></div></div></div></div><figcaption>Four boxes, one value each, a wall between every pair. The input is already the answer.</figcaption></figure>

**Result: `[1, 3, 6, 8, 11]`** — identical to the input. Sometimes the answer is "you can't do anything," and the difference array tells you so instantly. (You can double-check directly: at every interior index the two neighbours have different parity, so the operation is never even allowed.)

### Example 6 — a real mix (the capstone)

This is the big sample from the original problem.

```
a = [100, 108, 114, 118, 120, 5, 7, 19, 13, 11]
```

Differences:

| gap | computation | value | parity |
|-----|-------------|-------|--------|
| d[1] | 108 − 100 | 8    | even |
| d[2] | 114 − 108 | 6    | even |
| d[3] | 118 − 114 | 4    | even |
| d[4] | 120 − 118 | 2    | even |
| d[5] | 5 − 120   | −115 | **odd** |
| d[6] | 7 − 5     | 2    | even |
| d[7] | 19 − 7    | 12   | even |
| d[8] | 13 − 19   | −6   | even |
| d[9] | 11 − 13   | −2   | even |

The lone odd gap `−115` splits `d` into three runs — exactly the picture from Step 3:

```
run 1 (even):  [8, 6, 4, 2]        positions 1–4
run 2 (odd):   [−115]              position 5
run 3 (even):  [2, 12, −6, −2]     positions 6–9
```

Sort each run ascending:

```
run 1 → [2, 4, 6, 8]
run 2 → [−115]         (size 1, unchanged)
run 3 → [−6, −2, 2, 12]
```

New difference array: `[2, 4, 6, 8, −115, −6, −2, 2, 12]`. Rebuild from `a[1] = 100`:

```
100
100 +   2  = 102
102 +   4  = 106
106 +   6  = 112
112 +   8  = 120
120 + (−115) = 5
  5 + (−6)  = −1
 −1 + (−2)  = −3
 −3 +   2  = −1
 −1 +  12  = 11
```

**Result: `[100, 102, 106, 112, 120, 5, −1, −3, −1, 11]`.**

Notice how the odd gap acts like a wall: the four even gaps before it are sorted among themselves, the four even gaps after it are sorted among themselves, and `−115` stays frozen in the middle. The first element (`100`) and the last (`11`) are exactly as they started, just as our invariants promised.

---

## The algorithm, in plain steps

```
for each test case:
    read a[1..n]
    build d[1..n-1] where d[k] = a[k+1] - a[k]

    i = 1
    while i <= n-1:
        j = i
        while j <= n-1 and parity(d[j]) == parity(d[i]):
            j = j + 1
        sort d[i .. j-1] in ascending order   # one maximal same-parity run
        i = j

    output a[1]
    running = a[1]
    for k = 1 .. n-1:
        running = running + d[k]
        output running
```

**Time complexity:** building `d` is `O(n)`, and sorting the runs totals `O(n log n)`. That comfortably fits the limits.

---

## Implementation notes (small traps that bite in practice)

- **Use 64-bit integers for the rebuild.** Individual values fit in 32 bits, but when you sort a run ascending, the running total dips through the most negative values first, and those partial sums can reach magnitudes around `n × 2·10⁹ ≈ 4·10¹⁴`. That overflows a 32-bit `int`. Use `long long` in C++ / `long` in Java for the running value.
- **Test parity with the low bit, not `% 2`.** For a negative odd number, `d % 2` is `-1` in both C++ and Java — so a check like `d % 2 == 1` silently fails on exactly the values this problem is full of. `d & 1` is `1` for any odd number regardless of sign. (Comparing `(x & 1) == (y & 1)`, as below, sidesteps the issue entirely.)
- **Fast input/output helps**, since the total input can be large. In C++, `ios_base::sync_with_stdio(false); cin.tie(nullptr);` is enough. In Java, prefer a buffered/byte-level reader over `Scanner`, and build the output in a `StringBuilder` instead of calling `println` per element.
- **A Java-only gotcha:** `Arrays.sort` on a primitive `int[]`/`long[]` uses a dual-pivot quicksort that adversarial test data can force into `O(n²)`. If a single run can be huge, shuffle each run before sorting, or sort boxed `Long[]` (which uses a stable mergesort that isn't vulnerable). C++'s `std::sort` is introsort and has no such weakness, so a plain `sort(...)` is safe there.

---

## A clean reference implementation (C++)

```cpp
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<long long> a(n);
        for (auto &x : a) cin >> x;

        vector<long long> d(n - 1);
        for (int i = 0; i < n - 1; i++) d[i] = a[i + 1] - a[i];

        // sort each maximal same-parity run
        for (int i = 0; i < n - 1; ) {
            int j = i;
            while (j < n - 1 && ((d[j] & 1) == (d[i] & 1))) j++;
            sort(d.begin() + i, d.begin() + j);
            i = j;
        }

        long long cur = a[0];
        cout << cur;
        for (int i = 0; i < n - 1; i++) {
            cur += d[i];
            cout << ' ' << cur;
        }
        cout << '\n';
    }
    return 0;
}
```

## The same thing in Java

Identical logic; the only additions are a fast reader, a `StringBuilder` for output, and the shuffle that defuses the anti-quicksort issue mentioned above.

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        StreamTokenizer in = new StreamTokenizer(new BufferedInputStream(System.in));
        StringBuilder sb = new StringBuilder();
        Random rng = new Random();

        in.nextToken();
        int t = (int) in.nval;
        while (t-- > 0) {
            in.nextToken();
            int n = (int) in.nval;

            long[] a = new long[n];
            for (int i = 0; i < n; i++) {
                in.nextToken();
                a[i] = (long) in.nval;
            }

            long[] d = new long[n - 1];
            for (int i = 0; i < n - 1; i++) d[i] = a[i + 1] - a[i];

            for (int i = 0; i < n - 1; ) {
                int j = i;
                while (j < n - 1 && ((d[j] & 1) == (d[i] & 1))) j++;

                // Fisher-Yates before sorting: Arrays.sort on a primitive array
                // is a quicksort that crafted input can push to O(n^2).
                for (int k = j - 1; k > i; k--) {
                    int r = i + rng.nextInt(k - i + 1);
                    long tmp = d[k]; d[k] = d[r]; d[r] = tmp;
                }
                Arrays.sort(d, i, j);
                i = j;
            }

            long cur = a[0];
            sb.append(cur);
            for (int i = 0; i < n - 1; i++) {
                cur += d[i];
                sb.append(' ').append(cur);
            }
            sb.append('\n');
        }
        System.out.print(sb);
    }
}
```

---

## The one lesson to carry forward

The single most valuable takeaway isn't the answer — it's the **reflex**:

> When an operation is *local* (touches only neighbours) and *linear* (just plus and minus), immediately ask what it does to the **prefix-sum array** and the **difference array**.

Here, that reflex converted a baffling replacement into "swap adjacent gaps," and a parity condition into "same parity." Everything after that was ordinary sorting. This exact difference-array-as-swaps idea reappears across competitive programming — a well-known cousin is Codeforces [*Magic Stones* (1110E)](https://codeforces.com/problemset/problem/1110/E), where a nearly identical rewrite turns "is B reachable from A?" into "do the two difference multisets match?". Each time you meet it, it costs you less — because you're not solving a new puzzle, you're recognising an old friend wearing a disguise.
