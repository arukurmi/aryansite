---
title: "How Postgres Actually Works (Explained Like You're New Here)"
excerpt: "Pages, tuples, MVCC, xmin/xmax and WAL — explained with warehouses and sticky notes, plus the interview puzzle that catches almost everyone."
tags: ["postgres", "databases", "mvcc", "interviews"]
date: "2026-07-19"
author: "Aryansh Kurmi"
---

I got asked this in an interview: *"Explain how Postgres works."*

I gave an answer that sounded right. It was mostly wrong. Then the interviewer asked a follow-up puzzle about three pages, a DELETE and an INSERT — and my wrong mental model fell over immediately.

This post is the answer I wish I'd given. No prior database knowledge needed.

---

## First, the mental picture: a warehouse, not a filing cabinet

Most people imagine a database table as a spreadsheet. Rows in order, row 1 at the top, row 500 at the bottom.

That is not what's on disk.

A better picture is **a warehouse full of shelves**.

- The **table** is the warehouse.
- Each **shelf** holds a fixed amount of stuff — in Postgres, exactly **8 KB**. This shelf is called a **page** (also called a "block").
- Each **item on the shelf** is one row of your table. In Postgres jargon, a row stored on disk is called a **tuple**.

When you insert a new row, Postgres does **not** find the "correct" position for it. It asks a simple question: *"which shelf has free space?"* and puts it there. If no shelf has room, it builds a new shelf at the end.

> **Key idea #1:** The table itself is an **unordered pile**. There is no sorting. A row with `id = 5` might physically sit right next to a row with `id = 99999`.

The technical name for this unordered pile is the **heap**. When you read "heap table," it just means "the actual pile of rows."

### Then how is `WHERE id = 51` fast?

Through a completely separate structure: an **index**.

Think of the index as **the card catalogue in a library**. The books are scattered on shelves in no particular order, but the catalogue is sorted, and each card says *"Book X → Aisle 4, Shelf 2, Position 7."*

In Postgres:

- The index is a **B-tree** (a sorted, balanced tree structure — think of it as a multi-level sorted directory).
- Each entry in the index says: `id = 51 → (page 12, item 7)`.
- That address `(page number, item number)` has a name: the **ctid**.

So looking up `id = 51` is two steps: search the sorted index to find the address, then jump to that shelf and grab the item.

> **Common misconception I had:** I said "all the pages are indexed according to the primary key." Wrong. The pages are not ordered by anything. The primary key is a *separate* B-tree sitting beside the table.

**Worth knowing:** MySQL's InnoDB and SQL Server do it differently — there, the table *is* the primary key tree (called a **clustered index**), so rows really are stored in key order. **Postgres has no clustered indexes.** If an interviewer asks about the difference between Postgres and MySQL storage, this is the answer.

---

## Key idea #2: Postgres never edits anything in place

This is the big one. This is the concept that everything else hangs off.

When you run `UPDATE users SET name = 'Bob' WHERE id = 5`, you probably imagine Postgres finding that row and overwriting the name field.

**It doesn't.** It writes a brand new copy of the row and leaves the old one sitting there.

Why on earth would it do that? Because of a system called **MVCC**.

### MVCC = Multi-Version Concurrency Control

Let's unpack that name, because it actually explains itself:

- **Multi-Version** — many versions of the same row exist at the same time.
- **Concurrency Control** — the job of stopping simultaneous users from tripping over each other.

So: *"we handle many users at once by keeping multiple versions of each row."*

### The sticky note system

Here's the whole thing in one picture.

Every row version on disk has **two hidden columns** that you never see in a `SELECT *`, but that Postgres reads constantly:

| Hidden column | Plain English meaning |
|---|---|
| `xmin` | "The transaction that **created** me" |
| `xmax` | "The transaction that **deleted** me" (0 or empty if still alive) |

Think of every row as having two sticky notes attached: **"Added by #___"** and **"Removed by #___"**.

Every transaction gets a number, called the **transaction ID** or **txid**. They just count up: 100, 101, 102...

Now watch what each operation actually does.

#### INSERT

