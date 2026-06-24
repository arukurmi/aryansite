---
title: "From HashMap to RAG — What a 15-Minute Interview Taught Me About AI Search"
excerpt: "A real interview question about cricket articles that started with a simple inverted-index answer and turned into a deep dive on retrieval-augmented generation, tool calling, MCP, and hash map internals. The question that looked like a trick was really testing how far I could think."
date: "2026-06-23"
category: "interview-experiences"
tags: ["interview", "rag", "llm", "tool-calling", "mcp", "system-design", "data-structures"]
author: "Aryansh Kurmi"
---

# From HashMap to RAG — What a 15-Minute Interview Taught Me About AI-Powered Search

> Some interview questions feel like trick questions until you realize they're not — they're just designed to see how far you can think. This one started with cricket and ended with AI agents.

This was a round with a well-known company, and it was short — maybe fifteen minutes on this one question — but it packed in more than rounds twice its length.

## The setup

The interviewer described a system: a collection of articles, each with a unique article ID, covering cricket match events — centuries scored, wickets taken, IPL match results, player milestones, and so on. Think CricInfo-style content, but stored as articles in a database.

The question was simple on the surface:

> "If a user wants to search for articles about Virat Kohli, how would you do it?"

My instinct was to reach for a classic CS answer: an **inverted index**. Build a lookup table where every player name, team name, or keyword maps to a list of article IDs. Search for "Virat Kohli" → get back a list of IDs in O(1) time. Fast, clean, efficient.

The interviewer nodded, then pushed further:

> "But our goal isn't just speed. What if the user searches for 'centuries scored by Virat Kohli in knockout matches' — or 'total wickets in the last 5 overs'?"

That's when I realized the question wasn't about indexing at all. It was about **understanding intent**.

**The trap:** keyword search solves "find articles containing these words." But user queries are rarely that simple. Real questions carry context, relationships, and nuance that no inverted index can handle alone.

## The real answer: RAG + tool calling

After a beat, I arrived at the architecture that actually solves this — one that's become a standard pattern in production AI systems. It combines three ideas.

### 1. LLM as the query interpreter

Instead of trying to pattern-match the user's query to keywords, you hand it to a large language model. The LLM understands what the user actually wants — batting stats, bowling figures, match results — even when they phrase it naturally or ambiguously.

### 2. Tools as the data layer

LLMs are stateless. They don't have access to your database. So you give them **tools** — functions they can call to fetch real data. In this cricket system, those tools might look like:

```javascript
// Tools exposed to the LLM
const tools = [
  {
    name: "get_batting_stats",
    params: { player: "string", match_type: "string?" }
  },
  {
    name: "get_bowling_figures",
    params: { player: "string", match_id: "string?" }
  },
  {
    name: "get_match_summary",
    params: { match_id: "string" }
  },
  {
    name: "get_player_info",
    params: { player: "string" }
  }
];
```

### 3. The agentic loop

The full flow — what's often called **Retrieval-Augmented Generation (RAG)** with tool use — looks like this:

```
User query
   │
   ▼
LLM + system prompt
   │
   ▼
Tool-call decision  ──►  Your MCP / API server
                              │
                              ▼
                         Tool results (data)
                              │
                              ▼
                    LLM synthesizes the answer
```

**Why this works:** the LLM handles intent parsing and response synthesis. Your tools handle data fetching. Neither tries to do both jobs, and neither has to.

A user query like *"How many centuries has Kohli scored in IPL playoffs?"* becomes a structured call to `get_batting_stats({ player: "Virat Kohli", match_type: "IPL playoff" })`. The result comes back, the LLM formats a coherent answer, and the user sees exactly what they asked for — not a list of article IDs.

This is the pattern behind most production AI assistants today. When you use a tool like Perplexity, or a customer-support bot that can actually check your order, this is roughly what's happening under the hood.

## On MCP servers

I mentioned MCP (Model Context Protocol) in my answer. MCP is a standardized protocol — developed by Anthropic — for exposing tools to LLMs in a consistent, interoperable way. Rather than hardcoding tool interfaces per model or per system, MCP gives you a uniform layer: your server exposes tools, the LLM connects and discovers them, and you don't have to reinvent the plumbing for every new model you integrate.

In the cricket article system, you'd build an MCP server that exposes your data-fetching functions. The LLM agent connects to it, sees the available tools, and calls them as needed — all without bespoke integration work per query type.

## The HashMap curveball

After the main question, the interviewer pivoted to something that felt like a pop quiz:

> "You mentioned HashMap a lot. What's the lookup time for a HashMap?"

I said O(log n) first. Wrong. The interviewer's response was perfect: *"If it's O(log n), why don't we just use a tree?"*

That nudge was enough. Here's the correct answer:

| Case | Time complexity | Why |
| :--- | :--- | :--- |
| Average (no collision) | **O(1)** | Hash function maps key directly to a bucket index |
| Collision, small bucket | **O(n)** within bucket | Linked-list traversal within the bucket |
| Collision, large bucket (Java) | **O(log n)** | Bucket converts to a red-black tree when size ≥ 8 |
| All keys collide (worst case) | **O(n)** | Everything ends up in one bucket |

The O(log n) I initially mentioned isn't the average case — it's what Java's `HashMap` uses *inside a single bucket* once the collision count exceeds a threshold (default: 8). At that point, the linked list within the bucket is converted to a **red-black tree** for better worst-case performance within that bucket.

But across the whole map, under a good hash function with low collision rates, HashMap lookup is O(1). That's the whole point of the data structure, and why it's almost always preferred over a tree when you need key-value lookup.

**The lesson under the lesson:** self-correcting under pressure is a good signal. Interviewers often know you'll slip up — they're watching to see if you can catch yourself and reason your way back.

## What I'd say if I could go back

- Name the pattern upfront: "This is a RAG + tool-calling architecture."
- Mention embeddings + vector search for semantic retrieval, not just keyword indexing.
- Clarify that MCP is a protocol for tool discovery and standardization, not just a server.
- On HashMap: lead with O(1), then explain the collision edge cases as bonus depth.
- When you slip on a basic, correct yourself quickly and move on — don't spiral.

## The bigger picture

What made this question good was that it started with something concrete — cricket articles, search — and forced a chain of realizations: keyword search isn't semantic search, semantic search isn't enough without intent parsing, intent parsing at scale means LLMs, and LLMs need structured access to your data via tools.

That chain — from a simple indexing question to a full agentic AI architecture — is increasingly the kind of systems thinking companies look for when hiring for AI-adjacent engineering roles. The inverted index isn't wrong; it's just the first step, not the whole answer.

And sometimes, the best interviews are the ones that force you to keep going until you get there.
