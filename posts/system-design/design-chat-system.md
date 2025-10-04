---
title: "Design a Real-Time Chat System - System Design"
excerpt: "Learn how to design a scalable real-time chat system that can handle millions of concurrent users with WebSockets, message queuing, and distributed architecture."
date: "2024-01-05"
category: "system-design"
tags: ["system-design", "real-time", "websockets", "message-queues", "distributed-systems"]
author: "Aryansh Kurmi"
---

# Design a Real-Time Chat System - System Design

Real-time chat systems are complex distributed systems that require careful consideration of scalability, real-time communication, and data consistency. This post covers the design of a modern chat system like WhatsApp or Slack.

## Problem Statement

Design a real-time chat system that can:
- Support millions of concurrent users
- Deliver messages in real-time
- Handle group chats and direct messages
- Provide message history and search
- Work across multiple devices
- Ensure message delivery and ordering

## Functional Requirements

1. **Messaging**: Send/receive text, images, files
2. **Real-time Delivery**: Messages delivered instantly
3. **Group Chats**: Support multiple participants
4. **Message History**: Store and retrieve chat history
5. **User Status**: Online/offline status
6. **Push Notifications**: Notify users of new messages
7. **Message Search**: Search through message history
8. **File Sharing**: Support image and file uploads

## Non-Functional Requirements

1. **Scalability**: Handle millions of concurrent users
2. **Low Latency**: Messages delivered in <100ms
3. **High Availability**: 99.9% uptime
4. **Consistency**: Message ordering and delivery
5. **Security**: End-to-end encryption

## Capacity Estimation

### Traffic Estimates
- **Active Users**: 50 million daily
- **Concurrent Users**: 5 million
- **Messages per Day**: 1 billion
- **Average Message Size**: 100 bytes
- **Peak QPS**: 100,000 messages/second

### Storage Estimates
- **Daily Messages**: 1 billion × 100 bytes = 100GB
- **Annual Storage**: ~36TB
- **User Data**: 50M users × 1KB = 50GB
- **Media Files**: 10TB (estimated)

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   API Gateway   │    │   Chat Service  │
│                 │────│                 │────│                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WebSocket     │    │   Message       │    │   Database      │
│   Service       │    │   Queue         │    │   Cluster       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Push          │    │   File Storage  │    │   Search        │
│   Service       │    │   (S3/CDN)      │    │   Service       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Detailed Component Design

### 1. WebSocket Connection Management

```python
import asyncio
import websockets
import json
from typing import Dict, Set

class WebSocketManager:
    def __init__(self):
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}
        self.user_rooms: Dict[str, Set[str]] = {}  # user_id -> set of room_ids
        self.room_users: Dict[str, Set[str]] = {}  # room_id -> set of user_ids
    
    async def handle_connection(self, websocket, path):
        user_id = self.authenticate_user(websocket)
        if not user_id:
            await websocket.close()
            return
        
        self.connections[user_id] = websocket
        
        try:
            async for message in websocket:
                await self.handle_message(user_id, message)
        except websockets.exceptions.ConnectionClosed:
            await self.handle_disconnection(user_id)
    
    async def handle_message(self, user_id: str, message: str):
        data = json.loads(message)
        message_type = data.get('type')
        
        if message_type == 'join_room':
            await self.join_room(user_id, data['room_id'])
        elif message_type == 'send_message':
            await self.send_message(user_id, data)
        elif message_type == 'typing':
            await self.handle_typing(user_id, data)
    
    async def join_room(self, user_id: str, room_id: str):
        if user_id not in self.user_rooms:
            self.user_rooms[user_id] = set()
        self.user_rooms[user_id].add(room_id)
        
        if room_id not in self.room_users:
            self.room_users[room_id] = set()
        self.room_users[room_id].add(user_id)
        
        # Notify other users in the room
        await self.broadcast_to_room(room_id, {
            'type': 'user_joined',
            'user_id': user_id,
            'room_id': room_id
        })
    
    async def send_message(self, sender_id: str, message_data: dict):
        room_id = message_data['room_id']
        message = message_data['message']
        
        # Store message in database
        message_id = await self.store_message(sender_id, room_id, message)
        
        # Broadcast to all users in the room
        await self.broadcast_to_room(room_id, {
            'type': 'new_message',
            'message_id': message_id,
            'sender_id': sender_id,
            'room_id': room_id,
            'message': message,
            'timestamp': message_data.get('timestamp')
        })
    
    async def broadcast_to_room(self, room_id: str, data: dict):
        if room_id in self.room_users:
            for user_id in self.room_users[room_id]:
                if user_id in self.connections:
                    try:
                        await self.connections[user_id].send(json.dumps(data))
                    except websockets.exceptions.ConnectionClosed:
                        await self.handle_disconnection(user_id)
    
    async def handle_disconnection(self, user_id: str):
        if user_id in self.connections:
            del self.connections[user_id]
        
        # Remove user from all rooms
        if user_id in self.user_rooms:
            for room_id in self.user_rooms[user_id]:
                if room_id in self.room_users:
                    self.room_users[room_id].discard(user_id)
            del self.user_rooms[user_id]
```

