---
title: "LLD Of a Crypto Wallet"
excerpt: "A low-level design round from a well-known crypto company: design a multi-asset crypto wallet with correct, concurrency-safe transaction handling. Full Java design — project structure, entities, DTOs, controllers, services, a double-entry ledger, transaction state machine, idempotency, and concurrency control."
date: "2026-03-10"
category: "interview-experiences"
tags: ["interview", "lld", "system-design", "java", "spring-boot", "crypto", "concurrency"]
author: "Aryansh Kurmi"
---

# LLD Of a Crypto Wallet

A famous crypto company asked me to do a **low-level design** for a crypto wallet. The brief was deliberately open-ended, but the interviewer made the real focus clear within the first few minutes: **the money must always be correct**. Balances can never go negative, a transaction must never be applied twice, and two concurrent operations on the same wallet must never corrupt each other. Everything else — multi-asset support, transfers, deposits, withdrawals — was secondary to getting the transaction handling right.

This is the design I built up on the whiteboard, written out fully in Java (Spring Boot style).

## 🎯 Requirements

**Functional**
- A user can hold a **wallet** with balances across multiple **assets** (BTC, ETH, USDT, …).
- Support **deposit** (credit), **withdrawal** (debit), and **transfer** (debit one wallet, credit another) of an asset.
- Every balance change is recorded as an immutable **transaction** with a full audit trail.
- A user can query balances and transaction history.

**Non-functional (the part they actually cared about)**
- **Correctness:** balances must reconcile exactly; no money created or destroyed.
- **No overdraft:** a debit can never drive a balance negative.
- **Idempotency:** retrying the same request (network retry, double click) must not double-apply.
- **Concurrency-safe:** simultaneous operations on the same wallet must be serialized correctly.
- **Auditable:** the ledger is append-only; you can always explain how a balance was reached.

## 🧱 Core design decisions

Two decisions drive the whole design:

1. **Double-entry ledger.** Every transaction produces balanced ledger entries (debits = credits). The `balance` column on an account is a cached projection; the ledger is the source of truth. This is how real financial systems guarantee they never "lose" money.
2. **Money is never a `double`.** Crypto amounts use `BigDecimal` with a fixed scale per asset. Floating point is banned — `0.1 + 0.2 != 0.3` is unacceptable for money.

## 📁 Project structure

```
com.wallet
├── WalletApplication.java
├── controller
│   └── WalletController.java
├── service
│   ├── WalletService.java
│   ├── TransactionService.java
│   └── IdempotencyService.java
├── domain                # JPA entities
│   ├── User.java
│   ├── Wallet.java
│   ├── Account.java
│   ├── Asset.java
│   ├── Transaction.java
│   ├── LedgerEntry.java
│   └── IdempotencyKey.java
├── domain.enums
│   ├── AssetType.java
│   ├── TransactionType.java
│   ├── TransactionStatus.java
│   └── EntryDirection.java
├── dto
│   ├── DepositRequest.java
│   ├── WithdrawRequest.java
│   ├── TransferRequest.java
│   ├── TransactionResponse.java
│   └── BalanceResponse.java
├── repository
│   ├── WalletRepository.java
│   ├── AccountRepository.java
│   ├── TransactionRepository.java
│   └── IdempotencyKeyRepository.java
├── exception
│   ├── InsufficientBalanceException.java
│   ├── DuplicateRequestException.java
│   └── WalletNotFoundException.java
└── config
    └── GlobalExceptionHandler.java
```

## 🗂️ Entities

A `Wallet` belongs to a `User` and holds one `Account` per asset. The `Account` is where the balance lives — and where we enforce concurrency.

```java
@Entity
@Table(name = "wallets")
public class Wallet {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "wallet", fetch = FetchType.LAZY)
    private List<Account> accounts = new ArrayList<>();

    private LocalDateTime createdAt;
}
```

```java
@Entity
@Table(
    name = "accounts",
    uniqueConstraints = @UniqueConstraint(columnNames = {"wallet_id", "asset"})
)
public class Account {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "wallet_id")
    private Wallet wallet;

    @Enumerated(EnumType.STRING)
    private AssetType asset;

    // cached projection of the ledger; BigDecimal, never double
    @Column(precision = 38, scale = 18, nullable = false)
    private BigDecimal balance = BigDecimal.ZERO;

    // optimistic-lock guard — JPA bumps this on every update
    @Version
    private Long version;
}
```

The **unique constraint on `(wallet_id, asset)`** guarantees exactly one account per asset per wallet — so two concurrent "create account" requests can't both succeed.

