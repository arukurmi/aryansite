---
title: "What Lied First: 5 Real Production Incidents and Their Engineering Lessons"
excerpt: "Big outages are rarely about a system going down — they're about one part of the system lying while everything else looks green. Five public postmortems from Google, AWS, Atlassian, Cloudflare, and GitLab, and the concrete engineering lessons from each."
date: "2026-06-17"
category: "engineering-lessons"
tags: ["postmortems", "reliability", "incidents", "sre", "system-design", "on-call"]
author: "Aryansh Kurmi"
---

# What Lied First: 5 Real Production Incidents and Their Engineering Lessons

In a silent outage the first problem is usually *not* that the system is down. The first problem is that one part of the system is **lying**. The dashboard is green. CPU is normal. Error rate is low. And users are already complaining.

A junior engineer searches for noise — opens the logs and starts scrolling, hoping one error line explains everything. A senior engineer looks for the *shape* of the failure: which component is returning success while quietly doing nothing useful? Which metric stayed green when everything underneath it was going wrong?

You build that judgment by reading postmortems — including ones from teams that aren't yours. Below are five real, publicly documented incidents from large engineering organizations. For each one: what happened, **what lied first**, and the concrete engineering lessons.

---

## 1. Google — The Day Login Itself Ran Out of Quota (Dec 2020)

**What happened.** For roughly three quarters of an hour, a huge slice of Google went down at once — Gmail, YouTube, Drive, Calendar, Assistant. The common thread was anything that required you to be *logged in*. The root cause was Google's central identity/User ID service: an automated storage-quota system had been migrated, and a registration issue caused it to read the service's usage as effectively zero. Seeing "no usage," the automation reclaimed the quota — and once the identity service had no quota, it could no longer issue or validate authentication tokens. Every downstream service that checked "who is this user?" started failing.

**What lied first.** The usage signal. The quota system believed the identity service needed almost nothing, so it confidently took capacity away from the single most critical service in the company. Individual product teams saw failures bubble up only *after* the quota was already exhausted, because of grace periods that delayed the visible impact.

**Engineering lessons:**
- **Critical infrastructure needs floors, not just ceilings.** Automated systems that reclaim resources must never be allowed to drive a Tier-0 dependency (auth, DNS, identity) to zero. Set hard minimums.
- **Fail safe, not just fail fast.** When an authorization/identity check can't be completed, decide *deliberately* whether to fail open or closed — don't let a quota system make that decision for you by accident.
- **Alert on the inputs to automation, not only its outputs.** A "usage dropped to zero for the identity service" signal should page a human long before the automation acts on it.
- **Blast radius of shared services.** One identity service backs hundreds of products. Changes to it deserve the most conservative rollout and the loudest alarms.

---

## 2. AWS S3 — The Typo, and the Status Page That Couldn't Admit It Was Down (Feb 2017)

**What happened.** While debugging a billing-system slowdown, an authorized engineer ran an established playbook command to remove a small number of servers from an S3 subsystem in the US-EAST-1 region. A typo in the command removed far more capacity than intended — enough to take down the index and placement subsystems that S3 depends on. Both had to be fully restarted, and because they hadn't been restarted in years at that scale, the restart and safety checks took hours. A large fraction of the internet that relied on S3 in that region degraded or broke.

**What lied first.** The AWS Service Health Dashboard — the very page customers check to see if AWS is up — was itself hosted on the infrastructure that was down. So for a long stretch, the dashboard showed everything green while S3 was clearly broken. The system meant to tell you the truth was the system that was lying.

**Engineering lessons:**
- **Your status page must not depend on the thing it reports on.** Health-reporting and alerting must live on infrastructure with *no* shared fate with production. This is the canonical example of why.
- **Put guardrails on destructive tooling.** Playbook commands that remove capacity should refuse to take down more than a safe threshold without an extra confirmation — humans will eventually fat-finger the input.
- **Practice restarts before you need them.** Subsystems that "never" get restarted accumulate hidden recovery risk. Regularly exercise cold starts so recovery time is known, not discovered during a SEV.
- **Partition for blast radius.** Large subsystems should be cellularized so one bad command can't take the whole region's capacity offline.

---

## 3. Atlassian — A Cleanup Script That Permanently Deleted 400 Customers (Apr 2022)

**What happened.** Atlassian set out to delete a deprecated legacy app from customer sites. A maintenance script was handed a list of IDs to delete. Two mistakes combined: the IDs pointed at *entire customer sites* rather than just the legacy app, and the script used the **permanent-delete** path instead of the recoverable "mark for deletion" path. The result: roughly 400 companies had their Jira/Confluence sites permanently wiped. Because the deletion was permanent and the recovery tooling was built for one-site-at-a-time restores, some customers were down for up to two weeks while sites were rebuilt individually.

