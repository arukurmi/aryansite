---
title: "Rate the Date: I Built an App for the Hardest Sentence in Any Relationship — 'Something's Wrong'"
excerpt: "Dating apps spend billions getting two people together and nothing on what happens after. Rate the Date is my answer to the other side of the line: a private app where partners rate each other on the five love languages, and an AI turns those honest-but-unsayable scores into a letter your partner can actually hear. The psychology of why we can't say hard things, and the design decisions that route around it."
date: "2025-08-12"
category: "engineering-lessons"
tags: ["side-project", "product-psychology", "relationships", "love-languages", "gemini", "node", "react", "encryption", "behavioral-design"]
author: "Aryansh Kurmi"
---

# Rate the Date: I Built an App for the Hardest Sentence in Any Relationship — "Something's Wrong"

In June I wrote a [deep dive on how dating apps hack your brain, print money, and are built](/blog/how-dating-apps-hack-your-brain-and-your-wallet). It ended with a question that wouldn't leave me alone: the industry spends billions of dollars of engineering getting two people *into* a relationship, and approximately zero on what happens after — even though the hardest communication problems start the day the app's job ends.

This post is me cashing that question. Meet **Rate the Date** — a deliberately small app for couples, built around one observation:

> Almost everyone in a relationship knows *exactly* what's bothering them. Almost no one can say it out loud to the person it's about.

Not because they don't have the words. Because saying "I don't feel like I matter to you lately" to your partner's face is one of the most exposing things a human can do — and our species has spent a few hundred thousand years evolving reflexes to avoid exactly that kind of exposure.

Rate the Date doesn't try to make people braver. It changes the shape of the message so that bravery isn't required. You rate your partner privately on the five love languages, add what you couldn't say in person, pick a tone — and the app composes it into a letter your partner receives as warmth instead of an attack. A structured score goes in; a love letter comes out.

Before the how, it's worth spending real time on the why — because every design decision in the app maps to a specific, well-documented failure mode in how couples communicate.

## Why "just talk to them" is useless advice

The best data we have on couple communication comes from John Gottman's "Love Lab" at the University of Washington — four decades, over 3,000 couples, wired up with heart-rate monitors and coded frame by frame while they argued. Two findings from that work explain why honest conversation between partners fails so predictably, and both of them shaped this app.

**Finding one: it's not whether you raise problems, it's what the delivery does to the listener.** Gottman's team identified four communication patterns — criticism, contempt, defensiveness, stonewalling — that predict relationship failure with claimed accuracy above 90%. Look closely at the first one, because it's the killer: *criticism*, in Gottman's coding, isn't "raising a complaint." It's a complaint that arrives shaped as an attack on the person — "you never think about me" instead of "I felt alone on Tuesday." The content might be identical and legitimate. The *framing* decides whether the listener hears information or an indictment; an indictment triggers defensiveness, defensiveness invites contempt, and the spiral runs. In other words: **most relationship communication failures are encoding failures, not content failures.** The message is valid. The serialization format corrupts it in transit.

**Finding two: relationships live or die on tiny, low-stakes signals, not big talks.** Gottman calls them *bids for connection* — "look at this," a touch, a sigh that hopes to be asked about. Whether partners notice and turn toward these micro-signals is among the most reliable predictors of who stays together. The implication runs opposite to folk wisdom: you don't fix a relationship with one Big Honest Conversation; you fix it with a steady cadence of small, received signals. Any tool in this space should be built for *rhythm*, not confrontation.

And then there's the reason the conversation doesn't happen at all. Therapists who write about conflict avoidance keep circling the same word: **vulnerability**. Saying the true sentence — "I'm hurt and I don't know how to start this conversation" — requires being *seen* in a way that feels genuinely dangerous. Evolution tuned us to treat rejection by our closest ally as a survival threat; physiologically, Gottman's lab found partners in hard conversations go into literal fight-or-flight ("flooding": heart rate spikes, reasoning narrows, and the conversation is over even if it continues). So couples develop unspoken treaties: *we don't talk about that.* The hurt doesn't leave. It compounds, silently, at interest.

One more piece: the **five love languages** — words of affirmation, quality time, physical touch, acts of service, receiving gifts. Academically, the framework is contested; the empirical base is thin and researchers argue about whether people truly have "one language." But recent work (including a PLOS ONE study linking satisfaction to partners using each other's preferred language) points to why it survives every debunking: its value isn't diagnostic, it's *linguistic*. It gives couples a shared, neutral, five-word vocabulary for needs that are otherwise unsayable. "My quality-time score for us is a 4 this month" is a sentence a hurt person can produce. "You've abandoned me" is not — even when they mean the same thing.

Stack those up and you get a precise product spec:

1. The hard message must be **restructured** so it can't arrive as criticism (fix the encoding).
2. It should flow in a **regular, small cadence**, not rare explosive summits (build for bids, not battles).
3. The sender must be shielded from raw exposure at the moment of sending (lower the vulnerability cost).
4. The vocabulary should be a **neutral shared framework**, not free-form accusation (love languages as protocol).

Rate the Date is that spec, implemented.

## What the app actually does

The stack is deliberately boring — a React + TypeScript frontend (Vite), a Node/Express backend, MongoDB, Cloudinary for avatars, Gemini for generation, email for delivery. All the interesting decisions are product decisions. The flow:

**1. Link with exactly one partner.** You sign up, then send a partner request to your person. It lands in their email with a single-use confirmation link — the backend stores only a SHA-256 hash of the token, with a hard expiry (an unclaimed request self-deletes via a TTL index). This is the anti-dating-app move number one: the graph has no discovery, no browsing, no stack of alternatives. One node, one edge. The entire "market" the app serves is a market of two.

**2. Rate your date.** On a regular cadence you score your partner 1–10 on each of the five love languages — how loved you felt through their words, their time, their touch, their acts, their gifts — and attach an optional free-text comment: the thing you couldn't say at dinner. Submissions are cooldown-limited (the API refuses back-to-back ratings) — more on why below.

**3. Pick a tone.** This is my favorite control in the app. The letter can be `cute`, `constructive`, `serious`, `happy`, or `sad` — and the sender chooses. Internally each maps to a tone contract for the model; `sad` for instance is *"tender and vulnerable — expressing longing or unmet needs with compassion."* The sender is choosing how they want to be heard before a single word is drafted.

**4. The app writes the letter.** Scores, comment, and tone go to Gemini with a system prompt that frames it as a compassionate relationship companion writing ~200 words from you to your partner. The model's job is precisely the encoding fix from the Gottman section: it takes "physical touch: 3/10" plus a raw comment and re-serializes them as an *I-feel* letter — need expressed with warmth, no accusation frame available.

**5. Your partner gets a love letter.** Not a notification, not a dashboard alert — an email, styled like a valentine, "Dear ‹name›" at the top and your name at the bottom. They never see the numbers. The scores are instrumentation; the letter is the interface.

**6. Both of you get a map over time.** Each rating also feeds a love-language report: your partner's inferred primary and secondary language, a confidence score, normalized per-language trends. Rate regularly and the app learns — and shows — what actually makes each of you feel loved, which is exactly the information couples routinely get wrong about each other.

The pipeline in one line:

```
private honest scores → tone contract → AI re-encoding → valentine email → longitudinal love-language report
```

Everything sensitive in that pipeline — the raw comment and the generated letter body — is encrypted at rest with AES-256-GCM. That's not enterprise theater; it's load-bearing product design, and it's where the next section starts.
