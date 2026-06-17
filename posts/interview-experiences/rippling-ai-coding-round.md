---
title: "Rippling Interview — AI-Powered Coding Round"
excerpt: "A short writeup of Rippling's pipeline: a simple HackerRank assessment, then an AI-powered coding round where I built a corporate credit-card expense-policy engine end to end. The focus here is on how I ran the interview — nailing the entities and labels up front, talking through the design, and using AI to do most of the typing while I drove."
date: "2026-03-16"
category: "interview-experiences"
tags: ["interview", "rippling", "ai-coding", "rule-engine", "javascript", "lld"]
author: "Aryansh Kurmi"
---

# Rippling Interview — AI-Powered Coding Round

## The pipeline

First step was a **HackerRank assessment** — honestly a pretty simple one, standard DS/algo, nothing tricky. After I cleared it I was moved to a single **AI-powered coding round**: a 1-on-1 where you're *encouraged* to use AI to write code, and the whole point is to build something real end to end in the time given.

## The question — a corporate credit-card expense engine

The brief: companies issue **corporate credit cards** to employees, who file **expenses** (each tied to a **trip**). The company has a **policy** — a set of rules — and every expense must be checked against it. For each expense, return whether it's **APPROVED** or **REJECTED**, and if rejected, *which rules it violated*. Some rules are per-expense ("no single restaurant charge over $75"), others are per-trip aggregates ("a trip can't exceed $2000 total", "meals across a trip can't exceed $200").

So the input is a list of expenses; the output is a per-expense verdict plus a summary.

## How I actually ran the interview

This is the part I'm proud of, and where I think the round was won — **before writing a line of code**, I spent the first chunk talking through the model out loud and spelling the labels out precisely. That framing is what let AI then do the heavy lifting cleanly.

**What I clarified / pinned down first:**
- **Entities and their labels.** A `Rule` has `id`, `name`, `description`, `priority`, `status`, `scope`, and a `condition`. An expense's verdict is an `ExpenseStatus`. I named everything explicitly so the AI and I were never ambiguous.
- **The two rule scopes.** `RuleScope.EXPENSE` vs `RuleScope.TRIP` — this was the key insight I raised early: trip-level rules need an **aggregation pass first** (compute `tripTotal`, `tripMealTotal` per trip) before any single expense can be judged. I called this out before coding so it didn't bite us later.
- **Composable conditions.** Rather than hardcode each rule, I proposed a small **condition tree**: `SIMPLE`, `AND`, `OR`, evaluated recursively, with an `Operator` set (`EQ, NE, GT, GTE, LT, LTE, IN, NOT_IN`). This makes the engine data-driven — new policies are just new rule objects, no code change (Open/Closed). The interviewer specifically liked this.
- **The response contract.** I described the exact output shape up front so we coded toward a fixed target.

Only after the interviewer agreed on those labels did I let AI generate the implementation — and because the vocabulary was locked, the generated code slotted straight in.

## The design (labels first)

```js
// enums — the shared vocabulary I defined up front
const RuleStatus    = { ACTIVE: "ACTIVE", INACTIVE: "INACTIVE" };
const ExpenseStatus = { APPROVED: "APPROVED", REJECTED: "REJECTED" };
const ConditionType = { SIMPLE: "SIMPLE", AND: "AND", OR: "OR" };
const Operator      = { EQ:"EQ", NE:"NE", GT:"GT", GTE:"GTE", LT:"LT", LTE:"LTE", IN:"IN", NOT_IN:"NOT_IN" };
const RuleScope     = { EXPENSE: "EXPENSE", TRIP: "TRIP" };
```

A rule is just data. "No restaurant charge over $75" reads as *"this holds if it's not a restaurant, OR the amount is ≤ 75"* — and a violation is when the condition is **false**:

```js
{
  id: "rule-restaurant-cap",
  name: "Restaurant single expense cap",
  description: "No expense at a restaurant can exceed $75",
  status: RuleStatus.ACTIVE,
  scope: RuleScope.EXPENSE,
  condition: {
    conditionType: ConditionType.OR,
    children: [
      { conditionType: ConditionType.SIMPLE, field: "vendor_type", operator: Operator.NE,  value: "restaurant" },
      { conditionType: ConditionType.SIMPLE, field: "amount_usd",  operator: Operator.LTE, value: 75 },
    ],
  },
}
```

The engine is three small pieces I split by responsibility (this modular split was deliberate — easier to explain and let AI fill in each part):

```
buildTripContext(expenses)  → Map<tripId, { tripTotal, tripMealTotal }>   // aggregation pass
evaluateCondition(cond, subject) → boolean                                 // recursive AND/OR/SIMPLE
evaluateRules(expenses, rules) → { result, summary }                       // orchestrates both
```

`evaluateRules` flattens each expense with its trip aggregates into one `subject`, runs every ACTIVE rule (sorted by `priority`), and the first failing rule marks the expense `REJECTED` and records it in `rulesUsed`.

## Ready output / response

Running it on the sample expenses (two approved, five rejected) — this is the contract the program produces:

```json
{
  "result": [
    { "expense_id": "001", "status": "APPROVED", "rulesUsed": [] },
    { "expense_id": "002", "status": "APPROVED", "rulesUsed": [] },
    { "expense_id": "003", "status": "REJECTED",
      "rulesUsed": [{ "ruleId": "rule-restaurant-cap", "ruleName": "Restaurant single expense cap",
                      "comments": "No expense at a restaurant can exceed $75" }] },
    { "expense_id": "004", "status": "REJECTED",
      "rulesUsed": [{ "ruleId": "rule-no-airfare", "ruleName": "No airfare",
                      "comments": "No airfare expenses" }] },
    { "expense_id": "007", "status": "REJECTED",
      "rulesUsed": [{ "ruleId": "rule-no-entertainment", "ruleName": "No entertainment",
                      "comments": "No entertainment expenses" }] }
  ],
  "summary": { "rejected": 5 }
}
```

## Test cases that make it runnable

I made sure the program ran with cases that hit every branch:

- **Per-expense pass/fail:** a $49.99 restaurant charge → APPROVED; a $153 restaurant charge → REJECTED on the restaurant cap.
- **Category bans:** an `airfare` expense → REJECTED (no-airfare); an `entertainment` expense → REJECTED (no-entertainment).
- **Single-expense cap:** anything over $250 → REJECTED.
- **Trip aggregate rules:** a trip whose expenses sum past $2000 → every expense on it flags the trip-total cap; meals summing past $200 → trip-meal cap. This is the case that proves the aggregation pass runs *before* evaluation.
- **Inactive rule:** flip a rule to `INACTIVE` and confirm it's skipped.
- **Empty input:** `[]` → `{ result: [], summary: { rejected: 0 } }`.

## Reflection

The lesson I took away: in an AI-assisted round, **your value is the design, not the typing**. I won it by getting the entities and labels exactly right, surfacing the trip-aggregation subtlety early, and choosing a data-driven condition tree — then letting AI implement against that locked vocabulary while I reviewed and steered. The code was fast to produce; the thinking that made it correct was mine.