**What lied first.** Nothing alerted that customers had just been destroyed. The script reported "success" — it did exactly what it was told. The gap between "the job completed" and "the job did something catastrophic" is where the silence lived. The second lie was the recovery assumption: the team believed restores were fast, until they had to do 400 of them at once.

**Engineering lessons:**
- **Soft-delete by default; make permanent deletion the hard path.** Destructive operations should be recoverable for a retention window unless someone explicitly and unmistakably opts into permanence.
- **Verify the target of bulk operations.** A two-person review or an automated check ("these IDs are *sites*, not *apps* — are you sure?") would have caught the mismatch.
- **Disaster recovery must be tested at the scale you'd actually need it.** Restoring one site is not the same capability as restoring hundreds in parallel. If you can't do the big restore in a drill, you can't do it in an incident.
- **Separate "job succeeded" from "job was correct."** Add post-conditions and anomaly checks (e.g., "we just deleted 400 active sites — halt and alert").

---

## 4. Cloudflare — One Regular Expression That Pegged Every CPU on Earth (Jul 2019)

**What happened.** Cloudflare pushed a new managed firewall (WAF) rule to its global fleet. The rule contained a regular expression with **catastrophic backtracking** — on certain inputs its matching cost exploded exponentially. Because the rule ran on the request-processing path across the entire network, CPU usage spiked to 100% on machines worldwide, and Cloudflare's proxy stopped serving traffic. A large portion of sites behind Cloudflare returned 502 errors for around half an hour.

**What lied first.** The service wasn't "down" in the usual sense — nothing crashed, nothing lost its database. The machines were *alive and 100% busy* burning CPU on one regex. From a naive health check, processes were running fine. The failure shape was resource exhaustion, not a crash.

**Engineering lessons:**
- **Treat regexes as untrusted code.** Lint for catastrophic backtracking, and run rule evaluation with strict CPU/time budgets so one expression can't monopolize a core.
- **Even "security-urgent" changes need staged rollout.** This rule was pushed broadly through a fast path. A canary — even a 1% one — would have lit up CPU alarms before global impact.
- **Have a kill switch for every class of change.** The fastest mitigation is being able to instantly disable the subsystem (here, the new WAF ruleset) without a full redeploy.
- **Monitor saturation, not just errors.** CPU-at-100% with low error counts is exactly the green-dashboard trap; saturation metrics must page on their own.

---

## 5. GitLab — `rm -rf` on Production, and Five Backups That Were All Broken (Jan 2017)

**What happened.** During a late-night incident involving replication lag and spam, a tired engineer tried to clear a data directory on a *secondary* database to re-sync it — and ran the removal against the **primary** instead, deleting hundreds of gigabytes of live data. Then came the worse discovery: of the five separate backup and replication mechanisms GitLab thought it had, none were actually working. The only usable copy was a several-hours-old snapshot taken for staging, so recovery meant accepting roughly six hours of permanent data loss.

**What lied first.** The backups. For a long time everyone *assumed* backups were running — the jobs existed, the config looked right. But nobody had verified a restore, so the silent failure (empty uploads, broken pg_dump, disabled notifications) went unnoticed until the one moment it mattered.

**Engineering lessons:**
- **A backup you haven't restored is not a backup.** Schedule automated restore drills; alert loudly when a backup job produces a zero-byte or undersized artifact.
- **Remove humans from the hot path of destructive prod commands.** Production deletions should go through tooling with confirmations and host/role checks — not a raw shell where primary and secondary differ by one character.
- **Respect fatigue.** Most catastrophic human-error incidents happen late at night on the back of a long day. On-call rotations and "two sets of eyes for destructive ops" exist for this reason.
- **Transparency builds trust.** GitLab live-documented the recovery in public. Owning an incident openly is itself an engineering discipline — and a gift to every team that reads the postmortem later.

---

## The Throughline

Across all five, the system rarely failed by going cleanly dark. It failed by **lying**: a usage signal read zero, a status page stayed green, a script reported success, processes stayed alive at 100% CPU, backup jobs "ran" but produced nothing. The damage was real long before the obvious alarm fired.

So the habits that actually separate senior engineers are not exotic:

1. **Design for the failure case first.** Floors on critical resources, soft-deletes, kill switches, guardrails on destructive tooling.
2. **Make your truth-telling systems independent.** Status pages, alerting, and backups must not share fate with what they watch.
3. **Verify the things you assume work.** Test restores, test mass recovery, canary every change — including the urgent ones.
4. **Read other teams' postmortems.** When another team has an incident, don't skip it because it "wasn't your system." Ask what lied first, and which green metric they trusted that turned out to be wrong.

That last habit is the cheapest seniority you can buy. Every incident above is public precisely so the rest of us can learn from it without living through it.
