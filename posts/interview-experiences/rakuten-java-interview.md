---
title: "Rakuten Java Interview Experience"
excerpt: "A detailed walkthrough of a Java-focused Rakuten interview round covering core Java, OOP, collections, Spring Boot, Hibernate, concurrency, and tricky language questions — with complete answers and code."
date: "2026-06-15"
category: "interview-experiences"
tags: ["interview", "rakuten", "java", "spring-boot", "hibernate", "concurrency"]
author: "Aryansh Kurmi"
---

# Rakuten Java Interview Experience

This was a Java-heavy round at Rakuten. The questions moved from core language features into OOP, collections internals, Spring Boot, Hibernate, concurrency, and a few tricky language behaviour questions. Below is the full set of questions with the answers I gave.

## 📋 Java Interview — Complete Answers

### 1. Major Features in Java That Changed Coding

Java has evolved a lot over the years. The most impactful release was **Java 8**, which introduced a completely functional style of programming.

**Lambdas** allowed us to write anonymous functions in a single line instead of creating whole anonymous classes:

```java
// Before Java 8
Runnable r = new Runnable() {
    public void run() { System.out.println("Hello"); }
};

// After Java 8 with Lambda
Runnable r = () -> System.out.println("Hello");
```

**Stream API** changed how we process collections:

```java
List<Integer> nums = Arrays.asList(1, 2, 3, 4, 5);

// Filter even numbers and collect
List<Integer> evens = nums.stream()
    .filter(n -> n % 2 == 0)
    .collect(Collectors.toList());
```

**`var` keyword (Java 10)** reduced boilerplate:

```java
var list = new ArrayList<String>(); // no need to repeat type
```

**Records (Java 16)** eliminated boilerplate data classes:

```java
// Instead of class with getters/setters/constructor
public record Merchant(String name, Double balance) {}
```

**Virtual Threads (Java 21)** made handling millions of concurrent requests easy without consuming OS threads.

### 2. OOP Features in Java

Java is built on 4 pillars:

**Encapsulation** — hide internal data, expose only what's needed:

```java
public class BankAccount {
    private Double balance; // hidden
    public Double getBalance() { return balance; } // exposed
    public void setBalance(Double b) { this.balance = b; }
}
```

**Inheritance** — child class reuses parent class code:

```java
class Animal {
    public void eat() { System.out.println("Eating..."); }
}
class Dog extends Animal {
    public void bark() { System.out.println("Barking..."); }
}
// Dog can now eat() AND bark()
```

**Polymorphism** — same method, different behavior:

```java
// Overloading (compile time)
void print(String s) {}
void print(Integer i) {}

// Overriding (runtime)
class Animal { void sound() { System.out.println("..."); } }
class Dog extends Animal {
    @Override
    void sound() { System.out.println("Bark"); }
}
```

**Abstraction** — hide complexity, show only essentials:

```java
// Using interface
interface Payment {
    void pay(Double amount); // no implementation
}
class UPIPayment implements Payment {
    public void pay(Double amount) {
        System.out.println("Paid via UPI: " + amount);
    }
}
```

> **Interview tip:** Java is not 100% OOP because it has primitive types like `int`, `char`, `float` etc.

### 3. Method Overriding

When a subclass provides its own implementation of a method already defined in the parent class.

```java
class Animal {
    public void sound() {
        System.out.println("Animal makes sound");
    }
}
class Dog extends Animal {
    @Override
    public void sound() {
        System.out.println("Dog barks");
    }
}

// At runtime
Animal a = new Dog();
a.sound(); // prints "Dog barks" → runtime polymorphism!
```

**Rules to remember:**
- Same method name, same parameters, same return type
- Access modifier can be same or wider (never more restrictive)
- Cannot override `static`, `final`, or `private` methods

> **Trick question:** "Can we override static methods?" — No! That's called **Method Hiding**, not overriding.

### 4. Multiple Inheritance in Java

Java does **NOT** support multiple inheritance with classes because of the **Diamond Problem**:

```java
class A { void show() { System.out.println("A"); } }
class B { void show() { System.out.println("B"); } }

// This causes compile error!
class C extends A, B {} // ❌ Java gets confused which show() to call
```

**Solution — use Interfaces:**

```java
interface A {
    default void show() { System.out.println("A"); }
}
interface B {
    default void show() { System.out.println("B"); }
}
class C implements A, B {
    @Override
    public void show() {
        System.out.println("C"); // must override to resolve conflict
        A.super.show(); // can still call specific interface method
        B.super.show();
    }
}
```

> **Key answer:** "Java avoids multiple inheritance with classes to prevent the Diamond Problem, but achieves it through interfaces where the implementing class must resolve any conflicts."

### 5. Checked vs Unchecked Exceptions

**Checked Exception** — compiler forces you to handle it. Use when the caller can recover from the error:

```java
// Extends Exception
class InsufficientFundsException extends Exception {
    public InsufficientFundsException(String msg) {
        super(msg);
    }
}

// Usage — must handle!
public void withdraw(Double amount) throws InsufficientFundsException {
    if (balance < amount)
        throw new InsufficientFundsException("Low balance!");
}
```

**Unchecked Exception** — runtime error, no forced handling. Use when it's a programming mistake:

```java
// Extends RuntimeException
class InvalidMerchantException extends RuntimeException {
    public InvalidMerchantException(String msg) {
        super(msg);
    }
}

// Usage — no need to declare throws
public void process(String merchantId) {
    if (merchantId == null)
        throw new InvalidMerchantException("Merchant ID is null!");
}
```

| | Checked | Unchecked |
|---|---|---|
| Extends | `Exception` | `RuntimeException` |
| Handling | Mandatory | Optional |
| When to use | External factors (file, DB, network) | Programming bugs |

### 6. ArrayList vs LinkedList

**ArrayList** is backed by a dynamic array — great for reading:

```java
List<String> list = new ArrayList<>();
list.add("A");
list.get(0); // O(1) - direct index access, very fast!
```

**LinkedList** is backed by a doubly linked list — great for inserting/deleting:

```java
LinkedList<String> list = new LinkedList<>();
list.add("A");
list.addFirst("B"); // O(1) - just update pointers, very fast!
list.get(0);        // O(n) - must traverse from start, slow!
```

| | ArrayList | LinkedList |
|---|---|---|
| Access by index | O(1) fast | O(n) slow |
| Insert/Delete middle | O(n) slow | O(1) fast |
| Memory | Less | More (stores pointers) |
| Use when | Read heavy | Write/Insert heavy |

> **Interview tip:** "In most real cases, ArrayList is preferred because CPU cache works better with contiguous memory — making it faster even for some insertions."

### 7. HashMap Internal Working

HashMap uses an **array of buckets** internally. Each bucket holds a linked list (or tree in Java 8+).

**How `put(key, value)` works:**

```java
map.put("merchant", "IRCTC");
```

1. Calls `"merchant".hashCode()` → gets a number
2. That number is used to find the bucket index
3. If bucket is empty → insert directly
4. If bucket has items → check using `.equals()`
   - Same key → update value
   - Different key → add to chain (collision!)

**Java 8 improvement:**
- If chain length > 8 → converts LinkedList to Red-Black Tree
- This improves worst case from O(n) to O(log n)

**Resizing:**
- Default capacity = 16
- Load factor = 0.75
- When entries > 16 × 0.75 = 12 → HashMap doubles size and rehashes

> **Critical rule:** "If you override `equals()`, you MUST override `hashCode()` too — otherwise HashMap will break and you'll never find your keys!"

### 8. What is Spring Boot

Spring Boot is built on top of Spring framework and removes all the painful configuration that Spring required.

**Traditional Spring problems:**
- Tons of XML configuration
- Had to set up external Tomcat server
- Complex dependency management

**Spring Boot solves all of this:**

```java
@SpringBootApplication // just this one annotation bootstraps everything!
public class MyApp {
    public static void main(String[] args) {
        SpringApplication.run(MyApp.class, args);
    }
}
```

