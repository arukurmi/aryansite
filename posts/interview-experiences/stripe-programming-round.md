---
title: "Stripe Programming Round Interview Experience"
excerpt: "A walkthrough of Stripe's programming round — from the take-home-style assessment to a live 60-minute problem-solving session built around a 3-part shipping-cost problem that scales from a simple min-sum into a full DP. With the full problem, my actual solutions, and the optimal ones."
date: "2026-06-17"
category: "interview-experiences"
tags: ["interview", "stripe", "problem-solving", "dynamic-programming", "javascript", "algorithms"]
author: "Aryansh Kurmi"
---

# Stripe Programming Round Interview Experience

The process started with an **online assessment link**. The questions themselves were doable — nothing exotic — but the difficulty was hidden in the *hard part* of each one: the obvious solution passed the small cases, and the real work was getting the complexity down so it survived the larger constraints. Clear that part and you move on.

The first live round was the one I'm writing up here.

## 🤝 How the round opened

- **5 min intro.** Greetings were exchanged, the start was smooth, and the interviewer asked me a *tad bit* about one of my projects at **GoKwik** — just enough to get a conversation going, no deep follow-ups needed.
- **The HackerRank link.** He then shared a HackerRank link. When it loaded, **only one question was visible** — which felt deceptively small. It turned out that single question was really just **one part of a 3-part problem**; the next parts were revealed as I went.
- **The rules.** The interviewer made it clear up front: he just wanted **working code**. In the 45 minutes of problem solving, the goal was to get through **as many parts as possible** — correctness and momentum over premature polish.

**Round shape:** 5 min intro · 45 min problem solving (3 parts) · 10 min Q&A.

## 📦 The Problem — Stripe Shipping Service

> **Context given by the interviewer:** Stripe is building a shipping service. A truck travels along a railroad and must visit factories to complete a sequence of processes: **Manufacturing → Building → Packaging** (and in Part 3, **K** arbitrary processes). Each factory has a *cost* and a *position* on the railroad. The goal is to complete all processes at minimum total cost.

**Input data structure:** a 3D array (array of arrays of arrays). The outermost array has **K** sub-arrays — one per process. Each sub-array has **N** factories. Each factory is `[cost, position]`. All K process groups have the same number of factories N.

```js
factories = [
  [ [4, 0], [2, 0], [7, 0] ],   // Manufacturing factories: [cost, position]
  [ [3, 0], [1, 0], [5, 0] ],   // Building factories
  [ [6, 0], [2, 0], [4, 0] ]    // Packaging factories
];
```

## 1️⃣ Part 1 — Minimum Cost (all factories at position 0)

**Problem.** Every factory sits at position `0` on the railroad (the position index of each factory is `0`). Pick exactly one factory from each of the three process groups and complete all three processes. The total cost is the sum of the three picked costs. Return the minimum possible total cost.

**Constraints**
- Position of every factory is `0` — so there is **no travel cost** in Part 1.
- Exactly three process groups: Manufacturing, Building, Packaging.
- All groups have the same number of factories N.

**My approach.** Since all positions are `0`, travel cost is irrelevant. The answer is simply the **minimum-cost factory in each group, summed**. I coded this cleanly:

```js
// Part 1 — my solution
function minCostPart1(factories) {
  let totalMin = 0;
  for (let group of factories) {
    let groupMin = Infinity;
    for (let [cost, pos] of group) {
      groupMin = Math.min(groupMin, cost);
    }
    totalMin += groupMin;
  }
  return totalMin;
}

// Time: O(K * N)   Space: O(1)
```

> ✅ Solved correctly and efficiently. Clean code, right approach, no issues.

## 2️⃣ Part 2 — Minimum Cost + Travel (factories at different positions)

**Problem.** Now the position index of each factory is populated — factories can sit at any integer position on the railroad. The truck can start anywhere, and must visit one Manufacturing factory, then one Building factory, then one Packaging factory, **in that order**. Travel cost between two factories is the absolute difference of their positions, `|pos_B - pos_A|`. Total cost is:

```
cost_manufacturing
  + travel(mfg → build)
  + cost_building
  + travel(build → pkg)
  + cost_packaging
```

Return the minimum total cost.