```java
@Entity
@Table(name = "transactions")
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    private TransactionType type;        // DEPOSIT, WITHDRAWAL, TRANSFER

    @Enumerated(EnumType.STRING)
    private TransactionStatus status;    // PENDING, COMPLETED, FAILED

    @Enumerated(EnumType.STRING)
    private AssetType asset;

    @Column(precision = 38, scale = 18, nullable = false)
    private BigDecimal amount;

    private UUID sourceAccountId;        // null for deposit
    private UUID destinationAccountId;   // null for withdrawal

    @Column(unique = true)
    private String idempotencyKey;       // dedupe guard

    @OneToMany(mappedBy = "transaction", cascade = CascadeType.ALL)
    private List<LedgerEntry> entries = new ArrayList<>();

    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
```

The **double-entry ledger** — each row is one half of a balanced movement, immutable once written:

```java
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id")
    private Transaction transaction;

    @Column(name = "account_id")
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    private EntryDirection direction;    // DEBIT or CREDIT

    @Column(precision = 38, scale = 18, nullable = false)
    private BigDecimal amount;

    @Column(precision = 38, scale = 18, nullable = false)
    private BigDecimal balanceAfter;     // snapshot for audit

    private LocalDateTime createdAt;
}
```

> **Invariant:** within a single transaction, `sum(CREDIT amounts) == sum(DEBIT amounts)`. A deposit credits the user and debits a system "mint/treasury" account; a withdrawal does the reverse; a transfer debits one user account and credits another. Money is always conserved.

## 🔢 Enums and the state machine

```java
public enum AssetType { BTC, ETH, USDT, SOL }

public enum TransactionType { DEPOSIT, WITHDRAWAL, TRANSFER }

public enum EntryDirection { DEBIT, CREDIT }

public enum TransactionStatus {
    PENDING,     // created, not yet applied
    COMPLETED,   // ledger written, balances updated
    FAILED       // rolled back (e.g. insufficient funds)
}
```

A transaction moves `PENDING → COMPLETED` or `PENDING → FAILED`, and never goes backwards. Because the balance update and the ledger write happen in **one DB transaction**, an observer never sees a half-applied state.

## 📦 DTOs

Keep entities out of the API surface. Requests carry an idempotency key; responses expose only what the client needs.

```java
public record DepositRequest(
    @NotNull UUID walletId,
    @NotNull AssetType asset,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal amount,
    @NotBlank String idempotencyKey
) {}

public record WithdrawRequest(
    @NotNull UUID walletId,
    @NotNull AssetType asset,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal amount,
    @NotBlank String idempotencyKey
) {}

public record TransferRequest(
    @NotNull UUID sourceWalletId,
    @NotNull UUID destinationWalletId,
    @NotNull AssetType asset,
    @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal amount,
    @NotBlank String idempotencyKey
) {}

public record TransactionResponse(
    UUID transactionId,
    TransactionType type,
    TransactionStatus status,
    AssetType asset,
    BigDecimal amount,
    LocalDateTime completedAt
) {}

public record BalanceResponse(AssetType asset, BigDecimal balance) {}
```

The `@DecimalMin(value = "0", inclusive = false)` rejects zero and negative amounts at the edge, before any business logic runs.

## 🌐 Controller

```java
@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final TransactionService transactionService;
    private final WalletService walletService;

    public WalletController(TransactionService transactionService,
                           WalletService walletService) {
        this.transactionService = transactionService;
        this.walletService = walletService;
    }

    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(
            @RequestBody @Valid DepositRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.deposit(request));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(
            @RequestBody @Valid WithdrawRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.withdraw(request));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(
            @RequestBody @Valid TransferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.transfer(request));
    }

    @GetMapping("/{walletId}/balances")
    public ResponseEntity<List<BalanceResponse>> balances(
            @PathVariable UUID walletId) {
        return ResponseEntity.ok(walletService.getBalances(walletId));
    }
}
```

## ⚙️ The transaction service — where correctness lives

This is the heart of the design. Three guarantees stack here: **idempotency**, **atomicity** (`@Transactional`), and **concurrency control** (row locking).