**Key annotations:**

```java
@RestController    // this class handles REST API requests
@RequestMapping    // maps URL paths
@Autowired         // injects dependencies automatically
@Service           // business logic layer
@Repository        // database layer
```

**Architecture always flows like this:**

```
Request → Controller → Service → Repository → Database
```

> **Key answer:** "Spring Boot follows Convention over Configuration — it auto-configures everything based on what dependencies you add, so developers focus on business logic not setup."

### 9. Merchant API — Build an API to Credit Amount

```java
// 1. Request DTO
public class TransactionRequest {
    @NotNull
    private String merchantAccountNumber;
    @NotNull @Positive
    private Double amount;
}

// 2. Entity
@Entity
public class Transaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String merchantAccountNumber;
    private Double amount;
    private String status;
    private LocalDateTime createdAt;
}

// 3. Service
@Service
public class TransactionService {
    @Autowired
    private TransactionRepository repository;

    public Transaction createTransaction(TransactionRequest req) {
        Transaction txn = new Transaction();
        txn.setMerchantAccountNumber(req.getMerchantAccountNumber());
        txn.setAmount(req.getAmount());
        txn.setStatus("SUCCESS");
        txn.setCreatedAt(LocalDateTime.now());
        return repository.save(txn);
    }
}

// 4. Controller
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    @Autowired
    private TransactionService service;

    @PostMapping("/create")
    public ResponseEntity<Transaction> create(
        @RequestBody @Valid TransactionRequest req) {
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(service.createTransaction(req));
    }
}
```

### 10 & 11. Thread Safety — Multiple Merchants & Concurrent Updates

The key insight here is — IRCTC transactions should block only IRCTC, not Amazon or Flipkart. So we lock at **merchant level**, not globally.

```java
@Service
public class TransactionService {
    // One lock per merchant
    private final ConcurrentHashMap<String, ReentrantLock>
        merchantLocks = new ConcurrentHashMap<>();

    public Transaction createTransaction(TransactionRequest req) {
        String merchantId = req.getMerchantAccountNumber();

        // Get existing lock or create new one for this merchant
        ReentrantLock lock = merchantLocks.computeIfAbsent(
            merchantId, k -> new ReentrantLock()
        );

        lock.lock();
        try {
            // Read FRESH balance after acquiring lock
            Merchant merchant = merchantRepository.findById(merchantId);
            merchant.setBalance(merchant.getBalance() + req.getAmount());
            merchantRepository.save(merchant);
        } finally {
            lock.unlock(); // ALWAYS unlock in finally block!
        }
    }
}
```

**What happens when two people pay same merchant simultaneously:**

```
Thread 1 → acquires lock for IRCTC 🔒
           reads balance = 10,000
           adds 1,000 → saves 11,000
           releases lock 🔓

Thread 2 → was waiting ⏳
           now acquires lock 🔒
           reads FRESH balance = 11,000 ✅
           adds 1,000 → saves 12,000 ✅
           releases lock 🔓

Final = 12,000 ✅ Correct!
```

**Extra DB level safety using Optimistic Locking:**

```java
@Entity
public class Merchant {
    @Version
    private Long version; // DB throws error if stale update sneaks through
}
```

### 12. What is Hibernate

Hibernate is an **ORM (Object Relational Mapping)** framework. It maps your Java classes directly to database tables so you never write raw SQL.

```java
// Without Hibernate — painful!
Connection con = DriverManager.getConnection(url, user, pass);
PreparedStatement ps = con.prepareStatement(
    "INSERT INTO merchant(name, balance) VALUES (?,?)");
ps.setString(1, merchant.getName());
ps.setDouble(2, merchant.getBalance());
ps.executeUpdate();

// With Hibernate — just this!
session.save(merchant); // ✅
```

**Caching — very important:**

```
1st Level Cache → per Session, always ON by default
                  same query in same session → won't hit DB twice

2nd Level Cache → across all Sessions, must enable manually
                  uses Redis or EhCache
```

**Lazy vs Eager Loading:**

