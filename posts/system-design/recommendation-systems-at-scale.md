---
title: "How Netflix, YouTube and Spotify Actually Recommend Things"
excerpt: "A system design walkthrough of recommendation at scale — candidate generation, ranking, embeddings, the cold start problem, and why it's really a two-stage funnel."
tags: ["system-design", "recommendations", "machine-learning", "scale", "interviews"]
date: "2026-07-28"
author: "Aryansh Kurmi"
---

An Oracle hiring manager asked me to design a recommendation system. I gave a reasonable answer — fetch a few hundred candidates, weight them by user preferences and location, take the top ten.

That's actually the right *shape*. But I couldn't defend the important parts: where the candidates come from, how ranking really works, and how any of it runs in under 100 milliseconds for 300 million users.

This is the full walkthrough, assuming no machine learning background.

---

## Part 1: Understand the actual problem

Netflix has roughly **20,000 titles**. YouTube has **billions** of videos. Spotify has **100 million+** tracks.

A user opens the app. You have about **100 milliseconds** to fill the screen.

The naive approach:

```
for each of 100,000,000 items:
    score = how_much_will_this_user_like_it(user, item)
sort by score
take top 10
```

If scoring one item takes 1 microsecond, that's **100 seconds** per user. For one user. You have 300 million of them.

**It's off by a factor of a million.** So the entire architecture is designed around one question: *how do we avoid scoring everything?*

---

## Part 2: The answer — a funnel

Every large recommender is a **multi-stage funnel**. Each stage is more expensive per item but handles far fewer items.

```
    100,000,000 items    ← the whole catalogue
           │
           ▼
  ┌─────────────────────┐
  │ CANDIDATE GENERATION│   cheap, approximate, ~10ms
  │   (many algorithms  │   uses precomputed indexes
  │    in parallel)     │
  └─────────────────────┘
           │
           ▼
       ~1,000 items      ← plausible candidates
           │
           ▼
  ┌─────────────────────┐
  │      RANKING        │   expensive, accurate, ~30ms
  │  (a neural network  │   hundreds of features per item
  │   scores each one)  │
  └─────────────────────┘
           │
           ▼
        ~100 items       ← scored and sorted
           │
           ▼
  ┌─────────────────────┐
  │    RE-RANKING       │   business rules, ~5ms
  │ diversity, freshness│
  │ dedup, exploration  │
  └─────────────────────┘
           │
           ▼
         10 items        ← what you see
```

**The key insight:** you never score 100 million items. You score about 1,000. Getting from 100,000,000 → 1,000 cheaply is the entire trick.

This is exactly the two-stage architecture in YouTube's well-known 2016 paper, and every major system now looks broadly like this.

---

## Part 3: Stage 1 — Candidate generation

Goal: from 100 million items, produce ~1,000 plausible ones in ~10 milliseconds.

Nothing here is precise. **Recall matters, precision doesn't.** You just need the good stuff to be *somewhere* in the thousand — ranking sorts it out later.

In practice you run **several independent generators in parallel** and merge their outputs. Each catches something the others miss.

### Generator 1: Collaborative filtering ("people like you")

The oldest and still one of the strongest ideas.

> **If you and I both liked A, B and C, and I also liked D, you'll probably like D.**

Notice: it needs **no information about the content at all**. It doesn't know what D *is*. It only knows who watched what.

Build a giant matrix:

```
              Movie1  Movie2  Movie3  Movie4  Movie5
    Aryansh     5       ?       4       ?       1
    Meera       4       2       5       3       ?
    Zara        ?       1       ?       5       2
```

Most cells are empty — a user has watched maybe 200 of 20,000 titles, so the matrix is **99.99% empty**. This is called **sparsity**, and it's the central difficulty.

The classic solution is **matrix factorisation**. You approximate that giant sparse matrix as the product of two much smaller dense ones:

```
   R (users × items)   ≈   U (users × 50)  ×  V (50 × items)
   300M × 100M                300M × 50         50 × 100M
```

Those 50 numbers per user and per item are called **latent factors** or **embeddings**.

### Embeddings — the concept worth understanding

