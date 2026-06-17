---
title: "Building a Blazing-Fast Kanban Board UI with IndexedDB"
excerpt: "How I built a Kanban board that feels instant by pushing state into IndexedDB on the frontend and pairing it with a Linear-inspired sync engine on the backend. The architecture, the tradeoffs, and what I'd do differently."
date: "2026-06-18"
category: "engineering-lessons"
tags: ["indexeddb", "local-first", "sync-engine", "frontend-architecture", "kanban", "performance"]
author: "Aryansh Kurmi"
---

# Building a Blazing-Fast Kanban Board UI with IndexedDB

Most Kanban boards I've used have a tiny but persistent friction: you drag a card, and there's a quarter-second pause while it waits for the server to bless the move. It's small, but it adds up. After a few hundred drags you start to feel it in your shoulders.

I wanted to build one where dragging a card felt like dragging an icon on your desktop — zero latency, zero "is it saved?" anxiety. The way to get there isn't a faster API. It's to stop waiting for the API at all.

This post walks through the architecture I landed on: an IndexedDB-backed frontend that owns the source of truth locally, paired with a Linear-inspired sync engine on the backend that reconciles changes in the background.

## Why IndexedDB, and not just React state

The obvious first instinct is "throw it in Redux and persist to localStorage." That works until it doesn't:

- **localStorage is synchronous** and blocks the main thread. A board with a few thousand cards starts hitching.
- **localStorage is ~5MB** and stringified. IndexedDB is orders of magnitude larger and stores structured data.
- **You can't query localStorage.** With IndexedDB you get indexes, cursors, and range queries — basically a real database in the browser.

The mental shift is treating IndexedDB as the *primary* store, not a cache. The UI reads from IndexedDB. The UI writes to IndexedDB. The server is just another peer that the sync engine talks to.

## The frontend architecture

Three layers, top to bottom:

### 1. The UI layer

React components subscribe to a thin reactive store. When you drag a card from "In Progress" to "Done," the component dispatches a mutation. That's it from the UI's perspective. No await, no spinner, no error boundary for network failures.

### 2. The local store (IndexedDB)

Every mutation is written to IndexedDB immediately and synchronously from the UI's point of view. I use a small wrapper around the native IndexedDB API — Dexie works well, but a hand-rolled one is maybe 200 lines if you only need a few object stores.

The schema is intentionally boring: `boards`, `columns`, `cards`, and a `mutations` store that acts as an outbox.

Every mutation gets two things written in a single transaction:
1. The new state of the entity (the card with its new column)
2. An entry in the `mutations` outbox describing what changed

That transactional guarantee is the whole game. If the tab crashes mid-write, either both happened or neither did. You never end up with a UI that thinks the card moved but no record to send to the server.

### 3. The sync worker

A background loop (I run it in a Web Worker so it doesn't compete with the UI for the main thread) reads from the `mutations` outbox and ships entries to the server. On success, it deletes the entry. On failure, it backs off and retries. On a 409 conflict, it asks the server for the authoritative state and reconciles.

The UI never knows or cares whether the sync worker is caught up. It just reads from IndexedDB.

## The backend: a Linear-inspired sync engine

The backend is where it got fun. I read everything I could find about how Linear handles sync — their model is excellent and surprisingly approachable once you strip the marketing.

The core ideas:

### Mutations, not REST

The client doesn't `POST /cards/:id` with the new column. It sends a *mutation*: a typed message like `{ type: "moveCard", cardId, fromColumn, toColumn, position, clientTimestamp }`.

The server applies the mutation against current state and returns the resulting transaction. If the mutation is impossible (the card was deleted by someone else), the server rejects it with enough information for the client to roll back.

### A global sync log

Every successful mutation gets appended to a per-workspace log with a monotonically increasing version number. Clients track the last version they've seen. When they reconnect, they ask for everything since that version. This is essentially a tiny replication log, and it makes catch-up sync embarrassingly simple.

### Optimistic by default, reconciled when needed

Because the client already applied the mutation locally and moved on, the server's job is just to make the global log consistent. Most of the time it's a rubber stamp. When conflicts happen — two people drag the same card to different columns — last-writer-wins is fine for a Kanban board. The loser sees the card snap to the winning position next sync tick. Anything more sophisticated is overkill for this domain.

## What this feels like in practice

Dragging a card is instantaneous because it's a local IndexedDB write — no network in the critical path. Offline works for free, because offline is just "the sync worker is having a bad time, but the UI doesn't notice." Page loads are fast because the initial render comes from IndexedDB, and the sync worker catches up to the server in the background.

The first time I closed my laptop mid-drag, reopened it on a different network, and watched the board reconcile silently, I knew the architecture was right.

## What I'd do differently

- **Start with the mutation types, not the schema.** I spent too long modeling tables. The mutation vocabulary is the real API.
- **Build the outbox first.** Everything else hangs off it. If your outbox is solid, your offline story is solid.
- **Don't ship your own conflict resolution if you don't have to.** Last-writer-wins covered ~99% of cases. The remaining 1% I solved with UI affordances ("this card was moved while you were offline — undo?") instead of CRDT machinery.

## Takeaway

Local-first isn't a feature you bolt on. It's an architectural choice that ripples through every layer — but the payoff is a UI that feels like a native app and a sync story that's honestly simpler than the REST CRUD app I would have built otherwise.

The server stops being a bottleneck and becomes what it should have been all along: a reconciliation point, not a gatekeeper.