```java
// Lazy (DEFAULT) — loads related data only when you access it
@OneToMany(fetch = FetchType.LAZY)
private List<Transaction> transactions;

// Eager — loads everything immediately with parent
@OneToMany(fetch = FetchType.EAGER)
private List<Transaction> transactions;
```

Always prefer **Lazy** — Eager can cause performance issues by loading unnecessary data.

**N+1 Problem:**

```
Fetching 10 merchants = 1 query
Then fetching each merchant's transactions = 10 more queries
Total = 11 queries ❌ Very bad!
```

Fix: use `JOIN FETCH` in your query to get everything in 1 query ✅

### 13. Where Are Authentication Tokens Stored

```
ACCESS TOKEN
├── Lives in → Memory (JS variable) or HttpOnly Cookie
├── TTL → Short (15 mins to 1 hour)
├── Used for → Sent with every API request
└── Server stores in Redis to validate session

REFRESH TOKEN
├── Lives in → HttpOnly Cookie (secure, JS cannot read it)
├── TTL → Long (7 to 30 days)
├── Used for → Getting a new access token when old one expires
└── Server stores in Redis/DB with TTL

BEARER TOKEN
├── Sent in → Authorization header of every request
├── Format → "Bearer <token>"
└── Used for → Proving identity to protected APIs
```

> **Critical point:** "Never store tokens in `localStorage` — it's vulnerable to XSS attacks. Always use HttpOnly Cookies which JavaScript cannot access at all."

### 14. String `intern()` — s1==s2 and s2==s3

```java
String s1 = new String("ABC"); // creates object in HEAP
String s2 = s1.intern();       // looks up String Pool, returns pool reference
String s3 = "ABC";             // directly points to String Pool

System.out.println(s1 == s2); // FALSE ❌ (s1=heap, s2=pool)
System.out.println(s2 == s3); // TRUE  ✅ (both point to pool)
```

**Memory picture:**

```
Heap Memory          String Pool
┌──────────┐        ┌──────────┐
│ s1="ABC" │        │  "ABC"   │ ← s2 and s3 both point here
└──────────┘        └──────────┘
```

Remember: `==` compares references (memory address), `.equals()` compares actual content. `s1.equals(s2)` would be TRUE for all three!

### 15. Method Overloading with `null`

```java
public static void print(Object o) {
    System.out.println("Object method");
}
public static void print(String s) {
    System.out.println("String method");
}

public static void main(String[] args) {
    print(null); // Output → "String method" ✅
}
```

**Why String wins:**

```
Object
  └── String  ← String is child of Object
                Java always picks the most specific type
                So String wins over Object!
```

**Tricky follow up — what if you add Integer too:**

```java
public static void print(Integer i) {}
public static void print(String s) {}

print(null); // COMPILE ERROR ❌
// Both String and Integer are equally specific
// Java cannot decide → Ambiguous method call!
```

> **Key rule:** "Java resolves overloading at compile time and always picks the most specific applicable type in the class hierarchy."

## 🎯 Quick Cheat Sheet — Things to Remember

| Topic | One Line to Remember |
|---|---|
| Java 8 | Lambdas + Streams changed everything |
| OOP | Encapsulation, Inheritance, Polymorphism, Abstraction |
| Overriding | Same signature, child class, runtime decision |
| Multiple Inheritance | Not with classes (Diamond Problem), yes with interfaces |
| Exceptions | Checked = recoverable, Unchecked = programming bug |
| ArrayList vs LinkedList | Read = ArrayList, Write = LinkedList |
| HashMap | Array of buckets, hashCode→bucket, equals→match, tree after 8 nodes |
| Spring Boot | Auto config, embedded server, convention over configuration |
| Thread Safety | Lock per merchant using `ReentrantLock` + `ConcurrentHashMap` |
| Hibernate | ORM, 1st/2nd level cache, Lazy vs Eager, N+1 problem |
| Tokens | HttpOnly Cookie, never localStorage, Redis server side |
| `intern()` | Returns String Pool reference |
| Overloading `null` | Most specific type wins (String over Object) |