```java
@Service
public class TransactionService {

    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final IdempotencyService idempotencyService;

    public TransactionService(AccountRepository accountRepository,
                              TransactionRepository transactionRepository,
                              IdempotencyService idempotencyService) {
        this.accountRepository = accountRepository;
        this.transactionRepository = transactionRepository;
        this.idempotencyService = idempotencyService;
    }

    @Transactional
    public TransactionResponse withdraw(WithdrawRequest req) {
        // 1. Idempotency: if we've seen this key, return the prior result
        Optional<Transaction> existing =
                idempotencyService.findExisting(req.idempotencyKey());
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        // 2. Lock the account row FOR UPDATE so no other txn touches it
        Account account = accountRepository
                .findByWalletIdAndAssetForUpdate(req.walletId(), req.asset())
                .orElseThrow(() -> new WalletNotFoundException(req.walletId()));

        // 3. Business rule: no overdraft
        if (account.getBalance().compareTo(req.amount()) < 0) {
            throw new InsufficientBalanceException(account.getId(), req.amount());
        }

        // 4. Mutate balance + write the ledger atomically
        account.setBalance(account.getBalance().subtract(req.amount()));

        Transaction txn = buildTransaction(
                TransactionType.WITHDRAWAL, req.asset(), req.amount(),
                account.getId(), null, req.idempotencyKey());

        LedgerEntry debit = ledgerEntry(
                txn, account.getId(), EntryDirection.DEBIT,
                req.amount(), account.getBalance());
        txn.getEntries().add(debit);

        txn.setStatus(TransactionStatus.COMPLETED);
        txn.setCompletedAt(LocalDateTime.now());

        accountRepository.save(account);   // version check fires here too
        transactionRepository.save(txn);

        return toResponse(txn);
    }
}
```

### Transfer — locking two accounts without deadlock

A transfer locks **two** rows. If thread A locks `account1` then `account2`, and thread B locks `account2` then `account1`, they deadlock. The fix is a **global lock ordering**: always acquire locks in a deterministic order (e.g. ascending account `UUID`). Then no cycle can ever form.

```java
@Transactional
public TransactionResponse transfer(TransferRequest req) {
    Optional<Transaction> existing =
            idempotencyService.findExisting(req.idempotencyKey());
    if (existing.isPresent()) return toResponse(existing.get());

    UUID srcAccId = accountRepository
            .findAccountId(req.sourceWalletId(), req.asset())
            .orElseThrow(() -> new WalletNotFoundException(req.sourceWalletId()));
    UUID dstAccId = accountRepository
            .findAccountId(req.destinationWalletId(), req.asset())
            .orElseThrow(() -> new WalletNotFoundException(req.destinationWalletId()));

    // DEADLOCK AVOIDANCE: always lock the smaller id first
    UUID firstId  = srcAccId.compareTo(dstAccId) < 0 ? srcAccId : dstAccId;
    UUID secondId = srcAccId.compareTo(dstAccId) < 0 ? dstAccId : srcAccId;

    Account first  = accountRepository.findByIdForUpdate(firstId).orElseThrow();
    Account second = accountRepository.findByIdForUpdate(secondId).orElseThrow();

    Account source = first.getId().equals(srcAccId) ? first : second;
    Account dest   = first.getId().equals(dstAccId) ? first : second;

    if (source.getBalance().compareTo(req.amount()) < 0) {
        throw new InsufficientBalanceException(source.getId(), req.amount());
    }

    source.setBalance(source.getBalance().subtract(req.amount()));
    dest.setBalance(dest.getBalance().add(req.amount()));

    Transaction txn = buildTransaction(
            TransactionType.TRANSFER, req.asset(), req.amount(),
            source.getId(), dest.getId(), req.idempotencyKey());

    // balanced double entry: debit source, credit dest
    txn.getEntries().add(ledgerEntry(txn, source.getId(),
            EntryDirection.DEBIT, req.amount(), source.getBalance()));
    txn.getEntries().add(ledgerEntry(txn, dest.getId(),
            EntryDirection.CREDIT, req.amount(), dest.getBalance()));

    txn.setStatus(TransactionStatus.COMPLETED);
    txn.setCompletedAt(LocalDateTime.now());

    accountRepository.saveAll(List.of(source, dest));
    transactionRepository.save(txn);
    return toResponse(txn);
}
```

## 🔒 Concurrency handling — the core of the round

This is what the interviewer pushed hardest on. There are three layers, and I made the case for combining them.

### 1. Pessimistic row locking (`SELECT ... FOR UPDATE`)

When two requests hit the same account at once, we must serialize them. A pessimistic write lock makes the second request **wait** until the first commits, so it always reads a fresh balance.

