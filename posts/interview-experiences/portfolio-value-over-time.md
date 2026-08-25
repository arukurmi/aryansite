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
