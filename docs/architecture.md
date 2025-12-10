# Architecture Documentation

## System Overview

The Notifications Microservice is built using **NestJS** with a modern, scalable architecture that supports both real-time push notifications via Firebase Cloud Messaging (FCM) and persistent notification history storage.

### Core Components

```
┌─────────────────┐
│   API Gateway   │
│   (NestJS)      │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬──────────────┐
    │         │            │              │
┌───▼───┐ ┌──▼───┐ ┌─────▼─────┐ ┌──────▼──────┐
│Devices│ │Notif.│ │   Auth    │ │   Health    │
│Module │ │Module│ │  Module   │ │   Module    │
└───┬───┘ └──┬───┘ └─────┬─────┘ └─────────────┘
    │        │            │
    │   ┌────▼────────────▼───┐
    │   │  Database Module    │
    │   │    (Prisma ORM)     │
    │   └─────────┬───────────┘
    │             │
    │   ┌─────────▼───────────┐
    │   │   PostgreSQL DB     │
    │   └─────────────────────┘
    │
    │   ┌─────────────────────┐
    └───►  BullMQ Queue       │
        │  (Redis-backed)     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Notification       │
        │  Processor Worker   │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  Firebase Admin SDK │
        │       (FCM)         │
        └─────────────────────┘
```

## Database Schema

### Entity Relationship Diagram

```
┌──────────────┐
│     User     │
│──────────────│
│ id (PK)      │
│ email        │
│ createdAt    │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────┐
│   Device     │
│──────────────│
│ id (PK)      │
│ userId (FK)  │
│ platform     │
│ fcmToken     │◄──────┐
│ lastSeenAt   │       │
│ meta (JSON)  │       │
│ createdAt    │       │
│ updatedAt    │       │
└──────┬───────┘       │
       │               │
       │ 1:N           │
       │               │
┌──────▼────────────┐  │
│NotificationTarget │  │
│───────────────────│  │
│ id (PK)           │  │
│ notificationId(FK)│  │
│ deviceId (FK)     │──┘
│ token             │
│ status            │
│ fcmResponse(JSON) │
│ deliveredAt       │
│ read              │
│ createdAt         │
└──────▲────────────┘
       │
       │ N:1
       │
┌──────┴────────────┐
│   Notification    │
│───────────────────│
│ id (PK)           │
│ type              │
│ title             │
│ body              │
│ data (JSON)       │
│ topic             │
│ createdBy         │
│ createdAt         │
└───────────────────┘

┌──────────────┐
│   ApiKey     │
│──────────────│
│ id (PK)      │
│ name         │
│ keyHash      │
│ scopes(JSON) │
│ createdAt    │
└──────────────┘
```

### Table Descriptions

#### User

Optional user entity for tracking notification recipients. Can be linked to devices for personalized notifications.

#### Device

Represents a physical device (iOS/Android) registered for push notifications.

- **fcmToken**: Unique FCM registration token
- **platform**: Device platform (ios/android)
- **meta**: Additional device metadata (app version, OS version, etc.)

#### Notification

Core notification entity storing the notification content and metadata.

- **type**: Either 'topic' or 'personal'
- **topic**: For topic-based notifications
- **data**: Custom payload data (JSON)

#### NotificationTarget

Junction table tracking delivery status for each device.

- **status**: pending | sent | failed | invalid
- **fcmResponse**: FCM API response for debugging
- **read**: Whether user has read the notification

#### ApiKey

Secure API key authentication with scope-based permissions.

- **scopes**: Array of permissions ['topic', 'personal', 'admin']

## Queue Flow

### BullMQ Job Processing