An **embedding** is a list of numbers representing something, where **similar things end up with similar numbers**.

Imagine describing every movie with 50 dials. Nobody labels them, but after training they end up meaning something like:

```
Interstellar   = [0.9,  0.8,  0.1,  0.7, ...]
                  sci-fi cerebral comedy space

The Notebook   = [0.1,  0.4,  0.2,  0.0, ...]
Inception      = [0.8,  0.9,  0.1,  0.3, ...]   ← close to Interstellar
```

And users live in the **same space**:

```
Aryansh        = [0.85, 0.75, 0.2, 0.6, ...]    ← close to Interstellar
```

Now "how much will Aryansh like Interstellar?" is just a **dot product** — multiply the pairs and add. One arithmetic operation on 50 numbers. Fast.

The genuinely useful property: **nobody hand-labelled these dimensions.** The model discovered them from behaviour. It learns that Interstellar and Inception are similar because the same people watch both — not because someone tagged them "sci-fi."

### ANN search: finding neighbours without checking everything

Even with embeddings, comparing your vector to 100 million item vectors is too slow.

So you use **ANN — Approximate Nearest Neighbour** search. Trade a tiny bit of accuracy for enormous speed.

The intuition (HNSW, the most common algorithm): build a multi-level graph, like a road network with motorways and side streets. Start on the motorway to get roughly to the right region, then drop to local roads for precision.

```
Level 2 (motorways):   A ────────────── M ────────────── Z
Level 1 (A roads):     A ──── F ──── M ──── R ──── Z
Level 0 (everything):  A─B─C─D─E─F─G─H─I─J─K─L─M─...─Z
```

Result: **~1 millisecond to find the 500 nearest items out of 100 million.** Roughly 95–99% as accurate as an exhaustive search.

Tools: FAISS (Meta), ScaNN (Google), or vector databases like Milvus, Pinecone, Qdrant.

### Generator 2: Content-based ("more like what you just watched")

Uses the item's own attributes: genre, cast, director, tempo, language, tags.

```
You watched: The Dark Knight
             (action, crime, Nolan, Bale, dark, 2008)

Similar:     Batman Begins, Heat, Sicario, Prisoners
```

Weaker than collaborative filtering on its own — it produces obvious, samey suggestions — but it's essential because it **works for brand-new items** that nobody has watched yet.

### Generator 3: Sequence models ("what usually comes next")

Your watch history is a sequence, and order matters:

```
Session A: Comedy → Comedy → Comedy      → next: probably comedy
Session B: Ep1 → Ep2 → Ep3               → next: obviously Ep4
Session C: Kids show → Kids show         → next: kids content (someone else is watching)
```

Modern systems use transformer models here — the same architecture as language models, but predicting the next *item* instead of the next *word*. This is where "you binge-watched three episodes, here's episode four" comes from, and it's also how the system notices your mood *right now* rather than your taste in general.

### Generator 4–8: The unglamorous ones that matter

- **Trending / popular** — globally and per region. Boring, but it works, and it's the fallback when everything else fails.
- **Continue watching** — high signal, trivially cheap.
- **Because you watched X** — item-to-item similarity, precomputed offline.
- **Editorially curated** — human-picked collections. Spotify's Discover Weekly is partly this.
- **Fresh / new releases** — needs its own generator, because new items have no interaction data.

### Merging

Each generator returns a few hundred items. Union them, deduplicate, remove anything the user already watched, and pass ~1,000 forward.

**Why multiple generators?** Diversity of failure. Collaborative filtering can't handle new items. Content-based is repetitive. Trending ignores personalisation. Together they cover each other's blind spots.

---

## Part 4: Stage 2 — Ranking

Now you have ~1,000 candidates and a budget of ~30ms. Time to be accurate.

This is where a real machine learning model runs — typically a **deep neural network** — scoring each candidate individually with hundreds of input features.

### The features

**About the user:**
- Watch history summary (embedding)
- Preferred genres, languages, durations
- Time of day, day of week
- Device (phone vs TV — completely different behaviour)
- Country, region
- Subscription tier, tenure
- Recent session behaviour

