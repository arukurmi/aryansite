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