```
┌─────────────────┐
│  API Endpoint   │
│  (Controller)   │
└────────┬────────┘
         │
         │ 1. Create Notification Record
         │
┌────────▼────────┐
│  Notification   │
│    Service      │
└────────┬────────┘
         │
         │ 2. Enqueue Job
         │
┌────────▼────────────┐
│   BullMQ Queue      │
│ (notification-send) │
└────────┬────────────┘
         │
         │ 3. Process Job
         │
┌────────▼────────────┐
│ NotificationProcessor│
│     (Worker)         │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ Topic │ │ Token │
│ Send  │ │ Batch │
└───┬───┘ └───┬───┘
    │         │
    │    ┌────▼─────────────┐
    │    │ 4. Chunk tokens  │
    │    │   (500/batch)    │
    │    └────┬─────────────┘
    │         │
    └────┬────┘
         │
┌────────▼───────────┐
│ Firebase Admin SDK │
│  sendToTopic() or  │
│  sendEach()        │
└────────┬───────────┘
         │
         │ 5. Update Status
         │
┌────────▼────────────┐
│ NotificationTarget  │
│   (Update status)   │
└─────────────────────┘
```

### Job Types

#### topic_send

- **Purpose**: Send notification to all devices subscribed to a topic
- **Payload**: `{ topic, message }`
- **Processing**: Single FCM API call using topic messaging

#### token_batch_send

- **Purpose**: Send personal notifications to specific devices
- **Payload**: `{ tokens[], message, notificationId }`
- **Processing**:
  - Chunks tokens into batches of 500 (FCM limit)
  - Sends via `sendEach()` for better error handling
  - Updates NotificationTarget status for each token
  - Detects and removes invalid tokens

### Error Handling & Retry

- **Transient Errors**: Automatic retry with exponential backoff (3 attempts)
- **Invalid Tokens**: Detected via FCM response, automatically deleted from database
- **Dead Letter Queue**: Failed jobs after max retries moved to DLQ for manual review
- **Status Tracking**: Each delivery attempt logged in `fcmResponse` field

## Module Architecture

### Core Modules

#### DatabaseModule

- Provides `PrismaService` for database access
- Handles connection lifecycle (connect/disconnect)
- Exported for use across all modules

#### AuthModule

- `ApiKeyGuard`: Request guard for API key validation
- `ApiKeyService`: Validates and verifies API keys against database
- Scope-based authorization (topic, personal, admin)

#### DevicesModule

- Device registration and token management
- Token refresh/update functionality
- Tracks last seen timestamps

#### NotificationsModule

- Core notification logic
- Integrates with BullMQ for async processing
- Firebase service for FCM communication
- Notification history retrieval

## Security Architecture

### API Key Authentication

1. **Storage**: API keys hashed using Argon2 before storage
2. **Validation**:
   - Extracts `X-API-Key` header
   - Compares hash with database records
   - Validates scopes against endpoint requirements
3. **Rate Limiting**: Throttled per key (100 requests/60 seconds by default)

### Scopes

- **topic**: Can send topic notifications
- **personal**: Can send personal notifications to users
- **admin**: Full system access (future use)

## Scalability Considerations

### Horizontal Scaling

- **API Instances**: Stateless design allows multiple API instances behind load balancer
- **Worker Instances**: Multiple worker instances can process queue concurrently
- **Database**: PostgreSQL with connection pooling
- **Redis**: Cluster mode for high availability

### Performance Optimizations

- **Batch Processing**: Tokens chunked into 500-token batches
- **Async Processing**: Heavy FCM calls offloaded to background workers
- **Database Indexing**: Indexes on fcmToken, userId, notificationId
- **Caching**: Future: Redis cache for frequently accessed data

## Monitoring & Observability

### Health Checks

- `GET /health`: Basic health status
- `GET /health/metrics`: System metrics (future: Prometheus format)

### Logging

- Structured logging with context (userId, notificationId, jobId)
- Error tracking with full stack traces
- FCM response logging for debugging

### Metrics to Monitor

- Queue depth and processing rate
- FCM success/failure rates
- Invalid token rate
- API response times
- Database connection pool status

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10+
- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5+
- **Queue**: BullMQ (Redis)
- **Push Service**: Firebase Cloud Messaging
- **Authentication**: Argon2 hashing
- **API Documentation**: Swagger/OpenAPI 3
- **Rate Limiting**: @nestjs/throttler

## Development Workflow

1. **Local Development**: Hot reload with `npm run start:dev`
2. **Database Migrations**: Prisma migrate dev
3. **Testing**: Jest for unit and integration tests
4. **Building**: TypeScript compilation to `dist/`
5. **Deployment**: Docker containers with docker-compose