**About the item:**
- Embedding
- Genre, cast, director, release year
- Global popularity, popularity in this region
- Average completion rate ← very strong signal
- Age since release

**About the user–item pair (the strongest features):**
- Has the user watched anything else by this director/artist?
- How similar is this to their last 10 items?
- Have they seen it in a carousel before and *not* clicked? ← negative signal
- Do users similar to them finish it?

**About the context:**
- Which row/carousel is this?
- What position on the screen?
- What time is it?

### What is it actually predicting?

This is the most important design decision in the whole system, and it's a **product** decision, not a technical one.

Optimising for **clicks** produces clickbait. YouTube learned this expensively around 2012 — the model got very good at getting clicks and very bad at making people happy.

So modern systems predict **multiple objectives** and combine them:

```
score = w1 × P(click)
      + w2 × P(watch > 70% of it)      ← completion, the honest signal
      + w3 × P(return tomorrow)        ← retention
      + w4 × P(explicit like)
      - w5 × P(abandon in 30 seconds)  ← a penalty
```

The weights are business decisions. Netflix cares about retention (you pay monthly regardless of what you watch). YouTube cares about total watch time (ads). Spotify cares about session length and discovery.

> **In an interview, "what are we optimising for?" is a fantastic question to ask.** It shows you know the metric shapes everything downstream.

### The two-tower architecture

The standard trick for making this fast:

```
   USER TOWER                    ITEM TOWER
        │                             │
  user features               item features
        │                             │
   neural network              neural network
        │                             │
        ▼                             ▼
  user embedding  ─── dot product ─── item embedding
                          │
                       score
```

The point: **the item tower can be run offline.** Compute embeddings for all 100 million items overnight and store them. At request time you only run the user tower once, then do cheap dot products.

That converts an impossible online workload into a batch job plus some arithmetic.

---

## Part 5: Stage 3 — Re-ranking

The model's top 10 might be technically optimal and terrible as a product.

### Diversity

```
Model's top 5:            After diversity re-ranking:
1. Marvel movie           1. Marvel movie
2. Marvel movie           2. Comedy special
3. Marvel movie           3. Documentary
4. Marvel movie           4. Marvel movie
5. Marvel movie           5. Thriller
```

A wall of near-identical items is a bad experience even if each one individually scores highest. Techniques like MMR (Maximal Marginal Relevance) explicitly penalise similarity to items already selected.

### Freshness

Boost recent content. Nobody wants a homepage that looks identical for three weeks.

### Exploration vs exploitation

If you only ever show what the model is confident about, you never learn anything new about the user, and new items never get a chance. So deliberately mix in some uncertain choices.

This is the **multi-armed bandit** problem. Simplest approach: ε-greedy — 90% best guess, 10% exploration. Better: Thompson sampling, which explores in proportion to genuine uncertainty.

Without exploration, the system calcifies. Netflix decides you're "a person who likes crime dramas" and you never see anything else.

### Business rules

