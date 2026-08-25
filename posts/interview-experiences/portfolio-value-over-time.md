---
title: "Portfolio Value Over Time — An Interview Question, Explained Like You're Five"
excerpt: "A DSA round I sat where the question looked like a nested-array chore and turned out to be a difference array in disguise. Every section starts with the kid-level version, then drops into the real Java — brute force, the delta trick, a full dry run, and why the answer I actually gave in the room was subtly wrong."
date: "2026-08-18"
tags: ["interview", "dsa", "difference-array", "prefix-sum", "java", "arrays", "eli5"]
author: "Aryansh Kurmi"
---

# Portfolio Value Over Time — An Interview Question, Explained Like You're Five

I got this in a DSA round recently. On the surface it reads like nested-array bookkeeping. Underneath it's a **difference array**, and the entire interview turns on whether you notice that.

I did *not* notice it in the room. I gave an answer built out of two HashMaps and a Set, and it was subtly wrong in a way that only shows up on a test case I wasn't asked to run. That part is written up honestly below, because the wrong answer is the more useful thing to read.

Every section here comes in two layers: **Like you're 5**, then **what that really is**.

---

## 🧸 The problem

> **Like you're 5:** Imagine a shelf of toys. Each toy has a little price tag on it. Some days somebody comes along and swaps a tag for a new one. On days nobody comes, the tag just stays exactly as it was. Every evening you want to know: how much is the whole shelf worth right now?

**What that really is:**

You're building a brokerage dashboard that plots a user's total portfolio value day by day.

You're given a list of stocks. Each stock is a chronological list of price points `[day, price]`, meaning *on that day the stock's price became `price`*. The **first** price point of a stock is the day you bought it — before that day it isn't in your portfolio and contributes nothing. Between price points, a stock holds its most recent price.

Return an array where entry `d` is the total portfolio value on day `d`: the sum, over every stock you hold by day `d`, of that stock's price as of day `d`.

```java
// stocks[i] is stock i's chronologically sorted list of [day, price] updates
int[][][] stocks;
```

**On days vs. dates:** the input in the room talked about "the date it was bought at." Normalise it away immediately — pick any epoch as your zero and every real calendar date becomes an integer day. Say that out loud and move on; it's a one-line conversion, not the problem.

---

## 🏷️ Why it isn't trivial

> **Like you're 5:** The tag doesn't disappear when the person who wrote it walks away. It stays on the toy until somebody swaps it. So a toy nobody has touched in three days is still worth something today.

**What that really is:** each stock's value over time is a **step function** — it jumps at its update days and holds flat in between. This "carry-forward" is the whole behaviour of the problem, and it's the thing a naive solution forgets.

Here's the smallest example that actually exercises it:

```
Stock A: [[0, 200]]
Stock B: [[2, 50], [4, 60]]
```

| Day | A | B | Total |
|---|---|---|---|
| 0 | 200 | not held | **200** |
| 1 | 200 | not held | **200** |
| 2 | 200 | 50 | **250** |
| 3 | 200 | 50 *(held)* | **250** |
| 4 | 200 | 60 | **260** |

`result = [200, 200, 250, 250, 260]`

Three behaviours in one tiny case: carry-forward, *not yet owned*, and a mid-range price change.

**Clarifying questions worth asking in the room** — half the signal in this problem is whether you untangle the ambiguity instead of coding the first reading:

- Contiguous days `0..D`, or sparse real calendar dates? *(This is the big fork — it decides whether you get a dense array or need coordinate compression.)*
- Can a stock be **sold**, or is it buy-and-hold?
- Can the same stock be bought in multiple lots?
- Full contiguous range, or arbitrary date queries?

---

## 🐌 First instinct — the brute force

> **Like you're 5:** Every single evening, walk down the whole shelf and read every tag out loud, one toy at a time. It works. It's just a lot of walking.

**What that really is:** for each day, for each stock, find its last price point on or before that day, and sum.

```java
long[] brute(int[][][] stocks, int D) {
    long[] res = new long[D + 1];

    for (int d = 0; d <= D; d++) {
        long sum = 0;
        for (int[][] stock : stocks) {
            long last = -1;                 // -1 == not bought yet
            for (int[] update : stock) {
                if (update[0] <= d) last = update[1];
                else break;                 // sorted, so we can stop
            }
            if (last >= 0) sum += last;
        }
        res[d] = sum;
    }
    return res;
}
```

- **Time:** `O(D · N · K)` — every day rescans every stock's full update list.
- **Space:** `O(D)` for the output only.
- **Edge cases handled:** stock bought after day 0, empty stock list, single update.

Say this one first. It's correct, it's fast to write, and it gives you something to improve *from* — which is the conversation the interviewer actually wants.

---

## 🙋 What I actually answered (and why it was wrong)

This is the part worth reading.

I reached for **two HashMaps and a Set**:

1. a `Set` of all unique days,
2. a map of *stock index → (day bought, price on that day)*,
3. a reverse index of *day → number of stocks bought on that day*.

**Where it breaks:** the reverse map counts **stocks**, not **value**. A count can't carry a price forward, and it can't represent a stock whose price *changed* rather than being bought. Run it against the three-stock case below and it falls apart the moment `Stock 0` goes from `200` to `250` on day 3 — no stock was bought that day, so the count doesn't move, but the portfolio value does.

**But the instinct underneath was right.** "Index the events by day" is exactly the correct idea. The fix is one word: store the **value change** on each day, not a stock count. Make that single substitution and both maps and the set collapse into one array — and that array *is* the optimal solution.

That's usually how these rounds go. You're rarely miles off. You're one noun away.

---

## ✨ The trick — write down only what changed

> **Like you're 5:** Don't read every tag every evening. Just keep a sticky note for each day that says *"the shelf got 50 rupees more expensive today"* or *"it got 150 cheaper today."* On days nobody touches anything, the sticky note says zero.

**What that really is:** a **difference array** (a delta array). Since each stock's value is a step function, and the portfolio is a sum of step functions, you only ever need to record the *changes*:

- For a stock's **first** point `(d₀, p₀)`: `delta[d₀] += p₀` — the whole price appears out of nowhere, because you just bought it.
- For each later point `(dₖ, pₖ)` following `(dₖ₋₁, pₖ₋₁)`: `delta[dₖ] += pₖ − pₖ₋₁` — only the difference.

Both cases are the same line of code if you initialise `prev = 0`, because `p₀ − 0 == p₀`. The "just bought" case falls out for free.

`delta[d]` means exactly one thing: **how much the entire portfolio's value moves on day `d` compared to the day before.** A buy is a jump up. A price drop is a jump down. A day with no events is `0` — and *that zero is the carry-forward*, handled for free, with no code.

---

## ➕ The running total

> **Like you're 5:** You don't dump out your piggy bank and recount every coin each morning. You remember what it said yesterday, and you add whatever changed today.

**What that really is:** a **prefix sum** over the delta array. One rule:

```
res[d] = res[d−1] + delta[d]
```

Today's total = yesterday's total + today's change. Walk left to right with a single running number.

```java
long[] portfolio(int[][][] stocks, int D) {
    long[] delta = new long[D + 1];       // net value change per day

    for (int[][] stock : stocks) {
        int prev = 0;                     // 0 so the first point adds the full price
        for (int[] update : stock) {
            int day = update[0], price = update[1];
            delta[day] += price - prev;   // only the change counts
            prev = price;
        }
    }

    long[] res = new long[D + 1];
    long run = 0;
    for (int i = 0; i <= D; i++) {
        run += delta[i];                  // running total
        res[i] = run;
    }
    return res;
}
```

- **Time:** `O(U + D)` where `U` is the total number of updates — every update is touched exactly once.
- **Space:** `O(D)` for the delta and the result.
- **Why it's better:** no rescanning. Work is proportional to *events*, not to *days × stocks*.

---

## 🔍 Full dry run

The prefix-sum step is the part that doesn't click until you watch it move, so here it is on three stocks with overlapping activity:

```
Stock 0: [[0, 200], [1, 400], [5, 250]]
Stock 1: [[1,  50], [2,  70], [4,  80]]
Stock 2: [[0, 155], [5, 160]]
```

### Step 1 — build the delta array

Width 6, all zeros. Rule per point: `delta[day] += price − prev`, with `prev` starting at `0` for each stock.

**Start:** `delta = [0, 0, 0, 0, 0, 0]`

**Stock 0** *(prev resets to 0)*:

| Point | Operation | Result | prev |
|---|---|---|---|
| `(0, 200)` | `delta[0] += 200 − 0` | `delta[0] = 200` | 200 |
| `(1, 400)` | `delta[1] += 400 − 200` | `delta[1] = 200` | 400 |
| `(5, 250)` | `delta[5] += 250 − 400` | `delta[5] = −150` | 250 |

→ `delta = [200, 200, 0, 0, 0, −150]`

**Stock 1** *(prev resets to 0)*:

| Point | Operation | Result | prev |
|---|---|---|---|
| `(1, 50)` | `delta[1] += 50 − 0` | `delta[1] = 250` | 50 |
| `(2, 70)` | `delta[2] += 70 − 50` | `delta[2] = 20` | 70 |
| `(4, 80)` | `delta[4] += 80 − 70` | `delta[4] = 10` | 80 |

→ `delta = [200, 250, 20, 0, 10, −150]`

**Stock 2** *(prev resets to 0)*:

| Point | Operation | Result | prev |
|---|---|---|---|
| `(0, 155)` | `delta[0] += 155 − 0` | `delta[0] = 355` | 155 |
| `(5, 160)` | `delta[5] += 160 − 155` | `delta[5] = −145` | 160 |