### 2. Message Storage and Retrieval

```python
class MessageService:
    def __init__(self):
        self.db = Database()
        self.cache = Cache()
        self.message_queue = MessageQueue()
    
    async def store_message(self, sender_id: str, room_id: str, message: str, message_type: str = 'text'):
        message_data = {
            'id': self.generate_message_id(),
            'sender_id': sender_id,
            'room_id': room_id,
            'message': message,
            'message_type': message_type,
            'timestamp': datetime.utcnow(),
            'status': 'sent'
        }
        
        # Store in database
        await self.db.insert_message(message_data)
        
        # Cache recent messages
        await self.cache.add_to_recent_messages(room_id, message_data)
        
        # Queue for processing
        await self.message_queue.enqueue('message_processing', message_data)
        
        return message_data['id']
    
    async def get_message_history(self, room_id: str, limit: int = 50, offset: int = 0):
        # Try cache first
        cached_messages = await self.cache.get_recent_messages(room_id, limit)
        if cached_messages:
            return cached_messages
        
        # Get from database
        messages = await self.db.get_messages(room_id, limit, offset)
        
        # Cache the results
        await self.cache.set_recent_messages(room_id, messages)
        
        return messages
    
    async def search_messages(self, user_id: str, query: str, room_id: str = None):
        # Use search service for complex queries
        search_results = await self.search_service.search_messages(
            user_id=user_id,
            query=query,
            room_id=room_id
        )
        
        return search_results
```

### 3. Database Schema

```sql
-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(255),
    status ENUM('online', 'offline', 'away', 'busy') DEFAULT 'offline',
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Rooms table
CREATE TABLE rooms (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    room_type ENUM('direct', 'group', 'channel') NOT NULL,
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_room_type (room_type),
    INDEX idx_created_by (created_by)
);

-- Room participants
CREATE TABLE room_participants (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    role ENUM('admin', 'member', 'moderator') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_room_user (room_id, user_id),
    INDEX idx_room_id (room_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    reply_to VARCHAR(36),
    edited_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_room_id (room_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at),
    INDEX idx_room_created (room_id, created_at),
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to) REFERENCES messages(id) ON DELETE SET NULL
);

-- Message status (delivery receipts)
CREATE TABLE message_status (
    id VARCHAR(36) PRIMARY KEY,
    message_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_message_user (message_id, user_id),
    INDEX idx_message_id (message_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 4. Message Queue System

```python
import asyncio
from asyncio import Queue
from typing import Dict, List

class MessageQueue:
    def __init__(self):
        self.queues: Dict[str, Queue] = {}
        self.workers: Dict[str, List[asyncio.Task]] = {}
    
    async def enqueue(self, queue_name: str, message: dict):
        if queue_name not in self.queues:
            self.queues[queue_name] = Queue()
        
        await self.queues[queue_name].put(message)
    
    async def dequeue(self, queue_name: str):
        if queue_name not in self.queues:
            return None
        
        return await self.queues[queue_name].get()
    
    async def start_worker(self, queue_name: str, worker_func, num_workers: int = 1):
        if queue_name not in self.workers:
            self.workers[queue_name] = []
        
        for i in range(num_workers):
            worker = asyncio.create_task(self._worker(queue_name, worker_func))
            self.workers[queue_name].append(worker)
    
    async def _worker(self, queue_name: str, worker_func):
        while True:
            try:
                message = await self.dequeue(queue_name)
                if message:
                    await worker_func(message)
            except Exception as e:
                print(f"Worker error: {e}")
                await asyncio.sleep(1)

# Message processing workers
async def process_message(message_data):
    # Update message status
    await update_message_status(message_data['id'], 'processing')
    
    # Send push notifications
    await send_push_notifications(message_data)
    
    # Update analytics
    await update_message_analytics(message_data)
    
    # Update message status
    await update_message_status(message_data['id'], 'processed')

async def send_push_notifications(message_data):
    room_id = message_data['room_id']
    sender_id = message_data['sender_id']
    
    # Get offline users in the room
    offline_users = await get_offline_users_in_room(room_id, sender_id)
    
    for user_id in offline_users:
        await push_service.send_notification(user_id, {
            'title': 'New Message',
            'body': message_data['message'][:100],
            'room_id': room_id,
            'sender_id': sender_id
        })
```

### 5. Push Notification Service

```python
class PushNotificationService:
    def __init__(self):
        self.fcm_client = FCMClient()
        self.apns_client = APNSClient()
    
    async def send_notification(self, user_id: str, notification: dict):
        user_tokens = await self.get_user_tokens(user_id)
        
        for token in user_tokens:
            if token.platform == 'android':
                await self.fcm_client.send(token.token, notification)
            elif token.platform == 'ios':
                await self.apns_client.send(token.token, notification)
    
    async def get_user_tokens(self, user_id: str):
        # Get all device tokens for the user
        return await self.db.get_user_device_tokens(user_id)
    
    async def register_token(self, user_id: str, token: str, platform: str):
        await self.db.store_device_token(user_id, token, platform)
    
    async def unregister_token(self, user_id: str, token: str):
        await self.db.remove_device_token(user_id, token)
