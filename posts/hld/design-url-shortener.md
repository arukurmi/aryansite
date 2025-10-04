---
title: "Design a URL Shortener like bit.ly - High Level Design"
excerpt: "Learn how to design a scalable URL shortener service that can handle millions of requests per day with proper system architecture."
date: "2024-01-10"
category: "hld"
tags: ["system-design", "scalability", "url-shortener", "distributed-systems", "caching"]
author: "Aryansh Kurmi"
---

# Design a URL Shortener like bit.ly - High Level Design

URL shorteners are one of the most popular system design interview questions. They test your understanding of scalability, distributed systems, and real-world engineering challenges.

## Problem Statement

Design a URL shortener service similar to bit.ly that can:
- Shorten long URLs to shorter ones
- Redirect users from short URLs to original URLs
- Handle millions of requests per day
- Be highly available and scalable

## Functional Requirements

1. **URL Shortening**: Convert long URLs to short URLs
2. **URL Redirection**: Redirect short URLs to original URLs
3. **Custom URLs**: Allow users to create custom short URLs
4. **Analytics**: Track click counts and user statistics
5. **Expiration**: Support URL expiration dates

## Non-Functional Requirements

1. **Scalability**: Handle millions of URLs and requests
2. **Availability**: 99.9% uptime
3. **Performance**: Low latency for redirects
4. **Durability**: URLs should not be lost

## Capacity Estimation

### Traffic Estimates
- **Read/Write Ratio**: 100:1 (100 reads for every write)
- **Daily URLs**: 100 million
- **Daily Requests**: 10 billion
- **Peak QPS**: 100,000 requests/second

### Storage Estimates
- **Average URL Length**: 100 characters
- **Short URL Length**: 8 characters
- **Total Storage**: ~500GB for 1 billion URLs

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Servers   │    │   Application   │
│                 │────│                 │────│    Servers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Cache       │    │   Database      │    │   Analytics     │
│   (Redis)       │    │   (MySQL)       │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Detailed Component Design

### 1. URL Shortening Service

```python
class URLShortener:
    def __init__(self):
        self.db = Database()
        self.cache = Cache()
        self.id_generator = IDGenerator()
    
    def shorten_url(self, long_url, custom_alias=None):
        # Check if custom alias is provided
        if custom_alias:
            if self.is_alias_available(custom_alias):
                short_url = custom_alias
            else:
                raise AliasNotAvailableException()
        else:
            # Generate unique short URL
            short_url = self.generate_short_url()
        
        # Store in database
        self.db.store_url(short_url, long_url)
        
        # Cache for fast access
        self.cache.set(short_url, long_url)
        
        return short_url
    
    def redirect_url(self, short_url):
        # Check cache first
        long_url = self.cache.get(short_url)
        
        if not long_url:
            # Get from database
            long_url = self.db.get_long_url(short_url)
            
            if long_url:
                # Update cache
                self.cache.set(short_url, long_url)
            else:
                raise URLNotFoundException()
        
        # Update analytics
        self.update_analytics(short_url)
        
        return long_url
```

### 2. ID Generation Strategies

#### Base62 Encoding
```python
import string

class IDGenerator:
    def __init__(self):
        self.chars = string.ascii_letters + string.digits
        self.base = len(self.chars)
    
    def generate_id(self, counter):
        short_id = ""
        while counter > 0:
            short_id = self.chars[counter % self.base] + short_id
            counter //= self.base
        return short_id
    
    def decode_id(self, short_id):
        counter = 0
        for char in short_id:
            counter = counter * self.base + self.chars.index(char)
        return counter
```

#### Distributed ID Generation
```python
class DistributedIDGenerator:
    def __init__(self, machine_id):
        self.machine_id = machine_id
        self.sequence = 0
        self.last_timestamp = 0
    
    def generate_snowflake_id(self):
        timestamp = int(time.time() * 1000)
        
        if timestamp < self.last_timestamp:
            raise ClockBackwardException()
        
        if timestamp == self.last_timestamp:
            self.sequence = (self.sequence + 1) & 4095
            if self.sequence == 0:
                timestamp = self.wait_next_millis()
        else:
            self.sequence = 0
        
        self.last_timestamp = timestamp
        
        # Generate 64-bit ID
        return ((timestamp - 1288834974657) << 22) | (self.machine_id << 12) | self.sequence
```

### 3. Database Schema