**Constraints**
- Railroad positions range from `-10,000` to `+10,000`.
- Order of visits is fixed: Manufacturing → Building → Packaging.
- Truck start position doesn't matter — it starts at whichever manufacturing factory is chosen.
- Still exactly three process groups.

**My approach (brute force).** I brute-forced all combinations: for every `(manufacturing i, building j, packaging k)`, compute the total cost including travel and track the minimum. Three nested loops, `O(N^3)` — but it worked, and getting working code down first was exactly what the interviewer asked for.

```js
// Part 2 — my brute force solution
function minCostPart2(factories) {
  const mfg = factories[0];
  const bld = factories[1];
  const pkg = factories[2];
  let best = Infinity;

  for (let i = 0; i < mfg.length; i++) {
    for (let j = 0; j < bld.length; j++) {
      for (let k = 0; k < pkg.length; k++) {
        const travel1 = Math.abs(bld[j][1] - mfg[i][1]);
        const travel2 = Math.abs(pkg[k][1] - bld[j][1]);
        const total = mfg[i][0] + travel1 + bld[j][0] + travel2 + pkg[k][0];
        best = Math.min(best, total);
      }
    }
  }
  return best;
}

// Time: O(N^3)   Space: O(1)
```

**The optimal solution (what I should have coded next).** The `O(N^3)` brute force works, but the interviewer was looking for the optimisation. The key insight: once you **fix the middle (Building) factory `j`**, you independently want the cheapest Manufacturing factory to *reach* it and the cheapest Packaging factory to *leave* it. Precompute both per building factory → `O(N^2)`.

```js
// Part 2 — O(N^2) optimised approach
function minCostPart2Optimised(factories) {
  const mfg = factories[0];
  const bld = factories[1];
  const pkg = factories[2];
  let best = Infinity;

  for (let j = 0; j < bld.length; j++) {
    // Best mfg factory to arrive at building factory j
    let bestMfg = Infinity;
    for (let i = 0; i < mfg.length; i++) {
      bestMfg = Math.min(bestMfg, mfg[i][0] + Math.abs(bld[j][1] - mfg[i][1]));
    }
    // Best pkg factory to depart from building factory j
    let bestPkg = Infinity;
    for (let k = 0; k < pkg.length; k++) {
      bestPkg = Math.min(bestPkg, pkg[k][0] + Math.abs(pkg[k][1] - bld[j][1]));
    }
    best = Math.min(best, bestMfg + bld[j][0] + bestPkg);
  }
  return best;
}

// Time: O(N^2)   Space: O(1)
```

> **Lesson:** Getting the brute force working in time was the right call — never sit in silence. But the moment it works, verbalise the optimisation path: *"This is O(N³); I can bring it to O(N²) by fixing the middle factory and precomputing best-left and best-right costs."* Interviewers want to hear you reason about complexity even when you don't have time to code the faster version.

## 3️⃣ Part 3 — K Processes, DP (the one I didn't finish in time)

**Problem.** Now there are **K** process groups instead of 3. Input is a `K × N × 2` array. The truck visits exactly one factory from each of the K groups, **in order from group 0 to group K-1**. Total cost = sum of all visited factory costs + travel between consecutive factories (absolute position difference). Return the minimum total cost.

**Constraints**
- K can be any number of process groups.
- All groups have N factories each.
- Order of process groups is fixed (0 → K-1); factory choice within each group is free.