Transaction #100 runs `INSERT INTO users VALUES (5, 'Alice')`.

```
Page 3:
  [ id=5, name='Alice' ]   xmin=100   xmax=(empty)
```

One new tuple. Sticky note says "added by 100." Nothing says it's deleted. Simple.

#### DELETE

Transaction #105 runs `DELETE FROM users WHERE id = 5`.

Here's the surprise — **nothing is erased**:

```
Page 3:
  [ id=5, name='Alice' ]   xmin=100   xmax=105
```

The row is still physically there, byte for byte. Postgres just wrote `105` into the `xmax` sticky note. That's the entire DELETE.

> **A DELETE in Postgres is a write, not an erase.** It scribbles "removed by transaction 105" on the row and walks away.

#### UPDATE

Transaction #110 runs `UPDATE users SET name = 'Alicia' WHERE id = 5`.

An UPDATE is literally **a DELETE plus an INSERT**:

```
Page 3:
  [ id=5, name='Alice'  ]   xmin=100   xmax=110    <- old version, marked deleted
  [ id=5, name='Alicia' ]   xmin=110   xmax=(empty) <- brand new version
```

Two copies of "row 5" now exist. The new version might not even land on the same page — if page 3 was full, it goes wherever there's room.

This is why **updates make Postgres tables grow even when the row count doesn't change**. Update one row a million times and you've written a million tuples.

### How does anyone know which version to read?

When your transaction starts, Postgres takes a **snapshot** — essentially a photograph saying *"here is the list of transactions that had already finished when I began."*

Then, for every row version it encounters, it runs this check:

```
Can I see this row?
  1. Was it created (xmin) by a transaction that had already COMMITTED
     before my snapshot?              -> if no, I can't see it (too new)
  2. Was it deleted (xmax) by a transaction that had already COMMITTED
     before my snapshot?              -> if yes, I can't see it (already gone)
  Otherwise -> yes, this is my version. Show it.
```

That's it. That's MVCC.

### Why this design is brilliant

Because of this one sentence:

> **Readers never block writers, and writers never block readers.**

If you're running a big analytics `SELECT` while someone else updates rows, you don't wait for them and they don't wait for you. You're reading the old versions; they're writing new ones. Both proceed at full speed.

In older database designs, a reader would have to take a lock and the writer would sit and wait. MVCC removes that entirely.

### The price you pay: dead rows and VACUUM

All those old versions pile up. Rows that no active transaction can see any more are called **dead tuples** — garbage.

Left alone, your 1 GB table becomes 8 GB of mostly-corpses. This is called **table bloat**.

So Postgres runs a cleaner called **VACUUM** (usually automatically, as **autovacuum**). It walks through pages and marks space held by dead tuples as reusable.

Two things about VACUUM that come up in interviews:

1. **A long-running transaction blocks cleanup.** VACUUM can only remove a dead row if *no* transaction could still need it. One query sitting open for six hours means six hours of garbage nobody can collect. This is why long transactions are dangerous — not because they hold locks, but because they hold back the cleaner.

2. **Transaction ID wraparound.** Transaction IDs are 32-bit numbers, so they eventually run out and wrap around to zero. If that happened blindly, old rows would suddenly look like they were created in the future and vanish. VACUUM prevents this by "freezing" very old rows. If autovacuum falls too far behind, Postgres will refuse writes to protect your data. This is a genuine production incident people have had.

---

## Key idea #3: COMMIT does not write your table to disk

Ask most people "what happens when a transaction commits?" and they'll say "the changes get saved to the table file."

Nope.

### The problem

Writing to random spots on disk is slow. If every commit had to flush several scattered 8 KB pages, your database would crawl.

### The solution: write it down in a diary first

Postgres uses **WAL — the Write-Ahead Log**.

The rule is in the name: **write to the log ahead of writing to the table**.

The WAL is an append-only file. Appending to the end of one file is the fastest thing a disk can do — no seeking around. Each WAL record is a short note like *"on page 12, item 7, set xmax = 105."*

Here's the full sequence when you run an `UPDATE`:

```
1. Find the page. Is it already in memory (shared_buffers)?
     Yes -> use it.
     No  -> read it from disk into a memory slot.

2. Write a WAL record describing the change. (LOG FIRST. ALWAYS.)

3. Change the page *in memory*. Mark that memory slot "dirty"
   (dirty = changed but not yet saved to the table file).

4. COMMIT -> force the WAL to physically hit the disk (an fsync).
   *** This is the moment your data is durable. ***

5. Some time later, a background process writes the dirty page
   to the actual table file. Could be seconds later. Doesn't matter.
```

### Why is this safe if the table file is out of date?

Because of the diary.

If the server loses power right after step 4, the table file on disk is stale — but the WAL is intact. On restart, Postgres reads the WAL and **replays** every change since the last checkpoint. Your data comes back.

> **The one-liner:** *"COMMIT means the WAL was flushed to disk. It does not mean the table was written."*

Say that in an interview and you've immediately signalled that you know how databases actually work.

**Bonus vocabulary:**
- **shared_buffers** — Postgres's in-memory cache of pages. Called the **buffer pool**. Almost all activity happens here, not on disk.
- **checkpoint** — a periodic "okay, flush all dirty pages to the real files now" event, so crash recovery doesn't have to replay hours of WAL.
- **dirty page** — a page in memory that's been changed but not yet written to the table file.

---

## The puzzle: three pages, a DELETE and an INSERT

Now the interview question that broke my mental model.

**Setup.** A table with three pages:

```
Page 1  ->  rows with ids   1 - 100
Page 2  ->  rows with ids 101 - 200
Page 3  ->  rows with ids 201 - 300
```

**Transaction A** runs a DELETE hitting `id = 51` (page 1) and `id = 251` (page 3).

**Transaction B** runs an INSERT of several rows, with values that "belong" near 60, 160 and 260 — so notionally touching all three pages.

**The question:** Does the INSERT have to wait for the DELETE to finish?

**My answer in the room:** "Yes — SQL transactions are ACID, so they maintain proper sequence. The insert waits until the delete commits."

**The correct answer:** **No. Nothing waits. They run fully in parallel.**

Here's why, in five layers.

### Reason 1: Postgres locks rows, not pages

When Transaction A deletes `id = 51`, it doesn't put a "do not disturb" sign on page 1. It writes `xmax = A` onto that one tuple.

The row lock isn't even a separate object stored somewhere. **The lock *is* the `xmax` field.** It's four bytes written into the row's own header. It says something about row 51 and nothing whatsoever about row 60, row 99, or the page they live on.

### Reason 2: INSERT and DELETE don't conflict at the table level either

Postgres does take a lock on the whole *table* for any write — a mode called **ROW EXCLUSIVE**. Both INSERT and DELETE take exactly this mode.

And here's the thing: **ROW EXCLUSIVE is compatible with itself.** Two, or two hundred, writers can hold it on the same table simultaneously without blocking.

The lock modes that *do* block writers are the heavy ones — `SHARE`, `ACCESS EXCLUSIVE` — and those are taken by schema changes: `CREATE INDEX`, `ALTER TABLE`, `VACUUM FULL`. That's why a migration can freeze your production database while ordinary traffic never does.

### Reason 3: An INSERT doesn't want any particular page

This is the reason my premise was broken from the start.

Remember key idea #1: **the heap is unordered.** A new row with `id = 160` has no obligation to live on page 2. Postgres consults the **Free Space Map** (a small side structure tracking which pages have room), picks any page with space, and writes there. Or appends a new page.

So the INSERT never even *approaches* pages 1 and 3. There's nothing to wait for.

### Reason 4: Page-level locks exist, but last microseconds

There *is* a short-lived lock at the page level, called an **LWLock** (lightweight lock), held while bytes are physically copied into the page in memory.

But it's held for the duration of a memory write — nanoseconds — not for the life of the transaction. Even if both statements did hit the same page, they'd briefly take turns, not queue.

### Reason 5: ACID does not mean "one at a time"

This was my real error, and it's worth correcting properly, because a lot of people carry it.

