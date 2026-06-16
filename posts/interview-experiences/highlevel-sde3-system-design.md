---
title: "HighLevel SDE-3 System Design Interview"
excerpt: "A real SDE-3 system design round at HighLevel — designing a multi-tenant CRM backend. The questions asked, where the discussion went, and what the right answers look like."
date: "2026-06-08"
category: "interview-experiences"
tags: ["interview", "highlevel", "system-design", "sde-3", "multi-tenant", "backend"]
author: "Aryansh Kurmi"
---

# System Design Interview: Multi-Tenant CRM Backend

*A real interview breakdown — the questions asked, where the discussion went, and what the right answers look like.*

---

## The Setup

The problem was to design a backend for a multi-tenant contacts management system — think a lightweight CRM where multiple organizations can sign up, manage contacts, add notes, and log interactions. Each org is isolated from others. The interview was high-level design, but the interviewer kept pushing on scale and correctness at every turn.

---

## Question 1: How do you handle bulk import and export at scale?

**What was discussed:**

The natural first instinct is to handle export synchronously — query the database in batches, assemble chunks, upload a multipart file to S3, and let the client poll for completion. This is reasonable and works fine up to a few million rows.

The interviewer kept pushing: *"What if there are a billion rows?"*

**The right answer:**

At that scale, you cannot afford to buffer anything in memory. The correct approach is a streaming pipeline triggered by a job queue:

1. The client hits `POST /exports` and immediately gets back a `jobId`. The server does nothing heavy here.
2. A background worker picks up the job from a queue (SQS, BullMQ, Kafka — pick your flavour).
3. The worker opens a **server-side database cursor** — this streams rows one page at a time instead of loading everything at once.
4. Each page flows through a transform stream (converting rows to CSV/JSON) and feeds directly into an **S3 multipart upload**. The worker never holds more than a few KB in memory at any point.
5. When done, the worker stores the S3 presigned URL in a job status table and optionally webhooks the client.

The client checks `GET /exports/{jobId}/status` to know when it's ready.

For import, the same idea applies — parse the uploaded file, push each batch onto a queue, let worker consumers validate and insert independently. This gives you parallelism, per-row error reporting, and resilience if a worker crashes mid-way.

The key insight: *the API server's only job is to enqueue work and return a job ID. All the heavy lifting happens asynchronously in workers.*

---

## Question 2: How does JWT authentication work with tenant isolation?

**What was discussed:**

Standard JWT — issue a token on login containing `userId` and `orgId`, verify it on each request, use `orgId` to scope database queries. This is mostly right, but the interviewer wanted to go deeper on where exactly isolation is enforced.

**The right answer:**

The `orgId` must come exclusively from the verified JWT — never from the request body or URL parameters. If a client sends a different `orgId` in their payload, the middleware ignores it entirely. This is where cross-tenant data leaks happen in real systems.

The full flow looks like this:

- User logs in with username and password.
- The auth service verifies the password with bcrypt, then issues a JWT signed with RS256 containing `{ userId, orgId, role }`. These claims are baked in at token creation — no extra DB lookups on each request.
- Every subsequent request goes through auth middleware that verifies the signature and extracts `orgId`.
- Every database query appends `WHERE org_id = :orgId` using that value.

The advanced layer that big systems use is **PostgreSQL Row Level Security (RLS)**. You set `SET LOCAL app.current_org_id = :orgId` at the start of each transaction, and the database engine itself blocks any cross-tenant query — even if the application code accidentally forgets to add the `WHERE` clause. It's defense in depth: the app enforces isolation, and the database enforces it again underneath.

---

## Question 3: How does org onboarding work, API by API?

**What was discussed:**

The interviewer wanted the full flow — not just "create an org and some users" but the exact sequence of API calls, what each one does, and how user invitations work in practice.

**The right answer:**

Onboarding happens in three phases:

**Phase 1 — Create the org and its first admin.**
`POST /orgs` creates the organization record and returns an `orgId`. Immediately after, `POST /orgs/{orgId}/users` creates the SUPERADMIN user with a real password — this is the person who signed up.

**Phase 2 — Admin invites teammates.**
The admin hits `POST /orgs/{orgId}/invites` with a list of `{ email, role }` pairs. The backend creates a stub user record for each (email and role set, password empty, status `PENDING`) and stores an invite token in Redis with a TTL (typically 48–72 hours). A background email worker sends each invite with a link like `/accept-invite?token=<uuid>`.

**Phase 3 — Invited user activates their account.**
When the user clicks the link, the page immediately calls `GET /invites/{token}/validate` — a read-only check against Redis. If valid, the form is shown pre-filled with their email and org name. If expired, an error page is shown immediately, before they fill anything out.

When the user submits their chosen password, `POST /invites/{token}/accept` does the real work: re-validates the token (because time passed), atomically deletes the Redis key and activates the user record, hashes the password with bcrypt, and returns a JWT. From here the user is fully operational.

---

## Question 4: Where exactly is the invite TTL checked — on link open or on API submit?

**What was discussed:**

This came up as a follow-up on the invite flow. The question is deceptively simple: where does expiry get enforced?

**The right answer:**

Both places, for different reasons.

**Checkpoint 1 — page load.** When the user opens the invite link, the frontend immediately calls `GET /invites/{token}/validate`. This is a fast Redis lookup. If the token is expired, the user sees a friendly "this link has expired" page right away — they don't waste time filling out a form only to get an error on submit. This is purely a UX check.

**Checkpoint 2 — form submit.** When the user submits their password, the backend re-checks the token. This is the actual security gate. Between page load and form submit, the token might have expired (user took too long) or — in a race condition — two browser tabs might have both passed Checkpoint 1 and are now both trying to activate. The backend must be the authority. The token is checked, consumed (deleted from Redis), and the user is activated atomically. If the token is gone at this point, the backend returns `410 Gone`.

The token itself should be a plain random UUID — opaque, no encoded data. The backend looks up the associated email and org from Redis/DB. This prevents forgery and makes tokens single-use by design. All major platforms (Slack, Notion, GitHub, Linear) follow this exact pattern, most using a DB row with an `expires_at` column rather than Redis, which is simpler and audit-friendly. Redis becomes worth adding at very high invite volume.

---

## The Bigger Takeaway

The interviewer wasn't looking for buzzwords — he was looking for candidates who understand *why* a design decision is made, not just *what* the pattern is. Event-driven architecture for bulk export isn't cool because it's distributed — it's correct because it's the only way to keep memory usage constant when the dataset is unbounded. JWT tenant isolation isn't just "add a WHERE clause" — it's a layered enforcement model where the DB is the last line of defense. And invite TTL isn't a single check — it's two checks solving two different problems: UX and correctness.

The throughline across all of it: **design for the failure case first.**