- Contractual obligations to promote certain content
- Regional licensing (a title isn't available everywhere)
- Family/kids profile filtering
- Never re-show something dismissed twice
- Content policy filters

### Artwork selection

A detail people don't expect: Netflix personalises the **thumbnail** too. The same film gets a romance-focused image for one user and an action-focused one for another. It's a small recommendation problem inside the big one, and it measurably moves engagement.

---

## Part 6: The architecture

### Offline (batch, hours to daily)

```
┌──────────────┐
│ Event logs   │  every play, pause, skip, rating, search
│ (Kafka →     │  ~500 billion events/day at Netflix scale
│  S3/HDFS)    │
└──────┬───────┘
       ▼
┌──────────────┐
│ Spark / Flink│  clean, join, build training data
│ feature      │  compute features
│ pipeline     │
└──────┬───────┘
       ▼
┌──────────────┐
│ Model training│ retrain daily or weekly
│ (TF/PyTorch) │  validate against held-out data
└──────┬───────┘
       ▼
┌──────────────┐
│ Precompute   │  item embeddings for all 100M items
│ + build ANN  │  build the HNSW index
│ index        │
└──────┬───────┘
       ▼
   ┌────────────────────────────┐
   │ Feature Store + Vector DB  │  ← what serving reads
   └────────────────────────────┘
```

### Online (per request, <100ms)

```
User opens app
       │
       ▼
┌────────────────┐
│  API Gateway   │
└───────┬────────┘
        ▼
┌────────────────┐   cache hit? ──> return immediately (~40% of requests)
│ Recommendation │
│    Service     │
└───────┬────────┘
        ▼
┌────────────────┐
│ Feature Store  │  fetch user features (Redis, ~2ms)
└───────┬────────┘
        ▼
┌────────────────────────────────────────┐
│ Candidate generators (IN PARALLEL)     │  ~10ms
│  ANN search │ trending │ continue │ ... │
└───────┬────────────────────────────────┘
        ▼  ~1,000 candidates
┌────────────────┐
│ Ranking model  │  batch-score on GPU/TPU, ~30ms
└───────┬────────┘
        ▼  ~100 scored
┌────────────────┐
│ Re-ranker      │  diversity, rules, exploration, ~5ms
└───────┬────────┘
        ▼
   10 items → rendered
        │
        ▼
   log everything → back into Kafka → tomorrow's training data
```

**Total: 50–80ms.** And it's a closed loop — today's impressions are tomorrow's training data.

### Why it's fast

1. **Precomputation.** Embeddings and ANN indexes are built offline. Serving does lookups, not learning.
2. **Parallelism.** Generators run concurrently; the slowest one sets the pace.
3. **Caching.** Recommendations are cached per user for minutes. A large share of requests never touch the models. This alone often cuts load by half.
4. **The funnel.** The expensive model only ever sees 1,000 items.
5. **Batch scoring.** All 1,000 candidates go through the network in one batched inference call, not 1,000 separate ones.
6. **Approximation everywhere.** ANN, sampling, quantised models. Perfect isn't the goal — a good answer in 80ms beats a perfect one in 8 seconds.

### Storage sketch

| Data | Store | Why |
|---|---|---|
| Raw events | Kafka → S3/HDFS | High-volume append-only |
| User features | Redis / DynamoDB | Sub-millisecond reads |
| Item embeddings | Vector DB (FAISS/Milvus) | ANN search |
| Item metadata | Cassandra / Postgres | Structured lookups |
| Cached recs | Redis, TTL 5–30 min | Absorb repeat requests |
| Training data | Data lake | Batch access |
| Model artefacts | Object store + registry | Versioning, rollback |

---

## Part 7: The cold start problem

The single most-asked follow-up.

### New user (no history)

- Use whatever you have: country, device, language, signup source
- **Ask.** Netflix's onboarding "pick three titles you like" exists precisely for this.
- Fall back to regional popularity
- Explore aggressively — early sessions are for learning
- If they came from a link, that content is a signal

### New item (nobody's watched it)

- **Content-based** features carry the load: genre, cast, description embeddings
- Deliberately inject it into some users' feeds to gather signal (exploration)
- Use editorial placement to bootstrap
- Text embeddings of the description let you place a brand-new item near similar existing items on day zero

### The general principle

> **Collaborative filtering needs data. Content-based features don't. So content-based methods cover the cold start, and collaborative filtering takes over once signal accumulates.**

That's a big reason serious systems always run both.

---

## Part 8: The hard problems

### Feedback loops

The model recommends action films → you watch action films → training data says you like action films → the model recommends more action films.

Did it learn your taste, or **create** it? You can't tell from the logs, because you only ever observe what you showed.

This is **presentation bias**, and it's a real statistical problem. Mitigations: exploration, inverse propensity weighting (down-weighting items that were heavily promoted), and holdout groups that get non-personalised results.

### Popularity bias

Popular items get shown more, get more clicks, look more popular, get shown more. The long tail dies.

Fix: penalise popularity in the ranking score, or normalise by exposure.

### The filter bubble

Over-personalisation traps people in a narrow slice. This is a genuine product and societal concern, not just a technical one, and it's why diversity terms and exploration exist as explicit design goals.

### Multiple people, one account

A family shares a Netflix login. The model sees cartoons, then a horror film, then a cooking show, and concludes the user has extremely strange taste.

Fix: profiles (explicit), plus **session-based** models that adapt within a session rather than only using long-term history.

### Delayed and noisy feedback

A click is instant. Whether someone *liked* it takes 90 minutes to know. Whether it made them renew takes a month. Your fastest signal is your least trustworthy one.

### Evaluation is genuinely hard

Offline metrics (precision@k, recall@k, NDCG) measure how well you predict *held-out historical data*. But you can only score items users were shown — and those were chosen by the old model. So offline improvements often don't survive contact with reality.

The only real test is an **A/B test**, and even that takes weeks for retention metrics.

---

## Part 9: The three services differ meaningfully

| | Netflix | YouTube | Spotify |
|---|---|---|---|
| Catalogue | ~20,000 | Billions | ~100 million |
| Item length | Hours | Minutes | ~3 minutes |
| Consumption | 1–2 per evening | Dozens per session | 50+ per session |
| Optimises for | **Retention** (monthly sub) | **Watch time** (ads) | **Session length + discovery** |
| Feedback speed | Slow (hours per item) | Fast (seconds to skip) | **Very fast** (a skip in 5s is a strong signal) |
| Repeat consumption | Rare | Rare | **Constant** — you replay favourites |
| Hardest problem | Tiny catalogue, huge stakes per pick | Scale + content quality | Sequencing and flow |

Two consequences worth noting:

**Spotify's skip signal is gold.** A skip at 5 seconds is an unambiguous negative, delivered instantly, dozens of times per session. That's a far richer training signal than Netflix gets.

**Spotify also has a sequencing problem nobody else has.** A playlist isn't a ranked list — it's an *ordered experience*. Track 7 must make sense after track 6. Tempo, key and energy need to flow. That's a different problem from "pick the best items."

---

## Part 10: The 5-minute interview answer

> *"The core constraint is that you can't score 100 million items in 100 milliseconds, so it's a funnel.*
>
> ***Stage 1, candidate generation:** get from 100 million to about 1,000 in ~10ms. I'd run several generators in parallel — collaborative filtering via embedding similarity with approximate nearest neighbour search, content-based similarity, a sequence model for the current session, plus trending and continue-watching. Item embeddings are precomputed offline, so this is index lookups rather than computation.*
>
> ***Stage 2, ranking:** score those 1,000 with a neural network using hundreds of features — user, item, user-item interaction, and context. I'd use a two-tower architecture so item embeddings are computed offline and serving is just a dot product. And I'd predict multiple objectives — click, completion, return probability — because optimising for clicks alone produces clickbait.*
>
> ***Stage 3, re-ranking:** apply diversity so you don't get five identical items, freshness, business rules, and deliberate exploration so we keep learning and new items get a chance.*
>
> ***Infrastructure:** events into Kafka, batch pipelines in Spark producing features and retraining daily, a feature store in Redis for online lookups, a vector database for ANN. Cache recommendations per user for a few minutes — that alone absorbs a large fraction of traffic.*
>
> ***The hard parts:** cold start, which I'd handle with content-based features and onboarding questions; feedback loops, where the model creates the preferences it then observes, mitigated with exploration and holdout groups; and evaluation, since offline metrics are biased by what the previous model chose to show — so A/B testing is the real arbiter.*
>
> ***And the first question I'd want answered is what we're optimising for**, because clicks, watch time and retention produce genuinely different systems."*

---

## What I'd tell my past self

My original answer — fetch 500 candidates, weight them by user preferences and location, take the top 10 — was **structurally correct**. Candidate generation, then ranking, then a top-N cut. That's the right architecture.

What was missing was one level down on every noun:

- *Where do the 500 come from?* → embeddings + ANN search, precomputed offline
- *What are the weights?* → a learned model, not hand-tuned numbers
- *What's it optimising?* → multiple objectives, and choosing them is a product decision
- *How is it fast?* → precomputation, caching, parallelism, approximation
- *What goes wrong?* → cold start, feedback loops, popularity bias, evaluation

That gap — right shape, no depth — is the same gap that shows up in every interview I've flunked. The fix isn't learning more topics. It's taking the topics I already know and asking, for each one: **what's the layer underneath?**