**ACID** stands for **Atomicity, Consistency, Isolation, Durability**:

- **Atomicity** — all of a transaction happens, or none of it does.
- **Consistency** — constraints (unique, foreign keys, checks) always hold.
- **Isolation** — concurrent transactions don't corrupt each other's view.
- **Durability** — once committed, it survives a crash. (That's the WAL.)

The **I** is the one I misread. Isolation does not mean "transactions run in a queue." It means each transaction sees a *coherent* view of the data. And the whole point of MVCC is to deliver that coherent view **without** serialising anything.

Even at the strictest level, `SERIALIZABLE`, Postgres doesn't queue transactions. It uses **SSI** (Serializable Snapshot Isolation) — it lets everyone run optimistically, watches for dangerous patterns, and **aborts** one transaction if the result couldn't have happened in some serial order. It fails you rather than blocks you.

### So when *does* something block?

One case, and it's easy to remember:

> **Two transactions writing the same row.**

Transaction B tries to update `id = 51`, sees `xmax = A` on that tuple, and realises A hasn't committed yet. So B waits — specifically, it waits on A's *transaction ID lock*. When A commits or rolls back, B wakes up and proceeds (or retries).

That's the only conflict. Different rows? No wait. Same page, different rows? No wait. Reading while someone writes? No wait, ever.

### The sub-question: does a multi-row INSERT split into separate statements?

I also wondered whether:

```sql
INSERT INTO t (id, val) VALUES (60, 'a'), (160, 'b'), (260, 'c');
```

secretly becomes three separate INSERTs.

**No.** It is **one statement**: one parse, one plan, one execution, one snapshot. It's atomic — either all three rows land or none do. Internally the executor loops over the tuples and each may land on a different page, but there is no statement splitting and no moment where another transaction can see one row but not the others.

Same is true of `INSERT INTO t SELECT ...` — one statement, however many rows it produces.

---

## Quick reference

| Term | What it means in one line |
|---|---|
| **Page / block** | An 8 KB chunk of a table file. The unit of everything. |
| **Tuple** | One physical row version stored in a page. |
| **Heap** | The unordered pile of pages that is your table. |
| **ctid** | A row's physical address: `(page number, item number)`. |
| **xmin** | Transaction ID that created this row version. |
| **xmax** | Transaction ID that deleted it (empty if alive). |
| **MVCC** | Multi-Version Concurrency Control — keeping old row versions so readers and writers never block. |
| **Snapshot** | The list of "what had committed when I started," used to pick a visible version. |
| **Dead tuple** | An old version nobody can see any more. Garbage. |
| **VACUUM** | The cleaner that reclaims space from dead tuples. |
| **Bloat** | Wasted space from uncollected dead tuples. |
| **WAL** | Write-Ahead Log — the durable append-only diary of changes. |
| **fsync** | Force data physically onto disk (not just into an OS buffer). |
| **shared_buffers** | Postgres's in-memory page cache (the buffer pool). |
| **Dirty page** | A cached page changed in memory but not yet written to the table file. |
| **Checkpoint** | Periodic flush of all dirty pages, bounding crash-recovery time. |
| **Free Space Map** | Small structure tracking which pages have room for new rows. |
| **LWLock** | Very short-lived internal lock protecting a page during a memory write. |
| **ROW EXCLUSIVE** | The table-level lock every writer takes. Compatible with itself. |
| **B-tree** | The sorted tree structure used by indexes. |
| **SSI** | Serializable Snapshot Isolation — how Postgres does SERIALIZABLE without blocking. |

---

## The five sentences worth memorising

1. **The table is an unordered heap of 8 KB pages; indexes are separate sorted B-trees pointing at physical addresses.**
2. **Postgres never edits in place — DELETE writes `xmax`, and UPDATE writes a whole new tuple.**
3. **Readers never block writers, writers never block readers. Only same-row writes conflict.**
4. **COMMIT means the WAL was fsynced. The table file gets written later, by a background process.**
5. **ACID's "Isolation" means a coherent view, not sequential execution.**

Get those five right and you'll handle almost any Postgres interview question — including the one that caught me.