```sql
-- URLs table
CREATE TABLE urls (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_url VARCHAR(8) UNIQUE NOT NULL,
    long_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    user_id BIGINT,
    INDEX idx_short_url (short_url),
    INDEX idx_created_at (created_at)
);

-- Analytics table
CREATE TABLE analytics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    short_url VARCHAR(8) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referer TEXT,
    country VARCHAR(2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_short_url (short_url),
    INDEX idx_created_at (created_at)
);

-- Users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Caching Strategy

```python
class CacheManager:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
        self.cache_ttl = 3600  # 1 hour
    
    def get_url(self, short_url):
        return self.redis.get(f"url:{short_url}")
    
    def set_url(self, short_url, long_url):
        self.redis.setex(f"url:{short_url}", self.cache_ttl, long_url)
    
    def invalidate_url(self, short_url):
        self.redis.delete(f"url:{short_url}")
```

## Scalability Solutions

### 1. Database Sharding
```python
class DatabaseSharding:
    def __init__(self, shard_count):
        self.shard_count = shard_count
        self.shards = [Database() for _ in range(shard_count)]
    
    def get_shard(self, short_url):
        hash_value = hash(short_url)
        return self.shards[hash_value % self.shard_count]
    
    def store_url(self, short_url, long_url):
        shard = self.get_shard(short_url)
        shard.store_url(short_url, long_url)
    
    def get_url(self, short_url):
        shard = self.get_shard(short_url)
        return shard.get_url(short_url)
```

### 2. Read Replicas
```python
class DatabaseManager:
    def __init__(self):
        self.master_db = Database(host='master')
        self.read_replicas = [
            Database(host='replica1'),
            Database(host='replica2'),
            Database(host='replica3')
        ]
    
    def write(self, query, data):
        return self.master_db.execute(query, data)
    
    def read(self, query, params=None):
        # Round-robin read replicas
        replica = random.choice(self.read_replicas)
        return replica.execute(query, params)
```

### 3. CDN Integration
```python
class CDNManager:
    def __init__(self):
        self.cdn_client = CDNClient()
    
    def cache_redirect(self, short_url, long_url):
        # Cache redirect rules in CDN
        self.cdn_client.create_redirect_rule(short_url, long_url)
    
    def invalidate_cache(self, short_url):
        # Invalidate CDN cache
        self.cdn_client.invalidate_url(short_url)
```

## Performance Optimizations

### 1. Connection Pooling
```python
class ConnectionPool:
    def __init__(self, max_connections=100):
        self.pool = []
        self.max_connections = max_connections
    
    def get_connection(self):
        if self.pool:
            return self.pool.pop()
        return DatabaseConnection()
    
    def return_connection(self, conn):
        if len(self.pool) < self.max_connections:
            self.pool.append(conn)
        else:
            conn.close()
```

### 2. Asynchronous Processing
```python
import asyncio
import aiohttp

class AsyncURLShortener:
    async def shorten_url_async(self, long_url):
        # Asynchronous URL shortening
        async with aiohttp.ClientSession() as session:
            async with session.post('/api/shorten', json={'url': long_url}) as response:
                return await response.json()
    
    async def batch_shorten_urls(self, urls):
        tasks = [self.shorten_url_async(url) for url in urls]
        return await asyncio.gather(*tasks)
```

## Monitoring and Analytics

### 1. Metrics Collection
```python
class MetricsCollector:
    def __init__(self):
        self.metrics = {}
    
    def increment_counter(self, metric_name, tags=None):
        key = f"{metric_name}:{tags}" if tags else metric_name
        self.metrics[key] = self.metrics.get(key, 0) + 1
    
    def record_timing(self, metric_name, duration):
        if metric_name not in self.metrics:
            self.metrics[metric_name] = []
        self.metrics[metric_name].append(duration)
```

### 2. Health Checks
```python
class HealthChecker:
    def __init__(self):
        self.checks = []
    
    def add_check(self, name, check_function):
        self.checks.append((name, check_function))
    
    def run_health_checks(self):
        results = {}
        for name, check in self.checks:
            try:
                results[name] = check()
            except Exception as e:
                results[name] = f"Error: {str(e)}"
        return results
```

## Security Considerations

1. **Rate Limiting**: Prevent abuse with rate limiting
2. **Input Validation**: Validate URLs and prevent malicious inputs
3. **Authentication**: Secure API endpoints
4. **HTTPS**: Use HTTPS for all communications
5. **CORS**: Configure CORS properly

## Deployment Strategy

1. **Containerization**: Use Docker for consistent deployments
2. **Orchestration**: Use Kubernetes for container orchestration
3. **CI/CD**: Automated testing and deployment pipelines
4. **Blue-Green Deployment**: Zero-downtime deployments
5. **Monitoring**: Comprehensive monitoring and alerting

## Conclusion

Designing a URL shortener requires careful consideration of:
- **Scalability**: Handle millions of requests
- **Performance**: Low latency redirects
- **Reliability**: High availability and data durability
- **Security**: Protect against abuse and attacks

The key is to start simple and gradually add complexity as requirements evolve.

---

*This design can handle the basic requirements of a URL shortener. For production use, additional considerations like fraud detection, A/B testing, and advanced analytics would be needed.*