```

## Scalability Solutions

### 1. Horizontal Scaling with Sharding

```python
class ChatSharding:
    def __init__(self, num_shards: int):
        self.num_shards = num_shards
        self.shards = [ChatService() for _ in range(num_shards)]
    
    def get_shard(self, room_id: str) -> ChatService:
        shard_index = hash(room_id) % self.num_shards
        return self.shards[shard_index]
    
    async def send_message(self, room_id: str, message: dict):
        shard = self.get_shard(room_id)
        return await shard.send_message(room_id, message)
    
    async def get_message_history(self, room_id: str, limit: int):
        shard = self.get_shard(room_id)
        return await shard.get_message_history(room_id, limit)
```

### 2. Load Balancing WebSocket Connections

```python
class WebSocketLoadBalancer:
    def __init__(self):
        self.servers = []
        self.server_weights = {}
        self.connection_counts = {}
    
    def add_server(self, server_url: str, weight: int = 1):
        self.servers.append(server_url)
        self.server_weights[server_url] = weight
        self.connection_counts[server_url] = 0
    
    def get_best_server(self) -> str:
        # Weighted round-robin with connection count consideration
        best_server = None
        best_score = float('inf')
        
        for server in self.servers:
            weight = self.server_weights[server]
            connections = self.connection_counts[server]
            score = connections / weight
            
            if score < best_score:
                best_score = score
                best_server = server
        
        self.connection_counts[best_server] += 1
        return best_server
    
    def remove_connection(self, server_url: str):
        if server_url in self.connection_counts:
            self.connection_counts[server_url] = max(0, self.connection_counts[server_url] - 1)
```

### 3. Caching Strategy

```python
class ChatCache:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
        self.cache_ttl = 3600  # 1 hour
    
    async def cache_recent_messages(self, room_id: str, messages: List[dict]):
        key = f"messages:{room_id}"
        await self.redis.setex(key, self.cache_ttl, json.dumps(messages))
    
    async def get_recent_messages(self, room_id: str) -> List[dict]:
        key = f"messages:{room_id}"
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        return []
    
    async def cache_user_status(self, user_id: str, status: str):
        key = f"status:{user_id}"
        await self.redis.setex(key, 300, status)  # 5 minutes TTL
    
    async def get_user_status(self, user_id: str) -> str:
        key = f"status:{user_id}"
        return await self.redis.get(key) or "offline"
```

## Security Considerations

### 1. End-to-End Encryption

```python
from cryptography.fernet import Fernet
import base64

class MessageEncryption:
    def __init__(self):
        self.key = Fernet.generate_key()
        self.cipher = Fernet(self.key)
    
    def encrypt_message(self, message: str, room_key: bytes) -> str:
        room_cipher = Fernet(room_key)
        encrypted = room_cipher.encrypt(message.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt_message(self, encrypted_message: str, room_key: bytes) -> str:
        room_cipher = Fernet(room_key)
        decoded = base64.b64decode(encrypted_message.encode())
        decrypted = room_cipher.decrypt(decoded)
        return decrypted.decode()
```

### 2. Rate Limiting

```python
class RateLimiter:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=1)
    
    async def is_rate_limited(self, user_id: str, action: str, limit: int, window: int) -> bool:
        key = f"rate_limit:{user_id}:{action}"
        current = await self.redis.incr(key)
        
        if current == 1:
            await self.redis.expire(key, window)
        
        return current > limit
```

## Monitoring and Analytics

### 1. Metrics Collection

```python
class ChatMetrics:
    def __init__(self):
        self.metrics = {}
    
    def record_message_sent(self, room_id: str, message_type: str):
        self.metrics['messages_sent'] = self.metrics.get('messages_sent', 0) + 1
        self.metrics[f'messages_sent_{message_type}'] = self.metrics.get(f'messages_sent_{message_type}', 0) + 1
    
    def record_connection(self, user_id: str):
        self.metrics['active_connections'] = self.metrics.get('active_connections', 0) + 1
    
    def record_disconnection(self, user_id: str):
        self.metrics['active_connections'] = max(0, self.metrics.get('active_connections', 0) - 1)
```

## Conclusion

Designing a real-time chat system requires careful consideration of:

1. **Real-time Communication**: WebSockets for instant message delivery
2. **Scalability**: Horizontal scaling and load balancing
3. **Data Consistency**: Message ordering and delivery guarantees
4. **Performance**: Caching and database optimization
5. **Security**: Encryption and rate limiting
6. **Reliability**: Message queuing and error handling

The key is to start with a simple design and gradually add complexity as requirements evolve.

---

*This design provides a solid foundation for a real-time chat system. For production use, additional considerations like message persistence, backup systems, and advanced analytics would be needed.*
