# Notifications Microservice - Complete Build Instructions

## Build Complete Notifications Microservice (NestJS + Prisma + BullMQ + FCM) WITH FULL DOCUMENTATION + SWAGGER

### Goal: Build a production-ready Notifications Microservice using NestJS, Prisma (Postgres), BullMQ (Redis), and Firebase Admin (FCM), with:

- Full API (device registration, topic send, personal send, inbox, mark-read, sync)
- Background job processing (BullMQ workers)
- Token cleanup + retry logic
- API-key auth + scopes
- Swagger UI for API documentation
- Multiple markdown documentation files
- Dockerized deployment
- Clean project structure

### Requirements

#### 1. Tech Stack

- NestJS (latest)
- Prisma ORM (PostgreSQL)
- BullMQ (Redis)
- Firebase Admin SDK
- Swagger (OpenAPI 3)
- Rate limiting (Nest Throttler or rate-limiter-flexible)
- Jest for unit + integration tests
- Typescript, Node 20+

#### 2. Database Models (Prisma)

Create the following models in prisma/schema.prisma:

```
User (optional)
id            String @id @default(uuid())
email         String?
createdAt     DateTime @default(now())

Device
id            String @id @default(uuid())
userId        String?
platform      String   // 'ios' | 'android'
fcmToken      String   @unique
lastSeenAt    DateTime?
meta          Json?
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt

Notification
id            String @id @default(uuid())
type          String
title         String
body          String
data          Json?
topic         String?
createdBy     String?
createdAt     DateTime @default(now())

NotificationTarget
id               String @id @default(uuid())
notificationId   String
deviceId         String?
token            String
status           String   // pending | sent | failed | invalid
fcmResponse      Json?
deliveredAt      DateTime?
read             Boolean  @default(false)
createdAt        DateTime @default(now())

ApiKey
id          String @id @default(uuid())
name        String
keyHash     String
scopes      Json   // ["topic", "personal", "admin"]
createdAt   DateTime @default(now())
```

#### 3. API Endpoints

Device

- POST /v1/devices/register
- POST /v1/tokens/refresh

Notifications

- POST /v1/notifications/topic
- POST /v1/notifications/personal
- GET /v1/notifications?userId=&limit=&offset=
- POST /v1/notifications/:id/mark-read
- POST /v1/notifications/sync (optional for clients)

System / Admin

- GET /health
- GET /metrics
- GET /swagger (Swagger UI)

All routes must be protected by API Key authentication (using a NestJS Guard) except health.

#### 4. Background Jobs (BullMQ)

Queue: notification-send

Jobs include:

- topic_send
- token_batch_send

Worker Responsibilities:

- For topics → call admin.messaging().send()
- For personal → chunk tokens into 500 → use sendMulticast()
- Detect invalid tokens → delete from DB
- Update notification_targets
- Retry transient errors with exponential backoff
- Log failures and push to dead-letter queue

#### 5. Firebase Admin Integration

- Read service account JSON from process.env.FIREBASE_SERVICE_ACCOUNT_JSON
- Use FCM for both iOS & Android
- Handle responses from sendMulticast
- Cleanup invalid tokens

#### 6. Security Requirements

API Key Guard

- Validate x-api-key
- Look up hashed key in DB
- Check scopes (e.g., topic send only allowed for "topic" scope)
- Implement rate limiting per key

Environment variables

.env.example must include:

```
PORT=3000
DATABASE_URL=postgresql://user:pass@db:5432/notifications
REDIS_URL=redis://redis:6379
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":...}'
API_KEY_MASTER=...
JWT_SECRET=...
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60
```

#### 7. Documentation Requirements (MANDATORY)

Create a full documentation folder:

/docs/

- architecture.md
  - System overview, workflow diagrams, DB model explanation, queue flow.
- api.md
  - Covers all endpoints with:
    - Request body
    - Response body
    - Error codes
    - Example cURL commands
    - Authentication instructions
    - Topic vs personal notification explanation
- setup.md
  - How to:
    - Install dependencies
    - Configure env vars
    - Run migrations
    - Start Redis + Postgres
    - Start API + worker
    - Import Postman collection or use Swagger
- notifications-flow.md
  - Exact flow:
    - Client registers device
    - Backend stores & sends notification
    - Worker processes job
    - Client fetches history
    - Mark-read logic
- fcm.md
  - How to configure FCM, APNs key, topics, handling invalid tokens.
- deployment.md
  - Docker instructions, production considerations, scaling workers, horizontal sharding.
- examples.md
  - Sample payloads:
    - topic notifications
    - personal notifications
    - transaction alerts
    - promo messages
    - structured data payloads

#### 8. Swagger / OpenAPI 3

- Setup Swagger in NestJS:
  - Route: /swagger
  - Include API key authentication header model
  - Document all request/response DTOs
  - Add descriptions, examples, enums, schemas
  - Generate OpenAPI spec to /docs/openapi.json

#### 9. Dockerization

- Provide:
  - Dockerfile for NestJS app
  - Dockerfile.worker for BullMQ workers
  - docker-compose.yml including:
    - API service
    - Postgres
    - Redis
    - Adminer optional

#### 10. Testing

- Include:
  - Unit tests (controllers/services)
  - Integration tests (API → DB)
  - Test utility to mock Firebase Admin during tests

#### 11. Deliverables

A complete repo with:

- Full NestJS project
- All modules (Auth, Devices, Notifications, Jobs)
- Prisma models + migrations
- BullMQ queues + workers
- Swagger UI
- Markdown docs (multiple files)
- Docker setup
- Seed script for API key + test user
- README linking all docs

#### Instructions for the generator / developer:

- Write idiomatic NestJS code (modules, providers, controllers, DTOs).
- Follow clean architecture: controllers → services → repositories → Prisma.
- Workers should be separate processes (Nest workers or standalone).
- All code must be clean, modular, documented, and production-ready.
- Include logging and error handling everywhere.
- Keep documentation exhaustive and easy to follow.