```java
public interface AccountRepository extends JpaRepository<Account, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.id = :id")
    Optional<Account> findByIdForUpdate(@Param("id") UUID id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Account a WHERE a.wallet.id = :walletId AND a.asset = :asset")
    Optional<Account> findByWalletIdAndAssetForUpdate(
            @Param("walletId") UUID walletId, @Param("asset") AssetType asset);
}
```

The classic lost-update race is now impossible:

```
Thread 1  ── SELECT ... FOR UPDATE (lock acquired) 🔒
             balance = 10 BTC
             withdraw 4 → balance = 6 BTC
             COMMIT (lock released) 🔓

Thread 2  ── SELECT ... FOR UPDATE ... waiting ⏳
             (now proceeds)
             reads FRESH balance = 6 BTC ✅
             withdraw 5 → would be 1 BTC ✅  (correct, not -1)
```

Without the lock, both threads read `10`, both write `6`, and one withdrawal silently vanishes.

### 2. Optimistic locking (`@Version`) as a safety net

The `@Version` column on `Account` means that if anything *did* slip past — say a code path that updated outside the lock — JPA throws `OptimisticLockException` on save instead of writing stale data. Pessimistic locking is the primary defense; `@Version` is defense-in-depth.

### 3. Idempotency — the dedupe guard

Clients retry. A network blip after the server already committed must not cause a second withdrawal. The unique `idempotencyKey` on `Transaction` (backed by a DB unique index) makes a replay a no-op that returns the original result.

```java
@Service
public class IdempotencyService {

    private final TransactionRepository transactionRepository;

    public IdempotencyService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public Optional<Transaction> findExisting(String key) {
        return transactionRepository.findByIdempotencyKey(key);
    }
}
```

Even under a race where two identical requests run truly in parallel, the **unique constraint** is the final backstop: the second `INSERT` fails, and we catch it and return the first transaction's result.

```java
try {
    transactionRepository.save(txn);
} catch (DataIntegrityViolationException dup) {
    // a concurrent duplicate won the insert — return its result
    return toResponse(
        transactionRepository.findByIdempotencyKey(txn.getIdempotencyKey())
            .orElseThrow());
}
```

> **Why DB-level locks over an in-JVM `ReentrantLock`?** A `synchronized` block or a `ConcurrentHashMap<accountId, Lock>` only serializes within **one** JVM. Crypto wallets run many instances behind a load balancer, so the correctness boundary has to be the **database row**, not application memory. `SELECT ... FOR UPDATE` + a unique idempotency index gives correctness across the whole cluster.

## 🧮 Why the ledger matters

Because every movement writes balanced `LedgerEntry` rows, you can **rebuild any balance from scratch** and reconcile it against the cached `Account.balance`:

```
balance(account) == Σ(CREDIT entries) − Σ(DEBIT entries)
```

If those two ever disagree, you have a bug *and* a paper trail to find it. This separation — fast cached balance + immutable source-of-truth ledger — is exactly how exchanges keep books that auditors will accept.

## 🛡️ Exception handling

Business rule violations become clean HTTP responses through a single advice class:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<String> handleInsufficient(InsufficientBalanceException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(e.getMessage());
    }

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<String> handleNotFound(WalletNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }

    @ExceptionHandler(OptimisticLockException.class)
    public ResponseEntity<String> handleConcurrent(OptimisticLockException e) {
        // tell the client to retry; the previous attempt did not apply
        return ResponseEntity.status(HttpStatus.CONFLICT).body("Concurrent update, retry");
    }
}
```

## 🎯 Summary — what made this design correct

| Concern | Mechanism |
|---|---|
| Money precision | `BigDecimal(precision 38, scale 18)`, never `double` |
| No money created/destroyed | Double-entry ledger; debits == credits per txn |
| No overdraft | Balance check **inside** the row lock before debit |
| Lost-update race | `SELECT ... FOR UPDATE` (pessimistic write lock) |
| Cross-cluster safety | DB-level locks, not in-JVM locks |
| Defense in depth | `@Version` optimistic lock as a backstop |
| Duplicate/retry requests | Unique `idempotencyKey` + catch on insert |
| Atomicity | `@Transactional` wraps balance update + ledger write |
| Deadlock on transfers | Global lock ordering (lock lower account id first) |
| Auditability | Immutable ledger; balance reconstructable from entries |

The takeaway I left the interviewer with: for a wallet, **the transaction layer is the product**. Multi-asset support and nice APIs are easy; the hard, non-negotiable part is that every balance is provably correct under retries and concurrency — and that's what the ledger + row locking + idempotency triad buys you.