→ **`delta = [355, 250, 20, 0, 10, −145]`**

### Step 2 — the prefix sum

| Day | `delta[d]` | `run = run + delta[d]` | `res[d]` |
|---|---|---|---|
| 0 | 355 | `0 + 355` | **355** |
| 1 | 250 | `355 + 250` | **605** |
| 2 | 20 | `605 + 20` | **625** |
| 3 | 0 | `625 + 0` | **625** |
| 4 | 10 | `625 + 10` | **635** |
| 5 | −145 | `635 − 145` | **490** |

`res = [355, 605, 625, 625, 635, 490]`

**Look at day 3.** The delta is `0`, so `run` doesn't move — the value simply carries. That is the entire trick. You never re-add the stocks that didn't change; you only ever apply the difference.

### Sanity check — the slow way

Prices actually held on each day, summed directly:

| Day | S0 | S1 | S2 | Total |
|---|---|---|---|---|
| 0 | 200 | – | 155 | **355** |
| 1 | 400 | 50 | 155 | **605** |
| 2 | 400 | 70 | 155 | **625** |
| 3 | 400 | 70 *(held)* | 155 *(held)* | **625** |
| 4 | 400 | 80 | 155 *(held)* | **635** |
| 5 | 250 | 80 *(held)* | 160 | **490** |

Matches exactly. ✅

**The one sentence to remember:** *store the change on each day, then a running sum rebuilds the totals — because a portfolio's value only moves on days something changes.*

---

## 📅 Killing the `D` parameter

> **Like you're 5:** Nobody has to tell you which days to care about. The days are already written on the sticky notes. The first one is the first day anyone bought a toy, and the last one is the last day anyone changed a tag.

**What that really is:** `D` shouldn't be an input at all. The timeline is a **property of the data**, not something the caller hands you. One pass over every `[day, price]` point gives you `lo` (earliest day — the portfolio starts here) and `hi` (latest day — nothing changes after). And `lo` doesn't have to be `0`; if nothing is bought until day 2, the timeline starts at day 2.

The delta array becomes `hi − lo + 1` wide, and every day is offset to index `day − lo`. That offset is the only new wrinkle.

```java
long[] portfolio(int[][][] stocks) {
    if (stocks == null || stocks.length == 0) return new long[0];

    int lo = Integer.MAX_VALUE, hi = Integer.MIN_VALUE;
    for (int[][] stock : stocks) {
        for (int[] update : stock) {
            lo = Math.min(lo, update[0]);
            hi = Math.max(hi, update[0]);
        }
    }
    if (lo > hi) return new long[0];          // every stock had zero updates

    int n = hi - lo + 1;
    long[] delta = new long[n];

    for (int[][] stock : stocks) {
        int prev = 0;
        for (int[] update : stock) {
            delta[update[0] - lo] += update[1] - prev;   // shift by lo
            prev = update[1];
        }
    }

    long[] res = new long[n];
    long run = 0;
    for (int i = 0; i < n; i++) {
        run += delta[i];
        res[i] = run;
    }
    return res;                                // res[i] is the value on day lo + i
}
```

**Where the offset earns its keep.** With `lo = 0` the offset is invisible, so try a late start:

```
Stock A: [[2, 100]]
Stock B: [[3,  50], [4, 60]]
```

First pass → `lo = 2`, `hi = 4`, so `n = 3`.

- A `(2, 100)`: `delta[2−2] += 100` → `delta[0] = 100`
- B `(3, 50)`: `delta[3−2] += 50` → `delta[1] = 50`
- B `(4, 60)`: `delta[4−2] += 10` → `delta[2] = 10`

`delta = [100, 50, 10]` → prefix → `res = [100, 150, 160]`, mapping to days **2, 3, 4**.

**One API call worth stating out loud:** when the start isn't `0`, returning a bare array forces the caller to remember *"index 0 means day `lo`."* Cleaner is to return `[day, value]` pairs — here `[[2,100],[3,150],[4,160]]` — so every row is self-describing. Mention both and pick the pair form. It shows you thought about the interface, not just the algorithm.

---

## 📈 Scale-ups to have ready

The follow-ups are where the round gets decided. Have these one-liners loaded:

| They ask | You say |
|---|---|
| **Sparse / real calendar dates**, huge range | Swap the `long[]` delta for a `TreeMap<Integer, Long>` and prefix-sum over the sorted keys only. `O(U log U)`, independent of the range. Don't allocate `hi − lo + 1` when only `~U` days matter. |
| **Selling a stock** | A sell is just a negative event: `delta[day] -= currentPrice`. Same machinery, no new code path. |
| **Multiple lots of the same stock** | Treat each lot as its own step function. The deltas simply add. |
| **Live queries while updates stream in** | Fenwick tree (BIT) or segment tree over compressed days — `O(log U)` per update and per query. |