**My approach.** I identified immediately that this needed **Dynamic Programming**, and I had the right intuition for the state: `dp[step][factory_index]` = minimum cost to complete processes `0..step` ending at `factory_index` in the current group. I could articulate the recurrence out loud, but ran out of the ~15 minutes left to write it. (After the round I tried to code it independently and found I'd been missing one piece of the transition.)

**The DP solution — full walkthrough.**

```
State:
dp[j] = minimum total cost to complete all groups up to the current one,
        ending at factory j in the current group.

Base case (group 0):
dp[j] = factories[0][j][0]        // just the cost of factory j, no travel yet

Transition (group g, each factory j):
dp_new[j] = factories[g][j][0] + min over all i of (
              dp[i] + |factories[g][j][1] - factories[g-1][i][1]|
            )

Answer:
min(dp[j]) over all j, after processing all K groups
```

**Bottom-up implementation** (cleanest to write under pressure):

```js
function minCostPart3(factories) {
  const K = factories.length;
  const N = factories[0].length;

  // Base case: cost of each factory in group 0
  let dp = factories[0].map(([cost, pos]) => cost);
  // Track positions of the previous group for travel calculation
  let prevPositions = factories[0].map(([cost, pos]) => pos);

  for (let g = 1; g < K; g++) {
    const dpNew = new Array(N).fill(Infinity);
    const currPositions = factories[g].map(([cost, pos]) => pos);

    for (let j = 0; j < N; j++) {
      const [currCost, currPos] = factories[g][j];
      for (let i = 0; i < N; i++) {
        const travel = Math.abs(currPos - prevPositions[i]);
        dpNew[j] = Math.min(dpNew[j], dp[i] + travel + currCost);
      }
    }

    dp = dpNew;
    prevPositions = currPositions;
  }

  return Math.min(...dp);
}

// Time: O(K * N^2)   Space: O(N)
```

**Top-down (recursive + memo) — what I was reaching for:**

```js
function minCostPart3Memo(factories) {
  const K = factories.length;
  const N = factories[0].length;

  // Min cost to complete groups g..K-1, arriving from prevPos
  function dp(g, prevPos) {
    if (g === K) return 0;
    let best = Infinity;
    for (let j = 0; j < N; j++) {
      const [cost, pos] = factories[g][j];
      const travel = Math.abs(pos - prevPos);
      best = Math.min(best, cost + travel + dp(g + 1, pos));
    }
    return best;
  }

  // Truck starts at whatever factory is chosen in group 0 (no travel in)
  let best = Infinity;
  for (let j = 0; j < N; j++) {
    const [cost, pos] = factories[0][j];
    best = Math.min(best, cost + dp(1, pos));
  }
  return best;
}

// Memo key must be (g, prevPos). prevPos can be large, so memoise with
// a Map keyed `${g},${prevPos}`.
```

> **The piece I was missing:** the DP state has to **carry `prevPos`** (the position of the last chosen factory), not just the group index. Once you see that, the recurrence falls out. The bottom-up version sidesteps the awkward memo key entirely — which is why it's the one worth drilling.
>
> And: even when you can't finish, **write the state definition and recurrence on screen first.** Stripe gives real credit for the correct DP formulation even if the code is incomplete. This is the classic *"pick one item from each group in sequence to minimise cost + transition cost"* pattern — same family as Paint House and Buy/Sell Stock with cooldown.

## 💬 Last 10 Minutes — the Q&A I underused

I asked exactly one question — *"What is Stripe doing with AI?"* — got a general answer, and that was the end of the segment. One vague question leaves the strongest part of the round on the table.

The last 10 minutes aren't courtesy; they're your chance to show strategic thinking, genuine curiosity, and culture fit. Questions I should have had ready:

- *"I couldn't finish Part 3 in time — afterwards I implemented the DP solution. Would you be open to a 2-minute walkthrough of my approach?"* (Shows you kept working on it.)
- *"What does the first 90 days look like for someone joining this team, and what would a successful ramp look like to you?"*
- *"What's the biggest technical challenge the team is facing right now that this hire is meant to help solve?"*
- *"How does engineering at Stripe balance moving fast against the reliability that financial infrastructure demands?"*
- *"Beyond tooling like Copilot, are there teams building AI-native products — and is that on the infra side or the product side?"*

**Rules of thumb I'm taking forward:** go in with **5 questions prepared**, use 2–3, save the rest for the thank-you note. Make at least one **company-specific** (Stripe's reliability culture). Never ask about comp, leave, or remote in a technical round — that's a recruiter conversation.

## 🎯 Overall reflection

This was my strongest round overall: clean intro, Part 1 correct and efficient, Part 2 solved (if not optimally), and the right DP intuition for Part 3. The gap was **execution under time pressure** — not having the iterative DP pattern drilled enough to write it fast. The fix is concrete: 10–15 LeetCode DP problems in the *"sequence + transition cost"* category, plus walking into every round with five questions ready.

| Part | What it tests | My result | Optimal |
|---|---|---|---|
| Part 1 | Min over independent groups | ✅ Solved, O(K·N) | O(K·N) |
| Part 2 | Min path cost, fixed 3 stages | ✅ Brute force, O(N³) | O(N²), fix the middle factory |
| Part 3 | Generalised to K stages | ⚠️ Right DP intuition, ran out of time | O(K·N²) DP carrying `prevPos` |
